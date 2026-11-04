import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createNote, setEntry, updateBuildingSweep, upsertNote } from '../domain/shift'
import { nowTime } from '../domain/time'
import { testShift } from '../domain/testShift'
import { StoreProvider, useStore } from '../state/store'
import { Overview } from './Overview'

function SavedShift() {
  return <output data-testid="saved-shift">{JSON.stringify(useStore().active)}</output>
}

it('adds sweeps in overnight order, rejects duplicates, and preserves recorded data', () => {
  let shift = testShift()
  const id = shift.sweeps[0]!.id
  shift = setEntry(shift, id, 'lp', 'games', { state: 'answered', count: 4, observation: 'Quiet', updatedAt: 'saved' })
  shift = updateBuildingSweep(shift, id, 'lp', (b) => ({ ...b, actualStart: '21:10', actualEnd: '21:30', cas: ['Jo'] }))
  shift = upsertNote(shift, createNote('general', { sweepId: id, description: 'Checked door' }))
  render(<StoreProvider persist={false} initialShifts={[shift]} initialActiveId={shift.id}><Overview /><SavedShift /></StoreProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Add sweep' }))
  const dialog = within(screen.getByRole('dialog', { name: 'Add sweep' }))
  expect(dialog.getByLabelText('Sweep time')).toHaveValue(nowTime())
  fireEvent.change(dialog.getByLabelText('Sweep time'), { target: { value: '23:00' } })
  fireEvent.click(dialog.getByRole('button', { name: 'Add to schedule' }))
  expect(dialog.getByRole('alert')).toHaveTextContent('already scheduled')
  fireEvent.change(dialog.getByLabelText('Sweep time'), { target: { value: '' } })
  fireEvent.click(dialog.getByRole('button', { name: 'Add to schedule' }))
  expect(dialog.getByRole('alert')).toHaveTextContent('valid sweep time')
  fireEvent.change(dialog.getByLabelText('Sweep time'), { target: { value: '00:15' } })
  fireEvent.click(dialog.getByRole('button', { name: 'Add to schedule' }))
  const saved = JSON.parse(screen.getByTestId('saved-shift').textContent!)
  expect(saved.sweeps.map((s: { scheduledTime: string }) => s.scheduledTime)).toEqual(['21:00', '23:00', '00:15', '01:00'])
  expect(saved.sweeps.filter((s: { id: string }) => shift.sweeps.some((old) => old.id === s.id))).toEqual(shift.sweeps)
  expect(saved.sweeps[2].buildings).toEqual({})
  expect(saved.notes).toEqual(shift.notes)
})

it('copies every sweep as one ready-to-paste report from the overview', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.assign(navigator, { clipboard: { writeText } })
  const shift = testShift()
  render(
    <StoreProvider persist={false} initialShifts={[shift]} initialActiveId={shift.id} initialView={{ name: 'overview' }}>
      <Overview />
    </StoreProvider>,
  )
  expect(screen.getByText(/All 3 sweeps in one plain-text report/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Copy Full Report' }))
  await waitFor(() => expect(screen.getByText('Full report copied')).toBeInTheDocument())

  const copied: string = writeText.mock.calls[0]![0]
  expect(copied.startsWith('SWEEPS:\n9:00 PM, 11:00 PM, 1:00 AM\n\nNOTES:')).toBe(true)
  const sections = ['\n9:00 PM\n\nWoodstock', '\n11:00 PM\n\nWoodstock', '\n1:00 AM\n\nWoodstock'].map((h) => copied.indexOf(h))
  expect(sections.every((i) => i > 0)).toBe(true)
  expect([...sections].sort((a, b) => a - b)).toEqual(sections)
  expect(copied.trimEnd().endsWith('Extra Notes:\nNone.')).toBe(true)
})
