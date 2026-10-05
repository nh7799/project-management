import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRows } from '../hooks/useRows'
import { JournalEntry } from '../types'
import { H, Title, Pill, Form, Empty, Card, Tag, Divider, stagger, Err } from '../components/ui'

const TEMPLATES = [
  { id: 'general', label: '📝 General', fields: ['reflection', 'insights', 'next_steps'] },
  { id: 'experiment', label: '🔬 Experiment', fields: ['hypothesis', 'method', 'results', 'analysis', 'conclusion'] },
  { id: 'development', label: '💻 Development', fields: ['goal', 'approach', 'implementation', 'testing', 'issues', 'outcome'] },
  { id: 'meeting', label: '👥 Meeting', fields: ['attendees', 'agenda', 'discussion', 'decisions', 'actions', 'follow_up'] },
] as const

const FIELD_LABELS: Record<string, string> = {
  reflection: 'What happened today?',
  insights: 'Key insights or lessons',
  next_steps: 'Next steps planned',
  hypothesis: 'Hypothesis',
  method: 'Method / procedure',
  results: 'Results collected',
  analysis: 'Data analysis',
  conclusion: 'Conclusion',
  goal: 'Development goal',
  approach: 'Approach / design',
  implementation: 'Implementation details',
  testing: 'Testing done',
  issues: 'Issues encountered',
  outcome: 'Final outcome',
  attendees: 'Attendees',
  agenda: 'Agenda items',
  discussion: 'Discussion notes',
  decisions: 'Decisions made',
  actions: 'Action items',
  follow_up: 'Follow-up required',
}

export default function Journal() {
  const { rows: entries, loading, error, add, update, remove } = useRows<JournalEntry>('journal_entries')
  const [template, setTemplate] = useState<JournalEntry['template']>('general')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const selected = useMemo(() => entries.find(e => e.id === selectedId), [entries, selectedId])

  const tmplFields = TEMPLATES.find(t => t.id === template)?.fields ?? []

  const filtered = useMemo(() => entries.filter(e => {
    if (!search) return true
    const s = search.toLowerCase()
    return Object.values(e).some(v => String(v ?? '').toLowerCase().includes(s))
  }), [entries, search])

  const createEntry = async (data: Record<string, unknown>) => {
    const content: Record<string, string> = {}
    tmplFields.forEach(f => { content[f] = String(data[f] ?? '') })
    await add({
      template,
      title: String(data.title || 'Untitled entry'),
      content,
      tags: String(data.tags || '').split(',').map(s => s.trim()).filter(Boolean),
      mood: String(data.mood || 'neutral'),
      entry_date: new Date().toISOString().slice(0, 10),
    } as unknown as JournalEntry)
  }

  const updateField = (field: string, val: string) => {
    if (!selected) return
    const content = { ...(selected.content as Record<string, string>), [field]: val }
    void update(selected.id, { content })
  }

  if (error) return <Err e={error} />

  return (
    <div className="stack">
      <Title
        eyebrow="§13 Knowledge Capture"
        title="Research & Project Journal"
        subtitle="Capture daily reflections, experiments, development notes, and meeting records."
      >
        <div className="row wrap gap-2">
          <Pill tone="info">{entries.length} entries</Pill>
          <Pill tone="good">{entries.filter(e => e.template === 'experiment').length} experiments</Pill>
          <Pill tone="warn">{entries.filter(e => e.template === 'meeting').length} meetings</Pill>
        </div>
      </Title>

      <div className="card-soft">
        <div className="row between wrap gap-2 mb-3">
          <div className="hsection">📌 New journal entry</div>
          <div className="tabs scroll-x">
            {TEMPLATES.map(t => (
              <button key={t.id} className={template === t.id ? 'on' : ''} onClick={() => setTemplate(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <Form
          initial={{
            title: '',
            tags: '',
            mood: 'neutral',
            ...Object.fromEntries(tmplFields.map(f => [f, ''])),
          }}
          onSubmit={createEntry}
          submitLabel="Save entry"
          cols={1}
          fields={[
            { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Brief summary of this entry' },
            { key: 'tags', label: 'Tags (comma-separated)', type: 'text', placeholder: 'chapter3, methodology, sprint2' },
            { key: 'mood', label: 'Mood / state', type: 'select', options: [
              { value: 'great', label: '🤩 Great — making excellent progress' },
              { value: 'good', label: '🙂 Good — steady progress' },
              { value: 'neutral', label: '😐 Neutral — mixed or routine' },
              { value: 'frustrated', label: '😤 Frustrated — stuck or blocked' },
              { value: 'overwhelmed', label: '😵‍💫 Overwhelmed — too much at once' },
              { value: 'tired', label: '😴 Tired — need a break' },
            ] },
            ...tmplFields.map(f => ({
              key: f, label: FIELD_LABELS[f] ?? f, type: 'textarea' as const, rows: 3,
            })),
          ]}
        />
      </div>

      <Card>
        <div className="row between wrap gap-2">
          <H size="h3">📚 Entry library</H>
          <input
            className="input sm" style={{ maxWidth: 260 }}
            placeholder="Search entries…" value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Divider />
        {loading ? <Empty icon="⏳" title="Loading journal…" /> :
         filtered.length === 0 ? <Empty icon="📝" title="No entries yet" subtitle="Write your first entry above to start building your logbook evidence trail." /> :
        <motion.div variants={stagger} initial="initial" animate="animate" className="stack sm">
          {filtered.map(e => (
            <motion.div key={e.id} variants={stagger.children} layout
              className="card-soft"
              style={{ borderLeft: '4px solid var(--accent)' }}
            >
              <div className="row between wrap gap-2">
                <div>
                  <div className="row gap-2 wrap">
                    <button className="link" onClick={() => setSelectedId(selectedId === e.id ? null : e.id)}>
                      <H size="h4" inline>{e.title}</H>
                    </button>
                    <Tag tone="acc">{String(e.entry_date ?? '').slice(0, 10)}</Tag>
                    <Tag tone="info">{TEMPLATES.find(t => t.id === e.template)?.label ?? e.template}</Tag>
                    <Tag tone="muted">{e.mood}</Tag>
                  </div>
                  <div className="muted sm mt-1">
                    {Object.values(e.content as Record<string, string> ?? {}).slice(0,1).join(' ').slice(0,120)}
                    {(Object.values(e.content as Record<string, string> ?? {}).join(' ').length > 120) ? '…' : ''}
                  </div>
                  {Array.isArray(e.tags) && e.tags.length > 0 && (
                    <div className="row wrap gap-1 mt-2">
                      {e.tags.map((t,i) => <span key={i} className="pill sm muted">#{t}</span>)}
                    </div>
                  )}
                </div>
                <button className="btn ghost sm" onClick={() => remove(e.id)}>Delete</button>
              </div>

              <AnimatePresence>
                {selectedId === e.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <Divider />
                    <div className="grid-1 mt-2" style={{ gridTemplateColumns: '1fr' }}>
                      {(TEMPLATES.find(t => t.id === e.template)?.fields ?? []).map(f => (
                        <div key={f}>
                          <label className="label">{FIELD_LABELS[f] ?? f}</label>
                          <textarea
                            className="textarea" rows={3}
                            value={(e.content as Record<string, string> ?? {})[f] ?? ''}
                            onChange={ev => {
                              if (selected?.id === e.id) updateField(f, ev.target.value)
                              else void update(e.id, { content: { ...(e.content as Record<string, string>), [f]: ev.target.value } })
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>}
      </Card>
    </div>
  )
}
