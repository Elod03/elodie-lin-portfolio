import { expect, test, type Page } from '@playwright/test'
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' })

const routes = ['/', '/projets', '/projets/yoru', '/a-propos', '/playground', '/page-qui-nexiste-pas', '/en/projects', '/zh/about']
async function settle(page: Page, path: string) {
  await page.goto(`${path}${path.includes('?') ? '&' : '?'}test`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main')).toBeAttached()
  await page.waitForTimeout(400)
}

for (const path of routes) {
  test(`no horizontal scroll at 390 px: ${path}`, async ({ page }) => {
    await settle(page, path)
    const wide = () => page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }))
    let m = await wide(); expect(m.doc).toBeLessThanOrEqual(m.win)
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2)); await page.waitForTimeout(200)
    m = await wide(); expect(m.doc).toBeLessThanOrEqual(m.win)
  })
}

for (const path of ['/', '/projets', '/projets/yoru', '/a-propos', '/playground']) {
  test(`nothing fixed in the lower half of the screen: ${path}`, async ({ page }) => {
    await settle(page, path)
    const offenders = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('body *')].filter(el => {
      const style = getComputedStyle(el)
      if (style.position !== 'fixed' || style.display === 'none' || style.visibility === 'hidden') return false
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && r.bottom > window.innerHeight / 2 && r.top >= 0 && !el.closest('.scene') && !el.classList.contains('skip-link')
    }).map(el => el.className || el.tagName))
    expect(offenders).toEqual([])
  })
}

test('menu sheet: full width, rows of 56 px, closes with Escape and with a link', async ({ page }) => {
  await settle(page, '/')
  const toggle = page.getByRole('button', { name: 'Ouvrir le menu' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  const box = await toggle.boundingBox()
  expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44)
  await toggle.click()
  const nav = page.locator('#primary-nav')
  await expect(nav).toBeVisible()
  const sheet = await nav.boundingBox()
  expect(sheet!.x).toBe(0); expect(sheet!.width).toBe(390); expect(sheet!.y).toBe(64)
  for (const name of ['À propos', 'Projets', 'Playground', 'Contact']) {
    const row = await nav.locator('a, button').filter({ hasText: new RegExp(`^${name}$`) }).first().boundingBox()
    expect(row!.height).toBeGreaterThanOrEqual(56); expect(row!.width).toBeGreaterThan(300)
  }
  for (const name of ['GitHub', 'LinkedIn', 'Mon CV']) {
    const link = await nav.getByRole('link', { name: new RegExp(name) }).boundingBox()
    expect(link!.height).toBeGreaterThanOrEqual(44)
  }
  await page.keyboard.press('Escape')
  await expect(nav).toBeHidden()
  await expect(page.getByRole('button', { name: 'Ouvrir le menu' })).toBeFocused()
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
  await page.locator('#primary-nav').getByRole('link', { name: /^Projets/ }).click()
  await expect(page).toHaveURL(/\/projets/)
  await expect(page.locator('#primary-nav')).toBeHidden()
})

test('the water band sits under the header, scrolls away with the page and is hidden after 250 px', async ({ page }) => {
  await settle(page, '/projets')
  const band = () => page.evaluate(() => {
    const r = document.querySelector('.static-pool')!.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, height: r.height, left: r.left, width: r.width, visibility: getComputedStyle(document.querySelector('.scene')!).visibility }
  })
  let b = await band()
  expect(Math.round(b.top)).toBe(64); expect(Math.round(b.height)).toBe(120); expect(b.left).toBe(16); expect(Math.round(b.width)).toBe(358)
  expect(b.visibility).toBe('visible')
  // The content reserves its place: 64 + 120 + 32.
  const heading = await page.locator('.projects-heading').boundingBox()
  expect(heading!.y).toBeGreaterThanOrEqual(216 - 1)
  await page.evaluate(() => window.scrollTo(0, 100)); await page.waitForTimeout(200)
  b = await band()
  expect(Math.round(b.top)).toBe(-36); expect(b.visibility).toBe('visible')
  await page.evaluate(() => window.scrollTo(0, 250)); await page.waitForTimeout(200)
  b = await band()
  expect(b.bottom).toBeLessThanOrEqual(0); expect(b.visibility).toBe('hidden')
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(200)
  b = await band()
  expect(Math.round(b.top)).toBe(64); expect(b.visibility).toBe('visible')
})

