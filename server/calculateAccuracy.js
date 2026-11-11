// untuk menghitung centipawn loss dan mengubahnya mejadi persentasi accuracy
// centipawn loss -> selisih antara evaluasi langkah terbaik dan evaluasi langkah yang dimainkan
function calculateAccuracy(bestScore, playedScore) {
    const centipawnLoss = Math.max(0, bestScore - playedScore);

    const accuracy = Math.round(100 * Math.exp(-centipawnLoss / 300));

    return {
        accuracy: accuracy,
        centipawnLoss: centipawnLoss
    };
}

module.exports = calculateAccuracy;