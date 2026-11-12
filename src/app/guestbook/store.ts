export const STORAGE_KEY = 'ep-guestbook'
export class GuestbookError extends Error {}
export function validateLine(raw: string) {
  const line = raw.trim()
  const length = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(line)].length
  if (!length) throw new GuestbookError('empty')
  if (length > 60) throw new GuestbookError('too-long')
  if (/\b(fuck|shit|merde|connard|salope)\b/i.test(line.normalize('NFD').replace(/\p{M}/gu, ''))) throw new GuestbookError('profanity')
  return line
}
export function readGuestbook(storage: Pick<Storage, 'getItem'>): { lines: string[] } {
  try {
    const data = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}')
    const lines: string[] = Array.isArray(data.lines) ? data.lines.filter((v: unknown) => typeof v === 'string' && v.length <= 300) : []
    // Remove the old test greeting requested by Elodie, without blocking a
    // visitor from deliberately sending the same word in the new version.
    return { lines: data.version === 2 ? lines : lines.filter(line => !/^(hello|hellp)[!. ]*$/i.test(line.trim())) }
  } catch { return { lines: [] } }
}
export function addGuestbookLine(storage: Pick<Storage, 'getItem' | 'setItem'>, raw: string): string {
  const line = validateLine(raw)
  const current = readGuestbook(storage)
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, lines: [...current.lines, line] }))
  return line
}

