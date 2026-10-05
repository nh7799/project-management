import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SECS, DATES } from '../data/handbook'
import list from '../data/projects.json'
import { useRows } from '../hooks/useRows'

type R = { label: string; sub: string; to: string; type: string }
const PAGES: R[] = [
  { to: '/home',     label: 'Home / Today dashboard', sub: 'Page', type: 'page' },
  { to: '/today',    label: 'Start / End my day', sub: 'Page', type: 'page' },
  { to: '/project',  label: 'Project phases & milestones', sub: 'Page', type: 'page' },
  { to: '/tasks',    label: 'Things to do', sub: 'Page', type: 'page' },
  { to: '/timeline', label: 'Timeline & deadlines', sub: 'Page', type: 'page' },
  { to: '/evidence', label: 'Evidence library & map', sub: 'Page', type: 'page' },
  { to: '/research', label: 'Research workspace', sub: 'Page', type: 'page' },
  { to: '/journal',  label: 'Journal / logbook', sub: 'Page', type: 'page' },
  { to: '/decisions',label: 'Decisions log', sub: 'Page', type: 'page' },
  { to: '/meetings', label: 'Meetings', sub: 'Page', type: 'page' },
  { to: '/blockers', label: 'Blockers', sub: 'Page', type: 'page' },
  { to: '/risks',    label: 'Risks', sub: 'Page', type: 'page' },
  { to: '/report',   label: 'Report builder', sub: 'Page', type: 'page' },
  { to: '/handbook', label: 'Handbook reference', sub: 'Page', type: 'page' },
  { to: '/checklist',label: 'Master checklist', sub: 'Page', type: 'page' },
  { to: '/projects', label: 'Project ideas library', sub: 'Page', type: 'page' },
  { to: '/profile',  label: 'Project profile', sub: 'Page', type: 'page' },
  { to: '/settings', label: 'Settings', sub: 'Page', type: 'page' },
  { to: '/more',     label: 'More / export', sub: 'Page', type: 'page' },
]

export default function Palette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const tasks = useRows<any>('tasks', 'created_at', false)
  const decisions = useRows<any>('decisions', 'created_at', false)
  const evidence = useRows<any>('evidence', 'created_at', false)
  const meetings = useRows<any>('meetings', 'meeting_date', true)
  const journal = useRows<any>('journal_entries', 'entry_date', true)
  const requirements = useRows<any>('requirements', 'created_at', false)
  const research = useRows<any>('research_sources', 'created_at', false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const res = useMemo(() => {
    const s = q.trim().toLowerCase()
    const pages = PAGES.filter(p => !s || p.label.toLowerCase().includes(s))
    const hb: R[] = SECS.flatMap(x =>
      x.items.filter(i => !s || (i.t + (i.d || '')).toLowerCase().includes(s)).slice(0, 6).map(i => ({
        label: i.t, sub: 'Handbook · ' + x.title, to: `/handbook?q=${encodeURIComponent(i.t)}`, type: 'handbook'
      }))
    )
    const dt: R[] = DATES.filter(d => !s || d.t.toLowerCase().includes(s)).slice(0, 5).map(d => ({
      label: d.t, sub: `Deadline · ${d.d}`, to: '/handbook?sec=dates', type: 'date'
    }))
    const pj: R[] = (list as { id: string; title: string; year: string }[])
      .filter(p => !s || p.title.toLowerCase().includes(s)).slice(0, 5)
      .map(p => ({ label: p.title, sub: 'Project idea · ' + p.year, to: `/projects?q=${encodeURIComponent(p.title)}`, type: 'project' }))
    const tk: R[] = tasks.rows.filter(t => !s || String(t.title + (t.description || '')).toLowerCase().includes(s)).slice(0, 6)
      .map(t => ({ label: t.title, sub: 'Task · ' + (t.tier || ''), to: '/tasks', type: 'task' }))
    const dc: R[] = decisions.rows.filter(r => !s || JSON.stringify(r).toLowerCase().includes(s)).slice(0, 4)
      .map(r => ({ label: r.question, sub: 'Decision', to: '/decisions', type: 'decision' }))
    const ev: R[] = evidence.rows.filter(e => !s || String(e.title + (e.description || '')).toLowerCase().includes(s)).slice(0, 4)
      .map(e => ({ label: e.title, sub: 'Evidence · ' + e.type, to: '/evidence', type: 'evidence' }))
    const mt: R[] = meetings.rows.filter(m => !s || String(m.agenda || m.feedback || '').toLowerCase().includes(s)).slice(0, 4)
      .map(m => ({ label: `${m.meeting_type || 'Meeting'} · ${m.meeting_date || ''}`, sub: 'Meeting', to: '/meetings', type: 'meeting' }))
    const jn: R[] = journal.rows.filter(j => !s || JSON.stringify(j).toLowerCase().includes(s)).slice(0, 4)
      .map(j => ({ label: j.activity || `Entry ${j.entry_date}`, sub: 'Journal · ' + (j.template || ''), to: '/journal', type: 'journal' }))
    const rq: R[] = requirements.rows.filter(r => !s || String(r.title + (r.description || '')).toLowerCase().includes(s)).slice(0, 4)
      .map(r => ({ label: r.title, sub: 'Requirement · ' + (r.type || ''), to: '/evidence', type: 'requirement' }))
    const rs: R[] = research.rows.filter(r => !s || String(r.title + (r.authors || '')).toLowerCase().includes(s)).slice(0, 4)
      .map(r => ({ label: r.title, sub: 'Research paper · ' + (r.year || ''), to: '/research', type: 'research' }))
    return [
      ...pages.slice(0, 10),
      ...hb, ...dt, ...pj, ...tk, ...dc, ...ev, ...mt, ...jn, ...rq, ...rs,
    ].slice(0, 40)
  }, [q, tasks.rows, decisions.rows, evidence.rows, meetings.rows, journal.rows, requirements.rows, research.rows])

  const go = (r: R) => { nav(r.to); onClose() }
  const typeIcon: Record<string, string> = { page: '📄', handbook: '📖', date: '📅', project: '💡', task: '✅', decision: '⚖️', evidence: '🧾', meeting: '🤝', journal: '📓' }

  return (
    <div className="backdrop" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: -8, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="card" style={{ width: '100%', maxWidth: 640, maxHeight: '80vh', overflow: 'auto', padding: '.9rem' }} onClick={e => e.stopPropagation()} role="dialog" aria-label="Search everything">
        <input autoFocus className="input" placeholder="Search pages, tasks, decisions, evidence, handbook, projects, meetings, journal…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && res[0] && go(res[0])} />
        <ul className="mt-3 max-h-[60vh] overflow-auto" style={{ listStyle: 'none', padding: 0 }}>
          {res.map((r, i) => (
            <li key={r.to + r.label + i}>
              <button className="w-full text-left rounded-xl px-3 py-2 flex gap-3 items-start" style={{ alignItems: 'center' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                onClick={() => go(r)}>
                <span style={{ fontSize: '1.1rem' }}>{typeIcon[r.type] || '🔎'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</div>
                  <div className="small muted">{r.sub}</div>
                </div>
              </button>
            </li>
          ))}
          {!res.length && <li className="p-4 text-center muted">No matches yet. Try a word from the handbook, a task, or a page name.</li>}
        </ul>
      </motion.div>
    </div>
  )
}
