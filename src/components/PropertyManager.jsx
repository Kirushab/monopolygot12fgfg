import { useState, useMemo } from 'react';
import { S, btn, btnOutline, card } from '../theme';
import { HOUSES } from '../gameData';

const rgba = (hex, a) => {
  if (!hex || hex[0] !== '#') return `rgba(201,168,76,${a})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const BUILDING_LABELS = ['', '🏠', '🏠🏠', '🏠🏠🏠', '🏠🏠🏠🏠', '🏰'];

export default function PropertyManager({ game, cp, isMyTurn, lang, t, doBuild, doMortgage, doRedeem, onClose, devData }) {
  const [filter, setFilter] = useState("all"); // all, buildable, mortgaged
  const accent = devData?.accentColor || S.gold;
  const font = devData?.font || S.font;
  const cells = game.cells;

  // Group properties by house
  const grouped = useMemo(() => {
    const groups = {};
    const other = [];

    cp.properties.forEach(pid => {
      const cell = cells[pid];
      if (cell.house) {
        if (!groups[cell.house]) groups[cell.house] = [];
        groups[cell.house].push(cell);
      } else {
        other.push(cell);
      }
    });

    return { groups, other };
  }, [cp.properties, cells]);

  // Check if player owns full set
  const ownsFullSet = (houseName) => {
    const houseProps = cells.filter(c => c.house === houseName).map(c => c.id);
    return houseProps.every(id => cp.properties.includes(id));
  };

  // Filter
  const filterProp = (cell) => {
    if (filter === "buildable") {
      return cell.house && cell.buildCost && ownsFullSet(cell.house) && (cell._buildings || 0) < 5 && cp.money >= cell.buildCost;
    }
    if (filter === "mortgaged") return cell._mortgaged;
    return true;
  };

  const totalProps = cp.properties.length;
  const totalWealth = cp.properties.reduce((sum, pid) => {
    const c = cells[pid];
    return sum + c.price + (c._buildings || 0) * (c.buildCost || 0);
  }, 0);

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0,
      width: Math.min(360, window.innerWidth),
      background: S.bg2, borderLeft: `1px solid ${rgba(accent, 0.2)}`,
      zIndex: 90, display: "flex", flexDirection: "column",
      boxShadow: "-4px 0 20px rgba(0,0,0,0.5)",
      fontFamily: font, color: S.text,
      animation: "slideInRight 0.3s ease-out",
    }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ color: accent, fontWeight: "bold", fontSize: 14 }}>
            {lang === "ru" ? "Мои владения" : "My Properties"}
          </div>
          <div style={{ fontSize: 10, color: S.textDim }}>
            {totalProps} {lang === "ru" ? "объектов" : "properties"} · {totalWealth} {t.gold}
          </div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: S.textDim, fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", padding: "6px 10px", gap: 6, borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
        {[
          ["all", lang === "ru" ? "Все" : "All"],
          ["buildable", lang === "ru" ? "Строить" : "Build"],
          ["mortgaged", lang === "ru" ? "Залог" : "Mortgaged"],
        ].map(([key, lbl]) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: "4px 10px", fontSize: 11, cursor: "pointer",
            background: filter === key ? `${accent}22` : "transparent",
            color: filter === key ? accent : S.textDim,
            border: `1px solid ${filter === key ? accent + "44" : S.border}`,
            borderRadius: 4, fontFamily: font,
          }}>{lbl}</button>
        ))}
      </div>

      {/* Properties list */}
      <div style={{ flex: 1, overflow: "auto", padding: 10, WebkitOverflowScrolling: "touch" }}>
        {cp.properties.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: S.textDim }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏘</div>
            <div>{lang === "ru" ? "Нет купленных улиц" : "No properties yet"}</div>
          </div>
        )}

        {/* Grouped by house */}
        {Object.entries(grouped.groups).map(([houseName, props]) => {
          const house = HOUSES[houseName];
          const houseColor = devData?.houseColors?.[houseName] || house?.color || accent;
          const fullSet = ownsFullSet(houseName);
          const filtered = props.filter(filterProp);
          if (filtered.length === 0) return null;

          return (
            <div key={houseName} style={{ marginBottom: 12 }}>
              {/* House header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
                padding: "4px 8px", borderRadius: 6,
                background: `linear-gradient(90deg, ${rgba(houseColor, 0.15)}, transparent)`,
                borderLeft: `3px solid ${houseColor}`,
              }}>
                <span style={{ fontSize: 14 }}>{devData?.houseSigils?.[houseName] || house?.sigil}</span>
                <span style={{ fontSize: 12, fontWeight: "bold", color: houseColor }}>{house?.name?.[lang === "ru" ? "ru" : "en"] || houseName}</span>
                {fullSet && <span style={{ fontSize: 9, background: "#50c87822", color: "#50c878", padding: "1px 6px", borderRadius: 10, fontWeight: "bold" }}>
                  {lang === "ru" ? "ПОЛНЫЙ НАБОР" : "FULL SET"}
                </span>}
              </div>

              {/* Properties in this house */}
              {filtered.map(cell => (
                <PropertyRow
                  key={cell.id} cell={cell}
                  canBuild={fullSet && cell.buildCost && (cell._buildings || 0) < 5 && cp.money >= cell.buildCost && isMyTurn && game.phase === "endturn"}
                  canMortgage={!cell._mortgaged && !(cell._buildings > 0) && isMyTurn && game.phase === "endturn"}
                  canRedeem={cell._mortgaged && cp.money >= Math.floor(cell.price / 2 * 1.1) && isMyTurn && game.phase === "endturn"}
                  doBuild={doBuild} doMortgage={doMortgage} doRedeem={doRedeem}
                  accent={accent} houseColor={houseColor} lang={lang} t={t} devData={devData}
                />
              ))}
            </div>
          );
        })}

        {/* Other properties (utilities, ports) */}
        {grouped.other.filter(filterProp).length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
              padding: "4px 8px", borderRadius: 6,
              background: `${rgba(accent, 0.08)}`,
              borderLeft: `3px solid ${accent}`,
            }}>
              <span style={{ fontSize: 12, fontWeight: "bold", color: accent }}>{lang === "ru" ? "Прочее" : "Other"}</span>
            </div>
            {grouped.other.filter(filterProp).map(cell => (
              <PropertyRow
                key={cell.id} cell={cell}
                canBuild={false} canMortgage={!cell._mortgaged && isMyTurn && game.phase === "endturn"}
                canRedeem={cell._mortgaged && cp.money >= Math.floor(cell.price / 2 * 1.1) && isMyTurn && game.phase === "endturn"}
                doBuild={doBuild} doMortgage={doMortgage} doRedeem={doRedeem}
                accent={accent} houseColor={accent} lang={lang} t={t} devData={devData}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom summary */}
      <div style={{ padding: "8px 14px", borderTop: `1px solid ${S.border}`, display: "flex", justifyContent: "space-between", fontSize: 11, color: S.textDim, flexShrink: 0 }}>
        <span>💰 {cp.money} {t.gold}</span>
        <span>{cp.properties.filter(pid => cells[pid]._mortgaged).length} {lang === "ru" ? "в залоге" : "mortgaged"}</span>
      </div>
    </div>
  );
}

function PropertyRow({ cell, canBuild, canMortgage, canRedeem, doBuild, doMortgage, doRedeem, accent, houseColor, lang, t, devData }) {
  const buildings = cell._buildings || 0;
  const customName = devData?.cellNames?.[cell.id];
  const name = customName ?? cell.name;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 8px", marginBottom: 4,
      background: cell._mortgaged ? "rgba(255,107,107,0.05)" : S.bg3,
      border: `1px solid ${cell._mortgaged ? "rgba(255,107,107,0.15)" : S.border}`,
      borderRadius: 6,
    }}>
      {/* Icon */}
      <div style={{ fontSize: 16, width: 24, textAlign: "center", flexShrink: 0 }}>
        {devData?.cellTextures?.[cell.id] ? (
          <img src={devData.cellTextures[cell.id]} style={{ width: 20, height: 20, objectFit: "contain" }} />
        ) : (
          cell.icon || "🏢"
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: "bold", color: S.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
          {cell._mortgaged && <span style={{ color: "#ff6b6b", fontSize: 9, marginLeft: 4 }}>ЗАЛОГ</span>}
        </div>
        <div style={{ fontSize: 9, color: S.textDim, display: "flex", gap: 6 }}>
          <span>{cell.price} {t.gold}</span>
          {buildings > 0 && <span style={{ color: "#50c878" }}>{BUILDING_LABELS[buildings]}</span>}
          {cell.buildCost && <span>🔨{cell.buildCost}</span>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
        {canBuild && (
          <button onClick={() => doBuild(cell.id)} style={{
            padding: "3px 8px", fontSize: 10, cursor: "pointer",
            background: "#50c87822", color: "#50c878",
            border: "1px solid #50c87844", borderRadius: 4,
          }}>+🏠</button>
        )}
        {canMortgage && (
          <button onClick={() => doMortgage(cell.id)} style={{
            padding: "3px 6px", fontSize: 9, cursor: "pointer",
            background: "transparent", color: "#ff6b6b",
            border: "1px solid #ff6b6b33", borderRadius: 4,
          }}>{lang === "ru" ? "Залог" : "M"}</button>
        )}
        {canRedeem && (
          <button onClick={() => doRedeem(cell.id)} style={{
            padding: "3px 6px", fontSize: 9, cursor: "pointer",
            background: "transparent", color: "#50c878",
            border: "1px solid #50c87833", borderRadius: 4,
          }}>{lang === "ru" ? "Выкуп" : "R"}</button>
        )}
      </div>
    </div>
  );
}
