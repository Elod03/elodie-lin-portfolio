import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { render, routes } from '../.build-server/entry-server.js'
const origin = (process.env.SITE_ORIGIN ?? 'https://elodie-lin.example').replace(/\/$/, '')
const template = (await readFile('dist/index.html', 'utf8')).replace(/<title>[\s\S]*?<\/title>/, '').replace(/<meta name="description"[^>]*>/, '')
for (const path of [...routes, '/404']) {
  const result = render(path, origin)
  const file = path === '/404' ? resolve('dist/404.html') : resolve('dist', `.${path}`, 'index.html')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, template.replace('<html lang="fr">', `<html lang="${result.lang}">`).replace('<!--app-head-->', () => result.head).replace('<!--app-html-->', () => result.html))
}
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(path => `<url><loc>${escape(new URL(path, origin).href)}</loc></url>`).join('')}</urlset>`)
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`)
console.log(`Pré-rendu : ${routes.length} routes + 404. Origine : ${origin}`)
