# SweepMate

A mobile-first residence sweep tracker with guided walkthroughs, occupancy counts, incident notes, and ready-to-paste coverage reports.

Built with React 19, TypeScript, Tailwind CSS v4 and Vite. Everything runs in the browser, and data is saved in the device's local storage. There is no server or account.

## Run locally

Requires Node.js 18 or newer (tested on 20.17).

```bash
npm install        # install dependencies
npm run dev        # start the dev server at http://localhost:5173
```

To try it on your phone on the same Wi-Fi, run `npm run dev -- --host` and open the "Network" URL it prints.

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Run the automated tests once (Vitest) |
| `npm run test:watch` | Re-run tests on change |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |
| `npm run build` | Type check and build the production bundle into `dist/` |
| `npm run preview` | Serve the production build locally |

## Deploy to Vercel

The app is a static Vite site, so no special configuration is needed.

**From the dashboard**

1. Push the repository to GitHub, GitLab or Bitbucket.
2. In Vercel choose **Add New → Project** and import the repository.
3. Vercel detects **Vite** automatically. Check these settings:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
4. Click **Deploy**. Later pushes to the main branch redeploy automatically.

**From the CLI**

```bash
npm i -g vercel
vercel          # first run links the project and makes a preview deployment
vercel --prod   # production deployment
```

Saved shifts live in each browser's local storage, separately for every domain. Data saved on `localhost` won't appear on the Vercel URL, and preview and production URLs don't share data either.

## Where to edit things

All configuration is plain TypeScript in [`src/config/`](src/config/). After editing, run `npm test` and the tests will confirm that the routes are still valid.

| What | File | Notes |
| --- | --- | --- |
| Building layouts and walking routes | [`src/config/buildings.ts`](src/config/buildings.ts) | `sequence` layouts are walked exactly as listed (Woodstock). `alternating` layouts walk the floors top-down and switch direction on each floor (LP). `before` and `after` hold extra stops, such as B103. |
| Status locations (e.g. B103) | `src/config/buildings.ts` | Give a location `kind: 'status'` and a list of `statusOptions`. |
| Report display order | `src/config/buildings.ts` | `reportOrder` on each building can be `'walking'`, `'by-floor'` or an explicit list of location ids. `REPORT_BUILDING_ORDER` sets the order of buildings. |
| Shift hours and default sweep times | [`src/config/schedules.ts`](src/config/schedules.ts) | One entry each for weekday, weekend and peak. Times earlier than the shift start count as after midnight. |
| Report template (defaults) | [`src/config/reportTemplate.ts`](src/config/reportTemplate.ts) | Each user can also override the template from **Report → Report template**. Overrides are saved on that device. |
| Note types and status wording | [`src/config/noteKinds.ts`](src/config/noteKinds.ts) | `report` is the phrase that appears in the coverage report. |

> **Location ids must stay stable.** Saved counts are keyed by location id. If you rename an id, earlier shifts will show that location as unanswered.

> ⚠ **Placeholder data.** The original specification's exact Woodstock route, LP floor plan, B103 status options and sweep schedule weren't available when this was built. The values in `buildings.ts` and `schedules.ts` are marked as placeholders. Replace them with the real ones.

## How it works

- **Counts.** Each location is in one of three states: *unanswered* (nothing saved), *answered* (a count, where 0 is a real answer, or a status), or *Not Checked* (skipped on purpose). These stay separate everywhere, including the report.
- **Walking order vs report order.** Routes are flattened from config in [`src/domain/route.ts`](src/domain/route.ts). The report uses its own order, so LP can be walked S→N then N→S but reported S→N on every floor.
- **Midnight.** A shift belongs to the date it starts on. Sweep and note times earlier than the shift start count as the next day ([`src/domain/time.ts`](src/domain/time.ts)).
- **Notes.** General notes, maintenance/work orders, IRs, SOCs and follow-ups. Saving a note only records it in SweepMate. Status wording keeps "observed / not yet filed" separate from "submitted / filed".
- **Report.** Built in [`src/domain/report.ts`](src/domain/report.ts). Missing entries are listed before you export, and incomplete buildings are labelled. Nothing is filled in on your behalf. The preview is editable, and **Regenerate** rebuilds it from the current data.
- **Saving.** Every change autosaves to `localStorage` (`sweepmate:v1:shifts`). The demo shift is kept under `sweepmate:v1:demo` and never mixes with real shifts. If saved data is unreadable, a copy is kept under `sweepmate:v1:backup-*` and the app tells you.

## Project layout

```
src/
  config/      editable buildings, schedules, report template, note types
  domain/      pure logic: types, routes, time, shift ops, progress, report, storage
  state/       React store (autosave, session restore), theme, template overrides
  components/  UI primitives, location card, sheets, note editor
  screens/     Welcome, ShiftSetup, Overview, Walkthrough, Notes, Report
```

## Known limitations

- Data lives only in the browser that recorded it. There is no sync between devices, and clearing site data deletes it. Use **Download TXT** to keep a copy of reports.
- Having the same shift open in two tabs at once isn't coordinated. The last tab to save wins.
- The default report wording is a reasonable paragraph format, not a copy of an official template. Adjust it under **Report → Report template** or in `reportTemplate.ts`.
- Building routes and sweep times are placeholders until they're replaced with the real ones (see above).
