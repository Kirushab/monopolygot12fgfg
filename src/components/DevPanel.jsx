import { useState, useRef, useEffect, useCallback } from 'react';
import { S, btnOutline } from '../theme';
import { HOUSES, TOKENS, PLAYER_COLORS, makeCells } from '../gameData';

const DEFAULT_DEV_DATA = {
  cellTextures: {}, boardBg: null, tokenTextures: {}, buildingTextures: {},
  logoImage: null, cellBgTextures: {}, hiddenCellIcons: {},
  cellNames: {}, gameTitle: null, gameSubtitle: null, centerEmoji: null, houseSigils: {},
  accentColor: null, boardBgColor: null, boardBorderColor: null, diceColor: null,
  houseColors: {}, playerColors: {}, cellBgColors: {},
  audio: {},
  volume: { master: 1.0, music: 0.5, effects: 0.7, ambient: 0.3 },
  font: null, showGrid: true,
  layout: { emojiSize: null, titleSize: null, subtitleSize: null, diceSize: null, cellIconSize: null, tokenSize: null },
  menuConfig: {
    backgrounds: [], slideshowInterval: 8, subtitle: null, buttonStyle: "default",
    buttons: {},
    showParticles: true,
    showGrid: true,
    showVignette: true,
    dragonButton: true,
  },
  flappyConfig: { dragonEmoji: null, pipeColor: null, bgColor: null, groundColor: null, dragonImage: null },
  uiConfig: {
    pageBg: null, pageBg2: null, pageText: null, pageTextDim: null,
    cardBg: null, cardBorder: null,
    panelBg: null, panelBorder: null,
    chatBg: null, chatBorder: null,
    popupBg: null, popupBorder: null, popupOverlay: null,
    settingsTitle: null, rulesTitle: null, setupTitle: null,
    victoryBg: null,
    floatingBtnBg: null, floatingBtnBorder: null,
    infoBarBg: null, infoBarBorder: null,
    messageBg: null, messageColor: null,
  },
  // Game button customization
  gameButtons: {
    rollDice: { icon: null, iconImage: null, bgColor: null, textColor: null, borderColor: null, borderRadius: null, fontSize: null },
    buy: { icon: null, iconImage: null, bgColor: null, textColor: null, borderColor: null, borderRadius: null },
    auction: { icon: null, iconImage: null, bgColor: null, textColor: null, borderColor: null },
    endTurn: { icon: null, iconImage: null, bgColor: null, textColor: null, borderColor: null },
    pause: { icon: null, iconImage: null, bgColor: null, textColor: null, borderColor: null },
    chat: { icon: null, iconImage: null, bgColor: null, textColor: null, borderColor: null },
    properties: { icon: null, iconImage: null, bgColor: null, textColor: null, borderColor: null },
    menu: { icon: null, iconImage: null, bgColor: null, textColor: null, borderColor: null },
  },
  // Custom icons for main menu and toolbar
  customIcons: {
    flappyButton: null,
    profileButton: null,
    settingsIcon: null,
    rulesIcon: null,
    friendsIcon: null,
    playIcon: null,
  },
};

export function loadDevData() {
  try {
    const saved = localStorage.getItem("devData");
    return saved ? { ...DEFAULT_DEV_DATA, ...JSON.parse(saved) } : { ...DEFAULT_DEV_DATA };
  } catch { return { ...DEFAULT_DEV_DATA }; }
}

const FONTS = [
  "Georgia, serif", "Arial, sans-serif", "Verdana, sans-serif",
  "'Times New Roman', serif", "'Courier New', monospace",
  "'Trebuchet MS', sans-serif", "Palatino, serif",
  "'Segoe UI', sans-serif", "Impact, sans-serif",
];

const HOUSE_KEYS = Object.keys(HOUSES);

const MUSIC_KEYS = [
  ["menuMusic", "Меню #1"], ["menuMusic2", "Меню #2"], ["menuMusic3", "Меню #3"],
  ["gameMusic", "Игра #1"], ["gameMusic2", "Игра #2"], ["gameMusic3", "Игра #3"],
  ["battleMusic", "Битва"], ["winterMusic", "Зима"],
];

const SFX_KEYS = [
  ["dice", "Кубики"], ["buy", "Покупка"], ["move", "Передвижение"],
  ["jail", "Тюрьма / Стена"], ["victory", "Победа"], ["click", "Клик / UI"],
];

const COLOR_PRESETS = [
  { name: "Классика", accent: "#c9a84c", boardBg: null, boardBorder: null },
  { name: "Огонь", accent: "#ff4500", boardBg: "#1a0505", boardBorder: "#ff4500" },
  { name: "Лёд", accent: "#4a90d9", boardBg: "#0a1520", boardBorder: "#4a90d9" },
  { name: "Тьма", accent: "#2f8b8b", boardBg: "#0a1a1a", boardBorder: "#2f8b8b" },
  { name: "Золото", accent: "#ffd700", boardBg: "#1a1500", boardBorder: "#ffd700" },
  { name: "Кровь", accent: "#cc0033", boardBg: "#120008", boardBorder: "#cc0033" },
  { name: "Роза", accent: "#50c878", boardBg: "#0a1a0f", boardBorder: "#50c878" },
];

