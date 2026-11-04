import type { BuildingConfig, ReportLine } from '../domain/types'

/**
 * Building layouts, walking routes and report wording.
 *
 * Location ids must be unique within a building and should stay stable once shifts exist,
 * because saved counts are keyed by them. Les Prince ids are generated as `f{floor}-{id}`
 * (e.g. `f6-north-study`); its games and laundry rooms keep their plain ids.
 * The tests check that every route location appears exactly once in `reportBlocks`.
 */

const WOODSTOCK_FLOORS = ['6', '5', '4', '3', '2', '1']
const LP_WINGED_FLOORS = ['6', '5', '4', '3', '2']

/** Les Prince report lines are always north-first, regardless of walking direction. */
const lpFloorLine = (floor: string): ReportLine => ({
  label: floor,
  separateItems: true,
  items: [
    { location: `f${floor}-north-study`, text: '{count} in north study room' },
    { location: `f${floor}-north-kitchen`, text: '{count} in north kitchen' },
    { location: `f${floor}-south-study`, text: '{count} in south study room' },
    { location: `f${floor}-south-kitchen`, text: '{count} in south kitchen' },
  ],
})

export const BUILDINGS: BuildingConfig[] = [
  {
    id: 'woodstock',
    name: 'Woodstock',
    layout: {
      type: 'sequence',
      stops: [
        ...WOODSTOCK_FLOORS.filter((f) => f !== '1').map((f) => ({
          section: `Floor ${f}`,
          locations: [{ id: `f${f}-common`, label: `Floor ${f} common room` }],
        })),
        {
          section: 'Basement',
          locations: [
            { id: 'study-101e', label: 'Study room 101E' },
            { id: 'study-101c', label: 'Study room 101C' },
            { id: 'laundry', label: 'Laundry room' },
            { id: 'games', label: 'Games room' },
          ],
        },
        {
          section: 'First floor',
          locations: [
            { id: 'north-kitchen', label: 'First-floor north kitchen' },
            { id: 'f1-common', label: 'Floor 1 common room' },
          ],
        },
      ],
    },
    reportBlocks: [
      WOODSTOCK_FLOORS.map((f) => ({ label: f, items: [{ location: `f${f}-common`, text: '{count} in common room' }] })),
      [
        { label: '1st-floor north kitchen', items: [{ location: 'north-kitchen', text: '{count}' }] },
        { label: 'Study room 101E', items: [{ location: 'study-101e', text: '{count}' }] },
        { label: 'Study room 101C', items: [{ location: 'study-101c', text: '{count}' }] },
        { label: 'Laundry room', items: [{ location: 'laundry', text: '{count}' }] },
        { label: 'Games room', items: [{ location: 'games', text: '{count}' }] },
      ],
    ],
  },
  {
    id: 'lp',
    name: 'Les Prince',
    layout: {
      type: 'alternating',
      floors: [...LP_WINGED_FLOORS, '1'],
      wings: [
        { id: 'S', name: 'South' },
        { id: 'N', name: 'North' },
      ],
      floorLocations: [
        { id: 'south-study', label: 'South study room', wing: 'S' },
        { id: 'south-kitchen', label: 'South kitchen', wing: 'S' },
        { id: 'north-study', label: 'North study room', wing: 'N' },
        { id: 'north-kitchen', label: 'North kitchen', wing: 'N' },
      ],
      // Floor 1 has a single study room and kitchen — no north/south pairs.
      floorOverrides: {
        '1': [
          { id: 'study', label: 'Study room' },
          { id: 'kitchen', label: 'Kitchen' },
        ],
      },
      after: [
        {
          section: 'Shared rooms',
          locations: [
            { id: 'games', label: 'Games room' },
            { id: 'laundry', label: 'Laundry room' },
          ],
        },
      ],
    },
    reportBlocks: [
      ...LP_WINGED_FLOORS.map((f) => [lpFloorLine(f)]),
      [
        {
          label: '1',
          separateItems: true,
          items: [
            { location: 'f1-study', text: '{count} in study room' },
            { location: 'f1-kitchen', text: '{count} in kitchen' },
          ],
        },
      ],
      [
        { label: 'Games room', items: [{ location: 'games', text: '{count}' }] },
        { label: 'Laundry room', items: [{ location: 'laundry', text: '{count}' }] },
      ],
    ],
  },
]

/** Order buildings appear within each sweep in the report (independent of the starting building). */
export const REPORT_BUILDING_ORDER: string[] = ['woodstock', 'lp']
