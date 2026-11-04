import { useId, useState } from 'react'
import type { LocationEntry, RouteLocation } from '../domain/types'
import { cx } from './cx'
import { Badge, Button } from './ui'

const QUICK_COUNTS = [0, 1, 2, 3, 4, 5]

function entryStateBadge(entry: LocationEntry | undefined) {
  if (!entry) return <Badge tone="warn">Unanswered</Badge>
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
  position,
  onSave,
  onSkip,
  onClear,
  onBack,
  canGoBack,
}: {
  location: RouteLocation
  entry: LocationEntry | undefined
  position: string
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
    <div className="flex flex-col gap-4 pb-40">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{location.section}</span>
          {location.direction && (
            <Badge tone="accent">
              <span className="sr-only">Walking direction: </span>
              {location.direction}
            </Badge>
          )}
          <span className="ml-auto">{position}</span>
        </div>
        <h2 className="text-2xl font-bold leading-tight">{location.label}</h2>
        <div className="flex items-center gap-2">
          {entryStateBadge(entry)}
          {entry && (
            <Button variant="ghost" className="min-h-9 text-xs text-muted" onClick={onClear}>
              Clear answer
            </Button>
          )}
        </div>
      </div>

      {isStatus ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold mb-2">Status</legend>
          {(location.statusOptions ?? []).map((opt) => (
            <label
              key={opt}
              className={cx(
                'flex items-center gap-3 min-h-14 rounded-xl border px-4 font-semibold cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent',
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
        <div className="flex flex-col gap-3">
          <label htmlFor={countId} className="text-sm font-semibold">
            People present
          </label>
          <div className="grid grid-cols-[4.5rem_1fr_4.5rem] gap-2">
            <Button size="lg" onClick={() => step(-1)} aria-label="Decrease count" className="h-20" disabled={!countValid || parsed === 0}>
              <span aria-hidden="true" className="text-4xl leading-none">−</span>
            </Button>
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
              className="h-20 w-full rounded-xl border-2 border-line bg-surface text-center text-4xl font-bold tabular-nums focus:border-accent"
            />
            <Button size="lg" onClick={() => step(1)} aria-label="Increase count" className="h-20">
              <span aria-hidden="true" className="text-4xl leading-none">+</span>
            </Button>
          </div>
          <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Quick counts">
            {QUICK_COUNTS.map((n) => (
              <Button
                key={n}
                variant={count === String(n) ? 'primary' : 'secondary'}
                className="min-h-12 text-base px-0"
                onClick={() => {
                  setCount(String(n))
                  setWarning('')
                }}
              >
                {n}
              </Button>
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
          className="w-full rounded-xl border border-line bg-surface px-3 py-2"
        />
      </div>

      {warning && (
        <p role="alert" className="rounded-lg bg-warn-soft text-warn p-2 text-sm font-semibold">
          {warning}
        </p>
      )}

      {/* Thumb-zone action bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto max-w-2xl grid grid-cols-[1fr_1fr] gap-2 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button size="lg" onClick={back} disabled={!canGoBack}>
            ‹ Back
          </Button>
          <Button size="lg" variant="skip" onClick={() => onSkip(observation)}>
            Not Checked
          </Button>
          <Button size="lg" variant="primary" onClick={save} className="col-span-2 text-lg">
            Save &amp; Next ›
          </Button>
        </div>
      </div>
    </div>
  )
}
