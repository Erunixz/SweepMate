import { buildingProgress, missingEntries } from './progress'
import { getRoute } from './route'
import { applySchedule, createNote, createShift, getEntry, setEntry, upsertNote } from './shift'

const base = () =>
  createShift({
    date: '2026-11-04',
    type: 'weekday',
    startTime: '19:00',
    endTime: '03:00',
    caNames: [' Alex ', ''],
    partners: ['Sam'],
    startingBuildingId: 'woodstock',
    sweepTimes: ['00:00', '20:00', '22:00'],
  })

const answered = (count: number) => ({ state: 'answered' as const, count, observation: '', updatedAt: '' })
const skipped = { state: 'skipped' as const, observation: '', updatedAt: '' }

it('creates sweeps ordered across midnight and trims names', () => {
  const s = base()
  expect(s.sweeps.map((w) => w.scheduledTime)).toEqual(['20:00', '22:00', '00:00'])
  expect(s.caNames).toEqual(['Alex'])
})

it('keeps zero, skipped and unanswered distinct', () => {
  let s = base()
  const sweep = s.sweeps[0]!.id
  const [a, b] = getRoute('woodstock')
  s = setEntry(s, sweep, 'woodstock', a!.id, answered(0))
  s = setEntry(s, sweep, 'woodstock', b!.id, skipped)
  const p = buildingProgress(s.sweeps[0]!, 'woodstock')
  expect(p.answered).toBe(1)
  expect(p.skipped).toBe(1)
  expect(p.unanswered).toBe(getRoute('woodstock').length - 2)
  expect(getEntry(s, sweep, 'woodstock', a!.id)?.count).toBe(0)
})

it('keeps each sweep and building separate', () => {
  let s = base()
  const [first, second] = s.sweeps
  const loc = getRoute('woodstock')[0]!.id
  s = setEntry(s, first!.id, 'woodstock', loc, answered(4))
  expect(getEntry(s, second!.id, 'woodstock', loc)).toBeUndefined()
  expect(getEntry(s, first!.id, 'lp', loc)).toBeUndefined()
})

it('clearing an entry returns it to unanswered', () => {
  let s = base()
  const sweep = s.sweeps[0]!.id
  const loc = getRoute('lp')[0]!.id
  s = setEntry(s, sweep, 'lp', loc, answered(2))
  s = setEntry(s, sweep, 'lp', loc, null)
  expect(getEntry(s, sweep, 'lp', loc)).toBeUndefined()
})

it('editing the schedule keeps data on retained sweeps and detaches notes from removed ones', () => {
  let s = base()
  const [first, second] = s.sweeps
  const loc = getRoute('woodstock')[0]!.id
  s = setEntry(s, first!.id, 'woodstock', loc, answered(3))
  s = upsertNote(s, createNote('general', { sweepId: second!.id, description: 'x' }))
  s = applySchedule(s, [{ id: first!.id, time: '20:15' }, { time: '01:00' }])
  expect(s.sweeps).toHaveLength(2)
  expect(s.sweeps[0]!.scheduledTime).toBe('20:15')
  expect(getEntry(s, first!.id, 'woodstock', loc)?.count).toBe(3)
  expect(s.notes[0]!.sweepId).toBeNull()
})

it('missing entries skip missed sweeps and Not Checked locations', () => {
  let s = base()
  const [first, second, third] = s.sweeps
  s = { ...s, sweeps: s.sweeps.map((w) => (w.id === second!.id ? { ...w, missed: true } : w)) }
  for (const loc of getRoute('woodstock')) s = setEntry(s, first!.id, 'woodstock', loc.id, skipped)
  const groups = missingEntries(s)
  expect(groups.some((g) => g.sweep.id === second!.id)).toBe(false)
  expect(groups.some((g) => g.sweep.id === first!.id && g.buildingId === 'woodstock')).toBe(false)
  expect(groups.some((g) => g.sweep.id === third!.id)).toBe(true)
})
