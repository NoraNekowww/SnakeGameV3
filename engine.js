function generateMap() {
    let ok=false, attempts=0;
    let baseDen = config.cols===10 ? 0.22 : (config.cols===14 ? 0.28 : 0.32);
    if(config.wallDensity === 'LOW') baseDen -= 0.08;
    if(config.wallDensity === 'HIGH') baseDen += 0.08;
    let den = Math.max(0.05, Math.min(0.42, baseDen)); 

    while(!ok && attempts<50){
        attempts++; board = Array.from({length:config.cols},()=>Array(config.rows).fill(EMPTY));
        for(let x=0;x<config.cols;x++) for(let y=0;y<config.rows;y++) if(Math.random()<den) board[x][y]=WALL;
        board[p1.x][p1.y]=EMPTY; board[p2.x][p2.y]=EMPTY;
        
        let vis = Array.from({length:config.cols},()=>Array(config.rows).fill(false));
        let q=[{x:p1.x,y:p1.y}], reach=false; vis[p1.x][p1.y]=true;
        while(q.length>0){
            let c = q.shift(); if(c.x===p2.x && c.y===p2.y) reach=true;
            for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++){
                if(dx===0&&dy===0)continue; let nx=c.x+dx, ny=c.y+dy;
                if(nx>=0&&nx<config.cols&&ny>=0&&ny<config.rows&&board[nx][ny]!==WALL&&!vis[nx][ny]){
                    vis[nx][ny]=true; q.push({x:nx,y:ny});
                }
            }
        }
        if(reach){ for(let x=0;x<config.cols;x++) for(let y=0;y<config.rows;y++) if(!vis[x][y]) board[x][y]=WALL; ok=true; }
    }
    
    let getDistMap = (sx, sy) => {
        let dist = Array.from({length:config.cols},()=>Array(config.rows).fill(9999));
        let q = [{x:sx, y:sy, d:0}]; dist[sx][sy] = 0;
        let head = 0;
        while(head < q.length){
            let curr = q[head++];
            for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
                if(dx===0&&dy===0)continue; let nx=curr.x+dx, ny=curr.y+dy;
                if(nx>=0&&nx<config.cols&&ny>=0&&ny<config.rows && board[nx][ny]===EMPTY){
                    if(dist[nx][ny] > curr.d + 1){ dist[nx][ny] = curr.d + 1; q.push({x:nx, y:ny, d:curr.d+1}); }
                }
            }
        }
        return dist;
    };
    
    let d1 = getDistMap(p1.x, p1.y);
    let d2 = getDistMap(p2.x, p2.y);

    portals=[]; let cands=[]; 
    for(let x=1;x<config.cols-1;x++) for(let y=1;y<config.rows-1;y++) {
        if(board[x][y]===EMPTY && !(x===p1.x&&y===p1.y) && !(x===p2.x&&y===p2.y)){
            if(d1[x][y] < 9999 && d2[x][y] < 9999) {
                if(board[x+1][y]===WALL||board[x-1][y]===WALL||board[x][y+1]===WALL||board[x][y-1]===WALL) cands.push({x,y});
            }
        }
    }
    
    let pc = 0;
    if(config.portalDensity !== 'NONE'){
        if(config.portalDensity === 'FEW') pc = config.cols===18?4:(config.cols===14?2:2);
        else if(config.portalDensity === 'NORMAL') pc = config.cols===18?6:(config.cols===14?4:4);
        else if(config.portalDensity === 'MANY') pc = config.cols===18?8:(config.cols===14?6:6);
    }
    
    let bestPortals = [];
    if(config.fairPortal && pc > 0 && cands.length >= pc) {
        let bestDiff = 9999;
        for(let tries=0; tries<150; tries++) {
            cands.sort(()=>Math.random()-0.5); 
            let currentSelection = cands.slice(0, pc);
            let minD1 = Math.min(...currentSelection.map(p => d1[p.x][p.y]));
            let minD2 = Math.min(...currentSelection.map(p => d2[p.x][p.y]));
            let diff = Math.abs(minD1 - minD2);
            if(diff < bestDiff) { bestDiff = diff; bestPortals = currentSelection; }
            if(bestDiff === 0) break;
        }
    } else {
        cands.sort(()=>Math.random()-0.5); 
        bestPortals = cands.slice(0, pc); 
    }
    
    for(let i=0; i<bestPortals.length; i++){ 
        board[bestPortals[i].x][bestPortals[i].y]=PORTAL; 
        portals.push(bestPortals[i]); 
    }
}

