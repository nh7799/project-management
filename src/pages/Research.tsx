import { useMemo, useState } from 'react'
import { useRows } from '../hooks/useRows'
import { Form, Bar, Err, Title, SectionHeader, Tag, Empty, Modal, stagger } from '../components/ui'
import type { ResearchSource, ResearchNotes, Requirement } from '../types'
import { motion } from 'framer-motion'

const STATUS_OPTS = [
  { value: 'unread', label: '⬜ Unread' },
  { value: 'skimmed', label: '👀 Skimmed' },
  { value: 'read', label: '✅ Read' },
  { value: 'revisit', label: '🔁 Need to revisit' },
  { value: 'used_in_report', label: '📝 Used in report' },
]

export default function Research() {
  const sources = useRows<ResearchSource>('research_sources', 'created_at', false)
  const notes = useRows<any>('research_notes')
  const reqs = useRows<Requirement>('requirements')
  const [tab, setTab] = useState<'library'|'reading'>('library')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const ql = q.toLowerCase()
  const filtered = useMemo(() => sources.rows.filter(s =>
    (status === 'all' || s.read_status === status) &&
    (!ql || JSON.stringify(s).toLowerCase().includes(ql))
  ), [sources.rows, q, status])

  const selected = sources.rows.find(s => s.id === selectedId) || null
  const selNotes = notes.rows.filter((n: any) => n.source_id === selectedId)

  const stats = useMemo(() => ({
    total: sources.rows.length,
    read: sources.rows.filter(s => s.read_status === 'read' || s.read_status === 'used_in_report').length,
    used: sources.rows.filter(s => s.read_status === 'used_in_report').length,
    revisit: sources.rows.filter(s => s.read_status === 'revisit').length,
    withRelevance: sources.rows.filter(s => s.relevance && s.relevance.length > 10).length,
  }), [sources.rows])

  return (
    <div>
      <Title sub={`${stats.total} sources · ${stats.read} read · ${stats.used} cited · Research workspace`}>
        📚 Research workspace
      </Title>
      <Err msg={sources.error || notes.error || reqs.error || ''} />

      <div className="grid-4 mb-5">
        <div className="stat-card"><div className="hsection">Sources</div><div className="htitle">{stats.total}</div></div>
        <div className="stat-card"><div className="hsection">Read</div><div className="htitle" style={{ color: '#35a96a' }}>{stats.read}</div></div>
        <div className="stat-card"><div className="hsection">Used in report</div><div className="htitle" style={{ color: 'var(--accent)' }}>{stats.used}</div></div>
        <div className="stat-card"><div className="hsection">Revisit</div><div className="htitle" style={{ color: stats.revisit ? '#d99a2b' : '#35a96a' }}>{stats.revisit}</div></div>
      </div>

      <div className="card mb-4">
        <SectionHeader title="Progress" />
        <div className="stack tight">
          <Bar pct={(stats.read / Math.max(1, stats.total)) * 100} label={`Read: ${stats.read}/${stats.total}`} />
          <Bar pct={(stats.withRelevance / Math.max(1, stats.total)) * 100} label={`With relevance notes: ${stats.withRelevance}/${stats.total}`} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {[['library', `📚 Library (${sources.rows.length})`], ['reading', '📖 Read / annotate']].map(([v, l]: any) =>
          <button key={v} className="pill" aria-pressed={tab === v} onClick={() => setTab(v)}>{l}</button>
        )}
      </div>

      {tab === 'library' && (
        <>
          <Form
            cols={2}
            label="➕ Add paper / source"
            fields={[
              { name: 'title', label: 'Title', required: true },
              { name: 'authors', label: 'Authors' },
              { name: 'year', label: 'Year', type: 'number' },
              { name: 'citation', label: 'Citation (Harvard)' },
              { name: 'doi', label: 'DOI' },
              { name: 'url', label: 'URL' },
              { name: 'read_status', label: 'Read status', options: STATUS_OPTS },
              { name: 'requirement_id', label: 'Requirement supported', options: [{ value: '', label: '—' }, ...reqs.rows.map(r => ({ value: r.id, label: r.title.slice(0, 70) }))] },
              { name: 'tags', label: 'Tags (comma separated)' },
            ]}
            onSubmit={async v => {
              const out: any = { ...v }
              if (out.requirement_id === '') delete out.requirement_id
              await sources.add(out)
            }}
          />

          <div className="flex flex-wrap gap-2 mb-3">
            <input className="input" style={{ flex: 1, minWidth: 240 }} placeholder="Search by title, author, year, findings, tags…" value={q} onChange={e => setQ(e.target.value)} />
            <select className="input" style={{ width: 'auto', minWidth: 160 }} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <Empty title="No sources yet" hint="Add academic sources and track them from unread → read → used in report. Capture your analysis for the literature review." />
          ) : (
            <ul className="stack">
              {filtered.map((s, i) => (
                <motion.li key={s.id} {...stagger(i)} className="card lift">
                  <div className="row between" style={{ flexWrap: 'wrap', gap: '.5rem' }}>
                    <div className="col" style={{ gap: 0, flex: 1, minWidth: 240 }}>
                      <div className="row" style={{ gap: '.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700 }}>{s.title}</span>
                        <Tag tone={s.read_status === 'used_in_report' ? 'ok' : s.read_status === 'read' ? 'acc' : s.read_status === 'revisit' ? 'warn' : s.read_status === 'skimmed' ? 'info' : undefined}>
                          {s.read_status.replace(/_/g, ' ')}
                        </Tag>
                        {s.year && <Tag>{s.year}</Tag>}
                        {s.doi && <Tag tone="info">DOI</Tag>}
                        {reqs.rows.find(r => r.id === s.requirement_id) && <Tag tone="ok">🎯 Req</Tag>}
                      </div>
                      <div className="tiny muted mt-1">{s.authors || 'Unknown author'}{s.citation ? ` · ${s.citation}` : ''}</div>
                      {s.relevance && <p className="small muted mt-1 mb-0" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>Relevance: {s.relevance}</p>}
                      {s.findings && <p className="small muted mt-1 mb-0" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>Findings: {s.findings}</p>}
                    </div>
                    <div className="row" style={{ gap: '.3rem' }}>
                      <button className="btn sm ghost" onClick={() => { setSelectedId(s.id); setTab('reading') }}>📖 Read</button>
                      <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => sources.remove(s.id, false)}>🗑</button>
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === 'reading' && (
        <>
          {!selected ? (
            <div>
              <div className="card">
                <SectionHeader title="Select a paper to read and annotate" />
                <p className="muted small">Click any source from the library to start recording structured notes.</p>
              </div>
              <div className="divider" />
              <ul className="stack">
                {sources.rows.slice(0, 14).map((s, i) => (
                  <motion.li key={s.id} {...stagger(i)} className="card lift" style={{ cursor: 'pointer' }} onClick={() => setSelectedId(s.id)}>
                    <div className="row between">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{s.title}</div>
                        <div className="tiny muted">{s.authors || 'Unknown'} · {s.year || 'n/a'}</div>
                      </div>
                      <Tag tone={s.read_status === 'used_in_report' ? 'ok' : s.read_status === 'read' ? 'acc' : undefined}>{s.read_status.replace(/_/g, ' ')}</Tag>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          ) : (
            <ReadingView source={selected} notes={selNotes} reqs={reqs.rows} onBack={() => setSelectedId(null)}
              onUpdate={(patch: any) => sources.update(selected.id, patch as any)}
              onAddNote={(n: any) => notes.add({ source_id: selected.id, ...n })}
              onDeleteNote={(id: string) => notes.remove(id, false)} />
          )}
        </>
      )}
    </div>
  )
}

function ReadingView({ source, notes, reqs, onBack, onUpdate, onAddNote, onDeleteNote }: any) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<any>({ ...source })
  const [cat, setCat] = useState('relevance')
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')

  const sections = [
    { k: 'research_question', label: '❓ Research question', placeholder: 'What question does this paper try to answer?' },
    { k: 'methodology', label: '🧪 Methodology', placeholder: 'How did they do it? Sample size, data, algorithm, approach…' },
    { k: 'dataset', label: '📊 Dataset / Materials', placeholder: 'Data used, benchmarks, equipment, subjects…' },
    { k: 'findings', label: '📈 Findings', placeholder: 'Main results, metrics, numbers, qualitative themes.' },
    { k: 'limitations', label: '⚠️ Limitations', placeholder: 'Threats to validity, weak methodology, small sample, context dependency, future work.' },
    { k: 'relevance', label: '🔗 Relevance to your project', placeholder: 'How does this connect to YOUR research questions, methods or baselines?' },
    { k: 'quotations', label: '💬 Important quotations', placeholder: 'Citable quotations with page numbers.' },
    { k: 'interpretation', label: '💭 Personal interpretation', placeholder: 'What YOU think about this paper and how you will use it.' },
  ]

  const saveAll = async () => {
    await onUpdate(draft)
    setEditing(false)
  }

  return (
    <div>
      <div className="card mb-4">
        <div className="row between mb-2" style={{ flexWrap: 'wrap', gap: '.5rem' }}>
          <div className="row" style={{ gap: '.5rem' }}>
            <button className="btn sm ghost" onClick={onBack}>← Back</button>
            <h2 className="htitle sm">{source.title}</h2>
          </div>
          <div className="row" style={{ gap: '.3rem' }}>
            <select className="input" style={{ padding: '.25rem .5rem', minHeight: 32, width: 'auto' }} value={source.read_status}
              onChange={e => onUpdate({ read_status: e.target.value })}>
              {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button className={`pill sm ${editing ? '' : ''}`} aria-pressed={editing} onClick={() => setEditing(e => !e)}>
              {editing ? '💾 Save' : '✏️ Edit'}
            </button>
          </div>
        </div>
        <div className="small muted mb-2">{source.authors || 'Unknown'}{source.year ? ` · ${source.year}` : ''}{source.citation ? ` · ${source.citation}` : ''}{source.doi ? ` · DOI: ${source.doi}` : ''}</div>
        {source.url && <a href={source.url} target="_blank" rel="noreferrer" className="small">🔗 Open source</a>}
        {editing ? (
          <>
            <div className="divider" />
            <Form
              cols={1}
              submitLabel="Save paper details"
              initial={{ title: draft.title, authors: draft.authors || '', year: draft.year || '', citation: draft.citation || '', doi: draft.doi || '', url: draft.url || '', read_status: draft.read_status, requirement_id: draft.requirement_id || '', tags: draft.tags || '' }}
              fields={[
                { name: 'title', label: 'Title', required: true },
                { name: 'authors', label: 'Authors' },
                { name: 'year', label: 'Year', type: 'number' },
                { name: 'citation', label: 'Citation (Harvard)' },
                { name: 'doi', label: 'DOI' },
                { name: 'url', label: 'URL' },
                { name: 'read_status', label: 'Status', options: STATUS_OPTS },
                { name: 'requirement_id', label: 'Requirement supported', options: [{ value: '', label: '—' }, ...reqs.map((r: any) => ({ value: r.id, label: r.title.slice(0, 70) }))] },
                { name: 'tags', label: 'Tags' },
              ]}
              onSubmit={async (v: any) => { setDraft((d: any) => ({ ...d, ...v })); await onUpdate(v); setEditing(false) }}
            />
          </>
        ) : (
          <div className="divider" />
        )}

        <div className="grid-2 mt-3">
          {sections.map(s => {
            const value = editing ? draft[s.k] : source[s.k]
            return (
              <div key={s.k} className="card-soft" style={{ padding: '.75rem 1rem' }}>
                <div style={{ fontWeight: 700 }}>{s.label}</div>
                {editing ? (
                  <textarea className="textarea mt-2" rows={4} placeholder={s.placeholder} value={value || ''}
                    onChange={e => setDraft({ ...draft, [s.k]: e.target.value })} />
                ) : (
                  value ? <p className="small mt-1 mb-0" style={{ whiteSpace: 'pre-wrap' }}>{value}</p> :
                    <p className="small muted mt-1 mb-0 italic">{s.placeholder}</p>
                )}
              </div>
            )
          })}
        </div>
        {editing && <div className="flex gap-2 mt-3"><button className="btn big" onClick={saveAll}>💾 Save all changes</button></div>}
      </div>

      <div className="card">
        <SectionHeader title={`📝 Notes & snippets (${notes.length})`} />
        <Form
          cols={1}
          label="➕ Add structured note"
          fields={[
            { name: 'category', label: 'Note kind', options: [
              { value: 'relevance', label: '🔗 Relevance' },
              { value: 'methodology', label: '🧪 Methodology point' },
              { value: 'findings', label: '📈 Finding' },
              { value: 'limitations', label: '⚠️ Limitation' },
              { value: 'citation', label: '📚 Citation detail' },
              { value: 'quotation', label: '💬 Quotation' },
              { value: 'interpretation', label: '💭 Interpretation' },
              { value: 'idea', label: '💡 Idea for your project' },
            ] },
            { name: 'title', label: 'Summary (one line)', required: true },
            { name: 'content', label: 'Full note', multi: true, required: true },
          ]}
          onSubmit={async v => { await onAddNote({ ...v, category: v.category }); }}
        />
        {notes.length > 0 && (
          <ul className="stack tight mt-3">
            {notes.map((n: any) => (
              <li key={n.id} className="card-soft" style={{ padding: '.75rem 1rem' }}>
                <div className="row between">
                  <div className="row" style={{ gap: '.4rem' }}>
                    <Tag tone={n.category === 'idea' ? 'acc' : n.category === 'limitations' ? 'warn' : n.category === 'findings' ? 'ok' : undefined}>{n.category}</Tag>
                    <span style={{ fontWeight: 600 }}>{n.title}</span>
                  </div>
                  <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => onDeleteNote(n.id)}>🗑</button>
                </div>
                {n.content && <p className="small muted mt-1 mb-0" style={{ whiteSpace: 'pre-wrap' }}>{n.content}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
