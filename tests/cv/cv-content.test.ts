import { inflateSync } from 'node:zlib'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { formatPeriod, portfolioUrl, renderCv, sanitize } from '../../scripts/cv-pdf.mjs'
import { getSite, shared } from '../../src/content'

/** Windows-1252 0x80–0x9F (Node's TextDecoder treats this label as Latin-1). */
const CP1252 = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'
const decodeWinAnsi = (bytes: Buffer) => [...bytes].map(byte => byte >= 0x80 && byte <= 0x9f ? CP1252[byte - 0x80] : String.fromCharCode(byte)).join('')
/** Text of a PDFKit file, line by line: content streams are inflated and each `Tm … TJ` run is placed on its line. */
function pdfText(pdf: Buffer) {
  const raw = pdf.toString('latin1'), lines: string[] = []
  for (const match of raw.matchAll(/stream\r?\n/g)) {
    const start = match.index + match[0].length
    let content: string
    try { content = inflateSync(pdf.subarray(start, raw.indexOf('endstream', start))).toString('latin1') } catch { continue }
    let y = ''
    for (const run of content.matchAll(/1 0 0 1 [\d.-]+ ([\d.-]+) Tm[\s\S]*?\[(.*?)\] TJ/g)) {
      const text = [...run[2].matchAll(/<([0-9a-f]*)>/g)].map(hex => decodeWinAnsi(Buffer.from(hex[1], 'hex'))).join('')
      if (run[1] === y) lines[lines.length - 1] += text
      else lines.push(text)
      y = run[1]
    }
  }
  return lines.join('\n')
}
const pageCount = (pdf: Buffer) => pdf.toString('latin1').match(/\/Type \/Page\b(?!s)/g)?.length ?? 0
const flat = (text: string) => text.replace(/\s+/g, ' ')
const skillNames = shared.skills.flatMap(group => group.items.map(item => item.name))
const headings = { fr: ['Profil', 'Expérience professionnelle', 'Projets', 'Formation', 'Compétences', 'Langues'], en: ['Summary', 'Experience', 'Projects', 'Education', 'Skills', 'Languages'] }

const origin = process.env.SITE_ORIGIN
afterEach(() => { if (origin === undefined) delete process.env.SITE_ORIGIN; else process.env.SITE_ORIGIN = origin })

describe('CV helpers', () => {
  it('keeps only characters Helvetica can draw', () => {
    expect(sanitize('mairie du 13ᵉ')).toBe('mairie du 13e')
    expect(sanitize('a b c')).toBe('a b c')
    expect(sanitize('Chinois 中文 — l’été')).toBe('Chinois  — l’été')
  })
  it('writes every period as MM/YYYY – MM/YYYY', () => {
    expect(formatPeriod('depuis 09/2026', 'aujourd’hui')).toBe('09/2026 – aujourd’hui')
    expect(formatPeriod('since 09/2026', 'Present')).toBe('09/2026 – Present')
    expect(formatPeriod('06–08/2025', 'Present')).toBe('06/2025 – 08/2025')
    expect(formatPeriod('2024–2027', 'Present')).toBe('2024 – 2027')
    expect(formatPeriod('04/2019', 'Present')).toBe('04/2019')
  })
  it('only links a real portfolio address', () => {
    expect(portfolioUrl(undefined)).toBeNull()
    expect(portfolioUrl('https://elodie-lin.example')).toBeNull()
    expect(portfolioUrl('https://elodie-lin.dev/')).toBe('https://elodie-lin.dev')
  })
})

for (const lang of ['fr', 'en'] as const) {
  describe(`CV ${lang}`, () => {
    const site = getSite(lang)
    let pdf: Buffer, text = '', words = ''
    beforeAll(async () => {
      delete process.env.SITE_ORIGIN
      pdf = await renderCv(lang, getSite, shared)
      text = pdfText(pdf); words = flat(text)
    })

    it('fits on one or two A4 pages', () => {
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
      expect(pageCount(pdf)).toBeGreaterThanOrEqual(1)
      expect(pageCount(pdf)).toBeLessThanOrEqual(2)
    })
    it('uses the standard section headings, each on its own line', () => {
      const lines = text.split('\n').map(line => line.trim())
      for (const heading of headings[lang]) expect(lines).toContain(heading)
    })
    it('lists every experience as "Role — Company" with its dates and points', () => {
      for (const row of site.about.experienceRows) {
        expect(words).toContain(sanitize(`${row.role} — ${row.name}`))
        expect(words).toContain(row.points![0])
      }
      expect(words).toContain(lang === 'fr' ? '09/2026 – aujourd’hui' : '09/2026 – Present')
      expect(words).toContain('06/2025 – 08/2025')
    })
    it('names the degree, the 13 skills and the languages', () => {
      expect(words).toContain('Bachelor Ingénierie & Numérique')
      expect(skillNames).toHaveLength(13)
      for (const skill of skillNames) expect(words).toContain(skill)
      expect(words).toContain(lang === 'fr' ? 'Français (langue maternelle)' : 'French (native)')
      expect(words).toContain(lang === 'fr' ? 'Chinois HSK 6' : 'Chinese (Mandarin) HSK 6')
    })
    it('describes the projects with their stack and live address', () => {
      for (const project of shared.projects) {
        expect(words).toContain(project.name)
        expect(words).toContain(flat(site.projects[project.slug].solution).split(' ').slice(0, 5).join(' '))
        expect(words).toContain(project.tools.join(', '))
        if (project.url) expect(words).toContain(project.url)
      }
    })
    it('gives full contact URLs, no phone number and no unreadable character', () => {
      for (const value of [shared.email, shared.github, shared.linkedin]) expect(words).toContain(value)
      expect(words).not.toMatch(/(?:\+33\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/)
      expect(text).not.toContain('�')
      expect(text).not.toMatch(/[^\n\x20-\x7e -ÿ€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/)
    })
    it('sets the document metadata', () => {
      const raw = pdf.toString('latin1')
      for (const key of ['/Title', '/Author', '/Subject', '/Keywords']) expect(raw).toContain(key)
      expect(raw).toContain(`(${skillNames.join(', ')}`)
    })
  })
}

describe('portfolio line', () => {
  it('appears only when SITE_ORIGIN is a real address', async () => {
    process.env.SITE_ORIGIN = 'https://elodie-lin.example'
    expect(flat(pdfText(await renderCv('fr', getSite, shared)))).not.toContain('elodie-lin.example')
    process.env.SITE_ORIGIN = 'https://elodie-lin.dev'
    const pdf = await renderCv('en', getSite, shared)
    expect(flat(pdfText(pdf))).toContain('https://elodie-lin.dev')
    expect(pageCount(pdf)).toBeLessThanOrEqual(2)
  })
})
