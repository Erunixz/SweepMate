import { BUILDINGS, REPORT_BUILDING_ORDER } from '../config/buildings'
import type { BuildingConfig, FloorLocationDef, LocationDef, RouteLocation, SequenceStop } from './types'

function fromDef(loc: LocationDef, section: string): RouteLocation {
  return {
    id: loc.id,
    label: loc.label,
    section,
    kind: loc.kind ?? 'count',
    ...(loc.statusOptions ? { statusOptions: loc.statusOptions } : {}),
  }
}

function fromStops(stops: SequenceStop[]): RouteLocation[] {
  return stops.flatMap((stop) => stop.locations.map((loc) => fromDef(loc, stop.section)))
}

/** Flatten a building's layout into its walking route. */
export function buildRoute(building: BuildingConfig): RouteLocation[] {
  const layout = building.layout
  if (layout.type === 'sequence') return fromStops(layout.stops)

  const floorStop = (floor: string, loc: FloorLocationDef, direction?: string): RouteLocation => ({
    ...fromDef(loc, `Floor ${floor}`),
    id: `f${floor}-${loc.id}`,
    label: `Floor ${floor} ${loc.label.charAt(0).toLowerCase()}${loc.label.slice(1)}`,
    floor,
    ...(loc.wing ? { wing: loc.wing } : {}),
    ...(direction ? { direction } : {}),
  })

  const floors = layout.floors.flatMap((floor, i) => {
    const override = layout.floorOverrides?.[floor]
    if (override) return override.map((loc) => floorStop(floor, loc))
    // Alternate which side is walked first; keep the order within each side.
    const [first, second] = i % 2 === 0 ? layout.wings : [layout.wings[1], layout.wings[0]]
    const direction = `${first.name} → ${second.name}`
    return [first, second].flatMap((wing) =>
      layout.floorLocations.filter((l) => l.wing === wing.id).map((loc) => floorStop(floor, loc, direction)),
    )
  })
  return [...fromStops(layout.before ?? []), ...floors, ...fromStops(layout.after ?? [])]
}

const routeCache = new Map<string, RouteLocation[]>()

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

/** Buildings in the order they're walked during a sweep: the starting building first. */
export function walkingBuildingOrder(startingBuildingId: string): BuildingConfig[] {
  const start = BUILDINGS.find((b) => b.id === startingBuildingId)
  return start ? [start, ...BUILDINGS.filter((b) => b !== start)] : [...BUILDINGS]
}

/** Buildings in report order; any building missing from REPORT_BUILDING_ORDER is appended. */
export function reportBuildingOrder(): BuildingConfig[] {
  const listed = REPORT_BUILDING_ORDER.map(getBuilding).filter((b): b is BuildingConfig => !!b)
  return [...listed, ...BUILDINGS.filter((b) => !listed.includes(b))]
}

/** Problems with a building's report layout: route locations missing, duplicated or unknown. */
export function reportLayoutProblems(building: BuildingConfig): string[] {
  const route = new Set(buildRoute(building).map((r) => r.id))
  const seen = new Map<string, number>()
  for (const line of building.reportBlocks.flat())
    for (const item of line.items) seen.set(item.location, (seen.get(item.location) ?? 0) + 1)
  const problems: string[] = []
  for (const id of route) if (!seen.has(id)) problems.push(`${building.id}: ${id} is not in the report`)
  for (const [id, n] of seen) {
    if (!route.has(id)) problems.push(`${building.id}: report refers to unknown location ${id}`)
    if (n > 1) problems.push(`${building.id}: ${id} appears ${n} times in the report`)
  }
  return problems
}
