// ============================================================
// KIRSHAS MONOPOLIA — Multiplayer Server
// Express + Socket.io with room management & authoritative game state
// ============================================================
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';

// Import shared engine — server is authoritative
import {
  deepClone, shuffle, rollDie,
  createInitialState, calcRentStatic, calcWealthStatic, handleLanding
} from '../src/gameEngine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// JSON body parser with large limit for base64 uploads
app.use(express.json({ limit: '50mb' }));

// ============================================================
// DEV CONFIG — Server-side persistence + password auth
// ============================================================
const DEV_PASSWORD = "GOT";
const DATA_DIR = join(__dirname, '../data');
const UPLOADS_DIR = join(DATA_DIR, 'uploads');
const BACKUPS_DIR = join(DATA_DIR, 'backups');
[DATA_DIR, UPLOADS_DIR, BACKUPS_DIR].forEach(d => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });

function loadDevConfig() {
  try {
    const p = join(DATA_DIR, 'devConfig.json');
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {}
  return null;
}

function saveDevConfig(config) {
  writeFileSync(join(DATA_DIR, 'devConfig.json'), JSON.stringify(config), 'utf-8');
}

function createDevBackup() {
  const config = loadDevConfig();
  if (!config) return null;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `backup-${ts}.json`;
  writeFileSync(join(BACKUPS_DIR, name), JSON.stringify(config), 'utf-8');
  // Keep max 20 backups
  const all = readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json')).sort();
  while (all.length > 20) {
    try { unlinkSync(join(BACKUPS_DIR, all.shift())); } catch {}
  }
  return name;
}

function devAuth(req, res, next) {
  if (req.body?.password !== DEV_PASSWORD) return res.status(403).json({ error: 'Invalid password' });
  next();
}

// ============================================================
// ROOMS STATE
// ============================================================
const rooms = new Map();      // roomId -> Room
const playerRoom = new Map(); // socketId -> roomId

function generateRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function createRoom(hostSocket, data) {
  const roomId = generateRoomId();
  const room = {
    id: roomId,
    name: data.name || `Room ${roomId}`,
    host: hostSocket.id,
    config: data.config || {
      mode: "classic",
      startMoney: 1500,
      roundBonus: 200,
      winCondition: "last",
      maxRounds: 30,
    },
    lang: data.lang || "ru",
    slots: Array.from({ length: data.maxPlayers || 4 }, (_, i) => ({
      index: i,
      socketId: null,
      name: null,
      isAI: false,
      aiPersonality: null,
      ready: false,
    })),
    maxPlayers: data.maxPlayers || 4,
    state: "lobby", // lobby | playing | finished
    game: null,
    playerMap: {},
    createdAt: Date.now(),
  };
  // Host takes slot 0
  room.slots[0].socketId = hostSocket.id;
  room.slots[0].name = data.playerName || "Player 1";
  room.slots[0].ready = true;
  rooms.set(roomId, room);
  playerRoom.set(hostSocket.id, roomId);
  return room;
}

function getRoomList() {
  const list = [];
  for (const [, room] of rooms) {
    if (room.state !== "lobby") continue;
    const playerCount = room.slots.filter(s => s.socketId || s.isAI).length;
    list.push({
      id: room.id,
      name: room.name,
      host: room.slots[0]?.name || "???",
      players: playerCount,
      maxPlayers: room.maxPlayers,
      mode: room.config.mode,
    });
  }
  return list;
}

function getSlotIndex(room, socketId) {
  return room.slots.findIndex(s => s.socketId === socketId);
}

function broadcastRoomState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit("room_state", {
    id: room.id,
    name: room.name,
    host: room.host,
    config: room.config,
    lang: room.lang,
    slots: room.slots.map(s => ({
      index: s.index,
      name: s.name,
      isAI: s.isAI,
      aiPersonality: s.aiPersonality,
      ready: s.ready,
      connected: !!s.socketId,
    })),
    maxPlayers: room.maxPlayers,
    state: room.state,
  });
}

function broadcastGameState(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.game) return;
  io.to(roomId).emit("game_state", room.game);
}

function broadcastRoomList() {
  io.emit("room_list", getRoomList());
}

