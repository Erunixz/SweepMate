import { useThemeContext } from '../state/themeContext'
import { Button } from './ui'

const labels = { system: 'Auto', light: 'Light', dark: 'Dark' } as const
const icons = { system: '◐', light: '☀', dark: '☾' } as const

export function ThemeToggle() {
  const { pref, cycle } = useThemeContext()
  return (
    <Button variant="ghost" onClick={cycle} aria-label={`Theme: ${labels[pref]}. Change theme`} className="px-3">
      <span aria-hidden="true">{icons[pref]}</span>
      <span className="text-xs">{labels[pref]}</span>
    </Button>
  )
}
