/** Fictional demo shift. Marked isDemo and stored separately from real shifts. */
import { getRoute } from './route'
import { createNote, createShift, setEntry, updateBuildingSweep, updateSweep, upsertNote } from './shift'
import { suggestedShiftDate } from './time'
import type { Shift } from './types'

export function createDemoShift(): Shift {
  let s = createShift({
    date: suggestedShiftDate(),
    type: 'weekday',
    phonePickup: '20:50',
    startTime: '21:00',
    endTime: '08:00',
    myName: 'Demo CA One',
    otherCAs: ['Demo CA Two'],
    buildingCAs: { woodstock: ['Demo CA One', 'Demo CA Two'], lp: ['Demo CA One', 'Demo CA Two'] },
    startingBuildingId: 'woodstock',
    sweepTimes: ['21:00', '23:00', '01:00'],
    isDemo: true,
  })
  const [first, second, third] = s.sweeps
  const ts = new Date().toISOString()

  // Sweep 1: both buildings done, with zeros, one Not Checked and an observation.
  for (const [b, start, end] of [
    ['woodstock', '21:02', '21:25'],
    ['lp', '21:27', '21:58'],
  ] as const) {
    getRoute(b).forEach((loc, i) => {
      const entry =
        i === 3
          ? { state: 'skipped' as const, observation: 'Room booked for a floor event', updatedAt: ts }
          : { state: 'answered' as const, count: (i * 3) % 5, observation: i === 1 ? 'Lights left on' : '', updatedAt: ts }
      s = setEntry(s, first!.id, b, loc.id, entry)
    })
    s = updateBuildingSweep(s, first!.id, b, (bs) => ({ ...bs, actualStart: start, actualEnd: end }))
  }

  // Sweep 2: part-way through Woodstock.
  getRoute('woodstock')
    .slice(0, 4)
    .forEach((loc, i) => {
      s = setEntry(s, second!.id, 'woodstock', loc.id, { state: 'answered', count: i, observation: '', updatedAt: ts })
    })
  s = updateBuildingSweep(s, second!.id, 'woodstock', (bs) => ({ ...bs, actualStart: '23:03' }))

  // Sweep 3: missed.
  s = updateSweep(s, third!.id, { missed: true, missedReason: 'Demo: responding to a lockout' })

  s = upsertNote(
    s,
    createNote('general', { sweepId: first!.id, buildingId: 'woodstock', time: '21:20', location: 'Woodstock B103', description: 'B103 open' }),
  )
  s = upsertNote(
    s,
    createNote('work-order', {
      sweepId: first!.id,
      time: '21:15',
      location: 'Woodstock Laundry room',
      description: 'Dryer 2 not heating',
    }),
  )
  return s
}
