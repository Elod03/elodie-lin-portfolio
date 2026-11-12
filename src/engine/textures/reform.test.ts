import { describe, expect, it } from 'vitest'
import { SCATTER_MS, SETTLE_MS, reformPhase } from './reform'

describe('la langue qui se reforme', () => {
  it('300 ms de dispersion puis 400 ms pour se reposer', () => {
    expect(SCATTER_MS).toBe(300); expect(SETTLE_MS).toBe(400)
  })
  it('part du texte net, atteint la dispersion complète au changement de texte, finit net', () => {
    expect(reformPhase(0).amount).toBe(0)
    expect(reformPhase(SCATTER_MS).amount).toBeCloseTo(1, 9)
    expect(reformPhase(SCATTER_MS + SETTLE_MS).amount).toBeCloseTo(0, 9)
    expect(reformPhase(SCATTER_MS + SETTLE_MS).done).toBe(true)
    expect(reformPhase(100).done).toBe(false)
  })
  it('le nouveau texte est demandé exactement une fois la dispersion terminée', () => {
    expect(reformPhase(SCATTER_MS - 1).needsSwap).toBe(false)
    expect(reformPhase(SCATTER_MS).needsSwap).toBe(true)
    expect(reformPhase(SCATTER_MS + 50, SCATTER_MS).needsSwap).toBe(false)
  })
  it('monte puis redescend sans rebond (monotone de chaque côté)', () => {
    let last = 0
    for (let t = 0; t <= SCATTER_MS; t += 5) { const a = reformPhase(t).amount; expect(a).toBeGreaterThanOrEqual(last); last = a }
    for (let t = SCATTER_MS; t <= SCATTER_MS + SETTLE_MS; t += 5) { const a = reformPhase(t, SCATTER_MS).amount; expect(a).toBeLessThanOrEqual(last + 1e-9); last = a }
  })
  it('si le texte n’est pas encore prêt, la dispersion reste complète (pas de retour au net)', () => {
    expect(reformPhase(2000, null).amount).toBe(1)
    expect(reformPhase(2000, null).needsSwap).toBe(true)
  })
  it('le repos se compte depuis l’instant du changement réel du texte', () => {
    expect(reformPhase(900, 800).amount).toBeGreaterThan(.2)
    expect(reformPhase(800 + SETTLE_MS, 800).amount).toBeCloseTo(0, 9)
  })
})
