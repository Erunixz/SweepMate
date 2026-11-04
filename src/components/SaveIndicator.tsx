import { formatTime12, nowTime } from '../domain/time'
import { useStore } from '../state/store'

/** Subtle autosave status shown in screen headers; the save time is in the tooltip. */
export function SaveIndicator() {
  const { save } = useStore()
  if (save.status === 'error') {
    return (
      <span role="status" className="text-xs font-semibold text-danger px-2 whitespace-nowrap">
        Not saved
      </span>
    )
  }
  if (save.status !== 'saved' || !save.at) return <span role="status" className="sr-only" />
  const at = formatTime12(nowTime(new Date(save.at)))
  return (
    <span role="status" className="text-xs text-muted px-2 whitespace-nowrap" title={`Saved on this device at ${at}`}>
      <span aria-hidden="true" className="text-ok">✓ </span>Saved
    </span>
  )
}
