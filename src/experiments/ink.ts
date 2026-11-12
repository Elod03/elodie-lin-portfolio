// Remous: pull a bouncing beach ball toward the pointer to grab the rubber ducks while dodging the orbiting buoys.
import { background, card, circle, clamp, GAME_THEMES, H, hud, particles, POP, popups, shaker, TAU, W, waterLight, type Demo, type Environment, type Phase } from './common'

const THEME = GAME_THEMES.encre
const BALL = 20, DUCK = 17, BUOY = 22, DUCKS = 7, TRAIL = 30, RIM = 12
const CX = 400, CY = 272
const SEGMENTS = [POP.flamingo, POP.lemon, POP.mint, POP.sky, POP.orange, THEME.a]
const RIBBON = [POP.flamingo, POP.lemon, POP.sky, THEME.a]

export function ink(env: Environment): Demo {
  const { ctx, pointer, random } = env
  const bits = particles(random), pops = popups(), shake = shaker(env)
  const ball = { x: 170, y: 270, vx: 130, vy: -70, spin: 0 }
  const trail = new Float32Array(TRAIL * 2) // ring buffer of past ball positions
  const ducks = Array.from({ length: DUCKS }, () => ({ x: 0, y: 0, phase: 0, alive: false }))
  const buoys = Array.from({ length: 6 }, () => ({ x: 0, y: 0 }))
  let phase: Phase = 'ready', clock = 0, score = 0, level = 1, lives = 3
  let invulnerable = 0, pulse = 0, pull = 0, combo = 0, comboTimer = 0, trailHead = 0, trailCount = 0

  const buoyCount = () => Math.min(6, level + 1)
  // Even buoys circle an inner orbit clockwise, odd ones an outer orbit the other way; both speed up each level.
  function placeBuoys() {
    const speed = .5 + level * .13
    for (let i = 0; i < buoyCount(); i++) {
      const outer = i % 2 === 1, slot = Math.floor(i / 2) / Math.ceil(buoyCount() / 2)
      const angle = (outer ? -1 : 1) * clock * speed * (outer ? .8 : 1) + slot * TAU + (outer ? Math.PI : 0)
      buoys[i].x = CX + Math.cos(angle) * (outer ? 255 : 135); buoys[i].y = CY + Math.sin(angle) * (outer ? 160 : 86)
    }
  }
  function placeDucks() {
    for (let i = 0; i < DUCKS; i++) {
      const angle = i / DUCKS * TAU + level * .7 + random() * .5, f = .45 + random() * .9
      ducks[i].x = clamp(CX + Math.cos(angle) * 250 * f * 1.25, 60, W - 60)
      ducks[i].y = clamp(CY + Math.sin(angle) * 150 * f * 1.25, 95, H - 50)
      ducks[i].phase = random() * TAU; ducks[i].alive = true
    }
  }
  function reset() {
    score = 0; lives = 3; level = 1; combo = 0; comboTimer = 0; clock = 0; pulse = 0
    Object.assign(ball, { x: 170, y: 270, vx: 130, vy: -70 }); trailCount = 0
    bits.clear(); pops.clear(); placeDucks(); placeBuoys(); invulnerable = 2
  }
  reset()

  function moveBall(dt: number) {
    const speed = Math.hypot(ball.vx, ball.vy) || 1, limited = clamp(speed, 90, 390)
    ball.vx *= limited / speed; ball.vy *= limited / speed
    ball.x += ball.vx * dt; ball.y += ball.vy * dt
    ball.spin += Math.sign(ball.vx || 1) * limited / BALL * dt * .6
    const minX = RIM + BALL, maxX = W - RIM - BALL, minY = RIM + BALL, maxY = H - RIM - BALL
    if (ball.x < minX || ball.x > maxX) { ball.vx *= -1; ball.x = clamp(ball.x, minX, maxX); if (limited > 170) bits.splash(ball.x, ball.y, 5, POP.white, 140) }
    if (ball.y < minY || ball.y > maxY) { ball.vy *= -1; ball.y = clamp(ball.y, minY, maxY); if (limited > 170) bits.splash(ball.x, ball.y, 5, POP.white, 140) }
    trail[trailHead * 2] = ball.x; trail[trailHead * 2 + 1] = ball.y
    trailHead = (trailHead + 1) % TRAIL; trailCount = Math.min(TRAIL, trailCount + 1)
  }
  function update(dt: number) {
    clock += dt; bits.update(dt); pops.update(dt); placeBuoys()
    const pulling = phase === 'play' && (pointer.down || pulse > 0)
    pull = clamp(pull + (pulling ? dt * 6 : -dt * 4), 0, 1)
    if (phase === 'over') return
    moveBall(dt)
    if (phase !== 'play') return
    invulnerable = Math.max(0, invulnerable - dt); pulse = Math.max(0, pulse - dt)
    comboTimer -= dt; if (comboTimer <= 0) combo = 0
    if (pulling) {
      const dx = pointer.x - ball.x, dy = pointer.y - ball.y, d = Math.max(30, Math.hypot(dx, dy)), force = 560 + Math.min(d, 320)
      ball.vx += dx / d * force * dt; ball.vy += dy / d * force * dt
      ball.vx *= 1 - dt * .5; ball.vy *= 1 - dt * .5 // a little drag so the ball can be steered, not just orbited
    }
    for (const duck of ducks) {
      if (!duck.alive || Math.hypot(duck.x - ball.x, duck.y - ball.y) > BALL + DUCK + 4) continue
      duck.alive = false; combo = comboTimer > 0 ? combo + 1 : 1; comboTimer = 1.8
      const points = 100 * combo; score += points
      const y = Math.max(140, duck.y - 28) // keep popups clear of the HUD
      pops.add(duck.x, y, `+${points}`, THEME.b, 30)
      if (combo > 1) pops.add(duck.x, y - 34, `${env.labels.combo} x${combo}`, '#E0336F', 24)
      bits.splash(duck.x, duck.y, 16, POP.lemon, 220); bits.confetti(duck.x, duck.y, 8, undefined, 160)
    }
    if (!ducks.some(d => d.alive)) {
      const bonus = 250 * level; score += bonus; level++
      bits.confetti(CX, CY - 30, 110, undefined, 380); shake.kick(3)
      pops.add(CX, CY - 20, `${env.labels.level} ${level}`, THEME.b, 48); pops.add(CX, CY + 30, `+${bonus}`, '#E0336F', 32)
      placeDucks(); invulnerable = 1.5
    }
    if (invulnerable > 0) return
    for (let i = 0; i < buoyCount(); i++) {
      const b = buoys[i], dx = ball.x - b.x, dy = ball.y - b.y, d = Math.hypot(dx, dy) || 1
      if (d > BALL + BUOY - 4) continue
      // Bounce off the buoy along the contact normal, then a short invulnerable blink.
      const nx = dx / d, ny = dy / d, dot = ball.vx * nx + ball.vy * ny
      if (dot < 0) { ball.vx -= 2 * dot * nx; ball.vy -= 2 * dot * ny }
      ball.x = b.x + nx * (BALL + BUOY); ball.y = b.y + ny * (BALL + BUOY)
      lives--; combo = 0; invulnerable = 1.6; shake.kick(6)
      bits.splash(ball.x, ball.y, 26, POP.white, 280); bits.splash(b.x, b.y, 10, POP.coral, 200)
      if (lives <= 0) { phase = 'over'; bits.splash(ball.x, ball.y, 40, POP.foam, 340) }
      break
    }
  }

  // ---------- drawing ----------
  function scene(time: number) {
    background(ctx, '#B49CFF', '#FFA3D2')
    ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 2 // mosaic floor seen through the water
    ctx.beginPath(); for (let x = 50; x < W; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, H) } for (let y = 50; y < H; y += 50) { ctx.moveTo(0, y); ctx.lineTo(W, y) } ctx.stroke()
    waterLight(ctx, time, 'rgba(255,255,255,.14)')
    ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 2; ctx.setLineDash([6, 14]) // buoy orbits
    ctx.beginPath(); ctx.ellipse(CX, CY, 135, 86, 0, 0, TAU); ctx.stroke()
    if (buoyCount() > 1) { ctx.beginPath(); ctx.ellipse(CX, CY, 255, 160, 0, 0, TAU); ctx.stroke() }
    ctx.setLineDash([])
  }
  function rim() {
    ctx.fillStyle = POP.ivory; ctx.fillRect(0, 0, W, RIM); ctx.fillRect(0, H - RIM, W, RIM); ctx.fillRect(0, 0, RIM, H); ctx.fillRect(W - RIM, 0, RIM, H)
    ctx.fillStyle = 'rgba(75,47,184,.22)'; ctx.fillRect(RIM, RIM, W - RIM * 2, 4); ctx.fillRect(RIM, RIM, 4, H - RIM * 2)
    ctx.fillStyle = 'rgba(155,123,255,.35)'
    for (let x = 40; x < W; x += 40) { ctx.fillRect(x, 0, 2, RIM); ctx.fillRect(x, H - RIM, 2, RIM) }
    for (let y = 40; y < H; y += 40) { ctx.fillRect(0, y, RIM, 2); ctx.fillRect(W - RIM, y, RIM, 2) }
  }
  function ellipse(x: number, y: number, rx: number, ry: number, rotation = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rotation, 0, TAU); ctx.fill() }
  function duck(x: number, y: number, s: number, flip: boolean) {
    ctx.fillStyle = 'rgba(75,47,184,.22)'; ellipse(x + 3, y + s * .7, s * 1.4, s * .4)
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1)
    ctx.fillStyle = POP.lemon; ellipse(0, 0, s * 1.2, s * .78)
    ctx.beginPath(); ctx.moveTo(-s * .9, -s * .2); ctx.lineTo(-s * 1.45, -s * .75); ctx.lineTo(-s * .55, -s * .5); ctx.fill()
    circle(ctx, s * .55, -s * .78, s * .55)
    ctx.fillStyle = '#F2A900'; ellipse(-s * .15, -s * .02, s * .58, s * .32, -.25)
    ctx.fillStyle = POP.orange; ellipse(s * 1.15, -s * .64, s * .4, s * .17)
    ctx.fillStyle = POP.ink; circle(ctx, s * .72, -s * .9, s * .1)
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ellipse(s * .38, -s * 1.02, s * .17, s * .1, -.5)
    ctx.restore()
  }
  function buoy(x: number, y: number, angle: number) {
    ctx.fillStyle = 'rgba(75,47,184,.25)'; ctx.beginPath(); ctx.arc(x + 4, y + 6, BUOY, 0, TAU); ctx.arc(x + 4, y + 6, BUOY * .45, 0, TAU, true); ctx.fill()
    for (let i = 0; i < 8; i++) {
      const a0 = angle + i / 8 * TAU, a1 = a0 + TAU / 8
      ctx.fillStyle = i % 2 ? POP.white : POP.coral
      ctx.beginPath(); ctx.arc(x, y, BUOY, a0, a1); ctx.arc(x, y, BUOY * .45, a1, a0, true); ctx.closePath(); ctx.fill()
    }
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, BUOY * .74, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke()
  }
  function beachBall(x: number, y: number, r: number, angle: number) {
    ctx.fillStyle = 'rgba(75,47,184,.28)'; ellipse(x + 6, y + 9, r, r * .86)
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = SEGMENTS[i]; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, angle + i / 6 * TAU, angle + (i + 1) / 6 * TAU); ctx.closePath(); ctx.fill()
    }
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip() // shaded crescent bottom-right
    ctx.fillStyle = 'rgba(16,50,74,.18)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.arc(x - r * .3, y - r * .3, r * 1.05, 0, TAU, true); ctx.fill('evenodd'); ctx.restore()
    ctx.fillStyle = POP.white; circle(ctx, x, y, r * .2)
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = r * .15; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.arc(x, y, r * .66, Math.PI * 1.08, Math.PI * 1.42); ctx.stroke(); ctx.lineCap = 'butt'
  }
  function ribbon() {
    ctx.lineCap = 'round'
    for (let j = 1; j < trailCount; j++) {
      const a = (trailHead - trailCount + j - 1 + TRAIL) % TRAIL, b = (a + 1) % TRAIL, t = j / trailCount
      ctx.strokeStyle = RIBBON[Math.floor((1 - t) * 4 + trailHead / 6) % 4]; ctx.globalAlpha = t * .8; ctx.lineWidth = 3 + t * BALL * 1.1
      ctx.beginPath(); ctx.moveTo(trail[a * 2], trail[a * 2 + 1]); ctx.lineTo(trail[b * 2], trail[b * 2 + 1]); ctx.stroke()
    }
    ctx.globalAlpha = 1; ctx.lineCap = 'butt'
  }
  function whirlpool(time: number) {
    const { x, y } = pointer
    if (pull > .02) {
      ctx.fillStyle = `rgba(75,47,184,${.14 * pull})`; ellipse(x, y, 74, 60)
      ctx.lineCap = 'round'; ctx.lineWidth = 4
      for (let k = 0; k < 3; k++) { // rings that spiral inward toward the pointer
        const r = 96 - ((k * 30 + (env.reduced ? 0 : time * 44)) % 90), spin = (env.reduced ? 0 : time * 3.5) + k * 2.1
        ctx.strokeStyle = `rgba(255,255,255,${pull * .75 * clamp(r / 60, .2, 1)})`
        ctx.beginPath(); ctx.ellipse(x, y, r, r * .8, 0, spin, spin + 1.8); ctx.stroke()
        ctx.beginPath(); ctx.ellipse(x, y, r, r * .8, 0, spin + Math.PI, spin + Math.PI + 1.8); ctx.stroke()
      }
      ctx.lineCap = 'butt'
      ctx.strokeStyle = `rgba(255,255,255,${.55 * pull})`; ctx.lineWidth = 2.5; ctx.setLineDash([4, 10])
      ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([])
    }
    // Target ring: always visible so keyboard players see where they pull.
    const r = 17 + pull * 5
    ctx.strokeStyle = THEME.b; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke()
    ctx.strokeStyle = POP.white; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU)
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.moveTo(x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4)); ctx.lineTo(x + Math.cos(a) * (r + 11), y + Math.sin(a) * (r + 11)) }
    ctx.stroke(); ctx.fillStyle = THEME.b; circle(ctx, x, y, 4)
  }

  return {
    score: () => score,
    interact(kind) {
      if (kind === 'down') {
        if (phase === 'ready') { phase = 'play'; invulnerable = 2 }
        else if (phase === 'over') { reset(); phase = 'play' }
        else pulse = .45 // a keyboard Enter is one attraction pulse; a held mouse keeps pulling
      }
      if (env.reduced && kind !== 'up') for (let i = 0; i < 5; i++) update(1 / 30)
    },
    draw(dt, time) {
      if (dt > 0) update(dt)
      scene(time)
      shake.begin(ctx, dt)
      for (const d of ducks) if (d.alive) duck(d.x, d.y + Math.sin(time * 2.2 + d.phase) * 3, DUCK, d.x > ball.x)
      for (let i = 0; i < buoyCount(); i++) buoy(buoys[i].x, buoys[i].y, clock * .8 + i)
      if (phase === 'play') whirlpool(time)
      ribbon()
      const blink = invulnerable > 0 && phase === 'play' && Math.floor(clock * 8) % 2 === 1
      if (blink) ctx.globalAlpha = .45
      beachBall(ball.x, ball.y, BALL, ball.spin); ctx.globalAlpha = 1
      bits.draw(ctx); pops.draw(ctx)
      shake.end(ctx)
      rim()
      hud(ctx, score, { lives, maxLives: 3, extra: `${env.labels.level} ${level}` })
      card(ctx, env, phase, { title: 'Remous', score, accent: THEME.b, time })
    },
    dispose() { bits.clear(); pops.clear() },
  }
}
