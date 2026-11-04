import { fireEvent, render, screen, within } from '@testing-library/react'
import App from '../App'
import { SHIFTS_KEY } from '../domain/storage'
import { getRoute } from '../domain/route'

beforeEach(() => { localStorage.clear(); sessionStorage.clear() })

it.each([['Woodstock', 'woodstock', 'Les Prince'], ['Les Prince', 'lp', 'Woodstock']])('walks, resumes, edits and exports a quick sweep of %s', (name, id, other) => {
  const first = render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Quick sweep' }))
  fireEvent.click(screen.getByRole('radio', { name }))
  expect(screen.queryByLabelText('Coverage phone pick-up')).toBeNull()
  expect(screen.queryByText('Shift type')).toBeNull()
  fireEvent.change(screen.getByLabelText('My name (optional)'), { target: { value: 'Sam' } })
  fireEvent.click(screen.getByRole('button', { name: 'Start quick sweep' }))
  expect(screen.getByRole('heading', { name })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: getRoute(id)[0]!.label })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
  expect(screen.queryByLabelText('Sweep')).toBeNull()
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Door secured' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save note' }))
  getRoute(id).forEach((location, i) => {
    expect(screen.getByRole('heading', { name: location.label })).toBeInTheDocument()
    if (i === 0) {
      fireEvent.click(screen.getByRole('button', { name: '0' }))
      fireEvent.click(screen.getByRole('button', { name: /save & next/i }))
    } else {
      fireEvent.click(screen.getByRole('button', { name: /not checked/i }))
    }
  })
  expect(screen.queryByRole('button', { name: new RegExp(`Continue to ${other}`) })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Record ${name} end time`) }))
  fireEvent.click(screen.getByRole('button', { name: 'Overview' }))
  expect(screen.queryByRole('button', { name: 'Add sweep' })).toBeNull()
  expect(screen.queryByText('On coverage')).toBeNull()
  expect(screen.queryByText(other)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Edit quick sweep' }))
  fireEvent.change(screen.getByLabelText('Other CAs (optional)'), { target: { value: 'Jo' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Report' }))
  const report = screen.getByLabelText('Preview') as HTMLTextAreaElement
  expect(report.value).toContain('CAs: Sam and Jo')
  expect(report.value).toContain('0 in ')
  expect(report.value).toContain('[not checked]')
  expect(report.value).toContain('Door secured.')
  expect(report.value).not.toContain('[not recorded]')
  expect(report.value).not.toContain(other)
  expect(report.value).not.toMatch(/SWEEPS:|phone pick up/)
  expect(screen.getByRole('button', { name: 'Copy Report' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Download TXT' })).toBeInTheDocument()
  first.unmount()
  sessionStorage.clear()
  render(<App />)
  expect(screen.getByText('Quick')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Resume Shift/ }))
  expect(screen.queryByText(other)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Mark sweep finished' }))
  fireEvent.click(screen.getByRole('button', { name: 'Home' }))
  fireEvent.click(screen.getByRole('button', { name: /Delete shift on/ }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete shift' }))
  expect(JSON.parse(localStorage.getItem(SHIFTS_KEY)!).shifts).toEqual([])
})
