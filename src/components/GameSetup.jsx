import { S, btn, btnOutline, card } from '../theme';
import { TOKENS, AI_NAMES } from '../gameData';

export default function GameSetup({ lang, config, setConfig, setScreen, startGame, t, devData }) {
  const ui = devData?.uiConfig || {};
  const accent = devData?.accentColor || S.gold;
  const font = devData?.font || S.font;
  const bg = ui.pageBg || S.bg;
  const text = ui.pageText || S.text;
  const textDim = ui.pageTextDim || S.textDim;
  const cardBg = ui.cardBg || undefined;
  const cardBorder = ui.cardBorder || undefined;

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

  const selBtn = (active) => ({
    background: active ? accent : "transparent",
    color: active ? bg : text,
    border: `1px solid ${accent}`,
    padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontFamily: font,
  });

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: font, padding: 20 }}>
      <div style={{ maxWidth: 550, margin: "0 auto" }}>
        <button onClick={() => setScreen("menu")} style={btnOutline({ marginBottom: 20 })}>← {t.back}</button>
        <h2 style={{ color: accent, fontFamily: font }}>⚔️ {ui.setupTitle || (lang === "ru" ? "Настройка партии" : "Game Setup")}</h2>

        {/* Mode */}
        <div style={card({ marginBottom: 12, background: cardBg, borderColor: cardBorder })}>
          <label style={{ color: textDim, fontSize: 13 }}>{t.mode}</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {["classic", "quick"].map((m) => (
              <button key={m} onClick={() => setConfig((c) => ({ ...c, mode: m }))} style={selBtn(config.mode === m)}>
                {m === "classic" ? t.classic : t.quick} ({m === "classic" ? 40 : 24})
              </button>
            ))}
          </div>
        </div>

        {/* Start Money */}
        <div style={card({ marginBottom: 12, background: cardBg, borderColor: cardBorder })}>
          <label style={{ color: textDim, fontSize: 13 }}>{t.startMoney}</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {[1000, 1500, 2000].map((m) => (
              <button key={m} onClick={() => setConfig((c) => ({ ...c, startMoney: m }))} style={selBtn(config.startMoney === m)}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Win Condition */}
        <div style={card({ marginBottom: 12, background: cardBg, borderColor: cardBorder })}>
          <label style={{ color: textDim, fontSize: 13 }}>{t.winCondition}</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={() => setConfig((c) => ({ ...c, winCondition: "last" }))} style={selBtn(config.winCondition === "last")}>{t.lastStanding}</button>
            <button onClick={() => setConfig((c) => ({ ...c, winCondition: "rounds" }))} style={selBtn(config.winCondition === "rounds")}>{t.byRounds}</button>
          </div>
          {config.winCondition === "rounds" && (
            <div style={{ marginTop: 8 }}>
              <label style={{ color: textDim, fontSize: 12 }}>{t.rounds}: {config.maxRounds}</label>
              <input type="range" min="10" max="50" value={config.maxRounds} onChange={(e) => setConfig((c) => ({ ...c, maxRounds: +e.target.value }))} style={{ width: "100%", accentColor: accent }} />
            </div>
          )}
        </div>

        {/* Round Bonus */}
        <div style={card({ marginBottom: 12, background: cardBg, borderColor: cardBorder })}>
          <label style={{ color: textDim, fontSize: 13 }}>{t.roundBonus}</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {[200, 400].map((b) => (
              <button key={b} onClick={() => setConfig((c) => ({ ...c, roundBonus: b }))} style={selBtn(config.roundBonus === b)}>
                {b} ({b === 200 ? t.standard : t.doubled})
              </button>
            ))}
          </div>
        </div>

        {/* Players */}
        <div style={card({ marginBottom: 12, background: cardBg, borderColor: cardBorder })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <label style={{ color: textDim, fontSize: 13 }}>{lang === "ru" ? "Игроки" : "Players"}</label>
            {config.players.length < 4 && (
              <button onClick={addPlayer} style={btnOutline({ padding: "4px 12px", fontSize: 12 })}>+ {lang === "ru" ? "Добавить" : "Add"}</button>
            )}
          </div>
          {config.players.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 20 }}>{TOKENS[i]?.emoji}</span>
              <input value={p.name} onChange={(e) => updatePlayer(i, "name", e.target.value)} style={{ background: ui.pageBg2 || S.bg2, color: text, border: `1px solid ${ui.cardBorder || S.border}`, padding: "6px 10px", borderRadius: 6, width: 120, fontFamily: font, fontSize: 13 }} />
              <button onClick={() => updatePlayer(i, "isAI", !p.isAI)} style={{ background: p.isAI ? "#8B000044" : "#22882244", color: p.isAI ? "#ff6b6b" : "#50c878", border: "1px solid", padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: font }}>
                {p.isAI ? t.ai : t.human}
              </button>
              {p.isAI && (
                <select value={p.aiPersonality || "random"} onChange={(e) => updatePlayer(i, "aiPersonality", e.target.value)} style={{ background: ui.pageBg2 || S.bg2, color: text, border: `1px solid ${ui.cardBorder || S.border}`, padding: "4px 8px", borderRadius: 6, fontSize: 12, fontFamily: font }}>
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
