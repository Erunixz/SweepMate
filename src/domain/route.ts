import { BUILDINGS } from '../config/buildings'
import type { BuildingConfig, LocationDef, RouteLocation, SequenceStop } from './types'

function fromStops(stops: SequenceStop[]): RouteLocation[] {
  return stops.flatMap((stop) => stop.locations.map((loc) => fromDef(loc, stop.section)))
}

function fromDef(loc: LocationDef, section: string): RouteLocation {
  return {
    id: loc.id,
    label: loc.label,
    section,
    kind: loc.kind ?? 'count',
    ...(loc.statusOptions ? { statusOptions: loc.statusOptions } : {}),
  }
}

/** Flatten a building's layout into its walking route. */
export function buildRoute(building: BuildingConfig): RouteLocation[] {
  const layout = building.layout
  if (layout.type === 'sequence') return fromStops(layout.stops)

  const [first, second] = layout.wings
  const floors = layout.floors.flatMap((floor, i) => {
    const forward = i % 2 === 0
    const locs = layout.floorOverrides?.[floor] ?? layout.floorLocations
    const ordered = forward ? locs : [...locs].reverse()
    const direction = forward ? `${first.name} → ${second.name}` : `${second.name} → ${first.name}`
    return ordered.map(
      (loc): RouteLocation => ({
        ...fromDef(loc, `Floor ${floor}`),
        id: `f${floor}-${loc.id}`,
        label: `Floor ${floor} ${loc.label}`,
        floor,
        wing: loc.wing,
        direction,
      }),
    )
  })
  return [...fromStops(layout.before ?? []), ...floors, ...fromStops(layout.after ?? [])]
}

/** The same locations as the walking route, in report-display order. */
export function buildReportRoute(building: BuildingConfig): RouteLocation[] {
  const walk = buildRoute(building)
  const order = building.reportOrder ?? 'walking'
  const layout = building.layout

  if (order === 'walking') return walk

  if (order === 'by-floor') {
    if (layout.type !== 'alternating') return walk
    const rank = new Map(layout.floorLocations.map((l, i) => [l.id, i]))
    const floorRank = new Map(layout.floors.map((f, i) => [f, i]))
    const suffix = (r: RouteLocation) => r.id.slice(`f${r.floor}-`.length)
    // Keep before/after stops where they are; sort floor stops by floor then wing order.
    const floorStops = walk
      .filter((r) => r.floor !== undefined)
      .sort(
        (a, b) =>
          (floorRank.get(a.floor!) ?? 0) - (floorRank.get(b.floor!) ?? 0) ||
          (rank.get(suffix(a)) ?? 0) - (rank.get(suffix(b)) ?? 0),
      )
    const before = fromStops(layout.before ?? [])
    const after = fromStops(layout.after ?? [])
    return [...before, ...floorStops, ...after]
  }

  const byId = new Map(walk.map((r) => [r.id, r]))
  const listed = order.map((id) => byId.get(id)).filter((r): r is RouteLocation => !!r)
  const listedIds = new Set(listed.map((r) => r.id))
  return [...listed, ...walk.filter((r) => !listedIds.has(r.id))]
}

const routeCache = new Map<string, RouteLocation[]>()
const reportCache = new Map<string, RouteLocation[]>()

export function getBuilding(id: string): BuildingConfig | undefined {
  return BUILDINGS.find((b) => b.id === id)
}

export function getRoute(buildingId: string): RouteLocation[] {
  let route = routeCache.get(buildingId)
  if (!route) {
    const building = getBuilding(buildingId)
    route = building ? buildRoute(building) : []
    routeCache.set(buildingId, route)
  }
  return route
}

export function getReportRoute(buildingId: string): RouteLocation[] {
  let route = reportCache.get(buildingId)
  if (!route) {
    const building = getBuilding(buildingId)
    route = building ? buildReportRoute(building) : []
    reportCache.set(buildingId, route)
  }
  return route
}

/** Buildings in the order they're walked during a sweep: the starting building first. */
export function walkingBuildingOrder(startingBuildingId: string): BuildingConfig[] {
  const start = BUILDINGS.find((b) => b.id === startingBuildingId)
  return start ? [start, ...BUILDINGS.filter((b) => b !== start)] : [...BUILDINGS]
}
