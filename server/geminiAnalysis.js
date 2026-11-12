require('dotenv').config()

let ai = null

function getClient() {
    if (ai) return ai
    if (!process.env.GEMINI_API_KEY) return null
    const { GoogleGenAI } = require('@google/genai')
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    return ai
}

function getModels() {
    const main = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
    return [...new Set([main, 'gemini-3.5-flash-lite'])]
}

function fallbackFeedback({ move, bestMove, accuracy }) {
    if (accuracy >= 90) {
        return `Langkah ${move} sangat bagus dan menjaga posisimu tetap kuat.`
    }
    if (accuracy >= 70) {
        return `Langkah ${move} cukup baik, tapi ${bestMove} sedikit lebih kuat.`
    }
    if (accuracy >= 50) {
        return `Langkah ${move} agak melonggarkan posisimu, ${bestMove} lebih tepat.`
    }
    return `Langkah ${move} kemungkinan melepas keuntungan, ${bestMove} jauh lebih baik.`
}

function buildPrompt(d) {
    const side = d.playerColor === 'WHITE' ? 'putih' : 'hitam'
    return `
Kamu adalah pelatih catur yang ramah. Jelaskan SATU langkah pemain kepada pemula.

Pemain memegang bidak ${side}.
Langkah yang dimainkan pemain: ${d.move}
Langkah terbaik menurut Stockfish: ${d.bestMove}

Data dari Stockfish (JANGAN diubah atau dikarang ulang):
- Akurasi langkah: ${d.accuracy}%
- Kehilangan nilai (centipawn loss): ${d.centipawnLoss}
- Perkiraan peluang menang pemain setelah langkah: ${d.winChance}%

Posisi sebelum langkah (FEN): ${d.beforeFen}
Posisi sesudah langkah (FEN): ${d.afterFen}

Aturan jawaban:
1. Jelaskan apakah langkah itu bagus atau buruk, dan alasannya (ancaman, bidak yang terancam, penguasaan pusat, pengembangan bidak, keamanan raja, dan sebagainya).
2. Kalau bukan langkah terbaik, sebut singkat kenapa ${d.bestMove} lebih baik.
3. Gunakan Bahasa Indonesia sederhana yang mudah dipahami pemula.
4. Maksimal DUA kalimat, tanpa daftar, tanpa markdown.
5. Jangan menyebut angka persentase yang berbeda dari data di atas.
`
}

async function explainMove(data) {
    const client = getClient()
    if (!client) return fallbackFeedback(data)

    const prompt = buildPrompt(data)

    for (const model of getModels()) {
        try {
            const response = await Promise.race([
                client.models.generateContent({ model, contents: prompt }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Gemini timeout')), 15000)
                )
            ])
            const text = response?.text?.trim()
            if (text) return text
        } catch (error) {
            console.error(`Gemini error (${model}):`, error.message)
        }
    }
    return fallbackFeedback(data)
}

module.exports = explainMove