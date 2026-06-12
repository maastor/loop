import { describe, it, expect } from 'vitest'
import {
  parseNL,
  scheduleToNL,
  describeSchedule,
  computeNextRun,
  scheduleTimesForDay,
  fmtClock
} from '@shared/schedule'
import type { Schedule } from '@shared/types'

describe('parseNL', () => {
  it('parses weekday phrases', () => {
    expect(parseNL('every weekday at 9am')).toEqual({
      freq: 'weekdays',
      time: '09:00',
      days: [],
      everyHours: 0
    })
  })

  it('parses daily with pm time', () => {
    expect(parseNL('every day at 7pm')).toEqual({
      freq: 'daily',
      time: '19:00',
      days: [],
      everyHours: 0
    })
  })

  it('parses hourly intervals and clamps to 12', () => {
    expect(parseNL('every 6 hours')).toMatchObject({ freq: 'hourly', everyHours: 6 })
    expect(parseNL('every 99 hours')).toMatchObject({ freq: 'hourly', everyHours: 12 })
  })

  it('parses single weekday names into weekly', () => {
    const s = parseNL('every monday at 9am')
    expect(s).toMatchObject({ freq: 'weekly', days: [1], time: '09:00' })
  })

  it('returns null for gibberish', () => {
    expect(parseNL('banana')).toBeNull()
  })
})

describe('scheduleToNL round-trips', () => {
  const cases: Schedule[] = [
    { freq: 'daily', time: '09:00', days: [], everyHours: 0 },
    { freq: 'weekdays', time: '09:00', days: [], everyHours: 0 },
    { freq: 'hourly', time: '00:00', days: [], everyHours: 6 }
  ]
  for (const s of cases) {
    it(`re-parses "${scheduleToNL(s)}"`, () => {
      const back = parseNL(scheduleToNL(s))
      expect(back).toMatchObject({ freq: s.freq })
    })
  }
})

describe('fmtClock', () => {
  it('formats noon and midnight', () => {
    expect(fmtClock('12:00')).toBe('12 PM')
    expect(fmtClock('00:00')).toBe('12 AM')
    expect(fmtClock('13:30')).toBe('1:30 PM')
  })
})

describe('describeSchedule', () => {
  it('describes weekly with day names', () => {
    expect(describeSchedule({ freq: 'weekly', time: '16:00', days: [5], everyHours: 0 })).toBe(
      'Fri at 4 PM'
    )
  })
})

describe('computeNextRun', () => {
  it('finds the next daily occurrence after now', () => {
    const now = new Date(2026, 0, 1, 8, 0, 0) // Jan 1 2026, 08:00
    const next = computeNextRun({ freq: 'daily', time: '09:00', days: [], everyHours: 0 }, now)
    expect(next).not.toBeNull()
    expect(next!.getHours()).toBe(9)
    expect(next!.getDate()).toBe(1)
  })

  it('rolls to tomorrow when today is past', () => {
    const now = new Date(2026, 0, 1, 10, 0, 0)
    const next = computeNextRun({ freq: 'daily', time: '09:00', days: [], everyHours: 0 }, now)
    expect(next!.getDate()).toBe(2)
  })
})

describe('scheduleTimesForDay', () => {
  it('returns weekday times only Mon-Fri', () => {
    const sched: Schedule = { freq: 'weekdays', time: '09:00', days: [], everyHours: 0 }
    const sat = new Date(2026, 0, 3) // Saturday
    const mon = new Date(2026, 0, 5) // Monday
    expect(scheduleTimesForDay(sched, sat)).toEqual([])
    expect(scheduleTimesForDay(sched, mon)).toEqual(['09:00'])
  })
})
