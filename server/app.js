require('dotenv').config()

const { Chess } = require('chess.js')
const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const { randomUUID } = require('crypto')
const { getBotMove } = require('./stockfish')
const { analyseWithStockfish, explainWithGemini } = require('./moveAnalysis')
const { botEngine, analysisEngine, shutdownEngines } = require('./engine')

const port = process.env.PORT || 3000
const app = express()

const httpServer = createServer(app)
const io = new Server(httpServer, {
    cors: { origin: '*' }
})

const DIFFICULTIES = ['beginner', 'easy', 'medium', 'hard', 'expert']
const TIME_CONTROLS = [60, 180, 300, 600] 
const IDLE_LIMIT_MS = 3 * 60 * 60 * 1000 


const games = new Map()

function serialize(game) {
    return {
        id: game.id,
        playerColor: game.playerColor,
        difficulty: game.difficulty,
        timeControl: game.timeControl,
        status: game.status,
        result: game.result,
        endReason: game.endReason,
        fen: game.chess.fen(),
        pgn: game.chess.pgn(),
        moves: game.moves,
        clocks: game.clocks,
        turnStartedAt: game.turnStartedAt,
        serverTime: Date.now() // dipakai client untuk koreksi selisih jam
    }
}

function sideOf(chess) {
    return chess.turn() === 'w' ? 'WHITE' : 'BLACK'
}


function parseSettings(data) {
    const playerColor = String(data?.playerColor ?? '').toUpperCase()
    const difficulty = String(data?.difficulty ?? '').toLowerCase()
    const timeControl = data?.timeControl ?? null

    if (!['WHITE', 'BLACK'].includes(playerColor)) throw new Error('Warna tidak valid')
    if (!DIFFICULTIES.includes(difficulty)) throw new Error('Level tidak valid')
    if (timeControl !== null && !TIME_CONTROLS.includes(timeControl)) {
        throw new Error('Kontrol waktu tidak valid')
    }
    return { playerColor, difficulty, timeControl }
}

function newGame(settings) {
    return {
        id: randomUUID(),
        ...settings,
        status: 'IN_PROGRESS',
        result: null,
        endReason: null,
        chess: new Chess(),
        moves: [],
        clocks: settings.timeControl
            ? { WHITE: settings.timeControl * 1000, BLACK: settings.timeControl * 1000 }
            : null,
        turnStartedAt: new Date().toISOString(),
        busy: false,
        touchedAt: Date.now()
    }
}

function getGameOrThrow(id) {
    const game = games.get(id)
    if (!game) throw new Error('Game tidak ditemukan')
    game.touchedAt = Date.now()
    return game
}

function recordMove(game, input) {
    const mv = game.chess.move(input)
    game.moves.push({
        ply: game.moves.length + 1,
        color: mv.color === 'w' ? 'WHITE' : 'BLACK',
        san: mv.san,
        uci: mv.from + mv.to + (mv.promotion || ''),
        fenAfter: game.chess.fen()
    })
    game.turnStartedAt = new Date().toISOString() // jam pihak berikutnya mulai
    return mv
}

function finishIfOver(game) {
    if (game.status !== 'IN_PROGRESS' || !game.chess.isGameOver()) return
    game.status = 'FINISHED'
    if (game.chess.isCheckmate()) {
        const loser = sideOf(game.chess)
        game.result = loser === game.playerColor ? 'AI_WIN' : 'PLAYER_WIN'
    } else {
        game.result = 'DRAW'
    }
}


function tick(game) {
    if (game.status !== 'IN_PROGRESS' || !game.clocks) return
    const side = sideOf(game.chess)
    const now = Date.now()
    game.clocks[side] -= now - new Date(game.turnStartedAt).getTime()
    game.turnStartedAt = new Date(now).toISOString()
    if (game.clocks[side] <= 0) {
        game.clocks[side] = 0
        game.status = 'FINISHED'
        game.endReason = 'TIMEOUT'
        game.result = side === game.playerColor ? 'AI_WIN' : 'PLAYER_WIN'
    }
}

async function playBotMove(game) {
    const botMove = await getBotMove(game.chess.fen(), game.difficulty)
    recordMove(game, botMove)
    finishIfOver(game)
}


function startAnalysis(game, moveEntry, beforeFen, afterFen) {
    const data = {
        move: moveEntry.san,
        playerColor: game.playerColor,
        beforeFen,
        afterFen
    }

    moveEntry.analysis = {
        status: 'PENDING',
        accuracy: null,
        winChance: null,
        evalCp: null,
        bestMove: null,
        text: null,
        textPending: false
    }

    analyseWithStockfish(data)
        .then((sf) => {
            moveEntry.analysis = {
                status: 'DONE',
                accuracy: sf.accuracy,
                winChance: sf.winChance,
                evalCp: sf.evalCp,
                bestMove: sf.bestMove,
                text: null,
                textPending: true
            }

            return explainWithGemini(data, sf).then((text) => {
                moveEntry.analysis.text = text
                moveEntry.analysis.textPending = false
            })
        })
        .catch((error) => {
            console.error('Analisis gagal:', error.message)
            if (moveEntry.analysis.status === 'DONE') {
                moveEntry.analysis.textPending = false // angka sudah ada, teks saja yang gagal
                return
            }
            moveEntry.analysis = {
                status: 'FAILED',
                accuracy: null,
                winChance: null,
                evalCp: null,
                bestMove: null,
                text: null,
                textPending: false
            }
        })
}

