import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { getSite, type Lang } from '../../content'
import { useAboutBand } from '../hooks/useAboutBand'
import { siHtml5, siCss, siJavascript, siTypescript, siReact, siPhp, siNodedotjs, siExpress, siPostgresql, siDocker, siGit, siGithub } from 'simple-icons'
import { skills as skillGroups } from '../../content/skills'
import '../../styles/about.css'

// Names, groups and colours live in src/content/skills.ts (shared with the PDF CV); the icons are attached here.
const icons: Record<string, string> = { HTML: siHtml5.path, CSS: siCss.path, JavaScript: siJavascript.path, TypeScript: siTypescript.path, React: siReact.path, PHP: siPhp.path, 'Node.js': siNodedotjs.path, Express: siExpress.path, PostgreSQL: siPostgresql.path, Docker: siDocker.path, Git: siGit.path, GitHub: siGithub.path }
const skills = skillGroups.map(group => ({ key: group.key, items: group.items.map(skill => ({ name: skill.name, path: icons[skill.name] ?? '', color: skill.color })) }))
const words = {
  fr: { skills: 'Compétences', front: 'Front-end', back: 'Back-end & données', tools: 'Outils & collaboration', emailButton: 'Mes coordonnées', download: 'CV · PDF', hint: 'Faire défiler vers la droite', hintShort: 'Défiler' },
  en: { skills: 'Skills', front: 'Front-end', back: 'Back-end & data', tools: 'Tools & collaboration', emailButton: 'Contact details', download: 'Résumé · PDF', hint: 'Scroll to the right', hintShort: 'Scroll' },
  zh: { skills: '技能', front: '前端', back: '后端与数据', tools: '工具与协作', emailButton: '联系方式', download: '简历 · PDF', hint: '向右滚动', hintShort: '向右滑动' },
}
const initials = (name: string) => name.split(/[\s·]+/).filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase()
const Pin = () => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></svg>
const mailIcon: ReactNode = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>
const cvIcon: ReactNode = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M8 13h8M8 17h5"/></svg>
const githubIcon: ReactNode = <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={siGithub.path}/></svg>
const order = (i: number) => ({ '--i': i }) as CSSProperties

