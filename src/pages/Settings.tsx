import { useSettings, type Settings } from '../lib/settings'
import { Title } from '../components/ui'
function Group<K extends keyof Settings>({ label, k, opts }: { label: string; k: K; opts: [string, Settings[K]][] }) {
  const { s, set } = useSettings()
  return <section className="card mb-4"><h2 className="font-semibold mb-3">{label}</h2><div className="flex flex-wrap gap-2">{opts.map(([n, val]) => <button key={n} className="pill" aria-pressed={s[k] === val} onClick={() => set({ [k]: val } as Partial<Settings>)}>{n}</button>)}</div></section>
}
export default function SettingsPage() {
  return <div><Title sub="Changes apply instantly and are remembered on this device.">Make it comfortable</Title>
    <Group label="Theme" k="theme" opts={[['Calm light', 'light'], ['Soft sepia', 'sepia'], ['Calm dark', 'dark'], ['High contrast', 'contrast']]} />
    <Group label="Accent colour" k="accent" opts={[['Blue', 'blue'], ['Teal', 'teal'], ['Violet', 'violet'], ['Green', 'green'], ['Amber', 'amber']]} />
    <Group label="Text size" k="size" opts={[['Normal', 16], ['Large', 20], ['Extra large', 24], ['Huge', 28]]} />
    <Group label="Font" k="font" opts={[['Standard', 'system'], ['Easy to read', 'readable'], ['Serif', 'serif'], ['Monospace', 'mono']]} />
    <Group label="Line spacing" k="spacing" opts={[['Tight', 1.4], ['Relaxed', 1.6], ['Airy', 1.9]]} />
    <Group label="Animations" k="motion" opts={[['On (gentle)', true], ['Off (no movement)', false]]} />
    <p className="card">Preview: this is how your text looks. Pick whatever makes reading effortless.</p></div>
}