// Minimal translations for server messages
function getT(lang) {
  if (lang === "en") {
    return {
      doubles: "Doubles!", rolled: "rolled", inJail: "at The Wall",
      tripleDoubles: "Triple doubles! To The Wall!",
      buysProperty: "buys", paysRent: "pays rent", goesToJail: "goes to The Wall!",
      gold: "gold", price: "Price",
    };
  }
  return {
    doubles: "Дубль!", rolled: "выбросил", inJail: "на Стене",
    tripleDoubles: "Тройной дубль! На Стену!",
    buysProperty: "покупает", paysRent: "платит аренду", goesToJail: "отправляется на Стену!",
    gold: "зол.", price: "Цена",
  };
}

// ============================================================
// AI TURN HANDLER (server-side)
// ============================================================
const aiTimers = new Map();

function clearAiTimer(roomId) {
  const t = aiTimers.get(roomId);
  if (t) { clearTimeout(t); aiTimers.delete(roomId); }
}

function scheduleAiTurn(roomId) {
  clearAiTimer(roomId);
  const room = rooms.get(roomId);
  if (!room || !room.game || room.game.phase === "gameover") return;
  const cp = room.game.players[room.game.currentPlayer];
  if (!cp.isAI) return;

  aiTimers.set(roomId, setTimeout(() => executeAiTurn(roomId), 1200 + Math.random() * 800));
}

function executeAiTurn(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.game) return;
  const g = room.game;
  const cp = g.players[g.currentPlayer];
  if (!cp.isAI) return;

  const pers = cp.aiPersonality || "random";

  if (g.phase === "roll") {
    if (cp.inJail) {
      if (cp.freedomCards > 0) doAction(roomId, "use_card");
      else if (cp.money > 200) doAction(roomId, "pay_jail");
      else doAction(roomId, "roll_dice");
    } else doAction(roomId, "roll_dice");
  } else if (g.phase === "buy") {
    const cell = g.cells[cp.position];
    const buy = pers === "aggressive" ? cp.money > cell.price * 0.5
      : pers === "cautious" ? cp.money > cell.price * 2
      : pers === "trader" ? cp.money > cell.price * 1.2
      : Math.random() > 0.3;
    if (buy && cp.money >= cell.price) doAction(roomId, "buy_property");
    else doAction(roomId, "start_auction");
  } else if (g.phase === "auction") {
    const a = g.auctionState;
    if (a && a.bidOrder[a.currentBidder] === cp.id) {
      const cell = g.cells[a.cellId];
      const max = pers === "aggressive" ? cell.price * 0.9 : pers === "cautious" ? cell.price * 0.5 : cell.price * 0.7;
      if (a.highBid < max && cp.money > a.highBid + 10) doAction(roomId, "auction_bid", { amount: a.highBid + 10 });
      else doAction(roomId, "auction_bid", { amount: 0 });
    }
  } else if (g.phase === "card") {
    doAction(roomId, "end_turn");
  } else if (g.phase === "endturn") {
    // Try building
    const myH = {};
    cp.properties.forEach(pid => { const c = g.cells[pid]; if (c.house) { if (!myH[c.house]) myH[c.house] = []; myH[c.house].push(pid); } });
    let built = false;
    for (const [house, props] of Object.entries(myH)) {
      const all = g.cells.filter(c => c.house === house).map(c => c.id);
      if (all.every(id => cp.properties.includes(id))) {
        for (const pid of props) {
          const c = g.cells[pid];
          if ((c._buildings || 0) < 5 && cp.money > (c.buildCost || 0) * 2) {
            doAction(roomId, "build", { cellId: pid });
            built = true; break;
          }
        }
      }
      if (built) break;
    }
    if (!built) doAction(roomId, "end_turn");
    else setTimeout(() => doAction(roomId, "end_turn"), 500);
  } else if (g.phase === "bankruptVote") {
    doAction(roomId, "skip_bankrupt");
  } else if (g.phase === "tradeReview" && g.tradeState?.to === cp.id) {
    Math.random() > 0.5 ? doAction(roomId, "accept_trade") : doAction(roomId, "decline_trade");
  } else if (g.phase !== "bankruptCheck" && g.phase !== "moving") {
    doAction(roomId, "end_turn");
  }
}

