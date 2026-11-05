import { cleanText, generateReport, generateSweepSection } from './report'
import { getRoute } from './route'
import { createNote, setEntry, updateBuildingSweep, upsertNote } from './shift'
import { testShift } from './testShift'
import type { LocationEntry, Shift } from './types'

const ans = (count: number, observation = ''): LocationEntry => ({ state: 'answered', count, observation, updatedAt: '' })

/** October 29, 9:00 PM Woodstock counts from the real notes (used only as test data). */
const OCT29_WOODSTOCK: Record<string, number> = {
  'f6-common': 1,
  'f5-common': 1,
  'f4-common': 0,
  'f3-common': 4,
  'f2-common': 1,
  'f1-common': 6,
  'north-kitchen': 0,
  'study-101e': 4,
  'study-101c': 7,
  laundry: 0,
  games: 9,
}

function withWoodstock(s: Shift): Shift {
  const sweep = s.sweeps[0]!.id
  for (const [id, n] of Object.entries(OCT29_WOODSTOCK)) s = setEntry(s, sweep, 'woodstock', id, ans(n))
  return updateBuildingSweep(s, sweep, 'woodstock', (b) => ({ ...b, actualStart: '21:00', actualEnd: '21:24' }))
}

it('reproduces the October 29 Woodstock section in the template format', () => {
  const section = generateSweepSection(withWoodstock(testShift()), 0)
  expect(section).toContain(
    [
      '9:00 PM',
      '',
      'Woodstock',
      'Start time: 9:00 PM',
      'CAs: Erfan and Jacob',
      '',
      '6: 1 in common room.',
      '5: 1 in common room.',
      '4: 0 in common room.',
      '3: 4 in common room.',
      '2: 1 in common room.',
      '1: 6 in common room.',
      '',
      '1st-floor north kitchen: 0.',
      'Study room 101E: 4.',
      'Study room 101C: 7.',
      'Laundry room: 0.',
      'Games room: 9.',
      '',
      'End time: 9:24 PM',
    ].join('\n'),
  )
})

it('reports Les Prince north-first on every floor, regardless of walking direction', () => {
  let s = testShift()
  const sweep = s.sweeps[0]!.id
  getRoute('lp').forEach((loc, i) => (s = setEntry(s, sweep, 'lp', loc.id, ans(i))))
  const n = (id: string) => getRoute('lp').findIndex((l) => l.id === id)
  const section = generateSweepSection(s, 0)
  for (const f of ['6', '5', '4', '3', '2']) {
    expect(section).toContain(
      `${f}:\n${n(`f${f}-north-study`)} in north study room.\n${n(`f${f}-north-kitchen`)} in north kitchen.\n` +
        `${n(`f${f}-south-study`)} in south study room.\n${n(`f${f}-south-kitchen`)} in south kitchen.`,
    )
  }
  expect(section).toContain(`1:\n${n('f1-study')} in study room.\n${n('f1-kitchen')} in kitchen.`)
  expect(section).toContain(`Games room: ${n('games')}.\nLaundry room: ${n('laundry')}.`)
  // Floors are separated by blank lines, and Les Prince follows Woodstock.
  expect(section).toMatch(/south kitchen\.\n\n5:\n/)
  expect(section.indexOf('Woodstock')).toBeLessThan(section.indexOf('Les Prince'))
})

it('labels unanswered, Not Checked, missing times and CAs instead of inventing them', () => {
  let s = testShift({ buildingCAs: {} })
  s = setEntry(s, s.sweeps[0]!.id, 'woodstock', 'f6-common', { state: 'skipped', observation: '', updatedAt: '' })
  const section = generateSweepSection(s, 0)
  expect(section).toContain('6: [not checked] in common room.')
  expect(section).toContain('5: [not recorded] in common room.')
  expect(section).toContain('Start time: [not recorded]')
  expect(section).toContain('CAs: [not recorded]')
  expect(section).toContain('End time: [not recorded]')
  expect(section).not.toMatch(/: 0[ .]/)
})

