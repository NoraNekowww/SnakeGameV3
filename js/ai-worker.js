// ============================================================================
// 🧠 拓扑领地战：多线程独立运算核心 (Web Worker)
// 脱离主线程运行，全速释放 CPU 算力，保障游戏 60fps 绝对丝滑
// ============================================================================

const EMPTY = 0, WALL = 1, P1_BODY = 2, P2_BODY = 3, PORTAL = 4, P3_BODY = 5, P4_BODY = 6;
let config, board, portals, players, AI_DEPTH;

// --- 接收主线程的任务指派 ---
onmessage = function(e) {
    if(e.data.type !== 'CALCULATE_MOVE') return;
    
    // 1. 拆箱接收最新战局数据
    let data = e.data.payload;
    config = data.config;
    board = data.board;
    portals = data.portals;
    players = data.players;
    AI_DEPTH = data.AI_DEPTH;

    let cp = players.find(p => p.id === data.myPlayerId);
    if(!cp) cp = players[data.currentTurnIndex];
    
    let bestM = null;

    // 2. 根据战局人数，切换双核引擎进行满血推演
    if (data.is2P) {
        let alivePls = players.filter(p=>p.alive);
        let pA = players.find(p=>p.id===1) || alivePls[0];
        let pB = players.find(p=>p.id!==pA.id && p.alive) || alivePls[1];
        
        let gs = { b: board.map(r=>[...r]), p1: {...pA}, p2: {...pB}, turn: (cp.id === pA.id) };
        let moves = aiGetMoves_2P(gs, false);
        
        if(moves.length > 0) {
            let bestS = -Infinity;
            for(let m of moves){
                let ngs = { b: gs.b.map(r=>[...r]), p1: {...gs.p1}, p2: {...gs.p2}, turn: gs.turn };
                aiApply_2P(ngs, m);
                // 此时在独立线程，直接拉满 CPU 进行纯同步递归，不需要任何延迟等待！
                let score = minimax_2P(ngs, AI_DEPTH-1, -Infinity, Infinity, false);
                if(score > bestS || (score === bestS && Math.random() < 0.3)){ bestS=score; bestM=m; }
            }
        }
    } else {
        let moves = getValidMoves_Multi(board, cp, players);
        if(moves.length > 0) {
            let bestScore = -Infinity, bestMoves = [];
            for(let move of moves) {
                let tempB = board.map(row => [...row]);
                let tempPls = JSON.parse(JSON.stringify(players));
                let simP = tempPls.find(p => p.id === cp.id);
                if(tempB[simP.x][simP.y] !== PORTAL) tempB[simP.x][simP.y] = simP.body;
                
                if(move.t === 'N') { simP.x = move.x; simP.y = move.y; } 
                else { simP.x = move.s2.x; simP.y = move.s2.y; }
                
                let score = evaluateBoard_Multi(tempB, tempPls, simP.id);
                if(score > bestScore) { bestScore = score; bestMoves = [move]; } 
                else if (score === bestScore) { bestMoves.push(move); }
            }
            if(bestMoves.length > 0) bestM = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        }
    }
    
    // 3. 计算完毕，将决定的最优步发回给主前台
    postMessage({ type: 'MOVE_CALCULATED', bestMove: bestM });
}

// ============================================================================
// 🛠️ 纯数学/逻辑函数库 (脱离 DOM 运行)
// ============================================================================

function isPortalExitOk(cx, cy, px, py, tempBoard, tempPls) {
    if(cx<0||cx>=config.cols||cy<0||cy>=config.rows || tempBoard[cx][cy]!==EMPTY || tempPls.some(p=>p.x===cx&&p.y===cy)) return false;
    for(let p of portals){ if(p.x===px&&p.y===py)continue; if(Math.abs(cx-p.x)<=1&&Math.abs(cy-p.y)<=1) return true; }
    return false;
}

