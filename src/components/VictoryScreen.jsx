import { useMemo } from 'react';
import { S, btn, btnOutline, card } from '../theme';
import { calcWealthStatic } from '../gameEngine';

const CONFETTI_COLORS = ['#c9a84c', '#ffd700', '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#ff6b6b'];

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: Math.random() * 2,
    dur: 2 + Math.random() * 3,
    size: 6 + Math.random() * 8,
    shape: Math.random() > 0.5 ? "50%" : "0",
  })), []);

  return (
    <>
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece" style={{
          left: `${p.left}%`,
          width: p.size, height: p.size,
          background: p.color,
          borderRadius: p.shape,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.dur}s`,
        }} />
      ))}
    </>
  );
}

export default function VictoryScreen({ game, t, onMenu, onNewGame, devData }) {
  const ui = devData?.uiConfig || {};
  const accent = devData?.accentColor || S.gold;
  const font = devData?.font || S.font;
  const text = ui.pageText || S.text;
  const bg = ui.victoryBg || ui.pageBg || S.bg;

  const winner = game.players[game.winner];
  const winnerColor = devData?.playerColors?.[winner.id] || winner.color;
  const sorted = [...game.players].sort((a, b) => calcWealthStatic(game, b) - calcWealthStatic(game, a));

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse at center, #1a1a0e 0%, ${bg} 70%)`, color: text, fontFamily: font, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center", position: "relative", overflow: "hidden" }}>
      <Confetti />

      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, animation: "fadeIn 1s ease-out" }}>
        <div style={{ fontSize: 100, animation: "crownFloat 4s ease-in-out infinite", filter: "drop-shadow(0 8px 24px rgba(201,168,76,0.5))" }}>👑</div>
        <h1 className="shimmer-text" style={{ fontSize: 44, letterSpacing: 4, fontFamily: font, margin: "8px 0" }}>{t.coronation}</h1>
        <div style={{ fontSize: 32, marginBottom: 24, color: winnerColor, textShadow: `0 0 20px ${winnerColor}66`, animation: "fadeIn 1.5s ease-out" }}>
          {devData?.tokenTextures?.[winner.id] ? (
            <img src={devData.tokenTextures[winner.id]} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", verticalAlign: "middle", marginRight: 8 }} />
          ) : (
            <span>{winner.token.emoji} </span>
          )}
          {winner.name}
        </div>

        <div style={card({ maxWidth: 420, width: "100%", animation: "slideInUp 0.8s ease-out", background: ui.cardBg, borderColor: ui.cardBorder })}>
          <h3 style={{ color: accent, marginTop: 0, letterSpacing: 2, fontSize: 14 }}>{t.stats}</h3>
          {sorted.map((p, i) => {
            const w = calcWealthStatic(game, p);
            const pColor = devData?.playerColors?.[p.id] || p.color;
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${ui.cardBorder || S.border}`, opacity: p.bankrupt ? 0.3 : 1 }}>
                <span style={{ fontSize: 11, color: i === 0 ? accent : (ui.pageTextDim || S.textDim), fontWeight: "bold", width: 18 }}>#{i + 1}</span>
                {devData?.tokenTextures?.[p.id] ? (
                  <img src={devData.tokenTextures[p.id]} style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 18 }}>{p.token.emoji}</span>
                )}
                <span style={{ flex: 1, fontSize: 13, color: pColor }}>{p.name}</span>
                <span style={{ color: accent, fontWeight: "bold", fontSize: 13 }}>{w} {t.gold}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 12, fontSize: 12, color: ui.pageTextDim || S.textDim }}>
            {t.roundsPlayed}: {game.roundCount}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 28, animation: "fadeIn 2s ease-out" }}>
          <button onClick={onMenu} style={{ ...btn(), boxShadow: `0 4px 16px ${accent}4d` }}>{t.toMenu}</button>
          <button onClick={onNewGame} style={btnOutline()}>{t.newGame}</button>
        </div>
      </div>
    </div>
  );
}
