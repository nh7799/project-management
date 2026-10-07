import { describe, expect, it } from 'vitest'
import { DATES, WEIGHTS } from './handbook'

describe('handbook v0.9 data', () => {
  it('assessment weights total 100', () => {
    expect(WEIGHTS.reduce((a, w) => a + w[1], 0)).toBe(100)
  })
  it('has the 10 logbook closing dates and key deadlines', () => {
    expect(DATES.filter(d => d.t.startsWith('Logbook') && d.t.includes('closes')).length).toBe(10)
    const has = (iso: string, frag: string) => DATES.some(d => d.d === iso && d.t.includes(frag))
    expect(has('2026-10-15', 'Project Selection')).toBe(true)
    expect(has('2026-11-16', 'Project Outline')).toBe(true)
    expect(has('2027-04-09', 'Project Report')).toBe(true)
  })
  it('dates are valid and sorted', () => {
    const ds = DATES.map(d => d.d)
    expect(ds.every(d => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true)
    expect([...ds].sort()).toEqual(ds)
  })
})
