/** Prefer word boundaries, splitting only a single overlong word (or CJK text).
 * A punctuation-only token stays with the preceding word, even at the margin. */
export function wrapMessage(text: string, maxWidth: number, measure: (text: string) => number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.trim().split(/\s+/u)) {
    const candidate = line ? `${line} ${word}` : word
    if (line && /^[!?,.;:，。！？、]+$/u.test(word)) { line = measure(candidate) <= maxWidth ? candidate : line + word; continue }
    if (measure(candidate) <= maxWidth) { line = candidate; continue }
    if (line) { lines.push(line); line = '' }
    if (measure(word) <= maxWidth) { line = word; continue }
    for (const { segment } of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word)) {
      if (line && measure(line + segment) > maxWidth && !/^[!?,.;:，。！？、]+$/u.test(segment)) { lines.push(line); line = segment }
      else line += segment
    }
  }
  if (line) lines.push(line)
  return lines
}
