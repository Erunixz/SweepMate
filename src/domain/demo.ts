/** Fictional demo shift. Marked isDemo and stored separately from real shifts. */
import { getRoute } from './route'
import { createNote, createShift, setEntry, updateSweep, upsertNote } from './shift'
import { suggestedShiftDate } from './time'
import type { Shift } from './types'

export function createDemoShift(): Shift {
  let s = createShift({
    date: suggestedShiftDate(),
    type: 'weekday',
    startTime: '19:00',
    endTime: '03:00',
    caNames: ['Demo CA One', 'Demo CA Two'],
    partners: ['Demo Partner'],
    startingBuildingId: 'woodstock',
    sweepTimes: ['20:00', '22:00', '00:00', '02:00'],
    isDemo: true,
  })
  const [first, second, third] = s.sweeps
  const ts = new Date().toISOString()

  // Sweep 1: complete, with a mix of counts, zeros, a skip and an observation.
  for (const b of ['woodstock', 'lp']) {
    getRoute(b).forEach((loc, i) => {
      const entry =
        loc.kind === 'status'
          ? { state: 'answered' as const, status: loc.statusOptions?.[0] ?? '', observation: '', updatedAt: ts }
          : i === 3
            ? { state: 'skipped' as const, observation: 'Room booked for a floor event', updatedAt: ts }
            : { state: 'answered' as const, count: (i * 3) % 5, observation: i === 1 ? 'Lights left on' : '', updatedAt: ts }
      s = setEntry(s, first!.id, b, loc.id, entry)
    })
  }
  s = updateSweep(s, first!.id, { actualStart: '20:01', actualEnd: '20:48' })

  // Sweep 2: part-way through Woodstock.
  getRoute('woodstock')
    .slice(0, 4)
    .forEach((loc, i) => {
      s = setEntry(s, second!.id, 'woodstock', loc.id, { state: 'answered', count: i, observation: '', updatedAt: ts })
    })
  s = updateSweep(s, second!.id, { actualStart: '22:04' })

  // Sweep 3: missed.
  s = updateSweep(s, third!.id, { missed: true, missedReason: 'Demo: responding to a lockout' })

  s = upsertNote(
    s,
    createNote('work-order', {
      sweepId: first!.id,
      time: '20:20',
      location: 'Woodstock Laundry room',
      description: 'Dryer 2 not heating',
      status: 'observed',
    }),
  )
  s = upsertNote(
    s,
    createNote('follow-up', {
      time: '20:45',
      location: 'LP Floor 3',
      description: 'Check that the lounge door closes properly',
    }),
  )
  return s
}
