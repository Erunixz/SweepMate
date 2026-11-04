import { useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { cx } from '../components/cx'
import { Icon } from '../components/Icon'
import { SaveIndicator } from '../components/SaveIndicator'
import { Badge, Button, Card, Eyebrow, Header, Page, ProgressBar, TextInput } from '../components/ui'
import { SHIFT_TYPE_LABELS } from '../config/schedules'
import { copyText, downloadText } from '../domain/clipboard'
import { buildingProgress, firstUnansweredIndex, hasStarted, isDone, missingDetails, missingEntries, sweepProgress } from '../domain/progress'
import { cleanText, generateReport, reportFileName } from '../domain/report'
import { getBuilding, getRoute, walkingBuildingOrder } from '../domain/route'
import { caPool, sweepBuildingCAs, updateSweep } from '../domain/shift'
import { formatDateShort, formatTime12, labelShiftTime } from '../domain/time'
import type { Shift, Sweep } from '../domain/types'
import { useReportTemplate } from '../state/reportTemplate'
import { useActiveShift } from '../state/store'

/** The next building to walk: the first unfinished building of the first unfinished sweep. */
function nextUp(shift: Shift) {
  for (const sweep of shift.sweeps) {
    for (const b of walkingBuildingOrder(shift.startingBuildingId)) {
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

  return (
    <>
      <Header
        title={formatDateShort(shift.date)}
        subtitle={
          <>
            {SHIFT_TYPE_LABELS[shift.type]} · {formatTime12(shift.startTime)}–{formatTime12(shift.endTime)}
          </>
        }
        onBack={() => navigate({ name: 'welcome' })}
        backLabel="Home"
        right={
          <div className="flex items-center">
            <SaveIndicator />
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'setup', mode: 'edit' })} aria-label="Edit shift">
              <Icon name="edit" />
            </Button>
          </div>
        }
      />
      <Page className="pb-28">
        {shift.isDemo && (
          <p className="self-start rounded-full bg-warn-soft text-warn px-3 py-1 text-xs font-semibold">Demo · fictional data</p>
        )}

        <UpNext shift={shift} />

        <TeamRow names={names} onEdit={() => navigate({ name: 'setup', mode: 'edit' })} />

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

        {shift.sweeps.length > 0 && <Eyebrow className="px-1 pt-2">Sweeps</Eyebrow>}
        {shift.sweeps.map((sweep, i) => (
          <SweepCard key={sweep.id} shift={shift} sweep={sweep} number={i + 1} defaultOpen={sweep.id === current} />
        ))}

        <ReportExport shift={shift} />

        <div className="flex flex-col items-center gap-1 pt-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted"
            onClick={() => updateActive((s) => ({ ...s, finished: !s.finished, updatedAt: new Date().toISOString() }))}
          >
            {shift.finished ? 'Reopen shift' : 'Mark shift finished'}
          </Button>
          <p className="text-xs text-muted">{shift.finished ? 'Finished shifts stay editable.' : 'Saved on this device until you delete it.'}</p>
        </div>
      </Page>
      <BottomNav badge={{ notes: openFollowUps }} />
    </>
  )
}

/** Hero card with the single next action. */
function UpNext({ shift }: { shift: Shift }) {
  const { navigate } = useActiveShift()
  const next = nextUp(shift)
  if (!shift.sweeps.length) return null

  if (!next) {
    return (
      <section className="rounded-3xl bg-brand text-white p-5 shadow-glow flex flex-col gap-1">
        <Eyebrow className="text-white/80">All done</Eyebrow>
        <h2 className="text-2xl font-extrabold tracking-tight">Every sweep is recorded.</h2>
        <p className="text-white/85 text-sm">Copy the report below and paste it into the reporting system.</p>
      </section>
    )
  }

  const { sweep, buildingId } = next
  const building = getBuilding(buildingId)!
  const p = buildingProgress(sweep, buildingId)
  const index = firstUnansweredIndex(sweep, buildingId)
  const nextLocation = getRoute(buildingId)[index]

  return (
    <section className="rounded-3xl bg-brand text-white p-5 shadow-glow flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Eyebrow className="text-white/80">Up next · {labelShiftTime(shift.startTime, sweep.scheduledTime)} sweep</Eyebrow>
        <h2 className="text-3xl font-extrabold tracking-tight">{building.name}</h2>
        <p className="text-white/85 text-sm">
          {hasStarted(p) ? `${p.answered + p.skipped} of ${p.total} done · next: ${nextLocation?.label}` : `${p.total} locations · starts at ${nextLocation?.label}`}
        </p>
      </div>
      <div className="h-1.5 rounded-full bg-white/25 overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${((p.answered + p.skipped) / p.total) * 100}%` }} />
      </div>
      <button
        type="button"
        onClick={() => navigate({ name: 'walk', sweepId: sweep.id, buildingId, index })}
        className="min-h-14 rounded-2xl bg-white text-[#3b2fd1] font-bold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition"
      >
        <Icon name="play" size={16} />
        {hasStarted(p) ? `Continue ${building.name}` : `Start ${building.name}`}
      </button>
    </section>
  )
}

