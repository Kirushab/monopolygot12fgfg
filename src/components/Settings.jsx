import { S, btnOutline, card } from '../theme';

export default function Settings({ lang, setLang, setScreen, musicVol, setMusicVol, effectsVol, setEffectsVol, t }) {
  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: S.font, padding: 20 }}>
      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        <button onClick={() => setScreen("menu")} style={btnOutline({ marginBottom: 20 })}>← {t.back}</button>
        <h2 style={{ color: S.gold, fontFamily: S.font }}>{t.settings}</h2>
        <div style={card({ marginBottom: 16 })}>
          <label style={{ color: S.textDim, fontSize: 13 }}>{t.soundMusic}</label>
          <input type="range" min="0" max="1" step="0.1" value={musicVol} onChange={(e) => setMusicVol(+e.target.value)} style={{ width: "100%", accentColor: S.gold }} />
        </div>
        <div style={card({ marginBottom: 16 })}>
          <label style={{ color: S.textDim, fontSize: 13 }}>{t.soundEffects}</label>
          <input type="range" min="0" max="1" step="0.1" value={effectsVol} onChange={(e) => setEffectsVol(+e.target.value)} style={{ width: "100%", accentColor: S.gold }} />
        </div>
        <div style={card({ marginBottom: 16 })}>
          <label style={{ color: S.textDim, fontSize: 13 }}>{t.language}</label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {["ru", "en"].map((l) => (
              <button key={l} onClick={() => setLang(l)} style={{ background: lang === l ? S.gold : "transparent", color: lang === l ? S.bg : S.text, border: `1px solid ${S.gold}`, padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontFamily: S.font }}>{l.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
