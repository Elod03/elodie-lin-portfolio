import type { Lang } from '../../world/types'

const words = {
  fr: { city: 'Paris', label: (clock: string, t: number | null) => `Heure à Paris : ${clock.replace(':', ' h ')}${t === null ? '' : `, ${t} degrés`}` },
  en: { city: 'Paris', label: (clock: string, t: number | null) => `Time in Paris: ${clock}${t === null ? '' : `, ${t} degrees Celsius`}` },
  zh: { city: '巴黎', label: (clock: string, t: number | null) => `巴黎时间 ${clock}${t === null ? '' : `，${t} 摄氏度`}` },
}

/** « Paris 14:32 · 12 °C » near the logo: the hour (and the weather) that explain the light of the pool. Without a temperature when the weather failed. */
export function ParisBadge({ lang, ready, clock, temperature }: { lang: Lang; ready: boolean; clock: string; temperature: number | null }) {
  const w = words[lang]
  // The box is always there with a fixed width (placeholder before the first client render, and while the weather is unknown),
  // so neither hydration nor the temperature arriving can move the navigation.
  if (!ready) return <span className="paris-badge" aria-hidden="true"/>
  return <span className="paris-badge" role="img" aria-label={w.label(clock, temperature)}>
    <span aria-hidden="true">{w.city} {clock}{temperature === null ? '' : <> · {temperature}<span className="paris-unit">{' '}°C</span></>}</span>
  </span>
}
