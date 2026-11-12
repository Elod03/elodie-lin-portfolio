export function clampFrameDelta(seconds: number) { return Math.min(1 / 30, Math.max(0, seconds)) }
export function createDprGovernor(initial: number) {
  const tiers = [2, 1.5, 1.25, 1]
  let dpr = tiers.find(value => value <= initial) ?? 1
  let slow = 0, seen = 0, pressure = false
  return {
    get dpr() { return dpr },
    /** True (once) when a whole window was slow although the pixel ratio is already at its floor. */
    consumePressure() { const was = pressure; pressure = false; return was },
    sample(frameMs: number) {
      if (frameMs > 150 || frameMs < 1) return null
      seen++; slow += frameMs > 24 ? 1 : 0
      if (seen < 180) return null
      const down = slow > seen * .7
      seen = 0; slow = 0
      if (!down) return null
      if (dpr === 1) { pressure = true; return null }
      dpr = tiers[tiers.indexOf(dpr) + 1]
      return dpr
    },
  }
}

export type CausticsLevel = 'full' | 'compact'
/** Next caustic level: drop to the compact one only when the governor has nothing left to give (DPR 1 and still slow). */
export function nextCausticsLevel(level: CausticsLevel, pressure: boolean): CausticsLevel {
  return pressure ? 'compact' : level
}
/** Caustic projector settings: a dense grid gives thin, crisp light lines; phones (and slow machines) get a lighter one. */
export function causticsSettings(width: number, _height: number, level: CausticsLevel = 'full') {
  const compact = width < 768 || level === 'compact'
  return { grid: compact ? 320 : 448, target: compact ? 768 : 1024, everyOther: compact }
}