/** One-tap export of the whole shift — every sweep in a single ready-to-paste report. */
function ReportExport({ shift }: { shift: Shift }) {
  const { navigate } = useActiveShift()
  const { template } = useReportTemplate()
  const [status, setStatus] = useState('')
  const text = cleanText(shift.reportDraft ?? generateReport(shift, template))
  const missing = missingEntries(shift).reduce((n, g) => n + g.locations.length, 0) + missingDetails(shift).length
  const n = shift.sweeps.length

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start gap-3">
        <div aria-hidden="true" className="size-10 rounded-2xl bg-accent-soft text-accent grid place-items-center shrink-0">
          <Icon name="report" size={20} />
        </div>
        <div className="flex-1">
          <h2 className="font-bold tracking-tight">Coverage report</h2>
          <p className="text-sm text-muted">
            All {n} sweep{n === 1 ? '' : 's'} in one plain-text report, ready to paste.
            {shift.reportDraft !== null && ' Includes your edits.'}
          </p>
        </div>
      </div>
      {missing > 0 && (
        <p className="rounded-xl bg-warn-soft text-warn px-3 py-2 text-sm font-semibold">
          {missing} item{missing === 1 ? '' : 's'} not recorded yet – shown as “{template.unanswered}”.
        </p>
      )}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button
          variant="primary"
          size="lg"
          onClick={async () => setStatus((await copyText(text)) ? 'Full report copied' : 'Copy failed – open the Report tab and copy manually')}
        >
          <Icon name="copy" />
          Copy Full Report
        </Button>
        <Button size="lg" onClick={() => downloadText(reportFileName(shift), text)} aria-label="Download TXT">
          <Icon name="download" />
          TXT
        </Button>
      </div>
      <div className="flex items-center justify-between min-h-6">
        <p role="status" className="text-sm text-ok font-semibold">
          {status && (
            <>
              <Icon name="check" size={14} className="inline -mt-0.5" /> {status}
            </>
          )}
        </p>
        <button type="button" onClick={() => navigate({ name: 'report' })} className="min-h-11 -my-2 px-2 -mr-2 rounded-xl text-sm font-semibold text-accent hover:bg-accent-soft">
          Preview & edit ›
        </button>
      </div>
    </Card>
  )
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()

/** Everyone on coverage, always visible on the overview. */
function TeamRow({ names, onEdit }: { names: string[]; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={names.length ? `CAs on coverage: ${names.join(', ')}. Edit` : 'Add CA names'}
      className="flex items-center gap-3 rounded-2xl bg-surface border border-line/70 shadow-card px-4 py-3 text-left min-h-14 hover:border-accent/50 transition"
    >
      <span className="flex -space-x-2" aria-hidden="true">
        {names.slice(0, 4).map((n) => (
          <span key={n} className="size-8 rounded-full bg-accent-soft text-accent border-2 border-surface grid place-items-center text-xs font-bold">
            {initials(n)}
          </span>
        ))}
        {names.length === 0 && (
          <span className="size-8 rounded-full bg-surface-2 text-muted grid place-items-center">
            <Icon name="users" size={16} />
          </span>
        )}
      </span>
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
  const total = sweepProgress(shift, sweep)

  const status = isDone(total) ? (
    <Badge tone="ok">
      <Icon name="check" size={12} /> Done
    </Badge>
  ) : hasStarted(total) ? (
    <Badge tone="accent">In progress</Badge>
  ) : (
    <Badge>Upcoming</Badge>
  )

  return (
    <Card className="flex flex-col gap-3 py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-3 text-left min-h-11 -mx-1 px-1 rounded-xl"
      >
        <span className="flex-1">
          <span className="block text-xl font-extrabold tracking-tight tabular-nums">{labelShiftTime(shift.startTime, sweep.scheduledTime)}</span>
          <span className="block text-xs text-muted">
            Sweep {number} · {total.answered + total.skipped}/{total.total}
          </span>
        </span>
        {status}
        <Icon name="chevron" className={cx('text-muted transition-transform', open && 'rotate-90')} />
      </button>

      {open && (
        <ul className="flex flex-col gap-1.5">
          {walkingBuildingOrder(shift.startingBuildingId).map((b) => {
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
                  className="w-full flex items-center gap-3 rounded-2xl bg-surface-2/70 px-3.5 py-2.5 min-h-14 text-left transition hover:bg-surface-2 active:scale-[0.99]"
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
      )}

    </Card>
  )
}
