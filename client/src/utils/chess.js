const START_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const GLYPHS = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const ORDER = ["q", "r", "b", "n", "p"];

export const glyph = (type) => GLYPHS[type] + "\uFE0E";

/** Bidak yang sudah dimakan, dihitung dari selisih jumlah bidak di FEN. */
export function getCaptured(fen) {
  const counts = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  };
  for (const ch of fen.split(" ")[0]) {
    const lower = ch.toLowerCase();
    if (START_COUNT[lower] !== undefined) {
      counts[ch === lower ? "b" : "w"][lower] += 1;
    }
  }
  const missing = (color) =>
    ORDER.flatMap((t) =>
      Array(Math.max(0, START_COUNT[t] - counts[color][t])).fill(t)
    );
  return { byWhite: missing("b"), byBlack: missing("w") };
}

export function getEndReason(chess) {
  if (chess.isCheckmate()) return "Checkmate";
  if (chess.isStalemate()) return "Stalemate";
  if (chess.isInsufficientMaterial()) return "Insufficient material";
  if (chess.isThreefoldRepetition()) return "Threefold repetition";
  if (chess.isDraw()) return "Draw by 50-move rule";
  return "Game ended";
}
