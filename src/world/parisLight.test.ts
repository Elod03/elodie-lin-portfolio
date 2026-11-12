import { describe, expect, it } from 'vitest'
import { glideLight, LIGHT_MAX_TINT, parisClock, parisHour, parisLight } from './parisLight'

const at = (iso: string) => new Date(iso)

describe('parisHour / parisClock', () => {
  it('reads the hour in Paris, not in the visitor time zone (summer = UTC+2)', () => {
    expect(parisHour(at('2026-07-01T12:32:00Z'))).toBeCloseTo(14 + 32 / 60, 3)
    expect(parisClock(at('2026-07-01T12:32:00Z'))).toBe('14:32')
  })
  it('winter = UTC+1', () => {
    expect(parisClock(at('2026-01-15T13:05:00Z'))).toBe('14:05')
  })
  it('midnight is 00:00, never 24:00', () => {
    expect(parisClock(at('2026-01-14T23:00:00Z'))).toBe('00:00')
  })
})

describe('parisLight', () => {
  it('morning is cool and clear, with no gold', () => {
    const l = parisLight(at('2026-06-10T06:30:00Z')) // 08:30 Paris
    expect(l.cool).toBeGreaterThan(.9); expect(l.warm).toBe(0)
  })
  it('early afternoon is neutral', () => {
    const l = parisLight(at('2026-06-10T12:30:00Z')) // 14:30 Paris
    expect(l.cool).toBeLessThan(.02); expect(l.warm).toBeLessThan(.3)
  })
  it('late afternoon turns golden', () => {
    const l = parisLight(at('2026-06-10T16:00:00Z')) // 18:00 Paris
    expect(l.warm).toBeGreaterThan(.9); expect(l.cool).toBe(0)
  })
  it('the evening and the night are neutral again (night mode takes over)', () => {
    const l = parisLight(at('2026-06-10T22:30:00Z')) // 00:30 Paris
    expect(l.warm).toBe(0); expect(l.cool).toBe(0)
  })
  it('follows the Paris hour, summer and winter', () => {
    expect(parisLight(at('2026-07-01T16:00:00Z')).warm).toBeGreaterThan(.9) // 18:00 CEST
    expect(parisLight(at('2026-01-15T17:00:00Z')).warm).toBeGreaterThan(.9) // 18:00 CET
    expect(parisLight(at('2026-01-15T16:00:00Z')).warm).toBeLessThan(parisLight(at('2026-01-15T17:00:00Z')).warm) // 17:00 CET is less golden
  })
  it('stays in 0..1 over the whole day and is continuous (no jump between two minutes)', () => {
    const start = at('2026-06-10T00:00:00Z').getTime()
    let previous = parisLight(new Date(start))
    for (let m = 1; m < 24 * 60; m++) {
      const l = parisLight(new Date(start + m * 60000))
      for (const k of ['warm', 'cool'] as const) {
        expect(l[k]).toBeGreaterThanOrEqual(0); expect(l[k]).toBeLessThanOrEqual(1)
        expect(Math.abs(l[k] - previous[k])).toBeLessThan(.03)
      }
      previous = l
    }
  })
  it('the tint on screen never exceeds 15 %', () => { expect(LIGHT_MAX_TINT).toBeLessThanOrEqual(.15) })
})

describe('glideLight', () => {
  it('moves toward the target without overshoot and without a jump', () => {
    let l = { warm: 0, cool: 1 }
    const target = { warm: 1, cool: 0 }
    const first = glideLight(l, target, 1 / 60)
    expect(first.warm).toBeGreaterThan(0); expect(first.warm).toBeLessThan(.01)
    for (let i = 0; i < 60 * 60; i++) { l = glideLight(l, target, 1 / 60); expect(l.warm).toBeLessThanOrEqual(1) }
    expect(l.warm).toBeGreaterThan(.99)
  })
  it('takes several seconds (slow), not a blink', () => {
    let l = { warm: 0, cool: 0 }
    for (let i = 0; i < 60; i++) l = glideLight(l, { warm: 1, cool: 0 }, 1 / 60) // 1 s
    expect(l.warm).toBeLessThan(.3)
  })
})
