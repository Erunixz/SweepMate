import { BUILDINGS } from '../config/buildings'
import { buildReportRoute, buildRoute, getRoute, walkingBuildingOrder } from './route'
import type { BuildingConfig } from './types'

const alternating: BuildingConfig = {
  id: 'x',
  name: 'X',
  shortName: 'X',
  layout: {
    type: 'alternating',
    floors: ['3', '2', '1'],
    wings: [
      { id: 'S', name: 'South' },
      { id: 'N', name: 'North' },
    ],
    floorLocations: [
      { id: 'a', label: 'A', wing: 'S' },
      { id: 'b', label: 'B', wing: 'N' },
    ],
    after: [{ section: 'Basement', locations: [{ id: 'z', label: 'Z', kind: 'status', statusOptions: ['ok'] }] }],
  },
  reportOrder: 'by-floor',
}

describe('alternating route', () => {
  it('walks descending floors, alternating South→North and North→South', () => {
    const route = buildRoute(alternating)
    expect(route.map((r) => r.id)).toEqual(['f3-a', 'f3-b', 'f2-b', 'f2-a', 'f1-a', 'f1-b', 'z'])
    expect(route[0]!.direction).toBe('South → North')
    expect(route[2]!.direction).toBe('North → South')
    expect(route[4]!.direction).toBe('South → North')
  })

  it('reports every floor South→North regardless of walking direction', () => {
    expect(buildReportRoute(alternating).map((r) => r.id)).toEqual(['f3-a', 'f3-b', 'f2-a', 'f2-b', 'f1-a', 'f1-b', 'z'])
  })

  it('carries status options through', () => {
    const z = buildRoute(alternating).at(-1)!
    expect(z.kind).toBe('status')
    expect(z.statusOptions).toEqual(['ok'])
  })
})

describe('configured buildings', () => {
  it('have unique location ids', () => {
    for (const b of BUILDINGS) {
      const ids = buildRoute(b).map((r) => r.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('walk Woodstock in the exact configured order', () => {
    const ws = BUILDINGS.find((b) => b.id === 'woodstock')!
    if (ws.layout.type !== 'sequence') throw new Error('expected sequence layout')
    const expected = ws.layout.stops.flatMap((s) => s.locations.map((l) => l.id))
    expect(getRoute('woodstock').map((r) => r.id)).toEqual(expected)
  })

  it('include B103 as a status location in LP', () => {
    const b103 = getRoute('lp').find((r) => r.id === 'b103')
    expect(b103?.kind).toBe('status')
    expect(b103?.statusOptions?.length).toBeGreaterThan(0)
  })

  it('report order covers exactly the same locations as the walk', () => {
    for (const b of BUILDINGS) {
      expect(buildReportRoute(b).map((r) => r.id).sort()).toEqual(buildRoute(b).map((r) => r.id).sort())
    }
  })
})

describe('explicit report order', () => {
  it('puts listed ids first and appends the rest in walking order', () => {
    const b: BuildingConfig = {
      id: 'y',
      name: 'Y',
      shortName: 'Y',
      layout: {
        type: 'sequence',
        stops: [{ section: 's', locations: ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id })) }],
      },
      reportOrder: ['c', 'a'],
    }
    expect(buildReportRoute(b).map((r) => r.id)).toEqual(['c', 'a', 'b', 'd'])
  })
})

it('walks the starting building first', () => {
  expect(walkingBuildingOrder('lp')[0]!.id).toBe('lp')
  expect(walkingBuildingOrder('woodstock')[0]!.id).toBe('woodstock')
  expect(walkingBuildingOrder('lp')).toHaveLength(BUILDINGS.length)
})
