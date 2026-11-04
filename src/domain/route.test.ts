import { BUILDINGS } from '../config/buildings'
import { buildRoute, getRoute, reportBuildingOrder, reportLayoutProblems, walkingBuildingOrder } from './route'

const ids = (b: string) => getRoute(b).map((r) => r.id)

it('walks Woodstock in the confirmed order', () => {
  expect(ids('woodstock')).toEqual([
    'f6-common',
    'f5-common',
    'f4-common',
    'f3-common',
    'f2-common',
    'f1-common',
    'north-kitchen',
    'study-101e',
    'study-101c',
    'laundry',
    'games',
  ])
  expect(getRoute('woodstock').map((r) => r.label)).toEqual([
    'Floor 6 common room',
    'Floor 5 common room',
    'Floor 4 common room',
    'Floor 3 common room',
    'Floor 2 common room',
    'Floor 1 common room',
    'First-floor north kitchen',
    'Study room 101E',
    'Study room 101C',
    'Laundry room',
    'Games room',
  ])
})

it('walks Les Prince alternating sides by floor, keeping study before kitchen', () => {
  const S = (f: string) => [`f${f}-south-study`, `f${f}-south-kitchen`]
  const N = (f: string) => [`f${f}-north-study`, `f${f}-north-kitchen`]
  expect(ids('lp')).toEqual([
    ...S('6'),
    ...N('6'),
    ...N('5'),
    ...S('5'),
    ...S('4'),
    ...N('4'),
    ...N('3'),
    ...S('3'),
    ...S('2'),
    ...N('2'),
    'f1-study',
    'f1-kitchen',
    'games',
    'laundry',
  ])
})

it('labels LP directions on winged floors only', () => {
  const route = getRoute('lp')
  const dir = (id: string) => route.find((r) => r.id === id)?.direction
  expect(dir('f6-south-study')).toBe('South → North')
  expect(dir('f5-north-study')).toBe('North → South')
  expect(dir('f2-south-study')).toBe('South → North')
  expect(dir('f1-study')).toBeUndefined()
})

it('has no north/south rooms on LP Floor 1', () => {
  const floor1 = getRoute('lp').filter((r) => r.floor === '1')
  expect(floor1.map((r) => r.label)).toEqual(['Floor 1 study room', 'Floor 1 kitchen'])
  expect(floor1.every((r) => r.wing === undefined)).toBe(true)
})

it('every route location appears exactly once in its report layout', () => {
  for (const b of BUILDINGS) expect(reportLayoutProblems(b)).toEqual([])
})

it('flags report layouts that miss or duplicate locations', () => {
  const ws = BUILDINGS.find((b) => b.id === 'woodstock')!
  const broken = { ...ws, reportBlocks: [[...ws.reportBlocks[0]!, ws.reportBlocks[0]![0]!]] }
  const problems = reportLayoutProblems(broken)
  expect(problems.some((p) => p.includes('games is not in the report'))).toBe(true)
  expect(problems.some((p) => p.includes('appears 2 times'))).toBe(true)
})

it('has unique ids per building', () => {
  for (const b of BUILDINGS) {
    const list = buildRoute(b).map((r) => r.id)
    expect(new Set(list).size).toBe(list.length)
  }
})

it('orders buildings: starting building first when walking, configured order in the report', () => {
  expect(walkingBuildingOrder('lp').map((b) => b.id)).toEqual(['lp', 'woodstock'])
  expect(walkingBuildingOrder('woodstock').map((b) => b.id)).toEqual(['woodstock', 'lp'])
  expect(reportBuildingOrder().map((b) => b.name)).toEqual(['Woodstock', 'Les Prince'])
})
