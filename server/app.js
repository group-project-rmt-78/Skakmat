const { Chess } = require('chess.js');
const express = require('express');
const app = express()
const port = 3000

const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*" // allow from all connections (only for socket)
    }
});

const games = {}

// argumen 1: nama event, argumen 2: callback
io.on("connection", (socket) => {
    // start game 
    socket.on("startGame", () => {
        const chess = new Chess()
        games[socket.id] = chess

        console.log(chess.ascii());
        
        socket.emit("gameStarted", {
            board: chess.board(), 
            fen: chess.fen()
        })
    })
});


app.get('/', (req, res) => {
    res.send('Hello World!')
})

httpServer.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

