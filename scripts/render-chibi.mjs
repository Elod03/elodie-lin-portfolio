// Rend le chibi d'Elodie (public/models/elodie-chibi.glb) en PNG transparent, puis en WebP (ffmpeg).
// Prérequis : `npm run dev` sur http://127.0.0.1:5173 et `ffmpeg` (avec libwebp) dans le PATH — sharp n'est pas une dépendance du projet. Usage : node scripts/render-chibi.mjs
import { chromium } from '@playwright/test'
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const out = 'public/media/about'
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 576, height: 892 } })
page.on('pageerror', e => { console.error(e); process.exitCode = 1 })
await page.goto('http://127.0.0.1:5173/scripts/chibi-render.html')
await page.waitForFunction(() => window.__done === true, null, { timeout: 60000 })
writeFileSync(`${out}/elodie-chibi.png`, await page.locator('canvas').screenshot({ omitBackground: true }))
await browser.close()
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${out}/elodie-chibi.png`, '-c:v', 'libwebp', '-quality', '80', `${out}/elodie-chibi.webp`])
unlinkSync(`${out}/elodie-chibi.png`)
console.log('ok', `${out}/elodie-chibi.webp`)
