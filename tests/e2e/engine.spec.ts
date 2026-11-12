import { expect, test, type Page } from '@playwright/test'

interface PoolDebug {
  freeze(ms: number): void; step(count: number): void; readHeight(x: number, y: number): number;
  drop(x: number, y: number): void; stats(): { calls: number; triangles: number };
  loseContext(): void; restoreContext(): void;
  avatarSource(): 'glb' | 'primitive';
  messageStats(): { count: number; maxAlpha: number; centerX: number };
  heroStats(): { covered: number; width: number; height: number; version: number };
}
declare global { interface Window { __pool?: PoolDebug } }

test.use({ viewport: { width: 900, height: 650 }, reducedMotion: 'reduce' })

test('GPU renders original pool and wave impulse decays without shader errors', async ({ page }) => {
  test.setTimeout(60000)
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error' || /GL_INVALID_VALUE|texture dimensions/i.test(message.text())) errors.push(message.text()) })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/?test')
  await expect(page.locator('.scene')).toHaveAttribute('data-ready', 'true', { timeout: 20000 })
  await page.waitForFunction(() => window.__pool?.avatarSource() === 'glb')
  const result = await page.evaluate(() => {
    const debug = window.__pool!
    debug.freeze(2000)
    const before = debug.readHeight(.5, .5)
    debug.drop(.5, .5); debug.step(1)
    const after = debug.readHeight(.5, .5)
    debug.step(100)
    return { before, after, settled: debug.readHeight(.5, .5), stats: debug.stats() }
  })
  expect(result.before).toBe(0)
  expect(result.after).toBeGreaterThan(.05)
  expect(Math.abs(result.settled)).toBeLessThan(.01)
  expect(result.stats.calls).toBeGreaterThan(5)
  expect(result.stats.calls).toBeLessThanOrEqual(50)
  expect(result.stats.triangles).toBeGreaterThan(1000)
  expect(errors).toEqual([])
})

async function darkHeroPixels(page: Page) {
  const { width, height } = page.viewportSize()!
  const image = await page.screenshot({ clip: { x: width * .18, y: height * .32, width: width * .64, height: height * .14 } })
  return page.evaluate(async data => {
    const img = new Image(); img.src = data; await img.decode()
    const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height
    const context = canvas.getContext('2d')!; context.drawImage(img, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let count = 0
    for (let i = 0; i < pixels.length; i += 4) {
      // Navy lettering against the bright cyan floor. The region excludes
      // objects and walls, so a rendered-but-empty pool cannot pass.
      if (pixels[i] < 70 && pixels[i + 1] < 130 && pixels[i + 2] > 90 && pixels[i + 2] < 205) count++
    }
    return count
  }, `data:image/png;base64,${image.toString('base64')}`)
}

test('hero text reaches the GPU after delayed font loading and viewport resize', async ({ page }) => {
  test.setTimeout(60000)
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error' || /GL_INVALID_VALUE|texture dimensions/i.test(message.text())) errors.push(message.text()) })
  page.on('pageerror', error => errors.push(error.message))
  let delayedFonts = 0
  await page.route(/\.woff2(?:\?.*)?$/, async route => {
    delayedFonts++
    await new Promise(resolve => setTimeout(resolve, 350))
    await route.continue()
  })
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto('/?test')
  await expect(page.locator('.scene')).toHaveAttribute('data-ready', 'true', { timeout: 20000 })
  await page.evaluate(() => window.__pool!.freeze(2000))
  expect(delayedFonts).toBeGreaterThan(0)
  expect(await darkHeroPixels(page)).toBeGreaterThan(300)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForFunction(() => window.__pool?.heroStats().width === 585)
  await page.evaluate(() => window.__pool!.freeze(2000))
  expect(await darkHeroPixels(page)).toBeGreaterThan(100)
  expect(errors).toEqual([])
})

test('lost WebGL context shows fallback then restores the scene', async ({ page }) => {
  test.setTimeout(60000)
  await page.goto('/?test')
  await expect(page.locator('.scene')).toHaveAttribute('data-ready', 'true', { timeout: 20000 })
  await page.evaluate(() => window.__pool!.loseContext())
  await expect(page.locator('.scene')).toHaveAttribute('data-ready', 'false')
  await page.evaluate(() => window.__pool!.restoreContext())
  await expect(page.locator('.scene')).toHaveAttribute('data-ready', 'true', { timeout: 20000 })
  expect(await page.evaluate(() => { window.__pool!.freeze(2000); return window.__pool!.stats().calls })).toBeGreaterThan(5)
})

test('submitted messages scroll behind the scene, blurred and transparent, and no legacy greeting', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => localStorage.setItem('ep-guestbook', JSON.stringify({ lines: ['hello', 'Bonjour Elodie'] })))
  await page.goto('/?test')
  await expect(page.locator('.scene')).toHaveAttribute('data-ready', 'true', { timeout: 20000 })
  await page.evaluate(() => document.fonts.load('900 26px Nunito'))
  const before = await page.evaluate(() => { window.__pool!.freeze(3000); return window.__pool!.messageStats() })
  const after = await page.evaluate(() => { window.__pool!.freeze(5000); return window.__pool!.messageStats() })
  expect(before.count).toBe(1)
  expect(before.maxAlpha).toBeGreaterThan(25)
  expect(before.maxAlpha).toBeLessThan(150)
  expect(after.centerX).toBeLessThan(before.centerX - 50)
})

test('WP12a hooks: arrival, water tint and language scatter render without errors and within the draw-call budget', async ({ page }) => {
  test.setTimeout(60000)
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/?test')
  await expect(page.locator('.scene')).toHaveAttribute('data-ready', 'true', { timeout: 20000 })
  const calls = await page.evaluate(() => {
    const debug = window.__pool as unknown as { freeze(ms: number): void; pinArrival(ms: number | null): void; pinTint(slug: string | null): void; pinReform(amount: number | null): void; stats(): { calls: number } }
    const seen: number[] = []
    debug.freeze(2000)
    for (const t of [0, 400, 800, 1200, 2000]) { debug.pinArrival(t); seen.push(debug.stats().calls) }
    debug.pinArrival(null)
    debug.pinTint('yoru'); seen.push(debug.stats().calls)
    debug.pinReform(.7); seen.push(debug.stats().calls)
    debug.pinReform(null); debug.pinTint(null)
    return seen
  })
  for (const count of calls) expect(count).toBeLessThanOrEqual(45)
  expect(errors).toEqual([])
})
