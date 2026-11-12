export const W = 800, H = 500, TAU = Math.PI * 2

/**
 * Summer pool palette, shared by the six games and the Playground page: vivid, flat colours (inflatables, rubber ducks,
 * mosaic tiles), never neon. No shadowBlur glow, no bloom; depth comes from flat shadows and lighter tops.
 */
export const POP = {
  ink: '#10324A', ivory: '#FFF8EE', white: '#FFFFFF',
  water: '#19C3E6', lagoon: '#0EA5C6', deep: '#0B6E99', abyss: '#083F5E', foam: '#BFF3FF',
  flamingo: '#FF6FA3', coral: '#FF6B57', lemon: '#FFD43B', orange: '#FF9F1C', mint: '#3DDC97', lilac: '#8B6CFF', sky: '#7FD8FF',
}
/** The confetti mix every game uses for celebrations. */
export const CONFETTI = [POP.flamingo, POP.lemon, POP.mint, POP.sky, POP.coral, POP.lilac, POP.ivory]

/** One signature colour pair per game (a = light/bright, b = deep), also used by the page for the card and the stage. */
export const GAME_THEMES: Record<string, { a: string; b: string; text: string }> = {
  koi: { a: '#22C8E5', b: '#0B6E99', text: '#FFFFFF' },
  encre: { a: '#9B7BFF', b: '#4B2FB8', text: '#FFFFFF' },
  hanzi: { a: '#FF8A65', b: '#C2362E', text: '#FFFFFF' },
  'chambre-noire': { a: '#FFB347', b: '#C53A57', text: '#FFFFFF' },
  sable: { a: '#2ED3A6', b: '#0A6C7A', text: '#FFFFFF' },
  bulles: { a: '#FF7EB6', b: '#C2387A', text: '#FFFFFF' },
}

/** Words drawn inside the canvas, given by the page in the visitor's language. */
export interface GameLabels { start: string; keys: string; again: string; over: string; level: string; combo: string; /** Touch-screen versions of start / again. */ startTouch: string; againTouch: string }
export const DEFAULT_LABELS: GameLabels = { start: 'Clique pour jouer', keys: 'ou appuie sur Entrée', again: 'Clique pour rejouer', over: 'Partie terminée', level: 'Niveau', combo: 'Combo', startTouch: 'Touche pour jouer', againTouch: 'Touche pour rejouer' }

export const FONT = "'Funnel Display', 'Zen Maru Gothic', 'Noto Sans SC', sans-serif"
export interface Pointer { x: number; y: number; active: boolean; down: boolean }
export interface Environment {
  ctx: CanvasRenderingContext2D
  pointer: Pointer
  random: () => number
  reduced: boolean
  invalidate: () => void
  labels: GameLabels
  /** The game's name in the visitor's language (shown on the start card); the game's own name is the fallback. */
  title?: string
  /** True on a touch screen: the cards say "tap" and drop the keyboard hint. */
  touch?: boolean
}
export interface Demo {
  draw(dt: number, time: number): void
  interact?(kind: 'move' | 'down' | 'up'): void
  dispose?(): void
  /** Current score (the page keeps the best in localStorage). */
  score?(): number
}
export type Phase = 'ready' | 'play' | 'over'

export function seededRandom(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
}
export function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)) }
export function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

export function background(ctx: CanvasRenderingContext2D, top: string, bottom: string) {
  const gradient = ctx.createLinearGradient(0, 0, 0, H)
  gradient.addColorStop(0, top); gradient.addColorStop(1, bottom)
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H)
}
export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.beginPath(); ctx.arc(x, y, Math.max(.01, radius), 0, TAU); ctx.fill()
}
export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); ctx.fill()
}
/** Text with an optional flat drop shadow (offset copy, no blur). */
export function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, options: { size?: number; weight?: number; color?: string; align?: CanvasTextAlign; shadow?: string; baseline?: CanvasTextBaseline } = {}) {
  const { size = 20, weight = 700, color = POP.ivory, align = 'left', shadow, baseline = 'alphabetic' } = options
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = baseline
  if (shadow) { ctx.fillStyle = shadow; ctx.fillText(value, x, y + Math.max(2, size * .08)) }
  ctx.fillStyle = color; ctx.fillText(value, x, y)
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
}

