export interface MotionPolicy { transitions: 'full' | 'fade'; intro: boolean; floatAmp: number; pointerWake: boolean; logoLoop: boolean; driftSpeed: number; reveal: boolean }
export function motionPolicy(reduced: boolean): MotionPolicy {
  return reduced ? { transitions: 'fade', intro: false, floatAmp: 0, pointerWake: false, logoLoop: false, driftSpeed: 0, reveal: false } : { transitions: 'full', intro: true, floatAmp: 1, pointerWake: true, logoLoop: true, driftSpeed: 60, reveal: true }
}
