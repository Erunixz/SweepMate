import { useId, useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { cx } from '../components/cx'
import { Icon } from '../components/Icon'
import { SaveIndicator } from '../components/SaveIndicator'
import { Sheet } from '../components/Sheet'
import { Badge, Button, Card, Eyebrow, Header, Page, ProgressBar, TextInput } from '../components/ui'
import { SHIFT_TYPE_LABELS } from '../config/schedules'
import { buildingProgress, firstUnansweredIndex, hasStarted, isDone, sweepProgress } from '../domain/progress'
import { getBuilding, getRoute, shiftBuildings } from '../domain/route'
import { applySchedule, caPool } from '../domain/shift'
import { formatDateShort, isValidTime, labelShiftTime, nowTime } from '../domain/time'
import type { Shift, Sweep } from '../domain/types'
import { useActiveShift } from '../state/store'

/** The next building to walk: the first unfinished building of the first unfinished sweep. */
function nextUp(shift: Shift) {
  for (const sweep of shift.sweeps) {
    for (const b of shiftBuildings(shift)) {
      if (!isDone(buildingProgress(sweep, b.id))) return { sweep, buildingId: b.id }
    }
  }
  return null
}

export function Overview() {
  const { shift, navigate, updateActive } = useActiveShift()
  const openFollowUps = shift.notes.filter((n) => n.kind === 'follow-up' && n.status === 'open').length
  const names = caPool(shift)
  const current = nextUp(shift)?.sweep.id
  const quick = shift.mode === 'quick'
  const edit = () => navigate({ name: quick ? 'quick-setup' : 'setup', mode: 'edit' })

  return (
    <>
      <Header
        title={formatDateShort(shift.date)}
        subtitle={quick ? `Quick sweep · ${getBuilding(shift.quickBuildingId!)?.name}` : `${SHIFT_TYPE_LABELS[shift.type]} · ${names.length ? names.join(', ') : 'No CAs yet'}`}
        onBack={() => navigate({ name: 'welcome' })}
        backLabel="Home"
        right={
          <div className="flex items-center">
            <SaveIndicator />
            <Button variant="ghost" size="sm" onClick={edit} aria-label={quick ? 'Edit quick sweep' : 'Edit shift'}>
              <Icon name="edit" />
            </Button>
          </div>
        }
      />
      <Page className="pb-28">
        {!quick && <UpNext shift={shift} />}

        {shift.sweeps.length === 0 && (
          <Card>
            <p className="text-sm">
              No sweeps scheduled yet.{' '}
              <button type="button" className="font-semibold text-accent" onClick={() => navigate({ name: 'setup', mode: 'edit' })}>
                Add sweep times
              </button>
            </p>
          </Card>
        )}

        {shift.sweeps.length > 0 && <Eyebrow className="px-1 pt-3">{quick ? 'Your sweep' : 'Tonight'}</Eyebrow>}
        {shift.sweeps.map((sweep) => (
          <SweepCard key={sweep.id} shift={shift} sweep={sweep} defaultOpen={quick || sweep.id === current} />
        ))}
        {!quick && <AddSweep />}

        <div className="flex flex-col items-center gap-1 pt-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted"
            onClick={() => updateActive((s) => ({ ...s, finished: !s.finished, updatedAt: new Date().toISOString() }))}
          >
            {shift.finished ? (quick ? 'Reopen sweep' : 'Reopen shift') : (quick ? 'Mark sweep finished' : 'Mark shift finished')}
          </Button>
        </div>
      </Page>
      <BottomNav badge={{ notes: openFollowUps }} />

    </>
  )
}

function AddSweep() {
  const { shift, updateActive } = useActiveShift()
  const [open, setOpen] = useState(false)
  const [time, setTime] = useState(nowTime())
  const [error, setError] = useState('')
  return <>
    <Button variant="ghost" className="self-center text-accent" onClick={() => { setTime(nowTime()); setError(''); setOpen(true) }}>
      <Icon name="plus" size={16} /> Add sweep
    </Button>
    <Sheet open={open} onClose={() => setOpen(false)} title="Add sweep">
      <form className="flex flex-col gap-4" noValidate onSubmit={(e) => {
        e.preventDefault()
        if (!isValidTime(time)) { setError('Enter a valid sweep time.'); return }
        if (shift.sweeps.some((s) => s.scheduledTime === time)) { setError('A sweep is already scheduled at this time. Choose a different time.'); return }
        updateActive((s) => applySchedule(s, [...s.sweeps.map((w) => ({ id: w.id, time: w.scheduledTime })), { time }]))
        setOpen(false)
      }}>
        <TextInput label="Sweep time" type="time" value={time} onChange={(e) => { setTime(e.target.value); setError('') }} hint="Times before the shift start count as the next day." autoFocus />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" variant="primary" size="lg">Add to schedule</Button>
      </form>
    </Sheet>
  </>
}

const heroClass = 'rounded-2xl p-6 flex flex-col gap-5 text-white shadow-lg shadow-[#561327]/20 bg-gradient-to-br from-[#8f2645] to-[#561327]'
const heroButton = 'inline-flex items-center justify-center gap-2 min-h-14 rounded-xl bg-white text-[#5b152a] text-base font-bold transition hover:bg-white/90 active:scale-[0.99]'

/** Hero card with the single next action. */
function UpNext({ shift }: { shift: Shift }) {
  const { navigate } = useActiveShift()
  const next = nextUp(shift)
  if (!shift.sweeps.length) return null

  if (!next) {
    return (
      <section className={heroClass}>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/70">All done</p>
          <h2 className="text-3xl font-semibold tracking-tight">Nice work tonight</h2>
          <p className="text-white/80">Your report is ready for StarRez.</p>
        </div>
        <button type="button" className={heroButton} onClick={() => navigate({ name: 'report' })}>
          Open report
        </button>
      </section>
    )
  }

  const { sweep, buildingId } = next
  const building = getBuilding(buildingId)!
  const p = buildingProgress(sweep, buildingId)
  const index = firstUnansweredIndex(sweep, buildingId)
  const nextLocation = getRoute(buildingId)[index]
  const done = p.answered + p.skipped

  return (
    <section className={heroClass}>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/70">Up next · {labelShiftTime(shift.startTime, sweep.scheduledTime)}</p>
        <h2 className="text-3xl font-semibold tracking-tight">{building.name}</h2>
        <p className="text-white/80">{hasStarted(p) ? `Next: ${nextLocation?.label}` : `Starts at ${nextLocation?.label}`}</p>
      </div>
      {hasStarted(p) && (
        <div role="progressbar" aria-label={`${building.name} next sweep progress`} aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={done} className="h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${(done / p.total) * 100}%` }} />
        </div>
      )}
      <button type="button" className={heroButton} onClick={() => navigate({ name: 'walk', sweepId: sweep.id, buildingId, index })}>
        <Icon name="play" size={16} />
        {hasStarted(p) ? `Continue ${building.name}` : `Start ${building.name}`}
      </button>
    </section>
  )
}

function SweepCard({ shift, sweep, defaultOpen }: { shift: Shift; sweep: Sweep; defaultOpen: boolean }) {
  const { navigate } = useActiveShift()
  const [open, setOpen] = useState(defaultOpen)
  const detailsId = useId()
  const total = sweepProgress(shift, sweep)

  // Upcoming sweeps need no label; only started or finished ones get one.
  const status = isDone(total) ? <Badge tone="ok">Done</Badge> : hasStarted(total) ? <Badge tone="accent">In progress</Badge> : null

  return (
    <Card className="flex flex-col py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={detailsId}
        className="flex items-center gap-3 text-left min-h-11 -mx-1 px-1 rounded-md"
      >
        <span className="flex-1 text-xl font-semibold tracking-tight tabular-nums">{labelShiftTime(shift.startTime, sweep.scheduledTime)}</span>
        {status}
        <Icon name="chevron" className={cx('text-muted transition-transform', open && 'rotate-90')} />
      </button>

      <div id={detailsId} className="sweep-details" data-open={open} inert={!open} aria-hidden={!open}>
        <div className="min-h-0 overflow-hidden">
        <ul className="flex flex-col pt-2">
          {shiftBuildings(shift).map((b) => {
            const p = buildingProgress(sweep, b.id)
            const done = isDone(p)
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => navigate({ name: 'walk', sweepId: sweep.id, buildingId: b.id, index: done ? 0 : firstUnansweredIndex(sweep, b.id) })}
                  className="w-full flex items-center gap-3 rounded-lg -mx-2 px-2 py-2.5 min-h-14 text-left transition hover:bg-surface-2"
                >
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{b.name}</span>
                      <span className={cx('text-xs tabular-nums', done ? 'text-ok font-semibold' : 'text-muted')}>
                        {done ? 'Done' : `${p.answered + p.skipped} of ${p.total}`}
                      </span>
                    </span>
                    <ProgressBar value={p.answered + p.skipped} max={p.total} label={`${b.name} progress`} className="h-1 mt-2" />
                  </span>
                  <Icon name="chevron" className="text-muted shrink-0" />
                </button>
              </li>
            )
          })}
        </ul>
        </div>
      </div>

    </Card>
  )
}
