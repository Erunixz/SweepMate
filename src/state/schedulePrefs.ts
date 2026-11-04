import { DEFAULT_SCHEDULES, type ShiftSchedule } from '../config/schedules'
import { isValidTime } from '../domain/time'
import type { ShiftType } from '../domain/types'

const KEY = 'sweepmate:schedules'

/** Per-shift-type schedule defaults: the user's saved ones, else the built-in config. */
export function loadSchedules(): Record<ShiftType, ShiftSchedule> {
  const result = { ...DEFAULT_SCHEDULES }
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    if (!parsed || typeof parsed !== 'object') return result
    for (const type of Object.keys(DEFAULT_SCHEDULES) as ShiftType[]) {
      const v = (parsed as Record<string, Partial<ShiftSchedule>>)[type]
      if (!v || typeof v !== 'object') continue
      const t = (x: unknown, fallback: string) => (typeof x === 'string' && (x === '' || isValidTime(x)) ? x : fallback)
      result[type] = {
        start: t(v.start, DEFAULT_SCHEDULES[type].start) || DEFAULT_SCHEDULES[type].start,
        end: t(v.end, DEFAULT_SCHEDULES[type].end) || DEFAULT_SCHEDULES[type].end,
        phonePickup: t(v.phonePickup, ''),
        sweepTimes: Array.isArray(v.sweepTimes) ? v.sweepTimes.filter((x): x is string => typeof x === 'string' && isValidTime(x)) : [],
      }
    }
  } catch {
    /* fall back to built-in defaults */
  }
  return result
}

export function saveSchedule(type: ShiftType, schedule: ShiftSchedule): boolean {
  try {
    const all = loadSchedules()
    all[type] = schedule
    localStorage.setItem(KEY, JSON.stringify(all))
    return true
  } catch {
    return false
  }
}
