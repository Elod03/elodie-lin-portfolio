/** Données pures du Playground : jeu du jour et meilleurs scores (localStorage, toujours protégé). */
export const SCORING = ['koi', 'encre', 'hanzi', 'chambre-noire', 'sable', 'bulles'] as const
export type ScoringId = typeof SCORING[number]
type Reader = Pick<Storage, 'getItem'> | undefined
type Writer = Pick<Storage, 'getItem' | 'setItem'> | undefined
const key = (id: string) => `playground-best-${id}`

/** One of the six games, chosen by the local calendar day. */
export function gameOfTheDay(date: Date): ScoringId {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5)
  return SCORING[day % SCORING.length]
}
export function readBest(storage: Reader, id: string): number | undefined {
  try {
    const value = Number(storage?.getItem(key(id)))
    return Number.isFinite(value) && value > 0 ? value : undefined
  } catch { return undefined }
}
/** Saves the score if it beats the stored one; returns the new best, or undefined when nothing changed. */
export function saveBest(storage: Writer, id: string, score: number): number | undefined {
  if (!(score > 0)) return undefined
  try {
    if (!storage || score <= (readBest(storage, id) ?? 0)) return undefined
    storage.setItem(key(id), String(Math.floor(score)))
    return Math.floor(score)
  } catch { return undefined }
}
export function browserStorage(): Storage | undefined { try { return typeof localStorage === 'undefined' ? undefined : localStorage } catch { return undefined } }
