// Sun in Paris, computed locally (NOAA simplified formulas, no API). Self-contained on purpose:
// vite.config.ts inlines this file in index.html so the night can be chosen before the first paint.
const LAT = 48.8566, LON = 2.3522
const RAD = Math.PI / 180

/** Sunrise and sunset in Paris, in minutes after 00:00 UTC of the given UTC day (Paris sunsets are always on the same UTC day). */
export function parisSunTimes(date: Date): { sunrise: number; sunset: number } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1)
  const dayOfYear = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86400000) + 1
  const g = 2 * Math.PI / 365 * (dayOfYear - 1) // fractional year at noon UTC
  const equationOfTime = 229.18 * (.000075 + .001868 * Math.cos(g) - .032077 * Math.sin(g) - .014615 * Math.cos(2 * g) - .040849 * Math.sin(2 * g))
  const declination = .006918 - .399912 * Math.cos(g) + .070257 * Math.sin(g) - .006758 * Math.cos(2 * g) + .000907 * Math.sin(2 * g) - .002697 * Math.cos(3 * g) + .00148 * Math.sin(3 * g)
  const cosHour = Math.cos(90.833 * RAD) / (Math.cos(LAT * RAD) * Math.cos(declination)) - Math.tan(LAT * RAD) * Math.tan(declination)
  const hourAngle = Math.acos(Math.min(1, Math.max(-1, cosHour))) / RAD
  return { sunrise: 720 - 4 * (LON + hourAngle) - equationOfTime, sunset: 720 - 4 * (LON - hourAngle) - equationOfTime }
}

/** True between the sunset and the sunrise in Paris. */
export function isParisNight(date: Date): boolean {
  const { sunrise, sunset } = parisSunTimes(date)
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60
  return minutes < sunrise || minutes >= sunset
}

/** First theme of a visit: a saved choice always wins; otherwise night after the sunset in Paris; otherwise the system preference. */
export function resolveInitialTheme(input: { stored: string | null; prefersDark: boolean; night: boolean }): 'day' | 'night' {
  if (input.stored === 'day' || input.stored === 'night') return input.stored
  return input.night || input.prefersDark ? 'night' : 'day'
}
