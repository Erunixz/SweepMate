import { createDemoShift } from './demo'
import { getRoute } from './route'
import { createNote, createShift, setEntry, updateSweep, upsertNote } from './shift'
import { BACKUP_PREFIX, DEMO_KEY, SHIFTS_KEY, loadAll, saveDemo, saveShifts } from './storage'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  }
}

function fullShift() {
  let s = createShift({
    date: '2026-11-04',
    type: 'peak',
    startTime: '19:00',
    endTime: '04:00',
    caNames: ['Alex'],
    partners: ['Sam', 'Riley'],
    startingBuildingId: 'lp',
    sweepTimes: ['20:00', '00:30'],
  })
  const [a, b] = s.sweeps
  const loc = getRoute('lp')[0]!.id
  s = setEntry(s, a!.id, 'lp', loc, { state: 'answered', count: 0, observation: 'quiet', updatedAt: 'x' })
  s = setEntry(s, a!.id, 'lp', 'b103', { state: 'answered', status: 'Locked', observation: '', updatedAt: 'x' })
  s = setEntry(s, a!.id, 'woodstock', 'lobby', { state: 'skipped', observation: '', updatedAt: 'x' })
  s = updateSweep(s, a!.id, { actualStart: '20:01', actualEnd: '20:40' })
  s = updateSweep(s, b!.id, { missed: true, missedReason: 'call' })
  s = upsertNote(s, createNote('ir', { time: '23:00', description: 'x', reference: '42', status: 'filed' }))
  return { ...s, reportDraft: 'edited text' }
}

it('round-trips every field of a shift', () => {
  const st = memoryStorage()
  const s = fullShift()
  expect(saveShifts([s], st)).toBe(true)
  const { shifts, problem } = loadAll(st)
  expect(problem).toBeNull()
  expect(shifts[0]).toEqual(s)
})

it('keeps demo data out of the real shift list', () => {
  const st = memoryStorage()
  const demo = createDemoShift()
  saveShifts([fullShift(), demo], st)
  saveDemo(demo, st)
  const { shifts, demo: loadedDemo } = loadAll(st)
  expect(shifts.every((s) => !s.isDemo)).toBe(true)
  expect(JSON.parse(st.map.get(SHIFTS_KEY)!).shifts).toHaveLength(1)
  expect(loadedDemo?.id).toBe(demo.id)
})

it('backs up and recovers from unparseable data', () => {
  const st = memoryStorage()
  st.setItem(SHIFTS_KEY, '{not json')
  const r = loadAll(st)
  expect(r.problem).toBe('corrupt')
  expect(r.shifts).toEqual([])
  const backups = [...st.map.keys()].filter((k) => k.startsWith(BACKUP_PREFIX))
  expect(backups).toHaveLength(1)
  expect(st.map.get(backups[0]!)).toBe('{not json')
})

it('loads valid shifts and reports partial damage', () => {
  const st = memoryStorage()
  st.setItem(SHIFTS_KEY, JSON.stringify({ version: 1, shifts: [fullShift(), { id: 5 }] }))
  const r = loadAll(st)
  expect(r.problem).toBe('partial')
  expect(r.shifts).toHaveLength(1)
})

it('discards a damaged demo silently', () => {
  const st = memoryStorage()
  st.setItem(DEMO_KEY, '[]')
  expect(loadAll(st).demo).toBeNull()
  expect(st.map.has(DEMO_KEY)).toBe(false)
})

it('reports unavailable storage', () => {
  expect(loadAll(null).problem).toBe('unavailable')
  expect(saveShifts([], null)).toBe(false)
})

it('reports failed writes (e.g. quota exceeded)', () => {
  const st = {
    ...memoryStorage(),
    setItem: () => {
      throw new Error('QuotaExceededError')
    },
  }
  expect(saveShifts([fullShift()], st)).toBe(false)
})
