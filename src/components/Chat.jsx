import { S } from '../theme';

export default function Chat({ lang, t, chatMessages, chatInput, setChatInput, sendChat, onClose, panelOpen }) {
  return (
    <div style={{ position: "absolute", bottom: 10, right: panelOpen ? 310 : 10, width: 280, maxHeight: 380, background: S.bg2, border: `1px solid ${S.gold}44`, borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", fontFamily: S.font }}>
      <div style={{ padding: "8px 12px", background: S.bg3, borderBottom: `1px solid ${S.border}`, fontSize: 13, fontWeight: "bold", color: S.gold, display: "flex", justifyContent: "space-between" }}>
        <span>💬 {t.chat}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: S.textDim, cursor: "pointer" }}>✕</button>
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
  );
}
