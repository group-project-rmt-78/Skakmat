const { Chess } = require('chess.js')
const { analysisEngine } = require('./engine')

async function analysePositions(fens, depth = 12) {
    const results = []

    for (const fen of fens) {
        const chess = new Chess(fen)


        if (chess.isGameOver()) {
            results.push({
                scoreCp: chess.isCheckmate() ? -10000 : 0,
                bestMove: null
            })
            continue
        }

        const { scoreCp, bestMove } = await analysisEngine.search(fen, {
            skill: 20,
            depth
        })
        results.push({ scoreCp, bestMove })
    }

    return results
}

module.exports = analysePositions