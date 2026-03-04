import { S } from '../theme';
import { HOUSES } from '../gameData';

export default function PropertyCard({ cell, owner, lang, t, onClose }) {
  const house = cell.house ? HOUSES[cell.house] : null;

  return (
    <div style={{ padding: 12, borderBottom: `1px solid ${S.border}`, maxHeight: 220, overflow: "auto" }}>
      <div style={{ fontFamily: S.font }}>
        {house && <div style={{ height: 5, background: house.color, borderRadius: 2, marginBottom: 8 }} />}
        <div style={{ fontSize: 15, fontWeight: "bold", letterSpacing: 0.5 }}>{cell.name}</div>
        {cell.price && <div style={{ fontSize: 13, color: S.gold }}>{t.price}: {cell.price} {t.gold}</div>}
        {cell.rent && (
          <div style={{ fontSize: 12, color: S.textDim, marginTop: 6 }}>
            {cell.rent.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}>
                <span>{i === 0 ? t.rent : i < 5 ? `${i} ${t.tower}` : t.castle}</span>
                <span style={{ color: S.gold }}>{r}</span>
              </div>
            ))}
            {cell.buildCost && <div style={{ marginTop: 6 }}>{t.tower}: {cell.buildCost} {t.gold}</div>}
          </div>
        )}
        {owner && <div style={{ fontSize: 12, marginTop: 6 }}>{t.owner}: <span style={{ color: owner.color }}>{owner.name}</span></div>}
        {cell._mortgaged && <div style={{ fontSize: 12, color: "#ff6b6b" }}>{t.mortgaged}</div>}
        <button onClick={onClose} style={{ fontSize: 12, color: S.textDim, background: "none", border: "none", cursor: "pointer", marginTop: 6, fontFamily: S.font }}>✕ {lang === "ru" ? "Закрыть" : "Close"}</button>
      </div>
    </div>
  );
}
