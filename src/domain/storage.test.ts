import { createDemoShift } from './demo'
import { getRoute } from './route'
import { createNote, setEntry, updateBuildingSweep, upsertNote } from './shift'
import { BACKUP_PREFIX, DEMO_KEY, SHIFTS_KEY, loadAll, saveDemo, saveShifts } from './storage'
import { testShift } from './testShift'

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
  let s = testShift({ type: 'peak', startingBuildingId: 'lp', sweepTimes: ['21:00', '01:00'] })
  const [a] = s.sweeps
  const loc = getRoute('lp')[0]!.id
  s = setEntry(s, a!.id, 'lp', loc, { state: 'answered', count: 0, observation: 'quiet', updatedAt: 'x' })
  s = setEntry(s, a!.id, 'woodstock', 'games', { state: 'skipped', observation: '', updatedAt: 'x' })
  s = updateBuildingSweep(s, a!.id, 'lp', (bs) => ({ ...bs, actualStart: '21:01', actualEnd: '21:40', cas: ['Jacob'] }))
  s = upsertNote(s, createNote('ir', { time: '23:00', description: 'x', reference: '42', status: 'filed' }))
  return { ...s, extraNotes: 'extra', reportDraft: 'edited text' }
}

it('migrates shifts saved in the earlier format', () => {
  const st = memoryStorage()
  const old = {
    id: 'old',
    date: '2026-10-19',
    type: 'weekday',
    startTime: '21:00',
    endTime: '08:00',
    caNames: ['Erfan', 'Jacob'],
    partners: ['Sam'],
    startingBuildingId: 'woodstock',
    sweeps: [{ id: 's1', scheduledTime: '21:00', actualStart: '21:00', missed: false, missedReason: '', buildings: { woodstock: { entries: {} } } }],
    notes: [],
  }
  st.setItem(SHIFTS_KEY, JSON.stringify({ version: 1, shifts: [old] }))
  const { shifts, problem } = loadAll(st)
  expect(problem).toBeNull()
  expect(shifts[0]).toMatchObject({ mode: 'full', quickBuildingId: null, myName: 'Erfan', otherCAs: ['Jacob', 'Sam'], buildingCAs: {}, phonePickup: '', extraNotes: '' })
  expect(shifts[0]!.sweeps[0]!.buildings.woodstock).toEqual({ entries: {}, actualStart: '', actualEnd: '', cas: null })
})

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
