/** Test helper: a shift shaped like the October 29 coverage (sweeps 9 PM, 11 PM, 1 AM). */
import { createShift, type NewShiftInput } from './shift'

export function testShift(overrides: Partial<NewShiftInput> = {}) {
  return createShift({
    date: '2026-10-29',
    type: 'weekday',
    phonePickup: '20:50',
    startTime: '21:00',
    endTime: '08:00',
    myName: 'Erfan',
    otherCAs: ['Jacob'],
    buildingCAs: { woodstock: ['Erfan', 'Jacob'], lp: ['Erfan', 'Jacob'] },
    startingBuildingId: 'woodstock',
    sweepTimes: ['21:00', '23:00', '01:00'],
    ...overrides,
  })
}
