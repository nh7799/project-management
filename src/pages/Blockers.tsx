import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRows } from '../hooks/useRows'
import { Blocker, Task } from '../types'
import { BLOCKER_SUGGESTIONS } from '../lib/guide'
import { H, Title, Pill, Form, Empty, Card, Tag, Divider, stagger, Err } from '../components/ui'

const TYPES = ['scope','knowledge','technical','motivation','time','resource','feedback','life'] as const

const TYPE_LABELS: Record<string, string> = {
  scope: '🎯 Scope — unclear requirements',
  knowledge: '📚 Knowledge — missing info/skills',
  technical: '⚙️ Technical — bug/tool/platform',
  motivation: '🔥 Motivation — energy/focus',
  time: '⏰ Time — capacity/clashes',
  resource: '📦 Resource — hardware/access/API',
  feedback: '💬 Feedback — waiting on supervisor',
  life: '🌤️ Life — circumstances',
}

export default function Blockers() {
  const { rows: blockers, loading, error, add, update, remove } = useRows<Blocker>('blockers')
  const { rows: tasks } = useRows<Task>('tasks')
  const [filter, setFilter] = useState<'open'|'resolved'|'all'>('open')

  const filtered = useMemo(() => blockers.filter(b => {
    if (filter === 'all') return true
    if (filter === 'resolved') return b.status === 'resolved'
    return b.status === 'open'
  }), [blockers, filter])

  const stats = useMemo(() => ({
    open: blockers.filter(b => b.status === 'open').length,
    resolved: blockers.filter(b => b.status === 'resolved').length,
    aged: blockers.filter(b => b.status === 'open' && b.blocked_since && (Date.now() - new Date(b.blocked_since).getTime()) / 86400000 > 3).length,
  }), [blockers])

  if (error) return <Err e={error} />

  return (
    <div className="stack">
      <Title
        eyebrow="§20 Blockers & Recovery"
        title="Blocker Register"
        subtitle="Surface blockers early. Each blocker type has a suggested recovery playbook."
      >
        <div className="row wrap gap-2">
          <Pill tone="danger">{stats.open} open</Pill>
          <Pill tone="good">{stats.resolved} resolved</Pill>
          <Pill tone="warn">{stats.aged} ≥3 days old</Pill>
        </div>
      </Title>

      <div className="card-soft">
        <div className="hsection mb-3">🚧 Raise a blocker</div>
        <Form
          initial={{ title: '', description: '', blocker_type: 'technical', severity: 'medium', task_id: '', suggested_action: '' }}
          onSubmit={async (d) => {
            const t = String(d.blocker_type) as Blocker['blocker_type']
            const suggestion = String(d.suggested_action) || BLOCKER_SUGGESTIONS[t] || ''
            await add({
              title: String(d.title),
              description: String(d.description),
              blocker_type: t,
              severity: String(d.severity) as Blocker['severity'],
              status: 'open',
              task_id: String(d.task_id || null) || null,
              suggested_action: suggestion,
              blocked_since: new Date().toISOString(),
            } as unknown as Blocker)
          }}
          submitLabel="Raise blocker"
          cols={2}
          fields={[
            { key: 'title', label: 'Title — what is blocking you?', type: 'text', required: true, colSpan: 2 },
            { key: 'blocker_type', label: 'Blocker type', type: 'select', options: TYPES.map(t => ({ value: t, label: TYPE_LABELS[t] ?? t })) },
            { key: 'severity', label: 'Severity', type: 'select', options: [
              { value: 'low', label: '🟡 Low — annoying but I can work around' },
              { value: 'medium', label: '🟠 Medium — slowing me significantly' },
              { value: 'high', label: '🔴 High — completely stuck' },
              { value: 'critical', label: '💥 Critical — project at risk' },
            ] },
            { key: 'task_id', label: 'Linked task (optional)', type: 'select', options: [
              { value: '', label: '— Not linked —' },
              ...tasks.filter(t => t.status !== 'done').map(t => ({ value: t.id, label: `#${t.id.slice(0,4)} ${t.title}` })),
            ] },
            { key: 'description', label: 'Full description — context, what you tried, symptoms', type: 'textarea', rows: 3, colSpan: 2 },
            { key: 'suggested_action', label: 'Suggested recovery action (auto-populated from playbook; editable)', type: 'textarea', rows: 3, colSpan: 2 },
          ]}
        />
      </div>

      <Card>
        <div className="row between wrap gap-2">
          <H size="h3">📋 Blocker register</H>
          <div className="tabs">
            {[['open','Open'],['resolved','Resolved'],['all','All']].map(([k,l]) => (
              <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k as typeof filter)}>{l}</button>
            ))}
          </div>
        </div>
        <Divider />
        {loading ? <Empty icon="⏳" title="Loading blockers…" /> :
         filtered.length === 0 ? <Empty icon="🌤️" title="No blockers here" subtitle={filter === 'open' ? 'No open blockers. Nice work!' : 'No blockers recorded yet.'} /> :
        <motion.div variants={stagger} initial="initial" animate="animate" className="stack sm">
          {filtered.map(b => {
            const ageDays = b.blocked_since ? Math.floor((Date.now() - new Date(b.blocked_since).getTime()) / 86400000) : 0
            return (
              <motion.div key={b.id} variants={stagger.children}
                className="card-soft"
                style={{
                  borderLeft: `4px solid ${b.severity === 'critical' ? 'var(--danger)' : b.severity === 'high' ? 'var(--warn)' : 'var(--accent)'}`
                }}
              >
                <div className="row between wrap gap-2 mb-2">
                  <div className="row wrap gap-2">
                    <H size="h4" inline>{b.title}</H>
                    <Tag tone={
                      b.severity === 'critical' ? 'danger' :
                      b.severity === 'high' ? 'warn' :
                      b.severity === 'medium' ? 'acc' : 'muted'
                    }>{b.severity}</Tag>
                    <Tag tone="info">{TYPE_LABELS[b.blocker_type]?.split(' ').slice(1).join(' ') ?? b.blocker_type}</Tag>
                    <Tag tone={b.status === 'resolved' ? 'good' : 'danger'}>{b.status}</Tag>
                    {ageDays > 0 && <Tag tone={ageDays > 3 ? 'warn' : 'muted'}>{ageDays}d old</Tag>}
                  </div>
                  <div className="row gap-1">
                    <button className={b.status === 'open' ? 'btn good sm' : 'btn ghost sm'}
                      onClick={() => void update(b.id, {
                        status: b.status === 'open' ? 'resolved' : 'open',
                        resolved_at: b.status === 'open' ? new Date().toISOString() : null,
                      })}
                    >
                      {b.status === 'open' ? '✓ Mark resolved' : '↩ Reopen'}
                    </button>
                    <button className="btn ghost sm" onClick={() => remove(b.id)}>Delete</button>
                  </div>
                </div>
                {b.description && (
                  <div className="muted mb-2">{b.description}</div>
                )}
                {b.suggested_action && (
                  <div className="card-soft good" style={{ background: 'color-mix(in oklab, var(--good) 8%, transparent)' }}>
                    <div className="label good">🛟 Recovery playbook — suggested action</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{b.suggested_action}</div>
                  </div>
                )}
                {b.task_id && (
                  <div className="muted sm mt-2">🔗 Linked task: {tasks.find(t => t.id === b.task_id)?.title ?? b.task_id.slice(0,6)}</div>
                )}
              </motion.div>
            )
          })}
        </motion.div>}
      </Card>
    </div>
  )
}
