import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

const socket = io(SERVER_URL, {
  transports: ["websocket", "polling"],
  reconnectionDelayMax: 3000,
});

async function call(event, payload) {
  let res;
  try {
    res = await socket.timeout(30000).emitWithAck(event, payload);
  } catch {
    throw new Error("Server tidak merespons. Pastikan server sudah berjalan.");
  }
  if (!res?.ok) throw new Error(res?.error || "Terjadi kesalahan di server");
  return normalize(res.game);
}

function normalize(game) {
  if (!game.clocks || !game.serverTime) return game;
  const offset = Date.now() - game.serverTime;
  return {
    ...game,
    turnStartedAt: new Date(
      new Date(game.turnStartedAt).getTime() + offset
    ).toISOString(),
  };
}

export const realApi = {
  createGame: (settings) => call("createGame", settings),
  getGame: (id) => call("getGame", { id }),
  makeMove: (id, move) => call("makeMove", { id, move }),
  resign: (id) => call("resign", { id }),
  restart: (id) => call("restart", { id }),
};

