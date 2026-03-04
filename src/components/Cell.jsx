import { S } from '../theme';
import { HOUSES } from '../gameData';

const BUILDING_ICONS = ['', '🏠', '🏠🏠', '🏠🏠🏠', '🏠🏠🏠🏠', '🏰'];

export default function Cell({ cell, idx, pos, isCorner, owner, playersHere, selected, isCurrent, onClick, devData }) {
  const house = cell.house ? HOUSES[cell.house] : null;
  const customName = devData?.cellNames?.[cell.id];
  const customTexture = devData?.cellTextures?.[cell.id];
  const displayName = customName ?? cell.name;

  return (
    <div
      className={`cell${isCurrent ? " active-player" : ""}`}
      onClick={onClick}
      style={{
        position: "absolute",
        left: pos.x, top: pos.y, width: pos.w, height: pos.h,
        border: selected ? `1px solid ${S.gold}88` : `1px solid ${S.gold}15`,
        background: selected
          ? `linear-gradient(135deg, rgba(201,168,76,0.18), rgba(201,168,76,0.08))`
          : owner
            ? `linear-gradient(135deg, ${owner.color}08, transparent)`
            : "rgba(255,255,255,0.015)",
        cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontSize: isCorner ? 10 : 8,
        color: S.text,
        overflow: "hidden",
        padding: 3,
        fontFamily: S.font,
        transition: "all 0.2s ease",
        boxShadow: selected ? `inset 0 0 12px rgba(201,168,76,0.15)` : "none",
      }}
    >
      {/* House color bar */}
      {house && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: isCorner ? 12 : 8,
          background: `linear-gradient(135deg, ${house.color}, ${house.color}aa)`,
          boxShadow: `0 2px 6px ${house.color}44`,
        }} />
      )}

      {/* Owner border glow */}
      {owner && (
        <div style={{ position: "absolute", inset: 0, border: `1px solid ${owner.color}33`, pointerEvents: "none" }} />
      )}

      {/* Cell icon — custom texture or emoji */}
      {customTexture ? (
        <img src={customTexture} style={{
          width: isCorner ? 32 : 22,
          height: isCorner ? 32 : 22,
          objectFit: "contain",
          marginTop: house ? 4 : 0,
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
        }} />
      ) : cell.icon ? (
        <div style={{ fontSize: isCorner ? 22 : 15, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))", marginTop: house ? 4 : 0 }}>{cell.icon}</div>
      ) : null}

      {/* Cell name */}
      <div style={{
        textAlign: "center", lineHeight: 1.15,
        marginTop: house && !cell.icon && !customTexture ? 6 : 1,
        fontWeight: isCorner ? "bold" : "normal",
        letterSpacing: 0.3, fontSize: isCorner ? 9 : 7,
        textShadow: "0 1px 2px rgba(0,0,0,0.5)",
      }}>
        {displayName?.length > 14 ? displayName.slice(0, 12) + "…" : displayName}
      </div>

      {/* Price */}
      {cell.price && (
        <div style={{ fontSize: 7, color: S.gold, fontWeight: "bold", textShadow: "0 0 4px rgba(201,168,76,0.3)", marginTop: 1 }}>{cell.price}</div>
      )}

      {/* Buildings */}
      {cell._buildings > 0 && (
        <div style={{
          fontSize: cell._buildings >= 5 ? 10 : 7,
          position: "absolute", top: house ? (isCorner ? 14 : 10) : 2, right: 2,
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
        }}>
          {BUILDING_ICONS[cell._buildings] || BUILDING_ICONS[5]}
        </div>
      )}

      {/* Mortgaged */}
      {cell._mortgaged && (
        <div style={{ position: "absolute", top: 2, right: 2, fontSize: 6, color: "#ff6b6b", fontWeight: "bold", background: "rgba(139,0,0,0.3)", padding: "1px 3px", borderRadius: 2, lineHeight: 1 }}>M</div>
      )}

      {/* Owner dot */}
      {owner && (
        <div style={{ position: "absolute", bottom: 2, right: 2, width: 7, height: 7, borderRadius: "50%", background: `radial-gradient(circle, ${owner.color}, ${owner.color}88)`, boxShadow: `0 0 4px ${owner.color}66` }} />
      )}

      {/* Players on cell */}
      {playersHere.length > 0 && (
        <div style={{ position: "absolute", bottom: 1, left: 1, display: "flex", gap: 0, flexWrap: "wrap" }}>
          {playersHere.map((p) => (
            devData?.tokenTextures?.[p.id] ? (
              <img key={p.id} src={devData.tokenTextures[p.id]} style={{
                width: isCorner ? 13 : 10,
                height: isCorner ? 13 : 10,
                borderRadius: "50%",
                objectFit: "cover",
                filter: `drop-shadow(0 1px 3px ${p.color}88)`,
              }} />
            ) : (
              <span key={p.id} className="player-token" style={{ fontSize: isCorner ? 13 : 10, filter: `drop-shadow(0 1px 3px ${p.color}88)` }}>{p.token.emoji}</span>
            )
          ))}
        </div>
      )}
    </div>
  );
}