/** Soft moving light bands on water (flat stripes, not glow). Call after the background. */
export function waterLight(ctx: CanvasRenderingContext2D, time: number, color = 'rgba(255,255,255,.10)', top = 0, bottom = H) {
  ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, bottom - top); ctx.clip(); ctx.fillStyle = color
  for (let i = 0; i < 7; i++) {
    const y = top + ((i / 7) * (bottom - top) + time * 14) % (bottom - top)
    ctx.beginPath(); ctx.moveTo(0, y)
    for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y + Math.sin(x * .012 + time * 1.3 + i) * 7)
    for (let x = W; x >= 0; x -= 40) ctx.lineTo(x, y + 5 + Math.sin(x * .012 + time * 1.3 + i + .6) * 7)
    ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}

/** Confetti and droplets. Capped so a burst never costs much. */
export function particles(random: () => number, cap = 420) {
  type Bit = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; spin: number; angle: number; round: boolean; gravity: number }
  const bits: Bit[] = []
  return {
    get count() { return bits.length },
    /** Confetti: small spinning rectangles that fall. */
    confetti(x: number, y: number, count = 40, colors = CONFETTI, speed = 260) {
      for (let i = 0; i < count && bits.length < cap; i++) {
        const a = random() * TAU, v = speed * (.35 + random() * .65)
        bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * .35, life: 1, max: .9 + random() * .7, color: colors[Math.floor(random() * colors.length)], size: 4 + random() * 5, spin: (random() - .5) * 14, angle: random() * TAU, round: false, gravity: 420 })
      }
    },
    /** Droplets: round, lighter, short-lived (a splash). */
    splash(x: number, y: number, count = 18, color = POP.foam, speed = 200) {
      for (let i = 0; i < count && bits.length < cap; i++) {
        const a = -Math.PI * (.1 + random() * .8), v = speed * (.4 + random() * .6)
        bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, max: .5 + random() * .4, color, size: 2 + random() * 3.5, spin: 0, angle: 0, round: true, gravity: 520 })
      }
    },
    update(dt: number) {
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i]; b.life -= dt / b.max; b.vy += b.gravity * dt; b.vx *= 1 - dt * 1.2
        b.x += b.vx * dt; b.y += b.vy * dt; b.angle += b.spin * dt
        if (b.life <= 0 || b.y > H + 20) bits.splice(i, 1)
      }
    },
    draw(ctx: CanvasRenderingContext2D) {
      for (const b of bits) {
        ctx.globalAlpha = clamp(b.life * 1.4, 0, 1); ctx.fillStyle = b.color
        if (b.round) circle(ctx, b.x, b.y, b.size)
        else { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle); ctx.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2); ctx.restore() }
      }
      ctx.globalAlpha = 1
    },
    clear() { bits.length = 0 },
  }
}

/** Floating "+100" style labels. */
export function popups() {
  const items: { x: number; y: number; value: string; color: string; life: number; size: number }[] = []
  return {
    add(x: number, y: number, value: string, color: string = POP.ivory, size = 26) { items.push({ x, y, value, color, life: 1, size }); if (items.length > 24) items.shift() },
    update(dt: number) { for (let i = items.length - 1; i >= 0; i--) { const p = items[i]; p.life -= dt * 1.1; p.y -= dt * 46; if (p.life <= 0) items.splice(i, 1) } },
    draw(ctx: CanvasRenderingContext2D) {
      for (const p of items) { ctx.globalAlpha = clamp(p.life * 1.6, 0, 1); text(ctx, p.value, p.x, p.y, { size: p.size * (1 + (1 - p.life) * .15), color: p.color, align: 'center', shadow: 'rgba(16,50,74,.35)' }) }
      ctx.globalAlpha = 1
    },
    clear() { items.length = 0 },
  }
}

/** Small camera shake (at most 6 px), off under reduced motion. Wrap the scene in begin()/end(). */
export function shaker(env: Environment) {
  let amount = 0
  return {
    kick(value = 5) { if (!env.reduced) amount = Math.min(6, Math.max(amount, value)) },
    begin(ctx: CanvasRenderingContext2D, dt: number) { amount = Math.max(0, amount - dt * 22); ctx.save(); if (amount) ctx.translate((env.random() - .5) * amount * 2, (env.random() - .5) * amount * 2) },
    end(ctx: CanvasRenderingContext2D) { ctx.restore() },
  }
}

