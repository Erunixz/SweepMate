import { nowTime } from '../domain/time'
import { useStore } from '../state/store'

/** Subtle autosave status shown in screen headers. */
export function SaveIndicator() {
  const { save, active } = useStore()
  if (save.status === 'error') {
    return (
      <span role="status" className="text-xs font-semibold text-danger px-2">
        Not saved
      </span>
    )
  }
  if (save.status !== 'saved' || !save.at) return <span role="status" className="sr-only" />
  return (
    <span role="status" className="text-xs text-muted px-2 whitespace-nowrap" title={active?.isDemo ? 'Demo data is saved separately' : undefined}>
      <span aria-hidden="true">✓ </span>Saved {nowTime(new Date(save.at))}
    </span>
  )
}
