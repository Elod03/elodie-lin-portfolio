import * as THREE from 'three'
import { computeFrame } from '../world/frame'
import { snapshotFor, sampleTransition, type Snapshot, type TransitionPlan } from '../world/transitions'
import type { ObjectId, Viewport } from '../world/types'
import { WaterSim } from './sim/WaterSim'
import { Caustics } from './sim/Caustics'
import { surfaceVertex, surfaceFragment } from './pool/surface'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { applyToyShading, avatar, cloud, duck, projectIcon, type ToyLocal } from './objects/primitives'
import { disposeModel, loadAvatarModel } from './objects/avatarModel'
import { HeroText } from './textures/HeroText'
import { REVEAL_DURATION, MORPH_DURATION, lineProgress, morphAmount, nextMorphGap } from './textures/heroTiming'
import { ARRIVAL_TOTAL, FILL_MS, HERO_AT, INTRO_AT, OBJECT_DURATION, OBJECT_STAGGER, causticsProgress, fillProgress } from './arrival'
import { SCATTER_MS, reformPhase } from './textures/reform'
import { retarget, tintMix, tintRest, type TintState } from './waterTint'
import { glideLight, type ParisLight } from '../world/parisLight'
import { stepRain, type RainState } from './rain'
import { clampFrameDelta, createDprGovernor, nextCausticsLevel, type CausticsLevel } from './quality'
import type { HeroTextSpec, ObjectScreenState, PoolEngine, PoolEngineEvents, PoolEngineOptions } from './types'
export type { HeroTextSpec, ObjectScreenState, PoolEngine, PoolEngineEvents, PoolEngineOptions } from './types'

const DIVE_MS = 250
/** Distance below an object's centre (in object sizes) where its label sits. */
const LABEL_REACH: Record<string, number> = { avatar: .72, project: .62, duck: .55, cloud: .5 }

export function canRunPoolEngine(): { ok: true; floatType: 'float' | 'half' } | { ok: false; reason: 'no-webgl2' | 'no-float-rt' } {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2')
  if (!gl) return { ok: false, reason: 'no-webgl2' }
  const supported = !!gl.getExtension('EXT_color_buffer_float')
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  return supported ? { ok: true, floatType: 'half' } : { ok: false, reason: 'no-float-rt' }
}

