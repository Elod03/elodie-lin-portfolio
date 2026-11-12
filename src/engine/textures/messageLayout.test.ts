import { expect, it } from 'vitest'
import { wrapMessage } from './messageLayout'

it('keeps words whole instead of splitting a small message mid-word', () => {
  expect(wrapMessage('Bonjour Elodie, un petit mot sur ton portfolio !', 19, text => text.length)).toEqual(['Bonjour Elodie, un', 'petit mot sur ton', 'portfolio !'])
})
it('does not orphan punctuation or split emoji grapheme clusters', () => {
  expect(wrapMessage('Bonjour !', 7, text => text.length)).toEqual(['Bonjour!'])
  expect(wrapMessage('👩‍💻👩‍💻👩‍💻', 2, text => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].length)).toEqual(['👩‍💻👩‍💻', '👩‍💻'])
})
