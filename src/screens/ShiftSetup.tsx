import { useId, useState } from 'react'
import { Button, Card, Header, Page, Segmented, TextInput } from '../components/ui'
import { BUILDINGS } from '../config/buildings'
import { SHIFT_TEMPLATES, suggestShiftType } from '../config/schedules'
import { newId } from '../domain/ids'
import { applySchedule, createShift, updateDetails } from '../domain/shift'
import { isNextDay, isValidDate, isValidTime, parseDate, suggestedShiftDate, weekdayName } from '../domain/time'
import type { Shift, ShiftType } from '../domain/types'
import { useStore } from '../state/store'

interface SweepRow {
  key: string
  /** Existing sweep id when editing; undefined for new rows. */
  id?: string
  time: string
}

const toRows = (times: string[]): SweepRow[] => times.map((time) => ({ key: newId(), time }))

export function ShiftSetup({ mode }: { mode: 'new' | 'edit' }) {
  const { active, openShift, updateActive, navigate } = useStore()
  const editing = mode === 'edit' && active ? active : null

  const [date, setDate] = useState(editing?.date ?? suggestedShiftDate())
  const [type, setType] = useState<ShiftType>(editing?.type ?? suggestShiftType(parseDate(suggestedShiftDate())))
  const [startTime, setStartTime] = useState(editing?.startTime ?? SHIFT_TEMPLATES[type].start)
  const [endTime, setEndTime] = useState(editing?.endTime ?? SHIFT_TEMPLATES[type].end)
  const [caNames, setCaNames] = useState<string[]>(editing?.caNames.length ? editing.caNames : [''])
  const [partners, setPartners] = useState<string[]>(editing?.partners.length ? editing.partners : [''])
  const [startingBuildingId, setStartingBuildingId] = useState(editing?.startingBuildingId ?? BUILDINGS[0]!.id)
  const [rows, setRows] = useState<SweepRow[]>(
    editing ? editing.sweeps.map((s) => ({ key: s.id, id: s.id, time: s.scheduledTime })) : toRows(SHIFT_TEMPLATES[type].sweepTimes),
  )
  const [errors, setErrors] = useState<string[]>([])

  const applyTemplate = (t: ShiftType) => {
    const tpl = SHIFT_TEMPLATES[t]
    setStartTime(tpl.start)
    setEndTime(tpl.end)
    // Keep existing sweeps (and their data) when editing; only adjust times.
    setRows((prev) =>
      tpl.sweepTimes.map((time, i) => ({ key: prev[i]?.key ?? newId(), id: prev[i]?.id, time })),
    )
  }

  const changeType = (t: ShiftType) => {
    setType(t)
    if (!editing) applyTemplate(t)
  }

  const validate = (): string[] => {
    const errs: string[] = []
    if (!isValidDate(date)) errs.push('Enter a valid shift date.')
    if (!isValidTime(startTime) || !isValidTime(endTime)) errs.push('Enter valid shift start and end times.')
    if (!caNames.some((n) => n.trim())) errs.push('Enter at least one CA name.')
    if (rows.length === 0) errs.push('Add at least one sweep.')
    if (rows.some((r) => !isValidTime(r.time))) errs.push('Every sweep needs a valid time.')
    const times = rows.map((r) => r.time)
    if (new Set(times).size !== times.length) errs.push('Two sweeps have the same time.')
    return errs
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (errs.length) return
    const details = { date, type, startTime, endTime, caNames, partners, startingBuildingId }
    if (editing) {
      updateActive((s: Shift) => applySchedule(updateDetails(s, details), rows))
      navigate({ name: 'overview' })
    } else {
      openShift(createShift({ ...details, sweepTimes: rows.map((r) => r.time) }))
    }
  }

  const removedWithData = editing
    ? editing.sweeps.filter(
        (s) => !rows.some((r) => r.id === s.id) && Object.values(s.buildings).some((b) => Object.keys(b.entries).length),
      ).length
    : 0

  return (
    <>
      <Header
        title={editing ? 'Edit shift' : 'Start shift'}
        onBack={() => navigate(editing ? { name: 'overview' } : { name: 'welcome' })}
      />
      <Page>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Card className="flex flex-col gap-4">
            <TextInput
              label="Shift date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              hint={isValidDate(date) ? `${weekdayName(date)} – the date the shift starts, even if it runs past midnight.` : undefined}
              required
            />
            <Segmented
              label="Shift type"
              value={type}
              onChange={changeType}
              options={(Object.keys(SHIFT_TEMPLATES) as ShiftType[]).map((t) => ({ value: t, label: SHIFT_TEMPLATES[t].label }))}
            />
            {editing && (
              <Button onClick={() => applyTemplate(type)} className="self-start">
                Use default {SHIFT_TEMPLATES[type].label.toLowerCase()} times
              </Button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Shift start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <TextInput
                label="Shift end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                hint={isValidTime(endTime) && isValidTime(startTime) && isNextDay(startTime, endTime) ? 'Ends the next morning' : undefined}
              />
            </div>
          </Card>

          <Card className="flex flex-col gap-4">
            <NameList label="CA names" names={caNames} onChange={setCaNames} addLabel="Add CA" />
            <NameList label="Partners" names={partners} onChange={setPartners} addLabel="Add partner" optional />
            <Segmented
              label="Starting building"
              value={startingBuildingId}
              onChange={setStartingBuildingId}
              options={BUILDINGS.map((b) => ({ value: b.id, label: b.name }))}
            />
          </Card>

          <Card className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-semibold">Sweep times</h2>
              <p className="text-xs text-muted">Times before the shift start are treated as after midnight.</p>
            </div>
            <ol className="flex flex-col gap-2">
              {rows.map((row, i) => (
                <SweepTimeRow
                  key={row.key}
                  index={i}
                  row={row}
                  shiftStart={startTime}
                  onChange={(time) => setRows((rs) => rs.map((r) => (r.key === row.key ? { ...r, time } : r)))}
                  onRemove={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                />
              ))}
            </ol>
            <Button onClick={() => setRows((rs) => [...rs, { key: newId(), time: rs.at(-1)?.time ?? startTime }])} className="self-start">
              + Add sweep
            </Button>
            {removedWithData > 0 && (
              <p role="alert" className="text-sm rounded-lg bg-warn-soft text-warn p-2">
                {removedWithData} removed sweep{removedWithData > 1 ? 's have' : ' has'} recorded counts that will be deleted when you save.
              </p>
            )}
          </Card>

          {errors.length > 0 && (
            <div role="alert" className="rounded-xl bg-danger-soft text-danger p-3 text-sm">
              <ul className="list-disc pl-5">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" className="sticky bottom-3">
            {editing ? 'Save changes' : 'Start shift'}
          </Button>
        </form>
      </Page>
    </>
  )
}

function SweepTimeRow({
  index,
  row,
  shiftStart,
  onChange,
  onRemove,
}: {
  index: number
  row: SweepRow
  shiftStart: string
  onChange: (t: string) => void
  onRemove: () => void
}) {
  const id = useId()
  const nextDay = isValidTime(row.time) && isValidTime(shiftStart) && isNextDay(shiftStart, row.time)
  return (
    <li className="flex items-center gap-2">
      <label htmlFor={id} className="w-20 text-sm font-semibold">
        Sweep {index + 1}
      </label>
      <input
        id={id}
        type="time"
        value={row.time}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-h-11 rounded-xl border border-line bg-surface px-3"
      />
      <span className="w-16 text-xs text-muted">{nextDay ? 'next day' : ''}</span>
      <Button variant="ghost" onClick={onRemove} aria-label={`Remove sweep ${index + 1}`} className="px-3">
        ✕
      </Button>
    </li>
  )
}

function NameList({
  label,
  names,
  onChange,
  addLabel,
  optional,
}: {
  label: string
  names: string[]
  onChange: (n: string[]) => void
  addLabel: string
  optional?: boolean
}) {
  const baseId = useId()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold mb-1">
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </legend>
      {names.map((name, i) => (
        <div key={i} className="flex gap-2">
          <label htmlFor={`${baseId}-${i}`} className="sr-only">
            {label} {i + 1}
          </label>
          <input
            id={`${baseId}-${i}`}
            value={name}
            autoComplete="off"
            onChange={(e) => onChange(names.map((n, j) => (j === i ? e.target.value : n)))}
            className="flex-1 min-h-11 rounded-xl border border-line bg-surface px-3"
            placeholder="Name"
          />
          {names.length > 1 && (
            <Button variant="ghost" onClick={() => onChange(names.filter((_, j) => j !== i))} aria-label={`Remove ${name || `${label} ${i + 1}`}`} className="px-3">
              ✕
            </Button>
          )}
        </div>
      ))}
      <Button onClick={() => onChange([...names, ''])} className="self-start">
        + {addLabel}
      </Button>
    </fieldset>
  )
}
