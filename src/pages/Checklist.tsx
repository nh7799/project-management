import { motion } from 'framer-motion'
import { useRows } from '../hooks/useRows'
import { CHECK } from '../data/checklist'
import { Bar, Err, Title, stagger } from '../components/ui'
import { daysUntil, fmt } from '../utils/dates'

export default function Checklist() {
  const { rows, error, add, remove } = useRows<{ id: string; step_key: string }>('guide_progress')
  const keys = new Map(rows.map(r => [r.step_key, r.id]))
  const k = (g: string, i: number) => `chk:${g}:${i}`
  const total = CHECK.reduce((a, g) => a + g.items.length, 0)
  const done = CHECK.reduce((a, g) => a + g.items.filter((_, i) => keys.has(k(g.id, i))).length, 0)
  const toggle = (g: string, i: number) => {
    const id = keys.get(k(g, i))
    return id ? remove(id, false) : add({ step_key: k(g, i) })
  }
  return (
    <div>
      <Title sub="Everything the handbook requires, in order. Tick as you go — saved automatically.">
        ☑️ Master checklist
      </Title>
      <Err msg={error} />
      <div className="card mb-5">
        <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
          <div>
            <div className="hsection">Overall</div>
            <div className="htitle">{done}/{total} · {Math.round((done / Math.max(1, total)) * 100)}%</div>
          </div>
          <Tag kind="acc">{done}/{total}</Tag>
        </div>
        <Bar pct={(done / Math.max(1, total)) * 100} />
      </div>
      {CHECK.map(g => {
        const gd = g.items.filter((_, i) => keys.has(k(g.id, i))).length
        return (
          <section key={g.id} className="card mb-5">
            <div className="flex flex-wrap justify-between gap-2 mb-2">
              <div>
                <div className="htitle sm">{g.title}</div>
                {g.due && <div className="tiny muted">Due {fmt(g.due)} — {daysUntil(g.due) < 0 ? 'passed' : `${daysUntil(g.due)} day${daysUntil(g.due) === 1 ? '' : 's'}`}</div>}
              </div>
              <span className="muted">{gd}/{g.items.length}</span>
            </div>
            <Bar pct={(gd / Math.max(1, g.items.length)) * 100} />
            <ul className="mt-3 space-y-1" style={{ listStyle: 'none', padding: 0 }}>
              {g.items.map((t, i) => {
                const on = keys.has(k(g.id, i))
                return (
                  <motion.li key={t} {...stagger(i)}>
                    <label className="flex gap-3 items-start py-1.5 cursor-pointer">
                      <input type="checkbox" className="checkbox mt-1.5" style={{ accentColor: 'var(--accent)' }} checked={on} onChange={() => toggle(g.id, i)} />
                      <motion.span animate={{ opacity: on ? .55 : 1 }} className={on ? 'line-through' : ''}>{t}</motion.span>
                    </label>
                  </motion.li>
                )
              })}
            </ul>
            {g.due && daysUntil(g.due) < 7 && daysUntil(g.due) >= 0 && gd < g.items.length && (
              <div className="warn mt-3">Due in {daysUntil(g.due)} day{daysUntil(g.due) === 1 ? '' : 's'} — {g.items.length - gd} item{g.items.length - gd === 1 ? '' : 's'} remaining.</div>
            )}
          </section>
        )
      })}
    </div>
  )
}
function Tag({ children, kind }: { children: React.ReactNode; kind?: string }) {
  return <span className={`chip ${kind || ''}`}>{children}</span>
}
