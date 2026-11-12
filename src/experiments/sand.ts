// Plongée: an underwater side-scroller — swim with the pointer, collect shells and pearls, dodge jellyfish and urchins, keep your air up.
import { card, circle, clamp, CONFETTI, GAME_THEMES, hud, lerp, motes, particles, popups, POP, roundRect, shaker, TAU, W, waterLight, type Demo, type Environment, type Phase } from './common'

const THEME = GAME_THEMES.sable
const FLOOR = 440, DIVER_X = 180, DASH_TIME = .38, DASH_COOLDOWN = 1.3
const SKIN = '#F2B48C', SHELLS = ['#FF9F8A', POP.flamingo, POP.lemon, '#FFB86B'], JELLIES = ['#FF8CC6', '#B69CFF', '#FF9ED8']
const CORAL = [POP.flamingo, POP.orange, POP.lilac, POP.mint], HAZE = ['#E58FB8', '#F0A47E', '#9E96EA', '#62D6B4']   // HAZE: the same hues, faded by distance
type Kind = 'shell' | 'pearl' | 'jelly' | 'urchin' | 'air'
interface Thing { alive: boolean; kind: Kind; x: number; y: number; base: number; phase: number; color: string }

export function sand(env: Environment): Demo {
  const { ctx, pointer, random } = env
  const fx = particles(random), pops = popups(), shake = shaker(env), drift = motes(env, 40)
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)]
  const things: Thing[] = Array.from({ length: 48 }, () => ({ alive: false, kind: 'shell' as Kind, x: 0, y: 0, base: 0, phase: 0, color: '' }))
  const bubbles = Array.from({ length: 40 }, () => ({ x: 0, y: 0, r: 0, life: 0 }))
  // Decor strips that repeat, each scrolled at its own speed (parallax).
  const far = Array.from({ length: 10 }, (_, i) => ({ x: i * 170 + random() * 60, w: 120 + random() * 140, h: 40 + random() * 50 }))
  const mid = Array.from({ length: 9 }, (_, i) => ({ x: i * 190 + random() * 80, h: 70 + random() * 60, color: HAZE[i % 4], kind: i % 3, phase: random() * TAU }))
  const near = Array.from({ length: 14 }, (_, i) => ({ x: i * 115 + random() * 50, h: 44 + random() * 46, color: pick(CORAL), kind: Math.floor(random() * 5), phase: random() * TAU }))
  const fish = Array.from({ length: 9 }, (_, i) => ({ x: Math.floor(i / 3) * 360 + (i % 3) * 26 + random() * 10, y: 120 + Math.floor(i / 3) * 70 + (i % 3) * 16, color: [POP.lemon, POP.orange, POP.sky][Math.floor(i / 3)] }))
  let phase: Phase = 'ready', score = 0, lives = 3, air = 1, clock = 0, elapsed = 0, scroll = 0
  let y = 250, tilt = 0, dash = 0, cooldown = 0, invuln = 0, combo = 0, comboTimer = 0, gap = 0, airClock = 0, breath = 0, bubbleIndex = 0

  function reset() {
    score = 0; lives = 3; air = 1; elapsed = 0; dash = 0; cooldown = 0; invuln = 0; combo = 0; comboTimer = 0; gap = 120; airClock = 2.5
    for (const t of things) t.alive = false
    fx.clear(); pops.clear()
  }
  function spawn(kind: Kind, x: number, at: number, color = '') {
    const t = things.find(item => !item.alive); if (!t) return
    Object.assign(t, { alive: true, kind, x, y: at, base: at, phase: random() * TAU, color })
  }
  function bubble(x: number, at: number, r: number) { const b = bubbles[bubbleIndex++ % bubbles.length]; b.x = x; b.y = at; b.r = r; b.life = 1 }
  /** Next obstacle/reward group; the first seconds only bring shells, then jellies, then urchins. */
  function pattern(d: number) {
    const r = random()
    if (elapsed < 4 || r < .4) {
      const n = 5 + (random() < .4 ? 1 : 0), y0 = 120 + random() * 230
      for (let i = 0; i < n; i++) spawn(i === n - 1 && random() < .45 ? 'pearl' : 'shell', W + 40 + i * 48, y0 + Math.sin(i * .8) * 38, pick(SHELLS))
      gap = n * 48 + lerp(220, 110, d)
    } else if (elapsed < 9 || r < .78) {
      const count = 1 + (random() < d * .9 ? 1 : 0), y0 = 110 + random() * 240
      for (let k = 0; k < count; k++) spawn('jelly', W + 50 + k * 150, k ? clamp(y0 + (random() < .5 ? -150 : 150), 100, 360) : y0, pick(JELLIES))
      if (random() < .45) spawn('pearl', W + 50 + 75, clamp(y0 + (random() < .5 ? -70 : 70), 90, 390))
      gap = lerp(300, 160, d) + count * 70
    } else {
      const count = 1 + (random() < d ? 1 : 0)
      for (let k = 0; k < count; k++) spawn('urchin', W + 40 + k * 64, FLOOR - 8)
      for (let i = 0; i < 3; i++) spawn('shell', W + 10 + i * 48, FLOOR - 70 - Math.sin(i / 2 * Math.PI) * 30, pick(SHELLS))
      gap = lerp(280, 150, d) + count * 64
    }
  }
  const dashOffset = () => dash > 0 ? Math.sin((1 - dash / DASH_TIME) * Math.PI) * 90 : 0
  function end() { phase = 'over'; shake.kick(6); fx.splash(DIVER_X, y, 24, POP.foam, 220) }
  function hit(t: Thing) {
    if (invuln > 0 || dash > 0) return
    lives--; invuln = 1.6; combo = 0; shake.kick(6); fx.splash(DIVER_X, y, 18, t.kind === 'jelly' ? t.color : POP.lilac, 220)
    if (lives <= 0) end()
  }
  function collect(t: Thing) {
    t.alive = false
    if (t.kind === 'air') { air = Math.min(1, air + .34); fx.splash(t.x, t.y, 16, POP.foam, 180); for (let i = 0; i < 6; i++) bubble(t.x + (random() - .5) * 30, t.y, 3 + random() * 5); return }
    combo = comboTimer > 0 ? combo + 1 : 1; comboTimer = 1.4
    const gain = (t.kind === 'pearl' ? 50 : 10) * Math.min(combo, 8)
    score += gain; pops.add(t.x, t.y - 22, `+${gain}`, POP.white, (t.kind === 'pearl' ? 28 : 22) + Math.min(combo, 8) * 1.6)
    fx.splash(t.x, t.y, 10, t.kind === 'pearl' ? POP.ivory : t.color, 150)
    if (t.kind === 'pearl') fx.confetti(t.x, t.y, 22, CONFETTI, 200)
    if (combo % 5 === 0) { fx.confetti(t.x, t.y, 50, CONFETTI, 300); shake.kick(2) }
  }
  function update(dt: number) {
    clock += dt; fx.update(dt); pops.update(dt)
    for (const b of bubbles) if (b.life > 0) { b.y -= dt * (40 + b.r * 6); b.x -= dt * 30; b.life -= dt * .5 }
    const target = clamp(phase === 'play' ? pointer.y : 250 + Math.sin(clock * 1.2) * 34, 64, FLOOR - 26), before = y
    y = lerp(y, target, 1 - Math.exp(-dt * 7)); tilt = lerp(tilt, clamp((y - before) / dt * .004, -.45, .45), 1 - Math.exp(-dt * 8))
    breath -= dt; if (breath <= 0) { breath = .8; bubble(DIVER_X + dashOffset() + 28, y - 30, 3 + random() * 3) }
    if (phase !== 'play') { scroll += dt * 50; return }
    elapsed += dt
    const d = clamp(elapsed / 100, 0, 1), speed = (150 + d * 190) * (dash > 0 ? 1.9 : 1)
    scroll += speed * dt; score += speed * dt / 80
    dash = Math.max(0, dash - dt); cooldown = Math.max(0, cooldown - dt); invuln = Math.max(0, invuln - dt)
    if ((comboTimer -= dt) <= 0) combo = 0
    if ((air -= dt * (1 / 24 + d / 50)) <= 0) { air = 0; end(); return }
    if ((gap -= speed * dt) <= 0) pattern(d)
    if ((airClock -= dt) <= 0) { airClock = 3.4 + random() * 1.8 + d * 1.4; spawn('air', W + 40, 160 + random() * 220) }
    const dx = DIVER_X + dashOffset() + 6
    for (const t of things) {
      if (!t.alive) continue
      t.x -= speed * dt
      if (t.kind === 'jelly') t.y = t.base + Math.sin(clock * 1.7 + t.phase) * 26
      if (t.kind === 'air') { t.base -= dt * 14; t.y = t.base + Math.sin(clock * 2.4 + t.phase) * 5 }
      if (t.x < -60 || t.y < -40) { t.alive = false; continue }
      const ex = t.x - dx, ey = t.y - y
      if (t.kind === 'jelly') { if ((ex / 40) ** 2 + ((ey - 8) / 26) ** 2 < 1) hit(t) }
      else if (t.kind === 'urchin') { if ((ex / 38) ** 2 + (ey / 26) ** 2 < 1) hit(t) }
      else if ((ex / 54) ** 2 + (ey / 32) ** 2 < 1) collect(t)
      if (phase !== 'play') return
    }
  }

  // ---- drawing ----
  const wrap = (x: number, tile: number) => ((x % tile) + tile) % tile - 120
  function coral(kind: number, x: number, base: number, h: number, color: string, t: number, phase: number) {
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineCap = 'round'
    if (kind === 0) {          // branching coral
      ctx.lineWidth = h * .15; ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - h)
      ctx.moveTo(x, base - h * .3); ctx.quadraticCurveTo(x - h * .4, base - h * .4, x - h * .4, base - h * .82)
      ctx.moveTo(x, base - h * .5); ctx.quadraticCurveTo(x + h * .38, base - h * .55, x + h * .36, base - h * .95); ctx.stroke()
    } else if (kind === 1) {   // sea fan
      ctx.beginPath(); ctx.ellipse(x, base - h * .3, h * .55, h * .7, 0, Math.PI, TAU); ctx.fill(); roundRect(ctx, x - 4, base - h * .32, 8, h * .32, 4)
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath()
      for (let k = 1; k < 6; k++) { const a = Math.PI + k / 6 * Math.PI; ctx.moveTo(x, base - h * .3); ctx.lineTo(x + Math.cos(a) * h * .5, base - h * .3 + Math.sin(a) * h * .62) }
      ctx.stroke()
    } else if (kind === 2) {   // tube cluster
      for (let k = -1; k <= 1; k++) { const th = h * (k ? .7 : 1); roundRect(ctx, x + k * 15 - 7, base - th, 14, th, 7) }
      ctx.fillStyle = 'rgba(16,50,74,.25)'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.ellipse(x + k * 15, base - h * (k ? .7 : 1) + 5, 4, 2.5, 0, 0, TAU); ctx.fill() }
    } else if (kind === 3) {   // brain coral
      ctx.beginPath(); ctx.ellipse(x, base, h * .55, h * .5, 0, Math.PI, TAU); ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2.5; ctx.beginPath()
      for (let k = 0; k <= 12; k++) { const px = x - h * .42 + k * h * .07; ctx.lineTo(px, base - h * .25 + Math.sin(k * 1.4) * h * .08) }
      ctx.stroke()
    } else {                   // swaying seaweed
      ctx.strokeStyle = '#2FBF71'; ctx.lineWidth = 7
      for (const off of [-8, 6]) {
        ctx.beginPath(); ctx.moveTo(x + off, base)
        for (let k = 1; k <= 6; k++) ctx.lineTo(x + off + Math.sin(t * 1.6 + phase + k * .7 + off) * k * 2.2, base - k * h * .22)
        ctx.stroke()
      }
    }
    ctx.lineCap = 'butt'
  }
  function scene(t: number) {
    const g = ctx.createLinearGradient(0, 0, 0, FLOOR)
    g.addColorStop(0, '#8FF2DE'); g.addColorStop(.45, '#33CDBF'); g.addColorStop(1, '#159AA2')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR + 10)
    ctx.fillStyle = 'rgba(255,255,255,.08)'   // light rays from the surface: flat translucent stripes
    for (let i = 0; i < 5; i++) { const x = wrap(i * 200 - scroll * .04 + Math.sin(t * .3 + i) * 16, 1000); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 56, 0); ctx.lineTo(x + 170, FLOOR); ctx.lineTo(x + 76, FLOOR); ctx.fill() }
    ctx.fillStyle = 'rgba(225,255,248,.6)'; ctx.beginPath(); ctx.moveTo(0, 0)
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 12 + Math.sin(x * .03 + t * 2) * 4)
    ctx.lineTo(W, 0); ctx.fill()
    waterLight(ctx, t, 'rgba(255,255,255,.06)', 20, FLOOR)
    ctx.fillStyle = '#4FC4B8'
    for (const m of far) { const x = wrap(m.x - scroll * .15, 1700); ctx.beginPath(); ctx.ellipse(x, FLOOR, m.w / 2, m.h, 0, Math.PI, TAU); ctx.fill() }
    for (const f of fish) {   // a few small schools far away
      const x = wrap(f.x - scroll * .3 - t * 24, 1100), fy = f.y + Math.sin(t * 2 + f.x) * 4
      ctx.fillStyle = f.color; ctx.globalAlpha = .75; ctx.beginPath(); ctx.ellipse(x, fy, 9, 5, 0, 0, TAU); ctx.fill()
      ctx.beginPath(); ctx.moveTo(x + 7, fy); ctx.lineTo(x + 15, fy - 5); ctx.lineTo(x + 15, fy + 5); ctx.fill(); ctx.globalAlpha = 1
    }
    for (const m of mid) coral(m.kind, wrap(m.x - scroll * .4, 1710), FLOOR + 4, m.h, m.color, t, m.phase)
    drift(t)
    ctx.fillStyle = '#F7D9A0'; ctx.beginPath(); ctx.moveTo(0, 500)   // sandy floor
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, FLOOR + Math.sin((x + scroll) * .02) * 4)
    ctx.lineTo(W, 500); ctx.fill()
    ctx.fillStyle = '#E8C182'
    for (let i = 0; i < 12; i++) { const x = wrap(i * 90 - scroll, 1080); roundRect(ctx, x, FLOOR + 22 + (i % 3) * 13, 34, 4, 2) }
    for (const m of near) {
      const x = wrap(m.x - scroll, 1610); if (x > W + 60) continue
      if (m.kind !== 4) { ctx.save(); ctx.translate(4, 4); coral(m.kind, x, FLOOR + 8, m.h, 'rgba(10,108,122,.25)', t, m.phase); ctx.restore() }
      coral(m.kind, x, FLOOR + 8, m.h, m.color, t, m.phase)
    }
  }
  function thing(o: Thing) {
    const { x, y: ty } = o
    if (o.kind === 'shell') {
      ctx.fillStyle = 'rgba(10,108,122,.25)'; ctx.beginPath(); ctx.arc(x + 3, ty + 11, 18, Math.PI, TAU); ctx.fill()
      ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(x, ty + 8, 18, Math.PI, TAU); ctx.fill(); roundRect(ctx, x - 6, ty + 6, 12, 7, 3)
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath()
      for (let k = 1; k < 5; k++) { const a = Math.PI + k / 5 * Math.PI; ctx.moveTo(x, ty + 8); ctx.lineTo(x + Math.cos(a) * 16, ty + 8 + Math.sin(a) * 16) }
      ctx.stroke()
    } else if (o.kind === 'pearl') {
      ctx.fillStyle = '#B9A6F0'; circle(ctx, x, ty, 13); ctx.fillStyle = '#FFF6FA'; circle(ctx, x - 1.5, ty - 1.5, 11.5)
      ctx.fillStyle = POP.white; circle(ctx, x - 5, ty - 5, 3.5)
      const s = 5 + Math.sin(clock * 5 + o.phase) * 2   // little 4-point sparkle
      ctx.beginPath(); ctx.moveTo(x + 12, ty - 12 - s); ctx.lineTo(x + 13.5, ty - 13.5); ctx.lineTo(x + 12 + s, ty - 12); ctx.lineTo(x + 13.5, ty - 10.5); ctx.lineTo(x + 12, ty - 12 + s); ctx.lineTo(x + 10.5, ty - 10.5); ctx.lineTo(x + 12 - s, ty - 12); ctx.lineTo(x + 10.5, ty - 13.5); ctx.fill()
    } else if (o.kind === 'jelly') {
      ctx.strokeStyle = o.color; ctx.lineWidth = 4.5; ctx.lineCap = 'round'
      for (let k = 0; k < 4; k++) {
        const bx = x - 15 + k * 10; ctx.beginPath(); ctx.moveTo(bx, ty + 4)
        for (let s = 1; s <= 4; s++) ctx.lineTo(bx + Math.sin(clock * 5 + k + s * 1.1 + o.phase) * 4, ty + 4 + s * 9)
        ctx.stroke()
      }
      ctx.lineCap = 'butt'
      ctx.fillStyle = o.color; ctx.beginPath(); ctx.ellipse(x, ty + 4, 25, 26, 0, Math.PI, TAU); ctx.fill(); roundRect(ctx, x - 25, ty, 50, 9, 4)
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(x - 6, ty - 10, 12, 7, -.3, 0, TAU); ctx.fill()
      ctx.fillStyle = POP.ink; circle(ctx, x - 7, ty - 1, 2.6); circle(ctx, x + 7, ty - 1, 2.6)
      ctx.fillStyle = 'rgba(255,255,255,.55)'; circle(ctx, x + 12, ty - 12, 3); circle(ctx, x + 2, ty - 17, 2)
    } else if (o.kind === 'urchin') {
      ctx.lineCap = 'round'
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * TAU + Math.sin(clock * 3 + k) * .05, len = 26 + (k % 2) * 5
        ctx.strokeStyle = k % 2 ? '#7A55C2' : '#5B3A9B'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + Math.cos(a) * len, ty + Math.sin(a) * len); ctx.stroke()
      }
      ctx.lineCap = 'butt'; ctx.fillStyle = '#4A2C86'; circle(ctx, x, ty, 17); ctx.fillStyle = '#6E4BB8'; circle(ctx, x - 4, ty - 4, 10)
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.28)'; circle(ctx, x, ty, 19); circle(ctx, x + 18, ty + 14, 7); circle(ctx, x - 15, ty + 17, 5)
      ctx.strokeStyle = POP.white; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, ty, 19, 0, TAU); ctx.stroke()
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 18, ty + 14, 7, 0, TAU); ctx.stroke()
      ctx.fillStyle = POP.white; ctx.beginPath(); ctx.ellipse(x - 7, ty - 8, 6, 3.5, -.6, 0, TAU); ctx.fill()
    }
  }
  function diver(x: number) {
    const flap = Math.sin(clock * (dash > 0 ? 24 : 9)) * .32
    if (dash > 0) { ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let k = 0; k < 5; k++) roundRect(ctx, x - 130 - k * 14, y - 22 + k * 11, 70 + (k % 2) * 30, 4, 2) }
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt)
    if (invuln > 0 && dash <= 0) ctx.globalAlpha = env.reduced || Math.sin(clock * 26) > 0 ? .5 : 1
    for (const side of [-1, 1]) {   // scissor kick: legs and fins (pink behind, lemon in front)
      ctx.save(); ctx.translate(-16, side * 4); ctx.rotate(flap * side)
      ctx.strokeStyle = side < 0 ? '#5E43D6' : POP.lilac; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-28, 0); ctx.stroke(); ctx.lineCap = 'butt'
      ctx.fillStyle = side < 0 ? POP.flamingo : POP.lemon; ctx.beginPath(); ctx.moveTo(-26, -5); ctx.lineTo(-58, -15); ctx.quadraticCurveTo(-66, 0, -58, 15); ctx.lineTo(-26, 5); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-52, -2, 18, 4)
      ctx.restore()
    }
    ctx.fillStyle = POP.orange; roundRect(ctx, -22, -25, 34, 13, 6); ctx.fillStyle = '#FFC266'; roundRect(ctx, -18, -24, 24, 4, 2)   // tank
    ctx.fillStyle = POP.lilac; ctx.beginPath(); ctx.ellipse(0, 0, 27, 14, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = '#A893FF'; ctx.beginPath(); ctx.ellipse(2, -5, 22, 6, 0, 0, TAU); ctx.fill()
    ctx.fillStyle = POP.lemon; roundRect(ctx, -6, -13, 7, 26, 3)
    ctx.strokeStyle = SKIN; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(12, -5); ctx.lineTo(42, -12); ctx.stroke(); ctx.lineCap = 'butt'   // arm reaching forward
    ctx.fillStyle = SKIN; circle(ctx, 30, -2, 12.5)
    ctx.fillStyle = POP.coral; ctx.beginPath(); ctx.arc(30, -2, 13, Math.PI * .72, Math.PI * 1.7); ctx.fill()   // swim cap
    ctx.fillStyle = POP.lemon; roundRect(ctx, 31, -11, 16, 12, 5); ctx.fillStyle = '#BFF3FF'; roundRect(ctx, 34, -8.5, 11, 7.5, 3)   // mask
    ctx.fillStyle = POP.ink; circle(ctx, 40, -4.5, 2); ctx.fillStyle = POP.white; ctx.fillRect(41.5, -8, 2.5, 2)
    ctx.strokeStyle = POP.orange; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(25, -10); ctx.quadraticCurveTo(22, -22, 26, -32); ctx.stroke()   // snorkel
    ctx.strokeStyle = POP.white; ctx.beginPath(); ctx.moveTo(23.5, -20); ctx.lineTo(23.5, -21); ctx.stroke(); ctx.lineCap = 'butt'
    ctx.restore(); ctx.globalAlpha = 1
  }
  function gauges() {
    ctx.fillStyle = 'rgba(255,248,238,.92)'; roundRect(ctx, 300, 22, 200, 38, 19)   // air
    ctx.strokeStyle = THEME.b; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(323, 41, 9, 0, TAU); ctx.stroke()
    ctx.fillStyle = THEME.b; circle(ctx, 320, 38, 2.5)
    ctx.fillStyle = 'rgba(10,108,122,.18)'; roundRect(ctx, 342, 33, 144, 16, 8)
    ctx.fillStyle = air > .3 ? '#38C7F0' : POP.coral; roundRect(ctx, 342, 33, Math.max(16, 144 * air), 16, 8)
    ctx.fillStyle = 'rgba(255,255,255,.45)'; roundRect(ctx, 348, 35, Math.max(4, 144 * air - 12), 4, 2)
    const ready = cooldown <= 0   // dash: ring fills while it recharges
    ctx.fillStyle = 'rgba(255,248,238,.92)'; circle(ctx, 534, 41, 21)
    if (ready) { ctx.fillStyle = THEME.a; circle(ctx, 534, 41, 16) }
    else { ctx.strokeStyle = THEME.a; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(534, 41, 15, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - cooldown / DASH_COOLDOWN)); ctx.stroke() }
    ctx.strokeStyle = ready ? POP.white : 'rgba(16,50,74,.4)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath()
    for (const o of [-5, 3]) { ctx.moveTo(530 + o - 3, 34); ctx.lineTo(530 + o + 4, 41); ctx.lineTo(530 + o - 3, 48) }
    ctx.stroke(); ctx.lineCap = 'butt'
  }

  reset()
  return {
    score: () => Math.floor(score),
    interact(kind) {
      if (env.reduced && kind !== 'up') for (let i = 0; i < 5; i++) update(1 / 30)
      if (kind !== 'down') return
      if (phase !== 'play') { reset(); phase = 'play'; return }
      if (cooldown <= 0) { dash = DASH_TIME; cooldown = DASH_COOLDOWN; for (let i = 0; i < 8; i++) bubble(DIVER_X - 40 - random() * 40, y + (random() - .5) * 30, 3 + random() * 5) }
    },
    draw(dt, time) {
      if (dt > 0) update(dt)
      const t = env.reduced ? clock : time
      shake.begin(ctx, dt); scene(t)
      for (const o of things) if (o.alive) thing(o)
      for (const b of bubbles) if (b.life > 0) { ctx.strokeStyle = `rgba(255,255,255,${b.life * .8})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke() }
      diver(DIVER_X + dashOffset())
      fx.draw(ctx); pops.draw(ctx)
      shake.end(ctx)
      if (air < .3 && phase === 'play') { ctx.fillStyle = `rgba(255,107,87,${.06 + (env.reduced ? 0 : Math.sin(clock * 4) * .04)})`; ctx.fillRect(0, 0, W, 500) }
      const L = env.labels
      hud(ctx, score, { lives, maxLives: 3, extra: combo > 1 ? `${L.combo} x${combo}` : `${L.level} ${1 + Math.floor(elapsed / 20)}` })
      gauges()
      card(ctx, env, phase, { title: 'Plongée', score, accent: THEME.b, time: t })
    },
  }
}
