import { useCallback, useEffect, useRef, useState } from 'react'
import { getSite, type Lang } from '../../content'
import { ExperimentCanvas, gameTheme } from './ExperimentCanvas'
import { GameStage } from './GameStage'
import { browserStorage, gameOfTheDay, readBest, saveBest, SCORING } from './playgroundData'
import '../../styles/pages.css'
import '../../styles/playground.css'

type Item = ReturnType<typeof getSite>['playground']['items'][number]
type Best = Record<string, number | undefined>

export function Playground({ lang }: { lang: Lang }) {
  const site = getSite(lang), { ui, items } = site.playground
  const [selected, setSelected] = useState<string | null>(null), [preview, setPreview] = useState<string | null>(null)
  const [best, setBest] = useState<Best>({}), [today, setToday] = useState<string>(SCORING[0]), [ready, setReady] = useState(false)
  const trigger = useRef<HTMLElement | null>(null), featureCanvas = useRef<HTMLDivElement>(null)
  const item = items.find(i => i.id === selected)
  const featured = items.find(i => i.id === today) as Item
  // Read what the browser knows only after mount, so the prerendered page and the first client render are identical.
  useEffect(() => {
    const storage = browserStorage()
    setBest(Object.fromEntries(SCORING.map(id => [id, readBest(storage, id)])))
    setToday(gameOfTheDay(new Date())); setReady(true)
  }, [])
  const record = useCallback((id: string, score: number) => {
    const saved = saveBest(browserStorage(), id, score)
    if (saved) setBest(current => ({ ...current, [id]: saved }))
  }, [])
  function openGame(id: string, from: HTMLElement) { trigger.current = from; setSelected(id); setPreview(null) }
  const bestLine = (id: string) => best[id] ? `${ui.best} : ${best[id]}` : ui.notPlayed
  const tag = (id: string) => ui.tags[items.findIndex(i => i.id === id)]
  // "Jeu · Course" → "Course": the card already says it is a game, the genre is the useful part (same separator in fr/en/zh).
  const genre = (id: string) => { const full = tag(id) ?? '', at = full.indexOf(' · '); return at < 0 ? full : full.slice(at + 3) }
  const technique = (text: string) => <span className="technique-line"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5" /></svg><span><span className="sr-only">{ui.technique}. </span>{text}</span></span>
  return <section className="playground-page">
    <div className="playground-hero">
      <header className="playground-intro">
        <h1>{site.labels.playground}</h1>
        <p>{site.playground.intro}</p>
        <ul className="playground-markers">{site.playground.markers.map(marker => <li key={marker}>{marker}</li>)}</ul>
      </header>
      <div className="playground-feature" style={gameTheme(today)}>
        <div className="feature-frame" ref={featureCanvas}>
          {ready && <ExperimentCanvas key={today} id={today} title={featured.title} label={`${featured.description} ${ui.hint}`} labels={ui.canvas} feature paused={!!selected} onScore={record} />}
          <span className="feature-badges"><span className="feature-badge">{ui.today}</span><span className="genre-chip">{genre(today)}</span></span>
        </div>
        <div className="feature-bar">
          <div className="feature-text"><strong>{featured.title}</strong><span className="feature-hook">{featured.hook}</span>{technique(featured.technique)}</div>
          <div className="feature-actions">
            <button type="button" className="btn-play" onClick={() => featureCanvas.current?.querySelector<HTMLCanvasElement>('canvas')?.focus()}>{ui.play}</button>
            <button type="button" className="btn-full" onClick={event => openGame(today, event.currentTarget)}>{ui.fullscreen}</button>
          </div>
        </div>
      </div>
    </div>
    <div className="experiment-grid">{items.map(i => <button className={`experiment-card experiment-${i.id}`} style={gameTheme(i.id)} key={i.id} onPointerEnter={event => { if (event.pointerType === 'mouse') setPreview(i.id) }} onPointerLeave={() => setPreview(null)} onFocus={() => setPreview(i.id)} onBlur={() => setPreview(null)} onClick={event => openGame(i.id, event.currentTarget)} aria-label={`${i.title} — ${ui.open}`}>
      <span className="experiment-art" aria-hidden="true"><img src={`/media/playground/${i.id}.jpg`} alt="" width="800" height="500" loading="lazy" />{preview === i.id && !selected && <ExperimentCanvas id={i.id} title={i.title} label="" labels={ui.canvas} preview />}<span className="genre-chip">{genre(i.id)}</span></span>
      <span className="experiment-body">
        <strong className="experiment-title">{i.title}</strong>
        <span className="experiment-hook">{i.hook}</span>
        {technique(i.technique)}
        <span className="experiment-foot">
          <span className="experiment-best" data-played={!!best[i.id]}>{bestLine(i.id)}</span>
          <span className="experiment-go" aria-hidden="true">{ui.play}<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>
        </span>
      </span>
    </button>)}</div>
    {item && <GameStage key={item.id} site={site} item={item} tag={tag(item.id)} best={best[item.id]} onScore={record} onClose={() => { setSelected(null); trigger.current?.focus() }} />}
  </section>
}
