import { Cpu, User } from "lucide-react";
import { glyph } from "../../utils/chess.js";
import ChessClock from "./ChessClock.jsx";

export default function PlayerBar({ name, subtitle, isAI, captured, clockMs, clockActive }) {
  const Icon = isAI ? Cpu : User;
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-elevated">
          <Icon size={16} className={isAI ? "text-accent" : "text-neutral-300"} />
        </div>
        <div>
          <p className="text-sm font-medium leading-tight text-neutral-100">{name}</p>
          <p className="text-xs leading-tight text-neutral-500">{subtitle}</p>
        </div>
      </div>
      <div className="min-w-0 flex-1 truncate text-lg text-neutral-400">
        {captured.map((t, i) => (
          <span key={i}>{glyph(t)}</span>
        ))}
      </div>
      {clockMs !== undefined && <ChessClock ms={clockMs} active={clockActive} />}
    </div>
  );
}
