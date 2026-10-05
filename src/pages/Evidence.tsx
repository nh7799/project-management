import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useRows } from '../hooks/useRows'
import { Form, Bar, Err, Title, SectionHeader, Tag, Empty, Modal, stagger } from '../components/ui'
import type { Evidence, Requirement, Task, LearningOutcome, Document } from '../types'
import { motion } from 'framer-motion'

const TYPE_OPTS = ['note','screenshot','document','commit','test','code','diagram','data','meeting','other'].map(v => ({ value: v, label: v.replace(/_/g, ' ') }))
const STATUS_OPTS = [
  { value: 'missing', label: '🔴 Missing' },
  { value: 'draft', label: '🟡 Draft' },
  { value: 'captured', label: '🟢 Captured' },
  { value: 'verified', label: '✅ Verified' },
]
const SOURCE_TYPE_OPTS = [
  { value: 'programme_spec', label: '📜 Programme spec' },
  { value: 'handbook', label: '📘 Handbook' },
  { value: 'module_guide', label: '📗 Module guide' },
  { value: 'supervisor', label: '🤝 Supervisor guidance' },
  { value: 'assessment', label: '📝 Assessment brief' },
  { value: 'rubric', label: '🏷 Marking rubric' },
  { value: 'lecture', label: '🎓 Lecture' },
  { value: 'paper', label: '📄 Research paper' },
  { value: 'note', label: '📝 Note' },
  { value: 'screenshot', label: '🖼 Screenshot' },
  { value: 'meeting', label: '🤝 Meeting record' },
  { value: 'artefact', label: '🛠 Artefact' },
  { value: 'dataset', label: '📊 Dataset' },
  { value: 'experiment', label: '🧪 Experiment' },
  { value: 'diagram', label: '📐 Diagram' },
  { value: 'draft', label: '📄 Draft' },
  { value: 'other', label: '📁 Other' },
]
const IMPORTANCE_OPTS = [
  { value: 'critical', label: '🔴 Critical' },
  { value: 'important', label: '🟡 Important' },
  { value: 'reference', label: '🟢 Reference' },
  { value: 'archive', label: '⚪ Archive' },
]

