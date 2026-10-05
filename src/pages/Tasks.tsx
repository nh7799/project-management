import { useMemo, useState } from 'react'
import { useRows } from '../hooks/useRows'
import { daysUntil, fmt, todayISO } from '../utils/dates'
import { Form, Bar, Err, Title, SectionHeader, Tag, Empty, Modal, NextActionCard } from '../components/ui'
import { chooseNextAction } from '../utils/health'
import type { Task, Subtask, Dependency, Phase, Blocker, Evidence } from '../types'

const PRIORITY_OPTS = [
  { value: 'critical', label: '🔴 Critical — do this week' },
  { value: 'important', label: '🟡 Important — do soon' },
  { value: 'useful', label: '🟢 Useful — when time' },
]
const TIER_OPTS = [
  { value: 'core', label: 'Core (must pass)' },
  { value: 'important', label: 'Important (quality)' },
  { value: 'optional', label: 'Optional (nice)' },
  { value: 'stretch', label: 'Stretch (future work)' },
]
const STATUS_OPTS = [
  { value: 'not_started', label: 'Not started' },
  { value: 'active', label: '🟦 In progress' },
  { value: 'blocked', label: '🚧 Blocked' },
  { value: 'done', label: '✅ Done' },
]
const EVIDENCE_OPTS = [
  { value: 'missing', label: '🔴 Missing' },
  { value: 'draft', label: '🟡 Draft' },
  { value: 'captured', label: '🟢 Captured' },
  { value: 'verified', label: '✅ Verified' },
]

