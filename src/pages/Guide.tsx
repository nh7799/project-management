import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRows } from '../hooks/useRows'
import { STEPS, type Step } from '../lib/guide'
import { daysUntil } from '../utils/dates'
import { Err } from '../components/ui'

export default function Guide() {
  const pr = useRows<any>('guide_progress')
  const ev = useRows<any>('events')
  const tk = useRows<any>('tasks')
  const dr = useRows<any>('daily_records')
  const dc = useRows<any>('decisions')
  const pf = useRows<any>('profiles')
  const [open, setOpen] = useState<string | null>(null)

  const auto: any = { events: ev.rows.length > 0, tasks: tk.rows.length >= 3, daily: dr.rows.length >= 1, decisions: dc.rows.length >= 1, profiles: pf.rows.length >= 1 }
  const row = (s: Step) => pr.rows.find(r => r.step_key === s.key)
  const done = (s: Step) => (s.auto ? auto[s.auto] : false) || !!row(s)
  const next = STEPS.find(s => !done(s))
  const n = STEPS.filter(done).length
  const mark = (s: Step) => { const r = row(s); return r ? pr.remove(r.id, false) : pr.add({ step_key: s.key }) }
  const when = (s: Step) => {
    if (!s.due) return null
    const d = daysUntil(s.due)
    return d < 0 ? `${-d} day(s) overdue — do this first` : d === 0 ? 'due today' : `due in ${d} day(s)`
  }

  return (
    <div>
      <div className="hero mb-5">
        <div className="small" style={{ opacity: .92 }}>Getting-started guide</div>
        <h1 className="htitle lg mt-1">You do not need to know everything yet.</h1>
        <p style={{ opacity: .9, marginTop: '.25rem' }}>One step at a time. The system tracks which you have done automatically where it can.</p>
      </div>
      <Err msg={pr.error || ev.error || tk.error || dr.error || dc.error || pf.error || ''} />
      <div className="card mb-5">
        <div className="bar mb-3" role="progressbar" aria-valuenow={n} aria-valuemax={STEPS.length}>
          <i style={{ width: `${(n / STEPS.length) * 100}%` }} />
        </div>
        <div className="row between">
          <div className="htitle sm">{n} of {STEPS.length} steps done</div>
          <Link className="btn sm" to="/home">← Back to dashboard</Link>
        </div>
      </div>
      {next ? (
        <section className="card pop mb-6" style={{ borderColor: 'var(--accent)', borderWidth: 2 }}>
          <div className="hsection">👉 Your next step</div>
          <h1 className="htitle my-1">{next.title}</h1>
          {when(next) && <div style={{ fontWeight: 700 }}>{when(next)}</div>}
          <p className="muted mt-2">{next.why}</p>
          <ol className="list-decimal ml-6 my-3 space-y-1">{next.todo.map(t => <li key={t}>{t}</li>)}</ol>
          <div className="flex flex-wrap gap-3">
            {next.to && <Link className="btn big" to={next.to}>{next.cta || 'Go'}</Link>}
            {!next.auto && <button className="btn big ghost" onClick={() => mark(next)}>I did this ✓</button>}
          </div>
        </section>
      ) : (
        <section className="card pop mb-6">
          <h1 className="htitle">All starter steps done 🎉</h1>
          <p className="muted">Keep your daily rhythm: Start Day → work → End Day. Review progress every Friday.</p>
          <div className="flex gap-2 mt-3">
            <Link className="btn sm" to="/today">☀️ Start today</Link>
            <Link className="btn sm ghost" to="/project">🧭 View phases</Link>
          </div>
        </section>
      )}
      <h2 className="htitle sm mb-3">All steps</h2>
      <ul className="space-y-2">
        {STEPS.map((s, i) => <li key={s.key} className="card">
          <button className="w-full text-left flex gap-3 items-center" onClick={() => setOpen(open === s.key ? null : s.key)} aria-expanded={open === s.key}>
            <span>{done(s) ? '✅' : s === next ? '👉' : '⚪'}</span>
            <span className={`flex-1 ${done(s) ? 'line-through text-slate-400' : ''}`}><b>{i + 1}.</b> {s.title}</span>
            <span className="small muted">{!done(s) && when(s)}</span>
            <span className="chev" aria-hidden>▸</span>
          </button>
          {open === s.key && <div className="mt-3 pop">
            <p className="muted">{s.why}</p>
            <ul className="list-disc ml-6 my-2">{s.todo.map(t => <li key={t}>{t}</li>)}</ul>
            <div className="flex gap-2">
              {s.to && <Link className="btn ghost" to={s.to}>{s.cta || 'Open'}</Link>}
              {!s.auto && <button className="btn ghost" onClick={() => mark(s)}>{done(s) ? 'Undo' : 'Mark done'}</button>}
            </div>
          </div>}
        </li>)}
      </ul>
    </div>
  )
}
