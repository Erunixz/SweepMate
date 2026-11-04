/** Time helpers. Times are local 24h "HH:MM" strings; dates are local "YYYY-MM-DD" strings. */

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const isValidTime = (t: string) => TIME_RE.test(t)
export const isValidDate = (d: string) => DATE_RE.test(d) && !Number.isNaN(parseDate(d).getTime())

export function toMinutes(t: string): number {
  const [h = 0, m = 0] = t.split(':').map(Number)
  return h * 60 + m
}

/** Minutes from the shift start to `t`, wrapping past midnight (0–1439). */
export function minutesIntoShift(shiftStart: string, t: string): number {
  return (toMinutes(t) - toMinutes(shiftStart) + 1440) % 1440
}

/** True if `t` falls on the calendar day after the shift's start date. */
export function isNextDay(shiftStart: string, t: string): boolean {
  return toMinutes(t) < toMinutes(shiftStart)
}

export function sortTimesForShift(shiftStart: string, times: string[]): string[] {
  return [...times].sort((a, b) => minutesIntoShift(shiftStart, a) - minutesIntoShift(shiftStart, b))
}

export function parseDate(d: string): Date {
  const [y = 1970, m = 1, day = 1] = d.split('-').map(Number)
  return new Date(y, m - 1, day)
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(d: string, n: number): string {
  const date = parseDate(d)
  date.setDate(date.getDate() + n)
  return formatDateISO(date)
}

/** Calendar date on which time `t` of a shift actually occurs. */
export function dateForShiftTime(shiftDate: string, shiftStart: string, t: string): string {
  return isNextDay(shiftStart, t) ? addDays(shiftDate, 1) : shiftDate
}

export function nowTime(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/**
 * The date a shift running "now" most likely started on: before 6 a.m. we're still in
 * last night's shift.
 */
export function suggestedShiftDate(now = new Date()): string {
  const d = new Date(now)
  if (d.getHours() < 6) d.setDate(d.getDate() - 1)
  return formatDateISO(d)
}

export function weekdayName(d: string): string {
  return parseDate(d).toLocaleDateString('en-US', { weekday: 'long' })
}

export function formatDateLong(d: string): string {
  return parseDate(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function formatDateShort(d: string): string {
  return parseDate(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** "21:00" → "9:00 PM", "00:30" → "12:30 AM". Empty or invalid input returns ''. */
export function formatTime12(t: string): string {
  if (!isValidTime(t)) return ''
  const [h = 0, m = 0] = t.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** 12-hour time, marked "(next day)" when it falls after midnight relative to the shift start. */
export function labelShiftTime(shiftStart: string, t: string): string {
  return isNextDay(shiftStart, t) ? `${formatTime12(t)} (next day)` : formatTime12(t)
}

/** "Erfan and Jacob", "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length <= 2) return names.join(' and ')
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}
