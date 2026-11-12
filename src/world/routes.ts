import type { Lang, View } from './types'
export interface Route { lang: Lang; view: View }
export function parseRoute(pathname: string, slugs: readonly string[]): Route | null {
  const path = pathname.split(/[?#]/)[0].replace(/\/$/, '')
  const parts = path.split('/').filter(Boolean)
  const lang: Lang = parts[0] === 'en' || parts[0] === 'zh' ? parts.shift() as Lang : 'fr'
  if (!parts.length) return { lang, view: { kind: 'home' } }
  if (parts.length === 1 && parts[0] === (lang === 'fr' ? 'a-propos' : 'about')) return { lang, view: { kind: 'about' } }
  if (parts.length === 1 && parts[0] === 'playground') return { lang, view: { kind: 'playground' } }
  if (parts.length === 1 && parts[0] === (lang === 'fr' ? 'projets' : 'projects')) return { lang, view: { kind: 'projects' } }
  if (parts.length === 2 && parts[0] === (lang === 'fr' ? 'projets' : 'projects') && slugs.includes(parts[1])) return { lang, view: { kind: 'project', slug: parts[1] } }
  return null
}
export function buildRoute({ lang, view }: Route): string {
  const prefix = lang === 'fr' ? '' : `/${lang}`
  if (view.kind === 'home') return `${prefix}/`
  if (view.kind === 'about') return `${prefix}/${lang === 'fr' ? 'a-propos' : 'about'}`
  if (view.kind === 'playground') return `${prefix}/playground`
  if (view.kind === 'projects') return `${prefix}/${lang === 'fr' ? 'projets' : 'projects'}`
  return `${prefix}/${lang === 'fr' ? 'projets' : 'projects'}/${encodeURIComponent(view.slug)}`
}
export function allRoutes(slugs: readonly string[]): Route[] {
  return (['fr', 'en', 'zh'] as const).flatMap(lang => ([{ kind: 'home' }, { kind: 'projects' }, { kind: 'about' }, { kind: 'playground' }, ...slugs.map(slug => ({ kind: 'project', slug }))] as View[]).map(view => ({ lang, view })))
}
export function alternates(view: View): Record<Lang | 'x-default', string> {
  return { fr: buildRoute({ lang: 'fr', view }), en: buildRoute({ lang: 'en', view }), zh: buildRoute({ lang: 'zh', view }), 'x-default': buildRoute({ lang: 'fr', view }) }
}
