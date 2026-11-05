import { useState } from 'react'
import { Icon } from '../components/Icon'
import { LoadProblemBanner } from '../components/LoadProblemBanner'
import { ConfirmSheet } from '../components/Sheet'
import { ThemeToggle } from '../components/ThemeToggle'
import { Badge, Button, Eyebrow, Page } from '../components/ui'
import { SHIFT_TYPE_LABELS } from '../config/schedules'
import { sweepProgress } from '../domain/progress'
import { getBuilding } from '../domain/route'
import { caPool } from '../domain/shift'
import { formatDateShort } from '../domain/time'
import type { Shift } from '../domain/types'
import { useStore } from '../state/store'

function sweepsDone(shift: Shift) {
  return shift.sweeps.filter((s) => sweepProgress(shift, s).unanswered === 0).length
}

function shiftSummary(shift: Shift) {
  return `${shift.mode === 'quick' ? getBuilding(shift.quickBuildingId!)?.name : SHIFT_TYPE_LABELS[shift.type]} · ${caPool(shift).join(', ') || 'No CA names'}`
}

export function Welcome() {
  const { shifts, openShift, navigate, deleteShift } = useStore()
  const [toDelete, setToDelete] = useState<Shift | null>(null)
  const unfinished = shifts.filter((s) => !s.finished)
  const finished = shifts.filter((s) => s.finished)
  const latest = unfinished[0]

  return (
    <Page className="min-h-dvh py-6 gap-6">
      <LoadProblemBanner />

      <div className="flex items-start justify-between gap-3 pt-3 pb-6 border-b border-line">
        <div>
          <h1 className="residence-title text-5xl sm:text-6xl text-accent">Princestock</h1>
          <p className="mt-3 text-sm text-muted">Woodstock &amp; Les Prince</p>
        </div>
        <ThemeToggle />
      </div>

      {latest && (
        <button
          type="button"
          onClick={() => openShift(latest)}
          aria-label={`Resume Shift – ${formatDateShort(latest.date)}`}
          className="flex items-center gap-4 rounded-lg bg-surface border border-line border-l-4 border-l-accent p-4 text-left transition hover:bg-surface-2"
        >
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-semibold text-accent">Continue</span>
            <span className="block text-lg font-bold tracking-tight">{formatDateShort(latest.date)}</span>
            <span className="block text-sm text-muted truncate">
              {shiftSummary(latest)} · {sweepsDone(latest)}/{latest.sweeps.length} sweeps
            </span>
          </span>
          <Icon name="chevron" className="text-muted" />
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="primary" size="lg" className="px-3 py-3 flex-col gap-0.5" onClick={() => navigate({ name: 'setup', mode: 'new' })}>
          Lead coverage
          <span className="text-xs font-medium opacity-80">Lead CA</span>
        </Button>
        <Button size="lg" className="px-3 py-3 flex-col gap-0.5" onClick={() => navigate({ name: 'quick-setup', mode: 'new' })}>
          Quick sweep
          <span className="text-xs font-medium text-muted">Support CA</span>
        </Button>
      </div>

      {unfinished.length > 1 && <ShiftList title="Other unfinished shifts" shifts={unfinished.slice(1)} onDelete={setToDelete} />}
      {finished.length > 0 && <ShiftList title="Past shifts" shifts={finished} onDelete={setToDelete} />}

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
      <ul className="rounded-lg bg-surface border border-line/70 divide-y divide-line/70 overflow-hidden">
        {shifts.map((s) => (
          <li key={s.id} className="flex items-center gap-1 pr-2">
            <button type="button" onClick={() => openShift(s)} className="flex-1 min-w-0 text-left min-h-14 px-4 py-2.5 hover:bg-surface-2">
              <span className="flex items-center gap-2 font-semibold">
                {formatDateShort(s.date)} {s.mode === 'quick' && <Badge tone="accent">Quick</Badge>}
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
