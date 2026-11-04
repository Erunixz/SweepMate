import { Notes } from './screens/Notes'
import { Overview } from './screens/Overview'
import { Report } from './screens/Report'
import { ShiftSetup } from './screens/ShiftSetup'
import { Walkthrough } from './screens/Walkthrough'
import { Welcome } from './screens/Welcome'
import { StoreProvider, useStore } from './state/store'
import { ThemeProvider } from './state/themeContext'

function Screens() {
  const { view, active } = useStore()
  if (view.name === 'setup') return <ShiftSetup key={view.mode} mode={active ? view.mode : 'new'} />
  if (!active) return <Welcome />
  switch (view.name) {
    case 'overview':
      return <Overview />
    case 'walk':
      return <Walkthrough sweepId={view.sweepId} buildingId={view.buildingId} index={view.index} />
    case 'notes':
      return <Notes />
    case 'report':
      return <Report />
    default:
      return <Welcome />
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <StoreProvider>
        <Screens />
      </StoreProvider>
    </ThemeProvider>
  )
}