function aiGetMoves_2P(gs, isP1) {
    let h = isP1?gs.p1:gs.p2, opp = isP1?gs.p2:gs.p1;
    let pMoves=[], nMoves=[];
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
        if(dx===0&&dy===0)continue; let nx=h.x+dx, ny=h.y+dy;
        if(nx>=0&&nx<config.cols&&ny>=0&&ny<config.rows){
            let tc = gs.b[nx][ny];
            if((tc===EMPTY||tc===PORTAL) && !(nx===opp.x&&ny===opp.y)){
                if(tc===PORTAL){
                    for(let x=0;x<config.cols;x++)for(let y=0;y<config.rows;y++) 
                        if(isPortalExitOk(x,y,nx,ny, gs.b, [gs.p1, gs.p2])) {
                            pMoves.push({t:'P', s1:{x:nx,y:ny}, s2:{x,y}, d: Math.abs(x-opp.x)+Math.abs(y-opp.y)});
                        }
                } else nMoves.push({t:'N', x:nx, y:ny, d: Math.abs(nx-opp.x)+Math.abs(ny-opp.y)});
            }
        }
    }
    nMoves.sort((a,b)=>a.d-b.d); pMoves.sort((a,b)=>a.d-b.d);
    if(pMoves.length > 8) pMoves = pMoves.slice(0,6).concat(pMoves.slice(-2));
    return nMoves.concat(pMoves);
}

function aiApply_2P(gs, move) {
    let h = gs.turn?gs.p1:gs.p2;
    if(gs.b[h.x][h.y]!==PORTAL) gs.b[h.x][h.y] = gs.turn?P1_BODY:P2_BODY;
    if(move.t==='N'){ h.x=move.x; h.y=move.y; } else { h.x=move.s2.x; h.y=move.s2.y; }
    gs.turn = !gs.turn;
}

function bfsDist_2P(start, tb, oppHead, useP) {
    let dist = Array.from({length:config.cols},()=>Array(config.rows).fill(9999));
    let q=[{x:start.x, y:start.y, d:0}], head=0; dist[start.x][start.y]=0;
    while(head<q.length){
        let curr=q[head++];
        if(useP){
            let nP=[]; for(let p of portals) if(Math.abs(curr.x-p.x)<=1&&Math.abs(curr.y-p.y)<=1) nP.push(p);
            if(nP.length>0){
                for(let p of portals){
                    if(nP.some(np=>np.x===p.x&&np.y===p.y))continue;
                    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
                        let nx=p.x+dx, ny=p.y+dy;
                        if(nx>=0&&nx<config.cols&&ny>=0&&ny<config.rows && tb[nx][ny]===EMPTY && !(nx===oppHead.x&&ny===oppHead.y)){
                            if(dist[nx][ny]>curr.d+1){ dist[nx][ny]=curr.d+1; q.push({x:nx, y:ny, d:curr.d+1}); }
                        }
                    }
                }
            }
        }
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
            if(dx===0&&dy===0)continue; let nx=curr.x+dx, ny=curr.y+dy;
            if(nx>=0&&nx<config.cols&&ny>=0&&ny<config.rows && (tb[nx][ny]===EMPTY||tb[nx][ny]===PORTAL) && !(nx===oppHead.x&&ny===oppHead.y)){
                if(dist[nx][ny]>curr.d+1){ dist[nx][ny]=curr.d+1; q.push({x:nx, y:ny, d:curr.d+1}); }
            }
        }
    }
    return dist;
}

function evalState_2P(gs) {
    let useP = (config.diff==='NORMAL');
    let dP2 = bfsDist_2P(gs.p2, gs.b, gs.p1, useP);
    let dP1 = bfsDist_2P(gs.p1, gs.b, gs.p2, useP);
    let s2=0, s1=0;
    for(let x=0;x<config.cols;x++)for(let y=0;y<config.rows;y++){
        if(gs.b[x][y]===EMPTY){ if(dP2[x][y]<dP1[x][y])s2++; else if(dP1[x][y]<dP2[x][y])s1++; }
    }
    return s2 - (s1*1.5);
}

