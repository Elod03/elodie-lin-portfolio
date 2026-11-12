import { getSite, pagePath, type Lang } from '../../content'
import { archiveCopy, archiveProjects } from '../../content/archive'
import '../../styles/projects.css'
import { ExitIcon } from '../ui/ExitIcon'
import { GithubIcon } from '../ui/GithubIcon'

/** Galerie : une rangée texte | image par projet. La rangée entière mène à l'étude de cas, « Voir le site » est le seul lien externe. */
export function Projects({ lang }: { lang: Lang }) {
  const copy = archiveCopy[lang]
  const site = getSite(lang)
  return <section className="projects-page">
    <header className="projects-heading"><h1>{copy.title}</h1><p>{copy.intro}</p></header>
    <div className="project-rows">{archiveProjects.map(project => {
      const shared = site.shared.projects.find(p => p.slug === project.slug)
      return <article className="project-row" key={project.slug}>
        <div className={`project-visual${project.scrollPreview ? ' project-scroll' : ''}`}>
          <img src={project.scrollPreview ?? project.visual} alt="" width={project.previewSize?.width ?? 1200} height={project.previewSize?.height ?? 750} loading="lazy" decoding="async" />
        </div>
        <div className="project-text">
          {shared && <img className="project-icon" src={shared.iconFace} alt="" width="40" height="40" />}
          <h2><a className="project-link" href={pagePath(lang, 'project', project.slug)}>{project.title}</a></h2>
          <p>{project.summary[lang]}</p>
          <ul className="project-chips" aria-label={copy.tools}>{project.tools.slice(0, 3).map(tool => <li key={tool}>{tool}</li>)}</ul>
          <div className="project-actions"><span className="btn-solid" aria-hidden="true">{copy.study}</span>{project.site && <a className="project-visit" href={project.site} target="_blank" rel="noopener noreferrer">{copy.site} <ExitIcon /></a>}</div>
        </div>
      </article>
    })}</div>
    <p className="projects-end"><a href="https://github.com/Elod03" target="_blank" rel="noopener noreferrer"><GithubIcon size={20} />{copy.github} <ExitIcon /></a></p>
  </section>
}
