import { useState, useEffect, useCallback, useRef } from 'react';
import { T, HOUSES, TOKENS, AI_NAMES, PLAYER_COLORS, BOARD_SIZE, CORNER, CELL_W } from '../gameData';
import { startAudio, playDiceSound, playMoveSound, playBuySound, playClickSound } from '../sounds';
import {
  deepClone, shuffle, rollDie,
  getCellPos, getCellCenter,
  createInitialState, calcRentStatic, calcWealthStatic, handleLanding
} from '../gameEngine';

// --- THEME ---
const S = {
  bg: "#0a0a12",
  bg2: "#12121e",
  bg3: "#1a1a2e",
  gold: "#c9a84c",
  goldDark: "#a07830",
  text: "#e8e0d0",
  textDim: "#8a8072",
  red: "#8B0000",
  border: "rgba(201,168,76,0.2)",
  font: "'Georgia', 'Times New Roman', serif",
};

const btn = (extra = {}) => ({
  background: `linear-gradient(135deg, ${S.gold}, ${S.goldDark})`,
  color: S.bg,
  border: "none",
  padding: "12px 28px",
  borderRadius: 8,
  fontSize: 16,
  fontWeight: "bold",
  cursor: "pointer",
  fontFamily: S.font,
  letterSpacing: 1,
  ...extra,
});

const btnOutline = (extra = {}) => ({
  background: "transparent",
  color: S.gold,
  border: `1px solid ${S.gold}`,
  padding: "10px 24px",
  borderRadius: 8,
  fontSize: 14,
  cursor: "pointer",
  fontFamily: S.font,
  letterSpacing: 1,
  ...extra,
});

const card = (extra = {}) => ({
  background: S.bg3,
  border: `1px solid ${S.border}`,
  borderRadius: 12,
  padding: 16,
  ...extra,
});

