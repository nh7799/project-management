import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRows } from '../hooks/useRows'
import { daysUntil, fmt, todayISO } from '../utils/dates'
import { Form, Bar, Donut, Err, Title, SectionHeader, Tag, Empty, Modal, stagger } from '../components/ui'
import { PHASE_DESCRIPTIONS } from '../lib/guide'
import type { Phase, Milestone, Task } from '../types'
import { motion } from 'framer-motion'

const PHASE_OPTS = [
  { value: 'pending', label: '⬜ Pending' },
  { value: 'in_progress', label: '🔵 In progress' },
  { value: 'blocked', label: '🟡 Blocked' },
  { value: 'complete', label: '✅ Complete' },
]
const MILESTONE_OPTS = [
  { value: 'pending', label: '⬜ Pending' },
  { value: 'upcoming', label: '🔜 Upcoming' },
  { value: 'active', label: '🔵 Active' },
  { value: 'overdue', label: '🔴 Overdue' },
  { value: 'complete', label: '✅ Complete' },
]

export default function Project() {
  const phases = useRows<Phase>('phases', 'order_index', true)
  const milestones = useRows<Milestone>('milestones', 'due_date', true)
  const tasks = useRows<Task>('tasks')
  const [activePhaseId, setActivePhaseId] = useState<string | null>(phases.rows.find(p => p.status === 'in_progress')?.id || phases.rows[0]?.id || null)
  const [newMs, setNewMs] = useState(false)
  const [editPhase, setEditPhase] = useState<Phase | null>(null)

  const activePhase = phases.rows.find(p => p.id === activePhaseId) || null
  const phaseTasks = tasks.rows.filter(t => t.phase_id === activePhaseId)
  const phaseMilestones = milestones.rows.filter(m => m.phase_id === activePhaseId)

  const completed = phases.rows.filter(p => p.status === 'complete').length
  const inProg = phases.rows.find(p => p.status === 'in_progress')
  const overallPct = phases.rows.length ? Math.round(((completed + (inProg ? 0.5 : 0)) / phases.rows.length) * 100) : 0
  const timelineToday = todayISO()

  const nextMilestone = useMemo(() => milestones.rows
    .filter(m => m.status !== 'complete' && m.due_date)
    .sort((a, b) => daysUntil(a.due_date!) - daysUntil(b.due_date!))[0]
  , [milestones.rows])

  return (
    <div>
      <Title sub={`${completed} complete · ${inProg ? 1 : 0} in progress · ${phases.rows.length} total phases`}>
        🧭 Project phases & milestones
      </Title>
      <Err msg={phases.error || milestones.error || tasks.error || ''} />

      <div className="grid-2 mb-5">
        <div className="card">
          <SectionHeader title="Overall phase progress" sub={`${overallPct}% of project lifecycle`} />
          <div className="row" style={{ gap: '1.25rem', alignItems: 'center', marginTop: '.5rem' }}>
            <Donut pct={overallPct} size={96} stroke={10} label={`${overallPct}%`} />
            <div className="stack tight" style={{ flex: 1 }}>
              <Bar pct={(completed / Math.max(1, phases.rows.length)) * 100} label={`✅ Complete: ${completed}`} />
              <Bar pct={(inProg ? 1 : 0) / Math.max(1, phases.rows.length) * 100} label={`🔵 In progress: ${inProg ? 1 : 0}`} />
              <Bar pct={((phases.rows.filter(p => p.status === 'blocked').length) / Math.max(1, phases.rows.length)) * 100} label={`🟡 Blocked: ${phases.rows.filter(p => p.status === 'blocked').length}`} />
              <Bar pct={((phases.rows.filter(p => p.status === 'pending').length) / Math.max(1, phases.rows.length)) * 100} label={`⬜ Pending: ${phases.rows.filter(p => p.status === 'pending').length}`} />
            </div>
          </div>
        </div>
        <div className="card">
          <SectionHeader title="Next milestone" sub={nextMilestone?.due_date ? fmt(nextMilestone.due_date) : 'TBD'} />
          {nextMilestone ? (
            <div className="stack tight">
              <div className="htitle sm">{nextMilestone.title}</div>
              {nextMilestone.outcome && <p className="small muted">{nextMilestone.outcome}</p>}
              {nextMilestone.due_date && (
                <Tag tone={daysUntil(nextMilestone.due_date) < 0 ? 'bad' : daysUntil(nextMilestone.due_date) < 7 ? 'warn' : 'acc'}>
                  {daysUntil(nextMilestone.due_date) < 0 ? `${-daysUntil(nextMilestone.due_date)}d overdue` : `${daysUntil(nextMilestone.due_date)}d to go`}
                </Tag>
              )}
              {nextMilestone.definition_of_done && (<><div className="hsection">Done when</div><p className="small mb-0">{nextMilestone.definition_of_done}</p></>)}
              <div className="flex gap-2 mt-1">
                <button className="btn sm" onClick={() => milestones.update(nextMilestone.id, { status: nextMilestone.status === 'complete' ? 'upcoming' : 'complete' })}>
                  {nextMilestone.status === 'complete' ? '↩ Reopen' : '✅ Mark complete'}
                </button>
                <button className="btn ghost sm" onClick={() => setNewMs(true)}>+ Milestone</button>
              </div>
            </div>
          ) : (
            <Empty title="No milestones yet" hint="Add your first milestone to track concrete outcomes and deliverables." action={<button className="btn sm" onClick={() => setNewMs(true)}>➕ Add milestone</button>} />
          )}
        </div>
      </div>

      <div className="card mb-5">
        <SectionHeader title="Project lifecycle" sub="Tap a phase to view details, tasks and milestones" />
        <div className="timeline-line mt-4">
          {phases.rows.map((p, i) => {
            const active = p.id === activePhaseId
            const pct = p.status === 'complete' ? 100 : p.status === 'in_progress' ? 50 : p.status === 'blocked' ? 25 : 0
            return (
              <motion.div key={p.id} {...stagger(i)} className={`timeline-item ${p.status === 'complete' ? 'done' : p.status === 'pending' ? 'pending' : ''}`}>
                <button className={`card lift text-left w-full ${active ? ' pop' : ''}`} style={{ borderColor: active ? 'var(--accent)' : undefined, borderWidth: active ? 2 : 1 }}
                  onClick={() => setActivePhaseId(p.id)}>
                  <div className="row between" style={{ flexWrap: 'wrap', gap: '.5rem' }}>
                    <div className="row" style={{ gap: '.75rem', flex: 1 }}>
                      <div className="col" style={{ gap: 0 }}>
                        <span className="tiny muted">Phase {i + 1}</span>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{p.name}</div>
                        {p.description && <span className="small muted">{p.description}</span>}
                      </div>
                    </div>
                    <div className="row" style={{ gap: '.4rem' }}>
                      <Tag tone={p.status === 'complete' ? 'ok' : p.status === 'in_progress' ? 'acc' : p.status === 'blocked' ? 'warn' : undefined}>
                        {p.status.replace(/_/g, ' ')}
                      </Tag>
                      {tasks.rows.filter(t => t.phase_id === p.id).length > 0 && <Tag>{tasks.rows.filter(t => t.phase_id === p.id).length} tasks</Tag>}
                      {milestones.rows.filter(m => m.phase_id === p.id).length > 0 && <Tag tone="info">{milestones.rows.filter(m => m.phase_id === p.id).length} ms</Tag>}
                    </div>
                  </div>
                  <Bar pct={pct} />
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>

      {activePhase && (
        <div className="grid-2 mb-5">
          <div className="card">
            <SectionHeader title={activePhase.name} sub={`Phase ${(activePhase.order_index ?? 0) + 1} · Status: ${activePhase.status}`}
              action={<button className="btn sm ghost" onClick={() => setEditPhase(activePhase)}>Edit</button>} />
            {PHASE_DESCRIPTIONS[activePhase.name] && (
              <div className="stack tight">
                {PHASE_DESCRIPTIONS[activePhase.name].objectives && (
                  <div>
                    <div className="hsection">Objectives</div>
                    <p className="small mb-0">{PHASE_DESCRIPTIONS[activePhase.name].objectives}</p>
                  </div>
                )}
                {PHASE_DESCRIPTIONS[activePhase.name].mistakes && (
                  <div>
                    <div className="hsection">Common mistakes to avoid</div>
                    <p className="small mb-0">{PHASE_DESCRIPTIONS[activePhase.name].mistakes}</p>
                  </div>
                )}
                <div className="good">
                  <div className="hsection">✅ Done when</div>
                  <p className="small mb-0">{activePhase.completion_criteria || PHASE_DESCRIPTIONS[activePhase.name].done || 'All milestones and tasks for this phase complete with evidence.'}</p>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              {PHASE_OPTS.map(o => (
                <button key={o.value} className="pill sm" aria-pressed={activePhase.status === o.value} onClick={() => phases.update(activePhase.id, { status: o.value as any })}>{o.label}</button>
              ))}
            </div>
          </div>
          <div className="card">
            <SectionHeader title={`Milestones (${phaseMilestones.length})`} action={<button className="btn sm" onClick={() => setNewMs(true)}>➕ Add</button>} />
            {phaseMilestones.length === 0 ? <Empty title="No milestones in this phase" hint="Milestones let you track concrete outcomes with deliverables, evidence required, and a definition of done." /> :
              <ul className="stack tight">
                {phaseMilestones.map(m => {
                  const d = m.due_date ? daysUntil(m.due_date) : null
                  return (
                    <li key={m.id} className="row between" style={{ gap: '.5rem', flexWrap: 'wrap' }}>
                      <div className="col" style={{ gap: 0, flex: 1 }}>
                        <span style={{ fontWeight: 600 }}>{m.title}</span>
                        {m.deliverables && <span className="tiny muted">Deliverables: {m.deliverables}</span>}
                      </div>
                      <div className="row" style={{ gap: '.3rem' }}>
                        {d !== null && <Tag tone={d < 0 ? 'bad' : d < 7 ? 'warn' : undefined}>{d < 0 ? `${-d}d ago` : `${d}d`}</Tag>}
                        <Tag tone={m.status === 'complete' ? 'ok' : m.status === 'active' ? 'acc' : undefined}>{m.status}</Tag>
                        <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => milestones.remove(m.id, false)}>🗑</button>
                      </div>
                    </li>
                  )
                })}
              </ul>}
            <div className="divider" />
            <SectionHeader title={`Tasks in this phase (${phaseTasks.length})`} action={<Link className="btn sm ghost" to="/tasks">All tasks →</Link>} />
            {phaseTasks.length === 0 ? <p className="small muted">No tasks in this phase yet.</p> :
              <ul className="stack tight">
                {phaseTasks.slice(0, 10).map(t => (
                  <li key={t.id} className="row between">
                    <label className="row" style={{ gap: '.5rem', flex: 1 }}>
                      <input className="checkbox" type="checkbox" checked={t.status === 'done'} onChange={() => tasks.update(t.id, { status: t.status === 'done' ? 'not_started' : 'done' })} />
                      <span className={t.status === 'done' ? 'line-through' : ''}>{t.title}</span>
                    </label>
                    <Tag tone={t.priority === 'critical' ? 'bad' : t.priority === 'important' ? 'warn' : undefined}>{t.priority || t.tier || 'task'}</Tag>
                  </li>
                ))}
              </ul>}
          </div>
        </div>
      )}

      <div className="card mb-5">
        <SectionHeader title="All milestones" sub={`${milestones.rows.length} total`} action={<button className="btn sm" onClick={() => setNewMs(true)}>➕ Add milestone</button>} />
        {milestones.rows.length === 0 ? (
          <Empty title="No milestones yet" hint="Milestones break the project into big, check-in moments with deliverables, evidence and a definition of done." action={<button className="btn sm" onClick={() => setNewMs(true)}>➕ Add first milestone</button>} />
        ) : (
          <ul className="stack">
            {milestones.rows.map((m, i) => {
              const d = m.due_date ? daysUntil(m.due_date) : null
              const phase = phases.rows.find(p => p.id === m.phase_id)
              return (
                <motion.li key={m.id} {...stagger(i)} className="card lift">
                  <div className="row between" style={{ flexWrap: 'wrap', gap: '.5rem' }}>
                    <div className="col" style={{ gap: 0, flex: 1 }}>
                      <div className="row" style={{ gap: '.5rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.02rem' }}>{m.title}</span>
                        <Tag tone={m.status === 'complete' ? 'ok' : m.status === 'overdue' ? 'bad' : m.status === 'active' ? 'acc' : undefined}>{m.status}</Tag>
                        {phase && <Tag tone="info">{phase.name}</Tag>}
                      </div>
                      {m.outcome && <p className="small muted">{m.outcome}</p>}
                    </div>
                    <div className="col" style={{ gap: 0, alignItems: 'end' }}>
                      {d !== null && <span style={{ fontWeight: 700, color: d < 0 ? '#d9534f' : d < 7 ? '#d99a2b' : 'inherit' }}>{d < 0 ? `${-d}d OVERDUE` : d === 0 ? 'TODAY' : `${d}d`}</span>}
                      {m.due_date && <span className="tiny muted">{fmt(m.due_date)}</span>}
                    </div>
                  </div>
                  <div className="grid-2 small mt-2">
                    {m.deliverables && <div><div className="hsection">Deliverables</div>{m.deliverables}</div>}
                    {m.prerequisites && <div><div className="hsection">Prerequisites</div>{m.prerequisites}</div>}
                    {m.evidence_required && <div><div className="hsection">Evidence required</div>{m.evidence_required}</div>}
                    {m.definition_of_done && <div className="good" style={{ padding: '.5rem .7rem' }}><div className="hsection">Done when</div>{m.definition_of_done}</div>}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {MILESTONE_OPTS.map(o => (
                      <button key={o.value} className="pill sm" aria-pressed={m.status === o.value} onClick={() => milestones.update(m.id, { status: o.value as any })}>{o.label}</button>
                    ))}
                    <button className="pill sm" onClick={() => milestones.remove(m.id, false)}>🗑 Remove</button>
                  </div>
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="card">
        <SectionHeader title="🎯 Suggested phases for a standard BSc CS project" sub="The system seeded these on first sign-in. Edit status as you progress." />
        <div className="grid-3 small mt-3">
          {phases.rows.map(p => (
            <div key={p.id} className="touch-card" style={{ cursor: 'pointer' }} onClick={() => setActivePhaseId(p.id)}>
              <div className="row between">
                <b>{p.name}</b>
                <Tag tone={p.status === 'complete' ? 'ok' : p.status === 'in_progress' ? 'acc' : p.status === 'blocked' ? 'warn' : undefined}>{p.status.replace(/_/g, ' ')}</Tag>
              </div>
              <Bar pct={p.status === 'complete' ? 100 : p.status === 'in_progress' ? 50 : p.status === 'blocked' ? 25 : 0} />
            </div>
          ))}
        </div>
      </div>

      <Modal open={newMs} onClose={() => setNewMs(false)} title="➕ Add milestone">
        <Form
          label="Save milestone"
          fields={[
            { name: 'title', label: 'Title', required: true, placeholder: 'e.g. Literature review complete' },
            { name: 'outcome', label: 'Outcome', multi: true, placeholder: 'What should be true by this point?' },
            { name: 'deliverables', label: 'Required deliverables', multi: true },
            { name: 'prerequisites', label: 'Prerequisites', multi: true, placeholder: 'What must finish before this can start?' },
            { name: 'evidence_required', label: 'Evidence required', multi: true },
            { name: 'risk', label: 'Risk / considerations' },
            { name: 'definition_of_done', label: 'Definition of done (most important!)', multi: true, placeholder: 'Concrete, verifiable completion conditions' },
            { name: 'due_date', label: 'Due date', type: 'date' },
            { name: 'status', label: 'Status', options: MILESTONE_OPTS },
            { name: 'phase_id', label: 'Phase', options: [{ value: '', label: '—' }, ...phases.rows.map(p => ({ value: p.id, label: p.name }))] },
          ]}
          onSubmit={async v => {
            const out: any = { ...v }
            if (out.phase_id === '') delete out.phase_id
            await milestones.add(out)
            setNewMs(false)
          }}
        />
      </Modal>

      <Modal open={!!editPhase} onClose={() => setEditPhase(null)} title="Edit phase">
        {editPhase && (
          <Form
            label="Save phase"
            initial={{ name: editPhase.name, description: editPhase.description || '', objectives: editPhase.objectives || '', common_mistakes: editPhase.common_mistakes || '', completion_criteria: editPhase.completion_criteria || '', status: editPhase.status }}
            fields={[
              { name: 'name', label: 'Phase name', required: true },
              { name: 'description', label: 'Short description' },
              { name: 'objectives', label: 'Objectives', multi: true },
              { name: 'common_mistakes', label: 'Common mistakes', multi: true },
              { name: 'completion_criteria', label: 'Definition of done', multi: true, required: true },
              { name: 'status', label: 'Status', options: PHASE_OPTS },
            ]}
            onSubmit={async v => {
              await phases.update(editPhase.id, v as any)
              setEditPhase(null)
            }}
          />
        )}
      </Modal>
    </div>
  )
}
