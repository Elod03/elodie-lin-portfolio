// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
const { draw, interact, dispose, score } = vi.hoisted(() => ({ draw: vi.fn(), interact: vi.fn(), dispose: vi.fn(), score: vi.fn(() => 0) }))
vi.mock('./koi', () => ({ koi: () => ({ draw, interact, dispose, score }) }))
vi.mock('./ink', () => ({ ink: () => ({ draw, interact, dispose }) }))
vi.mock('./hanzi', () => ({ hanzi: () => ({ draw, interact, dispose }) }))
vi.mock('./darkroom', () => ({ darkroom: () => ({ draw, interact, dispose }) }))
vi.mock('./sand', () => ({ sand: () => ({ draw, interact, dispose }) }))
vi.mock('./bubbles', () => ({ bubbles: () => ({ draw, interact, dispose }) }))
import { mountExperiment } from './registry'

describe('experiment lifecycle', () => {
  let canvas: HTMLCanvasElement
  let next: number
  const frames = new Map<number, FrameRequestCallback>()
  beforeEach(() => {
    vi.clearAllMocks(); frames.clear(); next = 0
    canvas = document.createElement('canvas'); document.body.append(canvas)
    vi.spyOn(canvas, 'getContext').mockReturnValue({ setTransform: vi.fn() } as unknown as CanvasRenderingContext2D)
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, width: 800, height: 500, top: 0, left: 0, right: 800, bottom: 500, toJSON: () => ({}) })
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
    vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++next, fn); return next })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  })
  afterEach(() => { canvas.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
  it('pauses and resumes one animation loop, and disposal removes interactions', () => {
    const demo = mountExperiment('koi', canvas, { seed: 42, reducedMotion: false })
    expect(frames.size).toBe(1)
    demo.setPaused(true); expect(frames.size).toBe(0)
    demo.setPaused(false); expect(frames.size).toBe(1)
    demo.setPaused(false); expect(frames.size).toBe(1)
    demo.dispose(); demo.dispose(); expect(frames.size).toBe(0); expect(dispose).toHaveBeenCalledTimes(1)
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(interact).not.toHaveBeenCalled()
  })
  it('keeps reduced-motion interaction available without an automatic animation loop', () => {
    const demo = mountExperiment('sable', canvas, { seed: 42, reducedMotion: true })
    expect(frames.size).toBe(0)
    const before = draw.mock.calls.length
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(interact).toHaveBeenCalledWith('down'); expect(draw.mock.calls.length).toBeGreaterThan(before)
    demo.setPaused(false); expect(frames.size).toBe(0)
    demo.dispose()
  })
  it('reports score changes to the page, and only changes', () => {
    const onScore = vi.fn()
    const demo = mountExperiment('koi', canvas, { seed: 42, reducedMotion: false, onScore })
    score.mockReturnValue(100)
    frames.get(1)!(16); expect(onScore).toHaveBeenCalledWith(100)
    frames.get(2)!(32); expect(onScore).toHaveBeenCalledTimes(1)
    score.mockReturnValue(0); demo.dispose()
  })
})
