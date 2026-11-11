
const analysePositions = require("./stockfishAnalysis");
const calculateAccuracy = require("./calculateAccuracy");
const explainMove = require("./geminiAnalysis");

async function moveAnalysis(data) {
    try {
        // analisis kedua posisi
        const analyses = await analysePositions([data.beforeFen,data.afterFen]);

        const beforeAnalysis = analyses[0];
        const afterAnalysis = analyses[1];

        // hitung accuracy
        const bestScore = beforeAnalysis.scoreCp;
        const playedScore = -afterAnalysis.scoreCp;

        const accuracyResult = calculateAccuracy(bestScore, playedScore);

        // Gemini feedback
        const feedback = await explainMove({
            move: data.move,
            bestMove: beforeAnalysis.bestMove,
            accuracy: accuracyResult.accuracy,
            centipawnLoss: accuracyResult.centipawnLoss,
            beforeFen: data.beforeFen,
            afterFen: data.afterFen
        });

        return {
            move: data.move,
            bestMove: beforeAnalysis.bestMove,
            accuracy: accuracyResult.accuracy,
            centipawnLoss: accuracyResult.centipawnLoss,
            feedback: feedback
        };

    } catch (error) {
        console.error("Move Analysis Error:", error);
        throw error;
    }
}

module.exports = moveAnalysis;
