import { useState } from 'react'
import { NoteSheet } from '../components/NoteSheet'
import { SaveIndicator } from '../components/SaveIndicator'
import { ConfirmSheet } from '../components/Sheet'
import { Badge, Button, Card, Header, Page } from '../components/ui'
import { NOTE_KIND_ORDER, NOTE_KINDS } from '../config/noteKinds'
import { deleteNote, sortNotes } from '../domain/shift'
import { labelShiftTime } from '../domain/time'
import type { Note, NoteKind } from '../domain/types'
import { useActiveShift } from '../state/store'

const statusTone = (n: Note) =>
  n.status === 'observed' || n.status === 'not-filed' || n.status === 'open' ? 'warn' : n.status ? 'ok' : 'neutral'

export function Notes() {
  const { shift, navigate, updateActive } = useActiveShift()
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
      <Header title="Notes & incidents" onBack={() => navigate({ name: 'overview' })} backLabel="Overview" right={<SaveIndicator />} />
      <Page className="pb-28">
        <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1" role="group" aria-label="Filter notes">
          {(['all', ...NOTE_KIND_ORDER] as const).map((k) => (
            <Button
              key={k}
              variant={filter === k ? 'primary' : 'secondary'}
              className="shrink-0 min-h-10"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
            >
              {k === 'all' ? 'All' : NOTE_KINDS[k].short} ({k === 'all' ? shift.notes.length : shift.notes.filter((n) => n.kind === k).length})
            </Button>
          ))}
        </div>

        {notes.length === 0 && <p className="text-muted text-center py-8">No notes yet.</p>}

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
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" className="text-danger" onClick={() => setToDelete(n)}>
                      Delete
                    </Button>
                    <Button onClick={() => setEditing(n)}>Edit</Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      </Page>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button variant="primary" size="lg" className="w-full" onClick={() => setAdding(true)}>
            + Add note
          </Button>
        </div>
      </div>

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
