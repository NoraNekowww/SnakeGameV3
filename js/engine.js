// --- 混合引擎 (Hybrid Engine) ---
function generateMap() {
    players = [];
    let pCount = config.playerCount;
    let c = config.cols, r = config.rows;
    
    players.push({ id: 1, x: 1, y: 1, alive: true, type: 'HUMAN', body: P1_BODY, color: 'var(--p1)', css: 'p1-text', name: '红蛇' });
    if(pCount === 2) {
        players.push({ id: 2, x: c-2, y: r-2, alive: true, type: config.p2Type, body: P2_BODY, color: 'var(--p2)', css: 'p2-text', name: '蓝蛇' });
    } else {
        if(pCount >= 2) players.push({ id: 2, x: c-2, y: r-2, alive: true, type: config.p2Type, body: P2_BODY, color: 'var(--p2)', css: 'p2-text', name: '蓝蛇' });
        if(pCount >= 3) players.push({ id: 3, x: c-2, y: 1, alive: true, type: config.p3Type, body: P3_BODY, color: 'var(--p3)', css: 'p3-text', name: '黄蛇' });
        if(pCount >= 4) players.push({ id: 4, x: 1, y: r-2, alive: true, type: config.p4Type, body: P4_BODY, color: 'var(--p4)', css: 'p4-text', name: '青蛇' });
    }

    let ok=false, attempts=0;
    let baseDen = config.cols<=10 ? 0.22 : (config.cols===14 ? 0.28 : 0.32);
    if(config.wallDensity === 'LOW') baseDen -= 0.08;
    if(config.wallDensity === 'HIGH') baseDen += 0.08;
    let den = Math.max(0.05, Math.min(0.42, baseDen)); 

    while(!ok && attempts<50){
        attempts++; 
        board = Array.from({length:config.cols},()=>Array(config.rows).fill(EMPTY));
        for(let x=0;x<config.cols;x++) for(let y=0;y<config.rows;y++) if(Math.random()<den) board[x][y]=WALL;
        players.forEach(p => board[p.x][p.y] = EMPTY);
        
        let vis = Array.from({length:config.cols},()=>Array(config.rows).fill(false));
        let q=[{x:players[0].x, y:players[0].y}]; vis[players[0].x][players[0].y]=true;
        while(q.length>0){
            let curr = q.shift();
            for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++){
                if(dx===0&&dy===0)continue; let nx=curr.x+dx, ny=curr.y+dy;
                if(nx>=0&&nx<config.cols&&ny>=0&&ny<config.rows&&board[nx][ny]!==WALL&&!vis[nx][ny]){
                    vis[nx][ny]=true; q.push({x:nx,y:ny});
                }
            }
        }
        if(players.every(p => vis[p.x][p.y])){ 
            for(let x=0;x<config.cols;x++) for(let y=0;y<config.rows;y++) if(!vis[x][y]) board[x][y]=WALL; 
            ok=true; 
        }
    }
    
    portals=[]; let cands=[]; 
    
    if (config.playerCount === 2) {
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
        let d1 = getDistMap(players[0].x, players[0].y);
        let d2 = getDistMap(players[1].x, players[1].y);

        for(let x=1;x<config.cols-1;x++) for(let y=1;y<config.rows-1;y++) {
            if(board[x][y]===EMPTY && !players.some(p=>p.x===x&&p.y===y)){
                if(d1[x][y] < 9999 && d2[x][y] < 9999) {
                    if(board[x+1][y]===WALL||board[x-1][y]===WALL||board[x][y+1]===WALL||board[x][y-1]===WALL) cands.push({x,y});
                }
            }
        }
        let pc = 0;
        if(config.portalDensity !== 'NONE'){
            if(config.portalDensity === 'FEW') pc = config.cols>=18?4:2;
            else if(config.portalDensity === 'NORMAL') pc = config.cols>=18?6:4;
            else if(config.portalDensity === 'MANY') pc = config.cols>=18?8:6;
        }
        let bestPortals = [];
        if(config.fairPortal && pc > 0 && cands.length >= pc) {
            let bestDiff = 9999;
            for(let tries=0; tries<150; tries++) {
                cands.sort(()=>Math.random()-0.5); 
                let currentSelection = cands.slice(0, pc);
                let diff = Math.abs(Math.min(...currentSelection.map(p => d1[p.x][p.y])) - Math.min(...currentSelection.map(p => d2[p.x][p.y])));
                if(diff < bestDiff) { bestDiff = diff; bestPortals = currentSelection; }
                if(bestDiff === 0) break;
            }
        } else {
            cands.sort(()=>Math.random()-0.5); bestPortals = cands.slice(0, pc); 
        }
        for(let i=0; i<bestPortals.length; i++){ board[bestPortals[i].x][bestPortals[i].y]=PORTAL; portals.push(bestPortals[i]); }
    } else {
        for(let x=1;x<config.cols-1;x++) for(let y=1;y<config.rows-1;y++) {
            if(board[x][y]===EMPTY && !players.some(p=>p.x===x&&p.y===y)){
                if(board[x+1][y]===WALL||board[x-1][y]===WALL||board[x][y+1]===WALL||board[x][y-1]===WALL) cands.push({x,y});
            }
        }
        let pc = config.cols>=18?6:4;
        if(config.portalDensity === 'FEW') pc-=2; if(config.portalDensity === 'MANY') pc+=2;
        pc = Math.floor(pc * 1.5);
        cands.sort(()=>Math.random()-0.5); 
        let bestPortals = cands.slice(0, pc); 
        for(let i=0; i<bestPortals.length; i++){ board[bestPortals[i].x][bestPortals[i].y]=PORTAL; portals.push(bestPortals[i]); }
    }
}