function minimax_2P(gs, depth, alpha, beta, isMax) {
    let moves = aiGetMoves_2P(gs, !isMax);
    if(moves.length===0) return isMax?(-99999+depth):(99999-depth);
    if(depth===0) return evalState_2P(gs);
    
    if(isMax){
        let mE=-Infinity; 
        for(let m of moves){
            let ngs = { b: gs.b.map(r=>[...r]), p1: {...gs.p1}, p2: {...gs.p2}, turn: gs.turn };
            aiApply_2P(ngs, m);
            let ev = minimax_2P(ngs, depth-1, alpha, beta, false);
            mE=Math.max(mE,ev); alpha=Math.max(alpha,ev); if(beta<=alpha)break;
        }
        return mE;
    } else {
        let mE=Infinity;
        for(let m of moves){
            let ngs = { b: gs.b.map(r=>[...r]), p1: {...gs.p1}, p2: {...gs.p2}, turn: gs.turn };
            aiApply_2P(ngs, m);
            let ev = minimax_2P(ngs, depth-1, alpha, beta, true);
            mE=Math.min(mE,ev); beta=Math.min(beta,ev); if(beta<=alpha)break;
        }
        return mE;
    }
}

function getValidMoves_Multi(b, p, allPls) {
    let moves = [];
    let portalList = [];
    for(let pt of portals) {
        let isAlive = false;
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
            if(dx===0&&dy===0)continue; let nx=pt.x+dx, ny=pt.y+dy;
            if(nx>=0&&nx<config.cols&&ny>=0&&ny<config.rows && b[nx][ny]===EMPTY){ isAlive = true; break; }
        }
        if(isAlive) portalList.push(pt);
    }
    for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) {
        if(dx===0&&dy===0) continue;
        let nx=p.x+dx, ny=p.y+dy;
        if(nx>=0 && nx<config.cols && ny>=0 && ny<config.rows) {
            if(b[nx][ny] !== EMPTY && b[nx][ny] !== PORTAL) continue;
            if(allPls.some(op => op.x===nx && op.y===ny)) continue;
            if(b[nx][ny] === EMPTY) {
                moves.push({ t: 'N', x: nx, y: ny });
            } else if(b[nx][ny] === PORTAL && portalList.length > 1) {
                for(let pt of portalList) {
                    if(pt.x === nx && pt.y === ny) continue; 
                    for(let ex=-1;ex<=1;ex++)for(let ey=-1;ey<=1;ey++){
                        if(ex===0&&ey===0)continue; let px=pt.x+ex, py=pt.y+ey;
                        if(px>=0&&px<config.cols&&py>=0&&py<config.rows && b[px][py]===EMPTY && !allPls.some(op=>op.x===px&&op.y===py)) {
                            moves.push({ t: 'P', s1: {x: nx, y: ny}, s2: {x: px, y: py} });
                        }
                    }
                }
            }
        }
    }
    return moves;
}

function evaluateBoard_Multi(b, pls, myId) {
    let dists = Array.from({length: config.cols}, () => Array(config.rows).fill(null));
    let q = [];
    pls.filter(p => p.alive).forEach(p => { q.push({x: p.x, y: p.y, id: p.id, d: 0}); dists[p.x][p.y] = {id: p.id, d: 0}; });
    let counts = {}; pls.forEach(p => counts[p.id] = 0);
    let head = 0;
    while(head < q.length) {
        let curr = q[head++];
        for(let dx=-1; dx<=1; dx++) for(let dy=-1; dy<=1; dy++) {
            if(dx===0&&dy===0) continue; let nx = curr.x+dx, ny = curr.y+dy;
            if(nx>=0&&nx<config.cols&&ny>=0&&ny<config.rows && b[nx][ny]===EMPTY) {
                if(!dists[nx][ny]) { 
                    dists[nx][ny] = {id: curr.id, d: curr.d+1}; counts[curr.id]++;
                    q.push({x: nx, y: ny, id: curr.id, d: curr.d+1}); 
                }
            }
        }
    }
    let myScore = counts[myId] || 0;
    let maxEnemyScore = -1;
    for(let id in counts) { if(parseInt(id) !== myId && counts[id] > maxEnemyScore) maxEnemyScore = counts[id]; }
    return myScore - maxEnemyScore;
}