function isPortalExitOk(cx,cy,px,py, tempBoard=board, tp1=p1, tp2=p2) {
    if(cx<0||cx>=config.cols||cy<0||cy>=config.rows || tempBoard[cx][cy]!==EMPTY || (cx===tp1.x&&cy===tp1.y) || (cx===tp2.x&&cy===tp2.y)) return false;
    for(let p of portals){ if(p.x===px&&p.y===py)continue; if(Math.abs(cx-p.x)<=1&&Math.abs(cy-p.y)<=1) return true; }
    return false;
}

function getActivePortalsCount() {
    let count = 0;
    for(let p of portals) {
        let isAlive = false;
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
            if(dx===0&&dy===0)continue; let nx=p.x+dx, ny=p.y+dy;
            if(nx>=0&&nx<config.cols&&ny>=0&&ny<config.rows && board[nx][ny]===EMPTY){ isAlive = true; break; }
        }
        if(isAlive) count++;
    }
    return count;
}

function drawPortal(centerX, centerY, radius, isUnavailable) {
    let innerColor = isUnavailable ? '#555' : '#9b59b6'; 
    let outerColor = isUnavailable ? '#222' : '#4a235a'; 
    ctx.fillStyle = innerColor;
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = outerColor; ctx.lineWidth = radius * 0.15; ctx.stroke();
}

function drawScene() {
    if(!CELL_SIZE || !ctx) return; 
    ctx.fillStyle='#16161d'; ctx.fillRect(0,0,canvas.width,canvas.height);
    let h=p1Turn?p1:p2;
    let showH = !isReplaying && ((config.mode==='PVE'&&p1Turn) || config.mode==='PVP' || (config.mode==='HOST'&&p1Turn) || (config.mode==='JOIN'&&!p1Turn));
    
    let dP1 = null, dP2 = null;
    
    // --- 【修复点】：精准控制染色时机，录像中途绝对不染色 ---
    let isLastReplayStep = isReplaying && (currentReplayIndex === historyLog.length - 1);
    let showTerritoryColors = config.autoJudge && ((gameOver && !isReplaying) || isLastReplayStep);
    
    if(showTerritoryColors) {
        dP2 = bfsDist(p2, board, p1, true);
        dP1 = bfsDist(p1, board, p2, true);
    }

    for(let x=0;x<config.cols;x++) for(let y=0;y<config.rows;y++){
        let cx=x*CELL_SIZE, cy=y*CELL_SIZE;
        ctx.strokeStyle='#22222a'; ctx.strokeRect(cx,cy,CELL_SIZE,CELL_SIZE);
        let v=board[x][y];

        if(showTerritoryColors && v === EMPTY && dP1 && dP2) {
            if(dP1[x][y] < dP2[x][y]) {
                ctx.fillStyle = 'rgba(255, 71, 87, 0.15)'; ctx.fillRect(cx+1, cy+1, CELL_SIZE-2, CELL_SIZE-2);
            } else if(dP2[x][y] < dP1[x][y]) {
                ctx.fillStyle = 'rgba(62, 147, 255, 0.15)'; ctx.fillRect(cx+1, cy+1, CELL_SIZE-2, CELL_SIZE-2);
            }
        }
        
        if(showH && portalMode && isPortalExitOk(x,y,h.x,h.y)){ ctx.fillStyle='rgba(155,89,182,0.25)'; ctx.fillRect(cx,cy,CELL_SIZE,CELL_SIZE); }
        if(v===WALL){ ctx.fillStyle='#3d3d3d';ctx.fillRect(cx+1,cy+1,CELL_SIZE-2,CELL_SIZE-2);
        } else if(v===P1_BODY){ ctx.fillStyle='#601a1a';ctx.fillRect(cx+1,cy+1,CELL_SIZE-2,CELL_SIZE-2);
        } else if(v===P2_BODY){ ctx.fillStyle='#1a2a60';ctx.fillRect(cx+1,cy+1,CELL_SIZE-2,CELL_SIZE-2); }
    }

    let activePortalsCount = getActivePortalsCount();
    for(let p of portals){
        let isBlocked = true;
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
            if(dx===0&&dy===0)continue; let nx=p.x+dx, ny=p.y+dy;
            if(nx>=0&&nx<config.cols&&ny>=0&&ny<config.rows && board[nx][ny]===EMPTY){ isBlocked = false; break; }
        }
        drawPortal(p.x * CELL_SIZE + CELL_SIZE/2, p.y * CELL_SIZE + CELL_SIZE/2, CELL_SIZE * 0.42, (activePortalsCount <= 1) || isBlocked );
    }

    drawH(p1.x,p1.y,'#ff4757',p1Turn); drawH(p2.x,p2.y,'#3e93ff',!p1Turn);
}

