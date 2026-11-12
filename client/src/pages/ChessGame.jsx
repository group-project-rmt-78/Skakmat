import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Chess } from "chess.js";
import { Loader2 } from "lucide-react";
import { useGame } from "../contexts/GameContext.jsx";
import { useClock } from "../hooks/useClock.js";
import { difficultyLabel } from "../utils/constants.js";
import { getCaptured } from "../utils/chess.js";
import GameBoard from "../components/chess/GameBoard.jsx";
import AnalysisPanel from "../components/chess/AnalysisPanel.jsx";
import MoveHistory from "../components/chess/MoveHistory.jsx";
import PlayerBar from "../components/chess/PlayerBar.jsx";
import GameControls from "../components/chess/GameControls.jsx";
import GameResultModal from "../components/chess/GameResultModal.jsx";

export default function ChessGame() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const {
    game,
    loading,
    thinking,
    busy,
    error,
    loadGame,
    refresh,
    submitMove,
    resign,
    restart,
  } = useGame();
  const [showResult, setShowResult] = useState(true);
  const [selectedPly, setSelectedPly] = useState(null);

  useEffect(() => {
    if (!game || game.id !== gameId) loadGame(gameId);
  }, [gameId]);

  useEffect(() => {
    setShowResult(true);
  }, [game?.id]);

  useEffect(() => {
    setSelectedPly(null);
  }, [game?.moves.length]);

  const chess = useMemo(() => (game ? new Chess(game.fen) : null), [game?.fen]);
  const captured = useMemo(() => (game ? getCaptured(game.fen) : null), [game?.fen]);
  const clock = useClock(game);


  const expired = Boolean(clock && clock.activeSide && clock[clock.activeSide] <= 0);
  useEffect(() => {
    if (!expired) return undefined;
    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
  }, [expired, refresh]);

  const hasPending = Boolean(
    game?.moves.some(
      (m) => m.analysis?.status === "PENDING" || m.analysis?.textPending
    )
  );
  useEffect(() => {
    if (!hasPending) return undefined;
    const id = setInterval(refresh, 1500);
    return () => clearInterval(id);
  }, [hasPending, refresh]);

  if (loading || (!game && !error)) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-danger">{error}</p>
        <Link to="/play" className="mt-4 inline-block text-sm text-accent">
          Back to setup
        </Link>
      </div>
    );
  }

  const isWhite = game.playerColor === "WHITE";
  const aiSide = isWhite ? "BLACK" : "WHITE";
  const mySide = isWhite ? "WHITE" : "BLACK";
  const myTurn = chess.turn() === (isWhite ? "w" : "b");

  const playerMoves = game.moves.filter((m) => m.color === game.playerColor);
  const selectedMove =
    playerMoves.find((m) => m.ply === selectedPly) ??
    playerMoves[playerMoves.length - 1] ??
    null;

  let status = "AI's turn";
  if (game.status === "FINISHED") status = "Game over";
  else if (thinking) status = "AI is thinking...";
  else if (myTurn) status = chess.inCheck() ? "Your turn · Check" : "Your turn";
  else if (chess.inCheck()) status = "AI's turn · Check";

  async function handleRestart() {
    const id = await restart();
    if (id) navigate(`/game/${id}`);
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,560px)_1fr]">
      <div>
        <PlayerBar
          name="Stockfish"
          subtitle={difficultyLabel(game.difficulty)}
          isAI
          captured={isWhite ? captured.byBlack : captured.byWhite}
          clockMs={clock ? clock[aiSide] : undefined}
          clockActive={clock?.activeSide === aiSide}
        />
        <GameBoard game={game} thinking={thinking} onMove={submitMove} />
        <PlayerBar
          name="You"
          subtitle={isWhite ? "White" : "Black"}
          captured={isWhite ? captured.byWhite : captured.byBlack}
          clockMs={clock ? clock[mySide] : undefined}
          clockActive={clock?.activeSide === mySide}
        />
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs text-neutral-500">Status</p>
          <p
            className={`mt-1 flex items-center gap-2 text-sm ${
              myTurn && game.status === "IN_PROGRESS" ? "text-accent" : "text-neutral-200"
            }`}
          >
            {thinking && <Loader2 size={14} className="animate-spin" />}
            {status}
          </p>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>

        <AnalysisPanel move={selectedMove} thinking={thinking} />

        <GameControls
          game={game}
          disabled={thinking || busy}
          onResign={resign}
          onRestart={handleRestart}
        />

        <MoveHistory
          moves={game.moves}
          selectedPly={selectedMove?.ply}
          onSelect={setSelectedPly}
        />
      </aside>

      {game.status === "FINISHED" && showResult && (
        <GameResultModal game={game} chess={chess} onClose={() => setShowResult(false)} />
      )}
    </div>
  );
}