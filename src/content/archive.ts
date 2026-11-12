import type { Lang } from './types'

export type ArchiveCategory = 'web' | 'app' | 'quality'
export interface ArchiveProject {
  slug: string
  title: string
  category: ArchiveCategory
  tools: readonly string[]
  source?: string
  site?: string
  featured?: boolean
  employer?: 'Ody'
  visual: string
  scrollPreview?: string
  previewSize?: { width: number; height: number }
  summary: Record<Lang, string>
}

// Public visibility and repository URLs verified with GitHub CLI on 2026-11-03.
// Descriptions reflect the repository README/source, not a claim of individual
// authorship or production deployment. Existing featured work follows the brief.
export const archiveProjects: readonly ArchiveProject[] = [
  {
    slug: 'streamflix', title: 'StreamFlix', category: 'web', tools: ['PHP', 'PostgreSQL', 'TMDB'],
    site: 'https://streamflix-murex.vercel.app/',
    source: 'https://github.com/kavisha-05/Projet-ChallengeWeb', featured: true, visual: '/media/projects/streamflix-capture.jpg',
    scrollPreview: '/media/projects/streamflix-scroll.jpg', previewSize: { width: 1200, height: 2975 },
    summary: {
      fr: 'Site de films réalisé en équipe à Efrei.',
      en: 'A movie website built with my Efrei classmates.',
      zh: '与 Efrei 同学共同完成的电影网站。',
    },
  },
  {
    slug: 'yoru', title: 'YORU', category: 'web', tools: ['JavaScript', 'WebGL', 'API Odyssey'], employer: 'Ody',
    site: 'https://yorumontparnasse.com', featured: true, visual: '/media/projects/yoru-capture.jpg', scrollPreview: '/media/projects/yoru-scroll.jpg',
    previewSize: { width: 1200, height: 10991 },
    summary: {
      fr: 'Site restaurant réalisé chez Ody, mon entreprise actuelle.',
      en: 'Restaurant website made at Ody, my current employer.',
      zh: '在我目前任职的 Ody 完成的餐厅网站。',
    },
  },
  {
    slug: 'kanpai', title: 'Kanpai', category: 'web', tools: ['React', 'TypeScript', 'GSAP'], employer: 'Ody',
    site: 'https://www.kanpaiparis.fr', featured: true, visual: '/media/projects/kanpai.webp', scrollPreview: '/media/projects/kanpai-scroll.webp',
    previewSize: { width: 560, height: 3189 },
    summary: {
      fr: 'Site de Kanpai Paris réalisé chez Ody, mon entreprise actuelle.',
      en: 'Kanpai Paris website made at Ody, my current employer.',
      zh: '在我目前任职的 Ody 完成的 Kanpai Paris 网站。',
    },
  },
  {
    slug: 'carnival', title: 'Carnival 17', category: 'web', tools: ['React', 'TypeScript', 'GSAP'], employer: 'Ody',
    site: 'https://carnival17.sites.ody.app/', featured: true, visual: '/media/projects/carnival-capture.jpg',
    summary: {
      fr: 'Refonte du site d’un buffet asiatique près de La Rochelle, conçue et codée chez Ody.',
      en: 'Redesign of an Asian buffet’s website near La Rochelle, designed and built at Ody.',
      zh: '为拉罗谢尔附近一家亚洲自助餐厅重新打造的网站，在 Ody 完成设计与开发。',
    },
  },

]

// Textes de la galerie. L'intro et la ligne de fin sont des propositions à faire valider par Elodie.
export const archiveCopy = {
  fr: { title: 'Projets', intro: 'Des sites que j’ai conçus et codés, du restaurant au catalogue de films.', study: 'Étude de cas', site: 'Voir le site', code: 'Code sur GitHub', github: 'Le code est sur GitHub', tools: 'Technologies' },
  en: { title: 'Projects', intro: 'Websites I designed and built, from restaurants to a film catalogue.', study: 'Case study', site: 'Visit website', code: 'Code on GitHub', github: 'The code is on GitHub', tools: 'Technologies' },
  zh: { title: '项目', intro: '我设计并开发的网站，从餐厅到电影目录。', study: '查看案例', site: '访问网站', code: 'GitHub 代码', github: '代码在 GitHub 上', tools: '技术' },
} as const

export function projectDestination(slug: string): string | undefined {
  const project = archiveProjects.find(project => project.slug === slug)
  return project?.site ?? project?.source
}
