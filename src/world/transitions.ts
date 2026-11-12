import { computeFrame, lerpFrame, type PoolFrame } from './frame'
import { layoutObjects, type ObjectPlacement } from './layout'
import { clamp01, ease, type EaseName } from './motion'
import type { MotionPolicy } from './motionPolicy'
import type { LayoutContext, View } from './types'
export interface Snapshot { frame: PoolFrame; objects: readonly ObjectPlacement[] }
export interface TransitionPlan {
  fromView: View | null; toView: View; from: Snapshot; to: Snapshot; durationMs: number
  frameKeys: readonly { atMs: number; frame: PoolFrame; ease: EaseName }[]
  objects: { startMs: number; endMs: number; staggerMs: number; via?: readonly ObjectPlacement[]; overshoot: number }
  content: { outStartMs: number; outMs: number; outDir: 'left' | 'up' | 'push' | 'none'; inStartMs: number; inMs: number }
}
export function snapshotFor(view: View, ctx: LayoutContext): Snapshot {
  const frame = computeFrame(view, ctx)
  return { frame, objects: layoutObjects(view, ctx, frame) }
}
export function planTransition(from: Snapshot, fromView: View | null, toView: View, ctx: LayoutContext, policy: MotionPolicy): TransitionPlan {
  const to = snapshotFor(toView, ctx)
  const fade = policy.transitions === 'fade'
  const projectSwap = (fromView?.kind === 'project' || fromView?.kind === 'projects') && (toView.kind === 'project' || toView.kind === 'projects')
  const homeProject = fromView?.kind === 'home' && (toView.kind === 'project' || toView.kind === 'projects')
  const throughHome = fromView?.kind === 'about' && toView.kind === 'playground'
  const durationMs = fade || projectSwap ? 200 : toView.kind === 'home' ? 1000 : throughHome ? 1300 : 1500
  const frameKeys: TransitionPlan['frameKeys'][number][] = [{ atMs: 0, frame: fade ? to.frame : from.frame, ease: 'inOutCubic' }]
  if (homeProject && !fade) {
    frameKeys.push({ atMs: 300, frame: from.frame, ease: 'inOutCubic' })
    // The left edge leads: it is already near the strip while the right edge is still gliding out.
    const a = from.frame, b = to.frame, mix = (x: number, y: number, k: number) => x + (y - x) * k
    const left = mix(a.rect.x, b.rect.x, .88), right = mix(a.rect.x + a.rect.w, b.rect.x + b.rect.w, .55)
    frameKeys.push({ atMs: 900, frame: { ...lerpFrame(a, b, .75), rect: { x: left, y: mix(a.rect.y, b.rect.y, .75), w: Math.max(0, right - left), h: mix(a.rect.h, b.rect.h, .75) } }, ease: 'inOutCubic' })
  }
  if (throughHome && !fade) frameKeys.push({ atMs: 450, frame: computeFrame({ kind: 'home' }, ctx), ease: 'inOutCubic' })
  frameKeys.push({ atMs: fade ? 0 : projectSwap ? 200 : throughHome ? 900 : homeProject ? 1100 : durationMs - (toView.kind === 'home' ? 0 : 400), frame: to.frame, ease: 'inOutCubic' })
  // Grouping point: a loose diagonal toward the centre-left of the *current* pool.
  const fr = from.frame.rect
  const via = homeProject && !fade ? from.objects.map((o, i) => ({ ...o, x: fr.x + fr.w * (.26 + i * .05), y: fr.y + fr.h * (.28 + i * .09) })) : undefined
  return { fromView, toView, from, to, durationMs, frameKeys,
    objects: { startMs: 0, endMs: fade ? 0 : durationMs - (toView.kind === 'home' ? 0 : 400), staggerMs: fade ? 0 : 25, via, overshoot: .03 },
    content: { outStartMs: 0, outMs: fade || projectSwap ? 100 : 300, outDir: fade || projectSwap ? 'none' : toView.kind === 'home' ? 'push' : throughHome ? 'up' : 'left', inStartMs: fade || projectSwap ? 100 : durationMs - 400, inMs: fade || projectSwap ? 100 : 400 },
  }
}
interface RelPlacement { id: ObjectPlacement['id']; u: number; v: number; size: number; lift: number; visible: boolean }
const toRel = (o: ObjectPlacement, f: PoolFrame): RelPlacement => ({ id: o.id, u: (o.x - f.rect.x) / Math.max(1, f.rect.w), v: (o.y - f.rect.y) / Math.max(1, f.rect.h), size: o.size, lift: o.lift, visible: o.visible })
/** Interpolates in frame-relative (u,v) and projects onto the frame sampled at the same instant, so objects ride the pool. */
function mixRel(a: RelPlacement, b: RelPlacement, k: number, frame: PoolFrame): ObjectPlacement {
  const lerp = (x: number, y: number) => x + (y - x) * k, r = frame.rect
  return { id: b.id, x: r.x + lerp(a.u, b.u) * r.w, y: r.y + lerp(a.v, b.v) * r.h, size: lerp(a.size, b.size), lift: lerp(a.lift, b.lift), visible: a.visible || b.visible }
}
/** Objects that leave the scene (visible -> hidden) shrink away in 300 ms; ones that join it grow in over 400 ms. */
const EXIT_MS = 300, ENTER_MS = 400
function withFade(o: ObjectPlacement, before: ObjectPlacement | undefined, visibleAfter: boolean, t: number): ObjectPlacement {
  const wasVisible = before?.visible ?? visibleAfter
  if (wasVisible && !visibleAfter) { const fade = 1 - ease(clamp01(t / EXIT_MS)); return { ...o, visible: fade > 0, fade } }
  if (!wasVisible && visibleAfter) return { ...o, fade: ease(clamp01(t / ENTER_MS)) }
  return o
}
/** Ease with a small bump that vanishes at both ends: gentle overshoot before settling. */
function settle(p: number, overshoot: number) { return ease(p) + overshoot * Math.sin(Math.PI * clamp01((p - .55) / .45)) }
const FRAME_FIELDS = (f: PoolFrame) => [f.rect.x, f.rect.y, f.rect.w, f.rect.h, f.radii.tl, f.radii.tr, f.radii.br, f.radii.bl, f.pan.x, f.pan.y]
const frameFrom = (n: number[], visible: boolean): PoolFrame => ({ rect: { x: n[0], y: n[1], w: Math.max(0, n[2]), h: n[3] }, radii: { tl: n[4], tr: n[5], br: n[6], bl: n[7] }, pan: { x: n[8], y: n[9] }, visible })
/**
 * Frame at time t. Two keys: plain eased interpolation. More keys: monotone cubic Hermite (Fritsch-Carlson)
 * through the keys with zero velocity only at the first and last key, so the frame never stalls at an
 * interior waypoint (a repeated key, like the 0-300 ms regroup hold, is a deliberate hold).
 */
