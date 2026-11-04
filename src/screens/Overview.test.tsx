import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { testShift } from '../domain/testShift'
import { StoreProvider } from '../state/store'
import { Overview } from './Overview'

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
