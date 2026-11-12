// The light of the pool follows the hour in Paris: clear and fresh in the morning, a little gold at the end of the afternoon.
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

/** Never more than 15 % of the colour is mixed in on screen. */
export const LIGHT_MAX_TINT = .15
export interface ParisLight { /** 0..1 golden light (late afternoon). */ warm: number; /** 0..1 clear, cool light (morning). */ cool: number }

const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
function parisParts(date: Date) {
  const get = (type: string) => Number(parts.formatToParts(date).find(p => p.type === type)?.value ?? 0)
  return { hour: get('hour') % 24, minute: get('minute'), second: get('second') }
}
/** Hour of the day in Paris, fractional (14.5 = 14:30). */
export function parisHour(date: Date): number { const p = parisParts(date); return p.hour + p.minute / 60 + p.second / 3600 }
/** "14:32", 24 h. */
export function parisClock(date: Date): string { const p = parisParts(date); return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}` }

export function parisLight(date: Date): ParisLight {
  const h = parisHour(date)
  return {
    cool: smooth(5.5, 8, h) * (1 - smooth(10.5, 13, h)),
    warm: smooth(15.5, 18, h) * (1 - smooth(20, 21.5, h)),
  }
}

/** Slow exponential glide toward the target (time constant ~12 s): the light changes without anyone seeing it move. */
export const LIGHT_GLIDE_SECONDS = 12
export function glideLight(current: ParisLight, target: ParisLight, dtSeconds: number): ParisLight {
  const k = 1 - Math.exp(-Math.max(0, dtSeconds) / LIGHT_GLIDE_SECONDS)
  const step = (a: number, b: number) => Math.abs(b - a) < .0005 ? b : a + (b - a) * k
  return { warm: step(current.warm, target.warm), cool: step(current.cool, target.cool) }
}
