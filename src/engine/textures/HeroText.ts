import * as THREE from 'three'
import type { HeroTextSpec } from '../types'

export interface HeroBand { y0: number; y1: number; x0: number; x1: number }
export interface HeroLayout {
  /** One band per written line (title first), CSS pixels, y down. Drives the line-by-line writing. */
  lines: HeroBand[]
  /** Rectangle of the end of the first name (CSS px), or null when there is nothing to transform. */
  tail: HeroBand | null
  /** Where the small cloud shadow sits: right of the title. */
  cloud: { x: number; y: number }
}

// Dots are crisp squares: no mipmaps, plain bilinear.
const crisp = (t: THREE.CanvasTexture) => { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; return t }
const empty = (): HeroLayout => ({ lines: [], tail: null, cloud: { x: 0, y: 0 } })

export class HeroText {
  canvas = document.createElement('canvas')
  texture = new THREE.CanvasTexture(this.canvas)
  /** Same dot grid, but only the end of the first name drawn as descending bars + a dot. */
  barsTexture = new THREE.CanvasTexture(document.createElement('canvas'))
  layout: HeroLayout = empty()
  /** Size of one dot cell in CSS pixels (the dot grid of the texture). */
  pitchCss = 5.4
  private generation = 0
  async draw(spec: HeroTextSpec, width: number, height: number) {
    const generation = ++this.generation
    const font = spec.lang === 'zh' ? 'Noto Sans SC' : 'Funnel Display'
    // Fontsource delivers CJK in unicode-range shards: passing the actual text
    // ensures every required glyph is available before baking the texture.
    await Promise.all([
      document.fonts.load(`700 64px "${font}"`, spec.title),
      document.fonts.load(`${spec.lang === 'zh' ? 700 : 500} 32px "${font}"`, spec.lines.join(' ')),
    ]).catch(() => [])
    if (generation !== this.generation) return
    const scale = Math.min(1.5, 1800 / width)
    // GPU texture storage has immutable dimensions after its first upload.
    // Build into a fresh canvas: fonts may finish after the initial empty
    // texture was rendered, and viewport changes can also change its size.
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.scale(scale, scale); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'
    const compact = width < 768
    const layout = empty()
    let fontSize = compact ? width * .13 : Math.min(width * .070, height * .120)
    ctx.font = `700 ${fontSize}px "${font}", sans-serif`
    const titleLines = compact && spec.lang !== 'zh' ? spec.title.split(/(?=Elodie)/) : [spec.title]
    for (const line of titleLines) while (ctx.measureText(line).width > width * (compact ? .8 : .65)) { fontSize *= .97; ctx.font = `700 ${fontSize}px "${font}", sans-serif` }
    const titleY = height * (compact ? .35 : .39)
    const lastTitle = titleLines.length - 1
    type Tail = { x0: number; x1: number; y: number }
    let tailFound = null as Tail | null
    titleLines.forEach((raw, i) => {
      const line = raw.trim(), y = titleY + i * fontSize * 1.2, w = ctx.measureText(line).width
      ctx.fillText(line, width / 2, y)
      layout.lines.push({ y0: y - fontSize * .62, y1: y + fontSize * .62, x0: width / 2 - w / 2 - 8, x1: width / 2 + w / 2 + 8 })
      if (i === lastTitle) {
        layout.cloud = { x: width / 2 + w / 2 + fontSize * (compact ? .55 : 1.1), y: y - fontSize * .1 }
        if (spec.morphTail && line.endsWith(spec.morphTail)) {
          const left = width / 2 - w / 2
          tailFound = { x0: left + ctx.measureText(line.slice(0, -spec.morphTail.length)).width, x1: left + w, y }
        }
      }
    })
    const titleFont = fontSize
    let subSize = compact ? width * .072 : Math.min(width * .048, height * .080)
    const subtitleWeight = spec.lang === 'zh' ? 700 : 500
    ctx.font = `${subtitleWeight} ${subSize}px "${font}", sans-serif`
    if (!compact) for (const line of spec.lines) while (ctx.measureText(line).width > width * .67) { subSize *= .97; ctx.font = `${subtitleWeight} ${subSize}px "${font}", sans-serif` }
    // Phone: the subtitle stays on the pool floor (the walls take 11.8 % of the pool width on each side) with 16 px to spare, and shrinks (down to 17 px) until each of its lines stays on one line.
    const maxWidth = compact ? width * .92 * (1 - 2 * .118) - 32 : width * .69
    const wrap = () => {
      const out: string[] = []
      for (const source of spec.lines) {
        const words = spec.lang === 'zh' ? [...source] : source.split(' ')
        let line = ''
        for (const word of words) {
          const next = line + (line && spec.lang !== 'zh' ? ' ' : '') + word
          if (line && ctx.measureText(next).width > maxWidth) { out.push(line); line = word } else line = next
        }
        if (line) out.push(line)
      }
      return out
    }
    let lines = wrap()
    while (compact && lines.length > Math.max(spec.lines.length, 1) && subSize > 17) { subSize *= .96; ctx.font = `${subtitleWeight} ${subSize}px "${font}", sans-serif`; lines = wrap() }
    const subtitleY = compact ? titleY + (titleLines.length - 1) * titleFont * 1.2 + titleFont * 1.3 : height * .52
    lines.slice(0, compact ? 5 : 3).forEach((line, i) => {
      const y = subtitleY + i * subSize * (compact ? 1.38 : 1.28), w = ctx.measureText(line).width
      ctx.fillText(line, width / 2, y)
      layout.lines.push({ y0: y - subSize * .7, y1: y + subSize * .7, x0: width / 2 - w / 2 - 8, x1: width / 2 + w / 2 + 8 })
    })
    const tail = tailFound as Tail | null
    // Bars: three descending verticals and a square dot, the same shape as the logo ("lim.").
    let bars: HTMLCanvasElement | null = null
    if (tail) {
      const barsCanvas = document.createElement('canvas'); barsCanvas.width = canvas.width; barsCanvas.height = canvas.height
      const b = barsCanvas.getContext('2d', { willReadFrequently: true })!
      b.scale(scale, scale); b.fillStyle = '#fff'
      const span = tail.x1 - tail.x0, unit = span / 5.35, base = tail.y + titleFont * .34
      ;[.74, .54, .34].forEach((h, k) => b.fillRect(tail.x0 + k * unit * 1.45, base - h * titleFont, unit, h * titleFont))
      b.fillRect(tail.x0 + 3 * unit * 1.45, base - unit, unit, unit)
      layout.tail = { x0: tail.x0 - 2, x1: tail.x1 + 4, y0: tail.y - titleFont * .62, y1: tail.y + titleFont * .62 }
      bars = barsCanvas
    }
    // Sample the glyph coverage into a true dotted texture: big square dots on a 6 px grid
    // (5 px on phones), with transparent space between them so the water stays visible.
    const pitch = Math.max(4, Math.round((compact ? 2.7 : 5.4) * scale)), size = Math.max(3, Math.round(pitch * .68)), pad = Math.floor((pitch - size) / 2)
    const dotify = (source: HTMLCanvasElement, target: CanvasRenderingContext2D, cw: number, ch: number) => {
      const pixels = source.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, cw, ch)
      target.setTransform(1, 0, 0, 1, 0, 0); target.clearRect(0, 0, cw, ch); target.fillStyle = '#fff'
      const at = (x: number, y: number) => pixels.data[(Math.min(ch - 1, Math.floor(y)) * cw + Math.min(cw - 1, Math.floor(x))) * 4 + 3]
      for (let y = 0; y < ch; y += pitch) for (let x = 0; x < cw; x += pitch) {
        // Average coverage over the cell (3x3 taps) so thin strokes still light a dot.
        let sum = 0
        for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) sum += at(x + pitch * (i + .5) / 3, y + pitch * (j + .5) / 3)
        if (sum / 9 > 55) target.fillRect(x + pad, y + pad, size, size)
      }
    }
    const barsOut = document.createElement('canvas'); barsOut.width = canvas.width; barsOut.height = canvas.height
    if (bars) dotify(bars, barsOut.getContext('2d')!, canvas.width, canvas.height)
    // dotify reads from `canvas` and rewrites it: copy the source first.
    const source = document.createElement('canvas'); source.width = canvas.width; source.height = canvas.height
    source.getContext('2d', { willReadFrequently: true })!.drawImage(canvas, 0, 0)
    dotify(source, ctx, canvas.width, canvas.height)
    this.pitchCss = pitch / scale
    const previous = this.texture, previousBars = this.barsTexture
    this.canvas = canvas; this.layout = layout
    this.texture = crisp(new THREE.CanvasTexture(canvas))
    this.barsTexture = crisp(new THREE.CanvasTexture(barsOut))
    previous.dispose(); previousBars.dispose()
  }
  dispose() { this.generation++; this.texture.dispose(); this.barsTexture.dispose() }
}
