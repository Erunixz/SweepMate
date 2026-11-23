/** Test helper: a fictional weekday-style shift with 9 PM, 11 PM and 1 AM sweeps. */
import { createShift, type NewShiftInput } from './shift'

export function testShift(overrides: Partial<NewShiftInput> = {}) {
  return createShift({
    date: '2026-11-12',
    type: 'weekday',
    phonePickup: '20:50',
    startTime: '21:00',
    endTime: '08:00',
    myName: 'Erfan',
    otherCAs: ['Riley'],
    buildingCAs: { woodstock: ['Erfan', 'Riley'], lp: ['Erfan', 'Riley'] },
    startingBuildingId: 'woodstock',
    sweepTimes: ['21:00', '23:00', '01:00'],
    ...overrides,
  })
}
