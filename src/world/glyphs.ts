import type { Rect } from './types'
export function barsGlyphPath(box: Rect, o: { bars: number; decay: number; dot: boolean }): string {
  const count = Math.max(1, Math.floor(o.bars)), step = box.w / (count + (o.dot ? 1 : 0)), width = step * .65
  const decay = Math.min(.95, Math.max(.05, o.decay))
  const rect = (x: number, y: number, w: number, h: number) => `M${x},${y}h${w}v${h}h${-w}Z`
  const bars = Array.from({ length: count }, (_, i) => { const h = box.h * Math.pow(decay, i); return rect(box.x + step * i, box.y + box.h - h, width, h) })
  if (o.dot) bars.push(rect(box.x + step * count, box.y + box.h - width, width, width))
  return bars.join(' ')
}
