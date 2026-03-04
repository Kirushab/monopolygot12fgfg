import { S, btn, btnOutline, card } from '../theme';

export default function ActionPanel({
  game, cp, cells, isMyTurn, lang, t,
  animating, diceAnim,
  doRoll, doBuy, startAuction, endTurn,
  payJail, useFreedomCard, doBuild, doMortgage, doRedeem,
  auctionBid, setAuctionBid, doAuctionBid,
}) {
  return (
    <div style={{ flex: 1, padding: 10, overflow: "auto" }}>
      {/* Card drawn */}
      {game.cardDrawn && game.phase === "card" && (
        <div style={card({ marginBottom: 10, background: "#1a1a0e", border: `1px solid ${S.gold}` })}>
          <div style={{ fontSize: 13, lineHeight: 1.4 }}>{game.cardDrawn.text}</div>
          {isMyTurn && <button onClick={endTurn} style={btn({ marginTop: 8, width: "100%", fontSize: 13, padding: "8px" })}>{t.endTurn}</button>}
        </div>
      )}

      {/* Jail actions */}
      {game.phase === "roll" && cp.inJail && isMyTurn && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          <button onClick={doRoll} style={btn({ fontSize: 13, padding: "8px" })}>{t.tryDouble}</button>
          {cp.money >= 50 && <button onClick={payJail} style={btnOutline({ fontSize: 12 })}>{t.payJail}</button>}
          {cp.freedomCards > 0 && <button onClick={useFreedomCard} style={btnOutline({ fontSize: 12 })}>{t.useCard}</button>}
        </div>
      )}

      {/* Roll */}
      {game.phase === "roll" && !cp.inJail && isMyTurn && (
        <button onClick={doRoll} disabled={animating || diceAnim} style={btn({ width: "100%", fontSize: 16, padding: "12px", opacity: animating || diceAnim ? 0.5 : 1 })}>🎲 {t.rollDice}</button>
      )}

      {/* Buy */}
      {game.phase === "buy" && isMyTurn && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={doBuy} style={btn({ fontSize: 14, padding: "10px" })}>💰 {t.buy} ({cells[cp.position].price} {t.gold})</button>
          <button onClick={startAuction} style={btnOutline({ fontSize: 13 })}>{t.auction}</button>
        </div>
      )}

      {/* Auction */}
      {game.phase === "auction" && game.auctionState && (
        <div style={card({ marginBottom: 10 })}>
          <div style={{ fontSize: 13, fontWeight: "bold", color: S.gold }}>{t.auctionFor}: {cells[game.auctionState.cellId].name}</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>{t.currentBid}: {game.auctionState.highBid} {t.gold}</div>
          {game.auctionState.highBidder !== null && (
            <div style={{ fontSize: 12 }}>{t.highBidder}: {game.players[game.auctionState.highBidder].name}</div>
          )}
          {game.auctionState.bidOrder[game.auctionState.currentBidder] === game.currentPlayer && isMyTurn && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <input type="number" value={auctionBid} onChange={(e) => setAuctionBid(+e.target.value)} style={{ width: 80, background: S.bg, color: S.text, border: `1px solid ${S.border}`, borderRadius: 6, padding: "6px 8px", fontFamily: S.font }} />
              <button onClick={() => doAuctionBid(auctionBid)} style={btn({ fontSize: 12, padding: "6px 14px" })}>{t.bid}</button>
              <button onClick={() => doAuctionBid(0)} style={btnOutline({ fontSize: 12, padding: "6px 14px" })}>{t.pass}</button>
            </div>
          )}
        </div>
      )}

      {/* End turn + management */}
      {game.phase === "endturn" && isMyTurn && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Build buttons */}
          {cp.properties.filter((pid) => {
            const c = cells[pid];
            if (!c.house || !c.buildCost) return false;
            const houseProps = cells.filter((x) => x.house === c.house).map((x) => x.id);
            return houseProps.every((id) => cp.properties.includes(id)) && (c._buildings || 0) < 5 && cp.money >= c.buildCost;
          }).map((pid) => (
            <button key={pid} onClick={() => doBuild(pid)} style={btnOutline({ fontSize: 11 })}>
              🔨 {cells[pid].name} ({cells[pid].buildCost} {t.gold})
            </button>
          ))}

          {/* Mortgage */}
          {cp.properties.filter((pid) => !cells[pid]._mortgaged && !(cells[pid]._buildings > 0)).map((pid) => (
            <button key={`m${pid}`} onClick={() => doMortgage(pid)} style={{ ...btnOutline({ fontSize: 10, padding: "4px 8px" }), color: "#ff6b6b", borderColor: "#ff6b6b44" }}>
              {t.mortgage}: {cells[pid].name} (+{Math.floor(cells[pid].price / 2)})
            </button>
          ))}

          {/* Redeem */}
          {cp.properties.filter((pid) => cells[pid]._mortgaged && cp.money >= Math.floor(cells[pid].price / 2 * 1.1)).map((pid) => (
            <button key={`r${pid}`} onClick={() => doRedeem(pid)} style={{ ...btnOutline({ fontSize: 10, padding: "4px 8px" }), color: "#50c878", borderColor: "#50c87844" }}>
              {t.redeem}: {cells[pid].name} (-{Math.floor(cells[pid].price / 2 * 1.1)})
            </button>
          ))}

          <button onClick={endTurn} style={btn({ width: "100%", fontSize: 14, padding: "10px", marginTop: 4 })}>→ {t.endTurn}</button>
        </div>
      )}

      {/* AI thinking */}
      {cp.isAI && game.phase !== "gameover" && (
        <div style={{ textAlign: "center", padding: 20, color: S.textDim }}>
          <div style={{ fontSize: 24 }}>{cp.token.emoji}</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>{cp.name} {lang === "ru" ? "думает..." : "thinking..."}</div>
        </div>
      )}
    </div>
  );
}
