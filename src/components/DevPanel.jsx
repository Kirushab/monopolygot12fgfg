import { useState, useRef } from 'react';
import { S, btnOutline } from '../theme';

const DEFAULT_DEV_DATA = { cellTextures: {}, cellNames: {}, boardBg: null, tokenTextures: {} };

export function loadDevData() {
  try {
    const saved = localStorage.getItem("devData");
    return saved ? { ...DEFAULT_DEV_DATA, ...JSON.parse(saved) } : { ...DEFAULT_DEV_DATA };
  } catch { return { ...DEFAULT_DEV_DATA }; }
}

export default function DevPanel({ game, devData, setDevData, onClose }) {
  const [tab, setTab] = useState("textures");
  const [selectedCellId, setSelectedCellId] = useState(0);
  const fileInputRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);

  const save = (data) => {
    setDevData(data);
    try { localStorage.setItem("devData", JSON.stringify(data)); } catch {}
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const d = { ...devData };
      if (uploadTarget?.startsWith("cell:")) {
        const id = parseInt(uploadTarget.split(":")[1]);
        d.cellTextures = { ...d.cellTextures, [id]: dataUrl };
      } else if (uploadTarget === "board") {
        d.boardBg = dataUrl;
      } else if (uploadTarget?.startsWith("token:")) {
        const id = parseInt(uploadTarget.split(":")[1]);
        d.tokenTextures = { ...d.tokenTextures, [id]: dataUrl };
      }
      save(d);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const triggerUpload = (target) => {
    setUploadTarget(target);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const clearItem = (type, id) => {
    const d = { ...devData };
    if (type === "cell") {
      d.cellTextures = { ...d.cellTextures };
      delete d.cellTextures[id];
    } else if (type === "board") {
      d.boardBg = null;
    } else if (type === "token") {
      d.tokenTextures = { ...d.tokenTextures };
      delete d.tokenTextures[id];
    }
    save(d);
  };

  const updateCellName = (cellId, name) => {
    save({ ...devData, cellNames: { ...devData.cellNames, [cellId]: name } });
  };

  const resetCellName = (cellId) => {
    const names = { ...devData.cellNames };
    delete names[cellId];
    save({ ...devData, cellNames: names });
  };

  const sectionStyle = { background: S.bg3, borderRadius: 8, padding: 12, border: `1px solid ${S.border}` };
  const labelStyle = { color: S.gold, fontSize: 13, fontWeight: "bold", marginBottom: 8 };
  const smallBtn = btnOutline({ padding: "5px 12px", fontSize: 11 });
  const clearBtn = { background: "transparent", border: "none", color: "#ff6b6b", cursor: "pointer", fontSize: 12 };
  const thumbStyle = { width: 36, height: 36, borderRadius: 4, objectFit: "cover", border: `1px solid ${S.gold}33` };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, bottom: 0, width: 360,
      background: S.bg2, borderRight: `1px solid ${S.gold}33`,
      zIndex: 100, display: "flex", flexDirection: "column",
      boxShadow: "4px 0 20px rgba(0,0,0,0.5)",
      animation: "slideInLeft 0.3s ease-out",
    }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span style={{ color: S.gold, fontWeight: "bold", fontFamily: S.font, fontSize: 16 }}>Dev Panel</span>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: S.textDim, fontSize: 20, cursor: "pointer" }}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
        {[["textures", "Текстуры"], ["text", "Текст"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: "10px", background: tab === key ? `${S.gold}22` : "transparent",
            color: tab === key ? S.gold : S.textDim, border: "none",
            borderBottom: tab === key ? `2px solid ${S.gold}` : "2px solid transparent",
            cursor: "pointer", fontFamily: S.font, fontSize: 13,
          }}>{label}</button>
        ))}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        {tab === "textures" && (
          <>
            {/* Board Background */}
            <div style={sectionStyle}>
              <div style={labelStyle}>Фон центра поля</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => triggerUpload("board")} style={smallBtn}>
                  {devData.boardBg ? "Заменить" : "Загрузить"}
                </button>
                {devData.boardBg && (
                  <>
                    <img src={devData.boardBg} style={thumbStyle} />
                    <button onClick={() => clearItem("board")} style={clearBtn}>✕</button>
                  </>
                )}
              </div>
            </div>

            {/* Cell Textures */}
            <div style={sectionStyle}>
              <div style={labelStyle}>Иконки клеток</div>
              <select value={selectedCellId} onChange={(e) => setSelectedCellId(Number(e.target.value))} style={{
                width: "100%", padding: "6px 8px", background: S.bg, color: S.text,
                border: `1px solid ${S.border}`, borderRadius: 4, fontFamily: S.font, fontSize: 12, marginBottom: 8,
              }}>
                {game?.cells?.map((cell) => (
                  <option key={cell.id} value={cell.id}>#{cell.id} — {cell.name}</option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => triggerUpload(`cell:${selectedCellId}`)} style={smallBtn}>
                  {devData.cellTextures?.[selectedCellId] ? "Заменить" : "Загрузить"}
                </button>
                {devData.cellTextures?.[selectedCellId] && (
                  <>
                    <img src={devData.cellTextures[selectedCellId]} style={{ ...thumbStyle, width: 28, height: 28 }} />
                    <button onClick={() => clearItem("cell", selectedCellId)} style={clearBtn}>✕</button>
                  </>
                )}
              </div>
              {/* Quick overview of cells with textures */}
              {Object.keys(devData.cellTextures || {}).length > 0 && (
                <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {Object.entries(devData.cellTextures).map(([id, url]) => (
                    <div key={id} onClick={() => setSelectedCellId(Number(id))} style={{
                      cursor: "pointer", position: "relative",
                      border: Number(id) === selectedCellId ? `2px solid ${S.gold}` : `1px solid ${S.border}`,
                      borderRadius: 4, padding: 1,
                    }}>
                      <img src={url} style={{ width: 24, height: 24, objectFit: "cover", borderRadius: 3, display: "block" }} />
                      <span style={{ position: "absolute", bottom: -2, right: -2, fontSize: 8, background: S.bg2, color: S.textDim, padding: "0 2px", borderRadius: 2 }}>{id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Token Textures */}
            <div style={sectionStyle}>
              <div style={labelStyle}>Токены игроков</div>
              {game?.players?.map((p) => (
                <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: p.color, minWidth: 80, fontFamily: S.font }}>{p.name}</span>
                  <button onClick={() => triggerUpload(`token:${p.id}`)} style={smallBtn}>
                    {devData.tokenTextures?.[p.id] ? "Заменить" : "Загрузить"}
                  </button>
                  {devData.tokenTextures?.[p.id] ? (
                    <>
                      <img src={devData.tokenTextures[p.id]} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
                      <button onClick={() => clearItem("token", p.id)} style={clearBtn}>✕</button>
                    </>
                  ) : (
                    <span style={{ fontSize: 18 }}>{p.token.emoji}</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "text" && (
          <>
            <div style={{ color: S.textDim, fontSize: 11, marginBottom: 4 }}>
              Измените названия клеток. Изменения применяются мгновенно и сохраняются в браузере.
            </div>
            {game?.cells?.map((cell) => (
              <div key={cell.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: S.textDim, minWidth: 22, textAlign: "right" }}>#{cell.id}</span>
                <input
                  value={devData.cellNames?.[cell.id] ?? cell.name}
                  onChange={(e) => updateCellName(cell.id, e.target.value)}
                  style={{
                    flex: 1, padding: "4px 8px", background: S.bg, color: S.text,
                    border: `1px solid ${devData.cellNames?.[cell.id] !== undefined ? S.gold + "66" : S.border}`,
                    borderRadius: 4, fontFamily: S.font, fontSize: 11,
                  }}
                />
                {devData.cellNames?.[cell.id] !== undefined && (
                  <button onClick={() => resetCellName(cell.id)} title="Сбросить" style={clearBtn}>↩</button>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: 12, borderTop: `1px solid ${S.border}`, flexShrink: 0 }}>
        <button onClick={() => {
          if (confirm("Сбросить все изменения Dev Panel?")) {
            save({ ...DEFAULT_DEV_DATA });
          }
        }} style={btnOutline({ width: "100%", padding: "8px", fontSize: 12, textAlign: "center" })}>
          Сбросить всё
        </button>
      </div>
    </div>
  );
}
