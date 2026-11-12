// Pure timing of the language change on the hero text: the dots scatter like grains (300 ms), the new text is
// baked, then the dots settle in the new language (400 ms). One pass per click, no loop, no bounce.
const ease = (x: number) => Math.min(1, Math.max(0, x))
const easeIn = (x: number) => { const t = ease(x); return t * t }
const easeOut = (x: number) => { const t = ease(x); return 1 - (1 - t) * (1 - t) }

export const SCATTER_MS = 300
export const SETTLE_MS = 400
export const REFORM_TOTAL = SCATTER_MS + SETTLE_MS

/**
 * `t`: ms since the change. `swappedAt`: ms (same clock) when the new text actually replaced the old one;
 * undefined = on schedule (at 300 ms), null = not ready yet (the dots stay scattered and `needsSwap` stays true).
 * `amount`: 0 = crisp text, 1 = fully scattered.
 */
export function reformPhase(t: number, swappedAt?: number | null): { amount: number; needsSwap: boolean; done: boolean } {
  if (t < SCATTER_MS || swappedAt === null) {
    return { amount: easeIn(t / SCATTER_MS), needsSwap: t >= SCATTER_MS, done: false }
  }
  const s = (t - Math.max(swappedAt ?? SCATTER_MS, SCATTER_MS)) / SETTLE_MS
  return { amount: 1 - easeOut(s), needsSwap: swappedAt === undefined, done: s >= 1 }
}
