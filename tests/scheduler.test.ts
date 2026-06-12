import { describe, it, expect } from 'vitest'
import { latestOccurrenceAtOrBefore } from '@core/scheduler'
import type { Routine } from '@shared/types'

function routine(schedule: Routine['schedule']): Routine {
  return {
    id: 'rt-test',
    name: 'Test',
    prompt: 'do thing',
    dir: '~/',
    model: 'sonnet',
    enabled: true,
    schedule
  }
}

describe('latestOccurrenceAtOrBefore', () => {
  it("returns today's daily occurrence once the time has passed", () => {
    const now = new Date(2026, 0, 5, 10, 0, 0) // Mon Jan 5, 10:00
    const occ = latestOccurrenceAtOrBefore(
      routine({ freq: 'daily', time: '09:00', days: [], everyHours: 0 }),
      now
    )
    expect(occ).not.toBeNull()
    expect(occ!.getDate()).toBe(5)
    expect(occ!.getHours()).toBe(9)
  })

  it("returns yesterday when today's time has not arrived yet", () => {
    const now = new Date(2026, 0, 5, 8, 0, 0)
    const occ = latestOccurrenceAtOrBefore(
      routine({ freq: 'daily', time: '09:00', days: [], everyHours: 0 }),
      now
    )
    expect(occ!.getDate()).toBe(4)
  })

  it('skips weekends for weekday schedules', () => {
    const sun = new Date(2026, 0, 4, 12, 0, 0) // Sunday
    const occ = latestOccurrenceAtOrBefore(
      routine({ freq: 'weekdays', time: '09:00', days: [], everyHours: 0 }),
      sun
    )
    // most recent weekday occurrence is Friday Jan 2 at 09:00
    expect(occ!.getDate()).toBe(2)
  })

  it('finds the most recent hourly slot', () => {
    const now = new Date(2026, 0, 5, 13, 30, 0)
    const occ = latestOccurrenceAtOrBefore(
      routine({ freq: 'hourly', time: '00:00', days: [], everyHours: 6 }),
      now
    )
    // slots at 00,06,12,18 → latest before 13:30 is 12:00
    expect(occ!.getHours()).toBe(12)
  })
})
