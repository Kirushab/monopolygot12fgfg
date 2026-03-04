import { S, btn, btnOutline, card } from '../theme';
import { calcWealthStatic } from '../gameEngine';

export default function VictoryScreen({ game, t, onMenu, onNewGame }) {
  const winner = game.players[game.winner];

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse at center, #1a1a0e 0%, ${S.bg} 70%)`, color: S.text, fontFamily: S.font, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center" }}>
      <div style={{ fontSize: 90, marginBottom: 10, animation: "pulse 2s infinite" }}>👑</div>
      <h1 style={{ color: S.gold, fontSize: 40, textShadow: "0 0 40px rgba(201,168,76,0.5)", letterSpacing: 3 }}>{t.coronation}</h1>
      <div style={{ fontSize: 30, marginBottom: 20 }}>{winner.token.emoji} {winner.name}</div>
      <div style={card({ maxWidth: 400, width: "100%" })}>
        <h3 style={{ color: S.gold, marginTop: 0 }}>{t.stats}</h3>
        {game.players.map((p) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${S.border}`, opacity: p.bankrupt ? 0.4 : 1 }}>
            <span>{p.token.emoji} {p.name}</span>
            <span style={{ color: S.gold }}>{calcWealthStatic(game, p)} {t.gold}</span>
          </div>
        ))}
        <div style={{ marginTop: 12, fontSize: 13, color: S.textDim }}>
          {t.roundsPlayed}: {game.roundCount}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button onClick={onMenu} style={btn()}>{t.toMenu}</button>
        <button onClick={onNewGame} style={btnOutline()}>{t.newGame}</button>
      </div>
    </div>
  );
}
