import { useState } from 'react'
import { SaveIndicator } from '../components/SaveIndicator'
import { ThemeToggle } from '../components/ThemeToggle'
import { Badge, Button, Card, Header, Page, ProgressBar, TextInput } from '../components/ui'
import { SHIFT_TEMPLATES } from '../config/schedules'
import { buildingProgress, firstUnansweredIndex, hasStarted, isDone, sweepProgress, type Progress } from '../domain/progress'
import { walkingBuildingOrder } from '../domain/route'
import { updateSweep } from '../domain/shift'
import { formatDateShort, labelShiftTime, nowTime } from '../domain/time'
import type { Shift, Sweep } from '../domain/types'
import { useActiveShift } from '../state/store'

export function Overview() {
  const { shift, navigate, updateActive } = useActiveShift()
  const tpl = SHIFT_TEMPLATES[shift.type]
  const openNotes = shift.notes.filter((n) => n.kind === 'follow-up' && n.status === 'open').length

  return (
    <>
      <Header
        title={formatDateShort(shift.date)}
        subtitle={
          <>
            {tpl.label} {shift.startTime}–{shift.endTime} · {shift.caNames.join(', ')}
            {shift.partners.length > 0 && ` + ${shift.partners.join(', ')}`}
          </>
        }
        onBack={() => navigate({ name: 'welcome' })}
        backLabel="Home"
        right={
          <div className="flex items-center">
            <SaveIndicator />
            <ThemeToggle />
          </div>
        }
      />
      <Page>
        {shift.isDemo && (
          <p className="rounded-xl bg-warn-soft text-warn p-3 text-sm font-semibold">
            Demo shift – fictional data. It's kept separate from your real shifts.
          </p>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => navigate({ name: 'notes' })}>
            Notes
            {shift.notes.length > 0 && <Badge tone={openNotes ? 'warn' : 'neutral'}>{shift.notes.length}</Badge>}
          </Button>
          <Button onClick={() => navigate({ name: 'report' })}>Report</Button>
          <Button onClick={() => navigate({ name: 'setup', mode: 'edit' })}>Edit shift</Button>
        </div>

        {shift.sweeps.map((sweep, i) => (
          <SweepCard key={sweep.id} shift={shift} sweep={sweep} number={i + 1} />
        ))}

        <Card className="flex flex-col gap-2">
          <p className="text-sm text-muted">
            {shift.finished
              ? 'This shift is marked finished. You can still edit it.'
              : 'Mark the shift finished once the report is submitted. It stays saved on this device until you delete it.'}
          </p>
          <Button onClick={() => updateActive((s) => ({ ...s, finished: !s.finished, updatedAt: new Date().toISOString() }))}>
            {shift.finished ? 'Reopen shift' : 'Mark shift finished'}
          </Button>
        </Card>
      </Page>
    </>
  )
}

function progressLabel(p: Progress) {
  const parts = [`${p.answered + p.skipped}/${p.total}`]
  if (p.skipped) parts.push(`${p.skipped} not checked`)
  return parts.join(' · ')
}

function SweepCard({ shift, sweep, number }: { shift: Shift; sweep: Sweep; number: number }) {
  const { navigate, updateActive } = useActiveShift()
  const [showMissed, setShowMissed] = useState(sweep.missed)
  const total = sweepProgress(shift, sweep)
  const patch = (p: Partial<Sweep>) => updateActive((s) => updateSweep(s, sweep.id, p))

  const status = sweep.missed ? (
    <Badge tone="danger">Missed</Badge>
  ) : isDone(total) ? (
    <Badge tone="ok">Complete</Badge>
  ) : hasStarted(total) ? (
    <Badge tone="accent">In progress</Badge>
  ) : (
    <Badge>Not started</Badge>
  )

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-lg font-bold">
          Sweep {number} <span className="text-muted font-semibold">· {labelShiftTime(shift.startTime, sweep.scheduledTime)}</span>
        </h2>
        {status}
      </div>

      {!sweep.missed && (
        <>
          <ProgressBar value={total.answered + total.skipped} max={total.total} label={`Sweep ${number} progress`} />
          <ul className="flex flex-col gap-2">
            {walkingBuildingOrder(shift.startingBuildingId).map((b) => {
              const p = buildingProgress(sweep, b.id)
              const action = isDone(p) ? 'Review' : hasStarted(p) ? 'Continue' : 'Start'
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!sweep.actualStart) patch({ actualStart: nowTime() })
                      navigate({ name: 'walk', sweepId: sweep.id, buildingId: b.id, index: isDone(p) ? 0 : firstUnansweredIndex(sweep, b.id) })
                    }}
                    className="w-full flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 min-h-14 text-left hover:border-accent"
                  >
                    <span className="flex-1">
                      <span className="block font-semibold">{b.name}</span>
                      <span className="block text-xs text-muted">{progressLabel(p)}</span>
                    </span>
                    <span className={isDone(p) ? 'text-ok font-semibold text-sm' : 'text-accent font-semibold text-sm'}>
                      {action} ›
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="grid grid-cols-2 gap-3">
            <TimeWithNow label="Actual start" value={sweep.actualStart} onChange={(v) => patch({ actualStart: v })} />
            <TimeWithNow label="Actual end" value={sweep.actualEnd} onChange={(v) => patch({ actualEnd: v })} />
          </div>
        </>
      )}

      {showMissed ? (
        <div className="flex flex-col gap-2 rounded-xl bg-danger-soft/50 p-3">
          <TextInput
            label="Reason sweep was missed"
            value={sweep.missedReason}
            placeholder="e.g. responding to an incident"
            onChange={(e) => patch({ missedReason: e.target.value, missed: true })}
          />
          <Button
            onClick={() => {
              patch({ missed: false, missedReason: '' })
              setShowMissed(false)
            }}
          >
            {sweep.missed ? 'Undo – sweep was not missed' : 'Cancel'}
          </Button>
          {sweep.missed && hasStarted(total) && (
            <p className="text-xs">Counts already recorded for this sweep are kept but left out of the report while it's marked missed.</p>
          )}
        </div>
      ) : (
        <Button
          variant="ghost"
          className="self-start text-muted"
          onClick={() => {
            setShowMissed(true)
            patch({ missed: true })
          }}
        >
          Mark sweep as missed…
        </Button>
      )}
    </Card>
  )
}

function TimeWithNow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <TextInput label={label} type="time" value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="flex gap-1">
        <Button variant="ghost" className="flex-1 text-xs min-h-9" onClick={() => onChange(nowTime())}>
          Now
        </Button>
        {value && (
          <Button variant="ghost" className="flex-1 text-xs min-h-9" onClick={() => onChange('')}>
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
