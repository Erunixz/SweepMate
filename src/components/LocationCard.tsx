import { useId, useState } from 'react'
import type { LocationEntry, RouteLocation } from '../domain/types'
import { cx } from './cx'
import { Icon } from './Icon'
import { Badge, Button } from './ui'

const QUICK_COUNTS = [0, 1, 2, 3, 4, 5]

/** Only an answered or skipped location gets a badge; a new location needs no label. */
function entryStateBadge(entry: LocationEntry) {
  if (entry.state === 'skipped') return <Badge tone="skip">Not checked</Badge>
  return <Badge tone="ok">Saved</Badge>
}

/**
 * Entry card for one location. Keeps a local draft and only writes on an explicit action,
 * so an untouched location stays "unanswered" rather than silently becoming 0.
 */
export function LocationCard({
  location,
  entry,
  onSave,
  onSkip,
  onClear,
  onBack,
  canGoBack,
}: {
  location: RouteLocation
  entry: LocationEntry | undefined
  onSave: (draft: { count?: number; status?: string; observation: string }) => void
  onSkip: (observation: string) => void
  onClear: () => void
  onBack: (draft: { count?: number; status?: string; observation: string } | null) => void
  canGoBack: boolean
}) {
  const isStatus = location.kind === 'status'
  const answered = entry?.state === 'answered'
  const [count, setCount] = useState(answered && entry.count !== undefined ? String(entry.count) : '')
  const [status, setStatus] = useState(answered ? (entry.status ?? '') : '')
  const [observation, setObservation] = useState(entry?.observation ?? '')
  const [warning, setWarning] = useState('')
  const countId = useId()
  const obsId = useId()

  const parsed = count.trim() === '' ? null : Number(count)
  const countValid = parsed !== null && Number.isInteger(parsed) && parsed >= 0 && parsed <= 999
  const valid = isStatus ? status !== '' : countValid
  const draft = () => (isStatus ? { status, observation } : { count: parsed ?? 0, observation })

  const dirty =
    observation !== (entry?.observation ?? '') ||
    (isStatus ? status !== (answered ? (entry.status ?? '') : '') : count !== (answered && entry.count !== undefined ? String(entry.count) : ''))

  const save = () => {
    if (!valid) {
      setWarning(isStatus ? 'Choose a status, or use Not Checked.' : 'Enter a count (0 if empty), or use Not Checked.')
      return
    }
    onSave(draft())
  }

  const back = () => {
    if (!dirty) return onBack(null)
    if (valid) return onBack(draft())
    setWarning('You have unsaved changes. Enter a value, use Not Checked, or clear them before going back.')
  }

  const step = (delta: number) => {
    setWarning('')
    const base = countValid ? (parsed as number) : 0
    setCount(String(Math.max(0, Math.min(999, base + delta))))
  }

  return (
    <div className="flex flex-col gap-5 pb-32">
      <div className="location-enter flex flex-col gap-2">
        {location.direction && (
          <div>
            <Badge tone="accent">
              <span className="sr-only">Walking direction: </span>
              {location.direction}
            </Badge>
          </div>
        )}
        <h2 className="text-[28px] font-semibold tracking-tight leading-tight">{location.label}</h2>
        {entry && (
          <div className="flex items-center gap-2 min-h-9">
            {entryStateBadge(entry)}
            <Button variant="ghost" size="sm" className="text-xs text-muted" onClick={onClear}>
              Clear answer
            </Button>
          </div>
        )}
      </div>

      {isStatus ? (
        <fieldset className="location-enter flex flex-col gap-2">
          <legend className="text-sm font-semibold mb-2">Status</legend>
          {(location.statusOptions ?? []).map((opt) => (
            <label
              key={opt}
              className={cx(
                'flex items-center gap-3 min-h-14 rounded-lg border px-4 font-semibold cursor-pointer transition has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent',
                status === opt ? 'border-accent bg-accent-soft' : 'border-line bg-surface',
              )}
            >
              <input
                type="radio"
                name={`status-${location.id}`}
                value={opt}
                checked={status === opt}
                onChange={() => {
                  setStatus(opt)
                  setWarning('')
                }}
                className="size-5 accent-[var(--accent)]"
              />
              {opt}
            </label>
          ))}
        </fieldset>
      ) : (
        <div className="location-enter rounded-lg bg-surface border border-line/70 p-4 flex flex-col gap-4">
          <label htmlFor={countId} className="text-xs font-bold uppercase tracking-[0.08em] text-muted text-center">
            People present
          </label>
          <div className="grid grid-cols-[4rem_1fr_4rem] items-center gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Decrease count"
              disabled={!countValid || parsed === 0}
              className="size-16 rounded-full bg-surface-2 text-fg grid place-items-center transition disabled:opacity-30"
            >
              <span aria-hidden="true" className="text-3xl leading-none font-medium">−</span>
            </button>
            <input
              id={countId}
              inputMode="numeric"
              pattern="[0-9]*"
              type="number"
              min={0}
              max={999}
              value={count}
              placeholder="–"
              onChange={(e) => {
                setCount(e.target.value.replace(/[^\d]/g, '').slice(0, 3))
                setWarning('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  save()
                }
              }}
              className="h-24 w-full bg-transparent text-center text-7xl font-semibold tracking-tight tabular-nums placeholder:text-line focus:outline-none rounded-lg focus:bg-surface-2/60"
            />
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Increase count"
              className="size-16 rounded-full bg-brand text-white grid place-items-center transition"
            >
              <span aria-hidden="true" className="text-3xl leading-none font-medium">+</span>
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Quick counts">
            {QUICK_COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setCount(String(n))
                  setWarning('')
                }}
                className={cx(
                  'min-h-12 rounded-md text-base font-bold tabular-nums transition',
                  count === String(n) ? 'bg-fg text-bg' : 'bg-surface-2 text-fg hover:bg-line/60',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={obsId} className="text-sm font-semibold">
          Observations <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id={obsId}
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          rows={2}
          placeholder="e.g. lights off, furniture moved, noise"
          className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
        />
      </div>

      {warning && (
        <p role="alert" className="rounded-lg bg-warn-soft text-warn px-3 py-2 text-sm font-semibold">
          {warning}
        </p>
      )}

      {/* Thumb-zone action bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line/60 bg-bg">
        <div className="mx-auto max-w-2xl grid grid-cols-[3.5rem_auto_1fr] gap-2 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button size="lg" onClick={back} disabled={!canGoBack} aria-label="Back" className="px-0">
            <Icon name="back" size={22} />
          </Button>
          <Button size="lg" variant="skip" onClick={() => onSkip(observation)} className="px-3 text-sm whitespace-nowrap">
            Not Checked
          </Button>
          <Button size="lg" variant="primary" onClick={save} className="px-3 whitespace-nowrap">
            Save &amp; Next
          </Button>
        </div>
      </div>
    </div>
  )
}
