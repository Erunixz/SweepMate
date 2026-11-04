# Contributing to SweepMate

## Setup

Use Node 24 (see `.nvmrc`), run `npm ci`, then `npm run dev`. Start with the built-in demo to explore the app without entering real residence records.

Read the [architecture guide](docs/architecture.md) before changing domain behavior. The private local build plan is intentionally ignored by Git; the README and `docs/` are the public project documentation.

## Changes to domain behavior

- Keep unanswered, an answered zero, and Not Checked distinct.
- Preserve stable location and sweep IDs. A route reorder must not move saved counts between rooms.
- Do not copy counts between sweeps or fill missing times/names with invented values.
- Keep walking order independent from report order, including Les Prince's alternating wings and north-first report.
- Interpret scheduled times relative to the shift start when crossing midnight.
- When adding a persisted field, update its type, creation defaults, normalization, and migration/round-trip tests.
- Keep Quick sweep limited to its selected building and keep fictional demo records separate from real shifts.
- Recording a note must not imply submission to an external reporting system.

## UI and documentation

Use the shared controls and theme tokens. Keep the restrained maroon design, visible labels and focus states, large touch targets, and reduced-motion behavior. Test both full coverage and Quick sweep when changing shared UI.

Use fictional data in new examples, screenshots, and bug reports. Do not include resident information, incident narratives, credentials, or browser-storage dumps in public issues.

## Validation

```bash
npm test
npm run lint
npm run build
```

Add or update regression tests when a change affects routes, data integrity, persistence, or report output. Styling-only changes should get an appropriate visual check; tests that merely repeat CSS classes are not useful.

For a pull request, describe the user-visible behavior, relevant implementation decisions, checks run, and remaining limitations. Include before/after screenshots for visible changes when available, using demo data. See the [testing guide](docs/testing.md) for the distinction between automated and manual validation.
