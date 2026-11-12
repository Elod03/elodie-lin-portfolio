export type Lang = 'fr' | 'en' | 'zh'
export type Theme = 'day' | 'night'
export type View = { kind: 'home' } | { kind: 'projects' } | { kind: 'project'; slug: string } | { kind: 'about' } | { kind: 'playground' }
export type ObjectId = 'avatar' | 'cloud' | 'duck' | `project:${string}`
export interface Vec2 { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface Corners { tl: number; tr: number; br: number; bl: number }
export interface Viewport { w: number; h: number; dpr: number }
export interface LayoutContext { viewport: Viewport; projectSlugs: readonly string[]; logoRect: Rect; /** Right edge (px) of the header navigation when it is shown; the Playground strip starts to its right. */ navRight?: number; /** Left edge (px) of the header controls (language, theme) when they sit on the top row; the Playground strip stops before it. */ controlsLeft?: number; /** Phones: page scroll (px); the water band follows it (y = base - scrollY). */ scrollY?: number }
export const isCompact = (vp: Viewport) => vp.w < 768
export const sameView = (a: View, b: View) => a.kind === b.kind && (a.kind !== 'project' || b.kind === 'project' && a.slug === b.slug)
