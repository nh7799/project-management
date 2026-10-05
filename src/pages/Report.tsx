import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRows } from '../hooks/useRows'
import { ReportSection, Task, Evidence } from '../types'
import { H, Title, Pill, Form, Empty, Card, Tag, Divider, stagger, Err, Bar, Donut } from '../components/ui'

const STATUSES = ['not_started','outlining','drafting','reviewing','finalised'] as const
const STATUS_COLOUR: Record<string, string> = {
  not_started: 'muted', outlining: 'info', drafting: 'acc', reviewing: 'warn', finalised: 'good'
}

export default function Report() {
  const { rows: sections, loading, error, add, update, remove } = useRows<ReportSection>('report_sections')
  const { rows: tasks } = useRows<Task>('tasks')
  const { rows: evidence } = useRows<Evidence>('evidence')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const totalWords = useMemo(() => sections.reduce((s,sec) => s + (sec.current_words || 0), 0), [sections])
  const targetWords = useMemo(() => sections.reduce((s,sec) => s + (sec.target_words || 0), 0), [sections]) || 1

  const sectionProgress = useMemo(() => {
    const weights = sections.length || 1
    const score = sections.reduce((s, sec) => {
      const step = STATUSES.indexOf(sec.draft_status); return s + (step + 1)
    }, 0)
    return Math.min(100, (score / (STATUSES.length * weights)) * 100)
  }, [sections])

  const linkedMap = useMemo(() => {
    const bySection: Record<string, { tasks: Task[], evidence: Evidence[] }> = {}
    sections.forEach(s => { bySection[s.id] = { tasks: [], evidence: [] } })
    tasks.forEach(t => { if (t.report_section && bySection[t.report_section]) bySection[t.report_section].tasks.push(t) })
    evidence.forEach(e => { if (e.report_section && bySection[e.report_section]) bySection[e.report_section].evidence.push(e) })
    return bySection
  }, [sections, tasks, evidence])

  const evidenceGaps = useMemo(() => sections.filter(s => {
    const has = (linkedMap[s.id]?.evidence.length ?? 0)
    return s.evidence_required && s.evidence_required.split(/[.\n]/).filter(Boolean).length > 0 && has === 0 && s.draft_status !== 'finalised'
  }), [sections, linkedMap])

  if (error) return <Err e={error} />

  return (
    <div className="stack">
      <Title
        eyebrow="§16 Report Builder"
        title="Report Builder"
        subtitle="One section at a time. Track purpose, required evidence, word-count progress and draft status per section."
      >
        <div className="row wrap gap-2">
          <Pill tone="acc">{totalWords.toLocaleString()} / {targetWords.toLocaleString()} words</Pill>
          <Pill tone={sectionProgress > 70 ? 'good' : sectionProgress > 30 ? 'warn' : 'info'}>{Math.round(sectionProgress)}% drafted</Pill>
          <Pill tone={evidenceGaps.length > 0 ? 'danger' : 'good'}>{evidenceGaps.length} evidence gaps</Pill>
          <Pill tone="info">{sections.length} sections</Pill>
        </div>
      </Title>

      <div className="grid-3">
        <Card>
          <div className="hsection mb-2">📊 Overall progress</div>
          <Donut percent={sectionProgress} tone="acc" label="Report" sub={`${Math.round(sectionProgress)}% drafted`} />
        </Card>
        <Card>
          <div className="hsection mb-2">✍️ Word count</div>
          <Bar percent={(totalWords / targetWords) * 100} tone="good" />
          <div className="row between mt-2 muted sm">
            <span>{totalWords.toLocaleString()} written</span>
            <span>Target: {targetWords.toLocaleString()}</span>
          </div>
        </Card>
        <Card>
          <div className="hsection mb-2">🔗 Linked assets</div>
          <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="stat-card">
              <div className="stat-value">{tasks.filter(t => t.report_section).length}</div>
              <div className="stat-label muted sm">Tasks → sections</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{evidence.filter(e => e.report_section).length}</div>
              <div className="stat-label muted sm">Evidence → sections</div>
            </div>
          </div>
        </Card>
      </div>

      {evidenceGaps.length > 0 && (
        <div className="card-soft" style={{ borderLeft: '4px solid var(--danger)', background: 'color-mix(in oklab, var(--danger) 6%, transparent)' }}>
          <div className="hsection danger">⚠️ Evidence gaps — sections that say they need evidence but have none linked</div>
          <div className="row wrap gap-2 mt-2">
            {evidenceGaps.map(s => <Tag key={s.id} tone="danger">{s.order_index+1}. {s.title}</Tag>)}
          </div>
        </div>
      )}

      <div className="card-soft">
        <div className="hsection mb-3">➕ Add a section (or edit seeded defaults below)</div>
        <Form
          initial={{ title: '', purpose: '', evidence_required: '', target_words: '800', draft_status: 'not_started', order_index: String(sections.length) }}
          onSubmit={async (d) => {
            await add({
              order_index: parseInt(String(d.order_index),10) || 0,
              title: String(d.title),
              purpose: String(d.purpose || null) || null,
              evidence_required: String(d.evidence_required || null) || null,
              target_words: parseInt(String(d.target_words),10) || 0,
              current_words: 0,
              draft_status: String(d.draft_status) as ReportSection['draft_status'],
            } as unknown as ReportSection)
          }}
          submitLabel="Add section"
          cols={2}
          fields={[
            { key: 'order_index', label: 'Order', type: 'number' },
            { key: 'title', label: 'Section title', type: 'text', required: true },
            { key: 'target_words', label: 'Target word count', type: 'number', min: 0 },
            { key: 'draft_status', label: 'Initial status', type: 'select', options: STATUSES.map(s => ({ value: s, label: s.replace('_',' ').replace(/\b./g, c => c.toUpperCase()) })) },
            { key: 'purpose', label: 'What this section must accomplish', type: 'textarea', rows: 2, colSpan: 2 },
            { key: 'evidence_required', label: 'Evidence this section must reference', type: 'textarea', rows: 2, colSpan: 2 },
          ]}
        />
      </div>

      <Card>
        <div className="row between wrap gap-2">
          <H size="h3">📑 Report sections</H>
          <div className="muted sm">Tip: click a section row to expand full editor</div>
        </div>
        <Divider />
        {loading ? <Empty icon="⏳" title="Loading sections…" /> :
         sections.length === 0 ? <Empty icon="📑" title="No sections yet" subtitle="Seed sections should auto-create on first sign-in. You can also add above." /> :
        <motion.div variants={stagger} initial="initial" animate="animate" className="stack sm">
          {sections
            .sort((a,b) => (a.order_index ?? 0) - (b.order_index ?? 0))
            .map(s => {
              const wordPct = s.target_words > 0 ? (s.current_words || 0) / s.target_words * 100 : 0
              const links = linkedMap[s.id] ?? { tasks: [], evidence: [] }
              return (
                <motion.div key={s.id} variants={stagger.children} className="card-soft">
                  <button
                    onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
                    className="w-full text-left" style={{ display: 'contents' }}
                  >
                    <div className="row between wrap gap-2">
                      <div className="row wrap gap-2 items-center">
                        <span className="pill sm muted">#{(s.order_index ?? 0) + 1}</span>
                        <H size="h4" inline>{s.title}</H>
                        <Tag tone={STATUS_COLOUR[s.draft_status] ?? 'muted'}>{s.draft_status.replace('_',' ')}</Tag>
                        <Tag tone="acc">{s.current_words ?? 0} / {s.target_words ?? 0} words</Tag>
                        {links.tasks.length > 0 && <Tag tone="info">🔗 {links.tasks.length} tasks</Tag>}
                        {links.evidence.length > 0 && <Tag tone="good">🧾 {links.evidence.length} evidence</Tag>}
                      </div>
                      <div className="row gap-1">
                        <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); remove(s.id) }}>Delete</button>
                      </div>
                    </div>
                    <div className="mt-2"><Bar percent={Math.min(100, wordPct)} tone={wordPct > 110 ? 'warn' : wordPct > 80 ? 'good' : 'acc'} /></div>
                  </button>
                  {selectedId === s.id && (
                    <div className="mt-3">
                      <Divider />
                      <div className="grid-2">
                        <div>
                          <label className="label">Title</label>
                          <input className="input" value={s.title}
                            onChange={e => void update(s.id, { title: e.target.value })} />
                        </div>
                        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                          <div>
                            <label className="label">Status</label>
                            <select className="input" value={s.draft_status}
                              onChange={e => void update(s.id, { draft_status: e.target.value as ReportSection['draft_status'] })}>
                              {STATUSES.map(st => <option key={st} value={st}>{st.replace('_',' ')}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="label">Order</label>
                            <input type="number" className="input" value={s.order_index ?? 0}
                              onChange={e => void update(s.id, { order_index: parseInt(e.target.value,10) || 0 })} />
                          </div>
                          <div>
                            <label className="label">Words written</label>
                            <input type="number" className="input" value={s.current_words ?? 0} min={0}
                              onChange={e => void update(s.id, { current_words: parseInt(e.target.value,10) || 0 })} />
                          </div>
                          <div>
                            <label className="label">Target words</label>
                            <input type="number" className="input" value={s.target_words ?? 0} min={0}
                              onChange={e => void update(s.id, { target_words: parseInt(e.target.value,10) || 0 })} />
                          </div>
                        </div>
                        <div className="col-span-2">
                          <label className="label">Purpose — what this section must do</label>
                          <textarea className="textarea" rows={2} value={s.purpose ?? ''}
                            onChange={e => void update(s.id, { purpose: e.target.value })} />
                        </div>
                        <div className="col-span-2">
                          <label className="label">Evidence required to support this section</label>
                          <textarea className="textarea" rows={3} value={s.evidence_required ?? ''}
                            onChange={e => void update(s.id, { evidence_required: e.target.value })} />
                        </div>
                        <div className="col-span-2 card-soft muted sm">
                          <div className="label muted">🔗 Linked tasks (from Tasks page → assign to section)</div>
                          {links.tasks.length === 0 ? <div>No tasks linked yet.</div> :
                            <ul className="list ml-4">{links.tasks.map(t => <li key={t.id}>• {t.title} <span className="pill sm muted">{t.status}</span></li>)}</ul>
                          }
                          <div className="label muted mt-2">🧾 Linked evidence (from Evidence page → assign to section)</div>
                          {links.evidence.length === 0 ? <div>No evidence linked yet.</div> :
                            <ul className="list ml-4">{links.evidence.map(e => <li key={e.id}>• {e.title} <span className="pill sm">{e.type} · {e.status}</span></li>)}</ul>
                          }
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
        </motion.div>}
      </Card>
    </div>
  )
}