export default function Tasks() {
  const { rows, error, add, update, remove } = useRows<Task>('tasks')
  const subs = useRows<Subtask>('subtasks')
  const deps = useRows<Dependency>('dependencies')
  const phases = useRows<Phase>('phases', 'order_index', true)
  const blockers = useRows<Blocker>('blockers')
  const evi = useRows<Evidence>('evidence')
  const [filter, setFilter] = useState<'all'|'not_done'|'done'|'today'|'blocked'|'overdue'>('not_done')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newSub, setNewSub] = useState('')
  const [scopeOnlyCore, setScopeOnlyCore] = useState(false)

  const core = rows.filter(t => (t.tier === 'core' || t.priority === 'critical') && t.status !== 'done').length
  const stretch = rows.filter(t => t.tier === 'stretch' && t.status !== 'done').length
  const overdue = rows.filter(t => t.status !== 'done' && t.due && daysUntil(t.due) < 0)
  const nextAction = useMemo(() => chooseNextAction(rows, deps.rows, blockers.rows, phases.rows), [rows, deps.rows, blockers.rows, phases.rows])

  const filtered = useMemo(() => {
    let list = [...rows]
    if (scopeOnlyCore) list = list.filter(t => t.tier === 'core' || t.tier === 'important' || t.priority === 'critical')
    switch (filter) {
      case 'not_done': list = list.filter(t => t.status !== 'done'); break
      case 'done': list = list.filter(t => t.status === 'done'); break
      case 'today': list = list.filter(t => t.due && daysUntil(t.due) <= 1 && t.status !== 'done'); break
      case 'blocked': list = list.filter(t => t.status === 'blocked'); break
      case 'overdue': list = list.filter(t => t.status !== 'done' && t.due && daysUntil(t.due) < 0); break
    }
    const pOrder: Record<string | number, number> = { critical: 0, important: 1, useful: 2, '1': 0, '2': 0, '3': 1, '4': 0, '5': 0 }
    const tOrder: Record<string, number> = { core: 0, important: 1, optional: 2, stretch: 3 }
    const sOrder: Record<string, number> = { blocked: 0, active: 1, not_started: 2, done: 4, todo: 3 }
    return list.sort((a, b) => {
      const da = a.due ? daysUntil(a.due) : 9999, db = b.due ? daysUntil(b.due) : 9999
      const sa = sOrder[a.status] ?? 9, sb = sOrder[b.status] ?? 9
      const pa = pOrder[a.priority ?? 'important'] ?? 2, pb = pOrder[b.priority ?? 'important'] ?? 2
      const ta = tOrder[a.tier ?? 'important'] ?? 2, tb = tOrder[b.tier ?? 'important'] ?? 2
      return sa - sb || pa - pb || ta - tb || da - db
    })
  }, [rows, filter, scopeOnlyCore])

  const total = rows.length || 1
  const done = rows.filter(t => t.status === 'done').length
  const selected = rows.find(t => t.id === selectedId) || null
  const selectedSubs = subs.rows.filter(s => s.task_id === selectedId)
  const taskDeps = deps.rows.filter(d => d.task_id === selectedId)
  const taskEvi = evi.rows.filter(e => e.task_id === selectedId)

  const addSubtask = async () => {
    if (!selectedId || !newSub.trim()) return
    await subs.add({ task_id: selectedId, title: newSub.trim(), status: 'todo', order_index: selectedSubs.length })
    setNewSub('')
  }

  const phaseOpts = phases.rows.map(p => ({ value: p.id, label: p.name }))

  const toggleDep = async (otherId: string) => {
    if (!selectedId) return
    const exists = deps.rows.find(d => d.task_id === selectedId && d.depends_on === otherId)
    if (exists) await deps.remove(exists.id, false)
    else await deps.add({ task_id: selectedId, depends_on: otherId })
  }

  return (
    <div>
      <Title sub={`${done}/${total} complete · ${overdue.length} overdue`}
        right={
          <button className="pill" aria-pressed={scopeOnlyCore} onClick={() => setScopeOnlyCore(o => !o)}>
            🧘 {scopeOnlyCore ? 'Showing core/important only' : 'Show all tasks'}
          </button>
        }
      >
        ✅ Things to do
      </Title>
      <Err msg={error || subs.error || deps.error || phases.error || blockers.error || evi.error || ''} />

      {core > 0 && stretch > 0 && (
        <div className="warn mb-4">
          <b>🧘 Scope guard</b>: {stretch} stretch task(s) open while {core} core task(s) remain. Consider hiding stretch tasks and finishing core first.
        </div>
      )}

      <NextActionCard
        action={nextAction as any}
        onStart={() => nextAction.task && update(nextAction.task.id, { status: 'active' })}
        onNotReady={() => setFilter('all')}
        onBlocked={() => setFilter('blocked')}
        onOther={() => setScopeOnlyCore(true)}
      />

      <Form
        cols={2}
        label="➕ Add task"
        fields={[
          { name: 'title', label: 'Task title', required: true, placeholder: 'e.g. Draft problem statement (100–200 words)' },
          { name: 'why', label: 'Why this matters', multi: true, placeholder: 'Plain-language explanation' },
          { name: 'output', label: 'Tangible output', multi: true, placeholder: 'e.g. Draft saved in report section' },
          { name: 'definition_of_done', label: 'Definition of done', multi: true, placeholder: 'Concrete completion condition — the most important field!' },
          { name: 'priority', label: 'Priority', options: PRIORITY_OPTS },
          { name: 'tier', label: 'Scope', options: TIER_OPTS },
          { name: 'estimate_minutes', label: 'Estimate (minutes)', type: 'number', placeholder: '30' },
          { name: 'due', label: 'Due date', type: 'date' },
          { name: 'phase_id', label: 'Project phase', options: [{ value: '', label: '—' }, ...phaseOpts] },
          { name: 'report_section', label: 'Report section', placeholder: 'e.g. Literature Review' },
        ]}
        onSubmit={async (v) => {
          const out: any = { ...v }
          if (out.phase_id === '') delete out.phase_id
          await add(out)
        }}
      />

      <div className="card mb-4">
        <SectionHeader title="Overall progress" sub={`${done}/${total} tasks done`} />
        <Bar pct={(done / total) * 100} label="Completion" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          ['not_done', 'Not done', rows.filter(t => t.status !== 'done').length],
          ['today', 'Due ≤ 2 days', rows.filter(t => t.due && daysUntil(t.due) <= 1 && t.status !== 'done').length],
          ['overdue', 'Overdue', overdue.length],
          ['blocked', 'Blocked', rows.filter(t => t.status === 'blocked').length],
          ['done', 'Done', done],
          ['all', 'All', rows.length],
        ].map(([v, l, n]: any) => (
          <button key={v} className="pill" aria-pressed={filter === v} onClick={() => setFilter(v as any)}>
            {l} <span className="chip">{n}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty title="Nothing matches this filter" hint="Add a task above, or change the filter." />
      ) : (
        <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
          {filtered.map(t => {
            const ts = subs.rows.filter(s => s.task_id === t.id)
            const tsDone = ts.filter(s => s.status === 'done').length
            const dueT = t.due ? daysUntil(t.due) : null
            const tone = t.status === 'done' ? 'ok' : dueT !== null && dueT < 0 ? 'bad' : t.status === 'blocked' ? 'warn' : dueT !== null && dueT < 3 ? 'warn' : undefined
            return (
              <li key={t.id} className="card lift">
                <div className="row between" style={{ alignItems: 'start', gap: '.75rem', flexWrap: 'wrap' }}>
                  <div className="row" style={{ gap: '.75rem', flex: 1, minWidth: 0, alignItems: 'start' }}>
                    <input className="checkbox" style={{ marginTop: 4 }} type="checkbox" checked={t.status === 'done'}
                      onChange={() => update(t.id, { status: t.status === 'done' ? (t.due ? 'active' : 'not_started') : 'done', completed_at: t.status === 'done' ? null : new Date().toISOString() })} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row" style={{ flexWrap: 'wrap', gap: '.4rem', alignItems: 'center' }}>
                        <span className={t.status === 'done' ? 'line-through' : ''} style={{ fontWeight: 700, fontSize: '1.02rem' }}>{t.title}</span>
                        {t.priority && <Tag tone={t.priority === 'critical' ? 'bad' : t.priority === 'important' ? 'warn' : 'ok'}>{t.priority}</Tag>}
                        {t.tier && <Tag tone={t.tier === 'core' ? 'acc' : t.tier === 'stretch' ? 'info' : undefined}>{t.tier}</Tag>}
                        <Tag tone={(t.evidence_status === 'missing' && t.status === 'done' && t.tier !== 'stretch') ? 'bad' : t.evidence_status === 'verified' ? 'ok' : t.evidence_status === 'captured' ? 'acc' : undefined}>
                          🧾 {t.evidence_status || 'missing'}
                        </Tag>
                        {tone !== undefined && <Tag tone={tone}>{t.status === 'done' ? 'done' : dueT !== null && dueT < 0 ? `${-dueT}d overdue` : dueT === 0 ? 'today' : dueT !== null && dueT < 100 ? `${dueT}d` : t.status.replace(/_/g, ' ')}</Tag>}
                        {t.due && <Tag tone="info">📅 {fmt(t.due)}</Tag>}
                      </div>
                      {t.why && <p className="small muted mt-1 mb-0">{t.why}</p>}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button className="pill sm" onClick={() => setSelectedId(selectedId === t.id ? null : t.id)}>
                          🔍 Details
                        </button>
                        <select className="input" style={{ padding: '.25rem .5rem', minHeight: 32, width: 'auto' }} value={t.status}
                          onChange={e => update(t.id, { status: e.target.value as any })}>
                          {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <select className="input" style={{ padding: '.25rem .5rem', minHeight: 32, width: 'auto' }} value={t.evidence_status || 'missing'}
                          onChange={e => update(t.id, { evidence_status: e.target.value as any })}>
                          {EVIDENCE_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <button className="btn ghost sm" onClick={() => remove(t.id)}>🗑</button>
                      </div>
                      {ts.length > 0 && (
                        <div className="mt-3">
                          <Bar pct={(tsDone / ts.length) * 100} label={`Subtasks ${tsDone}/${ts.length}`} />
                        </div>
                      )}
                    </div>
                  </div>
                  {t.estimate_minutes && <Tag tone="info">⏱ {t.estimate_minutes}m</Tag>}
                </div>

                {selectedId === t.id && (
                  <div className="mt-4 pop" style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
                    <div className="grid-2">
                      <div>
                        <SectionHeader title="📋 Details" sub="Task information" />
                        <div className="stack tight small">
                          <div><b>Why:</b> <span className="muted">{t.why || 'Not set'}</span></div>
                          <div><b>Output:</b> <span className="muted">{t.output || 'Not set'}</span></div>
                          <div><b>Definition of done:</b> <span className="muted">{t.definition_of_done || 'Not set — add one to remove 90% of the anxiety'}</span></div>
                          <div><b>Report section:</b> <span className="muted">{t.report_section || '—'}</span></div>
                          <div><b>Phase:</b> <span className="muted">{phases.rows.find(p => p.id === t.phase_id)?.name || '—'}</span></div>
                        </div>
                      </div>
                      <div>
                        <SectionHeader title="🧾 Evidence for this task" sub={`${taskEvi.length} item(s)`} />
                        {taskEvi.length === 0 ? <p className="small muted">None yet — add evidence from the Evidence page and link this task.</p> :
                          <ul className="stack tight">
                            {taskEvi.map(e => (
                              <li key={e.id} className="row between">
                                <div><div style={{ fontWeight: 600 }}>{e.title}</div><div className="tiny muted">{e.type}</div></div>
                                <Tag tone={e.status === 'verified' ? 'ok' : e.status === 'captured' ? 'acc' : 'warn'}>{e.status}</Tag>
                              </li>
                            ))}
                          </ul>}
                      </div>
                    </div>

                    <div className="divider" />
                    <SectionHeader title="📝 Subtasks" sub={`${tsDone}/${ts.length} complete`} />
                    <div className="flex gap-2 mb-3">
                      <input className="input" placeholder="New subtask…" value={newSub} onChange={e => setNewSub(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubtask()} />
                      <button className="btn" onClick={addSubtask}>Add</button>
                    </div>
                    {selectedSubs.length === 0 ? <p className="small muted">No subtasks yet — break big tasks into ≤ 20 minute pieces.</p> :
                      <ul className="stack tight" style={{ listStyle: 'none', padding: 0 }}>
                        {selectedSubs.sort((a, b) => a.order_index - b.order_index).map(s => (
                          <li key={s.id} className="row between">
                            <label className="row" style={{ gap: '.6rem', flex: 1 }}>
                              <input className="checkbox" type="checkbox" checked={s.status === 'done'} onChange={() => subs.update(s.id, { status: s.status === 'done' ? 'todo' : 'done' })} />
                              <span className={s.status === 'done' ? 'line-through' : ''}>{s.title}</span>
                            </label>
                            <button className="icon-btn" style={{ width: 36, height: 36, fontSize: '.85rem' }} onClick={() => subs.remove(s.id, false)}>✕</button>
                          </li>
                        ))}
                      </ul>}

                    <div className="divider" />
                    <SectionHeader title="🔗 Dependencies" sub="Tasks that must finish before this one" />
                    {rows.filter(o => o.id !== selectedId).length === 0 ? <p className="small muted">Add other tasks first.</p> :
                      <ul className="stack tight" style={{ listStyle: 'none', padding: 0, maxHeight: 220, overflow: 'auto' }}>
                        {rows.filter(o => o.id !== selectedId).map(o => {
                          const on = taskDeps.some(d => d.depends_on === o.id)
                          return (
                            <li key={o.id} className="row between" style={{ padding: '.4rem .6rem', borderRadius: 10, background: on ? 'var(--surface2)' : 'transparent' }}>
                              <span className={o.status === 'done' ? 'line-through' : ''}>{o.title}</span>
                              <button className="pill sm" aria-pressed={on} onClick={() => toggleDep(o.id)}>{on ? '✓ Required' : 'Make required'}</button>
                            </li>
                          )
                        })}
                      </ul>}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
