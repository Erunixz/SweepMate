import { fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'
import { SHIFTS_KEY } from './domain/storage'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

function startShift() {
  const r = render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Start Shift' }))
  fireEvent.change(screen.getByLabelText('My name'), { target: { value: 'Erfan' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Add sweep' }))
  fireEvent.click(screen.getByRole('button', { name: 'Start shift' }))
  return r
}

it('starts setup with no pre-filled name, no invented sweep times, and the confirmed 9 PM–8 AM hours', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Start Shift' }))
  expect(screen.getByLabelText('My name')).toHaveValue('')
  expect(screen.getByLabelText('Shift start')).toHaveValue('21:00')
  expect(screen.getByLabelText('Shift end')).toHaveValue('08:00')
  expect(screen.getByLabelText('Coverage phone pick-up')).toHaveValue('')
  expect(screen.queryByLabelText(/^Sweep 1$/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Start shift' }))
  expect(screen.getByRole('alert')).toHaveTextContent(/at least one scheduled sweep/i)
})

it('saves a schedule as the default for its shift type', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Start Shift' }))
  fireEvent.click(screen.getByRole('radio', { name: 'Peak day' }))
  fireEvent.change(screen.getByLabelText('Coverage phone pick-up'), { target: { value: '20:50' } })
  for (const t of ['21:00', '23:00', '01:00']) {
    fireEvent.click(screen.getByRole('button', { name: '+ Add sweep' }))
    const inputs = screen.getAllByLabelText(/^Sweep \d$/)
    fireEvent.change(inputs.at(-1)!, { target: { value: t } })
  }
  fireEvent.click(screen.getByRole('button', { name: /Save times as Peak day default/ }))
  fireEvent.click(screen.getByRole('radio', { name: 'Weekday' }))
  expect(screen.queryAllByLabelText(/^Sweep \d$/)).toHaveLength(0)
  fireEvent.click(screen.getByRole('radio', { name: 'Peak day' }))
  expect(screen.getAllByLabelText(/^Sweep \d$/).map((i) => (i as HTMLInputElement).value)).toEqual(['21:00', '23:00', '01:00'])
  expect(screen.getByLabelText('Coverage phone pick-up')).toHaveValue('20:50')
})

it('autosaves a new shift and restores it after a reload', () => {
  const first = startShift()
  expect(screen.getByText(/Sweep 1/)).toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem(SHIFTS_KEY)!).shifts).toHaveLength(1)

  // Same tab refresh: returns straight to the shift.
  first.unmount()
  const second = render(<App />)
  expect(screen.getAllByText(/Sweep 1/).length).toBeGreaterThan(0)

  // New session (app reopened): offered on the welcome screen.
  second.unmount()
  sessionStorage.clear()
  render(<App />)
  expect(screen.getByRole('button', { name: /Resume Shift –/ })).toBeEnabled()
})

it('requires confirmation before deleting a shift', () => {
  startShift()
  fireEvent.click(screen.getByRole('button', { name: 'Mark shift finished' }))
  fireEvent.click(screen.getByRole('button', { name: 'Home' }))
  fireEvent.click(screen.getByRole('button', { name: /Delete shift on/ }))
  const dialog = screen.getByRole('dialog', { name: 'Delete shift?' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(JSON.parse(localStorage.getItem(SHIFTS_KEY)!).shifts).toHaveLength(1)

  fireEvent.click(screen.getByRole('button', { name: /Delete shift on/ }))
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Delete shift?' })).getByRole('button', { name: 'Delete shift' }))
  expect(JSON.parse(localStorage.getItem(SHIFTS_KEY)!).shifts).toHaveLength(0)
})

it('opens the demo without adding it to real shifts', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /Try a demo shift/ }))
  expect(screen.getByText(/Demo shift – fictional data/)).toBeInTheDocument()
  expect(localStorage.getItem(SHIFTS_KEY)).toBeNull()
})

it('shows a notice when saved data is corrupted', () => {
  localStorage.setItem(SHIFTS_KEY, 'garbage')
  render(<App />)
  expect(screen.getByRole('alert')).toHaveTextContent(/couldn't be read/)
})