// ============================================================
// SERVER-SIDE GAME ACTIONS (authoritative)
// ============================================================
function doAction(roomId, action, data = {}) {
  const room = rooms.get(roomId);
  if (!room || !room.game) return;
  const g = room.game;
  const lang = room.lang;
  const t = getT(lang);

  switch (action) {
    case "roll_dice": {
      const d1 = rollDie(), d2 = rollDie();
      const isDouble = d1 === d2;
      const cp = g.players[g.currentPlayer];
      g.dice = [d1, d2];

      if (cp.inJail) {
        if (isDouble) {
          cp.inJail = false; cp.jailTurns = 0; g.doublesCount = 0;
          g.message = `${cp.name}: ${t.doubles} ${t.rolled} ${d1}+${d2}`;
          g.phase = "moving";
        } else {
          cp.jailTurns++;
          if (cp.jailTurns >= 3) {
            cp.money -= 50; cp.inJail = false; cp.jailTurns = 0;
            g.message = `${cp.name} ${lang === "ru" ? "вынужден заплатить 50 драконов" : "forced to pay 50 dragons"}`;
            g.phase = "moving";
          } else {
            g.message = `${cp.name}: ${t.rolled} ${d1}+${d2}. ${t.inJail}`;
            g.phase = "endturn";
          }
        }
      } else {
        if (isDouble) {
          g.doublesCount++;
          if (g.doublesCount >= 3) {
            cp.position = 10; cp.inJail = true; g.doublesCount = 0;
            g.message = `${cp.name}: ${t.tripleDoubles}`;
            g.phase = "endturn";
            broadcastGameState(roomId);
            scheduleAiTurn(roomId);
            break;
          }
          g.message = `${cp.name}: ${t.doubles} ${d1}+${d2}`;
        } else {
          g.doublesCount = 0;
          g.message = `${cp.name}: ${t.rolled} ${d1}+${d2}`;
        }
        g.phase = "moving";
      }
      broadcastGameState(roomId);
      if (g.phase === "moving") setTimeout(() => doMovement(roomId), 800);
      else scheduleAiTurn(roomId);
      break;
    }

    case "buy_property": {
      const cp = g.players[g.currentPlayer];
      const cell = g.cells[cp.position];
      if (g.phase !== "buy" || cp.money < cell.price) break;
      cp.money -= cell.price; cp.properties.push(cell.id);
      g.message = `${cp.name} ${t.buysProperty} ${cell.name}`;
      g.phase = "endturn";
      broadcastGameState(roomId); scheduleAiTurn(roomId);
      break;
    }

    case "start_auction": {
      if (g.phase !== "buy") break;
      const cell = g.cells[g.players[g.currentPlayer].position];
      const active = g.players.filter(p => !p.bankrupt).map(p => p.id);
      g.auctionState = { cellId: cell.id, bids: {}, currentBidder: 0, bidOrder: active, highBid: 0, highBidder: null, passed: {} };
      g.phase = "auction";
      broadcastGameState(roomId); scheduleAiTurn(roomId);
      break;
    }

    case "auction_bid": {
      if (g.phase !== "auction" || !g.auctionState) break;
      const a = g.auctionState;
      const bidderId = a.bidOrder[a.currentBidder];
      const amount = data.amount || 0;
      if (amount > 0 && amount > a.highBid && g.players[bidderId].money >= amount) {
        a.highBid = amount; a.highBidder = bidderId;
      } else {
        a.passed[bidderId] = true;
      }
      let next = (a.currentBidder + 1) % a.bidOrder.length;
      let safety = 0;
      while (a.passed[a.bidOrder[next]] && safety < a.bidOrder.length) { next = (next + 1) % a.bidOrder.length; safety++; }
      const alive = a.bidOrder.filter(id => !a.passed[id]);
      if (alive.length <= 1 && a.highBidder !== null) {
        const w = g.players[a.highBidder];
        w.money -= a.highBid; w.properties.push(a.cellId);
        g.message = `${w.name} ${t.buysProperty} ${g.cells[a.cellId].name} (${a.highBid} ${t.gold})`;
        g.auctionState = null; g.phase = "endturn";
      } else if (alive.length === 0) {
        g.message = lang === "ru" ? "Никто не купил" : "Nobody bought";
        g.auctionState = null; g.phase = "endturn";
      } else { a.currentBidder = next; }
      broadcastGameState(roomId); scheduleAiTurn(roomId);
      break;
    }

    case "pay_jail": {
      const cp = g.players[g.currentPlayer];
      if (!cp.inJail || cp.money < 50) break;
      cp.money -= 50; cp.inJail = false; cp.jailTurns = 0; g.phase = "roll";
      g.message = `${cp.name} ${lang === "ru" ? "заплатил 50 драконов" : "paid 50 dragons"}`;
      broadcastGameState(roomId); scheduleAiTurn(roomId);
      break;
    }

    case "use_card": {
      const cp = g.players[g.currentPlayer];
      if (!cp.inJail || cp.freedomCards <= 0) break;
      cp.freedomCards--; cp.inJail = false; cp.jailTurns = 0; g.phase = "roll";
      g.message = `${cp.name} ${lang === "ru" ? "использовал карту свободы" : "used freedom card"}`;
      broadcastGameState(roomId); scheduleAiTurn(roomId);
      break;
    }

    case "build": {
      const cp = g.players[g.currentPlayer];
      const cellId = data.cellId;
      if (cellId == null || g.phase !== "endturn") break;
      const cell = g.cells[cellId];
      if (!cell.buildCost || !cp.properties.includes(cellId)) break;
      const b = cell._buildings || 0;
      if (b >= 5 || cp.money < cell.buildCost) break;
      cp.money -= cell.buildCost; cell._buildings = b + 1;
      broadcastGameState(roomId);
      break;
    }

    case "mortgage": {
      const cp = g.players[g.currentPlayer];
      const cellId = data.cellId;
      if (cellId == null) break;
      const cell = g.cells[cellId];
      if (!cell._mortgaged && cp.properties.includes(cellId) && !(cell._buildings > 0)) {
        cell._mortgaged = true; cp.money += Math.floor(cell.price / 2);
        broadcastGameState(roomId);
      }
      break;
    }

    case "redeem": {
      const cp = g.players[g.currentPlayer];
      const cellId = data.cellId;
      if (cellId == null) break;
      const cell = g.cells[cellId];
      const cost = Math.floor(cell.price / 2 * 1.1);
      if (cell._mortgaged && cp.properties.includes(cellId) && cp.money >= cost) {
        cell._mortgaged = false; cp.money -= cost;
        broadcastGameState(roomId);
      }
      break;
    }

    case "end_turn": {
      g.cardDrawn = null;
      const cp = g.players[g.currentPlayer];
      if (cp.money < 0) {
        cp.bankrupt = true;
        cp.properties.forEach(pid => { g.cells[pid]._buildings = 0; g.cells[pid]._mortgaged = false; });
        cp.properties = [];
      }
      const active = g.players.filter(p => !p.bankrupt);
      if (active.length <= 1) {
        g.winner = active[0]?.id ?? null; g.phase = "gameover";
        broadcastGameState(roomId); clearAiTimer(roomId); break;
      }
      if (g.config.winCondition === "rounds" && g.roundCount >= g.config.maxRounds) {
        let richest = active[0];
        for (const p of active) { if (calcWealthStatic(g, p) > calcWealthStatic(g, richest)) richest = p; }
        g.winner = richest.id; g.phase = "gameover";
        broadcastGameState(roomId); clearAiTimer(roomId); break;
      }
      if (g.doublesCount > 0 && !cp.inJail && !cp.bankrupt) {
        g.phase = "roll";
        broadcastGameState(roomId); scheduleAiTurn(roomId); break;
      }
      g.doublesCount = 0;
      let next = (g.currentPlayer + 1) % g.players.length;
      while (g.players[next].bankrupt) next = (next + 1) % g.players.length;
      if (next <= g.currentPlayer) g.roundCount++;
      g.currentPlayer = next; g.phase = "roll";
      broadcastGameState(roomId); scheduleAiTurn(roomId);
      break;
    }

    case "lend_money": {
      if (!g.bankruptVote) break;
      const { lenderId, amount } = data;
      if (lenderId == null || !amount || amount <= 0) break;
      const lender = g.players[lenderId];
      if (!lender || lender.money < amount) break;
      lender.money -= amount;
      g.players[g.bankruptVote.playerId].money += amount;
      g.bankruptVote.lenders[lenderId] = (g.bankruptVote.lenders[lenderId] || 0) + amount;
      if (g.players[g.bankruptVote.playerId].money >= 0) {
        g.bankruptVote = null; g.phase = "endturn";
      }
      broadcastGameState(roomId); scheduleAiTurn(roomId);
      break;
    }

    case "skip_bankrupt": {
      const cp = g.players[g.currentPlayer];
      cp.bankrupt = true;
      cp.properties.forEach(pid => { g.cells[pid]._buildings = 0; g.cells[pid]._mortgaged = false; });
      cp.properties = []; g.bankruptVote = null; g.phase = "endturn";
      broadcastGameState(roomId);
      doAction(roomId, "end_turn");
      break;
    }

    case "accept_trade": {
      if (!g.tradeState) break;
      const { from, to, offer, request } = g.tradeState;
      const pF = g.players[from], pT = g.players[to];
      pF.money -= offer.money; pT.money += offer.money;
      pT.money -= request.money; pF.money += request.money;
      offer.properties.forEach(pid => { pF.properties = pF.properties.filter(p => p !== pid); pT.properties.push(pid); });
      request.properties.forEach(pid => { pT.properties = pT.properties.filter(p => p !== pid); pF.properties.push(pid); });
      pF.freedomCards -= offer.freedomCards; pT.freedomCards += offer.freedomCards;
      pT.freedomCards -= request.freedomCards; pF.freedomCards += request.freedomCards;
      g.tradeState = null; g.phase = "endturn";
      broadcastGameState(roomId); scheduleAiTurn(roomId);
      break;
    }

    case "decline_trade": {
      g.tradeState = null; g.phase = "endturn";
      broadcastGameState(roomId); scheduleAiTurn(roomId);
      break;
    }
  }
}

