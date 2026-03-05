import { useState, useEffect, useCallback, useRef } from 'react';
import { T, HOUSES, TOKENS, AI_NAMES, BOARD_SIZE, CORNER } from '../gameData';
import { S, btn, btnOutline } from '../theme';
import { startAudio, playDiceSound, playMoveSound, playBuySound, playClickSound, setCustomAudio, startPlaylist, stopMusic, getCurrentPlaylistMode, setMusicVolume } from '../sounds';
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
import PropertyManager from './PropertyManager';
import ActionPanel from './ActionPanel';
import BankruptVote from './BankruptVote';
import Chat from './Chat';
import VictoryScreen from './VictoryScreen';
import DevPanel, { loadDevData } from './DevPanel';
import FlappyDragon from './FlappyDragon';
import Profile, { loadProfile, saveProfile, recordMonopolyResult } from './Profile';
import VoiceChat from './VoiceChat';

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
  const [panelOpen, setPanelOpen] = useState(false);
  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const [propManagerOpen, setPropManagerOpen] = useState(false);
  const [flappyOpen, setFlappyOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [devData, setDevData] = useState(loadDevData);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [selectedCell, setSelectedCell] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [animPos, setAnimPos] = useState(null);
  const [diceAnim, setDiceAnim] = useState(false);
  const [auctionBid, setAuctionBid] = useState(10);
  const [lendAmount, setLendAmount] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight && window.innerHeight <= 600);

  const t = T[lang];
  const aiTimerRef = useRef(null);

  // Multiplayer hook
  const mp = useMultiplayer();

  // Responsive detection
  useEffect(() => {
    const handler = () => {
      setIsMobile(window.innerWidth <= 600);
      setIsLandscape(window.innerWidth > window.innerHeight && window.innerHeight <= 600);
    };
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => { window.removeEventListener('resize', handler); window.removeEventListener('orientationchange', handler); };
  }, []);

  // --- FETCH DEV CONFIG FROM SERVER ON MOUNT ---
  useEffect(() => {
    fetch('/api/dev/config')
      .then(r => r.json())
      .then(data => {
        if (data.config) {
          setDevData(data.config);
          try { localStorage.setItem('devData', JSON.stringify(data.config)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // --- LISTEN FOR DEV CONFIG UPDATES VIA SOCKET ---
  useEffect(() => {
    const socket = mp.socket;
    if (!socket) return;
    const handler = (config) => {
      const d = config || {};
      setDevData(d);
      try { localStorage.setItem('devData', JSON.stringify(d)); } catch {}
    };
    socket.on('dev_config_updated', handler);
    return () => socket.off('dev_config_updated', handler);
  }, [mp.socket]);

  // --- INJECT CSS FOR ACCENT COLOR ---
  useEffect(() => {
    const accent = devData?.accentColor || '#c9a84c';
    const n = parseInt(accent.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const light = `rgb(${Math.min(r + 80, 255)},${Math.min(g + 80, 255)},${Math.min(b + 80, 255)})`;

    let style = document.getElementById('dev-accent-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'dev-accent-css';
      document.head.appendChild(style);
    }
    style.textContent = `
      .cell:hover { background: rgba(${r},${g},${b},0.12) !important; }
      .shimmer-text {
        background: linear-gradient(90deg, ${accent} 0%, ${light} 50%, ${accent} 100%) !important;
        background-size: 200% auto !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        animation: shimmer 3s linear infinite !important;
      }
      @keyframes shimmer { to { background-position: 200% center; } }
      @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
    `;
    return () => { style.remove(); };
  }, [devData?.accentColor]);

  // --- SYNC CUSTOM AUDIO FROM DEV DATA ---
  useEffect(() => {
    if (devData?.audio) setCustomAudio(devData.audio);
  }, [devData?.audio]);

  // --- MUSIC PLAYLIST: switch between menu and game ---
  useEffect(() => {
    const vol = devData?.volume?.music ?? musicVol;
    if (screen === "menu") {
      if (getCurrentPlaylistMode() !== 'menu') {
        startPlaylist('menu', vol);
      }
    } else if (screen === "game" && game) {
      if (getCurrentPlaylistMode() !== 'game') {
        startPlaylist('game', vol);
      }
    }
  }, [screen, game, devData?.volume?.music, musicVol]);

  // Update music volume when changed
  useEffect(() => {
    setMusicVolume(devData?.volume?.music ?? musicVol);
  }, [devData?.volume?.music, musicVol]);

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
    if (isOnline) return;
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

  // Record monopoly stats on game over
  useEffect(() => {
    if (!game || game.phase !== "gameover" || game._statsRecorded) return;
    const humanPlayer = game.players.find(p => !p.isAI);
    if (humanPlayer) {
      const profile = loadProfile();
      const won = game.winner === humanPlayer.id;
      const finalWealth = calcWealthStatic(game, humanPlayer);
      recordMonopolyResult(profile, {
        won,
        finalWealth,
        rentCollected: humanPlayer.totalRentReceived || 0,
        rentPaid: humanPlayer.totalRentPaid || 0,
        propertiesBought: humanPlayer.properties?.length || 0,
      });
    }
    // Mark stats as recorded to avoid double-counting
    setGame(prev => prev ? { ...prev, _statsRecorded: true } : prev);
  }, [game?.phase]);

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

  // ========== SCREEN RENDERING ==========
  const ac = devData?.accentColor || S.gold;
  const f = devData?.font || S.font;
  const rgba = (hex, a) => {
    if (!hex || hex[0] !== '#') return `rgba(201,168,76,${a})`;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  // Helper: get game button config
  const getGBtnIcon = (key, defaultIcon) => {
    const cfg = devData?.gameButtons?.[key] || {};
    if (cfg.iconImage) return <img src={cfg.iconImage} style={{ width: 16, height: 16, objectFit: 'contain', verticalAlign: 'middle' }} alt="" />;
    return cfg.icon || defaultIcon;
  };
  const getGBtnStyle = (key, baseStyle = {}) => {
    const cfg = devData?.gameButtons?.[key] || {};
    return {
      ...baseStyle,
      ...(cfg.bgColor ? { background: cfg.bgColor } : {}),
      ...(cfg.textColor ? { color: cfg.textColor } : {}),
      ...(cfg.borderColor ? { borderColor: cfg.borderColor } : {}),
      ...(cfg.borderRadius != null ? { borderRadius: cfg.borderRadius } : {}),
    };
  };

  const renderScreen = () => {
    if (screen === "menu") {
      return <MainMenu lang={lang} setLang={setLang} setScreen={setScreen} effectsVol={effectsVol} t={t} devData={devData}
        onFlappy={() => setFlappyOpen(true)}
        onProfile={() => setProfileOpen(true)} />;
    }

    if (screen === "settings") {
      return <Settings lang={lang} setLang={setLang} setScreen={setScreen} musicVol={musicVol} setMusicVol={setMusicVol} effectsVol={effectsVol} setEffectsVol={setEffectsVol} t={t} devData={devData} />;
    }

    if (screen === "friends") {
      if (mp.onlineGame && !isOnline) {
        setIsOnline(true);
        setChatMessages([]);
        setScreen("game");
      }
      return <Lobby setScreen={setScreen} lang={lang} t={t} mp={mp} devData={devData} />;
    }

    if (screen === "rules") {
      return <Rules setScreen={setScreen} t={t} devData={devData} />;
    }

    if (screen === "setup") {
      return <GameSetup lang={lang} config={config} setConfig={setConfig} setScreen={setScreen} startGame={startLocalGame} t={t} devData={devData} />;
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
            devData={devData}
            onMenu={() => { if (isOnline) leaveOnlineGame(); else { setGame(null); setScreen("menu"); } }}
            onNewGame={() => { if (isOnline) leaveOnlineGame(); else startLocalGame(); }}
          />
        );
      }

      // Pause (local only)
      if (!isOnline && game.paused) {
        return (
          <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: f, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <h2 style={{ color: ac }}>⏸ {t.pause}</h2>
            <button onClick={() => updateGame((g) => { g.paused = false; })} style={btn()}>{t.resume}</button>
            <button onClick={() => { setGame(null); setScreen("menu"); }} style={btnOutline()}>{t.quit}</button>
          </div>
        );
      }

      const fbBg = devData?.uiConfig?.floatingBtnBg || S.bg2;
      const fbBorder = devData?.uiConfig?.floatingBtnBorder || ac;
      const btnSize = isLandscape ? 30 : 38;
      const floatingBtnStyle = (active) => ({
        background: active ? ac + "44" : rgba(fbBg, 0.9),
        color: ac, border: `1px solid ${fbBorder}44`,
        padding: 0, borderRadius: "50%",
        cursor: "pointer", fontSize: isLandscape ? 12 : 14, fontFamily: f,
        width: btnSize, height: btnSize,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
      });

      const infoBg = devData?.uiConfig?.infoBarBg || "rgba(10,10,18,0.75)";
      const infoBorder = devData?.uiConfig?.infoBarBorder || (ac + "22");
      const msgBg = devData?.uiConfig?.messageBg || "rgba(10,10,18,0.85)";
      const msgColor = devData?.uiConfig?.messageColor || S.text;

      // In landscape on phone: controls on left, no panel auto-open
      const controlsSide = isLandscape ? "left" : "right";

      return (
        <div style={{ height: "100vh", width: "100vw", background: S.bg, color: S.text, fontFamily: f, overflow: "hidden", position: "relative" }}>
          {/* BOARD fills full screen */}
          <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
            <Board
              game={game}
              selectedCell={selectedCell}
              setSelectedCell={setSelectedCell}
              getPropertyOwner={getPropertyOwner}
              diceAnim={diceAnim}
              animPos={animPos}
              cp={cp}
              devData={devData}
            />

            {/* Compact info bar */}
            <div style={{
              position: "absolute", top: isLandscape ? 4 : 8,
              left: "50%", transform: "translateX(-50%)",
              zIndex: 20, display: "flex", alignItems: "center", gap: isLandscape ? 4 : 8,
              background: infoBg, backdropFilter: "blur(8px)",
              borderRadius: 20, padding: isLandscape ? "2px 10px" : "4px 14px",
              border: `1px solid ${infoBorder}`,
              fontFamily: f,
            }}>
              {devData?.logoImage
                ? <img src={devData.logoImage} style={{ height: isLandscape ? 12 : 16, objectFit: "contain" }} alt="" />
                : <span style={{ color: ac, fontWeight: "bold", fontSize: isLandscape ? 9 : 11, letterSpacing: 1 }}>{devData?.centerEmoji || "⚔️"}</span>
              }
              <span style={{ color: S.textDim, fontSize: isLandscape ? 8 : 10 }}>R{game.roundCount}</span>
              <span style={{ fontSize: isLandscape ? 9 : 11, color: ac, fontWeight: "bold" }}>{cp.token.emoji} {cp.name}</span>
              <span style={{ fontSize: isLandscape ? 8 : 10, color: S.textDim }}>{cp.money} {t.gold}</span>
              {isOnline && <span style={{ fontSize: 9, color: mp.connected ? "#50c878" : "#ff6b6b" }}>●</span>}
            </div>

            {/* Floating controls - left in landscape, right otherwise */}
            <div style={{
              position: "absolute",
              [controlsSide]: isLandscape ? 4 : 10,
              top: "50%", transform: "translateY(-50%)",
              display: "flex", flexDirection: "column", gap: isLandscape ? 4 : 8, zIndex: 20,
            }}>
              <button onClick={() => setPanelOpen(!panelOpen)} style={getGBtnStyle("menu", floatingBtnStyle(panelOpen))} title={lang === "ru" ? "Панель" : "Panel"}>
                {getGBtnIcon("menu", "☰")}
              </button>
              <button onClick={() => setPropManagerOpen(!propManagerOpen)} style={getGBtnStyle("properties", floatingBtnStyle(propManagerOpen))} title={lang === "ru" ? "Владения" : "Properties"}>
                {getGBtnIcon("properties", "🏘")}
              </button>
              <button onClick={() => setChatOpen(!chatOpen)} style={getGBtnStyle("chat", floatingBtnStyle(chatOpen))} title={lang === "ru" ? "Чат" : "Chat"}>
                {getGBtnIcon("chat", "💬")}
              </button>
              {!isOnline && (
                <button onClick={() => updateGame((g) => { g.paused = true; })} style={getGBtnStyle("pause", floatingBtnStyle(false))} title={lang === "ru" ? "Пауза" : "Pause"}>
                  {getGBtnIcon("pause", "⏸")}
                </button>
              )}
              {isOnline && (
                <button onClick={leaveOnlineGame} style={{ ...floatingBtnStyle(false), color: "#ff6b6b", borderColor: "#ff6b6b44" }} title={lang === "ru" ? "Выйти" : "Leave"}>
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Panel overlay backdrop - click to close */}
          {panelOpen && (
            <div onClick={() => setPanelOpen(false)} style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
              zIndex: 24,
            }} />
          )}

          {/* Side panel - always slides from right */}
          <div style={{
            position: "fixed", right: 0, top: 0, bottom: 0,
            width: panelOpen ? Math.min(isLandscape ? 220 : 300, window.innerWidth * (isLandscape ? 0.4 : isMobile ? 0.85 : 0.35)) : 0,
            background: devData?.uiConfig?.panelBg || S.bg2,
            borderLeft: panelOpen ? `1px solid ${devData?.uiConfig?.panelBorder || S.border}` : "none",
            display: "flex", flexDirection: "column",
            overflow: "hidden", zIndex: 25,
            transition: "width 0.25s ease",
            boxShadow: panelOpen ? "-4px 0 24px rgba(0,0,0,0.5)" : "none",
          }}>
            <PlayerPanel game={game} lang={lang} t={t} onClose={() => setPanelOpen(false)} devData={devData} />

            {/* Voice Chat */}
            {isOnline && panelOpen && (
              <div style={{ padding: "0 10px 10px 10px" }}>
                <VoiceChat
                  socket={mp.socket}
                  roomId={mp.currentRoom}
                  playerName={game.players.find(p => !p.isAI)?.name || "Player"}
                  lang={lang}
                  devData={devData}
                />
              </div>
            )}

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
              devData={devData}
            />
          </div>

          {/* Chat overlay */}
          {chatOpen && (
            <>
              <div onClick={() => setChatOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 18 }} />
              <Chat
                lang={lang} t={t}
                chatMessages={chatMessages} chatInput={chatInput}
                setChatInput={setChatInput} sendChat={sendChat}
                onClose={() => setChatOpen(false)} panelOpen={panelOpen}
                devData={devData}
              />
            </>
          )}

          {/* Property Manager overlay with backdrop */}
          {propManagerOpen && (
            <>
              <div onClick={() => setPropManagerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 88 }} />
              <PropertyManager
                game={game}
                cp={cp}
                isMyTurn={isMyTurn}
                lang={lang}
                t={t}
                doBuild={doBuild}
                doMortgage={doMortgage}
                doRedeem={doRedeem}
                onClose={() => setPropManagerOpen(false)}
                devData={devData}
              />
            </>
          )}

          {/* Message toast at bottom */}
          {game.message && (
            <div style={{
              position: "fixed", bottom: isLandscape ? 4 : 16,
              left: "50%", transform: "translateX(-50%)",
              background: msgBg, backdropFilter: "blur(8px)",
              color: msgColor, padding: isLandscape ? "4px 14px" : "8px 20px", borderRadius: 20,
              border: `1px solid ${ac}33`, fontSize: isLandscape ? 10 : 12, fontFamily: f,
              zIndex: 15, maxWidth: "80%", textAlign: "center",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              animation: "fadeIn 0.3s ease-out",
            }}>
              {game.message}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // ========== RENDER WITH GLOBAL DEV OVERLAY ==========
  return (
    <>
      {renderScreen()}

      {/* Floating Dev Button */}
      <button
        onClick={() => setDevPanelOpen(!devPanelOpen)}
        title="Dev Panel"
        style={{
          position: "fixed", bottom: 16, right: 16, zIndex: 95,
          width: 40, height: 40, borderRadius: "50%",
          background: devPanelOpen ? ac + "33" : S.bg2,
          color: ac, border: `1px solid ${ac}44`,
          cursor: "pointer", fontSize: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          fontFamily: f, transition: "all 0.2s ease",
        }}
      >🔧</button>

      {/* Dev Panel Overlay */}
      {devPanelOpen && (
        <DevPanel
          game={game}
          devData={devData}
          setDevData={setDevData}
          onClose={() => setDevPanelOpen(false)}
        />
      )}

      {/* Flappy Dragon Mini-Game */}
      {flappyOpen && (
        <FlappyDragon
          onClose={() => setFlappyOpen(false)}
          devData={devData}
        />
      )}

      {/* Player Profile */}
      {profileOpen && (
        <Profile
          onClose={() => setProfileOpen(false)}
          lang={lang}
          devData={devData}
        />
      )}
    </>
  );
}
