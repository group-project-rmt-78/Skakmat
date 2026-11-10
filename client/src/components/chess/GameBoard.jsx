import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { glyph } from "../../utils/chess.js";

const PROMOTION_PIECES = ["q", "r", "b", "n"];
const HIGHLIGHT = "rgba(250, 204, 21, 0.35)";

export default function GameBoard({ game, thinking, onMove }) {
  const chess = useMemo(() => new Chess(game.fen), [game.fen]);
  const myColor = game.playerColor === "WHITE" ? "w" : "b";
  const canMove =
    game.status === "IN_PROGRESS" && !thinking && chess.turn() === myColor;

  const [selected, setSelected] = useState(null);
  const [pending, setPending] = useState(null); // { from, to } menunggu pilihan promosi

  useEffect(() => {
    setSelected(null);
    setPending(null);
  }, [game.fen]);

  const lastUci = game.moves[game.moves.length - 1]?.uci;
  const lastMove = lastUci
    ? { from: lastUci.slice(0, 2), to: lastUci.slice(2, 4) }
    : null;

  const legalFromSelected = useMemo(
    () => (selected ? chess.moves({ square: selected, verbose: true }) : []),
    [chess, selected]
  );

  function tryMove(from, to) {
    const candidates = chess
      .moves({ square: from, verbose: true })
      .filter((m) => m.to === to);
    if (candidates.length === 0) return false;
    if (candidates[0].promotion) {
      setPending({ from, to });
      return false;
    }
    setSelected(null);
    onMove({ from, to });
    return true;
  }

  function handleSquareClick(square) {
    if (!canMove) return;
    if (selected && legalFromSelected.some((m) => m.to === square)) {
      tryMove(selected, square);
      return;
    }
    const piece = chess.get(square);
    setSelected(piece && piece.color === myColor ? square : null);
  }

  function choosePromotion(type) {
    onMove({ from: pending.from, to: pending.to, promotion: type });
    setPending(null);
  }

  const squareStyles = useMemo(() => {
    const styles = {};
    const merge = (sq, obj) => {
      styles[sq] = { ...styles[sq], ...obj };
    };

    if (lastMove) {
      merge(lastMove.from, { backgroundColor: HIGHLIGHT });
      merge(lastMove.to, { backgroundColor: HIGHLIGHT });
    }
    if (chess.inCheck()) {
      for (const row of chess.board()) {
        for (const p of row) {
          if (p && p.type === "k" && p.color === chess.turn()) {
            merge(p.square, {
              backgroundImage:
                "radial-gradient(circle, rgba(248,113,113,0.95) 0%, rgba(248,113,113,0) 70%)",
            });
          }
        }
      }
    }
    if (selected) {
      merge(selected, { backgroundColor: "rgba(74, 222, 128, 0.5)" });
      for (const m of legalFromSelected) {
        const isCapture = Boolean(chess.get(m.to));
        merge(m.to, {
          backgroundImage: isCapture
            ? "radial-gradient(circle, transparent 55%, rgba(0,0,0,0.3) 57%)"
            : "radial-gradient(circle, rgba(0,0,0,0.3) 22%, transparent 24%)",
        });
      }
    }
    return styles;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chess, lastMove?.from, lastMove?.to, selected, legalFromSelected]);

  return (
    <div className="relative">
      <Chessboard
        id="skakmat-board"
        position={game.fen}
        boardOrientation={game.playerColor === "WHITE" ? "white" : "black"}
        arePiecesDraggable={canMove}
        isDraggablePiece={({ piece }) => piece[0] === myColor}
        onPieceDrop={(from, to) => (canMove ? tryMove(from, to) : false)}
        onSquareClick={handleSquareClick}
        onPromotionCheck={() => false}
        customSquareStyles={squareStyles}
        customDarkSquareStyle={{ backgroundColor: "#5f6d55" }}
        customLightSquareStyle={{ backgroundColor: "#9aa58b" }}
        customBoardStyle={{ borderRadius: "6px", overflow: "hidden" }}
        animationDuration={150}
      />

      {pending && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-black/60"
          onClick={() => setPending(null)}
        >
          <div
            className="flex gap-2 rounded-xl border border-line bg-surface p-3"
            onClick={(e) => e.stopPropagation()}
          >
            {PROMOTION_PIECES.map((type) => (
              <button
                key={type}
                onClick={() => choosePromotion(type)}
                className="h-14 w-14 rounded-lg bg-elevated text-4xl transition-colors hover:bg-line"
                style={{ color: myColor === "w" ? "#fafafa" : "#161616" }}
                aria-label={`Promote to ${type}`}
              >
                {glyph(type)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
