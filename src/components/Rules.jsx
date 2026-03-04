import { S, btnOutline, card } from '../theme';

export default function Rules({ setScreen, t }) {
  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: S.font, padding: 20 }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <button onClick={() => setScreen("menu")} style={btnOutline({ marginBottom: 20 })}>← {t.back}</button>
        <h2 style={{ color: S.gold, fontFamily: S.font }}>{t.rulesTitle}</h2>
        <div style={card()}>
          <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 14, color: S.text, fontFamily: S.font }}>{t.rulesText}</pre>
        </div>
      </div>
    </div>
  );
}
