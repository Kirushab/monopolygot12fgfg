import { useMemo } from 'react';
import { S, btn, btnOutline } from '../theme';
import { playClickSound } from '../sounds';

function Particles() {
  const items = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 1 + Math.random() * 2,
    delay: Math.random() * 5,
    dur: 3 + Math.random() * 4,
  })), []);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {items.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          left: `${p.left}%`, top: `${p.top}%`,
          width: p.size, height: p.size,
          background: S.gold,
          borderRadius: "50%",
          opacity: 0.3,
          animation: `float ${p.dur}s ease-in-out ${p.delay}s infinite`,
          boxShadow: `0 0 ${p.size * 3}px rgba(201,168,76,0.4)`,
        }} />
      ))}
    </div>
  );
}

export default function MainMenu({ lang, setLang, setScreen, effectsVol, t }) {
  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse at center, ${S.bg3} 0%, ${S.bg} 70%)`, color: S.text, fontFamily: S.font, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
      {/* Grid pattern */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(201,168,76,0.3) 50px, rgba(201,168,76,0.3) 51px), repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(201,168,76,0.3) 50px, rgba(201,168,76,0.3) 51px)", pointerEvents: "none" }} />

      {/* Floating particles */}
      <Particles />

      {/* Vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", animation: "fadeIn 0.8s ease-out" }}>
        <div style={{ fontSize: 56, animation: "crownFloat 6s ease-in-out infinite", filter: "drop-shadow(0 4px 12px rgba(201,168,76,0.4))" }}>⚔️</div>
        <h1 className="shimmer-text" style={{ fontSize: 42, margin: "8px 0 4px 0", letterSpacing: 4, fontFamily: S.font }}>KIRSHAS</h1>
        <h2 style={{ fontSize: 22, color: S.gold, margin: "0 0 8px 0", fontWeight: "normal", letterSpacing: 8, opacity: 0.8 }}>MONOPOLIA</h2>
        <div style={{ fontSize: 11, color: S.textDim, letterSpacing: 5, marginBottom: 44, fontFamily: S.font, textTransform: "uppercase" }}>Game of Thrones Edition</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
          <button onClick={() => { playClickSound(effectsVol); setScreen("setup"); }} style={{ ...btn({ padding: "16px 60px", fontSize: 20 }), boxShadow: "0 4px 20px rgba(201,168,76,0.3)", animation: "glow 3s ease-in-out infinite" }}>{t.play}</button>
          <button onClick={() => { playClickSound(effectsVol); setScreen("settings"); }} style={btnOutline({ padding: "12px 50px" })}>{t.settings}</button>
          <button onClick={() => { playClickSound(effectsVol); setScreen("friends"); }} style={btnOutline({ padding: "12px 50px" })}>{t.friends}</button>
          <button onClick={() => { playClickSound(effectsVol); setScreen("rules"); }} style={btnOutline({ padding: "12px 50px" })}>{t.rules}</button>
        </div>

        <div style={{ marginTop: 44, display: "flex", gap: 12, justifyContent: "center" }}>
          {["ru", "en"].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              background: lang === l ? `linear-gradient(135deg, ${S.gold}, ${S.goldDark})` : "transparent",
              color: lang === l ? S.bg : S.textDim,
              border: `1px solid ${S.gold}44`,
              padding: "6px 18px", borderRadius: 6, cursor: "pointer", fontFamily: S.font, fontSize: 13,
              fontWeight: lang === l ? "bold" : "normal",
            }}>{l.toUpperCase()}</button>
          ))}
        </div>

        <div style={{ marginTop: 32, fontSize: 11, color: S.textDim, opacity: 0.5 }}>{t.version}</div>
      </div>
    </div>
  );
}
