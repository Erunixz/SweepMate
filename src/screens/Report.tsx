import { useEffect, useRef, useState } from 'react'
import { BottomNav } from '../components/BottomNav'
import { Icon } from '../components/Icon'
import { SaveIndicator } from '../components/SaveIndicator'
import { ConfirmSheet } from '../components/Sheet'
import { Button, Card, Header, Page, TextInput } from '../components/ui'
import { TEMPLATE_FIELD_HELP, type ReportTemplate } from '../config/reportTemplate'
import { copyText, downloadText } from '../domain/clipboard'
import { missingDetails, missingEntries } from '../domain/progress'
import { cleanText, generateReport, generateSweepSection, reportFileName } from '../domain/report'
import { getBuilding, getRoute } from '../domain/route'
import { formatTime12, labelShiftTime } from '../domain/time'
import { useReportTemplate } from '../state/reportTemplate'
import { useActiveShift } from '../state/store'

export function Report() {
  const { shift, navigate, updateActive } = useActiveShift()
  const { template, update, reset } = useReportTemplate()
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

  const totalMissing = missingCount + details.length

  return (
    <>
      <Header title="Coverage report" subtitle={`${shift.sweeps.length} sweeps · plain text`} right={<SaveIndicator />} />
      <Page className="pb-28">
        <section className="rounded-3xl bg-brand text-white p-5 shadow-glow flex flex-col gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Ready to paste</h2>
            <p className="text-white/85 text-sm">Every sweep in one entry, in your report format.</p>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              onClick={() => copy(text, 'Full report')}
              className="min-h-14 rounded-2xl bg-white text-[#3b2fd1] font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition"
            >
              <Icon name="copy" />
              Copy Full Report
            </button>
            <button
              type="button"
              onClick={() => downloadText(reportFileName(shift), cleanText(text))}
              aria-label="Download TXT"
              className="min-h-14 px-4 rounded-2xl bg-white/15 text-white font-bold flex items-center justify-center gap-2 border border-white/25 active:scale-[0.98] transition"
            >
              <Icon name="download" />
              TXT
            </button>
          </div>
        </section>

        {totalMissing > 0 ? (
          <details className="rounded-3xl bg-warn-soft text-warn p-4 group">
            <summary className="flex items-center gap-2 cursor-pointer font-bold min-h-11 list-none">
              <span className="flex-1">
                {totalMissing} item{totalMissing > 1 ? 's' : ''} not recorded
              </span>
              <span className="text-xs font-semibold group-open:hidden">Show</span>
              <span className="text-xs font-semibold hidden group-open:inline">Hide</span>
            </summary>
            <div className="flex flex-col gap-3 pt-2 text-fg">
              <p className="text-sm text-warn">They appear as “{template.unanswered}” in the report.</p>
              {missing.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {missing.map((g) => (
                    <li key={g.sweep.id + g.buildingId}>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 text-left text-sm min-h-11 rounded-xl px-3 bg-surface/70 hover:bg-surface"
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
        ) : (
          <p className="rounded-2xl bg-ok-soft text-ok px-4 py-3 text-sm font-semibold flex items-center gap-2">
            <Icon name="check" size={16} /> Everything is recorded.
          </p>
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
            className="w-full rounded-2xl border border-line bg-surface-2/60 p-3 font-mono text-[13px] leading-relaxed focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
          />
        </Card>

        <Card className="flex flex-col gap-1">
          <h2 className="font-bold mb-1">Copy one sweep</h2>
          <ul className="flex flex-col divide-y divide-line/70">
            {shift.sweeps.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 py-1.5">
                <span className="flex-1 text-sm">
                  <span className="font-semibold">{labelShiftTime(shift.startTime, s.scheduledTime)}</span>
                  <span className="text-muted"> · Sweep {i + 1}</span>
                </span>
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
        </Card>

        <TemplateEditor template={template} onChange={update} onReset={reset} />
      </Page>

      <div aria-live="polite" className="fixed inset-x-0 bottom-24 z-40 flex justify-center pointer-events-none">
        {toast && (
          <p className="rounded-full bg-fg text-bg px-4 py-2 text-sm font-semibold shadow-lg flex items-center gap-1.5">
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

function TemplateEditor({
  template,
  onChange,
  onReset,
}: {
  template: ReportTemplate
  onChange: (t: ReportTemplate) => void
  onReset: () => void
}) {
  return (
    <details className="rounded-2xl bg-surface border border-line p-4 group">
      <summary className="font-bold cursor-pointer min-h-11 flex items-center">Report template</summary>
      <div className="flex flex-col gap-3 pt-2">
        <p className="text-xs text-muted">
          Changes apply to all shifts on this device. If you've edited the preview text, regenerate it to see template changes.
        </p>
        {(Object.keys(TEMPLATE_FIELD_HELP) as (keyof ReportTemplate)[]).map((key) => (
          <TextInput
            key={key}
            label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
            hint={TEMPLATE_FIELD_HELP[key]}
            value={template[key]}
            onChange={(e) => onChange({ ...template, [key]: e.target.value })}
          />
        ))}
        <Button onClick={onReset} className="self-start">
          Reset template to default
        </Button>
      </div>
    </details>
  )
}
