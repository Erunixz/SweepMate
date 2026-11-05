/**
 * Report template (headings and fixed lines) matching the StarRez format. Location wording
 * lives in `reportBlocks` in buildings.ts. Tokens in {braces} are filled in at generation time.
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
  /** Joins the time, location and type in each note's heading line. */
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
