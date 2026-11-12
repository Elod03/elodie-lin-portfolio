import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import type { PoolEngine, ObjectScreenState } from '../engine/types'
import { getSite, projectSlugs } from '../content'
import { archiveProjects, archiveCopy } from '../content/archive'
import '../styles/projects.css'
import { buildRoute, type Route } from '../world/routes'
import { bandGone } from '../world/frame'
import { initDirector, reduce, type DirectorState } from '../world/director'
import { motionPolicy } from '../world/motionPolicy'
import { shouldPlayArrival } from '../engine/arrival'
import { sampleTransition, snapshotFor, type Snapshot } from '../world/transitions'
import { placePeekCard } from '../world/peek'
import type { LayoutContext, ObjectId, Theme } from '../world/types'
import { LANDED_EVENT, type LandedDetail } from './ui/WaterLight'

interface Props { route: Route; /** 404 : la piscine reste affichée mais aucun objet n'est actif. */ inert?: boolean; theme: Theme; /** Lumière de l'heure à Paris. */ light: { warm: number; cool: number }; /** Il pleut à Paris. */ rain: boolean; onCloud: () => void; lines: readonly string[]; sent?: { line: string; id: number } }
const defaultContext: LayoutContext = { viewport: { w: 1440, h: 900, dpr: 1 }, projectSlugs, logoRect: { x: 24, y: 16, w: 80, h: 44 } }
const context = (): LayoutContext => {
  // The header navigation only counts when it sits in the bar: not below 1040 px, not as the open mobile sheet.
  const barNav = window.innerWidth >= 1040 && document.querySelector('.site-header')?.getAttribute('data-menu-open') !== 'true'
  const nav = barNav ? document.querySelector<HTMLElement>('.primary-nav')?.getBoundingClientRect() : undefined
  const controls = document.querySelector<HTMLElement>('.header-controls')?.getBoundingClientRect()
  return { viewport: { w: window.innerWidth, h: window.innerHeight, dpr: Math.min(2, window.devicePixelRatio || 1) }, projectSlugs, logoRect: { x: 24, y: 16, w: 80, h: 44 }, navRight: nav && nav.width > 0 && nav.top < 80 ? nav.right : undefined, controlsLeft: controls && controls.width > 0 && controls.top < 80 ? controls.left : undefined }
}
/** Project colours (water tint on hover). */
const projectColors = Object.fromEntries(getSite('fr').shared.projects.map(p => [p.slug, p.color]))
const projectFaces = Object.fromEntries(getSite('fr').shared.projects.map(p => [p.slug, p.iconFace]))
function sessionStore(): Storage | null { try { return window.sessionStorage } catch { return null } }
/** Hero text for the engine; the end of the first name turns into bars now and then (not in Chinese). */
function heroSpec(lang: Route['lang'], hero: { title: string; lines: string[] }) {
  return { lang, title: hero.title, lines: hero.lines, morphTail: lang === 'zh' ? undefined : 'ie.' }
}

