export type EaseName = 'linear' | 'inOutCubic'
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
export function ease(t: number, name: EaseName = 'inOutCubic') { const x = clamp01(t); return name === 'linear' ? x : x < .5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2 }
export function floatMotion(seed: number, tSec: number, amp: { posPx: number; tiltRad: number; yawRad: number }) {
  const wave = (offset: number) => .65 * Math.sin(tSec * .61 + seed * 2.399 + offset) + .35 * Math.sin(tSec * .61 * Math.SQRT2 + seed + offset * 1.7)
  return { dx: wave(0) * amp.posPx, dy: wave(2) * amp.posPx, rotX: wave(4) * amp.tiltRad, rotY: wave(6) * amp.yawRad, rotZ: wave(8) * amp.tiltRad }
}
