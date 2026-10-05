import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRows } from '../hooks/useRows'
import { Decision } from '../types'
import { H, Title, Pill, Form, Empty, Card, Tag, Divider, stagger, Err } from '../components/ui'

const STATUSES = ['proposed', 'decided', 'implemented', 'revisited', 'archived'] as const
const CATEGORIES = ['technical', 'scope', 'methodology', 'tools', 'schedule', 'team', 'risk', 'academic', 'other'] as const

export default function Decisions() {
  const { rows: decisions, loading, error, add, update, remove } = useRows<Decision>('decisions')
  const [filter, setFilter] = useState<string>('open')

  const filtered = useMemo(() => {
    if (filter === 'all') return decisions
    if (filter === 'open') return decisions.filter(d => d.status !== 'archived')
    return decisions.filter(d => d.status === filter)
  }, [decisions, filter])

  const stats = useMemo(() => ({
    total: decisions.length,
    proposed: decisions.filter(d => d.status === 'proposed').length,
    decided: decisions.filter(d => d.status === 'decided').length,
    implemented: decisions.filter(d => d.status === 'implemented').length,
    archived: decisions.filter(d => d.status === 'archived').length,
  }), [decisions])

  if (error) return <Err e={error} />

  return (
    <div className="stack">
      <Title
        eyebrow="§14 Decision Log"
        title="Architecture & Scope Decisions"
        subtitle="Record every meaningful decision so the rationale survives months later."
      >
        <div className="row wrap gap-2">
          <Pill tone="acc">{stats.total} total</Pill>
          <Pill tone="info">{stats.proposed} proposed</Pill>
          <Pill tone="good">{stats.decided + stats.implemented} resolved</Pill>
          <Pill tone="muted">{stats.archived} archived</Pill>
        </div>
      </Title>

      <div className="card-soft">
        <div className="hsection mb-3">🪧 Log a new decision</div>
        <Form
          initial={{ question: '', chosen: '', reason: '', alternatives: '', evidence: '', consequence: '', confidence: '70', category: 'technical', reversible: 'true', status: 'proposed', revisit_date: '' }}
          onSubmit={async (d) => {
            await add({
              question: String(d.question),
              chosen: String(d.chosen),
              reason: String(d.reason),
              alternatives: String(d.alternatives).split('\n').map(s => s.trim()).filter(Boolean),
              evidence: String(d.evidence),
              consequence: String(d.consequence),
              confidence: parseInt(String(d.confidence), 10) || 50,
              category: String(d.category) as Decision['category'],
              reversible: String(d.reversible) === 'true',
              status: String(d.status) as Decision['status'],
              revisit_date: String(d.revisit_date || null) || null,
              decided_on: new Date().toISOString().slice(0, 10),
            } as unknown as Decision)
          }}
          submitLabel="Record decision"
          cols={2}
          fields={[
            { key: 'question', label: 'Decision question', type: 'text', required: true, colSpan: 2, placeholder: 'e.g. Which DB layer should we use?' },
            { key: 'category', label: 'Category', type: 'select', options: CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })) },
            { key: 'status', label: 'Current status', type: 'select', options: STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })) },
            { key: 'chosen', label: 'Chosen option', type: 'text', required: true, colSpan: 2 },
            { key: 'reason', label: 'Why this option', type: 'textarea', rows: 3, colSpan: 2 },
            { key: 'alternatives', label: 'Alternatives considered (one per line)', type: 'textarea', rows: 3, colSpan: 2 },
            { key: 'evidence', label: 'Supporting evidence / references', type: 'textarea', rows: 2, colSpan: 2 },
            { key: 'consequence', label: 'Consequences / trade-offs', type: 'textarea', rows: 2, colSpan: 2 },
            { key: 'confidence', label: `Confidence %`, type: 'number', min: 0, max: 100 },
            { key: 'reversible', label: 'Reversible?', type: 'select', options: [
              { value: 'true', label: '✅ Easily reversible' },
              { value: 'false', label: '⚠️ One-way / hard to undo' },
            ] },
            { key: 'revisit_date', label: 'Revisit on (review date)', type: 'date' },
          ]}
        />
      </div>

      <Card>
        <div className="row between wrap gap-2">
          <H size="h3">📔 Decision register</H>
          <div className="tabs scroll-x">
            {[
              ['open','Open (not archived)'],
              ['proposed','Proposed'],
              ['decided','Decided'],
              ['implemented','Implemented'],
              ['archived','Archived'],
              ['all','All'],
            ].map(([k, l]) => (
              <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
        </div>
        <Divider />
        {loading ? <Empty icon="⏳" title="Loading decisions…" /> :
         filtered.length === 0 ? <Empty icon="🪧" title="No decisions here yet" subtitle="Log your first decision above. Even small architecture calls matter later." /> :
        <motion.div variants={stagger} initial="initial" animate="animate" className="stack sm">
          {filtered.map(d => (
            <motion.div key={d.id} variants={stagger.children} className="card-soft">
              <div className="row between wrap gap-2 mb-2">
                <div className="row wrap gap-2">
                  <H size="h4" inline>{d.question}</H>
                  <Tag tone={
                    d.status === 'archived' ? 'muted' :
                    d.status === 'implemented' ? 'good' :
                    d.status === 'decided' ? 'acc' :
                    d.status === 'revisited' ? 'warn' : 'info'
                  }>{d.status}</Tag>
                  <Tag tone="info">{d.category}</Tag>
                  {!d.reversible && <Tag tone="danger">one-way</Tag>}
                  <Tag tone="muted">{String(d.decided_on ?? '').slice(0,10)}</Tag>
                  <Tag tone="muted">{d.confidence}%</Tag>
                </div>
                <div className="row gap-1">
                  <select className="input sm" style={{ minWidth: 140 }}
                    value={d.status}
                    onChange={e => void update(d.id, { status: e.target.value as Decision['status'] })}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="btn ghost sm" onClick={() => remove(d.id)}>Delete</button>
                </div>
              </div>
              <div className="grid-2">
                <div>
                  <div className="label">Chosen</div>
                  <div>{d.chosen}</div>
                </div>
                <div>
                  <div className="label">Why</div>
                  <div>{d.reason}</div>
                </div>
                {Array.isArray(d.alternatives) && d.alternatives.length > 0 && (
                  <div>
                    <div className="label">Alternatives</div>
                    <ul className="list ml-4">
                      {d.alternatives.map((a,i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}
                {d.consequence && (
                  <div>
                    <div className="label">Trade-offs / consequences</div>
                    <div>{d.consequence}</div>
                  </div>
                )}
                {d.evidence && (
                  <div className="col-span-2">
                    <div className="label">Supporting evidence</div>
                    <div>{d.evidence}</div>
                  </div>
                )}
                {d.revisit_date && (
                  <div className="col-span-2">
                    <span className="pill warn sm">🔁 Revisit by {String(d.revisit_date).slice(0,10)}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>}
      </Card>
    </div>
  )
}
