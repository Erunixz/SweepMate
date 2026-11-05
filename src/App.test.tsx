import { fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'
import { SHIFTS_KEY } from './domain/storage'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }))

function startShift() {
  const r = render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /^Lead coverage/ }))
  next()
  fireEvent.change(screen.getByLabelText('My name'), { target: { value: 'Erfan' } })
  fireEvent.change(screen.getByLabelText('Other CAs on coverage 1'), { target: { value: 'Jacob' } })
  next()
  fireEvent.click(screen.getByRole('button', { name: 'Start shift' }))
  return r
}

it('walks setup in three steps with no pre-filled name, confirmed sweep times, and the confirmed 9 PM–8 AM hours', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /^Lead coverage/ }))
  expect(screen.getByRole('heading', { name: 'Which shift?' })).toBeInTheDocument()
  next()
  expect(screen.getByRole('heading', { name: "Who's on coverage?" })).toBeInTheDocument()
  expect(screen.getByLabelText('My name')).toHaveValue('')
  next()
  // Shift hours are fixed at 9 PM–8 AM, so setup doesn't ask for them.
  expect(screen.queryByLabelText('Shift start')).toBeNull()
  expect(screen.queryByLabelText('Shift end')).toBeNull()
  expect(screen.queryByLabelText('Coverage phone pick-up')).toBeNull()
  expect(screen.getByLabelText('Sweep 1')).toHaveValue('21:00')
  expect(screen.getByLabelText('Sweep 2')).toHaveValue('23:00')
  fireEvent.click(screen.getByRole('button', { name: 'Start shift' }))
  expect(screen.queryByRole('alert')).toBeNull()
  const saved = JSON.parse(localStorage.getItem(SHIFTS_KEY)!).shifts[0]
  expect([saved.startTime, saved.endTime]).toEqual(['21:00', '08:00'])
})

it('shows the CA names on the overview and uses everyone for both buildings by default', () => {
  startShift()
  expect(screen.getByText('Weekday · Erfan, Jacob')).toBeInTheDocument()
  const saved = JSON.parse(localStorage.getItem(SHIFTS_KEY)!).shifts[0]
  expect(saved.buildingCAs).toEqual({ woodstock: ['Erfan', 'Jacob'], lp: ['Erfan', 'Jacob'] })
})

it('starts a Weekend shift with the 9 PM, 11 PM and 1 AM sweeps', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /^Lead coverage/ }))
  fireEvent.click(screen.getByRole('radio', { name: 'Weekend' }))
  next()
  next()
  expect(screen.getAllByLabelText(/^Sweep \d$/).map((i) => (i as HTMLInputElement).value)).toEqual(['21:00', '23:00', '01:00'])
  expect(screen.getByLabelText('Sweep 3')).toHaveAccessibleDescription('next day')
  fireEvent.click(screen.getByRole('button', { name: 'Start shift' }))
  const saved = JSON.parse(localStorage.getItem(SHIFTS_KEY)!).shifts[0]
  expect(saved.sweeps.map((s: { scheduledTime: string }) => s.scheduledTime)).toEqual(['21:00', '23:00', '01:00'])
})

it('lets you choose who sweeps each building', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /^Lead coverage/ }))
  next()
  fireEvent.change(screen.getByLabelText('My name'), { target: { value: 'Erfan' } })
  fireEvent.change(screen.getByLabelText('Other CAs on coverage 1'), { target: { value: 'Jacob' } })
  const lp = screen.getByRole('group', { name: 'Sweeping Les Prince' })
  fireEvent.click(within(lp).getByRole('button', { name: /Erfan/ }))
  next()
  fireEvent.click(screen.getByRole('button', { name: 'Start shift' }))
  const saved = JSON.parse(localStorage.getItem(SHIFTS_KEY)!).shifts[0]
  expect(saved.buildingCAs).toEqual({ woodstock: ['Erfan', 'Jacob'], lp: ['Jacob'] })
})

it('offers only Weekday and Weekend, each with its own sweep times and no save-default option', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /^Lead coverage/ }))
  expect(screen.getAllByRole('radio').map((r) => r.getAttribute('value'))).toEqual(['weekday', 'weekend'])
  expect(screen.queryByRole('radio', { name: 'Peak day' })).toBeNull()
  next()
  next()
  expect(screen.getAllByLabelText(/^Sweep \d$/).map((i) => (i as HTMLInputElement).value)).toEqual(['21:00', '23:00'])
  expect(screen.queryByRole('button', { name: /Save times as/ })).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: /1\. Shift/ }))
  fireEvent.click(screen.getByRole('radio', { name: 'Weekend' }))
  next()
  next()
  expect(screen.getAllByLabelText(/^Sweep \d$/).map((i) => (i as HTMLInputElement).value)).toEqual(['21:00', '23:00', '01:00'])
})

it('autosaves a new shift and restores it after a reload', () => {
  const first = startShift()
  expect(screen.getByRole('button', { name: /^Start Woodstock/ })).toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem(SHIFTS_KEY)!).shifts).toHaveLength(1)

  // Same tab refresh: returns straight to the shift.
  first.unmount()
  const second = render(<App />)
  expect(screen.getByRole('button', { name: /^Start Woodstock/ })).toBeInTheDocument()

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

it('deletes an unfinished shift from the home screen without finishing it', () => {
  startShift()
  fireEvent.click(screen.getByRole('button', { name: 'Home' }))
  fireEvent.click(screen.getByRole('button', { name: /Delete shift on/ }))
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Delete shift?' })).getByRole('button', { name: 'Delete shift' }))
  expect(JSON.parse(localStorage.getItem(SHIFTS_KEY)!).shifts).toHaveLength(0)
  expect(screen.getByRole('button', { name: /^Lead coverage/ })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Resume Shift/ })).toBeNull()
})

it('shows a notice when saved data is corrupted', () => {
  localStorage.setItem(SHIFTS_KEY, 'garbage')
  render(<App />)
  expect(screen.getByRole('alert')).toHaveTextContent(/couldn't be read/)
})
