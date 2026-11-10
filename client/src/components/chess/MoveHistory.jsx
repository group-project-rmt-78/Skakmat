import { useEffect, useRef } from "react";
import { accuracyTone } from "../../utils/analysis.js";

function MoveCell({ move, selected, onSelect }) {
  if (!move) return <span />;
  const a = move.analysis;
  const clickable = Boolean(a) && Boolean(onSelect);
  const tone = a?.status === "DONE" ? accuracyTone(a.accuracy) : null;

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => onSelect(move.ply)}
      className={`flex items-center gap-1.5 rounded px-1 text-left ${
        selected ? "bg-elevated" : ""
      } ${clickable ? "hover:bg-elevated" : "cursor-default"}`}
    >
      <span className="text-neutral-200">{move.san}</span>
      {tone && (
        <span className={`text-[11px] ${tone.text}`}>{Math.round(a.accuracy)}</span>
      )}
      {a?.status === "PENDING" && (
        <span className="text-[11px] text-neutral-500">...</span>
      )}
    </button>
  );
}

export default function MoveHistory({ moves, selectedPly, onSelect }) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [moves.length]);

  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ n: i / 2 + 1, white: moves[i], black: moves[i + 1] });
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="mb-2 text-xs text-neutral-500">Moves</p>
      <div ref={boxRef} className="max-h-60 overflow-y-auto font-mono text-sm">
        {rows.length === 0 && <p className="text-neutral-500">Belum ada langkah.</p>}
        {rows.map((r) => (
          <div key={r.n} className="grid grid-cols-[2rem_1fr_1fr] items-center py-0.5">
            <span className="text-neutral-500">{r.n}.</span>
            <MoveCell
              move={r.white}
              selected={r.white?.ply === selectedPly}
              onSelect={onSelect}
            />
            <MoveCell
              move={r.black}
              selected={r.black?.ply === selectedPly}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
