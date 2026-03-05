import { S, btn, btnOutline, card } from '../theme';

export default function ActionPanel({
  game, cp, cells, isMyTurn, lang, t,
  animating, diceAnim,
  doRoll, doBuy, startAuction, endTurn,
  payJail, useFreedomCard, doBuild, doMortgage, doRedeem,
  auctionBid, setAuctionBid, doAuctionBid,
  devData,
}) {
  const ui = devData?.uiConfig || {};
  const accent = devData?.accentColor || S.gold;
  const font = devData?.font || S.font;
  const panelBg = ui.panelBg || undefined;
  const text = ui.pageText || S.text;
  const textDim = ui.pageTextDim || S.textDim;

  return (
    <div style={{ flex: 1, padding: 10, overflow: "auto", background: panelBg, fontFamily: font }}>
      {/* Card drawn */}
      {game.cardDrawn && game.phase === "card" && (
        <div className="card-drawn" style={card({ marginBottom: 10, background: ui.cardBg || "linear-gradient(135deg, #1a1a0e, #12120e)", border: `1px solid ${ui.cardBorder || accent + "66"}`, boxShadow: `0 4px 20px rgba(201,168,76,0.15)` })}>
          <div style={{ fontSize: 14, lineHeight: 1.5, fontStyle: "italic", color: text }}>{game.cardDrawn.text}</div>
          {isMyTurn && <button onClick={endTurn} style={btn({ marginTop: 10, width: "100%", fontSize: 13, padding: "8px" })}>{t.endTurn}</button>}
        </div>
      )}

      {/* Jail actions */}
      {game.phase === "roll" && cp.inJail && isMyTurn && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10, animation: "fadeIn 0.3s ease-out" }}>
          <button onClick={doRoll} style={btn({ fontSize: 13, padding: "8px" })}>{t.tryDouble}</button>
          {cp.money >= 50 && <button onClick={payJail} style={btnOutline({ fontSize: 12 })}>{t.payJail}</button>}
          {cp.freedomCards > 0 && <button onClick={useFreedomCard} style={btnOutline({ fontSize: 12 })}>{t.useCard}</button>}
        </div>
      )}

      {/* Roll */}
      {game.phase === "roll" && !cp.inJail && isMyTurn && (
        <button onClick={doRoll} disabled={animating || diceAnim} style={{
          ...btn({ width: "100%", fontSize: 17, padding: "14px", opacity: animating || diceAnim ? 0.5 : 1 }),
          boxShadow: `0 4px 20px ${accent}40`,
          animation: animating || diceAnim ? "none" : "glow 2s ease-in-out infinite",
        }}>🎲 {t.rollDice}</button>
      )}

      {/* Buy */}
      {game.phase === "buy" && isMyTurn && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, animation: "slideInUp 0.3s ease-out" }}>
          <button onClick={doBuy} style={{ ...btn({ fontSize: 14, padding: "10px" }), boxShadow: `0 4px 16px ${accent}33` }}>💰 {t.buy} ({cells[cp.position].price} {t.gold})</button>
          <button onClick={startAuction} style={btnOutline({ fontSize: 13 })}>{t.auction}</button>
        </div>
      )}

      {/* Auction */}
      {game.phase === "auction" && game.auctionState && (
        <div style={card({ marginBottom: 10, animation: "fadeIn 0.3s ease-out", background: ui.cardBg, borderColor: ui.cardBorder })}>
          <div style={{ fontSize: 13, fontWeight: "bold", color: accent }}>{t.auctionFor}: {cells[game.auctionState.cellId].name}</div>
          <div style={{ fontSize: 12, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
            <span>{t.currentBid}: <span style={{ color: accent, fontWeight: "bold" }}>{game.auctionState.highBid}</span> {t.gold}</span>
          </div>
          {game.auctionState.highBidder !== null && (
            <div style={{ fontSize: 12, color: textDim }}>{t.highBidder}: {game.players[game.auctionState.highBidder].name}</div>
          )}
          {game.auctionState.bidOrder[game.auctionState.currentBidder] === game.currentPlayer && isMyTurn && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <input type="number" value={auctionBid} onChange={(e) => setAuctionBid(+e.target.value)} style={{ width: 80, background: ui.pageBg || S.bg, color: text, border: `1px solid ${ui.cardBorder || S.border}`, borderRadius: 6, padding: "6px 8px", fontFamily: font }} />
              <button onClick={() => doAuctionBid(auctionBid)} style={btn({ fontSize: 12, padding: "6px 14px" })}>{t.bid}</button>
              <button onClick={() => doAuctionBid(0)} style={btnOutline({ fontSize: 12, padding: "6px 14px" })}>{t.pass}</button>
            </div>
          )}
        </div>
      )}

      {/* End turn + management */}
      {game.phase === "endturn" && isMyTurn && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, animation: "fadeIn 0.3s ease-out" }}>
          {cp.properties.filter((pid) => {
            const c = cells[pid];
            if (!c.house || !c.buildCost) return false;
            const houseProps = cells.filter((x) => x.house === c.house).map((x) => x.id);
            return houseProps.every((id) => cp.properties.includes(id)) && (c._buildings || 0) < 5 && cp.money >= c.buildCost;
          }).map((pid) => (
            <button key={pid} onClick={() => doBuild(pid)} style={{ ...btnOutline({ fontSize: 11 }), borderColor: "#50c87844", color: "#50c878" }}>
              🔨 {devData?.cellNames?.[pid] || cells[pid].name} ({cells[pid].buildCost} {t.gold})
            </button>
          ))}

          {cp.properties.filter((pid) => !cells[pid]._mortgaged && !(cells[pid]._buildings > 0)).map((pid) => (
            <button key={`m${pid}`} onClick={() => doMortgage(pid)} style={{ ...btnOutline({ fontSize: 10, padding: "4px 8px" }), color: "#ff6b6b", borderColor: "#ff6b6b33" }}>
              {t.mortgage}: {devData?.cellNames?.[pid] || cells[pid].name} (+{Math.floor(cells[pid].price / 2)})
            </button>
          ))}

          {cp.properties.filter((pid) => cells[pid]._mortgaged && cp.money >= Math.floor(cells[pid].price / 2 * 1.1)).map((pid) => (
            <button key={`r${pid}`} onClick={() => doRedeem(pid)} style={{ ...btnOutline({ fontSize: 10, padding: "4px 8px" }), color: "#50c878", borderColor: "#50c87833" }}>
              {t.redeem}: {devData?.cellNames?.[pid] || cells[pid].name} (-{Math.floor(cells[pid].price / 2 * 1.1)})
            </button>
          ))}

          <button onClick={endTurn} style={{ ...btn({ width: "100%", fontSize: 14, padding: "10px", marginTop: 4 }), boxShadow: `0 4px 16px ${accent}33` }}>→ {t.endTurn}</button>
        </div>
      )}

      {/* AI thinking */}
      {cp.isAI && game.phase !== "gameover" && (
        <div style={{ textAlign: "center", padding: 24, color: textDim, animation: "fadeIn 0.5s ease-out" }}>
          <div style={{ fontSize: 28, animation: "float 2s ease-in-out infinite" }}>{cp.token.emoji}</div>
          <div style={{ fontSize: 13, marginTop: 8, letterSpacing: 1 }}>{cp.name} {lang === "ru" ? "думает..." : "thinking..."}</div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 4 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: accent, animation: `pulse 1s ease-in-out ${i * 0.3}s infinite`, opacity: 0.6 }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
