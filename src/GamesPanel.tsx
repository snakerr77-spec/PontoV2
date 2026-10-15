import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Gamepad2, RotateCcw, Trophy } from 'lucide-react'

type Game = 'flap' | 'snake'

const BOARD_W = 720
const BOARD_H = 420

function FlapGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const stateRef = useRef({ y: 190, velocity: 0, pipes: [] as { x: number; gapY: number; scored: boolean }[], score: 0, started: false, over: false, last: 0 })
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => {
    try { return Number(window.localStorage.getItem('kern-flap-best') || 0) }
    catch { return 0 }
  })
  const [playing, setPlaying] = useState(false)

  const reset = useCallback(() => {
    stateRef.current = {
      y: BOARD_H / 2, velocity: 0,
      pipes: [{ x: 570, gapY: 175, scored: false }, { x: 850, gapY: 245, scored: false }, { x: 1130, gapY: 150, scored: false }],
      score: 0, started: false, over: false, last: 0,
    }
    setScore(0)
    setPlaying(false)
  }, [])

  const flap = useCallback(() => {
    const s = stateRef.current
    if (s.over) { reset(); return }
    s.started = true
    s.velocity = -440
    setPlaying(true)
  }, [reset])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let alive = true
    const draw = (now: number) => {
      if (!alive) return
      const s = stateRef.current
      const dt = s.last ? Math.min((now - s.last) / 1000, 0.035) : 0
      s.last = now
      const w = canvas.clientWidth || BOARD_W
      const h = canvas.clientHeight || BOARD_H
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#090a0d'; ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(255,255,255,.045)'; ctx.lineWidth = 1
      for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
      const scale = w / BOARD_W
      const gameH = BOARD_H
      if (s.started && !s.over) {
        s.velocity += 1150 * dt
        s.y += s.velocity * dt
        s.pipes.forEach(p => {
          p.x -= 205 * dt
          if (!p.scored && p.x + 64 < 125) { p.scored = true; s.score++; setScore(s.score) }
          if (p.x < -70) {
            const far = Math.max(...s.pipes.map(q => q.x))
            p.x = far + 280
            p.gapY = 105 + Math.random() * 210
            p.scored = false
          }
          if (p.x < 145 && p.x + 64 > 105 && (s.y - 12 < p.gapY - 72 || s.y + 12 > p.gapY + 72)) s.over = true
        })
        if (s.y < 12 || s.y > gameH - 12) s.over = true
        if (s.over) {
          setPlaying(false)
          if (s.score > best) {
            setBest(s.score)
            try { window.localStorage.setItem('kern-flap-best', String(s.score)) } catch { /* armazenamento indisponível */ }
          }
        }
      } else if (!s.started && !s.over) {
        s.y = gameH / 2 + Math.sin(now / 330) * 9
      }
      ctx.save(); ctx.scale(w / BOARD_W, h / BOARD_H)
      s.pipes.forEach(p => {
        ctx.fillStyle = '#f2f3f5'
        ctx.fillRect(p.x, 0, 64, Math.max(0, p.gapY - 72))
        ctx.fillRect(p.x, p.gapY + 72, 64, Math.max(0, gameH - p.gapY - 72))
        ctx.fillStyle = '#aeb4bf'
        ctx.fillRect(p.x - 5, p.gapY - 78, 74, 7)
        ctx.fillRect(p.x - 5, p.gapY + 71, 74, 7)
      })
      ctx.fillStyle = '#aeb4bf'; ctx.fillRect(105, s.y - 12, 24, 24)
      ctx.fillStyle = '#090a0d'; ctx.fillRect(116, s.y - 6, 5, 5)
      ctx.restore()
      if (!s.started || s.over) {
        ctx.fillStyle = 'rgba(4,5,7,.68)'; ctx.fillRect(0, 0, w, h)
        ctx.textAlign = 'center'; ctx.fillStyle = '#f4f5f7'
        ctx.font = '700 23px Inter, system-ui'
        ctx.fillText(s.over ? 'FIM DE JOGO' : 'FLAP', w / 2, h / 2 - 12)
        ctx.font = '12px Inter, system-ui'; ctx.fillStyle = '#aeb4bf'
        ctx.fillText(s.over ? 'Toque para tentar novamente' : 'Toque, clique ou pressione espaço para voar', w / 2, h / 2 + 17)
      }
      frameRef.current = requestAnimationFrame(draw)
    }
    frameRef.current = requestAnimationFrame(draw)
    return () => { alive = false; cancelAnimationFrame(frameRef.current) }
  }, [best])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap() }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [flap])

  return <div className="kg-game-card">
    <div className="kg-game-top"><div><span className="kg-kicker">ARCADE / 01</span><h2>Flap</h2><p>Desvie dos obstáculos e tente bater seu recorde.</p></div><div className="kg-score"><span>PONTUAÇÃO</span><strong>{score}</strong><small><Trophy size={13} /> Recorde: {best}</small></div></div>
    <button className="kg-flap-canvas" onClick={flap} aria-label="Jogar Flap"><canvas ref={canvasRef} /></button>
    <div className="kg-game-footer"><span>{playing ? 'Partida em andamento' : 'Espaço / ↑ / toque para voar'}</span><button onClick={reset}><RotateCcw size={14} /> Reiniciar</button></div>
  </div>
}

const START_SNAKE = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }]
const DIRECTIONS = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } }
type Point = { x: number; y: number }

