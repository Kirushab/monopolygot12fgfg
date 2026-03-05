import { S } from '../theme';
import { HOUSES } from '../gameData';

export default function PropertyCard({ cell, owner, lang, t, onClose, devData }) {
  const ui = devData?.uiConfig || {};
  const accent = devData?.accentColor || S.gold;
  const font = devData?.font || S.font;
  const text = ui.pageText || S.text;
  const textDim = ui.pageTextDim || S.textDim;
  const house = cell.house ? HOUSES[cell.house] : null;
  const houseColor = (cell.house && devData?.houseColors?.[cell.house]) || house?.color;
  const displayName = devData?.cellNames?.[cell.id] ?? cell.name;
  const ownerColor = owner && (devData?.playerColors?.[owner.id] || owner.color);

  return (
    <div style={{ padding: 12, borderBottom: `1px solid ${ui.panelBorder || S.border}`, maxHeight: 220, overflow: "auto", background: ui.cardBg }}>
      <div style={{ fontFamily: font }}>
        {house && <div style={{ height: 5, background: houseColor, borderRadius: 2, marginBottom: 8 }} />}
        <div style={{ fontSize: 15, fontWeight: "bold", letterSpacing: 0.5, color: text }}>{displayName}</div>
        {cell.price && <div style={{ fontSize: 13, color: accent }}>{t.price}: {cell.price} {t.gold}</div>}
        {cell.rent && (
          <div style={{ fontSize: 12, color: textDim, marginTop: 6 }}>
            {cell.rent.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
                <span>{i === 0 ? t.rent : i < 5 ? `${i} ${t.tower}` : t.castle}</span>
                <span style={{ color: accent }}>{r}</span>
              </div>
            ))}
            {cell.buildCost && <div style={{ marginTop: 6 }}>{t.tower}: {cell.buildCost} {t.gold}</div>}
          </div>
        )}
        {owner && <div style={{ fontSize: 12, marginTop: 6 }}>{t.owner}: <span style={{ color: ownerColor }}>{owner.name}</span></div>}
        {cell._mortgaged && <div style={{ fontSize: 12, color: "#ff6b6b" }}>{t.mortgaged}</div>}
        <button onClick={onClose} style={{ fontSize: 12, color: textDim, background: "none", border: "none", cursor: "pointer", marginTop: 6, fontFamily: font }}>✕ {lang === "ru" ? "Закрыть" : "Close"}</button>
      </div>
    </div>
  );
}
