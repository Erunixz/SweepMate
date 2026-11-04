import { useEffect, useRef, useState } from 'react'
import { SaveIndicator } from '../components/SaveIndicator'
import { ConfirmSheet } from '../components/Sheet'
import { Button, Card, Header, Page, TextInput } from '../components/ui'
import { TEMPLATE_FIELD_HELP, type ReportTemplate } from '../config/reportTemplate'
import { copyText, downloadText } from '../domain/clipboard'
import { missingEntries } from '../domain/progress'
import { cleanText, generateReport, generateSweepParagraph, reportFileName } from '../domain/report'
import { getBuilding, getRoute } from '../domain/route'
import { labelShiftTime } from '../domain/time'
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

  const flash = (msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }
  const copy = async (s: string, what: string) => flash((await copyText(cleanText(s))) ? `${what} copied` : 'Copy failed – select the text and copy manually')

  return (
    <>
      <Header title="Coverage report" onBack={() => navigate({ name: 'overview' })} backLabel="Overview" right={<SaveIndicator />} />
      <Page className="pb-32">
        {missingCount > 0 ? (
          <Card className="border-warn/60 bg-warn-soft/40 flex flex-col gap-2">
            <h2 className="font-bold text-warn">
              {missingCount} location{missingCount > 1 ? 's' : ''} not recorded
            </h2>
            <p className="text-sm">
              These appear as “{template.unanswered}” in the report. Record them, mark them Not Checked, or mark the sweep missed.
            </p>
            <ul className="flex flex-col gap-1">
              {missing.map((g) => (
                <li key={g.sweep.id + g.buildingId}>
                  <button
                    type="button"
                    className="w-full text-left text-sm min-h-11 rounded-lg px-2 hover:bg-surface-2"
                    onClick={() =>
                      navigate({
                        name: 'walk',
                        sweepId: g.sweep.id,
                        buildingId: g.buildingId,
                        index: getRoute(g.buildingId).findIndex((l) => l.id === g.locations[0]!.id),
                      })
                    }
                  >
                    <span className="font-semibold">
                      Sweep {g.sweepNumber} ({labelShiftTime(shift.startTime, g.sweep.scheduledTime)}) · {getBuilding(g.buildingId)?.name}:
                    </span>{' '}
                    {g.locations.length} missing <span className="text-accent font-semibold">› Fix</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <p className="rounded-xl bg-ok-soft text-ok p-3 text-sm font-semibold">Every location in every non-missed sweep has an entry.</p>
        )}

        <Card className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="report-text" className="flex-1 font-bold">
              Preview {edited && <span className="text-xs font-semibold text-warn">(edited by you)</span>}
            </label>
            {shift.reportDraft !== null && (
              <Button variant="ghost" className="text-xs" onClick={() => setConfirmRegen(true)}>
                Regenerate
              </Button>
            )}
          </div>
          {edited && (
            <p className="text-xs text-muted">
              You've edited the text, so later changes to counts or notes won't appear until you regenerate.
            </p>
          )}
          <textarea
            id="report-text"
            value={text}
            onChange={(e) => updateActive((s) => ({ ...s, reportDraft: e.target.value, updatedAt: new Date().toISOString() }))}
            rows={18}
            spellCheck
            className="w-full rounded-xl border border-line bg-surface-2 p-3 font-mono text-sm leading-relaxed"
          />
        </Card>

        <Card className="flex flex-col gap-2">
          <h2 className="font-bold">Copy one sweep</h2>
          <ul className="flex flex-col gap-2">
            {shift.sweeps.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm">
                  Sweep {i + 1} · {labelShiftTime(shift.startTime, s.scheduledTime)}
                </span>
                <Button onClick={() => copy(generateSweepParagraph(shift, i, template), `Sweep ${i + 1}`)}>Copy</Button>
              </li>
            ))}
          </ul>
        </Card>

        <TemplateEditor template={template} onChange={update} onReset={reset} />
      </Page>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto max-w-2xl grid grid-cols-2 gap-2 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button size="lg" onClick={() => downloadText(reportFileName(shift), cleanText(text))}>
            Download TXT
          </Button>
          <Button size="lg" variant="primary" onClick={() => copy(text, 'Full report')}>
            Copy Full Report
          </Button>
        </div>
      </div>

      <div aria-live="polite" className="fixed inset-x-0 bottom-24 flex justify-center pointer-events-none">
        {toast && <p className="rounded-full bg-fg text-bg px-4 py-2 text-sm font-semibold shadow-lg">{toast}</p>}
      </div>

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
