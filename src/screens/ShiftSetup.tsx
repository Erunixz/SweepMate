import { useId, useState } from 'react'
import { CAPicker } from '../components/CAPicker'
import { Button, Card, Header, Page, Segmented, TextInput } from '../components/ui'
import { BUILDINGS } from '../config/buildings'
import { SHIFT_TYPE_LABELS } from '../config/schedules'
import { newId } from '../domain/ids'
import { applySchedule, caPool, createShift, updateDetails } from '../domain/shift'
import { formatTime12, isNextDay, isValidDate, isValidTime, sortTimesForShift, suggestedShiftDate, weekdayName } from '../domain/time'
import type { Shift, ShiftType } from '../domain/types'
import { loadSchedules, saveSchedule } from '../state/schedulePrefs'
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
  const [schedules, setSchedules] = useState(loadSchedules)

  const initialType: ShiftType = editing?.type ?? 'weekday'
  const [date, setDate] = useState(editing?.date ?? suggestedShiftDate())
  const [type, setType] = useState<ShiftType>(initialType)
  const [phonePickup, setPhonePickup] = useState(editing?.phonePickup ?? schedules[initialType].phonePickup)
  const [startTime, setStartTime] = useState(editing?.startTime ?? schedules[initialType].start)
  const [endTime, setEndTime] = useState(editing?.endTime ?? schedules[initialType].end)
  const [myName, setMyName] = useState(editing?.myName ?? '')
  const [otherCAs, setOtherCAs] = useState<string[]>(editing?.otherCAs.length ? editing.otherCAs : [''])
  const [buildingCAs, setBuildingCAs] = useState<Record<string, string[]>>(editing?.buildingCAs ?? {})
  const [startingBuildingId, setStartingBuildingId] = useState(editing?.startingBuildingId ?? BUILDINGS[0]!.id)
  const [rows, setRows] = useState<SweepRow[]>(
    editing ? editing.sweeps.map((s) => ({ key: s.id, id: s.id, time: s.scheduledTime })) : toRows(schedules[initialType].sweepTimes),
  )
  const [errors, setErrors] = useState<string[]>([])
  const [savedDefault, setSavedDefault] = useState('')

  const pool = caPool({ myName, otherCAs })

  const applyDefaults = (t: ShiftType) => {
    const d = schedules[t]
    setStartTime(d.start)
    setEndTime(d.end)
    setPhonePickup(d.phonePickup)
    // Keep existing sweeps (and their data) when editing; only adjust times.
    setRows((prev) => d.sweepTimes.map((time, i) => ({ key: prev[i]?.key ?? newId(), id: prev[i]?.id, time })))
  }

  const changeType = (t: ShiftType) => {
    setType(t)
    setSavedDefault('')
    if (!editing) applyDefaults(t)
  }

  const validate = (): string[] => {
    const errs: string[] = []
    if (!isValidDate(date)) errs.push('Enter a valid coverage date.')
    if (!isValidTime(startTime) || !isValidTime(endTime)) errs.push('Enter valid shift start and end times.')
    if (phonePickup && !isValidTime(phonePickup)) errs.push('Enter a valid phone pick-up time, or clear it.')
    if (rows.length === 0) errs.push('Add at least one scheduled sweep.')
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
    const details = { date, type, phonePickup, startTime, endTime, myName, otherCAs, buildingCAs, startingBuildingId }
    if (editing) {
      updateActive((s: Shift) => applySchedule(updateDetails(s, details), rows))
      navigate({ name: 'overview' })
    } else {
      openShift(createShift({ ...details, sweepTimes: rows.map((r) => r.time) }))
    }
  }

  const saveAsDefault = () => {
    const times = rows.map((r) => r.time).filter(isValidTime)
    const ok = saveSchedule(type, { start: startTime, end: endTime, phonePickup, sweepTimes: sortTimesForShift(startTime, times) })
    if (ok) setSchedules(loadSchedules())
    setSavedDefault(ok ? `Saved as the ${SHIFT_TYPE_LABELS[type]} default on this device.` : "Couldn't save the default on this device.")
  }

  const removedWithData = editing
    ? editing.sweeps.filter(
        (s) => !rows.some((r) => r.id === s.id) && Object.values(s.buildings).some((b) => Object.keys(b.entries).length),
      ).length
    : 0

  return (
    <>
      <Header title={editing ? 'Edit shift' : 'Start shift'} onBack={() => navigate(editing ? { name: 'overview' } : { name: 'welcome' })} />
      <Page>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Card className="flex flex-col gap-4">
            <TextInput
              label="Coverage date"
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
              options={(Object.keys(SHIFT_TYPE_LABELS) as ShiftType[]).map((t) => ({ value: t, label: SHIFT_TYPE_LABELS[t] }))}
            />
            {editing && (
              <Button onClick={() => applyDefaults(type)} className="self-start">
                Use saved {SHIFT_TYPE_LABELS[type]} times
              </Button>
            )}
          </Card>

          <Card className="flex flex-col gap-4">
            <TextInput label="My name" value={myName} onChange={(e) => setMyName(e.target.value)} autoComplete="name" placeholder="Your name" />
            <NameList label="Other CAs on coverage" names={otherCAs} onChange={setOtherCAs} addLabel="Add CA" />
            {BUILDINGS.map((b) => (
              <CAPicker
                key={b.id}
                label={`CAs sweeping ${b.name}`}
                pool={pool}
                selected={buildingCAs[b.id] ?? []}
                onChange={(names) => setBuildingCAs((m) => ({ ...m, [b.id]: names }))}
              />
            ))}
            <p className="text-xs text-muted -mt-2">You can change who swept a building for an individual sweep during the walkthrough.</p>
            <Segmented
              label="Starting building"
              value={startingBuildingId}
              onChange={setStartingBuildingId}
              options={BUILDINGS.map((b) => ({ value: b.id, label: b.name }))}
            />
          </Card>

          <Card className="flex flex-col gap-4">
            <TextInput
              label="Coverage phone pick-up"
              type="time"
              value={phonePickup}
              onChange={(e) => setPhonePickup(e.target.value)}
              hint="Leave blank if not recorded yet."
            />
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Shift start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <TextInput
                label="Shift end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                hint={isValidTime(endTime) && isValidTime(startTime) && isNextDay(startTime, endTime) ? 'Next day' : undefined}
              />
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-semibold">Scheduled sweeps</h2>
              <p className="text-xs text-muted">Times before the shift start (e.g. 1:00 AM) fall on the next calendar day.</p>
            </div>
            {rows.length === 0 && <p className="text-sm text-muted">No sweeps yet – add the scheduled sweep times for this shift.</p>}
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
            <div className="border-t border-line pt-3 flex flex-col gap-1">
              <Button onClick={saveAsDefault} className="self-start">
                Save times as {SHIFT_TYPE_LABELS[type]} default
              </Button>
              <p className="text-xs text-muted" role="status">
                {savedDefault || `Saves start, end, phone pick-up and sweep times for future ${SHIFT_TYPE_LABELS[type]} shifts.`}
              </p>
            </div>
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
        aria-describedby={nextDay ? `${id}-next` : undefined}
        className="flex-1 min-h-11 rounded-xl border border-line bg-surface px-3"
      />
      <span id={`${id}-next`} className="w-16 text-xs text-muted">
        {nextDay ? 'next day' : ''}
      </span>
      <Button variant="ghost" onClick={onRemove} aria-label={`Remove sweep ${index + 1} (${formatTime12(row.time)})`} className="px-3">
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
}: {
  label: string
  names: string[]
  onChange: (n: string[]) => void
  addLabel: string
}) {
  const baseId = useId()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold mb-1">{label}</legend>
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
