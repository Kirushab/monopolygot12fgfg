import { S, btnOutline, card } from '../theme';

export default function Rules({ setScreen, t, devData }) {
  const ui = devData?.uiConfig || {};
  const accent = devData?.accentColor || S.gold;
  const font = devData?.font || S.font;

  return (
    <div style={{ minHeight: "100vh", background: ui.pageBg || S.bg, color: ui.pageText || S.text, fontFamily: font, padding: 20 }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <button onClick={() => setScreen("menu")} style={btnOutline({ marginBottom: 20 })}>← {t.back}</button>
        <h2 style={{ color: accent, fontFamily: font }}>{ui.rulesTitle || t.rulesTitle}</h2>
        <div style={card({ background: ui.cardBg, borderColor: ui.cardBorder })}>
          <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 14, color: ui.pageText || S.text, fontFamily: font }}>{t.rulesText}</pre>
        </div>
      </div>
    </div>
  );
}
