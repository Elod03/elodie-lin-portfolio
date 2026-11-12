import { describe, expect, it } from 'vitest'
import { TINT_MAX, TINT_MS, hexToRgb, retarget, tintMix, tintRest } from './waterTint'

describe('l’eau prend la couleur du projet', () => {
  const red = '#be2942'
  it('hexToRgb lit #rrggbb en 0..1', () => {
    expect(hexToRgb('#ff0000')).toEqual([1, 0, 0])
    expect(hexToRgb('#000')).toEqual([0, 0, 0])
  })
  it('au repos : aucune teinte', () => { expect(tintMix(tintRest(), 1234).amount).toBe(0) })
  it('glisse en 400 ms vers un mélange faible (≤ 25 %), sans dépasser', () => {
    const s = retarget(tintRest(), 1000, red)
    expect(tintMix(s, 1000).amount).toBe(0)
    const mid = tintMix(s, 1000 + TINT_MS / 2).amount
    expect(mid).toBeGreaterThan(0); expect(mid).toBeLessThan(TINT_MAX)
    expect(tintMix(s, 1000 + TINT_MS).amount).toBeCloseTo(TINT_MAX, 9)
    expect(tintMix(s, 9000).amount).toBeCloseTo(TINT_MAX, 9)
    expect(TINT_MAX).toBeLessThanOrEqual(.25)
    let last = 0
    for (let t = 0; t <= TINT_MS; t += 8) { const a = tintMix(s, 1000 + t).amount; expect(a).toBeGreaterThanOrEqual(last); last = a }
  })
  it('revient au bleu à la sortie, depuis là où il en est', () => {
    const s = retarget(tintRest(), 0, red)
    const half = tintMix(s, TINT_MS / 2).amount
    const back = retarget(s, TINT_MS / 2, null)
    expect(tintMix(back, TINT_MS / 2).amount).toBeCloseTo(half, 9)
    expect(tintMix(back, TINT_MS / 2 + TINT_MS).amount).toBeCloseTo(0, 9)
  })
  it('d’un projet à l’autre, la couleur glisse sans repasser par zéro', () => {
    const a = retarget(tintRest(), 0, red)
    const b = retarget(a, 5000, '#514c8b')
    const mid = tintMix(b, 5000 + TINT_MS / 2)
    expect(mid.amount).toBeCloseTo(TINT_MAX, 9)
    const [r0] = hexToRgb(red), [r1] = hexToRgb('#514c8b')
    expect(mid.color[0]).toBeLessThan(r0); expect(mid.color[0]).toBeGreaterThan(r1)
  })
  it('mouvement réduit : bascule directe', () => {
    const s = retarget(tintRest(), 100, red, true)
    expect(tintMix(s, 100).amount).toBeCloseTo(TINT_MAX, 9)
  })
})