export default function Game() {
  const [lang, setLang] = useState("ru");
  const [screen, setScreen] = useState("menu");
  const [musicVol, setMusicVol] = useState(0.5);
  const [effectsVol, setEffectsVol] = useState(0.7);
  const [game, setGame] = useState(null);
  const [config, setConfig] = useState({
    mode: "classic",
    startMoney: 1500,
    turnTime: 0,
    roundBonus: 200,
    winCondition: "last",
    maxRounds: 30,
    players: [
      { name: "Игрок 1", isAI: false, aiPersonality: null },
      { name: "Серсея", isAI: true, aiPersonality: "aggressive" },
      { name: "Тирион", isAI: true, aiPersonality: "cautious" },
    ],
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [selectedCell, setSelectedCell] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [animPos, setAnimPos] = useState(null);
  const [diceAnim, setDiceAnim] = useState(false);
  const [tradeOffer, setTradeOffer] = useState({ money: 0, properties: [], freedomCards: 0 });
  const [tradeRequest, setTradeRequest] = useState({ money: 0, properties: [], freedomCards: 0 });
  const [tradeTarget, setTradeTarget] = useState(null);
  const [auctionBid, setAuctionBid] = useState(10);
  const [lendAmount, setLendAmount] = useState(0);

  const t = T[lang];
  const aiTimerRef = useRef(null);

  // --- GAME ACTIONS ---
  const updateGame = useCallback((updater) => {
    setGame((prev) => {
      if (!prev) return prev;
      const next = deepClone(prev);
      updater(next);
      return next;
    });
  }, []);

  const getPropertyOwner = useCallback((cellId) => {
    if (!game) return null;
    for (const p of game.players) {
      if (p.properties.includes(cellId)) return p;
    }
    return null;
  }, [game]);

  // --- ROLL & MOVE ---
  const doRoll = useCallback(() => {
    if (!game || animating || diceAnim) return;
    startAudio();
    playDiceSound(effectsVol);
    setDiceAnim(true);

    const d1 = rollDie(), d2 = rollDie();
    const isDouble = d1 === d2;

    setTimeout(() => {
      setDiceAnim(false);
      updateGame((g) => {
        g.dice = [d1, d2];
        const cp = g.players[g.currentPlayer];
        if (cp.inJail) {
          if (isDouble) {
            cp.inJail = false;
            cp.jailTurns = 0;
            g.doublesCount = 0;
            g.message = `${cp.name}: ${t.doubles} ${t.rolled} ${d1}+${d2}`;
            g.phase = "moving";
          } else {
            cp.jailTurns++;
            if (cp.jailTurns >= 3) {
              cp.money -= 50;
              cp.inJail = false;
              cp.jailTurns = 0;
              g.message = `${cp.name} ${lang === "ru" ? "вынужден заплатить 50 драконов" : "forced to pay 50 dragons"}`;
              g.phase = "moving";
            } else {
              g.message = `${cp.name}: ${t.rolled} ${d1}+${d2}. ${t.inJail}`;
              g.phase = "endturn";
            }
          }
          return;
        }
        if (isDouble) {
          g.doublesCount++;
          if (g.doublesCount >= 3) {
            cp.position = 10;
            cp.inJail = true;
            g.doublesCount = 0;
            g.message = `${cp.name}: ${t.tripleDoubles}`;
            g.phase = "endturn";
            return;
          }
          g.message = `${cp.name}: ${t.doubles} ${d1}+${d2}`;
        } else {
          g.doublesCount = 0;
          g.message = `${cp.name}: ${t.rolled} ${d1}+${d2}`;
        }
        g.phase = "moving";
      });
    }, 600);
  }, [game, animating, diceAnim, effectsVol, updateGame, t, lang]);

  // Movement animation + landing logic
  useEffect(() => {
    if (!game || game.phase !== "moving" || animating) return;
    const cp = game.players[game.currentPlayer];
    const diceSum = game.dice[0] + game.dice[1];
    const dest = (cp.position + diceSum) % 40;
    const passedStart = (cp.position + diceSum) >= 40;

    setAnimating(true);
    const from = getCellCenter(cp.position);
    const to = getCellCenter(dest);
    setAnimPos(from);

    const steps = 12;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      playMoveSound(effectsVol * 0.3);
      setAnimPos({
        x: from.x + (to.x - from.x) * (step / steps),
        y: from.y + (to.y - from.y) * (step / steps),
      });
      if (step >= steps) {
        clearInterval(interval);
        setAnimPos(null);
        setAnimating(false);
        updateGame((g) => {
          const p = g.players[g.currentPlayer];
          if (passedStart && dest !== 0) {
            p.money += g.config.roundBonus;
            p.rounds++;
          }
          p.position = dest;
          handleLanding(g, lang, t);
        });
      }
    }, 50);
  }, [game?.phase]);

  // --- BUY ---
  const doBuy = useCallback(() => {
    if (!game) return;
    playBuySound(effectsVol);
    updateGame((g) => {
      const cp = g.players[g.currentPlayer];
      const cell = g.cells[cp.position];
      cp.money -= cell.price;
      cp.properties.push(cell.id);
      g.message = `${cp.name} ${t.buysProperty} ${cell.name}`;
      g.phase = "endturn";
    });
  }, [game, effectsVol, updateGame, t]);

  // --- AUCTION ---
  const startAuction = useCallback(() => {
    if (!game) return;
    updateGame((g) => {
      const cell = g.cells[g.players[g.currentPlayer].position];
      const active = g.players.filter((p) => !p.bankrupt).map((p) => p.id);
      g.auctionState = { cellId: cell.id, bids: {}, currentBidder: 0, bidOrder: active, highBid: 0, highBidder: null, passed: {} };
      g.phase = "auction";
    });
  }, [game, updateGame]);

  const doAuctionBid = useCallback((amount) => {
    if (!game || !game.auctionState) return;
    playClickSound(effectsVol);
    updateGame((g) => {
      const a = g.auctionState;
      const bidderId = a.bidOrder[a.currentBidder];
      if (amount > 0 && amount > a.highBid && g.players[bidderId].money >= amount) {
        a.highBid = amount;
        a.highBidder = bidderId;
      } else {
        a.passed[bidderId] = true;
      }
      let next = (a.currentBidder + 1) % a.bidOrder.length;
      let safety = 0;
      while (a.passed[a.bidOrder[next]] && safety < a.bidOrder.length) {
        next = (next + 1) % a.bidOrder.length;
        safety++;
      }
      const activeBidders = a.bidOrder.filter((id) => !a.passed[id]);
      if (activeBidders.length <= 1 && a.highBidder !== null) {
        const winner = g.players[a.highBidder];
        winner.money -= a.highBid;
        winner.properties.push(a.cellId);
        g.message = `${winner.name} ${t.buysProperty} ${g.cells[a.cellId].name} (${a.highBid} ${t.gold})`;
        g.auctionState = null;
        g.phase = "endturn";
      } else if (activeBidders.length === 0) {
        g.message = lang === "ru" ? "Никто не купил" : "Nobody bought";
        g.auctionState = null;
        g.phase = "endturn";
      } else {
        a.currentBidder = next;
      }
    });
  }, [game, effectsVol, updateGame, t, lang]);

  // --- JAIL ACTIONS ---
  const payJail = useCallback(() => {
    updateGame((g) => {
      const cp = g.players[g.currentPlayer];
      cp.money -= 50;
      cp.inJail = false;
      cp.jailTurns = 0;
      g.phase = "roll";
      g.message = `${cp.name} ${lang === "ru" ? "заплатил 50 драконов" : "paid 50 dragons"}`;
    });
  }, [updateGame, lang]);

  const useFreedomCard = useCallback(() => {
    updateGame((g) => {
      const cp = g.players[g.currentPlayer];
      cp.freedomCards--;
      cp.inJail = false;
      cp.jailTurns = 0;
      g.phase = "roll";
      g.message = `${cp.name} ${lang === "ru" ? "использовал карту свободы" : "used freedom card"}`;
    });
  }, [updateGame, lang]);

  // --- BUILD ---
  const doBuild = useCallback((cellId) => {
    playBuySound(effectsVol);
    updateGame((g) => {
      const cp = g.players[g.currentPlayer];
      const cell = g.cells[cellId];
      if (!cell.buildCost) return;
      const buildings = cell._buildings || 0;
      if (buildings >= 5) return;
      if (cp.money < cell.buildCost) return;
      cp.money -= cell.buildCost;
      cell._buildings = buildings + 1;
    });
  }, [effectsVol, updateGame]);

  // --- MORTGAGE ---
  const doMortgage = useCallback((cellId) => {
    updateGame((g) => {
      const cell = g.cells[cellId];
      const cp = g.players[g.currentPlayer];
      if (!cell._mortgaged && cp.properties.includes(cellId)) {
        cell._mortgaged = true;
        cp.money += Math.floor(cell.price / 2);
      }
    });
  }, [updateGame]);

  const doRedeem = useCallback((cellId) => {
    updateGame((g) => {
      const cell = g.cells[cellId];
      const cp = g.players[g.currentPlayer];
      const cost = Math.floor(cell.price / 2 * 1.1);
      if (cell._mortgaged && cp.properties.includes(cellId) && cp.money >= cost) {
        cell._mortgaged = false;
        cp.money -= cost;
      }
    });
  }, [updateGame]);

  // --- END TURN ---
  const endTurn = useCallback(() => {
    if (!game) return;
    updateGame((g) => {
      g.cardDrawn = null;
      const cp = g.players[g.currentPlayer];
      if (cp.money < 0) {
        cp.bankrupt = true;
        cp.properties.forEach((pid) => {
          g.cells[pid]._buildings = 0;
          g.cells[pid]._mortgaged = false;
        });
        cp.properties = [];
      }
      const active = g.players.filter((p) => !p.bankrupt);
      if (active.length <= 1) {
        g.winner = active[0]?.id ?? null;
        g.phase = "gameover";
        return;
      }
      if (g.config.winCondition === "rounds" && g.roundCount >= g.config.maxRounds) {
        let richest = active[0];
        for (const p of active) {
          if (calcWealthStatic(g, p) > calcWealthStatic(g, richest)) richest = p;
        }
        g.winner = richest.id;
        g.phase = "gameover";
        return;
      }
      if (g.doublesCount > 0 && !cp.inJail && !cp.bankrupt) {
        g.phase = "roll";
        return;
      }
      g.doublesCount = 0;
      let next = (g.currentPlayer + 1) % g.players.length;
      while (g.players[next].bankrupt) {
        next = (next + 1) % g.players.length;
      }
      if (next <= g.currentPlayer) g.roundCount++;
      g.currentPlayer = next;
      g.phase = "roll";
    });
  }, [game, updateGame]);

  // --- BANKRUPT VOTE ---
  useEffect(() => {
    if (!game || game.phase !== "bankruptCheck") return;
    const cp = game.players[game.currentPlayer];
    if (cp.money < 0) {
      updateGame((g) => {
        g.bankruptVote = { playerId: g.currentPlayer, needed: Math.abs(cp.money), lenders: {} };
        g.phase = "bankruptVote";
      });
    }
  }, [game?.phase]);

  const doLend = useCallback((lenderId, amount) => {
    updateGame((g) => {
      if (!g.bankruptVote) return;
      const lender = g.players[lenderId];
      if (lender.money >= amount && amount > 0) {
        lender.money -= amount;
        g.players[g.bankruptVote.playerId].money += amount;
        g.bankruptVote.lenders[lenderId] = (g.bankruptVote.lenders[lenderId] || 0) + amount;
        if (g.players[g.bankruptVote.playerId].money >= 0) {
          g.bankruptVote = null;
          g.phase = "endturn";
        }
      }
    });
  }, [updateGame]);

  const skipBankruptVote = useCallback(() => {
    updateGame((g) => {
      g.players[g.currentPlayer].bankrupt = true;
      g.players[g.currentPlayer].properties.forEach((pid) => {
        g.cells[pid]._buildings = 0;
        g.cells[pid]._mortgaged = false;
      });
      g.players[g.currentPlayer].properties = [];
      g.bankruptVote = null;
      g.phase = "endturn";
    });
  }, [updateGame]);

  // --- TRADE ---
  const proposeTrade = useCallback(() => {
    if (tradeTarget === null) return;
    updateGame((g) => {
      g.tradeState = {
        from: g.currentPlayer,
        to: tradeTarget,
        offer: deepClone(tradeOffer),
        request: deepClone(tradeRequest),
      };
      g.phase = "tradeReview";
    });
  }, [tradeTarget, tradeOffer, tradeRequest, updateGame]);

  const acceptTrade = useCallback(() => {
    updateGame((g) => {
      if (!g.tradeState) return;
      const { from, to, offer, request } = g.tradeState;
      const pFrom = g.players[from], pTo = g.players[to];
      pFrom.money -= offer.money;
      pTo.money += offer.money;
      pTo.money -= request.money;
      pFrom.money += request.money;
      offer.properties.forEach((pid) => {
        pFrom.properties = pFrom.properties.filter((p) => p !== pid);
        pTo.properties.push(pid);
      });
      request.properties.forEach((pid) => {
        pTo.properties = pTo.properties.filter((p) => p !== pid);
        pFrom.properties.push(pid);
      });
      pFrom.freedomCards -= offer.freedomCards;
      pTo.freedomCards += offer.freedomCards;
      pTo.freedomCards -= request.freedomCards;
      pFrom.freedomCards += request.freedomCards;
      g.tradeState = null;
      g.phase = "endturn";
    });
  }, [updateGame]);

  const declineTrade = useCallback(() => {
    updateGame((g) => { g.tradeState = null; g.phase = "endturn"; });
  }, [updateGame]);

  // --- AI LOGIC ---
  useEffect(() => {
    if (!game || game.paused || game.phase === "gameover" || animating || diceAnim) return;
    const cp = game.players[game.currentPlayer];
    if (!cp.isAI) return;

    const timer = setTimeout(() => {
      const personality = cp.aiPersonality || "random";
      if (game.phase === "roll") {
        if (cp.inJail) {
          if (cp.freedomCards > 0) useFreedomCard();
          else if (cp.money > 200) payJail();
          else doRoll();
        } else {
          doRoll();
        }
      } else if (game.phase === "buy") {
        const cell = game.cells[cp.position];
        const shouldBuy = personality === "aggressive" ? cp.money > cell.price * 0.5
          : personality === "cautious" ? cp.money > cell.price * 2
          : personality === "trader" ? cp.money > cell.price * 1.2
          : Math.random() > 0.3;
        if (shouldBuy && cp.money >= cell.price) doBuy();
        else startAuction();
      } else if (game.phase === "auction") {
        const a = game.auctionState;
        if (a && a.bidOrder[a.currentBidder] === cp.id) {
          const cell = game.cells[a.cellId];
          const maxBid = personality === "aggressive" ? cell.price * 0.9
            : personality === "cautious" ? cell.price * 0.5
            : cell.price * 0.7;
          if (a.highBid < maxBid && cp.money > a.highBid + 10) {
            doAuctionBid(a.highBid + 10);
          } else {
            doAuctionBid(0);
          }
        }
      } else if (game.phase === "card") {
        endTurn();
      } else if (game.phase === "endturn") {
        const myHouses = {};
        cp.properties.forEach((pid) => {
          const c = game.cells[pid];
          if (c.house) {
            if (!myHouses[c.house]) myHouses[c.house] = [];
            myHouses[c.house].push(pid);
          }
        });
        let built = false;
        for (const [house, props] of Object.entries(myHouses)) {
          const houseProps = game.cells.filter((c) => c.house === house).map((c) => c.id);
          if (houseProps.every((id) => cp.properties.includes(id))) {
            for (const pid of props) {
              const c = game.cells[pid];
              if ((c._buildings || 0) < 5 && cp.money > (c.buildCost || 0) * 2) {
                doBuild(pid);
                built = true;
                break;
              }
            }
          }
          if (built) break;
        }
        if (!built) endTurn();
        else setTimeout(endTurn, 500);
      } else if (game.phase === "bankruptVote") {
        skipBankruptVote();
      } else if (game.phase === "tradeReview") {
        if (game.tradeState?.to === cp.id) {
          Math.random() > 0.5 ? acceptTrade() : declineTrade();
        }
      } else if (game.phase === "bankruptCheck") {
        // Will be handled by useEffect
      } else {
        endTurn();
      }
    }, 1200 + Math.random() * 800);

    aiTimerRef.current = timer;
    return () => clearTimeout(timer);
  }, [game?.phase, game?.currentPlayer, game?.auctionState?.currentBidder, animating, diceAnim, game?.paused]);

  // --- START GAME ---
  const startGame = useCallback(() => {
    startAudio();
    const state = createInitialState(config, lang);
    setGame(state);
    setChatMessages([]);
    setScreen("game");
  }, [config, lang]);

  // --- CHAT ---
  const sendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, {
      from: game?.players[game.currentPlayer]?.name || "???",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString().slice(0, 5),
    }]);
    setChatInput("");
  }, [chatInput, game]);

  // ========== MENU SCREEN ==========
  if (screen === "menu") {
    return (
      <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse at center, ${S.bg3} 0%, ${S.bg} 70%)`, color: S.text, fontFamily: S.font, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(201,168,76,0.3) 40px, rgba(201,168,76,0.3) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(201,168,76,0.3) 40px, rgba(201,168,76,0.3) 41px)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚔️</div>
          <h1 style={{ fontSize: 36, color: S.gold, margin: "0 0 4px 0", textShadow: `0 0 30px rgba(201,168,76,0.4)`, letterSpacing: 2 }}>KIRSHAS</h1>
          <h2 style={{ fontSize: 22, color: S.gold, margin: "0 0 8px 0", fontWeight: "normal", letterSpacing: 6 }}>MONOPOLIA</h2>
          <div style={{ fontSize: 12, color: S.textDim, letterSpacing: 4, marginBottom: 40, fontFamily: S.font }}>GAME OF THRONES EDITION</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
            <button onClick={() => { playClickSound(effectsVol); setScreen("setup"); }} style={btn({ padding: "16px 60px", fontSize: 20 })}>{t.play}</button>
            <button onClick={() => { playClickSound(effectsVol); setScreen("settings"); }} style={btnOutline({ padding: "12px 50px" })}>{t.settings}</button>
            <button onClick={() => { playClickSound(effectsVol); setScreen("friends"); }} style={btnOutline({ padding: "12px 50px" })}>{t.friends}</button>
            <button onClick={() => { playClickSound(effectsVol); setScreen("rules"); }} style={btnOutline({ padding: "12px 50px" })}>{t.rules}</button>
          </div>

          <div style={{ marginTop: 40, display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => setLang("ru")} style={{ background: lang === "ru" ? S.gold : "transparent", color: lang === "ru" ? S.bg : S.textDim, border: `1px solid ${S.gold}44`, padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontFamily: S.font, fontSize: 13 }}>RU</button>
            <button onClick={() => setLang("en")} style={{ background: lang === "en" ? S.gold : "transparent", color: lang === "en" ? S.bg : S.textDim, border: `1px solid ${S.gold}44`, padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontFamily: S.font, fontSize: 13 }}>EN</button>
          </div>

          <div style={{ marginTop: 30, fontSize: 11, color: S.textDim }}>{t.version}</div>
        </div>
      </div>
    );
  }

  // ========== SETTINGS SCREEN ==========
  if (screen === "settings") {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: S.font, padding: 20 }}>
        <div style={{ maxWidth: 500, margin: "0 auto" }}>
          <button onClick={() => setScreen("menu")} style={btnOutline({ marginBottom: 20 })}>← {t.back}</button>
          <h2 style={{ color: S.gold, fontFamily: S.font }}>{t.settings}</h2>
          <div style={card({ marginBottom: 16 })}>
            <label style={{ color: S.textDim, fontSize: 13 }}>{t.soundMusic}</label>
            <input type="range" min="0" max="1" step="0.1" value={musicVol} onChange={(e) => setMusicVol(+e.target.value)} style={{ width: "100%", accentColor: S.gold }} />
          </div>
          <div style={card({ marginBottom: 16 })}>
            <label style={{ color: S.textDim, fontSize: 13 }}>{t.soundEffects}</label>
            <input type="range" min="0" max="1" step="0.1" value={effectsVol} onChange={(e) => setEffectsVol(+e.target.value)} style={{ width: "100%", accentColor: S.gold }} />
          </div>
          <div style={card({ marginBottom: 16 })}>
            <label style={{ color: S.textDim, fontSize: 13 }}>{t.language}</label>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {["ru", "en"].map((l) => (
                <button key={l} onClick={() => setLang(l)} style={{ background: lang === l ? S.gold : "transparent", color: lang === l ? S.bg : S.text, border: `1px solid ${S.gold}`, padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontFamily: S.font }}>{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== FRIENDS SCREEN ==========
  if (screen === "friends") {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: S.font, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ fontSize: 60, marginBottom: 20 }}>🏰</div>
        <h2 style={{ color: S.gold }}>{t.comingSoon}</h2>
        <p style={{ color: S.textDim, textAlign: "center", maxWidth: 300 }}>{t.friendsDesc}</p>
        <button onClick={() => setScreen("menu")} style={btnOutline({ marginTop: 20 })}>← {t.back}</button>
      </div>
    );
  }

  // ========== RULES SCREEN ==========
  if (screen === "rules") {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: S.font, padding: 20 }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <button onClick={() => setScreen("menu")} style={btnOutline({ marginBottom: 20 })}>← {t.back}</button>
          <h2 style={{ color: S.gold, fontFamily: S.font }}>{t.rulesTitle}</h2>
          <div style={card()}>
            <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 14, color: S.text, fontFamily: S.font }}>{t.rulesText}</pre>
          </div>
        </div>
      </div>
    );
  }

  // ========== SETUP SCREEN ==========
  if (screen === "setup") {
    const updatePlayer = (idx, key, val) => {
      setConfig((c) => {
        const nc = { ...c, players: [...c.players] };
        nc.players[idx] = { ...nc.players[idx], [key]: val };
        return nc;
      });
    };
    const addPlayer = () => {
      if (config.players.length < 4) {
        setConfig((c) => ({
          ...c,
          players: [...c.players, { name: AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)], isAI: true, aiPersonality: "random" }],
        }));
      }
    };
    const removePlayer = (idx) => {
      if (config.players.length > 2) {
        setConfig((c) => ({ ...c, players: c.players.filter((_, i) => i !== idx) }));
      }
    };

    return (
      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: S.font, padding: 20 }}>
        <div style={{ maxWidth: 550, margin: "0 auto" }}>
          <button onClick={() => setScreen("menu")} style={btnOutline({ marginBottom: 20 })}>← {t.back}</button>
          <h2 style={{ color: S.gold, fontFamily: S.font }}>⚔️ {lang === "ru" ? "Настройка партии" : "Game Setup"}</h2>

          <div style={card({ marginBottom: 12 })}>
            <label style={{ color: S.textDim, fontSize: 13 }}>{t.mode}</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {["classic", "quick"].map((m) => (
                <button key={m} onClick={() => setConfig((c) => ({ ...c, mode: m }))} style={{ background: config.mode === m ? S.gold : "transparent", color: config.mode === m ? S.bg : S.text, border: `1px solid ${S.gold}`, padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontFamily: S.font }}>
                  {m === "classic" ? t.classic : t.quick} ({m === "classic" ? 40 : 24})
                </button>
              ))}
            </div>
          </div>

          <div style={card({ marginBottom: 12 })}>
            <label style={{ color: S.textDim, fontSize: 13 }}>{t.startMoney}</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {[1000, 1500, 2000].map((m) => (
                <button key={m} onClick={() => setConfig((c) => ({ ...c, startMoney: m }))} style={{ background: config.startMoney === m ? S.gold : "transparent", color: config.startMoney === m ? S.bg : S.text, border: `1px solid ${S.gold}`, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontFamily: S.font }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div style={card({ marginBottom: 12 })}>
            <label style={{ color: S.textDim, fontSize: 13 }}>{t.winCondition}</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={() => setConfig((c) => ({ ...c, winCondition: "last" }))} style={{ background: config.winCondition === "last" ? S.gold : "transparent", color: config.winCondition === "last" ? S.bg : S.text, border: `1px solid ${S.gold}`, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontFamily: S.font }}>{t.lastStanding}</button>
              <button onClick={() => setConfig((c) => ({ ...c, winCondition: "rounds" }))} style={{ background: config.winCondition === "rounds" ? S.gold : "transparent", color: config.winCondition === "rounds" ? S.bg : S.text, border: `1px solid ${S.gold}`, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontFamily: S.font }}>{t.byRounds}</button>
            </div>
            {config.winCondition === "rounds" && (
              <div style={{ marginTop: 8 }}>
                <label style={{ color: S.textDim, fontSize: 12 }}>{t.rounds}: {config.maxRounds}</label>
                <input type="range" min="10" max="50" value={config.maxRounds} onChange={(e) => setConfig((c) => ({ ...c, maxRounds: +e.target.value }))} style={{ width: "100%", accentColor: S.gold }} />
              </div>
            )}
          </div>

          <div style={card({ marginBottom: 12 })}>
            <label style={{ color: S.textDim, fontSize: 13 }}>{t.roundBonus}</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {[200, 400].map((b) => (
                <button key={b} onClick={() => setConfig((c) => ({ ...c, roundBonus: b }))} style={{ background: config.roundBonus === b ? S.gold : "transparent", color: config.roundBonus === b ? S.bg : S.text, border: `1px solid ${S.gold}`, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontFamily: S.font }}>
                  {b} ({b === 200 ? t.standard : t.doubled})
                </button>
              ))}
            </div>
          </div>

          <div style={card({ marginBottom: 12 })}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <label style={{ color: S.textDim, fontSize: 13 }}>{lang === "ru" ? "Игроки" : "Players"}</label>
              {config.players.length < 4 && (
                <button onClick={addPlayer} style={btnOutline({ padding: "4px 12px", fontSize: 12 })}>+ {lang === "ru" ? "Добавить" : "Add"}</button>
              )}
            </div>
            {config.players.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 20 }}>{TOKENS[i]?.emoji}</span>
                <input value={p.name} onChange={(e) => updatePlayer(i, "name", e.target.value)} style={{ background: S.bg2, color: S.text, border: `1px solid ${S.border}`, padding: "6px 10px", borderRadius: 6, width: 120, fontFamily: S.font, fontSize: 13 }} />
                <button onClick={() => updatePlayer(i, "isAI", !p.isAI)} style={{ background: p.isAI ? "#8B000044" : "#22882244", color: p.isAI ? "#ff6b6b" : "#50c878", border: "1px solid", padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: S.font }}>
                  {p.isAI ? t.ai : t.human}
                </button>
                {p.isAI && (
                  <select value={p.aiPersonality || "random"} onChange={(e) => updatePlayer(i, "aiPersonality", e.target.value)} style={{ background: S.bg2, color: S.text, border: `1px solid ${S.border}`, padding: "4px 8px", borderRadius: 6, fontSize: 12, fontFamily: S.font }}>
                    <option value="aggressive">{t.aggressive}</option>
                    <option value="cautious">{t.cautious}</option>
                    <option value="trader">{t.trader}</option>
                    <option value="random">{t.random}</option>
                  </select>
                )}
                {config.players.length > 2 && (
                  <button onClick={() => removePlayer(i)} style={{ background: "transparent", color: "#ff6b6b", border: "none", cursor: "pointer", fontSize: 16 }}>✕</button>
                )}
              </div>
            ))}
          </div>

          <button onClick={startGame} style={btn({ width: "100%", padding: "16px", fontSize: 18, marginTop: 8 })}>⚔️ {t.start}</button>
        </div>
      </div>
    );
  }

  // ========== GAME SCREEN ==========
  if (screen === "game" && game) {
    const cp = game.players[game.currentPlayer];
    const cells = game.cells;
    const isMyTurn = !cp.isAI;

    // VICTORY SCREEN
    if (game.phase === "gameover" && game.winner !== null) {
      const winner = game.players[game.winner];
      return (
        <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse at center, #1a1a0e 0%, ${S.bg} 70%)`, color: S.text, fontFamily: S.font, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 90, marginBottom: 10, animation: "pulse 2s infinite" }}>👑</div>
          <h1 style={{ color: S.gold, fontSize: 40, textShadow: "0 0 40px rgba(201,168,76,0.5)", letterSpacing: 3 }}>{t.coronation}</h1>
          <div style={{ fontSize: 30, marginBottom: 20 }}>{winner.token.emoji} {winner.name}</div>
          <div style={card({ maxWidth: 400, width: "100%" })}>
            <h3 style={{ color: S.gold, marginTop: 0 }}>{t.stats}</h3>
            {game.players.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${S.border}`, opacity: p.bankrupt ? 0.4 : 1 }}>
                <span>{p.token.emoji} {p.name}</span>
                <span style={{ color: S.gold }}>{calcWealthStatic(game, p)} {t.gold}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, fontSize: 13, color: S.textDim }}>
              {t.roundsPlayed}: {game.roundCount}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button onClick={() => { setGame(null); setScreen("menu"); }} style={btn()}>{t.toMenu}</button>
            <button onClick={startGame} style={btnOutline()}>{t.newGame}</button>
          </div>
        </div>
      );
    }

    // PAUSE OVERLAY
    if (game.paused) {
      return (
        <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: S.font, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <h2 style={{ color: S.gold }}>⏸ {t.pause}</h2>
          <button onClick={() => updateGame((g) => { g.paused = false; })} style={btn()}>{t.resume}</button>
          <button onClick={() => { setGame(null); setScreen("menu"); }} style={btnOutline()}>{t.quit}</button>
        </div>
      );
    }

    return (
      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: S.font, display: "flex", flexDirection: "column" }}>
        {/* TOP BAR */}
        <div style={{ background: S.bg2, borderBottom: `1px solid ${S.border}`, padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, fontFamily: S.font }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: S.gold, fontFamily: S.font, fontWeight: "bold", letterSpacing: 2 }}>⚔️ KIRSHAS MONOPOLIA</span>
            <span style={{ color: S.textDim, fontSize: 12, letterSpacing: 1 }}>R{game.roundCount}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setChatOpen(!chatOpen)} style={{ background: chatOpen ? S.gold + "33" : "transparent", color: S.gold, border: `1px solid ${S.gold}44`, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: S.font }}>💬</button>
            <button onClick={() => setPanelOpen(!panelOpen)} style={{ background: panelOpen ? S.gold + "33" : "transparent", color: S.gold, border: `1px solid ${S.gold}44`, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: S.font }}>☰</button>
            <button onClick={() => updateGame((g) => { g.paused = true; })} style={{ background: "transparent", color: S.gold, border: `1px solid ${S.gold}44`, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: S.font }}>⏸</button>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
          {/* LEFT - BOARD */}
          <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
            <div style={{ position: "relative", width: BOARD_SIZE, height: BOARD_SIZE, background: S.bg3, border: `2px solid ${S.gold}44`, borderRadius: 10, flexShrink: 0 }}>
              {/* Center logo */}
              <div style={{ position: "absolute", left: CORNER + 20, top: CORNER + 20, right: CORNER + 20, bottom: CORNER + 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `1px solid ${S.gold}22`, borderRadius: 10, background: "rgba(10,10,18,0.85)" }}>
                <div style={{ fontSize: 48 }}>⚔️</div>
                <div style={{ color: S.gold, fontFamily: S.font, fontSize: 20, fontWeight: "bold", letterSpacing: 3 }}>KIRSHAS</div>
                <div style={{ color: S.gold, fontFamily: S.font, fontSize: 13, letterSpacing: 5 }}>MONOPOLIA</div>
                {(game.dice[0] > 0 || diceAnim) && (
                  <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
                    {[0, 1].map((i) => (
                      <div key={i} style={{
                        width: 54, height: 54, background: "#1a1a1a", border: `2px solid ${S.gold}`, borderRadius: 10,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: "bold", color: S.gold,
                        fontFamily: S.font, animation: diceAnim ? "shake 0.1s infinite" : "none",
                      }}>
                        {diceAnim ? "?" : game.dice[i]}
                      </div>
                    ))}
                  </div>
                )}
                {game.message && (
                  <div style={{ marginTop: 16, color: S.text, fontSize: 13, textAlign: "center", maxWidth: 280, lineHeight: 1.5, fontFamily: S.font }}>{game.message}</div>
                )}
              </div>

              {/* CELLS */}
              {cells.map((cell, idx) => {
                const pos = getCellPos(idx);
                const isCorner = [0, 10, 20, 30].includes(idx);
                const owner = getPropertyOwner(idx);
                const house = cell.house ? HOUSES[cell.house] : null;
                const playersHere = game.players.filter((p) => !p.bankrupt && p.position === idx);

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedCell(idx)}
                    style={{
                      position: "absolute",
                      left: pos.x, top: pos.y, width: pos.w, height: pos.h,
                      border: `1px solid ${S.gold}22`,
                      background: selectedCell === idx ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.02)",
                      cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      fontSize: isCorner ? 10 : 8,
                      color: S.text,
                      overflow: "hidden",
                      padding: 3,
                      fontFamily: S.font,
                      transition: "background 0.2s",
                    }}
                  >
                    {house && (
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: isCorner ? 10 : 7, background: house.color }} />
                    )}
                    {owner && (
                      <div style={{ position: "absolute", bottom: 2, right: 2, width: 8, height: 8, borderRadius: "50%", background: owner.color, border: "1px solid rgba(0,0,0,0.3)" }} />
                    )}
                    {cell.icon ? (
                      <div style={{ fontSize: isCorner ? 20 : 14 }}>{cell.icon}</div>
                    ) : null}
                    <div style={{ textAlign: "center", lineHeight: 1.15, marginTop: house ? 5 : 0, fontWeight: isCorner ? "bold" : "normal", letterSpacing: 0.3 }}>
                      {cell.name?.length > 14 ? cell.name.slice(0, 12) + "…" : cell.name}
                    </div>
                    {cell.price && <div style={{ fontSize: 8, color: S.gold, fontWeight: "bold" }}>{cell.price}</div>}
                    {cell._buildings > 0 && (
                      <div style={{ fontSize: 8, color: cell._buildings >= 5 ? "#ff4444" : "#50c878" }}>
                        {cell._buildings >= 5 ? "🏰" : "🔷".repeat(cell._buildings)}
                      </div>
                    )}
                    {cell._mortgaged && <div style={{ fontSize: 7, color: "#ff6b6b", fontWeight: "bold" }}>M</div>}
                    {playersHere.length > 0 && (
                      <div style={{ position: "absolute", bottom: 2, left: 2, display: "flex", gap: 1 }}>
                        {playersHere.map((p) => (
                          <span key={p.id} style={{ fontSize: 12 }}>{p.token.emoji}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {animPos && (
                <div style={{
                  position: "absolute",
                  left: animPos.x - 16, top: animPos.y - 16,
                  width: 32, height: 32,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26, zIndex: 10,
                  transition: "left 0.05s, top 0.05s",
                  filter: "drop-shadow(0 0 10px rgba(201,168,76,0.8))",
                }}>
                  {cp.token.emoji}
                </div>
              )}
            </div>
          </div>

          {!panelOpen && (
            <button onClick={() => setPanelOpen(true)} style={{ position: "absolute", right: 10, top: 10, zIndex: 15, background: S.bg2, color: S.gold, border: `1px solid ${S.gold}44`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: S.font, fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>☰ {lang === "ru" ? "Панель" : "Panel"}</button>
          )}

          {/* RIGHT PANEL */}
          <div style={{ width: panelOpen ? 300 : 0, background: S.bg2, borderLeft: panelOpen ? `1px solid ${S.border}` : "none", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0, transition: "width 0.3s ease" }}>
            <div style={{ padding: 10, borderBottom: `1px solid ${S.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: S.textDim, fontFamily: S.font, letterSpacing: 1 }}>{lang === "ru" ? "ИГРОКИ" : "PLAYERS"}</span>
                <button onClick={() => setPanelOpen(false)} style={{ background: "transparent", color: S.textDim, border: "none", cursor: "pointer", fontSize: 16, padding: "2px 6px" }}>✕</button>
              </div>
              {game.players.map((p) => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, marginBottom: 4,
                  background: p.id === game.currentPlayer ? `${p.color}22` : "transparent",
                  border: p.id === game.currentPlayer ? `1px solid ${p.color}44` : "1px solid transparent",
                  opacity: p.bankrupt ? 0.3 : 1,
                  fontFamily: S.font,
                }}>
                  <span style={{ fontSize: 22 }}>{p.token.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: p.id === game.currentPlayer ? "bold" : "normal", color: p.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: 0.5 }}>
                      {p.name} {p.isAI ? "🤖" : ""} {p.inJail ? "🧊" : ""}
                    </div>
                    <div style={{ fontSize: 12, color: S.gold, letterSpacing: 1 }}>{p.money} {t.gold}</div>
                  </div>
                </div>
              ))}
            </div>

            {selectedCell !== null && cells[selectedCell] && (
              <div style={{ padding: 12, borderBottom: `1px solid ${S.border}`, maxHeight: 220, overflow: "auto" }}>
                {(() => {
                  const cell = cells[selectedCell];
                  const owner = getPropertyOwner(selectedCell);
                  const house = cell.house ? HOUSES[cell.house] : null;
                  return (
                    <div style={{ fontFamily: S.font }}>
                      {house && <div style={{ height: 5, background: house.color, borderRadius: 2, marginBottom: 8 }} />}
                      <div style={{ fontSize: 15, fontWeight: "bold", letterSpacing: 0.5 }}>{cell.name}</div>
                      {cell.price && <div style={{ fontSize: 13, color: S.gold }}>{t.price}: {cell.price} {t.gold}</div>}
                      {cell.rent && (
                        <div style={{ fontSize: 12, color: S.textDim, marginTop: 6 }}>
                          {cell.rent.map((r, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
                              <span>{i === 0 ? t.rent : i < 5 ? `${i} ${t.tower}` : t.castle}</span>
                              <span style={{ color: S.gold }}>{r}</span>
                            </div>
                          ))}
                          {cell.buildCost && <div style={{ marginTop: 6 }}>{t.tower}: {cell.buildCost} {t.gold}</div>}
                        </div>
                      )}
                      {owner && <div style={{ fontSize: 12, marginTop: 6 }}>{t.owner}: <span style={{ color: owner.color }}>{owner.name}</span></div>}
                      {cell._mortgaged && <div style={{ fontSize: 12, color: "#ff6b6b" }}>{t.mortgaged}</div>}
                      <button onClick={() => setSelectedCell(null)} style={{ fontSize: 12, color: S.textDim, background: "none", border: "none", cursor: "pointer", marginTop: 6, fontFamily: S.font }}>✕ {lang === "ru" ? "Закрыть" : "Close"}</button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Actions */}
            <div style={{ flex: 1, padding: 10, overflow: "auto" }}>
              {game.cardDrawn && game.phase === "card" && (
                <div style={card({ marginBottom: 10, background: "#1a1a0e", border: `1px solid ${S.gold}` })}>
                  <div style={{ fontSize: 13, lineHeight: 1.4 }}>{game.cardDrawn.text}</div>
                  {isMyTurn && <button onClick={endTurn} style={btn({ marginTop: 8, width: "100%", fontSize: 13, padding: "8px" })}>{t.endTurn}</button>}
                </div>
              )}

              {game.phase === "roll" && cp.inJail && isMyTurn && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                  <button onClick={doRoll} style={btn({ fontSize: 13, padding: "8px" })}>{t.tryDouble}</button>
                  {cp.money >= 50 && <button onClick={payJail} style={btnOutline({ fontSize: 12 })}>{t.payJail}</button>}
                  {cp.freedomCards > 0 && <button onClick={useFreedomCard} style={btnOutline({ fontSize: 12 })}>{t.useCard}</button>}
                </div>
              )}

              {game.phase === "roll" && !cp.inJail && isMyTurn && (
                <button onClick={doRoll} disabled={animating || diceAnim} style={btn({ width: "100%", fontSize: 16, padding: "12px", opacity: animating || diceAnim ? 0.5 : 1 })}>🎲 {t.rollDice}</button>
              )}

              {game.phase === "buy" && isMyTurn && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button onClick={doBuy} style={btn({ fontSize: 14, padding: "10px" })}>💰 {t.buy} ({cells[cp.position].price} {t.gold})</button>
                  <button onClick={startAuction} style={btnOutline({ fontSize: 13 })}>{t.auction}</button>
                </div>
              )}

              {game.phase === "auction" && game.auctionState && (
                <div style={card({ marginBottom: 10 })}>
                  <div style={{ fontSize: 13, fontWeight: "bold", color: S.gold }}>{t.auctionFor}: {cells[game.auctionState.cellId].name}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>{t.currentBid}: {game.auctionState.highBid} {t.gold}</div>
                  {game.auctionState.highBidder !== null && (
                    <div style={{ fontSize: 12 }}>{t.highBidder}: {game.players[game.auctionState.highBidder].name}</div>
                  )}
                  {game.auctionState.bidOrder[game.auctionState.currentBidder] === game.currentPlayer && isMyTurn && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      <input type="number" value={auctionBid} onChange={(e) => setAuctionBid(+e.target.value)} style={{ width: 80, background: S.bg, color: S.text, border: `1px solid ${S.border}`, borderRadius: 6, padding: "6px 8px", fontFamily: S.font }} />
                      <button onClick={() => doAuctionBid(auctionBid)} style={btn({ fontSize: 12, padding: "6px 14px" })}>{t.bid}</button>
                      <button onClick={() => doAuctionBid(0)} style={btnOutline({ fontSize: 12, padding: "6px 14px" })}>{t.pass}</button>
                    </div>
                  )}
                </div>
              )}

              {game.phase === "bankruptVote" && game.bankruptVote && (
                <div style={card({ marginBottom: 10, border: `1px solid #ff6b6b` })}>
                  <div style={{ fontSize: 13, fontWeight: "bold", color: "#ff6b6b" }}>
                    {game.players[game.bankruptVote.playerId].name} {t.helpVote}
                  </div>
                  <div style={{ fontSize: 12 }}>{t.amount}: {game.bankruptVote.needed} {t.gold}</div>
                  {game.players.filter((p) => !p.bankrupt && p.id !== game.bankruptVote.playerId).map((p) => (
                    <div key={p.id} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6 }}>
                      <span style={{ fontSize: 12, color: p.color }}>{p.name}</span>
                      {!p.isAI && (
                        <>
                          <input type="number" value={lendAmount} onChange={(e) => setLendAmount(+e.target.value)} style={{ width: 60, background: S.bg, color: S.text, border: `1px solid ${S.border}`, borderRadius: 4, padding: "4px", fontSize: 12 }} />
                          <button onClick={() => doLend(p.id, lendAmount)} style={btnOutline({ fontSize: 11, padding: "4px 8px" })}>{t.lend}</button>
                        </>
                      )}
                    </div>
                  ))}
                  <button onClick={skipBankruptVote} style={{ ...btnOutline({ fontSize: 11, marginTop: 8 }), color: "#ff6b6b", borderColor: "#ff6b6b" }}>{t.bankrupt}</button>
                </div>
              )}

              {(game.phase === "endturn") && isMyTurn && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {cp.properties.filter((pid) => {
                    const c = cells[pid];
                    if (!c.house || !c.buildCost) return false;
                    const houseProps = cells.filter((x) => x.house === c.house).map((x) => x.id);
                    return houseProps.every((id) => cp.properties.includes(id)) && (c._buildings || 0) < 5 && cp.money >= c.buildCost;
                  }).map((pid) => (
                    <button key={pid} onClick={() => doBuild(pid)} style={btnOutline({ fontSize: 11 })}>
                      🔨 {cells[pid].name} ({cells[pid].buildCost} {t.gold})
                    </button>
                  ))}

                  {cp.properties.filter((pid) => !cells[pid]._mortgaged && !(cells[pid]._buildings > 0)).map((pid) => (
                    <button key={`m${pid}`} onClick={() => doMortgage(pid)} style={{ ...btnOutline({ fontSize: 10, padding: "4px 8px" }), color: "#ff6b6b", borderColor: "#ff6b6b44" }}>
                      {t.mortgage}: {cells[pid].name} (+{Math.floor(cells[pid].price / 2)})
                    </button>
                  ))}
                  {cp.properties.filter((pid) => cells[pid]._mortgaged && cp.money >= Math.floor(cells[pid].price / 2 * 1.1)).map((pid) => (
                    <button key={`r${pid}`} onClick={() => doRedeem(pid)} style={{ ...btnOutline({ fontSize: 10, padding: "4px 8px" }), color: "#50c878", borderColor: "#50c87844" }}>
                      {t.redeem}: {cells[pid].name} (-{Math.floor(cells[pid].price / 2 * 1.1)})
                    </button>
                  ))}

                  <button onClick={endTurn} style={btn({ width: "100%", fontSize: 14, padding: "10px", marginTop: 4 })}>→ {t.endTurn}</button>
                </div>
              )}

              {cp.isAI && game.phase !== "gameover" && (
                <div style={{ textAlign: "center", padding: 20, color: S.textDim }}>
                  <div style={{ fontSize: 24 }}>{cp.token.emoji}</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>{cp.name} {lang === "ru" ? "думает..." : "thinking..."}</div>
                </div>
              )}
            </div>
          </div>

          {/* CHAT POPUP */}
          {chatOpen && (
            <div style={{ position: "absolute", bottom: 10, right: panelOpen ? 310 : 10, width: 280, maxHeight: 380, background: S.bg2, border: `1px solid ${S.gold}44`, borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", fontFamily: S.font }}>
              <div style={{ padding: "8px 12px", background: S.bg3, borderBottom: `1px solid ${S.border}`, fontSize: 13, fontWeight: "bold", color: S.gold, display: "flex", justifyContent: "space-between" }}>
                <span>💬 {t.chat}</span>
                <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", color: S.textDim, cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ flex: 1, overflow: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {chatMessages.length === 0 && <div style={{ color: S.textDim, fontSize: 12, textAlign: "center", padding: 20 }}>{lang === "ru" ? "Нет сообщений" : "No messages"}</div>}
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ fontSize: 12 }}>
                    <span style={{ color: S.gold, fontWeight: "bold" }}>{m.from}</span>
                    <span style={{ color: S.textDim }}> {m.time}</span>
                    <div style={{ color: S.text }}>{m.text}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", padding: 6, gap: 4, borderTop: `1px solid ${S.border}` }}>
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder={lang === "ru" ? "Сообщение..." : "Message..."}
                  style={{ flex: 1, background: S.bg, color: S.text, border: `1px solid ${S.border}`, borderRadius: 6, padding: "6px 8px", fontSize: 12, fontFamily: S.font }}
                />
                <button onClick={sendChat} style={{ background: S.gold, color: S.bg, border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>→</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
