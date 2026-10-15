import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Gamepad2, RotateCcw, Trophy, Maximize2, Crosshair } from 'lucide-react'

type Game = 'flap' | 'snake' | 'wildlands'

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
      const sky = ctx.createLinearGradient(0, 0, 0, h)
      sky.addColorStop(0, '#69d7ff'); sky.addColorStop(.68, '#b6f4ff'); sky.addColorStop(1, '#f9f7b1')
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)
      // Sol, nuvens e colinas em camadas
      const drift = (now * .018) % (w + 140)
      ctx.fillStyle = 'rgba(255,255,255,.75)'
      for (let i=0;i<5;i++){ const x=((i*190-drift)%(w+200)+w+200)%(w+200)-60; const y=45+(i%3)*42; ctx.beginPath(); ctx.ellipse(x,y,28,12,0,0,Math.PI*2); ctx.ellipse(x+20,y-5,22,15,0,0,Math.PI*2); ctx.ellipse(x+39,y,25,11,0,0,Math.PI*2); ctx.fill() }
      ctx.fillStyle='#7ddc70'; ctx.beginPath(); ctx.moveTo(0,h*.83); for(let x=0;x<=w+40;x+=40)ctx.lineTo(x,h*.78+Math.sin((x+drift)*.012)*20); ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill()
      ctx.fillStyle='#45bb68'; ctx.beginPath(); ctx.moveTo(0,h*.92); for(let x=0;x<=w+40;x+=40)ctx.lineTo(x,h*.88+Math.sin((x-drift)*.014)*13); ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill()
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
        const topH=Math.max(0,p.gapY-72), botY=p.gapY+72, botH=Math.max(0,gameH-botY)
        const pipe=(x:number,y:number,pw:number,ph:number)=>{ if(ph<=0)return; const g=ctx.createLinearGradient(x,0,x+pw,0);g.addColorStop(0,'#49c927');g.addColorStop(.25,'#a5ff4f');g.addColorStop(.58,'#31b51f');g.addColorStop(1,'#167c22');ctx.fillStyle=g;ctx.strokeStyle='#176b24';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(x,y,pw,ph,8);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(x+10,y+5,7,Math.max(0,ph-10)) }
        pipe(p.x,0,64,topH); pipe(p.x,botY,64,botH)
        ctx.fillStyle='#75ec35';ctx.strokeStyle='#176b24';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(p.x-6,p.gapY-80,76,12,5);ctx.fill();ctx.stroke();ctx.beginPath();ctx.roundRect(p.x-6,p.gapY+68,76,12,5);ctx.fill();ctx.stroke()
      })
      // Passarinho redondo com asa, olho e bico
      ctx.save();ctx.translate(117,s.y);ctx.rotate(Math.max(-.45,Math.min(.65,s.velocity/650)))
      ctx.fillStyle='#ffcf33';ctx.strokeStyle='#9b6419';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,17,14,0,0,Math.PI*2);ctx.fill();ctx.stroke()
      ctx.fillStyle='#ffec83';ctx.beginPath();ctx.ellipse(-5,4,8,6,-.4,0,Math.PI*2);ctx.fill()
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(7,-5,6,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#68451a';ctx.lineWidth=1.5;ctx.stroke()
      ctx.fillStyle='#1b2430';ctx.beginPath();ctx.arc(9,-5,2,0,Math.PI*2);ctx.fill()
      ctx.fillStyle='#ff7043';ctx.beginPath();ctx.moveTo(13,1);ctx.lineTo(25,4);ctx.lineTo(13,8);ctx.closePath();ctx.fill();ctx.strokeStyle='#9b3d2c';ctx.stroke();ctx.restore()
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

  return <div className="kg-game-card" data-game-card>
    <div className="kg-game-top"><div><span className="kg-kicker">ARCADE / 01</span><h2>Flap</h2><p>Desvie dos obstáculos e tente bater seu recorde.</p></div><div className="kg-score"><span>PONTUAÇÃO</span><strong>{score}</strong><small><Trophy size={13} /> Recorde: {best}</small><button className="kg-fullscreen" onClick={(e) => { const el=(e.currentTarget.closest('[data-game-card]') as HTMLElement | null); if(el?.requestFullscreen) void el.requestFullscreen() }}><Maximize2 size={14}/> Tela cheia</button></div></div>
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

  return <div className="kg-game-card" data-game-card>
    <div className="kg-game-top"><div><span className="kg-kicker">ARCADE / 02</span><h2>Jogo da cobrinha</h2><p>Coma os pontos, cresça e não bata nas paredes nem em si mesmo.</p></div><div className="kg-score"><span>PONTUAÇÃO</span><strong>{score}</strong><small>{over ? 'Partida encerrada' : running ? 'Em andamento' : 'Pronto para jogar'}</small><button className="kg-fullscreen" onClick={(e) => { const el=(e.currentTarget.closest('[data-game-card]') as HTMLElement | null); if(el?.requestFullscreen) void el.requestFullscreen() }}><Maximize2 size={14}/> Tela cheia</button></div></div>
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

function WildlandsGame() {
  const canvasRef=useRef<HTMLCanvasElement>(null)
  const [score,setScore]=useState(0),[health,setHealth]=useState(100),[active,setActive]=useState(false)
  const world=useRef({x:0,y:0,px:0,py:0,health:100,score:0,last:0,shots:[] as {x:number;y:number;vx:number;vy:number;life:number}[],foes:Array.from({length:12},()=>({x:(Math.random()-.5)*1400,y:(Math.random()-.5)*1000,hp:2,phase:Math.random()*6})),keys:new Set<string>(),mouse:{x:400,y:250,down:false}})
  useEffect(()=>{const keydown=(e:KeyboardEvent)=>{if(['w','a','s','d','W','A','S','D',' '].includes(e.key))e.preventDefault();world.current.keys.add(e.key.toLowerCase());setActive(true)};const keyup=(e:KeyboardEvent)=>world.current.keys.delete(e.key.toLowerCase());const move=(e:MouseEvent)=>{const r=canvasRef.current?.getBoundingClientRect();if(r)world.current.mouse={...world.current.mouse,x:e.clientX-r.left,y:e.clientY-r.top}};const down=()=>{world.current.mouse.down=true;setActive(true)},up=()=>world.current.mouse.down=false;window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('mousemove',move);window.addEventListener('mousedown',down);window.addEventListener('mouseup',up);return()=>{window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('mousemove',move);window.removeEventListener('mousedown',down);window.removeEventListener('mouseup',up)}},[])
  useEffect(()=>{const canvas=canvasRef.current,ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;let raf=0,alive=true;const draw=(now:number)=>{if(!alive)return;const w=canvas.clientWidth||800,h=canvas.clientHeight||500,dpr=Math.min(devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);const s=world.current,dt=s.last?Math.min((now-s.last)/1000,.04):0;s.last=now;const k=s.keys;let dx=0,dy=0;if(k.has('w'))dy--;if(k.has('s'))dy++;if(k.has('a'))dx--;if(k.has('d'))dx++;const len=Math.hypot(dx,dy)||1;s.x+=dx/len*230*dt;s.y+=dy/len*230*dt;
  const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#6bc5f2');sky.addColorStop(1,'#c3e9a0');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);const grid=90,ox=((w/2-s.x)%grid+grid)%grid,oy=((h/2-s.y)%grid+grid)%grid;ctx.fillStyle='#8fc875';ctx.fillRect(0,h*.45,w,h*.55);ctx.strokeStyle='rgba(39,104,57,.2)';ctx.lineWidth=1;for(let x=ox;x<w;x+=grid){ctx.beginPath();ctx.moveTo(x,h*.42);ctx.lineTo(x,h);ctx.stroke()}for(let y=oy;y<h;y+=grid){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  // árvores, pedras e casas do mundo aberto, determinísticos no mapa
  for(let i=-7;i<9;i++)for(let j=-6;j<8;j++){const wx=Math.floor((s.x-w/2)/grid)+i,wy=Math.floor((s.y-h/2)/grid)+j,hash=Math.abs((wx*73856093^wy*19349663)>>>0);if(hash%7===0){const x=w/2+wx*grid-s.x,y=h/2+wy*grid-s.y;if(x<-50||x>w+50||y<-50||y>h+50)continue;ctx.fillStyle='#76533c';ctx.fillRect(x-4,y+4,8,14);ctx.fillStyle=hash%2?'#1e8b50':'#2ba65c';ctx.beginPath();ctx.arc(x,y,16+hash%8,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,.14)';ctx.beginPath();ctx.arc(x-5,y-6,7,0,Math.PI*2);ctx.fill()}else if(hash%29===0){const x=w/2+wx*grid-s.x,y=h/2+wy*grid-s.y;ctx.fillStyle='#d9d0b7';ctx.fillRect(x-18,y-15,36,30);ctx.fillStyle='#a94e3d';ctx.beginPath();ctx.moveTo(x-23,y-14);ctx.lineTo(x,y-31);ctx.lineTo(x+23,y-14);ctx.fill();ctx.fillStyle='#6b8b9b';ctx.fillRect(x-5,y-3,10,18)}}
  // inimigos perseguem o jogador
  s.foes.forEach((f,i)=>{let fx=w/2+f.x-s.x,fy=h/2+f.y-s.y;const dist=Math.hypot(f.x-s.x,f.y-s.y);if(dist<420&&dist>25){f.x+=(s.x-f.x)/dist*48*dt;f.y+=(s.y-f.y)/dist*48*dt}fx=w/2+f.x-s.x;fy=h/2+f.y-s.y;if(fx>-30&&fx<w+30&&fy>-30&&fy<h+30){ctx.fillStyle='#772f70';ctx.beginPath();ctx.arc(fx,fy,13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ff596d';ctx.beginPath();ctx.arc(fx-4,fy-2,2,0,Math.PI*2);ctx.arc(fx+4,fy-2,2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#28243b';ctx.fillRect(fx-12,fy-20,24,4);ctx.fillStyle='#ff5364';ctx.fillRect(fx-12,fy-20,24*(f.hp/2),4)}if(dist<28&&now%1000<30){s.health=Math.max(0,s.health-4);setHealth(s.health)}})
  if(s.mouse.down){const ang=Math.atan2(s.mouse.y-h/2,s.mouse.x-w/2);if(!s.shots.length||now-(s.shots[s.shots.length-1].life)<150)s.shots.push({x:s.x,y:s.y,vx:Math.cos(ang)*520,vy:Math.sin(ang)*520,life:now})}s.shots=s.shots.filter(b=>now-b.life<850);s.shots.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;const bx=w/2+b.x-s.x,by=h/2+b.y-s.y;ctx.fillStyle='#fff36b';ctx.shadowColor='#ffb52e';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(bx,by,4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;s.foes.forEach(f=>{if(Math.hypot(f.x-b.x,f.y-b.y)<19&&f.hp>0){f.hp=0;s.score+=10;setScore(s.score)}})});s.foes=s.foes.filter(f=>f.hp>0);if(s.foes.length<12)s.foes.push({x:s.x+(Math.random()-.5)*900,y:s.y+(Math.random()-.5)*700,hp:2,phase:Math.random()*6});
  // jogador
  ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(w/2,h/2+13,15,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2b4eae';ctx.beginPath();ctx.arc(w/2,h/2,14,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f3c6a2';ctx.beginPath();ctx.arc(w/2,h/2-5,8,0,Math.PI*2);ctx.fill();const aim=Math.atan2(s.mouse.y-h/2,s.mouse.x-w/2);ctx.strokeStyle='#292c38';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(w/2,h/2);ctx.lineTo(w/2+Math.cos(aim)*24,h/2+Math.sin(aim)*24);ctx.stroke();ctx.fillStyle='rgba(12,22,35,.75)';ctx.fillRect(14,14,175,48);ctx.fillStyle='#fff';ctx.font='bold 13px system-ui';ctx.fillText('WILDLANDS · ZONA 01',24,33);ctx.font='12px system-ui';ctx.fillText(`Alvos neutralizados: ${s.score/10}`,24,51);ctx.fillStyle='rgba(12,22,35,.75)';ctx.fillRect(w-164,14,150,24);ctx.fillStyle='#3de080';ctx.fillRect(w-160,18,142*(s.health/100),16);ctx.fillStyle='#fff';ctx.font='bold 10px system-ui';ctx.fillText(`VIDA ${s.health}%`,w-155,30);if(!active){ctx.fillStyle='rgba(8,20,30,.45)';ctx.fillRect(0,0,w,h);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 28px system-ui';ctx.fillText('WILDLANDS',w/2,h/2-20);ctx.font='14px system-ui';ctx.fillText('WASD para andar · mouse para mirar · segure clique para atirar',w/2,h/2+15);ctx.textAlign='left'}if(s.health<=0){ctx.fillStyle='rgba(20,0,0,.7)';ctx.fillRect(0,0,w,h);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 28px system-ui';ctx.fillText('VOCÊ FOI ELIMINADO',w/2,h/2);ctx.font='14px system-ui';ctx.fillText('Atualize a página para recomeçar',w/2,h/2+28);ctx.textAlign='left'}raf=requestAnimationFrame(draw)};raf=requestAnimationFrame(draw);return()=>{alive=false;cancelAnimationFrame(raf)}},[active])
  return <div className="kg-game-card kg-wildlands" data-game-card><div className="kg-game-top"><div><span className="kg-kicker"><Crosshair size={14}/> OPEN WORLD / 03</span><h2>Wildlands</h2><p>Explore um mapa vivo, encontre inimigos e sobreviva. WASD para andar; mouse para mirar e atirar.</p></div><div className="kg-score"><span>ALVOS</span><strong>{score/10}</strong><small>Vida: {health}%</small><button className="kg-fullscreen" onClick={(e)=>{const el=e.currentTarget.closest('[data-game-card]') as HTMLElement|null;if(el?.requestFullscreen)void el.requestFullscreen()}}><Maximize2 size={14}/> Tela cheia</button></div></div><div className="kg-shooter-stage"><canvas ref={canvasRef}/></div><div className="kg-game-footer"><span>W A S D · mouse mira · clique atira</span><button onClick={()=>{world.current.x=0;world.current.y=0;world.current.health=100;world.current.score=0;world.current.foes=Array.from({length:12},()=>({x:(Math.random()-.5)*1400,y:(Math.random()-.5)*1000,hp:2,phase:Math.random()*6}));world.current.shots=[];setScore(0);setHealth(100);setActive(false)}}><RotateCcw size={14}/> Reiniciar</button></div></div>
}

export default function GamesPanel() {
  const [game, setGame] = useState<Game>('flap')
  return <main className="app-shell kg-games-shell">
    <section className="container kg-games-container">
      <header className="kg-games-heading">
        <div><span className="kg-kicker"><Gamepad2 size={14} /> ÁREA DE LAZER</span><h1>Games <em>Arcade.</em></h1><p>Uma pausa rápida entre as tarefas.</p></div>
        <div className="kg-games-count">03 <span>JOGOS DISPONÍVEIS</span></div>
      </header>
      <div className="kg-game-tabs" role="tablist" aria-label="Selecionar jogo">
        <button role="tab" aria-selected={game === 'flap'} className={game === 'flap' ? 'active' : ''} onClick={() => setGame('flap')}><span>01</span> Flap</button>
        <button role="tab" aria-selected={game === 'snake'} className={game === 'snake' ? 'active' : ''} onClick={() => setGame('snake')}><span>02</span> Cobrinha</button>
        <button role="tab" aria-selected={game === 'wildlands'} className={game === 'wildlands' ? 'active' : ''} onClick={() => setGame('wildlands')}><span>03</span> Wildlands</button>
      </div>
      {game === 'flap' ? <FlapGame /> : game === 'snake' ? <SnakeGame /> : <WildlandsGame />}
      <p className="kg-games-note">KERN · ARCADE <span>Os jogos funcionam localmente no navegador.</span></p>
    </section>
  </main>
}