export function About({ lang, onContact }: { lang: Lang; onContact: (trigger: HTMLElement) => void }) {
  const site = getSite(lang), copy = site.about, text = words[lang]
  const cv = `/cv/elodie-lin-cv-${lang === 'fr' ? 'fr' : 'en'}.pdf`
  const page = useAboutBand()
  // The arrow sits on the water strip, which is drawn above the page: it has to live above both (client only).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const scrollOn = () => page.current?.scrollBy({ left: page.current.clientWidth * .92, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  const logo = (row: typeof copy.experienceRows[number]) => <span className="about-logo" data-tile={row.logoTile} aria-hidden="true">{row.logo ? <img src={row.logo} alt="" width="44" height="44" loading="lazy" decoding="async"/> : initials(row.name)}</span>
  const meta = (row: typeof copy.experienceRows[number]) => <span className="about-meta">{row.period}{row.place && <span className="about-place"><Pin/>{row.place}</span>}</span>
  const points = (row: typeof copy.experienceRows[number]) => row.points && <ul className="about-points">{row.points.map(point => <li key={point}>{point}</li>)}</ul>
  const [hero, feature, ...small] = copy.experienceRows
  return <article ref={page} className="about-page" role="region" aria-label={copy.title} tabIndex={0}>
    <div className="about-track">
      <section className="about-me">
        <figure className="about-photo"><img src="/media/elodie.jpg" alt={copy.portraitAlt} width="768" height="1024"/></figure>
        <img className="about-chibi" src="/media/about/elodie-chibi.webp" alt="" width="288" height="446" aria-hidden="true"/>
      </section>

      <section className="about-intro">
        <header className="about-identity">
          <p className="about-eyebrow" data-cascade style={order(2)}><Pin/>{copy.location}</p>
          <h1><span className="about-name">{copy.title}</span></h1>
          <h2 data-cascade style={order(5)}>{copy.subtitle}</h2>
        </header>
        <ul className="about-pills about-pills-main" aria-label={copy.highlights.join(', ')}>{copy.highlights.map((item, i) => <li data-cascade style={order(6 + i)} key={item}>{item}</li>)}</ul>
        <div className="about-biography">{copy.bio.map((p, i) => <p className="about-bio" data-cascade style={order(10 + i)} key={p}>{p}</p>)}</div>
        <div className="about-actions" data-cascade style={order(12)}>
          <a className="about-cv about-fill" href={cv} download={cv.split('/').pop()} target="_blank" rel="noopener noreferrer"><span>{cvIcon}{text.download}</span></a>
          <button type="button" className="about-contact-button about-fill" onClick={event => onContact(event.currentTarget)} aria-haspopup="dialog"><span>{mailIcon}{text.emailButton}</span></button>
          <a className="about-round" href={site.shared.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><b aria-hidden="true">in</b></a>
          <a className="about-round" href={site.shared.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">{githubIcon}</a>
        </div>
      </section>

      <section className="about-experience" aria-labelledby="about-xp-title">
        <h2 className="about-title" id="about-xp-title" data-reveal style={order(0)}>{copy.experience}</h2>
        <ul className="about-xp">
          <li className="about-xp-card" data-kind="hero" data-reveal data-spot style={order(1)}>
            <div className="about-xp-head">{logo(hero)}<span className="about-row-copy"><strong>{hero.name}</strong><span>{hero.role}</span></span></div>
            {meta(hero)}{points(hero)}
          </li>
          <li className="about-xp-card" data-kind="feature" data-reveal data-spot style={order(2)}>
            <div className="about-feature-side">
              <div className="about-xp-head">{logo(feature)}<span className="about-row-copy"><strong>{feature.name}{feature.badge && <em className="about-badge">{feature.badge}</em>}</strong><span>{feature.role}</span></span></div>
              <div className="about-city-line"><p className="about-city">{feature.place}</p><span className="about-meta">{feature.period}</span></div>
            </div>
            {points(feature)}
          </li>
          {small.map((row, i) => <li className="about-xp-card" data-kind="small" data-reveal data-spot style={order(3 + i)} key={row.name}>
            <div className="about-xp-head">{logo(row)}<span className="about-row-copy"><strong>{row.name}</strong></span></div>
            <p className="about-role">{row.role}</p>{meta(row)}{points(row)}
          </li>)}
        </ul>
      </section>

      {/* Formation, compétences, langues, atouts et centres d'intérêt : une seule colonne dense, pour finir la bande vite. */}
      <section className="about-more" aria-labelledby="about-edu-title">
        <h2 className="about-title" id="about-edu-title" data-reveal style={order(0)}>{copy.education}</h2>
        <ul className="about-rows">{copy.educationRows.map((row, i) => <li className="about-row" data-reveal data-spot style={order(i + 1)} key={row.name}>
          {logo(row)}<span className="about-row-copy"><strong>{row.name}<span className="about-row-year">{row.period}</span></strong><span>{row.role}</span></span>
        </li>)}</ul>
        <h2 className="about-title" id="skills-title" data-reveal style={order(5)}>{text.skills}</h2>
        <ul className="skill-list" aria-labelledby="skills-title">{skills.flatMap(group => group.items.map(skill => ({ ...skill, group: text[group.key] }))).map((skill, i) => <li data-reveal title={skill.group} style={{ '--i': 6 + i * .5, '--skill-color': skill.color } as CSSProperties} key={skill.name}>
          <span className="skill-mark"><svg width="28" height="28" viewBox="0 0 24 24" fill={skill.color} aria-hidden="true">{skill.path ? <path d={skill.path}/> : <g fill="none" stroke={skill.color} strokeWidth="1.7"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></g>}</svg></span>
          <span className="skill-name">{skill.name}</span>
        </li>)}</ul>
        <div className="about-traits">
          <div className="about-languages" data-reveal style={order(12)}><h3 className="about-mini" id="about-lang-title">{copy.languages}</h3><ul className="about-pills" aria-labelledby="about-lang-title">{copy.languageRows.map(language => <li key={language.name}>{language.name}{language.level && <b>{language.level}</b>}</li>)}</ul></div>
          <div data-reveal style={order(13)}><h3 className="about-mini">{copy.strengthsLabel}</h3><ul className="about-pills">{copy.strengths.map(item => <li key={item}>{item}</li>)}</ul></div>
          <div data-reveal style={order(14)}><h3 className="about-mini">{copy.interestsLabel}</h3><ul className="about-pills">{copy.interests.map(item => <li key={item}>{item}</li>)}</ul></div>
        </div>
        <p className="about-credits">{copy.credits}</p>
      </section>
    </div>
    {mounted && createPortal(<button type="button" className="about-hint" aria-label={text.hint} tabIndex={-1} onClick={scrollOn}><span className="about-hint-label" aria-hidden="true">{text.hintShort}</span><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button>, document.body)}
  </article>
}