it('builds the full report: sweeps list, coverage notes, every sweep and Extra Notes', () => {
  let s = withWoodstock(testShift())
  s = { ...s, extraNotes: 'Quiet night overall.\n\n' }
  s = upsertNote(s, createNote('general', { time: '21:10', location: 'Woodstock', description: 'B103 open' }))
  s = upsertNote(
    s,
    createNote('work-order', { time: '00:15', location: 'Les Prince Floor 3', description: 'Ceiling leak', action: 'Placed bucket', contacts: 'Facilities' }),
  )
  const r = generateReport(s)

  expect(
    r.startsWith(
      'SWEEPS:\n9:00 PM, 11:00 PM, 1:00 AM\n\nNOTES:\nCoverage date: October 29, 2026\nStart: 9:00 PM\n\n9:00 PM\n\nWoodstock',
    ),
  ).toBe(true)
  expect(r).toContain('11:00 PM\n\nWoodstock\nStart time: [not recorded]')
  expect(r).toContain('1:00 AM\n\nWoodstock\nStart time: [not recorded]')
  expect(r).toContain(
    [
      'Extra Notes:',
      'Quiet night overall.',
      '',
      '9:10 PM — Woodstock',
      'B103 open.',
      '',
      '12:15 AM — Les Prince Floor 3 — Maintenance',
      'Ceiling leak.',
      '- Actions taken: Placed bucket.',
      '- Contacted: Facilities.',
      '- Status: Observed, work order not yet submitted.',
    ].join('\n'),
  )
})

it('keeps line breaks in a note description, one sentence per line', () => {
  let s = testShift()
  s = upsertNote(s, createNote('general', { time: '22:00', description: 'loud music in 4B\n\n  asked residents to lower it.  \nquiet by 10:10' }))
  expect(generateReport(s)).toContain('10:00 PM\nLoud music in 4B.\nAsked residents to lower it.\nQuiet by 10:10.')
})

it('formats a note without a time or description without leaving gaps', () => {
  let s = testShift()
  s = upsertNote(s, createNote('follow-up', { description: '', followUp: 'check B-wing door tomorrow', reference: '#77' }))
  expect(generateReport(s)).toContain('Follow-up\n[not recorded]\n- Ref: #77\n- Status: Open.\n- Follow-up: Check B-wing door tomorrow.')
})

it('only says something was submitted or filed when recorded that way', () => {
  let s = testShift()
  s = upsertNote(s, createNote('ir', { time: '23:30', description: 'Noise complaint', reference: '1234', status: 'filed' }))
  s = upsertNote(s, createNote('soc', { time: '23:45', description: 'Check-in' }))
  const r = generateReport(s)
  expect(r).toContain('11:30 PM — IR\nNoise complaint.\n- Ref: #1234\n- Status: IR filed.')
  expect(r).toContain('11:45 PM — SOC\nCheck-in.\n- Status: SOC not yet filed.')
})

it('includes per-location observations without changing counts', () => {
  let s = withWoodstock(testShift())
  s = setEntry(s, s.sweeps[0]!.id, 'woodstock', 'games', ans(9, 'Loud music.\nAsked to lower volume'))
  expect(generateSweepSection(s, 0)).toContain('Games room: 9.\n\nGames room: Loud music. Asked to lower volume.\n\nEnd time')
})

it('says "None." when there are no extra notes and outputs clean text', () => {
  const r = generateReport(testShift())
  expect(r).toContain('Extra Notes:\nNone.')
  expect(r).not.toMatch(/[ \t]+\n/)
  expect(r).not.toMatch(/\n{3,}/)
  expect(r.endsWith('\n')).toBe(true)
  expect(cleanText('a  \r\n\r\n\r\nb')).toBe('a\n\nb\n')
})
