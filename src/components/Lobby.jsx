import { useState } from 'react';
import { S, btn, btnOutline, card } from '../theme';
import { AI_NAMES } from '../gameData';

export default function Lobby({ setScreen, lang, t, mp, devData }) {
  const accent = devData?.accentColor || S.gold;
  const font = devData?.font || S.font;
  const ui = devData?.uiConfig || {};
  const pageBg = ui.pageBg || S.bg;
  const text = ui.pageText || S.text;
  const textDim = ui.pageTextDim || S.textDim;
  const cardBg = ui.cardBg || S.bg3;
  const cardBorder = ui.cardBorder || S.border;
  const [view, setView] = useState("browse"); // browse | create | room
  const [roomName, setRoomName] = useState("");
  const [playerName, setPlayerName] = useState(lang === "ru" ? "Игрок" : "Player");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [joinId, setJoinId] = useState("");

  const l = (ru, en) => lang === "ru" ? ru : en;

  // If we're in a room, show room lobby
  if (mp.roomState && mp.roomState.state === "lobby") {
    return <RoomLobby mp={mp} lang={lang} t={t} l={l} setScreen={setScreen} onLeave={() => { mp.leaveRoom(); setView("browse"); }} devData={devData} />;
  }

  // Browse rooms
  if (view === "browse") {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: font, padding: 20 }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <button onClick={() => setScreen("menu")} style={btnOutline({ marginBottom: 20 })}>← {t.back}</button>
          <h2 style={{ color: accent }}>⚔️ {l("Онлайн", "Online")}</h2>

          {/* Connection status */}
          <div style={{ fontSize: 12, color: mp.connected ? "#50c878" : "#ff6b6b", marginBottom: 12 }}>
            {mp.connected ? l("Подключено к серверу", "Connected to server") : l("Нет соединения...", "Disconnected...")}
          </div>

          {mp.errorMsg && <div style={{ background: "#8B000033", border: "1px solid #ff6b6b", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: "#ff6b6b" }}>{mp.errorMsg}</div>}

          {/* Player name */}
          <div style={card({ marginBottom: 12 })}>
            <label style={{ fontSize: 12, color: S.textDim }}>{l("Ваше имя", "Your name")}</label>
            <input value={playerName} onChange={e => setPlayerName(e.target.value)} style={{ display: "block", width: "100%", background: S.bg2, color: S.text, border: `1px solid ${S.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 14, fontFamily: font, marginTop: 4, boxSizing: "border-box" }} />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <button onClick={() => setView("create")} style={btn({ fontSize: 14 })}>+ {l("Создать комнату", "Create Room")}</button>
            <button onClick={() => mp.refreshRooms()} style={btnOutline({ fontSize: 13 })}>{l("Обновить", "Refresh")}</button>
          </div>

          {/* Quick join by ID */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input value={joinId} onChange={e => setJoinId(e.target.value.toUpperCase())} placeholder={l("Код комнаты...", "Room code...")} style={{ flex: 1, background: S.bg2, color: S.text, border: `1px solid ${S.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 14, fontFamily: font, letterSpacing: 2 }} />
            <button onClick={() => { if (joinId.trim()) mp.joinRoom(joinId.trim(), playerName); }} style={btnOutline({ fontSize: 13 })}>{l("Войти", "Join")}</button>
          </div>

          {/* Room list */}
          <div style={{ fontSize: 12, color: S.textDim, marginBottom: 8, letterSpacing: 1 }}>{l("КОМНАТЫ", "ROOMS")} ({mp.roomList.length})</div>
          {mp.roomList.length === 0 && (
            <div style={card({ textAlign: "center", padding: 30 })}>
              <div style={{ fontSize: 13, color: S.textDim }}>{l("Нет доступных комнат", "No rooms available")}</div>
              <div style={{ fontSize: 12, color: S.textDim, marginTop: 4 }}>{l("Создайте первую!", "Create one!")}</div>
            </div>
          )}
          {mp.roomList.map(room => (
            <div key={room.id} style={card({ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "10px 14px" })}>
              <div>
                <div style={{ fontSize: 14, fontWeight: "bold" }}>{room.name}</div>
                <div style={{ fontSize: 11, color: S.textDim }}>{room.host} · {room.mode} · {room.players}/{room.maxPlayers}</div>
              </div>
              <button onClick={() => mp.joinRoom(room.id, playerName)} style={btnOutline({ fontSize: 12, padding: "6px 16px" })}>{l("Войти", "Join")}</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Create room
  if (view === "create") {
    return (
      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: font, padding: 20 }}>
        <div style={{ maxWidth: 500, margin: "0 auto" }}>
          <button onClick={() => setView("browse")} style={btnOutline({ marginBottom: 20 })}>← {t.back}</button>
          <h2 style={{ color: accent }}>⚔️ {l("Новая комната", "New Room")}</h2>

          <div style={card({ marginBottom: 12 })}>
            <label style={{ fontSize: 12, color: S.textDim }}>{l("Название", "Name")}</label>
            <input value={roomName} onChange={e => setRoomName(e.target.value)} placeholder={l("Игра престолов", "Game of Thrones")} style={{ display: "block", width: "100%", background: S.bg2, color: S.text, border: `1px solid ${S.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 14, fontFamily: font, marginTop: 4, boxSizing: "border-box" }} />
          </div>

          <div style={card({ marginBottom: 12 })}>
            <label style={{ fontSize: 12, color: S.textDim }}>{l("Макс. игроков", "Max players")}</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {[2, 3, 4].map(n => (
                <button key={n} onClick={() => setMaxPlayers(n)} style={{ background: maxPlayers === n ? accent : "transparent", color: maxPlayers === n ? S.bg : S.text, border: `1px solid ${accent}`, padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontFamily: font }}>{n}</button>
              ))}
            </div>
          </div>

          <button onClick={() => {
            mp.createRoom({
              name: roomName || `Room ${Math.random().toString(36).slice(2, 5)}`,
              playerName,
              maxPlayers,
              lang,
              config: { mode: "classic", startMoney: 1500, roundBonus: 200, winCondition: "last", maxRounds: 30 },
            });
          }} style={btn({ width: "100%", fontSize: 16, padding: "14px", marginTop: 8 })}>
            ⚔️ {l("Создать", "Create")}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ============================================================
// Room Lobby — inside a room, waiting for players
// ============================================================
function RoomLobby({ mp, lang, t, l, setScreen, onLeave, devData }) {
  const room = mp.roomState;
  if (!room) return null;

  const accent = devData?.accentColor || S.gold;
  const font = devData?.font || S.font;
  const aiNames = AI_NAMES;

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: font, padding: 20 }}>
      <div style={{ maxWidth: 550, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button onClick={onLeave} style={btnOutline()}>← {l("Выйти", "Leave")}</button>
          <div style={{ fontSize: 12, color: S.textDim, letterSpacing: 2, fontFamily: font }}>
            {l("КОД", "CODE")}: <span style={{ color: accent, fontWeight: "bold", fontSize: 16 }}>{room.id}</span>
          </div>
        </div>

        <h2 style={{ color: accent }}>⚔️ {room.name}</h2>

        {mp.errorMsg && <div style={{ background: "#8B000033", border: "1px solid #ff6b6b", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: "#ff6b6b" }}>{mp.errorMsg}</div>}

        {/* Slots */}
        <div style={{ fontSize: 12, color: S.textDim, marginBottom: 8, letterSpacing: 1 }}>{l("СЛОТЫ", "SLOTS")}</div>
        {room.slots.map((slot, i) => (
          <div key={i} style={card({ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "10px 14px" })}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: slot.connected || slot.isAI ? accent + "33" : S.bg, border: `1px solid ${accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
              {slot.isAI ? "🤖" : slot.connected ? "👤" : ""}
            </div>
            <div style={{ flex: 1 }}>
              {slot.name ? (
                <div>
                  <span style={{ fontSize: 14, fontWeight: "bold" }}>{slot.name}</span>
                  {slot.isAI && <span style={{ fontSize: 11, color: S.textDim, marginLeft: 6 }}>AI ({slot.aiPersonality})</span>}
                  {slot.ready && <span style={{ fontSize: 11, color: "#50c878", marginLeft: 6 }}>{l("Готов", "Ready")}</span>}
                  {slot.connected && !slot.ready && <span style={{ fontSize: 11, color: "#f39c12", marginLeft: 6 }}>{l("Не готов", "Not ready")}</span>}
                </div>
              ) : (
                <span style={{ fontSize: 13, color: S.textDim }}>{l("Пусто", "Empty")}</span>
              )}
            </div>
            {/* Host controls */}
            {mp.isHost && !slot.connected && !slot.isAI && (
              <button onClick={() => mp.updateSlot({ slotIndex: i, action: "add_ai", name: aiNames[Math.floor(Math.random() * aiNames.length)], personality: "random" })} style={btnOutline({ fontSize: 11, padding: "4px 10px" })}>+ AI</button>
            )}
            {mp.isHost && slot.isAI && (
              <div style={{ display: "flex", gap: 4 }}>
                <select value={slot.aiPersonality || "random"} onChange={e => mp.updateSlot({ slotIndex: i, action: "set_personality", personality: e.target.value })} style={{ background: S.bg2, color: S.text, border: `1px solid ${S.border}`, borderRadius: 4, fontSize: 11, padding: "2px 4px", fontFamily: font }}>
                  <option value="aggressive">{t.aggressive}</option>
                  <option value="cautious">{t.cautious}</option>
                  <option value="trader">{t.trader}</option>
                  <option value="random">{t.random}</option>
                </select>
                <button onClick={() => mp.updateSlot({ slotIndex: i, action: "remove" })} style={{ background: "transparent", color: "#ff6b6b", border: "none", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
            )}
            {/* My ready toggle (not host slot 0, which is auto-ready) */}
            {slot.index === mp.mySlotIndex && !slot.isAI && i !== 0 && (
              <button onClick={() => mp.toggleReady()} style={btnOutline({ fontSize: 11, padding: "4px 12px", borderColor: slot.ready ? "#50c878" : accent, color: slot.ready ? "#50c878" : accent })}>
                {slot.ready ? l("Готов ✓", "Ready ✓") : l("Готов?", "Ready?")}
              </button>
            )}
          </div>
        ))}

        {/* Config (host only) */}
        {mp.isHost && (
          <div style={card({ marginTop: 12, marginBottom: 12 })}>
            <div style={{ fontSize: 12, color: S.textDim, marginBottom: 8, letterSpacing: 1 }}>{l("НАСТРОЙКИ", "SETTINGS")}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["classic", "quick"].map(m => (
                <button key={m} onClick={() => mp.updateConfig({ config: { mode: m } })} style={{ background: room.config.mode === m ? accent : "transparent", color: room.config.mode === m ? S.bg : S.text, border: `1px solid ${accent}`, padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontFamily: font, fontSize: 12 }}>
                  {m === "classic" ? t.classic : t.quick}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {[1000, 1500, 2000].map(m => (
                <button key={m} onClick={() => mp.updateConfig({ config: { startMoney: m } })} style={{ background: room.config.startMoney === m ? accent : "transparent", color: room.config.startMoney === m ? S.bg : S.text, border: `1px solid ${accent}`, padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontFamily: font, fontSize: 12 }}>
                  {m} {t.gold}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Start button (host only) */}
        {mp.isHost && (
          <button onClick={() => mp.startGame()} style={btn({ width: "100%", fontSize: 18, padding: "14px", marginTop: 8 })}>
            ⚔️ {t.start}
          </button>
        )}
      </div>
    </div>
  );
}
