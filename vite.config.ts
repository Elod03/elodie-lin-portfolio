import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { transformWithOxc } from 'vite'
import { readFileSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Dev : le CV est généré à la demande (le build l'écrit dans dist/cv avec scripts/build-cv.mjs). */
const cvSources = () => Math.max(statSync('scripts/cv-pdf.mjs').mtimeMs, ...readdirSync('src/content').map(file => statSync(`src/content/${file}`).mtimeMs))
const cvCache = new Map<string, { stamp: number; pdf: Uint8Array }>()
const devCv = {
  name: 'dev-cv-pdf',
  configureServer(server: import('vite').ViteDevServer) {
    server.middlewares.use(async (req, res, next) => {
      const match = /^\/cv\/elodie-lin-cv-(fr|en)\.pdf$/.exec(new URL(req.url ?? '/', 'http://localhost').pathname)
      if (!match) return next()
      try {
        // Cache invalidated when src/content or scripts/cv-pdf.mjs changes.
        const stamp = cvSources(), hit = cvCache.get(match[1])
        let pdf = hit && hit.stamp === stamp ? hit.pdf : undefined
        if (!pdf) {
          // Node caches ES modules by URL: the query makes it load the current cv-pdf.mjs instead of the copy from the first request.
          const cvModule = `${pathToFileURL(resolve('scripts/cv-pdf.mjs')).href}?t=${stamp}`
          const [{ renderCv }, entry] = await Promise.all([import(/* @vite-ignore */ cvModule) as Promise<typeof import('./scripts/cv-pdf.mjs')>, server.ssrLoadModule('/src/entry-server.tsx')])
          pdf = await renderCv(match[1], entry.getSite, entry.shared) as Uint8Array
          cvCache.set(match[1], { stamp, pdf })
        }
        res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Length', pdf.length); res.end(pdf)
      } catch (error) { next(error) }
    })
  },
}
/** index.html : le choix du thème (nuit après le coucher du soleil à Paris) est fait avant le premier affichage, avec le même code que les tests (src/world/solar.ts). */
const inlineSolar = {
  name: 'inline-solar',
  async transformIndexHtml(html: string) {
    // TypeScript -> JavaScript, then the exports become a plain global `parisSolar` (index.html has no module at that point).
    const { code } = await transformWithOxc(readFileSync('src/world/solar.ts', 'utf8'), 'solar.ts', { lang: 'ts' })
    const body = code.replace(/^export (function|const) /gm, '$1 ')
    const script = `var parisSolar = (function () {
${body}
return { isParisNight: isParisNight, resolveInitialTheme: resolveInitialTheme, parisSunTimes: parisSunTimes };
})();`
    return html.replace('/*SOLAR*/', () => script)
  },
}
export default defineConfig({
  plugins: [react(), devCv, inlineSolar, {
    name: 'prerendered-preview-routes',
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (/^\/(en|zh)\/?$/.test(url.pathname) || /^\/(?:en\/|zh\/)?(?:a-propos|about|playground|projets|projects|(?:projets|projects)\/(?:streamflix|yoru|kanpai))\/?$/.test(url.pathname)) {
          req.url = `${url.pathname.replace(/\/$/, '')}/index.html${url.search}`
        }
        next()
      })
    },
  }],
  test: {
    projects: [
      { test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts'], testTimeout: 20000 } },
      { test: { name: 'cv', environment: 'node', include: ['tests/cv/**/*.test.ts'], testTimeout: 60000 } },
      { test: { name: 'dist', environment: 'node', include: ['tests/dist/**/*.test.ts'], testTimeout: 20000 } },
    ],
  },
})
