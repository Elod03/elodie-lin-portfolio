import { expect, test, type Page } from '@playwright/test'

interface Debug { rainDrops(): number; light(): { warm: number; cool: number }; glow(): { amount: number; reach: number; steady: number }; stats(): { calls: number } }
type W = { __pool?: Debug }

test.use({ viewport: { width: 1200, height: 700 }, reducedMotion: 'no-preference', colorScheme: 'light' })

async function ready(page: Page) { await expect(page.locator('.scene')).toHaveAttribute('data-ready', 'true', { timeout: 30000 }) }
const MIDDAY = new Date('2026-06-10T10:00:00Z'), NIGHT = new Date('2026-06-10T21:30:00Z') // 12:00 / 23:30 in Paris

test('rain: forced rain drops on the water, stays within the draw-call budget, and only then', async ({ page }) => {
  test.setTimeout(90000)
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('/?test&rain')
  await ready(page)
  await page.waitForFunction(() => ((window as unknown as W).__pool?.rainDrops() ?? 0) >= 1, null, { timeout: 30000 })
  expect(await page.evaluate(() => (window as unknown as W).__pool!.stats().calls)).toBeLessThanOrEqual(45)
  await page.goto('/?test')
  await ready(page)
  await page.waitForTimeout(1500)
  expect(await page.evaluate(() => (window as unknown as W).__pool!.rainDrops())).toBe(0)
  expect(errors).toEqual([])
})

test('rain: never with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?test&rain')
  await ready(page)
  await page.waitForTimeout(1500)
  expect(await page.evaluate(() => (window as unknown as W).__pool!.rainDrops())).toBe(0)
})

