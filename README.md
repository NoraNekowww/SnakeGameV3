# 🌐 拓扑领地战 (SnakeGame)

2~4 人本地对抗或人机 PVE 的高自由度拓扑占地博弈网页游戏。

🎮 **在线体验**：[https://nzlab.online/SnakeV4/](https://nzlab.online/SnakeV4/)

---

## 游戏特点

- **多模式博弈**：
  - **高级 AI 挑战**：内置 Web Worker 异步运算的多层启发式搜索 AI。
  - **本地游戏 (PVP)**：支持 2~4 名玩家同屏轮流对战，支持自由指定各阵营为人机或玩家。
  - **联机对战**：基于 PeerJS (WebRTC) 实现无中心轻量化房间直连。
- **动态拓扑网格**：
  - 支持正六边形拓扑网格，多维路径规划与闭环围地。
  - 公平跃迁与传送门机制。
- **轻量化工程架构**：
  - 原生 HTML5 Canvas 2D 渲染，零笨重打包依赖。
  - Web Worker 线程解耦 AI 思考耗时，保证画面 60FPS 丝滑流畅。
  - 响应式设计，完美兼容桌面端与移动端触控。

---

## 项目结构

```text
.
├── css/
│   └── style.css          # 全局样式与暗色拟物化 UI
├── js/
│   ├── ai.js              # AI 主控与调度封装
│   ├── ai-worker.js       # Web Worker 异步 AI 估值与搜索引擎
│   ├── engine.js          # 棋盘拓扑、领地判据、移动渲染与核心规则引擎
│   ├── globals.js         # 全局状态枚举与配色常量
│   ├── main.js            # UI 交互、菜单控制与事件监听
│   └── network.js         # PeerJS P2P 联机房间与同步传输
├── index.html             # 单页入口
└── README.md
```

---

## 开源协议

本项目采用 MIT 协议开源。
