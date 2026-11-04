import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './ui'

/**
 * Modal sheet built on <dialog>: native focus trapping and Escape-to-close.
 * Slides up from the bottom on phones, centred on wider screens.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal()
      else d.setAttribute('open', '')
    } else if (!open && d.open) {
      if (typeof d.close === 'function') d.close()
      else d.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="modal-sheet m-0 mt-auto sm:m-auto w-full max-w-full sm:max-w-lg max-h-[92dvh] rounded-t-lg sm:rounded-lg bg-surface text-fg p-0 backdrop:bg-black/50 open:flex flex-col"
    >
      {open && (
        <>
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-line">
            <h2 className="flex-1 text-base font-bold">{title}</h2>
            <Button variant="ghost" onClick={onClose} aria-label="Close" className="px-3">
              ✕
            </Button>
          </div>
          <div className="sheet-content overflow-y-auto px-4 py-3 flex flex-col gap-4">{children}</div>
          {footer && <div className="border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
        </>
      )}
    </dialog>
  )
}

/** Confirmation sheet for destructive actions. */
export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={onClose} size="lg">
            Cancel
          </Button>
          <Button
            variant="danger"
            size="lg"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="text-sm">{message}</div>
    </Sheet>
  )
}
