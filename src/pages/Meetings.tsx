import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRows } from '../hooks/useRows'
import { Meeting } from '../types'
import { H, Title, Pill, Form, Empty, Card, Tag, Divider, stagger, Err } from '../components/ui'

const KINDS = ['supervisor','planning','review','other'] as const
const STATUSES = ['upcoming','held','archived'] as const

export default function Meetings() {
  const { rows: meetings, loading, error, add, update, remove } = useRows<Meeting>('meetings')
  const [tab, setTab] = useState<Meeting['status']>('upcoming')

  const filtered = useMemo(() => meetings.filter(m => m.status === tab).sort((a,b) =>
    (a.meeting_date || '').localeCompare(b.meeting_date || '')
  ), [meetings, tab])

  const stats = useMemo(() => ({
    upcoming: meetings.filter(m => m.status === 'upcoming').length,
    held: meetings.filter(m => m.status === 'held').length,
    archived: meetings.filter(m => m.status === 'archived').length,
    supervisor: meetings.filter(m => m.kind === 'supervisor').length,
  }), [meetings])

  const generateBrief = (m: Meeting) => {
    const lines = [
      `# Meeting Brief — ${m.title}`,
      `Date: ${m.meeting_date}${m.location ? ' • Location/Link: ' + m.location : ''}`,
      '',
      '## Pre-meeting preparation',
      '1. Review last meeting actions and carry forward open items',
      '2. Draft the agenda items below in priority order',
      '3. For each agenda item prepare: context + your question + possible options',
      '',
      '## Agenda',
      m.agenda ? m.agenda.split('\n').map((x,i) => `${i+1}. ${x}`).join('\n') : '(Add agenda items to generate this section)',
      '',
      '## Items to bring',
      '- Draft outputs ready for feedback (links to evidence)',
      '- Specific questions you want answered',
      '- Progress vs. plan summary',
    ]
    return lines.join('\n')
  }

  const generateJournalEntry = async (m: Meeting) => {
    const lines = [
      `Meeting: ${m.title}`,
      '',
      `Attendees: ${m.attendees ?? '(add attendees)'}`,
      '',
      'Discussion:',
      m.discussion ?? '(record discussion during meeting)',
      '',
      'Feedback received:',
      m.feedback ?? '(capture supervisor feedback here)',
      '',
      'Decisions:',
      m.decisions ?? '(note decisions made)',
      '',
      'Action items:',
      m.actions ?? '(assign owners + deadlines to each action)',
      '',
      'Questions to answer before next meeting:',
      m.questions_next ?? '(open questions)',
    ]
    const { createClient } = await import('../lib/supabase')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('journal_entries').insert({
        user_id: user.id,
        title: `📝 Notes: ${m.title} (${String(m.meeting_date ?? '').slice(0,10)})`,
        template: 'meeting',
        entry_date: new Date().toISOString().slice(0,10),
        mood: 'good',
        tags: ['meeting', m.kind],
        content: {
          attendees: m.attendees ?? '',
          agenda: m.agenda ?? '',
          discussion: m.discussion ?? '',
          decisions: m.decisions ?? '',
          actions: m.actions ?? '',
          follow_up: m.questions_next ?? '',
        },
      })
    }
    alert('Journal entry auto-generated from meeting record ✅')
  }

  if (error) return <Err e={error} />

  return (
    <div className="stack">
      <Title
        eyebrow="§33 Supervisor & Team Meetings"
        title="Meetings"
        subtitle="Agenda → record → actions → journal. Never leave a meeting wondering what you agreed."
      >
        <div className="row wrap gap-2">
          <Pill tone="warn">{stats.upcoming} upcoming</Pill>
          <Pill tone="good">{stats.held} held</Pill>
          <Pill tone="info">{stats.supervisor} supervisor meetings</Pill>
        </div>
      </Title>

      <div className="card-soft">
        <div className="hsection mb-3">📅 Schedule a meeting</div>
        <Form
          initial={{
            title: '', kind: 'supervisor', status: 'upcoming',
            meeting_date: '', duration_minutes: '60', location: '', attendees: '',
            agenda: '', pre_meeting_tasks: '',
            discussion: '', feedback: '', decisions: '', actions: '', questions_next: '',
          }}
          onSubmit={async (d) => {
            await add({
              title: String(d.title),
              kind: String(d.kind) as Meeting['kind'],
              status: String(d.status) as Meeting['status'],
              meeting_date: String(d.meeting_date || new Date().toISOString().slice(0,10)),
              duration_minutes: parseInt(String(d.duration_minutes),10) || 60,
              location: String(d.location || null) || null,
              attendees: String(d.attendees || null) || null,
              agenda: String(d.agenda || null) || null,
              pre_meeting_tasks: String(d.pre_meeting_tasks || null) || null,
              discussion: String(d.discussion || null) || null,
              feedback: String(d.feedback || null) || null,
              decisions: String(d.decisions || null) || null,
              actions: String(d.actions || null) || null,
              questions_next: String(d.questions_next || null) || null,
            } as unknown as Meeting)
          }}
          submitLabel="Schedule meeting"
          cols={2}
          fields={[
            { key: 'title', label: 'Meeting title', type: 'text', required: true, colSpan: 2 },
            { key: 'kind', label: 'Type', type: 'select', options: [
              { value: 'supervisor', label: '👨‍🏫 Supervisor' },
              { value: 'planning', label: '🗓️ Planning' },
              { value: 'review', label: '🔍 Review / milestone' },
              { value: 'other', label: '📌 Other' },
            ] },
            { key: 'status', label: 'Status', type: 'select', options: STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase()+s.slice(1) })) },
            { key: 'meeting_date', label: 'Date', type: 'date' },
            { key: 'duration_minutes', label: 'Duration (min)', type: 'number', min: 15, step: 15 },
            { key: 'location', label: 'Location / video link', type: 'text' },
            { key: 'attendees', label: 'Attendees', type: 'text', placeholder: 'Supervisor name + others', colSpan: 2 },
            { key: 'pre_meeting_tasks', label: 'Pre-meeting tasks (one per line)', type: 'textarea', rows: 2, colSpan: 2 },
            { key: 'agenda', label: 'Agenda items (one per line)', type: 'textarea', rows: 3, colSpan: 2 },
          ]}
        />
      </div>

      <Card>
        <div className="row between wrap gap-2">
          <H size="h3">🗂️ Meetings</H>
          <div className="tabs scroll-x">
            {STATUSES.map(s => (
              <button key={s} className={tab === s ? 'on' : ''} onClick={() => setTab(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)} ({meetings.filter(m => m.status === s).length})
              </button>
            ))}
          </div>
        </div>
        <Divider />
        {loading ? <Empty icon="⏳" title="Loading…" /> :
         filtered.length === 0 ? <Empty icon="📅" title={`No ${tab} meetings`} subtitle="Schedule your first meeting above, e.g. a weekly supervisor meeting." /> :
        <motion.div variants={stagger} initial="initial" animate="animate" className="stack sm">
          {filtered.map(m => (
            <motion.div key={m.id} variants={stagger.children} className="card-soft">
              <div className="row between wrap gap-2 mb-2">
                <div className="row wrap gap-2">
                  <H size="h4" inline>{m.title}</H>
                  <Tag tone="acc">{m.meeting_date ?? 'TBD'}</Tag>
                  {m.duration_minutes && <Tag tone="muted">{m.duration_minutes}m</Tag>}
                  <Tag tone="info">{m.kind}</Tag>
                  <Tag tone={m.status === 'upcoming' ? 'warn' : m.status === 'held' ? 'good' : 'muted'}>{m.status}</Tag>
                  {m.location && <Tag tone="muted">📍{m.location}</Tag>}
                </div>
                <div className="row wrap gap-1">
                  {m.status === 'upcoming' && (
                    <>
                      <button className="btn ghost sm" onClick={() => {
                        void navigator.clipboard?.writeText(generateBrief(m))
                        alert('📋 Meeting brief copied to clipboard (paste into editor/email)')
                      }}>📋 Copy brief</button>
                      <button className="btn sm" onClick={() => void update(m.id, { status: 'held', meeting_date: new Date().toISOString().slice(0,10) })}>
                        ✓ Mark held
                      </button>
                    </>
                  )}
                  {m.status === 'held' && (
                    <>
                      <button className="btn good sm" onClick={() => generateJournalEntry(m)}>📓 → Journal entry</button>
                      <button className="btn ghost sm" onClick={() => void update(m.id, { status: 'archived' })}>Archive</button>
                    </>
                  )}
                  <button className="btn ghost sm" onClick={() => remove(m.id)}>Delete</button>
                </div>
              </div>
              {m.attendees && <div className="muted sm mb-2">👥 {m.attendees}</div>}
              <div className="grid-2">
                {m.pre_meeting_tasks && (
                  <div>
                    <div className="label">Pre-meeting tasks</div>
                    <ul className="list ml-4">{m.pre_meeting_tasks.split('\n').filter(Boolean).map((x,i)=><li key={i}>{x}</li>)}</ul>
                  </div>
                )}
                {m.agenda && (
                  <div>
                    <div className="label">Agenda</div>
                    <ul className="list ml-4">{m.agenda.split('\n').filter(Boolean).map((x,i)=><li key={i}>{x}</li>)}</ul>
                  </div>
                )}
                {(m.status === 'held' || m.status === 'archived') && (
                  <>
                    <div>
                      <label className="label">Discussion notes</label>
                      <textarea className="textarea" rows={3} value={m.discussion ?? ''}
                        onChange={e => void update(m.id, { discussion: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Feedback received</label>
                      <textarea className="textarea" rows={3} value={m.feedback ?? ''}
                        onChange={e => void update(m.id, { feedback: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Decisions made</label>
                      <textarea className="textarea" rows={2} value={m.decisions ?? ''}
                        onChange={e => void update(m.id, { decisions: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Action items + owners + deadlines</label>
                      <textarea className="textarea" rows={3} value={m.actions ?? ''}
                        onChange={e => void update(m.id, { actions: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                      <label className="label">Open questions for next meeting</label>
                      <textarea className="textarea" rows={2} value={m.questions_next ?? ''}
                        onChange={e => void update(m.id, { questions_next: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>}
      </Card>
    </div>
  )
}
