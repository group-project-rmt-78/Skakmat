const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

// nyari file engine yang ringan di node_modules/stockfish
function findEngine() {
    const base = path.join(__dirname, 'node_modules', 'stockfish')
    for (const dir of ['src', 'bin']) {
        const folder = path.join(base, dir)
        if (!fs.existsSync(folder)) continue
        const file = fs.readdirSync(folder).find(
            (f) => f.includes('lite-single') && f.endsWith('.js')
        )
        if (file) return path.join(folder, file)
    }
    throw new Error('File engine stockfish nggak ketemu di node_modules/stockfish')
}

const levels = { beginner: 0, easy: 4, medium: 8, hard: 14, expert: 20 }

// fen = posisi papan, level = salah satu dari lima level di atas
function getBotMove(fen, level = 'medium') {
    return new Promise((resolve, reject) => {
        const engine = spawn('node', [findEngine()])
        let output = ''

        const timer = setTimeout(() => {
            engine.kill()
            reject(new Error('Stockfish kelamaan'))
        }, 10000)

        engine.stdout.on('data', (data) => {
            output += data.toString()
            const match = output.match(/bestmove (\S+)/)
            if (match) {
                clearTimeout(timer)
                engine.kill()
                const m = match[1] // contoh: 'e7e5' atau 'e7e8q'
                resolve({
                    from: m.slice(0, 2),
                    to: m.slice(2, 4),
                    promotion: m[4], // undefined kalau bukan promosi
                })
            }
        })

        engine.on('error', (err) => {
            clearTimeout(timer)
            reject(err)
        })

        engine.stdin.write('uci\n')
        engine.stdin.write(`setoption name Skill Level value ${levels[level] ?? 8}\n`)
        engine.stdin.write(`position fen ${fen}\n`)
        engine.stdin.write('go movetime 500\n')
    })
}

module.exports = { getBotMove }