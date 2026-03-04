// ============================================================
// KIRSHAS MONOPOLIA — Shared Game Engine
// Used by both client (local mode) and server (online mode)
// ============================================================
import { makeCells, TOKENS, PLAYER_COLORS, RAVEN_CARDS, THRONE_CARDS, BOARD_SIZE, CORNER, CELL_W } from './gameData.js';

// --- HELPERS ---
export const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const rollDie = () => Math.floor(Math.random() * 6) + 1;

// --- BOARD POSITION CALCULATOR ---
// Each side has exactly 9 cells filling the space between two corners
const SIDE = (BOARD_SIZE - 2 * CORNER) / 9;

export function getCellPos(idx) {
  if (idx === 0) return { x: BOARD_SIZE - CORNER, y: BOARD_SIZE - CORNER, w: CORNER, h: CORNER };
  if (idx === 10) return { x: 0, y: BOARD_SIZE - CORNER, w: CORNER, h: CORNER };
  if (idx === 20) return { x: 0, y: 0, w: CORNER, h: CORNER };
  if (idx === 30) return { x: BOARD_SIZE - CORNER, y: 0, w: CORNER, h: CORNER };
  if (idx >= 1 && idx <= 9) {
    const i = 9 - idx;
    return { x: CORNER + i * SIDE, y: BOARD_SIZE - CORNER, w: SIDE, h: CORNER };
  }
  if (idx >= 11 && idx <= 19) {
    const i = 19 - idx;
    return { x: 0, y: CORNER + i * SIDE, w: CORNER, h: SIDE };
  }
  if (idx >= 21 && idx <= 29) {
    const i = idx - 21;
    return { x: CORNER + i * SIDE, y: 0, w: SIDE, h: CORNER };
  }
  if (idx >= 31 && idx <= 39) {
    const i = idx - 31;
    return { x: BOARD_SIZE - CORNER, y: CORNER + i * SIDE, w: CORNER, h: SIDE };
  }
  return { x: 0, y: 0, w: SIDE, h: SIDE };
}

export function getCellCenter(idx) {
  const p = getCellPos(idx);
  return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
}

// --- INITIAL GAME STATE ---
export function createInitialState(config, lang) {
  const cells = makeCells(lang);
  const players = config.players.map((p, i) => ({
    id: i,
    name: p.name,
    isAI: p.isAI,
    aiPersonality: p.aiPersonality || "random",
    token: TOKENS[i],
    color: PLAYER_COLORS[i],
    money: config.startMoney,
    position: 0,
    properties: [],
    inJail: false,
    jailTurns: 0,
    freedomCards: 0,
    bankrupt: false,
    rounds: 0,
    totalRentPaid: 0,
    totalRentReceived: 0,
  }));
  return {
    cells,
    players,
    currentPlayer: 0,
    phase: "roll",
    dice: [0, 0],
    doublesCount: 0,
    message: "",
    cardDrawn: null,
    auctionState: null,
    tradeState: null,
    bankruptVote: null,
    roundCount: 0,
    config,
    ravenDeck: shuffle([...Array(16).keys()]),
    throneDeck: shuffle([...Array(16).keys()]),
    winner: null,
    paused: false,
  };
}

// --- STATIC RENT CALCULATOR (no React dependencies) ---
export function calcRentStatic(g, cell, diceSum) {
  const owner = g.players.find((p) => p.properties.includes(cell.id));
  if (!owner || cell._mortgaged) return 0;
  if (cell.type === "port") {
    const count = g.cells.filter((c) => c.type === "port" && owner.properties.includes(c.id)).length;
    return [0, 25, 50, 100, 200][count];
  }
  if (cell.type === "utility") {
    const count = g.cells.filter((c) => c.type === "utility" && owner.properties.includes(c.id)).length;
    return count === 1 ? diceSum * 4 : diceSum * 10;
  }
  if (cell.type === "property") {
    const buildings = cell._buildings || 0;
    let r = cell.rent[buildings];
    const houseProps = g.cells.filter((c) => c.house === cell.house).map((c) => c.id);
    if (buildings === 0 && houseProps.every((id) => owner.properties.includes(id))) r *= 2;
    return r;
  }
  return 0;
}

