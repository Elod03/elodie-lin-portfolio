import { mkdir, writeFile } from 'node:fs/promises'
import { getSite, shared } from '../.build-server/entry-server.js'
import { renderCv } from './cv-pdf.mjs'
await mkdir('dist/cv', { recursive: true })
for (const lang of ['fr', 'en']) await writeFile(`dist/cv/elodie-lin-cv-${lang}.pdf`, await renderCv(lang, getSite, shared))
console.log('CV FR et EN générés avec texte sélectionnable.')
