import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { GAME_THEMES, type GameLabels } from '../../experiments/common'
import { mountExperiment } from '../../experiments/registry'

/** Each game carries its own colours to its card, the game of the day and the full-screen stage. */
export const gameTheme = (id: string) => { const t = GAME_THEMES[id] ?? GAME_THEMES.koi; return { '--game-a': t.a, '--game-b': t.b } as CSSProperties }

/** One game mounted on a canvas. A new seed each mount, so a replay is a new game. */
export function ExperimentCanvas({ id, title, label, labels, preview = false, paused = false, feature = false, onScore }: { id: string; title: string; label: string; labels: GameLabels; preview?: boolean; paused?: boolean; feature?: boolean; onScore?: (id: string, score: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null), runtime = useRef<ReturnType<typeof mountExperiment> | null>(null)
  const report = useRef(onScore); report.current = onScore
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (!ref.current) return
    runtime.current = mountExperiment(id, ref.current, { reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, seed: Math.floor(Math.random() * 2 ** 31), labels, title, onScore: score => report.current?.(id, score) })
    return () => { runtime.current?.dispose(); runtime.current = null }
  }, [id, labels, title])
  // The game of the day only runs while it is on screen.
  useEffect(() => {
    if (!feature || !ref.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [feature])
  useEffect(() => { runtime.current?.setPaused(paused || !visible) }, [paused, visible])
  return <canvas ref={ref} className={`experiment-canvas${feature ? ' feature-canvas' : ''}`} aria-label={preview ? undefined : label} aria-hidden={preview || undefined} tabIndex={preview ? -1 : 0} role={preview ? undefined : 'img'} />
}
