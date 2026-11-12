// Pure timing of the arrival ("the pool fills up"). No GL, no DOM.
// 0 .. 0.8 s  the water rises (a waterline sweeps the pool from the bottom to the top)
// 0.55 .. 1.05 s  the caustics light up
// 0.8 s  the toys land (compressed stagger), 1.0 s  the hero text starts writing (0.9 s)
const ease = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t) }

export const FILL_MS = 800
export const CAUSTICS_FROM = 550
export const CAUSTICS_TO = 1050
export const INTRO_AT = 800
export const HERO_AT = 1000
/** Object intro during the arrival: tighter than the usual 90 ms stagger / 950 ms flight so the whole thing fits in ~2 s. */
export const OBJECT_STAGGER = 55
export const OBJECT_DURATION = 780
export const ARRIVAL_TOTAL = 2000
export const ARRIVAL_STORAGE_KEY = 'portfolio.arrived'

/** Water level, 0 (dry basin) to 1 (full), `t` ms after the arrival started. */
export function fillProgress(t: number): number { return ease(t / FILL_MS) }
/** Strength of the caustics, 0 to 1. */
export function causticsProgress(t: number): number { return ease((t - CAUSTICS_FROM) / (CAUSTICS_TO - CAUSTICS_FROM)) }

type Store = Pick<Storage, 'getItem' | 'setItem'>
/** True only on the first load of the session (and never with reduced motion); marks the session as arrived. */
export function shouldPlayArrival(storage: Store | null, reduced: boolean): boolean {
  if (reduced || !storage) return false
  try {
    if (storage.getItem(ARRIVAL_STORAGE_KEY)) return false
    storage.setItem(ARRIVAL_STORAGE_KEY, '1')
    return true
  } catch { return false }
}