function sampleFrame(keys: TransitionPlan['frameKeys'], t: number): PoolFrame {
  if (t <= keys[0].atMs) return keys[0].frame
  const last = keys[keys.length - 1]
  if (t >= last.atMs) return last.frame
  if (keys.length === 2) return lerpFrame(keys[0].frame, keys[1].frame, ease((t - keys[0].atMs) / Math.max(1, keys[1].atMs - keys[0].atMs), keys[1].ease))
  let i = 1
  while (t >= keys[i].atMs) i++
  const a = keys[i - 1], b = keys[i], span = Math.max(1, b.atMs - a.atMs), k = (t - a.atMs) / span
  const vals = keys.map(key => FRAME_FIELDS(key.frame))
  const out = vals[i].map((_, c) => {
    const tangent = (j: number) => {
      if (j === 0 || j === keys.length - 1) return 0
      const h0 = Math.max(1, keys[j].atMs - keys[j - 1].atMs), h1 = Math.max(1, keys[j + 1].atMs - keys[j].atMs)
      const d0 = (vals[j][c] - vals[j - 1][c]) / h0, d1 = (vals[j + 1][c] - vals[j][c]) / h1
      if (d0 * d1 <= 0) return 0
      const w1 = 2 * h1 + h0, w2 = h1 + 2 * h0
      return (w1 + w2) / (w1 / d0 + w2 / d1)
    }
    const p0 = vals[i - 1][c], p1 = vals[i][c], m0 = tangent(i - 1) * span, m1 = tangent(i) * span
    const k2 = k * k, k3 = k2 * k
    return (2 * k3 - 3 * k2 + 1) * p0 + (k3 - 2 * k2 + k) * m0 + (-2 * k3 + 3 * k2) * p1 + (k3 - k2) * m1
  })
  return frameFrom(out, a.frame.visible || b.frame.visible)
}
export function sampleTransition(plan: TransitionPlan, tMs: number): Snapshot & { contentOut: number; contentIn: number; done: boolean } {
  const t = Math.max(0, tMs), done = t >= plan.durationMs
  const contentOut = 1 - clamp01((t - plan.content.outStartMs) / Math.max(1, plan.content.outMs))
  const contentIn = clamp01((t - plan.content.inStartMs) / Math.max(1, plan.content.inMs))
  if (done) return { ...plan.to, contentOut: 0, contentIn: 1, done: true }
  const frame = sampleFrame(plan.frameKeys, t)
  let objects: readonly ObjectPlacement[]
  const rel = (list: readonly ObjectPlacement[], f: PoolFrame) => list.map(o => toRel(o, f))
  if (plan.objects.endMs === 0) objects = plan.to.objects
  else if (t === 0) objects = plan.from.objects
  else {
    const grouped = plan.objects.via && t <= 300
    const start = plan.objects.via ? 300 : plan.objects.startMs
    const source = rel(plan.objects.via ?? plan.from.objects, plan.from.frame), target = rel(plan.to.objects, plan.to.frame)
    const origin = rel(plan.from.objects, plan.from.frame)
    objects = target.map((b, i) => {
      let a = source.find(o => o.id === b.id) ?? b, o0 = origin.find(o => o.id === b.id) ?? a
      // An object hidden before the transition appears at its own target, never at an arbitrary grouping point.
      if (!o0.visible && b.visible) { a = b; o0 = b }
      if (grouped) return withFade(mixRel(o0, a, ease(t / 300), frame), plan.from.objects.find(p => p.id === b.id), b.visible, t)
      const delay = i * plan.objects.staggerMs
      const progress = clamp01((t - start - delay) / Math.max(1, plan.objects.endMs - start - delay))
      return withFade(mixRel(a, b, settle(progress, plan.objects.overshoot), frame), plan.from.objects.find(p => p.id === b.id), b.visible, t)
    })
  }
  return { frame, objects, contentOut, contentIn, done }
}
