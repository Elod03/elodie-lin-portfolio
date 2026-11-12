import { useEffect, useMemo, useState } from 'react'
import { parisClock, parisLight, type ParisLight } from '../../world/parisLight'
import { loadParisWeather } from '../paris/weather'

export interface ParisNow {
  /** False until the page is on screen in the browser (the prerendered HTML has no clock: it would be wrong by then). */
  ready: boolean
  clock: string
  /** Rounded °C, or null when the weather could not be read. */
  temperature: number | null
  raining: boolean
  light: ParisLight
}

/** Under ?test: ?paris=<ISO date> freezes the clock, ?temp=<n> gives a temperature, ?rain forces the rain; the network is not used. */
function testOverrides() {
  if (typeof location === 'undefined') return null
  const query = new URLSearchParams(location.search)
  if (!query.has('test')) return null
  const fixed = query.get('paris')
  const temp = query.get('temp')
  return { date: fixed ? new Date(fixed) : null, temperature: temp !== null && temp !== '' ? Number(temp) : null, rain: query.has('rain') }
}

/** Hour, weather and light in Paris: the clock follows the minute; the weather is read once (15 min cache) and a failure shows nothing. */
export function useParis(): ParisNow {
  const test = useMemo(testOverrides, [])
  const [now, setNow] = useState(() => test?.date ?? new Date())
  const [ready, setReady] = useState(false)
  const [weather, setWeather] = useState<{ temperature: number | null; raining: boolean } | null>(null)
  useEffect(() => {
    setReady(true)
    if (test?.date) return
    let timer = 0
    const tick = () => { setNow(new Date()); timer = window.setTimeout(tick, 60000 - (Date.now() % 60000) + 50) }
    tick()
    return () => window.clearTimeout(timer)
  }, [test])
  useEffect(() => {
    if (test) { setWeather({ temperature: test.temperature, raining: test.rain }); return }
    const controller = new AbortController()
    let storage: Storage | null = null
    try { storage = window.sessionStorage } catch { /* no cache */ }
    void loadParisWeather({ storage, signal: controller.signal }).then(result => { if (!controller.signal.aborted && result) setWeather(result) })
    return () => controller.abort()
  }, [test])
  const light = useMemo(() => parisLight(now), [now])
  return { ready, clock: parisClock(now), temperature: weather?.temperature ?? null, raining: weather?.raining ?? false, light }
}
