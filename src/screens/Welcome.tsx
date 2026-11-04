import { useState } from 'react'
import { LoadProblemBanner } from '../components/LoadProblemBanner'
import { ThemeToggle } from '../components/ThemeToggle'
import { ConfirmSheet } from '../components/Sheet'
import { Badge, Button, Card, Page } from '../components/ui'
import { SHIFT_TEMPLATES } from '../config/schedules'
import { sweepProgress } from '../domain/progress'
import { formatDateShort } from '../domain/time'
import type { Shift } from '../domain/types'
import { useStore } from '../state/store'

function shiftSummary(shift: Shift) {
  const done = shift.sweeps.filter((s) => {
    const p = sweepProgress(shift, s)
    return s.missed || p.unanswered === 0
  }).length
  return `${SHIFT_TEMPLATES[shift.type].label} · ${shift.caNames.join(', ') || 'No CA names'} · ${done}/${shift.sweeps.length} sweeps`
}

export function Welcome() {
  const { shifts, demo, openShift, startDemo, navigate, deleteShift } = useStore()
  const [toDelete, setToDelete] = useState<Shift | null>(null)
  const unfinished = shifts.filter((s) => !s.finished)
  const finished = shifts.filter((s) => s.finished)
  const latest = unfinished[0]

  return (
    <Page className="min-h-dvh justify-center py-8">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <LoadProblemBanner />
      <div className="text-center flex flex-col gap-2 py-6">
        <div aria-hidden="true" className="mx-auto size-16 rounded-2xl bg-accent text-accent-fg grid place-items-center text-3xl font-black">
          S
        </div>
        <h1 className="text-3xl font-bold tracking-tight">SweepMate</h1>
        <p className="text-muted">Guided residence sweeps, counts, notes and coverage reports.</p>
      </div>

      <div className="flex flex-col gap-3">
        <Button variant="primary" size="lg" onClick={() => navigate({ name: 'setup', mode: 'new' })}>
          Start Shift
        </Button>
        <Button size="lg" disabled={!latest} onClick={() => latest && openShift(latest)}>
          {latest ? `Resume Shift – ${formatDateShort(latest.date)}` : 'Resume Shift (none in progress)'}
        </Button>
      </div>

      {unfinished.length > 1 && <ShiftList title="Other unfinished shifts" shifts={unfinished.slice(1)} onDelete={setToDelete} />}
      {finished.length > 0 && <ShiftList title="Finished shifts" shifts={finished} onDelete={setToDelete} />}

      <div className="flex flex-col items-center gap-1 text-center">
        <Button variant="ghost" onClick={startDemo}>
          {demo ? 'Open demo shift' : 'Try a demo shift'}
        </Button>
        <p className="text-xs text-muted">Fictional data, stored separately from real shifts.</p>
        {demo && (
          <Button variant="ghost" className="text-xs text-danger min-h-9" onClick={() => setToDelete(demo)}>
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
              This permanently deletes the shift on <strong>{formatDateShort(toDelete.date)}</strong> including all counts,
              notes and report edits. This can't be undone.
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
    <Card className="flex flex-col gap-2">
      <h2 className="text-sm font-bold text-muted">{title}</h2>
      <ul className="flex flex-col divide-y divide-line">
        {shifts.map((s) => (
          <li key={s.id} className="flex items-center gap-2 py-2">
            <button type="button" onClick={() => openShift(s)} className="flex-1 text-left min-h-11 rounded-lg px-1 hover:bg-surface-2">
              <div className="font-semibold">
                {formatDateShort(s.date)} {s.finished && <Badge tone="ok">Finished</Badge>}
              </div>
              <div className="text-xs text-muted">{shiftSummary(s)}</div>
            </button>
            <Button variant="ghost" onClick={() => onDelete(s)} aria-label={`Delete shift on ${formatDateShort(s.date)}`} className="text-danger">
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
