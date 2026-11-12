// Pure timing of the hero text: line-by-line writing and the occasional
// "end of the first name turns into bars" moment. No GL, no DOM.
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

export const REVEAL_DURATION = 900
export const MORPH_DURATION = 2000
const MORPH_RAMP = 350

/** Progress (0..1) of line `index` of `count`, `elapsed` ms after the writing started. Lines overlap, the last one ends at 900 ms. */
export function lineProgress(elapsed: number, index: number, count: number): number {
  const stagger = .35
  const length = 1 / (1 + (count - 1) * stagger)
  const start = index * stagger * length
  const p = (elapsed / REVEAL_DURATION - start) / length
  return Math.min(1, Math.max(0, p))
}

/** 0 = letters, 1 = bars; `elapsed` ms since this transformation started. */
export function morphAmount(elapsed: number): number {
  if (elapsed <= 0 || elapsed >= MORPH_DURATION) return 0
  return smooth(0, MORPH_RAMP, elapsed) * (1 - smooth(MORPH_DURATION - MORPH_RAMP, MORPH_DURATION, elapsed))
}

/** Wait before the next transformation: 8 to 14 s from a random number in [0,1]. */
export function nextMorphGap(random: number): number { return 8000 + Math.min(1, Math.max(0, random)) * 6000 }
