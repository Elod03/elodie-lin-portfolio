// Bulles: pop the rising bubbles, chain the same colour for combos, grab the golden ones and never pop a spiky urchin.
import { card, circle, clamp, CONFETTI, GAME_THEMES, H, hud, motes, particles, POP, popups, shaker, TAU, W, waterLight, type Demo, type Environment, type Phase } from './common'

const THEME = GAME_THEMES.bulles
const COLORS = [POP.coral, POP.lemon, POP.mint, POP.sky, POP.lilac]
const LIGHT = ['#FFB2A6', '#FFF0A0', '#A6F2CF', '#D2F2FF', '#C9BBFF']
const DARK = ['#D9473A', '#E3A900', '#1FA872', '#3AA6D6', '#5B3FD6']
const GOLD = { base: '#FFB000', light: '#FFE58A', dark: '#D97B00' }
const URCHIN = '#3A2766', MAX = 40, FLOOR = 456
type Kind = 'color' | 'gold' | 'urchin'
interface Bubble { x: number; base: number; y: number; r: number; color: number; kind: Kind; speed: number; phase: number; wobble: number; alive: boolean; free: boolean }

export function bubbles(env: Environment): Demo {
  const { ctx, pointer, random } = env
  const bits = particles(random), pops = popups(), shake = shaker(env), drift = motes(env, 70)
  const pool: Bubble[] = Array.from({ length: MAX }, () => ({ x: 0, base: 0, y: 0, r: 0, color: 0, kind: 'color' as Kind, speed: 0, phase: 0, wobble: 0, alive: false, free: false }))
  const rings = Array.from({ length: 12 }, () => ({ x: 0, y: 0, r: 0, life: 0, color: '' }))
  const water = ctx.createLinearGradient(0, 0, 0, H)
  water.addColorStop(0, '#FF94C6'); water.addColorStop(.7, '#FFBFDD'); water.addColorStop(1, '#93E8F3')
  let phase: Phase = 'ready', clock = 0, elapsed = 0, spawnClock = 0, score = 0, lives = 5, combo = 0, lastColor = -1
  let keyboard = false, lastX = pointer.x, lastY = pointer.y, ringIndex = 0

  function spawn(y?: number, calm = false) {
    const b = pool.find(p => !p.alive); if (!b) return
    const roll = random(), urchinRate = elapsed < 6 ? 0 : Math.min(.17, .07 + elapsed * .0012)
    b.kind = calm ? 'color' : roll < .045 && elapsed > 4 ? 'gold' : roll > 1 - urchinRate ? 'urchin' : 'color'
    b.color = Math.floor(random() * COLORS.length)
    b.r = b.kind === 'color' ? 26 + random() * 14 : b.kind === 'gold' ? 27 : 27 + random() * 5
    b.base = 60 + random() * (W - 120); b.phase = random() * TAU; b.wobble = 8 + random() * 16
    // Rising speed ramps up with time; the first ~10 s stay slow.
    b.speed = Math.min(180, 44 + elapsed * 1.15) * (.8 + random() * .4) * (b.kind === 'gold' ? 1.35 : 1)
    b.y = y ?? H + b.r; b.x = b.base; b.alive = true; b.free = calm
  }
  function reset() {
    for (const b of pool) b.alive = false
    score = 0; lives = 5; combo = 0; lastColor = -1; elapsed = 0; spawnClock = .6
    bits.clear(); pops.clear(); for (const r of rings) r.life = 0
    for (let i = 0; i < 7; i++) spawn(130 + i * 50 + random() * 20, true) // a full scene from the first frame; these never cost a life
  }
  reset()

  function ring(x: number, y: number, r: number, color: string) { const g = rings[ringIndex]; ringIndex = (ringIndex + 1) % rings.length; g.x = x; g.y = y; g.r = r; g.life = 1; g.color = color }
  function loseLife(x: number, y: number) {
    lives--; combo = 0; shake.kick(lives > 0 ? 4 : 6)
    if (lives <= 0) { phase = 'over'; bits.splash(x, y, 30, POP.white, 300) }
  }
  function update(dt: number) {
    clock += dt; bits.update(dt); pops.update(dt)
    for (const g of rings) if (g.life > 0) { g.life -= dt * 2.6; g.r += dt * 110 }
    if (phase === 'play') elapsed += dt
    spawnClock -= dt
    if (spawnClock <= 0) { spawn(); spawnClock = phase === 'play' ? Math.max(.28, .85 - elapsed * .009) : 1.1 }
    for (const b of pool) {
      if (!b.alive) continue
      b.y -= b.speed * dt; b.x = b.base + Math.sin(clock * 1.7 + b.phase) * b.wobble
      if (b.y > -b.r) continue
      b.alive = false
      if (phase === 'play' && b.kind === 'color' && !b.free) { bits.splash(b.x, 22, 14, COLORS[b.color], 160); loseLife(b.x, 22) }
    }
  }
  // The bubble under the pointer: the closest edge wins, with a generous margin for keyboard players.
  function pick() {
    const slack = keyboard ? 32 : 10
    let best: Bubble | undefined, bestGap = slack
    for (const b of pool) { if (!b.alive) continue; const gap = Math.hypot(b.x - pointer.x, b.y - pointer.y) - b.r; if (gap < bestGap) { bestGap = gap; best = b } }
    return best
  }
  function pop() {
    const b = pick()
    if (!b) { ring(pointer.x, pointer.y, 8, POP.white); return }
    b.alive = false; ring(b.x, b.y, b.r, POP.white)
    if (b.kind === 'urchin') {
      bits.splash(b.x, b.y, 22, URCHIN, 260); lastColor = -1; loseLife(b.x, b.y); return
    }
    if (b.kind === 'gold') {
      score += 500; bits.confetti(b.x, b.y, 46, [GOLD.base, GOLD.light, POP.white, POP.lemon], 300)
      pops.add(b.x, Math.max(110, b.y - 10), '+500', GOLD.dark, 38); shake.kick(2); return
    }
    combo = b.color === lastColor ? combo + 1 : 1; lastColor = b.color
    const points = 50 * combo; score += points
    bits.splash(b.x, b.y, 14 + combo * 2, COLORS[b.color], 210)
    if (combo >= 3) bits.confetti(b.x, b.y, 6 + combo * 2, CONFETTI, 200)
    const y = Math.max(140, b.y - 8) // keep popups clear of the HUD
    pops.add(b.x, y, `+${points}`, THEME.b, 30)
    if (combo > 1) pops.add(b.x, y - 34, `${env.labels.combo} x${combo}`, DARK[b.color], 24)
  }

  // ---------- drawing ----------
  function scene(time: number) {
    ctx.fillStyle = water; ctx.fillRect(0, 0, W, H)
    waterLight(ctx, time, 'rgba(255,255,255,.15)')
    drift(time)
    ctx.fillStyle = POP.lagoon; ctx.fillRect(0, FLOOR - 4, W, H - FLOOR + 4) // mosaic pool floor
    const tiles = [POP.water, POP.sky, POP.lagoon, POP.foam, POP.water]
    for (let row = 0; row < 2; row++) for (let i = 0; i < W / 22; i++) { ctx.fillStyle = tiles[(i * 7 + row * 3 + (i >> 2)) % 5]; ctx.fillRect(i * 22 + 1, FLOOR + row * 22 + 1, 20, 20) }
  }
  function gloss(x: number, y: number, r: number, base: string, light: string, dark: string) {
    ctx.fillStyle = dark; circle(ctx, x + 3, y + 4, r)
    ctx.fillStyle = base; circle(ctx, x, y, r)
    ctx.strokeStyle = light; ctx.lineWidth = r * .2; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.arc(x, y, r * .7, Math.PI * .1, Math.PI * .62); ctx.stroke(); ctx.lineCap = 'butt'
    ctx.fillStyle = POP.white; ctx.beginPath(); ctx.ellipse(x - r * .4, y - r * .38, r * .24, r * .14, -.75, 0, TAU); ctx.fill()
    circle(ctx, x - r * .05, y - r * .62, r * .08)
  }
  function star(x: number, y: number, outer: number, inner: number, angle: number) {
    ctx.beginPath()
    for (let i = 0; i < 10; i++) { const a = angle + i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? inner : outer; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) }
    ctx.closePath(); ctx.fill()
  }
  function urchin(b: Bubble, time: number) {
    const spin = env.reduced ? b.phase : time * .8 + b.phase
    ctx.fillStyle = 'rgba(58,39,102,.35)'; circle(ctx, b.x + 3, b.y + 4, b.r)
    ctx.fillStyle = URCHIN; ctx.beginPath()
    for (let i = 0; i < 28; i++) { const a = spin + i / 28 * TAU, r = i % 2 ? b.r * .82 : b.r * 1.32; ctx.lineTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r) }
    ctx.closePath(); ctx.fill(); circle(ctx, b.x, b.y, b.r * .86)
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * .6, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke()
    for (const side of [-1, 1]) { // grumpy eyes
      const ex = b.x + side * b.r * .32, ey = b.y + b.r * .05
      ctx.fillStyle = POP.white; circle(ctx, ex, ey, b.r * .2)
      ctx.fillStyle = POP.ink; circle(ctx, ex + side * -2, ey + 2, b.r * .1)
      ctx.strokeStyle = POP.coral; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex - side * b.r * .22, ey - b.r * .32); ctx.lineTo(ex + side * b.r * .2, ey - b.r * .18); ctx.stroke()
    }
  }
  function crosshair() {
    const { x, y } = pointer, r = keyboard ? 34 : 22
    if (keyboard) { ctx.fillStyle = 'rgba(255,255,255,.16)'; circle(ctx, x, y, r) }
    ctx.strokeStyle = THEME.b; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke()
    ctx.strokeStyle = POP.white; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU)
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; ctx.moveTo(x + Math.cos(a) * (r - 8), y + Math.sin(a) * (r - 8)); ctx.lineTo(x + Math.cos(a) * (r + 8), y + Math.sin(a) * (r + 8)) }
    ctx.stroke()
    // The centre dot shows the colour being chained.
    ctx.fillStyle = THEME.b; circle(ctx, x, y, 7)
    ctx.fillStyle = lastColor >= 0 ? COLORS[lastColor] : POP.white; circle(ctx, x, y, 4.5)
  }

  return {
    score: () => score,
    interact(kind) {
      if (kind === 'move') {
        // Arrow keys move the pointer by exactly 24 px on one axis: that is how keyboard play is recognised.
        const dx = Math.abs(pointer.x - lastX), dy = Math.abs(pointer.y - lastY)
        keyboard = (dx === 24 && dy === 0) || (dy === 24 && dx === 0) || (keyboard && dx + dy === 0)
      }
      if (kind === 'down') {
        if (Math.abs(pointer.x - lastX) + Math.abs(pointer.y - lastY) > .5) keyboard = false
        if (phase === 'ready') phase = 'play'
        else if (phase === 'over') { reset(); phase = 'play' }
        else pop()
      }
      lastX = pointer.x; lastY = pointer.y
      if (env.reduced && kind !== 'up') for (let i = 0; i < 5; i++) update(1 / 30)
    },
    draw(dt, time) {
      if (dt > 0) update(dt)
      scene(time)
      shake.begin(ctx, dt)
      for (const b of pool) {
        if (!b.alive) continue
        if (b.kind === 'urchin') urchin(b, time)
        else if (b.kind === 'gold') {
          gloss(b.x, b.y, b.r, GOLD.base, GOLD.light, GOLD.dark)
          ctx.fillStyle = POP.white; star(b.x, b.y + 2, b.r * .52, b.r * .24, env.reduced ? 0 : time * 1.5)
          ctx.strokeStyle = POP.white; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 6, 0, TAU); ctx.stroke()
        } else gloss(b.x, b.y, b.r, COLORS[b.color], LIGHT[b.color], DARK[b.color])
      }
      for (const g of rings) if (g.life > 0) { ctx.strokeStyle = g.color; ctx.globalAlpha = clamp(g.life, 0, 1) * .8; ctx.lineWidth = 4 * g.life + 1; ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU); ctx.stroke() }
      ctx.globalAlpha = 1
      bits.draw(ctx); pops.draw(ctx)
      if (phase === 'play') crosshair()
      shake.end(ctx)
      hud(ctx, score, { lives, maxLives: 5, extra: combo > 1 ? `${env.labels.combo} x${combo}` : undefined })
      card(ctx, env, phase, { title: 'Bulles', score, accent: THEME.b, time })
    },
    dispose() { bits.clear(); pops.clear() },
  }
}
