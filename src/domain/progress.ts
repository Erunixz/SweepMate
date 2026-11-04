import { getRoute, walkingBuildingOrder } from './route'
import type { RouteLocation, Shift, Sweep } from './types'

export interface Progress {
  total: number
  answered: number
  skipped: number
  unanswered: number
}

const empty = (): Progress => ({ total: 0, answered: 0, skipped: 0, unanswered: 0 })

function add(a: Progress, b: Progress): Progress {
  return {
    total: a.total + b.total,
    answered: a.answered + b.answered,
    skipped: a.skipped + b.skipped,
    unanswered: a.unanswered + b.unanswered,
  }
}

export function buildingProgress(sweep: Sweep, buildingId: string): Progress {
  const entries = sweep.buildings[buildingId]?.entries ?? {}
  return getRoute(buildingId).reduce((p, loc) => {
    const e = entries[loc.id]
    p.total++
    if (!e) p.unanswered++
    else if (e.state === 'skipped') p.skipped++
    else p.answered++
    return p
  }, empty())
}

export function sweepProgress(shift: Shift, sweep: Sweep): Progress {
  return walkingBuildingOrder(shift.startingBuildingId).reduce(
    (p, b) => add(p, buildingProgress(sweep, b.id)),
    empty(),
  )
}

/** A building/sweep counts as "done" once nothing is left unanswered. */
export const isDone = (p: Progress) => p.total > 0 && p.unanswered === 0
export const hasStarted = (p: Progress) => p.answered + p.skipped > 0

export function firstUnansweredIndex(sweep: Sweep, buildingId: string): number {
  const entries = sweep.buildings[buildingId]?.entries ?? {}
  const idx = getRoute(buildingId).findIndex((loc) => !entries[loc.id])
  return idx === -1 ? 0 : idx
}

export interface MissingGroup {
  sweep: Sweep
  sweepNumber: number
  buildingId: string
  locations: RouteLocation[]
}

/**
 * Unanswered locations across the shift, for sweeps not marked as missed.
 * Explicitly skipped (Not Checked) locations are *not* missing.
 */
export function missingEntries(shift: Shift): MissingGroup[] {
  const groups: MissingGroup[] = []
  shift.sweeps.forEach((sweep, i) => {
    if (sweep.missed) return
    for (const b of walkingBuildingOrder(shift.startingBuildingId)) {
      const entries = sweep.buildings[b.id]?.entries ?? {}
      const locations = getRoute(b.id).filter((loc) => !entries[loc.id])
      if (locations.length) groups.push({ sweep, sweepNumber: i + 1, buildingId: b.id, locations })
    }
  })
  return groups
}
