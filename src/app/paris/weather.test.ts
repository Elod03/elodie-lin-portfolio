import { describe, expect, it } from 'vitest'
import { CACHE_MS, isRainCode, loadParisWeather, parseWeather, readCache, writeCache, type ParisWeather } from './weather'

function memory(initial: Record<string, string> = {}): Pick<Storage, 'getItem' | 'setItem'> & { data: Record<string, string> } {
  const data = { ...initial }
  return { data, getItem: k => data[k] ?? null, setItem: (k, v) => { data[k] = v } }
}
const payload = (over: Record<string, number> = {}) => ({ current: { temperature_2m: 12.4, precipitation: 0, weather_code: 3, ...over } })

describe('isRainCode', () => {
  it('drizzle, rain, showers and thunderstorms count; clear, clouds, fog and snow do not', () => {
    for (const c of [51, 53, 55, 56, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]) expect(isRainCode(c), String(c)).toBe(true)
    for (const c of [0, 1, 2, 3, 45, 48, 71, 73, 75, 77, 85, 86]) expect(isRainCode(c), String(c)).toBe(false)
  })
})

describe('parseWeather', () => {
  it('reads the temperature (rounded) and says it is dry', () => {
    expect(parseWeather(payload())).toEqual({ temperature: 12, raining: false })
  })
  it('precipitation > 0 means rain even with a cloudy code', () => {
    expect(parseWeather(payload({ precipitation: .2 }))?.raining).toBe(true)
  })
  it('a rain code means rain even with zero precipitation', () => {
    expect(parseWeather(payload({ weather_code: 61 }))?.raining).toBe(true)
  })
  it('keeps a missing temperature as null (the rain can still be used)', () => {
    expect(parseWeather({ current: { precipitation: 1, weather_code: 3 } })).toEqual({ temperature: null, raining: true })
  })
  it('rejects anything that is not the expected shape', () => {
    for (const bad of [null, undefined, 3, 'x', {}, { current: null }, { current: 'x' }, { current: {} }, []]) expect(parseWeather(bad), JSON.stringify(bad)).toBeNull()
  })
  it('rounds negative temperatures sensibly and never returns -0', () => {
    expect(parseWeather(payload({ temperature_2m: -.3 }))?.temperature).toBe(0)
    expect(Object.is(parseWeather(payload({ temperature_2m: -.3 }))?.temperature, -0)).toBe(false)
  })
})

describe('cache', () => {
  const weather: ParisWeather = { temperature: 9, raining: true }
  it('returns what was written, for 15 minutes', () => {
    const store = memory()
    writeCache(store, weather, 1000)
    expect(readCache(store, 1000 + CACHE_MS - 1)).toEqual(weather)
    expect(readCache(store, 1000 + CACHE_MS)).toBeNull()
  })
  it('ignores a broken or foreign entry', () => {
    expect(readCache(memory({ 'portfolio-paris-weather': '{oops' }), 5)).toBeNull()
    expect(readCache(memory({ 'portfolio-paris-weather': '{"at":1,"weather":3}' }), 5)).toBeNull()
    expect(readCache(null, 5)).toBeNull()
  })
  it('survives a storage that throws', () => {
    const angry = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
    expect(readCache(angry, 5)).toBeNull()
    expect(() => writeCache(angry, weather, 5)).not.toThrow()
  })
})

describe('loadParisWeather', () => {
  const ok = (body: unknown) => (async () => ({ ok: true, json: async () => body }) as Response) as unknown as typeof fetch
  it('fetches, parses and caches', async () => {
    const store = memory(); let calls = 0
    const fetchFn = (async () => { calls++; return { ok: true, json: async () => payload() } as Response }) as unknown as typeof fetch
    expect(await loadParisWeather({ fetchFn, storage: store, now: 10 })).toEqual({ temperature: 12, raining: false })
    expect(await loadParisWeather({ fetchFn, storage: store, now: 20 })).toEqual({ temperature: 12, raining: false })
    expect(calls).toBe(1)
  })
  it('asks Open-Meteo for Paris, without a key', async () => {
    let url = ''
    const fetchFn = (async (u: string) => { url = u; return { ok: true, json: async () => payload() } as Response }) as unknown as typeof fetch
    await loadParisWeather({ fetchFn, storage: memory(), now: 1 })
    expect(url).toContain('https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522')
    expect(url).toContain('current=temperature_2m,precipitation,weather_code')
    expect(url).not.toMatch(/key|token/i)
  })
  it('returns null on a network error, a bad status, bad JSON or a wrong shape', async () => {
    const throwing = (async () => { throw new Error('offline') }) as unknown as typeof fetch
    const status = (async () => ({ ok: false, json: async () => payload() }) as Response) as unknown as typeof fetch
    const badJson = (async () => ({ ok: true, json: async (): Promise<unknown> => { throw new Error('bad') } }) as unknown as Response) as unknown as typeof fetch
    for (const fetchFn of [throwing, status, badJson, ok({ nope: 1 })]) expect(await loadParisWeather({ fetchFn, storage: memory(), now: 1 })).toBeNull()
  })
  it('gives up after the timeout (4 s in production)', async () => {
    const hanging = ((_: string, init?: RequestInit) => new Promise((_resolve, reject) => { init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))) })) as unknown as typeof fetch
    const started = Date.now()
    expect(await loadParisWeather({ fetchFn: hanging, storage: memory(), now: 1, timeoutMs: 30 })).toBeNull()
    expect(Date.now() - started).toBeLessThan(1000)
  })
  it('does not cache a failure', async () => {
    const store = memory()
    await loadParisWeather({ fetchFn: ok({ nope: 1 }), storage: store, now: 1 })
    expect(Object.keys(store.data)).toHaveLength(0)
  })
})

describe('loadParisWeather abort', () => {
  it('aborts the request when the caller aborts (page left)', async () => {
    const hanging = ((_: string, init?: RequestInit) => new Promise((_r, reject) => { init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))) })) as unknown as typeof fetch
    const controller = new AbortController()
    const pending = loadParisWeather({ fetchFn: hanging, storage: null, now: 1, signal: controller.signal })
    controller.abort()
    expect(await pending).toBeNull()
  })
})
