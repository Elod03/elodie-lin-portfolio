import { renderToString } from 'react-dom/server'
import { App } from './app/App'
import { allRoutes, buildRoute, parseRoute, alternates, type Route } from './world/routes'
import { projectSlugs, shared } from './content/shared'
import { getSite } from './content'
export const routes = allRoutes(projectSlugs).map(buildRoute)
export { shared, getSite }
const escape = (text: string) => text.replace(/[&<>"']/g, value => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[value]!))
/** Name of the preview image in public/og for a route (404 → home). */
export function ogImageName(route: Route | null): string {
  if (!route) return 'home'
  const { view } = route
  return view.kind === 'project' ? view.slug : view.kind === 'projects' ? 'projets' : view.kind === 'about' ? 'a-propos' : view.kind
}
export function render(path: string, origin: string) {
  const route = parseRoute(path, projectSlugs)
  const lang = route?.lang ?? (/^\/(en|zh)(\/|$)/.exec(path)?.[1] as 'en' | 'zh' | undefined) ?? 'fr', site = getSite(lang)
  const projectSlug = route?.view.kind === 'project' ? route.view.slug : undefined
  const project = shared.projects.find(p => p.slug === projectSlug)
  const galleryHeading = { fr: 'Projets & explorations', en: 'Projects & explorations', zh: '项目与探索' }[lang]
  const heading = !route ? { fr: 'Page introuvable', en: 'Page not found', zh: '页面未找到' }[lang] : project?.name ?? (route.view.kind === 'projects' ? galleryHeading : route.view.kind === 'about' ? site.labels.about : route.view.kind === 'playground' ? site.labels.playground : site.hero.title)
  const detail = project ? site.projects[project.slug].type : route?.view.kind === 'playground' ? ({ fr: 'Créations interactives', en: 'Interactive experiments', zh: '互动实验' }[lang]) : ''
  const title = `${heading}${detail ? ` · ${detail}` : ''} — Elodie Lin`
  const description = project ? `${project.name} — ${site.projects[project.slug].type}. ${site.projects[project.slug].tagline}` : route?.view.kind === 'projects' ? `${galleryHeading} — Elodie Lin. ${site.hero.lines.join(' ')} GitHub, React, TypeScript, PHP, WebGL.` : route?.view.kind === 'playground' ? site.playground.intro : route?.view.kind === 'about' ? site.about.bio.join(' ') : `${site.hero.title} ${site.hero.lines.join(' ')} ${site.about.subtitle}`
  const canonical = new URL(path, origin).href
  const person = { '@type': 'Person', '@id': `${origin}/#elodie`, name: shared.name, jobTitle: lang === 'fr' ? 'Développeuse web full-stack — alternance' : 'Full-stack web developer', email: shared.email, sameAs: [shared.github, shared.linkedin], alumniOf: { '@type': 'EducationalOrganization', name: 'Efrei' }, knowsLanguage: ['fr', 'en', 'zh'], knowsAbout: ['JavaScript', 'TypeScript', 'React', 'PHP', 'PostgreSQL'] }
  const jsonld = { '@context': 'https://schema.org', '@graph': [person, { '@type': 'ProfilePage', url: canonical, name: title, mainEntity: { '@id': person['@id'] } }] }
  // Link previews (LinkedIn, Slack, e-mail…): one 1200×630 image per view, shared by the three languages (public/og).
  const ogImage = `${origin}/og/${ogImageName(route)}.jpg`
  const locales = { fr: 'fr_FR', en: 'en_US', zh: 'zh_CN' } as const
  const social = [
    ['og:type', 'website'], ['og:site_name', shared.name], ['og:title', title], ['og:description', description], ['og:url', canonical],
    ['og:locale', locales[lang]], ...(Object.keys(locales) as (keyof typeof locales)[]).filter(l => l !== lang).map(l => ['og:locale:alternate', locales[l]]),
    ['og:image', ogImage], ['og:image:width', '1200'], ['og:image:height', '630'], ['og:image:type', 'image/jpeg'], ['og:image:alt', `${heading} — ${shared.name}`],
  ].map(([property, content]) => `<meta property="${property}" content="${escape(content)}">`).join('')
    + [['twitter:card', 'summary_large_image'], ['twitter:title', title], ['twitter:description', description], ['twitter:image', ogImage], ['twitter:image:alt', `${heading} — ${shared.name}`]]
      .map(([name, content]) => `<meta name="${name}" content="${escape(content)}">`).join('')
  const head = `<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(canonical)}">${route ? Object.entries(alternates(route.view)).map(([l, url]) => `<link rel="alternate" hreflang="${l}" href="${escape(new URL(url, origin).href)}">`).join('') : '<meta name="robots" content="noindex">'}${social}<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>`
  return { html: renderToString(<App initialPath={path}/>), head, lang }
}
