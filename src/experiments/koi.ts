// Couloir: a three-lane pool runner. Ride a flamingo float, collect rubber ducks, dodge buoys and beach balls.
import { background, card, circle, clamp, CONFETTI, FONT, GAME_THEMES, heart, hud, particles, popups, POP, roundRect, shaker, text, TAU, waterLight, type Demo, type Environment, type Phase } from './common'

type Kind = 'duck' | 'gold' | 'buoy' | 'ball' | 'ring'
interface Thing { kind: Kind; lane: number; z: number; drift: number; spin: number }

const PLAYER_Z = .06, LANE_PX = 235
const BALL = [POP.coral, POP.white, POP.lemon, POP.white, '#2F9BFF', POP.white]
const ROPE = [POP.flamingo, POP.white, POP.lemon, POP.white], ROPE_OUT = [POP.lilac, POP.white, POP.mint]
const MOSAIC = [POP.flamingo, POP.lemon, POP.mint, POP.lilac, POP.coral, POP.sky]

export function koi(env: Environment): Demo {
  const { ctx, pointer, random } = env, theme = GAME_THEMES.koi
  const fx = particles(random), pops = popups(), shake = shaker(env), things: Thing[] = []
  // Scratch result of project(), so the many projections per frame allocate nothing.
  const P = { x: 0, y: 0, s: 0 }
  let phase: Phase = 'ready', time = 0, scroll = 0, lane = 0, target = 0, lastX = pointer.x
  let run = 0, dist = 0, bonus = 0, lives = 3, streak = 0, invul = 0, flash = 0, nextSpawn = 0, hitTilt = 0

  const mult = () => Math.min(9, 1 + Math.floor(streak / 3))
  const score = () => bonus + Math.floor(dist)
  const speed = () => phase === 'play' ? .24 + Math.min(.34, run * .0042) : .07

  /** Lane seen from behind: z = 0 at the camera, 1 at the far wall; perspective squeezes towards the horizon (y = 180). */
  function project(z: number, l: number) {
    const p = (1 - z) ** 2
    P.x = 400 + Math.sin(time * .25) * 18 * z + l * (22 + p * 210); P.y = 180 + p * 325; P.s = .08 + p
    return P
  }
  function ellipse(x: number, y: number, rx: number, ry: number) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), 0, 0, TAU); ctx.fill() }
  function add(kind: Kind, l: number, z: number, drift = 0) { things.push({ kind, lane: l, z, drift, spin: random() * TAU }) }

  function reset() {
    things.length = 0; fx.clear(); pops.clear()
    run = 0; dist = 0; bonus = 0; lives = 3; streak = 0; invul = 0; flash = 0; nextSpawn = .3
    for (let i = 0; i < 3; i++) add('duck', 0, .38 + i * .06)
  }
  /** One row: an obstacle (two later on), a chain of ducks in a free lane, sometimes a bonus. */
  function spawn(z: number) {
    const a = Math.floor(random() * 3) - 1, b = (a + 1 + 1 + Math.floor(random() * 2)) % 3 - 1, c = -a - b
    const obstacle = (): Kind => random() < .5 ? 'buoy' : 'ball'
    if (run > 8 && random() < .1) { add(lives < 3 && random() < .6 ? 'ring' : 'gold', a, z); add(obstacle(), b, z + .02); return }
    const kind = obstacle(), double = run > 12 && random() < Math.min(.6, run / 80)
    add(kind, a, z, !double && kind === 'ball' && run > 30 && random() < .5 ? (random() < .5 ? -.55 : .55) : 0)
    if (double) add(obstacle(), b, z)
    const duckLane = double || random() < .5 ? c : b
    for (let i = 0; i < 3; i++) add('duck', duckLane, z + .06 + i * .055)
  }

  function resolve(t: Thing) {
    const near = Math.abs(t.lane - lane) < .5, p = project(PLAYER_Z, t.lane), x = p.x, y = p.y
    if (t.kind === 'duck' || t.kind === 'gold') {
      if (!near) { if (t.kind === 'duck') streak = 0; return false }
      const before = mult(); streak++
      const m = mult(), points = (t.kind === 'gold' ? 500 : 100) * m
      bonus += points; pops.add(x + (streak % 2 ? -34 : 34), y - 96 - (streak % 3) * 22, `+${points}`, t.kind === 'gold' ? POP.lemon : POP.white, t.kind === 'gold' ? 34 : 28)
      fx.confetti(x, y - 50, t.kind === 'gold' ? 60 : 14, t.kind === 'gold' ? [POP.lemon, POP.orange, POP.white] : CONFETTI)
      if (m > before) { pops.add(400, 150, `${env.labels.combo} x${m}`, POP.flamingo, 36); fx.confetti(400, 160, 30) }
      return true
    }
    if (!near) return false
    if (t.kind === 'ring') {
      if (lives < 3) lives++; else bonus += 300
      pops.add(x, y - 96, lives < 3 ? '+300' : '+1', POP.flamingo, 32); fx.confetti(x, y - 50, 40, [POP.flamingo, POP.orange, POP.white])
      return true
    }
    if (invul > 0) return false
    lives--; streak = 0; invul = 1.6; hitTilt = 1; flash = env.reduced ? 0 : .16; shake.kick(6)
    fx.splash(x, y - 20, 34, POP.foam, 320); fx.splash(x, y - 20, 12, POP.white, 220)
    if (lives <= 0) { phase = 'over'; fx.confetti(x, y - 60, 40) }
    return true
  }

  function update(dt: number) {
    time += dt; fx.update(dt); pops.update(dt)
    flash = Math.max(0, flash - dt * 4); invul = Math.max(0, invul - dt); hitTilt = Math.max(0, hitTilt - dt * 2.5)
    lane += (target - lane) * Math.min(1, dt * 12)
    const v = speed(); scroll += dt * v
    if (phase !== 'play') return
    run += dt; dist += dt * v * 40; nextSpawn -= dt * v
    if (nextSpawn <= 0) { spawn(1.02); nextSpawn += Math.max(.3, .44 - run * .0016) }
    for (let i = things.length - 1; i >= 0; i--) {
      const t = things[i], before = t.z
      t.z -= dt * v; t.spin += dt * 3
      if (t.drift) { t.lane += t.drift * dt; if (Math.abs(t.lane) > 1) { t.lane = Math.sign(t.lane); t.drift *= -1 } }
      if ((before > PLAYER_Z && t.z <= PLAYER_Z && resolve(t)) || t.z < -.2) things.splice(i, 1)
      if (phase !== 'play') return
    }
  }

  // ---- drawing ----
  function umbrella(x: number, base: number, r: number, color: string) {
    ctx.fillStyle = '#E8D6BC'; ctx.fillRect(x - 2, base - r * 1.4, 4, r * 1.4)
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? POP.white : color; ctx.beginPath(); ctx.moveTo(x, base - r * 1.45)
      ctx.arc(x, base - r * 1.05, r, Math.PI + i * Math.PI / 6, Math.PI + (i + 1) * Math.PI / 6); ctx.closePath(); ctx.fill()
    }
  }
  function cloud(x: number, y: number, s: number) { ctx.fillStyle = POP.white; circle(ctx, x, y, 16 * s); circle(ctx, x + 20 * s, y - 8 * s, 20 * s); circle(ctx, x + 42 * s, y, 15 * s); roundRect(ctx, x - 14 * s, y - 2 * s, 70 * s, 16 * s, 8 * s) }
  function scenery() {
    background(ctx, '#74D6FA', '#C8F3FF')
    ctx.fillStyle = 'rgba(255,212,59,.35)'; circle(ctx, 540, 54, 42)
    ctx.fillStyle = POP.lemon; circle(ctx, 540, 54, 29)
    cloud((540 + time * 7) % 900 - 60, 48, 1); cloud((130 + time * 4) % 900 - 60, 82, .7)
    // Deck with umbrellas, then the tiled far wall with a mosaic band, then the white coping.
    ctx.fillStyle = '#FFE3BA'; ctx.fillRect(0, 100, 800, 28); ctx.fillStyle = '#FFF1DA'; ctx.fillRect(0, 100, 800, 4)
    umbrella(200, 120, 34, POP.flamingo); umbrella(640, 120, 32, POP.orange); umbrella(735, 118, 20, POP.mint)
    ctx.fillStyle = '#E8FBFF'; ctx.fillRect(0, 128, 800, 46)
    ctx.fillStyle = '#C9F1FA'
    for (let y = 128, r = 0; y < 174; y += 15, r++) for (let x = (r % 2) * 25; x < 800; x += 50) ctx.fillRect(x, y, 24, 14)
    for (let x = 0, i = 0; x < 800; x += 25, i++) { ctx.fillStyle = MOSAIC[i % MOSAIC.length]; ctx.fillRect(x + 1, 158, 23, 9) }
    // Pool water, deeper turquoise towards the camera.
    const g = ctx.createLinearGradient(0, 180, 0, 500); g.addColorStop(0, '#7DE6F6'); g.addColorStop(1, '#12B4DA')
    ctx.fillStyle = g; ctx.fillRect(0, 180, 800, 320)
    ctx.fillStyle = POP.white; ctx.fillRect(0, 170, 800, 11); ctx.fillStyle = '#9BDFEC'; ctx.fillRect(0, 181, 800, 3)
    // Dark lane lines on the pool floor, with the T at the far end.
    ctx.fillStyle = 'rgba(11,110,153,.2)'
    for (let l = -1; l <= 1; l++) {
      ctx.beginPath(); project(.96, l - .06); ctx.moveTo(P.x, P.y); project(.96, l + .06); ctx.lineTo(P.x, P.y)
      project(0, l + .06); ctx.lineTo(P.x, P.y); project(0, l - .06); ctx.lineTo(P.x, P.y); ctx.fill()
      project(.95, l); ctx.fillRect(P.x - 9, P.y - 2, 18, 3)
    }
    // Floor bands scrolling towards the camera: they sell the speed.
    ctx.fillStyle = 'rgba(255,255,255,.09)'
    const f = (scroll * 10) % 1
    for (let i = 1; i <= 10; i++) {
      const z = (i - f) / 10; if (z <= 0 || z > .97) continue
      ctx.beginPath(); project(z, -2.8); ctx.moveTo(P.x, P.y); project(z, 2.8); ctx.lineTo(P.x, P.y)
      project(z - .018, 2.8); ctx.lineTo(P.x, P.y); project(z - .018, -2.8); ctx.lineTo(P.x, P.y); ctx.fill()
    }
    waterLight(ctx, time, 'rgba(255,255,255,.13)', 184, 500)
    // Lane ropes: rows of floats; colour index follows each float as it moves.
    const n = 40, offset = scroll * n, shift = Math.floor(offset), frac = offset - shift
    for (const l of [-1.5, -.5, .5, 1.5]) for (let i = n; i >= 1; i--) {
      const z = (i - frac) / n; if (z > .99) continue
      const { x, y, s } = project(z, l), w = 3 + s * 11
      if (x < -20 || x > 820) continue
      ctx.fillStyle = 'rgba(8,63,94,.22)'; ellipse(x, y + w * .3, w, w * .45)
      ctx.fillStyle = Math.abs(l) > 1 ? ROPE_OUT[(i + shift) % 3] : ROPE[(i + shift) % 4]; ellipse(x, y - w * .1, w, w * .5)
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ellipse(x - w * .35, y - w * .3, w * .3, w * .14)
    }
  }

  function duck(x: number, y: number, s: number, gold: boolean) {
    const body = gold ? '#FFB703' : POP.lemon, dark = gold ? '#E07A00' : '#EDB000'
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ellipse(x, y, 32 * s, 7 * s)
    ctx.fillStyle = dark; ellipse(x, y - 9 * s, 27 * s, 14 * s)
    ctx.fillStyle = body; ellipse(x, y - 13 * s, 26 * s, 13 * s)
    ctx.beginPath(); ctx.moveTo(x + 14 * s, y - 20 * s); ctx.lineTo(x + 30 * s, y - 32 * s); ctx.lineTo(x + 26 * s, y - 12 * s); ctx.fill()
    ctx.fillStyle = gold ? '#FFD166' : '#FFE680'; ellipse(x + 4 * s, y - 15 * s, 12 * s, 6 * s)
    ctx.fillStyle = body; circle(ctx, x - 12 * s, y - 32 * s, 13 * s)
    ctx.fillStyle = POP.orange; ctx.beginPath(); ctx.moveTo(x - 22 * s, y - 35 * s); ctx.lineTo(x - 36 * s, y - 30 * s); ctx.lineTo(x - 22 * s, y - 27 * s); ctx.fill()
    ctx.fillStyle = POP.ink; circle(ctx, x - 15 * s, y - 35 * s, 2.4 * s)
    ctx.fillStyle = 'rgba(255,255,255,.7)'; circle(ctx, x - 8 * s, y - 38 * s, 3 * s)
    if (gold) for (let i = 0; i < 3; i++) { // Sparkles turning around the golden duck.
      const a = time * 2 + i * TAU / 3, sx = x + Math.cos(a) * 36 * s, sy = y - 24 * s + Math.sin(a) * 22 * s, r = 6 * s
      ctx.fillStyle = POP.white; ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r * .3, sy); ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r * .3, sy); ctx.fill()
      ctx.beginPath(); ctx.moveTo(sx - r, sy); ctx.lineTo(sx, sy - r * .3); ctx.lineTo(sx + r, sy); ctx.lineTo(sx, sy + r * .3); ctx.fill()
    }
  }
  function buoy(x: number, y: number, s: number, spin: number) {
    const bob = Math.sin(spin * 1.3) * 2 * s, top = y - 56 * s + bob
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ellipse(x, y, 30 * s, 7 * s)
    ctx.fillStyle = '#8A99A6'; ctx.fillRect(x - 1.5 * s, top - 26 * s, 3 * s, 28 * s)
    ctx.fillStyle = POP.lemon; ctx.beginPath(); ctx.moveTo(x + 1.5 * s, top - 26 * s); ctx.lineTo(x + 20 * s, top - 19 * s); ctx.lineTo(x + 1.5 * s, top - 12 * s); ctx.fill()
    ctx.save(); ctx.beginPath(); ctx.roundRect(x - 19 * s, top, 38 * s, 58 * s, 17 * s); ctx.clip()
    ctx.fillStyle = '#F2464B'; ctx.fillRect(x - 20 * s, top, 40 * s, 60 * s)
    ctx.fillStyle = POP.white; ctx.fillRect(x - 20 * s, top + 14 * s, 40 * s, 10 * s); ctx.fillRect(x - 20 * s, top + 34 * s, 40 * s, 10 * s)
    ctx.fillStyle = 'rgba(16,50,74,.16)'; ctx.fillRect(x + 7 * s, top, 14 * s, 60 * s)
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x - 13 * s, top + 3 * s, 4 * s, 9 * s)
    ctx.restore()
  }
  function beachBall(x: number, y: number, s: number, spin: number) {
    const r = 26 * s, cy = y - r * .85
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ellipse(x, y, 32 * s, 7 * s)
    for (let i = 0; i < 6; i++) { ctx.fillStyle = BALL[i]; ctx.beginPath(); ctx.moveTo(x, cy); ctx.arc(x, cy, r, spin + i * TAU / 6, spin + (i + 1) * TAU / 6); ctx.closePath(); ctx.fill() }
    ctx.fillStyle = 'rgba(16,50,74,.14)'; ctx.beginPath(); ctx.arc(x, cy, r, -.3, Math.PI * .8); ctx.arc(x - r * .25, cy - r * .2, r * .9, Math.PI * .8, -.3, true); ctx.fill()
    ctx.fillStyle = POP.white; circle(ctx, x, cy, r * .16)
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ellipse(x - r * .42, cy - r * .45, r * .22, r * .12)
  }
  function lifebuoy(x: number, y: number, s: number) {
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ellipse(x, y, 32 * s, 7 * s)
    ctx.save(); ctx.translate(x, y - 14 * s); ctx.scale(1, .7); ctx.lineWidth = 12 * s
    for (let i = 0; i < 4; i++) { ctx.strokeStyle = i % 2 ? POP.white : POP.orange; ctx.beginPath(); ctx.arc(0, 0, 21 * s, i * TAU / 4, (i + 1) * TAU / 4); ctx.stroke() }
    ctx.restore(); heart(ctx, x, y - 50 * s + Math.sin(time * 4) * 3 * s, 10 * s, POP.flamingo)
  }
  function flamingo(x: number, y: number, tilt: number) {
    const bob = Math.sin(time * 5) * 2
    ctx.save(); ctx.translate(x, y); ctx.rotate(tilt)
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ellipse(0, 10, 76, 15)
    ctx.fillStyle = '#D9437A'; ellipse(0, 4 + bob, 62, 25)
    ctx.fillStyle = POP.flamingo; ellipse(0, -2 + bob, 62, 22)
    ctx.fillStyle = '#4AD2EE'; ellipse(0, -5 + bob, 28, 9)
    ctx.fillStyle = '#FF9EC4'; ellipse(-44, -4 + bob, 13, 7); ellipse(44, -4 + bob, 13, 7)
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ellipse(-30, -13 + bob, 15, 3.5)
    // Tail tuft on the near side of the ring.
    ctx.fillStyle = '#FF9EC4'; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.ellipse(k * 9, 18 + bob, 5, 10, k * .5, 0, TAU); ctx.fill() }
    // Neck (flat shadow first), head, two-tone beak, eye.
    ctx.lineCap = 'round'
    for (const [color, w, dx] of [['#D9437A', 16, 3], [POP.flamingo, 13, 0]] as const) {
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(dx, -12 + bob); ctx.bezierCurveTo(-28 + dx, -42 + bob, 24 + dx, -68 + bob, 2 + dx, -96 + bob); ctx.stroke()
    }
    ctx.lineCap = 'butt'
    ctx.fillStyle = POP.flamingo; circle(ctx, 6, -100 + bob, 14)
    ctx.fillStyle = '#FF9EC4'; circle(ctx, 2, -94 + bob, 5)
    ctx.fillStyle = POP.ivory; ctx.beginPath(); ctx.moveTo(15, -108 + bob); ctx.quadraticCurveTo(36, -108 + bob, 40, -96 + bob); ctx.lineTo(16, -93 + bob); ctx.fill()
    ctx.fillStyle = POP.ink; ctx.beginPath(); ctx.moveTo(31, -104 + bob); ctx.quadraticCurveTo(39, -103 + bob, 40, -96 + bob); ctx.lineTo(32, -95 + bob); ctx.fill()
    ctx.fillStyle = POP.ink; circle(ctx, 9, -104 + bob, 3); ctx.fillStyle = POP.white; circle(ctx, 10, -105 + bob, 1)
    ctx.restore()
  }
  function drawThing(t: Thing) {
    const { x, y } = project(t.z, t.lane), s = P.s * 1.2
    if (t.kind === 'duck' || t.kind === 'gold') duck(x, y, s, t.kind === 'gold')
    else if (t.kind === 'buoy') buoy(x, y, s, t.spin)
    else if (t.kind === 'ball') beachBall(x, y, s, t.spin)
    else lifebuoy(x, y, s)
  }

  return {
    score,
    interact(kind) {
      if (kind === 'move') {
        // An arrow key moves the pointer by exactly 24: treat it as one lane step, so the keyboard is as quick as the mouse.
        const dx = pointer.x - lastX
        if (Math.abs(Math.abs(dx) - 24) < .01) { target = clamp(Math.round(target) + Math.sign(dx), -1, 1); pointer.x = 400 + target * LANE_PX }
        else target = clamp((pointer.x - 400) / LANE_PX, -1.1, 1.1)
        lastX = pointer.x
      }
      if (kind === 'down') {
        if (phase === 'ready') phase = 'play'
        else if (phase === 'over') { reset(); phase = 'play' }
      }
      if (env.reduced && kind !== 'up') for (let i = 0; i < 5; i++) update(1 / 30)
    },
    draw(dt) {
      if (dt > 0) update(dt)
      shake.begin(ctx, dt)
      scenery()
      things.sort((a, b) => b.z - a.z)
      let i = 0
      for (; i < things.length && things[i].z > PLAYER_Z; i++) if (things[i].z <= 1) drawThing(things[i])
      const me = project(PLAYER_Z, lane)
      if (!(invul > 0 && Math.floor(time * 12) % 2)) flamingo(me.x, me.y, (target - lane) * .25 + Math.sin(hitTilt * 14) * hitTilt * .3)
      for (; i < things.length; i++) drawThing(things[i])
      fx.draw(ctx); pops.draw(ctx)
      shake.end(ctx)
      if (flash > 0) { ctx.fillStyle = `rgba(255,107,87,${flash})`; ctx.fillRect(0, 0, 800, 500) }
      hud(ctx, score(), { lives, extra: `${Math.floor(dist)} m` })
      if (phase === 'play' && mult() > 1) {
        const label = `${env.labels.combo} x${mult()}`; ctx.font = `800 20px ${FONT}`
        const w = ctx.measureText(label).width + 36
        ctx.fillStyle = '#E0A800'; roundRect(ctx, 400 - w / 2, 23, w, 40, 20); ctx.fillStyle = POP.lemon; roundRect(ctx, 400 - w / 2, 19, w, 40, 20)
        text(ctx, label, 400, 46, { size: 20, weight: 800, color: POP.ink, align: 'center' })
      }
      card(ctx, env, phase, { title: 'Couloir', score: score(), accent: theme.b, time })
    },
  }
}
