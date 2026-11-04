import { createNote, createQuickShift, setEntry, updateBuildingSweep, upsertNote } from './shift'
import { getRoute, shiftBuildings } from './route'
import { missingDetails, missingEntries, sweepProgress } from './progress'
import { generateReport, reportFileName } from './report'
import { loadAll, normalizeShift, saveShifts } from './storage'

it.each(['woodstock', 'lp'])('keeps the %s quick route, report and persistence limited to one building', (buildingId) => {
  let shift = createQuickShift({ date: '2026-11-04', buildingId, time: '01:00', myName: ' Sam ', otherCAs: ['Jo'] })
  const sweepId = shift.sweeps[0]!.id
  const route = getRoute(buildingId)
  expect(shiftBuildings(shift).map((b) => b.id)).toEqual([buildingId])
  expect(sweepProgress(shift, shift.sweeps[0]!).total).toBe(route.length)
  expect(missingEntries(shift).map((g) => g.buildingId)).toEqual([buildingId])
  expect(missingDetails(shift).join(' ')).not.toMatch(/phone|Scheduled sweep/)
  shift = setEntry(shift, sweepId, buildingId, route[0]!.id, { state: 'answered', count: 0, observation: 'Quiet room', updatedAt: '' })
  shift = setEntry(shift, sweepId, buildingId, route[1]!.id, { state: 'skipped', observation: '', updatedAt: '' })
  shift = updateBuildingSweep(shift, sweepId, buildingId, (b) => ({ ...b, actualStart: '01:02', actualEnd: '01:25' }))
  shift = upsertNote(shift, createNote('general', { sweepId, buildingId, description: 'Door secured', time: '01:20' }))
  shift.extraNotes = 'Keys returned.'
  const report = generateReport(shift)
  expect(report.startsWith(buildingId === 'lp' ? 'Les Prince\n' : 'Woodstock\n')).toBe(true)
  expect(report).not.toMatch(/SWEEPS:|NOTES:|Coverage date|phone pick up/)
  expect(report).not.toContain(buildingId === 'lp' ? 'Woodstock' : 'Les Prince')
  expect(report).toContain('Start time: 1:02 AM\nCAs: Sam and Jo')
  expect(report).toContain('End time: 1:25 AM')
  expect(report).toContain('0 in ')
  expect(report).toContain('[not checked]')
  expect(report).toContain('[not recorded]')
  expect(report).toContain('Quiet room.')
  expect(report).toContain('Keys returned.')
  expect(report).toContain('Door secured.')
  expect(reportFileName(shift)).toBe(`quick-sweep-${buildingId}-2026-11-04.txt`)
  expect(missingDetails(shift)).toEqual([])
  const data = new Map<string, string>()
  const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) }, removeItem: (k: string) => { data.delete(k) } }
  expect(saveShifts([shift], storage)).toBe(true)
  expect(loadAll(storage).shifts).toEqual([shift])
})

it('does not turn a damaged quick sweep into full coverage', () => {
  const shift = createQuickShift({ date: '2026-11-04', buildingId: 'lp', time: '23:00' })
  expect(normalizeShift({ ...shift, quickBuildingId: 'unknown' })).toBeNull()
  expect(normalizeShift({ ...shift, sweeps: [] })).toBeNull()
})