function doMovement(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.game || room.game.phase !== "moving") return;
  const g = room.game;
  const cp = g.players[g.currentPlayer];
  const diceSum = g.dice[0] + g.dice[1];
  const dest = (cp.position + diceSum) % 40;
  const passedStart = (cp.position + diceSum) >= 40;

  if (passedStart && dest !== 0) { cp.money += g.config.roundBonus; cp.rounds++; }
  cp.position = dest;
  handleLanding(g, room.lang, getT(room.lang));

  if (g.phase === "bankruptCheck") {
    if (cp.money < 0) {
      g.bankruptVote = { playerId: g.currentPlayer, needed: Math.abs(cp.money), lenders: {} };
      g.phase = "bankruptVote";
    }
  }

  broadcastGameState(roomId);
  scheduleAiTurn(roomId);
}

// ============================================================
// SOCKET.IO EVENT HANDLERS
// ============================================================
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  socket.emit("room_list", getRoomList());

  // Send current dev config to new connections
  const devCfg = loadDevConfig();
  if (devCfg) socket.emit("dev_config_updated", devCfg);

  // --- LOBBY ---
  socket.on('get_rooms', () => socket.emit("room_list", getRoomList()));

  socket.on('create_room', (data) => {
    const room = createRoom(socket, data);
    socket.join(room.id);
    socket.emit("room_created", { roomId: room.id });
    broadcastRoomState(room.id);
    broadcastRoomList();
  });

  socket.on('join_room', (data) => {
    const room = rooms.get(data.roomId);
    if (!room) return socket.emit("error_msg", { msg: "Room not found" });
    if (room.state !== "lobby") return socket.emit("error_msg", { msg: "Game already started" });
    const emptySlot = room.slots.find(s => !s.socketId && !s.isAI);
    if (!emptySlot) return socket.emit("error_msg", { msg: "Room is full" });
    emptySlot.socketId = socket.id;
    emptySlot.name = data.playerName || `Player ${emptySlot.index + 1}`;
    emptySlot.ready = false;
    playerRoom.set(socket.id, room.id);
    socket.join(room.id);
    socket.emit("room_joined", { roomId: room.id, slotIndex: emptySlot.index });
    broadcastRoomState(room.id);
    broadcastRoomList();
  });

  socket.on('leave_room', () => handleLeaveRoom(socket));

  socket.on('toggle_ready', () => {
    const roomId = playerRoom.get(socket.id);
    const room = roomId && rooms.get(roomId);
    if (!room || room.state !== "lobby") return;
    const idx = getSlotIndex(room, socket.id);
    if (idx < 0) return;
    room.slots[idx].ready = !room.slots[idx].ready;
    broadcastRoomState(roomId);
  });

  socket.on('update_slot', (data) => {
    const roomId = playerRoom.get(socket.id);
    const room = roomId && rooms.get(roomId);
    if (!room || room.state !== "lobby" || socket.id !== room.host) return;
    const slot = room.slots[data.slotIndex];
    if (!slot) return;
    if (data.action === "add_ai" && !slot.socketId && !slot.isAI) {
      slot.isAI = true; slot.name = data.name || "AI"; slot.aiPersonality = data.personality || "random"; slot.ready = true;
    } else if (data.action === "remove" && slot.isAI) {
      slot.isAI = false; slot.name = null; slot.aiPersonality = null; slot.ready = false;
    } else if (data.action === "set_personality" && slot.isAI) {
      slot.aiPersonality = data.personality;
    } else if (data.action === "set_name") {
      slot.name = data.name;
    }
    broadcastRoomState(roomId);
  });

  socket.on('update_config', (data) => {
    const roomId = playerRoom.get(socket.id);
    const room = roomId && rooms.get(roomId);
    if (!room || room.state !== "lobby" || socket.id !== room.host) return;
    room.config = { ...room.config, ...data.config };
    if (data.lang) room.lang = data.lang;
    broadcastRoomState(roomId);
  });

  // --- START GAME ---
  socket.on('start_game', () => {
    const roomId = playerRoom.get(socket.id);
    const room = roomId && rooms.get(roomId);
    if (!room || room.state !== "lobby" || socket.id !== room.host) return;
    const filled = room.slots.filter(s => s.socketId || s.isAI);
    if (filled.length < 2) return socket.emit("error_msg", { msg: "Need at least 2 players" });
    if (!filled.every(s => s.ready)) return socket.emit("error_msg", { msg: "Not all players are ready" });

    const cfg = { ...room.config, players: filled.map(s => ({ name: s.name, isAI: s.isAI, aiPersonality: s.aiPersonality })) };
    room.game = createInitialState(cfg, room.lang);
    room.state = "playing";
    room.playerMap = {};
    filled.forEach((s, i) => { if (s.socketId) room.playerMap[s.socketId] = i; });

    broadcastGameState(roomId);
    broadcastRoomList();
    io.to(roomId).emit("game_started", { playerMap: room.playerMap });
    scheduleAiTurn(roomId);
  });

  // --- GAME ACTIONS (with auth) ---
  const ga = (name, handler) => {
    socket.on(name, (data = {}) => {
      const roomId = playerRoom.get(socket.id);
      const room = roomId && rooms.get(roomId);
      if (!room || room.state !== "playing" || !room.game) return;
      const pIdx = room.playerMap?.[socket.id];
      if (pIdx == null) return;
      const anytime = ["lend_money", "accept_trade", "decline_trade", "chat_message"];
      if (!anytime.includes(name) && room.game.currentPlayer !== pIdx) return;
      handler(roomId, room, pIdx, data);
    });
  };

  ga('roll_dice', (rid, room) => { if (room.game.phase === "roll") doAction(rid, "roll_dice"); });
  ga('buy_property', (rid) => doAction(rid, "buy_property"));
  ga('start_auction', (rid) => doAction(rid, "start_auction"));
  ga('auction_bid', (rid, room, pIdx, data) => {
    const a = room.game.auctionState;
    if (a && a.bidOrder[a.currentBidder] === pIdx) doAction(rid, "auction_bid", { amount: data.amount });
  });
  ga('end_turn', (rid) => doAction(rid, "end_turn"));
  ga('build', (rid, r, p, d) => doAction(rid, "build", { cellId: d.cellId }));
  ga('mortgage', (rid, r, p, d) => doAction(rid, "mortgage", { cellId: d.cellId }));
  ga('redeem', (rid, r, p, d) => doAction(rid, "redeem", { cellId: d.cellId }));
  ga('pay_jail', (rid) => doAction(rid, "pay_jail"));
  ga('use_card', (rid) => doAction(rid, "use_card"));
  ga('lend_money', (rid, r, pIdx, d) => doAction(rid, "lend_money", { lenderId: pIdx, amount: d.amount }));
  ga('skip_bankrupt', (rid) => doAction(rid, "skip_bankrupt"));
  ga('accept_trade', (rid) => doAction(rid, "accept_trade"));
  ga('decline_trade', (rid) => doAction(rid, "decline_trade"));

  // --- CHAT ---
  socket.on('chat_message', (data) => {
    const roomId = playerRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const slot = room.slots.find(s => s.socketId === socket.id);
    io.to(roomId).emit("chat_message", {
      from: slot?.name || "???",
      text: (data.text || "").slice(0, 200),
      time: new Date().toLocaleTimeString().slice(0, 5),
    });
  });

  // --- RECONNECT ---
  socket.on('reconnect_room', (data) => {
    const room = rooms.get(data.roomId);
    if (!room) return socket.emit("error_msg", { msg: "Room not found" });
    // Find a slot that was disconnected and matches the player name
    const slot = room.slots.find(s => !s.socketId && s.name === data.playerName);
    if (!slot) return socket.emit("error_msg", { msg: "Cannot reconnect" });
    slot.socketId = socket.id;
    slot.ready = true;
    playerRoom.set(socket.id, room.id);
    socket.join(room.id);
    if (room.state === "playing" && room.game) {
      // Find the player index and restore human control
      const pIdx = room.slots.indexOf(slot);
      room.playerMap[socket.id] = pIdx;
      room.game.players[pIdx].isAI = false;
      socket.emit("room_joined", { roomId: room.id, slotIndex: slot.index });
      socket.emit("game_started", { playerMap: room.playerMap });
      broadcastGameState(room.id);
    } else {
      socket.emit("room_joined", { roomId: room.id, slotIndex: slot.index });
    }
    broadcastRoomState(room.id);
  });

  // --- DISCONNECT ---
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    handleLeaveRoom(socket, true);
  });
});

