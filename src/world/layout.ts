import { isCompact, type LayoutContext, type ObjectId, type View } from './types'
import type { PoolFrame } from './frame'
export interface ObjectPlacement { id: ObjectId; x: number; y: number; size: number; lift: number; visible: boolean; /** 0..1 scale/opacity while an object leaves or joins the scene; absent = 1 */ fade?: number }
export function layoutObjects(view: View, ctx: LayoutContext, frame: PoolFrame): ObjectPlacement[] {
  const { w, h } = ctx.viewport, compact = isCompact(ctx.viewport), r = frame.rect
  const ids: ObjectId[] = ['avatar', ...ctx.projectSlugs.map(s => `project:${s}` as const), 'duck', 'cloud']
  const n = ctx.projectSlugs.length
  const result = ids.map((id, i): ObjectPlacement => {
    let x = 0, y = 0, size = 0
    if (view.kind === 'home') {
      size = Math.min(w * (compact ? .15 : .075), h * (compact ? .15 : .13))
      if (id === 'avatar') { x = w * (compact ? .23 : .15); y = h * .23; size = Math.min(h * (compact ? .15 : .16), w * .17) }
      else if (id === 'cloud') { x = w * (compact ? .77 : .85); y = h * (compact ? .22 : .20); size = w * (compact ? .18 : .078) }
      else if (id === 'duck') { x = w * (compact ? .77 : .862); y = h * (compact ? .8 : .795); size = Math.min(w * (compact ? .19 : .09), h * .16) }
      else {
        const j = i - 1
        x = w * (compact ? .21 + j * .58 / Math.max(1, n - 1) : n === 3 ? [.34, .505, .64][j] : .29 + j * .40 / Math.max(1, n - 1))
        // Phone: the row sits at 62 % so its labels stay clear of the duck (the pool ends 152 px above the bottom, see HOME_MOBILE).
        // Desktop: a slight stagger that stays within the reference row (.78–.805), so the labels clear the pool edge on 720 px screens.
        y = h * (compact ? .62 : n === 3 ? [.80, .795, .805][j] : .78 + (j % 2) * .025)
      }
    } else if (compact) {
      // Phone band (120 px): one row, one slot each, big enough to tap.
      const slot = r.w / (n + 2)
      size = Math.min(r.h * .58, slot * .8)
      x = r.x + slot * (i + .5); y = r.y + r.h * .5
    } else if (view.kind === 'project' || view.kind === 'projects') {
      // Like the reference strip: big objects (about 60 % of the band), one slot each, no labels.
      // (The About strip, below, shows no labels either: all three strips hide .object-label in projects.css.)
      const slot = r.h / (n + 2.2)
      size = Math.min(r.w * .62, slot * .84)
      x = r.x + r.w * .55; y = r.y + slot * (i + .6)
    } else {
      size = Math.min(r.h * .58, r.w / (n + 3) * .6)
      // About: the right end of the strip is kept free for the "scroll" pill (.about-hint, about 145 px wide).
      const room = view.kind === 'about' ? 150 : 0
      x = r.x + (r.w - room) * (i + 1) / (n + 3); y = r.y + r.h * (view.kind === 'about' ? .44 : .5)
    }
    const margin = size / 2 + 8
    x = Math.max(r.x + margin, Math.min(r.x + r.w - margin, x))
    y = Math.max(r.y + margin, Math.min(r.y + r.h - margin, y))
    return { id, x, y, size, lift: id === 'avatar' ? size * .2 : size * .07, visible: frame.visible && (view.kind === 'home' || id !== 'cloud') }
  })
  return result
}
