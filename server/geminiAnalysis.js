require("dotenv").config();

console.log("Gemini API Key loaded:", Boolean(process.env.GEMINI_API_KEY));

const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function explainMove(moveData) {
    const prompt = `
        You are a friendly chess coach.

        Analyze this chess move and explain it to a beginner.

        Played move: ${moveData.move}
        Best move according to Stockfish: ${moveData.bestMove}

        Accuracy: ${moveData.accuracy}%
        Centipawn loss: ${moveData.centipawnLoss}

        Position before the move:
        ${moveData.beforeFen}

        Position after the move:
        ${moveData.afterFen}

        Instructions:
        1. Jelaskan apakah langkah pemain bagus atau buruk.
        2. Jelaskan alasannya secara singkat.
        3. Gunakan Bahasa Indonesia yang sederhana dan mudah dipahami pemula.
        4. Berikan feedback tepat SATU kalimat.
        5. Jangan mengarang atau mengubah persentase accuracy.
        6. Selalu gunakan Bahasa Indonesia dalam jawaban.
        `;

    const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
    });

    return response.text;
}

module.exports = explainMove;
