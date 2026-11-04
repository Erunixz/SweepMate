import { useStore } from '../state/store'
import { Button } from './ui'

const messages = {
  unavailable:
    "This browser isn't allowing local storage (for example, a private window). You can still use SweepMate, but shifts won't be saved after you close the page.",
  corrupt:
    "Your saved shifts couldn't be read. A backup copy of the raw data was kept in this browser's storage, and SweepMate has started fresh.",
  partial:
    "Some saved shifts were damaged and couldn't be restored. The rest loaded normally, and a backup copy of the raw data was kept in this browser's storage.",
}

export function LoadProblemBanner() {
  const { loadProblem, dismissLoadProblem } = useStore()
  if (!loadProblem) return null
  return (
    <div role="alert" className="rounded-md bg-warn-soft text-warn p-3 text-sm flex flex-col gap-2">
      <p className="font-semibold">{messages[loadProblem]}</p>
      <Button variant="ghost" className="self-end min-h-9" onClick={dismissLoadProblem}>
        Dismiss
      </Button>
    </div>
  )
}