export function EngineHost({ route, inert, theme, light, rain, onCloud, lines, sent }: Props) {
  const site = getSite(route.lang)
  const latest = useRef({ route, theme, lines, light, rain, inert }); latest.current = { route, theme, lines, light, rain, inert }
  const canvas = useRef<HTMLCanvasElement>(null), floor = useRef<HTMLDivElement>(null)
  const links = useRef(new Map<ObjectId, HTMLAnchorElement | HTMLButtonElement>())
  const engine = useRef<PoolEngine | null>(null)
  const navigate = useRef<((route: Route) => void) | null>(null)
  // Click dive: one navigation at a time, and the pending timer is cleared on unmount.
  const diveTimer = useRef(0)
  const navigating = useRef(false)
  const [ready, setReady] = useState(false)
  // Only when WebGL is unavailable or lost does the HTML copy of the hero text become visible.
  const [failed, setFailed] = useState(false)
  const [peek, setPeek] = useState<{ id: string; x: number; y: number } | null>(null)
  const initial = snapshotFor(route.view, defaultContext)
  useEffect(() => {
    let disposed = false, raf = 0, generation = 0, currentCtx = context()
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    let policy = motionPolicy(media.matches)
    // A real back/forward press is a trusted popstate; our own link navigation dispatches a synthetic one.
    let trustedPop = false, firstLanded = false
    const trackPop = (event: PopStateEvent) => { trustedPop = event.isTrusted }
    window.addEventListener('popstate', trackPop, true)
    let director: DirectorState = initDirector(latest.current.route.view, currentCtx)
    const applyObjects = (objects: readonly ObjectScreenState[]) => {
      for (const o of objects) {
        const link = links.current.get(o.id)
        if (!link) continue
        Object.assign(link.style, { left: `${o.x}px`, top: `${o.y}px`, width: `${o.radius * 2}px`, height: `${o.radius * 2}px` })
        link.style.setProperty('--label-offset', `${o.labelY - o.y}px`)
        link.hidden = !o.visible
      }
    }
    const applySnapshot = (s: Snapshot) => {
      if (floor.current) {
        const { rect, radii, visible } = s.frame
        Object.assign(floor.current.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px`, borderRadius: `${radii.tl}px ${radii.tr}px ${radii.br}px ${radii.bl}px`, display: visible ? 'block' : 'none' })
      }
      if (!engine.current) applyObjects(s.objects.map(o => ({ id: o.id, x: o.x, y: o.y, radius: o.size / 2, labelY: o.y + o.size / 2 + 14, visible: o.visible })))
    }
    function tick(now: number) {
      if (director.kind !== 'transitioning') return
      const sampled = sampleTransition(director.plan, now - director.startedAt)
      applySnapshot(sampled)
      const content = document.getElementById('main')
      if (content) {
        const arrival = 1 - Math.pow(1 - sampled.contentIn, 3)
        const entering = director.plan.toView.kind
        content.style.opacity = String(arrival)
        content.style.transform = policy.reveal && !sampled.done
          ? entering === 'playground'
            ? `translate3d(0,${(1 - arrival) * 64}px,0)`
            : entering === 'about'
              ? `translate3d(${(1 - arrival) * 56}px,0,0)`
              : `translate3d(0,${(1 - arrival) * 36}px,0)`
          : ''
      }
      director = reduce(director, { type: 'tick', now }, currentCtx, policy).state
      if (director.kind === 'transitioning') raf = requestAnimationFrame(tick)
      else landed()
    }
    /** The page has landed (transition over, or first load): the arrival reflex of the water light can play (never after back/forward). */
    function landed() {
      const { route: current, inert: notFound } = latest.current
      window.dispatchEvent(new CustomEvent<LandedDetail>(LANDED_EVENT, { detail: { view: notFound ? 'not-found' : current.view.kind, back: trustedPop } }))
      trustedPop = false
    }
    const dispatch = (event: Parameters<typeof reduce>[1]) => {
      cancelAnimationFrame(raf)
      const result = reduce(director, event, currentCtx, policy); director = result.state
      for (const effect of result.effects) {
        if (effect.type === 'start') { engine.current?.transitionTo(effect.plan, effect.startedAt); const content = document.getElementById('main'); if (content) content.style.opacity = '0' }
        if (effect.type === 'snap') { engine.current?.snapTo(effect.view, effect.snapshot); applySnapshot(effect.snapshot) }
      }
      if (director.kind === 'transitioning') raf = requestAnimationFrame(tick)
      else applySnapshot(director.snapshot)
    }
    navigate.current = next => dispatch({ type: 'navigate', view: next.view, now: performance.now() })
    const resize = () => { currentCtx = context(); engine.current?.resize(currentCtx.viewport); dispatch({ type: 'resize', now: performance.now() }) }
    const pointer = (e: PointerEvent) => { if (policy.pointerWake) engine.current?.pointer.move(e.clientX, e.clientY) }
    // The About band sends its scrolling here: the water under the page answers with a wake.
    const wake = (e: Event) => { const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail; if (policy.pointerWake) engine.current?.pointer.move(x, y) }
    const leave = () => engine.current?.pointer.leave()
    const changeMotion = () => { policy = motionPolicy(media.matches); setReady(false); engine.current?.dispose(); engine.current = null; applySnapshot(snapshotFor(latest.current.route.view, currentCtx)); void initialize() }
    async function initialize() {
      const version = ++generation
      try {
        const module = await import('../engine')
        if (disposed || version !== generation || !canvas.current || !module.canRunPoolEngine().ok || new URLSearchParams(location.search).has('fallback')) { if (!disposed && version === generation) setFailed(true); return }
        const current = latest.current, copy = getSite(current.route.lang)
        const snapshot = snapshotFor(current.route.view, currentCtx)
        // First load of the session on the home page: the pool fills up. (Under ?test it stays off unless ?arrival is also there.)
        const query = new URLSearchParams(location.search)
        const arrival = current.route.view.kind === 'home' && policy.intro && !(query.has('test') && !query.has('arrival')) && shouldPlayArrival(sessionStore(), media.matches)
        const pool = module.createPoolEngine(canvas.current, { viewport: currentCtx.viewport, projectSlugs, projectColors, projectFaces, arrival, theme: current.theme, light: current.light, rain: current.rain, reducedMotion: media.matches, heroText: heroSpec(current.route.lang, copy.hero), snapshot })
        engine.current = pool
        pool.on('objects', applyObjects)
        pool.on('error', () => { if (!disposed) { setReady(false); setFailed(true); pool.dispose(); engine.current = null; applySnapshot(snapshotFor(latest.current.route.view, currentCtx)) } })
        pool.on('contextlost', () => { if (!disposed) { setReady(false); setFailed(true) } })
        pool.on('contextrestored', () => { if (!disposed) { setReady(true); setFailed(false) } })
        await pool.ready
        if (disposed || version !== generation) { pool.dispose(); return }
        pool.setTheme(latest.current.theme, { durationMs: 0 })
        const latestCopy = getSite(latest.current.route.lang)
        await pool.setHeroText(heroSpec(latest.current.route.lang, latestCopy.hero))
        if (disposed || version !== generation) { pool.dispose(); return }
        pool.setGuestbookLines(latest.current.lines)
        setReady(true); setFailed(false)
        if (latest.current.route.view.kind === 'home' && policy.intro) {
          // A click or a key press skips the arrival.
          const skip = (event: Event) => { if (event instanceof KeyboardEvent && !['Escape', 'Enter', ' '].includes(event.key)) return; pool.skipIntro() }, stop = () => { window.removeEventListener('pointerdown', skip); window.removeEventListener('keydown', skip) }
          if (arrival) { window.addEventListener('pointerdown', skip); window.addEventListener('keydown', skip) }
          void pool.playIntro().then(stop)
        } else pool.revealHero()
      } catch { if (!disposed) { engine.current?.dispose(); engine.current = null; setReady(false); setFailed(true); applySnapshot(snapshotFor(latest.current.route.view, currentCtx)) } }
    }
    applySnapshot(snapshotFor(latest.current.route.view, currentCtx)); void initialize().finally(() => { if (!disposed) firstLand() })
    const firstLand = () => { if (firstLanded) return; firstLanded = true; landed() }
    const cancelDive = () => { window.clearTimeout(diveTimer.current); navigating.current = false }
    window.addEventListener('popstate', cancelDive)
    window.addEventListener('resize', resize); window.addEventListener('pointermove', pointer, { passive: true }); window.addEventListener('pool:wake', wake)
    document.documentElement.addEventListener('pointerleave', leave); media.addEventListener('change', changeMotion)
    return () => { disposed = true; cancelAnimationFrame(raf); window.clearTimeout(diveTimer.current); navigating.current = false; navigate.current = null; window.removeEventListener('popstate', cancelDive); window.removeEventListener('popstate', trackPop, true); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', pointer); window.removeEventListener('pool:wake', wake); document.documentElement.removeEventListener('pointerleave', leave); media.removeEventListener('change', changeMotion); engine.current?.dispose(); engine.current = null }
  }, [])
  // The hover is over once we navigate (the object link is hidden, so no pointerleave comes): the water goes back to blue.
  useEffect(() => { navigate.current?.(route); setPeek(null); engine.current?.setHovered(null) }, [route.view.kind, route.view.kind === 'project' ? route.view.slug : ''])
  // Desktop Playground and every phone page: the water strip is glued to the top of the page and scrolls away with it
  // (y = base - scrollY, the same thing computeFrame does with ctx.scrollY, done here with one transform so the engine is not re-laid-out on each scroll).
  // On a phone, once the band has fully left the screen it is hidden, so its objects cannot be tapped.
  useEffect(() => {
    if (route.view.kind === 'home') return
    const scene = document.querySelector<HTMLElement>('.scene')
    if (!scene) return
    const follow = () => {
      const phone = window.innerWidth < 768
      if (!phone && route.view.kind !== 'playground') { scene.style.transform = ''; scene.style.visibility = ''; return }
      scene.style.transform = `translate3d(0,${-Math.round(window.scrollY)}px,0)`
      scene.style.visibility = phone && bandGone(window.scrollY) ? 'hidden' : ''
    }
    follow(); window.addEventListener('scroll', follow, { passive: true }); window.addEventListener('resize', follow)
    return () => { window.removeEventListener('scroll', follow); window.removeEventListener('resize', follow); scene.style.transform = ''; scene.style.visibility = '' }
  }, [route.view.kind])
  useEffect(() => { engine.current?.setTheme(theme) }, [theme])
  // Hour and weather in Paris: the light glides slowly, the rain starts and stops.
  useEffect(() => { engine.current?.setLight(light) }, [light.warm, light.cool])
  useEffect(() => { engine.current?.setRain(rain) }, [rain])
  useEffect(() => { void engine.current?.setHeroText(heroSpec(route.lang, site.hero)) }, [route.lang])
  // The navigation width depends on the language: re-measure it (the strip starts to its right).
  useEffect(() => { const id = requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))); return () => cancelAnimationFrame(id) }, [route.lang])
  useEffect(() => { engine.current?.setGuestbookLines(lines) }, [lines])
  // A message just sent leaves from the cloud (declared after the lines effect so the line is already known).
  useEffect(() => { if (sent) engine.current?.launchGuestbookLine(sent.line) }, [sent?.id])
  const objectViews = [
    { id: 'avatar' as ObjectId, label: site.labels.about, view: { kind: 'about' as const }, face: 'elo.' },
    ...site.shared.projects.map(p => ({ id: `project:${p.slug}` as ObjectId, label: p.name, view: { kind: 'project' as const, slug: p.slug }, face: p.name, image: p.iconFace })),
    { id: 'duck' as ObjectId, label: site.labels.playground, view: { kind: 'playground' as const }, face: '↗' },
  ]
  function hover(id: ObjectId, element: HTMLElement) {
    engine.current?.setHovered(id)
    if (matchMedia('(pointer: coarse)').matches || id === 'cloud') return
    const rect = element.getBoundingClientRect()
    const anchor = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, radius: rect.width / 2 }
    const size = id === 'avatar' ? { w: 290, h: 222 } : id === 'duck' ? { w: 270, h: 200 } : { w: 260, h: 190 }
    const point = placePeekCard(anchor, route.view, context().viewport, size, id === 'avatar' ? 'below-right' : undefined)
    setPeek({ id: id.startsWith('project:') ? id.slice(8) : id, x: point.x, y: point.y })
  }
  /** Click feedback: the object dips and the wave starts, then the navigation follows (220 ms later, only if the dip played). */
  function dive(id: ObjectId, event: MouseEvent<HTMLElement>, href?: string) {
    const anchor = event.currentTarget as HTMLAnchorElement
    const plain = !!href && !anchor.target && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
    if (plain && navigating.current) { event.preventDefault(); return }
    const played = engine.current?.dive(id) ?? false
    if (!played || !plain) return
    event.preventDefault()
    navigating.current = true
    diveTimer.current = window.setTimeout(() => { navigating.current = false; history.pushState(null, '', href); window.dispatchEvent(new PopStateEvent('popstate')) }, 220)
  }
  function clearHover() { setPeek(null); engine.current?.setHovered(null) }
  const linkStyle = (id: ObjectId): CSSProperties => {
    const object = initial.objects.find(o => o.id === id)!
    return { left: `${object.x / 14.4}%`, top: `${object.y / 9}%`, width: `max(44px,${object.size / 14.4}vw)`, height: `max(44px,${object.size / 14.4}vw)`, '--label-offset': `calc(${object.size / 28.8}vw + 14px)` } as CSSProperties
  }
  const preview = peek && archiveProjects.find(p => p.slug === peek.id)
  const peekWords = { fr: { about: 'QUI JE SUIS', play: 'JEUX' }, en: { about: 'WHO I AM', play: 'GAMES' }, zh: { about: '关于我', play: '游戏' } }[route.lang]
  return <div className="scene" data-ready={ready} data-fallback={failed} data-view={route.view.kind} data-inert={inert || undefined}>
    <canvas ref={canvas} className="pool-canvas" aria-hidden="true" />
    <div ref={floor} className="static-pool" aria-hidden="true" style={{ left: `${initial.frame.rect.x / 14.4}%`, top: `${initial.frame.rect.y / 9}%`, width: `${initial.frame.rect.w / 14.4}%`, height: `${initial.frame.rect.h / 9}%`, display: initial.frame.visible ? 'block' : 'none' }}>
      {route.view.kind === 'home' && <div className="static-hero" aria-hidden="true"><strong>{site.hero.title}</strong><p>{site.hero.lines.map((line, i) => <span key={i}>{line}<br/></span>)}</p></div>}
    </div>
    <nav className="object-links" inert={inert} aria-hidden={inert || undefined} aria-label={route.lang === 'fr' ? 'Explorer le portfolio' : route.lang === 'en' ? 'Explore the portfolio' : '探索作品集'}>
      {objectViews.map(o => <a key={o.id} ref={node => { if (node) links.current.set(o.id, node); else links.current.delete(o.id) }} className={`object-link object-${o.id.split(':')[0]}`} href={buildRoute({ lang: route.lang, view: o.view })} style={linkStyle(o.id)} hidden={!initial.objects.find(p => p.id === o.id)?.visible} onClick={e => dive(o.id, e, buildRoute({ lang: route.lang, view: o.view }))} onPointerEnter={e => hover(o.id, e.currentTarget)} onPointerLeave={clearHover} onFocus={e => hover(o.id, e.currentTarget)} onBlur={clearHover}>
        <span className="fallback-object" aria-hidden="true">{'image' in o ? <img src={o.image} alt=""/> : o.face}</span><span className="object-label">{o.label}</span>
      </a>)}
      <button ref={node => { if (node) links.current.set('cloud', node); else links.current.delete('cloud') }} type="button" className="object-link object-cloud" style={linkStyle('cloud')} hidden={route.view.kind !== 'home'} onClick={e => { dive('cloud', e); onCloud() }} onPointerEnter={() => engine.current?.setHovered('cloud')} onPointerLeave={clearHover}>
        <span className="fallback-object" aria-hidden="true">···</span><span className="object-label">{site.labels.guestbook}</span>
      </button>
    </nav>
    {peek?.id === 'avatar' && <div className="peek-card peek-about" style={{ left: peek.x, top: peek.y }} aria-hidden="true"><div className="peek-visual"><img src="/media/elodie.jpg" alt="" width="440" height="560"/></div><div className="peek-caption"><strong>{site.labels.about}</strong><span className="peek-kind">{peekWords.about}</span></div></div>}
    {peek?.id === 'duck' && <div className="peek-card peek-play" style={{ left: peek.x, top: peek.y }} aria-hidden="true"><div className="peek-visual peek-montage"><img src="/media/playground/koi.jpg" alt=""/><img src="/media/playground/encre.jpg" alt=""/><img src="/media/playground/bulles.jpg" alt=""/></div><div className="peek-caption"><strong>{site.labels.playground}</strong><span className="peek-kind">{peekWords.play}</span></div></div>}
    {preview && peek && <div className="peek-card" style={{ left: peek.x, top: peek.y }} aria-hidden="true"><div className={`peek-visual${preview.scrollPreview ? ' peek-scroll' : ''}`}><img src={preview.scrollPreview ?? preview.visual} alt=""/></div><div className="peek-caption"><strong>{preview.title}{preview.employer && ' · Ody'}</strong><span>{preview.site ? archiveCopy[route.lang].site : 'GitHub'} ↗</span></div></div>}
  </div>
}
