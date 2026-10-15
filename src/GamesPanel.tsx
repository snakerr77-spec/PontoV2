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

const START_SNAKE: Point[] = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }]
const DIRECTIONS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
}
type Point = { x: number; y: number }

function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const game = useRef({ snake: [...START_SNAKE], food: { x: 14, y: 10 }, dir: { x: 1, y: 0 }, queued: { x: 1, y: 0 }, score: 0, running: false, over: false, last: 0, accumulator: 0, blink: 0 })
  const [score, setScore] = useState(0)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [best, setBest] = useState(() => { try { return Number(localStorage.getItem('kern-snake-best') || 0) } catch { return 0 } })
  const turn = useCallback((d: Point) => {
    const g = game.current, cur = g.dir
    if (cur.x + d.x === 0 && cur.y + d.y === 0) return
    g.queued = d
    if (!g.running && !g.over) { g.running = true; setRunning(true) }
  }, [])
  const restart = useCallback(() => {
    const g = game.current
    Object.assign(g, { snake: [...START_SNAKE], food: { x: 14, y: 10 }, dir: { x: 1, y: 0 }, queued: { x: 1, y: 0 }, score: 0, running: false, over: false, last: 0, accumulator: 0 })
    setScore(0); setRunning(false); setOver(false)
  }, [])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const d = DIRECTIONS[e.key.length === 1 ? e.key.toLowerCase() : e.key]
      if (d) { e.preventDefault(); turn(d) }
      if (e.code === 'Space' && game.current.over) { e.preventDefault(); restart() }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [turn, restart])
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let raf = 0, alive = true
    const rounded = (x:number,y:number,w:number,h:number,r:number) => { ctx.beginPath(); ctx.roundRect(x,y,w,h,r) }
    const draw = (now:number) => {
      if (!alive) return
      const g = game.current, w = canvas.clientWidth || 560, h = canvas.clientHeight || 560, dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)) { canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr) }
      ctx.setTransform(dpr,0,0,dpr,0,0)
      const cell = Math.min(w,h)/20, ox=(w-cell*20)/2, oy=(h-cell*20)/2
      const bg=ctx.createLinearGradient(0,0,w,h); bg.addColorStop(0,'#102c38'); bg.addColorStop(1,'#091923');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h)
      // neon garden board
      ctx.shadowColor='rgba(41,244,172,.16)';ctx.shadowBlur=28;rounded(ox-8,oy-8,cell*20+16,cell*20+16,22);ctx.fillStyle='#142f39';ctx.fill();ctx.shadowBlur=0
      rounded(ox,oy,cell*20,cell*20,15);ctx.fillStyle='#183a3e';ctx.fill()
      for(let y=0;y<20;y++)for(let x=0;x<20;x++){if((x+y)%2===0){rounded(ox+x*cell+1,oy+y*cell+1,cell-2,cell-2,4);ctx.fillStyle='rgba(116,202,151,.045)';ctx.fill()}}
      if(g.running&&!g.over){const dt=g.last?Math.min(now-g.last,80):0;g.accumulator+=dt;while(g.accumulator>=118){g.accumulator-=118;g.dir=g.queued;const head={x:(g.snake[0].x+g.dir.x+20)%20,y:(g.snake[0].y+g.dir.y+20)%20};const ate=head.x===g.food.x&&head.y===g.food.y;const body=ate?g.snake:g.snake.slice(0,-1);if(body.some(p=>p.x===head.x&&p.y===head.y)){g.over=true;g.running=false;setOver(true);setRunning(false);break}g.snake=[head,...g.snake];if(!ate)g.snake.pop();else{g.score+=10;setScore(g.score);if(g.score>best){setBest(g.score);try{localStorage.setItem('kern-snake-best',String(g.score))}catch{}}let f:Point;do{f={x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)}}while(g.snake.some(p=>p.x===f.x&&p.y===f.y));g.food=f}}}g.last=now
      // glowing berry with leaves
      const fx=ox+(g.food.x+.5)*cell,fy=oy+(g.food.y+.5)*cell;ctx.save();ctx.translate(fx,fy);ctx.rotate(Math.sin(now/260)*.12);ctx.shadowColor='#ff5b92';ctx.shadowBlur=17;ctx.fillStyle='#ff4f83';ctx.beginPath();ctx.arc(0,2,cell*.31,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#ffb0c7';ctx.beginPath();ctx.arc(-cell*.1,0,cell*.09,0,Math.PI*2);ctx.fill();ctx.fillStyle='#74f7a0';ctx.beginPath();ctx.ellipse(cell*.08,-cell*.31,cell*.17,cell*.08,-.5,0,Math.PI*2);ctx.fill();ctx.restore()
      // segmented emerald snake, with shaded rounded scales
      g.snake.forEach((p,i)=>{const x=ox+p.x*cell,y=oy+p.y*cell,pad=cell*.075;const grad=ctx.createLinearGradient(x,y,x+cell,y+cell);if(i===0){grad.addColorStop(0,'#c0ff9b');grad.addColorStop(.45,'#5bf59b');grad.addColorStop(1,'#12b978')}else{grad.addColorStop(0,'#74f5a0');grad.addColorStop(1,'#13a878')}ctx.shadowColor=i===0?'rgba(66,255,163,.65)':'rgba(16,224,139,.24)';ctx.shadowBlur=i===0?12:5;rounded(x+pad,y+pad,cell-pad*2,cell-pad*2,cell*.29);ctx.fillStyle=grad;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='rgba(4,89,65,.55)';ctx.lineWidth=1;ctx.stroke();if(i===0){const ex= g.dir.x===1?x+cell*.7:g.dir.x===-1?x+cell*.3:x+cell*.34;const ey= g.dir.y===1?y+cell*.7:g.dir.y===-1?y+cell*.3:y+cell*.34;ctx.fillStyle='#f7fff5';ctx.beginPath();ctx.arc(ex,ey,cell*.13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#102c32';ctx.beginPath();ctx.arc(ex+g.dir.x*cell*.035,ey+g.dir.y*cell*.035,cell*.07,0,Math.PI*2);ctx.fill();const ex2=ex+(g.dir.y===0?0:cell*.27),ey2=ey+(g.dir.x===0?0:cell*.27);ctx.fillStyle='#f7fff5';ctx.beginPath();ctx.arc(ex2,ey2,cell*.12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#102c32';ctx.beginPath();ctx.arc(ex2+g.dir.x*cell*.03,ey2+g.dir.y*cell*.03,cell*.065,0,Math.PI*2);ctx.fill()}})
      if(!g.running||g.over){ctx.fillStyle='rgba(4,19,28,.65)';ctx.fillRect(ox,oy,cell*20,cell*20);ctx.textAlign='center';ctx.fillStyle='#eafff4';ctx.font='800 25px system-ui';ctx.fillText(g.over?'FIM DE JOGO':'SNAKE GARDEN',w/2,h/2-16);ctx.fillStyle='#a9d8c5';ctx.font='13px system-ui';ctx.fillText(g.over?'Espaço ou Reiniciar para jogar de novo':'Use WASD ou as setas para começar',w/2,h/2+13);ctx.textAlign='left'}
      raf=requestAnimationFrame(draw)
    }
    raf=requestAnimationFrame(draw);return()=>{alive=false;cancelAnimationFrame(raf)}
  },[best])
  return <div className="kg-game-card kg-snake-card" data-game-card><div className="kg-game-top"><div><span className="kg-kicker">ARCADE / 02 · NEON GARDEN</span><h2>Snake Garden</h2><p>Uma cobrinha de verdade: corpo segmentado, olhos, fruta brilhante e cenário neon. As bordas dão a volta no mapa.</p></div><div className="kg-score"><span>PONTUAÇÃO</span><strong>{score}</strong><small>Recorde: {best} · {over?'Fim de jogo':running?'Em movimento':'Pronto para jogar'}</small><button className="kg-fullscreen" onClick={(e)=>{const el=e.currentTarget.closest('[data-game-card]') as HTMLElement|null;if(el?.requestFullscreen)void el.requestFullscreen()}}><Maximize2 size={14}/> Tela cheia</button></div></div><div className="kg-snake-stage"><canvas ref={canvasRef} aria-label="Snake Garden. Use WASD para controlar a cobrinha."/></div><div className="kg-game-footer"><span>W A S D ou setas · bordas com loop · não morda o próprio corpo</span><button onClick={restart}><RotateCcw size={14}/> Reiniciar</button></div><div className="kg-dpad" aria-label="Controles da cobrinha"><button onClick={()=>turn(DIRECTIONS.w)} aria-label="Cima"><ArrowUp/></button><div><button onClick={()=>turn(DIRECTIONS.a)} aria-label="Esquerda"><ArrowLeft/></button><button onClick={()=>turn(DIRECTIONS.s)} aria-label="Baixo"><ArrowDown/></button><button onClick={()=>turn(DIRECTIONS.d)} aria-label="Direita"><ArrowRight/></button></div></div></div>
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
