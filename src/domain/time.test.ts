import {
  addDays,
  dateForShiftTime,
  formatTime12,
  isNextDay,
  isValidTime,
  joinNames,
  labelShiftTime,
  minutesIntoShift,
  sortTimesForShift,
  suggestedShiftDate,
} from './time'

describe('midnight rollover', () => {
  it('treats a 1:00 AM sweep as the next calendar day of a 9 PM shift', () => {
    expect(isNextDay('21:00', '01:00')).toBe(true)
    expect(isNextDay('21:00', '23:00')).toBe(false)
    expect(dateForShiftTime('2026-10-29', '21:00', '01:00')).toBe('2026-10-30')
    expect(dateForShiftTime('2026-10-29', '21:00', '23:00')).toBe('2026-10-29')
  })

  it('orders sweep times by position in the shift, not clock value', () => {
    expect(sortTimesForShift('21:00', ['01:00', '21:00', '23:00'])).toEqual(['21:00', '23:00', '01:00'])
  })

  it('computes minutes into the shift across midnight', () => {
    expect(minutesIntoShift('21:00', '01:00')).toBe(240)
  })

  it('handles month and year ends', () => {
    expect(dateForShiftTime('2026-12-31', '21:00', '01:00')).toBe('2027-01-01')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('labels after-midnight times', () => {
    expect(labelShiftTime('21:00', '01:00')).toBe('1:00 AM (next day)')
    expect(labelShiftTime('21:00', '23:00')).toBe('11:00 PM')
  })

  it('suggests yesterday as the coverage date in the early morning', () => {
    expect(suggestedShiftDate(new Date(2026, 9, 30, 2, 0))).toBe('2026-10-29')
    expect(suggestedShiftDate(new Date(2026, 9, 29, 20, 0))).toBe('2026-10-29')
  })
})

it('formats 12-hour times', () => {
  expect(formatTime12('21:00')).toBe('9:00 PM')
  expect(formatTime12('20:50')).toBe('8:50 PM')
  expect(formatTime12('00:00')).toBe('12:00 AM')
  expect(formatTime12('12:05')).toBe('12:05 PM')
  expect(formatTime12('')).toBe('')
})

it('joins names naturally', () => {
  expect(joinNames(['Erfan', 'Jacob'])).toBe('Erfan and Jacob')
  expect(joinNames(['A', 'B', 'C'])).toBe('A, B and C')
  expect(joinNames(['A'])).toBe('A')
})

it('validates times', () => {
  expect(isValidTime('00:00')).toBe(true)
  expect(isValidTime('24:00')).toBe(false)
  expect(isValidTime('9:00')).toBe(false)
})
