import type { View, Viewport } from './types'
export function placePeekCard(anchor: { x: number; y: number; radius: number }, view: View, vp: Viewport, card: { w: number; h: number }, prefer?: 'below-right'): { x: number; y: number; side: 'top-right' | 'left' | 'above' | 'below' | 'below-right' } {
  const gap = 16
  const wantsBelowRight = prefer === 'below-right' && view.kind === 'home'
  const side = wantsBelowRight ? 'below-right' : view.kind === 'project' || view.kind === 'projects' || view.kind === 'about' ? 'left' : view.kind === 'playground' ? 'below' : 'top-right'
  let x = anchor.x + anchor.radius + gap, y = anchor.y - card.h - gap
  if (side === 'left') { x = anchor.x - anchor.radius - gap - card.w; y = anchor.y - card.h / 2 }
  if (side === 'below-right') { x = anchor.x + anchor.radius * .4; y = anchor.y + anchor.radius * .35 }
  if (side === 'below') { x = anchor.x - card.w / 2; y = anchor.y + anchor.radius + gap }
  return { x: Math.max(8, Math.min(Math.max(8, vp.w - card.w - 8), x)), y: Math.max(8, Math.min(Math.max(8, vp.h - card.h - 8), y)), side }
}
