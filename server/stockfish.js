const { botEngine } = require('./engine')

const LEVELS = {
    beginner: { skill: 0, movetime: 100 },
    easy: { skill: 4, movetime: 250 },
    medium: { skill: 8, movetime: 500 },
    hard: { skill: 14, movetime: 900 },
    expert: { skill: 20, movetime: 1500 }
}

// fen = posisi papan, level = beginner | easy | medium | hard | expert
async function getBotMove(fen, level = 'medium') {
    const config = LEVELS[level] ?? LEVELS.medium

    let result
    try {
        result = await botEngine.search(fen, config)
    } catch (error) {
        console.error('Bot gagal, mencoba sekali lagi:', error.message)
        result = await botEngine.search(fen, config) 
    }

    const m = result.bestMove 
    return {
        from: m.slice(0, 2),
        to: m.slice(2, 4),
        promotion: m[4] 
    }
}

module.exports = { getBotMove, LEVELS }