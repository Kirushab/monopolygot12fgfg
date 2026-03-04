import { S, btnOutline } from '../theme';

export default function Lobby({ setScreen, lang, t }) {
  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: S.font, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ fontSize: 60, marginBottom: 20 }}>🏰</div>
      <h2 style={{ color: S.gold }}>{t.comingSoon}</h2>
      <p style={{ color: S.textDim, textAlign: "center", maxWidth: 300 }}>{t.friendsDesc}</p>
      <button onClick={() => setScreen("menu")} style={btnOutline({ marginTop: 20 })}>← {t.back}</button>
    </div>
  );
}