export default function EvidencePage() {
  const ev = useRows<Evidence>('evidence', 'captured_at', true)
  const reqs = useRows<Requirement>('requirements')
  const tasks = useRows<Task>('tasks')
  const los = useRows<LearningOutcome>('learning_outcomes')
  const docs = useRows<Document>('documents')
  const [tab, setTab] = useState<'evidence' | 'map' | 'documents' | 'requirements'>('evidence')
  const [q, setQ] = useState('')
  const [type, setType] = useState<string>('all')
  const [addDoc, setAddDoc] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const ql = q.toLowerCase()
  const filtered = useMemo(() => ev.rows.filter(e =>
    (type === 'all' || e.type === type) && (!ql || JSON.stringify(e).toLowerCase().includes(ql))
  ), [ev.rows, q, type])

  const stats = useMemo(() => ({
    total: ev.rows.length,
    verified: ev.rows.filter(e => e.status === 'verified').length,
    captured: ev.rows.filter(e => e.status === 'captured').length,
    draft: ev.rows.filter(e => e.status === 'draft').length,
    missing: tasks.rows.filter(t => t.status === 'done' && (t.evidence_status || 'missing') === 'missing' && t.tier !== 'stretch').length,
  }), [ev.rows, tasks.rows])

  const detail = ev.rows.find(e => e.id === detailId) || null
  const detailTask = tasks.rows.find(t => t.id === detail?.task_id) || null
  const detailReq = reqs.rows.find(r => r.id === detail?.requirement_id) || null

  const gaps = useMemo(() => tasks.rows
    .filter(t => t.status === 'done' && (t.evidence_status || 'missing') === 'missing' && t.tier !== 'stretch')
    .map(t => ({ task: t, why: `Task "${t.title}" marked done but no evidence captured or linked.` }))
  , [tasks.rows])

  // Evidence Map: requirement -> evidence -> status
  const reqMap = useMemo(() => reqs.rows.map(r => {
    const linked = ev.rows.filter(e => e.requirement_id === r.id)
    const viaTask = tasks.rows.filter(t => t.phase_id ? false : false) // basic
    const best = !linked.length ? 'missing' : linked.some(e => e.status === 'verified') ? 'supported' : linked.some(e => e.status === 'captured') ? 'supported' : 'weak'
    return { req: r, linked, count: linked.length, status: best as any }
  }), [reqs.rows, ev.rows, tasks.rows])

  return (
    <div>
      <Title sub={`${stats.total} evidence items · ${reqs.rows.length} requirements · ${docs.rows.length} documents`}>
        🧾 Evidence library & map
      </Title>
      <Err msg={ev.error || reqs.error || tasks.error || los.error || docs.error || ''} />

      <div className="grid-4 mb-5">
        <div className="stat-card"><div className="hsection">Evidence captured</div><div className="htitle">{stats.total}</div></div>
        <div className="stat-card"><div className="hsection">Verified</div><div className="htitle" style={{ color: '#35a96a' }}>{stats.verified}</div></div>
        <div className="stat-card"><div className="hsection">Draft</div><div className="htitle" style={{ color: '#d99a2b' }}>{stats.draft}</div></div>
        <div className="stat-card"><div className="hsection">Done tasks without evidence</div><div className="htitle" style={{ color: stats.missing ? '#d9534f' : '#35a96a' }}>{stats.missing}</div></div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          ['evidence', `🧾 Evidence (${ev.rows.length})`],
          ['map', `🗺 Evidence map (${reqs.rows.length})`],
          ['documents', `📚 Documents (${docs.rows.length})`],
          ['requirements', `🎯 Requirements (${reqs.rows.length})`],
        ].map(([v, l]: any) => <button key={v} className="pill" aria-pressed={tab === v} onClick={() => setTab(v)}>{l}</button>)}
      </div>

      {tab === 'evidence' && (
        <>
          <Form
            cols={2}
            label="➕ Add evidence"
            fields={[
              { name: 'title', label: 'Title', required: true, placeholder: 'e.g. Working login flow screenshot' },
              { name: 'type', label: 'Type', options: TYPE_OPTS },
              { name: 'description', label: 'Description / notes', multi: true },
              { name: 'status', label: 'Status', options: STATUS_OPTS },
              { name: 'task_id', label: 'Linked task', options: [{ value: '', label: '— Not linked' }, ...tasks.rows.map(t => ({ value: t.id, label: t.title.slice(0, 60) }))] },
              { name: 'requirement_id', label: 'Linked requirement', options: [{ value: '', label: '— Not linked' }, ...reqs.rows.map(r => ({ value: r.id, label: r.title.slice(0, 60) }))] },
              { name: 'report_section', label: 'Report section', placeholder: 'e.g. Implementation, Testing, Evaluation' },
              { name: 'url', label: 'URL / location' },
              { name: 'tags', label: 'Tags (comma separated)' },
            ]}
            onSubmit={async v => {
              const out: any = { ...v, captured_at: new Date().toISOString() }
              if (out.task_id === '') delete out.task_id
              if (out.requirement_id === '') delete out.requirement_id
              await ev.add(out)
            }}
          />

          <div className="card mb-4">
            <SectionHeader title="Evidence coverage" />
            <div className="stack tight">
              <Bar pct={(stats.verified / Math.max(1, stats.total)) * 100} label={`✅ Verified: ${stats.verified}/${stats.total}`} />
              <Bar pct={((stats.verified + stats.captured) / Math.max(1, stats.total)) * 100} label={`🟢 Captured + verified: ${stats.verified + stats.captured}/${stats.total}`} />
              <Bar pct={(Math.max(0, tasks.rows.filter(t => t.status === 'done').length - stats.missing) / Math.max(1, tasks.rows.filter(t => t.status === 'done').length)) * 100} label={`🧾 Done tasks with evidence: ${Math.max(0, tasks.rows.filter(t => t.status === 'done').length - stats.missing)}/${tasks.rows.filter(t => t.status === 'done').length}`} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="Search evidence by title, notes, section…" value={q} onChange={e => setQ(e.target.value)} />
            <select className="input" style={{ width: 'auto', minWidth: 160 }} value={type} onChange={e => setType(e.target.value)}>
              <option value="all">All types</option>
              {TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {gaps.length > 0 && (
            <div className="danger mb-4">
              <b>⚠ {gaps.length} evidence gap{gaps.length > 1 ? 's' : ''}</b> — done tasks that still need evidence captured:
              <ul className="mt-2 ml-5">
                {gaps.slice(0, 6).map(g => <li key={g.task.id}>{g.task.title} <span className="tiny muted">({g.task.tier || g.task.priority})</span></li>)}
              </ul>
            </div>
          )}

          {filtered.length === 0 ? (
            <Empty title="No evidence yet" hint="Evidence protects you from doing work but then struggling to prove it academically. Add your first evidence now — even a short note counts." />
          ) : (
            <ul className="stack">
              {filtered.map((e, i) => {
                const t = tasks.rows.find(x => x.id === e.task_id)
                const r = reqs.rows.find(x => x.id === e.requirement_id)
                return (
                  <motion.li key={e.id} {...stagger(i)} className="card lift">
                    <div className="row between" style={{ flexWrap: 'wrap', gap: '.5rem' }}>
                      <div className="col" style={{ gap: 0, flex: 1, minWidth: 240 }}>
                        <div className="row" style={{ gap: '.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700 }}>{e.title}</span>
                          <Tag tone={e.status === 'verified' ? 'ok' : e.status === 'captured' ? 'acc' : e.status === 'draft' ? 'warn' : 'bad'}>{e.status}</Tag>
                          <Tag tone="info">{e.type.replace(/_/g, ' ')}</Tag>
                          {e.report_section && <Tag>📄 {e.report_section}</Tag>}
                          {t && <Tag tone="acc">✅ Task</Tag>}
                          {r && <Tag tone="ok">🎯 Req</Tag>}
                        </div>
                        {e.description && <p className="small muted mt-1 mb-0">{e.description}</p>}
                        <div className="tiny muted mt-1">{e.captured_at ? new Date(e.captured_at).toLocaleDateString('en-GB') : ''}{e.tags ? ` · ${e.tags}` : ''}</div>
                      </div>
                      <div className="row" style={{ gap: '.3rem' }}>
                        <button className="btn sm ghost" onClick={() => setDetailId(detailId === e.id ? null : e.id)}>🔍 Details</button>
                        <select className="input" style={{ padding: '.25rem .5rem', minHeight: 32, width: 'auto' }} value={e.status} onChange={x => ev.update(e.id, { status: x.target.value as any })}>
                          {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => ev.remove(e.id, false)} aria-label="Remove evidence">🗑</button>
                      </div>
                    </div>
                    {detailId === e.id && (
                      <div className="mt-3 pop" style={{ borderTop: '1px solid var(--line)', paddingTop: '.75rem' }}>
                        <div className="grid-2 small">
                          <div><b>Linked task:</b><div className="muted">{t ? t.title : '— not linked —'}</div></div>
                          <div><b>Linked requirement:</b><div className="muted">{r ? r.title : '— not linked —'}</div></div>
                          {e.url && <div><b>URL / Location:</b><div className="muted">{e.url}</div></div>}
                          {e.tags && <div><b>Tags:</b><div className="muted">{e.tags}</div></div>}
                        </div>
                      </div>
                    )}
                  </motion.li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {tab === 'map' && (
        <>
          <div className="card mb-4">
            <SectionHeader title="🎯 Academic evidence map" sub="Requirement → Evidence → Where stored → Where used → Report section → Status" />
            <p className="small muted">Where is the evidence that you have demonstrated each programme/project requirement?</p>
          </div>
          <div className="stack">
            {reqMap.map(({ req, linked, count, status }) => (
              <div key={req.id} className="card">
                <div className="row between" style={{ flexWrap: 'wrap', gap: '.5rem' }}>
                  <div className="col" style={{ gap: 0, flex: 1 }}>
                    <div className="row" style={{ gap: '.4rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700 }}>{req.title}</span>
                      <Tag tone="info">{req.type}</Tag>
                      {req.source && <Tag>{req.source}</Tag>}
                      <Tag tone={status === 'supported' ? 'ok' : status === 'weak' ? 'warn' : 'bad'}>
                        {status === 'supported' ? '🟢 Supported' : status === 'weak' ? '🟡 Weak / incomplete' : '🔴 Missing'}
                      </Tag>
                    </div>
                    {req.description && <p className="small muted mt-1 mb-0">{req.description}</p>}
                    {req.category && <div className="tiny muted">Category: {req.category}</div>}
                  </div>
                  <div className="htitle sm">{count}</div>
                </div>
                <div className="divider" />
                {linked.length === 0 ? (
                  <p className="small muted">🔴 No evidence captured for this requirement yet.</p>
                ) : (
                  <ul className="stack tight">
                    {linked.map(e => (
                      <li key={e.id} className="row between" style={{ gap: '.5rem', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{e.title}</div>
                          <div className="tiny muted">
                            Where stored: {e.url || 'in app'} · Where used: {e.report_section || 'Not yet placed in report'} · Type: {e.type}
                          </div>
                        </div>
                        <Tag tone={e.status === 'verified' ? 'ok' : e.status === 'captured' ? 'acc' : 'warn'}>{e.status}</Tag>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <div className="card mt-4">
            <SectionHeader title="Learning outcomes" />
            <ul className="stack tight">
              {los.rows.map(lo => (
                <li key={lo.id} className="row between" style={{ gap: '.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div className="row" style={{ gap: '.4rem' }}>
                      <span style={{ fontWeight: 600 }}>{lo.title}</span>
                      <Tag>{lo.category}</Tag>
                    </div>
                    {lo.description && <div className="small muted">{lo.description}</div>}
                  </div>
                  <select className="input" style={{ width: 'auto', minHeight: 32, padding: '.25rem .5rem' }} value={lo.status || 'pending'}
                    onChange={e => los.update(lo.id, { status: e.target.value as any })}>
                    <option value="pending">⬜ Pending</option>
                    <option value="partial">🟡 Partial</option>
                    <option value="met">🟢 Met</option>
                  </select>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {tab === 'documents' && (
        <>
          <div className="flex gap-2 mb-4">
            <input className="input" style={{ flex: 1 }} placeholder="Search documents…" value={q} onChange={e => setQ(e.target.value)} />
            <button className="btn" onClick={() => setAddDoc(true)}>➕ Add document</button>
          </div>
          {docs.rows.filter(d => !ql || JSON.stringify(d).toLowerCase().includes(ql)).length === 0 ? (
            <Empty title="No documents yet" hint="Add the programme spec, handbook, module guides, assessment briefs, rubrics, lecture notes and your own drafts." action={<button className="btn" onClick={() => setAddDoc(true)}>➕ Add your first document</button>} />
          ) : (
            <ul className="stack">
              {docs.rows.filter(d => !ql || JSON.stringify(d).toLowerCase().includes(ql)).map((d, i) => (
                <motion.li key={d.id} {...stagger(i)} className="card lift">
                  <div className="row between" style={{ flexWrap: 'wrap', gap: '.5rem' }}>
                    <div className="col" style={{ gap: 0, flex: 1 }}>
                      <div className="row" style={{ gap: '.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700 }}>{d.title}</span>
                        <Tag>{d.source_type.replace(/_/g, ' ')}</Tag>
                        <Tag tone={d.importance === 'critical' ? 'bad' : d.importance === 'important' ? 'warn' : d.importance === 'reference' ? 'acc' : undefined}>{d.importance}</Tag>
                        <Tag tone={d.evidence_status === 'cited' ? 'ok' : d.evidence_status === 'annotated' ? 'acc' : d.evidence_status === 'reviewed' ? 'warn' : undefined}>{d.evidence_status}</Tag>
                        {d.date && <Tag tone="info">{d.date}</Tag>}
                      </div>
                      {d.notes && <p className="small muted mt-1 mb-0">{d.notes}</p>}
                      {d.url && <a className="tiny" href={d.url} target="_blank" rel="noreferrer">🔗 Open</a>}
                    </div>
                    <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => docs.remove(d.id, false)}>🗑</button>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === 'requirements' && (
        <>
          <div className="card mb-4">
            <SectionHeader title="Programme & project requirements" sub="Requirements are seeded from the BSc CS 6COM2018 spec. Add your own project-level objectives too." />
            <p className="small muted mb-0">These are the backbone of the evidence map — everything you do should connect back to at least one requirement.</p>
          </div>
          <Form
            cols={2}
            label="➕ Add requirement / objective"
            fields={[
              { name: 'type', label: 'Type', options: [{ value: 'project', label: 'Project objective' }, { value: 'objective', label: 'Objective' }, { value: 'programme', label: 'Programme' }, { value: 'module', label: 'Module' }] },
              { name: 'title', label: 'Title', required: true },
              { name: 'description', label: 'Description / how to demonstrate', multi: true },
              { name: 'category', label: 'Category' },
              { name: 'source', label: 'Source document' },
            ]}
            onSubmit={reqs.add as any}
          />
          <ul className="stack">
            {reqs.rows.map((r, i) => (
              <motion.li key={r.id} {...stagger(i)} className="card lift">
                <div className="row between" style={{ flexWrap: 'wrap', gap: '.5rem' }}>
                  <div className="col" style={{ gap: 0, flex: 1 }}>
                    <div className="row" style={{ gap: '.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700 }}>{r.title}</span>
                      <Tag tone={r.type === 'programme' ? 'bad' : r.type === 'module' ? 'warn' : r.type === 'project' ? 'acc' : undefined}>{r.type}</Tag>
                      {r.status === 'met' ? <Tag tone="ok">🟢 Met</Tag> : r.status === 'partial' ? <Tag tone="warn">🟡 Partial</Tag> : r.status === 'exceeded' ? <Tag tone="ok" kind="acc">⭐ Exceeded</Tag> : <Tag>⬜ Pending</Tag>}
                      {r.source && <Tag tone="info">📖 {r.source}</Tag>}
                      {r.category && <Tag>{r.category}</Tag>}
                    </div>
                    {r.description && <p className="small muted mt-1 mb-0">{r.description}</p>}
                    <div className="tiny muted mt-1">
                      {ev.rows.filter(e => e.requirement_id === r.id).length} evidence item{ev.rows.filter(e => e.requirement_id === r.id).length === 1 ? '' : 's'} linked
                    </div>
                  </div>
                  <div className="row" style={{ gap: '.3rem' }}>
                    <select className="input" style={{ padding: '.25rem .5rem', width: 'auto', minHeight: 32 }} value={r.status} onChange={e => reqs.update(r.id, { status: e.target.value as any })}>
                      <option value="pending">⬜ Pending</option>
                      <option value="partial">🟡 Partial</option>
                      <option value="met">🟢 Met</option>
                      <option value="exceeded">⭐ Exceeded</option>
                    </select>
                    <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => reqs.remove(r.id, false)}>🗑</button>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </>
      )}

      <Modal open={addDoc} onClose={() => setAddDoc(false)} title="➕ Add document / source">
        <Form
          label="Save"
          fields={[
            { name: 'title', label: 'Title', required: true },
            { name: 'source_type', label: 'Source type', options: SOURCE_TYPE_OPTS },
            { name: 'importance', label: 'Importance', options: IMPORTANCE_OPTS },
            { name: 'date', label: 'Date', type: 'date' },
            { name: 'notes', label: 'Notes', multi: true },
            { name: 'url', label: 'URL / location' },
            { name: 'tags', label: 'Tags (comma separated)' },
          ]}
          onSubmit={async v => { await docs.add(v as any); setAddDoc(false) }}
        />
      </Modal>
    </div>
  )
}
