/** Pure, immutable operations on shifts. Every function returns a new Shift. */
import { newId } from './ids'
import { minutesIntoShift } from './time'
import type { LocationEntry, Note, NoteKind, Shift, ShiftType, Sweep } from './types'

export interface NewShiftInput {
  date: string
  type: ShiftType
  startTime: string
  endTime: string
  caNames: string[]
  partners: string[]
  startingBuildingId: string
  sweepTimes: string[]
  isDemo?: boolean
}

export function createSweep(scheduledTime: string): Sweep {
  return { id: newId(), scheduledTime, actualStart: '', actualEnd: '', missed: false, missedReason: '', buildings: {} }
}

export function createShift(input: NewShiftInput, now = new Date()): Shift {
  const ts = now.toISOString()
  const shift: Shift = {
    id: newId(),
    isDemo: input.isDemo ?? false,
    date: input.date,
    type: input.type,
    startTime: input.startTime,
    endTime: input.endTime,
    caNames: clean(input.caNames),
    partners: clean(input.partners),
    startingBuildingId: input.startingBuildingId,
    sweeps: [],
    notes: [],
    finished: false,
    reportDraft: null,
    createdAt: ts,
    updatedAt: ts,
  }
  return applySchedule(
    shift,
    input.sweepTimes.map((time) => ({ time })),
  )
}

const clean = (names: string[]) => names.map((n) => n.trim()).filter(Boolean)

function touch(shift: Shift): Shift {
  return { ...shift, updatedAt: new Date().toISOString() }
}

export type ShiftDetails = Pick<
  Shift,
  'date' | 'type' | 'startTime' | 'endTime' | 'caNames' | 'partners' | 'startingBuildingId'
>

export function updateDetails(shift: Shift, details: ShiftDetails): Shift {
  return touch({ ...shift, ...details, caNames: clean(details.caNames), partners: clean(details.partners) })
}

/**
 * Replace the sweep schedule. Rows with an `id` keep that sweep's recorded data;
 * rows without one become new sweeps. Sweeps are ordered by time within the shift.
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

export function updateSweep(shift: Shift, sweepId: string, patch: Partial<Omit<Sweep, 'id' | 'buildings'>>): Shift {
  return touch({ ...shift, sweeps: shift.sweeps.map((s) => (s.id === sweepId ? { ...s, ...patch } : s)) })
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
  return touch({
    ...shift,
    sweeps: shift.sweeps.map((s) => {
      if (s.id !== sweepId) return s
      const entries = { ...(s.buildings[buildingId]?.entries ?? {}) }
      if (entry) entries[locationId] = entry
      else delete entries[locationId]
      return { ...s, buildings: { ...s.buildings, [buildingId]: { entries } } }
    }),
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
