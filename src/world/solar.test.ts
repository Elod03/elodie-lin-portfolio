import { describe, expect, it } from 'vitest'
import { isParisNight, parisSunTimes, resolveInitialTheme } from './solar'

// Sun in Paris (references: timeanddate.com; a few minutes of tolerance for a NOAA-simplified formula).
const utc = (iso: string) => new Date(iso)

describe('parisSunTimes', () => {
  it('gives the summer solstice sunset around 21:58 local (19:58 UTC)', () => {
    const { sunset, sunrise } = parisSunTimes(utc('2026-06-21T12:00:00Z'))
    expect(Math.abs(sunset - (19 * 60 + 58))).toBeLessThanOrEqual(6)
    expect(Math.abs(sunrise - (3 * 60 + 48))).toBeLessThanOrEqual(6)
  })
  it('gives the winter solstice sunset around 16:57 local (15:57 UTC)', () => {
    const { sunset, sunrise } = parisSunTimes(utc('2026-12-21T12:00:00Z'))
    expect(Math.abs(sunset - (15 * 60 + 57))).toBeLessThanOrEqual(6)
    expect(Math.abs(sunrise - (7 * 60 + 41))).toBeLessThanOrEqual(6)
  })
  it('stays sane at the equinox (about 12 h of day)', () => {
    const { sunset, sunrise } = parisSunTimes(utc('2026-03-20T12:00:00Z'))
    expect(sunset - sunrise).toBeGreaterThan(11.8 * 60)
    expect(sunset - sunrise).toBeLessThan(12.3 * 60)
  })
})

describe('isParisNight', () => {
  it('summer: 21:30 in Paris (CEST) is still day, 22:30 is night', () => {
    expect(isParisNight(utc('2026-06-21T19:30:00Z'))).toBe(false)
    expect(isParisNight(utc('2026-06-21T20:30:00Z'))).toBe(true)
  })
  it('winter: 16:30 in Paris (CET) is day, 17:30 is night', () => {
    expect(isParisNight(utc('2026-12-21T15:30:00Z'))).toBe(false)
    expect(isParisNight(utc('2026-12-21T16:30:00Z'))).toBe(true)
  })
  it('the same UTC hour is not the same Paris night in summer and winter (daylight saving time)', () => {
    expect(isParisNight(utc('2026-07-15T18:30:00Z'))).toBe(false) // 20:30 CEST
    expect(isParisNight(utc('2026-01-15T18:30:00Z'))).toBe(true) // 19:30 CET
  })
  it('the small hours are night, mid-morning and noon are day', () => {
    expect(isParisNight(utc('2026-06-21T01:00:00Z'))).toBe(true)
    expect(isParisNight(utc('2026-12-21T05:00:00Z'))).toBe(true)
    expect(isParisNight(utc('2026-06-21T08:00:00Z'))).toBe(false)
    expect(isParisNight(utc('2026-12-21T10:00:00Z'))).toBe(false)
  })
  it('winter morning: 06:30 CET is night, 09:00 CET is day', () => {
    expect(isParisNight(utc('2026-12-21T05:30:00Z'))).toBe(true)
    expect(isParisNight(utc('2026-12-21T08:00:00Z'))).toBe(false)
  })
})

describe('resolveInitialTheme', () => {
  it('a saved choice always wins, night or not', () => {
    expect(resolveInitialTheme({ stored: 'day', prefersDark: true, night: true })).toBe('day')
    expect(resolveInitialTheme({ stored: 'night', prefersDark: false, night: false })).toBe('night')
  })
  it('without a choice: night after the sunset in Paris', () => {
    expect(resolveInitialTheme({ stored: null, prefersDark: false, night: true })).toBe('night')
  })
  it('without a choice and in daylight: the system preference decides', () => {
    expect(resolveInitialTheme({ stored: null, prefersDark: true, night: false })).toBe('night')
    expect(resolveInitialTheme({ stored: null, prefersDark: false, night: false })).toBe('day')
  })
  it('ignores garbage in storage', () => {
    expect(resolveInitialTheme({ stored: 'purple', prefersDark: false, night: false })).toBe('day')
  })
})
