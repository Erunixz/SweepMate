import {
  addDays,
  dateForShiftTime,
  isNextDay,
  isValidTime,
  labelShiftTime,
  minutesIntoShift,
  sortTimesForShift,
  suggestedShiftDate,
} from './time'

describe('midnight rollover', () => {
  it('treats times before the shift start as the next day', () => {
    expect(isNextDay('19:00', '00:30')).toBe(true)
    expect(isNextDay('19:00', '23:59')).toBe(false)
    expect(isNextDay('19:00', '19:00')).toBe(false)
  })

  it('orders sweep times by position in the shift, not clock value', () => {
    expect(sortTimesForShift('19:00', ['02:00', '20:00', '00:00', '22:00'])).toEqual(['20:00', '22:00', '00:00', '02:00'])
  })

  it('computes minutes into the shift across midnight', () => {
    expect(minutesIntoShift('22:00', '01:00')).toBe(180)
  })

  it('resolves calendar dates, including month and year ends', () => {
    expect(dateForShiftTime('2026-12-31', '19:00', '01:00')).toBe('2027-01-01')
    expect(dateForShiftTime('2026-02-28', '19:00', '21:00')).toBe('2026-02-28')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('labels after-midnight times', () => {
    expect(labelShiftTime('19:00', '01:00')).toBe('01:00 (+1)')
    expect(labelShiftTime('19:00', '21:00')).toBe('21:00')
  })

  it('suggests yesterday as the shift date in the early morning', () => {
    expect(suggestedShiftDate(new Date(2026, 10, 5, 2, 0))).toBe('2026-11-04')
    expect(suggestedShiftDate(new Date(2026, 10, 4, 20, 0))).toBe('2026-11-04')
  })
})

it('validates times', () => {
  expect(isValidTime('00:00')).toBe(true)
  expect(isValidTime('23:59')).toBe(true)
  expect(isValidTime('24:00')).toBe(false)
  expect(isValidTime('7:00')).toBe(false)
})
