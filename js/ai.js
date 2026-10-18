// ============================================================================
// 📡 拓扑领地战：多线程 AI 通讯桥梁
// 负责与 ai-worker.js 进行无阻塞数据交换，执行渲染和走位动画
// ============================================================================

// 1. 唤醒后台多线程引擎
const aiWorker = new Worker('js/ai-worker.js');

// 2. 拦截并接管主程序的 AI 调用
window.aiThinkAndMove = function() {
    let cp = players[currentTurnIndex];
    let alivePls = players.filter(p=>p.alive);
    
    // 给前台展示“正在思考”的动画，此时主线程毫无压力，网页依然可以点击交互
    let statusEl = document.getElementById('status');
    if(statusEl) {
        statusEl.innerText = `⏳ ${cp.name}(AI)演算中...`;
        statusEl.className = cp.css;
    }

    // 构造要寄往后台的纯数据包裹 (避免传递 DOM 节点等无法序列化的对象)
    let payload = {
        board: board,
        players: players,
        portals: portals,
        config: {
            playerCount: config.playerCount,
            cols: config.cols,
            rows: config.rows,
            diff: config.diff
        },
        currentTurnIndex: currentTurnIndex,
        myPlayerId: cp.id,
        is2P: (config.playerCount === 2 || alivePls.length <= 2),
        // 🚀 【多线程专属福利】：速度快了，直接拔高 AI 智商上限！
        AI_DEPTH: AI_DEPTH + 1 
    };

    // 发射给 Worker 开始猛算
    aiWorker.postMessage({ type: 'CALCULATE_MOVE', payload: payload });
};

// 3. 监听后台发回
aiWorker.onmessage = function(e) {
    if(e.data.type === 'MOVE_CALCULATED') {
        let bestM = e.data.bestMove;
        let cp = players[currentTurnIndex];

        if(bestM) {
            // 将身体留在原地
            if(board[cp.x][cp.y] !== PORTAL) board[cp.x][cp.y] = cp.body;
            
            // 解析动作
            if(bestM.t === 'P') stats[cp.id].portals++;
            
            if(bestM.t === 'N') {
                // 普通移动
                cp.x = bestM.x; cp.y = bestM.y;
                
                // 稍微给一点视觉停留时间，防止后台算得太快(比如 10ms)导致玩家根本看不清动作
                setTimeout(endTurn, 100); 
            } else {
                // 传送门动画效果
                cp.x = bestM.s1.x; cp.y = bestM.s1.y; 
                portalMode = true;
                let statusEl = document.getElementById('status');
                if(statusEl) {
                    statusEl.innerText = `${cp.name}(AI)跃迁中...`; 
                    statusEl.className = "portal-text";
                }
                
                if(typeof drawScene === 'function') drawScene();
                
                setTimeout(() => { 
                    cp.x = bestM.s2.x; cp.y = bestM.s2.y; 
                    portalMode = false; 
                    endTurn(); 
                }, 500); // 传送门动画停留半秒
            }
        } else {
            // 如果连 AI 都觉得自己死局了，不走位直接结束回合，交由引擎宣判死刑
            endTurn();
        }
    }
};