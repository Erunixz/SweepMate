import type { ShiftType } from '../domain/types'

export interface ShiftTemplate {
  label: string
  start: string
  end: string
  /** Default sweep times (24h HH:MM). Editable per shift during setup. */
  sweepTimes: string[]
}

/**
 * Default shift hours and sweep times per shift type.
 * ⚠ PLACEHOLDER TIMES — replace with the schedule from the specification.
 * Times earlier than the shift start are treated as after midnight.
 */
export const SHIFT_TEMPLATES: Record<ShiftType, ShiftTemplate> = {
  weekday: { label: 'Weekday', start: '19:00', end: '03:00', sweepTimes: ['20:00', '22:00', '00:00', '02:00'] },
  weekend: { label: 'Weekend', start: '20:00', end: '04:00', sweepTimes: ['21:00', '23:00', '01:00', '03:00'] },
  peak: {
    label: 'Peak',
    start: '19:00',
    end: '04:00',
    sweepTimes: ['20:00', '21:30', '23:00', '00:30', '02:00', '03:30'],
  },
}

/** Suggest a shift type from the start date: Friday and Saturday nights are weekend shifts. */
export function suggestShiftType(date: Date): ShiftType {
  const day = date.getDay()
  return day === 5 || day === 6 ? 'weekend' : 'weekday'
}
