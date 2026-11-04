/// <reference types="vite-plugin-pwa/react" />
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './ui'

/** Registers the offline service worker and offers a reload when a new version is ready. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null
  return (
    <div role="status" className="fixed inset-x-0 top-3 z-50 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg bg-fg text-bg pl-4 pr-2 py-2 shadow-lg text-sm font-semibold max-w-md w-full">
        <span className="flex-1">A new version of SweepMate is ready. Your data is saved.</span>
        <button type="button" className="min-h-9 px-3 rounded-md hover:bg-bg/15" onClick={() => setNeedRefresh(false)}>
          Later
        </button>
        <Button size="sm" variant="primary" onClick={() => updateServiceWorker(true)}>
          Reload
        </Button>
      </div>
    </div>
  )
}
