import { useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { cx } from '../components/cx'
import { Icon } from '../components/Icon'
import { NoteSheet } from '../components/NoteSheet'
import { SaveIndicator } from '../components/SaveIndicator'
import { ConfirmSheet } from '../components/Sheet'
import { Badge, Button, Card, Header, Page, TextArea } from '../components/ui'
import { NOTE_KIND_ORDER, NOTE_KINDS } from '../config/noteKinds'
import { deleteNote, sortNotes } from '../domain/shift'
import { labelShiftTime } from '../domain/time'
import type { Note, NoteKind } from '../domain/types'
import { useActiveShift } from '../state/store'

const statusTone = (n: Note) =>
  n.status === 'observed' || n.status === 'not-filed' || n.status === 'open' ? 'warn' : n.status ? 'ok' : 'neutral'

export function Notes() {
  const { shift, updateActive } = useActiveShift()
  const [editing, setEditing] = useState<Note | null>(null)
  const [adding, setAdding] = useState(false)
  const [toDelete, setToDelete] = useState<Note | null>(null)
  const [filter, setFilter] = useState<NoteKind | 'all'>('all')

  const sweepLabel = (id: string | null) => {
    const i = shift.sweeps.findIndex((s) => s.id === id)
    return i >= 0 ? `Sweep ${i + 1}` : 'Shift'
  }
  const notes = sortNotes(shift, filter === 'all' ? shift.notes : shift.notes.filter((n) => n.kind === filter))

  return (
    <>
      <Header title="Notes & incidents" subtitle="Printed under Extra Notes in the report" right={<SaveIndicator />} />
      <Page className="pb-44">
        <Card className="flex flex-col gap-2">
          <TextArea
            label="Extra Notes"
            hint="Free text, printed under Extra Notes in the report (one line per entry). Use Add note below for timed entries."
            value={shift.extraNotes}
            rows={3}
            onChange={(e) => updateActive((s) => ({ ...s, extraNotes: e.target.value, updatedAt: new Date().toISOString() }))}
          />
        </Card>
        <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1" role="group" aria-label="Filter notes">
          {(['all', ...NOTE_KIND_ORDER] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={cx(
                'shrink-0 min-h-10 rounded-full px-4 text-sm font-semibold border transition',
                filter === k ? 'bg-fg text-bg border-fg' : 'bg-surface text-muted border-line hover:text-fg',
              )}
            >
              {k === 'all' ? 'All' : NOTE_KINDS[k].short}{' '}
              <span className="opacity-60">{k === 'all' ? shift.notes.length : shift.notes.filter((n) => n.kind === k).length}</span>
            </button>
          ))}
        </div>

        {notes.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <div aria-hidden="true" className="size-12 rounded-2xl bg-accent-soft text-accent grid place-items-center">
              <Icon name="notes" size={22} />
            </div>
            <p className="font-semibold">No notes yet</p>
            <p className="text-sm text-muted max-w-xs">Observations, maintenance, IRs, SOCs and follow-ups you add during the shift show up here.</p>
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {notes.map((n) => {
            const statusLabel = NOTE_KINDS[n.kind].statuses.find((s) => s.value === n.status)?.label
            return (
              <li key={n.id}>
                <Card className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge tone="accent">{NOTE_KINDS[n.kind].short}</Badge>
                    {statusLabel && <Badge tone={statusTone(n)}>{statusLabel}</Badge>}
                    <span className="text-muted">
                      {n.time ? labelShiftTime(shift.startTime, n.time) : 'No time'} · {sweepLabel(n.sweepId)}
                      {n.location && ` · ${n.location}`}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{n.description}</p>
                  {n.action && <p className="text-sm"><span className="font-semibold">Action:</span> {n.action}</p>}
                  {n.contacts && <p className="text-sm"><span className="font-semibold">Contacts:</span> {n.contacts}</p>}
                  {n.reference && <p className="text-sm"><span className="font-semibold">Ref #:</span> {n.reference}</p>}
                  {n.followUp && <p className="text-sm"><span className="font-semibold">Follow-up:</span> {n.followUp}</p>}
                  <div className="flex gap-1 justify-end -mb-1">
                    <Button variant="ghost" size="sm" className="text-danger" onClick={() => setToDelete(n)}>
                      Delete
                    </Button>
                    <Button variant="ghost" size="sm" className="text-accent" onClick={() => setEditing(n)}>
                      Edit
                    </Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      </Page>

      <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 pointer-events-none">
        <div className="mx-auto max-w-2xl px-4 flex justify-end">
          <Button variant="primary" size="lg" className="pointer-events-auto rounded-full px-6" onClick={() => setAdding(true)}>
            <Icon name="plus" />
            Add note
          </Button>
        </div>
      </div>
      <BottomNav />

      <NoteSheet
        open={adding || !!editing}
        note={editing}
        context={{ sweepId: null, buildingId: null, location: '' }}
        onClose={() => {
          setAdding(false)
          setEditing(null)
        }}
      />
      <ConfirmSheet
        open={!!toDelete}
        title="Delete note?"
        message="This note will be permanently removed from the shift."
        confirmLabel="Delete note"
        onConfirm={() => toDelete && updateActive((s) => deleteNote(s, toDelete.id))}
        onClose={() => setToDelete(null)}
      />
    </>
  )
}
