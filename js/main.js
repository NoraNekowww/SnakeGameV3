document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas'); ctx = canvas ? canvas.getContext('2d') : null;
    statusEl = document.getElementById('status'); btnPlayReplay = document.getElementById('btnReplayPlay');
    speedSelect = document.getElementById('replaySpeedSelect');

    try {
        let saved = window.localStorage.getItem('norasGameRecord');
        if(saved) { let parsed = JSON.parse(saved); if(parsed && parsed.matches) localRecord = parsed; }
    } catch(e) { console.warn("本地存储不可用", e); }
    if(!localRecord) localRecord = { wins: 0, losses: 0, matches: [] }; if(!localRecord.matches) localRecord.matches = [];

    const bindClick = (id, fn) => { let el = document.getElementById(id); if(el) el.onclick = fn; };
    const setDisplay = (id, val) => { let el = document.getElementById(id); if(el) el.style.display = val; };

    if(localRecord.matches.length > 0) { let tutBtn = document.getElementById('btnOpenTutorial'); if(tutBtn) { tutBtn.style.background = '#2a2a35'; tutBtn.style.color = '#777'; tutBtn.style.border = '1px solid #444'; } }

    function renderRecordPanel() {
        let eWins = document.getElementById('statWins'); if(eWins) eWins.innerText = localRecord.wins;
        let eLoss = document.getElementById('statLosses'); if(eLoss) eLoss.innerText = localRecord.losses;
        let total = localRecord.wins + localRecord.losses;
        let rate = total > 0 ? Math.round((localRecord.wins / total) * 100) : 0;
        let rateEl = document.getElementById('statWinRate');
        if(rateEl) { rateEl.innerText = rate + '%'; rateEl.style.color = rate >= 60 ? '#2ecc71' : (rate < 40 ? '#e74c3c' : '#f1c40f'); }
        let listEl = document.getElementById('matchHistoryList'); if(!listEl) return;
        listEl.innerHTML = '';
        if(localRecord.matches.length === 0) { listEl.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">尚无实战记录，开始你的第一局吧！</div>'; return; }
        localRecord.matches.forEach(m => {
            let isWin = m.res === 'Win';
            listEl.innerHTML += `<div class="match-item ${isWin ? 'win' : 'loss'}">
                <div class="match-header"><span>${m.time}</span><span class="match-res ${isWin ? 'win' : 'loss'}">${isWin ? '胜利' : '战败'}</span></div>
                <div class="match-params"><span class="param-tag">🧠 ${m.diff}</span><span class="param-tag">📏 ${m.size}</span><span class="param-tag">🌀 ${m.portals}</span></div>
            </div>`;
        });
    }

    bindClick('btnOpenRecords', () => { setDisplay('mainMenu', 'none'); setDisplay('recordPanel', 'block'); renderRecordPanel(); });
    bindClick('btnBackFromRecords', () => { setDisplay('recordPanel', 'none'); setDisplay('mainMenu', 'block'); });
    bindClick('btnClearRecords', () => { if(confirm("警告：将永久删除所有终端实战记录！确定格式化？")) { localRecord = { wins: 0, losses: 0, matches: [] }; try { window.localStorage.removeItem('norasGameRecord'); } catch(e){} renderRecordPanel(); } });
    bindClick('btnOpenTutorial', () => { setDisplay('mainMenu', 'none'); setDisplay('tutorialPanel', 'block'); });
    bindClick('btnBackFromTutorial', () => { setDisplay('tutorialPanel', 'none'); setDisplay('mainMenu', 'block'); });

    async function scanCustomServerRooms() {
        let listEl = document.getElementById('roomListContent'); if(!listEl) return;
        listEl.innerHTML = '📡 正在扫描雷达频道...';
        try {
            let protocol = SERVER_CONFIG.secure ? 'https' : 'http';
            let res = await fetch(`${protocol}://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}${SERVER_CONFIG.path}peerjs/peers`, { signal: AbortSignal.timeout(3000) });
            if(!res.ok) throw new Error("API 拒绝");
            let peers = await res.json();
            let rooms = peers.filter(p => p.startsWith('noraz_game_'));
            if(rooms.length === 0) listEl.innerHTML = '<span style="color:#aaa">当前没有主机建立房间。</span>';
            else listEl.innerHTML = rooms.map(r => `<div class="room-item" onclick="document.getElementById('targetRoomId').value='${r.replace('noraz_game_','')}';">🛰️ 频道: ${r.replace('noraz_game_','')} (点击填入)</div>`).join('');
        } catch(e) { listEl.innerHTML = '<span style="color:#666; font-size:12px;">雷达在此网络环境受限，请直接填入房间号。</span>'; }
    }
    bindClick('btnRefreshRadar', () => { let l = document.getElementById('roomListContent'); if(l) l.innerHTML='📡 正在重新扫描...'; setTimeout(scanCustomServerRooms,300); });

    function setMode(mode) {
        config.mode = mode;
        ['PVE','PVP','Host','Join'].forEach(m => { let el = document.getElementById('mode'+m); if(el) el.className = mode === m.toUpperCase() ? "toggle-btn selected" : "toggle-btn"; });
        
        setDisplay('diffSection', mode === 'PVE' ? 'block' : 'none');
        setDisplay('playerSettingsSection', (mode === 'PVP' || mode === 'HOST') ? 'block' : 'none');
        setDisplay('mapSettingsSection', mode === 'JOIN' ? 'none' : 'block'); 
        setDisplay('connectionPanel', (mode === 'HOST' || mode === 'JOIN') ? 'block' : 'none');
        setDisplay('hostPanel', mode === 'HOST' ? 'block' : 'none');
        setDisplay('joinPanel', mode === 'JOIN' ? 'block' : 'none');
        setDisplay('lobbyPanel', 'none'); // 隐藏大厅
        
        if(mode === 'PVE') { 
            config.playerCount = 2; 
            config.p2Type = 'AI'; 
        } else {
            // 修复本地三人变双人的Bug：从单机切回本地/联机时，根据当前UI高亮按钮恢复真实人数
            if (document.getElementById('count4') && document.getElementById('count4').classList.contains('selected')) config.playerCount = 4;
            else if (document.getElementById('count3') && document.getElementById('count3').classList.contains('selected')) config.playerCount = 3;
            else config.playerCount = 2;
        }

        if(mode === 'HOST') { 
            // 房主页面默认全是玩家，取消 AI 接管
            setRole('p2', 'HUMAN');
            setRole('p3', 'HUMAN');
            setRole('p4', 'HUMAN');
        } else if (mode === 'JOIN') { 
            config.playerCount = 2; 
            config.p2Type = 'HUMAN'; 
        }
        
        let sBtn = document.getElementById('startBtn');
        if(sBtn) {
            sBtn.style.display = 'block';
            if(mode === 'HOST') sBtn.innerText = '建立房间并进入大厅';
            else if(mode === 'JOIN') { sBtn.innerText = '连接主机'; scanCustomServerRooms(); }
            else sBtn.innerText = '开始跃迁';
        }
    }
    bindClick('modePVE', () => setMode('PVE')); bindClick('modePVP', () => setMode('PVP'));
    bindClick('modeHost', () => setMode('HOST')); bindClick('modeJoin', () => setMode('JOIN'));

    window.updateLobbyUI = function(pList) {
        let listEl = document.getElementById('lobbyList'); if(!listEl) return;
        if(!pList) pList = [{id: 1, name: '主机 (红蛇)'}]; // 默认只有主机
        listEl.innerHTML = pList.map(p => `
            <div class="lobby-item">
                <span style="color: var(--p${p.id})">● 席位 P${p.id}</span>
                <span style="color: #fff">${p.name}</span>
            </div>
        `).join('');
    };

    function setPlayerCount(c) {
        config.playerCount = c;
        ['count2','count3','count4'].forEach(id => { let el = document.getElementById(id); if(el) el.className = (id === 'count'+c) ? "toggle-btn selected" : "toggle-btn"; });
        setDisplay('p3Config', c >= 3 ? 'block' : 'none'); setDisplay('p4Config', c >= 4 ? 'block' : 'none');
        if(c === 3 && config.cols === 10) setSize('M'); if(c === 4 && config.cols < 18) setSize('L');
    }
    bindClick('count2', () => setPlayerCount(2)); bindClick('count3', () => setPlayerCount(3)); bindClick('count4', () => setPlayerCount(4));

    const setRole = (p, role) => { config[p+'Type'] = role; let humanEl = document.getElementById(p+'Human'), aiEl = document.getElementById(p+'AI'); if(humanEl) humanEl.className = role === 'HUMAN' ? "toggle-btn selected" : "toggle-btn"; if(aiEl) aiEl.className = role === 'AI' ? "toggle-btn selected" : "toggle-btn"; };
    bindClick('p2Human', () => setRole('p2', 'HUMAN')); bindClick('p2AI', () => setRole('p2', 'AI')); bindClick('p3Human', () => setRole('p3', 'HUMAN')); bindClick('p3AI', () => setRole('p3', 'AI')); bindClick('p4Human', () => setRole('p4', 'HUMAN')); bindClick('p4AI', () => setRole('p4', 'AI'));

    function setSize(s) { config.cols = s === 'S' ? 10 : (s === 'M' ? 14 : 18); config.rows = config.cols; ['S','M','L'].forEach(x => { let el = document.getElementById('size'+x); if(el) el.className = s === x ? "toggle-btn selected" : "toggle-btn"; }); }
    bindClick('sizeS', () => setSize('S')); bindClick('sizeM', () => setSize('M')); bindClick('sizeL', () => setSize('L'));
    function setPortals(p) { config.portalDensity = p; let pMap = {NONE:'None', FEW:'Few', NORMAL:'Normal', MANY:'Many'}; Object.keys(pMap).forEach(k => { let el = document.getElementById('portals'+pMap[k]); if(el) el.className = p === k ? "toggle-btn selected" : "toggle-btn"; }); }
    bindClick('portalsNone', () => setPortals('NONE')); bindClick('portalsFew', () => setPortals('FEW')); bindClick('portalsNormal', () => setPortals('NORMAL')); bindClick('portalsMany', () => setPortals('MANY'));
    function setWalls(w) { config.wallDensity = w; let wMap = {LOW:'Low', NORMAL:'Normal', HIGH:'High'}; Object.keys(wMap).forEach(k => { let el = document.getElementById('walls'+wMap[k]); if(el) el.className = w === k ? "toggle-btn selected" : "toggle-btn"; }); }
    bindClick('wallsLow', () => setWalls('LOW')); bindClick('wallsNormal', () => setWalls('NORMAL')); bindClick('wallsHigh', () => setWalls('HIGH'));
    const toggleClass = (idOn, idOff, prop, val) => { config[prop] = val; let onEl = document.getElementById(idOn), offEl = document.getElementById(idOff); if(onEl) onEl.className = "toggle-btn selected"; if(offEl) offEl.className = "toggle-btn"; };
    bindClick('judgeOff', () => toggleClass('judgeOff', 'judgeOn', 'autoJudge', false)); bindClick('judgeOn', () => toggleClass('judgeOn', 'judgeOff', 'autoJudge', true));
    bindClick('fairPortalOff', () => toggleClass('fairPortalOff', 'fairPortalOn', 'fairPortal', false)); bindClick('fairPortalOn', () => toggleClass('fairPortalOn', 'fairPortalOff', 'fairPortal', true));
    bindClick('diffE', () => toggleClass('diffE', 'diffN', 'diff', 'EASY')); bindClick('diffN', () => toggleClass('diffN', 'diffE', 'diff', 'NORMAL'));

    window.startHostGame = function() {
        if (Object.keys(hostConns).length + 1 < config.playerCount) {
            if(!confirm("⚠️ 当前大厅人数未满，未连接的空位将交由 AI 接管（如果你之前设置为玩家，则原地挂机）。确定要强行开始吗？")) return;
        }
        window.launchGame(false);
        if(typeof window.broadcastState === 'function') window.broadcastState();
    };

    bindClick('startBtn', () => {
        if(config.mode === 'PVE' || config.mode === 'PVP'){ myPlayerId = 1; window.launchGame(false); }
        else if(config.mode === 'HOST') {
            if (document.getElementById('lobbyPanel').style.display === 'block') {
                startHostGame();
            } else {
                if(typeof initHostServer === 'function') initHostServer();
            }
        }
        else if(config.mode === 'JOIN') { if(typeof joinHostServer === 'function') joinHostServer(); }
    });

    bindClick('backMenuBtn', () => {
        if(conn){conn.close(); conn = null;} if(peer){peer.destroy(); peer = null;}
        setDisplay('gameContainer', 'none'); setDisplay('mainMenu', 'block');
        setMode('PVE'); gameOver = true; window.resetReplayState(); 
    });

    bindClick('resetGameBtn', () => {
        if(config.mode === 'JOIN') return alert("客机不能重置，请让主机操作！");
        window.launchGame(false);
        if(config.mode === 'HOST' && typeof window.broadcastState === 'function') window.broadcastState();
    });

    if(canvas) {
        canvas.addEventListener('pointerdown', (e) => {
            if(gameOver || isReplaying || !players || players.length === 0) return;
            let cp = players[currentTurnIndex];
            
            // 严格的权限控制：主机只能点 P1 和 AI (本地接管)，客机只能点自己的专属席位
            if (config.mode === 'PVE' && cp.id !== 1) return;
            if (config.mode === 'PVP' && cp.type !== 'HUMAN') return; 
            if (config.mode === 'HOST' && cp.id !== 1) return; 
            if (config.mode === 'JOIN' && cp.id !== myPlayerId) return; 

            const rect = canvas.getBoundingClientRect();
            const cx = Math.floor((e.clientX-rect.left)*(canvas.width/rect.width)/CELL_SIZE);
            const cy = Math.floor((e.clientY-rect.top)*(canvas.height/rect.height)/CELL_SIZE);
            
            if(typeof processMoveLocally === 'function' && processMoveLocally(cx,cy)) {
                if(config.mode === 'JOIN' && conn && conn.open) conn.send({type:'MOVE', cx, cy});
                else if (config.mode === 'HOST') {
                    for(let id in hostConns) { hostConns[id].send({type: 'MOVE', cx, cy, pid: myPlayerId}); }
                }
            }
        });
    }

    // 加入 isClientSync 参数，如果是客机，则不要在本地生成地图，直接接收主机的数据
    window.launchGame = function(isClientSync = false) {
        setDisplay('mainMenu', 'none'); setDisplay('gameContainer', 'flex'); setDisplay('statsOverlay', 'none');
        window.resetReplayState(); 
        
        if (!isClientSync) {
            stats = { 1:{moves:0, portals:0}, 2:{moves:0, portals:0}, 3:{moves:0, portals:0}, 4:{moves:0, portals:0} };
            if(canvas) { canvas.width = 560; canvas.height = 560; CELL_SIZE = canvas.width/config.cols; }
            gameOver = false; currentTurnIndex = 0; portalMode = false;
            if(typeof generateMap === 'function') generateMap(); 
        }
        
        if(typeof saveSnapshot === 'function') saveSnapshot(); 
        if(typeof updateStatusText === 'function') updateStatusText(); 
        if(typeof drawScene === 'function') drawScene();
        
        let hintEl = document.getElementById('gameHint');
        if(hintEl) {
            if(config.playerCount > 2) hintEl.innerHTML = "<b>大乱斗模式</b>已激活！";
            else if(config.mode==='PVE') hintEl.innerHTML="<b>[核心AI]</b>已就绪。它的算法字典里没有投降。";
            else hintEl.innerText="";
        }
    }

    window.resetReplayState = function() { pauseReplay(); isReplaying = false; setDisplay('replayControls', 'none'); historyLog = []; currentReplayIndex = 0; }
    window.saveSnapshot = function() { historyLog.push({ b: JSON.parse(JSON.stringify(board)), pls: JSON.parse(JSON.stringify(players)), turnIdx: currentTurnIndex }); }

    bindClick('btnEnterReplay', () => { setDisplay('statsOverlay', 'none'); setDisplay('replayControls', 'flex'); isReplaying = true; currentReplayIndex = 0; pauseReplay(); renderReplayFrame(); if(statusEl) { statusEl.innerText = "【录像回放模式】"; statusEl.className = "portal-text"; } });

    function renderReplayFrame() {
        if(!historyLog[currentReplayIndex]) return; let state = historyLog[currentReplayIndex]; let tempB = board, tempPls = players, tempTurn = currentTurnIndex; board = state.b; players = state.pls; currentTurnIndex = state.turnIdx; portalMode = false; if(typeof drawScene === 'function') drawScene(); board = tempB; players = tempPls; currentTurnIndex = tempTurn; let stepEl = document.getElementById('replayStep'); if(stepEl) stepEl.innerText = `${currentReplayIndex} / ${historyLog.length - 1}`;
    }
    function playNextFrame() { if(currentReplayIndex < historyLog.length - 1) { currentReplayIndex++; renderReplayFrame(); let speed = speedSelect ? parseInt(speedSelect.value) : 500; replayTimer = setTimeout(playNextFrame, speed); } else pauseReplay(); }
    function toggleReplay() { if(isPlayingReplay) pauseReplay(); else { if(currentReplayIndex >= historyLog.length - 1) currentReplayIndex = 0; isPlayingReplay = true; if(btnPlayReplay) { btnPlayReplay.innerText = "⏸️ 暂停"; btnPlayReplay.style.background = "#f1c40f"; } playNextFrame(); } }
    function pauseReplay() { isPlayingReplay = false; if(btnPlayReplay) { btnPlayReplay.innerText = "▶️ 播放"; btnPlayReplay.style.background = "#2ecc71"; } if(replayTimer) clearTimeout(replayTimer); }

    bindClick('btnReplayPlay', toggleReplay); bindClick('btnReplayPrev', () => { pauseReplay(); if(currentReplayIndex > 0) { currentReplayIndex--; renderReplayFrame(); } }); bindClick('btnReplayNext', () => { pauseReplay(); if(currentReplayIndex < historyLog.length - 1) { currentReplayIndex++; renderReplayFrame(); } });
    bindClick('btnExitReplay', () => { pauseReplay(); isReplaying = false; setDisplay('replayControls', 'none'); if(historyLog.length > 0) { let lastState = historyLog[historyLog.length - 1]; board = JSON.parse(JSON.stringify(lastState.b)); players = JSON.parse(JSON.stringify(lastState.pls)); currentTurnIndex = lastState.turnIdx; if(typeof drawScene === 'function') drawScene(); } if(gameOver) setDisplay('statsOverlay', 'flex'); });
});