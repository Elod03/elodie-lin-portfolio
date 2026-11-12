// Ricochet: skip a flat pebble across a lake at golden hour — aim with the pointer height, throw at the right power, 5 pebbles.
import { card, circle, clamp, CONFETTI, FONT, GAME_THEMES, H, hud, lerp, particles, popups, POP, roundRect, shaker, TAU, text, W, waterLight, type Demo, type Environment, type Phase } from './common'

const THEME = GAME_THEMES['chambre-noire']
const HORIZON = 250, SURFACE = 340, DECK = 322   // far horizon, skipping line, top of the pool edge
const SHOULDER_X = 84, SHOULDER_Y = 268, ARM = 22
const PX_PER_M = 16, PEBBLES = 5, GRAVITY = 600
const SKIP_ANGLE = .46                             // impact steeper than ~26° sinks
const RING_COLORS = [POP.flamingo, POP.lemon, POP.mint, POP.lilac, POP.sky]
const TRAIL = 240

type Stage = 'aim' | 'fly' | 'rest'

export function darkroom(env: Environment): Demo {
  const { ctx, pointer, random } = env
  const fx = particles(random), pops = popups(), shake = shaker(env)
  const stone = { x: 0, y: 0, vx: 0, vy: 0, spin: 0, skips: 0, alive: false }
  const rings: { x: number; color: string; hit: number }[] = []
  const ripples = Array.from({ length: 30 }, () => ({ x: 0, life: 0, size: 1 }))
  const trail = new Float32Array(TRAIL * 2)
  const ducks = Array.from({ length: 4 }, (_, i) => ({ x: 260 + i * 520 + random() * 200, y: 440 + random() * 34, phase: random() * TAU }))
  const hills = Array.from({ length: 9 }, (_, i) => ({ x: i * 230 + random() * 80, w: 160 + random() * 160, h: 26 + random() * 34, palm: random() > .45 }))
  let phase: Phase = 'ready', stage: Stage = 'aim'
  let score = 0, thrown = 0, gauge = 0, clock = 0, camX = 0, rest = 0, swing = 0, rippleIndex = 0, trailCount = 0

  const aim = () => clamp(lerp(.8, -.3, pointer.y / H), -.3, .8)
  const power = () => (1 - Math.cos(gauge * TAU / (1.7 - thrown * .1))) / 2   // speeds up a little each pebble
  const hand = () => { const a = stage === 'aim' ? aim() : -.5 + swing; return { x: SHOULDER_X + Math.cos(a) * ARM, y: SHOULDER_Y - Math.sin(a) * ARM } }
  const metres = (x: number) => Math.max(0, Math.round((x - SHOULDER_X) / PX_PER_M))

  function placeRings() {
    rings.length = 0
    for (const [from, to] of [[14, 26], [32, 46], [52, 70]]) rings.push({ x: SHOULDER_X + (from + random() * (to - from)) * PX_PER_M, color: RING_COLORS[Math.floor(random() * RING_COLORS.length)], hit: 0 })
  }
  function reset() { score = 0; thrown = 0; stage = 'aim'; stone.alive = false; trailCount = 0; fx.clear(); pops.clear(); placeRings() }
  function ripple(x: number, size: number) { const r = ripples[rippleIndex++ % ripples.length]; r.x = x; r.life = 1; r.size = size }

  function launch() {
    const a = aim(), v = 360 + 520 * power(), h = hand()
    Object.assign(stone, { x: h.x, y: h.y, vx: v * Math.cos(a), vy: -v * Math.sin(a), spin: 0, skips: 0, alive: true })
    stage = 'fly'; thrown++; swing = 1; trailCount = 0
    if (env.reduced) { for (let i = 0; i < 3000 && stone.alive; i++) step(1 / 60) }   // no animation loop: resolve the whole throw at once
  }
  function step(dt: number) {
    stone.vy += GRAVITY * dt; stone.x += stone.vx * dt; stone.y += stone.vy * dt; stone.spin += dt * 18
    // Dotted trail: one dot every ~16 px of travel.
    const last = trailCount - 1
    if (trailCount < TRAIL && (last < 0 || Math.hypot(stone.x - trail[last * 2], stone.y - trail[last * 2 + 1]) > 16)) { trail[trailCount * 2] = stone.x; trail[trailCount * 2 + 1] = stone.y; trailCount++ }
    if (stone.y < SURFACE || stone.vy <= 0) return
    // Touching the water: a shallow, fast pebble skips (losing speed, more when steeper), otherwise it sinks.
    const angle = Math.atan2(stone.vy, stone.vx)
    stone.y = SURFACE
    if (angle < SKIP_ANGLE && stone.vx > 160) {
      const k = ++stone.skips, gain = 10 * k
      score += gain; ripple(stone.x, .8); fx.splash(stone.x, SURFACE, 10, POP.foam, 150)
      pops.add(stone.x, SURFACE - 34, `+${gain}`, POP.ivory, 20 + Math.min(k, 9) * 2.6)
      for (const ring of rings) if (!ring.hit && Math.abs(stone.x - ring.x) < 36) {
        ring.hit = 1; score += 100; shake.kick(3)
        fx.confetti(ring.x, SURFACE - 10, 34, [ring.color, POP.ivory, POP.lemon], 240); pops.add(ring.x, SURFACE - 76, '+100', ring.color, 32)
      }
      stone.vy = -Math.max(40, stone.vy * (.7 + random() * .04)); stone.vx *= 1 - (.06 + angle * .55)
    } else {
      stone.alive = false; stage = 'rest'; rest = 1.7
      if (env.reduced) camX = Math.max(0, stone.x - 560)   // show where it landed, with its trail
      const m = metres(stone.x); score += m
      ripple(stone.x, 1.6); ripple(stone.x, 1); fx.splash(stone.x, SURFACE, 30, POP.foam, 280); shake.kick(stone.skips ? 2 : 4)
      pops.add(stone.x, SURFACE - 96, `${m} m`, POP.ink, 32)
      if (stone.skips >= 6) { fx.confetti(stone.x, SURFACE - 60, 90, CONFETTI, 360); fx.confetti(camX + 400, 130, 60, CONFETTI, 300) }
    }
  }
  function nextPebble() {
    if (thrown >= PEBBLES) { phase = 'over'; return }
    stage = 'aim'; trailCount = 0; placeRings()
  }
  function update(dt: number) {
    clock += dt; swing = Math.max(0, swing - dt * 2.5)
    fx.update(dt); pops.update(dt)
    for (const r of ripples) r.life = Math.max(0, r.life - dt * .9)
    for (const ring of rings) if (ring.hit) ring.hit = Math.min(3, ring.hit + dt)
    let target = 0
    if (phase === 'play' && stage === 'fly') { step(dt / 2); if (stone.alive) step(dt / 2); target = Math.max(0, stone.x - 330) }
    else if (phase === 'play' && stage === 'rest') { target = camX; if (!env.reduced && (rest -= dt) <= 0) nextPebble() }
    if (stage === 'aim' || phase !== 'play') gauge += dt
    camX = env.reduced ? target : stage === 'fly' ? lerp(camX, target, 1 - Math.exp(-dt * 8)) : lerp(camX, target, 1 - Math.exp(-dt * 4))
  }

  // ---- drawing ----
  function sky(t: number) {
    const g = ctx.createLinearGradient(0, 0, 0, HORIZON)
    g.addColorStop(0, THEME.b); g.addColorStop(.55, '#FF8A6B'); g.addColorStop(1, THEME.a)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HORIZON + 1)
    const sx = 560 - camX * .02
    ctx.fillStyle = 'rgba(255,236,170,.18)'; circle(ctx, sx, 214, 128)
    ctx.fillStyle = 'rgba(255,236,170,.28)'; circle(ctx, sx, 214, 104)
    ctx.fillStyle = '#FFE59A'; circle(ctx, sx, 214, 84)
    ctx.fillStyle = '#FFF3C9'; circle(ctx, sx - 18, 196, 50)
    for (let i = 0; i < 4; i++) {   // flat clouds, slow parallax
      const x = ((i * 260 + 90 - camX * .06 + t * 4) % 1040 + 1040) % 1040 - 120, y = 54 + (i % 2) * 54
      ctx.fillStyle = 'rgba(232,86,108,.35)'; roundRect(ctx, x + 6, y + 6, 130, 26, 13)
      ctx.fillStyle = '#FFC9B0'; roundRect(ctx, x, y, 130, 26, 13); circle(ctx, x + 46, y + 2, 20); circle(ctx, x + 80, y, 15)
    }
    for (const hill of hills) {      // far islands with palms
      const x = ((hill.x - camX * .18) % 2070 + 2070) % 2070 - 200
      ctx.fillStyle = '#C9506E'; ctx.beginPath(); ctx.ellipse(x, HORIZON + 2, hill.w / 2, hill.h, 0, Math.PI, TAU); ctx.fill()
      if (hill.palm) {
        const px = x + hill.w * .12, py = HORIZON - hill.h + 6
        ctx.strokeStyle = '#A8405F'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 8, py - 22, px + 4, py - 42); ctx.stroke()
        ctx.fillStyle = '#A8405F'
        for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .62; ctx.beginPath(); ctx.ellipse(px + 4 + Math.cos(a) * 14, py - 37 + Math.sin(a) * 6, 16, 4, a, 0, TAU); ctx.fill() }
      }
    }
  }
  function water(t: number) {
    const g = ctx.createLinearGradient(0, HORIZON, 0, H)
    g.addColorStop(0, '#FFB86B'); g.addColorStop(.28, '#F7A38A'); g.addColorStop(.6, '#3FCFD9'); g.addColorStop(1, POP.lagoon)
    ctx.fillStyle = g; ctx.fillRect(0, HORIZON, W, H - HORIZON)
    const sx = 560 - camX * .02   // broken sun reflection
    for (let i = 0; i < 9; i++) {
      const y = HORIZON + 6 + i * 11, w = (90 - i * 7) * (.7 + .3 * Math.sin(t * 2 + i * 1.7))
      ctx.fillStyle = `rgba(255,240,180,${.75 - i * .07})`; roundRect(ctx, sx - w / 2 + Math.sin(t * 1.3 + i) * 8, y, w, 4, 2)
    }
    waterLight(ctx, t, 'rgba(255,255,255,.09)', HORIZON + 4, H)
  }
  function ringShape(x: number, ring: { color: string; hit: number }, t: number) {
    const pop = ring.hit ? 1 + Math.sin(Math.min(ring.hit, 1) * Math.PI) * .35 : 1, bob = Math.sin(t * 2 + x) * 2
    ctx.save(); ctx.translate(x, SURFACE + bob); ctx.scale(pop, pop); if (ring.hit) ctx.globalAlpha = clamp(2.2 - ring.hit, .35, 1)
    ctx.fillStyle = 'rgba(16,50,74,.18)'; ctx.beginPath(); ctx.ellipse(0, 10, 40, 9, 0, 0, TAU); ctx.fill()
    ctx.beginPath(); ctx.ellipse(0, 0, 38, 14, 0, 0, TAU); ctx.ellipse(0, -1, 22, 6, 0, 0, TAU); ctx.fillStyle = ring.color; ctx.fill('evenodd')
    ctx.save(); ctx.clip('evenodd'); ctx.fillStyle = POP.ivory
    for (let k = -2; k <= 2; k += 2) ctx.fillRect(k * 14 - 5, -16, 10, 32)
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-40, -16, 80, 7); ctx.restore()
    ctx.restore(); ctx.globalAlpha = 1
  }
  function scene(t: number) {
    sky(t); water(t)
    ctx.save(); ctx.translate(-camX, 0)
    for (let m = 10; m <= 200; m += 10) {   // distance buoys every 10 m
      const x = SHOULDER_X + m * PX_PER_M; if (x < camX - 40 || x > camX + W + 40) continue
      const y = SURFACE + 46 + Math.sin(t * 2 + m) * 2
      ctx.fillStyle = 'rgba(16,50,74,.2)'; ctx.beginPath(); ctx.ellipse(x, y + 8, 14, 4, 0, 0, TAU); ctx.fill()
      ctx.fillStyle = m % 50 ? POP.ivory : POP.lemon; circle(ctx, x, y, 9)
      ctx.fillStyle = POP.ink; ctx.fillRect(x - 1.5, y - 32, 3, 26)
      ctx.fillStyle = m % 50 ? THEME.b : POP.coral; ctx.beginPath(); ctx.moveTo(x + 1, y - 32); ctx.lineTo(x + 22, y - 25); ctx.lineTo(x + 1, y - 18); ctx.fill()
      text(ctx, String(m), x, y + 30, { size: 15, weight: 800, color: POP.ivory, align: 'center', shadow: 'rgba(16,50,74,.35)' })
    }
    for (const ring of rings) ringShape(ring.x, ring, t)
    for (const duck of ducks) {   // rubber ducks drifting in the foreground
      const x = duck.x + Math.sin(t * .4 + duck.phase) * 20, y = duck.y + Math.sin(t * 2.2 + duck.phase) * 2.5
      if (x < camX - 60 || x > camX + W + 60) continue
      ctx.fillStyle = 'rgba(16,50,74,.2)'; ctx.beginPath(); ctx.ellipse(x, y + 14, 30, 6, 0, 0, TAU); ctx.fill()
      ctx.fillStyle = '#F2B705'; ctx.beginPath(); ctx.ellipse(x, y + 4, 26, 13, 0, 0, TAU); ctx.fill()
      ctx.fillStyle = POP.lemon; ctx.beginPath(); ctx.ellipse(x - 2, y, 25, 11, 0, 0, TAU); ctx.fill(); circle(ctx, x + 14, y - 14, 12)
      ctx.fillStyle = POP.orange; ctx.beginPath(); ctx.ellipse(x + 27, y - 12, 8, 4, .1, 0, TAU); ctx.fill()
      ctx.fillStyle = POP.ink; circle(ctx, x + 18, y - 17, 2.2)
      ctx.fillStyle = '#F2B705'; ctx.beginPath(); ctx.ellipse(x - 8, y - 1, 11, 6, -.3, 0, TAU); ctx.fill()
    }
    for (const r of ripples) if (r.life > 0) {
      const rx = (12 + (1 - r.life) * 46) * r.size
      ctx.strokeStyle = `rgba(255,255,255,${r.life * .85})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(r.x, SURFACE + 3, rx, rx * .26, 0, 0, TAU); ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255,248,238,.55)'
    for (let i = 0; i < trailCount; i++) circle(ctx, trail[i * 2], trail[i * 2 + 1], 2.4)
    // The pool edge (mosaic) and the thrower scroll with the world.
    ctx.fillStyle = '#E9DCC8'; ctx.fillRect(-60, DECK + 10, 190, H - DECK)
    for (let y = DECK + 12; y < H; y += 18) for (let x = -58; x < 128; x += 18) { ctx.fillStyle = ((x + y) / 18) % 2 ? '#2EC4D6' : '#8FE3EC'; ctx.fillRect(x, y, 16, 16) }
    ctx.fillStyle = POP.ivory; roundRect(ctx, -60, DECK, 200, 14, 6)
    ctx.fillStyle = 'rgba(16,50,74,.15)'; ctx.fillRect(-60, DECK + 14, 190, 5)
    thrower(t)
    if (stone.alive || (phase === 'play' && stage === 'aim')) {
      const p = stone.alive ? stone : hand(), k = clamp(1 - (SURFACE - p.y) / 280, .3, 1)
      if (stone.alive) { ctx.fillStyle = `rgba(16,50,74,${.28 * k})`; ctx.beginPath(); ctx.ellipse(p.x, SURFACE + 5, 13 * k, 4 * k, 0, 0, TAU); ctx.fill() }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(stone.alive ? Math.sin(stone.spin) * .12 - .1 : 0)
      ctx.fillStyle = '#5E6F8C'; ctx.beginPath(); ctx.ellipse(0, 1.5, 12, 5.5, 0, 0, TAU); ctx.fill()
      ctx.fillStyle = '#A9B8CF'; ctx.beginPath(); ctx.ellipse(-1, -.5, 10, 3.6, 0, 0, TAU); ctx.fill()
      ctx.fillStyle = POP.white; ctx.fillRect(-6, -2.5, 5, 1.6); ctx.restore()
    }
    fx.draw(ctx); pops.draw(ctx)
    ctx.restore()
  }
  function thrower(t: number) {
    const breathe = Math.sin(t * 3) * 1.2, a = stage === 'aim' ? aim() : -.5 + swing, h = hand()
    ctx.fillStyle = 'rgba(16,50,74,.2)'; ctx.beginPath(); ctx.ellipse(78, DECK + 2, 22, 4, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#F2B48C'; roundRect(ctx, 68, 290, 8, 34, 4); roundRect(ctx, 80, 290, 8, 34, 4)        // legs
    ctx.fillStyle = POP.flamingo; roundRect(ctx, 64, 258 + breathe, 28, 40, 12)                            // swimsuit
    ctx.fillStyle = POP.ivory; ctx.fillRect(64, 276 + breathe, 28, 5)
    ctx.fillStyle = '#F2B48C'; circle(ctx, 78, 242 + breathe, 15)                                          // head
    ctx.fillStyle = '#5A3A2E'; ctx.beginPath(); ctx.arc(76, 240 + breathe, 15, Math.PI * .9, Math.PI * 1.9); ctx.fill()
    ctx.fillStyle = POP.lemon; ctx.beginPath(); ctx.ellipse(78, 231 + breathe, 22, 5, 0, 0, TAU); ctx.fill(); roundRect(ctx, 66, 216 + breathe, 24, 16, 8)   // sun hat
    ctx.fillStyle = POP.coral; ctx.fillRect(66, 226 + breathe, 24, 4)
    ctx.fillStyle = POP.ink; circle(ctx, 86, 242 + breathe, 2)
    ctx.strokeStyle = '#F2B48C'; ctx.lineWidth = 7; ctx.lineCap = 'round'                                 // throwing arm
    ctx.beginPath(); ctx.moveTo(SHOULDER_X - 4, SHOULDER_Y); ctx.lineTo(h.x, h.y); ctx.stroke(); ctx.lineCap = 'butt'
    if (phase === 'play' && stage === 'aim') {   // aim arrow: direction = angle, length = power
      const p = power(), len = 54 + p * 70, dx = Math.cos(a), dy = -Math.sin(a)
      for (const [color, off] of [['rgba(16,50,74,.3)', 2.5], [POP.ivory, 0]] as const) {
        ctx.fillStyle = color
        for (let d = 22; d < len - 10; d += 12) circle(ctx, h.x + dx * d, h.y + dy * d + off, 3.2)
        const tx = h.x + dx * len, ty = h.y + dy * len + off
        ctx.beginPath(); ctx.moveTo(tx + dx * 12, ty + dy * 12); ctx.lineTo(tx - dy * 9, ty + dx * 9); ctx.lineTo(tx + dy * 9, ty - dx * 9); ctx.fill()
      }
    }
  }
  function gaugeBar() {
    const p = power(), x = 22 - camX, top = 110, h = 190
    if (x < -40) return
    ctx.fillStyle = 'rgba(16,50,74,.25)'; roundRect(ctx, x + 3, top + 4, 26, h, 13)
    ctx.fillStyle = POP.ivory; roundRect(ctx, x, top, 26, h, 13)
    ctx.fillStyle = p > .8 ? POP.coral : p > .5 ? POP.orange : p > .25 ? POP.lemon : POP.mint
    roundRect(ctx, x + 4, top + 4 + (h - 8) * (1 - p), 18, (h - 8) * p, 9)
    ctx.fillStyle = 'rgba(16,50,74,.25)'; ctx.fillRect(x + 4, top + 4 + (h - 8) * .2, 18, 2)   // the "strong" zone starts here
  }
  function pebblesLeft() {
    for (let i = 0; i < PEBBLES; i++) {
      const x = 758 - i * 38, live = i < PEBBLES - thrown
      ctx.fillStyle = 'rgba(16,50,74,.22)'; ctx.beginPath(); ctx.ellipse(x + 2, 45, 15, 8, 0, 0, TAU); ctx.fill()
      ctx.fillStyle = live ? '#6E80A0' : 'rgba(255,248,238,.4)'; ctx.beginPath(); ctx.ellipse(x, 42, 15, 8, 0, 0, TAU); ctx.fill()
      if (live) { ctx.fillStyle = '#B4C2D8'; ctx.beginPath(); ctx.ellipse(x - 1, 39, 11, 4.5, 0, 0, TAU); ctx.fill() }
    }
  }

  reset()
  return {
    score: () => Math.floor(score),
    interact(kind) {
      if (env.reduced && kind !== 'up') for (let i = 0; i < 5; i++) update(1 / 30)
      if (kind !== 'down') return
      if (phase !== 'play') { reset(); phase = 'play'; return }
      if (stage === 'aim') launch()
      else if (stage === 'rest') nextPebble()
    },
    draw(dt, time) {
      if (dt > 0) update(dt)
      const t = env.reduced ? clock : time
      shake.begin(ctx, dt); scene(t)
      if (phase === 'play' && stage === 'aim') gaugeBar()
      shake.end(ctx)
      const L = env.labels
      hud(ctx, score, { extra: phase === 'play' && stage !== 'aim' && stone.skips > 1 ? `${L.combo} x${stone.skips}` : `${Math.min(thrown + (stage === 'aim' ? 1 : 0), PEBBLES)}/${PEBBLES}` })
      pebblesLeft()
      if (phase === 'play' && stage !== 'aim') {
        const value = `${metres(stone.x)} m`
        ctx.font = `800 24px ${FONT}`; const w = ctx.measureText(value).width + 36
        ctx.fillStyle = 'rgba(255,248,238,.92)'; roundRect(ctx, 400 - w / 2, 20, w, 42, 21)
        text(ctx, value, 400, 50, { size: 24, weight: 800, color: THEME.b, align: 'center' })
      }
      card(ctx, env, phase, { title: 'Ricochet', score, accent: THEME.b, time: t })
    },
  }
}
