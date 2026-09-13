export const COLOR_SCHEME_KEY = 'admin_color_scheme'

export type ColorScheme = 'light' | 'dark'

export function applySchemeToDocument(scheme: ColorScheme) {
  document.documentElement.dataset.theme = scheme
}

export function readStoredScheme() {
  try {
    const raw = localStorage.getItem(COLOR_SCHEME_KEY)
    const scheme: ColorScheme = raw === 'dark' ? 'dark' : 'light'
    applySchemeToDocument(scheme)
    return scheme
  } catch {
    applySchemeToDocument('light')
    return 'light'
  }
}

export function persistScheme(scheme: ColorScheme) {
  applySchemeToDocument(scheme)
  try {
    localStorage.setItem(COLOR_SCHEME_KEY, scheme)
  } catch {}
}

export function nextScheme(current: ColorScheme) {
  return current === 'light' ? 'dark' : 'light'
}
