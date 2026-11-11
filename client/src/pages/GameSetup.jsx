import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../contexts/GameContext.jsx";
import { DIFFICULTIES, TIME_CONTROLS } from "../utils/constants.js";

const selectedCls = "border-accent text-accent";
const idleCls = "border-line text-neutral-300 hover:border-neutral-500";

export default function GameSetup() {
  const navigate = useNavigate();
  const { createGame, loading, error } = useGame();

  const [playerColor, setPlayerColor] = useState("WHITE");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [timeControl, setTimeControl] = useState(300);

  async function handleStart() {
    const id = await createGame({ playerColor, difficulty, timeControl });
    if (id) navigate(`/game/${id}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 text-xl font-semibold text-neutral-50">New game</h1>

      <p className="mb-2 text-xs text-neutral-500">Play as</p>
      <div className="mb-6 grid grid-cols-2 gap-2">
        {["WHITE", "BLACK"].map((c) => (
          <button
            key={c}
            onClick={() => setPlayerColor(c)}
            className={`rounded-xl border bg-surface py-4 text-sm transition-colors ${
              playerColor === c ? selectedCls : idleCls
            }`}
          >
            <div
              className="text-3xl leading-none"
              style={{ color: c === "WHITE" ? "#fafafa" : "#6b6b6b" }}
            >
              ♟&#xFE0E;
            </div>
            <span className="mt-1 block">{c === "WHITE" ? "White" : "Black"}</span>
          </button>
        ))}
      </div>

      <p className="mb-2 text-xs text-neutral-500">Difficulty</p>
      <div className="mb-6 space-y-1.5">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.value}
            onClick={() => setDifficulty(d.value)}
            className={`flex w-full items-center justify-between rounded-lg border bg-surface px-3 py-2.5 text-sm transition-colors ${
              difficulty === d.value ? selectedCls : idleCls
            }`}
          >
            <span>{d.label}</span>
            <span className="text-xs text-neutral-500">{d.hint}</span>
          </button>
        ))}
      </div>

      <p className="mb-2 text-xs text-neutral-500">Time control</p>
      <div className="mb-8 flex flex-wrap gap-2">
        {TIME_CONTROLS.map((t) => (
          <button
            key={t.label}
            onClick={() => setTimeControl(t.value)}
            className={`rounded-full border bg-surface px-4 py-1.5 text-sm transition-colors ${
              timeControl === t.value ? selectedCls : idleCls
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Starting..." : "Start game"}
      </button>
    </div>
  );
}