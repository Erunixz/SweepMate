import { useId, useState } from 'react'
import { CAPicker } from '../components/CAPicker'
import { cx } from '../components/cx'
import { Icon } from '../components/Icon'
import { Button, Header, Page, Segmented, TextInput } from '../components/ui'
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

const STEPS = [
  { title: 'Shift', heading: 'Which shift?', sub: 'The coverage date is the night the shift starts.' },
  { title: 'Team', heading: "Who's on coverage?", sub: 'Add the CAs, then pick who sweeps each building.' },
  { title: 'Schedule', heading: 'Set the schedule', sub: 'Times before the shift start (like 1:00 AM) count as the next day.' },
] as const

/** Shift setup as three short steps. In edit mode every step is reachable and Save is always available. */
export function ShiftSetup({ mode }: { mode: 'new' | 'edit' }) {
  const { active, openShift, updateActive, navigate } = useStore()
  const editing = mode === 'edit' && active ? active : null
  const [schedules, setSchedules] = useState(loadSchedules)
  const [step, setStep] = useState(0)

  const initialType: ShiftType = editing?.type ?? 'weekday'
  const [date, setDate] = useState(editing?.date ?? suggestedShiftDate())
  const [type, setType] = useState<ShiftType>(initialType)
  const [phonePickup, setPhonePickup] = useState(editing?.phonePickup ?? schedules[initialType].phonePickup)
  const [startTime, setStartTime] = useState(editing?.startTime ?? schedules[initialType].start)
  const [endTime, setEndTime] = useState(editing?.endTime ?? schedules[initialType].end)
  const [myName, setMyName] = useState(editing?.myName ?? '')
  const [otherCAs, setOtherCAs] = useState<string[]>(editing?.otherCAs.length ? editing.otherCAs : [''])
  // A building without an explicit choice follows everyone on coverage.
  const [buildingCAs, setBuildingCAs] = useState<Record<string, string[]>>(editing?.buildingCAs ?? {})
  const [startingBuildingId, setStartingBuildingId] = useState(editing?.startingBuildingId ?? BUILDINGS[0]!.id)
  const [rows, setRows] = useState<SweepRow[]>(
    editing ? editing.sweeps.map((s) => ({ key: s.id, id: s.id, time: s.scheduledTime })) : toRows(schedules[initialType].sweepTimes),
  )
  const [errors, setErrors] = useState<string[]>([])
  const [savedDefault, setSavedDefault] = useState('')

  const pool = caPool({ myName, otherCAs })
  const selectedFor = (b: string) => buildingCAs[b] ?? pool

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

  const stepErrors = (s: number): string[] => {
    const errs: string[] = []
    if (s === 0 && !isValidDate(date)) errs.push('Enter a valid coverage date.')
    if (s === 2) {
      if (!isValidTime(startTime) || !isValidTime(endTime)) errs.push('Enter valid shift start and end times.')
      if (phonePickup && !isValidTime(phonePickup)) errs.push('Enter a valid phone pick-up time, or clear it.')
      if (rows.length === 0) errs.push('Add at least one scheduled sweep.')
      if (rows.some((r) => !isValidTime(r.time))) errs.push('Every sweep needs a valid time.')
      const times = rows.map((r) => r.time)
      if (new Set(times).size !== times.length) errs.push('Two sweeps have the same time.')
    }
    return errs
  }

  const goTo = (s: number) => {
    setErrors([])
    setStep(s)
    window.scrollTo?.({ top: 0 })
  }

  const next = () => {
    const errs = stepErrors(step)
    setErrors(errs)
    if (!errs.length) goTo(step + 1)
  }

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    for (let s = 0; s < STEPS.length; s++) {
      const errs = stepErrors(s)
      if (errs.length) {
        setStep(s)
        setErrors(errs)
        return
      }
    }
    const resolvedCAs = Object.fromEntries(BUILDINGS.map((b) => [b.id, selectedFor(b.id)]))
    const details = { date, type, phonePickup, startTime, endTime, myName, otherCAs, buildingCAs: resolvedCAs, startingBuildingId }
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
    setSavedDefault(ok ? `Saved as the ${SHIFT_TYPE_LABELS[type]} default.` : "Couldn't save the default on this device.")
  }

  const removedWithData = editing
    ? editing.sweeps.filter(
        (s) => !rows.some((r) => r.id === s.id) && Object.values(s.buildings).some((b) => Object.keys(b.entries).length),
      ).length
    : 0

  const last = step === STEPS.length - 1
  const meta = STEPS[step]!

  return (
    <>
      <Header
        title={editing ? 'Edit shift' : 'New shift'}
        onBack={() => (step > 0 && !editing ? goTo(step - 1) : navigate(editing ? { name: 'overview' } : { name: 'welcome' }))}
        right={
          editing ? (
            <Button variant="ghost" size="sm" className="text-accent" onClick={() => submit()}>
              Save
            </Button>
          ) : undefined
        }
      />
      <Page className="pb-32">
        <ol className="grid grid-cols-3 gap-2" aria-label="Setup steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => (editing || i < step ? goTo(i) : undefined)}
                aria-current={i === step ? 'step' : undefined}
                className="w-full flex flex-col gap-1.5 text-left min-h-11"
              >
                <span className={cx('h-1 rounded-full transition', i <= step ? 'bg-brand' : 'bg-line')} />
                <span className={cx('text-xs font-semibold', i === step ? 'text-fg' : 'text-muted')}>
                  {i + 1}. {s.title}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="pt-2">
          <h2 className="text-[28px] font-extrabold tracking-tight leading-tight">{meta.heading}</h2>
          <p className="text-muted text-sm mt-1">{meta.sub}</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (last) submit()
            else next()
          }}
          className="flex flex-col gap-5"
          noValidate
        >
          {step === 0 && (
            <>
              <TextInput
                label="Coverage date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                hint={isValidDate(date) ? weekdayName(date) : undefined}
                required
              />
              <Segmented
                label="Shift type"
                value={type}
                onChange={changeType}
                options={(Object.keys(SHIFT_TYPE_LABELS) as ShiftType[]).map((t) => ({ value: t, label: SHIFT_TYPE_LABELS[t] }))}
              />
            </>
          )}

          {step === 1 && (
            <>
              <TextInput label="My name" value={myName} onChange={(e) => setMyName(e.target.value)} autoComplete="name" placeholder="Your name" />
              <NameList label="Other CAs on coverage" names={otherCAs} onChange={setOtherCAs} addLabel="Add CA" />
              <div className="flex flex-col gap-4 rounded-3xl bg-surface border border-line/70 shadow-card p-4">
                {BUILDINGS.map((b) => (
                  <CAPicker
                    key={b.id}
                    label={`Sweeping ${b.name}`}
                    pool={pool}
                    selected={selectedFor(b.id)}
                    onChange={(names) => setBuildingCAs((m) => ({ ...m, [b.id]: names }))}
                  />
                ))}
                <p className="text-xs text-muted">Everyone is selected until you change it. You can adjust it per sweep later.</p>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <Segmented
                label="Starting building"
                value={startingBuildingId}
                onChange={setStartingBuildingId}
                options={BUILDINGS.map((b) => ({ value: b.id, label: b.name }))}
              />
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

              <section className="flex flex-col gap-3 rounded-3xl bg-surface border border-line/70 shadow-card p-4">
                <h3 className="text-sm font-semibold">Scheduled sweeps</h3>
                {rows.length === 0 && <p className="text-sm text-muted">No sweeps yet – add each scheduled sweep time.</p>}
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
                  <Icon name="plus" size={16} />
                  Add sweep
                </Button>
                {removedWithData > 0 && (
                  <p role="alert" className="text-sm rounded-xl bg-warn-soft text-warn p-2">
                    {removedWithData} removed sweep{removedWithData > 1 ? 's have' : ' has'} recorded counts that will be deleted when you save.
                  </p>
                )}
              </section>

              <div className="flex flex-col items-start gap-1">
                <Button variant="ghost" size="sm" className="text-accent -ml-2" onClick={saveAsDefault}>
                  Save times as {SHIFT_TYPE_LABELS[type]} default
                </Button>
                <p className="text-xs text-muted" role="status">
                  {savedDefault || `Pre-fills these times for future ${SHIFT_TYPE_LABELS[type]} shifts.`}
                </p>
                {editing && (
                  <Button variant="ghost" size="sm" className="-ml-2" onClick={() => applyDefaults(type)}>
                    Use saved {SHIFT_TYPE_LABELS[type]} times
                  </Button>
                )}
              </div>
            </>
          )}

          {errors.length > 0 && (
            <div role="alert" className="rounded-2xl bg-danger-soft text-danger p-3 text-sm">
              <ul className="list-disc pl-5">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line/60 bg-bg/85 backdrop-blur-xl">
            <div className="mx-auto max-w-2xl px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button type="submit" variant="primary" size="lg" className="w-full">
                {last ? (editing ? 'Save changes' : 'Start shift') : 'Next'}
                {!last && <Icon name="chevron" />}
              </Button>
            </div>
          </div>
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
        className="flex-1 min-h-11 rounded-xl border border-line bg-surface-2/60 px-3"
      />
      <span id={`${id}-next`} className="w-16 text-xs text-muted">
        {nextDay ? 'next day' : ''}
      </span>
      <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove sweep ${index + 1} (${formatTime12(row.time)})`}>
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
      <legend className="text-sm font-semibold mb-1.5">{label}</legend>
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
            className="flex-1 min-h-12 rounded-xl border border-line bg-surface-2/60 px-3 focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent focus:bg-surface"
            placeholder="Name"
          />
          {names.length > 1 && (
            <Button variant="ghost" onClick={() => onChange(names.filter((_, j) => j !== i))} aria-label={`Remove ${name || `${label} ${i + 1}`}`} className="px-3">
              ✕
            </Button>
          )}
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => onChange([...names, ''])} className="self-start text-accent -ml-2">
        <Icon name="plus" size={16} />
        {addLabel}
      </Button>
    </fieldset>
  )
}