function drawH(x,y,c,turn){ ctx.fillStyle=c; ctx.beginPath(); ctx.arc(x*CELL_SIZE+CELL_SIZE/2,y*CELL_SIZE+CELL_SIZE/2,CELL_SIZE/2-2,0,7); if(turn&&!gameOver&&!isReplaying){ctx.shadowBlur=15;ctx.shadowColor=c;} ctx.fill(); ctx.shadowBlur=0; }

function getReachableBFS(startPos, oppPos) {
    let vis = Array.from({length:config.cols},()=>Array(config.rows).fill(false));
    let q = [{x:startPos.x, y:startPos.y}]; vis[startPos.x][startPos.y] = true;
    let count = 0;
    while(q.length>0){
        let c = q.shift();
        if (board[c.x][c.y] === EMPTY) count++;
        for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++){
            if(dx===0&&dy===0)continue; let nx=c.x+dx, ny=c.y+dy;
            if(nx>=0&&nx<config.cols&&ny>=0&&ny<config.rows && !(nx===oppPos.x&&ny===oppPos.y)){
                if(board[nx][ny]===EMPTY && !vis[nx][ny]){
                    vis[nx][ny]=true; q.push({x:nx, y:ny});
                } else if (board[nx][ny]===PORTAL && !vis[nx][ny]) {
                    vis[nx][ny]=true; 
                    for(let ex=0; ex<config.cols; ex++) for(let ey=0; ey<config.rows; ey++){
                        if(isPortalExitOk(ex,ey,nx,ny) && !vis[ex][ey]){ vis[ex][ey] = true; q.push({x:ex, y:ey}); }
                    }
                }
            }
        }
    }
    return { vis, count };
}

