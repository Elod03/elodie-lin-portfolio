import { describe, expect, it } from 'vitest'
import { addGuestbookLine, readGuestbook, STORAGE_KEY, validateLine } from './store'

function memoryStorage(initial = '{}') {
  let value = initial
  return {
    getItem: (_key: string) => value,
    setItem: (key: string, next: string) => { expect(key).toBe(STORAGE_KEY); value = next },
  }
}
describe('guestbook', () => {
  it('counts emoji as graphemes and trims messages', () => {
    expect(validateLine(' 👩‍💻 ')).toBe('👩‍💻')
    expect(validateLine('你'.repeat(60))).toHaveLength(60)
    expect(validateLine('👩‍💻'.repeat(60))).toBe('👩‍💻'.repeat(60))
  })
  it('rejects empty and excessive messages', () => {
    expect(() => validateLine(' ')).toThrow('empty')
    expect(() => validateLine('a'.repeat(61))).toThrow('too-long')
    expect(() => validateLine('👩‍💻'.repeat(61))).toThrow('too-long')
  })
  it('keeps the existing word validation and treats markup as ordinary text', () => {
    expect(() => validateLine('merde')).toThrow('profanity')
    expect(validateLine('<b>Bonjour</b>')).toBe('<b>Bonjour</b>')
  })
  it('accepts consecutive messages immediately and ignores old timestamps', () => {
    const storage = memoryStorage(JSON.stringify({ lines: ['Déjà ici'], lastSentAt: Date.now() + 60000 }))
    expect(addGuestbookLine(storage, 'Premier message')).toBe('Premier message')
    expect(addGuestbookLine(storage, 'Deuxième message')).toBe('Deuxième message')
    expect(addGuestbookLine(storage, 'Troisième message')).toBe('Troisième message')
    expect(readGuestbook(storage).lines).toEqual(['Déjà ici', 'Premier message', 'Deuxième message', 'Troisième message'])
    expect(JSON.parse(storage.getItem(STORAGE_KEY))).not.toHaveProperty('lastSentAt')
  })
  it('accepts and retains more than 30 consecutive messages', () => {
    const storage = memoryStorage()
    for (let i = 0; i < 40; i++) addGuestbookLine(storage, `Message ${i}`)
    expect(readGuestbook(storage).lines).toHaveLength(40)
    expect(readGuestbook(storage).lines[0]).toBe('Message 0')
    expect(readGuestbook(storage).lines[39]).toBe('Message 39')
  })
  it('removes only the legacy test greeting and accepts newly submitted greetings', () => {
    const storage = memoryStorage(JSON.stringify({ lines: ['hello', 'hellp', 'Bonjour Elodie'] }))
    expect(readGuestbook(storage).lines).toEqual(['Bonjour Elodie'])
    addGuestbookLine(storage, 'Hello')
    expect(readGuestbook(storage).lines).toEqual(['Bonjour Elodie', 'Hello'])
  })
  it('recovers from corrupt storage', () => {
    expect(readGuestbook(memoryStorage('{broken'))).toEqual({ lines: [] })
    expect(readGuestbook(memoryStorage('null'))).toEqual({ lines: [] })
  })
  it('does not save a rejected message', () => {
    const storage = memoryStorage(JSON.stringify({ lines: ['Bonjour'] }))
    expect(() => addGuestbookLine(storage, ' ')).toThrow('empty')
    expect(readGuestbook(storage).lines).toEqual(['Bonjour'])
  })
})
