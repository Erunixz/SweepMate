import { fireEvent, render, screen, within } from '@testing-library/react'
import { getRoute } from '../domain/route'
import { testShift } from '../domain/testShift'
import type { Shift } from '../domain/types'
import { StoreProvider, useStore } from '../state/store'
import { Walkthrough } from './Walkthrough'

function Harness() {
  const { view } = useStore()
  if (view.name !== 'walk') return <p>view: {view.name}</p>
  return <Walkthrough sweepId={view.sweepId} buildingId={view.buildingId} index={view.index} />
}

let latest: Shift | null = null
function Spy() {
  latest = useStore().active
  return null
}

function setup(buildingId = 'lp') {
  const shift = testShift()
  const sweepId = shift.sweeps[0]!.id
  render(
    <StoreProvider persist={false} initialShifts={[shift]} initialActiveId={shift.id} initialView={{ name: 'walk', sweepId, buildingId, index: 0 }}>
      <Harness />
      <Spy />
    </StoreProvider>,
  )
  return { shift, sweepId }
}

const bsweep = (sweepId: string, b: string) => latest!.sweeps.find((s) => s.id === sweepId)!.buildings[b]
const entries = (sweepId: string, b: string) => bsweep(sweepId, b)?.entries ?? {}
const heading = () => screen.getByRole('heading', { level: 2 }).textContent

it('saves an explicit zero, skips an empty location without recording it, and fills the building start time', () => {
  const { sweepId } = setup()
  const route = getRoute('lp')
  expect(heading()).toBe(route[0]!.label)
  fireEvent.click(screen.getByRole('button', { name: '0' }))
  fireEvent.click(screen.getByRole('button', { name: /save & next/i }))
  expect(entries(sweepId, 'lp')[route[0]!.id]).toMatchObject({ state: 'answered', count: 0 })

  expect(screen.queryByRole('button', { name: /not checked/i })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
  expect(heading()).toBe(route[2]!.label)
  expect(entries(sweepId, 'lp')[route[1]!.id]).toBeUndefined()
  // Typing a count turns Skip back into Save & Next.
  fireEvent.change(screen.getByLabelText(/people present/i), { target: { value: '4' } })
  expect(screen.getByRole('button', { name: /save & next/i })).toBeInTheDocument()
  expect(bsweep(sweepId, 'lp')!.actualStart).toMatch(/^\d\d:\d\d$/)
  expect(bsweep(sweepId, 'woodstock')).toBeUndefined()
})

it('walks the full Les Prince route by keyboard, including the different Floor 1', () => {
  const { sweepId } = setup('lp')
  const seen: string[] = []
  getRoute('lp').forEach((_, i) => {
    seen.push(heading()!)
    const input = screen.getByLabelText(/people present/i)
    fireEvent.change(input, { target: { value: String(i) } })
    fireEvent.keyDown(input, { key: 'Enter' })
  })
  expect(seen.slice(0, 8)).toEqual([
    'Floor 6 south study room',
    'Floor 6 south kitchen',
    'Floor 6 north study room',
    'Floor 6 north kitchen',
    'Floor 5 north study room',
    'Floor 5 north kitchen',
    'Floor 5 south study room',
    'Floor 5 south kitchen',
  ])
  expect(seen.slice(-4)).toEqual(['Floor 1 study room', 'Floor 1 kitchen', 'Games room', 'Laundry room'])
  expect(Object.keys(entries(sweepId, 'lp'))).toHaveLength(getRoute('lp').length)
  expect(screen.getByText(/end of route/i)).toBeInTheDocument()
})

it('walks the full Woodstock route in exact order, then hands off to Les Prince', () => {
  const { sweepId } = setup('woodstock')
  const route = getRoute('woodstock')
  route.forEach((loc, i) => {
    expect(heading()).toBe(loc.label)
    const input = screen.getByLabelText(/people present/i)
    fireEvent.change(input, { target: { value: String(i) } })
    fireEvent.keyDown(input, { key: 'Enter' })
  })
  expect(route.map((l) => entries(sweepId, 'woodstock')[l.id]?.count)).toEqual(route.map((_, i) => i))
  // Finishing the last room records the end time automatically; there's no button for it.
  expect(screen.queryByRole('button', { name: /end time/i })).toBeNull()
  expect(bsweep(sweepId, 'woodstock')!.actualEnd).toMatch(/^\d\d:\d\d$/)
  expect(screen.getByText(/^Ended at /)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /continue to les prince/i }))
  expect(heading()).toBe(getRoute('lp')[0]!.label)
})

