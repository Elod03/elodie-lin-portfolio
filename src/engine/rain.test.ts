import { describe, expect, it } from 'vitest'
import { MAX_DROPS_PER_STEP, nextRainGap, rainDrop, stepRain, type RainState } from './rain'

function seeded(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 } }

describe('nextRainGap', () => {
  it('is irregular but bounded', () => {
    const rnd = seeded(1); const gaps = Array.from({ length: 2000 }, () => nextRainGap(rnd()))
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(40)
    expect(Math.max(...gaps)).toBeLessThanOrEqual(900)
    expect(new Set(gaps.map(g => Math.round(g / 10))).size).toBeGreaterThan(30)
  })
})

describe('rainDrop', () => {
  it('lands inside the window and stays small', () => {
    const rnd = seeded(7)
    for (let i = 0; i < 500; i++) {
      const d = rainDrop(rnd)
      expect(d.u).toBeGreaterThanOrEqual(.03); expect(d.u).toBeLessThanOrEqual(.97)
      expect(d.v).toBeGreaterThanOrEqual(.05); expect(d.v).toBeLessThanOrEqual(.95)
      expect(d.radius).toBeLessThanOrEqual(.012); expect(d.strength).toBeLessThanOrEqual(.16); expect(d.strength).toBeGreaterThan(0)
    }
  })
})

describe('stepRain', () => {
  const run = (seconds: number, frame: number, seed = 3) => {
    const rnd = seeded(seed); let state: RainState = { wait: 0 }; let drops = 0
    for (let t = 0; t < seconds * 1000; t += frame) { const r = stepRain(state, frame, rnd); state = r.state; drops += r.drops.length }
    return drops
  }
  it('a few drops per second on average (3 to 6)', () => {
    const rate = run(60, 16.7) / 60
    expect(rate).toBeGreaterThan(3); expect(rate).toBeLessThan(6)
  })
  it('does not depend on the frame rate', () => {
    const fast = run(60, 8) / 60, slow = run(60, 33) / 60
    expect(Math.abs(fast - slow)).toBeLessThan(1)
  })
  it('never dumps a burst after a long pause (tab hidden)', () => {
    const r = stepRain({ wait: 0 }, 60000, seeded(5))
    expect(r.drops.length).toBeLessThanOrEqual(MAX_DROPS_PER_STEP)
  })
  it('makes no drop when nothing is due and keeps counting down the gap', () => {
    const r = stepRain({ wait: 200 }, 100, seeded(2))
    expect(r.drops).toHaveLength(0); expect(r.state.wait).toBeCloseTo(100, 5)
  })
})
