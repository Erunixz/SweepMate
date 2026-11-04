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
| Walking routes | [`src/config/buildings.ts`](src/config/buildings.ts) | Woodstock walks common rooms on Floors 6–2, then the basement study rooms (101E, 101C), laundry and games room, then the first-floor north kitchen and Floor 1 common room. Les Prince is an `alternating` layout: floors are walked top-down, and the side visited first switches on each floor (south first on Floor 6) while study comes before kitchen on every side. `floorOverrides` gives Floor 1 its own study room and kitchen, and `after` holds the games and laundry rooms. |
| Report order and wording | `src/config/buildings.ts` | `reportBlocks` sets the report lines, separate from walking order. Les Prince uses `separateItems` to print one room per line beneath each floor heading, north-first. Blocks are separated by a blank line. `REPORT_BUILDING_ORDER` sets the order of buildings within each sweep. |
| Shift hours, phone pick-up and sweep times | [`src/config/schedules.ts`](src/config/schedules.ts) | Coverage runs 9:00 PM–8:00 AM. Weekdays default to 9 PM and 11 PM; weekends and peak days also include 1 AM the next day. Phone pick-up stays blank. **Save times as … default** overrides these for that shift type on this device. |
| Report headings | [`src/config/reportTemplate.ts`](src/config/reportTemplate.ts) | `SWEEPS:`, `NOTES:`, `Start time:` and so on. These can also be overridden from **Report → Report template**, and overrides are saved on that device. |
| Note types and status wording | [`src/config/noteKinds.ts`](src/config/noteKinds.ts) | `report` is the phrase used in the Extra Notes lines. |

> **Location ids must stay stable.** Saved counts are keyed by location id. If you rename an id, earlier shifts will show that location as unanswered. `npm test` checks that every route location appears exactly once in its building's `reportBlocks`.

## How it works

- **Quick sweep.** Choose **Quick sweep** beside Start Shift for one building, a sweep date/time and optional CA names. It uses the normal walkthrough and exports only that building's section plus notes. Phone pick-up, assignments and the full shift schedule are omitted. Quick sweeps save, resume and delete like full shifts; older saves default to full coverage mode.
- **Add a sweep.** Use **Add sweep** below the overview's sweep cards. The time defaults to now. Duplicate times are rejected; existing sweep counts, times, CAs and notes are preserved when the schedule is reordered across midnight.
- **Counts.** Each location is in one of three states: *unanswered* (nothing saved, shown as `[not recorded]`), *answered* (a count, where 0 is a real answer), or *Not Checked* (skipped on purpose, shown as `[not checked]`). Every sweep starts empty, and counts are never copied from an earlier sweep.
- **Per-building sweep details.** Each building in each sweep has its own start time, end time and CAs. The start time is filled in on the first answer, and the end-of-route screen offers **Record end time**. Times and CAs can be edited from the details bar at the top of the walkthrough. CAs default to the ones chosen for that building on Shift setup.
- **Walking order vs report order.** Les Prince is walked S→N on Floor 6, then N→S on Floor 5, and so on, but always reported north-first.
- **Midnight.** A shift belongs to its coverage date. Sweep and note times earlier than the shift start (for example 1:00 AM) count as the next day ([`src/domain/time.ts`](src/domain/time.ts)).
- **Notes.** There is a free-text Extra Notes field, plus timed notes: general observations (such as "B103 open"), maintenance issues and work orders, Incident Reports, Students of Concern, and outstanding follow-up. Saving a note only records it in SweepMate. An item is only described as submitted or filed if you set that status.
- **Report.** Built in [`src/domain/report.ts`](src/domain/report.ts) in the SWEEPS / NOTES / per-sweep building sections / Extra Notes format. Missing counts, times and CAs are listed before you export. The preview is editable, and **Regenerate** rebuilds it from the current data.
- **Saving.** Every change autosaves to `localStorage` (`sweepmate:v1:shifts`). The demo shift is kept under `sweepmate:v1:demo` and never mixes with real shifts. If saved data is unreadable, a copy is kept under `sweepmate:v1:backup-*` and the app tells you.

## Project layout

```
src/
  config/      editable buildings, schedules, report template, note types
  domain/      pure logic: types, routes, time, shift ops, progress, report, storage
  state/       React store (autosave, session restore), theme, template overrides
  components/  UI primitives, location card, sheets, note editor
  screens/     Welcome, ShiftSetup, QuickSetup, Overview, Walkthrough, Notes, Report
```

## Known limitations

- Data lives only in the browser that recorded it. There is no sync between devices, and clearing site data deletes it. Use **Download TXT** to keep a copy of reports.
- Having the same shift open in two tabs at once isn't coordinated. The last tab to save wins.
- **Unconfirmed details (left configurable, not assumed):**
  - Phone pick-up time for each shift type stays blank until recorded or saved as a default.
  - Whether the report should list buildings in walking order instead of always Woodstock then Les Prince. Change this with `REPORT_BUILDING_ORDER`.
  - The reconstructed template writes "End Time" for Les Prince and "End time" for Woodstock. The app uses "End time" for both; change it in the report template if needed.
