import { spawn } from 'node:child_process'
import { readFile, mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

// The scratch directory and the reference captures are never published.
const view = process.argv[2] ?? 'home'
const views = { home: ['/', '01-desktop-initial.png'], about: ['/a-propos', '05b-about.png'], playground: ['/playground', '13c-playground-settled.png'], case: ['/projets/yoru', '08b-courierverse-arrived.png'], projects: ['/projets', null] }
if (!views[view]) throw new Error('Vue inconnue.')
const scratch = '.superpowers/screenshots'
await mkdir(scratch, { recursive: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { stdio: 'pipe', windowsHide: true })
let serverError
server.on('error', error => { serverError = error })
let browser
try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (serverError) throw serverError
    if (server.exitCode !== null) throw new Error('Le serveur de capture ne peut pas démarrer.')
    try { ready = (await fetch('http://127.0.0.1:4175')).ok } catch { /* Startup. */ }
    if (ready) break
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  if (!ready) throw new Error('Délai de démarrage dépassé.')
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto(`http://127.0.0.1:4175${views[view][0]}`, { waitUntil: 'domcontentloaded' })
  await page.locator('.scene[data-ready="true"]').waitFor({ state: 'attached', timeout: 30000 })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${scratch}/${view}-desktop.png` })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('.scene[data-ready="true"]').waitFor({ state: 'attached', timeout: 30000 })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${scratch}/${view}-mobile.png` })
  if (views[view][1]) {
  const ours = await readFile(`${scratch}/${view}-desktop.png`)
  const reference = await readFile(`reference/site/${views[view][1]}`)
  await page.setViewportSize({ width: 1440, height: 490 })
  await page.goto('about:blank')
  await page.setContent(`<body style="margin:0;font:16px system-ui;background:#eee"><div style="display:flex"><section style="width:50%"><p>Portfolio Elodie — ${view}</p><img style="width:100%" src="data:image/png;base64,${ours.toString('base64')}"></section><section style="width:50%"><p>Référence — cible visuelle</p><img style="width:100%" src="data:image/png;base64,${reference.toString('base64')}"></section></div></body>`)
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())))
  await page.screenshot({ path: `${scratch}/${view}-comparison.png` })
  }
  console.log(`Captures : ${scratch}`)
} finally {
  await browser?.close()
  server.kill()
}
