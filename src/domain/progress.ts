import { getRoute, shiftBuildings } from './route'
import { sweepBuildingCAs } from './shift'
import { formatTime12 } from './time'
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
  return shiftBuildings(shift).reduce(
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

/** Shift and building details the report needs but that haven't been recorded. */
export function missingDetails(shift: Shift): string[] {
  const out: string[] = []
  if (shift.sweeps.length === 0) out.push('Scheduled sweep times')
  shift.sweeps.forEach((sweep) => {
    for (const b of shiftBuildings(shift)) {
      const bs = sweep.buildings[b.id]
      const label = `${formatTime12(sweep.scheduledTime)} ${b.name}`
      if (!bs?.actualStart) out.push(`${label}: start time`)
      if (!bs?.actualEnd) out.push(`${label}: end time`)
      if (!sweepBuildingCAs(shift, sweep, b.id).length) out.push(`${label}: CAs`)
    }
  })
  return out
}

/**
 * Unanswered locations across the shift.
 * Explicitly skipped (Not Checked) locations are *not* missing.
 */
export function missingEntries(shift: Shift): MissingGroup[] {
  const groups: MissingGroup[] = []
  shift.sweeps.forEach((sweep, i) => {
    for (const b of shiftBuildings(shift)) {
      const entries = sweep.buildings[b.id]?.entries ?? {}
      const locations = getRoute(b.id).filter((loc) => !entries[loc.id])
      if (locations.length) groups.push({ sweep, sweepNumber: i + 1, buildingId: b.id, locations })
    }
  })
  return groups
}
