// Pure model of the water tint: the light of the water glides to a project colour while it is hovered, then back to blue.
const ease = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t) }

export const TINT_MS = 400
/** Never more than 25 % of the project colour: readable, never saturated. */
export const TINT_MAX = .25

export type Rgb = [number, number, number]
export interface TintState { fromColor: Rgb; toColor: Rgb; fromAmount: number; toAmount: number; at: number; ms: number }

export function hexToRgb(hex: string): Rgb {
  let h = hex.replace('#', '')
  if (h.length === 3) h = [...h].map(c => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16) || 0
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]
}
export const tintRest = (): TintState => ({ fromColor: [.5, .5, .5], toColor: [.5, .5, .5], fromAmount: 0, toAmount: 0, at: 0, ms: TINT_MS })

/** Current colour and strength at time `now` (ms). */
export function tintMix(state: TintState, now: number): { color: Rgb; amount: number } {
  const p = state.ms <= 0 ? 1 : ease((now - state.at) / state.ms)
  const color = state.fromColor.map((v, i) => v + (state.toColor[i] - v) * p) as Rgb
  return { color, amount: state.fromAmount + (state.toAmount - state.fromAmount) * p }
}

/** New target (a hex colour, or null to go back to blue), starting from wherever the glide is now. */
export function retarget(state: TintState, now: number, hex: string | null, reduced = false): TintState {
  const current = tintMix(state, now)
  return {
    fromColor: current.color, fromAmount: current.amount,
    toColor: hex ? hexToRgb(hex) : current.color, toAmount: hex ? TINT_MAX : 0,
    at: now, ms: reduced ? 0 : TINT_MS,
  }
}
