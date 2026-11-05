import { useStore } from '../state/store'

/** Autosave is silent when it works; the header only speaks up if a save fails. */
export function SaveIndicator() {
  const { save } = useStore()
  if (save.status !== 'error') return <span role="status" className="sr-only" />
  return (
    <span role="status" className="text-xs font-semibold text-danger px-2 whitespace-nowrap">
      Not saved
    </span>
  )
}
