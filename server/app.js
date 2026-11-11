
require("dotenv").config();

const express = require("express");
const { Chess } = require("chess.js");

const { createServer } = require("http");
const { Server } = require("socket.io");
const analysePosition = require("./stockfishAnalysis");
const calculateAccuracy = require("./calculateAccuracy");
const explainMove = require("./geminiAnalysis");


const app = express();
const port = process.env.PORT || 3000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
});

const games = {};

const difficulties = [
    "beginner",
    "easy",
    "medium",
    "hard",
    "expert"
];

// Stockfish AI difficulty settings
function getDifficultySettings(difficulty) {

    if (difficulty === "beginner") {
        return { skillLevel: 0, depth: 3 };
    }

    if (difficulty === "easy") {
        return { skillLevel: 2, depth: 5 };
    }

    if (difficulty === "medium") {
        return { skillLevel: 8, depth: 8 };
    }

    if (difficulty === "hard") {
        return { skillLevel: 15, depth: 12 };
    }

    return { skillLevel: 20, depth: 18 };
}

// Convert Stockfish UCI move into chess.js move
function convertMove(uciMove) {

    const move = {
        from: uciMove.substring(0, 2),
        to: uciMove.substring(2, 4)
    };

    if (uciMove.length > 4) {
        move.promotion = uciMove[4];
    }

    return move;
}

io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    // START GAME
    socket.on("startGame", (data) => {

        const difficulty = data?.difficulty;

        if (!difficulties.includes(difficulty)) {
            socket.emit("gameError", {
                message: "Invalid level"
            });
            return;
        }

        const chess = new Chess();

        games[socket.id] = {
            chess: chess,
            difficulty: difficulty,
            isThinking: false
        };

        socket.emit("gameStarted", {
            board: chess.board(),
            fen: chess.fen(),
            difficulty: difficulty
        });

        console.log("Game started:", difficulty);
    });

    // PLAYER MOVE
    socket.on("makeMove", async (data) => {

        const game = games[socket.id];

        if (!game) {
            socket.emit("gameError", {
                message: "Game not found"
            });
            return;
        }

        const chess = game.chess;

        if (game.isThinking) {
            return;
        }

        // This example assumes the human plays White
        if (chess.turn() !== "w") {
            return;
        }

        game.isThinking = true;

        try {

            // 1. Save position before player move
            const beforeFen = chess.fen();

            // 2. Process player's move
            const move = chess.move({
                from: data.from,
                to: data.to,
                promotion: data.promotion
            });

            if (!move) {
                throw new Error("Invalid move");
            }

            // 3. Save position after player move
            const afterFen = chess.fen();

            socket.emit("boardUpdated", {
                board: chess.board(),
                fen: afterFen,
                aiThinking: true
            });

            // 4. Check whether the game has ended
            if (chess.isGameOver()) {

                socket.emit("gameOver", {
                    board: chess.board(),
                    fen: chess.fen(),
                    message: "Game finished"
                });

                return;
            }

            // 5. Analyse the position before and after player's move
            try {

                const beforeAnalysis = await analysePosition(
                    beforeFen,
                    20,
                    12
                );

                const afterAnalysis = await analysePosition(
                    afterFen,
                    20,
                    12
                );

                // Stockfish scores are from the side-to-move perspective.
                // After the player's move, the opponent is to move.
                const bestScore = beforeAnalysis.scoreCp;
                const playedScore = -afterAnalysis.scoreCp;

                // 6. Calculate move accuracy
                const result = calculateAccuracy(
                    bestScore,
                    playedScore
                );

                // 7. Ask Gemini for an explanation
                let feedback;

                try {

                    feedback = await explainMove({
                        move: move.san,
                        bestMove: beforeAnalysis.bestMove,
                        accuracy: result.accuracy,
                        centipawnLoss: result.centipawnLoss,
                        beforeFen: beforeFen,
                        afterFen: afterFen
                    });

                } catch (geminiError) {

                    console.log(
                        "Gemini error:",
                        geminiError.message
                    );

                    feedback = "Move analysis is available, but Gemini explanation could not be generated.";
                }

                // 8. Send analysis to frontend
                socket.emit("moveAnalysis", {
                    move: move.san,
                    bestMove: beforeAnalysis.bestMove,
                    accuracy: result.accuracy,
                    centipawnLoss: result.centipawnLoss,
                    feedback: feedback
                });

            } catch (analysisError) {

                console.log(
                    "Stockfish analysis error:",
                    analysisError.message
                );

                socket.emit("analysisError", {
                    message: "Unable to analyse this move"
                });
            }

            // 9. Let Stockfish play its move
            const settings = getDifficultySettings(
                game.difficulty
            );

            const aiResult = await analysePosition(
                chess.fen(),
                settings.skillLevel,
                settings.depth
            );

            const aiMove = convertMove(aiResult.bestMove);

            const playedAiMove = chess.move(aiMove);

            if (!playedAiMove) {
                throw new Error("Stockfish returned an invalid move");
            }

            console.log("AI move:", playedAiMove.san);

            // 10. Send updated board to frontend
            if (chess.isGameOver()) {

                socket.emit("gameOver", {
                    board: chess.board(),
                    fen: chess.fen(),
                    message: "Game finished"
                });

            } else {

                socket.emit("boardUpdated", {
                    board: chess.board(),
                    fen: chess.fen(),
                    aiThinking: false,
                    aiMove: playedAiMove.san
                });
            }

        } catch (error) {

            console.log("Game error:", error.message);

            socket.emit("gameError", {
                message: error.message
            });

        } finally {

            game.isThinking = false;
        }
    });

    // DISCONNECT
    socket.on("disconnect", () => {

        console.log("User disconnected:", socket.id);

        delete games[socket.id];
    });

});

app.get("/", (req, res) => {
    res.send("Chess server is running!");
});

httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
