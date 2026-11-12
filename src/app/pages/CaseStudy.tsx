import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { getSite, pagePath, type Lang, type ProjectSlug } from '../../content'
import { archiveProjects } from '../../content/archive'
import { ExitIcon } from '../ui/ExitIcon'
import { railFraction } from './railProgress'
import '../../styles/pages.css'
import '../../styles/projects.css'

const icon = (children: ReactNode) => <svg className="fact-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
const factIcons = {
  role: icon(<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>),
  duration: icon(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  platform: icon(<><rect x="3.5" y="5" width="17" height="11.5" rx="2" /><path d="M9 20h6M12 16.5V20" /></>),
  tools: icon(<path d="M14.5 6.5a4 4 0 0 0 4.9 4.9l-8.6 8.6a2.1 2.1 0 0 1-3-3l8.6-8.6a4 4 0 0 1-1.9-1.9Z" />),
}

/** Reads the page: where each section starts, and whether the page can scroll at all. */
function railProgress(ids: readonly string[]) {
  const root = document.documentElement
  return railFraction({
    tops: ids.map(id => document.getElementById(id)?.getBoundingClientRect().top ?? 0),
    probe: innerHeight * .4,
    scrollable: root.scrollHeight > innerHeight + 8,
    atBottom: innerHeight + scrollY >= root.scrollHeight - 4,
  })
}

export function CaseStudy({ lang, slug }: { lang: Lang; slug: string }) {
  const site = getSite(lang)
  const project = site.shared.projects.find(p => p.slug === slug)
  const rail = useRef<HTMLElement>(null), chips = useRef<HTMLElement>(null)
  const copy = project ? site.projects[slug as ProjectSlug] : undefined
  const sectionIds = copy ? ['overview', 'process', ...copy.sections.map(s => s.id)] : []
  useEffect(() => {
    if (!sectionIds.length) return
    let frame = 0
    const update = () => {
      frame = 0
      const p = railProgress(sectionIds)
      rail.current?.style.setProperty('--progress', String(p))
      const index = Math.round(p * (sectionIds.length - 1))
      for (const nav of [rail.current, chips.current]) nav?.querySelectorAll('a').forEach((a, k) => { if (k === index) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current') })
      // Phone chips: keep the current one in view inside its own rail (sideways only, the page itself never moves).
      const current = chips.current?.querySelector<HTMLElement>('a[aria-current]'), strip = chips.current?.querySelector<HTMLElement>('ol')
      if (current && strip && strip.offsetParent) strip.scrollTo({ left: current.offsetLeft - (strip.clientWidth - current.offsetWidth) / 2, behavior: 'auto' })
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule)
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', schedule); removeEventListener('resize', schedule) }
  }, [slug, lang])
  if (!project || !copy) return null
  const source = archiveProjects.find(item => item.slug === slug)?.source
  const next = site.shared.projects.find(p => p.slug === project.next)
  const galleryPath = lang === 'fr' ? '/projets' : `/${lang}/projects`
  const titles = [project.name, site.labels.process, ...copy.sections.map(s => s.title)]
  const facts = [['role', site.labels.role, copy.role], ['duration', site.labels.duration, copy.duration], ['platform', site.labels.platform, copy.platform]] as const
  const siteLink = project.url
  return <article className="case-page" style={{ '--project': project.color, '--project-ink': project.ink } as CSSProperties}>
    <nav ref={rail} className="case-rail" aria-label={site.labels.contents}>
      <div className="case-rail-track" aria-hidden="true"><span className="case-rail-fill" /><span className="case-cursor"><img src={project.iconFace} alt="" width="28" height="28" /></span></div>
      <ol>{sectionIds.map((id, k) => <li key={id}><a href={`#${id}`} aria-current={k === 0 ? 'location' : undefined}>{titles[k]}</a></li>)}</ol>
    </nav>
    <div className="case-body">
      <a className="case-back" href={galleryPath}><svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 1 1 7l6 6" /></svg>{site.labels.allProjects}</a>
      <section id="overview" className="case-overview">
        <div className="case-hero-frame"><img className="case-hero" src={project.hero} alt={copy.alts.hero} width="1200" height="750" /></div>
        <header className="case-title">
          <img className="case-icon" src={project.iconFace} alt="" width="96" height="96" />
          <div className="case-heading"><h1>{project.name}</h1><p className="case-tagline">{copy.tagline}</p></div>
          <div className="case-actions"><a className="case-primary" href={siteLink} target="_blank" rel="noopener noreferrer">{site.labels.visit} <ExitIcon /></a>{source && <a className="case-secondary" href={source} target="_blank" rel="noopener noreferrer">{site.labels.code} <ExitIcon /></a>}</div>
        </header>
        <nav ref={chips} className="case-chips-nav" aria-label={site.labels.contents}>
          <ol>{sectionIds.map((id, k) => <li key={id}><a href={`#${id}`} aria-current={k === 0 ? 'location' : undefined}>{titles[k]}</a></li>)}</ol>
        </nav>
        <dl className="case-facts">
          {facts.map(([key, term, value]) => <div key={key}>{factIcons[key]}<dt>{term}</dt><dd>{value}</dd></div>)}
          <div>{factIcons.tools}<dt>{site.labels.tools}</dt><dd><ul className="case-chips">{project.tools.map(tool => <li key={tool}>{tool}</li>)}</ul></dd></div>
        </dl>
        <div className="case-challenge">{[['problem', site.labels.problem, copy.problem], ['solution', site.labels.solution, copy.solution]].map(([key, title, text]) => <section key={key}><h3>{title}</h3><p>{text}</p></section>)}</div>
      </section>
      <section id="process" className="case-section case-process"><h2>{site.labels.process}</h2>
        <ol className="process-list">{copy.process.map(step => <li key={step.icon}><span className="process-node" aria-hidden="true">{Number(step.icon)}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol></section>
      {copy.sections.map(section => <section className={`case-section case-split${section.media?.length ? '' : ' no-media'}`} id={section.id} key={section.id}>
        <div className="case-copy"><h2>{section.title}</h2>{section.body.map(p => <p key={p}>{p}</p>)}</div>
        {!!section.media?.length && <div className="case-media">{section.media.map(({ shot, alt }) => { const s = project.shots[shot]; return <img key={s.src} className="case-shot" src={s.src} alt={alt} width={s.width} height={s.height} loading="lazy" decoding="async" /> })}</div>}
      </section>)}
      {next && <a className="next-project" href={pagePath(lang, 'project', next.slug)}><img src={next.iconFace} alt="" width="96" height="96" /><span className="next-text"><span>{site.labels.next}</span><strong>{next.name}</strong></span><svg className="next-arrow" width="12" height="20" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m1 1 6 6-6 6" /></svg></a>}
    </div>
  </article>
}
