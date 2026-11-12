/**
 * Position du curseur du sommaire, de 0 à 1 : il glisse d'une entrée à la suivante avec le défilement.
 * `tops` = haut de chaque section (px, par rapport à la fenêtre), `probe` = ligne de lecture.
 */
export function railFraction({ tops, probe, scrollable, atBottom }: { tops: readonly number[]; probe: number; scrollable: boolean; atBottom: boolean }): number {
  if (tops.length < 2) return 0
  // Tout en bas, le curseur se pose sur la dernière entrée même si cette section ne croise jamais la ligne de lecture.
  // Une page trop courte pour défiler n'est jamais « en bas » : le curseur reste sur la première entrée.
  if (scrollable && atBottom) return 1
  let i = 0
  while (i < tops.length - 2 && tops[i + 1] < probe) i++
  const span = Math.max(1, tops[i + 1] - tops[i])
  const part = Math.min(1, Math.max(0, (probe - tops[i]) / span))
  return Math.min(1, (i + part) / (tops.length - 1))
}
