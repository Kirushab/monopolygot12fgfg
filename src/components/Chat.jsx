import { S } from '../theme';

export default function Chat({ lang, t, chatMessages, chatInput, setChatInput, sendChat, onClose, panelOpen, devData }) {
  const ui = devData?.uiConfig || {};
  const accent = devData?.accentColor || S.gold;
  const font = devData?.font || S.font;
  const chatBg = ui.chatBg || S.bg2;
  const chatBorder = ui.chatBorder || `${accent}44`;
  const text = ui.pageText || S.text;
  const textDim = ui.pageTextDim || S.textDim;

  return (
    <div style={{
      position: "fixed", bottom: 10,
      right: 10, left: 10,
      width: "auto", maxWidth: 320,
      maxHeight: "50vh",
      marginLeft: "auto",
      background: chatBg, border: `1px solid ${chatBorder}`, borderRadius: 12,
      display: "flex", flexDirection: "column", overflow: "hidden",
      zIndex: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", fontFamily: font,
    }}>
      <div style={{ padding: "8px 12px", background: ui.panelBg || S.bg3, borderBottom: `1px solid ${ui.panelBorder || S.border}`, fontSize: 13, fontWeight: "bold", color: accent, display: "flex", justifyContent: "space-between" }}>
        <span>💬 {t.chat}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: textDim, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 4, minHeight: 80 }}>
        {chatMessages.length === 0 && <div style={{ color: textDim, fontSize: 12, textAlign: "center", padding: 20 }}>{lang === "ru" ? "Нет сообщений" : "No messages"}</div>}
        {chatMessages.map((m, i) => (
          <div key={i} style={{ fontSize: 12 }}>
            <span style={{ color: accent, fontWeight: "bold" }}>{m.from}</span>
            <span style={{ color: textDim }}> {m.time}</span>
            <div style={{ color: text }}>{m.text}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", padding: 6, gap: 4, borderTop: `1px solid ${ui.panelBorder || S.border}` }}>
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendChat()}
          placeholder={lang === "ru" ? "Сообщение..." : "Message..."}
          style={{ flex: 1, background: ui.pageBg || S.bg, color: text, border: `1px solid ${ui.cardBorder || S.border}`, borderRadius: 6, padding: "6px 8px", fontSize: 12, fontFamily: font }}
        />
        <button onClick={sendChat} style={{ background: accent, color: ui.pageBg || S.bg, border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>→</button>
      </div>
    </div>
  );
}