function SnakeGame() {
  const [snake, setSnake] = useState<Point[]>(START_SNAKE)
  const [food, setFood] = useState<Point>({ x: 14, y: 10 })
  const [direction, setDirection] = useState<Point>({ x: 1, y: 0 })
  const [score, setScore] = useState(0)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const snakeRef = useRef(snake)
  const directionRef = useRef(direction)
  const foodRef = useRef(food)
  const runningRef = useRef(running)
  const overRef = useRef(over)
  useEffect(() => { snakeRef.current = snake }, [snake])
  useEffect(() => { directionRef.current = direction }, [direction])
  useEffect(() => { foodRef.current = food }, [food])
  useEffect(() => { runningRef.current = running }, [running])
  useEffect(() => { overRef.current = over }, [over])

  const turn = useCallback((next: Point) => {
    const cur = directionRef.current
    if (cur.x + next.x === 0 && cur.y + next.y === 0) return
    directionRef.current = next
    setDirection(next)
    if (!overRef.current) { runningRef.current = true; setRunning(true) }
  }, [])

  const restart = useCallback(() => {
    const fresh = [...START_SNAKE]
    snakeRef.current = fresh; directionRef.current = { x: 1, y: 0 }; foodRef.current = { x: 14, y: 10 }
    runningRef.current = false; overRef.current = false
    setSnake(fresh); setDirection({ x: 1, y: 0 }); setFood({ x: 14, y: 10 }); setScore(0); setRunning(false); setOver(false)
  }, [])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const d = DIRECTIONS[e.key as keyof typeof DIRECTIONS]
      if (d) { e.preventDefault(); turn(d) }
      if (e.code === 'Space' && overRef.current) restart()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [turn, restart])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!runningRef.current || overRef.current) return
      const current = snakeRef.current
      const dir = directionRef.current
      const head = { x: current[0].x + dir.x, y: current[0].y + dir.y }
      if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20 || current.some(p => p.x === head.x && p.y === head.y)) {
        overRef.current = true; runningRef.current = false; setOver(true); setRunning(false); return
      }
      const ate = head.x === foodRef.current.x && head.y === foodRef.current.y
      const next = [head, ...current]
      if (!ate) next.pop()
      else {
        setScore(s => s + 10)
        let nextFood: Point
        do { nextFood = { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) } }
        while (next.some(p => p.x === nextFood.x && p.y === nextFood.y))
        foodRef.current = nextFood; setFood(nextFood)
      }
      snakeRef.current = next; setSnake(next)
    }, 125)
    return () => window.clearInterval(timer)
  }, [])

  return <div className="kg-game-card">
    <div className="kg-game-top"><div><span className="kg-kicker">ARCADE / 02</span><h2>Jogo da cobrinha</h2><p>Coma os pontos, cresça e não bata nas paredes nem em si mesmo.</p></div><div className="kg-score"><span>PONTUAÇÃO</span><strong>{score}</strong><small>{over ? 'Partida encerrada' : running ? 'Em andamento' : 'Pronto para jogar'}</small></div></div>
    <div className="kg-snake-board" role="img" aria-label="Tabuleiro do jogo da cobrinha">
      {Array.from({ length: 400 }, (_, i) => {
        const x = i % 20, y = Math.floor(i / 20)
        const isHead = snake[0]?.x === x && snake[0]?.y === y
        const isSnake = snake.some(p => p.x === x && p.y === y)
        const isFood = food.x === x && food.y === y
        return <div key={i} className={`kg-cell${isHead ? ' head' : isSnake ? ' body' : isFood ? ' food' : ''}`} />
      })}
      {!running && !over && <div className="kg-snake-overlay"><strong>COBRINHA</strong><span>Use as setas para começar</span></div>}
      {over && <div className="kg-snake-overlay"><strong>FIM DE JOGO</strong><span>Você fez {score} pontos</span><button onClick={restart}>Jogar novamente</button></div>}
    </div>
    <div className="kg-game-footer"><span>Use as setas do teclado ou os controles</span><button onClick={restart}><RotateCcw size={14} /> Reiniciar</button></div>
    <div className="kg-dpad" aria-label="Controles da cobrinha">
      <button onClick={() => turn(DIRECTIONS.ArrowUp)} aria-label="Cima"><ArrowUp /></button>
      <div><button onClick={() => turn(DIRECTIONS.ArrowLeft)} aria-label="Esquerda"><ArrowLeft /></button><button onClick={() => turn(DIRECTIONS.ArrowDown)} aria-label="Baixo"><ArrowDown /></button><button onClick={() => turn(DIRECTIONS.ArrowRight)} aria-label="Direita"><ArrowRight /></button></div>
    </div>
  </div>
}

export default function GamesPanel() {
  const [game, setGame] = useState<Game>('flap')
  return <main className="app-shell kg-games-shell">
    <section className="container kg-games-container">
      <header className="kg-games-heading">
        <div><span className="kg-kicker"><Gamepad2 size={14} /> ÁREA DE LAZER</span><h1>Games <em>Arcade.</em></h1><p>Uma pausa rápida entre as tarefas.</p></div>
        <div className="kg-games-count">02 <span>JOGOS DISPONÍVEIS</span></div>
      </header>
      <div className="kg-game-tabs" role="tablist" aria-label="Selecionar jogo">
        <button role="tab" aria-selected={game === 'flap'} className={game === 'flap' ? 'active' : ''} onClick={() => setGame('flap')}><span>01</span> Flap</button>
        <button role="tab" aria-selected={game === 'snake'} className={game === 'snake' ? 'active' : ''} onClick={() => setGame('snake')}><span>02</span> Cobrinha</button>
      </div>
      {game === 'flap' ? <FlapGame /> : <SnakeGame />}
      <p className="kg-games-note">KERN · ARCADE <span>Os jogos funcionam localmente no navegador.</span></p>
    </section>
  </main>
}
