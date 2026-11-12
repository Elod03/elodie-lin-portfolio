import { expect, test } from '@playwright/test'
test.use({ reducedMotion: 'reduce' })
test('gallery rows are text | image, lead to the case study and keep one external link each', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/projets')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Projets')
  const rows = page.locator('.project-row')
  await expect(rows).toHaveCount(4)
  for (const [name, slug, site] of [['StreamFlix', 'streamflix', 'https://streamflix-murex.vercel.app/'], ['YORU', 'yoru', 'https://yorumontparnasse.com'], ['Kanpai', 'kanpai', 'https://www.kanpaiparis.fr'], ['Carnival 17', 'carnival', 'https://carnival17.sites.ody.app/']]) {
    const row = rows.filter({ hasText: name })
    await expect(row.getByRole('link', { name, exact: true })).toHaveAttribute('href', `/projets/${slug}`)
    await expect(row.getByRole('link', { name: /Voir le site/ })).toHaveAttribute('href', site)
    await expect(row.locator('.project-chips li')).toHaveCount(3)
  }
  // Removed by the redesign: search, filters, counter, surtitre.
  await expect(page.getByRole('searchbox')).toHaveCount(0)
  await expect(page.locator('.page-kicker, .projects-filters, .projects-count')).toHaveCount(0)
  await expect(page.locator('a[href="https://github.com/Elod03"]').last()).toBeVisible()
  expect(errors).toEqual([])
})
test('clicking anywhere on a row opens its case study, with the external link left alone', async ({ page }) => {
  await page.goto('/projets')
  await page.locator('.project-row').filter({ hasText: 'YORU' }).locator('.project-visual').click({ force: true })
  await expect(page).toHaveURL(/\/projets\/yoru$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('YORU')
  // Case study: one facts panel, real captures in the sections, a project-coloured primary button.
  await expect(page.locator('.case-facts')).toHaveCount(1)
  expect(await page.locator('.case-split .case-shot').count()).toBeGreaterThanOrEqual(2)
  await expect(page.getByRole('link', { name: /Voir le site/ }).first()).toHaveAttribute('href', 'https://yorumontparnasse.com')
  await expect(page.locator('.page-kicker, [data-reveal]')).toHaveCount(0)
})
test('mobile gallery fits and remains usable without WebGL', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/projets?fallback')
  await expect(page.locator('.project-row')).toHaveCount(4)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('mobile menu exposes projects and social links, and Escape restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?fallback')
  const toggle = page.getByRole('button', { name: 'Ouvrir le menu' })
  await toggle.click()
  const nav = page.getByRole('navigation', { name: 'Navigation principale' })
  await expect(nav.getByRole('link').first()).toHaveText('À propos')
  await expect(page.getByRole('link', { name: '中文', exact: true })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Projets', exact: true })).toBeVisible()
  await expect(nav.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/Elod03')
  await expect(nav.getByRole('link', { name: /LinkedIn/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(toggle).toBeFocused()
  await expect(nav).not.toBeVisible()
})
