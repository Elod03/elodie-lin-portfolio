import { useEffect, useState } from 'react'

/** Sent by the engine host when a page has landed (transition over, or first load): who arrived, and whether it was the browser's back/forward button. */
export const LANDED_EVENT = 'pool:landed'
export interface LandedDetail { view: 'projects' | 'project' | 'about' | 'playground' | 'not-found' | 'home'; back: boolean }

/** The main block of each page, and the way the light travels (away from the water strip: right strip -> leftwards, bottom strip -> upwards, top strip -> downwards). */
export const MAIN_BLOCK: Record<Exclude<LandedDetail['view'], 'home'>, { selectors: string[]; dir: 'left' | 'up' | 'down' }> = {
  projects: { selectors: ['.projects-heading', '.project-row:first-child .project-visual'], dir: 'left' },
  project: { selectors: ['.case-hero-frame'], dir: 'left' },
  about: { selectors: ['.about-me'], dir: 'up' },
  playground: { selectors: ['.playground-feature'], dir: 'down' },
  'not-found': { selectors: ['.not-found h1'], dir: 'up' },
}

interface Sweep { id: number; left: number; top: number; width: number; height: number; radius: string; dir: 'left' | 'up' | 'down'; still: boolean }
let counter = 0

/**
 * Arrival reflex (design-direction §3): once the page has landed, ONE caustic reflection crosses its main block in 900 ms.
 * The content is already visible, the light only passes over it. Not replayed on scroll, hover or back; absent with reduced motion;
 * without WebGL it stays a still tile at 8 %.
 */
export function WaterLight() {
  const [sweep, setSweep] = useState<Sweep | null>(null)
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    function landed(event: Event) {
      cancelAnimationFrame(frame)
      setSweep(null)
      const { view, back } = (event as CustomEvent<LandedDetail>).detail
      if (view === 'home' || back || media.matches) return
      frame = requestAnimationFrame(() => {
        const block = MAIN_BLOCK[view]
        const nodes = block.selectors.map(selector => document.querySelector<HTMLElement>(selector)).filter((node): node is HTMLElement => !!node)
        if (!nodes.length) return
        const rects = nodes.map(node => node.getBoundingClientRect()).filter(rect => rect.width > 0 && rect.height > 0)
        if (!rects.length) return
        const left = Math.min(...rects.map(r => r.left)), top = Math.min(...rects.map(r => r.top))
        const right = Math.max(...rects.map(r => r.right)), bottom = Math.max(...rects.map(r => r.bottom))
        const fallback = document.querySelector('.scene')?.getAttribute('data-fallback') === 'true'
        setSweep({ id: ++counter, left: left + scrollX, top: top + scrollY, width: right - left, height: bottom - top, radius: nodes.length === 1 ? getComputedStyle(nodes[0]).borderRadius : '0', dir: window.innerWidth < 768 ? 'down' : block.dir, still: fallback })
      })
    }
    window.addEventListener(LANDED_EVENT, landed)
    return () => { cancelAnimationFrame(frame); window.removeEventListener(LANDED_EVENT, landed) }
  }, [])
  if (!sweep) return null
  return <div key={sweep.id} className="water-light" data-dir={sweep.dir} data-still={sweep.still || undefined} aria-hidden="true"
    style={{ left: sweep.left, top: sweep.top, width: sweep.width, height: sweep.height, borderRadius: sweep.radius }}
    onAnimationEnd={() => setSweep(null)} />
}
