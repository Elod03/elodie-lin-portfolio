import { describe, expect, it } from 'vitest'
import { causticsSettings, nextCausticsLevel, clampFrameDelta, createDprGovernor } from './quality'
describe('frame timing', () => {
  it('clamps time after a hidden tab and rejects negative deltas', () => {
    expect(clampFrameDelta(10)).toBe(1 / 30)
    expect(clampFrameDelta(-1)).toBe(0)
    expect(clampFrameDelta(1 / 120)).toBe(1 / 120)
  })
  it('reduces pixel ratio only after sustained slow frames', () => {
    const quality = createDprGovernor(3)
    expect(quality.dpr).toBe(2)
    for (let i = 0; i < 179; i++) expect(quality.sample(30)).toBeNull()
    expect(quality.sample(30)).toBe(1.5)
    for (let i = 0; i < 1000; i++) quality.sample(30)
    expect(quality.dpr).toBe(1)
  })
  it('ignores stalls and does not reduce quality on fast frames', () => {
    const quality = createDprGovernor(1.5)
    for (let i = 0; i < 1000; i++) { quality.sample(1000); quality.sample(16) }
    expect(quality.dpr).toBe(1.5)
  })
})

describe('caustics quality', () => {
  it('uses a dense grid and a 1024 target on desktop', () => {
    expect(causticsSettings(1440, 900)).toEqual({ grid: 448, target: 1024, everyOther: false })
  })
  it('lightens the grid, the target and the cadence on a phone', () => {
    const phone = causticsSettings(390, 844)
    expect(phone).toEqual({ grid: 320, target: 768, everyOther: true })
  })
  it('never exceeds the target size and keeps a minimum on tiny viewports', () => {
    expect(causticsSettings(4000, 2000).target).toBe(1024)
    expect(causticsSettings(100, 100).target).toBeGreaterThanOrEqual(128)
  })
})

describe('caustics fallback when DPR is exhausted', () => {
  it('flags pressure only when slow at DPR 1, once per window', () => {
    const quality = createDprGovernor(1)
    for (let i = 0; i < 179; i++) quality.sample(30)
    expect(quality.consumePressure()).toBe(false)
    expect(quality.sample(30)).toBeNull()
    expect(quality.consumePressure()).toBe(true)
    expect(quality.consumePressure()).toBe(false)
  })
  it('does not flag pressure while DPR can still go down, nor on fast frames', () => {
    const quality = createDprGovernor(1.5)
    for (let i = 0; i < 180; i++) quality.sample(30)
    expect(quality.dpr).toBe(1.25)
    expect(quality.consumePressure()).toBe(false)
    const fast = createDprGovernor(1)
    for (let i = 0; i < 400; i++) fast.sample(16)
    expect(fast.consumePressure()).toBe(false)
  })
  it('switches to compact on pressure and never goes back up', () => {
    expect(nextCausticsLevel('full', false)).toBe('full')
    expect(nextCausticsLevel('full', true)).toBe('compact')
    expect(nextCausticsLevel('compact', false)).toBe('compact')
    expect(causticsSettings(1440, 900, 'compact')).toEqual({ grid: 320, target: 768, everyOther: true })
    expect(causticsSettings(1440, 900, 'full')).toEqual({ grid: 448, target: 1024, everyOther: false })
  })
})
