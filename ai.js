function cloneState(tb, tp1, tp2, tturn) { return { b: JSON.parse(JSON.stringify(tb)), p1: {...tp1}, p2: {...tp2}, turn: tturn }; }

function aiGetMoves(gs, isP1) {
    let h = isP1?gs.p1:gs.p2, opp = isP1?gs.p2:gs.p1;
    let pMoves=[], nMoves=[];
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
        if(dx===0&&dy===0)continue; let nx=h.x+dx, ny=h.y+dy;
        if(nx>=0&&nx<config.cols&&ny>=0&&ny<config.rows){
            let tc = gs.b[nx][ny];
            if((tc===EMPTY||tc===PORTAL) && !(nx===opp.x&&ny===opp.y)){
                if(tc===PORTAL){
                    for(let x=0;x<config.cols;x++)for(let y=0;y<config.rows;y++) 
                        if(isPortalExitOk(x,y,nx,ny, gs.b, gs.p1, gs.p2)) {
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

function aiApply(gs, move) {
    let h = gs.turn?gs.p1:gs.p2;
    if(gs.b[h.x][h.y]!==PORTAL) gs.b[h.x][h.y] = gs.turn?P1_BODY:P2_BODY;
    if(move.t==='N'){ h.x=move.x; h.y=move.y; } else { h.x=move.s2.x; h.y=move.s2.y; }
    gs.turn = !gs.turn;
}

function bfsDist(start, tb, oppHead, useP) {
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

function evalState(gs) {
    let useP = (config.diff==='NORMAL');
    let dP2 = bfsDist(gs.p2, gs.b, gs.p1, useP), dP1 = bfsDist(gs.p1, gs.b, gs.p2, useP);
    let s2=0, s1=0;
    for(let x=0;x<config.cols;x++)for(let y=0;y<config.rows;y++){
        if(gs.b[x][y]===EMPTY){ if(dP2[x][y]<dP1[x][y])s2++; else if(dP1[x][y]<dP2[x][y])s1++; }
    }
    return s2 - (s1*1.5);
}

function minimax(gs, depth, alpha, beta, isMax) {
    let moves = aiGetMoves(gs, !isMax);
    if(moves.length===0) return isMax?(-99999+depth):(99999-depth);
    if(depth===0) return evalState(gs);
    
    if(isMax){
        let mE=-Infinity; 
        for(let m of moves){
            let ngs = cloneState(gs.b, gs.p1, gs.p2, gs.turn); aiApply(ngs, m);
            let ev = minimax(ngs, depth-1, alpha, beta, false);
            mE=Math.max(mE,ev); alpha=Math.max(alpha,ev); if(beta<=alpha)break;
        }
        return mE;
    } else {
        let mE=Infinity;
        for(let m of moves){
            let ngs = cloneState(gs.b, gs.p1, gs.p2, gs.turn); aiApply(ngs, m);
            let ev = minimax(ngs, depth-1, alpha, beta, true);
            mE=Math.min(mE,ev); beta=Math.min(beta,ev); if(beta<=alpha)break;
        }
        return mE;
    }
}

function aiThinkAndMove() {
    let gs = cloneState(board, p1, p2, p1Turn);
    let moves = aiGetMoves(gs, false);
    
    if(moves.length===0){ 
        gameOver = true; triggerGameOver("死局，红蛇绝杀！", "p1-text", 'p1'); return; 
    }
    
    let bestS = -Infinity, bestM = null;
    for(let m of moves){
        let ngs = cloneState(gs.b, gs.p1, gs.p2, gs.turn); aiApply(ngs, m);
        let score = minimax(ngs, AI_DEPTH-1, -Infinity, Infinity, false);
        if(score > bestS || (score === bestS && Math.random() < 0.3)){ bestS=score; bestM=m; }
    }
    
    if(bestM){
        if(board[p2.x][p2.y]!==PORTAL) board[p2.x][p2.y]=P2_BODY;
        if(bestM.t === 'P') stats.p2.portals++; 
        if(bestM.t==='N'){ p2.x=bestM.x; p2.y=bestM.y; endTurn(); }
        else {
            p2.x=bestM.s1.x; p2.y=bestM.s1.y; portalMode=true;
            statusEl.innerText="AI 跃迁锁定中..."; statusEl.className="portal-text"; drawScene();
            setTimeout(()=>{ p2.x=bestM.s2.x; p2.y=bestM.s2.y; portalMode=false; endTurn(); }, 600);
        }
    } else endTurn();
}