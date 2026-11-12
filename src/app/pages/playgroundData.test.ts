import { describe, expect, it } from 'vitest'
import { gameOfTheDay, readBest, saveBest, SCORING } from './playgroundData'

const memory = (initial: Record<string, string> = {}) => { const data = { ...initial }; return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v }, data } }

describe('game of the day', () => {
  it('is one of the six games and changes every day, cycling', () => {
    const picks = Array.from({ length: 7 }, (_, n) => gameOfTheDay(new Date(2026, 10, 4 + n)))
    for (const pick of picks) expect(SCORING).toContain(pick)
    expect(new Set(picks.slice(0, 6)).size).toBe(6)
    expect(picks[6]).toBe(picks[0])
  })
  it('is stable within a day', () => {
    expect(gameOfTheDay(new Date(2026, 10, 4, 1))).toBe(gameOfTheDay(new Date(2026, 10, 4, 23, 59)))
  })
})
describe('best scores', () => {
  it('reads nothing before a first game, and keeps only improvements', () => {
    const store = memory()
    expect(readBest(store, 'koi')).toBeUndefined()
    expect(saveBest(store, 'koi', 300)).toBe(300)
    expect(saveBest(store, 'koi', 200)).toBeUndefined()
    expect(readBest(store, 'koi')).toBe(300)
    expect(saveBest(store, 'koi', 500)).toBe(500)
    expect(readBest(store, 'encre')).toBeUndefined()
  })
  it('ignores zero, junk and a missing or throwing storage', () => {
    expect(saveBest(memory(), 'koi', 0)).toBeUndefined()
    expect(readBest(memory({ 'playground-best-koi': 'abc' }), 'koi')).toBeUndefined()
    expect(readBest(undefined, 'koi')).toBeUndefined()
    expect(saveBest(undefined, 'koi', 100)).toBeUndefined()
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(readBest(broken, 'koi')).toBeUndefined(); expect(saveBest(broken, 'koi', 100)).toBeUndefined()
  })
})
