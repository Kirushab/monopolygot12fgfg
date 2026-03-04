import { S } from '../theme';
import { HOUSES } from '../gameData';

// Helper: hex to rgba
const rgba = (hex, a) => {
  if (!hex || hex[0] !== '#') return `rgba(201,168,76,${a})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const BUILDING_ICONS = ['', '🏠', '🏠🏠', '🏠🏠🏠', '🏠🏠🏠🏠', '🏰'];

export default function Cell({ cell, idx, pos, isCorner, owner, playersHere, selected, isCurrent, onClick, devData }) {
  const house = cell.house ? HOUSES[cell.house] : null;
  const customName = devData?.cellNames?.[cell.id];
  const customTexture = devData?.cellTextures?.[cell.id];
  const cellBgTexture = devData?.cellBgTextures?.[cell.id];
  const displayName = customName ?? cell.name;
  const cellIconSize = devData?.layout?.cellIconSize || 22;

  // Dev overrides
  const accent = devData?.accentColor || S.gold;
  const houseColor = (cell.house && devData?.houseColors?.[cell.house]) || house?.color;
  const ownerColor = owner && (devData?.playerColors?.[owner.id] || owner.color);
  const cellBg = devData?.cellBgColors?.[cell.id];

  // Custom building textures
  const buildingTextures = devData?.buildingTextures || {};
  const buildings = cell._buildings || 0;

  // Render custom building icons
  const renderBuildings = () => {
    if (buildings <= 0) return null;
    if (buildings >= 5 && buildingTextures.castle) {
      return <img src={buildingTextures.castle} style={{ width: 14, height: 14, objectFit: "contain" }} />;
    }
    if (buildingTextures.house) {
      return (
        <div style={{ display: "flex", gap: 1 }}>
          {Array.from({ length: Math.min(buildings, 4) }, (_, i) => (
            <img key={i} src={buildingTextures.house} style={{ width: 8, height: 8, objectFit: "contain" }} />
          ))}
        </div>
      );
    }
    return <span>{BUILDING_ICONS[buildings] || BUILDING_ICONS[5]}</span>;
  };

  // Determine background
  let bgStyle;
  if (cellBgTexture) {
    bgStyle = {
      backgroundImage: `url(${cellBgTexture})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  } else if (cellBg) {
    bgStyle = { background: `linear-gradient(135deg, ${cellBg}, ${rgba(cellBg, 0.6)})` };
  } else if (selected) {
    bgStyle = { background: `linear-gradient(135deg, ${rgba(accent, 0.18)}, ${rgba(accent, 0.08)})` };
  } else if (owner) {
    bgStyle = { background: `linear-gradient(135deg, ${ownerColor}08, transparent)` };
  } else {
    bgStyle = { background: "rgba(255,255,255,0.015)" };
  }

  return (
    <div
      className={`cell${isCurrent ? " active-player" : ""}`}
      onClick={onClick}
      style={{
        position: "absolute",
        left: pos.x, top: pos.y, width: pos.w, height: pos.h,
        border: selected ? `1px solid ${rgba(accent, 0.53)}` : `1px solid ${rgba(accent, 0.08)}`,
        ...bgStyle,
        cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontSize: isCorner ? 10 : 8,
        color: S.text,
        overflow: "hidden",
        padding: 3,
        fontFamily: devData?.font || S.font,
        transition: "all 0.2s ease",
        boxShadow: selected ? `inset 0 0 12px ${rgba(accent, 0.15)}` : "none",
      }}
    >
      {/* Dark overlay for bg texture readability */}
      {cellBgTexture && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", pointerEvents: "none" }} />
      )}

      {/* House color bar */}
      {house && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: isCorner ? 12 : 8,
          background: `linear-gradient(135deg, ${houseColor}, ${houseColor}aa)`,
          boxShadow: `0 2px 6px ${houseColor}44`,
          zIndex: 1,
        }} />
      )}

      {/* Owner border glow */}
      {owner && (
        <div style={{ position: "absolute", inset: 0, border: `1px solid ${ownerColor}33`, pointerEvents: "none", zIndex: 1 }} />
      )}

      {/* Cell icon — custom texture or emoji */}
      {customTexture ? (
        <img src={customTexture} style={{
          width: isCorner ? cellIconSize + 10 : cellIconSize,
          height: isCorner ? cellIconSize + 10 : cellIconSize,
          objectFit: "contain",
          marginTop: house ? 4 : 0,
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
          position: "relative", zIndex: 2,
        }} />
      ) : cell.icon ? (
        <div style={{ fontSize: isCorner ? cellIconSize : Math.round(cellIconSize * 0.68), filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))", marginTop: house ? 4 : 0, position: "relative", zIndex: 2 }}>{cell.icon}</div>
      ) : null}

      {/* Cell name */}
      <div style={{
        textAlign: "center", lineHeight: 1.15,
        marginTop: house && !cell.icon && !customTexture ? 6 : 1,
        fontWeight: isCorner ? "bold" : "normal",
        letterSpacing: 0.3, fontSize: isCorner ? 9 : 7,
        textShadow: "0 1px 2px rgba(0,0,0,0.5)",
        position: "relative", zIndex: 2,
      }}>
        {displayName?.length > 14 ? displayName.slice(0, 12) + "…" : displayName}
      </div>

      {/* Price */}
      {cell.price && (
        <div style={{ fontSize: 7, color: accent, fontWeight: "bold", textShadow: `0 0 4px ${rgba(accent, 0.3)}`, marginTop: 1, position: "relative", zIndex: 2 }}>{cell.price}</div>
      )}

      {/* Buildings */}
      {buildings > 0 && (
        <div style={{
          fontSize: buildings >= 5 ? 10 : 7,
          position: "absolute", top: house ? (isCorner ? 14 : 10) : 2, right: 2,
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
          zIndex: 3,
        }}>
          {renderBuildings()}
        </div>
      )}

      {/* Mortgaged */}
      {cell._mortgaged && (
        <div style={{ position: "absolute", top: 2, right: 2, fontSize: 6, color: "#ff6b6b", fontWeight: "bold", background: "rgba(139,0,0,0.3)", padding: "1px 3px", borderRadius: 2, lineHeight: 1, zIndex: 3 }}>M</div>
      )}

      {/* Owner dot */}
      {owner && (
        <div style={{ position: "absolute", bottom: 2, right: 2, width: 7, height: 7, borderRadius: "50%", background: `radial-gradient(circle, ${ownerColor}, ${ownerColor}88)`, boxShadow: `0 0 4px ${ownerColor}66`, zIndex: 3 }} />
      )}

      {/* Players on cell */}
      {playersHere.length > 0 && (
        <div style={{ position: "absolute", bottom: 1, left: 1, display: "flex", gap: 0, flexWrap: "wrap", zIndex: 3 }}>
          {playersHere.map((p) => {
            const pColor = devData?.playerColors?.[p.id] || p.color;
            return devData?.tokenTextures?.[p.id] ? (
              <img key={p.id} src={devData.tokenTextures[p.id]} style={{
                width: isCorner ? 13 : 10,
                height: isCorner ? 13 : 10,
                borderRadius: "50%",
                objectFit: "cover",
                filter: `drop-shadow(0 1px 3px ${pColor}88)`,
              }} />
            ) : (
              <span key={p.id} className="player-token" style={{ fontSize: isCorner ? 13 : 10, filter: `drop-shadow(0 1px 3px ${pColor}88)` }}>{p.token.emoji}</span>
            );
          })}
        </div>
      )}
    </div>
  );
}
