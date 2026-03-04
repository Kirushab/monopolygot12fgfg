import { S } from '../theme';
import { HOUSES } from '../gameData';

export default function Cell({ cell, idx, pos, isCorner, owner, playersHere, selected, onClick }) {
  const house = cell.house ? HOUSES[cell.house] : null;

  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        left: pos.x, top: pos.y, width: pos.w, height: pos.h,
        border: `1px solid ${S.gold}22`,
        background: selected ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.02)",
        cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontSize: isCorner ? 10 : 8,
        color: S.text,
        overflow: "hidden",
        padding: 3,
        fontFamily: S.font,
        transition: "background 0.2s",
      }}
    >
      {/* House color bar */}
      {house && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: isCorner ? 10 : 7, background: house.color }} />
      )}
      {/* Owner indicator */}
      {owner && (
        <div style={{ position: "absolute", bottom: 2, right: 2, width: 8, height: 8, borderRadius: "50%", background: owner.color, border: "1px solid rgba(0,0,0,0.3)" }} />
      )}
      {/* Cell icon */}
      {cell.icon && (
        <div style={{ fontSize: isCorner ? 20 : 14 }}>{cell.icon}</div>
      )}
      {/* Cell name */}
      <div style={{ textAlign: "center", lineHeight: 1.15, marginTop: house ? 5 : 0, fontWeight: isCorner ? "bold" : "normal", letterSpacing: 0.3 }}>
        {cell.name?.length > 14 ? cell.name.slice(0, 12) + "…" : cell.name}
      </div>
      {/* Price */}
      {cell.price && <div style={{ fontSize: 8, color: S.gold, fontWeight: "bold" }}>{cell.price}</div>}
      {/* Buildings */}
      {cell._buildings > 0 && (
        <div style={{ fontSize: 8, color: cell._buildings >= 5 ? "#ff4444" : "#50c878" }}>
          {cell._buildings >= 5 ? "🏰" : "🔷".repeat(cell._buildings)}
        </div>
      )}
      {/* Mortgaged */}
      {cell._mortgaged && <div style={{ fontSize: 7, color: "#ff6b6b", fontWeight: "bold" }}>M</div>}
      {/* Players on cell */}
      {playersHere.length > 0 && (
        <div style={{ position: "absolute", bottom: 2, left: 2, display: "flex", gap: 1 }}>
          {playersHere.map((p) => (
            <span key={p.id} style={{ fontSize: 12 }}>{p.token.emoji}</span>
          ))}
        </div>
      )}
    </div>
  );
}
