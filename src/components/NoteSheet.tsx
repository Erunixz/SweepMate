import { useState } from 'react'
import { NOTE_KIND_ORDER, NOTE_KINDS } from '../config/noteKinds'
import { createNote, defaultStatus, upsertNote } from '../domain/shift'
import { labelShiftTime, nowTime } from '../domain/time'
import type { Note, NoteKind } from '../domain/types'
import { useActiveShift } from '../state/store'
import { Sheet } from './Sheet'
import { Button, Select, TextArea, TextInput } from './ui'

export interface NoteContext {
  sweepId: string | null
  buildingId: string | null
  location: string
}

/**
 * Add or edit a note. For new notes the current time, sweep and location are suggested
 * but remain editable.
 */
export function NoteSheet({
  open,
  onClose,
  context,
  note,
}: {
  open: boolean
  onClose: () => void
  context?: NoteContext
  note?: Note | null
}) {
  return (
    <Sheet open={open} onClose={onClose} title={note ? 'Edit note' : 'Add note'}>
      {open && <NoteForm key={note?.id ?? 'new'} context={context} note={note ?? null} onDone={onClose} />}
    </Sheet>
  )
}

function NoteForm({ context, note, onDone }: { context?: NoteContext; note: Note | null; onDone: () => void }) {
  const { shift, updateActive } = useActiveShift()
  const [draft, setDraft] = useState<Note>(
    () =>
      note ??
      createNote('general', {
        time: nowTime(),
        sweepId: context?.sweepId ?? (shift.mode === 'quick' ? shift.sweeps[0]!.id : null),
        buildingId: context?.buildingId ?? shift.quickBuildingId,
        location: context?.location ?? '',
      }),
  )
  const [error, setError] = useState('')
  const meta = NOTE_KINDS[draft.kind]
  const set = (patch: Partial<Note>) => setDraft((d) => ({ ...d, ...patch }))

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.description.trim()) {
      setError('Add a description.')
      return
    }
    updateActive((s) => upsertNote(s, { ...draft, description: draft.description.trim() }))
    onDone()
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4" noValidate>
      <Select
        label="Type"
        value={draft.kind}
        onChange={(e) => {
          const kind = e.target.value as NoteKind
          set({ kind, status: defaultStatus(kind) })
        }}
        options={NOTE_KIND_ORDER.map((k) => ({ value: k, label: NOTE_KINDS[k].label }))}
      />
      <TextArea
        label="Description"
        value={draft.description}
        onChange={(e) => {
          set({ description: e.target.value })
          setError('')
        }}
        placeholder="What happened or what you observed"
        required
      />
      <TextInput label="Location" value={draft.location} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. LP Floor 3 North lounge" />
      <TextArea label="Action taken" value={draft.action} onChange={(e) => set({ action: e.target.value })} rows={2} placeholder="Leave blank if none" />
      {meta.statuses.length > 0 && (
        <Select
          label="Status"
          value={draft.status}
          onChange={(e) => set({ status: e.target.value as Note['status'] })}
          options={meta.statuses.map((s) => ({ value: s.value, label: s.label }))}
        />
      )}

      {/* Prefilled or less common fields stay out of the way until needed. */}
      <details className="group rounded-lg border border-line/70 px-3">
        <summary className="min-h-11 flex items-center cursor-pointer text-sm font-semibold list-none">
          <span className="flex-1">More details</span>
          <span className="text-xs text-muted group-open:hidden">Time, sweep, contacts…</span>
        </summary>
        <div className="flex flex-col gap-4 pb-3">
          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <TextInput label="Time" type="time" value={draft.time} onChange={(e) => set({ time: e.target.value })} />
            <Button onClick={() => set({ time: nowTime() })}>Now</Button>
          </div>
          {shift.mode === 'full' && <Select
            label="Sweep"
            value={draft.sweepId ?? ''}
            onChange={(e) => set({ sweepId: e.target.value || null })}
            options={[
              { value: '', label: 'Whole shift (not tied to a sweep)' },
              ...shift.sweeps.map((s, i) => ({ value: s.id, label: `Sweep ${i + 1} (${labelShiftTime(shift.startTime, s.scheduledTime)})` })),
            ]}
          />}
          <TextInput label="Contacts" value={draft.contacts} onChange={(e) => set({ contacts: e.target.value })} placeholder="People or services contacted" />
          {meta.hasReference && (
            <TextInput label="Reference number" value={draft.reference} onChange={(e) => set({ reference: e.target.value })} placeholder="Work order / IR / SOC number" />
          )}
          <TextArea label="Follow-up needed" value={draft.followUp} onChange={(e) => set({ followUp: e.target.value })} rows={2} placeholder="Leave blank if none" />
        </div>
      </details>

      <p className="text-xs text-muted">Saving here doesn't file anything. Submit work orders, IRs and SOCs in the official system.</p>
      {error && (
        <p role="alert" className="text-sm text-danger font-semibold">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg">
        Save note
      </Button>
    </form>
  )
}
