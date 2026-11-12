import { describe, expect, it } from 'vitest'
import { BAND, bandGone, computeFrame, lerpFrame, worldWindow } from './frame'
import { layoutObjects } from './layout'
import { allRoutes, alternates, buildRoute, parseRoute } from './routes'
import { floatMotion } from './motion'
import { motionPolicy } from './motionPolicy'
import { planTransition, sampleTransition, snapshotFor } from './transitions'
import { initDirector, reduce } from './director'
import { placePeekCard } from './peek'
import { barsGlyphPath } from './glyphs'
import type { LayoutContext, View } from './types'
const slugs = ['streamflix', 'yoru', 'kanpai', 'carnival']
const ctx: LayoutContext = { viewport: { w: 1440, h: 900, dpr: 1 }, projectSlugs: slugs, logoRect: { x: 24, y: 20, w: 80, h: 40 } }
const home: View = { kind: 'home' }, project: View = { kind: 'project', slug: 'yoru' }, about: View = { kind: 'about' }, playground: View = { kind: 'playground' }
const full = motionPolicy(false)

describe('pool frames', () => {
  it('matches measured home bounds and exact interpolation endpoints', () => {
    const a = computeFrame(home, ctx), b = computeFrame(project, ctx)
    expect(a.rect).toEqual({ x: 67.68, y: 67.5, w: 1304.64, h: 760.5 })
    expect(b.rect.x + b.rect.w).toBe(1440)
    expect(b.radii.tr).toBe(0)
    expect(b.radii.br).toBe(0)
    expect(lerpFrame(a, b, 0)).toEqual(a)
    expect(lerpFrame(a, b, 1)).toEqual(b)
  })
  it('places horizontal strips on desktop; on a phone every page gets the 120 px band', () => {
    const dock = computeFrame(about, ctx).rect
    expect(dock.w).toBeGreaterThan(ctx.viewport.w * .8)
    expect(dock.y).toBeGreaterThan(ctx.viewport.h * .8)
    expect(dock.y + dock.h).toBeLessThanOrEqual(ctx.viewport.h)
    expect(computeFrame(playground, ctx).rect.x).toBeGreaterThan(ctx.logoRect.x + ctx.logoRect.w)
    const mobile = { ...ctx, viewport: { w: 390, h: 844, dpr: 2 } }
    for (const view of [project, about, playground, { kind: 'projects' } as View]) {
      const f = computeFrame(view, mobile)
      expect(f.visible).toBe(true)
      expect(f.rect).toEqual({ x: 16, y: 64, w: 358, h: 120 })
    }
    expect(computeFrame(home, mobile).visible).toBe(true)
  })
  it('phone band scrolls with the page (y = base - scrollY) and is off screen after 200 px', () => {
    const mobile = { ...ctx, viewport: { w: 390, h: 844, dpr: 2 } }
    for (const view of [project, about, playground]) {
      expect(computeFrame(view, mobile).rect.y).toBe(64)
      expect(computeFrame(view, { ...mobile, scrollY: 40 }).rect.y).toBe(24)
      expect(computeFrame(view, { ...mobile, scrollY: 40 }).visible).toBe(true)
      const gone = computeFrame(view, { ...mobile, scrollY: 200 })
      expect(gone.rect.y + gone.rect.h).toBeLessThanOrEqual(0)
      expect(gone.visible).toBe(false)
    }
    expect(bandGone(183)).toBe(false); expect(bandGone(BAND.gone)).toBe(true); expect(BAND.gone).toBeLessThanOrEqual(200)
    // The home pool does not scroll, and the desktop is untouched by scrollY.
    expect(computeFrame(home, { ...mobile, scrollY: 300 })).toEqual(computeFrame(home, mobile))
    expect(computeFrame(about, { ...ctx, scrollY: 300 })).toEqual(computeFrame(about, ctx))
  })
  it('phone home pool leaves room under it for the help line and the button', () => {
    const f = computeFrame(home, { ...ctx, viewport: { w: 390, h: 844, dpr: 2 } })
    expect(f.rect.y).toBe(72); expect(f.rect.y + f.rect.h).toBe(844 - 152)
  })
  it('playground strip is glued to the top edge (y 0 to 14 %), right of the logo, with rounded bottom corners only', () => {
    for (const [w, h] of [[1440, 900], [1280, 720], [1920, 1080]]) {
      const c = { ...ctx, viewport: { w, h, dpr: 1 } }, f = computeFrame(playground, c)
      expect(f.rect.y).toBe(0); expect(f.rect.h).toBeCloseTo(h * .14, 5)
      expect(f.rect.x).toBeGreaterThan(c.logoRect.x + c.logoRect.w)
      expect(f.radii.tl).toBe(0); expect(f.radii.tr).toBe(0); expect(f.radii.bl).toBeGreaterThan(0); expect(f.radii.br).toBeGreaterThan(0)
    }
  })
  it('playground strip starts to the right of the header navigation when it is measured', () => {
    const c = { ...ctx, navRight: 502 }, f = computeFrame(playground, c)
    expect(f.rect.x).toBeGreaterThanOrEqual(526)
    expect(f.rect.x + f.rect.w).toBeCloseTo(1440 * .953, 5)
  })
  it('playground strip stops before the header controls', () => {
    const f = computeFrame(playground, { ...ctx, navRight: 502, controlsLeft: 1240 })
    expect(f.rect.x + f.rect.w).toBeCloseTo(1216, 5)
    expect(f.rect.x).toBeGreaterThanOrEqual(526)
  })
  it('galleries reuse the project strip and transition into a case without moving it', () => {
    const gallery: View = { kind: 'projects' }
    expect(computeFrame(gallery,ctx)).toEqual(computeFrame(project,ctx))
    expect(layoutObjects(gallery,ctx,computeFrame(gallery,ctx))).toEqual(layoutObjects(project,ctx,computeFrame(project,ctx)))
    const plan = planTransition(snapshotFor(gallery,ctx),gallery,project,ctx,full)
    expect(plan.durationMs).toBe(200)
    expect(sampleTransition(plan,100).frame).toEqual(plan.from.frame)
    expect(computeFrame(gallery,{...ctx,viewport:{w:390,h:844,dpr:1}}).visible).toBe(true)
  })
})
describe('object layout', () => {
  for (const w of [768, 1024, 1280, 1440, 1920]) for (const count of [3, 4]) {
    it(`about: ${w} px, ${count} projects, the right end of the strip stays free for the scroll pill`, () => {
      const c = { ...ctx, viewport: { w, h: 800, dpr: 1 }, projectSlugs: Array.from({ length: count }, (_, i) => `p${i}`) }
      const frame = computeFrame(about, c), objects = layoutObjects(about, c, frame).filter(o => o.visible)
      for (const o of objects) expect(o.x + o.size / 2).toBeLessThanOrEqual(frame.rect.x + frame.rect.w - 170)
    })
  }
  for (const [w, h] of [[1440,900], [1280,720], [1920,1080], [390,844]]) {
    for (const count of [2,3,4]) for (const view of [home,project,about,playground]) {
      it(`${view.kind}: ${w}×${h}, ${count} projects fit and do not overlap`, () => {
        const c = { ...ctx, viewport: { w, h, dpr: 1 }, projectSlugs: Array.from({ length: count }, (_, i) => `p${i}`) }
        const frame = computeFrame(view, c), objects = layoutObjects(view, c, frame).filter(o => o.visible)
        for (const o of objects) {
          expect(o.x - o.size / 2).toBeGreaterThanOrEqual(frame.rect.x)
          expect(o.x + o.size / 2).toBeLessThanOrEqual(frame.rect.x + frame.rect.w)
          expect(o.y - o.size / 2).toBeGreaterThanOrEqual(frame.rect.y)
          expect(o.y + o.size / 2).toBeLessThanOrEqual(frame.rect.y + frame.rect.h)
          for (const other of objects.filter(p => p.id !== o.id)) expect(Math.hypot(o.x-other.x, o.y-other.y)).toBeGreaterThan(.4 * (o.size + other.size))
        }
      })
    }
  }
  it('places desktop objects like the reference and sidebar ordering', () => {
    const three = { ...ctx, projectSlugs: slugs.slice(0, 3) }
    expect(layoutObjects(home,three,computeFrame(home,three)).find(o => o.id === 'project:yoru')?.x).toBe(1440*.505)
    const objects = layoutObjects(home,ctx,computeFrame(home,ctx))
    expect(objects.find(o => o.id === 'cloud')?.y).toBe(900*.20)
    // Four tiles: one even row in the lower part of the pool, left of the duck.
    const tiles = objects.filter(o => o.id.startsWith('project:')), duck = objects.find(o => o.id === 'duck')!
    expect(tiles.map(o => o.id)).toEqual(['project:streamflix','project:yoru','project:kanpai','project:carnival'])
    for (let i = 1; i < tiles.length; i++) expect(tiles[i].x).toBeGreaterThan(tiles[i - 1].x)
    expect(tiles[3].x + tiles[3].size / 2).toBeLessThan(duck.x - duck.size / 2)
    // …and their labels clear the pool edge on a 720 px screen too.
    const short = { ...ctx, viewport: { w: 1280, h: 720, dpr: 1 } }, shortFrame = computeFrame(home, short)
    for (const o of layoutObjects(home, short, shortFrame).filter(o => o.id.startsWith('project:'))) expect(o.y + o.size * .62 + 18).toBeLessThan(shortFrame.rect.y + shortFrame.rect.h)
    const strip = layoutObjects(project,ctx,computeFrame(project,ctx))
    expect(strip.filter(o => o.visible).map(o => o.id)).toEqual(['avatar','project:streamflix','project:yoru','project:kanpai','project:carnival','duck'])
    expect(strip.find(o => o.id === 'cloud')?.visible).toBe(false)
  })
})
describe('routes', () => {
  it('round trips all 24 routes including project galleries', () => {
    const routes = allRoutes(slugs)
    expect(routes).toHaveLength(24)
    expect(new Set(routes.map(buildRoute)).size).toBe(24)
    for (const route of routes) expect(parseRoute(buildRoute(route),slugs)).toEqual(route)
  })
  it('handles language root and rejects unknown routes', () => {
    expect(parseRoute('/en',slugs)).toEqual({ lang:'en',view:home })
    expect(parseRoute('/en/',slugs)).toEqual({ lang:'en',view:home })
    for (const path of ['/projets/nope','/about','/en/a-propos','/en/projects/yoru/extra']) expect(parseRoute(path,slugs)).toBeNull()
    expect(alternates(project)['x-default']).toBe('/projets/yoru')
    expect(parseRoute('/projets', slugs)).toEqual({lang:'fr',view:{kind:'projects'}})
    expect(parseRoute('/en/projects', slugs)).toEqual({lang:'en',view:{kind:'projects'}})
    expect(parseRoute('/zh/projects', slugs)).toEqual({lang:'zh',view:{kind:'projects'}})
  })
})
describe('motion', () => {
  it('is bounded, smooth, deterministic, and does not repeat at 60 seconds', () => {
    const amp = { posPx: 10, tiltRad: .1, yawRad: .2 }
    for (let t=0;t<120;t+=.13) {
      const a=floatMotion(3,t,amp),b=floatMotion(3,t+1/120,amp)
      expect(Math.abs(a.dx)).toBeLessThanOrEqual(10)
      expect(Math.abs(a.dy)).toBeLessThanOrEqual(10)
      expect(Math.abs(a.rotX)).toBeLessThanOrEqual(.1)
      expect(Math.abs(a.rotY)).toBeLessThanOrEqual(.2)
      expect(Math.abs(a.dx-b.dx)).toBeLessThan(.1)
    }
    expect(floatMotion(1,0,amp)).toEqual(floatMotion(1,0,amp))
    expect(floatMotion(1,0,amp)).not.toEqual(floatMotion(1,60,amp))
    expect(motionPolicy(true)).toMatchObject({ floatAmp:0,pointerWake:false,intro:false,driftSpeed:0 })
  })
})
describe('transitions and director', () => {
  it('preserves endpoints and stages grouping before the project strip', () => {
    const from=snapshotFor(home,ctx), plan=planTransition(from,home,project,ctx,full)
    expect(plan.durationMs).toBe(1500)
    expect(plan.content.inStartMs).toBeGreaterThanOrEqual(1100)
    expect(sampleTransition(plan,0).frame).toEqual(from.frame)
    expect(sampleTransition(plan,0).objects).toEqual(from.objects)
    expect(sampleTransition(plan,1500)).toMatchObject({ ...plan.to,done:true,contentIn:1 })
    const centroid = (objects: typeof from.objects) => objects.reduce((sum,o)=>sum+o.x,0)/objects.length
    expect(centroid(sampleTransition(plan,300).objects)).toBeLessThan(centroid(from.objects))
  })
  it('project swap is 200ms; about to playground passes through the home frame', () => {
    const swap=planTransition(snapshotFor(project,ctx),project,{kind:'project',slug:'streamflix'},ctx,full)
    expect(swap.durationMs).toBe(200)
    expect(sampleTransition(swap,100).frame).toEqual(swap.from.frame)
    const plan=planTransition(snapshotFor(about,ctx),about,playground,ctx,full)
    expect(sampleTransition(plan,450).frame).toEqual(computeFrame(home,ctx))
  })
  it('reduced motion snaps geometry and limits duration', () => {
    const plan=planTransition(snapshotFor(home,ctx),home,project,ctx,motionPolicy(true))
    expect(plan.durationMs).toBeLessThanOrEqual(300)
    expect(sampleTransition(plan,0).frame).toEqual(plan.to.frame)
    expect(sampleTransition(plan,100).frame).toEqual(plan.to.frame)
    expect(sampleTransition(plan,0).objects).toEqual(plan.to.objects)
  })
  it('replans interrupted transitions without a jump and settles once', () => {
    const initial=initDirector(home,ctx)
    expect(reduce(initial,{type:'escape',now:0},ctx,full).effects).toEqual([])
    const first=reduce(initial,{type:'navigate',view:project,now:100},ctx,full).state
    if(first.kind!=='transitioning') throw new Error('Expected transition')
    const second=reduce(first,{type:'navigate',view:about,now:500},ctx,full).state
    if(second.kind!=='transitioning') throw new Error('Expected transition')
    expect(second.plan.from.frame).toEqual(sampleTransition(first.plan,400).frame)
    const settled=reduce(second,{type:'tick',now:5000},ctx,full)
    expect(settled.effects).toEqual([{type:'settled',view:about}])
    expect(reduce(settled.state,{type:'tick',now:5001},ctx,full).effects).toEqual([])
  })
  it('resize in flight targets the new viewport and Escape returns home', () => {
    const first=reduce(initDirector(home,ctx),{type:'navigate',view:project,now:0},ctx,full).state
    const resized={...ctx,viewport:{w:1000,h:720,dpr:1}}
    const next=reduce(first,{type:'resize',now:500},resized,full).state
    if(next.kind!=='transitioning') throw new Error('Expected transition')
    expect(next.plan.to.frame).toEqual(computeFrame(project,resized))
    const escape=reduce(next,{type:'escape',now:600},resized,full).state
    if(escape.kind!=='transitioning') throw new Error('Expected transition')
    expect(escape.plan.toView).toEqual(home)
  })
})
describe('objects stay attached to the pool during every transition', () => {
  const views: View[] = [home, project, about, playground]
  for (const [w, h] of [[1440, 900], [1280, 720], [1920, 1080]]) {
    for (const a of views) for (const b of views) {
      if (a.kind === b.kind) continue
      it(`${a.kind} -> ${b.kind} at ${w}x${h}: every visible centre is inside the sampled frame`, () => {
        const c = { ...ctx, viewport: { w, h, dpr: 1 } }
        const plan = planTransition(snapshotFor(a, c), a, b, c, full)
        for (let t = 0; t <= plan.durationMs + 32; t += 16) {
          const s = sampleTransition(plan, t), r = s.frame.rect
          for (const o of s.objects.filter(p => p.visible)) {
            const slack = o.size / 2 + .5
            expect(o.x, `${o.id} x at ${t}ms`).toBeGreaterThanOrEqual(r.x - slack)
            expect(o.x, `${o.id} x at ${t}ms`).toBeLessThanOrEqual(r.x + r.w + slack)
            expect(o.y, `${o.id} y at ${t}ms`).toBeGreaterThanOrEqual(r.y - slack)
            expect(o.y, `${o.id} y at ${t}ms`).toBeLessThanOrEqual(r.y + r.h + slack)
          }
        }
      })
    }
  }
  it('home -> project: left edge leads, strip in place by 1.1 s, small final overshoot only', () => {
    const plan = planTransition(snapshotFor(home, ctx), home, project, ctx, full)
    const start = plan.from.frame.rect, end = plan.to.frame.rect
    expect(sampleTransition(plan, 300).frame.rect).toEqual(start)
    const mid = sampleTransition(plan, 600).frame.rect
    const edge = (r: typeof mid) => r.x + r.w
    expect((mid.x - start.x) / (end.x - start.x)).toBeGreaterThan((edge(mid) - edge(start)) / (edge(end) - edge(start)))
    expect(sampleTransition(plan, 1100).frame.rect).toEqual(end)
    // Overshoot: sample the object phase (frame-relative u) and measure how far past its target an object goes.
    const rel = (o: { x: number }, r: typeof start) => (o.x - r.x) / r.w
    const at300 = sampleTransition(plan, 300)
    let worst = 0, any = false
    for (const id of plan.to.objects.filter(o => o.visible).map(o => o.id)) {
      const uS = rel(at300.objects.find(o => o.id === id)!, at300.frame.rect), uT = rel(plan.to.objects.find(o => o.id === id)!, end)
      const travel = uT - uS
      if (Math.abs(travel) < .05) continue
      any = true
      for (let t = 600; t <= 1100; t += 16) {
        const s2 = sampleTransition(plan, t), u = rel(s2.objects.find(o => o.id === id)!, s2.frame.rect)
        worst = Math.max(worst, (u - uT) * Math.sign(travel) / Math.abs(travel))
      }
    }
    expect(any).toBe(true)
    expect(worst).toBeGreaterThan(0)
    expect(worst).toBeLessThanOrEqual(.03 + 1e-9)
  })
  it('frame velocity is continuous at the interior key (900 ms); the 0-300 ms regroup is a deliberate hold', () => {
    const plan = planTransition(snapshotFor(home, ctx), home, project, ctx, full)
    const vel = (t: number) => { const a = sampleTransition(plan, t - 16).frame.rect, b = sampleTransition(plan, t + 16).frame.rect; return { x: (b.x - a.x) / 32, w: (b.w - a.w) / 32 } }
    const before = vel(884), after = vel(916), at = vel(900)
    for (const v of [before, at, after]) expect(Math.abs(v.x) + Math.abs(v.w)).toBeGreaterThan(.05)
    expect(Math.abs(after.x - before.x)).toBeLessThan(Math.abs(at.x) * .5 + .05)
    expect(Math.abs(after.w - before.w)).toBeLessThan(Math.abs(at.w) * .5 + .05)
    // hold: frame is motionless up to 300 ms
    expect(sampleTransition(plan, 150).frame.rect).toEqual(plan.from.frame.rect)
    // after the hold the frame keeps moving until it is in place (no stall at the interior key)
    for (let t = 316; t < 1100; t += 16) expect(Math.abs(vel(t).x)).toBeGreaterThan(0)
  })
  it('an object hidden before the transition appears at its own target, not at the grouping point', () => {
    const plan = planTransition(snapshotFor(project, ctx), project, home, ctx, full)
    expect(plan.from.objects.find(o => o.id === 'cloud')!.visible).toBe(false)
    const s = sampleTransition(plan, 16), cloud = s.objects.find(o => o.id === 'cloud')!, target = plan.to.objects.find(o => o.id === 'cloud')!
    const r = s.frame.rect, tr = plan.to.frame.rect
    expect(cloud.visible).toBe(true)
    expect((cloud.x - r.x) / r.w).toBeCloseTo((target.x - tr.x) / tr.w, 6)
    expect((cloud.y - r.y) / r.h).toBeCloseTo((target.y - tr.y) / tr.h, 6)
    const hp = planTransition(snapshotFor(home, ctx), home, project, ctx, full)
    const c2 = sampleTransition(hp, 100).objects.find(o => o.id === 'cloud')!
    expect(Number.isFinite(c2.x)).toBe(true)
  })
  it('compact viewport, fade policy and replans from mid-transition keep everything finite and attached', () => {
    const inside = (s: ReturnType<typeof sampleTransition>) => {
      const r = s.frame.rect
      for (const v of Object.values(r)) expect(Number.isFinite(v)).toBe(true)
      for (const o of s.objects) {
        for (const v of [o.x, o.y, o.size, o.lift]) expect(Number.isFinite(v)).toBe(true)
        if (!o.visible) continue
        expect(o.x).toBeGreaterThanOrEqual(r.x - o.size / 2 - .5); expect(o.x).toBeLessThanOrEqual(r.x + r.w + o.size / 2 + .5)
        expect(o.y).toBeGreaterThanOrEqual(r.y - o.size / 2 - .5); expect(o.y).toBeLessThanOrEqual(r.y + r.h + o.size / 2 + .5)
      }
    }
    const mobile = { ...ctx, viewport: { w: 390, h: 844, dpr: 2 } }
    expect(computeFrame(project, mobile).visible).toBe(true)
    for (const [a, b] of [[home, project], [project, home], [home, about], [about, playground]] as const) {
      const plan = planTransition(snapshotFor(a, mobile), a, b, mobile, full)
      for (let t = 0; t <= plan.durationMs + 32; t += 16) inside(sampleTransition(plan, t))
    }
    const reduced = motionPolicy(true)
    for (const [a, b] of [[home, project], [about, playground]] as const) {
      const plan = planTransition(snapshotFor(a, ctx), a, b, ctx, reduced)
      for (let t = 0; t <= plan.durationMs + 32; t += 16) inside(sampleTransition(plan, t))
    }
    for (const t0 of [100, 500, 800, 1000]) {
      const first = planTransition(snapshotFor(home, ctx), home, project, ctx, full)
      const mid = sampleTransition(first, t0)
      inside(mid)
      for (const next of [about, home, playground]) {
        const plan = planTransition(mid, project, next, ctx, full)
        for (let t = 0; t <= plan.durationMs + 32; t += 16) inside(sampleTransition(plan, t))
      }
    }
  })
})
describe('peek cards and brand glyphs', () => {
  it('uses the correct side and clamps cards', () => {
    for(const [view,side] of [[home,'top-right'],[project,'left'],[about,'left'],[playground,'below']] as const) {
      const card=placePeekCard({x:1400,y:20,radius:40},view,ctx.viewport,{w:280,h:240})
      expect(card.side).toBe(side)
      expect(card.x).toBeGreaterThanOrEqual(8)
      expect(card.x+280).toBeLessThanOrEqual(1432)
      expect(card.y).toBeGreaterThanOrEqual(8)
      expect(card.y+240).toBeLessThanOrEqual(892)
    }
  })
  it('tucks the avatar card below-right of the avatar, overlapping its feet like the reference', () => {
    const card=placePeekCard({x:216,y:207,radius:60},home,ctx.viewport,{w:290,h:222},'below-right')
    expect(card.side).toBe('below-right')
    expect(card.x).toBeGreaterThan(216); expect(card.x).toBeLessThan(216+60)
    expect(card.y).toBeGreaterThan(207)
  })
  it('produces descending bars and an optional trailing dot', () => {
    const path=barsGlyphPath({x:0,y:0,w:100,h:40},{bars:4,decay:.7,dot:true})
    const heights=[...path.matchAll(/v([\d.]+)/g)].map(m=>Number(m[1]))
    expect(heights).toHaveLength(5)
    for(let i=1;i<4;i++) expect(heights[i]).toBeLessThan(heights[i-1])
    expect(path.split('M')).toHaveLength(6)
  })
})
describe('strips are a window onto the one home pool (WP2)', () => {
  const homeRect = computeFrame(home, ctx).rect
  it('home looks at its own pool without any pan', () => {
    expect(computeFrame(home, ctx).pan).toEqual({ x: 0, y: 0 })
    expect(worldWindow(computeFrame(home, ctx))).toEqual(homeRect)
  })
  for (const [w, h] of [[1440, 900], [1280, 720], [1920, 1080]]) {
    const c = { ...ctx, viewport: { w, h, dpr: 1 } }, hr = computeFrame(home, c).rect
    // the hero title block (centred) in world pixels, roughly the middle of the home pool
    const text = { x: w * .3, y: h * .3, w: w * .4, h: h * .35 }
    const overlap = (a: typeof text, b: typeof text) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
    for (const view of [project, about, playground]) {
      it(`${view.kind} at ${w}x${h}: the window shows pool water that contains pieces of the title`, () => {
        const win = worldWindow(computeFrame(view, c))
        expect(win.x).toBeGreaterThanOrEqual(hr.x - 1); expect(win.y).toBeGreaterThanOrEqual(hr.y - 1)
        expect(win.x + win.w).toBeLessThanOrEqual(hr.x + hr.w + 1); expect(win.y + win.h).toBeLessThanOrEqual(hr.y + hr.h + 1)
        expect(overlap(win, text)).toBeGreaterThan(win.w * win.h * .15)
      })
    }
  }
  it('a pool is only exposed where the window has a real pool edge: the home pool needs no rim when the window sits inside it', () => {
    const win = worldWindow(computeFrame(project, ctx))
    expect(win.x).toBeGreaterThan(homeRect.x + 40); expect(win.x + win.w).toBeLessThan(homeRect.x + homeRect.w - 40)
  })
})
describe('objects that leave or join the scene fade instead of popping (WP2)', () => {
  it('the cloud fades out within 300 ms going home -> project and is hidden after', () => {
    const plan = planTransition(snapshotFor(home, ctx), home, project, ctx, full)
    const cloudAt = (t: number) => sampleTransition(plan, t).objects.find(o => o.id === 'cloud')!
    expect(cloudAt(0).fade ?? 1).toBe(1)
    let last = 1
    for (let t = 16; t <= 300; t += 16) { const f = cloudAt(t).fade ?? 1; expect(f).toBeLessThanOrEqual(last); last = f }
    expect(cloudAt(300).visible).toBe(false)
    expect(cloudAt(300).fade ?? 1).toBeLessThan(.01)
    // nothing is visible at the end that was not already visible, and no visible object pops: fade never jumps by more than ~ 1/6 per frame
    let prev = 1
    for (let t = 0; t <= plan.durationMs; t += 16) { const o = cloudAt(t); const f = o.visible ? o.fade ?? 1 : 0; expect(prev - f).toBeLessThan(.4); prev = f }
  })
  it('the cloud fades in going project -> home', () => {
    const plan = planTransition(snapshotFor(project, ctx), project, home, ctx, full)
    const f = (t: number) => sampleTransition(plan, t).objects.find(o => o.id === 'cloud')!
    expect(f(16).visible).toBe(true); expect(f(16).fade ?? 1).toBeLessThan(.2)
    expect(f(plan.durationMs - 16).fade ?? 1).toBe(1)
  })
})

