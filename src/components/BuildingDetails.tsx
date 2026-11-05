import { useState } from 'react'
import { getBuilding } from '../domain/route'
import { caPool, sweepBuildingCAs, updateBuildingSweep } from '../domain/shift'
import { formatTime12, nowTime } from '../domain/time'
import type { BuildingSweep, Shift, Sweep } from '../domain/types'
import { useActiveShift } from '../state/store'
import { CAPicker } from './CAPicker'
import { Sheet } from './Sheet'
import { Button, TextInput } from './ui'

/** Compact bar showing a building sweep's start/end times and CAs, with a sheet to edit them. */
export function BuildingDetails({ shift, sweep, buildingId }: { shift: Shift; sweep: Sweep; buildingId: string }) {
  const { updateActive } = useActiveShift()
  const [open, setOpen] = useState(false)
  const bs = sweep.buildings[buildingId]
  const cas = sweepBuildingCAs(shift, sweep, buildingId)
  const name = getBuilding(buildingId)?.name ?? ''
  const start = formatTime12(bs?.actualStart ?? '')
  const end = formatTime12(bs?.actualEnd ?? '')
  const summary = [start ? (end ? `${start}–${end}` : `Started ${start}`) : 'Not started', cas.length ? cas.join(', ') : 'No CAs set'].join(' · ')
  const patch = (p: Partial<BuildingSweep>) => updateActive((s) => updateBuildingSweep(s, sweep.id, buildingId, (b) => ({ ...b, ...p })))

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Sweep details: ${summary}. Edit`}
        className="flex items-center gap-2 -mx-2 px-2 min-h-10 rounded-md text-left text-sm text-muted transition hover:bg-surface-2"
      >
        <span className="flex-1 min-w-0 truncate">{summary}</span>
        <span className="text-xs font-semibold text-accent">Edit</span>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={`${name} sweep details`}>
        <TimeField label="Start time" value={bs?.actualStart ?? ''} onChange={(v) => patch({ actualStart: v })} />
        <TimeField label="End time" value={bs?.actualEnd ?? ''} onChange={(v) => patch({ actualEnd: v })} />
        <CAPicker label={`CAs sweeping ${name} this sweep`} pool={caPool(shift)} selected={cas} onChange={(names) => patch({ cas: names })} />
        {bs?.cas && (
          <Button variant="ghost" className="self-start text-xs" onClick={() => patch({ cas: null })}>
            Use the shift's default CAs for {name}
          </Button>
        )}
        <Button variant="primary" size="lg" onClick={() => setOpen(false)}>
          Done
        </Button>
      </Sheet>
    </>
  )
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
      <TextInput label={label} type="time" value={value} onChange={(e) => onChange(e.target.value)} />
      <Button onClick={() => onChange(nowTime())}>Now</Button>
      <Button variant="ghost" onClick={() => onChange('')} disabled={!value} aria-label={`Clear ${label.toLowerCase()}`}>
        Clear
      </Button>
    </div>
  )
}
