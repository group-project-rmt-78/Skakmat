// langkah bidak & giliran bermain
function getMove ( chess, from, to, promotion, color) {
    try {
        if (chess.turn() !== color) {
            throw new Error ("It's not your turn")
        }

        const game = chess.move({ from, to, promotion})
        return {
            message: 'Legal moves',
            game
        }
    } catch (error) {
        throw error
    }
}

// legal moves
function getLegalMoves( chess, square ) {
    const moves = chess.moves({ square, verbose: true })
    return moves.map((m) => m.to)
}

// skakmat
function isCheckmate(game) {
    return game.isCheckmate()
}

// hasil pertandingan
function getResult(chess) {
    if (isCheckmate(chess)) {
        const win = chess.turn() === 'w' ? 'black' : 'white'
        return ({ over: true, win, reason: 'checkmate' })
    }

    if (chess.isStalemate()) {
        return ({ over: true, win: null, reason: 'stalemate' }) 
    }

    if (chess.isInsufficientMaterial()) {
        return ({ over: true, win: null, reason: 'insufficient' })
    }

    if (chess.isThreefoldRepetition()) {
        return ({ over: true, win: null, reason: 'repetition' })
    }

    if (chess.isDraw()) {
        return ({ over: true, win: null, reason: 'draw' })
    }

    return ({ over: false, win: null, reason: null })
}

module.exports = { getMove, getLegalMoves, getResult }