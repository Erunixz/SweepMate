/**
 * Default report template (headings and fixed lines). Location wording lives in
 * `reportBlocks` in buildings.ts. Any field can be overridden from Report → Report template;
 * overrides are saved on the device. Tokens in {braces} are filled in at generation time.
 */
export interface ReportTemplate {
  sweepsHeading: string
  sweepTimesSeparator: string
  notesHeading: string
  /** {date} */
  coverageDate: string
  /** {time} */
  phonePickup: string
  /** {time} */
  shiftStart: string
  /** {time} */
  buildingStart: string
  /** {names} */
  buildingCAs: string
  /** {time} */
  buildingEnd: string
  extraNotesHeading: string
  /** Parts are joined with this between time, location and text. */
  noteSeparator: string
  unanswered: string
  skipped: string
  noneLine: string
}

export const DEFAULT_REPORT_TEMPLATE: ReportTemplate = {
  sweepsHeading: 'SWEEPS:',
  sweepTimesSeparator: ', ',
  notesHeading: 'NOTES:',
  coverageDate: 'Coverage date: {date}',
  phonePickup: 'Coverage phone pick up: {time}',
  shiftStart: 'Start: {time}',
  buildingStart: 'Start time: {time}',
  buildingCAs: 'CAs: {names}',
  buildingEnd: 'End time: {time}',
  extraNotesHeading: 'Extra Notes:',
  noteSeparator: ' — ',
  unanswered: '[not recorded]',
  skipped: '[not checked]',
  noneLine: 'None.',
}

/** Help text for the template editor. */
export const TEMPLATE_FIELD_HELP: Record<keyof ReportTemplate, string> = {
  sweepsHeading: 'Heading above the list of scheduled sweep times',
  sweepTimesSeparator: 'Text between sweep times',
  notesHeading: 'Heading above the coverage details',
  coverageDate: 'Token: {date}',
  phonePickup: 'Token: {time}',
  shiftStart: 'Shift start line. Token: {time}',
  buildingStart: 'Building sweep start. Token: {time}',
  buildingCAs: 'CAs on a building sweep. Token: {names}',
  buildingEnd: 'Building sweep end. Token: {time}',
  extraNotesHeading: 'Heading above extra notes',
  noteSeparator: 'Between time, location and text in a note line',
  unanswered: 'Shown for anything not recorded',
  skipped: 'Shown for a location marked Not Checked',
  noneLine: 'Shown when there are no extra notes',
}
