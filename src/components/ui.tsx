import { cx } from './cx'
import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'


type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'skip'
type Size = 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:opacity-90',
  secondary: 'bg-surface text-fg border border-line hover:bg-surface-2',
  ghost: 'text-fg hover:bg-surface-2',
  danger: 'bg-danger-soft text-danger border border-danger/40 hover:opacity-90',
  skip: 'bg-skip-soft text-skip border border-skip/40 hover:opacity-90',
}

const sizes: Record<Size, string> = {
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-14 px-5 text-base',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition select-none',
        'disabled:opacity-40 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx('rounded-2xl bg-surface border border-line p-4', className)}>{children}</section>
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string
  hint?: string
  children: ReactNode
  htmlFor: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}

const inputBase =
  'w-full rounded-xl border border-line bg-surface px-3 text-base text-fg placeholder:text-muted/70 focus:border-accent'

export function TextInput({
  label,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={props.id ?? id}>
      <input id={props.id ?? id} className={cx(inputBase, 'min-h-11', className)} {...props} />
    </Field>
  )
}

export function TextArea({
  label,
  hint,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={props.id ?? id}>
      <textarea id={props.id ?? id} className={cx(inputBase, 'py-2 min-h-20', className)} {...props} />
    </Field>
  )
}

export function Select({
  label,
  hint,
  options,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLSelectElement>, 'children'> & {
  label: string
  hint?: string
  options: { value: string; label: string }[]
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={props.id ?? id}>
      <select id={props.id ?? id} className={cx(inputBase, 'min-h-11', className)} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

/** Segmented single-choice control rendered as a radio group. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  const name = useId()
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-sm font-semibold mb-1.5">{label}</legend>
      <div className="grid gap-1 rounded-xl bg-surface-2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              'min-h-10 flex items-center justify-center rounded-lg text-sm font-semibold cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent',
              value === o.value ? 'bg-surface shadow-sm text-fg' : 'text-muted',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'skip' | 'accent'; children: ReactNode }) {
  const tones = {
    neutral: 'bg-surface-2 text-muted',
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    skip: 'bg-skip-soft text-skip',
    accent: 'bg-accent-soft text-accent',
  }
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', tones[tone])}>{children}</span>
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} className="h-2 rounded-full bg-surface-2 overflow-hidden">
      <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Sticky screen header with optional back action and right-side slot. */
export function Header({
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  right,
}: {
  title: string
  subtitle?: ReactNode
  onBack?: () => void
  backLabel?: string
  right?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-line">
      <div className="mx-auto max-w-2xl flex items-center gap-2 px-3 py-2 min-h-14">
        {onBack && (
          <Button variant="ghost" onClick={onBack} aria-label={backLabel} className="px-2 -ml-1">
            <span aria-hidden="true" className="text-xl leading-none">‹</span>
            <span className="sr-only sm:not-sr-only">{backLabel}</span>
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate">{title}</h1>
          {subtitle && <div className="text-xs text-muted truncate">{subtitle}</div>}
        </div>
        {right}
      </div>
    </header>
  )
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cx('mx-auto max-w-2xl px-4 py-4 flex flex-col gap-4', className)}>{children}</main>
}