async function createGame(data) {
    const game = newGame(parseSettings(data))
    games.set(game.id, game)

    if (game.playerColor === 'BLACK') {
        game.busy = true
        try {
            await playBotMove(game)
        } catch (error) {
            games.delete(game.id)
            throw new Error('Bot gagal memulai game: ' + error.message)
        } finally {
            game.busy = false
        }
    }
    return serialize(game)
}

async function makeMove(id, input) {
    const game = getGameOrThrow(id)

    if (game.status !== 'IN_PROGRESS') throw new Error('Game sudah selesai')
    if (game.busy) throw new Error('Tunggu bot selesai bergerak')

    tick(game)
    if (game.status !== 'IN_PROGRESS') return serialize(game) // waktu pemain habis

    const myTurn = game.playerColor === 'WHITE' ? 'w' : 'b'
    if (game.chess.turn() !== myTurn) throw new Error('Bukan giliranmu')

    const { from, to, promotion } = input ?? {}
    if (typeof from !== 'string' || typeof to !== 'string') {
        throw new Error('Data langkah tidak valid')
    }

    // simpan kondisi sebelum langkah, untuk rollback kalau bot gagal
    const beforeFen = game.chess.fen()
    const snapshot = {
        movesLength: game.moves.length,
        clocks: game.clocks ? { ...game.clocks } : null,
        turnStartedAt: game.turnStartedAt
    }

    try {
        recordMove(game, { from, to, promotion })
    } catch {
        throw new Error('Langkah ilegal')
    }

    const playerMove = game.moves[game.moves.length - 1]
    finishIfOver(game)
    startAnalysis(game, playerMove, beforeFen, game.chess.fen())

    if (game.status === 'IN_PROGRESS') {
        game.busy = true
        try {
            await playBotMove(game)
            tick(game) // waktu bot berpikir ikut mengurangi jam bot
        } catch (error) {
            console.error('Bot error:', error.message)
            // balikkan ke giliran pemain
            game.chess.undo()
            game.moves.length = snapshot.movesLength
            game.clocks = snapshot.clocks
            game.turnStartedAt = snapshot.turnStartedAt
            game.status = 'IN_PROGRESS'
            game.result = null
            game.endReason = null
            throw new Error('Bot gagal bergerak, coba ulangi langkahmu')
        } finally {
            game.busy = false
        }
    }

    return serialize(game)
}

function resign(id) {
    const game = getGameOrThrow(id)
    if (game.status !== 'IN_PROGRESS') throw new Error('Game sudah selesai')
    game.status = 'FINISHED'
    game.result = 'AI_WIN'
    game.endReason = 'RESIGNATION'
    return serialize(game)
}

async function restart(id) {
    const old = getGameOrThrow(id)
    const { playerColor, difficulty, timeControl } = old
    games.delete(id)
    return createGame({ playerColor, difficulty, timeControl })
}


function handle(event, socket, fn) {
    socket.on(event, async (payload, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {}
        try {
            const game = await fn(payload)
            reply({ ok: true, game })
        } catch (error) {
            reply({ ok: false, error: error.message })
        }
    })
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    handle('createGame', socket, (data) => createGame(data))
    handle('getGame', socket, (data) => {
        const game = getGameOrThrow(data?.id)
        tick(game)
        return serialize(game)
    })
    handle('makeMove', socket, (data) => makeMove(data?.id, data?.move))
    handle('resign', socket, (data) => resign(data?.id))
    handle('restart', socket, (data) => restart(data?.id))

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)
    })
})

setInterval(() => {
    const now = Date.now()
    for (const [id, game] of games) {
        if (now - game.touchedAt > IDLE_LIMIT_MS) games.delete(id)
    }
}, 10 * 60 * 1000).unref()

app.get('/', (req, res) => res.send('Chess server is running!'))

httpServer.listen(port, () => {
    console.log(`Server listening on port ${port}`)
    // nyalakan Stockfish dari awal supaya langkah pertama tidak lambat
    Promise.all([botEngine.warmUp(), analysisEngine.warmUp()])
        .then(() => console.log('Stockfish siap'))
        .catch((error) => console.error('Stockfish gagal dijalankan:', error.message))
})

process.on('SIGINT', () => {
    shutdownEngines()
    process.exit(0)
})
process.on('SIGTERM', () => {
    shutdownEngines()
    process.exit(0)
})