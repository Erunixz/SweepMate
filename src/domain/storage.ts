/**
 * Local persistence. Real shifts and the demo shift live under separate keys so fictional
 * data can never mix with real records. Damaged data is backed up, never silently discarded.
 */
import { DEFAULT_SCHEDULES } from '../config/schedules'
import type { Note, Shift, Sweep } from './types'

export const SHIFTS_KEY = 'sweepmate:v1:shifts'
export const DEMO_KEY = 'sweepmate:v1:demo'
export const BACKUP_PREFIX = 'sweepmate:v1:backup-'

export type LoadProblem = null | 'unavailable' | 'corrupt' | 'partial'

export interface LoadResult {
  shifts: Shift[]
  demo: Shift | null
  problem: LoadProblem
}

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function getStorage(): KV | null {
  try {
    const s = window.localStorage
    const probe = '__sweepmate_probe__'
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    return null
  }
}

const isStr = (v: unknown): v is string => typeof v === 'string'
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

function normalizeSweep(v: unknown): Sweep | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.scheduledTime)) return null
  const buildings: Sweep['buildings'] = {}
  if (isObj(v.buildings)) {
    for (const [bid, b] of Object.entries(v.buildings)) {
      if (!isObj(b) || !isObj(b.entries)) continue
      const entries: Sweep['buildings'][string]['entries'] = {}
      for (const [lid, e] of Object.entries(b.entries)) {
        if (!isObj(e) || (e.state !== 'answered' && e.state !== 'skipped')) continue
        entries[lid] = {
          state: e.state,
          ...(typeof e.count === 'number' && Number.isFinite(e.count) ? { count: e.count } : {}),
          ...(isStr(e.status) ? { status: e.status } : {}),
          observation: isStr(e.observation) ? e.observation : '',
          updatedAt: isStr(e.updatedAt) ? e.updatedAt : '',
        }
      }
      buildings[bid] = {
        entries,
        actualStart: isStr(b.actualStart) ? b.actualStart : '',
        actualEnd: isStr(b.actualEnd) ? b.actualEnd : '',
        cas: Array.isArray(b.cas) ? b.cas.filter(isStr) : null,
      }
    }
  }
  return {
    id: v.id,
    scheduledTime: v.scheduledTime,
    buildings,
  }
}

function normalizeNote(v: unknown): Note | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.kind)) return null
  if (!['general', 'work-order', 'ir', 'soc', 'follow-up'].includes(v.kind)) return null
  const s = (k: string) => (isStr(v[k]) ? (v[k] as string) : '')
  return {
    id: v.id,
    kind: v.kind as Note['kind'],
    sweepId: isStr(v.sweepId) ? v.sweepId : null,
    buildingId: isStr(v.buildingId) ? v.buildingId : null,
    location: s('location'),
    time: s('time'),
    description: s('description'),
    action: s('action'),
    contacts: s('contacts'),
    reference: s('reference'),
    status: s('status') as Note['status'],
    followUp: s('followUp'),
    createdAt: s('createdAt'),
    updatedAt: s('updatedAt'),
  }
}

/** Validate and fill defaults for a stored shift. Returns null if it can't be trusted. */
export function normalizeShift(v: unknown): Shift | null {
  if (!isObj(v) || !isStr(v.id) || !isStr(v.date) || !isStr(v.startTime) || !Array.isArray(v.sweeps)) return null
  const type = isStr(v.type) && v.type in DEFAULT_SCHEDULES ? (v.type as Shift['type']) : 'weekday'
  const sweeps = v.sweeps.map(normalizeSweep)
  if (sweeps.some((s) => s === null)) return null
  const notes = Array.isArray(v.notes) ? v.notes.map(normalizeNote).filter((n): n is Note => n !== null) : []
  const names = (x: unknown) => (Array.isArray(x) ? x.filter(isStr) : [])
  // Older saves stored caNames/partners instead of myName/otherCAs.
  const legacy = names(v.caNames)
  const buildingCAs: Record<string, string[]> = {}
  if (isObj(v.buildingCAs)) for (const [b, n] of Object.entries(v.buildingCAs)) buildingCAs[b] = names(n)
  return {
    id: v.id,
    isDemo: v.isDemo === true,
    date: v.date,
    type,
    phonePickup: isStr(v.phonePickup) ? v.phonePickup : '',
    startTime: v.startTime,
    endTime: isStr(v.endTime) ? v.endTime : DEFAULT_SCHEDULES[type].end,
    myName: isStr(v.myName) ? v.myName : (legacy[0] ?? ''),
    otherCAs: Array.isArray(v.otherCAs) ? names(v.otherCAs) : [...legacy.slice(1), ...names(v.partners)],
    buildingCAs,
    startingBuildingId: isStr(v.startingBuildingId) ? v.startingBuildingId : '',
    sweeps: sweeps as Sweep[],
    notes,
    extraNotes: isStr(v.extraNotes) ? v.extraNotes : '',
    finished: v.finished === true,
    reportDraft: isStr(v.reportDraft) ? v.reportDraft : null,
    createdAt: isStr(v.createdAt) ? v.createdAt : '',
    updatedAt: isStr(v.updatedAt) ? v.updatedAt : '',
  }
}

function backup(storage: KV, key: string, raw: string) {
  try {
    storage.setItem(`${BACKUP_PREFIX}${key.split(':').pop()}-${Date.now()}`, raw)
  } catch {
    /* no room for a backup; leave the original untouched instead */
  }
}

export function loadAll(storage: KV | null = getStorage()): LoadResult {
  if (!storage) return { shifts: [], demo: null, problem: 'unavailable' }
  let problem: LoadProblem = null
  let shifts: Shift[] = []

  const raw = storage.getItem(SHIFTS_KEY)
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw)
      const list = isObj(parsed) && Array.isArray(parsed.shifts) ? parsed.shifts : null
      if (!list) throw new Error('bad shape')
      const normalized = list.map(normalizeShift)
      shifts = normalized.filter((s): s is Shift => s !== null && !s.isDemo)
      if (normalized.some((s) => s === null)) {
        problem = 'partial'
        backup(storage, SHIFTS_KEY, raw)
      }
    } catch {
      problem = 'corrupt'
      backup(storage, SHIFTS_KEY, raw)
    }
  }

  let demo: Shift | null = null
  const rawDemo = storage.getItem(DEMO_KEY)
  if (rawDemo) {
    try {
      demo = normalizeShift(JSON.parse(rawDemo))
    } catch {
      /* demo data is disposable */
    }
    if (!demo) storage.removeItem(DEMO_KEY)
  }

  shifts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return { shifts, demo, problem }
}

export function saveShifts(shifts: Shift[], storage: KV | null = getStorage()): boolean {
  if (!storage) return false
  try {
    storage.setItem(SHIFTS_KEY, JSON.stringify({ version: 1, shifts: shifts.filter((s) => !s.isDemo) }))
    return true
  } catch {
    return false
  }
}

export function saveDemo(demo: Shift | null, storage: KV | null = getStorage()): boolean {
  if (!storage) return false
  try {
    if (demo) storage.setItem(DEMO_KEY, JSON.stringify(demo))
    else storage.removeItem(DEMO_KEY)
    return true
  } catch {
    return false
  }
}