describe('home toys (WP5)', () => {
  const frame = computeFrame(home, ctx), objects = layoutObjects(home, ctx, frame)
  const by = (id: string) => objects.find(o => o.id === id)!
  it('puts the avatar inside the pool at x .15, y .23, about .16 H', () => {
    const a = by('avatar')
    expect(a.x / 1440).toBeCloseTo(.15, 2); expect(a.y / 900).toBeCloseTo(.23, 2)
    expect(a.size / 900).toBeGreaterThan(.15); expect(a.size / 900).toBeLessThan(.17)
    expect(a.x - a.size / 2).toBeGreaterThan(frame.rect.x)
  })
  it('sizes the duck at about .09 L', () => { expect(by('duck').size / 1440).toBeCloseTo(.09, 2) })
  it('fills the project strip with big objects like the reference', () => {
    // Three projects: like the reference; four: the column is full, the objects stay at half the strip or more.
    for (const [c, share] of [[{ ...ctx, projectSlugs: slugs.slice(0, 3) }, .55], [ctx, .5]] as const) {
      const strip = layoutObjects(project, c, computeFrame(project, c)).filter(o => o.visible), w = computeFrame(project, c).rect.w
      for (const o of strip) expect(o.size).toBeGreaterThanOrEqual(w * share)
    }
  })
  it('keeps tiles, duck and cloud reference-sized and clear of the pool edge', () => {
    for (const o of objects.filter(o => o.id !== 'avatar')) {
      expect(o.size).toBeLessThanOrEqual(1440 * .095)
      expect(o.y + o.size * .62 + 18).toBeLessThan(frame.rect.y + frame.rect.h)
      expect(o.x + o.size * .62).toBeLessThan(frame.rect.x + frame.rect.w)
    }
  })
})
