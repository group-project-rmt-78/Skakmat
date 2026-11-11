const originalFetch = globalThis.fetch;
const stockfish = require("stockfish");
const enginePath = stockfish.findEngine("lite-single");

// fens -> posisi catur yg dianalisis
function analysePositions(fens, skillLevel = 20, depth = 12) {
    return new Promise((resolve, reject) => {

        let engine;
        let results = [];
        let currentIndex = 0;
        let scoreCp = 0;
        let bestMove = null;
        let sentReady = false;
        let finished = false;
        let timeout;

        // ex: [{scoreCp: 17, bestMove:"e2e3"}]
        function finish(error) {
            if (finished) return;

            finished = true;
            clearTimeout(timeout);

            if (engine && typeof engine.terminate === "function") {
                engine.terminate();
            }

            // Restore original fetch
            globalThis.fetch = originalFetch;

            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        }

        function analyseNextPosition() {
            scoreCp = 0;
            bestMove = null;

            engine.processCommand(`position fen ${fens[currentIndex]}`); // posisi papan catur
            engine.processCommand(`go depth ${depth}`);
        }

        try {
            engine = stockfish(enginePath, (line) => {
                if (typeof line !== "string") return;

                // uciok -> stockfish selesai melakukan inisilisasi UCI
                if (line.includes("uciok") && !sentReady) {
                    sentReady = true;
                    engine.processCommand(`setoption name Skill Level value ${skillLevel}`);
                    engine.processCommand("isready");
                }

                if (line.includes("readyok") && currentIndex === 0) {
                    analyseNextPosition();
                }

                const cpMatch = line.match(/score cp (-?\d+)/);
                const mateMatch = line.match(/score mate (-?\d+)/);

                if (cpMatch) {
                    scoreCp = Number(cpMatch[1]);
                }

                if (mateMatch) {
                    const mate = Number(mateMatch[1]);
                    scoreCp = mate > 0 ? 10000 : -10000;
                }

                const match = line.match(/bestmove\s+(\S+)/);

                if (match) {
                    bestMove = match[1];

                    if (bestMove === "(none)") {
                        finish(new Error("No available move"));
                        return;
                    }

                    results.push({
                        scoreCp: scoreCp,
                        bestMove: bestMove
                    });

                    currentIndex++;

                    if (currentIndex < fens.length) {
                        analyseNextPosition();
                    } else {
                        finish(null);
                    }
                }
            });

            timeout = setTimeout(() => {
                finish(new Error("Stockfish timeout"));
            }, 60000);

            engine.processCommand("uci");

        } catch (error) {
            finish(error);
        }
    });
}

module.exports = analysePositions;
