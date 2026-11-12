import { useEffect, useRef, useState } from 'react'
import { EngineHost } from './EngineHost'
import { usePath } from './router'
import { Guestbook } from './guestbook/Guestbook'
import { readGuestbook } from './guestbook/store'
import { About } from './pages/About'
import { CaseStudy } from './pages/CaseStudy'
import { Playground } from './pages/Playground'
import { Projects } from './pages/Projects'
import { ContactDialog } from './ui/ContactDialog'
import { ExitIcon } from './ui/ExitIcon'
import { GithubIcon } from './ui/GithubIcon'
import { MenuIcon } from './ui/MenuIcon'
import { ParisBadge } from './ui/ParisBadge'
import { WaterLight } from './ui/WaterLight'
import { useParis } from './hooks/useParis'
import { getSite, projectSlugs, type ProjectSlug } from '../content'
import { buildRoute, parseRoute } from '../world/routes'
import type { Lang, Theme } from '../world/types'

/** "… chez Ody · Efrei …": the word before the dot and the dot stay on one line, so no line starts with "·". */
function roleLine(role: string) {
  const at = role.indexOf(' · ')
  if (at < 0) return role
  const head = role.slice(0, at), cut = head.lastIndexOf(' ') + 1
  return <>{head.slice(0, cut)}<span className="nowrap">{head.slice(cut)}{' ·'}</span>{' '}{role.slice(at + 3)}</>
}

