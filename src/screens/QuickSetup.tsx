import { useState } from 'react'
import { Button, Card, Header, Page, Segmented, TextInput } from '../components/ui'
import { BUILDINGS } from '../config/buildings'
import { applySchedule, caPool, createQuickShift } from '../domain/shift'
import { formatDateISO, isValidDate, isValidTime, nowTime } from '../domain/time'
import { useStore } from '../state/store'

export function QuickSetup({ mode }: { mode: 'new' | 'edit' }) {
  const { active, openShift, updateActive, navigate } = useStore()
  const editing = mode === 'edit' && active?.mode === 'quick' ? active : null
  const [buildingId, setBuildingId] = useState(editing?.quickBuildingId ?? BUILDINGS[0]!.id)
  const [date, setDate] = useState(editing?.date ?? formatDateISO(new Date()))
  const [time, setTime] = useState(editing?.sweeps[0]?.scheduledTime ?? nowTime())
  const [myName, setMyName] = useState(editing?.myName ?? '')
  const [others, setOthers] = useState(editing?.otherCAs.join(', ') ?? '')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidDate(date) || !isValidTime(time)) {
      setError('Enter a valid date and sweep time.')
      return
    }
    const otherCAs = others.split(',').map((n) => n.trim()).filter(Boolean)
    if (editing) {
      updateActive((s) => applySchedule(
        { ...s, date, startTime: time, myName: myName.trim(), otherCAs,
          buildingCAs: { [buildingId]: caPool({ myName, otherCAs }) } },
        s.sweeps.map((sweep) => ({ id: sweep.id, time })),
      ))
      navigate({ name: 'overview' })
    } else {
      const shift = createQuickShift({ date, buildingId, time, myName, otherCAs })
      openShift(shift)
      navigate({ name: 'walk', sweepId: shift.sweeps[0]!.id, buildingId, index: 0 })
    }
  }

  return <>
    <Header title={editing ? 'Edit quick sweep' : 'Quick sweep'} onBack={() => navigate({ name: editing ? 'overview' : 'welcome' })} />
    <Page>
      <div className="pt-2">
        <h2 className="text-2xl font-semibold tracking-tight">Set up your sweep</h2>
        <p className="mt-1 text-sm text-muted">Record rooms, times and notes, then copy your building report.</p>
      </div>
      <Card>
        <form className="flex flex-col gap-5" noValidate onSubmit={submit}>
          {editing ? <p className="font-semibold">{BUILDINGS.find((b) => b.id === buildingId)?.name}</p> :
            <Segmented label="Building" value={buildingId} onChange={setBuildingId} options={BUILDINGS.map((b) => ({ value: b.id, label: b.name }))} />}
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Sweep date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <TextInput label="Sweep time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <TextInput label="My name (optional)" autoComplete="name" value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="Your name" />
          <TextInput label="Other CAs (optional)" hint="Separate names with commas." value={others} onChange={(e) => setOthers(e.target.value)} />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" variant="primary" size="lg">{editing ? 'Save changes' : 'Start quick sweep'}</Button>
        </form>
      </Card>
      <p className="text-center text-xs text-muted">Saved on this device as you go.</p>
    </Page>
  </>
}
