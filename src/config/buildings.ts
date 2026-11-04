import type { BuildingConfig } from '../domain/types'

/**
 * Building layouts and walking routes.
 *
 * ⚠ PLACEHOLDER LAYOUTS: the specification's exact Woodstock route and LP floor plan were not
 * available when this was written. Replace the stops/locations below with the real ones —
 * the walkthrough, progress views and report all adapt automatically.
 *
 * Location ids must be unique within a building and should stay stable once shifts exist,
 * because saved counts are keyed by them.
 */
export const BUILDINGS: BuildingConfig[] = [
  {
    id: 'woodstock',
    name: 'Woodstock',
    shortName: 'WS',
    layout: {
      type: 'sequence',
      stops: [
        {
          section: 'Main floor',
          locations: [
            { id: 'lobby', label: 'Lobby' },
            { id: 'main-lounge', label: 'Main lounge' },
          ],
        },
        {
          section: 'Floor 4',
          locations: [
            { id: 'f4-lounge', label: '4th floor lounge' },
            { id: 'f4-study', label: '4th floor study room' },
          ],
        },
        {
          section: 'Floor 3',
          locations: [
            { id: 'f3-lounge', label: '3rd floor lounge' },
            { id: 'f3-study', label: '3rd floor study room' },
          ],
        },
        {
          section: 'Floor 2',
          locations: [
            { id: 'f2-lounge', label: '2nd floor lounge' },
            { id: 'f2-study', label: '2nd floor study room' },
          ],
        },
        {
          section: 'Basement',
          locations: [
            { id: 'laundry', label: 'Laundry room' },
            { id: 'games', label: 'Games room' },
          ],
        },
      ],
    },
    reportOrder: 'walking',
  },
  {
    id: 'lp',
    name: 'LP',
    shortName: 'LP',
    layout: {
      type: 'alternating',
      floors: ['6', '5', '4', '3', '2', '1'],
      wings: [
        { id: 'S', name: 'South' },
        { id: 'N', name: 'North' },
      ],
      floorLocations: [
        { id: 'south-lounge', label: 'South lounge', wing: 'S' },
        { id: 'south-hall', label: 'South hallway', wing: 'S' },
        { id: 'north-hall', label: 'North hallway', wing: 'N' },
        { id: 'north-lounge', label: 'North lounge', wing: 'N' },
      ],
      after: [
        {
          section: 'Lower level',
          locations: [
            {
              id: 'b103',
              label: 'B103',
              kind: 'status',
              statusOptions: ['Locked', 'Unlocked – empty', 'Unlocked – in use', 'Door propped open'],
            },
          ],
        },
      ],
    },
    reportOrder: 'by-floor',
  },
]

/** Order buildings appear in the report (independent of the shift's starting building). */
export const REPORT_BUILDING_ORDER: string[] = ['woodstock', 'lp']
