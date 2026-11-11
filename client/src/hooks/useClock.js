import { useEffect, useState } from "react";

/** Mengembalikan sisa waktu (ms) tiap pihak, atau null kalau unlimited. */
export function useClock(game) {
  const [now, setNow] = useState(Date.now());
  const running = Boolean(game && game.clocks && game.status === "IN_PROGRESS");

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running, game?.id]);

  if (!game || !game.clocks) return null;

  const turn = game.fen.split(" ")[1] === "w" ? "WHITE" : "BLACK";
  const elapsed = running
    ? Math.max(0, now - new Date(game.turnStartedAt).getTime())
    : 0;

  return {
    WHITE: Math.max(0, game.clocks.WHITE - (turn === "WHITE" ? elapsed : 0)),
    BLACK: Math.max(0, game.clocks.BLACK - (turn === "BLACK" ? elapsed : 0)),
    activeSide: running ? turn : null,
  };
}
