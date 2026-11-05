# Testing and verification

## Automated checks

Run from the repository root after `npm ci`:

```bash
npm test
npm run lint
npm run build
```

The build includes TypeScript checking. `npm run typecheck` is available separately, and `npm run test:watch` runs tests during development.

The current suite contains 67 tests across 10 files. The latest local verification used Node 20.17.0 and npm 10.8.2 on Windows. The new CI workflow targets Node 24 on Ubuntu; a hosted CI result is pending its first GitHub run.

| Area | Evidence |
| --- | --- |
| Building order, alternating wings, unique IDs, report coverage | [route.test.ts](../src/domain/route.test.ts) |
| Midnight ordering and date/time formatting | [time.test.ts](../src/domain/time.test.ts) |
| Independent counts, CA overrides, schedule edits, missing data | [shift.test.ts](../src/domain/shift.test.ts) |
| Exact report wording, missing values, notes, north-first LP output | [report.test.ts](../src/domain/report.test.ts) |
| Persistence round trips, legacy migration, damaged data, write failures | [storage.test.ts](../src/domain/storage.test.ts) |
| Single-building routes, reports, and persistence | [quickShift.test.ts](../src/domain/quickShift.test.ts) |
| Setup, presets, saved defaults, resume, deletion | [App.test.tsx](../src/App.test.tsx) |
| Add-sweep validation, retained data, combined report copy from the Report tab | [Overview.test.tsx](../src/screens/Overview.test.tsx) |
| Complete routes, keyboard input, zero/skipped states, edits, notes | [Walkthrough.test.tsx](../src/screens/Walkthrough.test.tsx) |
| Quick-sweep completion, editing, report content, resume, deletion | [QuickSweep.test.tsx](../src/screens/QuickSweep.test.tsx) |

Vitest runs the UI tests with React Testing Library in jsdom. Tests exercise rendered controls and application state but do not validate browser layout, actual clipboard permissions, download behavior, or CSS animation timing. There is no published coverage percentage or performance benchmark.

## Continuous integration

[ci.yml](../.github/workflows/ci.yml) runs `npm ci`, lint, tests, and the production build on pushes, pull requests, and manual workflow dispatch. It uses read-only repository permissions and does not commit, push, or deploy. Node setup and caching follow the official [setup-node documentation](https://github.com/actions/setup-node).

## Manual browser checks

Use a disposable test shift with fictional names, and record the browser, viewport, and result when reviewing a UI change.

- At a narrow phone width, verify count controls, setup inputs, report actions, and fixed navigation do not overlap or scroll sideways.
- Walk Woodstock past Floor 2 into the basement, then finish at the north kitchen and Floor 1 common room.
- Walk Les Prince across a floor boundary and check that walking direction alternates while report lines stay north-first.
- Open and close a sheet using a pointer, Escape, and keyboard navigation. Check focus returns to its trigger and collapsed panels cannot receive focus.
- Switch light/dark themes; check text, selected controls, and browser chrome. Enable reduced motion and verify transitions stop.
- Copy a report and download TXT in the deployed HTTPS site. Confirm line breaks and zero/skipped/missing values in the output.
- Reload a partially completed shift; close and reopen the site to check resume.

Browser visual review was unavailable in the editing environment. These manual checks are documented for verification, not reported as passed.