// --- STATIC WEALTH CALCULATOR ---
export function calcWealthStatic(g, player) {
  let w = player.money;
  for (const pid of player.properties) {
    const cell = g.cells[pid];
    w += cell.price;
    if (cell._buildings) w += cell._buildings * (cell.buildCost || 0);
  }
  return w;
}

// --- LANDING HANDLER ---
export function handleLanding(g, lang, t) {
  const cp = g.players[g.currentPlayer];
  const cell = g.cells[cp.position];
  switch (cell.type) {
    case "start":
      g.phase = "endturn";
      break;
    case "property":
    case "port":
    case "utility": {
      const owner = g.players.find((p) => p.properties.includes(cell.id));
      if (!owner) {
        if (cp.money >= cell.price) {
          g.phase = "buy";
          g.message = `${cp.name} → ${cell.name}. ${t.price}: ${cell.price} ${t.gold}`;
        } else {
          g.phase = "endturn";
        }
      } else if (owner.id !== cp.id && !cell._mortgaged && !owner.bankrupt) {
        const rent = calcRentStatic(g, cell, g.dice[0] + g.dice[1]);
        cp.money -= rent;
        owner.money += rent;
        cp.totalRentPaid += rent;
        owner.totalRentReceived += rent;
        g.message = `${cp.name} ${t.paysRent} ${rent} ${t.gold} → ${owner.name}`;
        if (cp.money < 0) {
          g.phase = "bankruptCheck";
        } else {
          g.phase = "endturn";
        }
      } else {
        g.phase = "endturn";
      }
      break;
    }
    case "tax":
      cp.money -= cell.amount;
      g.message = `${cp.name}: ${cell.name} -${cell.amount} ${t.gold}`;
      if (cp.money < 0) g.phase = "bankruptCheck";
      else g.phase = "endturn";
      break;
    case "ravens":
    case "throne": {
      const deck = cell.type === "ravens" ? g.ravenDeck : g.throneDeck;
      const cards = cell.type === "ravens" ? RAVEN_CARDS : THRONE_CARDS;
      if (deck.length === 0) {
        if (cell.type === "ravens") g.ravenDeck = shuffle([...Array(16).keys()]);
        else g.throneDeck = shuffle([...Array(16).keys()]);
      }
      const cardIdx = (cell.type === "ravens" ? g.ravenDeck : g.throneDeck).pop();
      const card = cards[cardIdx];
      g.cardDrawn = { ...card, text: card.text[lang] || card.text.ru };
      if (card.type === "money") {
        cp.money += card.amount;
        if (cp.money < 0) g.phase = "bankruptCheck";
        else g.phase = "card";
      } else if (card.type === "move") {
        if (card.jail) {
          cp.position = 10;
          cp.inJail = true;
        } else {
          if (card.to < cp.position) { cp.money += g.config.roundBonus; cp.rounds++; }
          cp.position = card.to;
        }
        g.phase = "card";
      } else if (card.type === "freedom") {
        cp.freedomCards++;
        g.phase = "card";
      }
      g.message = g.cardDrawn.text;
      break;
    }
    case "jail":
      g.message = `${cp.name} ${lang === "ru" ? "проходит мимо Стены" : "just visiting The Wall"}`;
      g.phase = "endturn";
      break;
    case "parking":
      g.message = `${cp.name} → ${cell.name}`;
      g.phase = "endturn";
      break;
    case "gotojail":
      cp.position = 10;
      cp.inJail = true;
      g.message = `${cp.name} ${t.goesToJail}`;
      g.phase = "endturn";
      break;
    default:
      g.phase = "endturn";
  }
}