test('home: help line and button leave the water, in the flow, and the page does not scroll', async ({ page }) => {
  await settle(page, '/')
  const help = await page.locator('.home-help').boundingBox()
  const pool = await page.locator('.static-pool').boundingBox()
  expect(help!.y).toBeGreaterThanOrEqual(pool!.y + pool!.height - 1)
  expect(await page.locator('.home-help').evaluate(el => getComputedStyle(el).position)).toBe('static')
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true)
  const button = await page.locator('.home-help .btn-solid').boundingBox()
  expect(button!.height).toBeGreaterThanOrEqual(44)
  // Who she is and her CV, on the first screen; the hint speaks to a touch screen.
  await expect(page.locator('.home-help .footer-identity')).toContainText('alternance chez Ody')
  const cv = page.locator('.home-help .home-cv')
  await expect(cv).toHaveAttribute('href', '/cv/elodie-lin-cv-fr.pdf')
  await expect(cv).toHaveAttribute('download', 'elodie-lin-cv-fr.pdf')
  const cvBox = await cv.boundingBox()
  expect(cvBox!.y + cvBox!.height).toBeLessThanOrEqual(844); expect(cvBox!.height).toBeLessThanOrEqual(46)
  await expect(page.locator('.home-help .hint-touch')).toBeVisible()
  await expect(page.locator('.home-help .hint-pointer')).toBeHidden()
})

test('case study: chips of anchors in a native horizontal rail under the title', async ({ page }) => {
  await settle(page, '/projets/yoru')
  const nav = page.locator('.case-chips-nav')
  await expect(nav).toBeVisible()
  await expect(page.locator('.case-rail')).toBeHidden()
  const geometry = await nav.evaluate(el => {
    const ol = el.querySelector('ol')!, a = el.querySelector('a')!
    return { overflow: getComputedStyle(ol).overflowX, scrolls: ol.scrollWidth > ol.clientWidth, chip: a.getBoundingClientRect().height, top: el.getBoundingClientRect().top, titleBottom: document.querySelector('.case-title')!.getBoundingClientRect().bottom }
  })
  expect(geometry.overflow).toBe('auto'); expect(geometry.scrolls).toBe(true); expect(geometry.chip).toBeGreaterThanOrEqual(44)
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.titleBottom - 1)
})

test('about: vertical, no gap, and the portrait and languages show', async ({ page }) => {
  await settle(page, '/a-propos')
  expect(await page.locator('.about-photo img').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
  await expect(page.locator('.about-languages li')).toHaveCount(3)
  const track = await page.locator('.about-track').evaluate(el => ({ dir: getComputedStyle(el).flexDirection, w: el.getBoundingClientRect().width }))
  expect(track.dir).toBe('column'); expect(track.w).toBeLessThanOrEqual(390)
  // No empty stretch: consecutive blocks are never more than 140 px apart.
  const gaps = await page.evaluate(() => { const k = [...document.querySelectorAll('.about-track > *')].map(e => e.getBoundingClientRect()).filter(r => r.height > 0); return k.slice(1).map((r, i) => r.top - k[i].bottom) })
  for (const gap of gaps) expect(gap).toBeLessThan(140)
})

test('404: the band is on top, then the title and a 44 px button back', async ({ page }) => {
  await settle(page, '/ceci-nexiste-pas')
  const pool = await page.locator('.static-pool').boundingBox()
  expect(Math.round(pool!.y)).toBe(64)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cette page n’existe pas.')
  const back = await page.getByRole('link', { name: 'Retour à la piscine' }).boundingBox()
  expect(back!.height).toBeGreaterThanOrEqual(44)
  expect(back!.y).toBeGreaterThan(pool!.y + pool!.height)
})

test('contact: a sheet from the top, full width, rows of 56 px at least', async ({ page }) => {
  await settle(page, '/a-propos')
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
  await page.locator('#primary-nav .nav-contact').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const box = await dialog.boundingBox()
  expect(box!.x).toBe(0); expect(box!.width).toBe(390); expect(Math.round(box!.y)).toBe(64)
  for (const row of await dialog.locator('.contact-rows a').all()) expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(56)
})

test('targets: header controls are 44 px, body text is 18 px', async ({ page }) => {
  await settle(page, '/projets')
  for (const selector of ['.menu-toggle', '.theme-switch', '.language-pill']) {
    expect((await page.locator(selector).boundingBox())!.height).toBeGreaterThanOrEqual(44)
  }
  expect(await page.locator('.projects-heading p').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(18)
})
