# SweepMate

**A mobile-first tool for overnight residence rounds, from the first room count to the final coverage report.**

[**Open the live app**](https://sweep-mate.vercel.app/) · [Try the demo](#try-the-workflow) · [Explore the architecture](docs/architecture.md)

Built for the Princestock workflow at Woodstock and Les Prince, SweepMate helps Community Advisors (CAs) keep track of overnight building rounds. It brings the route, room counts, observations, and final coverage report into one mobile-friendly workflow.

[Run locally](#run-locally) · [Engineering highlights](#engineering-highlights) · [Testing](docs/testing.md) · [Deployment](docs/deployment.md)

## Why SweepMate exists

An overnight residence shift involves more than walking through a building. CAs check shared spaces, record how many people are present, note maintenance issues or other observations, and prepare a record of the night's coverage. Those checks repeat throughout the shift, often across midnight and across buildings with different layouts.

SweepMate grew out of actual residence sweep notes and the specific routes used in Woodstock and Les Prince. The motivation was to make the recording process fit the work: show the next room while walking, capture details when they are observed, and use those entries to assemble the report at the end. The goal is less time reconstructing a round from scattered notes and more attention available for the round itself.

That purpose shapes the small details. Woodstock's route visits the basement before returning to the first floor. Les Prince alternates wings as the CA moves downstairs. A 1 AM sweep stays with the overnight shift it belongs to. An empty room, a skipped room, and an unfinished entry remain distinct so the final report reflects what happened.

## Who it is for

- **CAs coordinating full coverage:** plan the night's sweeps, record who is covering each building, track progress, and prepare a combined report.
- **CAs completing one building:** start a Quick sweep, record the route, and export that building's section without setting up the whole coverage shift.
- **CAs returning to unfinished work:** resume saved rounds, revisit a room, and keep observations and follow-up notes attached to the relevant sweep.

## From the round to the report

At the start of a shift, a CA sets the schedule and team. During a round, the app presents one location at a time with quick count controls and space for observations. Notes can be added where they arise, and the overview shows which parts of the round still need attention.

At the end, those records become a consistent plain-text report that can be reviewed, edited, copied, or downloaded. Walking order and report order are handled separately, so the CA can follow the physical route while still producing the expected reporting format.

The app opens directly in a browser without an account. Large controls, light and dark themes, and a restrained interface keep the focus on recording the next room.

## Try the workflow

Open [sweep-mate.vercel.app](https://sweep-mate.vercel.app/) and select **Try a demo shift** on the Princestock start screen. No installation, setup, or account is required. The demo contains fictional data and is stored separately from real shifts. The same walkthrough works [locally](#run-locally).

1. Open the completed **9:00 PM** sweep to inspect progress in both buildings.
2. Continue the **11:00 PM** Woodstock sweep. Record **0** for an empty room, then use **Not Checked** on the next location.
3. Add a note during the walkthrough and see its location and sweep prefilled.
4. Open **Report** to compare recorded values, `[not checked]`, and `[not recorded]`. Copy the report or download a TXT file.
5. Return home and try **Quick sweep** for a single-building workflow without coverage-lead setup.

```text
Set up a shift or quick sweep
              |
Walk the route and record each room
              |
Review counts, times, and notes
              |
Copy or download the report
```

## Features

| Workflow | What it supports |
| --- | --- |
| Full coverage | Three-step setup, CA assignments, editable schedules, per-building start/end times, and a combined report |
| Quick sweep | One building, a date/time, optional CA names, and a building-only report |
| Guided rounds | Configurable routes, count shortcuts, keyboard entry, Not Checked, observations, and revisiting rooms |
| Overnight scheduling | Weekday sweeps at 9 PM and 11 PM; weekend and peak shifts also include 1 AM the next day; saved defaults override presets |
| Mid-shift changes | Add sweeps from the overview, reject duplicate times, and retain existing sweep records when reordering |
| Notes and follow-up | General notes, maintenance, Incident Reports, Students of Concern, and follow-up status |
| Reporting | Missing-detail checks, editable report text, template preferences, copy, and TXT download |
| Local persistence | Autosave, resume after refresh, older-save normalization, and separate demo storage |
| Offline app | Installable to the home screen, opens with no signal after the first visit, and asks before reloading for updates |
| Sharing | Copy, system share sheet on supported devices, and TXT download |
| Interface | Maroon light/dark themes, large touch controls, labelled inputs, keyboard focus states, and reduced-motion support |

## Engineering highlights

**React 19 · TypeScript · Tailwind CSS v4 · Vite · Vitest · React Testing Library**

The engineering decisions follow the needs of the shift: preserve observations, adapt to the building, and keep the report consistent as the schedule changes.

| Decision | Why it matters | Implementation |
| --- | --- | --- |
| Model unanswered, zero, and skipped separately | Reports preserve what was actually observed | [Types](src/domain/types.ts), [progress](src/domain/progress.ts), [report tests](src/domain/report.test.ts) |
| Keep route configuration separate from report layout | Les Prince alternates walking direction while every floor reports north-first | [Building config](src/config/buildings.ts), [route generation](src/domain/route.ts) |
| Preserve sweep identity during schedule edits | Adding or moving a time retains its counts, CAs, and notes | [Shift operations](src/domain/shift.ts), [overview regression test](src/screens/Overview.test.tsx) |
| Normalize saved JSON at the storage boundary | Older records can load with defaults; invalid shifts are detected | [Storage](src/domain/storage.ts), [migration tests](src/domain/storage.test.ts) |
| Reuse the recording model for both modes | Quick sweeps share the same route, note, and persistence behavior | [Quick-sweep domain tests](src/domain/quickShift.test.ts), [workflow tests](src/screens/QuickSweep.test.tsx) |

The current suite has **67 automated tests** covering routes, overnight schedules, saved records, report output, and UI workflows. See the [testing guide](docs/testing.md) for the checks and how to run them.

### Suggested code-review path

1. [Data model](src/domain/types.ts): how shifts, individual sweeps, building records, and location answers relate.
2. [Route generation](src/domain/route.ts) and [configuration](src/config/buildings.ts): one walkthrough supports both fixed and alternating building layouts.
3. [Schedule operations](src/domain/shift.ts): retained sweep IDs preserve answers when the schedule changes.
4. [Report generation](src/domain/report.ts): recorded state becomes consistent text without silently filling missing details.
5. [Quick-sweep workflow tests](src/screens/QuickSweep.test.tsx): follow a complete route, edit details, inspect the report, resume, and delete a record through the UI.

## Run locally

Use **Node.js 24** and npm for a new checkout; `.nvmrc` and the CI workflow select Node 24. See the [Node release schedule](https://nodejs.org/en/about/previous-releases) for supported runtimes.

```bash
git clone https://github.com/Erunixz/SweepMate.git
cd SweepMate
npm ci
npm run dev
```

Open the local address printed by Vite, usually `http://localhost:5173`.

No environment variables, API keys, database, or account setup are required. To open the app on a phone on the same network, run `npm run dev -- --host` and use the network address printed by Vite.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm test` | Run the automated suite once |
| `npm run test:watch` | Re-run tests while editing |
| `npm run typecheck` | Check TypeScript |
| `npm run lint` | Run ESLint |
| `npm run build` | Check TypeScript and build into `dist/` |
| `npm run preview` | Serve the production build locally |

## Project structure

```text
src/
  config/       Building routes, schedules, note kinds, report wording
  domain/       Data types, shift operations, time, routes, reports, storage
  state/        React context, autosave, navigation, user preferences
  components/   Shared controls, location entry, dialogs, navigation
  screens/      Setup, overview, walkthrough, notes, report, welcome
  test/         Shared test environment
.github/        CI workflow and pull request template
docs/           Architecture, testing, and deployment guides
```

Start a code review with [types.ts](src/domain/types.ts), [shift.ts](src/domain/shift.ts), and [report.ts](src/domain/report.ts). The [architecture guide](docs/architecture.md) explains the data flow and tradeoffs.

## Deployment

The production address is [sweep-mate.vercel.app](https://sweep-mate.vercel.app/). SweepMate builds as a static site. On Vercel, select **Vite**, use `npm run build`, and publish `dist`. No server functions or environment variables are required. See the [deployment guide](docs/deployment.md) for setup and post-deployment checks.

[CI](.github/workflows/ci.yml) is configured to install the lockfile dependencies, lint, run tests, and build on pushes and pull requests. See the [testing guide](docs/testing.md#continuous-integration) for workflow details.

## Working with shift records

Shifts save in the browser where they are recorded; download the report when you need a separate copy. SweepMate helps prepare coverage records, while official incident and maintenance submissions remain in their respective systems. Storage details and development tradeoffs are documented in the [architecture guide](docs/architecture.md#scope-and-future-work).

## Contributing and license

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, domain rules, and review expectations. Licensed under the [MIT License](LICENSE).
