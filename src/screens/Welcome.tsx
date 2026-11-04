import { useState } from 'react'
import { Icon } from '../components/Icon'
import { LoadProblemBanner } from '../components/LoadProblemBanner'
import { ConfirmSheet } from '../components/Sheet'
import { ThemeToggle } from '../components/ThemeToggle'
import { Badge, Button, Eyebrow, Page, ProgressRing } from '../components/ui'
import { SHIFT_TYPE_LABELS } from '../config/schedules'
import { sweepProgress } from '../domain/progress'
import { caPool } from '../domain/shift'
import { formatDateShort } from '../domain/time'
import type { Shift } from '../domain/types'
import { useStore } from '../state/store'

function sweepsDone(shift: Shift) {
  return shift.sweeps.filter((s) => sweepProgress(shift, s).unanswered === 0).length
}

function shiftSummary(shift: Shift) {
  return `${SHIFT_TYPE_LABELS[shift.type]} · ${caPool(shift).join(', ') || 'No CA names'}`
}

export function Welcome() {
  const { shifts, demo, openShift, startDemo, navigate, deleteShift } = useStore()
  const [toDelete, setToDelete] = useState<Shift | null>(null)
  const unfinished = shifts.filter((s) => !s.finished)
  const finished = shifts.filter((s) => s.finished)
  const latest = unfinished[0]

  return (
    <Page className="min-h-dvh py-6 gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div aria-hidden="true" className="size-8 rounded-xl bg-brand grid place-items-center text-white">
            <Icon name="sweeps" size={18} />
          </div>
          <span className="font-bold tracking-tight">SweepMate</span>
        </div>
        <ThemeToggle />
      </div>

      <LoadProblemBanner />

      <h1 className="text-2xl font-bold tracking-tight pt-2">Shifts</h1>

      {latest && (
        <button
          type="button"
          onClick={() => openShift(latest)}
          aria-label={`Resume Shift – ${formatDateShort(latest.date)}`}
          className="group flex items-center gap-4 rounded-3xl bg-surface border border-line/70 shadow-card p-4 text-left transition hover:border-accent/50 active:scale-[0.99]"
        >
          <ProgressRing value={sweepsDone(latest)} max={latest.sweeps.length || 1}>
            {sweepsDone(latest)}/{latest.sweeps.length}
          </ProgressRing>
          <span className="flex-1 min-w-0">
            <Eyebrow className="text-accent">In progress</Eyebrow>
            <span className="block text-lg font-bold tracking-tight">{formatDateShort(latest.date)}</span>
            <span className="block text-sm text-muted truncate">{shiftSummary(latest)}</span>
          </span>
          <span className="size-10 rounded-full bg-accent-soft text-accent grid place-items-center transition group-hover:translate-x-0.5">
            <Icon name="chevron" />
          </span>
        </button>
      )}

      <Button variant={latest ? 'secondary' : 'primary'} size="lg" onClick={() => navigate({ name: 'setup', mode: 'new' })}>
        <Icon name="plus" />
        Start Shift
      </Button>

      {unfinished.length > 1 && <ShiftList title="Other unfinished shifts" shifts={unfinished.slice(1)} onDelete={setToDelete} />}
      {finished.length > 0 && <ShiftList title="Past shifts" shifts={finished} onDelete={setToDelete} />}

      <div className="mt-auto flex flex-col items-center gap-1 text-center pt-4">
        <Button variant="ghost" size="sm" onClick={startDemo}>
          <Icon name="sparkle" size={16} />
          {demo ? 'Open demo shift' : 'Try a demo shift'}
        </Button>
        <p className="text-xs text-muted">Fictional data, kept separate from real shifts.</p>
        {demo && (
          <Button variant="ghost" size="sm" className="text-xs text-danger" onClick={() => setToDelete(demo)}>
            Delete demo shift
          </Button>
        )}
      </div>

      <ConfirmSheet
        open={!!toDelete}
        title="Delete shift?"
        message={
          toDelete && (
            <p>
              This permanently deletes the shift on <strong>{formatDateShort(toDelete.date)}</strong> including all counts, notes and
              report edits. This can't be undone.
            </p>
          )
        }
        confirmLabel="Delete shift"
        onConfirm={() => toDelete && deleteShift(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </Page>
  )
}

function ShiftList({ title, shifts, onDelete }: { title: string; shifts: Shift[]; onDelete: (s: Shift) => void }) {
  const { openShift } = useStore()
  return (
    <section className="flex flex-col gap-2">
      <Eyebrow className="px-1">{title}</Eyebrow>
      <ul className="rounded-3xl bg-surface border border-line/70 shadow-card divide-y divide-line/70 overflow-hidden">
        {shifts.map((s) => (
          <li key={s.id} className="flex items-center gap-1 pr-2">
            <button type="button" onClick={() => openShift(s)} className="flex-1 min-w-0 text-left min-h-14 px-4 py-2.5 hover:bg-surface-2">
              <span className="flex items-center gap-2 font-semibold">
                {formatDateShort(s.date)} {s.finished && <Badge tone="ok">Finished</Badge>}
              </span>
              <span className="block text-xs text-muted truncate">
                {shiftSummary(s)} · {sweepsDone(s)}/{s.sweeps.length} sweeps
              </span>
            </button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(s)} aria-label={`Delete shift on ${formatDateShort(s.date)}`} className="text-danger">
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
