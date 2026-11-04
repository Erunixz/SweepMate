/**
 * Default coverage-report template. Any field can be overridden from the Report screen;
 * overrides are saved locally. Tokens in {braces} are filled in when the report is generated.
 * Defaults use plain ASCII punctuation so pasted text survives any reporting system.
 */
export interface ReportTemplate {
  /** {date} {weekday} {shiftType} {start} {end} */
  title: string
  /** {cas} {partners} */
  staffLine: string
  /** {n} {scheduled} {actual} */
  sweepHeading: string
  /** {building} {progress} {locations} */
  buildingLine: string
  /** {location} {value} */
  locationItem: string
  locationSeparator: string
  /** {n} {scheduled} {reason} */
  missedSweep: string
  /** Sweep with no data that isn't marked missed. {n} {scheduled} */
  emptySweep: string
  observationsPrefix: string
  unanswered: string
  skipped: string
  workOrdersHeading: string
  incidentsHeading: string
  followUpHeading: string
  notesHeading: string
  noneLine: string
}

export const DEFAULT_REPORT_TEMPLATE: ReportTemplate = {
  title: 'Coverage Report - {weekday}, {date} ({shiftType} shift, {start}-{end})',
  staffLine: 'CAs on shift: {cas}. Partners: {partners}.',
  sweepHeading: 'Sweep {n} ({scheduled}{actual}):',
  buildingLine: '{building}{progress}: {locations}.',
  locationItem: '{location} {value}',
  locationSeparator: ', ',
  missedSweep: 'Sweep {n} ({scheduled}): Not completed - {reason}.',
  emptySweep: 'Sweep {n} ({scheduled}): No data recorded.',
  observationsPrefix: 'Observations:',
  unanswered: '[not recorded]',
  skipped: 'not checked',
  workOrdersHeading: 'Maintenance / work orders:',
  incidentsHeading: 'Incidents (IR/SOC):',
  followUpHeading: 'Follow-up:',
  notesHeading: 'Other notes:',
  noneLine: 'None.',
}

/** Help text for the template editor. */
export const TEMPLATE_FIELD_HELP: Record<keyof ReportTemplate, string> = {
  title: 'Report title. Tokens: {date} {weekday} {shiftType} {start} {end}',
  staffLine: 'Staff line. Tokens: {cas} {partners}',
  sweepHeading: 'Start of each sweep paragraph. Tokens: {n} {scheduled} {actual}',
  buildingLine: 'One building within a sweep. Tokens: {building} {progress} {locations}',
  locationItem: 'One location. Tokens: {location} {value}',
  locationSeparator: 'Text between locations',
  missedSweep: 'Sweep marked as missed. Tokens: {n} {scheduled} {reason}',
  emptySweep: 'Sweep with nothing recorded. Tokens: {n} {scheduled}',
  observationsPrefix: 'Label before observations',
  unanswered: 'Shown for a location with no answer',
  skipped: 'Shown for a location marked Not Checked',
  workOrdersHeading: 'Work-order section heading',
  incidentsHeading: 'IR/SOC section heading',
  followUpHeading: 'Follow-up section heading',
  notesHeading: 'General notes heading',
  noneLine: 'Shown under an empty section',
}
