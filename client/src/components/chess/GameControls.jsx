import { useState } from "react";
import { Link } from "react-router-dom";
import { Flag, Home, RefreshCw } from "lucide-react";
import ConfirmDialog from "../common/ConfirmDialog.jsx";

export default function GameControls({ game, disabled, onResign, onRestart }) {
  const [confirm, setConfirm] = useState(null); // "resign" | "restart" | null
  const inProgress = game.status === "IN_PROGRESS";

  function handleRestartClick() {
    if (inProgress && game.moves.length > 0) setConfirm("restart");
    else onRestart();
  }

  const btn =
    "flex items-center justify-center gap-2 rounded-lg border bg-surface py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleRestartClick}
          disabled={disabled}
          className={`${btn} border-line text-neutral-200 hover:bg-elevated`}
        >
          <RefreshCw size={15} /> Restart
        </button>
        <button
          onClick={() => setConfirm("resign")}
          disabled={disabled || !inProgress}
          className={`${btn} border-danger/60 text-danger hover:bg-elevated`}
        >
          <Flag size={15} /> Resign
        </button>
        <Link
          to="/"
          className={`${btn} border-line text-neutral-200 hover:bg-elevated`}
        >
          <Home size={15} /> Menu
        </Link>
      </div>

      {confirm === "resign" && (
        <ConfirmDialog
          title="Resign this game?"
          message="Kamu akan dianggap kalah."
          confirmLabel="Resign"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            onResign();
          }}
        />
      )}
      {confirm === "restart" && (
        <ConfirmDialog
          title="Restart game?"
          message="Game ini akan ditinggalkan dan game baru dimulai dengan setelan yang sama."
          confirmLabel="Restart"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            setConfirm(null);
            onRestart();
          }}
        />
      )}
    </>
  );
}
