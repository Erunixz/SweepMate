import { cx } from './cx'

/** Toggle chips choosing which CAs (from the shift's pool) swept a building. */
export function CAPicker({
  label,
  pool,
  selected,
  onChange,
}: {
  label: string
  pool: string[]
  selected: string[]
  onChange: (names: string[]) => void
}) {
  // Keep names that are selected but no longer in the pool visible so they can be removed.
  const names = [...pool, ...selected.filter((n) => !pool.includes(n))]
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-semibold mb-1.5">{label}</legend>
      {names.length === 0 ? (
        <p className="text-xs text-muted">Add CA names above first.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {names.map((name) => {
            const on = selected.includes(name)
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? selected.filter((n) => n !== name) : [...selected, name])}
                className={cx(
                  'min-h-11 rounded-md border px-4 text-sm font-semibold',
                  on ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-muted',
                )}
              >
                {on && <span aria-hidden="true">✓ </span>}
                {name}
              </button>
            )
          })}
        </div>
      )}
    </fieldset>
  )
}
