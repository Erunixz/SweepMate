import { cleanText, generateReport, generateSweepParagraph } from './report'
import { getReportRoute, getRoute } from './route'
import { createNote, createShift, setEntry, updateSweep, upsertNote } from './shift'
import type { LocationEntry, Shift } from './types'

const ans = (count: number, observation = ''): LocationEntry => ({ state: 'answered', count, observation, updatedAt: '' })

function shiftWith(): Shift {
  return createShift({
    date: '2026-11-04',
    type: 'weekday',
    startTime: '19:00',
    endTime: '03:00',
    caNames: ['Alex', 'Jordan'],
    partners: [],
    startingBuildingId: 'lp',
    sweepTimes: ['20:00', '22:00', '00:00'],
  })
}

function fillAll(s: Shift, sweepId: string, buildingId: string, value = 1): Shift {
  for (const loc of getRoute(buildingId)) {
    const e: LocationEntry = loc.kind === 'status' ? { state: 'answered', status: 'Locked', observation: '', updatedAt: '' } : ans(value)
    s = setEntry(s, sweepId, buildingId, loc.id, e)
  }
  return s
}

it('builds a header with shift details and staff, and never invents partners', () => {
  const r = generateReport(shiftWith())
  expect(r).toMatch(/^Coverage Report - Wednesday, November 4, 2026 \(Weekday shift, 19:00-03:00\)/)
  expect(r).toContain('CAs on shift: Alex, Jordan. Partners: none listed.')
})

it('distinguishes zero, not checked and unanswered locations', () => {
  let s = shiftWith()
  const sweep = s.sweeps[0]!.id
  const [a, b] = getRoute('woodstock')
  s = setEntry(s, sweep, 'woodstock', a!.id, ans(0))
  s = setEntry(s, sweep, 'woodstock', b!.id, { state: 'skipped', observation: '', updatedAt: '' })
  const p = generateSweepParagraph(s, 0)
  expect(p).toContain(`${a!.label} 0`)
  expect(p).toContain(`${b!.label} not checked`)
  expect(p).toContain(`${getRoute('woodstock')[2]!.label} [not recorded]`)
  expect(p).toMatch(/Woodstock \(incomplete - 2 of \d+ recorded\)/)
  // LP has nothing recorded at all.
  expect(p).toContain('LP: [not recorded].')
})

it('uses report order, not walking order, for LP', () => {
  let s = shiftWith()
  s = fillAll(s, s.sweeps[0]!.id, 'lp')
  const p = generateSweepParagraph(s, 0)
  const labels = getReportRoute('lp').map((l) => l.label)
  const positions = labels.map((l) => p.indexOf(`${l} `))
  expect(positions.every((pos) => pos >= 0)).toBe(true)
  expect([...positions].sort((x, y) => x - y)).toEqual(positions)
  // Floor 5 is walked North→South but reported South→North.
  expect(p.indexOf('Floor 5 South lounge')).toBeLessThan(p.indexOf('Floor 5 North lounge'))
  expect(p).toContain('B103 Locked')
})

it('includes actual times, observations, missed and empty sweeps', () => {
  let s = shiftWith()
  const [first, second] = s.sweeps
  s = fillAll(s, first!.id, 'woodstock')
  s = fillAll(s, first!.id, 'lp')
  const loc = getRoute('woodstock')[0]!
  s = setEntry(s, first!.id, 'woodstock', loc.id, ans(3, 'Loud music.\nAsked to lower volume'))
  s = updateSweep(s, first!.id, { actualStart: '20:02', actualEnd: '20:44' })
  s = updateSweep(s, second!.id, { missed: true, missedReason: 'Responding to a call' })
  const r = generateReport(s)
  expect(r).toContain('Sweep 1 (20:00; 20:02-20:44):')
  expect(r).toContain(`Observations: ${loc.label} - Loud music. Asked to lower volume.`)
  expect(r).toContain('Sweep 2 (22:00): Not completed - Responding to a call.')
  expect(r).toContain('Sweep 3 (00:00): No data recorded.')
  expect(r).not.toMatch(/incomplete/)
})

it('does not claim a missed sweep has a reason when none was given', () => {
  let s = shiftWith()
  s = updateSweep(s, s.sweeps[0]!.id, { missed: true })
  expect(generateSweepParagraph(s, 0)).toBe('Sweep 1 (20:00): Not completed - reason not recorded.')
})

it('lists work orders, incidents and follow-ups with accurate status wording', () => {
  let s = shiftWith()
  s = upsertNote(s, createNote('work-order', { time: '21:10', location: 'WS Laundry', description: 'Washer leaking', sweepId: s.sweeps[0]!.id }))
  s = upsertNote(s, createNote('ir', { time: '00:15', description: 'Noise complaint', action: 'Spoke with residents', reference: '' }))
  s = upsertNote(s, createNote('follow-up', { time: '23:00', description: 'Check lounge lock' }))
  const r = generateReport(s)
  expect(r).toContain('Maintenance / work orders:\n- 21:10, Sweep 1, WS Laundry: Washer leaking. Status: observed, work order not yet submitted.')
  expect(r).toContain('Incidents (IR/SOC):\n- IR 00:15: Noise complaint. Action: Spoke with residents. Status: IR not yet filed.')
  expect(r).toContain('Follow-up:\n- 23:00: Check lounge lock. Status: open.')
  expect(r).not.toContain('Other notes:')
})

it('marks demo reports and produces clean plain text', () => {
  const s = { ...shiftWith(), isDemo: true }
  const r = generateReport(s)
  expect(r.startsWith('[DEMO')).toBe(true)
  expect(r).not.toMatch(/[ \t]+\n/)
  expect(r).not.toMatch(/\n{3,}/)
  expect(r.endsWith('\n')).toBe(true)
  expect(cleanText('a  \r\n\r\n\r\n\u200Bb')).toBe('a\n\nb\n')
})
