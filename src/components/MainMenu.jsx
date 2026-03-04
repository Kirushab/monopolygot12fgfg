import { S, btn, btnOutline } from '../theme';
import { playClickSound } from '../sounds';

export default function MainMenu({ lang, setLang, setScreen, effectsVol, t }) {
  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse at center, ${S.bg3} 0%, ${S.bg} 70%)`, color: S.text, fontFamily: S.font, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(201,168,76,0.3) 40px, rgba(201,168,76,0.3) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(201,168,76,0.3) 40px, rgba(201,168,76,0.3) 41px)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>⚔️</div>
        <h1 style={{ fontSize: 36, color: S.gold, margin: "0 0 4px 0", textShadow: "0 0 30px rgba(201,168,76,0.4)", letterSpacing: 2 }}>KIRSHAS</h1>
        <h2 style={{ fontSize: 22, color: S.gold, margin: "0 0 8px 0", fontWeight: "normal", letterSpacing: 6 }}>MONOPOLIA</h2>
        <div style={{ fontSize: 12, color: S.textDim, letterSpacing: 4, marginBottom: 40, fontFamily: S.font }}>GAME OF THRONES EDITION</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
          <button onClick={() => { playClickSound(effectsVol); setScreen("setup"); }} style={btn({ padding: "16px 60px", fontSize: 20 })}>{t.play}</button>
          <button onClick={() => { playClickSound(effectsVol); setScreen("settings"); }} style={btnOutline({ padding: "12px 50px" })}>{t.settings}</button>
          <button onClick={() => { playClickSound(effectsVol); setScreen("friends"); }} style={btnOutline({ padding: "12px 50px" })}>{t.friends}</button>
          <button onClick={() => { playClickSound(effectsVol); setScreen("rules"); }} style={btnOutline({ padding: "12px 50px" })}>{t.rules}</button>
        </div>

        <div style={{ marginTop: 40, display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => setLang("ru")} style={{ background: lang === "ru" ? S.gold : "transparent", color: lang === "ru" ? S.bg : S.textDim, border: `1px solid ${S.gold}44`, padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontFamily: S.font, fontSize: 13 }}>RU</button>
          <button onClick={() => setLang("en")} style={{ background: lang === "en" ? S.gold : "transparent", color: lang === "en" ? S.bg : S.textDim, border: `1px solid ${S.gold}44`, padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontFamily: S.font, fontSize: 13 }}>EN</button>
        </div>

        <div style={{ marginTop: 30, fontSize: 11, color: S.textDim }}>{t.version}</div>
      </div>
    </div>
  );
}
