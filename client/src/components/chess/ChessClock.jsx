function format(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ChessClock({ ms, active }) {
  const low = ms <= 10000;
  return (
    <div
      className={`rounded-md border px-3 py-1 font-mono text-base font-medium ${
        active ? "border-accent bg-surface" : "border-line bg-elevated"
      } ${low ? "text-danger" : active ? "text-accent" : "text-neutral-400"}`}
    >
      {format(ms)}
    </div>
  );
}
