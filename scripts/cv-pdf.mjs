/**
 * Génère le CV en PDF (texte sélectionnable). Partagé par le build (dist/cv) et le serveur de dev (plugin Vite).
 * Mise en page lisible par les logiciels de recrutement (ATS) : une seule colonne, titres de section standard,
 * police standard (Helvetica), aucun tableau, cadre, filet ni en-tête/pied de page.
 */
import PDFDocument from 'pdfkit'

const ACCENT = '#115f9e', INK = '#162f3f', MUTED = '#4a5f6d'

/** Texte propre au CV (le reste vient du contenu du site). */
const copy = {
  fr: {
    title: 'Développeuse web — Alternance',
    subject: 'CV — Développeuse web',
    headings: { summary: 'Profil', experience: 'Expérience professionnelle', projects: 'Projets', education: 'Formation', skills: 'Compétences', languages: 'Langues', interests: 'Centres d’intérêt' },
    summary: [
      'Développeuse web en alternance chez Ody depuis 09/2026, étudiante à Efrei (Bachelor Ingénierie & Numérique, 2024–2027).',
      'Je développe des sites web responsives avec React, TypeScript, JavaScript, PHP, Node.js et PostgreSQL : intégration design et UX, tests fonctionnels, déploiement Cloudflare, Git/GitHub, en anglais dans une équipe internationale.',
      'Trilingue français, anglais (B1) et chinois (HSK 6) ; stage de développement web à Shanghai.',
    ],
    present: 'aujourd’hui',
    country: { Shanghai: 'Shanghai, Chine', 'Paris, FR': 'Paris, France' },
    portfolio: 'Portfolio', stack: 'Stack', colon: ' : ',
    skillGroups: { front: 'Front-end', back: 'Back-end et bases de données', tools: 'Outils' },
    methods: ['Méthodes', 'Responsive design, UX, tests fonctionnels, déploiement Cloudflare, pull requests GitHub'],
    strengths: 'Savoir-être',
    native: 'langue maternelle',
  },
  en: {
    title: 'Web Developer — Work-study',
    subject: 'Résumé — Web developer',
    headings: { summary: 'Summary', experience: 'Experience', projects: 'Projects', education: 'Education', skills: 'Skills', languages: 'Languages', interests: 'Interests' },
    summary: [
      'Work-study web developer at Ody since 09/2026, student at Efrei (Bachelor Ingénierie & Numérique, i.e. Engineering & Digital Technology, 2024–2027).',
      'I build responsive websites with React, TypeScript, JavaScript, PHP, Node.js and PostgreSQL: design and UX integration, functional testing, Cloudflare deployment, Git/GitHub, in English in an international team.',
      'Trilingual in French, English (B1) and Chinese (HSK 6); web development internship in Shanghai.',
    ],
    present: 'Present',
    country: { Shanghai: 'Shanghai, China', 'Paris, FR': 'Paris, France' },
    portfolio: 'Portfolio', stack: 'Stack', colon: ': ',
    skillGroups: { front: 'Front-end', back: 'Back-end & databases', tools: 'Tools' },
    methods: ['Methods', 'Responsive design, UX, functional testing, Cloudflare deployment, GitHub pull requests'],
    strengths: 'Soft skills',
    native: 'native',
    languageNames: { Chinese: 'Chinese (Mandarin)' },
  },
}

