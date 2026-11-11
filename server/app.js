
require("dotenv").config();

const express = require("express");
const { Chess } = require("chess.js");

const { createServer } = require("http");
const { Server } = require("socket.io");

const moveAnalysis = require("./moveAnalysis");


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

    // game move (bisa panggil moveAnalysis didalam sini untuk dapat persentase & feedback)

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
