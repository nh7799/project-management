import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRows } from '../hooks/useRows'
import { todayISO, daysUntil, fmt, addDays } from '../utils/dates'
import { calcHealth, chooseNextAction, STATUS_LABEL, SEVERITY_COLOUR } from '../utils/health'
import { Err, NextActionCard, SectionHeader, StatusLine, Title, Bar, Stat, Tag } from '../components/ui'
import type { Daily, EventRow, Blocker, Task, Phase, Evidence, ReportSection, ResearchSource, Risk, Dependency } from '../types'

type K = keyof Daily
const START: [K, string, string][] = [
  ['mission', 'What is today\'s mission in one sentence?', 'Example: "Finish draft of the problem statement."'],
  ['objective', 'What would make today a success?', 'Example: "A 100–200 word problem statement saved with stakeholders and CS context."'],
]
const END: [K, string, string][] = [
  ['biggest_win', 'What was your biggest win today?', 'Anything counts, however small. Write one specific thing.'],
  ['biggest_challenge', 'What was hardest today?', 'Naming it makes it smaller. Record blockers here too.'],
  ['learned', 'What did you learn today?', 'This becomes report material later.'],
  ['first_task_tomorrow', 'What is the very first task tomorrow?', 'So tomorrow starts with zero decision fatigue.'],
]

