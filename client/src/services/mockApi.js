import { Chess } from "chess.js";

const KEY = "skakmat_mock_games";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const readAll = () => JSON.parse(localStorage.getItem(KEY) || "{}");
const persist = (game) => {
  const all = readAll();
  all[game.id] = game;
  localStorage.setItem(KEY, JSON.stringify(all));
};

function rebuild(game) {
  const chess = new Chess();
  game.moves.forEach((m) =>
    chess.move({
      from: m.uci.slice(0, 2),
      to: m.uci.slice(2, 4),
      promotion: m.uci.slice(4, 5) || undefined,
    })
  );
  return chess;
}

function record(game, chess, input) {
  const mv = chess.move(input); // melempar error kalau ilegal
  game.moves.push({
    ply: game.moves.length + 1,
    color: mv.color === "w" ? "WHITE" : "BLACK",
    san: mv.san,
    uci: mv.from + mv.to + (mv.promotion || ""),
    fenAfter: chess.fen(),
  });
  game.fen = chess.fen();
  game.pgn = chess.pgn();
  game.turnStartedAt = new Date().toISOString(); // jam pihak berikutnya mulai
}

function finishIfOver(game, chess) {
  if (!chess.isGameOver()) return;
  game.status = "FINISHED";
  if (chess.isCheckmate()) {
    const loser = chess.turn() === "w" ? "WHITE" : "BLACK";
    game.result = loser === game.playerColor ? "AI_WIN" : "PLAYER_WIN";
  } else {
    game.result = "DRAW";
  }
}

/** Kurangi jam pihak yang sedang jalan; tandai timeout kalau habis. */
function tick(game) {
  if (game.status !== "IN_PROGRESS" || !game.clocks) return;
  const side = game.fen.split(" ")[1] === "w" ? "WHITE" : "BLACK";
  const now = Date.now();
  game.clocks[side] -= now - new Date(game.turnStartedAt).getTime();
  game.turnStartedAt = new Date(now).toISOString();
  if (game.clocks[side] <= 0) {
    game.clocks[side] = 0;
    game.status = "FINISHED";
    game.endReason = "TIMEOUT";
    game.result = side === game.playerColor ? "AI_WIN" : "PLAYER_WIN";
  }
}

// Bot mock: langkah legal acak. Tingkat kesulitan belum berpengaruh di sini.
function botMove(game, chess) {
  const moves = chess.moves({ verbose: true });
  const m = moves[Math.floor(Math.random() * moves.length)];
  record(game, chess, { from: m.from, to: m.to, promotion: m.promotion });
  finishIfOver(game, chess);
}

// ---- Analisis TIRUAN (angka acak, hanya untuk melihat tampilan) ----

function fakeText(accuracy) {
  if (accuracy >= 90) return "Langkah ini menjaga posisimu tetap kuat dan bidakmu berkembang dengan baik.";
  if (accuracy >= 70) return "Langkah wajar dan posisimu masih seimbang, tapi ada pilihan yang sedikit lebih kuat.";
  if (accuracy >= 50) return "Langkah ini agak melonggarkan posisimu. Periksa ancaman lawan sebelum melangkah.";
  return "Langkah ini kemungkinan melepas keuntungan, lawan bisa memanfaatkan posisi ini.";
}

/** Dipanggil tepat setelah langkah pemain dicatat. legalSan = langkah legal sebelum langkah. */
function attachFakeAnalysis(game, legalSan) {
  const move = game.moves[game.moves.length - 1];
  const accuracy = Math.round(40 + Math.random() * 60);
  const winChance = Math.round(35 + Math.random() * 40);
  const bestMove =
    Math.random() < 0.4
      ? move.san
      : legalSan[Math.floor(Math.random() * legalSan.length)];
  move.analysis = {
    status: "DONE",
    accuracy,
    winChance,
    evalCp: Math.round((winChance - 50) * 8),
    bestMove,
    text: fakeText(accuracy),
    readyAt: Date.now() + 2500, // sebelum waktu ini FE melihat status PENDING
  };
}

/** Salinan game untuk FE: analisis yang belum "selesai" tampil sebagai PENDING. */
function view(game) {
  const now = Date.now();
  return {
    ...game,
    moves: game.moves.map((m) => {
      if (!m.analysis || m.analysis.readyAt <= now) return m;
      return {
        ...m,
        analysis: {
          status: "PENDING",
          accuracy: null,
          winChance: null,
          evalCp: null,
          bestMove: null,
          text: null,
        },
      };
    }),
  };
}

function getOrThrow(id) {
  const game = readAll()[id];
  if (!game) throw new Error("Game not found");
  return game;
}

function newGame({ playerColor, difficulty, timeControl }) {
  const game = {
    id: crypto.randomUUID(),
    playerColor,
    difficulty,
    timeControl,
    status: "IN_PROGRESS",
    result: null,
    endReason: null,
    fen: new Chess().fen(),
    pgn: "",
    moves: [],
    clocks: timeControl
      ? { WHITE: timeControl * 1000, BLACK: timeControl * 1000 }
      : null,
    turnStartedAt: new Date().toISOString(),
  };
  if (playerColor === "BLACK") botMove(game, rebuild(game));
  return game;
}

export const mockApi = {
  async createGame(settings) {
    await delay(300);
    const game = newGame(settings);
    persist(game);
    return view(game);
  },

  async getGame(id) {
    await delay(150);
    const game = getOrThrow(id);
    tick(game);
    persist(game);
    return view(game);
  },

  async makeMove(id, input) {
    const game = getOrThrow(id);
    if (game.status !== "IN_PROGRESS") throw new Error("Game already finished");

    tick(game);
    if (game.status !== "IN_PROGRESS") {
      persist(game);
      return view(game); // waktu pemain habis sebelum langkah masuk
    }

    const chess = rebuild(game);
    const myTurn = game.playerColor === "WHITE" ? "w" : "b";
    if (chess.turn() !== myTurn) throw new Error("Not your turn");

    const legalSan = chess.moves();
    try {
      record(game, chess, input);
    } catch {
      throw new Error("Illegal move");
    }
    attachFakeAnalysis(game, legalSan);
    finishIfOver(game, chess);

    if (game.status === "IN_PROGRESS") {
      await delay(700); // simulasi bot berpikir
      tick(game);
      if (game.status === "IN_PROGRESS") botMove(game, chess);
    }
    persist(game);
    return view(game);
  },

  async resign(id) {
    await delay(150);
    const game = getOrThrow(id);
    if (game.status !== "IN_PROGRESS") throw new Error("Game already finished");
    game.status = "FINISHED";
    game.result = "AI_WIN";
    game.endReason = "RESIGNATION";
    persist(game);
    return view(game);
  },

  async restart(id) {
    await delay(300);
    const old = getOrThrow(id);
    const game = newGame({
      playerColor: old.playerColor,
      difficulty: old.difficulty,
      timeControl: old.timeControl,
    });
    persist(game);
    return view(game);
  },
};
