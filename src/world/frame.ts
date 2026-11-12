import { isCompact, type Corners, type LayoutContext, type Rect, type Vec2, type View } from './types'
export interface PoolFrame { rect: Rect; radii: Corners; pan: Vec2; visible: boolean }
/** Phone water band: 120 px tall, right under the 64 px header, and it scrolls away with the page (gone after 184 px of scrolling). */
export const BAND = { top: 64, height: 120, gutter: 16, radius: 18, gone: 64 + 120 }
/** Home pool on a phone: below the header, with 152 px left under it for the help line, who she is, the "All projects" button and the CV (in the flow, not fixed; matches .home-help in global.css). */
export const HOME_MOBILE = { top: 72, bottomSpace: 152 }
/** True once a phone water band has fully left the screen. */
export const bandGone = (scrollY: number) => scrollY >= BAND.gone
export function computeFrame(view: View, ctx: LayoutContext): PoolFrame {
  const { w, h } = ctx.viewport
  const compact = isCompact(ctx.viewport)
  if (compact && view.kind !== 'home') {
    const y = BAND.top - Math.max(0, ctx.scrollY ?? 0)
    // The pan keeps the window inside the home pool (its walls never show): world = screen - pan.
    return { rect: { x: BAND.gutter, y, w: Math.max(0, w - 2 * BAND.gutter), h: BAND.height }, radii: { tl: BAND.radius, tr: BAND.radius, br: BAND.radius, bl: BAND.radius }, pan: { x: 0, y: -90 }, visible: y + BAND.height > 0 }
  }
  let rect: Rect = { x: w * .047, y: Math.max(60, h * .075), w: w * .906, h: h * .92 - Math.max(60, h * .075) }
  if (compact) rect = { x: w * .04, y: HOME_MOBILE.top, w: w * .92, h: h - HOME_MOBILE.bottomSpace - HOME_MOBILE.top }
  const projectStrip = view.kind === 'project' || view.kind === 'projects'
  if (projectStrip) rect = { x: w * .86, y: h * .09, w: w * .14, h: h * .83 }
  if (view.kind === 'about') {
    const height = Math.min(140, Math.max(100, h * .15))
    rect = { x: w * .047, y: h - height - 12, w: w * .906, h: height }
  }
  if (view.kind === 'playground') {
    // Glued to the top edge (y 0 to 14 %), starting right of the header navigation (and the logo); the page scrolls it away with the content.
    const x = Math.max(ctx.logoRect.x + ctx.logoRect.w + 24, ctx.navRight ? ctx.navRight + 24 : 0)
    const right = Math.min(w * .953, ctx.controlsLeft ? ctx.controlsLeft - 24 : Infinity)
    rect = { x, y: 0, w: Math.max(0, right - x), h: h * .14 }
  }
  const r = Math.min(22, compact ? Math.max(16, w * .016) : w * .016, rect.h / 2, rect.w / 2)
  return { rect, radii: { tl: view.kind === 'playground' ? 0 : r, tr: projectStrip || view.kind === 'playground' ? 0 : r, br: projectStrip ? 0 : r, bl: r }, pan: panFor(view, w, h), visible: true }
}
/**
 * The pool is one fixed scene (the home pool). A strip is a cropping window onto it, and `pan` says which part:
 * world = screen - pan. Home looks at itself (no pan). The project strip, on the far right, looks at the middle
 * of the title; the About strip (bottom) at the top of the title; the Playground strip (top) at the end of the text.
 */
function panFor(view: View, w: number, h: number): Vec2 {
  if (view.kind === 'project' || view.kind === 'projects') return { x: w * .26, y: 0 }
  if (view.kind === 'about') return { x: 0, y: h * .5 }
  if (view.kind === 'playground') return { x: 0, y: -h * .37 }
  return { x: 0, y: 0 }
}
/** The part of the world (home-pool pixels) that the window currently shows. */
export function worldWindow(f: PoolFrame): Rect { return { x: f.rect.x - f.pan.x, y: f.rect.y - f.pan.y, w: f.rect.w, h: f.rect.h } }
export function lerpFrame(a: PoolFrame, b: PoolFrame, t: number): PoolFrame {
  const k = Math.max(0, Math.min(1, t)), lerp = (x: number, y: number) => x + (y - x) * k
  if (k === 0) return a
  if (k === 1) return b
  return { rect: { x: lerp(a.rect.x, b.rect.x), y: lerp(a.rect.y, b.rect.y), w: lerp(a.rect.w, b.rect.w), h: lerp(a.rect.h, b.rect.h) }, radii: { tl: lerp(a.radii.tl, b.radii.tl), tr: lerp(a.radii.tr, b.radii.tr), br: lerp(a.radii.br, b.radii.br), bl: lerp(a.radii.bl, b.radii.bl) }, pan: { x: lerp(a.pan.x, b.pan.x), y: lerp(a.pan.y, b.pan.y) }, visible: a.visible || b.visible }
}
