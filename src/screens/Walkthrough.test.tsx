import { fireEvent, render, screen } from '@testing-library/react'
import { getRoute } from '../domain/route'
import { createShift } from '../domain/shift'
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
  const shift = createShift({
    date: '2026-11-04',
    type: 'weekday',
    startTime: '19:00',
    endTime: '03:00',
    caNames: ['Alex'],
    partners: [],
    startingBuildingId: 'lp',
    sweepTimes: ['20:00', '22:00'],
  })
  const sweepId = shift.sweeps[0]!.id
  render(
    <StoreProvider persist={false} initialShifts={[shift]} initialActiveId={shift.id} initialView={{ name: 'walk', sweepId, buildingId, index: 0 }}>
      <Harness />
      <Spy />
    </StoreProvider>,
  )
  return { shift, sweepId }
}

const entries = (sweepId: string, b: string) => latest!.sweeps.find((s) => s.id === sweepId)!.buildings[b]?.entries ?? {}

it('saves an explicit zero, records Not Checked, and walks LP in alternating order', () => {
  const { sweepId } = setup()
  const route = getRoute('lp')

  expect(screen.getByRole('heading', { name: route[0]!.label })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '0' }))
  fireEvent.click(screen.getByRole('button', { name: /save & next/i }))
  expect(entries(sweepId, 'lp')[route[0]!.id]).toMatchObject({ state: 'answered', count: 0 })

  expect(screen.getByRole('heading', { name: route[1]!.label })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /not checked/i }))
  expect(entries(sweepId, 'lp')[route[1]!.id]).toMatchObject({ state: 'skipped' })

  // Untouched locations stay unanswered.
  expect(entries(sweepId, 'lp')[route[2]!.id]).toBeUndefined()
  expect(latest!.sweeps[0]!.actualStart).toMatch(/^\d\d:\d\d$/)
})

it('walks the full Woodstock route by keyboard in exact order, then hands off to LP', () => {
  const { sweepId } = setup('woodstock')
  const route = getRoute('woodstock')
  route.forEach((loc, i) => {
    expect(screen.getByRole('heading', { name: loc.label })).toBeInTheDocument()
    const input = screen.getByLabelText(/people present/i)
    fireEvent.change(input, { target: { value: String(i) } })
    fireEvent.keyDown(input, { key: 'Enter' })
  })
  expect(Object.values(entries(sweepId, 'woodstock')).map((e) => e.count)).toEqual(route.map((_, i) => i))
  expect(screen.getByText(/end of route/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /continue to lp/i }))
  expect(screen.getByRole('heading', { name: getRoute('lp')[0]!.label })).toBeInTheDocument()
})

it('refuses to save without a value instead of inventing one', () => {
  const { sweepId } = setup()
  fireEvent.click(screen.getByRole('button', { name: /save & next/i }))
  expect(screen.getByRole('alert')).toHaveTextContent(/enter a count/i)
  expect(Object.keys(entries(sweepId, 'lp'))).toHaveLength(0)
})

it('lets you go back and edit a previous answer', () => {
  const { sweepId } = setup()
  const route = getRoute('lp')
  fireEvent.change(screen.getByLabelText(/people present/i), { target: { value: '7' } })
  fireEvent.click(screen.getByRole('button', { name: /save & next/i }))
  fireEvent.click(screen.getByRole('button', { name: /‹ back/i }))
  expect(screen.getByLabelText(/people present/i)).toHaveValue(7)
  fireEvent.click(screen.getByRole('button', { name: /increase count/i }))
  fireEvent.click(screen.getByRole('button', { name: /save & next/i }))
  expect(entries(sweepId, 'lp')[route[0]!.id]?.count).toBe(8)
})

it('adds a note pre-filled with the current sweep and location', () => {
  const { sweepId } = setup()
  const route = getRoute('lp')
  fireEvent.click(screen.getByRole('button', { name: /\+ note/i }))
  expect(screen.getByLabelText('Location')).toHaveValue(`LP ${route[0]!.label}`)
  expect((screen.getByLabelText('Time') as HTMLInputElement).value).toMatch(/^\d\d:\d\d$/)
  fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'work-order' } })
  expect(screen.getByLabelText('Status')).toHaveValue('observed')
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Ceiling tile missing' } })
  fireEvent.click(screen.getByRole('button', { name: /save note/i }))
  expect(latest!.notes).toHaveLength(1)
  expect(latest!.notes[0]).toMatchObject({ kind: 'work-order', status: 'observed', sweepId, description: 'Ceiling tile missing' })
})

it('records a status for B103', () => {
  const { sweepId } = setup()
  const route = getRoute('lp')
  const b103 = route.findIndex((r) => r.id === 'b103')
  fireEvent.click(screen.getByRole('button', { name: /open location list/i }))
  fireEvent.click(screen.getByRole('button', { name: /^B103/ }))
  fireEvent.click(screen.getByLabelText('Locked'))
  fireEvent.click(screen.getByRole('button', { name: /save & next/i }))
  expect(entries(sweepId, 'lp').b103).toMatchObject({ state: 'answered', status: 'Locked' })
  expect(b103).toBe(route.length - 1)
  expect(screen.getByText(/end of route/i)).toBeInTheDocument()
})