function processMoveLocally(cx, cy) {
    let h=p1Turn?p1:p2, opp=p1Turn?p2:p1, bC=p1Turn?P1_BODY:P2_BODY, ok=false;
    if(!portalMode){
        if(Math.abs(cx-h.x)<=1&&Math.abs(cy-h.y)<=1&&(cx!==h.x||cy!==h.y)){
            if(cx>=0&&cx<config.cols&&cy>=0&&cy<config.rows && (board[cx][cy]===EMPTY||board[cx][cy]===PORTAL) && !(cx===opp.x&&cy===opp.y)){
                if(board[cx][cy]===PORTAL){
                    let activePortalsCount = getActivePortalsCount();
                    if(activePortalsCount <= 1){
                        statusEl.innerText = "此传送门已失效"; statusEl.className = "portal-text"; setTimeout(updateStatusText, 800); return false; 
                    }
                    let isBlocked = true;
                    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
                        if(dx===0&&dy===0)continue; let nx=cx+dx, ny=cy+dy;
                        if(nx>=0&&nx<config.cols&&ny>=0&&ny<config.rows && board[nx][ny]===EMPTY){ isBlocked = false; break; }
                    }
                    if(isBlocked){
                        statusEl.innerText = "此传送门已被封锁"; statusEl.className = "portal-text"; setTimeout(updateStatusText, 800); return false; 
                    }
                    if(board[h.x][h.y]!==PORTAL) board[h.x][h.y]=bC; 
                    h.x=cx; h.y=cy; ok=true; stats[p1Turn?'p1':'p2'].portals++; 
                    portalMode=true; statusEl.innerText="跃迁点选择..."; statusEl.className="portal-text"; drawScene();
                } else {
                    if(board[h.x][h.y]!==PORTAL) board[h.x][h.y]=bC; h.x=cx; h.y=cy; ok=true; endTurn();
                }
            }
        }
    } else {
        if(isPortalExitOk(cx,cy,h.x,h.y)){ h.x=cx; h.y=cy; portalMode=false; ok=true; endTurn(); }
    }
    return ok;
}

function endTurn() {
    stats[p1Turn ? 'p1' : 'p2'].moves++;
    p1Turn=!p1Turn; 
    saveSnapshot(); 
    drawScene();
    
    let opp=p1Turn?p2:p1, h=p1Turn?p1:p2, can=false;
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
        if(dx===0&&dy===0)continue; let nx=h.x+dx,ny=h.y+dy;
        if(nx>=0&&nx<config.cols&&ny>=0&&ny<config.rows && !(nx===opp.x&&ny===opp.y)){
            if(board[nx][ny]===EMPTY) can=true;
            else if(board[nx][ny]===PORTAL){
                let activeCount = getActivePortalsCount();
                if(activeCount > 1) { 
                    for(let ex=0;ex<config.cols;ex++)for(let ey=0;ey<config.rows;ey++){ if(isPortalExitOk(ex,ey,nx,ny)) can=true; }
                }
            }
        }
    }
    
    if(!can){ gameOver=true; triggerGameOver(p1Turn?"死局，蓝蛇绝杀！":"死局，红蛇绝杀！", p1Turn?"p2-text":"p1-text", p1Turn?'p2':'p1'); return; }
    
    if(config.autoJudge) {
        let r1 = getReachableBFS(p1, p2), r2 = getReachableBFS(p2, p1);
        let isolated = true;
        for(let x=0; x<config.cols; x++){
            for(let y=0; y<config.rows; y++) {
                if(board[x][y] === EMPTY && r1.vis[x][y] && r2.vis[x][y]) { isolated = false; break; }
            }
            if(!isolated) break;
        }
        if(isolated) {
            gameOver = true;
            let wStr = r1.count > r2.count ? 'p1' : (r2.count > r1.count ? 'p2' : (p1Turn ? 'p2' : 'p1'));
            triggerGameOver(wStr === 'p1' ? "裁决：红蛇领域碾压获胜" : "裁决：蓝蛇领域碾压获胜", wStr === 'p1' ? "p1-text" : "p2-text", wStr, {c1: r1.count, c2: r2.count});
            return;
        }
    }
    
    updateStatusText();
    if(config.mode==='PVE' && !p1Turn && !gameOver) {
        setTimeout(() => { if(window.aiThinkAndMove) window.aiThinkAndMove(); }, 50);
    }
}

function updateStatusText() {
    if(config.mode==='PVE') statusEl.innerText=p1Turn?"你的回合":"AI推演中...";
    else if(config.mode==='PVP') statusEl.innerText=p1Turn?"红蛇回合":"蓝蛇回合";
    else statusEl.innerText=((config.mode==='HOST'&&p1Turn)||(config.mode==='JOIN'&&!p1Turn))?"👉 你的回合":"⏳ 对手思考中...";
    statusEl.className=p1Turn?"p1-text":"p2-text";
}

