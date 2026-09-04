import { createContext } from 'react'
import type { ColorScheme } from './theme'

export type ThemeContextValue = {
  mode: ColorScheme
  toggle: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
