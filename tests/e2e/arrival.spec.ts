import { expect, test, type Page } from '@playwright/test'

interface Debug {
  arrivalState(): 'pending' | 'running' | 'done'; heroLang(): string; reformActive(): boolean; tintTarget(): number;
  setHeroText(spec: { lang: string; title: string; lines: string[] }): Promise<void>; avatarSource(): string;
}
type W = { __pool?: Debug; __states?: string[] }

test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' })

async function ready(page: Page) {
  await expect(page.locator('.scene')).toHaveAttribute('data-ready', 'true', { timeout: 30000 })
}
const record = (page: Page) => page.addInitScript(() => {
  (window as unknown as W).__states = []
  const poll = () => { const s = (window as unknown as W).__pool?.arrivalState(); const l = (window as unknown as W).__states!; if (s && l[l.length - 1] !== s) l.push(s); requestAnimationFrame(poll) }
  poll()
})

test('arrival: plays on the first visit, Tab does not skip, a key skips, the second load does not replay, the h1 is there at once', async ({ page }) => {
  test.setTimeout(90000)
  await record(page)
  await page.goto('/?test&arrival', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('h1')).toHaveCount(1)
  await ready(page)
  // All inside one page call: observe 'running' and press the keys in the same task (a slow machine could otherwise
  // let the 2 s arrival end by itself between two round trips).
  const keys = await page.evaluate(async () => {
    const pool = (window as unknown as W).__pool!
    while (pool.arrivalState() !== 'running') await new Promise(resolve => setTimeout(resolve, 5))
    const press = (key: string) => { window.dispatchEvent(new KeyboardEvent('keydown', { key })); return pool.arrivalState() }
    return { before: pool.arrivalState(), afterTab: press('Tab'), afterEscape: press('Escape') }
  })
  expect(keys).toEqual({ before: 'running', afterTab: 'running', afterEscape: 'done' })
  await page.waitForFunction(() => (window as unknown as W).__states?.includes('done'), null, { timeout: 15000 })
  expect(await page.evaluate(() => (window as unknown as W).__states)).toEqual(['pending', 'running', 'done'])
  // Second load, same context (same sessionStorage): no replay.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('h1')).toHaveCount(1)
  await ready(page)
  await page.waitForTimeout(1500)
  expect(await page.evaluate(() => (window as unknown as W).__states)).toEqual(['done'])
})

test('the tint goes back to blue when a click navigates away from the hovered project', async ({ page }) => {
  test.setTimeout(90000)
  await page.goto('/?test', { waitUntil: 'domcontentloaded' })
  await ready(page)
  await page.waitForFunction(() => (window as unknown as W).__pool?.avatarSource() === 'glb', null, { timeout: 30000 })
  const link = page.locator('a.object-link[href*="streamflix"]').first()
  const box = (await link.boundingBox())!
  const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2]
  await page.mouse.move(cx, cy)
  await page.waitForFunction(() => (window as unknown as W).__pool!.tintTarget() > 0, null, { timeout: 10000 })
  await page.mouse.click(cx, cy)
  await expect(page).toHaveURL(/streamflix/, { timeout: 15000 })
  await page.waitForFunction(() => (window as unknown as W).__pool!.tintTarget() === 0, null, { timeout: 10000 })
})

test('fast language clicks: the last language wins, the reform state is cleared, every promise resolves', async ({ page }) => {
  test.setTimeout(90000)
  await page.goto('/?test', { waitUntil: 'domcontentloaded' })
  await ready(page)
  await page.waitForFunction(() => (window as unknown as W).__pool?.avatarSource() === 'glb', null, { timeout: 30000 })
  await page.waitForTimeout(4800) // the hero is written by now
  const result = await page.evaluate(async () => {
    const pool = (window as unknown as W).__pool!
    const spec = (lang: string) => ({ lang, title: lang === 'en' ? 'Hi, I am Elodie.' : lang === 'zh' ? '你好，我是 Elodie。' : 'Salut, moi c’est Elodie.', lines: ['a', 'b'] })
    const waits = [pool.setHeroText(spec('en'))]
    await new Promise(r => setTimeout(r, 80)); waits.push(pool.setHeroText(spec('zh')))
    await new Promise(r => setTimeout(r, 80)); waits.push(pool.setHeroText(spec('fr')))
    const started = pool.reformActive()
    await Promise.race([Promise.all(waits), new Promise((_, no) => setTimeout(() => no(new Error('promise orphaned')), 20000))])
    return { started, lang: pool.heroLang(), active: pool.reformActive() }
  })
  expect(result.started).toBe(true)
  expect(result.lang).toBe('fr')
  expect(result.active).toBe(false)
})