function handleLeaveRoom(socket, isDisconnect = false) {
  const roomId = playerRoom.get(socket.id);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) { playerRoom.delete(socket.id); return; }

  const slotIdx = getSlotIndex(room, socket.id);
  if (slotIdx >= 0) {
    room.slots[slotIdx].socketId = null;
    room.slots[slotIdx].ready = false;
    if (room.state === "playing" && room.game) {
      const pIdx = room.playerMap?.[socket.id];
      if (pIdx != null) {
        room.game.players[pIdx].isAI = true;
        room.game.players[pIdx].aiPersonality = "cautious";
        delete room.playerMap[socket.id];
        broadcastGameState(roomId);
        scheduleAiTurn(roomId);
      }
    }
  }

  if (!isDisconnect) socket.leave(roomId);
  playerRoom.delete(socket.id);

  if (socket.id === room.host) {
    const next = room.slots.find(s => s.socketId);
    if (next) { room.host = next.socketId; }
    else { clearAiTimer(roomId); rooms.delete(roomId); broadcastRoomList(); return; }
  }

  if (room.state === "lobby" && slotIdx >= 0) {
    room.slots[slotIdx].name = null; room.slots[slotIdx].isAI = false;
  }

  broadcastRoomState(roomId);
  broadcastRoomList();
}

