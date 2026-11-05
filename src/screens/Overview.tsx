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
import { applySchedule, caPool, sweepBuildingCAs } from '../domain/shift'
import { formatDateShort, formatTime12, isValidTime, labelShiftTime, nowTime } from '../domain/time'
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
        subtitle={quick ? `Quick sweep · ${getBuilding(shift.quickBuildingId!)?.name}` :
          <>
            {SHIFT_TYPE_LABELS[shift.type]} · {formatTime12(shift.startTime)}–{formatTime12(shift.endTime)}
          </>
        }
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

        {!quick && <TeamRow names={names} onEdit={edit} />}

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

        {shift.sweeps.length > 0 && <div className="flex items-center justify-between px-1 pt-2">
          <Eyebrow>{quick ? 'Your sweep' : 'Sweeps'}</Eyebrow>
          <span className="text-xs text-muted tabular-nums">{shift.sweeps.filter((s) => isDone(sweepProgress(shift, s))).length} of {shift.sweeps.length} complete</span>
        </div>}
        {shift.sweeps.map((sweep, i) => (
          <SweepCard key={sweep.id} shift={shift} sweep={sweep} number={i + 1} defaultOpen={quick || sweep.id === current} />
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
    <Button size="lg" className="border-dashed text-accent" onClick={() => { setTime(nowTime()); setError(''); setOpen(true) }}>
      <Icon name="plus" /> Add sweep
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

/** Hero card with the single next action. */
function UpNext({ shift }: { shift: Shift }) {
  const { navigate } = useActiveShift()
  const next = nextUp(shift)
  if (!shift.sweeps.length) return null

  if (!next) {
    return (
      <section className="rounded-lg bg-surface border border-line border-t-4 border-t-accent p-5 flex flex-col gap-1">
        <Eyebrow className="text-accent">Complete</Eyebrow>
        <h2 className="text-xl font-semibold">All sweeps recorded</h2>
        <p className="text-muted text-sm">Copy the report and paste it into StarRez.</p>
        <Button variant="primary" size="lg" className="mt-3" onClick={() => navigate({ name: 'report' })}>
          Open report
        </Button>
      </section>
    )
  }

  const { sweep, buildingId } = next
  const building = getBuilding(buildingId)!
  const p = buildingProgress(sweep, buildingId)
  const index = firstUnansweredIndex(sweep, buildingId)
  const nextLocation = getRoute(buildingId)[index]

  return (
    <section className="rounded-lg bg-surface border border-line border-t-4 border-t-accent p-5 sm:p-6 flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Eyebrow className="text-accent">Up next · {labelShiftTime(shift.startTime, sweep.scheduledTime)} sweep</Eyebrow>
        <h2 className="text-2xl font-semibold tracking-tight">{building.name}</h2>
        <p className="text-muted text-sm">
          {hasStarted(p) ? `${p.answered + p.skipped} of ${p.total} done · next: ${nextLocation?.label}` : `${p.total} locations · starts at ${nextLocation?.label}`}
        </p>
      </div>
      <ProgressBar value={p.answered + p.skipped} max={p.total} label={`${building.name} next sweep progress`} className="h-1" />
      <Button
        variant="primary"
        size="lg"
        onClick={() => navigate({ name: 'walk', sweepId: sweep.id, buildingId, index })}
      >
        <Icon name="play" size={16} />
        {hasStarted(p) ? `Continue ${building.name}` : `Start ${building.name}`}
      </Button>
    </section>
  )
}

/** Everyone on coverage, always visible on the overview. */
function TeamRow({ names, onEdit }: { names: string[]; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={names.length ? `CAs on coverage: ${names.join(', ')}. Edit` : 'Add CA names'}
      className="flex items-center gap-3 rounded-lg bg-surface border border-line/70 px-4 py-3 text-left min-h-14 hover:border-accent/50 transition"
    >
      <Icon name="users" size={18} className="text-muted" />
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted">On coverage</span>
        <span className={cx('block text-sm font-semibold truncate', !names.length && 'text-warn')}>
          {names.length ? names.join(', ') : 'Add CA names'}
        </span>
      </span>
      <Icon name="edit" size={16} className="text-muted" />
    </button>
  )
}

function SweepCard({ shift, sweep, number, defaultOpen }: { shift: Shift; sweep: Sweep; number: number; defaultOpen: boolean }) {
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
        <span className="flex-1">
          <span className="block text-xl font-semibold tracking-tight tabular-nums">{labelShiftTime(shift.startTime, sweep.scheduledTime)}</span>
          <span className="block text-xs text-muted">
            Sweep {number} · {total.answered + total.skipped}/{total.total}
          </span>
        </span>
        {status}
        <Icon name="chevron" className={cx('text-muted transition-transform', open && 'rotate-90')} />
      </button>

      <div id={detailsId} className="sweep-details" data-open={open} inert={!open} aria-hidden={!open}>
        <div className="min-h-0 overflow-hidden">
        <ul className="flex flex-col gap-1.5 pt-3">
          {shiftBuildings(shift).map((b) => {
            const p = buildingProgress(sweep, b.id)
            const bs = sweep.buildings[b.id]
            const done = isDone(p)
            const cas = sweepBuildingCAs(shift, sweep, b.id)
            const times = bs?.actualStart || bs?.actualEnd ? `${formatTime12(bs.actualStart) || '?'}–${formatTime12(bs.actualEnd) || '…'}` : ''
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => navigate({ name: 'walk', sweepId: sweep.id, buildingId: b.id, index: done ? 0 : firstUnansweredIndex(sweep, b.id) })}
                  className="w-full flex items-center gap-3 rounded-lg bg-surface-2/70 px-3.5 py-2.5 min-h-14 text-left transition hover:bg-surface-2"
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'size-8 shrink-0 rounded-full grid place-items-center text-xs font-bold',
                      done ? 'bg-ok-soft text-ok' : hasStarted(p) ? 'bg-accent-soft text-accent' : 'bg-surface text-muted border border-line',
                    )}
                  >
                    {done ? <Icon name="check" size={16} /> : b.name.charAt(0)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{b.name}</span>
                      <span className="text-xs text-muted tabular-nums">
                        {p.answered + p.skipped}/{p.total}
                      </span>
                    </span>
                    <ProgressBar value={p.answered + p.skipped} max={p.total} label={`${b.name} progress`} className="h-1 mt-1.5" />
                    {(times || cas.length > 0 || p.skipped > 0) && (
                      <span className="block text-xs text-muted truncate mt-1">
                        {[times, cas.join(', '), p.skipped ? `${p.skipped} not checked` : ''].filter(Boolean).join(' · ')}
                      </span>
                    )}
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
