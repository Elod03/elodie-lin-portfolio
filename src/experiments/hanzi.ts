// Carrelage: a pool-mosaic breakout. Bounce a beach ball off a kickboard, burst rainbow tiles, catch falling power-ups.
import { background, card, circle, clamp, FONT, GAME_THEMES, hud, particles, popups, POP, roundRect, shaker, text, TAU, waterLight, type Demo, type Environment, type Phase } from './common'

interface Tile { x: number; y: number; hp: number; max: number; row: number }
interface Ball { x: number; y: number; vx: number; vy: number; stuck: boolean; spin: number }
type Power = 'wide' | 'multi' | 'slow'
interface Capsule { x: number; y: number; kind: Power }

// '1' = one hit, '2' = two hits, '.' = empty. Ten columns; one colour per row.
const LAYOUTS = [
  ['1111111111', '1111111111', '1111111111', '1111111111', '1111111111'],
  ['....22....', '...2112...', '..211112..', '.21111112.', '2111111112', '.11111111.'],
  ['2.2.2.2.2.', '.1.1.1.1.1', '1.1.1.1.1.', '.2.2.2.2.2', '1111111111', '2222222222'],
  ['.22....22.', '2112..2112', '1111111111', '.11111111.', '..111111..', '...1221...', '....11....'],
]
const ROW = ['#FF6B57', '#FF9F1C', '#FFD43B', '#3DDC97', '#3B82F6', '#8B6CFF', '#FF6FA3']
const DARK = ['#D9483A', '#D97B00', '#E0A800', '#22AE72', '#2563D9', '#6446E0', '#D94A80']
const LIGHT = ['#FFA899', '#FFC979', '#FFEA94', '#94EEC6', '#93BBFF', '#BCA9FF', '#FFB0CC']
const POWERS: Power[] = ['wide', 'multi', 'slow']
const CAPSULE: Record<Power, [string, string]> = { wide: ['#3DDC97', '#22AE72'], multi: ['#FF6FA3', '#D94A80'], slow: ['#8B6CFF', '#6446E0'] }
const BALL = [POP.coral, POP.white, POP.lemon, POP.white, '#2F9BFF', POP.white]
const TW = 64, TH = 26, X0 = 44, Y0 = 100, LEFT = 24, RIGHT = 776, TOP = 80, PY = 446, R = 11

