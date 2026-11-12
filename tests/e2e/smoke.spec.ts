import { expect, test } from '@playwright/test'
test.use({ reducedMotion: 'reduce' })

test('loads / with no console error', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))
  await page.goto('/')
  await expect(page.locator('h1')).toHaveCount(1)
  expect(errors).toEqual([])
})

test('theme switch persists after reloading', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  // Fixed midday in Paris: after the sunset the night is automatic (see paris.spec.ts).
  await page.clock.setFixedTime(new Date('2026-06-10T10:00:00Z'))
  await page.goto('/')
  const toggle = page.getByRole('switch', { name: 'Mode nuit' })
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await toggle.click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  await page.reload()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
})

test('mobile content fits and keyboard navigation reaches the theme switch', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeFocused()
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab')
    if (await page.getByRole('switch', { name: 'Mode nuit' }).evaluate(element => element === document.activeElement)) break
  }
  await expect(page.getByRole('switch', { name: 'Mode nuit' })).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
