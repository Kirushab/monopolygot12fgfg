import { S, btn, btnOutline, card } from '../theme';
import { TOKENS, AI_NAMES } from '../gameData';

export default function GameSetup({ lang, config, setConfig, setScreen, startGame, t }) {
  const updatePlayer = (idx, key, val) => {
    setConfig((c) => {
      const nc = { ...c, players: [...c.players] };
      nc.players[idx] = { ...nc.players[idx], [key]: val };
      return nc;
    });
  };

  const addPlayer = () => {
    if (config.players.length < 4) {
      setConfig((c) => ({
        ...c,
        players: [...c.players, { name: AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)], isAI: true, aiPersonality: "random" }],
      }));
    }
  };

  const removePlayer = (idx) => {
    if (config.players.length > 2) {
      setConfig((c) => ({ ...c, players: c.players.filter((_, i) => i !== idx) }));
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: S.font, padding: 20 }}>
      <div style={{ maxWidth: 550, margin: "0 auto" }}>
        <button onClick={() => setScreen("menu")} style={btnOutline({ marginBottom: 20 })}>← {t.back}</button>
        <h2 style={{ color: S.gold, fontFamily: S.font }}>⚔️ {lang === "ru" ? "Настройка партии" : "Game Setup"}</h2>

        {/* Mode */}
        <div style={card({ marginBottom: 12 })}>
          <label style={{ color: S.textDim, fontSize: 13 }}>{t.mode}</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {["classic", "quick"].map((m) => (
              <button key={m} onClick={() => setConfig((c) => ({ ...c, mode: m }))} style={{ background: config.mode === m ? S.gold : "transparent", color: config.mode === m ? S.bg : S.text, border: `1px solid ${S.gold}`, padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontFamily: S.font }}>
                {m === "classic" ? t.classic : t.quick} ({m === "classic" ? 40 : 24})
              </button>
            ))}
          </div>
        </div>

        {/* Start Money */}
        <div style={card({ marginBottom: 12 })}>
          <label style={{ color: S.textDim, fontSize: 13 }}>{t.startMoney}</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {[1000, 1500, 2000].map((m) => (
              <button key={m} onClick={() => setConfig((c) => ({ ...c, startMoney: m }))} style={{ background: config.startMoney === m ? S.gold : "transparent", color: config.startMoney === m ? S.bg : S.text, border: `1px solid ${S.gold}`, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontFamily: S.font }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Win Condition */}
        <div style={card({ marginBottom: 12 })}>
          <label style={{ color: S.textDim, fontSize: 13 }}>{t.winCondition}</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={() => setConfig((c) => ({ ...c, winCondition: "last" }))} style={{ background: config.winCondition === "last" ? S.gold : "transparent", color: config.winCondition === "last" ? S.bg : S.text, border: `1px solid ${S.gold}`, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontFamily: S.font }}>{t.lastStanding}</button>
            <button onClick={() => setConfig((c) => ({ ...c, winCondition: "rounds" }))} style={{ background: config.winCondition === "rounds" ? S.gold : "transparent", color: config.winCondition === "rounds" ? S.bg : S.text, border: `1px solid ${S.gold}`, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontFamily: S.font }}>{t.byRounds}</button>
          </div>
          {config.winCondition === "rounds" && (
            <div style={{ marginTop: 8 }}>
              <label style={{ color: S.textDim, fontSize: 12 }}>{t.rounds}: {config.maxRounds}</label>
              <input type="range" min="10" max="50" value={config.maxRounds} onChange={(e) => setConfig((c) => ({ ...c, maxRounds: +e.target.value }))} style={{ width: "100%", accentColor: S.gold }} />
            </div>
          )}
        </div>

        {/* Round Bonus */}
        <div style={card({ marginBottom: 12 })}>
          <label style={{ color: S.textDim, fontSize: 13 }}>{t.roundBonus}</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {[200, 400].map((b) => (
              <button key={b} onClick={() => setConfig((c) => ({ ...c, roundBonus: b }))} style={{ background: config.roundBonus === b ? S.gold : "transparent", color: config.roundBonus === b ? S.bg : S.text, border: `1px solid ${S.gold}`, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontFamily: S.font }}>
                {b} ({b === 200 ? t.standard : t.doubled})
              </button>
            ))}
          </div>
        </div>

        {/* Players */}
        <div style={card({ marginBottom: 12 })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <label style={{ color: S.textDim, fontSize: 13 }}>{lang === "ru" ? "Игроки" : "Players"}</label>
            {config.players.length < 4 && (
              <button onClick={addPlayer} style={btnOutline({ padding: "4px 12px", fontSize: 12 })}>+ {lang === "ru" ? "Добавить" : "Add"}</button>
            )}
          </div>
          {config.players.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 20 }}>{TOKENS[i]?.emoji}</span>
              <input value={p.name} onChange={(e) => updatePlayer(i, "name", e.target.value)} style={{ background: S.bg2, color: S.text, border: `1px solid ${S.border}`, padding: "6px 10px", borderRadius: 6, width: 120, fontFamily: S.font, fontSize: 13 }} />
              <button onClick={() => updatePlayer(i, "isAI", !p.isAI)} style={{ background: p.isAI ? "#8B000044" : "#22882244", color: p.isAI ? "#ff6b6b" : "#50c878", border: "1px solid", padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: S.font }}>
                {p.isAI ? t.ai : t.human}
              </button>
              {p.isAI && (
                <select value={p.aiPersonality || "random"} onChange={(e) => updatePlayer(i, "aiPersonality", e.target.value)} style={{ background: S.bg2, color: S.text, border: `1px solid ${S.border}`, padding: "4px 8px", borderRadius: 6, fontSize: 12, fontFamily: S.font }}>
                  <option value="aggressive">{t.aggressive}</option>
                  <option value="cautious">{t.cautious}</option>
                  <option value="trader">{t.trader}</option>
                  <option value="random">{t.random}</option>
                </select>
              )}
              {config.players.length > 2 && (
                <button onClick={() => removePlayer(i)} style={{ background: "transparent", color: "#ff6b6b", border: "none", cursor: "pointer", fontSize: 16 }}>✕</button>
              )}
            </div>
          ))}
        </div>

        <button onClick={startGame} style={btn({ width: "100%", padding: "16px", fontSize: 18, marginTop: 8 })}>⚔️ {t.start}</button>
      </div>
    </div>
  );
}