it('refuses to save without a value instead of inventing one', () => {
  const { sweepId } = setup()
  // An observation without a count can't be saved as a silent 0.
  fireEvent.click(screen.getByRole('button', { name: /add observation/i }))
  fireEvent.change(screen.getByLabelText('Observation'), { target: { value: 'Door propped open' } })
  fireEvent.click(screen.getByRole('button', { name: /save & next/i }))
  expect(screen.getByRole('alert')).toHaveTextContent(/enter a count/i)
  expect(entries(sweepId, 'lp')).toEqual({})
})

it('starts every location empty, even when the previous sweep had counts', () => {
  const shift = testShift()
  const [first, second] = shift.sweeps
  const prefilled: Shift = {
    ...shift,
    sweeps: [
      { ...first!, buildings: { woodstock: { entries: { 'f6-common': { state: 'answered', count: 5, observation: '', updatedAt: '' } }, actualStart: '', actualEnd: '', cas: null } } },
      second!,
      shift.sweeps[2]!,
    ],
  }
  render(
    <StoreProvider persist={false} initialShifts={[prefilled]} initialActiveId={shift.id} initialView={{ name: 'walk', sweepId: second!.id, buildingId: 'woodstock', index: 0 }}>
      <Harness />
    </StoreProvider>,
  )
  expect(screen.getByLabelText(/people present/i)).toHaveValue(null)
})

it('lets you go back and edit a previous answer', () => {
  const { sweepId } = setup()
  const route = getRoute('lp')
  fireEvent.change(screen.getByLabelText(/people present/i), { target: { value: '7' } })
  fireEvent.click(screen.getByRole('button', { name: /save & next/i }))
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByLabelText(/people present/i)).toHaveValue(7)
  fireEvent.change(screen.getByLabelText(/people present/i), { target: { value: '8' } })
  fireEvent.click(screen.getByRole('button', { name: /save & next/i }))
  expect(entries(sweepId, 'lp')[route[0]!.id]?.count).toBe(8)
})

it('edits this building sweep’s CAs and times without changing the shift default', () => {
  const { sweepId } = setup()
  fireEvent.click(screen.getByRole('button', { name: /Sweep details: Not started · Erfan, Jacob/ }))
  const dialog = screen.getByRole('dialog', { name: /Les Prince sweep details/ })
  fireEvent.click(within(dialog).getByRole('button', { name: /Erfan/, pressed: true }))
  fireEvent.change(within(dialog).getByLabelText('End time'), { target: { value: '21:45' } })
  expect(bsweep(sweepId, 'lp')).toMatchObject({ cas: ['Jacob'], actualEnd: '21:45' })
  expect(latest!.buildingCAs.lp).toEqual(['Erfan', 'Jacob'])
})

it('adds a note (e.g. B103) pre-filled with the current sweep and location', () => {
  const { sweepId } = setup('woodstock')
  fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
  expect(screen.getByLabelText('Location')).toHaveValue('Woodstock Floor 6 common room')
  expect((screen.getByLabelText('Time') as HTMLInputElement).value).toMatch(/^\d\d:\d\d$/)
  fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Woodstock B103' } })
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'B103 open' } })
  fireEvent.click(screen.getByRole('button', { name: /save note/i }))
  expect(latest!.notes[0]).toMatchObject({ kind: 'general', sweepId, location: 'Woodstock B103', description: 'B103 open' })
})

it('records a maintenance note as observed, not submitted', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
  fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'work-order' } })
  expect(screen.getByLabelText('Status')).toHaveValue('observed')
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Ceiling tile missing' } })
  fireEvent.click(screen.getByRole('button', { name: /save note/i }))
  expect(latest!.notes[0]).toMatchObject({ kind: 'work-order', status: 'observed' })
})
