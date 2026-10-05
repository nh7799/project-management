import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { MotionConfig, motion } from 'framer-motion'
import type { Session } from '@supabase/supabase-js'
import { configured, supabase, ensureProfile } from './lib/supabase'
import { SettingsProvider, useSettings } from './lib/settings'
import Palette from './components/Palette'
const Home = lazy(() => import('./pages/Home'))
const Today = lazy(() => import('./pages/Today'))
const Tasks = lazy(() => import('./pages/Tasks'))
const Timeline = lazy(() => import('./pages/Timeline'))
const Handbook = lazy(() => import('./pages/Handbook'))
const Projects = lazy(() => import('./pages/Projects'))
const Decisions = lazy(() => import('./pages/Decisions'))
const Blockers = lazy(() => import('./pages/Blockers'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const Project = lazy(() => import('./pages/Project'))
const Evidence = lazy(() => import('./pages/Evidence'))
const Research = lazy(() => import('./pages/Research'))
const Journal = lazy(() => import('./pages/Journal'))
const Meetings = lazy(() => import('./pages/Meetings'))
const Risks = lazy(() => import('./pages/Risks'))
const Report = lazy(() => import('./pages/Report'))
const Profile = lazy(() => import('./pages/Profile'))
const More = lazy(() => import('./pages/More'))
import Auth from './pages/Auth'
const Checklist = lazy(() => import('./pages/Checklist'))
const Guide = lazy(() => import('./pages/Guide'))
import type { Task, Decision, Blocker } from './types'
import { AddForm, Modal } from './components/ui'

const BOTTOM_NAV = [
  { to: '/home',     emoji: '🏠', label: 'Today' },
  { to: '/project',  emoji: '🧭', label: 'Project' },
  { to: '/tasks',    emoji: '✅', label: 'Tasks' },
  { to: '/evidence', emoji: '🧾', label: 'Evidence' },
  { to: '/more',     emoji: '⋯',  label: 'More' },
]

const DESKTOP_NAV = [
  { group: 'Daily', items: [
    { to: '/home',     emoji: '🏠', label: 'Home / Today' },
    { to: '/today',    emoji: '☀️', label: 'Start / End Day' },
    { to: '/tasks',    emoji: '✅', label: 'Things to do' },
  ]},
  { group: 'Project', items: [
    { to: '/project',  emoji: '🧭', label: 'Phases & milestones' },
    { to: '/timeline', emoji: '📅', label: 'Timeline / deadlines' },
    { to: '/blockers', emoji: '🚧', label: 'Blockers' },
    { to: '/risks',    emoji: '⚠️', label: 'Risks' },
  ]},
  { group: 'Academic', items: [
    { to: '/evidence', emoji: '🧾', label: 'Evidence & map' },
    { to: '/research', emoji: '📚', label: 'Research workspace' },
    { to: '/journal',  emoji: '📓', label: 'Journal / logbook' },
    { to: '/decisions',emoji: '⚖️', label: 'Decisions log' },
    { to: '/meetings', emoji: '🤝', label: 'Meetings' },
    { to: '/report',   emoji: '📘', label: 'Report builder' },
  ]},
  { group: 'Resources', items: [
    { to: '/handbook', emoji: '📖', label: 'Handbook' },
    { to: '/checklist',emoji: '☑️', label: 'Master checklist' },
    { to: '/projects', emoji: '🗂️', label: 'Project ideas' },
    { to: '/profile',  emoji: '👤', label: 'Profile' },
    { to: '/settings', emoji: '🎨', label: 'Settings' },
    { to: '/more',     emoji: '⋯',  label: 'More / export' },
  ]},
]

const CAP: Record<string, { table: string; fields: Parameters<typeof AddForm>[0]['fields'] }> = {
  Task: { table: 'tasks', fields: [
    { name: 'title', label: 'Task title', required: true, placeholder: 'e.g. Draft problem statement' },
    { name: 'priority', label: 'Priority', options: [{ value: 'important', label: 'Important' }, { value: 'critical', label: 'Critical' }, { value: 'useful', label: 'Useful' }] },
    { name: 'tier', label: 'Scope', options: [{ value: 'core', label: 'Core (must do)' }, { value: 'important', label: 'Important' }, { value: 'optional', label: 'Optional' }, { value: 'stretch', label: 'Stretch' }] },
    { name: 'estimate_minutes', label: 'Estimate (minutes)', type: 'number', placeholder: 'e.g. 30' },
    { name: 'due', label: 'Due date', type: 'date' },
    { name: 'definition_of_done', label: 'Definition of done', multi: true, placeholder: 'What "finished" looks like for this task' },
    { name: 'why', label: 'Why this matters', multi: true, placeholder: 'Short reason' },
  ]},
  Decision: { table: 'decisions', fields: [
    { name: 'question', label: 'Question / problem', required: true, multi: true, placeholder: 'What needs deciding?' },
    { name: 'category', label: 'Category', options: ['technical','academic','method','scope','risk','schedule','architecture','tool','other'] },
    { name: 'chosen', label: 'Chosen option' },
    { name: 'reason', label: 'Rationale', multi: true },
    { name: 'alternatives', label: 'Alternatives considered', multi: true },
    { name: 'confidence', label: 'Confidence (1-5)', type: 'number' },
    { name: 'decided_on', label: 'Date', type: 'date' },
  ]},
  Blocker: { table: 'blockers', fields: [
    { name: 'title', label: 'What is blocking you?', required: true, multi: true },
    { name: 'blocker_type', label: 'Blocker type', options: [{ value: 'technical', label: 'Technical problem' }, { value: 'waiting_person', label: 'Waiting for a person' }, { value: 'waiting_info', label: 'Waiting for information' }, { value: 'unclear', label: 'Unclear instructions' }, { value: 'missing_resource', label: 'Missing resource' }, { value: 'too_difficult', label: 'Too difficult' }, { value: 'lack_of_time', label: 'Lack of time' }, { value: 'other', label: 'Other' }] },
    { name: 'severity', label: 'Severity', options: [{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }] },
    { name: 'next_action', label: 'Next step to unblock', multi: true },
  ]},
  Evidence: { table: 'evidence', fields: [
    { name: 'title', label: 'Evidence title', required: true },
    { name: 'type', label: 'Type', options: ['note','screenshot','document','commit','test','code','diagram','data','meeting','other'] },
    { name: 'description', label: 'Description', multi: true },
    { name: 'status', label: 'Evidence status', options: [{ value: 'draft', label: 'Draft' }, { value: 'captured', label: 'Captured' }, { value: 'verified', label: 'Verified' }] },
    { name: 'report_section', label: 'Report section', placeholder: 'e.g. Methodology' },
    { name: 'url', label: 'URL / location', placeholder: 'Optional link' },
  ]},
  Journal: { table: 'journal_entries', fields: [
    { name: 'template', label: 'Template', options: [{ value: 'general', label: 'General note' }, { value: 'development', label: 'Development session' }, { value: 'experiment', label: 'Experiment' }, { value: 'meeting', label: 'Meeting notes' }] },
    { name: 'activity', label: 'Title / activity', required: true },
    { name: 'objective', label: 'Objective', multi: true, placeholder: 'What you wanted to achieve' },
    { name: 'happened', label: 'What happened', multi: true },
    { name: 'interpretation', label: 'Interpretation / learning', multi: true },
    { name: 'next_action', label: 'Next action' },
    { name: 'entry_date', label: 'Date', type: 'date' },
  ]},
  Meeting: { table: 'meetings', fields: [
    { name: 'meeting_type', label: 'Type', options: [{ value: 'supervisor', label: 'Supervisor' }, { value: 'planning', label: 'Planning' }, { value: 'review', label: 'Review' }, { value: 'other', label: 'Other' }] },
    { name: 'meeting_date', label: 'Date', type: 'date', required: true },
    { name: 'agenda', label: 'Agenda', multi: true },
    { name: 'status', label: 'Status', options: [{ value: 'upcoming', label: 'Upcoming' }, { value: 'held', label: 'Held' }, { value: 'archived', label: 'Archived' }] },
  ]},
}

function Capture({ onClose }: { onClose: () => void }) {
  const [t, setT] = useState<keyof typeof CAP>('Task')
  const [err, setErr] = useState('')
  const keys = Object.keys(CAP) as (keyof typeof CAP)[]
  return (
    <Modal open title="Quick capture" onClose={onClose}>
      <div className="flex flex-wrap gap-2 mb-3">
        {keys.map(k => <button key={k} className="pill" aria-pressed={t === k} onClick={() => { setT(k); setErr('') }}>{k}</button>)}
      </div>
      {err && <div className="danger mb-3">{err}</div>}
      <AddForm key={t} label={`Save ${t.toLowerCase()}`} fields={CAP[t].fields}
        onAdd={async (v: any) => {
          const { error } = await supabase.from(CAP[t].table).insert(v)
          if (error) setErr(error.message)
          else { setErr(''); onClose() }
        }} />
    </Modal>
  )
}

function TopBar({ onPalette, onCapture, profileTitle, signOut }: { onPalette: () => void; onCapture: () => void; profileTitle?: string; signOut: () => void }) {
  return (
    <div className="topbar">
      <div className="col" style={{ flex: 1, gap: 0 }}>
        <div className="htitle sm" style={{ fontWeight: 800 }}>🚀 Mission Control</div>
        <div className="small muted">{profileTitle || 'Final-Year Project OS'}</div>
      </div>
      <button className="pill sm" onClick={onPalette} title="Search everything (Ctrl+K)">🔍 <span className="small hidden sm:inline">Search</span> <span className="kbd hidden sm:inline">Ctrl K</span></button>
      <button className="btn sm" onClick={onCapture}>＋ Capture</button>
      <button className="icon-btn" aria-label="Sign out" onClick={signOut} title="Sign out">⎋</button>
    </div>
  )
}

function Shell() {
  const [cap, setCap] = useState(false)
  const [pal, setPal] = useState(false)
  const loc = useLocation()
  const { s } = useSettings()
  const nav = useNavigate()

  const { rows: profiles } = useMini<any>('profiles')
  const profile = profiles[0]

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPal(p => !p) }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); setCap(c => !c) }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])

  const signOut = async () => {
    if (confirm('Sign out of Mission Control?')) await supabase.auth.signOut()
  }

  return (
    <MotionConfig reducedMotion={s.motion ? 'user' : 'always'}>
      <aside className="nav-desktop">
        <div className="mb-2 px-2">
          <div className="htitle sm">🚀 Mission Control</div>
          <div className="tiny muted">Final-Year Project OS</div>
          {profile?.project_title && <div className="tiny muted mt-1" style={{ lineHeight: 1.3 }}>{profile.project_title}</div>}
        </div>
        <button className="nav-item mb-2" onClick={() => setPal(true)}>🔍 Search <span className="kbd ml-auto">Ctrl K</span></button>
        {DESKTOP_NAV.map(g => (
          <div key={g.group} className="mb-3">
            <div className="hsection px-2 mt-2">{g.group}</div>
            {g.items.map(it => (
              <NavLink key={it.to} to={it.to} className={({ isActive }) => 'nav-item ' + (isActive ? 'active' : '')}>
                <span className="emoji">{it.emoji}</span><span className="flex-1">{it.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
        <button className="nav-item mt-auto" onClick={signOut}>⎋ Sign out</button>
      </aside>

      <TopBar onPalette={() => setPal(true)} onCapture={() => setCap(true)} profileTitle={profile?.project_title} signOut={signOut} />

      <nav className="bottom-nav" aria-label="Primary">
        {BOTTOM_NAV.map(n => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => 'bnav-btn ' + (isActive ? 'active' : '')}>
            <span className="emoji">{n.emoji}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="app-main">
        <motion.div key={loc.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
          <Suspense fallback={<div role="status" aria-live="polite" className="muted" style={{padding:"2rem"}}>Loading this page…</div>}>
<Routes location={loc}>
            <Route path="/" element={<Navigate to="/home" />} />
            <Route path="/home" element={<Home />} />
            <Route path="/today" element={<Today />} />
            <Route path="/project" element={<Project />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/evidence" element={<Evidence />} />
            <Route path="/research" element={<Research />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/decisions" element={<Decisions />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/blockers" element={<Blockers />} />
            <Route path="/risks" element={<Risks />} />
            <Route path="/report" element={<Report />} />
            <Route path="/handbook" element={<Handbook />} />
            <Route path="/checklist" element={<Checklist />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/more" element={<More />} />
            <Route path="*" element={<Navigate to="/home" />} />
          </Routes>
</Suspense>
        </motion.div>
      </main>

      <div className="fab">
        <button className="btn big" style={{ borderRadius: 999, padding: '.9rem 1.1rem', boxShadow: '0 6px 18px rgba(0,0,0,.22)' }} onClick={() => setCap(true)} aria-label="Quick capture">＋</button>
      </div>

      {cap && <Capture onClose={() => setCap(false)} />}
      {pal && <Palette onClose={() => setPal(false)} />}
    </MotionConfig>
  )
}

import { useRows } from './hooks/useRows'
function useMini<T extends { id: string }>(t: string) { return useRows<T>(t, 'created_at', false) }

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!configured) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user?.id) ensureProfile(data.session.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s?.user?.id) ensureProfile(s.user.id)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <SettingsProvider>
      {!configured ? (
        <div className="max-w-xl mx-auto mt-20 p-4">
          <div className="card">
            <h1 className="htitle sm mb-2">Supabase not configured</h1>
            <p className="muted">
              Set <code className="kbd">VITE_SUPABASE_URL</code> and{' '}
              <code className="kbd">VITE_SUPABASE_PUBLISHABLE_KEY</code> in{' '}
              <code className="kbd">.env.local</code> (or Vercel environment variables).
              Then run the SQL migrations in <code>supabase/migrations</code> and rebuild.
            </p>
            <p className="muted small mt-3">You can still build the application locally — data features will be disabled but the UI is fully visible.</p>
          </div>
        </div>
      ) : loading ? (
        <div className="p-8 text-center muted"><div className="htitle sm mb-2">Loading Mission Control…</div></div>
      ) : !session ? (
        <Auth />
      ) : (
        <BrowserRouter><Shell /></BrowserRouter>
      )}
    </SettingsProvider>
  )
}
