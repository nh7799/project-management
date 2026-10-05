import { useSettings, type Settings } from '../lib/settings'
import { Title } from '../components/ui'

function Group<K extends keyof Settings>({ label, k, opts }: { label: string; k: K; opts: [string, Settings[K]][] }) {
  const { s, set } = useSettings()
  return (
    <section className="card mb-4">
      <h2 className="htitle sm mb-3">{label}</h2>
      <div className="flex flex-wrap gap-2">
        {opts.map(([n, val]) => (
          <button key={n} className="pill" aria-pressed={s[k] === val} onClick={() => set({ [k]: val } as any)}>{n}</button>
        ))}
      </div>
    </section>
  )
}

export default function SettingsPage() {
  return (
    <div>
      <Title sub="Changes apply instantly and are remembered on this device.">
        🎨 Make it comfortable
      </Title>
      <Group label="🎨 Theme" k="theme" opts={[['☀️ Calm light', 'light'], ['📜 Soft sepia', 'sepia'], ['🌙 Calm dark', 'dark'], ['⚫ High contrast', 'contrast']]} />
      <Group label="💎 Accent colour" k="accent" opts={[['🔵 Blue', 'blue'], ['🟢 Teal', 'teal'], ['🟣 Violet', 'violet'], ['🟩 Green', 'green'], ['🟧 Amber', 'amber']]} />
      <Group label="🔤 Text size" k="size" opts={[['Standard (16px)', 16], ['Large (18px)', 18], ['Extra large (20px)', 20], ['Huge (24px)', 24]]} />
      <Group label="📖 Font" k="font" opts={[['Standard (system)', 'system'], ['Easy to read', 'readable'], ['Serif', 'serif'], ['Monospace', 'mono']]} />
      <Group label="📐 Line spacing" k="spacing" opts={[['Tight (1.4)', 1.4], ['Relaxed (1.6)', 1.6], ['Airy (1.9)', 1.9]]} />
      <Group label="🪷 Animations" k="motion" opts={[['On (gentle)', true], ['Off (no movement)', false]]} />
      <Group label="📏 Density" k="density" opts={[['Comfortable', 'comfortable'], ['Compact', 'compact']]} />
      <div className="card">
        <div className="hsection mb-2">Preview</div>
        <p>This is how your text will look. Pick whatever makes reading effortless — you will be using this app every day.</p>
        <p className="muted small">Tip: larger sans-serif fonts and calm line-spacing reduce cognitive load and make long work sessions easier.</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="chip acc">Example chip</span>
          <span className="chip ok">Ok</span>
          <span className="chip warn">Warn</span>
          <span className="chip bad">Bad</span>
          <span className="pill">Example pill</span>
          <button className="btn">Primary</button>
          <button className="btn ghost">Ghost</button>
        </div>
      </div>
    </div>
  )
}
