import { S } from '../theme';
import { calcWealthStatic } from '../gameEngine';

export default function PlayerPanel({ game, lang, t, onClose }) {
  const maxWealth = Math.max(...game.players.filter(p => !p.bankrupt).map(p => calcWealthStatic(game, p)), 1);

  return (
    <div style={{ padding: 10, borderBottom: `1px solid ${S.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: S.textDim, fontFamily: S.font, letterSpacing: 2, textTransform: "uppercase" }}>{lang === "ru" ? "Игроки" : "Players"}</span>
        <button onClick={onClose} style={{ background: "transparent", color: S.textDim, border: "none", cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>✕</button>
      </div>
      {game.players.map((p) => {
        const wealth = calcWealthStatic(game, p);
        const pct = (wealth / maxWealth) * 100;
        const isCurrent = p.id === game.currentPlayer;
        return (
          <div key={p.id} style={{
            padding: "8px 10px", borderRadius: 8, marginBottom: 4,
            background: isCurrent ? `${p.color}15` : "transparent",
            border: isCurrent ? `1px solid ${p.color}33` : "1px solid transparent",
            opacity: p.bankrupt ? 0.25 : 1,
            fontFamily: S.font,
            transition: "all 0.3s ease",
            animation: isCurrent && !p.bankrupt ? "slideInRight 0.3s ease-out" : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22, filter: isCurrent ? `drop-shadow(0 0 6px ${p.color}88)` : "none" }}>{p.token.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: isCurrent ? "bold" : "normal", color: p.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: 0.5 }}>
                  {p.name} {p.isAI ? "🤖" : ""} {p.inJail ? "🧊" : ""}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: S.gold, letterSpacing: 1 }}>{p.money} {t.gold}</span>
                  <span style={{ fontSize: 10, color: S.textDim }}>{p.properties.length} {lang === "ru" ? "вл." : "prop."}</span>
                </div>
              </div>
            </div>
            {/* Wealth bar */}
            {!p.bankrupt && (
              <div style={{ marginTop: 4, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${p.color}88, ${p.color})`, borderRadius: 2, transition: "width 0.5s ease" }} />
              </div>
            )}
            {p.bankrupt && <div style={{ fontSize: 10, color: "#ff6b6b", marginTop: 2 }}>{t.bankrupt}</div>}
          </div>
        );
      })}
    </div>
  );
}
