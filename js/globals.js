const EMPTY = 0, WALL = 1, P1_BODY = 2, P2_BODY = 3, PORTAL = 4, P3_BODY = 5, P4_BODY = 6;
const AI_DEPTH = 3; 

var config = { 
    mode: 'PVE', diff: 'NORMAL', cols: 14, rows: 14, 
    portalDensity: 'NORMAL', wallDensity: 'NORMAL', autoJudge: true, fairPortal: true,
    playerCount: 2, p2Type: 'AI', p3Type: 'AI', p4Type: 'AI' 
};

const SERVER_CONFIG = {
    host: 'game.noraz.top', port: 9000, path: '/', secure: false, 
    config: { iceServers: [{ urls: 'stun:stun.qq.com:3478' }] }
};

var peer = null, conn = null, hostConns = {}; 
var myPlayerId = 1; 

var board = [], portals = [];
var players = []; 
var currentTurnIndex = 0; 

var gameOver = false, portalMode = false, CELL_SIZE;
var stats = { 1:{moves:0, portals:0}, 2:{moves:0, portals:0}, 3:{moves:0, portals:0}, 4:{moves:0, portals:0} };

var localRecord = { wins: 0, losses: 0, matches: [] };
var historyLog = []; var isReplaying = false; var currentReplayIndex = 0; var replayTimer = null; var isPlayingReplay = false;
var canvas, ctx, statusEl, btnPlayReplay, speedSelect;