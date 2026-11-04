/** Pure, immutable operations on shifts. Every function returns a new Shift. */
import { newId } from './ids'
import { getBuilding } from './route'
import { minutesIntoShift } from './time'
import type { BuildingSweep, LocationEntry, Note, NoteKind, Shift, ShiftType, Sweep } from './types'

export interface ShiftDetails {
  date: string
  type: ShiftType
  phonePickup: string
  startTime: string
  endTime: string
  myName: string
  otherCAs: string[]
  buildingCAs: Record<string, string[]>
  startingBuildingId: string
}

export interface NewShiftInput extends ShiftDetails {
  sweepTimes: string[]
  isDemo?: boolean
}

export function createSweep(scheduledTime: string): Sweep {
  return { id: newId(), scheduledTime, buildings: {} }
}

export function emptyBuildingSweep(): BuildingSweep {
  return { entries: {}, actualStart: '', actualEnd: '', cas: null }
}

const clean = (names: string[]) => names.map((n) => n.trim()).filter(Boolean)

function cleanDetails(d: ShiftDetails): ShiftDetails {
  return {
    ...d,
    myName: d.myName.trim(),
    otherCAs: clean(d.otherCAs),
    buildingCAs: Object.fromEntries(Object.entries(d.buildingCAs).map(([b, names]) => [b, clean(names)])),
  }
}

export function createShift(input: NewShiftInput, now = new Date()): Shift {
  const ts = now.toISOString()
  const { sweepTimes, isDemo, ...details } = input
  const shift: Shift = {
    id: newId(),
    mode: 'full',
    quickBuildingId: null,
    isDemo: isDemo ?? false,
    ...cleanDetails(details),
    sweeps: [],
    notes: [],
    extraNotes: '',
    finished: false,
    reportDraft: null,
    createdAt: ts,
    updatedAt: ts,
  }
  return applySchedule(
    shift,
    sweepTimes.map((time) => ({ time })),
  )
}

/** A single-building sweep uses the same storage and recording model as full coverage. */
export function createQuickShift(input: { date: string; buildingId: string; time: string; myName?: string; otherCAs?: string[] }): Shift {
  if (!getBuilding(input.buildingId)) throw new Error('Choose a valid building.')
  const names = caPool({ myName: input.myName ?? '', otherCAs: input.otherCAs ?? [] })
  const shift = createShift({
    date: input.date, type: 'weekday', phonePickup: '', startTime: input.time, endTime: '',
    myName: input.myName ?? '', otherCAs: input.otherCAs ?? [],
    buildingCAs: { [input.buildingId]: names }, startingBuildingId: input.buildingId,
    sweepTimes: [input.time],
  })
  return { ...shift, mode: 'quick', quickBuildingId: input.buildingId }
}

function touch(shift: Shift): Shift {
  return { ...shift, updatedAt: new Date().toISOString() }
}

export function updateDetails(shift: Shift, details: ShiftDetails): Shift {
  return touch({ ...shift, ...cleanDetails(details) })
}

/** Everyone on coverage: my name followed by the other CAs. */
export function caPool(shift: Pick<Shift, 'myName' | 'otherCAs'>): string[] {
  return clean([shift.myName, ...shift.otherCAs]).filter((n, i, all) => all.indexOf(n) === i)
}

/** CAs who swept a building in a sweep: the per-sweep override, else the shift default. */
export function sweepBuildingCAs(shift: Shift, sweep: Sweep, buildingId: string): string[] {
  return sweep.buildings[buildingId]?.cas ?? shift.buildingCAs[buildingId] ?? []
}

/**
 * Replace the sweep schedule. Rows with an `id` keep that sweep's recorded data;
 * rows without one become new, empty sweeps. Sweeps are ordered by time within the shift.
 */
export function applySchedule(shift: Shift, rows: { id?: string; time: string }[]): Shift {
  const existing = new Map(shift.sweeps.map((s) => [s.id, s]))
  const sweeps = rows
    .map((row) => {
      const prev = row.id ? existing.get(row.id) : undefined
      return prev ? { ...prev, scheduledTime: row.time } : createSweep(row.time)
    })
    .sort(
      (a, b) => minutesIntoShift(shift.startTime, a.scheduledTime) - minutesIntoShift(shift.startTime, b.scheduledTime),
    )
  const kept = new Set(sweeps.map((s) => s.id))
  // Notes tied to a removed sweep become shift-level notes rather than disappearing.
  const notes = shift.notes.map((n) => (n.sweepId && !kept.has(n.sweepId) ? { ...n, sweepId: null } : n))
  return touch({ ...shift, sweeps, notes })
}

export function updateBuildingSweep(
  shift: Shift,
  sweepId: string,
  buildingId: string,
  fn: (b: BuildingSweep) => BuildingSweep,
): Shift {
  return touch({
    ...shift,
    sweeps: shift.sweeps.map((s) =>
      s.id === sweepId
        ? { ...s, buildings: { ...s.buildings, [buildingId]: fn(s.buildings[buildingId] ?? emptyBuildingSweep()) } }
        : s,
    ),
  })
}

export function getEntry(
  shift: Shift,
  sweepId: string,
  buildingId: string,
  locationId: string,
): LocationEntry | undefined {
  return shift.sweeps.find((s) => s.id === sweepId)?.buildings[buildingId]?.entries[locationId]
}

/** Set or (with `null`) clear an entry — clearing returns the location to "unanswered". */
export function setEntry(
  shift: Shift,
  sweepId: string,
  buildingId: string,
  locationId: string,
  entry: LocationEntry | null,
): Shift {
  return updateBuildingSweep(shift, sweepId, buildingId, (b) => {
    const entries = { ...b.entries }
    if (entry) entries[locationId] = entry
    else delete entries[locationId]
    return { ...b, entries }
  })
}

export function createNote(kind: NoteKind, init: Partial<Note> = {}): Note {
  const ts = new Date().toISOString()
  return {
    id: newId(),
    kind,
    sweepId: null,
    buildingId: null,
    location: '',
    time: '',
    description: '',
    action: '',
    contacts: '',
    reference: '',
    status: defaultStatus(kind),
    followUp: '',
    createdAt: ts,
    updatedAt: ts,
    ...init,
  }
}

export function defaultStatus(kind: NoteKind): Note['status'] {
  switch (kind) {
    case 'work-order':
      return 'observed'
    case 'ir':
    case 'soc':
      return 'not-filed'
    case 'follow-up':
      return 'open'
    default:
      return ''
  }
}

export function upsertNote(shift: Shift, note: Note): Shift {
  const updated = { ...note, updatedAt: new Date().toISOString() }
  const exists = shift.notes.some((n) => n.id === note.id)
  return touch({
    ...shift,
    notes: exists ? shift.notes.map((n) => (n.id === note.id ? updated : n)) : [...shift.notes, updated],
  })
}

export function deleteNote(shift: Shift, noteId: string): Shift {
  return touch({ ...shift, notes: shift.notes.filter((n) => n.id !== noteId) })
}

export function sortNotes(shift: Shift, notes: Note[]): Note[] {
  return [...notes].sort(
    (a, b) =>
      (a.time ? minutesIntoShift(shift.startTime, a.time) : 9999) -
        (b.time ? minutesIntoShift(shift.startTime, b.time) : 9999) || a.createdAt.localeCompare(b.createdAt),
  )
}
