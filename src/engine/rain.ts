// Real rain on the water: drops at irregular intervals (a few per second), each a small, soft ripple.
export const RAIN_MEAN_GAP_MS = 250
export const MAX_DROPS_PER_STEP = 3
export interface RainState { /** ms left before the next drop */ wait: number }
/** A drop: position as a fraction of the visible water window, size and strength in the units of WaterSim.addDrop. */
export interface RainDrop { u: number; v: number; radius: number; strength: number }

/** Exponential gap (a Poisson rain), bounded so it is never a burst nor a long silence. */
export function nextRainGap(u: number): number {
  const gap = -Math.log(1 - Math.min(.999, Math.max(0, u))) * RAIN_MEAN_GAP_MS
  return Math.min(900, Math.max(40, gap))
}
export function rainDrop(random: () => number): RainDrop {
  return { u: .03 + random() * .94, v: .05 + random() * .9, radius: .006 + random() * .006, strength: .07 + random() * .08 }
}
/** Advances the rain by `dtMs`. A long pause (hidden tab) gives at most MAX_DROPS_PER_STEP drops, never a burst. */
export function stepRain(state: RainState, dtMs: number, random: () => number): { state: RainState; drops: RainDrop[] } {
  let wait = state.wait - Math.max(0, dtMs)
  const drops: RainDrop[] = []
  while (wait <= 0 && drops.length < MAX_DROPS_PER_STEP) { drops.push(rainDrop(random)); wait += nextRainGap(random()) }
  if (wait <= 0) wait = nextRainGap(random())
  return { state: { wait }, drops }
}
