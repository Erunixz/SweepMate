import { useState } from 'react'
import { Icon } from '../components/Icon'
import { LocationCard } from '../components/LocationCard'
import { NoteSheet } from '../components/NoteSheet'
import { SaveIndicator } from '../components/SaveIndicator'
import { Sheet } from '../components/Sheet'
import { cx } from '../components/cx'
import { Badge, Button, Card, Header, Page, ProgressBar } from '../components/ui'
import { buildingProgress, isDone } from '../domain/progress'
import { getBuilding, getRoute, walkingBuildingOrder } from '../domain/route'
import { BuildingDetails } from '../components/BuildingDetails'
import { setEntry, updateBuildingSweep } from '../domain/shift'
import { formatTime12, nowTime } from '../domain/time'
import type { LocationEntry, RouteLocation } from '../domain/types'
import { useActiveShift } from '../state/store'

export function Walkthrough({ sweepId, buildingId, index }: { sweepId: string; buildingId: string; index: number }) {
  const { shift, navigate, updateActive } = useActiveShift()
  const [jumpOpen, setJumpOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)

  const sweepIndex = shift.sweeps.findIndex((s) => s.id === sweepId)
  const sweep = shift.sweeps[sweepIndex]
  const building = getBuilding(buildingId)
  if (!sweep || !building) {
    return (
      <Page>
        <p>This sweep no longer exists.</p>
        <Button onClick={() => navigate({ name: 'overview' })}>Back to overview</Button>
      </Page>
    )
  }

  const route = getRoute(buildingId)
  const entries = sweep.buildings[buildingId]?.entries ?? {}
  const progress = buildingProgress(sweep, buildingId)
  const location: RouteLocation | undefined = route[index]
  const go = (i: number) => navigate({ name: 'walk', sweepId, buildingId, index: Math.max(0, Math.min(route.length, i)) })

  const write = (loc: RouteLocation, entry: LocationEntry | null) =>
    updateActive((s) => {
      let next = setEntry(s, sweepId, buildingId, loc.id, entry)
      // The first answer in this building fills in its start time if it isn't set yet.
      if (entry && !s.sweeps.find((w) => w.id === sweepId)?.buildings[buildingId]?.actualStart)
        next = updateBuildingSweep(next, sweepId, buildingId, (b) => ({ ...b, actualStart: nowTime() }))
      return next
    })

  const answered = (draft: { count?: number; status?: string; observation: string }): LocationEntry => ({
    state: 'answered',
    ...(draft.count !== undefined ? { count: draft.count } : {}),
    ...(draft.status !== undefined ? { status: draft.status } : {}),
    observation: draft.observation.trim(),
    updatedAt: new Date().toISOString(),
  })

  const title = building.name

  return (
    <>
      <Header
        title={title}
        subtitle={`${formatTime12(sweep.scheduledTime)} sweep · ${location ? location.section : 'Building summary'}`}
        onBack={() => navigate({ name: 'overview' })}
        backLabel="Overview"
        right={
          <div className="flex items-center gap-1">
            <SaveIndicator />
            <Button variant="secondary" size="sm" onClick={() => setNoteOpen(true)} aria-label="Add note">
              <Icon name="plus" size={16} />
              Note
            </Button>
          </div>
        }
      />
      <Page>
        <BuildingDetails shift={shift} sweep={sweep} buildingId={buildingId} />
        <button
          type="button"
          onClick={() => setJumpOpen(true)}
          className="flex flex-col gap-1.5 rounded-xl p-2 -mx-2 text-left hover:bg-surface-2"
          aria-label={`Progress: ${progress.answered + progress.skipped} of ${progress.total} locations done. Open location list`}
        >
          <div className="flex items-center text-xs text-muted gap-2">
            <span>
              {progress.answered + progress.skipped} of {progress.total} done
              {progress.skipped > 0 && ` · ${progress.skipped} not checked`}
            </span>
            <span className="ml-auto font-semibold text-accent">All locations ›</span>
          </div>
          <ProgressBar value={progress.answered + progress.skipped} max={progress.total} label={`${building.name} progress`} />
        </button>

        {location ? (
          <LocationCard
            key={`${sweepId}-${buildingId}-${location.id}`}
            location={location}
            entry={entries[location.id]}
            position={`${index + 1} / ${route.length}`}
            canGoBack={index > 0}
            onSave={(draft) => {
              write(location, answered(draft))
              go(index + 1)
            }}
            onSkip={(observation) => {
              write(location, { state: 'skipped', observation: observation.trim(), updatedAt: new Date().toISOString() })
              go(index + 1)
            }}
            onClear={() => write(location, null)}
            onBack={(draft) => {
              if (draft) write(location, answered(draft))
              go(index - 1)
            }}
          />
        ) : (
          <BuildingSummary sweepId={sweepId} buildingId={buildingId} onJump={go} />
        )}
      </Page>

      <Sheet open={jumpOpen} onClose={() => setJumpOpen(false)} title={`${building.name} – all locations`}>
        <LocationList
          route={route}
          entries={entries}
          current={index}
          onPick={(i) => {
            setJumpOpen(false)
            go(i)
          }}
        />
      </Sheet>

      <NoteSheet
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        context={{ sweepId, buildingId, location: location ? `${building.name} ${location.label}` : building.name }}
      />
    </>
  )
}

