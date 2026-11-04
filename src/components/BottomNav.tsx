import { useStore } from '../state/store'
import { cx } from './cx'
import { Icon, type IconName } from './Icon'

const tabs: { view: 'overview' | 'notes' | 'report'; label: string; icon: IconName }[] = [
  { view: 'overview', label: 'Sweeps', icon: 'sweeps' },
  { view: 'notes', label: 'Notes', icon: 'notes' },
  { view: 'report', label: 'Report', icon: 'report' },
]

/** App-style tab bar for the shift-level screens. */
export function BottomNav({ badge }: { badge?: Partial<Record<'notes' | 'report', number>> }) {
  const { view, navigate } = useStore()
  return (
    <nav aria-label="Shift" className="fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-bg/85 backdrop-blur-xl">
      <ul className="mx-auto max-w-2xl grid grid-cols-3 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((t) => {
          const current = view.name === t.view
          const count = t.view !== 'overview' ? badge?.[t.view] : undefined
          return (
            <li key={t.view}>
              <button
                type="button"
                onClick={() => navigate({ name: t.view })}
                aria-current={current ? 'page' : undefined}
                className={cx(
                  'relative w-full min-h-12 flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition',
                  current ? 'text-accent' : 'text-muted hover:text-fg',
                )}
              >
                <Icon name={t.icon} size={22} />
                {t.label}
                {!!count && (
                  <span className="absolute top-1 left-1/2 ml-2 min-w-4 h-4 px-1 rounded-full bg-warn text-[10px] leading-4 text-white">
                    {count}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
