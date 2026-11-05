/**
 * Coverage-report generation in the heading-based plain-text format. Only recorded data is
 * reported: anything missing is labelled, and nothing is filled in on the user's behalf.
 */
import { NOTE_KINDS } from '../config/noteKinds'
import { DEFAULT_REPORT_TEMPLATE, type ReportTemplate } from '../config/reportTemplate'
import { getRoute, reportBuildingOrder, shiftBuildings } from './route'
import { sortNotes, sweepBuildingCAs } from './shift'
import { formatDateLong, formatTime12, joinNames } from './time'
import type { BuildingConfig, Note, Shift, Sweep } from './types'

export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => (key in values ? values[key]! : m))
}

/** Single line, trimmed, no stray whitespace. */
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim()
const stripEndPunct = (s: string) => s.replace(/[.\s]+$/, '')
const time = (t: string, missing: string) => formatTime12(t) || missing

function buildingSection(shift: Shift, sweep: Sweep, building: BuildingConfig, t: ReportTemplate): string {
  const bs = sweep.buildings[building.id]
  const entries = bs?.entries ?? {}
  const kinds = new Map(getRoute(building.id).map((r) => [r.id, r]))
  const cas = sweepBuildingCAs(shift, sweep, building.id)

  const value = (locationId: string) => {
    const e = entries[locationId]
    if (!e) return t.unanswered
    if (e.state === 'skipped') return t.skipped
    return kinds.get(locationId)?.kind === 'status' ? (e.status ?? t.unanswered) : String(e.count)
  }

  const blocks = building.reportBlocks.map((block) =>
    block
      .map((line) => {
        const items = line.items.map((item) => fill(item.text, { count: value(item.location) }))
        return line.separateItems
          ? `${line.label}:\n${items.map((item) => `${item}.`).join('\n')}`
          : `${line.label}: ${items.join('; ')}.`
      })
      .join('\n'),
  )

  const observations = getRoute(building.id)
    .map((loc) => ({ loc, obs: oneLine(entries[loc.id]?.observation ?? '') }))
    .filter((o) => o.obs)
    .map((o) => `${o.loc.label}: ${stripEndPunct(o.obs)}.`)
  if (observations.length) blocks.push(observations.join('\n'))

  return [
    [
      building.name,
      fill(t.buildingStart, { time: time(bs?.actualStart ?? '', t.unanswered) }),
      fill(t.buildingCAs, { names: cas.length ? joinNames(cas) : t.unanswered }),
    ].join('\n'),
    ...blocks,
    fill(t.buildingEnd, { time: time(bs?.actualEnd ?? '', t.unanswered) }),
  ].join('\n\n')
}

/** One sweep: its time heading followed by each building's section. */
export function generateSweepSection(shift: Shift, sweepIndex: number, t: ReportTemplate = DEFAULT_REPORT_TEMPLATE): string {
  const sweep = shift.sweeps[sweepIndex]
  if (!sweep) return ''
  if (shift.mode === 'quick') return cleanText(shiftBuildings(shift).map((b) => buildingSection(shift, sweep, b, t)).join('\n\n'))
  const heading = formatTime12(sweep.scheduledTime)
  return cleanText([heading, ...reportBuildingOrder().map((b) => buildingSection(shift, sweep, b, t))].join('\n\n'))
}

const sentence = (s: string) => {
  const line = stripEndPunct(oneLine(s))
  return line ? `${line.charAt(0).toUpperCase()}${line.slice(1)}.` : ''
}

/** Multi-line text keeps the user's line breaks: one tidy sentence per non-empty line. */
const paragraph = (s: string) =>
  s
    .split('\n')
    .map(sentence)
    .filter(Boolean)
    .join('\n')

/**
 * One note as a small block that reads well once pasted:
 *
 *   12:15 AM — Les Prince Floor 3 — Maintenance
 *   Ceiling leak.
 *   - Actions taken: Placed bucket.
 *   - Status: Observed, work order not yet submitted.
 */
function noteBlock(note: Note, t: ReportTemplate): string {
  const meta = NOTE_KINDS[note.kind]
  const heading = [formatTime12(note.time), oneLine(note.location), note.kind === 'general' ? '' : meta.short]
    .filter(Boolean)
    .join(t.noteSeparator)
  const status = meta.statuses.find((s) => s.value === note.status)
  const detail = (label: string, value: string) => (value ? `- ${label}: ${value}` : '')
  return [
    heading,
    paragraph(note.description) || t.unanswered,
    detail('Actions taken', sentence(note.action)),
    detail('Contacted', sentence(note.contacts)),
    detail('Ref', oneLine(note.reference) && `#${oneLine(note.reference).replace(/^#/, '')}`),
    detail('Status', status ? sentence(status.report) : ''),
    detail('Follow-up', sentence(note.followUp)),
  ]
    .filter(Boolean)
    .join('\n')
}

export function generateReport(shift: Shift, t: ReportTemplate = DEFAULT_REPORT_TEMPLATE): string {
  const blocks: string[] = []

  if (shift.mode === 'full') {
    const times = shift.sweeps.map((s) => formatTime12(s.scheduledTime))
    blocks.push(`${t.sweepsHeading}\n${times.length ? times.join(t.sweepTimesSeparator) : t.unanswered}`)
    blocks.push(
      [
        t.notesHeading,
        fill(t.coverageDate, { date: formatDateLong(shift.date) }),
        fill(t.shiftStart, { time: time(shift.startTime, t.unanswered) }),
      ].join('\n'),
    )
  }
  shift.sweeps.forEach((_, i) => blocks.push(generateSweepSection(shift, i, t)))

  // Free-text lines stay together; each recorded note is its own block, separated by a blank line.
  const freeText = shift.extraNotes
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
  const extra = [freeText, ...sortNotes(shift, shift.notes).map((n) => noteBlock(n, t))].filter(Boolean)
  if (shift.mode === 'full' || extra.length) blocks.push(`${t.extraNotesHeading}\n${extra.length ? extra.join('\n\n') : t.noneLine}`)

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
  return `${shift.mode === 'quick' ? `quick-sweep-${shift.quickBuildingId}` : 'coverage-report'}-${shift.date}.txt`
}