export function App({ initialPath }: { initialPath?: string }) {
  const path = usePath(initialPath)
  const parsed = parseRoute(path, projectSlugs)
  // 404 : la piscine reste présente, avec le cadre bas d'À propos (design-direction §4.8) ; la langue se lit dans l'URL.
  const route = parsed ?? { lang: (/^\/(en|zh)(\/|$)/.exec(path)?.[1] ?? 'fr') as Lang, view: { kind: 'about' as const } }
  const site = getSite(route.lang)
  const ui = {
    fr: { projects: 'Projets', allProjects: 'Tous les projets', contact: 'Contact', hint: 'Clique sur un objet pour explorer', hintTouch: 'Touche un objet pour explorer', role: 'Développeuse web en alternance chez Ody\u00a0· Efrei, promo 2027', cvPdf: 'CV · PDF', place: 'Paris', menu: 'Ouvrir le menu', closeMenu: 'Fermer le menu', navigation: 'Navigation principale', cv: 'Mon CV', notFound: 'Cette page n’existe pas.', notFoundHint: 'Le lien est peut-être ancien.', backToPool: 'Retour à la piscine' },
    en: { projects: 'Projects', allProjects: 'All projects', contact: 'Contact', hint: 'Click an object to explore', hintTouch: 'Tap an object to explore', role: 'Web developer, work-study at Ody\u00a0· Efrei, class of 2027', cvPdf: 'Résumé · PDF', place: 'Paris', menu: 'Open menu', closeMenu: 'Close menu', navigation: 'Main navigation', cv: 'Résumé', notFound: 'This page doesn’t exist.', notFoundHint: 'The link may be old.', backToPool: 'Back to the pool' },
    zh: { projects: '项目', allProjects: '全部项目', contact: '联系', hint: '点击水上的物件，探索我的世界', hintTouch: '轻触水上的物件，探索我的世界', role: 'Ody 网页开发工学交替生\u00a0· Efrei 2027 届', cvPdf: '简历 · PDF', place: '巴黎', menu: '打开菜单', closeMenu: '关闭菜单', navigation: '主导航', cv: '简历', notFound: '这个页面不存在。', notFoundHint: '链接可能已经过期。', backToPool: '回到泳池' },
  }[route.lang]
  const paris = useParis()
  // Safety net: the badge has a fixed width, but if the header ever changes size the strip (which starts right of the navigation) is re-measured.
  useEffect(() => { const id = requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))); return () => cancelAnimationFrame(id) }, [paris.ready, paris.temperature])
  const [theme, setTheme] = useState<Theme>('day')
  const [guestbook, setGuestbook] = useState(false)
  const [contact, setContact] = useState(false)
  const contactTrigger = useRef<HTMLElement | null>(null)
  const [menu, setMenu] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const [lines, setLines] = useState<string[]>([])
  const [sent, setSent] = useState<{ line: string; id: number } | undefined>()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'night' ? 'night' : 'day')
    try { setLines(readGuestbook(localStorage).lines) } catch { /* Private browsers still support navigation. */ }
  }, [])
  useEffect(() => {
    document.documentElement.lang = route.lang
    const view = route.view
    const page = !parsed ? ({ fr: 'Page introuvable', en: 'Page not found', zh: '页面未找到' }[route.lang]) : view.kind === 'home' ? (route.lang === 'fr' ? 'Développeuse web' : route.lang === 'en' ? 'Web developer' : '网页开发者') : view.kind === 'projects' ? ui.projects : view.kind === 'about' ? site.labels.about : view.kind === 'playground' ? site.labels.playground : site.shared.projects.find(p => p.slug === view.slug)?.name
    document.title = `Elodie Lin — ${page}`
    setGuestbook(false)
    setContact(false)
    setMenu(false)
  }, [path])
  useEffect(() => {
    function escape(e: KeyboardEvent) {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('dialog[open]')) return
      if (menu) { setMenu(false); menuButton.current?.focus(); return }
      if (guestbook) { setGuestbook(false); document.querySelector<HTMLButtonElement>('.object-cloud')?.focus(); return }
      if (route.view.kind !== 'home') { history.pushState(null, '', buildRoute({ lang: route.lang, view: { kind: 'home' } })); window.dispatchEvent(new PopStateEvent('popstate')) }
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [guestbook, menu, route.view.kind, route.lang])
  useEffect(() => {
    if (!menu) return
    const dismiss = (event: PointerEvent) => { if (!(event.target as Element).closest('.site-header')) setMenu(false) }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [menu])
  useEffect(() => {
    // Header: transparent at the top, opaque after 8 px of scrolling. The home page never scrolls, so it stays transparent.
    const update = () => setScrolled(route.view.kind !== 'home' && window.scrollY > 8)
    update(); window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [route.view.kind])
  function toggleTheme() {
    const next = theme === 'day' ? 'night' : 'day'; setTheme(next)
    document.documentElement.dataset.theme = next
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'night' ? '#3e4045' : '#efedeb')
    try { localStorage.setItem('portfolio-theme', next) } catch { /* Theme remains usable without persistence. */ }
  }
  const closeGuestbook = () => { setGuestbook(false); document.querySelector<HTMLButtonElement>('.object-cloud')?.focus() }
  const cv = `/cv/elodie-lin-cv-${route.lang === 'fr' ? 'fr' : 'en'}.pdf`
  function openContact(trigger: HTMLElement) {
    contactTrigger.current = trigger
    setMenu(false); setGuestbook(false); setContact(true)
  }
  function toggleMenu() {
    setMenu(!menu)
    if (!menu) requestAnimationFrame(() => document.querySelector<HTMLAnchorElement>('#primary-nav a')?.focus())
  }
  const home = (view: 'about' | 'projects' | 'playground') => buildRoute({ lang: route.lang, view: { kind: view } })
  const navLinks = [
    { label: site.labels.about, href: home('about'), current: !!parsed && route.view.kind === 'about' },
    { label: ui.projects, href: home('projects'), current: !!parsed && (route.view.kind === 'projects' || route.view.kind === 'project') },
    { label: site.labels.playground, href: home('playground'), current: !!parsed && route.view.kind === 'playground' },
  ]
  // Home: who she is (name, then role) and her CV, on the first screen. Shared by the phone help block and the desktop footer.
  const identity = <p className="footer-identity"><strong>Elodie Lin</strong><span className="identity-place">{'\u00a0· '}{ui.place}</span><span className="identity-role"><span className="identity-dash">{'\u00a0· '}</span>{roleLine(ui.role)}</span></p>
  const cvLink = <a className="home-cv" href={cv} download={cv.split('/').pop()} target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M8 13h8M8 17h5"/></svg>{ui.cvPdf}</a>
  const chevron = <svg className="sheet-chevron" width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m1 1 6 6-6 6"/></svg>
  return <>
    <a className="skip-link" href="#main">{route.lang === 'fr' ? 'Aller au contenu' : route.lang === 'en' ? 'Skip to content' : '跳转至内容'}</a>
    <header className="site-header" data-menu-open={menu} data-scrolled={scrolled}>
      <a className="logo" href={buildRoute({ lang: route.lang, view: { kind: 'home' } })} aria-label={`Elodie Lin — ${site.labels.home}`}>elo<span>.</span></a>
      <ParisBadge lang={route.lang} ready={paris.ready} clock={paris.clock} temperature={paris.temperature}/>
      <nav className="primary-nav" id="primary-nav" aria-label={ui.navigation} onClick={event => { if ((event.target as Element).closest('a')) setMenu(false) }}>
        {navLinks.map(link => <a key={link.label} href={link.href} aria-current={link.current ? 'page' : undefined}><span className="nav-text">{link.label}</span>{chevron}</a>)}
        <button type="button" className="nav-contact" aria-haspopup="dialog" onClick={event => openContact(event.currentTarget)}><span className="nav-text">{ui.contact}</span>{chevron}</button>
        <a className="github-link" href={site.shared.github} target="_blank" rel="noopener noreferrer"><GithubIcon size={24}/><span className="gh-text">GitHub</span></a>
        <a className="sheet-only" href={site.shared.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <ExitIcon/></a>
        <a className="sheet-only" href={cv} download={cv.split('/').pop()} target="_blank" rel="noopener noreferrer">{ui.cv} <ExitIcon/></a>
      </nav>
      <div className="header-controls"><button ref={menuButton} className="menu-toggle" type="button" aria-expanded={menu} aria-controls="primary-nav" aria-label={menu ? ui.closeMenu : ui.menu} onClick={toggleMenu}><MenuIcon open={menu}/></button><nav className="language-pill" aria-label={route.lang === 'fr' ? 'Langue' : 'Language'}>{(['fr','en','zh'] as Lang[]).map(lang => <a key={lang} lang={lang} href={buildRoute({ lang, view: parsed ? route.view : { kind: 'home' } })} aria-current={lang === route.lang ? 'true' : undefined}>{lang === 'zh' ? '中文' : lang.toUpperCase()}</a>)}</nav>
      <button className="theme-switch" role="switch" aria-checked={theme === 'night'} aria-label={route.lang === 'fr' ? 'Mode nuit' : route.lang === 'en' ? 'Night mode' : '夜间模式'} onClick={toggleTheme}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{theme === 'night' ? <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/> : <><circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></>}</svg>
      </button></div>
    </header>
    <EngineHost route={route} inert={!parsed} theme={theme} light={paris.light} rain={paris.raining} onCloud={() => setGuestbook(true)} lines={lines} sent={sent}/>
    <main id="main" tabIndex={-1} className={`page-content view-${parsed ? route.view.kind : '404'}`}>
      {!parsed ? <section className="not-found"><h1>{ui.notFound}</h1><p>{ui.notFoundHint}</p><div className="not-found-actions"><a className="btn-solid" href={buildRoute({ lang: route.lang, view: { kind: 'home' } })}>{ui.backToPool}</a><a href={home('projects')}>{ui.projects}</a><a href={home('about')}>{site.labels.about}</a></div></section> : route.view.kind === 'home' ? <section className="sr-only"><h1>{site.hero.title}</h1><p>{site.hero.lines.join(' ')}</p><p>Elodie Lin — Efrei · Ody</p><a href={`mailto:${site.shared.email}`}>{site.shared.email}</a></section> : route.view.kind === 'projects' ? <Projects lang={route.lang}/> : route.view.kind === 'about' ? <About lang={route.lang} onContact={openContact}/> : route.view.kind === 'playground' ? <Playground lang={route.lang}/> : <CaseStudy lang={route.lang} slug={route.view.slug as ProjectSlug}/>}
    </main>
    <WaterLight/>
    {parsed && route.view.kind === 'home' && <>
      <aside className="home-help"><p className="home-hint"><span className="hint-pointer">{ui.hint}</span><span className="hint-touch">{ui.hintTouch}</span></p>{identity}<div className="home-actions"><a className="btn-solid" href={home('projects')}>{ui.allProjects}</a>{cvLink}</div></aside>
      <footer className="home-footer">{identity}<div className="home-actions"><a className="btn-solid all-projects" href={home('projects')}>{ui.allProjects}</a>{cvLink}</div><nav aria-label={ui.contact}><button type="button" className="footer-contact" aria-haspopup="dialog" onClick={event => openContact(event.currentTarget)}>{ui.contact}</button><a href={site.shared.github} target="_blank" rel="noopener noreferrer">GitHub</a><a href={site.shared.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></nav></footer>
    </>}
    {guestbook && <Guestbook lang={route.lang} onClose={closeGuestbook} onSend={line => { setLines(previous => [...previous, line]); setSent({ line, id: Date.now() }) }}/>}
    {contact && <ContactDialog lang={route.lang} returnFocus={contactTrigger.current} onClose={() => setContact(false)}/>}
  </>
}
