import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { render, routes } from './entry-server'

const origin = 'https://elodie-lin.example'
const head = (path: string) => {
  const result = render(path, origin)
  return { lang: result.lang, doc: new JSDOM(`<!doctype html><html><head>${result.head}</head><body></body></html>`).window.document }
}
const meta = (doc: Document, key: string) => doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`)?.getAttribute('content')

describe('link previews (Open Graph + Twitter)', () => {
  it.each([...routes, '/404'])('%s has a complete preview pointing to an image in public/og', path => {
    const { doc, lang } = head(path)
    const image = meta(doc, 'og:image')!
    expect(image, path).toMatch(new RegExp(`^${origin}/og/[a-z0-9-]+\\.jpg$`))
    expect(existsSync(`public${new URL(image).pathname}`), image).toBe(true)
    expect(meta(doc, 'og:image:width')).toBe('1200')
    expect(meta(doc, 'og:image:height')).toBe('630')
    expect(meta(doc, 'og:image:alt')?.length).toBeGreaterThan(3)
    expect(meta(doc, 'twitter:card')).toBe('summary_large_image')
    expect(meta(doc, 'twitter:image')).toBe(image)
    expect(meta(doc, 'og:type')).toBe('website')
    expect(meta(doc, 'og:site_name')).toBe('Elodie Lin')
    expect(meta(doc, 'og:title')).toBe(doc.title)
    expect(meta(doc, 'og:description')).toBe(meta(doc, 'description'))
    expect(meta(doc, 'og:url')).toBe(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'))
    expect(meta(doc, 'og:locale')).toBe({ fr: 'fr_FR', en: 'en_US', zh: 'zh_CN' }[lang])
  })
  it('picks the image of the view, the same in every language', () => {
    const image = (path: string) => meta(head(path).doc, 'og:image')!.replace(`${origin}/og/`, '')
    expect(['/', '/en/', '/zh/', '/404'].map(image)).toEqual(['home.jpg', 'home.jpg', 'home.jpg', 'home.jpg'])
    expect(['/projets', '/en/projects', '/zh/projects'].map(image)).toEqual(['projets.jpg', 'projets.jpg', 'projets.jpg'])
    expect(['/a-propos', '/en/about', '/zh/about'].map(image)).toEqual(['a-propos.jpg', 'a-propos.jpg', 'a-propos.jpg'])
    expect(['/playground', '/en/playground'].map(image)).toEqual(['playground.jpg', 'playground.jpg'])
    expect(['/projets/yoru', '/en/projects/kanpai', '/zh/projects/streamflix', '/projets/carnival'].map(image)).toEqual(['yoru.jpg', 'kanpai.jpg', 'streamflix.jpg', 'carnival.jpg'])
  })
  it('escapes the values', () => {
    const { doc } = head('/en/projects/streamflix')
    expect(meta(doc, 'og:title')).toContain('StreamFlix')
    expect(render('/en/projects/streamflix', origin).head).not.toMatch(/content="[^"]*<[^"]*"/)
  })
})