// Cleanup stale rooms every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (!room.slots.some(s => s.socketId) && now - room.createdAt > 5 * 60 * 1000) {
      clearAiTimer(id); rooms.delete(id);
    }
  }
  broadcastRoomList();
}, 5 * 60 * 1000);

// ============================================================
// DEV CONFIG API ENDPOINTS
// ============================================================

// Auth check
app.post('/api/dev/auth', (req, res) => {
  res.json({ success: req.body?.password === DEV_PASSWORD });
});

// Get config (public — all players load it)
app.get('/api/dev/config', (req, res) => {
  res.json({ config: loadDevConfig() });
});

// Save config (auth required, auto-backup)
app.post('/api/dev/config', devAuth, (req, res) => {
  createDevBackup();
  saveDevConfig(req.body.config);
  io.emit('dev_config_updated', req.body.config);
  res.json({ success: true });
});

// Reset to defaults (auth required)
app.post('/api/dev/reset', devAuth, (req, res) => {
  createDevBackup();
  const p = join(DATA_DIR, 'devConfig.json');
  if (existsSync(p)) unlinkSync(p);
  io.emit('dev_config_updated', null);
  res.json({ success: true });
});

// Upload audio file (stored on disk, not in JSON)
app.post('/api/dev/upload/audio', devAuth, (req, res) => {
  const { key, data, filename } = req.body;
  if (!key || !data) return res.status(400).json({ error: 'Missing key or data' });
  try {
    const ext = (filename || 'audio.mp3').split('.').pop() || 'mp3';
    const safeName = key.replace(/[^a-zA-Z0-9_-]/g, '') + '.' + ext;
    const base64 = data.includes(',') ? data.split(',')[1] : data;
    writeFileSync(join(UPLOADS_DIR, safeName), Buffer.from(base64, 'base64'));
    const url = `/api/dev/audio/${safeName}`;
    // Update config with audio URL
    const config = loadDevConfig() || {};
    if (!config.audio) config.audio = {};
    config.audio[key] = url;
    saveDevConfig(config);
    io.emit('dev_config_updated', config);
    res.json({ success: true, url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete audio file
app.post('/api/dev/delete/audio', devAuth, (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'Missing key' });
  // Remove file
  const files = readdirSync(UPLOADS_DIR).filter(f => f.startsWith(key.replace(/[^a-zA-Z0-9_-]/g, '')));
  files.forEach(f => { try { unlinkSync(join(UPLOADS_DIR, f)); } catch {} });
  // Remove from config
  const config = loadDevConfig() || {};
  if (config.audio) { delete config.audio[key]; saveDevConfig(config); }
  io.emit('dev_config_updated', config);
  res.json({ success: true });
});

// Serve uploaded audio files
app.use('/api/dev/audio', express.static(UPLOADS_DIR));

// List backups
app.get('/api/dev/backups', (req, res) => {
  try {
    const files = readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json')).sort().reverse();
    res.json({ backups: files });
  } catch { res.json({ backups: [] }); }
});

// Restore from backup (auth required)
app.post('/api/dev/restore', devAuth, (req, res) => {
  const file = req.body.backup;
  if (!file || !file.endsWith('.json') || file.includes('..')) return res.status(400).json({ error: 'Invalid backup' });
  try {
    const p = join(BACKUPS_DIR, file);
    if (!existsSync(p)) return res.status(404).json({ error: 'Backup not found' });
    const config = JSON.parse(readFileSync(p, 'utf-8'));
    createDevBackup();
    saveDevConfig(config);
    io.emit('dev_config_updated', config);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Export config
app.get('/api/dev/export', (req, res) => {
  const config = loadDevConfig();
  res.setHeader('Content-Disposition', 'attachment; filename=kirshas-dev-config.json');
  res.json(config || {});
});

// Import config (auth required)
app.post('/api/dev/import', devAuth, (req, res) => {
  if (!req.body.config) return res.status(400).json({ error: 'Missing config' });
  createDevBackup();
  saveDevConfig(req.body.config);
  io.emit('dev_config_updated', req.body.config);
  res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    rooms: rooms.size,
    players: playerRoom.size,
    timestamp: Date.now(),
  });
});

// API: room stats
app.get('/api/stats', (req, res) => {
  const activeRooms = [...rooms.values()];
  res.json({
    rooms: activeRooms.length,
    lobbies: activeRooms.filter(r => r.state === 'lobby').length,
    playing: activeRooms.filter(r => r.state === 'playing').length,
    players: playerRoom.size,
  });
});

// Static files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')));
  app.get('*', (req, res) => res.sendFile(join(__dirname, '../dist/index.html')));
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Kirshas Monopolia server on :${PORT}`));
