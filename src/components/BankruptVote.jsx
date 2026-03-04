import { S, btnOutline, card } from '../theme';

export default function BankruptVote({ game, t, lendAmount, setLendAmount, doLend, skipBankruptVote }) {
  if (!game.bankruptVote) return null;

  return (
    <div style={card({ marginBottom: 10, border: "1px solid #ff6b6b" })}>
      <div style={{ fontSize: 13, fontWeight: "bold", color: "#ff6b6b" }}>
        {game.players[game.bankruptVote.playerId].name} {t.helpVote}
      </div>
      <div style={{ fontSize: 12 }}>{t.amount}: {game.bankruptVote.needed} {t.gold}</div>
      {game.players.filter((p) => !p.bankrupt && p.id !== game.bankruptVote.playerId).map((p) => (
        <div key={p.id} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6 }}>
          <span style={{ fontSize: 12, color: p.color }}>{p.name}</span>
          {!p.isAI && (
            <>
              <input type="number" value={lendAmount} onChange={(e) => setLendAmount(+e.target.value)} style={{ width: 60, background: S.bg, color: S.text, border: `1px solid ${S.border}`, borderRadius: 4, padding: "4px", fontSize: 12 }} />
              <button onClick={() => doLend(p.id, lendAmount)} style={btnOutline({ fontSize: 11, padding: "4px 8px" })}>{t.lend}</button>
            </>
          )}
        </div>
      ))}
      <button onClick={skipBankruptVote} style={{ ...btnOutline({ fontSize: 11, marginTop: 8 }), color: "#ff6b6b", borderColor: "#ff6b6b" }}>{t.bankrupt}</button>
    </div>
  );
}
