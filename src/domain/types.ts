/** Core data model. Everything here is plain JSON so it can be saved to localStorage as-is. */

export type ShiftType = 'weekday' | 'weekend' | 'peak'

/** "count" locations record an occupancy number; "status" locations pick from a fixed list (e.g. B103). */
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

export type WingLocationDef = LocationDef & { wing: string }

/**
 * Walk floors top-down, alternating direction each floor:
 * first floor wings[0] → wings[1], next floor wings[1] → wings[0], and so on.
 */
export interface AlternatingLayout {
  type: 'alternating'
  /** Floors in walking order (descending). */
  floors: string[]
  /** [first-direction start, end], e.g. [South, North]. */
  wings: [WingDef, WingDef]
  /** Locations along one floor, ordered from the wings[0] end to the wings[1] end. */
  floorLocations: WingLocationDef[]
  /** Optional per-floor replacement for floorLocations. */
  floorOverrides?: Record<string, WingLocationDef[]>
  /** Stops walked before the first floor / after the last floor. */
  before?: SequenceStop[]
  after?: SequenceStop[]
}

export interface BuildingConfig {
  id: string
  name: string
  shortName: string
  layout: SequenceLayout | AlternatingLayout
  /**
   * Report display order, independent of walking order.
   * 'walking' = same as walk; 'by-floor' = every floor wings[0] → wings[1] (alternating only);
   * or an explicit list of route-location ids (unlisted ones are appended in walking order).
   */
  reportOrder?: 'walking' | 'by-floor' | string[]
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
  /** For alternating layouts: the direction walked on this floor, e.g. "South → North". */
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

export interface BuildingSweep {
  entries: Record<string, LocationEntry>
}

export interface Sweep {
  id: string
  /** Scheduled time, HH:MM (24h). Times earlier than the shift start fall on the next day. */
  scheduledTime: string
  actualStart: string
  actualEnd: string
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
  /** YYYY-MM-DD the shift starts on. */
  date: string
  type: ShiftType
  startTime: string
  endTime: string
  caNames: string[]
  partners: string[]
  startingBuildingId: string
  sweeps: Sweep[]
  notes: Note[]
  finished: boolean
  /** User-edited report text; null means use the generated report. */
  reportDraft: string | null
  createdAt: string
  updatedAt: string
}
