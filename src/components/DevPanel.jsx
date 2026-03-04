import { useState, useRef, useEffect, useCallback } from 'react';
import { S, btnOutline } from '../theme';
import { HOUSES } from '../gameData';

// ============================================================
// DEFAULT CONFIG
// ============================================================
const DEFAULT_DEV_DATA = {
  cellTextures: {}, boardBg: null, tokenTextures: {}, buildingTextures: {},
  cellNames: {}, gameTitle: null, gameSubtitle: null, centerEmoji: null, houseSigils: {},
  accentColor: null, boardBgColor: null, boardBorderColor: null, diceColor: null,
  houseColors: {}, playerColors: {}, cellBgColors: {},
  audio: {},
  volume: { master: 1.0, music: 0.5, effects: 0.7, ambient: 0.3 },
  font: null, showGrid: true,
  layout: { emojiSize: null, titleSize: null, subtitleSize: null, diceSize: null },
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
  ["menuMusic", "Музыка меню"],
  ["gameMusic", "Игровой процесс"],
  ["battleMusic", "Битвы / напряжение"],
  ["winterMusic", "Зимний режим"],
];

const SFX_KEYS = [
  ["dice", "Кубики"],
  ["buy", "Покупка"],
  ["move", "Передвижение"],
  ["jail", "Тюрьма / Стена"],
  ["victory", "Победа"],
  ["click", "Клик / UI"],
];

