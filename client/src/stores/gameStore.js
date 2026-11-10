import { create } from "zustand";
import { Chess } from "chess.js";
import { gameApi } from "../services/gameApi.js";

export const useGameStore = create((set, get) => ({
  game: null,
  loading: false,
  thinking: false,
  busy: false,
  error: null,

  async createGame(settings) {
    set({ loading: true, error: null });
    try {
      const game = await gameApi.createGame(settings);
      set({ game, loading: false, thinking: false });
      return game.id;
    } catch (err) {
      set({ loading: false, error: err.message });
      return null;
    }
  },

  async loadGame(id) {
    set({ loading: true, error: null, game: null, thinking: false });
    try {
      const game = await gameApi.getGame(id);
      set({ game, loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  /** Sinkronkan state dengan server (dipakai saat jam habis). */
  async refresh() {
    const { game, thinking } = get();
    if (!game || thinking) return;
    try {
      const fresh = await gameApi.getGame(game.id);
      if (get().game?.id === fresh.id) set({ game: fresh });
    } catch (err) {
      set({ error: err.message });
    }
  },

  /** Langkah pemain tampil langsung, lalu ditimpa state dari API. */
  async submitMove(move) {
    const { game, thinking } = get();
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
    set({ game: optimistic, thinking: !chess.isGameOver(), error: null });

    try {
      const updated = await gameApi.makeMove(game.id, move);
      if (get().game?.id === game.id) set({ game: updated, thinking: false });
      return true;
    } catch (err) {
      const fresh = await gameApi.getGame(game.id).catch(() => game);
      if (get().game?.id === game.id) {
        set({ game: fresh, thinking: false, error: err.message });
      }
      return false;
    }
  },

  async resign() {
    const { game } = get();
    if (!game) return;
    set({ busy: true, error: null });
    try {
      const updated = await gameApi.resign(game.id);
      set({ game: updated, busy: false, thinking: false });
    } catch (err) {
      set({ busy: false, error: err.message });
    }
  },

  /** Mengembalikan id game baru, atau null kalau gagal. */
  async restart() {
    const { game } = get();
    if (!game) return null;
    set({ busy: true, error: null });
    try {
      const next = await gameApi.restart(game.id);
      set({ game: next, busy: false, thinking: false });
      return next.id;
    } catch (err) {
      set({ busy: false, error: err.message });
      return null;
    }
  },
}));