test('night is automatic after the sunset in Paris, unless a choice was saved', async ({ page }) => {
  await page.clock.setFixedTime(NIGHT)
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  // the button still wins, and its choice is kept
  await page.getByRole('switch', { name: 'Mode nuit' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
})

test('daylight in Paris keeps the day theme (light system preference)', async ({ page }) => {
  await page.clock.setFixedTime(MIDDAY)
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
})

test('Paris mark: hour and temperature on desktop, no temperature without weather, hidden on small screens', async ({ page }) => {
  await page.goto('/?test&paris=2026-06-10T12:32:00Z&temp=12')
  const mark = page.locator('.paris-badge')
  await expect(mark).toContainText('Paris 14:32 · 12 °C')
  await expect(mark).toHaveAttribute('aria-label', /14 h 32, 12 degrés/)
  await page.goto('/?test&paris=2026-06-10T12:32:00Z')
  await expect(page.locator('.paris-badge')).toContainText('Paris 14:32')
  await expect(page.locator('.paris-badge')).not.toContainText('°C')
  await expect(page.locator('.paris-badge')).toHaveAttribute('aria-label', 'Heure à Paris : 14 h 32')
  await page.setViewportSize({ width: 900, height: 700 })
  await expect(page.locator('.paris-badge')).toBeHidden()
  await page.setViewportSize({ width: 1200, height: 700 })
  await page.goto('/en?test&paris=2026-06-10T12:32:00Z&temp=3')
  await expect(page.locator('.paris-badge')).toHaveAttribute('aria-label', 'Time in Paris: 14:32, 3 degrees Celsius')
  await page.goto('/zh?test&paris=2026-06-10T12:32:00Z&temp=3')
  await expect(page.locator('.paris-badge')).toContainText('巴黎 14:32')
})

test('light of the hour: golden at the end of the afternoon, clear in the morning, neutral in the early afternoon', async ({ page }) => {
  test.setTimeout(90000)
  const read = async (iso: string) => { await page.goto(`/?test&paris=${iso}`); await ready(page); return page.evaluate(() => (window as unknown as W).__pool!.light()) }
  expect((await read('2026-06-10T16:15:00Z')).warm).toBeGreaterThan(.9)
  expect((await read('2026-06-10T06:30:00Z')).cool).toBeGreaterThan(.9)
  const noon = await read('2026-06-10T11:00:00Z')
  expect(noon.warm + noon.cool).toBeLessThan(.1)
})

test('water light on the page: a glow on strip pages (160 px), none on the home page', async ({ page }) => {
  test.setTimeout(90000)
  await page.goto('/projets/yoru?test')
  await ready(page)
  expect(await page.evaluate(() => (window as unknown as W).__pool!.glow())).toMatchObject({ amount: 1, reach: 160 })
  await page.goto('/?test')
  await ready(page)
  expect((await page.evaluate(() => (window as unknown as W).__pool!.glow())).amount).toBe(0)
  await page.setViewportSize({ width: 600, height: 800 })
  await page.goto('/?test')
  await ready(page)
})

/** Counts the reflections ever inserted (a slow machine can miss a 900 ms element when polling) and remembers the size of the first one. */
const watchLight = (page: Page) => page.addInitScript(() => {
  const w = window as unknown as { __lights: number; __lightWidth: number }
  w.__lights = 0; w.__lightWidth = 0
  new MutationObserver(records => { for (const r of records) r.addedNodes.forEach(n => { if (n instanceof HTMLElement && n.classList.contains('water-light')) { w.__lights++; w.__lightWidth ||= n.getBoundingClientRect().width } }) }).observe(document, { childList: true, subtree: true })
})
const lights = (page: Page) => page.evaluate(() => (window as unknown as { __lights: number }).__lights)

test('arrival reflection: once on landing over the main block (900 ms); link navigation plays it, back does not', async ({ page }) => {
  test.setTimeout(400000)
  await watchLight(page)
  await page.goto('/projets/yoru?test')
  await ready(page)
  await expect.poll(() => lights(page), { timeout: 60000 }).toBe(1)
  const hero = await page.locator('.case-hero-frame').boundingBox()
  expect(Math.abs((await page.evaluate(() => (window as unknown as { __lightWidth: number }).__lightWidth)) - hero!.width)).toBeLessThan(2)
  await expect(page.locator('.water-light')).toHaveCount(0, { timeout: 60000 })
  expect(await lights(page)).toBe(1) // not replayed by itself
  await page.goto('/?test')
  await ready(page)
  await page.locator('.home-footer .all-projects').click()
  await expect(page).toHaveURL(/\/projets$/)
  await expect.poll(() => lights(page), { timeout: 60000 }).toBe(1)
  await expect(page.locator('.water-light')).toHaveCount(0, { timeout: 60000 })
  await page.locator('.project-link').first().click()
  await expect.poll(() => lights(page), { timeout: 60000 }).toBe(2)
  await expect(page.locator('.water-light')).toHaveCount(0, { timeout: 60000 })
  await page.evaluate(() => history.back())
  await expect(page).toHaveURL(/\/projets$/)
  await page.waitForTimeout(4000)
  expect(await lights(page)).toBe(2) // the back button replays nothing
})

test('arrival reflection: absent with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/projets/yoru?test')
  await ready(page)
  await page.waitForTimeout(2000)
  await expect(page.locator('.water-light')).toHaveCount(0)
})

test('living preview: hovering a project shows the long capture scrolling once, back and forth; still with reduced motion', async ({ page }) => {
  test.setTimeout(90000)
  await page.goto('/?test')
  await ready(page)
  const link = page.locator('.object-link.object-project').first()
  await expect(link).toBeVisible({ timeout: 60000 })
  await link.hover({ force: true })
  const image = page.locator('.peek-card .peek-scroll img')
  await expect(image).toHaveCount(1)
  const style = await image.evaluate(el => { const s = getComputedStyle(el); return { name: s.animationName, count: s.animationIterationCount, duration: s.animationDuration } })
  expect(style).toEqual({ name: 'peek-scroll', count: '1', duration: '11s' })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await image.evaluate(el => getComputedStyle(el).animationName)).toBe('none')
})
