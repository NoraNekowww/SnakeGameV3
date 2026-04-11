function initHostServer() {
    let rId = document.getElementById('customRoomId').value.trim();
    if(!rId) return alert("请输入房间号！");
    
    if(peer) peer.destroy();
    
    let fullId = "noraz_game_" + rId; 
    let msgEl = document.getElementById('hostMsg');
    
    msgEl.innerText = "📡 正在启动 nz 的私有加密频道...";
    msgEl.style.color = "#f1c40f"; 
    
    peer = new Peer(fullId, SERVER_CONFIG);
    
    // --- 【新增护盾】：记录是否已经成功开房 ---
    let isRoomOpened = false;
    
    peer.on('open', () => { 
        isRoomOpened = true; // 锁定成功状态
        msgEl.innerText = "频道 ["+rId+"] 已就绪！等待客机接入..."; 
        msgEl.style.color = "var(--ac)"; 
    });
    
    peer.on('error', (err) => { 
        console.warn("被护盾拦截的 PeerJS 警告:", err.type);
        
        if (err.type === 'unavailable-id') {
            // 房间号被占用是真报错，必须提示
            msgEl.innerText = "房间号 [" + rId + "] 已被占用，请换一个";
            msgEl.style.color = "#e74c3c";
            return;
        }
        
        // --- 【核心修改】：只要房间已经建好了，就无视任何后续的底层网络哔哔赖赖 ---
        if (!isRoomOpened) {
            msgEl.innerText = "服务器连接失败，请检查网络";
            msgEl.style.color = "#e74c3c";
        }
    });
    
    peer.on('connection', (connection) => {
        conn = connection; myRole = 'P1';
        setupNetworkListeners(); 
        
        conn.on('open', () => {
            if(typeof window.launchGame === 'function') window.launchGame();
            conn.send({type:'SYNC', cols:config.cols, board, portals, p1, p2});
            let hintEl = document.getElementById('gameHint');
            if(hintEl) hintEl.innerText = "你是 红蛇(主机) 。对手已连接！";
        });
    });
}

function joinHostServer() {
    let rId = document.getElementById('targetRoomId').value.trim();
    if(!rId) return alert("请输入主机的房间号！");
    
    if(peer) peer.destroy();
    
    let fullId = "noraz_game_" + rId;
    let sBtn = document.getElementById('startBtn');
    sBtn.innerText = "正在穿越虫洞...";
    
    peer = new Peer(SERVER_CONFIG);

    let isClientOpened = false;

    peer.on('open', () => {
        isClientOpened = true;
        conn = peer.connect(fullId, {reliable:true});
        
        conn.on('open', () => {
            sBtn.innerText = "连接主机"; 
            myRole = 'P2'; 
            setupNetworkListeners();
            
            let menu = document.getElementById('mainMenu');
            let gameC = document.getElementById('gameContainer');
            if(menu) menu.style.display = 'none';
            if(gameC) gameC.style.display = 'flex';
            
            if(statusEl) statusEl.innerText = "已连接！等待接收地图...";
            let hintEl = document.getElementById('gameHint');
            if(hintEl) hintEl.innerText = "你是 蓝蛇(客机) 。等待主机下发地图。";
        });
        
        conn.on('error', (err) => { 
            console.warn("连接断开警告:", err);
            sBtn.innerText = "连接主机"; 
        });
    });
    
    peer.on('error', (err) => {
        console.warn("被护盾拦截的客机警告:", err.type);
        if(err.type === 'peer-unavailable') {
            alert("找不到房间 [" + rId + "]！\n请确认主机是否已经建好房间。");
        } else if (!isClientOpened) {
            // 安卓 WebToApp 有时会吞掉 alert，所以只要恢复按钮文字即可
            sBtn.innerText = "连接主机"; 
        }
    });
}

function setupNetworkListeners() {
    conn.on('data', (d) => {
        if(d.type === 'SYNC'){
            if(typeof window.resetReplayState === 'function') window.resetReplayState(); 
            
            config.cols = d.cols; config.rows = d.cols; 
            if(canvas) CELL_SIZE = canvas.width / config.cols;
            
            board = d.board; portals = d.portals; p1 = d.p1; p2 = d.p2;
            p1Turn = true; gameOver = false; portalMode = false;
            stats = { p1: { moves: 0, portals: 0 }, p2: { moves: 0, portals: 0 } };
            
            let overlay = document.getElementById('statsOverlay');
            if(overlay) overlay.style.display = 'none';
            
            if(typeof window.saveSnapshot === 'function') window.saveSnapshot(); 
            if(typeof updateStatusText === 'function') updateStatusText(); 
            if(typeof drawScene === 'function') drawScene();
            
        } else if(d.type === 'MOVE'){
            if(typeof processMoveLocally === 'function') processMoveLocally(d.cx, d.cy);
        }
    });
    
    conn.on('close', () => { 
        let hintEl = document.getElementById('gameHint');
        if(hintEl) hintEl.innerText = "⚠️ 对手已断开连接！";
        // 移除弹窗，防止安卓端崩溃，改为文字提示
    });
}