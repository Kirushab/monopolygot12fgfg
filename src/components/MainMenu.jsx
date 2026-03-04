import { useMemo, useState, useEffect, useRef } from 'react';
import { S, btn, btnOutline } from '../theme';
import { playClickSound, startAudio, startPlaylist, getCurrentPlaylistMode } from '../sounds';

const rgba = (hex, a) => {
  if (!hex || hex[0] !== '#') return `rgba(201,168,76,${a})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

function Particles({ accent }) {
  const color = accent || S.gold;
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
          background: color,
          borderRadius: "50%",
          opacity: 0.3,
          animation: `float ${p.dur}s ease-in-out ${p.delay}s infinite`,
          boxShadow: `0 0 ${p.size * 3}px ${rgba(color, 0.4)}`,
        }} />
      ))}
    </div>
  );
}

export default function MainMenu({ lang, setLang, setScreen, effectsVol, t, devData }) {
  const accent = devData?.accentColor || S.gold;
  const font = devData?.font || S.font;
  const logoImage = devData?.logoImage;
  const centerEmoji = devData?.centerEmoji || "⚔️";
  const gameTitle = devData?.gameTitle || "KIRSHAS";
  const gameSubtitle = devData?.gameSubtitle || "MONOPOLIA";

  // Menu customization from devData
  const menuConfig = devData?.menuConfig || {};
  const menuBgs = menuConfig.backgrounds || [];
  const slideshowInterval = (menuConfig.slideshowInterval || 8) * 1000;
  const menuSubtitleText = menuConfig.subtitle || "Game of Thrones Edition";
  const menuButtonStyle = menuConfig.buttonStyle || "default";

  // Background slideshow
  const [bgIndex, setBgIndex] = useState(0);
  const [bgOpacity, setBgOpacity] = useState(1);

  useEffect(() => {
    if (menuBgs.length <= 1) return;
    const timer = setInterval(() => {
      setBgOpacity(0);
      setTimeout(() => {
        setBgIndex(prev => (prev + 1) % menuBgs.length);
        setBgOpacity(1);
      }, 1000);
    }, slideshowInterval);
    return () => clearInterval(timer);
  }, [menuBgs.length, slideshowInterval]);

  // Start menu music playlist on mount
  const musicStarted = useRef(false);
  useEffect(() => {
    if (musicStarted.current) return;
    const tryStart = async () => {
      try {
        await startAudio();
        if (getCurrentPlaylistMode() !== 'menu') {
          startPlaylist('menu', devData?.volume?.music ?? 0.5);
        }
        musicStarted.current = true;
      } catch {}
    };
    // Try on user interaction
    const handler = () => { tryStart(); document.removeEventListener('click', handler); };
    document.addEventListener('click', handler);
    // Also try immediately
    tryStart();
    return () => document.removeEventListener('click', handler);
  }, [devData?.volume?.music]);

  const handleNav = (screen) => {
    playClickSound(effectsVol);
    setScreen(screen);
  };

  const btnStyle = (extra) => {
    if (menuButtonStyle === "glass") {
      return {
        ...btnOutline(extra),
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
        border: `1px solid ${rgba(accent, 0.3)}`,
      };
    }
    return extra?.primary ? btn(extra) : btnOutline(extra);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: menuBgs.length > 0 ? S.bg : `radial-gradient(ellipse at center, ${S.bg3} 0%, ${S.bg} 70%)`,
      color: S.text, fontFamily: font,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 20, position: "relative", overflow: "hidden",
    }}>
      {/* Background slideshow */}
      {menuBgs.length > 0 && (
        <>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${menuBgs[bgIndex]})`,
            backgroundSize: "cover", backgroundPosition: "center",
            opacity: bgOpacity,
            transition: "opacity 1s ease-in-out",
          }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
        </>
      )}

      {/* Grid pattern */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 50px, ${rgba(accent, 0.3)} 50px, ${rgba(accent, 0.3)} 51px), repeating-linear-gradient(90deg, transparent, transparent 50px, ${rgba(accent, 0.3)} 50px, ${rgba(accent, 0.3)} 51px)`, pointerEvents: "none" }} />

      <Particles accent={accent} />

      {/* Vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", animation: "fadeIn 0.8s ease-out", width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        {logoImage ? (
          <img src={logoImage} style={{ height: 80, objectFit: "contain", marginBottom: 16, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }} alt="" />
        ) : (
          <>
            <div style={{ fontSize: 56, animation: "crownFloat 6s ease-in-out infinite", filter: `drop-shadow(0 4px 12px ${rgba(accent, 0.4)})` }}>{centerEmoji}</div>
            <h1 className="shimmer-text" style={{ fontSize: 42, margin: "8px 0 4px 0", letterSpacing: 4, fontFamily: font }}>{gameTitle}</h1>
            <h2 style={{ fontSize: 22, color: accent, margin: "0 0 8px 0", fontWeight: "normal", letterSpacing: 8, opacity: 0.8 }}>{gameSubtitle}</h2>
          </>
        )}

        <div style={{ fontSize: 11, color: S.textDim, letterSpacing: 5, marginBottom: 44, fontFamily: font, textTransform: "uppercase" }}>{menuSubtitleText}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
          <button onClick={() => handleNav("setup")} style={{ ...btn({ padding: "16px 60px", fontSize: 20 }), background: `linear-gradient(135deg, ${accent}, ${rgba(accent, 0.7)})`, boxShadow: `0 4px 20px ${rgba(accent, 0.3)}`, animation: "glow 3s ease-in-out infinite" }}>{t.play}</button>
          <button onClick={() => handleNav("settings")} style={btnStyle({ padding: "12px 50px" })}>{t.settings}</button>
          <button onClick={() => handleNav("friends")} style={btnStyle({ padding: "12px 50px" })}>{t.friends}</button>
          <button onClick={() => handleNav("rules")} style={btnStyle({ padding: "12px 50px" })}>{t.rules}</button>
        </div>

        <div style={{ marginTop: 44, display: "flex", gap: 12, justifyContent: "center" }}>
          {["ru", "en"].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              background: lang === l ? `linear-gradient(135deg, ${accent}, ${rgba(accent, 0.7)})` : "transparent",
              color: lang === l ? S.bg : S.textDim,
              border: `1px solid ${rgba(accent, 0.25)}`,
              padding: "6px 18px", borderRadius: 6, cursor: "pointer", fontFamily: font, fontSize: 13,
              fontWeight: lang === l ? "bold" : "normal",
            }}>{l.toUpperCase()}</button>
          ))}
        </div>

        <div style={{ marginTop: 32, fontSize: 11, color: S.textDim, opacity: 0.5 }}>{t.version}</div>
      </div>
    </div>
  );
}
