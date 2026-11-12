import { describe, expect, it } from 'vitest'
import { getSite, projectSlugs } from './index'
function shape(value: unknown): unknown { if (Array.isArray(value)) return value.map(shape); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, shape(v)])); return typeof value }
describe('portfolio content', () => {
  it('keeps the same structure and project slugs in every language', () => { for (const lang of ['fr','en','zh'] as const) { const site = getSite(lang); expect(shape(site)).toEqual(shape(getSite('fr'))); expect(Object.keys(site.projects)).toEqual(projectSlugs); expect(JSON.stringify(site)).not.toContain(':""'); } })
  it('uses real contact links and gives no individual ownership of the team project', () => { expect(getSite('fr').shared.linkedin).toContain('elodie-lin-b36918253'); expect(getSite('fr').projects.streamflix.role).toContain('équipe'); })
})
