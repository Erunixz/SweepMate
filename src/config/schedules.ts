import type { ShiftType } from '../domain/types'

export interface ShiftSchedule {
  start: string
  end: string
  /** Scheduled sweep times (24h HH:MM). Times earlier than the start are after midnight. */
  sweepTimes: string[]
}

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  weekday: 'Weekday',
  weekend: 'Weekend',
}

/**
 * Starting schedule for each shift type. Every shift runs 9:00 PM–8:00 AM. Weekdays sweep at
 * 9 and 11 PM; weekends add a 1 AM sweep. Times can still be adjusted in setup or mid-shift.
 */
export const DEFAULT_SCHEDULES: Record<ShiftType, ShiftSchedule> = {
  weekday: { start: '21:00', end: '08:00', sweepTimes: ['21:00', '23:00'] },
  weekend: { start: '21:00', end: '08:00', sweepTimes: ['21:00', '23:00', '01:00'] },
}
