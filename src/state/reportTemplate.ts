import { useState } from 'react'
import { DEFAULT_REPORT_TEMPLATE, type ReportTemplate } from '../config/reportTemplate'

const KEY = 'sweepmate:report-template'

function load(): ReportTemplate {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_REPORT_TEMPLATE
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULT_REPORT_TEMPLATE
    // Only accept known string fields so a stale or damaged override can't break the report.
    const merged = { ...DEFAULT_REPORT_TEMPLATE }
    for (const key of Object.keys(DEFAULT_REPORT_TEMPLATE) as (keyof ReportTemplate)[]) {
      const v = (parsed as Record<string, unknown>)[key]
      if (typeof v === 'string') merged[key] = v
    }
    return merged
  } catch {
    return DEFAULT_REPORT_TEMPLATE
  }
}

/** The report template with the user's local overrides applied. */
export function useReportTemplate() {
  const [template, setTemplate] = useState<ReportTemplate>(load)

  const update = (next: ReportTemplate) => {
    setTemplate(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* override lasts for this session only */
    }
  }

  const reset = () => {
    setTemplate(DEFAULT_REPORT_TEMPLATE)
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
  }

  return { template, update, reset }
}