export function hanzi(env: Environment): Demo {
  const { ctx, pointer, random } = env, theme = GAME_THEMES.hanzi
  const fx = particles(random), pops = popups(), shake = shaker(env)
  const tiles: Tile[] = [], balls: Ball[] = [], capsules: Capsule[] = []
  let phase: Phase = 'ready', time = 0, score = 0, lives = 3, level = 1, chain = 0, lastX = pointer.x
  let px = 400, pw = 124, wide = 0, slow = 0, clearing = 0, flash = 0, squash = 0

  const speed = () => Math.min(520, 330 + (level - 1) * 32)
  function board() {
    tiles.length = 0
    LAYOUTS[(level - 1) % LAYOUTS.length].forEach((line, row) => {
      for (let col = 0; col < 10; col++) {
        const ch = line[col]; if (ch === '.') continue
        const hp = ch === '2' || (level > 4 && row < 2) ? 2 : 1   // From level 5 the top rows get tougher.
        tiles.push({ x: X0 + col * 72, y: Y0 + row * 32, hp, max: hp, row })
      }
    })
  }
  function serve() { balls.length = 0; balls.push({ x: px, y: PY - R - 1, vx: 0, vy: 0, stuck: true, spin: 0 }); chain = 0 }
  function launch() {
    for (const b of balls) if (b.stuck) { const a = (random() - .5) * .7, v = speed(); b.vx = Math.sin(a) * v; b.vy = -Math.cos(a) * v; b.stuck = false }
  }
  function reset() { score = 0; lives = 3; level = 1; wide = 0; slow = 0; clearing = 0; capsules.length = 0; fx.clear(); pops.clear(); board(); serve() }
  reset()

  function breakTile(t: Tile) {
    const cx = t.x + TW / 2, cy = t.y + TH / 2
    t.hp--
    if (t.hp > 0) { score += 10; fx.confetti(cx, cy, 8, [ROW[t.row], LIGHT[t.row]], 140); return }
    tiles.splice(tiles.indexOf(t), 1)
    chain++
    const points = 50 * Math.min(chain, 10)
    score += points; shake.kick(2)
    fx.confetti(cx, cy, 18, [ROW[t.row], LIGHT[t.row], DARK[t.row], POP.white], 230)
    pops.add(cx, cy + 8, `+${points}`, POP.ink, 24 + Math.min(chain, 6) * 2)
    if (chain === 3 || chain === 6 || chain === 10) pops.add(400, 340, `${env.labels.combo} x${chain}`, theme.b, 36)
    if (random() < .16 && capsules.length < 2) capsules.push({ x: cx, y: cy, kind: POWERS[Math.floor(random() * 3)] })
    if (!tiles.length) { // Board cleared: confetti, bonus, next layout after a short pause.
      clearing = 1.6; balls.length = 0; capsules.length = 0; score += 250 * level
      for (let i = 0; i < 5; i++) fx.confetti(120 + i * 140, 220, 60)
      pops.add(400, 370, `+${250 * level}`, theme.b, 36)
    }
  }
  /** Moves a ball by one small sub-step and resolves walls, paddle and tiles. */
  function step(b: Ball, h: number) {
    const ox = b.x, oy = b.y
    b.x += b.vx * h; b.y += b.vy * h
    if (b.x < LEFT + R) { b.x = LEFT + R; b.vx = Math.abs(b.vx) }
    if (b.x > RIGHT - R) { b.x = RIGHT - R; b.vx = -Math.abs(b.vx) }
    if (b.y < TOP + R) { b.y = TOP + R; b.vy = Math.abs(b.vy) }
    // Paddle: the bounce angle depends on where the ball lands (up to ~63° from vertical at the ends).
    if (b.vy > 0 && b.y + R >= PY && oy + R <= PY + 8 && Math.abs(b.x - px) <= pw / 2 + R) {
      const off = clamp((b.x - px) / (pw / 2), -1, 1), v = Math.min(Math.hypot(b.vx, b.vy) + 4, speed() + 60)
      b.vx = Math.sin(off * 1.1) * v; b.vy = -Math.cos(off * 1.1) * v; b.y = PY - R
      chain = 0; squash = 1; fx.splash(b.x, PY, 6, POP.white, 120)
      return
    }
    for (const t of tiles) {
      const nx = clamp(b.x, t.x, t.x + TW), ny = clamp(b.y, t.y, t.y + TH)
      if ((b.x - nx) ** 2 + (b.y - ny) ** 2 > R * R) continue
      // Came from the side → horizontal bounce, otherwise vertical.
      if (ox < t.x || ox > t.x + TW) b.vx = (ox < t.x ? -1 : 1) * Math.abs(b.vx)
      else b.vy = (oy < t.y ? -1 : 1) * Math.abs(b.vy)
      b.x = ox; b.y = oy; breakTile(t)
      return
    }
  }
  function catchPower(c: Capsule) {
    const [color] = CAPSULE[c.kind]
    score += 50; fx.confetti(c.x, PY - 10, 28, [color, POP.white, POP.lemon], 220)
    if (c.kind === 'wide') wide = 12
    else if (c.kind === 'slow') slow = 9
    else {
      const from = balls.find(b => !b.stuck) ?? balls[0]
      if (from) for (const a of [-.5, .5]) if (balls.length < 7) {
        const v = Math.max(speed(), Math.hypot(from.vx, from.vy)), base = from.stuck ? 0 : Math.atan2(from.vx, -from.vy)
        balls.push({ x: from.stuck ? px : from.x, y: from.stuck ? PY - R - 1 : from.y, vx: Math.sin(base + a) * v, vy: -Math.abs(Math.cos(base + a) * v), stuck: false, spin: 0 })
      }
    }
  }

  function update(dt: number) {
    time += dt; fx.update(dt); pops.update(dt)
    flash = Math.max(0, flash - dt * 4); squash = Math.max(0, squash - dt * 5)
    wide = Math.max(0, wide - dt); slow = Math.max(0, slow - dt)
    pw += ((wide > 0 ? 190 : 124) - pw) * Math.min(1, dt * 10)
    px += (clamp(pointer.x, LEFT + pw / 2, RIGHT - pw / 2) - px) * Math.min(1, dt * 20)
    for (const b of balls) if (b.stuck) { b.x = px; b.y = PY - R - 1 }
    if (phase !== 'play') return
    if (clearing > 0) { clearing -= dt; if (clearing <= 0) { level++; board(); serve() } return }
    const k = slow > 0 ? .62 : 1
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i]; if (b.stuck) continue
      b.spin += dt * b.vx * .02
      const n = Math.ceil(Math.hypot(b.vx, b.vy) * k * dt / 6)   // Sub-steps of at most 6 px: no tunnelling.
      for (let s = 0; s < n && clearing <= 0; s++) step(b, dt * k / n)
      if (clearing > 0) break
      if (b.y > 520) { balls.splice(i, 1); fx.splash(b.x, 490, 24, POP.foam, 300) }
    }
    if (clearing > 0) return
    if (!balls.length) {
      lives--; shake.kick(6); flash = env.reduced ? 0 : .14; wide = 0; slow = 0; capsules.length = 0
      if (lives <= 0) phase = 'over'; else serve()
    }
    for (let i = capsules.length - 1; i >= 0; i--) {
      const c = capsules[i]; c.y += dt * 150
      if (c.y + 12 >= PY && c.y - 12 <= PY + 20 && Math.abs(c.x - px) < pw / 2 + 24) { catchPower(c); capsules.splice(i, 1) }
      else if (c.y > 520) capsules.splice(i, 1)
    }
  }

  // ---- drawing ----
  function scene() {
    background(ctx, '#86E8F8', '#2CCBE8')
    // Pool-floor tiles as a soft checker, then moving light bands.
    ctx.fillStyle = 'rgba(255,255,255,.08)'
    for (let y = TOP, r = 0; y < 500; y += 36, r++) for (let x = LEFT + (r % 2) * 36; x < RIGHT; x += 72) ctx.fillRect(x, y, 36, 36)
    ctx.fillStyle = 'rgba(11,110,153,.13)'; ctx.fillRect(392, TOP + 30, 16, 400); ctx.fillRect(360, TOP + 30, 80, 14)
    waterLight(ctx, time, 'rgba(255,255,255,.15)', TOP, 500)
    // Deck and coral/ivory coping around the pool.
    ctx.fillStyle = '#FFD7BC'; ctx.fillRect(0, 0, 800, TOP - 12)
    for (let x = 0, i = 0; x < 800; x += 40, i++) { ctx.fillStyle = i % 2 ? POP.ivory : theme.a; ctx.fillRect(x, TOP - 14, 40, 14) }
    for (let y = TOP, i = 0; y < 500; y += 40, i++) {
      ctx.fillStyle = i % 2 ? theme.a : POP.ivory; ctx.fillRect(0, y, LEFT, 40); ctx.fillStyle = i % 2 ? POP.ivory : theme.a; ctx.fillRect(RIGHT, y, LEFT, 40)
    }
    ctx.fillStyle = 'rgba(11,110,153,.22)'; ctx.fillRect(LEFT, TOP, RIGHT - LEFT, 5); ctx.fillRect(LEFT, TOP, 5, 420); ctx.fillRect(RIGHT - 5, TOP, 5, 420)
  }
  function tile(t: Tile) {
    const r = t.row
    ctx.fillStyle = 'rgba(8,63,94,.22)'; roundRect(ctx, t.x + 3, t.y + 5, TW, TH, 7)
    ctx.fillStyle = DARK[r]; roundRect(ctx, t.x, t.y, TW, TH, 7)
    ctx.fillStyle = ROW[r]; roundRect(ctx, t.x, t.y, TW, TH - 5, 7)
    ctx.fillStyle = LIGHT[r]; roundRect(ctx, t.x + 5, t.y + 3, TW - 10, 4, 2)
    if (t.max === 2) { // Tough tiles: a small mosaic of four, cracked once hit.
      ctx.fillStyle = DARK[r]; for (let i = 0; i < 4; i++) roundRect(ctx, t.x + 6 + i * 13.5, t.y + 9, 11, 8, 2)
      if (t.hp === 1) { ctx.strokeStyle = 'rgba(16,50,74,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(t.x + 20, t.y + 2); ctx.lineTo(t.x + 30, t.y + 12); ctx.lineTo(t.x + 26, t.y + 16); ctx.lineTo(t.x + 38, t.y + TH - 4); ctx.stroke() }
    } else { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(t.x + 8, t.y + 10, 7, 4) }
  }
  function beachBall(x: number, y: number, spin: number) {
    ctx.fillStyle = 'rgba(8,63,94,.22)'; circle(ctx, x + 4, y + 7, R)
    for (let i = 0; i < 6; i++) { ctx.fillStyle = BALL[i]; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, R, spin + i * TAU / 6, spin + (i + 1) * TAU / 6); ctx.closePath(); ctx.fill() }
    ctx.fillStyle = 'rgba(255,255,255,.8)'; circle(ctx, x - 3.5, y - 4, 2.6)
  }
  function capsule(x: number, y: number, kind: Power, size = 1) {
    const [color, dark] = CAPSULE[kind]
    ctx.save(); ctx.translate(x, y); ctx.scale(size, size); ctx.rotate(Math.sin(time * 5 + x) * .12)
    ctx.fillStyle = 'rgba(8,63,94,.22)'; roundRect(ctx, -22, -9, 50, 26, 13)
    ctx.fillStyle = dark; roundRect(ctx, -25, -13, 50, 26, 13)
    ctx.fillStyle = color; roundRect(ctx, -25, -13, 50, 22, 11)
    ctx.fillStyle = 'rgba(255,255,255,.45)'; roundRect(ctx, -17, -10, 34, 4, 2)
    ctx.fillStyle = POP.white; ctx.beginPath()
    if (kind === 'wide') { ctx.fillRect(-9, -4, 18, 4); ctx.moveTo(-15, -2); ctx.lineTo(-8, -9); ctx.lineTo(-8, 5); ctx.moveTo(15, -2); ctx.lineTo(8, -9); ctx.lineTo(8, 5) }
    else if (kind === 'slow') { ctx.moveTo(-7, -9); ctx.lineTo(7, -9); ctx.lineTo(0, -2); ctx.lineTo(7, 5); ctx.lineTo(-7, 5); ctx.lineTo(0, -2) }
    else { ctx.arc(-10, -2, 4, 0, TAU); ctx.moveTo(4, -2); ctx.arc(0, -2, 4, 0, TAU); ctx.moveTo(14, -2); ctx.arc(10, -2, 4, 0, TAU) }
    ctx.fill(); ctx.restore()
  }
  function kickboard() {
    const h = 23 - squash * 5, y = PY + squash * 4, x = px - pw / 2
    ctx.fillStyle = 'rgba(8,63,94,.25)'; roundRect(ctx, x + 4, y + 8, pw, h, 10)
    ctx.fillStyle = theme.b; roundRect(ctx, x, y, pw, h, 10)
    ctx.fillStyle = theme.a; roundRect(ctx, x, y, pw, h - 5, 10)
    ctx.fillStyle = POP.white; roundRect(ctx, x + 14, y + 6, pw - 28, 3, 1.5)
    ctx.fillStyle = 'rgba(255,255,255,.55)'; roundRect(ctx, x + 10, y + 2, pw * .35, 2, 1)
  }
  function badge(label: string, x: number, color: string, dark: string) {
    ctx.font = `800 20px ${FONT}`; const w = ctx.measureText(label).width + 36
    ctx.fillStyle = dark; roundRect(ctx, x - w / 2, 23, w, 40, 20); ctx.fillStyle = color; roundRect(ctx, x - w / 2, 19, w, 40, 20)
    text(ctx, label, x, 46, { size: 20, weight: 800, color: POP.ink, align: 'center' })
  }

  return {
    score: () => score,
    interact(kind) {
      if (kind === 'move') {
        // Arrow keys move the pointer by exactly 24: stretch it to 64 so the keyboard keeps up with the ball.
        const dx = pointer.x - lastX
        if (Math.abs(Math.abs(dx) - 24) < .01) pointer.x = clamp(lastX + Math.sign(dx) * 64, 0, 800)
        lastX = pointer.x
      }
      if (kind === 'down') {
        if (phase === 'ready') { phase = 'play'; launch() }
        else if (phase === 'over') { reset(); phase = 'play'; launch() }
        else launch()
      }
      if (env.reduced && kind !== 'up') for (let i = 0; i < 5; i++) update(1 / 30)
    },
    draw(dt) {
      if (dt > 0) update(dt)
      shake.begin(ctx, dt)
      scene()
      for (const t of tiles) tile(t)
      for (const c of capsules) capsule(c.x, c.y, c.kind)
      kickboard()
      for (const b of balls) {
        if (b.stuck && phase !== 'over') for (let i = 1; i <= 4; i++) { ctx.fillStyle = `rgba(255,255,255,${.75 - i * .14})`; circle(ctx, b.x, b.y - 14 - i * 16 + (env.reduced ? 0 : Math.sin(time * 6) * 2), 3.5) }
        beachBall(b.x, b.y, b.spin)
      }
      fx.draw(ctx); pops.draw(ctx)
      if (clearing > 0) {
        const label = `${env.labels.level} ${level + 1}`; ctx.font = `800 40px ${FONT}`; const w = ctx.measureText(label).width + 70
        ctx.fillStyle = 'rgba(16,50,74,.2)'; roundRect(ctx, 400 - w / 2, 214, w, 72, 36); ctx.fillStyle = POP.ivory; roundRect(ctx, 400 - w / 2, 208, w, 72, 36)
        text(ctx, label, 400, 258, { size: 40, weight: 800, color: theme.b, align: 'center' })
      }
      shake.end(ctx)
      if (flash > 0) { ctx.fillStyle = `rgba(255,107,87,${flash})`; ctx.fillRect(0, 0, 800, 500) }
      hud(ctx, score, { lives, extra: `${env.labels.level} ${level}` })
      if (phase === 'play' && chain > 1) badge(`${env.labels.combo} x${Math.min(chain, 10)}`, 400, POP.lemon, '#E0A800')
      // Active power-ups with their remaining time.
      let cx = 540
      for (const [kind, left, total] of [['wide', wide, 12], ['slow', slow, 9]] as const) {
        if (left <= 0) continue
        capsule(cx, 36, kind, .9)
        ctx.fillStyle = 'rgba(255,248,238,.9)'; roundRect(ctx, cx - 22, 54, 44, 5, 2.5); ctx.fillStyle = CAPSULE[kind][1]; roundRect(ctx, cx - 22, 54, 44 * left / total, 5, 2.5)
        cx += 64
      }
      card(ctx, env, phase, { title: 'Carrelage', score, accent: theme.b, time })
    },
  }
}
