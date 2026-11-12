import type { LayoutContext, View } from './types'
import { sameView } from './types'
import type { MotionPolicy } from './motionPolicy'
import { planTransition, sampleTransition, snapshotFor, type Snapshot, type TransitionPlan } from './transitions'
export type DirectorState = { kind: 'settled'; view: View; snapshot: Snapshot } | { kind: 'transitioning'; plan: TransitionPlan; startedAt: number }
export type DirectorEvent = { type: 'navigate'; view: View; now: number } | { type: 'escape'; now: number } | { type: 'tick'; now: number } | { type: 'resize'; now: number }
export type DirectorEffect = { type: 'start'; plan: TransitionPlan; startedAt: number } | { type: 'settled'; view: View } | { type: 'snap'; view: View; snapshot: Snapshot }
export function initDirector(view: View, ctx: LayoutContext): DirectorState { return { kind: 'settled', view, snapshot: snapshotFor(view, ctx) } }
export function reduce(s: DirectorState, e: DirectorEvent, ctx: LayoutContext, policy: MotionPolicy): { state: DirectorState; effects: DirectorEffect[] } {
  const currentView = s.kind === 'settled' ? s.view : s.plan.toView
  if (e.type === 'tick') {
    if (s.kind === 'transitioning' && e.now - s.startedAt >= s.plan.durationMs) return { state: { kind: 'settled', view: s.plan.toView, snapshot: s.plan.to }, effects: [{ type: 'settled', view: s.plan.toView }] }
    return { state: s, effects: [] }
  }
  if (e.type === 'resize' && s.kind === 'settled') {
    const snapshot = snapshotFor(s.view, ctx)
    return { state: { ...s, snapshot }, effects: [{ type: 'snap', view: s.view, snapshot }] }
  }
  const target: View = e.type === 'escape' ? { kind: 'home' } : e.type === 'navigate' ? e.view : currentView
  if (e.type !== 'resize' && sameView(currentView, target)) return { state: s, effects: [] }
  const from = s.kind === 'settled' ? s.snapshot : sampleTransition(s.plan, e.now - s.startedAt)
  const plan = planTransition(from, currentView, target, ctx, policy)
  return { state: { kind: 'transitioning', plan, startedAt: e.now }, effects: [{ type: 'start', plan, startedAt: e.now }] }
}
