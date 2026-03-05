import { S, btnOutline, card } from '../theme';

export default function Settings({ lang, setLang, setScreen, musicVol, setMusicVol, effectsVol, setEffectsVol, t, devData }) {
  const ui = devData?.uiConfig || {};
  const accent = devData?.accentColor || S.gold;
  const font = devData?.font || S.font;
  const bg = ui.pageBg || S.bg;
  const text = ui.pageText || S.text;
  const textDim = ui.pageTextDim || S.textDim;

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text, fontFamily: font, padding: 20 }}>
      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        <button onClick={() => setScreen("menu")} style={btnOutline({ marginBottom: 20 })}>← {t.back}</button>
        <h2 style={{ color: accent, fontFamily: font }}>{ui.settingsTitle || t.settings}</h2>
        <div style={card({ marginBottom: 16, background: ui.cardBg, borderColor: ui.cardBorder })}>
          <label style={{ color: textDim, fontSize: 13 }}>{t.soundMusic}</label>
          <input type="range" min="0" max="1" step="0.1" value={musicVol} onChange={(e) => setMusicVol(+e.target.value)} style={{ width: "100%", accentColor: accent }} />
        </div>
        <div style={card({ marginBottom: 16, background: ui.cardBg, borderColor: ui.cardBorder })}>
          <label style={{ color: textDim, fontSize: 13 }}>{t.soundEffects}</label>
          <input type="range" min="0" max="1" step="0.1" value={effectsVol} onChange={(e) => setEffectsVol(+e.target.value)} style={{ width: "100%", accentColor: accent }} />
        </div>
        <div style={card({ marginBottom: 16, background: ui.cardBg, borderColor: ui.cardBorder })}>
          <label style={{ color: textDim, fontSize: 13 }}>{t.language}</label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {["ru", "en"].map((l) => (
              <button key={l} onClick={() => setLang(l)} style={{ background: lang === l ? accent : "transparent", color: lang === l ? S.bg : text, border: `1px solid ${accent}`, padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontFamily: font }}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
