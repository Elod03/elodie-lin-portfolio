import { describe, expect, it } from 'vitest'
import { ARRIVAL_TOTAL, CAUSTICS_FROM, CAUSTICS_TO, FILL_MS, HERO_AT, INTRO_AT, OBJECT_DURATION, OBJECT_STAGGER, causticsProgress, fillProgress, shouldPlayArrival } from './arrival'

const memory = (initial: Record<string, string> = {}) => {
  const data = { ...initial }
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v }, data }
}

describe('la piscine se remplit', () => {
  it('le bassin est vide au début et plein après 0,8 s, sans jamais redescendre', () => {
    expect(fillProgress(0)).toBe(0)
    expect(fillProgress(-50)).toBe(0)
    expect(fillProgress(FILL_MS)).toBe(1)
    expect(fillProgress(5000)).toBe(1)
    let last = 0
    for (let t = 0; t <= FILL_MS; t += 10) { const p = fillProgress(t); expect(p).toBeGreaterThanOrEqual(last); last = p }
    expect(fillProgress(FILL_MS / 2)).toBeCloseTo(.5, 2)
  })
  it('les caustiques ne s’allument qu’une fois l’eau bien montée, puis sont complètes', () => {
    expect(causticsProgress(0)).toBe(0)
    expect(causticsProgress(CAUSTICS_FROM)).toBe(0)
    expect(causticsProgress(CAUSTICS_TO)).toBe(1)
    expect(CAUSTICS_FROM).toBeGreaterThan(FILL_MS * .5)
    expect(causticsProgress((CAUSTICS_FROM + CAUSTICS_TO) / 2)).toBeGreaterThan(0)
  })
  it('l’enchaînement tient en 2,2 s : texte et objets arrivent après la montée', () => {
    expect(INTRO_AT).toBeGreaterThanOrEqual(FILL_MS)
    expect(HERO_AT).toBeGreaterThan(INTRO_AT)
    expect(ARRIVAL_TOTAL).toBeLessThanOrEqual(2200)
    expect(ARRIVAL_TOTAL).toBeGreaterThanOrEqual(HERO_AT + 900)
    expect(ARRIVAL_TOTAL).toBeGreaterThanOrEqual(INTRO_AT + 7 * OBJECT_STAGGER + OBJECT_DURATION)
  })
})

describe('première visite de la session seulement', () => {
  it('joue une fois, puis plus', () => {
    const storage = memory()
    expect(shouldPlayArrival(storage, false)).toBe(true)
    expect(shouldPlayArrival(storage, false)).toBe(false)
  })
  it('ne joue jamais en mouvement réduit, et ne consomme pas la première visite', () => {
    const storage = memory()
    expect(shouldPlayArrival(storage, true)).toBe(false)
    expect(storage.data).toEqual({})
  })
  it('un stockage indisponible ne casse rien (pas d’arrivée)', () => {
    const broken = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
    expect(shouldPlayArrival(broken, false)).toBe(false)
    expect(shouldPlayArrival(null, false)).toBe(false)
  })
})