function entryValue(loc: RouteLocation, e: LocationEntry | undefined) {
  if (!e) return '—'
  if (e.state === 'skipped') return 'Not checked'
  return loc.kind === 'status' ? (e.status ?? '') : String(e.count)
}

function LocationList({
  route,
  entries,
  current,
  onPick,
}: {
  route: RouteLocation[]
  entries: Record<string, LocationEntry>
  current: number
  onPick: (i: number) => void
}) {
  const sections: { name: string; items: { loc: RouteLocation; i: number }[] }[] = []
  route.forEach((loc, i) => {
    const last = sections.at(-1)
    if (last && last.name === loc.section) last.items.push({ loc, i })
    else sections.push({ name: loc.section, items: [{ loc, i }] })
  })
  return (
    <div className="flex flex-col gap-3">
      {sections.map((sec) => (
        <div key={sec.name + sec.items[0]!.i}>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wide mb-1">
            {sec.name}
            {sec.items[0]!.loc.direction && <span className="normal-case font-semibold"> · {sec.items[0]!.loc.direction}</span>}
          </h3>
          <ul className="flex flex-col gap-1">
            {sec.items.map(({ loc, i }) => {
              const e = entries[loc.id]
              return (
                <li key={loc.id}>
                  <button
                    type="button"
                    onClick={() => onPick(i)}
                    aria-current={i === current ? 'step' : undefined}
                    className={cx(
                      'w-full flex items-center gap-2 min-h-12 rounded-lg px-3 text-left border',
                      i === current ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-surface-2',
                    )}
                  >
                    <span className="flex-1">{loc.label}</span>
                    <span
                      className={cx(
                        'text-sm font-semibold tabular-nums',
                        !e ? 'text-warn' : e.state === 'skipped' ? 'text-skip' : 'text-ok',
                      )}
                    >
                      {!e ? 'Unanswered' : entryValue(loc, e)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function BuildingSummary({ sweepId, buildingId, onJump }: { sweepId: string; buildingId: string; onJump: (i: number) => void }) {
  const { shift, navigate, updateActive } = useActiveShift()
  const sweep = shift.sweeps.find((s) => s.id === sweepId)!
  const p = buildingProgress(sweep, buildingId)
  const route = getRoute(buildingId)
  const entries = sweep.buildings[buildingId]?.entries ?? {}
  const firstMissing = route.findIndex((l) => !entries[l.id])
  const nextBuilding = walkingBuildingOrder(shift.startingBuildingId).find(
    (b) => b.id !== buildingId && !isDone(buildingProgress(sweep, b.id)),
  )
  const bs = sweep.buildings[buildingId]
  const name = getBuilding(buildingId)?.name

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xl font-bold">{name} – end of route</h2>
      <div className="flex flex-wrap gap-2">
        <Badge tone="ok">{p.answered} answered</Badge>
        {p.skipped > 0 && <Badge tone="skip">{p.skipped} not checked</Badge>}
        {p.unanswered > 0 && <Badge tone="warn">{p.unanswered} unanswered</Badge>}
      </div>
      {firstMissing >= 0 && (
        <Button variant="secondary" size="lg" onClick={() => onJump(firstMissing)}>
          Go to first unanswered location
        </Button>
      )}
      {!bs?.actualEnd ? (
        <Button
          variant="primary"
          size="lg"
          onClick={() => updateActive((s) => updateBuildingSweep(s, sweepId, buildingId, (b) => ({ ...b, actualEnd: nowTime() })))}
        >
          Record {name} end time ({formatTime12(nowTime())})
        </Button>
      ) : (
        <p className="text-sm text-muted">
          {name} ended at {formatTime12(bs.actualEnd)}. Edit times from the details bar above.
        </p>
      )}
      {nextBuilding && (
        <Button
          variant={bs?.actualEnd ? 'primary' : 'secondary'}
          size="lg"
          onClick={() => navigate({ name: 'walk', sweepId, buildingId: nextBuilding.id, index: Math.max(0, getRoute(nextBuilding.id).findIndex((l) => !sweep.buildings[nextBuilding.id]?.entries[l.id])) })}
        >
          Continue to {nextBuilding.name} ›
        </Button>
      )}
      <Button size="lg" onClick={() => navigate({ name: 'overview' })}>
        Back to overview
      </Button>
    </Card>
  )
}
