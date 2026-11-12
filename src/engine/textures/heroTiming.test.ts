import { describe, expect, it } from 'vitest'
import { lineProgress, morphAmount, nextMorphGap, MORPH_DURATION } from './heroTiming'

describe('écriture ligne par ligne', () => {
  it('commence vide, finit complète à 0,9 s', () => {
    for (const n of [1, 2, 4, 6]) for (let i = 0; i < n; i++) {
      expect(lineProgress(0, i, n)).toBe(0)
      expect(lineProgress(900, i, n)).toBeCloseTo(1, 9)
    }
  })
  it('les lignes démarrent l’une après l’autre et restent monotones', () => {
    const n = 4
    for (let t = 0; t <= 900; t += 30) {
      for (let i = 1; i < n; i++) expect(lineProgress(t, i, n)).toBeLessThanOrEqual(lineProgress(t, i - 1, n) + 1e-9)
    }
    expect(lineProgress(450, 0, n)).toBeGreaterThan(lineProgress(450, 3, n))
    expect(lineProgress(100, 3, n)).toBe(0)
    let last = 0
    for (let t = 0; t <= 900; t += 10) { const p = lineProgress(t, 2, n); expect(p).toBeGreaterThanOrEqual(last); last = p }
  })
})

describe('transformation en barres', () => {
  it('dure environ 2 s : monte, tient, redescend', () => {
    expect(MORPH_DURATION).toBe(2000)
    expect(morphAmount(-10)).toBe(0)
    expect(morphAmount(0)).toBe(0)
    expect(morphAmount(1000)).toBe(1)
    expect(morphAmount(2000)).toBe(0)
    expect(morphAmount(2500)).toBe(0)
    expect(morphAmount(175)).toBeGreaterThan(0.3)
    expect(morphAmount(175)).toBeLessThan(0.7)
  })
  it('l’attente est aléatoire entre 8 et 14 s', () => {
    expect(nextMorphGap(0)).toBe(8000)
    expect(nextMorphGap(1)).toBe(14000)
    expect(nextMorphGap(0.5)).toBe(11000)
    expect(nextMorphGap(0.25)).not.toBe(nextMorphGap(0.75))
  })
})
