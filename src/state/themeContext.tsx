import { createContext, useContext, type ReactNode } from 'react'
import { useTheme, type ThemePref } from './theme'

interface ThemeCtx {
  pref: ThemePref
  cycle: () => void
}

const Ctx = createContext<ThemeCtx>({ pref: 'system', cycle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { pref, cycle } = useTheme()
  return <Ctx.Provider value={{ pref, cycle }}>{children}</Ctx.Provider>
}

export const useThemeContext = () => useContext(Ctx)
