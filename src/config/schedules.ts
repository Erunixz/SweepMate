import type { ShiftType } from '../domain/types'

export interface ShiftSchedule {
  start: string
  end: string
  /** Coverage phone pick-up time, or '' for none. */
  phonePickup: string
  /** Scheduled sweep times (24h HH:MM). */
  sweepTimes: string[]
}

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  weekday: 'Weekday',
  weekend: 'Weekend',
  peak: 'Peak day',
}

/**
 * Built-in starting schedule for every shift type. Only the 9:00 PM–8:00 AM coverage hours
 * are confirmed; phone pick-up and sweep times per shift type are not, so they start empty.
 * Set real defaults per type from Shift setup ("Save as … default"), which stores them on
 * the device, or edit them here. Times earlier than the shift start are after midnight.
 */
export const DEFAULT_SCHEDULES: Record<ShiftType, ShiftSchedule> = {
  weekday: { start: '21:00', end: '08:00', phonePickup: '', sweepTimes: [] },
  weekend: { start: '21:00', end: '08:00', phonePickup: '', sweepTimes: [] },
  peak: { start: '21:00', end: '08:00', phonePickup: '', sweepTimes: [] },
}
