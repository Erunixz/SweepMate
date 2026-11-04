/** Core data model. Everything here is plain JSON so it can be saved to localStorage as-is. */

export type ShiftType = 'weekday' | 'weekend' | 'peak'

/** "count" locations record an occupancy number; "status" locations pick from a fixed list. */
export type LocationKind = 'count' | 'status'

/* ---------- Building configuration (editable in src/config/buildings.ts) ---------- */

export interface LocationDef {
  id: string
  label: string
  kind?: LocationKind
  statusOptions?: string[]
}

export interface SequenceStop {
  /** Group heading shown in progress and revisit lists, e.g. "Floor 3". */
  section: string
  locations: LocationDef[]
}

export interface WingDef {
  id: string
  name: string
}

/** Walk the stops exactly in the order listed. */
export interface SequenceLayout {
  type: 'sequence'
  stops: SequenceStop[]
}

export type FloorLocationDef = LocationDef & { wing?: string }

/**
 * Walk floors top-down. On winged floors the side visited first alternates each floor
 * (wings[0] first on the top floor), while the order within a side stays the same.
 */
export interface AlternatingLayout {
  type: 'alternating'
  /** Floors in walking order (descending). */
  floors: string[]
  /** wings[0] is walked first on the top floor. */
  wings: [WingDef, WingDef]
  /** Locations on a winged floor, each tagged with its wing, in within-wing walking order. */
  floorLocations: FloorLocationDef[]
  /** Floors with a different layout. Locations without a wing are walked in the order listed. */
  floorOverrides?: Record<string, FloorLocationDef[]>
  /** Stops walked before the first floor / after the last floor. */
  before?: SequenceStop[]
  after?: SequenceStop[]
}

/** One item in a report line; `text` uses {count}, e.g. "{count} in north kitchen". */
export interface ReportItem {
  location: string
  text: string
}

/** Renders as "label: item; item." */
export interface ReportLine {
  label: string
  items: ReportItem[]
}

export interface BuildingConfig {
  id: string
  name: string
  layout: SequenceLayout | AlternatingLayout
  /**
   * Report display order and wording, independent of walking order. Blocks are separated
   * by a blank line. Every route location must appear exactly once.
   */
  reportBlocks: ReportLine[][]
}

/** A single flattened stop on a walking route. Ids are unique within a building. */
export interface RouteLocation {
  id: string
  label: string
  section: string
  kind: LocationKind
  statusOptions?: string[]
  floor?: string
  wing?: string
  /** For winged floors: the direction walked on this floor, e.g. "South → North". */
  direction?: string
}

/* ---------- Shift data ---------- */

/** No entry at all means "unanswered". */
export interface LocationEntry {
  state: 'answered' | 'skipped'
  /** Present for answered count locations. 0 is a real answer. */
  count?: number
  /** Present for answered status locations. */
  status?: string
  observation: string
  updatedAt: string
}

/** One building within one sweep: its own answers, times and CAs. */
export interface BuildingSweep {
  entries: Record<string, LocationEntry>
  actualStart: string
  actualEnd: string
  /** CAs who swept this building this sweep; null = use the shift's default for the building. */
  cas: string[] | null
}

export interface Sweep {
  id: string
  /** Scheduled time, HH:MM (24h). Times earlier than the shift start fall on the next day. */
  scheduledTime: string
  missed: boolean
  missedReason: string
  buildings: Record<string, BuildingSweep>
}

export type NoteKind = 'general' | 'work-order' | 'ir' | 'soc' | 'follow-up'

export type WorkOrderStatus = 'observed' | 'submitted' | 'resolved'
export type ReportStatus = 'not-filed' | 'filed'
export type FollowUpStatus = 'open' | 'done'
export type NoteStatus = WorkOrderStatus | ReportStatus | FollowUpStatus | ''

export interface Note {
  id: string
  kind: NoteKind
  /** Sweep the note belongs to, or null for shift-level notes. */
  sweepId: string | null
  buildingId: string | null
  location: string
  time: string
  description: string
  action: string
  contacts: string
  reference: string
  /** Meaning depends on kind; empty for general notes. */
  status: NoteStatus
  followUp: string
  createdAt: string
  updatedAt: string
}

export interface Shift {
  id: string
  isDemo: boolean
  /** Coverage date (YYYY-MM-DD) — the date the shift starts on. */
  date: string
  type: ShiftType
  /** Coverage phone pick-up time, HH:MM, or '' if not recorded. */
  phonePickup: string
  startTime: string
  endTime: string
  myName: string
  otherCAs: string[]
  /** Default CAs sweeping each building, by building id. */
  buildingCAs: Record<string, string[]>
  startingBuildingId: string
  sweeps: Sweep[]
  notes: Note[]
  /** Free-text Extra Notes, printed under the report's Extra Notes heading. */
  extraNotes: string
  finished: boolean
  /** User-edited report text; null means use the generated report. */
  reportDraft: string | null
  createdAt: string
  updatedAt: string
}
