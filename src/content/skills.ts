/** Compétences affichées sur la page À propos (avec leurs icônes) et reprises dans le CV PDF. */
export type SkillGroup = 'front' | 'back' | 'tools'
export interface SkillItem { readonly name: string; readonly color: string }
export const skills: readonly { readonly key: SkillGroup; readonly items: readonly SkillItem[] }[] = [
  { key: 'front', items: [{ name: 'HTML', color: '#d84924' }, { name: 'CSS', color: '#663399' }, { name: 'JavaScript', color: '#c9a800' }, { name: 'TypeScript', color: '#3178c6' }, { name: 'React', color: '#087ea4' }] },
  { key: 'back', items: [{ name: 'PHP', color: '#777bb4' }, { name: 'Node.js', color: '#43853d' }, { name: 'Express', color: '#30343b' }, { name: 'PostgreSQL', color: '#4169a1' }, { name: 'SQL', color: '#28708a' }] },
  { key: 'tools', items: [{ name: 'Docker', color: '#2496ed' }, { name: 'Git', color: '#f05032' }, { name: 'GitHub', color: '#30343b' }] },
]
