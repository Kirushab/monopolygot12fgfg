import { S } from '../theme';

export default function PlayerPanel({ game, lang, t, onClose }) {
  return (
    <div style={{ padding: 10, borderBottom: `1px solid ${S.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: S.textDim, fontFamily: S.font, letterSpacing: 1 }}>{lang === "ru" ? "ИГРОКИ" : "PLAYERS"}</span>
        <button onClick={onClose} style={{ background: "transparent", color: S.textDim, border: "none", cursor: "pointer", fontSize: 16, padding: "2px 6px" }}>✕</button>
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
  );
}
