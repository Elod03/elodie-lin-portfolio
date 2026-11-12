import { describe, expect, it } from 'vitest'
import { railFraction } from './railProgress'

describe('railFraction (curseur du sommaire de l’étude de cas)', () => {
  const probe = 360
  it('reste en haut tant que la première section n’a pas atteint la ligne de lecture', () => {
    expect(railFraction({ tops: [500, 1200, 1900], probe, scrollable: true, atBottom: false })).toBe(0)
  })
  it('interpole entre deux sections', () => {
    expect(railFraction({ tops: [-340, 360, 1060], probe, scrollable: true, atBottom: false })).toBeCloseTo(.5, 5)
  })
  it('se pose sur la dernière entrée tout en bas d’une page qui défile', () => {
    expect(railFraction({ tops: [-2000, -1200, 900], probe, scrollable: true, atBottom: true })).toBe(1)
  })
  it('ne saute pas à 1 sur une page trop courte pour défiler', () => {
    expect(railFraction({ tops: [100, 500, 900], probe, scrollable: false, atBottom: true })).toBeCloseTo(.325, 5)
  })
  it('vaut 0 avec moins de deux entrées', () => {
    expect(railFraction({ tops: [0], probe, scrollable: true, atBottom: true })).toBe(0)
  })
})
