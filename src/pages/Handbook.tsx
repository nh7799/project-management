import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DATES, SECS, WEIGHTS } from '../data/handbook'
import { daysUntil, fmt } from '../utils/dates'
import { Title, stagger } from '../components/ui'

export default function Handbook() {
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [sec, setSec] = useState(sp.get('sec') ?? 'all')
  const [open, setOpen] = useState<string | null>(null)
  const ql = q.toLowerCase()

  const secs = useMemo(() => SECS.map(s => ({
    ...s,
    items: s.items.filter(i => !ql || (i.t + (i.d || '')).toLowerCase().includes(ql)),
  })).filter(s => s.items.length && (sec === 'all' || sec === 'dates' ? true : sec === s.id)), [ql, sec])
  const dates = useMemo(() => DATES.filter(d => !ql || d.t.toLowerCase().includes(ql)), [ql])

  const updateSec = (s: string) => { setSec(s); setSp({ sec: s, q }) }
  const updateQ = (val: string) => { setQ(val); setSp(val ? { sec, q: val } : { sec }) }

  return (
    <div>
      <Title sub="Condensed from BSc Computer Science Project Handbook v0.9 (27 Jul 2026). Page numbers reference the PDF. Always cross-check official dates on Canvas.">
        📖 Handbook reference
      </Title>
      <input className="input mb-3" placeholder="Search handbook… (e.g. viva, Turnitin, logbook, ethics, Gantt)" value={q} onChange={e => updateQ(e.target.value)} aria-label="Search handbook" />
      <div className="tabs">
        <div className="scroll-x flex gap-2">
          {[['all', '📚', 'All'], ['dates', '📅', 'Dates'], ['assessment', '🎯', 'Grading'], ...SECS.map(s => [s.id, s.icon, s.title])].map(([id, ic, l]: any) => (
            <button key={id} className="pill whitespace-nowrap" aria-pressed={sec === id} onClick={() => updateSec(id)}>{ic} {l}</button>
          ))}
        </div>
      </div>

      {(sec === 'all' || sec === 'dates') && dates.length > 0 && (
        <section className="card my-4">
          <h2 className="htitle sm mb-3">📅 Key dates</h2>
          <ul className="divide-y" style={{ borderColor: 'var(--line)' }}>
            {dates.map((d, i) => {
              const n = daysUntil(d.d)
              return (
                <motion.li key={d.d + d.t} {...stagger(i)} className="py-2 flex gap-3 items-start">
                  <span className="w-28 shrink-0 font-semibold">{fmt(d.d)}</span>
                  <span className="flex-1">
                    {d.t}
                    <span className="ml-2 chip" style={{ background: d.k === 'official' ? 'var(--danger)' : undefined }}>
                      {d.k === 'official' ? '🔴 OFFICIAL' : 'ℹ️ INFO'}
                    </span>
                    <span className="ml-1 chip">p.{d.p}</span>
                  </span>
                  <span className="muted whitespace-nowrap small">
                    {n < 0 ? `${-n}d passed` : n === 0 ? 'TODAY' : `${n}d`}
                  </span>
                </motion.li>
              )
            })}
          </ul>
        </section>
      )}

      {(sec === 'all' || sec === 'assessment') && !ql && (
        <section className="card my-4">
          <h2 className="htitle sm mb-3">🎯 Where the marks are (6COM2018)</h2>
          {WEIGHTS.map(([n, w, who]) => (
            <div key={n as string} className="mb-3">
              <div className="flex justify-between small">
                <span>{n}</span>
                <b>{w}%</b>
              </div>
              <div className="bar"><motion.i initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ duration: .7 }} /></div>
              <div className="tiny muted mt-1">Marked by: {who}</div>
            </div>
          ))}
          <div className="warn mt-3">
            <b>⚠️ Pass rule (critical):</b> you need at least <b>40% overall</b>, AND at least <b>40% in the Project Report</b>, AND at least <b>40% in the Viva</b>. Missing any single one fails the module even if the total is above 40%.
          </div>
        </section>
      )}

      {sec !== 'dates' && secs.map(s => (
        <section key={s.id} className="my-6">
          <h2 className="htitle sm mb-3">{s.icon} {s.title}</h2>
          <div className="space-y-2">
            {s.items.map((i, k) => {
              const key = s.id + i.t
              return (
                <motion.div key={key} {...stagger(k)} className="card lift">
                  <button className="w-full text-left flex gap-3 items-center" aria-expanded={open === key} onClick={() => setOpen(open === key ? null : key)}>
                    <span className="flex-1 font-semibold">{i.t}</span>
                    {i.p && <span className="chip">p.{i.p}</span>}
                    <span aria-hidden>{open === key || ql ? '−' : '+'}</span>
                  </button>
                  {(open === key || ql) && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 muted">{i.d}</motion.p>
                  )}
                </motion.div>
              )
            })}
          </div>
        </section>
      ))}
      {!secs.length && sec !== 'dates' && (
        <div className="card muted">No handbook entries match “{q}”.</div>
      )}
    </div>
  )
}
