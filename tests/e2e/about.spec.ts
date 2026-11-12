import { expect, test } from '@playwright/test'

const bandTop = (h: number) => h - Math.min(140, Math.max(100, h * .15)) - 12
const contentSelector = '.about-page h1, .about-page h2, .about-page p, .about-page li, .about-page img, .about-page figure, .about-page a, .about-page button'

test.describe('À propos sur ordinateur', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  test('la première vue : portrait, chibi, identité, actions, puis la carte Ody entière, sans carrousel', async ({ page }) => {
    await page.goto('/a-propos?fallback')
    await expect(page.locator('.about-carousel, .carousel-track, [data-playing]')).toHaveCount(0)
    const photo = (await page.locator('.about-photo').boundingBox())!
    expect(photo.width).toBeGreaterThan(1440 * .2); expect(photo.width).toBeLessThan(1440 * .25)
    expect(photo.y + photo.height).toBeLessThanOrEqual(bandTop(900))
    const chibi = (await page.locator('.about-chibi').boundingBox())!
    expect(chibi.x).toBeLessThan(photo.x + photo.width); expect(chibi.x + chibi.width).toBeGreaterThan(photo.x + photo.width)
    expect(Math.abs(chibi.y + chibi.height - (photo.y + photo.height))).toBeLessThan(8)
    const h1 = (await page.locator('.about-intro h1').boundingBox())!, actions = (await page.locator('.about-actions').boundingBox())!
    expect(h1.x).toBeGreaterThan(photo.x + photo.width)
    expect(Math.abs(actions.y + actions.height - (photo.y + photo.height))).toBeLessThan(20)
    await expect(page.locator('.about-cv')).toBeVisible()
    await expect(page.locator('.about-actions').getByRole('button', { name: /Mes coordonnées/ })).toBeVisible()
    const ody = (await page.locator('.about-xp-card[data-kind="hero"]').boundingBox())!
    expect(ody.x + ody.width).toBeLessThanOrEqual(1440); expect(ody.y + ody.height).toBeLessThanOrEqual(bandTop(900))
    const xp = (await page.locator('.about-experience').boundingBox())!
    expect(xp.x).toBeLessThan(1440); expect(xp.x + xp.width).toBeGreaterThan(1440)
    await expect(page.locator('.about-pills-main li')).toHaveCount(4)
    await expect(page.locator('.about-languages')).toContainText('Anglais')
    await expect(page.locator('.about-hint')).toBeVisible()
    // The hint says it in words until the band has been moved, then shrinks to the progress ring.
    await expect(page.locator('.about-hint-label')).toBeVisible(); await expect(page.locator('.about-hint-label')).toHaveText('Défiler')
    await page.mouse.move(700, 300); await page.mouse.wheel(0, 400)
    await expect(page.locator('.about-hint')).toHaveAttribute('data-moved', '')
    await expect(page.locator('.about-hint-label')).toHaveCSS('opacity', '0')
  })

  test('Expérience et Formation : les 9 lignes complètes (poste, période) et les réalisations sont visibles sans clic, une fois la bande défilée', async ({ page }) => {
    await page.goto('/a-propos?fallback')
    const expected = [['Ody', 'Développeuse web en alternance', 'depuis 09/2026'], ['Info2soft', 'Stagiaire en développement web', '06–08/2025'], ['Sushi Tokyo', 'Stage en développement web', '04–06/2025'], ['Delpech', 'Stage pharmacie et laboratoire', '04/2019'], ['Arteque', 'Bénévolat', 'depuis 2024'], ['Efrei', 'Bachelor Ingénierie & Numérique', '2024–2027'], ['Elysée Marbeuf', 'CAP Esthétique', '2023–2024'], ['UPEC', 'Licence Sciences pour la santé (PASS)', '2022–2023'], ['Lycée Saint-André', 'Baccalauréat, option maths/physique-chimie', '2019–2022']]
    for (const [name, role, period] of expected) {
      const row = page.locator('.about-row, .about-xp-card', { hasText: name }).first()
      await row.evaluate(el => { const p = document.querySelector('.about-page')!; p.scrollTo({ left: el.getBoundingClientRect().left + p.scrollLeft - 120, behavior: 'instant' }) })
      await expect(row, name).toContainText(role); await expect(row, name).toContainText(period)
      const box = (await row.boundingBox())!
      expect(box.x, name).toBeGreaterThanOrEqual(0); expect(box.x + box.width, name).toBeLessThanOrEqual(1440)
      expect(box.y + box.height, name).toBeLessThanOrEqual(bandTop(900))
    }
    for (const point of ['Adaptation de l’interface en anglais pour un public international', 'Conseil en parapharmacie', 'Animation d’ateliers musicaux']) await expect(page.locator('.about-points li', { hasText: point })).toBeVisible()
  })

  test('la molette fait défiler la bande de côté sans épingler la page', async ({ page }) => {
    await page.goto('/a-propos?fallback')
    await page.mouse.move(700, 300)
    await page.mouse.wheel(0, 600)
    await expect.poll(() => page.evaluate(() => document.querySelector('.about-page')!.scrollLeft)).toBeGreaterThan(300)
    expect(await page.evaluate(() => scrollY)).toBe(0)
    await page.mouse.wheel(0, 5000)
    await expect.poll(() => page.evaluate(() => { const p = document.querySelector('.about-page')!; return p.scrollWidth - p.clientWidth - p.scrollLeft })).toBeLessThan(2)
  })

  test('on peut attraper la bande et la tirer avec la souris, sans ouvrir le lien sous le curseur', async ({ page }) => {
    await page.goto('/a-propos?fallback')
    const left = () => page.evaluate(() => document.querySelector('.about-page')!.scrollLeft)
    expect(await page.locator('.about-page').evaluate(e => getComputedStyle(e).cursor)).toBe('grab')
    await page.mouse.move(900, 450); await page.mouse.down()
    for (let x = 880; x >= 400; x -= 40) await page.mouse.move(x, 450)
    await expect(page.locator('.about-page')).toHaveAttribute('data-dragging', '')
    await page.mouse.up()
    expect(await left()).toBeGreaterThan(450)
    await expect(page.locator('.about-page')).not.toHaveAttribute('data-dragging', '')
    expect(await page.evaluate(() => getSelection()!.toString())).toBe('')
    // A drag that starts on a link moves the band and does not follow the link.
    await page.evaluate(() => document.querySelector('.about-page')!.scrollTo({ left: 0, behavior: 'instant' }))
    const url = page.url(), cv = (await page.locator('.about-cv').boundingBox())!
    const popup = page.waitForEvent('popup', { timeout: 1500 }).catch(() => null)
    await page.mouse.move(cv.x + cv.width / 2, cv.y + cv.height / 2); await page.mouse.down()
    for (let i = 1; i <= 8; i++) await page.mouse.move(cv.x + cv.width / 2 - i * 30, cv.y + cv.height / 2)
    await page.mouse.up()
    expect(await left()).toBeGreaterThan(200)
    expect(page.url()).toBe(url); expect(await popup).toBeNull()
  })

  for (const [width, height] of [[1280, 720], [1366, 768], [1440, 800], [1440, 900]]) {
    test(`la première vue indique le défilement latéral sans rien recouvrir (${width}×${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/a-propos?fallback')
      const hint = page.locator('.about-hint')
      const hintVisible = await hint.isVisible()
      const next = (await page.locator('.about-experience').boundingBox())!
      const peeks = next.x < width - 40 && next.x + next.width > width
      expect(hintVisible || peeks, 'flèche visible ou colonne suivante qui dépasse').toBe(true)
      if (height < 900) expect(peeks, 'écran bas : la colonne suivante dépasse du bord droit').toBe(true)
      if (hintVisible) {
        const h = (await hint.boundingBox())!
        for (const el of await page.locator(contentSelector).all()) {
          if (await el.evaluate(e => e.classList.contains('about-hint'))) continue
          const c = await el.boundingBox()
          if (!c || c.width === 0) continue
          expect(c.x < h.x + h.width && c.x + c.width > h.x && c.y < h.y + h.height && c.y + c.height > h.y, 'la flèche ne recouvre rien').toBe(false)
        }
      }
    })
  }

  for (const [width, height] of [[1440, 900], [1280, 720], [1366, 768]]) {
    test(`aucun contenu ne croise la bande-piscine, au début comme à la fin (${width}×${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/a-propos?fallback')
      const top = bandTop(height)
      for (const at of [0, .2, .35, .5, .7, .85, 1]) {
        await page.evaluate(f => { const p = document.querySelector('.about-page')!; p.scrollTo({ left: (p.scrollWidth - p.clientWidth) * f, behavior: 'instant' }) }, at)
        const boxes = await page.locator(contentSelector).evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { tag: el.tagName + '.' + el.className, x: r.x, y: r.y, w: r.width, h: r.height } }))
        for (const b of boxes) {
          if (b.w === 0 || b.h === 0) continue
          if (b.x + b.w <= 0 || b.x >= width) continue
          if (b.y < 0) continue
          expect(b.y + b.h, `${b.tag} (à ${Math.round(at * 100)} %) ne doit pas passer sous la bande`).toBeLessThanOrEqual(top)
        }
      }
    })
    test(`la page tient en un peu plus d’un écran de défilement, langues présentes sans être mises en avant (${width}×${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/a-propos?fallback')
      expect(await page.evaluate(() => { const p = document.querySelector('.about-page')!; return p.scrollWidth / p.clientWidth })).toBeLessThan(2.1)
      await expect(page.locator('.about-pool')).toHaveCount(0)
      await expect(page.locator('.about-languages li')).toHaveCount(3)
      await expect(page.locator('.about-languages')).toContainText('B1'); await expect(page.locator('.about-languages')).toContainText('HSK 6')
      await expect(page.locator('.about-polaroid')).toHaveCount(0)
    })
    test(`aucun texte du bandeau sous 15 px (${width}×${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/a-propos?fallback')
      const small = await page.evaluate(() => [...document.querySelectorAll('.about-page :is(p, li, strong, span, h1, h2, h3, a, button, em)')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent!.trim()) && parseFloat(getComputedStyle(el).fontSize) < 15 && !el.closest('.about-credits, .about-social')).map(el => `${el.className}:${getComputedStyle(el).fontSize}`))
      expect(small).toEqual([])
    })
  }
})

