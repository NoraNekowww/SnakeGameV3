const EMPTY = 0, WALL = 1, P1_BODY = 2, P2_BODY = 3, PORTAL = 4;
const AI_DEPTH = 3; 

var config = { mode: 'PVE', diff: 'NORMAL', cols: 14, rows: 14, portalDensity: 'NORMAL', wallDensity: 'NORMAL', autoJudge: true, fairPortal: true };

const SERVER_CONFIG = {
    host: 'game.noraz.top', 
    port: 9000,
    path: '/',
    secure: false, // 暂时用明文 HTTP 连，避开国内运营商对未知 HTTPS 端口的拦截
    config: {
        iceServers: [{ urls: 'stun:stun.qq.com:3478' }]
    }
};
// -----------------------------------------------------------

var peer = null, conn = null, myRole = 'P1'; 
var board = [], portals = [], p1 = {x:1,y:1}, p2 = {x:12,y:12};
var p1Turn = true, gameOver = false, portalMode = false, CELL_SIZE;
var stats = { p1: { moves: 0, portals: 0 }, p2: { moves: 0, portals: 0 } };

var localRecord = { wins: 0, losses: 0, matches: [] };

var historyLog = [];
var isReplaying = false;
var currentReplayIndex = 0;
var replayTimer = null;
var isPlayingReplay = false;

var canvas, ctx, statusEl, btnPlayReplay, speedSelect;