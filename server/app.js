const { Chess } = require('chess.js')
const express = require('express')
const cors = require('cors')
const { createServer } = require('http')
const { Server } = require('socket.io')
const { getResult, getMove, getLegalMoves } = require('./game')
const { getBotMove } = require('./stockfish')

const port = process.env.PORT || 3000
const app = express()
app.use(cors())

const httpServer = createServer(app)
const io = new Server(httpServer, { 
    cors: { 
        origin: '*' 
    } 
})

const games = {}
const difficulties = ['beginner', 'easy', 'medium', 'hard', 'expert']

function snapshot(chess) {
    return { board: chess.board(), fen: chess.fen() }
}

io.on('connection', (socket) => {
    
    socket.on('startGame', (data) => {
        const difficulty = data?.difficulty

        if (!difficulties.includes(difficulty)) {
            return socket.emit('gameError', { message: 'Invalid level' })
        }

        const chess = new Chess()
        games[socket.id] = { chess, difficulty, isBotThinking: false }

        socket.emit('gameStarted', { ...snapshot(chess), difficulty })
    })

    socket.on('getLegalMoves', (data) => {
        const game = games[socket.id]
        if (!game) {
            return socket.emit('gameError', { message: 'Game not found' })
        }

        const square = data?.square
        if (typeof square !== 'string') {
            return socket.emit('gameError', { message: 'Invalid square' })
        }

        // sesuaikan dengan signature getLegalMoves di game.js kamu
        const moves = getLegalMoves(game.chess, square)
        socket.emit('legalMoves', { square, moves })
    })

    socket.on('playerMove', async (data) => {
        const game = games[socket.id]

        if (!game) {
            return socket.emit('gameError', { message: 'Game not found' })
        }
        if (game.isBotThinking || game.chess.turn() !== 'w') {
            return socket.emit('gameError', { message: 'Please wait for bot' })
        }

        const { from, to, promotion } = data ?? {}
        if (typeof from !== 'string' || typeof to !== 'string') {
            return socket.emit('gameError', { message: 'Invalid move data' })
        }

        // 1. Langkah player: kalau ilegal, tolak saja
        try {
            getMove(game.chess, from, to, promotion, 'w')
        } catch (error) {
            return socket.emit('gameError', { message: error.message })
        }

        let result = getResult(game.chess)
        socket.emit('boardUpdate', { ...snapshot(game.chess), result })
        if (result.over) return

        // 2. Langkah bot: kalau gagal, rollback langkah player
        game.isBotThinking = true
        try {
            const botMove = await getBotMove(game.chess.fen(), game.difficulty)

            // player sudah disconnect / mulai game baru selama bot mikir
            if (games[socket.id] !== game) return

            game.chess.move(botMove)
            result = getResult(game.chess)

            socket.emit('botMove', {
                move: botMove,
                ...snapshot(game.chess),
                result
            })
        } catch (error) {
            console.error('Bot error:', error)

            if (games[socket.id] === game) {
                game.chess.undo() // balikin ke giliran player
                socket.emit('gameError', {
                    message: 'Bot gagal bergerak, coba ulangi langkahmu',
                    ...snapshot(game.chess)
                })
            }
        } finally {
            game.isBotThinking = false
        }
    })

    socket.on('disconnect', () => {
        delete games[socket.id]
    })
})

app.get('/', (req, res) => res.send('Hello World!'))

httpServer.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})