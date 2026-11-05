import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { loadAll, saveShifts, type LoadProblem } from '../domain/storage'
import type { Shift } from '../domain/types'

export type View =
  | { name: 'welcome' }
  | { name: 'setup'; mode: 'new' | 'edit' }
  | { name: 'quick-setup'; mode: 'new' | 'edit' }
  | { name: 'overview' }
  | { name: 'walk'; sweepId: string; buildingId: string; index: number }
  | { name: 'notes' }
  | { name: 'report' }

export interface SaveState {
  status: 'idle' | 'saved' | 'error'
  at: number | null
}

interface Store {
  /** Shifts, most recently updated first. */
  shifts: Shift[]
  active: Shift | null
  view: View
  save: SaveState
  loadProblem: LoadProblem
  dismissLoadProblem: () => void
  navigate: (view: View) => void
  openShift: (shift: Shift) => void
  updateActive: (fn: (s: Shift) => Shift) => void
  deleteShift: (id: string) => void
}

const StoreContext = createContext<Store | null>(null)
const SESSION_KEY = 'sweepmate:v1:session'

function readSession(): { activeId: string | null; view: View } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

interface Initial {
  shifts: Shift[]
  activeId: string | null
  view: View
  problem: LoadProblem
}

function loadInitial(): Initial {
  const { shifts, problem } = loadAll()
  // After a refresh, return to the screen the user was on.
  const session = readSession()
  const known = session?.activeId && shifts.some((s) => s.id === session.activeId)
  return {
    shifts,
    activeId: known ? session!.activeId : null,
    view: known ? session!.view : { name: 'welcome' },
    problem,
  }
}

export function StoreProvider({
  children,
  persist = true,
  initialShifts,
  initialActiveId = null,
  initialView = { name: 'welcome' },
}: {
  children: ReactNode
  /** Tests pass false to keep everything in memory. */
  persist?: boolean
  initialShifts?: Shift[]
  initialActiveId?: string | null
  initialView?: View
}) {
  const [initial] = useState<Initial>(() =>
    persist
      ? loadInitial()
      : { shifts: initialShifts ?? [], activeId: initialActiveId, view: initialView, problem: null },
  )
  const [shifts, setShifts] = useState<Shift[]>(initial.shifts)
  const [activeId, setActiveId] = useState<string | null>(initial.activeId)
  const [view, setView] = useState<View>(initial.view)
  const [loadProblem, setLoadProblem] = useState<LoadProblem>(initial.problem)
  const [save, setSave] = useState<SaveState>({ status: 'idle', at: null })

  // Autosave whenever shift data actually changes.
  const lastSaved = useRef({ shifts: JSON.stringify(initial.shifts) })
  useEffect(() => {
    if (!persist) return
    const json = JSON.stringify(shifts)
    if (json === lastSaved.current.shifts) return
    const ok = saveShifts(shifts)
    if (ok) lastSaved.current.shifts = json
    setSave({ status: ok ? 'saved' : 'error', at: Date.now() })
  }, [shifts, persist])
  useEffect(() => {
    if (!persist) return
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ activeId, view }))
    } catch {
      /* refresh will just return to the welcome screen */
    }
  }, [activeId, view, persist])

  const active = shifts.find((s) => s.id === activeId) ?? null

  const navigate = useCallback((v: View) => {
    setView(v)
    window.scrollTo?.({ top: 0 })
  }, [])

  const openShift = useCallback(
    (shift: Shift) => {
      setShifts((list) => [shift, ...list.filter((s) => s.id !== shift.id)])
      setActiveId(shift.id)
      navigate({ name: 'overview' })
    },
    [navigate],
  )

  const updateActive = useCallback(
    (fn: (s: Shift) => Shift) => {
      if (!activeId) return
      setShifts((list) => list.map((s) => (s.id === activeId ? fn(s) : s)))
    },
    [activeId],
  )

  const deleteShift = useCallback((id: string) => {
    setShifts((list) => list.filter((s) => s.id !== id))
    setActiveId((a) => (a === id ? null : a))
  }, [])

  const dismissLoadProblem = useCallback(() => setLoadProblem(null), [])

  const value = useMemo(
    () => ({
      shifts,
      active,
      view,
      save,
      loadProblem,
      dismissLoadProblem,
      navigate,
      openShift,
      updateActive,
      deleteShift,
    }),
    [shifts, active, view, save, loadProblem, dismissLoadProblem, navigate, openShift, updateActive, deleteShift],
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}

/** For screens that only render with an active shift. */
export function useActiveShift() {
  const store = useStore()
  if (!store.active) throw new Error('No active shift')
  return { ...store, shift: store.active }
}
