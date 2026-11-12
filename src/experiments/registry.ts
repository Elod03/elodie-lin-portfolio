import { bubbles } from './bubbles'
import { darkroom } from './darkroom'
import { hanzi } from './hanzi'
import { ink } from './ink'
import { koi } from './koi'
import { sand } from './sand'
import { clamp, DEFAULT_LABELS, seededRandom, type Demo, type Environment, type GameLabels } from './common'

export interface ExperimentOptions { seed: number; reducedMotion: boolean; /** Called whenever the score of a scoring game changes. */ onScore?: (score: number) => void; /** Words drawn in the canvas, in the visitor's language. */ labels?: GameLabels; /** The game's name in that language. */ title?: string }
export interface ExperimentHandle { dispose(): void; setPaused(paused: boolean): void }

export function mountExperiment(id: string, canvas: HTMLCanvasElement, options: ExperimentOptions): ExperimentHandle {
  const ctx = canvas.getContext('2d')
  if (!ctx) return { dispose() {}, setPaused() {} }
  let frame = 0, disposed = false, paused = false, time = 0, last = 0
  let demo: Demo | undefined, lastScore = 0
  const reportScore = () => { const value = demo?.score?.(); if (value !== undefined && value !== lastScore) { lastScore = value; options.onScore?.(value) } }
  const pointer = { x: 400, y: 250, active: false, down: false }
  const env: Environment = { ctx, pointer, random: seededRandom(options.seed), reduced: options.reducedMotion, labels: options.labels ?? DEFAULT_LABELS, title: options.title, touch: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches, invalidate: () => { if (!disposed) demo?.draw(0, time) } }
  const factories = { koi, encre: ink, hanzi, 'chambre-noire': darkroom, sable: sand, bulles: bubbles }
  demo = (factories[id as keyof typeof factories] ?? bubbles)(env)

  function resize() {
    if (disposed) return
    const rect = canvas.getBoundingClientRect(), width = rect.width || 800, height = rect.height || width * .625
    const dpr = Math.min(devicePixelRatio || 1, 1.75)
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
    ctx!.setTransform(canvas.width / 800, 0, 0, canvas.height / 500, 0, 0)
    demo?.draw(0, time)
  }
  function loop(now: number) {
    frame = 0
    if (disposed || paused || env.reduced || document.hidden) return
    const dt = Math.min((now - (last || now)) / 1000, 1 / 30)
    last = now; time += dt; demo?.draw(dt, time); reportScore()
    frame = requestAnimationFrame(loop)
  }
  function syncLoop() {
    cancelAnimationFrame(frame); frame = 0; last = 0
    if (!disposed && !paused && !env.reduced && !document.hidden) frame = requestAnimationFrame(loop)
  }
  function updatePointer(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    pointer.x = clamp((event.clientX - rect.left) / (rect.width || 1) * 800, 0, 800)
    pointer.y = clamp((event.clientY - rect.top) / (rect.height || 1) * 500, 0, 500)
    pointer.active = true
  }
  function move(event: PointerEvent) { updatePointer(event); demo?.interact?.('move'); if (env.reduced || paused) { demo?.draw(0, time); reportScore() } }
  function down(event: PointerEvent) { updatePointer(event); pointer.down = true; try { canvas.setPointerCapture(event.pointerId) } catch { /* A synthetic pointer may have no capture target. */ } demo?.interact?.('down'); if (env.reduced || paused) { demo?.draw(0, time); reportScore() } }
  function up() { pointer.down = false; demo?.interact?.('up'); if (env.reduced || paused) { demo?.draw(0, time); reportScore() } }
  function leave() { if (!pointer.down) { pointer.active = false; if (env.reduced || paused) { demo?.draw(0, time); reportScore() } } }
  function key(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) return
    event.preventDefault(); pointer.active = true
    if (event.key === 'Enter' || event.key === ' ') { pointer.down = true; demo?.interact?.('down'); pointer.down = false; demo?.interact?.('up') }
    else { pointer.x = clamp(pointer.x + (event.key === 'ArrowLeft' ? -24 : event.key === 'ArrowRight' ? 24 : 0), 0, 800); pointer.y = clamp(pointer.y + (event.key === 'ArrowUp' ? -24 : event.key === 'ArrowDown' ? 24 : 0), 0, 500); demo?.interact?.('move') }
    demo?.draw(0, time); reportScore()
  }
  const media = matchMedia('(prefers-reduced-motion: reduce)')
  function motionChanged() { env.reduced = media.matches; demo?.draw(0, time); syncLoop() }
  const observer = new ResizeObserver(resize); observer.observe(canvas)
  canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('pointerleave', leave); canvas.addEventListener('keydown', key)
  document.addEventListener('visibilitychange', syncLoop); media.addEventListener('change', motionChanged)
  resize(); syncLoop()
  return {
    setPaused(value) { if (disposed) return; paused = value; syncLoop() },
    dispose() {
      if (disposed) return
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); demo?.dispose?.()
      canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('pointerleave', leave); canvas.removeEventListener('keydown', key)
      document.removeEventListener('visibilitychange', syncLoop); media.removeEventListener('change', motionChanged)
    },
  }
}