test.describe('À propos sur mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  test('colonne verticale, liste complète, pas de défilement horizontal', async ({ page }) => {
    await page.goto('/a-propos?fallback')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await page.evaluate(() => { const p = document.querySelector('.about-page')!; return p.scrollWidth <= p.clientWidth + 1 })).toBe(true)
    await expect(page.locator('.about-row')).toHaveCount(4)
    await expect(page.locator('.about-xp-card')).toHaveCount(5)
    await expect(page.locator('.about-points li').first()).toBeVisible()
    await expect(page.locator('.about-hint')).toBeHidden()
    await expect(page.locator('.about-cv')).toBeVisible()
    await expect(page.locator('.about-languages li')).toHaveCount(3)
  })
})

test.describe('À propos : les effets', () => {
  test.use({ viewport: { width: 1440, height: 900 } })
  test('une molette tournée vite fait avancer la bande pendant qu’on tourne, sans rester bloquée puis sauter', async ({ page }) => {
    await page.goto('/a-propos?fallback')
    // Notches are dispatched from the page every 15 ms (a fast wheel spin) and the band position is noted at each one.
    const at = await page.evaluate(async () => {
      const p = document.querySelector('.about-page')!, seen: number[] = []
      for (let i = 0; i < 24; i++) {
        seen.push(p.scrollLeft)
        p.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, deltaMode: 0, bubbles: true, cancelable: true }))
        await new Promise(resolve => setTimeout(resolve, 15))
      }
      return seen
    })
    // While the wheel is still turning the band must already have moved well (it used to sit near 0, then jump).
    expect(at[12]).toBeGreaterThan(250)
    expect(at[at.length - 1]).toBeGreaterThan(700)
    for (let i = 1; i < at.length; i++) expect(at[i]).toBeGreaterThanOrEqual(at[i - 1] - 1)
  })
  test('à la première visite, la bande glisse un peu vers la droite puis revient, pour montrer le sens', async ({ page }) => {
    await page.goto('/a-propos?fallback')
    const left = () => page.evaluate(() => document.querySelector('.about-page')!.scrollLeft)
    await expect.poll(left, { timeout: 6000, intervals: [100] }).toBeGreaterThan(40)
    await expect.poll(left, { timeout: 4000 }).toBe(0)
    await expect(page.locator('.about-hint')).not.toHaveAttribute('data-moved', '')
    await page.reload(); await page.waitForTimeout(4000)
    expect(await left(), 'une seule fois par visite').toBe(0)
  })
  test('ce qui est hors écran attend d’être atteint, et défiler laisse un sillage', async ({ page }) => {
    await page.goto('/a-propos?fallback')
    const card = page.locator('.about-row').first()
    await expect(card).toHaveAttribute('data-wait', '')
    expect(await card.getAttribute('data-seen')).toBeNull()
    await page.evaluate(() => { (window as unknown as { wakes: number }).wakes = 0; addEventListener('pool:wake', () => { (window as unknown as { wakes: number }).wakes++ }) })
    await page.evaluate(() => { const p = document.querySelector('.about-page')!; p.scrollTo({ left: p.scrollWidth, behavior: 'instant' }) })
    await expect(card).toHaveAttribute('data-seen', '')
    await expect(card).toHaveCSS('opacity', '1', { timeout: 8000 })
    expect(await page.evaluate(() => (window as unknown as { wakes: number }).wakes)).toBeGreaterThan(0)
  })
})