// ============================================================
// HELPER: hex to rgba
// ============================================================
const rgba = (hex, a) => {
  if (!hex || hex[0] !== '#') return `rgba(201,168,76,${a})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// ============================================================
// DEV PANEL COMPONENT
// ============================================================
export default function DevPanel({ game, devData, setDevData, onClose }) {
  // --- AUTH ---
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // --- STATE ---
  const [tab, setTab] = useState("textures");
  const [saving, setSaving] = useState(false);
  const [selectedCellId, setSelectedCellId] = useState(0);
  const [backups, setBackups] = useState([]);
  const [serverStatus, setServerStatus] = useState("unknown");

  // --- REFS ---
  const fileRef = useRef(null);
  const audioFileRef = useRef(null);
  const importRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [audioUploadKey, setAudioUploadKey] = useState(null);
  const saveTimer = useRef(null);
  const previewAudioRef = useRef(null);

  // Check session auth
  useEffect(() => {
    if (sessionStorage.getItem('devAuth') === 'true') setAuthenticated(true);
  }, []);

  // Check server status
  useEffect(() => {
    fetch('/api/dev/config').then(r => { if (r.ok) setServerStatus("connected"); else setServerStatus("error"); })
      .catch(() => setServerStatus("offline"));
  }, []);

  // --- AUTH ---
  const authenticate = async () => {
    setAuthLoading(true);
    setAuthError(false);
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

  // --- SAVE TO SERVER (debounced) ---
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

  // --- FILE UPLOAD (images) ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      if (uploadTarget?.startsWith("cell:")) {
        updateNested("cellTextures", parseInt(uploadTarget.split(":")[1]), dataUrl);
      } else if (uploadTarget === "board") {
        update("boardBg", dataUrl);
      } else if (uploadTarget?.startsWith("token:")) {
        updateNested("tokenTextures", parseInt(uploadTarget.split(":")[1]), dataUrl);
      } else if (uploadTarget?.startsWith("building:")) {
        updateNested("buildingTextures", uploadTarget.split(":")[1], dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const triggerUpload = (target) => {
    setUploadTarget(target);
    setTimeout(() => fileRef.current?.click(), 0);
  };

  // --- AUDIO UPLOAD ---
  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !audioUploadKey) return;
    setSaving(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const data = ev.target.result;
        await fetch('/api/dev/upload/audio', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: sessionStorage.getItem('devPassword'),
            key: audioUploadKey, data, filename: file.name,
          }),
        });
        // Refresh config
        const res = await fetch('/api/dev/config');
        const cfg = await res.json();
        if (cfg.config) {
          setDevData(cfg.config);
          try { localStorage.setItem('devData', JSON.stringify(cfg.config)); } catch {}
        }
        setSaving(false);
      };
      reader.readAsDataURL(file);
    } catch { setSaving(false); }
    e.target.value = "";
  };

  const triggerAudioUpload = (key) => {
    setAudioUploadKey(key);
    setTimeout(() => audioFileRef.current?.click(), 0);
  };

  const deleteAudio = async (key) => {
    setSaving(true);
    try {
      await fetch('/api/dev/delete/audio', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: sessionStorage.getItem('devPassword'), key }),
      });
      const res = await fetch('/api/dev/config');
      const cfg = await res.json();
      if (cfg.config) { setDevData(cfg.config); try { localStorage.setItem('devData', JSON.stringify(cfg.config)); } catch {} }
    } catch {}
    setSaving(false);
  };

  // --- AUDIO PREVIEW ---
  const playPreview = (url) => {
    stopPreview();
    previewAudioRef.current = new Audio(url);
    previewAudioRef.current.volume = (devData.volume?.master ?? 1) * (devData.volume?.music ?? 0.5);
    previewAudioRef.current.play().catch(() => {});
  };
  const stopPreview = () => {
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; }
  };

  // --- BACKUPS ---
  const loadBackups = async () => {
    try {
      const res = await fetch('/api/dev/backups');
      const data = await res.json();
      setBackups(data.backups || []);
    } catch { setBackups([]); }
  };

  const restoreBackup = async (name) => {
    if (!confirm(`Восстановить из бэкапа ${name}?`)) return;
    setSaving(true);
    try {
      await fetch('/api/dev/restore', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: sessionStorage.getItem('devPassword'), backup: name }),
      });
      const res = await fetch('/api/dev/config');
      const cfg = await res.json();
      if (cfg.config) { setDevData(cfg.config); try { localStorage.setItem('devData', JSON.stringify(cfg.config)); } catch {} }
    } catch {}
    setSaving(false);
  };

  // --- EXPORT / IMPORT ---
  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(devData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'kirshas-dev-config.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const config = JSON.parse(ev.target.result);
        const merged = { ...DEFAULT_DEV_DATA, ...config };
        setSaving(true);
        await fetch('/api/dev/import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: sessionStorage.getItem('devPassword'), config: merged }),
        });
        setDevData(merged);
        try { localStorage.setItem('devData', JSON.stringify(merged)); } catch {}
        setSaving(false);
      } catch { alert("Ошибка чтения файла"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const resetAll = async () => {
    if (!confirm("Сбросить ВСЕ настройки Dev Panel? Бэкап будет создан автоматически.")) return;
    setSaving(true);
    try {
      await fetch('/api/dev/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: sessionStorage.getItem('devPassword') }),
      });
      const fresh = { ...DEFAULT_DEV_DATA };
      setDevData(fresh);
      try { localStorage.setItem('devData', JSON.stringify(fresh)); } catch {}
    } catch {}
    setSaving(false);
  };

  // ============================================================
  // STYLES
  // ============================================================
  const accent = devData?.accentColor || S.gold;
  const section = { background: S.bg3, borderRadius: 8, padding: 10, border: `1px solid ${S.border}`, marginBottom: 10 };
  const label = { color: accent, fontSize: 12, fontWeight: "bold", marginBottom: 6, display: "block" };
  const row = { display: "flex", gap: 8, alignItems: "center", marginBottom: 6 };
  const smallBtn = btnOutline({ padding: "4px 10px", fontSize: 11 });
  const clearBtn = { background: "transparent", border: "none", color: "#ff6b6b", cursor: "pointer", fontSize: 12, padding: "2px 4px" };
  const colorInput = { width: 32, height: 24, border: "none", cursor: "pointer", borderRadius: 4, background: "transparent" };
  const textInput = (active) => ({
    flex: 1, padding: "4px 8px", background: S.bg, color: S.text,
    border: `1px solid ${active ? accent + "66" : S.border}`,
    borderRadius: 4, fontFamily: devData?.font || S.font, fontSize: 11,
  });
  const sliderStyle = { flex: 1, cursor: "pointer", accentColor: accent };

  const tabs = [
    ["textures", "Текстуры"],
    ["colors", "Цвета"],
    ["audio", "Аудио"],
    ["text", "Текст"],
    ["styles", "Стили"],
    ["system", "Система"],
  ];

  // ============================================================
  // AUTH SCREEN
  // ============================================================
  if (!authenticated) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 380,
        background: S.bg2, borderRight: `1px solid ${S.gold}33`,
        zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        boxShadow: "4px 0 20px rgba(0,0,0,0.5)", gap: 16,
      }}>
        <div style={{ fontSize: 48, animation: "float 4s ease-in-out infinite" }}>🔒</div>
        <div style={{ color: S.gold, fontWeight: "bold", fontSize: 18, fontFamily: S.font, letterSpacing: 2 }}>DEV PANEL</div>
        <div style={{ color: S.textDim, fontSize: 12, fontFamily: S.font }}>Введите пароль разработчика</div>
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setAuthError(false); }}
          onKeyDown={(e) => e.key === 'Enter' && authenticate()}
          placeholder="Winter is coming..."
          style={{
            width: 220, padding: "10px 16px", background: S.bg, color: S.text,
            border: `1px solid ${authError ? '#ff6b6b' : S.border}`,
            borderRadius: 8, fontFamily: S.font, fontSize: 14, textAlign: "center",
            outline: "none",
          }}
          autoFocus
        />
        {authError && <div style={{ color: "#ff6b6b", fontSize: 12 }}>Неверный пароль</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={authenticate} disabled={authLoading} style={{
            ...btnOutline({ padding: "8px 24px", fontSize: 13 }),
            opacity: authLoading ? 0.5 : 1,
          }}>{authLoading ? "..." : "Войти"}</button>
          <button onClick={onClose} style={btnOutline({ padding: "8px 16px", fontSize: 13, color: S.textDim, borderColor: S.textDim + "44" })}>Закрыть</button>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN PANEL
  // ============================================================
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, bottom: 0, width: 380,
      background: S.bg2, borderRight: `1px solid ${accent}33`,
      zIndex: 100, display: "flex", flexDirection: "column",
      boxShadow: "4px 0 20px rgba(0,0,0,0.5)",
      animation: "slideInLeft 0.3s ease-out",
      fontFamily: devData?.font || S.font,
    }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />
      <input ref={audioFileRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={handleAudioUpload} />
      <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />

      {/* Header */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: accent, fontWeight: "bold", fontSize: 15 }}>Dev Panel</span>
          {saving && <span style={{ fontSize: 10, color: S.textDim, animation: "pulse 1s infinite" }}>Сохранение...</span>}
          <span style={{ fontSize: 8, color: serverStatus === "connected" ? "#50c878" : "#ff6b6b" }}>● {serverStatus === "connected" ? "SYNC" : "OFFLINE"}</span>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: S.textDim, fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${S.border}`, flexShrink: 0, flexWrap: "wrap" }}>
        {tabs.map(([key, lbl]) => (
          <button key={key} onClick={() => { setTab(key); if (key === "system") loadBackups(); }} style={{
            flex: 1, padding: "7px 2px", minWidth: 55,
            background: tab === key ? `${accent}22` : "transparent",
            color: tab === key ? accent : S.textDim, border: "none",
            borderBottom: tab === key ? `2px solid ${accent}` : "2px solid transparent",
            cursor: "pointer", fontSize: 10, fontFamily: devData?.font || S.font,
          }}>{lbl}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 10 }}>

        {/* ===================== TEXTURES TAB ===================== */}
        {tab === "textures" && (<>
          {/* Board BG */}
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

          {/* Cell Icons */}
          <div style={section}>
            <span style={label}>Иконки клеток</span>
            <select value={selectedCellId} onChange={(e) => setSelectedCellId(Number(e.target.value))} style={{
              width: "100%", padding: "5px 8px", background: S.bg, color: S.text,
              border: `1px solid ${S.border}`, borderRadius: 4, fontSize: 11, marginBottom: 6,
            }}>
              {game?.cells?.map((cell) => (
                <option key={cell.id} value={cell.id}>#{cell.id} — {devData.cellNames?.[cell.id] || cell.name}</option>
              ))}
            </select>
            <div style={row}>
              <button onClick={() => triggerUpload(`cell:${selectedCellId}`)} style={smallBtn}>
                {devData.cellTextures?.[selectedCellId] ? "Заменить" : "Загрузить"}
              </button>
              {devData.cellTextures?.[selectedCellId] && (<>
                <img src={devData.cellTextures[selectedCellId]} style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover" }} />
                <button onClick={() => deleteNested("cellTextures", selectedCellId)} style={clearBtn}>✕</button>
              </>)}
            </div>
            {Object.keys(devData.cellTextures || {}).length > 0 && (
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 6 }}>
                {Object.entries(devData.cellTextures).map(([id, url]) => (
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

          {/* Token Images */}
          <div style={section}>
            <span style={label}>Фишки игроков</span>
            {game?.players?.map((p) => (
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

          {/* Building Textures */}
          <div style={section}>
            <span style={label}>Текстуры зданий</span>
            {[["house", "Дом 🏠"], ["castle", "Замок 🏰"]].map(([key, lbl]) => (
              <div key={key} style={{ ...row, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: S.text, minWidth: 70 }}>{lbl}</span>
                <button onClick={() => triggerUpload(`building:${key}`)} style={smallBtn}>
                  {devData.buildingTextures?.[key] ? "Заменить" : "Загрузить"}
                </button>
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
          {/* Accent Color */}
          <div style={section}>
            <span style={label}>Акцентный цвет (золото)</span>
            <div style={row}>
              <input type="color" value={devData.accentColor || S.gold} onChange={(e) => update("accentColor", e.target.value)} style={colorInput} />
              <span style={{ fontSize: 11, color: S.text }}>{devData.accentColor || S.gold}</span>
              {devData.accentColor && <button onClick={() => update("accentColor", null)} style={clearBtn}>↩</button>}
            </div>
          </div>

          {/* Board Colors */}
          <div style={section}>
            <span style={label}>Цвета поля</span>
            {[
              ["boardBgColor", "Фон поля", "#1a1a2e"],
              ["boardBorderColor", "Рамка поля", "#c9a84c"],
              ["diceColor", "Кубики", "#c9a84c"],
            ].map(([key, lbl, def]) => (
              <div key={key} style={row}>
                <span style={{ fontSize: 11, color: S.textDim, minWidth: 80 }}>{lbl}</span>
                <input type="color" value={devData[key] || def} onChange={(e) => update(key, e.target.value)} style={colorInput} />
                <span style={{ fontSize: 10, color: S.textDim }}>{devData[key] || "default"}</span>
                {devData[key] && <button onClick={() => update(key, null)} style={clearBtn}>↩</button>}
              </div>
            ))}
          </div>

          {/* House Colors */}
          <div style={section}>
            <span style={label}>Цвета домов</span>
            {HOUSE_KEYS.map((key) => {
              const house = HOUSES[key];
              const color = devData.houseColors?.[key] || house.color;
              return (
                <div key={key} style={{ ...row, marginBottom: 8 }}>
                  <input type="color" value={color} onChange={(e) => updateNested("houseColors", key, e.target.value)} style={colorInput} />
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: color, border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: S.text, flex: 1 }}>{house.name.ru} {house.sigil}</span>
                  {devData.houseColors?.[key] && <button onClick={() => deleteNested("houseColors", key)} style={clearBtn}>↩</button>}
                </div>
              );
            })}
          </div>

          {/* Player Colors */}
          <div style={section}>
            <span style={label}>Цвета игроков</span>
            {game?.players?.map((p) => {
              const pColor = devData.playerColors?.[p.id] || p.color;
              return (
                <div key={p.id} style={row}>
                  <input type="color" value={pColor} onChange={(e) => updateNested("playerColors", p.id, e.target.value)} style={colorInput} />
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: pColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: S.text, flex: 1 }}>{p.name}</span>
                  {devData.playerColors?.[p.id] && <button onClick={() => deleteNested("playerColors", p.id)} style={clearBtn}>↩</button>}
                </div>
              );
            })}
          </div>

          {/* Per-cell BG */}
          <div style={section}>
            <span style={label}>Фон клетки #{selectedCellId}</span>
            <div style={row}>
              <input type="color" value={devData.cellBgColors?.[selectedCellId] || "#1a1a2e"} onChange={(e) => updateNested("cellBgColors", selectedCellId, e.target.value)} style={colorInput} />
              <span style={{ fontSize: 10, color: S.textDim }}>{devData.cellBgColors?.[selectedCellId] || "default"}</span>
              {devData.cellBgColors?.[selectedCellId] && <button onClick={() => deleteNested("cellBgColors", selectedCellId)} style={clearBtn}>✕</button>}
            </div>
            <select value={selectedCellId} onChange={(e) => setSelectedCellId(Number(e.target.value))} style={{
              width: "100%", padding: "4px 8px", background: S.bg, color: S.text,
              border: `1px solid ${S.border}`, borderRadius: 4, fontSize: 10, marginTop: 4,
            }}>
              {game?.cells?.map((cell) => (
                <option key={cell.id} value={cell.id}>#{cell.id} — {devData.cellNames?.[cell.id] || cell.name}</option>
              ))}
            </select>
          </div>
        </>)}

        {/* ===================== AUDIO TAB ===================== */}
        {tab === "audio" && (<>
          {/* Volume Controls */}
          <div style={section}>
            <span style={label}>Громкость</span>
            {[
              ["master", "Мастер", 1.0],
              ["music", "Музыка", 0.5],
              ["effects", "Эффекты", 0.7],
              ["ambient", "Атмосфера", 0.3],
            ].map(([key, lbl, def]) => (
              <div key={key} style={{ ...row, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: S.textDim, minWidth: 70 }}>{lbl}</span>
                <input type="range" min="0" max="1" step="0.05"
                  value={devData.volume?.[key] ?? def}
                  onChange={(e) => {
                    const vol = { ...(devData.volume || {}), [key]: parseFloat(e.target.value) };
                    update("volume", vol);
                  }}
                  style={sliderStyle}
                />
                <span style={{ fontSize: 10, color: S.textDim, minWidth: 30, textAlign: "right" }}>
                  {Math.round((devData.volume?.[key] ?? def) * 100)}%
                </span>
              </div>
            ))}
          </div>

          {/* Background Music */}
          <div style={section}>
            <span style={label}>Фоновая музыка (MP3)</span>
            {MUSIC_KEYS.map(([key, lbl]) => (
              <div key={key} style={{ ...row, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: S.textDim, minWidth: 120 }}>{lbl}</span>
                <button onClick={() => triggerAudioUpload(key)} style={smallBtn}>
                  {devData.audio?.[key] ? "Заменить" : "Загрузить"}
                </button>
                {devData.audio?.[key] && (<>
                  <button onClick={() => playPreview(devData.audio[key])} style={{ ...smallBtn, padding: "3px 8px" }}>▶</button>
                  <button onClick={stopPreview} style={{ ...smallBtn, padding: "3px 8px" }}>⏹</button>
                  <button onClick={() => deleteAudio(key)} style={clearBtn}>✕</button>
                </>)}
              </div>
            ))}
          </div>

          {/* Sound Effects */}
          <div style={section}>
            <span style={label}>Звуковые эффекты (MP3)</span>
            {SFX_KEYS.map(([key, lbl]) => {
              const sfxKey = `sfx_${key}`;
              return (
                <div key={key} style={{ ...row, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: S.textDim, minWidth: 100 }}>{lbl}</span>
                  <button onClick={() => triggerAudioUpload(sfxKey)} style={smallBtn}>
                    {devData.audio?.[sfxKey] ? "Заменить" : "Загрузить"}
                  </button>
                  {devData.audio?.[sfxKey] && (<>
                    <button onClick={() => playPreview(devData.audio[sfxKey])} style={{ ...smallBtn, padding: "3px 8px" }}>▶</button>
                    <button onClick={() => deleteAudio(sfxKey)} style={clearBtn}>✕</button>
                  </>)}
                </div>
              );
            })}
          </div>
        </>)}

        {/* ===================== TEXT TAB ===================== */}
        {tab === "text" && (<>
          {/* Title / Subtitle / Emoji */}
          <div style={section}>
            <span style={label}>Центр поля</span>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: S.textDim }}>Эмодзи</span>
              <input type="text" value={devData.centerEmoji || "⚔️"} onChange={(e) => update("centerEmoji", e.target.value)}
                style={{ ...textInput(!!devData.centerEmoji), width: "100%", textAlign: "center", fontSize: 22, padding: "6px" }} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: S.textDim }}>Заголовок</span>
              <input type="text" value={devData.gameTitle || "KIRSHAS"} onChange={(e) => update("gameTitle", e.target.value)}
                style={{ ...textInput(!!devData.gameTitle), width: "100%" }} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: S.textDim }}>Подзаголовок</span>
              <input type="text" value={devData.gameSubtitle || "MONOPOLIA"} onChange={(e) => update("gameSubtitle", e.target.value)}
                style={{ ...textInput(!!devData.gameSubtitle), width: "100%" }} />
            </div>
            {(devData.centerEmoji || devData.gameTitle || devData.gameSubtitle) && (
              <button onClick={() => { update("centerEmoji", null); update("gameTitle", null); update("gameSubtitle", null); }}
                style={{ ...clearBtn, fontSize: 11 }}>↩ Сбросить текст центра</button>
            )}
          </div>

          {/* House Sigils */}
          <div style={section}>
            <span style={label}>Гербы домов</span>
            {HOUSE_KEYS.map((key) => {
              const house = HOUSES[key];
              return (
                <div key={key} style={row}>
                  <span style={{ fontSize: 11, color: devData.houseColors?.[key] || house.color, minWidth: 80 }}>{house.name.ru}</span>
                  <input type="text" value={devData.houseSigils?.[key] || house.sigil}
                    onChange={(e) => updateNested("houseSigils", key, e.target.value)}
                    style={{ width: 40, textAlign: "center", fontSize: 18, padding: "2px", background: S.bg, border: `1px solid ${S.border}`, borderRadius: 4, color: S.text }} />
                  {devData.houseSigils?.[key] && <button onClick={() => deleteNested("houseSigils", key)} style={clearBtn}>↩</button>}
                </div>
              );
            })}
          </div>

          {/* Cell Names */}
          <div style={section}>
            <span style={label}>Названия клеток</span>
            <div style={{ color: S.textDim, fontSize: 9, marginBottom: 6 }}>Жёлтая рамка = изменено. Сохраняется на сервере для всех.</div>
            <div style={{ maxHeight: 400, overflow: "auto" }}>
              {game?.cells?.map((cell) => (
                <div key={cell.id} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 9, color: S.textDim, minWidth: 20, textAlign: "right" }}>#{cell.id}</span>
                  <input
                    value={devData.cellNames?.[cell.id] ?? cell.name}
                    onChange={(e) => updateNested("cellNames", cell.id, e.target.value)}
                    style={textInput(devData.cellNames?.[cell.id] !== undefined)}
                  />
                  {devData.cellNames?.[cell.id] !== undefined && (
                    <button onClick={() => deleteNested("cellNames", cell.id)} style={clearBtn}>↩</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* ===================== STYLES TAB ===================== */}
        {tab === "styles" && (<>
          {/* Font */}
          <div style={section}>
            <span style={label}>Шрифт</span>
            <select value={devData.font || FONTS[0]} onChange={(e) => update("font", e.target.value)} style={{
              width: "100%", padding: "6px 8px", background: S.bg, color: S.text,
              border: `1px solid ${S.border}`, borderRadius: 4, fontSize: 12,
              fontFamily: devData.font || S.font,
            }}>
              {FONTS.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f.split(",")[0].replace(/'/g, "")}</option>
              ))}
            </select>
            {devData.font && <button onClick={() => update("font", null)} style={{ ...clearBtn, marginTop: 4, fontSize: 11 }}>↩ Сбросить</button>}
          </div>

          {/* Grid Toggle */}
          <div style={section}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12, color: S.text }}>
              <input type="checkbox" checked={devData.showGrid !== false} onChange={(e) => update("showGrid", e.target.checked)} style={{ accentColor: accent }} />
              Сетка на поле
            </label>
          </div>

          {/* Size Controls */}
          <div style={section}>
            <span style={label}>Размеры элементов</span>
            {[
              ["emojiSize", "Эмодзи центра", 48, 16, 120],
              ["titleSize", "Заголовок", 22, 10, 60],
              ["subtitleSize", "Подзаголовок", 12, 6, 40],
              ["diceSize", "Кубики", 56, 30, 100],
            ].map(([key, lbl, def, min, max]) => (
              <div key={key} style={{ ...row, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: S.textDim, minWidth: 100 }}>{lbl}</span>
                <input type="range" min={min} max={max} step="1"
                  value={devData.layout?.[key] ?? def}
                  onChange={(e) => updateLayout(key, parseInt(e.target.value))}
                  style={sliderStyle}
                />
                <span style={{ fontSize: 10, color: S.textDim, minWidth: 25, textAlign: "right" }}>
                  {devData.layout?.[key] ?? def}px
                </span>
                {devData.layout?.[key] != null && <button onClick={() => updateLayout(key, null)} style={clearBtn}>↩</button>}
              </div>
            ))}
          </div>
        </>)}

        {/* ===================== SYSTEM TAB ===================== */}
        {tab === "system" && (<>
          {/* Server Status */}
          <div style={section}>
            <span style={label}>Статус сервера</span>
            <div style={row}>
              <span style={{ fontSize: 11, color: serverStatus === "connected" ? "#50c878" : "#ff6b6b" }}>
                ● {serverStatus === "connected" ? "Подключено" : serverStatus === "offline" ? "Оффлайн" : "Ошибка"}
              </span>
            </div>
            <div style={{ fontSize: 10, color: S.textDim, marginTop: 4 }}>
              Все изменения синхронизируются через сервер и применяются для всех игроков.
              Автоматический бэкап создаётся перед каждым сохранением.
            </div>
          </div>

          {/* Export / Import */}
          <div style={section}>
            <span style={label}>Экспорт / Импорт</span>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button onClick={exportConfig} style={{ ...smallBtn, flex: 1, textAlign: "center", padding: "8px" }}>
                Скачать JSON
              </button>
              <button onClick={() => importRef.current?.click()} style={{ ...smallBtn, flex: 1, textAlign: "center", padding: "8px" }}>
                Загрузить JSON
              </button>
            </div>
            <div style={{ fontSize: 9, color: S.textDim }}>
              Экспортируйте пакет настроек для переноса или резервного копирования.
            </div>
          </div>

          {/* Backups */}
          <div style={section}>
            <span style={label}>Бэкапы на сервере</span>
            <button onClick={loadBackups} style={{ ...smallBtn, marginBottom: 8 }}>Обновить список</button>
            {backups.length === 0 ? (
              <div style={{ fontSize: 11, color: S.textDim }}>Нет бэкапов</div>
            ) : (
              <div style={{ maxHeight: 200, overflow: "auto" }}>
                {backups.map((name) => (
                  <div key={name} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: S.textDim, flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {name.replace('backup-', '').replace('.json', '')}
                    </span>
                    <button onClick={() => restoreBackup(name)} style={{ ...smallBtn, padding: "2px 8px", fontSize: 10 }}>Восстановить</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reset */}
          <div style={section}>
            <span style={{ ...label, color: "#ff6b6b" }}>Сброс</span>
            <button onClick={resetAll} style={{
              ...btnOutline({ width: "100%", textAlign: "center", padding: "8px", fontSize: 12 }),
              color: "#ff6b6b", borderColor: "#ff6b6b44",
            }}>
              Сбросить все настройки
            </button>
            <div style={{ fontSize: 9, color: S.textDim, marginTop: 4 }}>
              Бэкап будет создан автоматически перед сбросом.
            </div>
          </div>

          {/* Logout */}
          <div style={section}>
            <button onClick={() => {
              sessionStorage.removeItem('devAuth');
              sessionStorage.removeItem('devPassword');
              setAuthenticated(false);
              setPassword('');
            }} style={btnOutline({ width: "100%", textAlign: "center", padding: "8px", fontSize: 12 })}>
              Выйти из Dev Panel
            </button>
          </div>

          {/* Storage info */}
          <div style={{ marginTop: 8, fontSize: 10, color: S.textDim }}>
            Config size: ~{(JSON.stringify(devData).length / 1024).toFixed(1)} KB
          </div>
        </>)}
      </div>
    </div>
  );
}
