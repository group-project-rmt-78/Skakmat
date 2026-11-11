const { Chess } = require('chess.js')
const { getBotMove } = require('./stockfish')

async function testLevels() {
    const levels = ['beginner', 'easy', 'medium', 'hard', 'expert']

    for (const level of levels) {
        const chess = new Chess()

        const move = await getBotMove(chess.fen(), level)

        console.log(`Level ${level}:`, move)
    }
}

testLevels()