export default function Today() {
  const d = useRows<Daily>('daily_records', 'day')
  const ev = useRows<EventRow>('events', 'date', true)
  const bl = useRows<Blocker>('blockers')
  const tk = useRows<Task>('tasks')
  const ph = useRows<Phase>('phases', 'order_index', true)
  const evi = useRows<Evidence>('evidence')
  const rs = useRows<ResearchSource>('research_sources')
  const rep = useRows<ReportSection>('report_sections', 'order_index', true)
  const rk = useRows<Risk>('risks')
  const deps = useRows<Dependency>('dependencies')

  const day = todayISO()
  const rec = d.rows.find(r => r.day === day)
  const [mode, setMode] = useState<'start' | 'end'>('start')
  const [i, setI] = useState(0)
  const [f, setF] = useState<Record<string, string>>({})
  const [fin, setFin] = useState(false)

  useEffect(() => {
    setF(Object.fromEntries([...START, ...END].map(([k]) => [k, (rec?.[k] as string) ?? ''])))
  }, [rec?.id, d.loading])

  const qs = mode === 'start' ? START : END
  const [k, q, hint] = qs[Math.min(i, qs.length - 1)] || ['mission' as K, '', '']

  const next = ev.rows.filter(e => !e.done && daysUntil(e.date) >= 0)[0]
  const openB = bl.rows.filter(b => b.status === 'open')
  const core = tk.rows.filter(t => (t.tier === 'core' || t.priority === 'critical') && t.status !== 'done').length
  const stretch = tk.rows.filter(t => t.tier === 'stretch' && t.status !== 'done').length
  const overdueE = ev.rows.filter(e => !e.done && daysUntil(e.date) < 0).length
  const overdueT = tk.rows.filter(t => t.status !== 'done' && t.due && daysUntil(t.due) < 0).length
  const health = calcHealth(tk.rows, evi.rows.length, rep.rows, rs.rows, bl.rows, rk.rows, ph.rows)
  const why = [
    overdueE && `${overdueE} overdue deadline(s)`,
    overdueT && `${overdueT} overdue task(s)`,
    openB.length && `${openB.length} open blocker(s)`,
    stretch > 0 && core > 0 && `${stretch} stretch task(s) open while ${core} core remain`,
  ].filter(Boolean).join('; ') || 'Nothing overdue, no critical blockers, scope under control.'

  const save = async (completed: boolean) => {
    const v = { ...f, completed: completed || (rec?.completed ?? false) }
    if (rec) await d.update(rec.id, v); else await d.add({ ...v, day })
  }
  const go = async () => {
    const last = i === qs.length - 1
    await save(last && mode === 'end')
    if (!last) setI(i + 1)
    else if (mode === 'end') setFin(true)
    else setI(0)
  }

  const nextAction = chooseNextAction(tk.rows, deps.rows, bl.rows, ph.rows)
  const currentPhase = ph.rows.find(p => p.status === 'in_progress') || ph.rows.find(p => p.status === 'pending')
  const sevenDays = Array.from({ length: 7 }, (_, i) => addDays(day, i - 3))

  return (
    <div>
      <Title sub={`${fmt(day)} · ${rec?.completed ? 'Day complete ✓' : rec ? 'In progress' : 'Not started yet'}`}>
        ☀️ Start / End My Day
      </Title>
      <Err msg={d.error || ev.error || bl.error || tk.error || ph.error || evi.error || rs.error || rep.error || rk.error || deps.error || ''} />

      <div className="grid-4 mb-5">
        <Stat label="Deadlines" value={overdueE > 0 ? `${overdueE} overdue` : next ? `${daysUntil(next.date)}d` : 'None'} sub={next ? next.title : 'No dates'} icon="📅" tone={overdueE ? 'warn' : undefined} />
        <Stat label="Core tasks left" value={core} sub={overdueT ? `${overdueT} overdue` : 'Open core tasks'} icon="✅" tone={overdueT ? 'warn' : undefined} />
        <Stat label="Open blockers" value={openB.length} sub={openB.some(b => b.severity === 'high') ? 'HIGH severity present' : 'Under control'} icon="🚧" tone={openB.some(b => b.severity === 'high') ? 'bad' : openB.length ? 'warn' : undefined} />
        <Stat label="Evidence captured" value={String(evi.rows.length)} sub={`${tk.rows.filter(t => t.status === 'done' && (t.evidence_status || 'missing') === 'missing' && t.tier !== 'stretch').length} gaps`} icon="🧾" />
      </div>

      <div className="grid-2 mb-5">
        <StatusLine status={health.overall as any} reason={why} />
        <div className="card">
          <SectionHeader title="Project health dimensions" />
          <div className="stack tight">
            <Bar pct={health.execution.score} tone={health.execution.tone} label="Execution (tasks)" />
            <Bar pct={health.evidence.score} tone={health.evidence.tone} label="Evidence" />
            <Bar pct={health.writing.score} tone={health.writing.tone} label="Writing" />
            <Bar pct={health.research.score} tone={health.research.tone} label="Research" />
            <Bar pct={health.risk.score} tone={health.risk.tone} label="Risk handling" />
          </div>
        </div>
      </div>

      <NextActionCard
        action={nextAction as any}
        onStart={() => { if (nextAction.task) tk.update(nextAction.task.id, { status: 'active' }) }}
        onNotReady={() => window.location.hash = '#/tasks'}
        onBlocked={() => window.location.hash = '#/blockers'}
      />

      {currentPhase && (
        <div className="card mb-5">
          <SectionHeader title="Current phase" sub={currentPhase.name} action={<Link className="btn sm" to="/project">All phases →</Link>} />
          <div className="row between">
            <div className="row" style={{ gap: '.75rem' }}>
              <span className="status-dot" style={{ background: currentPhase.status === 'in_progress' ? 'var(--accent)' : currentPhase.status === 'complete' ? '#35a96a' : 'var(--muted)' }} />
              <div>
                <div style={{ fontWeight: 700 }}>{currentPhase.name}</div>
                <div className="small muted">{currentPhase.description || 'Phase ' + (currentPhase.order_index + 1) + ' of ' + ph.rows.length}</div>
              </div>
            </div>
            <Tag tone={currentPhase.status === 'in_progress' ? 'acc' : currentPhase.status === 'complete' ? 'ok' : undefined}>{currentPhase.status.replace(/_/g, ' ')}</Tag>
          </div>
          {currentPhase.completion_criteria && (
            <>
              <div className="divider" />
              <div className="hsection">Done when</div>
              <p className="small mb-0">{currentPhase.completion_criteria}</p>
            </>
          )}
        </div>
      )}

      <div className="card mb-5">
        <SectionHeader title="Next 7 days" icon="📆" />
        <div className="grid grid-cols-7 gap-2 mb-3">
          {sevenDays.map(d0 => {
            const evs = ev.rows.filter(e => e.date === d0)
            const today = d0 === day
            const recd = d.rows.some(r => r.day === d0)
            return (
              <div key={d0} className="touch-card text-center" style={{ padding: '.5rem .25rem', minHeight: 88 }}>
                <div className="tiny muted">{new Date(d0 + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })}</div>
                <div className="htitle sm" style={{ fontWeight: today ? 800 : 600, color: today ? 'var(--accent)' : undefined }}>{d0.slice(8)}</div>
                <div className="tiny mt-1" style={{ minHeight: 24 }}>
                  {evs.length > 0 && <Tag tone={daysUntil(d0) < 0 ? 'bad' : daysUntil(d0) < 3 ? 'warn' : 'info'}>{evs.length}</Tag>}
                </div>
                {recd && <span className="tiny muted">✓</span>}
              </div>
            )
          })}
        </div>
        {ev.rows.filter(e => daysUntil(e.date) >= -1 && daysUntil(e.date) <= 7).length > 0 && (
          <ul className="stack tight">
            {ev.rows.filter(e => daysUntil(e.date) >= -1 && daysUntil(e.date) <= 7).sort((a, b) => daysUntil(a.date) - daysUntil(b.date)).slice(0, 5).map(e => (
              <li key={e.id} className="row between" style={{ gap: '.5rem' }}>
                <div className="row" style={{ gap: '.5rem', flex: 1 }}>
                  <input className="checkbox" type="checkbox" checked={e.done} onChange={() => ev.update(e.id, { done: !e.done })} />
                  <div className="col" style={{ gap: 0, flex: 1 }}>
                    <span className={e.done ? 'line-through' : ''} style={{ fontWeight: 600 }}>{e.title}</span>
                    <span className="tiny muted">{fmt(e.date)} · {e.kind}</span>
                  </div>
                </div>
                <Tag tone={daysUntil(e.date) < 0 ? 'bad' : daysUntil(e.date) < 3 ? 'warn' : e.kind === 'official' ? 'acc' : undefined}>{daysUntil(e.date) < 0 ? `${-daysUntil(e.date)}d ago` : daysUntil(e.date) === 0 ? 'today' : `${daysUntil(e.date)}d`}</Tag>
              </li>
            ))}
          </ul>
        )}
      </div>

      {openB.length > 0 && (
        <div className="card mb-5">
          <SectionHeader title="🚧 Open blockers" action={<Link className="btn sm" to="/blockers">All blockers →</Link>} />
          <ul className="stack tight">
            {openB.slice(0, 4).map(b => (
              <li key={b.id} className="row between" style={{ gap: '.5rem' }}>
                <div className="col" style={{ gap: 0, flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>{b.title}</span>
                  <span className="tiny muted">{b.next_action || b.suggested_action || 'Open blockers page for recovery actions.'}</span>
                </div>
                <Tag tone={b.severity === 'high' ? 'bad' : b.severity === 'medium' ? 'warn' : 'info'}>{b.severity}</Tag>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="divider" />

      <div className="flex flex-wrap gap-2 mb-4">
        {(['start', 'end'] as const).map(m => (
          <button key={m} className="pill" aria-pressed={mode === m} onClick={() => { setMode(m); setI(0); setFin(false) }}>{m === 'start' ? '☀️ Start my day' : '🌙 End my day'}</button>
        ))}
        <span className="muted small ml-3 flex items-center" style={{ alignSelf: 'center' }}>
          {rec?.completed ? '✓ Day marked complete.' : rec ? 'Day in progress.' : 'No record yet today.'}
        </span>
      </div>

      {fin ? (
        <div className="card pop">
          <h2 className="htitle sm mb-2">✓ Day complete</h2>
          <p className="muted">Well done. Come back tomorrow. First task tomorrow: <b>{f.first_task_tomorrow || 'Not set — set one now'}</b>.</p>
          <div className="flex gap-2 mt-3">
            <Link className="btn sm" to="/journal">📓 Create journal entry</Link>
            <Link className="btn ghost sm" to="/home">← Back to dashboard</Link>
          </div>
        </div>
      ) : (
        <div className="card pop" key={mode + '-' + i}>
          <div className="row between mb-2">
            <div className="col" style={{ gap: 0 }}>
              <div className="hsection">{mode === 'start' ? 'Start of day' : 'End of day'} · Question {i + 1} of {qs.length}</div>
              <div className="htitle sm">{q}</div>
            </div>
            <Tag tone="info">Step {i + 1}/{qs.length}</Tag>
          </div>
          <p className="muted small mb-3">{hint}</p>
          <textarea autoFocus rows={4} className="textarea" value={f[k] ?? ''}
            onChange={e => setF({ ...f, [k]: e.target.value })}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') go() }}
            placeholder="Type here — everything is saved as you move through questions." />
          <div className="flex flex-wrap gap-3 mt-4">
            <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>← Back</button>
            <button className="btn big" onClick={go}>
              {i === qs.length - 1
                ? (mode === 'end' ? '✓ Finish day' : '💾 Save start-of-day')
                : 'Next →'}
            </button>
          </div>
          <p className="tiny muted mt-2">Tip: Ctrl/⌘ + Enter continues. Every answer is saved to the database.</p>
        </div>
      )}
    </div>
  )
}
