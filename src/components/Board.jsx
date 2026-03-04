import { useRef, useState, useEffect } from 'react';
import { S } from '../theme';
import { BOARD_SIZE, CORNER } from '../gameData';
import { getCellPos } from '../gameEngine';
import Cell from './Cell';

// Dice face dots layout
const DICE_DOTS = {
  1: [[50,50]],
  2: [[25,25],[75,75]],
  3: [[25,25],[50,50],[75,75]],
  4: [[25,25],[75,25],[25,75],[75,75]],
  5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
  6: [[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]],
};

function DiceFace({ value, rolling }) {
  const dots = DICE_DOTS[value] || DICE_DOTS[1];
  return (
    <div className={`dice ${rolling ? "rolling" : "landed"}`} style={{
      width: 56, height: 56,
      background: "linear-gradient(145deg, #1e1e2e, #0e0e1a)",
      border: `2px solid ${S.gold}`,
      borderRadius: 10,
      position: "relative",
      boxShadow: `0 4px 12px rgba(0,0,0,0.6), inset 0 1px 2px rgba(201,168,76,0.15)`,
    }}>
      {rolling ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: S.gold, fontWeight: "bold" }}>?</div>
      ) : (
        dots.map(([x, y], i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${x}%`, top: `${y}%`,
            width: 9, height: 9,
            borderRadius: "50%",
            background: `radial-gradient(circle, #ffd700, ${S.gold})`,
            transform: "translate(-50%,-50%)",
            boxShadow: "0 0 4px rgba(201,168,76,0.5)",
          }} />
        ))
      )}
    </div>
  );
}

export default function Board({ game, selectedCell, setSelectedCell, getPropertyOwner, diceAnim, animPos, cp, devData }) {
  const cells = game.cells;
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Auto-scale board to fit container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const { clientWidth, clientHeight } = container;
      const pad = 16;
      const s = Math.min((clientWidth - pad) / BOARD_SIZE, (clientHeight - pad) / BOARD_SIZE, 1);
      setScale(Math.max(s, 0.3));
    };

    const ro = new ResizeObserver(updateScale);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="game-board-container" style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
      <div style={{
        position: "relative", width: BOARD_SIZE, height: BOARD_SIZE,
        background: `linear-gradient(135deg, ${S.bg3}, #0f0f1a)`,
        border: `2px solid ${S.gold}33`,
        borderRadius: 12,
        flexShrink: 0,
        boxShadow: `0 0 40px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.3)`,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
      }}>
        {/* Board texture overlay */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 12,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(201,168,76,0.04) 40px, rgba(201,168,76,0.04) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(201,168,76,0.04) 40px, rgba(201,168,76,0.04) 41px)",
          pointerEvents: "none",
        }} />

        {/* Center logo */}
        <div style={{
          position: "absolute", left: CORNER + 16, top: CORNER + 16, right: CORNER + 16, bottom: CORNER + 16,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          border: `1px solid ${S.gold}18`,
          borderRadius: 12,
          background: devData?.boardBg
            ? `url(${devData.boardBg}) center/cover no-repeat`
            : `radial-gradient(ellipse at center, rgba(26,26,46,0.95) 0%, rgba(10,10,18,0.98) 100%)`,
          overflow: "hidden",
        }}>
          {/* Dark overlay if custom bg */}
          {devData?.boardBg && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", pointerEvents: "none" }} />
          )}

          {/* Decorative corner marks */}
          {[[0,0],[1,0],[0,1],[1,1]].map(([cx,cy], i) => (
            <div key={i} style={{
              position: "absolute",
              [cy ? "bottom" : "top"]: 8,
              [cx ? "right" : "left"]: 8,
              width: 20, height: 20,
              borderTop: cy ? "none" : `1px solid ${S.gold}44`,
              borderBottom: cy ? `1px solid ${S.gold}44` : "none",
              borderLeft: cx ? "none" : `1px solid ${S.gold}44`,
              borderRight: cx ? `1px solid ${S.gold}44` : "none",
              zIndex: 1,
            }} />
          ))}

          <div style={{ fontSize: 48, animation: "float 4s ease-in-out infinite", zIndex: 1 }}>⚔️</div>
          <div className="shimmer-text" style={{ fontFamily: S.font, fontSize: 22, fontWeight: "bold", letterSpacing: 4, marginTop: 4, zIndex: 1 }}>KIRSHAS</div>
          <div style={{ color: S.gold, fontFamily: S.font, fontSize: 12, letterSpacing: 7, opacity: 0.7, zIndex: 1 }}>MONOPOLIA</div>

          {/* Dice display */}
          {(game.dice[0] > 0 || diceAnim) && (
            <div style={{ display: "flex", gap: 16, marginTop: 24, zIndex: 1 }}>
              <DiceFace value={game.dice[0]} rolling={diceAnim} />
              <DiceFace value={game.dice[1]} rolling={diceAnim} />
            </div>
          )}

          {/* Message */}
          {game.message && (
            <div style={{
              marginTop: 16, color: S.text, fontSize: 13, textAlign: "center",
              maxWidth: 300, lineHeight: 1.6, fontFamily: S.font,
              animation: "fadeIn 0.4s ease-out",
              padding: "8px 16px",
              background: "rgba(201,168,76,0.05)",
              borderRadius: 8,
              border: `1px solid ${S.gold}11`,
              zIndex: 1,
            }}>{game.message}</div>
          )}
        </div>

        {/* CELLS */}
        {cells.map((cell, idx) => {
          const pos = getCellPos(idx);
          const isCorner = [0, 10, 20, 30].includes(idx);
          const owner = getPropertyOwner(idx);
          const playersHere = game.players.filter((p) => !p.bankrupt && p.position === idx);
          const isCurrent = playersHere.some(p => p.id === game.currentPlayer);

          return (
            <Cell
              key={idx}
              cell={cell}
              idx={idx}
              pos={pos}
              isCorner={isCorner}
              owner={owner}
              playersHere={playersHere}
              selected={selectedCell === idx}
              isCurrent={isCurrent}
              onClick={() => setSelectedCell(idx)}
              devData={devData}
            />
          );
        })}

        {/* Animation overlay — moving token */}
        {animPos && (
          <div style={{
            position: "absolute",
            left: animPos.x - 18, top: animPos.y - 18,
            width: 36, height: 36,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, zIndex: 10,
            transition: "left 0.05s linear, top 0.05s linear",
            filter: "drop-shadow(0 0 14px rgba(201,168,76,0.9)) drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
            animation: "tokenMove 0.3s ease-out",
          }}>
            {devData?.tokenTextures?.[cp.id] ? (
              <img src={devData.tokenTextures[cp.id]} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              cp.token.emoji
            )}
          </div>
        )}
      </div>
    </div>
  );
}
