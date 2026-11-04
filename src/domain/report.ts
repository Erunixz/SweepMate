/**
 * Coverage-report generation. Output is plain text. Only recorded data is reported:
 * unanswered locations are labelled as such, and nothing is filled in on the user's behalf.
 */
import { BUILDINGS, REPORT_BUILDING_ORDER } from '../config/buildings'
import { NOTE_KINDS } from '../config/noteKinds'
import { DEFAULT_REPORT_TEMPLATE, type ReportTemplate } from '../config/reportTemplate'
import { SHIFT_TEMPLATES } from '../config/schedules'
import { buildingProgress } from './progress'
import { getBuilding, getReportRoute } from './route'
import { sortNotes } from './shift'
import { formatDateLong, weekdayName } from './time'
import type { Note, NoteKind, Shift, Sweep } from './types'

export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in values ? values[key]! : m))
}

/** Single line, trimmed, no stray whitespace — safe to drop into a paragraph. */
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim()
const stripEndPunct = (s: string) => s.replace(/[.\s]+$/, '')

/** Buildings in report order; any building missing from REPORT_BUILDING_ORDER is appended. */
export function reportBuildingIds(): string[] {
  const listed = REPORT_BUILDING_ORDER.filter((id) => getBuilding(id))
  return [...listed, ...BUILDINGS.map((b) => b.id).filter((id) => !listed.includes(id))]
}

function actualTimes(sweep: Sweep): string {
  if (sweep.actualStart && sweep.actualEnd) return `; ${sweep.actualStart}-${sweep.actualEnd}`
  if (sweep.actualStart) return `; started ${sweep.actualStart}, end time not recorded`
  if (sweep.actualEnd) return `; start time not recorded, ended ${sweep.actualEnd}`
  return ''
}

const hasAnyEntry = (sweep: Sweep) => Object.values(sweep.buildings).some((b) => Object.keys(b.entries).length > 0)

export function generateSweepParagraph(shift: Shift, sweepIndex: number, t: ReportTemplate = DEFAULT_REPORT_TEMPLATE): string {
  const sweep = shift.sweeps[sweepIndex]
  if (!sweep) return ''
  const n = String(sweepIndex + 1)
  const scheduled = sweep.scheduledTime

  if (sweep.missed) return fill(t.missedSweep, { n, scheduled, reason: stripEndPunct(oneLine(sweep.missedReason)) || 'reason not recorded' })
  if (!hasAnyEntry(sweep)) return fill(t.emptySweep, { n, scheduled })

  const parts = [fill(t.sweepHeading, { n, scheduled, actual: actualTimes(sweep) })]

  for (const buildingId of reportBuildingIds()) {
    const building = getBuilding(buildingId)!
    const entries = sweep.buildings[buildingId]?.entries ?? {}
    const p = buildingProgress(sweep, buildingId)
    const route = getReportRoute(buildingId)

    if (p.answered + p.skipped === 0) {
      parts.push(`${building.name}: ${t.unanswered}.`)
      continue
    }

    const items = route.map((loc) => {
      const e = entries[loc.id]
      const value = !e ? t.unanswered : e.state === 'skipped' ? t.skipped : loc.kind === 'status' ? (e.status ?? t.unanswered) : String(e.count)
      return fill(t.locationItem, { location: loc.label, value })
    })
    const progress = p.unanswered > 0 ? ` (incomplete - ${p.answered + p.skipped} of ${p.total} recorded)` : ''
    let line = fill(t.buildingLine, { building: building.name, progress, locations: items.join(t.locationSeparator) })

    const observations = route
      .map((loc) => ({ loc, obs: oneLine(entries[loc.id]?.observation ?? '') }))
      .filter((o) => o.obs)
      .map((o) => `${o.loc.label} - ${stripEndPunct(o.obs)}`)
    if (observations.length) line += ` ${t.observationsPrefix} ${observations.join('; ')}.`
    parts.push(line)
  }
  return parts.join(' ')
}

function noteLine(shift: Shift, note: Note): string {
  const meta = NOTE_KINDS[note.kind]
  const sweepIdx = shift.sweeps.findIndex((s) => s.id === note.sweepId)
  const head = [note.time, sweepIdx >= 0 ? `Sweep ${sweepIdx + 1}` : '', oneLine(note.location)].filter(Boolean).join(', ')
  const label = note.kind === 'ir' || note.kind === 'soc' ? `${meta.short} ` : ''
  const pieces = [`${label}${head ? `${head}: ` : ''}${stripEndPunct(oneLine(note.description))}.`]
  if (note.action.trim()) pieces.push(`Action: ${stripEndPunct(oneLine(note.action))}.`)
  if (note.contacts.trim()) pieces.push(`Contacted: ${stripEndPunct(oneLine(note.contacts))}.`)
  if (note.reference.trim()) pieces.push(`Ref #${oneLine(note.reference)}.`)
  const status = meta.statuses.find((s) => s.value === note.status)
  if (status) pieces.push(`Status: ${status.report}.`)
  if (note.followUp.trim()) pieces.push(`Follow-up: ${stripEndPunct(oneLine(note.followUp))}.`)
  return `- ${pieces.join(' ')}`
}

function noteSection(shift: Shift, heading: string, kinds: NoteKind[], none: string): string {
  const notes = sortNotes(
    shift,
    shift.notes.filter((n) => kinds.includes(n.kind)),
  )
  return [heading, ...(notes.length ? notes.map((n) => noteLine(shift, n)) : [none])].join('\n')
}

export function generateReport(shift: Shift, t: ReportTemplate = DEFAULT_REPORT_TEMPLATE): string {
  const tpl = SHIFT_TEMPLATES[shift.type]
  const blocks: string[] = []
  if (shift.isDemo) blocks.push('[DEMO - fictional data, not a real report]')

  blocks.push(
    [
      fill(t.title, {
        date: formatDateLong(shift.date),
        weekday: weekdayName(shift.date),
        shiftType: tpl.label,
        start: shift.startTime,
        end: shift.endTime,
      }),
      fill(t.staffLine, {
        cas: shift.caNames.join(', ') || 'not recorded',
        partners: shift.partners.join(', ') || 'none listed',
      }),
    ].join('\n'),
  )

  shift.sweeps.forEach((_, i) => blocks.push(generateSweepParagraph(shift, i, t)))

  blocks.push(noteSection(shift, t.workOrdersHeading, ['work-order'], t.noneLine))
  blocks.push(noteSection(shift, t.incidentsHeading, ['ir', 'soc'], t.noneLine))
  blocks.push(noteSection(shift, t.followUpHeading, ['follow-up'], t.noneLine))
  // The general-notes section is only included when there are general notes.
  if (shift.notes.some((n) => n.kind === 'general')) blocks.push(noteSection(shift, t.notesHeading, ['general'], t.noneLine))

  return cleanText(blocks.join('\n\n'))
}

/** Normalise to clean plain text: no trailing spaces, no runs of blank lines, single trailing newline. */
export function cleanText(s: string): string {
  return (
    s
      .replace(/\r\n?/g, '\n')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .split('\n')
      .map((l) => l.replace(/[ \t]+$/g, ''))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n'
  )
}

export function reportFileName(shift: Shift): string {
  return `${shift.isDemo ? 'DEMO-' : ''}coverage-report-${shift.date}.txt`
}
