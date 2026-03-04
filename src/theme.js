// ============================================================
// KIRSHAS MONOPOLIA — Shared Theme & Style Helpers
// ============================================================

export const S = {
  bg: "#0a0a12",
  bg2: "#12121e",
  bg3: "#1a1a2e",
  gold: "#c9a84c",
  goldDark: "#a07830",
  text: "#e8e0d0",
  textDim: "#8a8072",
  red: "#8B0000",
  border: "rgba(201,168,76,0.2)",
  font: "'Georgia', 'Times New Roman', serif",
};

export const btn = (extra = {}) => ({
  background: `linear-gradient(135deg, ${S.gold}, ${S.goldDark})`,
  color: S.bg,
  border: "none",
  padding: "12px 28px",
  borderRadius: 8,
  fontSize: 16,
  fontWeight: "bold",
  cursor: "pointer",
  fontFamily: S.font,
  letterSpacing: 1,
  ...extra,
});

export const btnOutline = (extra = {}) => ({
  background: "transparent",
  color: S.gold,
  border: `1px solid ${S.gold}`,
  padding: "10px 24px",
  borderRadius: 8,
  fontSize: 14,
  cursor: "pointer",
  fontFamily: S.font,
  letterSpacing: 1,
  ...extra,
});

export const card = (extra = {}) => ({
  background: S.bg3,
  border: `1px solid ${S.border}`,
  borderRadius: 12,
  padding: 16,
  ...extra,
});