function triggerGameOver(msg, textClass, winnerStr, forceStats = null) {
    statusEl.innerText = msg; statusEl.className = textClass; drawScene();
    let cP1 = 0, cP2 = 0;
    if(forceStats) { 
        cP1 = forceStats.c1; cP2 = forceStats.c2; 
        let labelEl = document.getElementById('s-c-label'); if(labelEl) labelEl.innerText = "独立领地剩余空间"; 
    } else {
        let labelEl = document.getElementById('s-c-label'); if(labelEl) labelEl.innerText = "绝对控制域 (Voronoi)";
        let dP2 = bfsDist(p2, board, p1, true), dP1 = bfsDist(p1, board, p2, true);
        for(let x=0; x<config.cols; x++) for(let y=0; y<config.rows; y++) {
            if(board[x][y] === EMPTY){ if(dP1[x][y] < dP2[x][y]) cP1++; else if(dP2[x][y] < dP1[x][y]) cP2++; }
        }
    }
    
    try {
        if(config.mode === 'PVE') {
            let isWin = (winnerStr === 'p1');
            if(isWin) localRecord.wins++; else localRecord.losses++;
            
            let pMap = {NONE:'无', FEW:'少', NORMAL:'标准', MANY:'密集'};
            let wMap = {LOW:'稀疏', NORMAL:'标准', HIGH:'密集'};
            
            let matchData = {
                time: new Date().toLocaleString('zh-CN', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                diff: config.diff === 'EASY' ? 'Myopic' : 'Weaver',
                size: config.cols,
                judge: config.autoJudge ? "开" : "关",
                portals: pMap[config.portalDensity] || "标准",
                walls: wMap[config.wallDensity] || "标准",
                res: isWin ? "Win" : "Loss"
            };
            
            if(!localRecord.matches) localRecord.matches = [];
            localRecord.matches.unshift(matchData);
            if(localRecord.matches.length > 50) localRecord.matches.pop();
            localStorage.setItem('norasGameRecord', JSON.stringify(localRecord));
        }
    } catch (e) { console.warn("战绩保存失败", e); }

    document.getElementById('statsWinnerTitle').innerText = winnerStr === 'p1' ? "🏆 红蛇 夺取控制权" : "🏆 蓝蛇 夺取控制权";
    document.getElementById('statsWinnerTitle').className = winnerStr === 'p1' ? "p1-text" : "p2-text";
    document.getElementById('s-m1').innerText = stats.p1.moves; document.getElementById('s-m2').innerText = stats.p2.moves;
    document.getElementById('s-p1').innerText = stats.p1.portals; document.getElementById('s-p2').innerText = stats.p2.portals;
    document.getElementById('s-c1').innerText = cP1 + " 格"; document.getElementById('s-c2').innerText = cP2 + " 格";
    
    setTimeout(() => { document.getElementById('statsOverlay').style.display = 'flex'; }, 500);
}

window.aiThinkAndMove = async function() {
    let gs = cloneState(board, p1, p2, p1Turn);
    let moves = aiGetMoves(gs, false);
    
    if(moves.length===0){ gameOver = true; triggerGameOver("死局，红蛇绝杀！", "p1-text", 'p1'); return; }
    
    let bestS = -Infinity, bestM = null;
    for(let m of moves){
        let ngs = cloneState(gs.b, gs.p1, gs.p2, gs.turn); aiApply(ngs, m);
        let score = minimax(ngs, AI_DEPTH-1, -Infinity, Infinity, false);
        if(score > bestS || (score === bestS && Math.random() < 0.3)){ bestS=score; bestM=m; }
        await new Promise(resolve => setTimeout(resolve, 0));
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