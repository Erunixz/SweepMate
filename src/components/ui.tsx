import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cx } from './cx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'skip'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-glow hover:brightness-110',
  secondary: 'bg-surface text-fg border border-line shadow-card hover:bg-surface-2',
  ghost: 'text-fg hover:bg-surface-2',
  danger: 'bg-danger-soft text-danger hover:brightness-95',
  skip: 'bg-skip-soft text-skip hover:brightness-95',
}

const sizes: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm rounded-xl',
  md: 'min-h-11 px-4 text-sm rounded-xl',
  lg: 'min-h-14 px-5 text-base rounded-2xl',
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
        'inline-flex items-center justify-center gap-2 font-semibold tracking-tight transition select-none active:scale-[0.98]',
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
  return <section className={cx('rounded-3xl bg-surface border border-line/70 shadow-card p-4', className)}>{children}</section>
}

/** Small uppercase label above a group of content. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('text-[11px] font-bold uppercase tracking-[0.08em] text-muted', className)}>{children}</p>
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
  'w-full rounded-xl border border-line bg-surface-2/60 px-3 text-base text-fg placeholder:text-muted/70 transition focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/15'

export function TextInput({
  label,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={props.id ?? id}>
      <input id={props.id ?? id} className={cx(inputBase, 'min-h-12', className)} {...props} />
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
      <textarea id={props.id ?? id} className={cx(inputBase, 'py-2.5 min-h-20', className)} {...props} />
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
      <select id={props.id ?? id} className={cx(inputBase, 'min-h-12', className)} {...props}>
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
      <div className="grid gap-1 rounded-2xl bg-surface-2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              'min-h-10 flex items-center justify-center rounded-xl text-sm font-semibold cursor-pointer transition has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-accent',
              value === o.value ? 'bg-surface shadow-card text-fg' : 'text-muted hover:text-fg',
            )}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'skip' | 'accent'
  children: ReactNode
}) {
  const tones = {
    neutral: 'bg-surface-2 text-muted',
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    danger: 'bg-danger-soft text-danger',
    skip: 'bg-skip-soft text-skip',
    accent: 'bg-accent-soft text-accent',
  }
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone])}>{children}</span>
}

export function ProgressBar({ value, max, label, className }: { value: number; max: number; label: string; className?: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cx('h-2 rounded-full bg-surface-2 overflow-hidden', className)}
    >
      <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Circular progress indicator with a centred label. */
export function ProgressRing({ value, max, size = 56, children }: { value: number; max: number; size?: number; children?: ReactNode }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const pct = max ? value / max : 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="6" className="fill-none stroke-surface-2" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="fill-none stroke-accent transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-bold tabular-nums">{children}</div>
    </div>
  )
}

/** Sticky, translucent screen header with optional back action and right-side slot. */
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
    <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur-xl border-b border-line/60">
      <div className="mx-auto max-w-2xl flex items-center gap-2 px-3 py-2 min-h-14">
        {onBack && (
          <Button variant="ghost" onClick={onBack} aria-label={backLabel} className="px-2.5 -ml-1">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold tracking-tight truncate">{title}</h1>
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
