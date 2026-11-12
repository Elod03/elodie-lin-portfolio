// Real weather in Paris (Open-Meteo, no key). Any failure means "no weather": nothing is shown and nothing breaks.
export const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current=temperature_2m,precipitation,weather_code'
export const CACHE_KEY = 'portfolio-paris-weather'
export const CACHE_MS = 15 * 60 * 1000
export const TIMEOUT_MS = 4000
export interface ParisWeather { temperature: number | null; raining: boolean }
type Store = Pick<Storage, 'getItem' | 'setItem'>

/** WMO codes: drizzle 51-57, rain 61-67, showers 80-82, thunderstorms 95-99. */
export function isRainCode(code: number): boolean {
  return (code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99)
}

export function parseWeather(json: unknown): ParisWeather | null {
  const current = (json as { current?: unknown } | null)?.current
  if (!current || typeof current !== 'object' || Array.isArray(current)) return null
  const { temperature_2m: t, precipitation: p, weather_code: code } = current as Record<string, unknown>
  const temperature = typeof t === 'number' && Number.isFinite(t) ? Math.round(t) + 0 : null
  const rainy = (typeof p === 'number' && p > 0) || (typeof code === 'number' && isRainCode(code))
  if (temperature === null && typeof p !== 'number' && typeof code !== 'number') return null
  return { temperature, raining: rainy }
}

export function readCache(storage: Store | null, now: number): ParisWeather | null {
  try {
    const raw = storage?.getItem(CACHE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as { at?: unknown; weather?: unknown }
    const weather = entry.weather as ParisWeather | undefined
    if (typeof entry.at !== 'number' || now - entry.at >= CACHE_MS || now < entry.at) return null
    if (!weather || typeof weather !== 'object' || typeof weather.raining !== 'boolean' || !(weather.temperature === null || typeof weather.temperature === 'number')) return null
    return weather
  } catch { return null }
}
export function writeCache(storage: Store | null, weather: ParisWeather, now: number) {
  try { storage?.setItem(CACHE_KEY, JSON.stringify({ at: now, weather })) } catch { /* no cache, no problem */ }
}

/** Cache first (15 min), then the network with a 4 s limit. Null on any failure; failures are not cached. */
export async function loadParisWeather(options: { fetchFn?: typeof fetch; storage?: Store | null; now?: number; timeoutMs?: number; signal?: AbortSignal } = {}): Promise<ParisWeather | null> {
  const { fetchFn = fetch, storage = null, now = Date.now(), timeoutMs = TIMEOUT_MS, signal } = options
  const cached = readCache(storage, now)
  if (cached) return cached
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  if (signal?.aborted) controller.abort(); else signal?.addEventListener('abort', () => controller.abort(), { once: true })
  try {
    const response = await fetchFn(WEATHER_URL, { signal: controller.signal })
    if (!response.ok) return null
    const weather = parseWeather(await response.json())
    if (weather) writeCache(storage, weather, now)
    return weather
  } catch { return null } finally { clearTimeout(timer) }
}
