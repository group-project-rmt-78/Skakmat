const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const EXIT = '__engine_exit__'

function findEngine() {
    if (process.env.STOCKFISH_PATH) return process.env.STOCKFISH_PATH

    const base = path.join(__dirname, 'node_modules', 'stockfish')
    const dirs = ['src', 'bin', '.']
        .map((d) => path.join(base, d))
        .filter((d) => fs.existsSync(d))

    let fallback = null
    for (const dir of dirs) {
        for (const file of fs.readdirSync(dir)) {
            if (!file.endsWith('.js')) continue
            if (file.includes('lite-single')) return path.join(dir, file)
            if (!fallback && /^stockfish.*\.js$/.test(file)) {
                fallback = path.join(dir, file)
            }
        }
    }
    if (fallback) return fallback

    throw new Error(
        'File engine Stockfish tidak ketemu. Jalankan "npm install" di folder server atau isi STOCKFISH_PATH di .env'
    )
}

function toCentipawn(score) {
    if (!score) return 0
    if (score.mate !== undefined) return score.mate > 0 ? 10000 : -10000
    return score.cp
}

class UciEngine {
    constructor(label) {
        this.label = label
        this.proc = null
        this.buffer = ''
        this.listeners = new Set()
        this.starting = null
        this.queue = Promise.resolve()
    }

    _emitLine(line) {
        for (const listener of [...this.listeners]) listener(line)
    }

    _send(command) {
        if (!this.proc) throw new Error(`${this.label}: engine belum jalan`)
        this.proc.stdin.write(command + '\n')
    }

 
    _waitFor(test, ms, onLine) {
        return new Promise((resolve, reject) => {
            const cleanup = () => {
                clearTimeout(timer)
                this.listeners.delete(listener)
            }
            const timer = setTimeout(() => {
                cleanup()
                reject(new Error(`${this.label}: Stockfish kelamaan merespons`))
            }, ms)
            const listener = (line) => {
                if (line === EXIT) {
                    cleanup()
                    return reject(new Error(`${this.label}: proses Stockfish berhenti`))
                }
                if (onLine) onLine(line)
                if (test(line)) {
                    cleanup()
                    resolve(line)
                }
            }
            this.listeners.add(listener)
        })
    }

    _kill() {
        if (this.proc) {
            try {
                this.proc.kill()
            } catch {
                /* sudah mati */
            }
        }
        this.proc = null
        this.starting = null
    }

    _start() {
        if (this.starting) return this.starting

        this.starting = (async () => {
            const file = findEngine()
            const proc = spawn(process.execPath, [file], {
                stdio: ['pipe', 'pipe', 'pipe']
            })
            this.proc = proc
            this.buffer = ''

            proc.stdout.on('data', (data) => {
                this.buffer += data.toString()
                let index
                while ((index = this.buffer.indexOf('\n')) >= 0) {
                    const line = this.buffer.slice(0, index).trim()
                    this.buffer = this.buffer.slice(index + 1)
                    if (line) this._emitLine(line)
                }
            })
            proc.stderr.on('data', () => {})
            proc.stdin.on('error', () => {})
            proc.on('error', () => {
                if (this.proc === proc) {
                    this.proc = null
                    this.starting = null
                }
                this._emitLine(EXIT)
            })
            proc.on('exit', () => {
                if (this.proc === proc) {
                    this.proc = null
                    this.starting = null
                }
                this._emitLine(EXIT)
            })

            const uciok = this._waitFor((l) => l === 'uciok', 20000)
            this._send('uci')
            await uciok

            const ready = this._waitFor((l) => l === 'readyok', 20000)
            this._send('isready')
            await ready
        })().catch((err) => {
            this._kill()
            throw err
        })

        return this.starting
    }

    warmUp() {
        return this._enqueue(() => this._start())
    }

    _enqueue(task) {
        const run = this.queue.then(task)
        this.queue = run.catch(() => {})
        return run
    }

    search(fen, opts = {}) {
        return this._enqueue(() => this._search(fen, opts))
    }

    async _search(fen, { skill = 20, depth, movetime = 500 }) {
        await this._start()

        this._send(`setoption name Skill Level value ${skill}`)
        this._send('ucinewgame')
        const ready = this._waitFor((l) => l === 'readyok', 10000)
        this._send('isready')
        await ready

        this._send(`position fen ${fen}`)

        let score = null
        const limitMs = depth ? 30000 : movetime + 10000
        const done = this._waitFor(
            (l) => l.startsWith('bestmove'),
            limitMs,
            (line) => {
                if (!line.startsWith('info') || !line.includes(' score ')) return
                const cp = line.match(/score cp (-?\d+)/)
                const mate = line.match(/score mate (-?\d+)/)
                if (cp) score = { cp: Number(cp[1]) }
                else if (mate) score = { mate: Number(mate[1]) }
            }
        )

        this._send(depth ? `go depth ${depth}` : `go movetime ${movetime}`)

        let line
        try {
            line = await done
        } catch (err) {
            this._kill() 
            throw err
        }

        const bestMove = line.split(/\s+/)[1]
        if (!bestMove || bestMove === '(none)') {
            throw new Error('Stockfish tidak menemukan langkah legal')
        }
        return { bestMove, scoreCp: toCentipawn(score) }
    }

    close() {
        this._kill()
    }
}


const botEngine = new UciEngine('bot')
const analysisEngine = new UciEngine('analysis')

function shutdownEngines() {
    botEngine.close()
    analysisEngine.close()
}

module.exports = { UciEngine, botEngine, analysisEngine, findEngine, shutdownEngines }