/** Code points Helvetica (WinAnsi) can draw: Latin-1 plus the Windows-1252 extras. */
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')
const drawable = ch => { const c = ch.codePointAt(0); return (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WIN_ANSI_EXTRA.has(ch) }
const REPLACE = { '‐': '-', '‑': '-', '−': '-', ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ' }
/** Every string goes through here: anything Helvetica can't draw is mapped (13ᵉ → 13e, narrow spaces → space) or dropped. */
export function sanitize(text) {
  let out = ''
  for (const ch of String(text)) {
    if (REPLACE[ch]) out += REPLACE[ch]
    else if (drawable(ch)) out += ch
    else out += [...ch.normalize('NFKC')].filter(drawable).join('')
  }
  return out
}

/** '06–08/2025' → '06/2025 – 08/2025', 'depuis 09/2026' → '09/2026 – aujourd'hui', '2024–2027' → '2024 – 2027'. */
export function formatPeriod(period, present) {
  const p = period.trim()
  const since = /^(?:depuis|since)\s+(.+)$/i.exec(p)
  if (since) return `${since[1]} – ${present}`
  const months = /^(\d{2})\s*[–-]\s*(\d{2})\/(\d{4})$/.exec(p)
  if (months) return `${months[1]}/${months[3]} – ${months[2]}/${months[3]}`
  return p.replace(/\s*[–-]\s*/, ' – ')
}

/** Public portfolio address, or null while SITE_ORIGIN is unset or still the example placeholder. */
export function portfolioUrl(origin = process.env.SITE_ORIGIN) {
  if (!origin) return null
  try {
    const url = new URL(origin)
    if (/(^|\.)example(\.|$)/i.test(url.hostname) || !/^https?:$/.test(url.protocol)) return null
    return url.href.replace(/\/$/, '')
  } catch { return null }
}

export async function renderCv(lang, getSite, shared) {
  const site = getSite(lang), about = site.about, t = copy[lang === 'fr' ? 'fr' : 'en']
  const skillNames = shared.skills.flatMap(group => group.items.map(item => item.name))
  const doc = new PDFDocument({
    size: 'A4', margins: { top: 30, bottom: 24, left: 46, right: 46 },
    lang: lang === 'fr' ? 'fr-FR' : 'en-GB', displayTitle: true,
    info: { Title: sanitize(`${shared.name} — ${t.title}`), Author: shared.name, Subject: sanitize(t.subject), Keywords: sanitize([...skillNames, 'Responsive design', 'UX', 'Cloudflare'].join(', ')), Creator: shared.name },
  })
  const chunks = []
  doc.on('data', chunk => chunks.push(chunk))
  const ended = new Promise(resolve => doc.on('end', resolve))
  const left = doc.page.margins.left, width = doc.page.width - left - doc.page.margins.right
  const BODY = 9.6, GAP = 1.1

  const body = () => doc.font('Helvetica').fontSize(BODY).fillColor(INK)
  /** Writes runs on one line: [text, { bold, color, link }]. */
  const line = (input, options = {}) => {
    // A fragment with no word in it (a lone "·", an empty place) is glued to the front of the next one.
    const runs = []
    let carry = ''
    for (const [text, style] of input) {
      const clean = carry + sanitize(text)
      if (/[\p{L}\p{N}]/u.test(clean)) { runs.push([clean, style]); carry = '' } else carry = clean
    }
    if (carry && runs.length) runs[runs.length - 1][0] += carry
    runs.forEach(([text, style = {}], i) => {
      doc.font(style.bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(style.color ?? INK)
      const continued = i < runs.length - 1, link = style.link ?? null
      // Only the first fragment gets a position: passing x = undefined to a continued fragment makes PDFKit start a new line.
      if (i === 0) doc.text(text, left + (options.indent ?? 0), undefined, { width: width - (options.indent ?? 0), lineGap: GAP, continued, link })
      else doc.text(text, { continued, link })
    })
  }
  const heading = text => {
    doc.moveDown(.45).font('Helvetica-Bold').fontSize(11.5).fillColor(ACCENT).text(sanitize(text), left, undefined, { width, characterSpacing: .3 })
    doc.moveDown(.15); body()
  }
  const bullet = text => {
    const y = doc.y
    doc.font('Helvetica').fontSize(BODY).fillColor(ACCENT).text('•', left + 4, y, { lineBreak: false })
    doc.fillColor(INK).text(sanitize(text), left + 15, y, { width: width - 15, lineGap: GAP })
  }
  const labelled = (label, value) => line([[`${label}${t.colon}`, { bold: true }], [value]])

  // Identity and contact (in the page body, never in a header).
  doc.font('Helvetica-Bold').fontSize(24).fillColor(INK).text(sanitize(shared.name), left, undefined, { width })
  doc.moveDown(.1).font('Helvetica').fontSize(13).fillColor(ACCENT).text(sanitize(t.title), { width })
  doc.moveDown(.35).fontSize(BODY)
  const location = t.country[about.location] ?? about.location
  const portfolio = portfolioUrl()
  const sep = ['  ·  ', { color: MUTED }]
  line([[location], sep, [shared.email, { link: `mailto:${shared.email}` }], ...(portfolio ? [sep, [portfolio, { link: portfolio }]] : [])])
  line([[shared.linkedin, { link: shared.linkedin }], sep, [shared.github, { link: shared.github }]])

  heading(t.headings.summary)
  doc.text(sanitize(t.summary.join(' ')), left, undefined, { width, lineGap: GAP + .3 })

  heading(t.headings.experience)
  // The three web development roles keep all their points; older, non-web roles keep their first one so the CV stays on one page.
  about.experienceRows.forEach((row, i) => {
    if (i) doc.moveDown(.2)
    // The comma stays in the bold fragment: PDFKit leaves a gap before a fragment that starts with punctuation after some bold words.
    const place = row.place ? ` ${t.country[row.place] ?? row.place}` : ''
    line([[`${row.role} — ${row.name}${place ? ',' : ''}`, { bold: true }], [place], ['  ·  ', { color: MUTED }], [formatPeriod(row.period, t.present), { color: MUTED }]])
    doc.moveDown(.1)
    for (const point of (row.points ?? []).slice(0, i < 3 ? 5 : 1)) bullet(point)
  })

  heading(t.headings.projects)
  shared.projects.forEach((project, i) => {
    const p = site.projects[project.slug]
    if (i) doc.moveDown(.2)
    // What it is (type, context) and what was built (solution), not the marketing tagline.
    line([[project.name, { bold: true }], [`  ·  ${p.type}${/\d{4}/.test(p.duration) ? `, ${p.duration.replace(/^\p{Lu}(?=\p{Ll})/u, c => c.toLowerCase())}` : ''}`, { color: MUTED }], [` — ${p.solution}`]])
    line([[`${t.stack}${t.colon}`, { color: MUTED }], [project.tools.join(', '), { color: MUTED }], ...(project.url ? [sep, [project.url, { color: ACCENT, link: project.url }]] : [])])
  })

  heading(t.headings.education)
  for (const row of about.educationRows) line([[row.role, { bold: true }], [` — ${row.name}`], ['  ·  ', { color: MUTED }], [formatPeriod(row.period, t.present), { color: MUTED }]])

  heading(t.headings.skills)
  for (const group of shared.skills) labelled(t.skillGroups[group.key], group.items.map(item => item.name).join(', '))
  labelled(t.methods[0], t.methods[1])
  labelled(t.strengths, about.strengths.join(', '))

  heading(t.headings.languages)
  const names = t.languageNames ?? {}
  doc.text(sanitize(about.languageRows.map(row => `${names[row.name] ?? row.name} ${row.level ?? `(${t.native})`}`).join('  ·  ')), left, undefined, { width, lineGap: GAP })
  labelled(t.headings.interests, about.interests.join(', '))

  doc.end(); await ended
  return Buffer.concat(chunks)
}
