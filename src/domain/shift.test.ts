import { buildingProgress, missingDetails, missingEntries } from './progress'
import { getRoute } from './route'
import { applySchedule, caPool, createNote, getEntry, setEntry, sweepBuildingCAs, updateBuildingSweep, upsertNote } from './shift'
import { testShift } from './testShift'

const answered = (count: number) => ({ state: 'answered' as const, count, observation: '', updatedAt: '' })
const skipped = { state: 'skipped' as const, observation: '', updatedAt: '' }

it('orders sweeps across midnight and trims names', () => {
  const s = testShift({ sweepTimes: ['01:00', '21:00', '23:00'], otherCAs: [' Jacob ', ''] })
  expect(s.sweeps.map((w) => w.scheduledTime)).toEqual(['21:00', '23:00', '01:00'])
  expect(s.otherCAs).toEqual(['Jacob'])
  expect(caPool(s)).toEqual(['Erfan', 'Jacob'])
})

it('does not pre-fill my name', () => {
  expect(caPool(testShift({ myName: '', otherCAs: ['Jacob'] }))).toEqual(['Jacob'])
})

it('keeps zero, skipped and unanswered distinct', () => {
  let s = testShift()
  const sweep = s.sweeps[0]!.id
  const [a, b] = getRoute('woodstock')
  s = setEntry(s, sweep, 'woodstock', a!.id, answered(0))
  s = setEntry(s, sweep, 'woodstock', b!.id, skipped)
  const p = buildingProgress(s.sweeps[0]!, 'woodstock')
  expect(p).toMatchObject({ answered: 1, skipped: 1, unanswered: getRoute('woodstock').length - 2 })
  expect(getEntry(s, sweep, 'woodstock', a!.id)?.count).toBe(0)
})

it('never carries counts into another sweep or building', () => {
  let s = testShift()
  const [first, second] = s.sweeps
  s = setEntry(s, first!.id, 'woodstock', 'games', answered(9))
  expect(getEntry(s, second!.id, 'woodstock', 'games')).toBeUndefined()
  expect(getEntry(s, first!.id, 'lp', 'games')).toBeUndefined()
})

it('keeps building times and CAs per sweep, defaulting CAs from the shift', () => {
  let s = testShift()
  const [first, second] = s.sweeps
  s = updateBuildingSweep(s, first!.id, 'lp', (b) => ({ ...b, actualStart: '21:30', cas: ['Jacob'] }))
  s = setEntry(s, first!.id, 'lp', 'games', answered(1)) // setting an entry keeps the times
  expect(s.sweeps[0]!.buildings.lp!.actualStart).toBe('21:30')
  expect(sweepBuildingCAs(s, s.sweeps[0]!, 'lp')).toEqual(['Jacob'])
  expect(sweepBuildingCAs(s, s.sweeps[1]!, 'lp')).toEqual(['Erfan', 'Jacob'])
  expect(s.sweeps.find((w) => w.id === second!.id)!.buildings.lp).toBeUndefined()
})

it('clearing an entry returns it to unanswered', () => {
  let s = testShift()
  const sweep = s.sweeps[0]!.id
  s = setEntry(s, sweep, 'lp', 'games', answered(2))
  s = setEntry(s, sweep, 'lp', 'games', null)
  expect(getEntry(s, sweep, 'lp', 'games')).toBeUndefined()
})

it('editing the schedule keeps data on retained sweeps and detaches notes from removed ones', () => {
  let s = testShift()
  const [first, second] = s.sweeps
  s = setEntry(s, first!.id, 'woodstock', 'games', answered(3))
  s = upsertNote(s, createNote('general', { sweepId: second!.id, description: 'x' }))
  s = applySchedule(s, [{ id: first!.id, time: '21:15' }, { time: '02:00' }])
  expect(s.sweeps.map((w) => w.scheduledTime)).toEqual(['21:15', '02:00'])
  expect(getEntry(s, first!.id, 'woodstock', 'games')?.count).toBe(3)
  expect(s.notes[0]!.sweepId).toBeNull()
})

it('missing entries skip missed sweeps and Not Checked locations', () => {
  let s = testShift()
  const [first, second, third] = s.sweeps
  s = { ...s, sweeps: s.sweeps.map((w) => (w.id === second!.id ? { ...w, missed: true } : w)) }
  for (const loc of getRoute('woodstock')) s = setEntry(s, first!.id, 'woodstock', loc.id, skipped)
  const groups = missingEntries(s)
  expect(groups.some((g) => g.sweep.id === second!.id)).toBe(false)
  expect(groups.some((g) => g.sweep.id === first!.id && g.buildingId === 'woodstock')).toBe(false)
  expect(groups.some((g) => g.sweep.id === third!.id)).toBe(true)
})

it('lists missing phone pick-up, building times and CAs', () => {
  let s = testShift({ phonePickup: '', buildingCAs: {} })
  s = updateBuildingSweep(s, s.sweeps[0]!.id, 'woodstock', (b) => ({ ...b, actualStart: '21:00', actualEnd: '21:30', cas: ['Erfan'] }))
  const d = missingDetails(s)
  expect(d).toContain('Coverage phone pick-up time')
  expect(d).not.toContain('9:00 PM Woodstock: start time')
  expect(d).not.toContain('9:00 PM Woodstock: CAs')
  expect(d).toContain('9:00 PM Les Prince: start time')
  expect(d).toContain('9:00 PM Les Prince: CAs')
})
