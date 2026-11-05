import { useEffect, useRef, useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { Icon } from '../components/Icon'
import { SaveIndicator } from '../components/SaveIndicator'
import { ConfirmSheet } from '../components/Sheet'
import { Button, Card, Header, Page } from '../components/ui'
import { DEFAULT_REPORT_TEMPLATE as template } from '../config/reportTemplate'
import { canShareText, copyText, downloadText, shareText } from '../domain/clipboard'
import { missingDetails, missingEntries } from '../domain/progress'
import { cleanText, generateReport, generateSweepSection, reportFileName } from '../domain/report'
import { getBuilding, getRoute } from '../domain/route'
import { formatTime12, labelShiftTime } from '../domain/time'
import { useActiveShift } from '../state/store'

export function Report() {
  const { shift, navigate, updateActive } = useActiveShift()
  const [toast, setToast] = useState('')
  const [confirmRegen, setConfirmRegen] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const generated = generateReport(shift, template)
  const text = shift.reportDraft ?? generated
  const edited = shift.reportDraft !== null && shift.reportDraft !== generated
  const missing = missingEntries(shift)
  const missingCount = missing.reduce((n, g) => n + g.locations.length, 0)
  const details = missingDetails(shift)

  const flash = (msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }
  const copy = async (s: string, what: string) => flash((await copyText(cleanText(s))) ? `${what} copied` : 'Copy failed – select the text and copy manually')

  const canShare = canShareText()
  const share = async () => {
    const result = await shareText(reportFileName(shift).replace(/\.txt$/, ''), cleanText(text))
    if (result === 'failed') flash('Share failed – use Copy instead')
  }

  const totalMissing = missingCount + details.length
  const quick = shift.mode === 'quick'

  return (
    <>
      <Header title={quick ? `${getBuilding(shift.quickBuildingId!)?.name} report` : 'Coverage report'} subtitle="Ready to paste into StarRez" right={<SaveIndicator />} />
      <Page className="pb-28">
        <section className="border-b border-line pb-5 flex flex-col gap-4">
          <div className={`grid gap-2 ${canShare ? 'grid-cols-[1fr_auto_auto]' : 'grid-cols-[1fr_auto]'}`}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => copy(text, quick ? 'Building report' : 'Full report')}
            >
              <Icon name="copy" />
              {quick ? 'Copy Report' : 'Copy Full Report'}
            </Button>
            {canShare && (
              <Button size="lg" onClick={share} aria-label="Share report" title="Share">
                <Icon name="share" />
              </Button>
            )}
            <Button
              size="lg"
              onClick={() => downloadText(reportFileName(shift), cleanText(text))}
              aria-label="Download TXT"
            >
              <Icon name="download" />
              TXT
            </Button>
          </div>
        </section>

        {totalMissing > 0 && (
          <details className="rounded-lg bg-warn-soft text-warn p-4 group">
            <summary className="flex items-center gap-2 cursor-pointer font-bold min-h-11 list-none">
              <span className="flex-1">
                {totalMissing} item{totalMissing > 1 ? 's' : ''} not recorded
              </span>
              <span className="text-xs font-semibold group-open:hidden">Show</span>
              <span className="text-xs font-semibold hidden group-open:inline">Hide</span>
            </summary>
            <div className="flex flex-col gap-3 pt-2 text-fg">
              {missing.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {missing.map((g) => (
                    <li key={g.sweep.id + g.buildingId}>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 text-left text-sm min-h-11 rounded-md px-3 bg-surface/70 hover:bg-surface"
                        onClick={() =>
                          navigate({
                            name: 'walk',
                            sweepId: g.sweep.id,
                            buildingId: g.buildingId,
                            index: getRoute(g.buildingId).findIndex((l) => l.id === g.locations[0]!.id),
                          })
                        }
                      >
                        <span className="flex-1">
                          <span className="font-semibold">
                            {labelShiftTime(shift.startTime, g.sweep.scheduledTime)} · {getBuilding(g.buildingId)?.name}
                          </span>{' '}
                          <span className="text-muted">· {g.locations.length} missing</span>
                        </span>
                        <span className="text-accent font-semibold">Fix ›</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {details.length > 0 && (
                <ul className="list-disc pl-5 text-sm text-muted">
                  {details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        )}

        <Card className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="report-text" className="flex-1 font-bold">
              Preview {edited && <span className="text-xs font-semibold text-warn">(edited by you)</span>}
            </label>
            {shift.reportDraft !== null && (
              <Button variant="ghost" size="sm" onClick={() => setConfirmRegen(true)}>
                Regenerate
              </Button>
            )}
          </div>
          {edited && <p className="text-xs text-muted">You've edited the text, so later changes to counts or notes won't appear until you regenerate.</p>}
          <textarea
            id="report-text"
            value={text}
            onChange={(e) => updateActive((s) => ({ ...s, reportDraft: e.target.value, updatedAt: new Date().toISOString() }))}
            rows={18}
            spellCheck
            className="w-full rounded-lg border border-line bg-surface-2/60 p-3 font-mono text-[13px] leading-relaxed focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
          />
        </Card>

        {!quick && <Card className="flex flex-col gap-1">
          <h2 className="font-bold mb-1">Copy one sweep</h2>
          <ul className="flex flex-col divide-y divide-line/70">
            {shift.sweeps.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 py-1.5">
                <span className="flex-1 text-sm font-semibold">{labelShiftTime(shift.startTime, s.scheduledTime)}</span>
                <Button
                  size="sm"
                  onClick={() => copy(generateSweepSection(shift, i, template), `${formatTime12(s.scheduledTime)} sweep`)}
                  aria-label={`Copy ${formatTime12(s.scheduledTime)} sweep`}
                >
                  <Icon name="copy" size={14} />
                  Copy
                </Button>
              </li>
            ))}
          </ul>
        </Card>}

      </Page>

      <div aria-live="polite" className="fixed inset-x-0 bottom-24 z-40 flex justify-center pointer-events-none">
        {toast && (
          <p className="rounded-full bg-fg text-bg px-4 py-2 text-sm font-semibold flex items-center gap-1.5">
            <Icon name="check" size={14} /> {toast}
          </p>
        )}
      </div>

      <BottomNav />

      <ConfirmSheet
        open={confirmRegen}
        title="Regenerate report?"
        message="Your edits to the report text will be replaced with a fresh report built from the current counts and notes."
        confirmLabel="Regenerate"
        onConfirm={() => updateActive((s) => ({ ...s, reportDraft: null, updatedAt: new Date().toISOString() }))}
        onClose={() => setConfirmRegen(false)}
      />
    </>
  )
}