function isPortalExitOk(cx, cy, px, py, tempBoard = board, tempPls = players) {
    if(cx<0||cx>=config.cols||cy<0||cy>=config.rows || tempBoard[cx][cy]!==EMPTY || tempPls.some(p=>p.x===cx&&p.y===cy)) return false;
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
    let innerColor = isUnavailable ? '#555' : '#9b59b6'; let outerColor = isUnavailable ? '#222' : '#4a235a'; 
    ctx.fillStyle = innerColor; ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = outerColor; ctx.lineWidth = radius * 0.15; ctx.stroke();
}

// --- 万能领地扩张算法 (多源并发 BFS，支持传送门) ---
function getMultiTerritory(b = board, pls = players) {
    let dists = Array.from({length: config.cols}, () => Array(config.rows).fill(null));
    let q = [];
    // 让所有活着的玩家同时开始向外蔓延
    pls.filter(p => p.alive).forEach(p => { 
        q.push({x: p.x, y: p.y, id: p.id, d: 0}); 
        dists[p.x][p.y] = {id: p.id, d: 0}; 
    });
    
    let head = 0;
    while(head < q.length) {
        let curr = q[head++];
        for(let dx=-1; dx<=1; dx++) {
            for(let dy=-1; dy<=1; dy++) {
                if(dx===0 && dy===0) continue;
                let nx = curr.x+dx, ny = curr.y+dy;
                
                if(nx>=0 && nx<config.cols && ny>=0 && ny<config.rows) {
                    // 空地蔓延
                    if (b[nx][ny] === EMPTY) {
                        if(!dists[nx][ny] || dists[nx][ny].d > curr.d + 1) { 
                            dists[nx][ny] = {id: curr.id, d: curr.d+1}; 
                            q.push({x: nx, y: ny, id: curr.id, d: curr.d+1}); 
                        }
                    } 
                    // 传送门穿透
                    else if (b[nx][ny] === PORTAL) {
                        for(let ex=0; ex<config.cols; ex++) {
                            for(let ey=0; ey<config.rows; ey++) {
                                if(typeof isPortalExitOk === 'function' && isPortalExitOk(ex, ey, nx, ny, b, pls)) {
                                    if(!dists[ex][ey] || dists[ex][ey].d > curr.d + 1) {
                                        dists[ex][ey] = {id: curr.id, d: curr.d+1};
                                        q.push({x: ex, y: ey, id: curr.id, d: curr.d+1});
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return dists;
}

function drawScene() {
    if(!CELL_SIZE || !ctx) return; 
    ctx.fillStyle='#16161d'; ctx.fillRect(0,0,canvas.width,canvas.height);
    
    let cp = players[currentTurnIndex];
    let showH = !isReplaying && cp && cp.type === 'HUMAN';
    let isLastReplayStep = isReplaying && (currentReplayIndex === historyLog.length - 1);
    let showTerritoryColors = config.autoJudge && ((gameOver && !isReplaying) || isLastReplayStep);
    
    let multiDists = null;
    if(showTerritoryColors) {
        multiDists = getMultiTerritory(); // 涂色全部交给万能算法
    }

    const colorMap = {1: '#ff4757', 2: '#3e93ff', 3: '#f1c40f', 4: '#1abc9c'};

    for(let x=0; x<config.cols; x++) {
        for(let y=0; y<config.rows; y++) {
            let cx=x*CELL_SIZE, cy=y*CELL_SIZE;
            ctx.strokeStyle='#22222a'; ctx.strokeRect(cx,cy,CELL_SIZE,CELL_SIZE);
            let v=board[x][y];

            // 动态多阵营领地颜色渲染 (支持任何人！)
            if(showTerritoryColors && v === EMPTY && multiDists && multiDists[x][y]) {
                ctx.fillStyle = colorMap[multiDists[x][y].id]; 
                ctx.globalAlpha = 0.15;
                ctx.fillRect(cx+1, cy+1, CELL_SIZE-2, CELL_SIZE-2); 
                ctx.globalAlpha = 1.0;
            }
            
            if(showH && portalMode && isPortalExitOk(x,y,cp.x,cp.y)){ ctx.fillStyle='rgba(155,89,182,0.25)'; ctx.fillRect(cx,cy,CELL_SIZE,CELL_SIZE); }
            if(v===WALL){ ctx.fillStyle='#3d3d3d';ctx.fillRect(cx+1,cy+1,CELL_SIZE-2,CELL_SIZE-2);
            } else if(v===P1_BODY){ ctx.fillStyle='#601a1a';ctx.fillRect(cx+1,cy+1,CELL_SIZE-2,CELL_SIZE-2);
            } else if(v===P2_BODY){ ctx.fillStyle='#1a2a60';ctx.fillRect(cx+1,cy+1,CELL_SIZE-2,CELL_SIZE-2); 
            } else if(v===P3_BODY){ ctx.fillStyle='#605a1a';ctx.fillRect(cx+1,cy+1,CELL_SIZE-2,CELL_SIZE-2); 
            } else if(v===P4_BODY){ ctx.fillStyle='#1a605a';ctx.fillRect(cx+1,cy+1,CELL_SIZE-2,CELL_SIZE-2); }
        }
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

    players.forEach(p => { if(p.alive) drawH(p.x, p.y, colorMap[p.id], p === cp); else drawH(p.x, p.y, '#555', false); });
}

function drawH(x,y,c,isTurn){ ctx.fillStyle=c; ctx.beginPath(); ctx.arc(x*CELL_SIZE+CELL_SIZE/2,y*CELL_SIZE+CELL_SIZE/2,CELL_SIZE/2-2,0,7); if(isTurn&&!gameOver&&!isReplaying){ctx.shadowBlur=15;ctx.shadowColor=c;} ctx.fill(); ctx.shadowBlur=0; }

function processMoveLocally(cx, cy) {
    let cp = players[currentTurnIndex];
    let ok=false;
    if(!portalMode){
        if(Math.abs(cx-cp.x)<=1&&Math.abs(cy-cp.y)<=1&&(cx!==cp.x||cy!==cp.y)){
            if(cx>=0&&cx<config.cols&&cy>=0&&cy<config.rows && (board[cx][cy]===EMPTY||board[cx][cy]===PORTAL) && !players.some(p=>p.x===cx&&p.y===cy)){
                if(board[cx][cy]===PORTAL){
                    if(getActivePortalsCount() <= 1){ statusEl.innerText = "此传送门已失效"; statusEl.className = "portal-text"; setTimeout(updateStatusText, 800); return false; }
                    if(board[cp.x][cp.y]!==PORTAL) board[cp.x][cp.y]=cp.body; 
                    cp.x=cx; cp.y=cy; ok=true; stats[cp.id].portals++; 
                    portalMode=true; statusEl.innerText="跃迁点选择..."; statusEl.className="portal-text"; drawScene();
                } else {
                    if(board[cp.x][cp.y]!==PORTAL) board[cp.x][cp.y]=cp.body; cp.x=cx; cp.y=cy; ok=true; endTurn();
                }
            }
        }
    } else {
        if(isPortalExitOk(cx,cy,cp.x,cp.y)){ cp.x=cx; cp.y=cy; portalMode=false; ok=true; endTurn(); }
    }
    return ok;
}

function checkAlive(p) {
    if(!p.alive) return false;
    let canMove = false;
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
        if(dx===0&&dy===0)continue; let nx=p.x+dx,ny=p.y+dy;
        if(nx>=0&&nx<config.cols&&ny>=0&&ny<config.rows && !players.some(op=>op.x===nx&&op.y===ny)){
            if(board[nx][ny]===EMPTY) canMove=true;
            else if(board[nx][ny]===PORTAL && getActivePortalsCount() > 1){
                for(let ex=0;ex<config.cols;ex++)for(let ey=0;ey<config.rows;ey++) if(isPortalExitOk(ex,ey,nx,ny)) canMove=true;
            }
        }
    }
    return canMove;
}

function getReachableBFS_2P(startPos, oppPos) {
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

function endTurn() {
    let cp = players[currentTurnIndex];
    stats[cp.id].moves++;
    if(typeof saveSnapshot === 'function') saveSnapshot(); 
    
    players.forEach(p => { if(p.alive && !checkAlive(p)) p.alive = false; });
    
    let alivePls = players.filter(p => p.alive);
    if(alivePls.length <= 1) {
        gameOver = true;
        let winner = alivePls.length === 1 ? alivePls[0] : cp;
        triggerGameOver(`战局结束，${winner.name} 胜利！`, winner.css, winner);
        if(typeof window.broadcastState === 'function') window.broadcastState();
        return;
    }

    if(config.autoJudge) {
            // 只有正好剩余 2 人时，才进行完美的切断判定
            if (alivePls.length === 2) {
                let pA = alivePls[0], pB = alivePls[1];
                let r1 = getReachableBFS_2P(pA, pB), r2 = getReachableBFS_2P(pB, pA);
                let isolated = true;
                for(let x=0; x<config.cols; x++){
                    for(let y=0; y<config.rows; y++) {
                        if(board[x][y] === EMPTY && r1.vis[x][y] && r2.vis[x][y]) { isolated = false; break; }
                    }
                    if(!isolated) break;
                }
                if(isolated) {
                    gameOver = true;
                    let winner = r1.count > r2.count ? pA : (r2.count > r1.count ? pB : cp);
                    // 【核心修复】动态传递真实的玩家 ID 作为键值，不再写死 c1/c2
                    let dynStats = {};
                    dynStats[pA.id] = r1.count;
                    dynStats[pB.id] = r2.count;
                    triggerGameOver(`裁决：${winner.name} 领域优势获胜`, winner.css, winner, dynStats);
                    if(typeof window.broadcastState === 'function') window.broadcastState();
                    return;
                }
            }
        }

    do { currentTurnIndex = (currentTurnIndex + 1) % players.length; } while (!players[currentTurnIndex].alive);
    
    drawScene(); updateStatusText();
    
    // 主机在每回合结束时，全盘状态向所有客机进行绝对同步覆盖，防止断联或异地演算误差
    if(typeof window.broadcastState === 'function') window.broadcastState();
    
    let nextP = players[currentTurnIndex];
    if(nextP.type === 'AI' && !gameOver) {
        setTimeout(() => { if(window.aiThinkAndMove) window.aiThinkAndMove(); else endTurn(); }, 50);
    }
}

function updateStatusText() {
    let cp = players[currentTurnIndex];
    statusEl.innerText = cp.type === 'HUMAN' ? `👉 ${cp.name} 回合` : `⏳ ${cp.name}(AI) 推演中...`;
    statusEl.className = cp.css;
}

// 全新动态列表渲染：抛弃了写死的红蓝对比，按总人数动态堆叠卡片
function triggerGameOver(msg, textClass, winner, forceStats = null) {
    statusEl.innerText = msg; statusEl.className = textClass; drawScene();
    let counts = {1:0, 2:0, 3:0, 4:0};

    if(forceStats) { 
        // 【核心修复】动态解析传过来的玩家成绩，是谁的就是谁的
        for(let pid in forceStats) {
            counts[pid] = forceStats[pid];
        }
        let labelEl = document.getElementById('s-c-label'); if(labelEl) labelEl.innerText = "独立领地剩余空间"; 
    } else {
        let labelEl = document.getElementById('s-c-label'); if(labelEl) labelEl.innerText = "绝对控制域 (Voronoi)";
        let multiDists = getMultiTerritory();
        for(let x=0; x<config.cols; x++) for(let y=0; y<config.rows; y++) {
            if(board[x][y] === EMPTY && multiDists[x][y]) counts[multiDists[x][y].id]++;
        }
    }
    
    let titleEl = document.getElementById('statsWinnerTitle');
    if(titleEl) { titleEl.innerText = `🏆 ${winner.name} 胜利`; titleEl.className = winner.css; }
    
    let listHtml = '';
    let sortedPlayers = [...players].sort((a,b) => counts[b.id] - counts[a.id]);
    
    sortedPlayers.forEach(p => {
        listHtml += `
            <div class="player-stat-card" style="border-left: 4px solid ${p.color};">
                <div class="stat-name" style="color: ${p.color}; font-weight:bold; font-size: 16px;">${p.name}</div>
                <div class="stat-details" style="color: #ccc; font-size: 13px; text-align: right;">
                    <span style="display:inline-block; margin-right: 15px;">机动: <b style="color:#fff">${stats[p.id].moves}</b> 步</span>
                    <span>领地: <b style="color:var(--ac); font-size:15px">${counts[p.id]}</b> 格</span>
                </div>
            </div>
        `;
    });
    
    let container = document.getElementById('statsListContainer');
    if(container) container.innerHTML = listHtml;
    
    setTimeout(() => { let overlay = document.getElementById('statsOverlay'); if(overlay) overlay.style.display = 'flex'; }, 500);
}

// --- 追加在 engine.js 最底部：结局战报与 UI 渲染专用的领地统计算法 ---
function bfsDist_2P(startPos, currentBoard, oppPos, checkPortals, allPlayers) {
    let dist = Array.from({length: config.cols}, () => Array(config.rows).fill(9999));
    let q = [{x: startPos.x, y: startPos.y, d: 0}];
    dist[startPos.x][startPos.y] = 0;
    let head = 0;

    while(head < q.length) {
        let curr = q[head++];
        for(let dx=-1; dx<=1; dx++) {
            for(let dy=-1; dy<=1; dy++) {
                if(dx===0 && dy===0) continue;
                let nx = curr.x + dx, ny = curr.y + dy;
                if(nx>=0 && nx<config.cols && ny>=0 && ny<config.rows) {
                    // 蔓延空地
                    if(currentBoard[nx][ny] === EMPTY && dist[nx][ny] > curr.d + 1) {
                        dist[nx][ny] = curr.d + 1;
                        q.push({x: nx, y: ny, d: curr.d + 1});
                    }
                    // 穿透传送门
                    else if(checkPortals && currentBoard[nx][ny] === PORTAL) {
                        for(let ex=0; ex<config.cols; ex++) {
                            for(let ey=0; ey<config.rows; ey++) {
                                if(typeof isPortalExitOk === 'function' && isPortalExitOk(ex, ey, nx, ny, currentBoard, allPlayers)) {
                                    if(dist[ex][ey] > curr.d + 1) {
                                        dist[ex][ey] = curr.d + 1;
                                        q.push({x: ex, y: ey, d: curr.d + 1});
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return dist;
}