const rgba = (hex, a) => {
  if (!hex || hex[0] !== '#') return `rgba(201,168,76,${a})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const STATIC_CELLS = makeCells("ru");
const STATIC_PLAYERS = PLAYER_COLORS.map((color, i) => ({
  id: i, name: `Игрок ${i + 1}`, color, token: TOKENS[i] || TOKENS[0], isAI: i > 0,
}));

export default function DevPanel({ game, devData, setDevData, onClose }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState("textures");
  const [saving, setSaving] = useState(false);
  const [selectedCellId, setSelectedCellId] = useState(0);
  const [backups, setBackups] = useState([]);
  const [serverStatus, setServerStatus] = useState("unknown");
  const [cellSearch, setCellSearch] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  const fileRef = useRef(null);
  const audioFileRef = useRef(null);
  const importRef = useRef(null);
  const menuBgRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [audioUploadKey, setAudioUploadKey] = useState(null);
  const saveTimer = useRef(null);
  const previewAudioRef = useRef(null);

  const cells = game?.cells || STATIC_CELLS;
  const players = game?.players || STATIC_PLAYERS;

  // Responsive
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem('devAuth') === 'true') setAuthenticated(true);
  }, []);

  useEffect(() => {
    fetch('/api/dev/config').then(r => { if (r.ok) setServerStatus("connected"); else setServerStatus("error"); })
      .catch(() => setServerStatus("offline"));
  }, []);

  const authenticate = async () => {
    setAuthLoading(true); setAuthError(false);
    try {
      const res = await fetch('/api/dev/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthenticated(true);
        sessionStorage.setItem('devAuth', 'true');
        sessionStorage.setItem('devPassword', password);
      } else { setAuthError(true); }
    } catch { setAuthError(true); }
    setAuthLoading(false);
  };

  const saveToServer = useCallback((newData) => {
    setDevData(newData);
    try { localStorage.setItem('devData', JSON.stringify(newData)); } catch {}
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch('/api/dev/config', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: sessionStorage.getItem('devPassword'), config: newData }),
        });
      } catch (e) { console.error('Dev save failed:', e); }
      setSaving(false);
    }, 400);
  }, [setDevData]);

  const update = (key, value) => saveToServer({ ...devData, [key]: value });
  const updateNested = (key, subKey, value) => saveToServer({ ...devData, [key]: { ...(devData[key] || {}), [subKey]: value } });
  const deleteNested = (key, subKey) => {
    const obj = { ...(devData[key] || {}) }; delete obj[subKey];
    saveToServer({ ...devData, [key]: obj });
  };
  const updateLayout = (key, value) => saveToServer({ ...devData, layout: { ...(devData.layout || {}), [key]: value } });
  const updateMenu = (key, value) => saveToServer({ ...devData, menuConfig: { ...(devData.menuConfig || {}), [key]: value } });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      if (uploadTarget?.startsWith("cell:")) updateNested("cellTextures", parseInt(uploadTarget.split(":")[1]), dataUrl);
      else if (uploadTarget === "board") update("boardBg", dataUrl);
      else if (uploadTarget === "logo") update("logoImage", dataUrl);
      else if (uploadTarget?.startsWith("token:")) updateNested("tokenTextures", parseInt(uploadTarget.split(":")[1]), dataUrl);
      else if (uploadTarget?.startsWith("building:")) updateNested("buildingTextures", uploadTarget.split(":")[1], dataUrl);
      else if (uploadTarget?.startsWith("cellbg:")) updateNested("cellBgTextures", parseInt(uploadTarget.split(":")[1]), dataUrl);
      else if (uploadTarget === "flappy_dragon") saveToServer({ ...devData, flappyConfig: { ...(devData.flappyConfig || {}), dragonImage: dataUrl } });
      else if (uploadTarget?.startsWith("gamebtn:")) {
        const btnKey = uploadTarget.split(":")[1];
        updateGameButton(btnKey, "iconImage", dataUrl);
      }
      else if (uploadTarget?.startsWith("customicon:")) {
        const iconKey = uploadTarget.split(":")[1];
        updateCustomIcon(iconKey, dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const triggerUpload = (target) => {
    setUploadTarget(target);
    setTimeout(() => fileRef.current?.click(), 0);
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !audioUploadKey) return;
    setSaving(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        await fetch('/api/dev/upload/audio', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: sessionStorage.getItem('devPassword'), key: audioUploadKey, data: ev.target.result, filename: file.name }),
        });
        const res = await fetch('/api/dev/config');
        const cfg = await res.json();
        if (cfg.config) { setDevData(cfg.config); try { localStorage.setItem('devData', JSON.stringify(cfg.config)); } catch {} }
        setSaving(false);
      };
      reader.readAsDataURL(file);
    } catch { setSaving(false); }
    e.target.value = "";
  };

  const triggerAudioUpload = (key) => { setAudioUploadKey(key); setTimeout(() => audioFileRef.current?.click(), 0); };

  const deleteAudio = async (key) => {
    setSaving(true);
    try {
      await fetch('/api/dev/delete/audio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: sessionStorage.getItem('devPassword'), key }) });
      const res = await fetch('/api/dev/config');
      const cfg = await res.json();
      if (cfg.config) { setDevData(cfg.config); try { localStorage.setItem('devData', JSON.stringify(cfg.config)); } catch {} }
    } catch {}
    setSaving(false);
  };

  const playPreview = (url) => { stopPreview(); previewAudioRef.current = new Audio(url); previewAudioRef.current.volume = (devData.volume?.master ?? 1) * (devData.volume?.music ?? 0.5); previewAudioRef.current.play().catch(() => {}); };
  const stopPreview = () => { if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; } };

  const loadBackups = async () => { try { const res = await fetch('/api/dev/backups'); const data = await res.json(); setBackups(data.backups || []); } catch { setBackups([]); } };

  const restoreBackup = async (name) => {
    if (!confirm(`Восстановить из бэкапа ${name}?`)) return;
    setSaving(true);
    try {
      await fetch('/api/dev/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: sessionStorage.getItem('devPassword'), backup: name }) });
      const res = await fetch('/api/dev/config');
      const cfg = await res.json();
      if (cfg.config) { setDevData(cfg.config); try { localStorage.setItem('devData', JSON.stringify(cfg.config)); } catch {} }
    } catch {}
    setSaving(false);
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(devData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'kirshas-dev-config.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const config = { ...DEFAULT_DEV_DATA, ...JSON.parse(ev.target.result) };
        setSaving(true);
        await fetch('/api/dev/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: sessionStorage.getItem('devPassword'), config }) });
        setDevData(config); try { localStorage.setItem('devData', JSON.stringify(config)); } catch {}
        setSaving(false);
      } catch { alert("Ошибка чтения файла"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const resetAll = async () => {
    if (!confirm("Сбросить ВСЕ настройки?")) return;
    setSaving(true);
    try {
      await fetch('/api/dev/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: sessionStorage.getItem('devPassword') }) });
      setDevData({ ...DEFAULT_DEV_DATA }); try { localStorage.setItem('devData', JSON.stringify(DEFAULT_DEV_DATA)); } catch {}
    } catch {}
    setSaving(false);
  };

  const applyPreset = (preset) => {
    saveToServer({ ...devData, accentColor: preset.accent, boardBgColor: preset.boardBg, boardBorderColor: preset.boardBorder });
  };

  // Menu background upload
  const handleMenuBgUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const bgs = [...(devData.menuConfig?.backgrounds || []), ev.target.result];
      updateMenu("backgrounds", bgs);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeMenuBg = (index) => {
    const bgs = [...(devData.menuConfig?.backgrounds || [])];
    bgs.splice(index, 1);
    updateMenu("backgrounds", bgs);
  };

  // ============================================================
  // STYLES
  // ============================================================
  const accent = devData?.accentColor || S.gold;
  const panelWidth = isMobile ? "100vw" : 380;
  const section = { background: S.bg3, borderRadius: 8, padding: isMobile ? 8 : 10, border: `1px solid ${S.border}`, marginBottom: 10 };
  const label = { color: accent, fontSize: 12, fontWeight: "bold", marginBottom: 6, display: "block" };
  const row = { display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: isMobile ? "wrap" : "nowrap" };
  const smallBtn = btnOutline({ padding: isMobile ? "6px 12px" : "4px 10px", fontSize: 11 });
  const clearBtn = { background: "transparent", border: "none", color: "#ff6b6b", cursor: "pointer", fontSize: 12, padding: "2px 4px" };
  const colorInput = { width: 32, height: 24, border: "none", cursor: "pointer", borderRadius: 4, background: "transparent" };
  const textInput = (active) => ({
    flex: 1, padding: "4px 8px", background: S.bg, color: S.text,
    border: `1px solid ${active ? accent + "66" : S.border}`,
    borderRadius: 4, fontFamily: devData?.font || S.font, fontSize: 11,
    minWidth: 0,
  });
  const sliderStyle = { flex: 1, cursor: "pointer", accentColor: accent };

  const updateUI = (key, value) => saveToServer({ ...devData, uiConfig: { ...(devData.uiConfig || {}), [key]: value } });

  const tabs = [
    ["textures", "🖼"], ["colors", "🎨"], ["audio", "🎵"],
    ["menu", "📱"], ["buttons", "🎮"], ["text", "✏️"], ["styles", "⚙️"], ["ui", "🎭"], ["system", "💾"],
  ];

  const tabNames = {
    textures: "Текстуры", colors: "Цвета", audio: "Аудио",
    menu: "Меню", buttons: "Кнопки", text: "Текст", styles: "Стили", ui: "Интерфейс", system: "Система",
  };

  const updateGameButton = (btnKey, field, value) => {
    const gb = { ...(devData.gameButtons || {}) };
    gb[btnKey] = { ...(gb[btnKey] || {}), [field]: value };
    saveToServer({ ...devData, gameButtons: gb });
  };
  const clearGameButton = (btnKey, field) => {
    const gb = { ...(devData.gameButtons || {}) };
    if (gb[btnKey]) { delete gb[btnKey][field]; }
    saveToServer({ ...devData, gameButtons: gb });
  };
  const updateCustomIcon = (key, value) => {
    saveToServer({ ...devData, customIcons: { ...(devData.customIcons || {}), [key]: value } });
  };

  const filteredCells = cellSearch
    ? cells.filter(c => {
        const name = (devData.cellNames?.[c.id] || c.name).toLowerCase();
        return name.includes(cellSearch.toLowerCase()) || String(c.id).includes(cellSearch);
      })
    : cells;

  // ============================================================
  // AUTH SCREEN
  // ============================================================
  if (!authenticated) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: panelWidth, maxWidth: "100vw",
        background: S.bg2, borderRight: isMobile ? "none" : `1px solid ${S.gold}33`,
        zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        boxShadow: "4px 0 20px rgba(0,0,0,0.5)", gap: 16,
      }}>
        <div style={{ fontSize: 48, animation: "float 4s ease-in-out infinite" }}>🔒</div>
        <div style={{ color: S.gold, fontWeight: "bold", fontSize: 18, fontFamily: S.font, letterSpacing: 2 }}>DEV PANEL</div>
        <div style={{ color: S.textDim, fontSize: 12, fontFamily: S.font }}>Введите пароль разработчика</div>
        <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setAuthError(false); }} onKeyDown={(e) => e.key === 'Enter' && authenticate()} placeholder="Winter is coming..."
          style={{ width: Math.min(220, window.innerWidth - 60), padding: "10px 16px", background: S.bg, color: S.text, border: `1px solid ${authError ? '#ff6b6b' : S.border}`, borderRadius: 8, fontFamily: S.font, fontSize: 14, textAlign: "center", outline: "none" }} autoFocus />
        {authError && <div style={{ color: "#ff6b6b", fontSize: 12 }}>Неверный пароль</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={authenticate} disabled={authLoading} style={{ ...btnOutline({ padding: "8px 24px", fontSize: 13 }), opacity: authLoading ? 0.5 : 1 }}>{authLoading ? "..." : "Войти"}</button>
          <button onClick={onClose} style={btnOutline({ padding: "8px 16px", fontSize: 13, color: S.textDim, borderColor: S.textDim + "44" })}>✕</button>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN PANEL
  // ============================================================
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, bottom: 0,
      width: panelWidth, maxWidth: "100vw",
      background: S.bg2, borderRight: isMobile ? "none" : `1px solid ${accent}33`,
      zIndex: 100, display: "flex", flexDirection: "column",
      boxShadow: "4px 0 20px rgba(0,0,0,0.5)",
      animation: "slideInLeft 0.3s ease-out",
      fontFamily: devData?.font || S.font,
    }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />
      <input ref={audioFileRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={handleAudioUpload} />
      <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
      <input ref={menuBgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleMenuBgUpload} />

      {/* Header */}
      <div style={{ padding: isMobile ? "8px 10px" : "10px 14px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: accent, fontWeight: "bold", fontSize: isMobile ? 13 : 15 }}>Dev Panel</span>
          {saving && <span style={{ fontSize: 10, color: S.textDim, animation: "pulse 1s infinite" }}>💾</span>}
          <span style={{ fontSize: 8, color: serverStatus === "connected" ? "#50c878" : "#ff6b6b" }}>● {serverStatus === "connected" ? "SYNC" : "OFF"}</span>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: S.textDim, fontSize: 18, cursor: "pointer", padding: "4px 8px" }}>✕</button>
      </div>

      {/* Tabs - horizontal scroll on mobile */}
      <div style={{ display: "flex", borderBottom: `1px solid ${S.border}`, flexShrink: 0, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        {tabs.map(([key, icon]) => (
          <button key={key} onClick={() => { setTab(key); if (key === "system") loadBackups(); }} style={{
            flex: isMobile ? "none" : 1,
            padding: isMobile ? "8px 12px" : "7px 2px",
            minWidth: isMobile ? "auto" : 50,
            whiteSpace: "nowrap",
            background: tab === key ? `${accent}22` : "transparent",
            color: tab === key ? accent : S.textDim, border: "none",
            borderBottom: tab === key ? `2px solid ${accent}` : "2px solid transparent",
            cursor: "pointer", fontSize: isMobile ? 16 : 10,
            fontFamily: devData?.font || S.font,
          }}>
            {isMobile ? icon : tabNames[key]}
          </button>
        ))}
      </div>

      {/* Tab name on mobile */}
      {isMobile && (
        <div style={{ padding: "4px 10px", fontSize: 11, color: accent, fontWeight: "bold", borderBottom: `1px solid ${S.border}` }}>
          {tabNames[tab]}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: isMobile ? 8 : 10, WebkitOverflowScrolling: "touch" }}>

        {/* ===================== TEXTURES TAB ===================== */}
        {tab === "textures" && (<>
          <div style={section}>
            <span style={label}>Логотип игры</span>
            <div style={row}>
              <button onClick={() => triggerUpload("logo")} style={smallBtn}>{devData.logoImage ? "Заменить" : "Загрузить"}</button>
              {devData.logoImage && (<>
                <img src={devData.logoImage} style={{ height: 32, objectFit: "contain", border: `1px solid ${accent}33`, borderRadius: 4 }} />
                <button onClick={() => update("logoImage", null)} style={clearBtn}>✕</button>
              </>)}
            </div>
          </div>

          <div style={section}>
            <span style={label}>Фон центра поля</span>
            <div style={row}>
              <button onClick={() => triggerUpload("board")} style={smallBtn}>{devData.boardBg ? "Заменить" : "Загрузить"}</button>
              {devData.boardBg && (<>
                <img src={devData.boardBg} style={{ width: 36, height: 36, borderRadius: 4, objectFit: "cover", border: `1px solid ${accent}33` }} />
                <button onClick={() => update("boardBg", null)} style={clearBtn}>✕</button>
              </>)}
            </div>
          </div>

          <div style={section}>
            <span style={label}>Ячейки поля</span>
            <select value={selectedCellId} onChange={(e) => setSelectedCellId(Number(e.target.value))} style={{
              width: "100%", padding: "5px 8px", background: S.bg, color: S.text,
              border: `1px solid ${S.border}`, borderRadius: 4, fontSize: 11, marginBottom: 6,
            }}>
              {cells.map((cell) => (
                <option key={cell.id} value={cell.id}>#{cell.id} — {devData.cellNames?.[cell.id] || cell.name}</option>
              ))}
            </select>

            <div style={{ fontSize: 10, color: S.textDim, marginBottom: 3 }}>Иконка</div>
            <div style={row}>
              <button onClick={() => triggerUpload(`cell:${selectedCellId}`)} style={smallBtn}>
                {devData.cellTextures?.[selectedCellId] ? "Заменить" : "Загрузить"}
              </button>
              {devData.cellTextures?.[selectedCellId] && (<>
                <img src={devData.cellTextures[selectedCellId]} style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover" }} />
                <button onClick={() => deleteNested("cellTextures", selectedCellId)} style={clearBtn}>✕</button>
              </>)}
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: S.textDim, cursor: "pointer" }}>
                <input type="checkbox" checked={!!devData.hiddenCellIcons?.[selectedCellId]} onChange={(e) => updateNested("hiddenCellIcons", selectedCellId, e.target.checked || undefined)} style={{ accentColor: accent }} />
                Скрыть
              </label>
            </div>

            <div style={{ fontSize: 10, color: S.textDim, marginBottom: 3, marginTop: 6 }}>Фон ячейки</div>
            <div style={row}>
              <button onClick={() => triggerUpload(`cellbg:${selectedCellId}`)} style={smallBtn}>
                {devData.cellBgTextures?.[selectedCellId] ? "Заменить" : "Загрузить"}
              </button>
              {devData.cellBgTextures?.[selectedCellId] && (<>
                <img src={devData.cellBgTextures[selectedCellId]} style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover" }} />
                <button onClick={() => deleteNested("cellBgTextures", selectedCellId)} style={clearBtn}>✕</button>
              </>)}
            </div>

            {(Object.keys(devData.cellTextures || {}).length > 0 || Object.keys(devData.cellBgTextures || {}).length > 0) && (
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 6 }}>
                {Object.entries({ ...(devData.cellTextures || {}), ...(devData.cellBgTextures || {}) }).map(([id, url]) => (
                  <div key={id} onClick={() => setSelectedCellId(Number(id))} style={{
                    cursor: "pointer", position: "relative",
                    border: Number(id) === selectedCellId ? `2px solid ${accent}` : `1px solid ${S.border}`,
                    borderRadius: 4, padding: 1,
                  }}>
                    <img src={url} style={{ width: 22, height: 22, objectFit: "cover", borderRadius: 3, display: "block" }} />
                    <span style={{ position: "absolute", bottom: -1, right: -1, fontSize: 7, background: S.bg2, color: S.textDim, padding: "0 2px", borderRadius: 2 }}>{id}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={section}>
            <span style={label}>Фишки игроков</span>
            {players.map((p) => (
              <div key={p.id} style={{ ...row, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: devData.playerColors?.[p.id] || p.color, minWidth: 70 }}>{p.name}</span>
                <button onClick={() => triggerUpload(`token:${p.id}`)} style={smallBtn}>
                  {devData.tokenTextures?.[p.id] ? "Заменить" : "Загрузить"}
                </button>
                {devData.tokenTextures?.[p.id] ? (<>
                  <img src={devData.tokenTextures[p.id]} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
                  <button onClick={() => deleteNested("tokenTextures", p.id)} style={clearBtn}>✕</button>
                </>) : (
                  <span style={{ fontSize: 18 }}>{p.token.emoji}</span>
                )}
              </div>
            ))}
          </div>

          <div style={section}>
            <span style={label}>Текстуры зданий</span>
            {[["house", "Дом 🏠"], ["castle", "Замок 🏰"]].map(([key, lbl]) => (
              <div key={key} style={{ ...row, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: S.text, minWidth: 70 }}>{lbl}</span>
                <button onClick={() => triggerUpload(`building:${key}`)} style={smallBtn}>{devData.buildingTextures?.[key] ? "Заменить" : "Загрузить"}</button>
                {devData.buildingTextures?.[key] && (<>
                  <img src={devData.buildingTextures[key]} style={{ width: 20, height: 20, objectFit: "contain" }} />
                  <button onClick={() => deleteNested("buildingTextures", key)} style={clearBtn}>✕</button>
                </>)}
              </div>
            ))}
          </div>
        </>)}

        {/* ===================== COLORS TAB ===================== */}
        {tab === "colors" && (<>
          <div style={section}>
            <span style={label}>Пресеты</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {COLOR_PRESETS.map((p) => (
                <button key={p.name} onClick={() => applyPreset(p)} style={{
                  padding: "4px 8px", fontSize: 10, cursor: "pointer",
                  background: S.bg, color: S.text, border: `1px solid ${p.accent}66`,
                  borderRadius: 4, display: "flex", alignItems: "center", gap: 4,
                  fontFamily: devData?.font || S.font,
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.accent }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div style={section}>
            <span style={label}>Акцентный цвет</span>
            <div style={row}>
              <input type="color" value={devData.accentColor || S.gold} onChange={(e) => update("accentColor", e.target.value)} style={colorInput} />
              <span style={{ fontSize: 11, color: S.text }}>{devData.accentColor || S.gold}</span>
              {devData.accentColor && <button onClick={() => update("accentColor", null)} style={clearBtn}>↩</button>}
            </div>
          </div>

          <div style={section}>
            <span style={label}>Цвета поля</span>
            {[["boardBgColor", "Фон поля", "#1a1a2e"], ["boardBorderColor", "Рамка", "#c9a84c"], ["diceColor", "Кубики", "#c9a84c"]].map(([key, lbl, def]) => (
              <div key={key} style={row}>
                <span style={{ fontSize: 11, color: S.textDim, minWidth: 60 }}>{lbl}</span>
                <input type="color" value={devData[key] || def} onChange={(e) => update(key, e.target.value)} style={colorInput} />
                <span style={{ fontSize: 10, color: S.textDim }}>{devData[key] || "—"}</span>
                {devData[key] && <button onClick={() => update(key, null)} style={clearBtn}>↩</button>}
              </div>
            ))}
          </div>

          <div style={section}>
            <span style={label}>Цвета домов</span>
            {HOUSE_KEYS.map((key) => {
              const house = HOUSES[key]; const color = devData.houseColors?.[key] || house.color;
              return (<div key={key} style={{ ...row, marginBottom: 6 }}>
                <input type="color" value={color} onChange={(e) => updateNested("houseColors", key, e.target.value)} style={colorInput} />
                <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: S.text, flex: 1 }}>{house.name.ru}</span>
                {devData.houseColors?.[key] && <button onClick={() => deleteNested("houseColors", key)} style={clearBtn}>↩</button>}
              </div>);
            })}
          </div>

          <div style={section}>
            <span style={label}>Цвета игроков</span>
            {players.map((p) => {
              const pColor = devData.playerColors?.[p.id] || p.color;
              return (<div key={p.id} style={row}>
                <input type="color" value={pColor} onChange={(e) => updateNested("playerColors", p.id, e.target.value)} style={colorInput} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: pColor, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: S.text, flex: 1 }}>{p.name}</span>
                {devData.playerColors?.[p.id] && <button onClick={() => deleteNested("playerColors", p.id)} style={clearBtn}>↩</button>}
              </div>);
            })}
          </div>

          <div style={section}>
            <span style={label}>Фон клетки #{selectedCellId}</span>
            <div style={row}>
              <input type="color" value={devData.cellBgColors?.[selectedCellId] || "#1a1a2e"} onChange={(e) => updateNested("cellBgColors", selectedCellId, e.target.value)} style={colorInput} />
              <span style={{ fontSize: 10, color: S.textDim }}>{devData.cellBgColors?.[selectedCellId] || "—"}</span>
              {devData.cellBgColors?.[selectedCellId] && <button onClick={() => deleteNested("cellBgColors", selectedCellId)} style={clearBtn}>✕</button>}
            </div>
          </div>
        </>)}

        {/* ===================== AUDIO TAB ===================== */}
        {tab === "audio" && (<>
          <div style={section}>
            <span style={label}>Громкость</span>
            {[["master", "Мастер", 1.0], ["music", "Музыка", 0.5], ["effects", "Эффекты", 0.7], ["ambient", "Атмосфера", 0.3]].map(([key, lbl, def]) => (
              <div key={key} style={{ ...row, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: S.textDim, minWidth: 60 }}>{lbl}</span>
                <input type="range" min="0" max="1" step="0.05" value={devData.volume?.[key] ?? def}
                  onChange={(e) => update("volume", { ...(devData.volume || {}), [key]: parseFloat(e.target.value) })} style={sliderStyle} />
                <span style={{ fontSize: 10, color: S.textDim, minWidth: 30, textAlign: "right" }}>{Math.round((devData.volume?.[key] ?? def) * 100)}%</span>
              </div>
            ))}
          </div>
          <div style={section}>
            <span style={label}>Музыка (плейлист — циклическое воспроизведение)</span>
            <div style={{ fontSize: 9, color: S.textDim, marginBottom: 6 }}>Загрузите несколько треков — они будут играть по очереди с плавным переходом.</div>
            {MUSIC_KEYS.map(([key, lbl]) => (
              <div key={key} style={{ ...row, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: S.textDim, minWidth: isMobile ? 60 : 90 }}>{lbl}</span>
                <button onClick={() => triggerAudioUpload(key)} style={smallBtn}>{devData.audio?.[key] ? "✓" : "+"}</button>
                {devData.audio?.[key] && (<>
                  <button onClick={() => playPreview(devData.audio[key])} style={{ ...smallBtn, padding: "3px 8px" }}>▶</button>
                  <button onClick={stopPreview} style={{ ...smallBtn, padding: "3px 8px" }}>⏹</button>
                  <button onClick={() => deleteAudio(key)} style={clearBtn}>✕</button>
                </>)}
              </div>
            ))}
          </div>
          <div style={section}>
            <span style={label}>Звуковые эффекты</span>
            {SFX_KEYS.map(([key, lbl]) => {
              const sfxKey = `sfx_${key}`;
              return (<div key={key} style={{ ...row, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: S.textDim, minWidth: isMobile ? 60 : 80 }}>{lbl}</span>
                <button onClick={() => triggerAudioUpload(sfxKey)} style={smallBtn}>{devData.audio?.[sfxKey] ? "✓" : "+"}</button>
                {devData.audio?.[sfxKey] && (<>
                  <button onClick={() => playPreview(devData.audio[sfxKey])} style={{ ...smallBtn, padding: "3px 8px" }}>▶</button>
                  <button onClick={() => deleteAudio(sfxKey)} style={clearBtn}>✕</button>
                </>)}
              </div>);
            })}
          </div>
        </>)}

        {/* ===================== MENU TAB ===================== */}
        {tab === "menu" && (<>
          <div style={section}>
            <span style={label}>Фоны меню (слайдшоу)</span>
            <div style={{ fontSize: 9, color: S.textDim, marginBottom: 6 }}>Загрузите картинки — они чередуются как фон.</div>
            <button onClick={() => menuBgRef.current?.click()} style={smallBtn}>+ Добавить фон</button>
            {(devData.menuConfig?.backgrounds || []).length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                {(devData.menuConfig?.backgrounds || []).map((url, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={url} style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 4, border: `1px solid ${S.border}` }} />
                    <button onClick={() => removeMenuBg(i)} style={{ position: "absolute", top: -4, right: -4, background: "#ff6b6b", color: "#fff", border: "none", borderRadius: "50%", width: 16, height: 16, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ ...row, marginTop: 6 }}>
              <span style={{ fontSize: 11, color: S.textDim, minWidth: 60 }}>Интервал</span>
              <input type="range" min="3" max="30" step="1" value={devData.menuConfig?.slideshowInterval || 8}
                onChange={(e) => updateMenu("slideshowInterval", parseInt(e.target.value))} style={sliderStyle} />
              <span style={{ fontSize: 10, color: S.textDim, minWidth: 25 }}>{devData.menuConfig?.slideshowInterval || 8}с</span>
            </div>
          </div>

          <div style={section}>
            <span style={label}>Подзаголовок</span>
            <input type="text" value={devData.menuConfig?.subtitle || "Game of Thrones Edition"} onChange={(e) => updateMenu("subtitle", e.target.value)}
              style={{ ...textInput(!!devData.menuConfig?.subtitle), width: "100%" }} />
          </div>

          <div style={section}>
            <span style={label}>Стиль кнопок</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[["default", "Стандарт"], ["glass", "Стекло"], ["neon", "Неон"], ["minimal", "Минимал"]].map(([val, lbl]) => (
                <button key={val} onClick={() => updateMenu("buttonStyle", val)} style={{
                  padding: "5px 12px", fontSize: 10, cursor: "pointer",
                  background: (devData.menuConfig?.buttonStyle || "default") === val ? `${accent}33` : S.bg,
                  color: (devData.menuConfig?.buttonStyle || "default") === val ? accent : S.textDim,
                  border: `1px solid ${(devData.menuConfig?.buttonStyle || "default") === val ? accent + "66" : S.border}`,
                  borderRadius: 4, fontFamily: devData?.font || S.font,
                }}>{lbl}</button>
              ))}
            </div>
          </div>

          {/* Per-button customization */}
          <div style={section}>
            <span style={label}>Кнопки меню</span>
            <div style={{ fontSize: 9, color: S.textDim, marginBottom: 6 }}>Иконка, текст и цвет каждой кнопки.</div>
            {[
              ["play", "ИГРАТЬ", "⚔️"],
              ["settings", "НАСТРОЙКИ", "⚙️"],
              ["friends", "ДРУЗЬЯ", "👥"],
              ["rules", "ПРАВИЛА", "📜"],
            ].map(([key, defaultLabel, defaultIcon]) => {
              const btnCfg = devData.menuConfig?.buttons?.[key] || {};
              const updateBtn = (field, value) => {
                const buttons = { ...(devData.menuConfig?.buttons || {}) };
                buttons[key] = { ...(buttons[key] || {}), [field]: value };
                updateMenu("buttons", buttons);
              };
              const clearBtn2 = (field) => {
                const buttons = { ...(devData.menuConfig?.buttons || {}) };
                if (buttons[key]) { delete buttons[key][field]; if (Object.keys(buttons[key]).length === 0) delete buttons[key]; }
                updateMenu("buttons", buttons);
              };
              return (
                <div key={key} style={{ marginBottom: 8, padding: 6, background: S.bg, borderRadius: 6, border: `1px solid ${S.border}` }}>
                  <div style={{ fontSize: 10, color: accent, fontWeight: "bold", marginBottom: 4 }}>{defaultLabel}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 9, color: S.textDim }}>Иконка</span>
                      <input type="text" value={btnCfg.icon ?? defaultIcon} onChange={(e) => updateBtn("icon", e.target.value)}
                        style={{ width: 36, textAlign: "center", fontSize: 16, padding: "2px", background: S.bg3, border: `1px solid ${S.border}`, borderRadius: 4, color: S.text }} />
                      {btnCfg.icon && <button onClick={() => clearBtn2("icon")} style={clearBtn}>↩</button>}
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", flex: 1, minWidth: 100 }}>
                      <span style={{ fontSize: 9, color: S.textDim }}>Текст</span>
                      <input type="text" value={btnCfg.label ?? ""} onChange={(e) => updateBtn("label", e.target.value)}
                        placeholder={defaultLabel}
                        style={{ ...textInput(!!btnCfg.label), flex: 1 }} />
                      {btnCfg.label && <button onClick={() => clearBtn2("label")} style={clearBtn}>↩</button>}
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 9, color: S.textDim }}>Цвет</span>
                      <input type="color" value={btnCfg.color || accent} onChange={(e) => updateBtn("color", e.target.value)} style={colorInput} />
                      {btnCfg.color && <button onClick={() => clearBtn2("color")} style={clearBtn}>↩</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Menu toggles */}
          <div style={section}>
            <span style={label}>Элементы меню</span>
            {[
              ["showParticles", "Частицы"],
              ["showGrid", "Сетка"],
              ["showVignette", "Виньетка"],
              ["dragonButton", "Кнопка дракона (мини-игра)"],
            ].map(([key, lbl]) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 11, color: S.text, marginBottom: 4 }}>
                <input type="checkbox" checked={devData.menuConfig?.[key] !== false} onChange={(e) => updateMenu(key, e.target.checked)} style={{ accentColor: accent }} />
                {lbl}
              </label>
            ))}
          </div>

          {/* Flappy Dragon config */}
          <div style={section}>
            <span style={label}>Flappy Dragon (мини-игра)</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: S.textDim }}>Дракон</span>
              <input type="text" value={devData.flappyConfig?.dragonEmoji || "🐉"} onChange={(e) => saveToServer({ ...devData, flappyConfig: { ...(devData.flappyConfig || {}), dragonEmoji: e.target.value } })}
                style={{ width: 40, textAlign: "center", fontSize: 18, padding: "2px", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 4, color: S.text }} />
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
              {[
                ["pipeColor", "Трубы", "#50c878"],
                ["bgColor", "Фон", "#0a0a1a"],
                ["groundColor", "Земля", "#1a1a2e"],
              ].map(([key, lbl, def]) => (
                <div key={key} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: S.textDim }}>{lbl}</span>
                  <input type="color" value={devData.flappyConfig?.[key] || def} onChange={(e) => saveToServer({ ...devData, flappyConfig: { ...(devData.flappyConfig || {}), [key]: e.target.value } })} style={colorInput} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: S.textDim, marginBottom: 4 }}>Картинка дракона</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button onClick={() => { setUploadTarget("flappy_dragon"); setTimeout(() => fileRef.current?.click(), 0); }} style={smallBtn}>
                {devData.flappyConfig?.dragonImage ? "Заменить" : "Загрузить"}
              </button>
              {devData.flappyConfig?.dragonImage && (<>
                <img src={devData.flappyConfig.dragonImage} style={{ width: 24, height: 24, objectFit: "contain" }} />
                <button onClick={() => saveToServer({ ...devData, flappyConfig: { ...(devData.flappyConfig || {}), dragonImage: null } })} style={clearBtn}>✕</button>
              </>)}
            </div>
          </div>
        </>)}

        {/* ===================== BUTTONS TAB ===================== */}
        {tab === "buttons" && (<>
          <div style={section}>
            <span style={label}>Кнопки игрового экрана</span>
            <div style={{ fontSize: 9, color: S.textDim, marginBottom: 8 }}>Настройте внешний вид кнопок: иконку (эмодзи или картинка), цвета, скругление.</div>
            {[
              ["rollDice", "Бросить кубики", "🎲"],
              ["buy", "Купить", "💰"],
              ["auction", "Аукцион", "📢"],
              ["endTurn", "Завершить ход", "→"],
              ["pause", "Пауза", "⏸"],
              ["chat", "Чат", "💬"],
              ["properties", "Владения", "🏘"],
              ["menu", "Меню (☰)", "☰"],
            ].map(([key, lbl, defIcon]) => {
              const cfg = devData.gameButtons?.[key] || {};
              return (
                <div key={key} style={{ marginBottom: 10, padding: 8, background: S.bg, borderRadius: 6, border: `1px solid ${S.border}` }}>
                  <div style={{ fontSize: 11, color: accent, fontWeight: "bold", marginBottom: 6 }}>{lbl}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {/* Icon emoji */}
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 9, color: S.textDim }}>Иконка</span>
                      <input type="text" value={cfg.icon ?? defIcon} onChange={(e) => updateGameButton(key, "icon", e.target.value)}
                        style={{ width: 36, textAlign: "center", fontSize: 16, padding: "2px", background: S.bg3, border: `1px solid ${S.border}`, borderRadius: 4, color: S.text }} />
                      {cfg.icon && <button onClick={() => clearGameButton(key, "icon")} style={clearBtn}>↩</button>}
                    </div>
                    {/* Icon image upload */}
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <button onClick={() => triggerUpload(`gamebtn:${key}`)} style={smallBtn}>
                        {cfg.iconImage ? "📷" : "+📷"}
                      </button>
                      {cfg.iconImage && (<>
                        <img src={cfg.iconImage} style={{ width: 20, height: 20, objectFit: "contain", borderRadius: 3 }} />
                        <button onClick={() => clearGameButton(key, "iconImage")} style={clearBtn}>✕</button>
                      </>)}
                    </div>
                    {/* Background color */}
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 9, color: S.textDim }}>Фон</span>
                      <input type="color" value={cfg.bgColor || accent} onChange={(e) => updateGameButton(key, "bgColor", e.target.value)} style={colorInput} />
                      {cfg.bgColor && <button onClick={() => clearGameButton(key, "bgColor")} style={clearBtn}>↩</button>}
                    </div>
                    {/* Text color */}
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 9, color: S.textDim }}>Текст</span>
                      <input type="color" value={cfg.textColor || "#0a0a12"} onChange={(e) => updateGameButton(key, "textColor", e.target.value)} style={colorInput} />
                      {cfg.textColor && <button onClick={() => clearGameButton(key, "textColor")} style={clearBtn}>↩</button>}
                    </div>
                  </div>
                  {/* Border radius */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6 }}>
                    <span style={{ fontSize: 9, color: S.textDim }}>Скругление</span>
                    <input type="range" min="0" max="24" step="1" value={cfg.borderRadius ?? 8}
                      onChange={(e) => updateGameButton(key, "borderRadius", parseInt(e.target.value))} style={{ ...sliderStyle, maxWidth: 120 }} />
                    <span style={{ fontSize: 9, color: S.textDim }}>{cfg.borderRadius ?? 8}px</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={section}>
            <span style={label}>Иконки интерфейса (загрузка картинок)</span>
            <div style={{ fontSize: 9, color: S.textDim, marginBottom: 8 }}>Замените стандартные иконки на свои картинки.</div>
            {[
              ["flappyButton", "Кнопка дракона (меню)"],
              ["profileButton", "Кнопка профиля (меню)"],
              ["playIcon", "Иконка ИГРАТЬ"],
              ["settingsIcon", "Иконка НАСТРОЙКИ"],
              ["friendsIcon", "Иконка ДРУЗЬЯ"],
              ["rulesIcon", "Иконка ПРАВИЛА"],
            ].map(([key, lbl]) => (
              <div key={key} style={{ ...row, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: S.text, flex: 1, minWidth: 100 }}>{lbl}</span>
                <button onClick={() => triggerUpload(`customicon:${key}`)} style={smallBtn}>
                  {devData.customIcons?.[key] ? "Заменить" : "Загрузить"}
                </button>
                {devData.customIcons?.[key] && (<>
                  <img src={devData.customIcons[key]} style={{ width: 24, height: 24, objectFit: "contain", borderRadius: 4 }} />
                  <button onClick={() => updateCustomIcon(key, null)} style={clearBtn}>✕</button>
                </>)}
              </div>
            ))}
          </div>
        </>)}

        {/* ===================== TEXT TAB ===================== */}
        {tab === "text" && (<>
          <div style={section}>
            <span style={label}>Центр поля</span>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: S.textDim }}>Эмодзи</span>
              <input type="text" value={devData.centerEmoji || "⚔️"} onChange={(e) => update("centerEmoji", e.target.value)}
                style={{ ...textInput(!!devData.centerEmoji), width: "100%", textAlign: "center", fontSize: 22, padding: "6px" }} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: S.textDim }}>Заголовок</span>
              <input type="text" value={devData.gameTitle || "KIRSHAS"} onChange={(e) => update("gameTitle", e.target.value)} style={{ ...textInput(!!devData.gameTitle), width: "100%" }} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: S.textDim }}>Подзаголовок</span>
              <input type="text" value={devData.gameSubtitle || "MONOPOLIA"} onChange={(e) => update("gameSubtitle", e.target.value)} style={{ ...textInput(!!devData.gameSubtitle), width: "100%" }} />
            </div>
          </div>

          <div style={section}>
            <span style={label}>Гербы домов</span>
            {HOUSE_KEYS.map((key) => {
              const house = HOUSES[key];
              return (<div key={key} style={row}>
                <span style={{ fontSize: 11, color: devData.houseColors?.[key] || house.color, minWidth: 70 }}>{house.name.ru}</span>
                <input type="text" value={devData.houseSigils?.[key] || house.sigil} onChange={(e) => updateNested("houseSigils", key, e.target.value)}
                  style={{ width: 40, textAlign: "center", fontSize: 18, padding: "2px", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 4, color: S.text }} />
                {devData.houseSigils?.[key] && <button onClick={() => deleteNested("houseSigils", key)} style={clearBtn}>↩</button>}
              </div>);
            })}
          </div>

          <div style={section}>
            <span style={label}>Названия клеток</span>
            <input type="text" placeholder="Поиск..." value={cellSearch} onChange={(e) => setCellSearch(e.target.value)}
              style={{ ...textInput(false), width: "100%", marginBottom: 6 }} />
            <div style={{ maxHeight: 350, overflow: "auto" }}>
              {filteredCells.map((cell) => (
                <div key={cell.id} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: S.textDim, minWidth: 20, textAlign: "right" }}>#{cell.id}</span>
                  <input value={devData.cellNames?.[cell.id] ?? cell.name} onChange={(e) => updateNested("cellNames", cell.id, e.target.value)} style={textInput(devData.cellNames?.[cell.id] !== undefined)} />
                  {devData.cellNames?.[cell.id] !== undefined && <button onClick={() => deleteNested("cellNames", cell.id)} style={clearBtn}>↩</button>}
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* ===================== STYLES TAB ===================== */}
        {tab === "styles" && (<>
          <div style={section}>
            <span style={label}>Шрифт</span>
            <select value={devData.font || FONTS[0]} onChange={(e) => update("font", e.target.value)} style={{
              width: "100%", padding: "6px 8px", background: S.bg, color: S.text,
              border: `1px solid ${S.border}`, borderRadius: 4, fontSize: 12, fontFamily: devData.font || S.font,
            }}>
              {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f.split(",")[0].replace(/'/g, "")}</option>)}
            </select>
            {devData.font && <button onClick={() => update("font", null)} style={{ ...clearBtn, marginTop: 4, fontSize: 11 }}>↩ Сбросить</button>}
          </div>

          <div style={section}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: S.text }}>
              <input type="checkbox" checked={devData.showGrid !== false} onChange={(e) => update("showGrid", e.target.checked)} style={{ accentColor: accent }} />
              Сетка на поле
            </label>
          </div>

          <div style={section}>
            <span style={label}>Размеры элементов</span>
            {[
              ["emojiSize", "Эмодзи", 48, 16, 120],
              ["titleSize", "Заголовок", 22, 10, 60],
              ["subtitleSize", "Подзаголовок", 12, 6, 40],
              ["diceSize", "Кубики", 56, 30, 100],
              ["cellIconSize", "Иконки клеток", 22, 10, 50],
              ["tokenSize", "Фишки игроков", 13, 8, 30],
            ].map(([key, lbl, def, min, max]) => (
              <div key={key} style={{ ...row, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: S.textDim, minWidth: isMobile ? 60 : 100 }}>{lbl}</span>
                <input type="range" min={min} max={max} step="1" value={devData.layout?.[key] ?? def}
                  onChange={(e) => updateLayout(key, parseInt(e.target.value))} style={sliderStyle} />
                <span style={{ fontSize: 10, color: S.textDim, minWidth: 25, textAlign: "right" }}>{devData.layout?.[key] ?? def}</span>
                {devData.layout?.[key] != null && <button onClick={() => updateLayout(key, null)} style={clearBtn}>↩</button>}
              </div>
            ))}
          </div>
        </>)}

        {/* ===================== UI DESIGN TAB ===================== */}
        {tab === "ui" && (<>
          <div style={section}>
            <span style={label}>Страницы (фон, текст)</span>
            {[
              ["pageBg", "Фон страниц", S.bg],
              ["pageBg2", "Фон карточек", S.bg3],
              ["pageText", "Текст", S.text],
              ["pageTextDim", "Тусклый текст", S.textDim],
            ].map(([key, lbl, def]) => (
              <div key={key} style={row}>
                <span style={{ fontSize: 11, color: S.textDim, minWidth: 90 }}>{lbl}</span>
                <input type="color" value={devData.uiConfig?.[key] || def} onChange={(e) => updateUI(key, e.target.value)} style={colorInput} />
                <span style={{ fontSize: 9, color: S.textDim }}>{devData.uiConfig?.[key] || "—"}</span>
                {devData.uiConfig?.[key] && <button onClick={() => updateUI(key, null)} style={clearBtn}>↩</button>}
              </div>
            ))}
          </div>

          <div style={section}>
            <span style={label}>Панели (игра)</span>
            {[
              ["panelBg", "Фон панели", S.bg2],
              ["panelBorder", "Рамка панели", S.border],
              ["floatingBtnBg", "Фон плав. кнопок", "#0a0a12"],
              ["floatingBtnBorder", "Рамка плав. кнопок", S.gold],
            ].map(([key, lbl, def]) => (
              <div key={key} style={row}>
                <span style={{ fontSize: 11, color: S.textDim, minWidth: 90 }}>{lbl}</span>
                <input type="color" value={devData.uiConfig?.[key] || def} onChange={(e) => updateUI(key, e.target.value)} style={colorInput} />
                <span style={{ fontSize: 9, color: S.textDim }}>{devData.uiConfig?.[key] || "—"}</span>
                {devData.uiConfig?.[key] && <button onClick={() => updateUI(key, null)} style={clearBtn}>↩</button>}
              </div>
            ))}
          </div>

          <div style={section}>
            <span style={label}>Инфо-бар / Сообщения</span>
            {[
              ["infoBarBg", "Фон инфо-бара", "#0a0a12"],
              ["infoBarBorder", "Рамка инфо-бара", S.gold],
              ["messageBg", "Фон сообщений", "#0a0a12"],
              ["messageColor", "Текст сообщений", S.text],
            ].map(([key, lbl, def]) => (
              <div key={key} style={row}>
                <span style={{ fontSize: 11, color: S.textDim, minWidth: 90 }}>{lbl}</span>
                <input type="color" value={devData.uiConfig?.[key] || (typeof def === 'string' && def[0] === '#' ? def : "#0a0a12")} onChange={(e) => updateUI(key, e.target.value)} style={colorInput} />
                <span style={{ fontSize: 9, color: S.textDim }}>{devData.uiConfig?.[key] || "—"}</span>
                {devData.uiConfig?.[key] && <button onClick={() => updateUI(key, null)} style={clearBtn}>↩</button>}
              </div>
            ))}
          </div>

          <div style={section}>
            <span style={label}>Карточки / Попапы</span>
            {[
              ["cardBg", "Фон карточки", S.bg3],
              ["cardBorder", "Рамка карточки", S.border],
              ["popupBg", "Фон попапа", "#12121e"],
              ["popupBorder", "Рамка попапа", S.gold],
              ["popupOverlay", "Затемнение", "rgba(0,0,0,0.7)"],
            ].map(([key, lbl, def]) => (
              <div key={key} style={row}>
                <span style={{ fontSize: 11, color: S.textDim, minWidth: 90 }}>{lbl}</span>
                <input type="color" value={devData.uiConfig?.[key] || (typeof def === 'string' && def[0] === '#' ? def : "#000000")} onChange={(e) => updateUI(key, e.target.value)} style={colorInput} />
                <span style={{ fontSize: 9, color: S.textDim }}>{devData.uiConfig?.[key] || "—"}</span>
                {devData.uiConfig?.[key] && <button onClick={() => updateUI(key, null)} style={clearBtn}>↩</button>}
              </div>
            ))}
          </div>

          <div style={section}>
            <span style={label}>Чат</span>
            {[
              ["chatBg", "Фон чата", S.bg2],
              ["chatBorder", "Рамка чата", S.gold],
            ].map(([key, lbl, def]) => (
              <div key={key} style={row}>
                <span style={{ fontSize: 11, color: S.textDim, minWidth: 90 }}>{lbl}</span>
                <input type="color" value={devData.uiConfig?.[key] || def} onChange={(e) => updateUI(key, e.target.value)} style={colorInput} />
                {devData.uiConfig?.[key] && <button onClick={() => updateUI(key, null)} style={clearBtn}>↩</button>}
              </div>
            ))}
          </div>

          <div style={section}>
            <span style={label}>Заголовки страниц</span>
            {[
              ["settingsTitle", "Настройки"],
              ["rulesTitle", "Правила"],
              ["setupTitle", "Настройка партии"],
            ].map(([key, lbl]) => (
              <div key={key} style={{ ...row, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: S.textDim, minWidth: 90 }}>{lbl}</span>
                <input type="text" value={devData.uiConfig?.[key] || ""} onChange={(e) => updateUI(key, e.target.value)} placeholder={lbl}
                  style={{ ...textInput(!!devData.uiConfig?.[key]), flex: 1 }} />
                {devData.uiConfig?.[key] && <button onClick={() => updateUI(key, null)} style={clearBtn}>↩</button>}
              </div>
            ))}
          </div>

          <div style={section}>
            <span style={label}>Победный экран</span>
            <div style={row}>
              <span style={{ fontSize: 11, color: S.textDim, minWidth: 90 }}>Фон</span>
              <input type="color" value={devData.uiConfig?.victoryBg || "#1a1a0e"} onChange={(e) => updateUI("victoryBg", e.target.value)} style={colorInput} />
              {devData.uiConfig?.victoryBg && <button onClick={() => updateUI("victoryBg", null)} style={clearBtn}>↩</button>}
            </div>
          </div>
        </>)}

        {/* ===================== SYSTEM TAB ===================== */}
        {tab === "system" && (<>
          <div style={section}>
            <span style={label}>Статус</span>
            <div style={row}>
              <span style={{ fontSize: 11, color: serverStatus === "connected" ? "#50c878" : "#ff6b6b" }}>
                ● {serverStatus === "connected" ? "Синхронизировано" : "Оффлайн"}
              </span>
            </div>
          </div>

          <div style={section}>
            <span style={label}>Экспорт / Импорт</span>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button onClick={exportConfig} style={{ ...smallBtn, flex: 1, textAlign: "center", padding: "8px" }}>📥 Скачать</button>
              <button onClick={() => importRef.current?.click()} style={{ ...smallBtn, flex: 1, textAlign: "center", padding: "8px" }}>📤 Загрузить</button>
            </div>
          </div>

          <div style={section}>
            <span style={label}>Бэкапы</span>
            <button onClick={loadBackups} style={{ ...smallBtn, marginBottom: 8 }}>Обновить</button>
            {backups.length === 0 ? <div style={{ fontSize: 11, color: S.textDim }}>Нет бэкапов</div> : (
              <div style={{ maxHeight: 200, overflow: "auto" }}>
                {backups.map((name) => (
                  <div key={name} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: S.textDim, flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{name.replace('backup-', '').replace('.json', '')}</span>
                    <button onClick={() => restoreBackup(name)} style={{ ...smallBtn, padding: "2px 8px", fontSize: 10 }}>↩</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={section}>
            <button onClick={resetAll} style={{ ...btnOutline({ width: "100%", textAlign: "center", padding: "8px", fontSize: 12 }), color: "#ff6b6b", borderColor: "#ff6b6b44" }}>Сбросить всё</button>
          </div>

          <div style={section}>
            <button onClick={() => { sessionStorage.removeItem('devAuth'); sessionStorage.removeItem('devPassword'); setAuthenticated(false); setPassword(''); }}
              style={btnOutline({ width: "100%", textAlign: "center", padding: "8px", fontSize: 12 })}>Выйти</button>
          </div>

          <div style={{ marginTop: 8, fontSize: 10, color: S.textDim }}>~{(JSON.stringify(devData).length / 1024).toFixed(1)} KB</div>
        </>)}
      </div>
    </div>
  );
}