export function createPoolEngine(canvas: HTMLCanvasElement, opts: PoolEngineOptions): PoolEngine {
  let viewport = { ...opts.viewport }
  const reduced = opts.reducedMotion ?? false
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
  const contextExtension = renderer.getContext().getExtension('WEBGL_lose_context')
  renderer.autoClear = false; renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  renderer.info.autoReset = false
  const governor = createDprGovernor(Math.min(viewport.dpr, 1.5))
  let causticsLevel: CausticsLevel = 'full'
  renderer.setPixelRatio(governor.dpr); renderer.setSize(viewport.w, viewport.h, false)
  const water = new WaterSim(renderer, 256)
  water.setAspect(viewport.w / viewport.h)
  const caustics = new Caustics(renderer, viewport.w, viewport.h)
  const surfaceScene = new THREE.Scene(), surfaceCamera = new THREE.Camera()
  const objectScene = new THREE.Scene(), objectCamera = new THREE.PerspectiveCamera(34, viewport.w / viewport.h, 10, 10000)
  const shadowTarget = new THREE.WebGLRenderTarget(512, 512, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false })
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, depthWrite: false })
  function updateCamera() {
    objectCamera.aspect = viewport.w / viewport.h
    objectCamera.position.z = viewport.h / 2 / Math.tan(17 * Math.PI / 180)
    objectCamera.updateProjectionMatrix()
  }
  updateCamera()
  // Vinyl look: the room environment is baked once into a PMREM texture (and again only after a lost context).
  const pmrem = new THREE.PMREMGenerator(renderer)
  let envTarget: THREE.WebGLRenderTarget | null = null
  function buildEnvironment() {
    envTarget?.dispose()
    const room = new RoomEnvironment()
    envTarget = pmrem.fromScene(room, .04); objectScene.environment = envTarget.texture
    room.dispose()
  }
  buildEnvironment()
  const ambient = new THREE.HemisphereLight(0xf4f7ff, 0x436d88, 1.0)
  const sun = new THREE.DirectionalLight(0xfff5e5, 1.7); sun.position.set(-450, 650, 1100)
  const fill = new THREE.DirectionalLight(0xd5edff, .55); fill.position.set(500, 50, 650)
  objectScene.add(ambient, sun, fill)
  const hero = new HeroText()
  // Arrival ("the pool fills up"): pending until playIntro starts it, running for ~2 s, then done. Never with reduced motion.
  let arrivalState: 'pending' | 'running' | 'done' = opts.arrival && !reduced ? 'pending' : 'done'
  let arrivalStartedAt = 0, arrivalPin: number | null = null, arrivalSplashed = false
  // Hour in Paris: the light glides slowly toward its target (instantly when motion is reduced or at creation).
  let lightNow: ParisLight = { ...(opts.light ?? { warm: 0, cool: 0 }) }, lightTarget: ParisLight = { ...lightNow }
  // Real rain: drops on the water from time to time while it rains in Paris (never with reduced motion).
  let rainOn = !!opts.rain && !reduced, rainState: RainState = { wait: 400 }, rainCount = 0
  // Water tint (hovered project colour).
  let tint: TintState = tintRest()
  const projectColor = (id: ObjectId | null) => id && id.startsWith('project:') ? opts.projectColors?.[id.slice(8)] ?? null : null
  // Language change: the dots scatter, the new text is baked, the dots settle.
  const heroSpec0 = opts.heroText ?? { lang: 'fr' as const }
  let reformStart: number | null = null, reformSwapped: number | null = null, reformDrawing = false, reformSpec: HeroTextSpec | null = null, reformResolvers: Array<() => void> = [], debugReform: number | null = null, drawnLang = heroSpec0.lang
  let heroOnScreen = false
  /** Ends the language change (done, or the bake failed): nothing is left running and every waiting promise is resolved. */
  function clearReform() {
    reformStart = null; reformSwapped = null; reformSpec = null; reformDrawing = false; uniforms.uHeroReform.value = 0
    const waiting = reformResolvers; reformResolvers = []; waiting.forEach(resolve => resolve())
  }
  const messageCanvas = document.createElement('canvas'); messageCanvas.width = messageCanvas.height = 1536
  const messageTexture = new THREE.CanvasTexture(messageCanvas)
  // Second plane of the guestbook: the beach (tiles around the pool).
  const beachCanvas = document.createElement('canvas'); beachCanvas.width = beachCanvas.height = 1024
  const beachTexture = new THREE.CanvasTexture(beachCanvas)
  let guestbookTraveler: { line: string; bornAt: number; x: number; y: number } | null = null
  let messageLines: readonly string[] = [], lastMessagePaint = -Infinity, messagesStartedAt = 0
  let messageFont = '', messageWidths: number[] = [], longestMessage = 0
  const uniforms = {
    uViewport: { value: new THREE.Vector2(viewport.w, viewport.h) },
    uFrame: { value: new THREE.Vector4() }, uPool: { value: new THREE.Vector4() }, uPoolR: { value: 20 }, uPan: { value: new THREE.Vector2() }, uRadii: { value: new THREE.Vector4(20, 20, 20, 20) },
    uTime: { value: 0 }, uNight: { value: opts.theme === 'night' ? 1 : 0 }, uVisible: { value: 1 },
    uWater: { value: water.heightTex }, uCaustics: { value: caustics.texture }, uObjectShadows: { value: shadowTarget.texture }, uHero: { value: hero.texture }, uHeroBars: { value: hero.barsTexture }, uMessages: { value: messageTexture }, uBeachMessages: { value: beachTexture }, uBeachMsg: { value: 0 },
    uHeroLines: { value: 0 }, uHeroLine: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) }, uHeroP: { value: [1, 1, 1, 1, 1, 1] as number[] },
    uHeroTail: { value: new THREE.Vector4() }, uHeroMorph: { value: 0 }, uHeroCloud: { value: new THREE.Vector3() },
    uShadows: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uFill: { value: arrivalState === 'pending' ? 0 : 1 }, uCausticOn: { value: arrivalState === 'pending' ? 0 : 1 },
    uTint: { value: new THREE.Vector3(.5, .5, .5) }, uTintAmt: { value: 0 }, uHeroReform: { value: 0 }, uHeroPitch: { value: 5.4 },
    uLight: { value: new THREE.Vector2(lightNow.warm, lightNow.cool) }, uGlow: { value: 0 }, uGlowReach: { value: 160 }, uGlowSteady: { value: 0 },
  }
  const surfaceMaterial = new THREE.ShaderMaterial({ uniforms, vertexShader: surfaceVertex, fragmentShader: surfaceFragment, depthWrite: false, depthTest: false, transparent: true })
  const surfaceGeometry = new THREE.PlaneGeometry(2, 2)
  surfaceScene.add(new THREE.Mesh(surfaceGeometry, surfaceMaterial))
  const dayAmbient = new THREE.Color(0xf4f7ff), nightAmbient = new THREE.Color(0xbfe6ff), daySun = new THREE.Color(0xfff5e5), nightSun = new THREE.Color(0xbfe6ff)
  const nightTint = new THREE.Color(0xc3d2e6), tintScratch = new THREE.Color()
  const toyShared = { uCaustics: { value: caustics.texture as THREE.Texture | null }, uCausticRes: { value: new THREE.Vector2(viewport.w * governor.dpr, viewport.h * governor.dpr) }, uCausticShift: { value: new THREE.Vector2() }, uNight: uniforms.uNight, uCausticOn: uniforms.uCausticOn }
  const toyLocals = new Map<ObjectId, ToyLocal>()
  const models = new Map<ObjectId, THREE.Object3D>()
  const toyLocal = (id: ObjectId) => { let local = toyLocals.get(id); if (!local) { local = { uToyY: { value: 0 }, uToyHalf: { value: 1 } }; toyLocals.set(id, local) } return local }
  const dives = new Map<ObjectId, { at: number; splashed: boolean; pin?: number }>()
  let cloudExpression = 0, cloudHoverAt = -Infinity
  models.set('avatar', avatar()); models.set('cloud', cloud()); models.set('duck', duck())
  for (const slug of opts.projectSlugs) models.set(`project:${slug}`, projectIcon(slug, requestRender, opts.projectFaces?.[slug]))
  for (const [id, model] of models) { applyToyShading(model, toyShared, toyLocal(id)); objectScene.add(model) }
  const listeners = new Map<keyof PoolEngineEvents, Set<(value: never) => void>>()
  function emit<K extends keyof PoolEngineEvents>(kind: K, value: PoolEngineEvents[K]) {
    listeners.get(kind)?.forEach(callback => callback(value as never))
  }
  const context = () => ({ viewport, projectSlugs: opts.projectSlugs, logoRect: { x: 24, y: 12, w: 64, h: 44 } })
  let snapshot: Snapshot = opts.snapshot ?? snapshotFor({ kind: 'home' }, context())
  let plan: TransitionPlan | null = null, startedAt = 0
  let disposed = false, lost = false, raf = 0, previous = performance.now(), time = 0
  const avatarRequest = new AbortController()
  let hovered: ObjectId | null = null, introAt: number | null = null, finishIntro: (() => void) | null = null
  let themeFrom = uniforms.uNight.value, themeTo = themeFrom, themeAt = 0, themeDuration = 0
  let heroSpec: HeroTextSpec = opts.heroText ?? { lang: 'fr', title: "Salut, moi c'est Elodie.", lines: ['Je crée des expériences web,', 'du premier croquis à la dernière ligne de code.'] }
  let freezeTime: number | null = null
  // Hero text: written line by line once (revealed), then its first-name tail turns into bars now and then.
  const createdAt = performance.now()
  const testMode = new URLSearchParams(location.search).has('test') // no random auto-morph: captures stay deterministic
  let debugWrite: number | null = null, debugMorph: number | null = null
  let heroRevealAt: number | null = null, heroRevealed = false, morphNext: number | null = null, morphStart: number | null = null
  let dirty = true
  let lastObjectStates: ObjectScreenState[] = []
  let frameCount = 0
  /** One blurred line of text. The glyphs are drawn far off the canvas and only their shadow lands on it, so the blur works in every browser (no ctx.filter). */
  function drawBlurred(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, blur: number, color: string) {
    const away = 9000
    ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = away; ctx.shadowOffsetY = 0
    ctx.fillText(text, x - away / (ctx.getTransform().a || 1), y)
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0
  }
  // Two planes, both blurred 4-6 px at about 30 %, drifting right to left at about 60 px/s:
  // the beach (large, nearer, a little faster) and the bottom of the water (smaller, slower, a different phase).
  function paintPlane(canvas: HTMLCanvasElement, plane: 'beach' | 'pool', ink: [number, number, number]) {
    const ctx = canvas.getContext('2d')!
    const w = viewport.w, h = viewport.h, compact = w < 768
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const n = messageLines.length
    if (!n) return
    ctx.scale(canvas.width / w, canvas.height / h)
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
    const beach = plane === 'beach'
    const size = beach ? (compact ? 30 : 44) : (compact ? 19 : 27)
    ctx.font = '900 ' + size + 'px Nunito, sans-serif'
    const widths = messageLines.map(line => ctx.measureText(line).width)
    const widest = widths.reduce((max, width) => Math.max(max, width), 0)
    const lanes = beach ? (compact ? [.035, .965] : [.034, .962]) : compact ? [.29, .75] : [.29, .64, .86]
    const speed = (beach ? 66 : 56) * (compact ? .7 : 1)
    const alpha = beach ? .34 : .42
    const blur = beach ? 13 : 11
    const color = `rgba(${ink[0]},${ink[1]},${ink[2]},${alpha})`
    const elapsed = reduced ? 0 : Math.max(0, time - messagesStartedAt)
    const period = w + widest + 160
    const count = Math.min(lanes.length, n)
    for (let lane = 0; lane < count; lane++) {
      const travelled = elapsed * speed + period * (.18 + lane * .37 + (beach ? .29 : 0))
      const cycle = Math.floor(travelled / period)
      const x = w + 40 - (travelled % period)
      let index = ((n - 1 - (cycle * count + lane)) % n + n) % n
      if (beach) index = (index + Math.ceil(n / 2)) % n
      if (!beach && guestbookTraveler && index === n - 1 && messageLines[index] === guestbookTraveler.line) continue
      drawBlurred(ctx, messageLines[index], x, h * lanes[lane], blur, color)
    }
    // A message just sent leaves the cloud, sinks to the water plane and drifts away with the others.
    if (!beach && guestbookTraveler) {
      const traveler = guestbookTraveler, age = time - traveler.bornAt
      const width = ctx.measureText(traveler.line).width
      const x = traveler.x - width * .8 - age * speed
      if (x + width < -40) guestbookTraveler = null
      else {
        const sink = Math.min(1, age / 2.4), eased = sink * sink * (3 - 2 * sink)
        const y = traveler.y + (h * lanes[0] - traveler.y) * eased
        const fade = Math.min(1, age / .5)
        drawBlurred(ctx, traveler.line, x, y, 3 + (blur - 3) * eased, `rgba(${ink[0]},${ink[1]},${ink[2]},${alpha * (.5 + .5 * fade) + .25 * (1 - eased)})`)
      }
    }
  }
  function paintMessages() {
    if (time - lastMessagePaint < 1 / 30) return
    if (reduced && lastMessagePaint !== -Infinity && !guestbookTraveler) return
    lastMessagePaint = time
    // The ink follows uNight (one interpolation shared with the shader): dark navy by day, pale ice by night.
    const night = uniforms.uNight.value
    const ink = (day: [number, number, number], dark: [number, number, number]) => day.map((v, i) => Math.round(v + (dark[i] - v) * night)) as [number, number, number]
    paintPlane(messageCanvas, 'pool', ink([11, 53, 84], [228, 246, 255]))
    paintPlane(beachCanvas, 'beach', ink([11, 53, 84], [228, 246, 255]))
    messageTexture.needsUpdate = true; beachTexture.needsUpdate = true
  }
  function render(now: number) {
    if (disposed || lost) return
    const dt = clampFrameDelta((now - previous) / 1000); previous = now
    if (freezeTime !== null) time = freezeTime / 1000
    else if (!reduced) time += dt
    if (plan) {
      const result = sampleTransition(plan, now - startedAt)
      snapshot = result
      if (result.done) plan = null
    }
    if (themeDuration > 0) {
      const t = Math.min(1, (now - themeAt) / themeDuration)
      uniforms.uNight.value = themeFrom + (themeTo - themeFrom) * (t * t * (3 - 2 * t))
      if (t >= 1) themeDuration = 0
    }
    const { rect, radii, visible, pan } = snapshot.frame
    // The pool is always the home pool; the frame is only a window onto it.
    const home = computeFrame({ kind: 'home' }, context())
    uniforms.uPool.value.set(home.rect.x, home.rect.y, home.rect.w, home.rect.h)
    uniforms.uPoolR.value = home.radii.tl
    uniforms.uPan.value.set(pan.x, pan.y)
    uniforms.uFrame.value.set(rect.x, rect.y, rect.w, rect.h)
    uniforms.uRadii.value.set(radii.tl, radii.tr, radii.br, radii.bl)
    uniforms.uVisible.value = visible ? 1 : 0
    // The beach messages belong to the home composition only: they fade as the window leaves the home pool.
    const apart = Math.abs(rect.x - home.rect.x) + Math.abs(rect.y - home.rect.y) + Math.abs(rect.w - home.rect.w) + Math.abs(rect.h - home.rect.h)
    uniforms.uBeachMsg.value = visible ? Math.max(0, 1 - apart / 160) : 0
    uniforms.uTime.value = time
    heroOnScreen = visible && apart < 160
    // Arrival: water level and caustics from the arrival clock (a test hook can pin it).
    const arrivalT = arrivalPin ?? (arrivalState === 'running' ? now - arrivalStartedAt : null)
    uniforms.uFill.value = arrivalT !== null ? fillProgress(arrivalT) : arrivalState === 'pending' ? 0 : 1
    uniforms.uCausticOn.value = arrivalT !== null ? causticsProgress(arrivalT) : arrivalState === 'pending' ? 0 : 1
    if (arrivalT !== null && arrivalT >= FILL_MS && !arrivalSplashed && arrivalPin === null) {
      // The water settles with a few soft ripples.
      arrivalSplashed = true
      for (const [fx, fy] of [[.3, .62], [.64, .42], [.5, .78]]) water.addDrop((home.rect.x + home.rect.w * fx) / viewport.w, 1 - (home.rect.y + home.rect.h * fy) / viewport.h, .016, .07)
    }
    // Light of the water on the page: only when the window is a strip (it fades with the home composition), 160 px desktop / 96 px phone.
    uniforms.uGlow.value = visible ? 1 - uniforms.uBeachMsg.value : 0
    uniforms.uGlowReach.value = viewport.w < 768 ? 96 : 160
    uniforms.uGlowSteady.value = reduced || causticsLevel === 'compact' ? 1 : 0
    // Hour in Paris.
    lightNow = reduced || freezeTime !== null ? lightTarget : glideLight(lightNow, lightTarget, dt)
    uniforms.uLight.value.set(lightNow.warm, lightNow.cool)
    // Water tint.
    const mixed = tintMix(tint, now)
    uniforms.uTint.value.set(mixed.color[0], mixed.color[1], mixed.color[2]); uniforms.uTintAmt.value = mixed.amount
    // Language change on the hero dots.
    uniforms.uHeroPitch.value = hero.pitchCss
    if (reformStart !== null) {
      const phase = reformPhase(now - reformStart, reformSwapped)
      if (phase.needsSwap && !reformDrawing && reformSwapped === null && reformSpec) {
        reformDrawing = true
        const baking = reformSpec
        hero.draw(baking, viewport.w, viewport.h).then(() => {
          reformDrawing = false
          if (reformStart === null) return
          drawnLang = baking.lang
          // A newer language arrived while this one was baking: bake that one too before settling.
          if (reformSpec === baking) reformSwapped = performance.now() - reformStart
          requestRender()
        }, () => { clearReform() })
      }
      uniforms.uHeroReform.value = phase.amount
      if (phase.done) clearReform()
    } else uniforms.uHeroReform.value = 0
    if (debugReform !== null) uniforms.uHeroReform.value = debugReform
    // Night re-lights the toys: dimmer, colder light and a cool tint on their colours.
    const night = uniforms.uNight.value
    ambient.intensity = 1.0 - night * .5; ambient.color.lerpColors(dayAmbient, nightAmbient, night)
    sun.intensity = 1.7 - night * 1.0; sun.color.lerpColors(daySun, nightSun, night)
    fill.intensity = .5 + night * .1
    objectScene.environmentIntensity = .7 - night * .4
    toyShared.uCausticRes.value.set(viewport.w * renderer.getPixelRatio(), viewport.h * renderer.getPixelRatio())
    toyShared.uCausticShift.value.set(-pan.x * renderer.getPixelRatio(), pan.y * renderer.getPixelRatio())
    for (const model of models.values()) model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!(material instanceof THREE.MeshStandardMaterial)) continue
        const base = (material.userData.baseColor ??= material.color.clone()) as THREE.Color
        material.color.copy(base).lerp(tintScratch.copy(nightTint).multiply(base), night)
      }
    })
    // Cloud: face morph and a short wobble when hovered.
    const cloudTarget = hovered === 'cloud' ? 1 : 0
    cloudExpression = reduced ? cloudTarget : cloudExpression + (cloudTarget - cloudExpression) * (1 - Math.exp(-dt * 14))
    if (Math.abs(cloudTarget - cloudExpression) < .004) cloudExpression = cloudTarget
    const cloudModel = models.get('cloud') as THREE.Mesh | undefined
    if (cloudModel) ((cloudModel.material as THREE.Material).userData.expression as { value: number }).value = cloudExpression
    const wobbleT = (now - cloudHoverAt) / 600
    const cloudWobble = reduced || wobbleT < 0 || wobbleT > 1 ? 0 : Math.sin(wobbleT * Math.PI * 3) * (1 - wobbleT) * .16
    renderer.info.reset()
    if (rainOn && !reduced && visible && freezeTime === null && arrivalState !== 'pending') {
      const rain = stepRain(rainState, dt * 1000, Math.random); rainState = rain.state
      for (const drop of rain.drops) {
        const x = rect.x + drop.u * rect.w, y = rect.y + drop.v * rect.h
        water.addDrop((x - pan.x) / viewport.w, 1 - (y - pan.y) / viewport.h, drop.radius, drop.strength); rainCount++
      }
    }
    if (!reduced && visible && freezeTime === null) water.step(dt)
    uniforms.uWater.value = water.heightTex
    if (visible && (!caustics.everyOther || frameCount % 2 === 0 || dirty || reduced || freezeTime !== null)) caustics.render(water.heightTex, time)
    uniforms.uHero.value = hero.texture; uniforms.uHeroBars.value = hero.barsTexture
    if (!heroRevealed && !reduced && freezeTime === null && heroRevealAt === null && now - createdAt > 4000) heroRevealAt = now
    if (!heroRevealed && heroRevealAt !== null && now - heroRevealAt >= REVEAL_DURATION) heroRevealed = true
    const writing = debugWrite !== null ? debugWrite : reduced || freezeTime !== null || heroRevealed ? null : heroRevealAt === null ? -1 : now - heroRevealAt
    const layout = hero.layout
    uniforms.uHeroLines.value = Math.min(6, layout.lines.length)
    layout.lines.slice(0, 6).forEach((band, i) => {
      uniforms.uHeroLine.value[i].set(band.y0, band.y1, band.x0, band.x1)
      uniforms.uHeroP.value[i] = writing === null ? 1 : writing < 0 ? 0 : lineProgress(writing, i, layout.lines.length)
    })
    let morph = 0
    if (!reduced && freezeTime === null && heroRevealed && layout.tail) {
      if (!testMode && morphNext === null && morphStart === null) morphNext = now + nextMorphGap(Math.random())
      if (morphNext !== null && now >= morphNext) { morphStart = now; morphNext = null }
      if (morphStart !== null) {
        const elapsed = now - morphStart
        morph = morphAmount(elapsed)
        if (elapsed >= MORPH_DURATION) { morphStart = null; morphNext = now + nextMorphGap(Math.random()) }
      }
    }
    if (debugMorph !== null) morph = morphAmount(debugMorph)
    uniforms.uHeroMorph.value = morph
    if (layout.tail) uniforms.uHeroTail.value.set(layout.tail.x0, layout.tail.y0, layout.tail.x1, layout.tail.y1)
    else uniforms.uHeroTail.value.set(0, 0, 0, 0)
    uniforms.uHeroCloud.value.set(layout.cloud.x, layout.cloud.y, layout.lines.length ? (layout.lines[0].y1 - layout.lines[0].y0) / 1.24 : 0)
    const states: ObjectScreenState[] = []
    uniforms.uShadows.value.forEach(shadow => shadow.set(0, 0, 0, 0))
    snapshot.objects.forEach((placement, i) => {
      const model = models.get(placement.id)
      if (!model) return
      const arriving = arrivalState === 'running' || arrivalPin !== null
      const introElapsed = arrivalPin !== null ? arrivalPin - INTRO_AT : introAt === null ? Infinity : now - introAt
      const intro = Math.max(0, Math.min(1, (introElapsed - i * (arriving ? OBJECT_STAGGER : 90)) / (arriving ? OBJECT_DURATION : 950)))
      const easedIntro = 1 - (1 - intro) ** 3
      const bob = reduced ? 0 : Math.sin(time * .85 + i * 1.7) * 3 + Math.sin(time * .37 + i) * 1.5
      const drift = reduced ? 0 : Math.sin(time * .43 + i * .9) * 4.5 + Math.sin(time * .17 + i) * 1.8
      const hoverLift = hovered === placement.id ? 6 : 0
      // Dive on click: sink ~6 % and come back in 250 ms, with a real wave on the way down and on the way up.
      let dive = 0
      const diving = dives.get(placement.id)
      if (diving) {
        const t = diving.pin ?? (now - diving.at) / DIVE_MS
        if (t >= 1 && diving.pin === undefined) dives.delete(placement.id)
        else { dive = Math.sin(Math.PI * Math.max(0, t)); if (t >= .5 && !diving.splashed) { diving.splashed = true; water.addDrop((placement.x - pan.x) / viewport.w, 1 - (placement.y - pan.y) / viewport.h, .02, .34) } }
      }
      const arrival = 1 - easedIntro
      const entryX = placement.id === 'avatar' ? -viewport.w * .22 : placement.id === 'cloud' || placement.id === 'duck' ? viewport.w * .3 : (i - 4) * viewport.w * .10
      const entryY = placement.id === 'avatar' || placement.id === 'cloud' ? -viewport.h * .48 : viewport.h * .52
      const x = placement.x + drift + entryX * arrival, y = placement.y + bob - hoverLift + entryY * arrival + placement.size * .06 * dive
      const fade = placement.fade ?? 1
      const size = placement.size * (placement.id === 'avatar' ? .95 : 1)
      // Object origins are on the CSS pixel plane. Keep z=0 to make the DOM hit
      // targets coincide exactly with rendered object centres.
      model.position.set(x - viewport.w / 2, viewport.h / 2 - y, 0)
      model.scale.setScalar(Math.max(.001, size * (1 + arrival * 1.65) * fade * (1 - .05 * dive)))
      const local = toyLocal(placement.id)
      local.uToyY.value = viewport.h / 2 - y; local.uToyHalf.value = Math.max(1, size * .6)
      const projectIndex = placement.id.startsWith('project:') ? opts.projectSlugs.indexOf(placement.id.slice(8)) : -1
      const settledYaw = projectIndex >= 0 ? [-.26, .17, -.39][projectIndex % 3] : placement.id === 'duck' ? -.38 : .08
      const settledRoll = projectIndex >= 0 ? [.065, -.045, -.19][projectIndex % 3] : placement.id === 'duck' ? -.045 : 0
      model.rotation.set(.10 + arrival * .62 + (reduced ? 0 : Math.sin(time * .6 + i) * .05), settledYaw + arrival * (i % 2 ? -1.05 : .85) + (reduced ? 0 : Math.sin(time * .31 + i * 1.3) * .085), settledRoll + arrival * (i % 2 ? .48 : -.42) + (reduced ? 0 : Math.sin(time * .55 + i) * .045) + (placement.id === 'cloud' ? cloudWobble : 0))
      model.visible = placement.visible && visible && intro > .01
      const radius = placement.size * .58
      const labelY = y + placement.size * (LABEL_REACH[placement.id.split(':')[0]] ?? .62) + 9
      states.push({ id: placement.id, x, y, radius, labelY, visible: placement.visible && visible && intro > .5 && fade >= 1 })
      if (i < 8 && model.visible) uniforms.uShadows.value[i].set(x - placement.size * .13, y + placement.size * .33, placement.size * .72, 1)
      if (!reduced && visible && arrivalState !== 'pending' && frameCount % 100 === i * 9 && freezeTime === null) water.addDrop((x - pan.x) / viewport.w, 1 - (y - pan.y) / viewport.h, .009, .025)
    })
    if (arrivalState === 'running' && now - arrivalStartedAt >= ARRIVAL_TOTAL) { arrivalState = 'done'; introAt = null; finishIntro?.(); finishIntro = null }
    else if (arrivalState !== 'running' && introAt !== null && now - introAt > 1600) { introAt = null; finishIntro?.(); finishIntro = null }
    lastObjectStates = states; emit('objects', states)
    paintMessages()
    if (visible) {
      // Render true model silhouettes into a modest offscreen mask. Project
      // the light down-left, farther for the taller avatar, then restore poses.
      const poses: [THREE.Object3D, number, number][] = []
      for (const [id, model] of models) {
        poses.push([model, model.position.x, model.position.y])
        const reach = id === 'avatar' ? .62 : .30
        model.position.x -= model.scale.x * reach * .62
        model.position.y -= model.scale.x * reach
      }
      objectScene.overrideMaterial = shadowMaterial
      renderer.setRenderTarget(shadowTarget); renderer.clear(); renderer.render(objectScene, objectCamera)
      objectScene.overrideMaterial = null
      for (const [model, x, y] of poses) { model.position.x = x; model.position.y = y }
    }
    renderer.setRenderTarget(null); renderer.clear()
    if (visible) { renderer.render(surfaceScene, surfaceCamera); renderer.clearDepth(); renderer.render(objectScene, objectCamera) }
    frameCount++; dirty = false
    if (!reduced && frameCount > 240 && freezeTime === null) {
      const dpr = governor.sample(dt * 1000)
      if (dpr !== null) { renderer.setPixelRatio(dpr); renderer.setSize(viewport.w, viewport.h, false); emit('quality', { dpr }) }
      // DPR already at 1 and still slow: the caustics are the next cost to lower.
      causticsLevel = nextCausticsLevel(causticsLevel, governor.consumePressure())
      caustics.setLevel(causticsLevel)
    }
  }
  function tick(now: number) {
    raf = 0
    if (disposed || lost || document.hidden) return
    try { render(now) } catch (error) { emit('error', error instanceof Error ? error : new Error(String(error))); return }
    if ((!reduced && snapshot.frame.visible && freezeTime === null) || plan || themeDuration || introAt !== null || arrivalState === 'running' || reformStart !== null || now - tint.at < tint.ms || lightNow.warm !== lightTarget.warm || lightNow.cool !== lightTarget.cool || dirty || [...dives.values()].some(d => d.pin === undefined) || cloudExpression !== (hovered === 'cloud' ? 1 : 0) || now - cloudHoverAt < 650) raf = requestAnimationFrame(tick)
  }
  function requestRender() { dirty = true; if (!raf && !disposed && !lost) raf = requestAnimationFrame(tick) }
  function onVisibility() {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0 }
    else { previous = performance.now(); requestRender() }
  }
  function onLost(event: Event) { event.preventDefault(); lost = true; cancelAnimationFrame(raf); raf = 0; emit('contextlost', undefined) }
  function onRestored() { lost = false; buildEnvironment(); previous = performance.now(); water.clear(); hero.texture.needsUpdate = true; messageTexture.needsUpdate = true; beachTexture.needsUpdate = true; emit('contextrestored', undefined); requestRender() }
  document.addEventListener('visibilitychange', onVisibility)
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)
  const readyPromise = hero.draw(heroSpec, viewport.w, viewport.h).then(() => { if (!disposed) render(performance.now()) })
  const objectsReadyPromise = loadAvatarModel({ signal: avatarRequest.signal }).then(model => {
    if (!model) return
    if (disposed) { disposeModel(model); return }
    const previousAvatar = models.get('avatar')
    if (previousAvatar) {
      // A load may complete mid-transition: copy the last rendered pose and
      // visibility before the next frame applies its current snapshot.
      model.position.copy(previousAvatar.position)
      model.quaternion.copy(previousAvatar.quaternion)
      model.scale.copy(previousAvatar.scale)
      model.visible = previousAvatar.visible
      objectScene.remove(previousAvatar)
      disposeModel(previousAvatar)
    }
    applyToyShading(model, toyShared, toyLocal('avatar'))
    models.set('avatar', model); objectScene.add(model)
    requestRender()
  })
  const engine: PoolEngine = {
    ready: readyPromise, objectsReady: objectsReadyPromise,
    transitionTo(next, at) { plan = next; startedAt = at; requestRender() },
    snapTo(_view, next) { plan = null; snapshot = next; requestRender() },
    setTheme(theme, options) {
      lastMessagePaint = -Infinity
      themeFrom = uniforms.uNight.value; themeTo = theme === 'night' ? 1 : 0; themeAt = performance.now()
      themeDuration = reduced ? 0 : options?.durationMs ?? 1200
      if (!themeDuration) uniforms.uNight.value = themeTo
      requestRender()
    },
    async setHeroText(spec) {
      const langChanged = spec.lang !== heroSpec.lang
      heroSpec = spec
      // A language change on the visible hero: the dots scatter first, the new text is baked in the middle, then they settle.
      if (reformStart !== null) {
        if (reformSwapped === null) reformSpec = spec
        else if (langChanged) {
          // Another click while the dots settle: scatter again from where they are now (no jump back to crisp).
          const amount = reformPhase(performance.now() - reformStart, reformSwapped).amount
          reformStart = performance.now() - SCATTER_MS * Math.sqrt(amount); reformSwapped = null; reformSpec = spec
        } else { await hero.draw(spec, viewport.w, viewport.h); drawnLang = spec.lang; requestRender(); return }
        requestRender()
        return new Promise<void>(resolve => { reformResolvers.push(resolve) })
      }
      if (langChanged && !reduced && freezeTime === null && heroRevealed && heroOnScreen && hero.layout.lines.length > 0) {
        reformStart = performance.now(); reformSwapped = null; reformDrawing = false; reformSpec = spec
        requestRender()
        return new Promise<void>(resolve => { reformResolvers.push(resolve) })
      }
      await hero.draw(spec, viewport.w, viewport.h); drawnLang = spec.lang; requestRender()
    },
    setGuestbookLines(lines) {
      if (!messageLines.length) messagesStartedAt = time
      messageLines = [...lines]; messageFont = ''; lastMessagePaint = -Infinity; requestRender()
      void document.fonts.load('900 26px Nunito', lines.join(' ')).then(() => { if (!disposed) { messageFont = ''; lastMessagePaint = -Infinity; requestRender() } }).catch(() => {})
    },
    launchGuestbookLine(line) {
      if (messageLines[messageLines.length - 1] !== line) engine.setGuestbookLines([...messageLines, line])
      const cloud = snapshot.objects.find(o => o.id === 'cloud')
      if (reduced || !cloud) return
      guestbookTraveler = { line, bornAt: time, x: cloud.x - snapshot.frame.pan.x, y: cloud.y - snapshot.frame.pan.y }
      lastMessagePaint = -Infinity; requestRender()
    },
    setLight(light) { lightTarget = { ...light }; if (reduced) lightNow = lightTarget; requestRender() },
    setRain(on) { rainOn = on && !reduced; rainState = { wait: 300 }; requestRender() },
    setHovered(id) {
      if (id === 'cloud' && hovered !== 'cloud') cloudHoverAt = performance.now()
      const before = projectColor(hovered), after = projectColor(id)
      hovered = id
      if (before !== after) tint = retarget(tint, performance.now(), after, reduced)
      requestRender()
    },
    dive(id) {
      if (reduced || !snapshot.frame.visible || !models.has(id)) return false
      dives.set(id, { at: performance.now(), splashed: false })
      const placement = snapshot.objects.find(o => o.id === id)
      if (placement) water.addDrop((placement.x - snapshot.frame.pan.x) / viewport.w, 1 - (placement.y - snapshot.frame.pan.y) / viewport.h, .02, .3)
      requestRender()
      return true
    },
    pointer: {
      move(x, y) {
        if (reduced || !snapshot.frame.visible) return
        const r = snapshot.frame.rect
        if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) return
        water.addDrop((x - snapshot.frame.pan.x) / viewport.w, 1 - (y - snapshot.frame.pan.y) / viewport.h, .018, .16); requestRender()
      },
      leave() { /* Waves decay naturally after the pointer leaves. */ },
    },
    resize(next: Viewport) {
      viewport = { ...next }; renderer.setSize(next.w, next.h, false); updateCamera()
      uniforms.uViewport.value.set(next.w, next.h); water.setAspect(next.w / next.h); caustics.resize(next.w, next.h); lastMessagePaint = -Infinity
      void engine.setHeroText(heroSpec); requestRender()
    },
    revealHero() { heroRevealed = true; if (arrivalState === 'pending') arrivalState = 'done'; requestRender() },
    skipIntro() {
      if (arrivalState === 'done' && introAt === null) return
      arrivalState = 'done'; introAt = null; heroRevealed = true; finishIntro?.(); finishIntro = null; requestRender()
    },
    playIntro() {
      if (reduced) return Promise.resolve()
      if (arrivalState === 'pending') {
        arrivalState = 'running'; arrivalStartedAt = performance.now(); arrivalSplashed = false
        heroRevealAt = arrivalStartedAt + HERO_AT; finishIntro?.(); introAt = arrivalStartedAt + INTRO_AT; requestRender()
        return new Promise<void>(resolve => { finishIntro = resolve })
      }
      if (heroRevealAt === null) heroRevealAt = performance.now()
      finishIntro?.(); introAt = performance.now(); requestRender()
      return new Promise<void>(resolve => { finishIntro = resolve })
    },
    on(kind, callback) {
      let group = listeners.get(kind)
      if (!group) { group = new Set(); listeners.set(kind, group) }
      group.add(callback as (value: never) => void)
      if (kind === 'objects' && lastObjectStates.length) (callback as (value: readonly ObjectScreenState[]) => void)(lastObjectStates)
      return () => { group?.delete(callback as (value: never) => void) }
    },
    dispose() {
      if (disposed) return
      disposed = true; avatarRequest.abort(); cancelAnimationFrame(raf); finishIntro?.()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored)
      listeners.clear(); water.dispose(); caustics.dispose(); shadowTarget.dispose(); shadowMaterial.dispose(); envTarget?.dispose(); pmrem.dispose(); hero.dispose(); messageTexture.dispose(); beachTexture.dispose(); surfaceGeometry.dispose(); surfaceMaterial.dispose()
      disposeModel(objectScene)
      renderer.dispose()
      if (debugHost.__pool === debug) delete debugHost.__pool
    },
  }
  const debugHost = window as typeof window & { __pool?: unknown }
  const debug = {
    triggerHeroMorph() { heroRevealed = true; morphStart = performance.now(); morphNext = null; requestRender() },
    /** Test hooks: pin the writing / bars animation at an elapsed time (ms), null to release. */
    pinHero(write: number | null, morph: number | null) { debugWrite = write; debugMorph = morph; render(performance.now()) },
    /** Test hook: render the dive of an object at progress t (0..1). */
    diveAt(id: ObjectId, t: number) { dives.set(id, { at: 0, splashed: true, pin: t }); render(performance.now()); if (t >= 1) dives.delete(id) },
    /** Test hook: pin the night value (0..1) to inspect the lamps, as if the 1.2 s transition were stopped there. */
    pinNight(value: number) { themeDuration = 0; uniforms.uNight.value = value; lastMessagePaint = -Infinity; render(performance.now()) },
    /** Test hook: pin the arrival clock (ms since it started, 0..2000), null to release. Also pins the hero writing. */
    pinArrival(ms: number | null) { arrivalPin = ms; debugWrite = ms === null ? null : ms - HERO_AT; heroRevealed = ms === null; if (ms !== null) heroRevealAt = null; render(performance.now()) },
    /** Test hook: pin the hovered-project tint (a slug, or null for blue) as settled, or ms into its 400 ms glide. */
    pinTint(slug: string | null, glideMs = Infinity) { engine.setHovered(slug ? ('project:' + slug) as ObjectId : null); tint = { ...tint, at: performance.now() - glideMs }; render(performance.now()) },
    /** Test hook: pin the scatter amount of the hero dots (0 crisp .. 1 grains), null to release. */
    reformActive() { return reformStart !== null },
    rainDrops() { return rainCount },
    light() { return { ...lightNow } },
    glow() { return { amount: uniforms.uGlow.value, reach: uniforms.uGlowReach.value, steady: uniforms.uGlowSteady.value } },
    arrivalState() { return arrivalState },
    heroLang() { return drawnLang },
    tintTarget() { return tint.toAmount },
    setHeroText(spec: HeroTextSpec) { return engine.setHeroText(spec) },
    pinReform(amount: number | null) { debugReform = amount; render(performance.now()) },
    freeze(ms: number) { freezeTime = ms; render(performance.now()) },
    step(count: number) { for (let i = 0; i < count; i++) water.step(1 / 60); render(performance.now()) },
    stats() { return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, dpr: renderer.getPixelRatio(), programs: renderer.info.programs?.length ?? 0 } },
    objects() { return lastObjectStates },
    avatarSource() { return models.get('avatar')?.userData.avatarSource ?? 'primitive' },
    messageStats() {
      const pixels = messageCanvas.getContext('2d')!.getImageData(0, 0, messageCanvas.width, messageCanvas.height).data
      let maxAlpha = 0, sumX = 0, count = 0
      for (let i = 3; i < pixels.length; i += 4) {
        maxAlpha = Math.max(maxAlpha, pixels[i])
        if (pixels[i] > 6) { sumX += ((i - 3) / 4) % messageCanvas.width; count++ }
      }
      return { count: messageLines.length, maxAlpha, centerX: count ? sumX / count : 0 }
    },
    heroStats() {
      const data = hero.canvas.getContext('2d')!.getImageData(0, 0, hero.canvas.width, hero.canvas.height).data
      let covered = 0
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) covered++
      return { covered, width: hero.canvas.width, height: hero.canvas.height, version: hero.texture.version }
    },
    readHeight(x: number, y: number) { return water.readHeight(x, y) },
    readCaustic(x: number, y: number) { return caustics.read(x, y) },
    /** Export hook (public/media/caustic-tile.webp): the caustic field as a seamless size x size grey tile (white, alpha = light), as a PNG data URL. Needs a viewport >= 2 x size. */
    causticTile(size: number) {
      const { width, height, values } = caustics.readAll()
      const at = (x: number, y: number) => values[(height - 1 - ((y + 0) % height)) * width + (x % width)]
      // Seamless: bilinear blend of the four shifted copies (weights vanish at the borders), then a soft contrast curve.
      const raw = new Float32Array(size * size); let max = 0
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const wx = x / size, wy = y / size
        const v = at(x, y) * wx * wy + at(x + size, y) * (1 - wx) * wy + at(x, y + size) * wx * (1 - wy) + at(x + size, y + size) * (1 - wx) * (1 - wy)
        raw[y * size + x] = v; if (v > max) max = v
      }
      const sorted = Float32Array.from(raw).sort(); const top = sorted[Math.floor(sorted.length * .995)] || max || 1
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')!; const image = ctx.createImageData(size, size)
      for (let i = 0; i < raw.length; i++) {
        const light = Math.min(1, Math.max(0, (raw[i] - .02) / top)) ** .8
        const byte = Math.round(light * 255)
        image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = 255; image.data[i * 4 + 3] = byte
      }
      ctx.putImageData(image, 0, 0)
      return canvas.toDataURL('image/png')
    },
    drop(x: number, y: number) { water.addDrop(x, y, .025, .2) },
    loseContext() { contextExtension?.loseContext() },
    restoreContext() { contextExtension?.restoreContext() },
  }
  if (new URLSearchParams(location.search).has('test')) debugHost.__pool = debug
  requestRender()
  return engine
}
