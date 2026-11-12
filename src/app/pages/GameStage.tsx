import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getSite } from '../../content'
import { ExperimentCanvas, gameTheme } from './ExperimentCanvas'
import '../../styles/game-stage.css'

type Site = ReturnType<typeof getSite>
type Item = Site['playground']['items'][number]

/** Icons drawn in one stroke (24 grid, 2 px), so every control speaks the same visual language. */
const ICONS: Record<string, ReactNode> = {
  pause: <path d="M9 5.5v13M15 5.5v13" />,
  play: <path d="M8 5.2v13.6a.6.6 0 0 0 .9.5l10.6-6.8a.6.6 0 0 0 0-1L8.9 4.7a.6.6 0 0 0-.9.5Z" fill="currentColor" />,
  restart: <><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4.5 4.5v4h4" /></>,
  code: <path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15" />,
  expand: <path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15" />,
  shrink: <path d="M9 4.5V9H4.5M19.5 9H15V4.5M15 19.5V15h4.5M4.5 15H9v4.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
}
const Icon = ({ name }: { name: keyof typeof ICONS }) => <svg className="game-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>

/**
 * The full-screen stage: the game as big as the screen allows, a thin bar for its name and best score,
 * the controls beside it (desktop) or under it (phones), the technique notes in a side column or a sheet.
 * Mounted with key={item.id} by the page, so each opening starts fresh. The page restores focus in onClose.
 */
export function GameStage({ site, item, tag, best, onScore, onClose }: { site: Site; item: Item; tag: string; best?: number; onScore: (id: string, score: number) => void; onClose: () => void }) {
  const ui = site.playground.ui
  const dialog = useRef<HTMLDialogElement>(null), howButton = useRef<HTMLButtonElement>(null)
  const [paused, setPaused] = useState(false), [revision, setRevision] = useState(0)
  const [how, setHow] = useState(false), [full, setFull] = useState(false)
  // Opening the notes pauses the run; closing them resumes it only if the notes were what paused it.
  const pausedByNotes = useRef(false)
  const [canFull] = useState(() => typeof document !== 'undefined' && !!document.fullscreenEnabled)
  const bestLine = best ? `${ui.best} : ${best}` : ui.notPlayed
  useEffect(() => {
    const node = dialog.current
    if (!node) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (!node.open) node.showModal()
    // Put the keyboard straight into the game.
    requestAnimationFrame(() => node.querySelector<HTMLCanvasElement>('.game-screen canvas')?.focus())
    const sync = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => { document.body.style.overflow = previous; document.removeEventListener('fullscreenchange', sync) }
  }, [])
  function close() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    dialog.current?.close(); onClose()
  }
  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else dialog.current?.requestFullscreen?.().catch(() => {})
  }
  function openNotes() {
    pausedByNotes.current = !paused
    setPaused(true); setHow(true)
  }
  function closeNotes(returnFocus = false) {
    if (pausedByNotes.current) setPaused(false)
    pausedByNotes.current = false
    setHow(false)
    if (returnFocus) howButton.current?.focus()
  }
  function togglePause() { pausedByNotes.current = false; setPaused(value => !value) }
  function restart() { pausedByNotes.current = false; setRevision(value => value + 1); setPaused(false) }
  return <dialog className="game-stage" ref={dialog} style={gameTheme(item.id)} data-notes={how} aria-labelledby="experiment-title" onCancel={event => { event.preventDefault(); close() }}>
    <header className="game-bar">
      <div className="game-name"><small>{tag}</small><h2 id="experiment-title">{item.title}</h2></div>
      <p className="game-best" data-played={!!best}>{bestLine}</p>
    </header>
    <div className="game-board"><div className="game-screen"><ExperimentCanvas key={`${item.id}-${revision}`} id={item.id} title={item.title} label={`${item.description} ${ui.hint}`} labels={ui.canvas} paused={paused} onScore={onScore} /></div></div>
    <p className="game-help"><b>{ui.controls}</b><span className="game-keys">{item.keys}</span><span className="game-touch">{item.touch}</span><span className="game-help-text">{item.description}</span></p>
    <div className="game-actions">
      <button type="button" className="game-button" aria-pressed={paused} onClick={togglePause}><Icon name={paused ? 'play' : 'pause'} /><span className="game-label">{paused ? ui.resume : ui.pause}</span></button>
      <button type="button" className="game-button" ref={howButton} aria-expanded={how} aria-controls="game-notes" onClick={() => (how ? closeNotes() : openNotes())}><Icon name="code" /><span className="game-label">{ui.how}</span></button>
      <button type="button" className="game-button" onClick={restart}><Icon name="restart" /><span className="game-label">{ui.replay}</span></button>
      {canFull && <button type="button" className="game-button game-fullscreen" aria-pressed={full} onClick={toggleFull}><Icon name={full ? 'shrink' : 'expand'} /><span className="game-label">{full ? ui.exitFullscreen : ui.fullscreen}</span></button>}
      <button type="button" className="game-close" onClick={close} aria-label={site.labels.close}><Icon name="close" /></button>
    </div>
    <aside className="game-notes" id="game-notes" hidden={!how} aria-labelledby="game-notes-title">
      <div className="game-notes-head">
        <h3 id="game-notes-title">{ui.how}</h3>
        <button type="button" className="game-notes-close" onClick={() => closeNotes(true)} aria-label={`${site.labels.close} · ${ui.how}`}><Icon name="close" /></button>
      </div>
      <p className="game-technique"><b>{ui.technique}</b>{item.technique}</p>
      <p>{item.notes}</p>
    </aside>
  </dialog>
}
