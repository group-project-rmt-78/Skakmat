import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { gameApi } from "../services/gameApi.js";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, setState] = useState({
    game: null,
    loading: false,
    thinking: false,
    busy: false,
    error: null,
  });

  // Salinan state terbaru, supaya fungsi async tidak membaca state yang basi.
  const stateRef = useRef(state);
  const update = useCallback((patch) => {
    stateRef.current = { ...stateRef.current, ...patch };
    setState(stateRef.current);
  }, []);

  const createGame = useCallback(
    async (settings) => {
      update({ loading: true, error: null });
      try {
        const game = await gameApi.createGame(settings);
        update({ game, loading: false, thinking: false });
        return game.id;
      } catch (err) {
        update({ loading: false, error: err.message });
        return null;
      }
    },
    [update]
  );

  const loadGame = useCallback(
    async (id) => {
      update({ loading: true, error: null, game: null, thinking: false });
      try {
        const game = await gameApi.getGame(id);
        update({ game, loading: false });
      } catch (err) {
        update({ loading: false, error: err.message });
      }
    },
    [update]
  );

  /** Sinkronkan state dengan server (jam habis, analisis yang masih PENDING). */
  const refresh = useCallback(async () => {
    const { game, thinking } = stateRef.current;
    if (!game || thinking) return;
    try {
      const fresh = await gameApi.getGame(game.id);
      if (stateRef.current.game?.id === fresh.id) update({ game: fresh });
    } catch (err) {
      update({ error: err.message });
    }
  }, [update]);

  /** Langkah pemain tampil langsung, lalu ditimpa state dari API. */
  const submitMove = useCallback(
    async (move) => {
      const { game, thinking } = stateRef.current;
      if (!game || thinking || game.status !== "IN_PROGRESS") return false;

      const chess = new Chess(game.fen);
      let mv;
      try {
        mv = chess.move(move);
      } catch {
        return false;
      }

      // Jam: potong waktu pemain, lalu jam lawan mulai berjalan
      let { clocks, turnStartedAt } = game;
      if (clocks) {
        const side = game.fen.split(" ")[1] === "w" ? "WHITE" : "BLACK";
        const now = Date.now();
        clocks = {
          ...clocks,
          [side]: Math.max(0, clocks[side] - (now - new Date(turnStartedAt).getTime())),
        };
        turnStartedAt = new Date(now).toISOString();
      }

      const optimistic = {
        ...game,
        fen: chess.fen(),
        clocks,
        turnStartedAt,
        moves: [
          ...game.moves,
          {
            ply: game.moves.length + 1,
            color: mv.color === "w" ? "WHITE" : "BLACK",
            san: mv.san,
            uci: mv.from + mv.to + (mv.promotion || ""),
            fenAfter: chess.fen(),
          },
        ],
      };
      update({ game: optimistic, thinking: !chess.isGameOver(), error: null });

      try {
        const updated = await gameApi.makeMove(game.id, move);
        if (stateRef.current.game?.id === game.id) {
          update({ game: updated, thinking: false });
        }
        return true;
      } catch (err) {
        const fresh = await gameApi.getGame(game.id).catch(() => game);
        if (stateRef.current.game?.id === game.id) {
          update({ game: fresh, thinking: false, error: err.message });
        }
        return false;
      }
    },
    [update]
  );

  const resign = useCallback(async () => {
    const { game } = stateRef.current;
    if (!game) return;
    update({ busy: true, error: null });
    try {
      const updated = await gameApi.resign(game.id);
      update({ game: updated, busy: false, thinking: false });
    } catch (err) {
      update({ busy: false, error: err.message });
    }
  }, [update]);

  /** Mengembalikan id game baru, atau null kalau gagal. */
  const restart = useCallback(async () => {
    const { game } = stateRef.current;
    if (!game) return null;
    update({ busy: true, error: null });
    try {
      const next = await gameApi.restart(game.id);
      update({ game: next, busy: false, thinking: false });
      return next.id;
    } catch (err) {
      update({ busy: false, error: err.message });
      return null;
    }
  }, [update]);

  const value = useMemo(
    () => ({ ...state, createGame, loadGame, refresh, submitMove, resign, restart }),
    [state, createGame, loadGame, refresh, submitMove, resign, restart]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame harus dipakai di dalam <GameProvider>");
  return ctx;
}