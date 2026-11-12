import { fr } from './fr'
import { en } from './en'
import { zh } from './zh'
import { shared } from './shared'
import type { Lang } from './types'
export function getSite(lang: Lang) { return { ...({ fr, en, zh }[lang]), shared } }
export { shared, projectSlugs } from './shared'
export type { Lang, ProjectSlug, SiteCopy } from './types'
export function pagePath(lang: Lang, page: 'home' | 'about' | 'playground' | 'project', slug?: string) {
  const prefix = lang === 'fr' ? '' : `/${lang}`
  return `${prefix}${page === 'home' ? '/' : page === 'about' ? lang === 'fr' ? '/a-propos' : '/about' : page === 'playground' ? '/playground' : `${lang === 'fr' ? '/projets' : '/projects'}/${slug}`}`
}
