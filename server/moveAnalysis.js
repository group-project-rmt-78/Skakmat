const { Chess } = require('chess.js')
const analysePositions = require('./stockfishAnalysis')
const calculateAccuracy = require('./calculateAccuracy')
const explainMove = require('./geminiAnalysis')

function winChanceFromCp(cp) {
    const chance = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
    return Math.round(Math.max(0, Math.min(100, chance)))
}

function uciToSan(fen, uci) {
    if (!uci) return null
    try {
        const chess = new Chess(fen)
        return chess.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci.slice(4, 5) || undefined
        }).san
    } catch {
        return uci
    }
}

async function analyseWithStockfish(data) {
    const [beforeAnalysis, afterAnalysis] = await analysePositions([
        data.beforeFen,
        data.afterFen
    ])

    const bestScore = beforeAnalysis.scoreCp
    const playedScore = -afterAnalysis.scoreCp

    const { accuracy, centipawnLoss } = calculateAccuracy(bestScore, playedScore)

    return {
        move: data.move,
        bestMove: uciToSan(data.beforeFen, beforeAnalysis.bestMove) ?? data.move,
        accuracy,
        centipawnLoss,
        winChance: winChanceFromCp(playedScore),
        evalCp: playedScore
    }
}

async function explainWithGemini(data, stockfishResult) {
    return explainMove({
        playerColor: data.playerColor,
        move: stockfishResult.move,
        bestMove: stockfishResult.bestMove,
        accuracy: stockfishResult.accuracy,
        centipawnLoss: stockfishResult.centipawnLoss,
        winChance: stockfishResult.winChance,
        beforeFen: data.beforeFen,
        afterFen: data.afterFen
    })
}

module.exports = { analyseWithStockfish, explainWithGemini }