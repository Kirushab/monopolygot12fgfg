import { useState, useEffect, useCallback, useRef } from 'react';
import { T, HOUSES, TOKENS, AI_NAMES, BOARD_SIZE, CORNER } from '../gameData';
import { S, btn, btnOutline } from '../theme';
import { startAudio, playDiceSound, playMoveSound, playBuySound, playClickSound } from '../sounds';
import {
  deepClone, shuffle, rollDie,
  getCellCenter,
  createInitialState, calcWealthStatic, handleLanding
} from '../gameEngine';
import useMultiplayer from '../hooks/useMultiplayer';

import MainMenu from './MainMenu';
import Settings from './Settings';
import Rules from './Rules';
import Lobby from './Lobby';
import GameSetup from './GameSetup';
import Board from './Board';
import PlayerPanel from './PlayerPanel';
import PropertyCard from './PropertyCard';
import ActionPanel from './ActionPanel';
import BankruptVote from './BankruptVote';
import Chat from './Chat';
import VictoryScreen from './VictoryScreen';

export default function Game() {
  const [lang, setLang] = useState("ru");
  const [screen, setScreen] = useState("menu");
  const [musicVol, setMusicVol] = useState(0.5);
  const [effectsVol, setEffectsVol] = useState(0.7);
  const [game, setGame] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
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
  const [auctionBid, setAuctionBid] = useState(10);
  const [lendAmount, setLendAmount] = useState(0);

  const t = T[lang];
  const aiTimerRef = useRef(null);

  // Multiplayer hook
  const mp = useMultiplayer();

  // Sync online game state from server
  useEffect(() => {
    if (mp.onlineGame && isOnline) {
      setGame(mp.onlineGame);
      if (screen !== "game") setScreen("game");
    }
  }, [mp.onlineGame, isOnline]);

  // Sync online chat
  useEffect(() => {
    if (isOnline && mp.chatMessages.length > 0) {
      setChatMessages(mp.chatMessages);
    }
  }, [mp.chatMessages, isOnline]);

  // --- GAME STATE UPDATER (local only) ---
  const updateGame = useCallback((updater) => {
    if (isOnline) return; // Online mode: server is authoritative
    setGame((prev) => {
      if (!prev) return prev;
      const next = deepClone(prev);
      updater(next);
      return next;
    });
  }, [isOnline]);

  const getPropertyOwner = useCallback((cellId) => {
    if (!game) return null;
    for (const p of game.players) {
      if (p.properties.includes(cellId)) return p;
    }
    return null;
  }, [game]);

  // ========== LOCAL MODE ACTIONS ==========

  const doRoll = useCallback(() => {
    if (isOnline) { mp.rollDice(); return; }
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
          return;
        }
        if (isDouble) {
          g.doublesCount++;
          if (g.doublesCount >= 3) {
            cp.position = 10; cp.inJail = true; g.doublesCount = 0;
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
  }, [isOnline, mp, game, animating, diceAnim, effectsVol, updateGame, t, lang]);

  // Movement animation + landing (local only)
  useEffect(() => {
    if (isOnline || !game || game.phase !== "moving" || animating) return;
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
          if (passedStart && dest !== 0) { p.money += g.config.roundBonus; p.rounds++; }
          p.position = dest;
          handleLanding(g, lang, t);
        });
      }
    }, 50);
  }, [game?.phase]);

  const doBuy = useCallback(() => {
    if (isOnline) { mp.buyProperty(); return; }
    if (!game) return;
    playBuySound(effectsVol);
    updateGame((g) => {
      const cp = g.players[g.currentPlayer];
      const cell = g.cells[cp.position];
      cp.money -= cell.price; cp.properties.push(cell.id);
      g.message = `${cp.name} ${t.buysProperty} ${cell.name}`;
      g.phase = "endturn";
    });
  }, [isOnline, mp, game, effectsVol, updateGame, t]);

  const startAuction = useCallback(() => {
    if (isOnline) { mp.startAuction(); return; }
    if (!game) return;
    updateGame((g) => {
      const cell = g.cells[g.players[g.currentPlayer].position];
      const active = g.players.filter((p) => !p.bankrupt).map((p) => p.id);
      g.auctionState = { cellId: cell.id, bids: {}, currentBidder: 0, bidOrder: active, highBid: 0, highBidder: null, passed: {} };
      g.phase = "auction";
    });
  }, [isOnline, mp, game, updateGame]);

  const doAuctionBid = useCallback((amount) => {
    if (isOnline) { mp.auctionBid(amount); return; }
    if (!game || !game.auctionState) return;
    playClickSound(effectsVol);
    updateGame((g) => {
      const a = g.auctionState;
      const bidderId = a.bidOrder[a.currentBidder];
      if (amount > 0 && amount > a.highBid && g.players[bidderId].money >= amount) {
        a.highBid = amount; a.highBidder = bidderId;
      } else { a.passed[bidderId] = true; }
      let next = (a.currentBidder + 1) % a.bidOrder.length;
      let safety = 0;
      while (a.passed[a.bidOrder[next]] && safety < a.bidOrder.length) { next = (next + 1) % a.bidOrder.length; safety++; }
      const alive = a.bidOrder.filter((id) => !a.passed[id]);
      if (alive.length <= 1 && a.highBidder !== null) {
        const w = g.players[a.highBidder];
        w.money -= a.highBid; w.properties.push(a.cellId);
        g.message = `${w.name} ${t.buysProperty} ${g.cells[a.cellId].name} (${a.highBid} ${t.gold})`;
        g.auctionState = null; g.phase = "endturn";
      } else if (alive.length === 0) {
        g.message = lang === "ru" ? "Никто не купил" : "Nobody bought";
        g.auctionState = null; g.phase = "endturn";
      } else { a.currentBidder = next; }
    });
  }, [isOnline, mp, game, effectsVol, updateGame, t, lang]);

  const payJail = useCallback(() => {
    if (isOnline) { mp.payJail(); return; }
    updateGame((g) => {
      const cp = g.players[g.currentPlayer];
      cp.money -= 50; cp.inJail = false; cp.jailTurns = 0; g.phase = "roll";
      g.message = `${cp.name} ${lang === "ru" ? "заплатил 50 драконов" : "paid 50 dragons"}`;
    });
  }, [isOnline, mp, updateGame, lang]);

  const useFreedomCard = useCallback(() => {
    if (isOnline) { mp.useCard(); return; }
    updateGame((g) => {
      const cp = g.players[g.currentPlayer];
      cp.freedomCards--; cp.inJail = false; cp.jailTurns = 0; g.phase = "roll";
      g.message = `${cp.name} ${lang === "ru" ? "использовал карту свободы" : "used freedom card"}`;
    });
  }, [isOnline, mp, updateGame, lang]);

  const doBuild = useCallback((cellId) => {
    if (isOnline) { mp.build(cellId); return; }
    playBuySound(effectsVol);
    updateGame((g) => {
      const cp = g.players[g.currentPlayer];
      const cell = g.cells[cellId];
      if (!cell.buildCost) return;
      const b = cell._buildings || 0;
      if (b >= 5 || cp.money < cell.buildCost) return;
      cp.money -= cell.buildCost; cell._buildings = b + 1;
    });
  }, [isOnline, mp, effectsVol, updateGame]);

  const doMortgage = useCallback((cellId) => {
    if (isOnline) { mp.mortgage(cellId); return; }
    updateGame((g) => {
      const cell = g.cells[cellId];
      const cp = g.players[g.currentPlayer];
      if (!cell._mortgaged && cp.properties.includes(cellId)) {
        cell._mortgaged = true; cp.money += Math.floor(cell.price / 2);
      }
    });
  }, [isOnline, mp, updateGame]);

  const doRedeem = useCallback((cellId) => {
    if (isOnline) { mp.redeem(cellId); return; }
    updateGame((g) => {
      const cell = g.cells[cellId];
      const cp = g.players[g.currentPlayer];
      const cost = Math.floor(cell.price / 2 * 1.1);
      if (cell._mortgaged && cp.properties.includes(cellId) && cp.money >= cost) {
        cell._mortgaged = false; cp.money -= cost;
      }
    });
  }, [isOnline, mp, updateGame]);

  const endTurn = useCallback(() => {
    if (isOnline) { mp.endTurn(); return; }
    if (!game) return;
    updateGame((g) => {
      g.cardDrawn = null;
      const cp = g.players[g.currentPlayer];
      if (cp.money < 0) {
        cp.bankrupt = true;
        cp.properties.forEach((pid) => { g.cells[pid]._buildings = 0; g.cells[pid]._mortgaged = false; });
        cp.properties = [];
      }
      const active = g.players.filter((p) => !p.bankrupt);
      if (active.length <= 1) { g.winner = active[0]?.id ?? null; g.phase = "gameover"; return; }
      if (g.config.winCondition === "rounds" && g.roundCount >= g.config.maxRounds) {
        let richest = active[0];
        for (const p of active) { if (calcWealthStatic(g, p) > calcWealthStatic(g, richest)) richest = p; }
        g.winner = richest.id; g.phase = "gameover"; return;
      }
      if (g.doublesCount > 0 && !cp.inJail && !cp.bankrupt) { g.phase = "roll"; return; }
      g.doublesCount = 0;
      let next = (g.currentPlayer + 1) % g.players.length;
      while (g.players[next].bankrupt) next = (next + 1) % g.players.length;
      if (next <= g.currentPlayer) g.roundCount++;
      g.currentPlayer = next; g.phase = "roll";
    });
  }, [isOnline, mp, game, updateGame]);

  // --- BANKRUPT VOTE (local only) ---
  useEffect(() => {
    if (isOnline || !game || game.phase !== "bankruptCheck") return;
    const cp = game.players[game.currentPlayer];
    if (cp.money < 0) {
      updateGame((g) => {
        g.bankruptVote = { playerId: g.currentPlayer, needed: Math.abs(cp.money), lenders: {} };
        g.phase = "bankruptVote";
      });
    }
  }, [game?.phase, isOnline]);

  const doLend = useCallback((lenderId, amount) => {
    if (isOnline) { mp.lendMoney(amount); return; }
    updateGame((g) => {
      if (!g.bankruptVote) return;
      const lender = g.players[lenderId];
      if (lender.money >= amount && amount > 0) {
        lender.money -= amount;
        g.players[g.bankruptVote.playerId].money += amount;
        g.bankruptVote.lenders[lenderId] = (g.bankruptVote.lenders[lenderId] || 0) + amount;
        if (g.players[g.bankruptVote.playerId].money >= 0) { g.bankruptVote = null; g.phase = "endturn"; }
      }
    });
  }, [isOnline, mp, updateGame]);

  const skipBankruptVote = useCallback(() => {
    if (isOnline) { mp.skipBankrupt(); return; }
    updateGame((g) => {
      g.players[g.currentPlayer].bankrupt = true;
      g.players[g.currentPlayer].properties.forEach((pid) => { g.cells[pid]._buildings = 0; g.cells[pid]._mortgaged = false; });
      g.players[g.currentPlayer].properties = [];
      g.bankruptVote = null; g.phase = "endturn";
    });
  }, [isOnline, mp, updateGame]);

  const acceptTrade = useCallback(() => {
    if (isOnline) { mp.acceptTrade(); return; }
    updateGame((g) => {
      if (!g.tradeState) return;
      const { from, to, offer, request } = g.tradeState;
      const pFrom = g.players[from], pTo = g.players[to];
      pFrom.money -= offer.money; pTo.money += offer.money;
      pTo.money -= request.money; pFrom.money += request.money;
      offer.properties.forEach((pid) => { pFrom.properties = pFrom.properties.filter((p) => p !== pid); pTo.properties.push(pid); });
      request.properties.forEach((pid) => { pTo.properties = pTo.properties.filter((p) => p !== pid); pFrom.properties.push(pid); });
      pFrom.freedomCards -= offer.freedomCards; pTo.freedomCards += offer.freedomCards;
      pTo.freedomCards -= request.freedomCards; pFrom.freedomCards += request.freedomCards;
      g.tradeState = null; g.phase = "endturn";
    });
  }, [isOnline, mp, updateGame]);

  const declineTrade = useCallback(() => {
    if (isOnline) { mp.declineTrade(); return; }
    updateGame((g) => { g.tradeState = null; g.phase = "endturn"; });
  }, [isOnline, mp, updateGame]);

  // --- AI (local only) ---
  useEffect(() => {
    if (isOnline || !game || game.paused || game.phase === "gameover" || animating || diceAnim) return;
    const cp = game.players[game.currentPlayer];
    if (!cp.isAI) return;

    const timer = setTimeout(() => {
      const personality = cp.aiPersonality || "random";
      if (game.phase === "roll") {
        if (cp.inJail) {
          if (cp.freedomCards > 0) useFreedomCard();
          else if (cp.money > 200) payJail();
          else doRoll();
        } else doRoll();
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
          const maxBid = personality === "aggressive" ? cell.price * 0.9 : personality === "cautious" ? cell.price * 0.5 : cell.price * 0.7;
          if (a.highBid < maxBid && cp.money > a.highBid + 10) doAuctionBid(a.highBid + 10);
          else doAuctionBid(0);
        }
      } else if (game.phase === "card") { endTurn(); }
      else if (game.phase === "endturn") {
        const myHouses = {};
        cp.properties.forEach((pid) => { const c = game.cells[pid]; if (c.house) { if (!myHouses[c.house]) myHouses[c.house] = []; myHouses[c.house].push(pid); } });
        let built = false;
        for (const [house, props] of Object.entries(myHouses)) {
          const houseProps = game.cells.filter((c) => c.house === house).map((c) => c.id);
          if (houseProps.every((id) => cp.properties.includes(id))) {
            for (const pid of props) {
              const c = game.cells[pid];
              if ((c._buildings || 0) < 5 && cp.money > (c.buildCost || 0) * 2) { doBuild(pid); built = true; break; }
            }
          }
          if (built) break;
        }
        if (!built) endTurn();
        else setTimeout(endTurn, 500);
      } else if (game.phase === "bankruptVote") { skipBankruptVote(); }
      else if (game.phase === "tradeReview") {
        if (game.tradeState?.to === cp.id) Math.random() > 0.5 ? acceptTrade() : declineTrade();
      } else if (game.phase !== "bankruptCheck") { endTurn(); }
    }, 1200 + Math.random() * 800);

    aiTimerRef.current = timer;
    return () => clearTimeout(timer);
  }, [game?.phase, game?.currentPlayer, game?.auctionState?.currentBidder, animating, diceAnim, game?.paused, isOnline]);

  // --- START LOCAL GAME ---
  const startLocalGame = useCallback(() => {
    startAudio();
    setIsOnline(false);
    setGame(createInitialState(config, lang));
    setChatMessages([]);
    setScreen("game");
  }, [config, lang]);

  // --- CHAT ---
  const sendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    if (isOnline) {
      mp.sendChat(chatInput.trim());
    } else {
      setChatMessages((prev) => [...prev, {
        from: game?.players[game.currentPlayer]?.name || "???",
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString().slice(0, 5),
      }]);
    }
    setChatInput("");
  }, [chatInput, game, isOnline, mp]);

  // --- LEAVE ONLINE GAME ---
  const leaveOnlineGame = useCallback(() => {
    mp.leaveRoom();
    setIsOnline(false);
    setGame(null);
    setScreen("menu");
  }, [mp]);

  // ========== SCREEN ROUTING ==========

  if (screen === "menu") {
    return <MainMenu lang={lang} setLang={setLang} setScreen={setScreen} effectsVol={effectsVol} t={t} />;
  }

  if (screen === "settings") {
    return <Settings lang={lang} setLang={setLang} setScreen={setScreen} musicVol={musicVol} setMusicVol={setMusicVol} effectsVol={effectsVol} setEffectsVol={setEffectsVol} t={t} />;
  }

  if (screen === "friends") {
    // If online game started, switch to game screen
    if (mp.onlineGame && !isOnline) {
      setIsOnline(true);
      setChatMessages([]);
      setScreen("game");
    }
    return <Lobby setScreen={setScreen} lang={lang} t={t} mp={mp} />;
  }

  if (screen === "rules") {
    return <Rules setScreen={setScreen} t={t} />;
  }

  if (screen === "setup") {
    return <GameSetup lang={lang} config={config} setConfig={setConfig} setScreen={setScreen} startGame={startLocalGame} t={t} />;
  }

  // ========== GAME SCREEN ==========
  if (screen === "game" && game) {
    const cp = game.players[game.currentPlayer];
    const cells = game.cells;
    const isMyTurn = isOnline ? mp.isMyTurn : !cp.isAI;

    // Victory
    if (game.phase === "gameover" && game.winner !== null) {
      return (
        <VictoryScreen
          game={game}
          t={t}
          onMenu={() => { if (isOnline) leaveOnlineGame(); else { setGame(null); setScreen("menu"); } }}
          onNewGame={() => { if (isOnline) leaveOnlineGame(); else startLocalGame(); }}
        />
      );
    }

    // Pause (local only)
    if (!isOnline && game.paused) {
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
            <span style={{ color: S.gold, fontWeight: "bold", letterSpacing: 2 }}>⚔️ KIRSHAS MONOPOLIA</span>
            <span style={{ color: S.textDim, fontSize: 12, letterSpacing: 1 }}>R{game.roundCount}</span>
            {isOnline && <span style={{ fontSize: 10, color: mp.connected ? "#50c878" : "#ff6b6b", letterSpacing: 1 }}>● {lang === "ru" ? "ОНЛАЙН" : "ONLINE"}</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setChatOpen(!chatOpen)} style={{ background: chatOpen ? S.gold + "33" : "transparent", color: S.gold, border: `1px solid ${S.gold}44`, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: S.font }}>💬</button>
            <button onClick={() => setPanelOpen(!panelOpen)} style={{ background: panelOpen ? S.gold + "33" : "transparent", color: S.gold, border: `1px solid ${S.gold}44`, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: S.font }}>☰</button>
            {!isOnline && <button onClick={() => updateGame((g) => { g.paused = true; })} style={{ background: "transparent", color: S.gold, border: `1px solid ${S.gold}44`, padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: S.font }}>⏸</button>}
            {isOnline && <button onClick={leaveOnlineGame} style={{ background: "transparent", color: "#ff6b6b", border: "1px solid #ff6b6b44", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: S.font }}>{lang === "ru" ? "Выйти" : "Leave"}</button>}
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
          {/* BOARD */}
          <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
            <Board
              game={game}
              selectedCell={selectedCell}
              setSelectedCell={setSelectedCell}
              getPropertyOwner={getPropertyOwner}
              diceAnim={diceAnim}
              animPos={animPos}
              cp={cp}
            />
          </div>

          {/* Panel toggle */}
          {!panelOpen && (
            <button onClick={() => setPanelOpen(true)} style={{ position: "absolute", right: 10, top: 10, zIndex: 15, background: S.bg2, color: S.gold, border: `1px solid ${S.gold}44`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: S.font, fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>☰ {lang === "ru" ? "Панель" : "Panel"}</button>
          )}

          {/* RIGHT PANEL */}
          <div style={{ width: panelOpen ? 300 : 0, background: S.bg2, borderLeft: panelOpen ? `1px solid ${S.border}` : "none", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0, transition: "width 0.3s ease" }}>
            <PlayerPanel game={game} lang={lang} t={t} onClose={() => setPanelOpen(false)} />

            {selectedCell !== null && cells[selectedCell] && (
              <PropertyCard
                cell={cells[selectedCell]}
                owner={getPropertyOwner(selectedCell)}
                lang={lang}
                t={t}
                onClose={() => setSelectedCell(null)}
              />
            )}

            {game.phase === "bankruptVote" && (
              <div style={{ padding: 10 }}>
                <BankruptVote game={game} t={t} lendAmount={lendAmount} setLendAmount={setLendAmount} doLend={doLend} skipBankruptVote={skipBankruptVote} />
              </div>
            )}

            <ActionPanel
              game={game} cp={cp} cells={cells} isMyTurn={isMyTurn} lang={lang} t={t}
              animating={animating} diceAnim={diceAnim}
              doRoll={doRoll} doBuy={doBuy} startAuction={startAuction} endTurn={endTurn}
              payJail={payJail} useFreedomCard={useFreedomCard}
              doBuild={doBuild} doMortgage={doMortgage} doRedeem={doRedeem}
              auctionBid={auctionBid} setAuctionBid={setAuctionBid} doAuctionBid={doAuctionBid}
            />
          </div>

          {/* CHAT */}
          {chatOpen && (
            <Chat
              lang={lang} t={t}
              chatMessages={chatMessages} chatInput={chatInput}
              setChatInput={setChatInput} sendChat={sendChat}
              onClose={() => setChatOpen(false)} panelOpen={panelOpen}
            />
          )}
        </div>
      </div>
    );
  }

  return null;
}
