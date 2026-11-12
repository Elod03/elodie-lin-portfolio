import { useEffect, useRef } from 'react'

/**
 * Desktop About is a horizontal band that scrolls natively (overflow-x). The wheel is only translated
 * into sideways scrolling while the page can still move that way; nothing is pinned or captured at the ends.
 * The band can also be grabbed and pulled with a mouse or a held touchpad click (data-dragging while it moves).
 * Wheel and trackpad input move a target (a notch counts 1.8×, a small trackpad delta 1.25×) that a frame loop glides toward.
 * The arrow on the water (.about-hint) says "scroll" in words until the band has been moved (data-moved), then
 * becomes a ring that shows the progress; it scrolls one screen when clicked and disappears at the end (data-edge).
 * On the first visit of the session the band glides a little to the right and back once, unless the visitor moved first.
 * Below 768 px the page is an ordinary vertical column: only the reveals and the light apply.
 *
 * Effects wired here:
 * - reveals: what is off screen at load waits (data-wait) and plays when it arrives (data-seen), otherwise it would already be over;
 * - data-live: the water of a block only moves while it is on screen;
 * - pool:wake: scrolling the band leaves a wake in the water strip under the page;
 * - --mx/--my: the water light of a card follows the pointer.
 */
export function useAboutBand() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const page = ref.current
    if (!page) return
    const wide = matchMedia('(min-width: 768px)')
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    // The wheel moves a target and our own frame loop glides the band toward it. A browser smooth scroll
    // restarted on every wheel event starts again from zero speed each time, so during a fast spin or a
    // precision touchpad swipe the band sat still, then jumped once the input stopped.
    let target = -1, frame = 0, last = 0
    const glide = (now: number) => {
      const dt = last ? Math.min(64, now - last) : 16.7; last = now
      const current = page.scrollLeft, gap = target - current
      // About 22 % of the remaining distance per 60 Hz frame, at least 1 px so rounding never stalls it.
      const step = gap * (1 - Math.pow(.78, dt / 16.7))
      if (Math.abs(gap) <= 1.5) { page.scrollLeft = target; target = -1; frame = 0; last = 0; return }
      page.scrollLeft = current + Math.sign(gap) * Math.min(Math.abs(gap), Math.max(1, Math.abs(step)))
      frame = requestAnimationFrame(glide)
    }
    const onWheel = (event: WheelEvent) => {
      if (!wide.matches || event.ctrlKey || event.defaultPrevented) return
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
      if (page.scrollHeight > page.clientHeight + 1) return
      const max = page.scrollWidth - page.clientWidth
      const unit = event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? page.clientWidth : 1
      const delta = event.deltaY * unit
      const from = target >= 0 ? target : page.scrollLeft
      if ((delta > 0 && from >= max - 1) || (delta < 0 && from <= 0)) return
      event.preventDefault()
      target = Math.max(0, Math.min(max, from + delta * (Math.abs(delta) < 40 ? 1.25 : 1.8)))
      if (reduced.matches) { page.scrollLeft = target; target = -1; return }
      if (!frame) frame = requestAnimationFrame(glide)
    }
    // Grab and pull: with a mouse (or a touchpad click held down) the band follows the hand, then coasts on.
    // Fingers already scroll it natively. It only counts as a drag after 6 px, so clicks on links still work.
    let drag: { id: number; x: number; left: number; moved: boolean } | null = null
    let speed = 0, lastX = 0, lastT = 0
    const onDown = (event: PointerEvent) => {
      if (!wide.matches || event.pointerType === 'touch' || event.button !== 0) return
      if ((event.target as Element).closest('input, textarea, select, [contenteditable]')) return
      target = -1; cancelAnimationFrame(frame); frame = 0; last = 0
      drag = { id: event.pointerId, x: event.clientX, left: page.scrollLeft, moved: false }
      speed = 0; lastX = event.clientX; lastT = event.timeStamp
    }
    const onDrag = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return
      const dx = event.clientX - drag.x
      if (!drag.moved) {
        if (Math.abs(dx) < 6) return
        drag.moved = true; page.dataset.dragging = ''
        try { page.setPointerCapture(event.pointerId) } catch { /* pointer already gone */ }
        getSelection()?.removeAllRanges()
      }
      page.scrollLeft = drag.left - dx
      const dt = event.timeStamp - lastT
      if (dt > 0) speed = .7 * ((lastX - event.clientX) / dt) + .3 * speed
      lastX = event.clientX; lastT = event.timeStamp
    }
    const swallow = (event: Event) => { event.preventDefault(); event.stopPropagation() }
    const onUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return
      const moved = drag.moved
      drag = null; delete page.dataset.dragging
      if (!moved) return
      // The click that ends a drag must not open the link under the pointer.
      page.addEventListener('click', swallow, { capture: true, once: true })
      setTimeout(() => page.removeEventListener('click', swallow, { capture: true }), 0)
      // A flick keeps going a little, through the same glide as the wheel.
      if (!reduced.matches && Math.abs(speed) > .15 && event.timeStamp - lastT < 90) {
        const max = page.scrollWidth - page.clientWidth
        target = Math.max(0, Math.min(max, page.scrollLeft + speed * 280))
        if (!frame) frame = requestAnimationFrame(glide)
      }
    }
    const noNativeDrag = (event: DragEvent) => { if (wide.matches) event.preventDefault() }
    const edge = () => {
      const max = page.scrollWidth - page.clientWidth
      page.dataset.edge = max <= 1 || !wide.matches ? 'none' : page.scrollLeft <= 1 ? 'start' : page.scrollLeft >= max - 1 ? 'end' : 'mid'
      // The arrow lives above the water (portal), so it gets its state directly.
      const hint = document.querySelector<HTMLElement>('.about-hint')
      if (hint) { hint.dataset.edge = page.dataset.edge; hint.style.setProperty('--p', max > 1 ? (page.scrollLeft / max).toFixed(3) : '0') }
    }
    // Once per visit, if the visitor has not moved the band yet, it glides a little to the right and back,
    // so the sideways direction is shown rather than guessed. Any input stops it where it is.
    let nudging = false, nudgeFrame = 0, touched = false
    const stopNudge = () => { touched = true; nudging = false; cancelAnimationFrame(nudgeFrame) }
    const nudgeTimer = setTimeout(() => {
      if (touched || reduced.matches || !wide.matches || page.scrollLeft > 1 || page.scrollWidth - page.clientWidth < 200) return
      try { if (sessionStorage.getItem('about-nudged')) return; sessionStorage.setItem('about-nudged', '1') } catch { /* no storage: nudge anyway */ }
      nudging = true
      const reach = Math.min(140, page.clientWidth * .1), start = performance.now()
      const run = (now: number) => {
        if (!nudging) return
        const t = Math.min(1, (now - start) / 1500), eased = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        page.scrollLeft = reach * Math.sin(Math.PI * eased)
        if (t < 1) nudgeFrame = requestAnimationFrame(run); else { page.scrollLeft = 0; nudging = false }
      }
      nudgeFrame = requestAnimationFrame(run)
    }, 2600)
    const inputs = ['wheel', 'pointerdown', 'keydown', 'touchstart'] as const
    inputs.forEach(type => addEventListener(type, stopNudge, { passive: true }))
    let wakeAt = page.scrollLeft
    const onScroll = () => {
      edge()
      // The arrow keeps its words until the visitor has moved the band themself.
      if (!nudging && page.scrollLeft > 30) document.querySelector<HTMLElement>('.about-hint')?.setAttribute('data-moved', '')
      if (!wide.matches || Math.abs(page.scrollLeft - wakeAt) < 26) return
      wakeAt = page.scrollLeft
      const max = page.scrollWidth - page.clientWidth
      const w = innerWidth, h = innerHeight, band = Math.min(140, Math.max(100, h * .15))
      window.dispatchEvent(new CustomEvent('pool:wake', { detail: { x: w * .047 + w * .906 * (max > 0 ? page.scrollLeft / max : 0), y: h - 12 - band / 2 } }))
    }
    const onPointer = (event: PointerEvent) => {
      const card = (event.target as Element).closest<HTMLElement>('[data-spot]')
      if (!card) return
      const box = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${event.clientX - box.left}px`)
      card.style.setProperty('--my', `${event.clientY - box.top}px`)
    }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement
        if (entry.isIntersecting) { el.dataset.seen = ''; el.dataset.live = '' } else delete el.dataset.live
      }
    }, { root: wide.matches ? page : null, threshold: .1 })
    page.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el => {
      const box = el.getBoundingClientRect()
      if (box.left >= innerWidth || box.top >= innerHeight) el.dataset.wait = ''
      observer.observe(el)
    })
    page.addEventListener('wheel', onWheel, { passive: false })
    page.addEventListener('scroll', onScroll, { passive: true })
    page.addEventListener('pointermove', onPointer, { passive: true })
    page.addEventListener('pointerdown', onDown)
    page.addEventListener('pointermove', onDrag)
    page.addEventListener('dragstart', noNativeDrag)
    addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp)
    addEventListener('resize', edge)
    edge()
    return () => {
      observer.disconnect(); cancelAnimationFrame(frame); cancelAnimationFrame(nudgeFrame); clearTimeout(nudgeTimer)
      inputs.forEach(type => removeEventListener(type, stopNudge))
      page.removeEventListener('wheel', onWheel); page.removeEventListener('scroll', onScroll); page.removeEventListener('pointermove', onPointer)
      page.removeEventListener('pointerdown', onDown); page.removeEventListener('pointermove', onDrag); page.removeEventListener('dragstart', noNativeDrag)
      removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp)
      removeEventListener('resize', edge)
      delete page.dataset.edge; delete page.dataset.dragging
    }
  }, [])
  return ref
}
