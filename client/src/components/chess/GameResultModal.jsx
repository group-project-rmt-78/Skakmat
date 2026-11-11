import { Link } from "react-router-dom";
import { getEndReason } from "../../utils/chess.js";

const TITLES = {
  PLAYER_WIN: "You win",
  AI_WIN: "AI wins",
  DRAW: "Draw",
};

const REASONS = {
  TIMEOUT: "Out of time",
  RESIGNATION: "Resignation",
};

export default function GameResultModal({ game, chess, onClose }) {
  const reason = REASONS[game.endReason] ?? getEndReason(chess);
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center">
        <p
          className={`text-2xl font-semibold ${
            game.result === "PLAYER_WIN"
              ? "text-accent"
              : game.result === "AI_WIN"
              ? "text-danger"
              : "text-neutral-100"
          }`}
        >
          {TITLES[game.result]}
        </p>
        <p className="mt-1 text-sm text-neutral-400">{reason}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-line bg-elevated py-2.5 text-sm text-neutral-200 transition-colors hover:bg-line"
          >
            View board
          </button>
          <Link
            to="/play"
            className="rounded-lg bg-accent py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            New game
          </Link>
        </div>
      </div>
    </div>
  );
}
