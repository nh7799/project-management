import { describe, expect, it } from 'vitest'
import { addDays, daysUntil, fmt, todayISO } from './dates'

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28')
  })
  it('daysUntil is 0 for today and signed otherwise', () => {
    expect(daysUntil(todayISO())).toBe(0)
    expect(daysUntil(addDays(todayISO(), 5))).toBe(5)
    expect(daysUntil(addDays(todayISO(), -3))).toBe(-3)
  })
  it('formats deadlines without timezone drift', () => {
    expect(fmt('2026-10-15')).toBe('15 Oct 2026')
    expect(fmt('2027-04-09')).toBe('9 Apr 2027')
  })
})
