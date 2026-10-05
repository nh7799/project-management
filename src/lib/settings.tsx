import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface Settings {
  theme: string
  accent: string
  size: number
  font: string
  spacing: number
  motion: boolean
  density: 'comfortable' | 'compact'
}

const DEF: Settings = { theme: 'light', accent: 'blue', size: 18, font: 'system', spacing: 1.6, motion: true, density: 'comfortable' }

const FONTS: Record<string, string> = {
  system: 'ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif',
  readable: 'Verdana,Tahoma,"Helvetica Neue",sans-serif',
  serif: 'Georgia,Charter,"Times New Roman",serif',
  mono: 'ui-monospace,Menlo,Consolas,monospace',
}

const THEMES: Record<string, string> = { light: 'light', sepia: 'sepia', dark: 'dark', contrast: 'contrast' }

interface Ctx { s: Settings; set: (p: Partial<Settings>) => void }
const Ctx = createContext<Ctx>({ s: DEF, set: () => {} })

export const useSettings = () => useContext(Ctx)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(() => {
    try { return { ...DEF, ...JSON.parse(localStorage.getItem('ui-settings') || '{}') } }
    catch { return DEF }
  })

  useEffect(() => {
    const r = document.documentElement
    r.dataset.theme = THEMES[s.theme] ?? s.theme
    r.dataset.accent = s.accent
    r.dataset.motion = s.motion ? 'on' : 'off'
    r.dataset.density = s.density
    r.style.setProperty('--fs', String(s.size))
    r.style.setProperty('--lh', String(s.spacing))
    r.style.setProperty('--font', FONTS[s.font] ?? FONTS.system)
    try { localStorage.setItem('ui-settings', JSON.stringify(s)) } catch { /* preferences only */ }
  }, [s])

  const set = (p: Partial<Settings>) => setS(o => ({ ...o, ...p }))

  return <Ctx.Provider value={{ s, set }}>{children}</Ctx.Provider>
}
