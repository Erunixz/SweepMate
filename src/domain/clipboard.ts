/** Copy plain text, falling back to a hidden textarea where the async Clipboard API is unavailable. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

/** True where the system share sheet exists for text (most phones; some desktop browsers). */
export function canShareText(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/** Open the system share sheet. 'cancelled' means the user closed it, which is not an error. */
export async function shareText(title: string, text: string): Promise<'shared' | 'cancelled' | 'failed'> {
  try {
    await navigator.share({ title, text })
    return 'shared'
  } catch (e) {
    return e instanceof DOMException && e.name === 'AbortError' ? 'cancelled' : 'failed'
  }
}

export function downloadText(filename: string, text: string) {
  // CRLF so the file opens cleanly in Notepad as well as everywhere else.
  const blob = new Blob([text.replace(/\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
