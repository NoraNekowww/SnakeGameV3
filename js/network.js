// --- 星型拓扑架构：主机端 (Host) ---
function initHostServer() {
    let rId = document.getElementById('customRoomId').value.trim();
    if(!rId) return alert("请输入房间号！");
    if(peer) peer.destroy();
    
    let fullId = "noraz_game_" + rId; 
    let msgEl = document.getElementById('hostMsg');
    
    msgEl.innerText = "📡 正在启动 nz 的私有加密频道...";
    msgEl.style.color = "#f1c40f"; 
    
    peer = new Peer(fullId, SERVER_CONFIG);
    hostConns = {}; 
    let currentLobbyPlayers = 1; 
    
    peer.on('open', () => { 
        msgEl.innerText = "频道 ["+rId+"] 已就绪！等待客机接入..."; 
        msgEl.style.color = "var(--ac)"; 
        
        document.getElementById('hostPanel').style.display = 'none';
        document.getElementById('lobbyPanel').style.display = 'block';
        
        let sBtn = document.getElementById('startBtn');
        sBtn.innerText = '全员就绪，强制跃迁';
        
        if(typeof updateLobbyUI === 'function') updateLobbyUI();
    });
    
    peer.on('error', (err) => { 
        console.warn("PeerJS 警告:", err.type);
        if (err.type === 'unavailable-id') {
            msgEl.innerText = "房间号 [" + rId + "] 已被占用，请换一个";
            msgEl.style.color = "#e74c3c";
        }
    });
    
    peer.on('connection', (connection) => {
        if (currentLobbyPlayers >= config.playerCount) {
            connection.send({type: 'ERROR', msg: '对不起，当前房间已满员！'});
            setTimeout(() => connection.close(), 500);
            return;
        }
        
        currentLobbyPlayers++;
        let assignedId = currentLobbyPlayers;
        hostConns[assignedId] = connection;
        
        connection.on('open', () => { broadcastLobby(); });
        
        connection.on('data', (d) => {
            if (d.type === 'MOVE') {
                // 主机验证身份：只有轮到这个客机，才允许走位
                if (players[currentTurnIndex].id === assignedId) {
                    if (typeof processMoveLocally === 'function' && processMoveLocally(d.cx, d.cy)) {
                        // 主机将客机的合法动作广播给其它所有客机
                        for (let id in hostConns) {
                            if (parseInt(id) !== assignedId) {
                                hostConns[id].send({type: 'MOVE', cx: d.cx, cy: d.cy, pid: assignedId});
                            }
                        }
                    }
                }
            }
        });
        
        connection.on('close', () => {
            currentLobbyPlayers--;
            delete hostConns[assignedId];
            broadcastLobby();
        });
    });
}

function broadcastLobby() {
    let pList = [{id: 1, name: '主机 (你)'}];
    let colorNames = {2: '蓝蛇 客机', 3: '黄蛇 客机', 4: '青蛇 客机'};
    for(let id in hostConns) {
        pList.push({id: parseInt(id), name: colorNames[id]});
    }
    if(typeof updateLobbyUI === 'function') updateLobbyUI(pList);
    for(let id in hostConns) {
        hostConns[id].send({type: 'LOBBY', players: pList, yourId: parseInt(id)});
    }
}

// 主机全网同步战况 (防错位)
window.broadcastState = function() {
    if (config.mode === 'HOST') {
        for (let id in hostConns) {
            hostConns[id].send({
                type: 'SYNC', 
                cols: config.cols, 
                pCount: config.playerCount,
                board: board, 
                portals: portals, 
                players: players, 
                currentTurnIndex: currentTurnIndex,
                stats: stats
            });
        }
    }
}

// --- 客机端 (Client) ---
function joinHostServer() {
    let rId = document.getElementById('targetRoomId').value.trim();
    if(!rId) return alert("请输入主机的房间号！");
    if(peer) peer.destroy();
    
    let fullId = "noraz_game_" + rId;
    let sBtn = document.getElementById('startBtn');
    sBtn.innerText = "正在穿越虫洞...";
    
    peer = new Peer(SERVER_CONFIG);

    peer.on('open', () => {
        conn = peer.connect(fullId, {reliable:true});
        
        conn.on('open', () => {
            document.getElementById('joinPanel').style.display = 'none';
            document.getElementById('lobbyPanel').style.display = 'block';
            sBtn.style.display = 'none'; // 客机只能等主机开局
            if(statusEl) statusEl.innerText = "已连接！等待主机开启战局...";
        });
        
        conn.on('data', (d) => {
            if (d.type === 'LOBBY') {
                myPlayerId = d.yourId;
                if(typeof updateLobbyUI === 'function') updateLobbyUI(d.players);
            } else if (d.type === 'SYNC') {
                config.cols = d.cols; config.rows = d.cols; config.playerCount = d.pCount;
                if (canvas) CELL_SIZE = canvas.width / config.cols;
                board = d.board; portals = d.portals; players = d.players; currentTurnIndex = d.currentTurnIndex;
                gameOver = false; portalMode = false; stats = d.stats;
                
                if (typeof window.launchGame === 'function') window.launchGame(true); 
            } else if (d.type === 'MOVE') {
                if(typeof processMoveLocally === 'function') processMoveLocally(d.cx, d.cy);
            } else if (d.type === 'ERROR') {
                alert(d.msg); window.location.reload();
            }
        });
        
        conn.on('close', () => { 
            let hintEl = document.getElementById('gameHint');
            if(hintEl) hintEl.innerText = "⚠️ 与主机的连接已断开！";
        });
    });
    
    peer.on('error', (err) => {
        console.warn("连接失败:", err.type);
        if(err.type === 'peer-unavailable') {
            alert("找不到房间 [" + rId + "]！\n请确认主机是否已经建好房间。");
            sBtn.innerText = "连接主机"; 
        }
    });
}