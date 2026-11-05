import { useState } from 'react'
import { LoadProblemBanner } from '../components/LoadProblemBanner'
import { ConfirmSheet } from '../components/Sheet'
import { ThemeToggle } from '../components/ThemeToggle'
import { Badge, Eyebrow, Page } from '../components/ui'
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

/** Friendly time-of-day greeting; overnight hours count as evening. */
function greeting(now = new Date()) {
  const h = now.getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  return 'Good evening'
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
          <h1 className="residence-title text-5xl sm:text-6xl text-[#751c36] dark:text-[#b8395c]">Princestock</h1>
          <p className="mt-3 text-muted">{greeting()}. Ready for rounds?</p>
        </div>
        <ThemeToggle />
      </div>

      {latest && (
        <div className="flex items-center rounded-xl bg-surface border-l-4 border-l-accent shadow-[0_1px_3px_rgb(0_0_0/0.06)] overflow-hidden">
          <button
            type="button"
            onClick={() => openShift(latest)}
            aria-label={`Resume Shift – ${formatDateShort(latest.date)}`}
            className="flex-1 min-w-0 flex items-center gap-3 p-4 text-left transition hover:bg-surface-2"
          >
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-semibold text-accent">Continue</span>
              <span className="block text-lg font-bold tracking-tight">{formatDateShort(latest.date)}</span>
              <span className="block text-sm text-muted truncate">
                {shiftSummary(latest)} · {sweepsDone(latest)}/{latest.sweeps.length} sweeps
              </span>
            </span>
          </button>
          <button type="button" className="min-h-11 px-3 rounded-md text-sm font-semibold text-danger transition hover:bg-danger-soft mr-2" onClick={() => setToDelete(latest)} aria-label={`Delete shift on ${formatDateShort(latest.date)}`}>
            Delete
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => navigate({ name: 'setup', mode: 'new' })}
          className="flex flex-col items-start justify-end gap-1 min-h-32 rounded-2xl p-4 text-left text-white bg-gradient-to-br from-[#8f2645] to-[#561327] shadow-lg shadow-[#561327]/20 transition active:scale-[0.98]"
        >
          <span className="text-lg font-bold leading-tight">Lead coverage</span>
          <span className="text-sm text-white/75">Lead CA</span>
        </button>
        <button
          type="button"
          onClick={() => navigate({ name: 'quick-setup', mode: 'new' })}
          className="flex flex-col items-start justify-end gap-1 min-h-32 rounded-2xl p-4 text-left bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.06)] transition hover:bg-surface-2 active:scale-[0.98]"
        >
          <span className="text-lg font-bold leading-tight">Quick sweep</span>
          <span className="text-sm text-muted">Support CA</span>
        </button>
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
            <button type="button" onClick={() => onDelete(s)} aria-label={`Delete shift on ${formatDateShort(s.date)}`} className="min-h-11 px-3 rounded-md text-sm font-semibold text-danger transition hover:bg-danger-soft">
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
