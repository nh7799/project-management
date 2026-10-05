import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useRows } from '../hooks/useRows'
import { DATES } from '../data/handbook'
import { CHECK } from '../data/checklist'
import { STEPS, BLOCKER_SUGGESTIONS, LOST_PATHS, PHASE_DESCRIPTIONS } from '../lib/guide'
import { addDays, daysUntil, fmt, todayISO } from '../utils/dates'
import { calcHealth, chooseNextAction, buildDailyPlan, STATUS_LABEL } from '../utils/health'
import { Bar, Divider, Donut, Empty, Err, NextActionCard, SectionHeader, Stat, StatusLine, Tag, Title, stagger, Modal } from '../components/ui'
import type { Task, Evidence, ReportSection, ResearchSource, Risk, Phase, Milestone, Blocker, Daily, DailyPlan, Dependency, EventRow, Decision } from '../types'

export default function Home() {
  const nav = useNavigate()
  const dr = useRows<Daily>('daily_records', 'day', false)
  const pr = useRows<any>('guide_progress')
  const ev = useRows<EventRow>('events', 'date', true)
  const tk = useRows<Task>('tasks')
  const deps = useRows<Dependency>('dependencies')
  const bl = useRows<Blocker>('blockers')
  const ph = useRows<Phase>('phases', 'order_index', true)
  const ms = useRows<Milestone>('milestones', 'due_date', true)
  const evi = useRows<Evidence>('evidence')
  const rs = useRows<ResearchSource>('research_sources')
  const rep = useRows<ReportSection>('report_sections', 'order_index', true)
  const rk = useRows<Risk>('risks')
  const plans = useRows<DailyPlan>('daily_plans', 'plan_date', false)
  const dec = useRows<Decision>('decisions')
  const prof = useRows<any>('profiles')

  const [lost, setLost] = useState(false)
  const [lostPath, setLostPath] = useState<string>('')
  const [focus, setFocus] = useState(false)
  const [checkin, setCheckin] = useState(false)

  const today = todayISO()
  const profile = prof.rows[0]
  const plan = plans.rows.find(p => p.plan_date === today)

  const nextDeadline = useMemo(() => {
    const official = [...(ev.rows.filter(e => e.kind === 'official' && !e.done) || []), ...DATES.map(d => ({ date: d.d, title: d.t, kind: d.k as any, done: false, id: d.d }))]
      .sort((a, b) => daysUntil(a.date) - daysUntil(b.date))
      .find(d => daysUntil(d.date) >= -2)
    return official
  }, [ev.rows])

  const streak = useMemo(() => {
    const days = new Set(dr.rows.map(r => r.day))
    let s = 0; for (let i = days.has(today) ? 0 : 1; days.has(addDays(today, -i)); i++) s++
    return s
  }, [dr.rows, today])

  const total = CHECK.reduce((a, g) => a + g.items.length, 0)
  const doneChk = pr.rows.filter(r => r.step_key.startsWith('chk:')).length

  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))

  const health = useMemo(() => calcHealth(tk.rows, evi.rows.length, rep.rows, rs.rows, bl.rows, rk.rows, ph.rows), [tk.rows, evi.rows, rep.rows, rs.rows, bl.rows, rk.rows, ph.rows])
  const currentPhase = useMemo(() => ph.rows.find(p => p.status === 'in_progress' || p.status === 'active') || ph.rows.find(p => p.status === 'pending') || ph.rows[0], [ph.rows])
  const phaseIndex = currentPhase?.order_index ?? 0
  const phaseProgress = ph.rows.length ? Math.round(((ph.rows.filter(p => p.status === 'complete' || p.status === 'done').length + ((currentPhase?.status === 'in_progress' || currentPhase?.status === 'active') ? 0.5 : 0)) / ph.rows.length) * 100) : 0

  const nextAction = useMemo(() => chooseNextAction(tk.rows, deps.rows, bl.rows, ph.rows), [tk.rows, deps.rows, bl.rows, ph.rows])

  const upcomingMs = useMemo(() => ms.rows.filter(m => m.status !== 'complete' && m.status !== 'done' && (!m.due_date || daysUntil(m.due_date) > -7)).sort((a, b) => (daysUntil(a.due_date || '2099-01-01')) - (daysUntil(b.due_date || '2099-01-01'))).slice(0, 4), [ms.rows])
  const overdueTasks = useMemo(() => tk.rows.filter(t => t.status !== 'done' && t.due && daysUntil(t.due) < 0).length, [tk.rows])
  const missingEvidence = useMemo(() => tk.rows.filter(t => t.status === 'done' && (t.evidence_status || 'missing') === 'missing' && t.tier !== 'stretch').length, [tk.rows])
  const openBlockers = useMemo(() => bl.rows.filter(b => b.status === 'open'), [bl.rows])
  const openHighRisks = useMemo(() => rk.rows.filter(r => (r.status === 'open' || r.status === 'identified' || r.status === 'mitigating') && Number(r.impact) >= 4 && Number(r.probability) >= 4), [rk.rows])

  const stepCount = STEPS.length
  const stepDone = pr.rows.filter(r => !r.step_key.startsWith('chk:') && !r.step_key.startsWith('proj:')).length
  const autoDone = {
    events: ev.rows.length > 0, tasks: tk.rows.length >= 3, daily: dr.rows.length >= 1, decisions: dec.rows.length >= 1, profiles: prof.rows.length >= 1
  }

  const totalDone: number = STEPS.reduce((acc: number, s) => {
    const manual = pr.rows.some(r => r.step_key === s.key)
    const auto = s.auto ? autoDone[s.auto] : false
    return acc + ((manual || auto) ? 1 : 0)
  }, 0)

  const recentEvidence = evi.rows.slice(0, 4)

  const handleStartFocus = async () => {
    if (!nextAction.task) { nav('/tasks'); return }
    await tk.update(nextAction.task.id, { status: 'active' })
    setFocus(true)
  }

  const generatedPlan = useMemo(() => buildDailyPlan(60, tk.rows, deps.rows, bl.rows, ph.rows), [tk.rows, deps.rows, bl.rows, ph.rows])
  const dailyBuilt = plan ?? generatedPlan

  const healthWhy = useMemo(() => {
    const parts: string[] = []
    if (overdueTasks) parts.push(`${overdueTasks} task(s) overdue`)
    if (missingEvidence) parts.push(`${missingEvidence} completed task(s) lack evidence`)
    if (openBlockers.length) parts.push(`${openBlockers.length} open blocker(s)`)
    if (openHighRisks.length) parts.push(`${openHighRisks.length} high risk(s)`)
    return parts.length ? parts.join('; ') + '.' : 'Nothing overdue, blockers under control, evidence being captured.'
  }, [overdueTasks, missingEvidence, openBlockers, openHighRisks])

  return (
    <div>
      <Title
        sub={
          profile?.project_title
            ? `${profile.project_title} · Phase ${(phaseIndex ?? 0) + 1}/${ph.rows.length || 17}`
            : 'Your final-year project, broken into calm, clear steps.'
        }
        right={
          <div className="flex flex-wrap gap-2">
            <Link className="btn sm" to="/what-do-i-do-now" onClick={(e) => { e.preventDefault(); setLost(true); setLostPath('next') }}>🎯 What do I do now?</Link>
            <button className="btn ghost sm" onClick={() => setLost(true)}>🧘 I'm not sure</button>
            <button className="btn ghost sm" onClick={() => setCheckin(true)}>📋 Daily check-in</button>
          </div>
        }
      >
        {profile?.project_title || 'Final-Year Project OS'}
      </Title>

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="hero mb-5" style={{ position: 'relative' }}>
        <div className="scanlines" />
        <div className="small" style={{ opacity: .92 }}>{fmt(today)}</div>
        <h1 className="htitle lg mt-1" style={{ fontWeight: 800 }}>
          {nextDeadline
            ? `${daysUntil(nextDeadline.date) >= 0 ? daysUntil(nextDeadline.date) + ' days to' : `${-daysUntil(nextDeadline.date)} days since`} ${nextDeadline.title}`
            : 'No upcoming official deadlines loaded'}
        </h1>
        {nextDeadline && <p style={{ opacity: .9 }}>{fmt(nextDeadline.date)} · Official</p>}
        <div className="mt-3 flex flex-wrap gap-2" style={{ opacity: .95 }}>
          {profile?.submission_date && <Tag tone="info">Report due in {Math.max(0, daysUntil(profile.submission_date))} days</Tag>}
          {!profile?.submission_date && <Tag tone="info">Report due in {Math.max(0, daysUntil('2027-04-09'))} days (Fri 9 Apr 2027, 15:00)</Tag>}
          {currentPhase && <Tag tone="acc">Current phase: {currentPhase.name}</Tag>}
          {openBlockers.length > 0 && <Tag tone="bad">🚧 {openBlockers.length} blocker{openBlockers.length > 1 ? 's' : ''}</Tag>}
          {overdueTasks > 0 && <Tag tone="warn">⏰ {overdueTasks} overdue</Tag>}
        </div>
      </motion.section>

      <div className="grid-4 mb-5">
        <Stat label="Day streak" value={`${streak} 🔥`} sub={`${dr.rows.length} daily record(s)`} icon="📆" />
        <Stat label="Checklist" value={`${Math.round((doneChk / Math.max(1, total)) * 100)}%`} sub={`${doneChk}/${total} items`} icon="☑️" />
        <Stat label="Getting started" value={`${totalDone}/${stepCount}`} sub="Starter steps" icon="🚀" />
        <Stat label="Evidence captured" value={String(evi.rows.length)} sub={`${missingEvidence} gap(s)`} icon="🧾" tone={missingEvidence ? 'warn' : 'ok'} />
      </div>

      <div className="grid-2 mb-5">
        <StatusLine status={health.overall as any} reason={healthWhy} />
        <div className="card">
          <div className="row between mb-2">
            <div>
              <div className="hsection">Project health dimensions</div>
              <div className="htitle sm">Six views of progress</div>
            </div>
            <Link to="/report" className="btn sm ghost">Open →</Link>
          </div>
          <div className="stack tight">
            <Bar pct={health.execution?.score ?? health.overallScore} tone={health.execution?.tone ?? 'acc'} label="Execution (tasks done)" />
            <Bar pct={health.evidence?.score ?? 0} tone={health.evidence?.tone ?? 'acc'} label="Evidence (captured)" />
            <Bar pct={health.writing?.score ?? 0} tone={health.writing?.tone ?? 'acc'} label="Writing (report sections)" />
            <Bar pct={health.research?.score ?? 0} tone={health.research?.tone ?? 'acc'} label="Research (sources read)" />
            <Bar pct={health.schedule?.score ?? 0} tone={health.schedule?.tone ?? 'acc'} label="Timeline" />
            <Bar pct={health.risk?.score ?? 0} tone={health.risk?.tone ?? 'acc'} label="Risk management" />
          </div>
          <Divider />
          <div className="row between">
            <div className="row" style={{ gap: '.75rem' }}>
              <Donut pct={phaseProgress} size={64} stroke={7} />
              <div>
                <div className="hsection">Phase progress</div>
                <div className="sm muted">{ph.rows.filter(p => p.status === 'complete' || p.status === 'done').length} complete · {((currentPhase?.status === 'in_progress' || currentPhase?.status === 'active') ? 1 : 0)} in progress · {ph.rows.length} total</div>
              </div>
            </div>
            <Link to="/project" className="btn sm">Phases →</Link>
          </div>
        </div>
      </div>

      <NextActionCard
        action={nextAction as any}
        onStart={handleStartFocus}
        onNotReady={() => nav('/tasks')}
        onBlocked={() => nav('/blockers')}
        onOther={() => setLost(true)}
      />

      <div className="divider mb-5" />

      <div className="grid-2 mb-5">
        <div className="card">
          <SectionHeader title="Today's plan" sub={plan ? `Checked in · ${plan.capacity_slot}` : 'Generated from priorities'} action={!plan && <button className="btn sm" onClick={() => setCheckin(true)}>Check in</button>} />
          <div className="stack tight">
            <div>
              <div className="row between"><b>🎯 MUST DO</b><Tag tone="acc">Essential</Tag></div>
              <p className="muted small mt-1 mb-0">{dailyBuilt.must_do}</p>
            </div>
            <div>
              <div className="row between"><b>✅ SHOULD DO</b><Tag>Safe</Tag></div>
              <p className="muted small mt-1 mb-0">{dailyBuilt.should_do}</p>
            </div>
            <div>
              <div className="row between"><b>⭐ OPTIONAL</b><Tag>Nice</Tag></div>
              <p className="muted small mt-1 mb-0">{dailyBuilt.optional_do}</p>
            </div>
            <div className="good">
              <div className="row between"><b>⏱ If you only have 30 minutes</b><Tag tone="ok">Mini</Tag></div>
              <p className="mt-1 mb-0"><b>{dailyBuilt.thirty_minutes}</b></p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Link className="btn sm" to="/today">☀️ Start my day</Link>
            <Link className="btn ghost sm" to="/tasks">📋 Open tasks</Link>
          </div>
        </div>

        <div className="card">
          <SectionHeader title="Last 7 days" sub={`${dr.rows.length} record(s)`} action={<Link className="btn sm" to="/today">Today →</Link>} />
          <div className="grid grid-cols-7 gap-2 mb-3">
            {week.map(d => {
              const on = dr.rows.some(r => r.day === d)
              return (
                <motion.div key={d} initial={{ scale: .85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="text-center rounded-xl py-2 touch-card"
                  style={{ background: on ? 'var(--accent)' : 'var(--surface2)', color: on ? 'var(--on-accent)' : 'var(--muted)', padding: '.5rem .25rem', minHeight: 60 }}>
                  <div className="tiny">{new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })}</div>
                  <div className="htitle sm">{d.slice(8)}</div>
                </motion.div>
              )
            })}
          </div>
          <Bar pct={doneChk / Math.max(1, total) * 100} label="Master checklist progress" />

          {openBlockers.length > 0 && (
            <>
              <div className="divider" />
              <div className="hsection mb-2">🚧 Open blockers</div>
              <ul className="stack tight" style={{ listStyle: 'none', padding: 0 }}>
                {openBlockers.slice(0, 3).map(b => (
                  <li key={b.id} className="row between" style={{ gap: '.5rem' }}>
                    <div className="col" style={{ gap: 0, flex: 1 }}>
                      <span className="small" style={{ fontWeight: 600 }}>{b.title}</span>
                      <span className="tiny muted">{b.blocker_type ? b.blocker_type.replace(/_/g, ' ') : 'blocker'} · next: {b.next_action || b.suggested_action || BLOCKER_SUGGESTIONS[b.blocker_type || 'other'].slice(0, 80) + '…'}</span>
                    </div>
                    <Tag tone={b.severity === 'high' ? 'bad' : b.severity === 'medium' ? 'warn' : 'info'}>{b.severity}</Tag>
                  </li>
                ))}
              </ul>
              <Link className="btn sm ghost mt-2" to="/blockers">All blockers →</Link>
            </>
          )}
        </div>
      </div>

      <div className="grid-2 mb-5">
        <div className="card">
          <SectionHeader title="Upcoming milestones" sub={`${upcomingMs.length} upcoming`} action={<Link className="btn sm" to="/project">All →</Link>} />
          {upcomingMs.length === 0 ? (
            <Empty title="No milestones yet" hint="Set milestones in Project > Milestones to break the year into achievable targets." />
          ) : (
            <ul className="stack tight">
              {upcomingMs.map((m, i) => {
                const due = m.due_date ? daysUntil(m.due_date) : null
                return (
                  <motion.li key={m.id} {...stagger(i)} className="row between" style={{ gap: '.5rem' }}>
                    <div className="col" style={{ gap: 0, flex: 1 }}>
                      <span style={{ fontWeight: 600 }}>{m.title}</span>
                      {m.outcome && <span className="tiny muted">{m.outcome}</span>}
                    </div>
                    <div className="col" style={{ gap: 0, alignItems: 'end' }}>
                      {due !== null && <Tag tone={due < 0 ? 'bad' : due < 7 ? 'warn' : 'info'}>{due < 0 ? `${-due}d overdue` : due === 0 ? 'today' : `${due}d`}</Tag>}
                      <span className="tiny muted">{m.due_date ? fmt(m.due_date) : 'No date'}</span>
                    </div>
                  </motion.li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="card">
          <SectionHeader title="Recent evidence" sub={`${evi.rows.length} total`} action={<Link className="btn sm" to="/evidence">Library →</Link>} />
          {recentEvidence.length === 0 ? (
            <Empty title="No evidence yet" hint="Evidence protects you from the classic problem of doing work but struggling to prove it later academically." action={<Link className="btn sm" to="/evidence">➕ Add evidence</Link>} />
          ) : (
            <ul className="stack tight">
              {recentEvidence.map((e, i) => (
                <motion.li key={e.id} {...stagger(i)} className="row between" style={{ gap: '.5rem' }}>
                  <div className="col" style={{ gap: 0, flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>{e.title}</span>
                    <span className="tiny muted">{e.type.replace(/_/g, ' ')} · {e.report_section || 'General'}</span>
                  </div>
                  <Tag tone={e.status === 'verified' ? 'ok' : e.status === 'captured' ? 'acc' : 'warn'}>{e.status}</Tag>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card mb-5">
        <SectionHeader title="Getting-started steps" sub="You do not need to know everything yet. Do one step at a time." action={<Link className="btn sm" to="/guide">Full guide →</Link>} />
        <div className="bar mb-3" role="progressbar" aria-valuenow={totalDone} aria-valuemax={stepCount}>
          <i style={{ width: `${(totalDone / Math.max(1, stepCount)) * 100}%` }} />
        </div>
        <div className="small muted mb-4">{totalDone} of {stepCount} steps done</div>
        <ul className="stack tight">
          {STEPS.slice(0, 8).map((s, i) => {
            const manual = pr.rows.some(r => r.step_key === s.key)
            const auto = s.auto ? autoDone[s.auto] : false
            const on = manual || auto
            const days = s.due ? daysUntil(s.due) : null
            return (
              <motion.li key={s.key} {...stagger(i)} className="row between" style={{ gap: '.75rem' }}>
                <div className="row" style={{ gap: '.6rem', flex: 1 }}>
                  <span style={{ width: 22, textAlign: 'center', flexShrink: 0 }}>{on ? '✅' : i === totalDone ? '👉' : '⚪'}</span>
                  <div className="col" style={{ gap: 0, flex: 1 }}>
                    <span className={on ? 'line-through' : ''} style={{ fontWeight: 600 }}>{i + 1}. {s.title}</span>
                    <span className="tiny muted">{s.why.slice(0, 110)}{s.why.length > 110 ? '…' : ''}</span>
                  </div>
                </div>
                <div className="col" style={{ gap: 0, alignItems: 'end' }}>
                  {days !== null && <Tag tone={days < 0 ? 'bad' : days < 3 ? 'warn' : undefined}>{days < 0 ? `${-days}d overdue` : `${days}d`}</Tag>}
                  {s.to && <Link className="btn sm ghost" to={s.to} style={{ padding: '.25rem .6rem', minHeight: 32 }}>Open →</Link>}
                </div>
              </motion.li>
            )
          })}
        </ul>
      </div>

      {lost && (
        <Modal open title="I'm not sure what to do" onClose={() => { setLost(false); setLostPath('') }}>
          {!lostPath ? (
            <div>
              <p className="muted">You do not need to solve the whole project right now. We only need to identify the next safe step.</p>
              <div className="divider" />
              <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
                {LOST_PATHS.map(p => (
                  <li key={p.id}>
                    <button className="card lift w-full text-left" onClick={() => {
                      if (p.go === 'handbook') { nav('/handbook'); setLost(false) }
                      else if (p.go === 'next') { setLost(false) }
                      else if (p.go === 'block') { nav('/blockers'); setLost(false) }
                      else { setLostPath(p.go) }
                    }}>
                      <div style={{ fontWeight: 700 }}>{p.label}</div>
                      <p className="small muted mt-1 mb-0">{p.desc}</p>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 mt-4">
                <button className="btn ghost" onClick={() => setLost(false)}>Close</button>
              </div>
            </div>
          ) : lostPath === 'reduce' ? (
            <div>
              <h3 className="htitle sm mb-2">Scope reduction (calm, honest)</h3>
              <p className="muted mb-3">We will temporarily hide non-essential tasks. Return to them once core is done.</p>
              <ol className="ml-6 small">
                <li>Drop all <b>stretch</b> tasks (park as "Future Work").</li>
                <li>Drop <b>optional</b> tasks unless explicitly required by supervisor.</li>
                <li>Reorder <b>important</b> — keep only top 2.</li>
                <li>Protect every <b>core</b> task with deadline + evidence.</li>
              </ol>
              <div className="good mt-3">Result: you now see only what truly matters for a pass. Record this as a decision.</div>
              <div className="flex gap-2 mt-4"><button className="btn" onClick={() => { nav('/tasks'); setLost(false) }}>Open tasks and reduce</button><button className="btn ghost" onClick={() => setLostPath('')}>Back</button></div>
            </div>
          ) : lostPath === 'recover' ? (
            <div>
              <h3 className="htitle sm mb-2">Recovery plan (factual, not scary)</h3>
              <div className="card-soft mb-3">
                <div>✅ You already completed: <b>{tk.rows.filter(t => t.status === 'done').length} task(s)</b>, <b>{evi.rows.length} evidence item(s)</b>, <b>{dec.rows.length} decision(s)</b>.</div>
                <div>The project can be recovered one concrete action at a time.</div>
              </div>
              <ol className="ml-6 small">
                <li>Open Tasks and mark any task you actually completed.</li>
                <li>Open the Timeline and identify the <b>next two</b> hard deadlines.</li>
                <li>For each deadline, list the <b>minimum deliverable</b>.</li>
                <li>Turn those deliverables into 3–5 <b>core</b> tasks with 30-minute estimates.</li>
                <li>Start the highest-priority one today.</li>
              </ol>
              <div className="flex gap-2 mt-4"><button className="btn" onClick={() => { setLost(false); nav('/tasks') }}>Go to tasks</button><button className="btn ghost" onClick={() => setLostPath('')}>Back</button></div>
            </div>
          ) : lostPath === 'break' ? (
            <div>
              <h3 className="htitle sm mb-2">Break this task into tiny steps</h3>
              {nextAction.task ? (
                <>
                  <div className="card-soft mb-3" style={{ padding: '.85rem 1rem' }}>
                    <b>{nextAction.task.title}</b>
                    {nextAction.task.description && <p className="small muted mt-1 mb-0">{nextAction.task.description}</p>}
                  </div>
                  <ol className="ml-6 small stack tight">
                    <li>Write the task in your own words in 2 sentences.</li>
                    <li>List 5–10 concrete subtasks, each with a single tiny "done".</li>
                    <li>Identify the <i>first subtask you could finish in 5 minutes</i>.</li>
                    <li>Do that one subtask now.</li>
                    <li>At the end, mark the task as "active" and record evidence.</li>
                  </ol>
                  <div className="flex gap-2 mt-4"><button className="btn" onClick={() => { nav('/tasks'); setLost(false) }}>Open tasks → add subtasks</button><button className="btn ghost" onClick={() => setLostPath('')}>Back</button></div>
                </>
              ) : (<><p className="muted">Pick a task first — the system will guide splitting it.</p><button className="btn mt-2" onClick={() => { nav('/tasks'); setLost(false) }}>Open tasks</button></>)}
            </div>
          ) : lostPath === 'dod' ? (
            <div>
              <h3 className="htitle sm mb-2">Definition of done</h3>
              <p className="muted mb-3">For your current phase / milestone / task — concrete, specific completion conditions.</p>
              {currentPhase && PHASE_DESCRIPTIONS[currentPhase.name] && (
                <div className="card-soft mb-3">
                  <div style={{ fontWeight: 700 }}>Phase: {currentPhase.name}</div>
                  <div className="hsection mt-2">Done when:</div>
                  <p className="small mb-0">{PHASE_DESCRIPTIONS[currentPhase.name].done}</p>
                </div>
              )}
              {nextAction.task && (
                <div className="card-soft">
                  <div style={{ fontWeight: 700 }}>Task: {nextAction.task.title}</div>
                  <div className="hsection mt-2">Done when:</div>
                  <p className="small mb-0">{nextAction.task.definition_of_done || 'No definition yet. Open this task and add one — it takes 1 minute and removes 90% of the anxiety.'}</p>
                </div>
              )}
              <div className="flex gap-2 mt-4"><button className="btn" onClick={() => { nav('/project'); setLost(false) }}>Open phases</button><button className="btn ghost" onClick={() => setLostPath('')}>Back</button></div>
            </div>
          ) : (
            <NextActionCard action={nextAction as any}
              onStart={() => { setLost(false); handleStartFocus() }}
              onNotReady={() => { setLost(false); nav('/tasks') }}
              onBlocked={() => { setLost(false); nav('/blockers') }}
              onOther={() => setLostPath('')} />
          )}
        </Modal>
      )}

      {focus && nextAction.task && (
        <Modal open title="🎯 Focus mode" onClose={() => setFocus(false)}>
          <div style={{ background: 'var(--bg)', borderRadius: 14, padding: '1rem' }}>
            <div className="hsection">Current objective</div>
            <div className="htitle sm">{nextAction.task.title}</div>
            {nextAction.task.why && <p className="small muted mt-1">{nextAction.task.why}</p>}
            <div className="divider" />
            <div className="row between mb-2"><div className="hsection">Definition of done</div><Tag tone="acc">{nextAction.estimatedMinutes} min</Tag></div>
            <p className="small">{nextAction.definitionOfDone}</p>
            <div className="divider" />
            <label>📝 Working notes / evidence
              <textarea className="textarea" rows={6} placeholder="What you're doing, what you tried, what you found, screenshots you'll attach later…" />
            </label>
            <div className="flex flex-wrap gap-2 mt-4">
              <button className="btn big" onClick={async () => { if (confirm('Mark task done and create journal entry draft?')) { await tk.update(nextAction.task!.id, { status: 'done', completed_at: new Date().toISOString(), evidence_status: 'draft' }); setFocus(false) } }}>✓ Mark done & create journal</button>
              <button className="btn ghost" onClick={() => setFocus(false)}>⏸ Pause</button>
              <button className="btn ghost" onClick={() => nav('/evidence')}>🧾 Capture evidence</button>
            </div>
          </div>
        </Modal>
      )}

      {checkin && <CheckIn onClose={() => setCheckin(false)} />}
    </div>
  )
}

import type { CapacitySlot, CurrentState } from '../types'
function CheckIn({ onClose }: { onClose: () => void }) {
  const { add, rows } = useRows<DailyPlan>('daily_plans', 'plan_date', false)
  const t = useRows<Task>('tasks'); const d = useRows<Dependency>('dependencies'); const b = useRows<Blocker>('blockers'); const p = useRows<Phase>('phases')
  const [step, setStep] = useState(0)
  const [cap, setCap] = useState<CapacitySlot>('2h')
  const [state, setState] = useState<CurrentState>('okay')
  const today = todayISO()
  const existing = rows.find(r => r.plan_date === today)

  if (existing && step === 0) return (
    <Modal open title="Already checked in today" onClose={onClose}>
      <p className="muted">You can redo the check-in if your situation changed, or view today's plan on the dashboard.</p>
      <div className="flex gap-2 mt-3">
        <button className="btn ghost" onClick={() => setStep(1)}>Redo check-in</button>
        <button className="btn" onClick={onClose}>Close</button>
      </div>
    </Modal>
  )

  if (step === 0) return (
    <Modal open title="📋 Daily check-in (20 seconds)" onClose={onClose}>
      <p className="muted">The plan adapts to how much usable time you have and how you're feeling.</p>
      <div className="divider" />
      <label>How much usable time do you have today?
        <div className="flex flex-wrap gap-2 mt-2">
          {(['15min','30min','1h','2h','3+'] as CapacitySlot[]).map(v => (
            <button key={v} className="pill" aria-pressed={cap === v} onClick={() => setCap(v)}>{v === '15min' ? '15 min' : v === '30min' ? '30 min' : v === '1h' ? '1 hour' : v === '2h' ? '2 hours' : '3+ hours'}</button>
          ))}
        </div>
      </label>
      <label className="mt-3">What is your current state?
        <div className="flex flex-wrap gap-2 mt-2">
          {(['ready','okay','overloaded','lost','blocked'] as CurrentState[]).map(v => (
            <button key={v} className="pill" aria-pressed={state === v} onClick={() => setState(v)}>{v === 'ready' ? '🚀 Ready' : v === 'okay' ? '👍 Okay' : v === 'overloaded' ? '😮‍💨 Overloaded' : v === 'lost' ? '🧭 Lost' : '🚧 Blocked'}</button>
          ))}
        </div>
      </label>
      <div className="flex gap-2 mt-4">
        <button className="btn big" onClick={() => setStep(1)}>Next</button>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )

  const mins = { '15min': 15, '30min': 30, '1h': 60, '2h': 120, '3+': 240 }[cap as keyof { '15min': number; '30min': number; '1h': number; '2h': number; '3+': number }] ?? 60
  const built = buildDailyPlan(Number(mins), t.rows, d.rows, b.rows, p.rows)

  return (
    <Modal open title="✅ Today's plan" onClose={onClose}>
      <div className="row between mb-3">
        <div className="col" style={{ gap: 0 }}>
          <div className="hsection">Capacity</div><div style={{ fontWeight: 700 }}>{cap}</div>
        </div>
        <div className="col" style={{ gap: 0 }}>
          <div className="hsection">State</div><div style={{ fontWeight: 700 }}>{state}</div>
        </div>
      </div>
      <div className="stack tight">
        <div><b>🎯 MUST DO</b><p className="small muted mt-1 mb-0">{built.must_do}</p></div>
        <div><b>✅ SHOULD DO</b><p className="small muted mt-1 mb-0">{built.should_do}</p></div>
        <div><b>⭐ OPTIONAL</b><p className="small muted mt-1 mb-0">{built.optional_do}</p></div>
        <div className="good"><b>⏱ If you only have 30 minutes</b><p className="mt-1 mb-0">{built.thirty_minutes}</p></div>
      </div>
      <div className="flex gap-2 mt-4">
        <button className="btn big" onClick={async () => {
          await add({ plan_date: today, capacity_minutes: mins, capacity_slot: cap, current_state: state, must_do: built.must_do, should_do: built.should_do, optional_do: built.optional_do, thirty_minutes: built.thirty_minutes, generated_at: new Date().toISOString() })
          onClose()
        }}>💾 Save plan</button>
        <button className="btn ghost" onClick={() => setStep(0)}>Back</button>
      </div>
    </Modal>
  )
}
