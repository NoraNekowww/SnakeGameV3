document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas ? canvas.getContext('2d') : null;
    statusEl = document.getElementById('status');
    btnPlayReplay = document.getElementById('btnReplayPlay');
    speedSelect = document.getElementById('replaySpeedSelect');

    // --- 【防弹装甲 1】：安全读取本地存储 ---
    // 即使在严格的安卓 WebView 或本地 file:// 协议下报错，也不会中断整个脚本
    try {
        let saved = window.localStorage.getItem('norasGameRecord');
        if(saved) {
            let parsed = JSON.parse(saved);
            if(parsed && parsed.matches) localRecord = parsed;
        }
    } catch(e) {
        console.warn("本地存储不可用 (可能被浏览器安全策略拦截)，将使用临时记忆。", e);
    }
    if(!localRecord) localRecord = { wins: 0, losses: 0, matches: [] };
    if(!localRecord.matches) localRecord.matches = [];

    // --- 【防弹装甲 2】：安全的 DOM 元素操作工具 ---
    const bindClick = (id, fn) => { 
        let el = document.getElementById(id); 
        if(el) el.onclick = fn; 
        else console.warn("未找到按钮元素，跳过绑定:", id);
    };
    const setDisplay = (id, val) => { 
        let el = document.getElementById(id); 
        if(el) el.style.display = val; 
    };

    // 动态 UI 设置
    if(localRecord.matches.length > 0) {
        let tutBtn = document.getElementById('btnOpenTutorial');
        if(tutBtn) { tutBtn.style.background = '#2a2a35'; tutBtn.style.color = '#777'; tutBtn.style.border = '1px solid #444'; }
    }

    function renderRecordPanel() {
        let eWins = document.getElementById('statWins'); if(eWins) eWins.innerText = localRecord.wins;
        let eLoss = document.getElementById('statLosses'); if(eLoss) eLoss.innerText = localRecord.losses;
        
        let total = localRecord.wins + localRecord.losses;
        let rate = total > 0 ? Math.round((localRecord.wins / total) * 100) : 0;
        let rateEl = document.getElementById('statWinRate');
        if(rateEl) {
            rateEl.innerText = rate + '%';
            rateEl.style.color = rate >= 60 ? '#2ecc71' : (rate < 40 ? '#e74c3c' : '#f1c40f');
        }

        let listEl = document.getElementById('matchHistoryList');
        if(!listEl) return;
        
        listEl.innerHTML = '';
        if(localRecord.matches.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">尚无实战记录，开始你的第一局吧！</div>';
            return;
        }
        localRecord.matches.forEach(m => {
            let isWin = m.res === 'Win';
            listEl.innerHTML += `
                <div class="match-item ${isWin ? 'win' : 'loss'}">
                    <div class="match-header"><span>${m.time}</span><span class="match-res ${isWin ? 'win' : 'loss'}">${isWin ? '胜利' : '战败'}</span></div>
                    <div class="match-params"><span class="param-tag">🧠 ${m.diff}</span><span class="param-tag">📏 ${m.size}</span><span class="param-tag">🌀 ${m.portals}</span><span class="param-tag">🧱 ${m.walls}</span></div>
                </div>`;
        });
    }

    bindClick('btnOpenRecords', () => { setDisplay('mainMenu', 'none'); setDisplay('recordPanel', 'block'); renderRecordPanel(); });
    bindClick('btnBackFromRecords', () => { setDisplay('recordPanel', 'none'); setDisplay('mainMenu', 'block'); });
    bindClick('btnClearRecords', () => {
        if(confirm("警告：将永久删除所有终端实战记录！确定格式化？")) {
            localRecord = { wins: 0, losses: 0, matches: [] };
            try { window.localStorage.removeItem('norasGameRecord'); } catch(e){}
            renderRecordPanel();
            let tutBtn = document.getElementById('btnOpenTutorial');
            if(tutBtn) { tutBtn.style.background = '#2e86de'; tutBtn.style.color = '#fff'; tutBtn.style.border = 'none'; }
        }
    });

    bindClick('btnOpenTutorial', () => { setDisplay('mainMenu', 'none'); setDisplay('tutorialPanel', 'block'); });
    bindClick('btnBackFromTutorial', () => { setDisplay('tutorialPanel', 'none'); setDisplay('mainMenu', 'block'); });

    // --- 【私有服务器专属】：房间嗅探雷达 ---
    // --- 【私有服务器专属】：房间嗅探雷达 ---
    async function scanCustomServerRooms() {
        let listEl = document.getElementById('roomListContent');
        if(!listEl) return;
        
        listEl.innerHTML = '📡 正在扫描频道...';
        try {
            let protocol = SERVER_CONFIG.secure ? 'https' : 'http';
            let res = await fetch(`${protocol}://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}${SERVER_CONFIG.path}peerjs/peers`, { signal: AbortSignal.timeout(3000) });
            
            if(!res.ok) throw new Error("API 拒绝访问");
            let peers = await res.json();
            let rooms = peers.filter(p => p.startsWith('noraz_game_'));
            
            if(rooms.length === 0) {
                listEl.innerHTML = '<span style="color:#aaa">当前没有主机建立房间。</span>';
            } else {
                listEl.innerHTML = rooms.map(r => {
                    let rName = r.replace('noraz_game_','');
                    return `<div class="room-item" onclick="document.getElementById('targetRoomId').value='${rName}';">🛰️ 频道: ${rName} (点击填入)</div>`;
                }).join('');
            }
        } catch(e) {
            // --- 【核心修改】：安卓系统拦截 fetch 请求时，安静躺平，不报红字 ---
            listEl.innerHTML = '<span style="color:#666; font-size:12px;">雷达在此环境受限，请直接点击下方【连接主机】。</span>';
        }
    }
    // -----------------------------------------
    // -----------------------------------------

    function setMode(mode) {
        config.mode = mode;
        ['PVE','PVP','Host','Join'].forEach(m => {
            let el = document.getElementById('mode'+m);
            if(el) el.className = mode === m.toUpperCase() ? "toggle-btn selected" : "toggle-btn";
        });
        setDisplay('diffSection', mode === 'PVE' ? 'block' : 'none');
        setDisplay('mapSettingsSection', mode === 'JOIN' ? 'none' : 'block'); 
        setDisplay('connectionPanel', (mode === 'HOST' || mode === 'JOIN') ? 'block' : 'none');
        setDisplay('hostPanel', mode === 'HOST' ? 'block' : 'none');
        setDisplay('joinPanel', mode === 'JOIN' ? 'block' : 'none');
        
        let sBtn = document.getElementById('startBtn');
        if(sBtn) {
            if(mode === 'HOST') sBtn.innerText = '建立房间并等待';
            else if(mode === 'JOIN') { 
                sBtn.innerText = '连接主机'; 
                // 每次切换到“客机”面板时，触发雷达扫描
                scanCustomServerRooms(); 
            }
            else sBtn.innerText = '开始跃迁';
        }
    }
    
    bindClick('modePVE', () => setMode('PVE'));
    bindClick('modePVP', () => setMode('PVP'));
    bindClick('modeHost', () => setMode('HOST'));
    bindClick('modeJoin', () => setMode('JOIN'));

    function setSize(s) { 
        config.cols = s === 'S' ? 10 : (s === 'M' ? 14 : 18); config.rows = config.cols; 
        ['S','M','L'].forEach(x => { 
            let el = document.getElementById('size'+x); 
            if(el) el.className = s === x ? "toggle-btn selected" : "toggle-btn"; 
        }); 
    }
    bindClick('sizeS', () => setSize('S')); bindClick('sizeM', () => setSize('M')); bindClick('sizeL', () => setSize('L'));

    function setPortals(p) { 
        config.portalDensity = p; let pMap = {NONE:'None', FEW:'Few', NORMAL:'Normal', MANY:'Many'}; 
        Object.keys(pMap).forEach(k => { 
            let el = document.getElementById('portals'+pMap[k]); 
            if(el) el.className = p === k ? "toggle-btn selected" : "toggle-btn"; 
        }); 
    }
    bindClick('portalsNone', () => setPortals('NONE')); bindClick('portalsFew', () => setPortals('FEW')); 
    bindClick('portalsNormal', () => setPortals('NORMAL')); bindClick('portalsMany', () => setPortals('MANY'));

    function setWalls(w) { 
        config.wallDensity = w; let wMap = {LOW:'Low', NORMAL:'Normal', HIGH:'High'}; 
        Object.keys(wMap).forEach(k => { 
            let el = document.getElementById('walls'+wMap[k]); 
            if(el) el.className = w === k ? "toggle-btn selected" : "toggle-btn"; 
        }); 
    }
    bindClick('wallsLow', () => setWalls('LOW')); bindClick('wallsNormal', () => setWalls('NORMAL')); bindClick('wallsHigh', () => setWalls('HIGH'));

    const toggleClass = (idOn, idOff, prop, val) => {
        config[prop] = val;
        let onEl = document.getElementById(idOn), offEl = document.getElementById(idOff);
        if(onEl) onEl.className = "toggle-btn selected";
        if(offEl) offEl.className = "toggle-btn";
    };

    bindClick('judgeOff', () => toggleClass('judgeOff', 'judgeOn', 'autoJudge', false));
    bindClick('judgeOn', () => toggleClass('judgeOn', 'judgeOff', 'autoJudge', true));
    bindClick('fairPortalOff', () => toggleClass('fairPortalOff', 'fairPortalOn', 'fairPortal', false));
    bindClick('fairPortalOn', () => toggleClass('fairPortalOn', 'fairPortalOff', 'fairPortal', true));
    bindClick('diffE', () => toggleClass('diffE', 'diffN', 'diff', 'EASY'));
    bindClick('diffN', () => toggleClass('diffN', 'diffE', 'diff', 'NORMAL'));

    bindClick('startBtn', () => {
        if(config.mode === 'PVE' || config.mode === 'PVP'){ myRole='P1'; window.launchGame(); }
        else if(config.mode === 'HOST' && typeof initHostServer === 'function') initHostServer();
        else if(config.mode === 'JOIN' && typeof joinHostServer === 'function') joinHostServer();
    });

    bindClick('backMenuBtn', () => {
        if(conn){conn.close(); conn = null;} if(peer){peer.destroy(); peer = null;}
        setDisplay('gameContainer', 'none'); setDisplay('mainMenu', 'block');
        setMode('PVE'); gameOver = true; window.resetReplayState(); 
    });

    bindClick('resetGameBtn', () => {
        if(config.mode === 'JOIN') return alert("客机不能重置，请让主机操作！");
        window.launchGame();
        if(config.mode === 'HOST' && conn && conn.open) conn.send({type:'SYNC', cols:config.cols, board, portals, p1, p2});
    });

    if(canvas) {
        canvas.addEventListener('pointerdown', (e) => {
            if(gameOver || isReplaying || (config.mode==='PVE'&&!p1Turn) || (config.mode==='HOST'&&!p1Turn) || (config.mode==='JOIN'&&p1Turn)) return;
            const rect = canvas.getBoundingClientRect();
            const cx = Math.floor((e.clientX-rect.left)*(canvas.width/rect.width)/CELL_SIZE);
            const cy = Math.floor((e.clientY-rect.top)*(canvas.height/rect.height)/CELL_SIZE);
            if(typeof processMoveLocally === 'function' && processMoveLocally(cx,cy)) {
                if(conn && conn.open) conn.send({type:'MOVE', cx, cy});
            }
        });
    }

    window.launchGame = function() {
        setDisplay('mainMenu', 'none'); setDisplay('gameContainer', 'flex'); setDisplay('statsOverlay', 'none');
        window.resetReplayState(); 
        stats = { p1: { moves: 0, portals: 0 }, p2: { moves: 0, portals: 0 } };
        if(canvas) { canvas.width = 560; canvas.height = 560; CELL_SIZE = canvas.width/config.cols; }
        gameOver=false; p1Turn=true; portalMode=false; p1={x:1,y:1}; p2={x:config.cols-2, y:config.rows-2};
        
        if(typeof generateMap === 'function') generateMap(); 
        if(typeof saveSnapshot === 'function') saveSnapshot(); 
        if(typeof updateStatusText === 'function') updateStatusText(); 
        if(typeof drawScene === 'function') drawScene();
        
        let hintEl = document.getElementById('gameHint');
        if(hintEl) {
            if(config.mode==='PVE') hintEl.innerHTML="<b>[织网者] AI</b>已激活。它的算法字典里没有投降。";
            else if(config.mode==='PVP') hintEl.innerText="本地双人同屏模式。";
            else hintEl.innerText="";
        }
    }

    window.resetReplayState = function() {
        pauseReplay(); isReplaying = false;
        setDisplay('replayControls', 'none');
        historyLog = []; currentReplayIndex = 0;
    }

    window.saveSnapshot = function() {
        historyLog.push({ b: JSON.parse(JSON.stringify(board)), p1: {...p1}, p2: {...p2}, turn: p1Turn });
    }

    bindClick('btnEnterReplay', () => {
        setDisplay('statsOverlay', 'none'); setDisplay('replayControls', 'flex');
        isReplaying = true; currentReplayIndex = 0; pauseReplay(); renderReplayFrame();
        if(statusEl) { statusEl.innerText = "【录像回放模式】"; statusEl.className = "portal-text"; }
    });

    function renderReplayFrame() {
        if(!historyLog[currentReplayIndex]) return;
        let state = historyLog[currentReplayIndex]; 
        let tempB = board, tempP1 = p1, tempP2 = p2, tempTurn = p1Turn;
        board = state.b; p1 = state.p1; p2 = state.p2; p1Turn = state.turn;
        portalMode = false; 
        if(typeof drawScene === 'function') drawScene();
        board = tempB; p1 = tempP1; p2 = tempP2; p1Turn = tempTurn;
        
        let stepEl = document.getElementById('replayStep');
        if(stepEl) stepEl.innerText = `${currentReplayIndex} / ${historyLog.length - 1}`;
    }

    function playNextFrame() {
        if(currentReplayIndex < historyLog.length - 1) { 
            currentReplayIndex++; renderReplayFrame(); 
            let speed = speedSelect ? parseInt(speedSelect.value) : 500; 
            replayTimer = setTimeout(playNextFrame, speed); 
        } else {
            pauseReplay();
        }
    }

    function toggleReplay() {
        if(isPlayingReplay) pauseReplay();
        else { 
            if(currentReplayIndex >= historyLog.length - 1) currentReplayIndex = 0; 
            isPlayingReplay = true; 
            if(btnPlayReplay) { btnPlayReplay.innerText = "⏸️ 暂停"; btnPlayReplay.style.background = "#f1c40f"; }
            playNextFrame(); 
        }
    }

    function pauseReplay() { 
        isPlayingReplay = false; 
        if(btnPlayReplay) { btnPlayReplay.innerText = "▶️ 播放"; btnPlayReplay.style.background = "#2ecc71"; }
        if(replayTimer) clearTimeout(replayTimer); 
    }

    bindClick('btnReplayPlay', toggleReplay);
    bindClick('btnReplayPrev', () => { pauseReplay(); if(currentReplayIndex > 0) { currentReplayIndex--; renderReplayFrame(); } });
    bindClick('btnReplayNext', () => { pauseReplay(); if(currentReplayIndex < historyLog.length - 1) { currentReplayIndex++; renderReplayFrame(); } });
    bindClick('btnExitReplay', () => {
        pauseReplay(); isReplaying = false; setDisplay('replayControls', 'none');
        if(historyLog.length > 0) {
            let lastState = historyLog[historyLog.length - 1];
            board = JSON.parse(JSON.stringify(lastState.b)); p1 = {...lastState.p1}; p2 = {...lastState.p2}; p1Turn = lastState.turn; 
            if(typeof drawScene === 'function') drawScene();
        }
        if(gameOver) setDisplay('statsOverlay', 'flex');
    });
});