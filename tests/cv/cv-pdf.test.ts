import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { afterAll, describe, expect, it } from 'vitest'

const servers: ChildProcess[] = []
async function start(args: string[], port: number) {
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...args, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' })
  servers.push(child)
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return } catch { /* not ready */ } await new Promise(r => setTimeout(r, 500)) }
  throw new Error('server did not start')
}
afterAll(() => { for (const s of servers) s.kill() })
for (const [name, args, port] of [['dev server', [], 5199], ['vite preview', ['preview'], 5198]] as const) {
  describe(name, () => {
    it.skipIf(name === 'vite preview' && !existsSync('dist/cv/elodie-lin-cv-fr.pdf'))('serves the CV as application/pdf', async () => {
      await start([...args], port)
      for (const lang of ['fr', 'en']) {
        const res = await fetch(`http://127.0.0.1:${port}/cv/elodie-lin-cv-${lang}.pdf`)
        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toContain('application/pdf')
        expect(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-')
      }
    }, 60000)
  })
}
