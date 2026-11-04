import type { NoteKind, NoteStatus } from '../domain/types'

export interface NoteKindMeta {
  label: string
  short: string
  /** Show the reference-number field (work order #, IR #, …). */
  hasReference: boolean
  statuses: { value: NoteStatus; label: string; report: string }[]
}

/**
 * Note categories and their status wording. `report` is the phrase used in the coverage report.
 * Status wording deliberately distinguishes "recorded here" from "submitted/filed" —
 * saving a note in SweepMate never submits anything.
 */
export const NOTE_KINDS: Record<NoteKind, NoteKindMeta> = {
  general: { label: 'General observation', short: 'Observation', hasReference: false, statuses: [] },
  'work-order': {
    label: 'Maintenance issue / work order',
    short: 'Maintenance',
    hasReference: true,
    statuses: [
      { value: 'observed', label: 'Observed – work order not yet submitted', report: 'observed, work order not yet submitted' },
      { value: 'submitted', label: 'Work order submitted', report: 'work order submitted' },
      { value: 'resolved', label: 'Resolved', report: 'resolved' },
    ],
  },
  ir: {
    label: 'Incident Report (IR)',
    short: 'IR',
    hasReference: true,
    statuses: [
      { value: 'not-filed', label: 'Recorded here – IR not yet filed', report: 'IR not yet filed' },
      { value: 'filed', label: 'IR filed in reporting system', report: 'IR filed' },
    ],
  },
  soc: {
    label: 'Student of Concern (SOC)',
    short: 'SOC',
    hasReference: true,
    statuses: [
      { value: 'not-filed', label: 'Recorded here – SOC not yet filed', report: 'SOC not yet filed' },
      { value: 'filed', label: 'SOC filed in reporting system', report: 'SOC filed' },
    ],
  },
  'follow-up': {
    label: 'Outstanding follow-up',
    short: 'Follow-up',
    hasReference: false,
    statuses: [
      { value: 'open', label: 'Open', report: 'open' },
      { value: 'done', label: 'Done', report: 'done' },
    ],
  },
}

export const NOTE_KIND_ORDER: NoteKind[] = ['general', 'work-order', 'ir', 'soc', 'follow-up']
