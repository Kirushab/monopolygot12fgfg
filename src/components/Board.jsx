import { S } from '../theme';
import { BOARD_SIZE, CORNER } from '../gameData';
import { getCellPos } from '../gameEngine';
import Cell from './Cell';

export default function Board({ game, selectedCell, setSelectedCell, getPropertyOwner, diceAnim, animPos, cp }) {
  const cells = game.cells;

  return (
    <div style={{ position: "relative", width: BOARD_SIZE, height: BOARD_SIZE, background: S.bg3, border: `2px solid ${S.gold}44`, borderRadius: 10, flexShrink: 0 }}>
      {/* Center logo */}
      <div style={{ position: "absolute", left: CORNER + 20, top: CORNER + 20, right: CORNER + 20, bottom: CORNER + 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `1px solid ${S.gold}22`, borderRadius: 10, background: "rgba(10,10,18,0.85)" }}>
        <div style={{ fontSize: 48 }}>⚔️</div>
        <div style={{ color: S.gold, fontFamily: S.font, fontSize: 20, fontWeight: "bold", letterSpacing: 3 }}>KIRSHAS</div>
        <div style={{ color: S.gold, fontFamily: S.font, fontSize: 13, letterSpacing: 5 }}>MONOPOLIA</div>
        {/* Dice display */}
        {(game.dice[0] > 0 || diceAnim) && (
          <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
            {[0, 1].map((i) => (
              <div key={i} style={{
                width: 54, height: 54, background: "#1a1a1a", border: `2px solid ${S.gold}`, borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: "bold", color: S.gold,
                fontFamily: S.font, animation: diceAnim ? "shake 0.1s infinite" : "none",
              }}>
                {diceAnim ? "?" : game.dice[i]}
              </div>
            ))}
          </div>
        )}
        {/* Message */}
        {game.message && (
          <div style={{ marginTop: 16, color: S.text, fontSize: 13, textAlign: "center", maxWidth: 280, lineHeight: 1.5, fontFamily: S.font }}>{game.message}</div>
        )}
      </div>

      {/* CELLS */}
      {cells.map((cell, idx) => {
        const pos = getCellPos(idx);
        const isCorner = [0, 10, 20, 30].includes(idx);
        const owner = getPropertyOwner(idx);
        const playersHere = game.players.filter((p) => !p.bankrupt && p.position === idx);

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
            onClick={() => setSelectedCell(idx)}
          />
        );
      })}

      {/* Animation overlay */}
      {animPos && (
        <div style={{
          position: "absolute",
          left: animPos.x - 16, top: animPos.y - 16,
          width: 32, height: 32,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, zIndex: 10,
          transition: "left 0.05s, top 0.05s",
          filter: "drop-shadow(0 0 10px rgba(201,168,76,0.8))",
        }}>
          {cp.token.emoji}
        </div>
      )}
    </div>
  );
}