/** Score pill (top left) and optional lives (top right), the same in every game. */
export function hud(ctx: CanvasRenderingContext2D, score: number, options: { lives?: number; maxLives?: number; color?: string; extra?: string } = {}) {
  const { lives, maxLives = 3, color = POP.ink, extra } = options
  const value = String(Math.floor(score))
  ctx.font = `800 28px ${FONT}`; const w = Math.max(92, ctx.measureText(value).width + 40)
  ctx.fillStyle = 'rgba(255,248,238,.92)'; roundRect(ctx, 20, 18, w, 46, 23)
  text(ctx, value, 20 + w / 2, 51, { size: 28, weight: 800, color, align: 'center' })
  if (extra) {
    ctx.font = `700 18px ${FONT}`; const ew = ctx.measureText(extra).width + 30
    ctx.fillStyle = 'rgba(255,248,238,.92)'; roundRect(ctx, 30 + w, 22, ew, 38, 19)
    text(ctx, extra, 30 + w + ew / 2, 47, { size: 18, color, align: 'center' })
  }
  if (lives !== undefined) for (let i = 0; i < maxLives; i++) heart(ctx, 760 - i * 34, 41, 13, i < lives ? POP.flamingo : 'rgba(255,248,238,.35)')
}
export function heart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color; ctx.beginPath()
  ctx.moveTo(x, y + size * .9)
  ctx.bezierCurveTo(x - size * 1.5, y - size * .1, x - size * .7, y - size * 1.1, x, y - size * .35)
  ctx.bezierCurveTo(x + size * .7, y - size * 1.1, x + size * 1.5, y - size * .1, x, y + size * .9)
  ctx.fill()
}

/**
 * Start and game-over card, centred, drawn over the (still moving) scene.
 * ready: title + "Clique pour jouer / ou appuie sur Entrée"; over: label + big score + "Clique pour rejouer".
 */
export function card(ctx: CanvasRenderingContext2D, env: Environment, phase: Phase, options: { title: string; score?: number; accent: string; time: number }) {
  if (phase === 'play') return
  const { score = 0, accent, time } = options, title = env.title || options.title, L = env.labels
  ctx.fillStyle = 'rgba(16,50,74,.38)'; ctx.fillRect(0, 0, W, H)
  const bob = env.reduced ? 0 : Math.sin(time * 2.4) * 3
  ctx.fillStyle = 'rgba(16,50,74,.25)'; roundRect(ctx, 220, 128 + bob + 8, 360, 236, 32)
  ctx.fillStyle = POP.ivory; roundRect(ctx, 220, 128 + bob, 360, 236, 32)
  ctx.fillStyle = accent; roundRect(ctx, 220, 128 + bob, 360, 14, 7)
  if (phase === 'ready') {
    text(ctx, title, 400, 214 + bob, { size: 44, weight: 800, color: POP.ink, align: 'center' })
    ctx.fillStyle = accent; roundRect(ctx, 270, 248 + bob, 260, 56, 28)
    text(ctx, env.touch ? L.startTouch : L.start, 400, 284 + bob, { size: 22, weight: 800, color: POP.white, align: 'center' })
    if (!env.touch) text(ctx, L.keys, 400, 336 + bob, { size: 16, weight: 600, color: 'rgba(16,50,74,.62)', align: 'center' })
  } else {
    text(ctx, L.over, 400, 186 + bob, { size: 22, weight: 700, color: 'rgba(16,50,74,.7)', align: 'center' })
    text(ctx, String(Math.floor(score)), 400, 254 + bob, { size: 64, weight: 800, color: accent, align: 'center', shadow: 'rgba(16,50,74,.15)' })
    ctx.fillStyle = POP.ink; roundRect(ctx, 270, 282 + bob, 260, 54, 27)
    text(ctx, env.touch ? L.againTouch : L.again, 400, 316 + bob, { size: 20, weight: 800, color: POP.white, align: 'center' })
  }
}

/** Quiet drifting motes (tiny bubbles). */
export function motes(env: Environment, count: number) {
  const points = Array.from({ length: count }, () => ({ x: env.random() * W, y: env.random() * H, r: .6 + env.random() * 1.8, phase: env.random() * TAU }))
  return (time: number, color = '255,255,255') => {
    for (const p of points) { env.ctx.fillStyle = `rgba(${color},${.12 + (Math.sin(time * .6 + p.phase) + 1) * .1})`; circle(env.ctx, p.x, (p.y - time * 12 + H * 4) % H, p.r) }
  }
}
