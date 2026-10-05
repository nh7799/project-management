import { useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { configured, supabase } from './lib/supabase'
import { SettingsProvider } from './lib/settings'
import { AddForm } from './components/ui'
import Auth from './pages/Auth'
import Guide from './pages/Guide'
import Today from './pages/Today'
import Timeline from './pages/Timeline'
import Tasks from './pages/Tasks'
import Decisions from './pages/Decisions'
import Blockers from './pages/Blockers'
import SettingsPage from './pages/Settings'
const NAV: [string, string, string][] = [['guide', '🧭', 'Guide'], ['today', '☀️', 'Today'], ['timeline', '📅', 'Timeline'], ['tasks', '✅', 'Tasks'], ['decisions', '⚖️', 'Decisions'], ['blockers', '🚧', 'Blockers'], ['settings', '🎨', 'Settings']]
const CAP: Record<string, { table: string; fields: Parameters<typeof AddForm>[0]['fields'] }> = {
  Task: { table: 'tasks', fields: [{ name: 'title', label: 'Task', required: true }, { name: 'tier', label: 'Scope', options: ['core', 'important', 'optional', 'stretch'] }] },
  Decision: { table: 'decisions', fields: [{ name: 'question', label: 'Question', required: true }, { name: 'chosen', label: 'Chosen' }, { name: 'reason', label: 'Reason' }] },
  Blocker: { table: 'blockers', fields: [{ name: 'title', label: 'Blocker', required: true }, { name: 'severity', label: 'Severity', options: ['medium', 'low', 'high'] }] } }
function Capture({ onClose }: { onClose: () => void }) {
  const [t, setT] = useState('Task'); const [err, setErr] = useState('')
  return <div className="fixed inset-0 z-20 grid place-items-center p-4" style={{ background: 'rgba(0,0,0,.5)' }} onClick={onClose}><div className="card pop w-full max-w-lg" onClick={e => e.stopPropagation()} role="dialog" aria-label="Quick capture">
    <div className="flex gap-2 mb-3">{Object.keys(CAP).map(k => <button key={k} className="pill" aria-pressed={t === k} onClick={() => setT(k)}>{k}</button>)}<button className="ml-auto" onClick={onClose} aria-label="Close">✕</button></div>
    {err && <p className="danger mb-2">{err}</p>}
    <AddForm key={t} label={`Save ${t.toLowerCase()}`} fields={CAP[t].fields} onAdd={async v => { const { error } = await supabase.from(CAP[t].table).insert(v); if (error) setErr(error.message); else onClose() }} /></div></div>
}
function Shell() {
  const [cap, setCap] = useState(false)
  return <><aside className="hidden md:flex fixed inset-y-0 left-0 w-56 flex-col gap-1 p-3 border-r" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
      <div className="font-bold p-2">Mission Control</div>
      {NAV.map(([p, e, l]) => <NavLink key={p} to={'/' + p} className="rounded-xl px-3 py-2" style={({ isActive }) => ({ background: isActive ? 'var(--surface2)' : 'transparent', fontWeight: isActive ? 700 : 400 })}>{e} {l}</NavLink>)}
      <button className="mt-auto text-left px-3 py-2 text-slate-400" onClick={() => supabase.auth.signOut()}>Sign out</button></aside>
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-10 flex justify-around py-1 border-t text-xs" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
      {NAV.slice(0, 5).concat(NAV.slice(6)).map(([p, e, l]) => <NavLink key={p} to={'/' + p} className="text-center px-1" style={({ isActive }) => ({ fontWeight: isActive ? 700 : 400 })}><div>{e}</div>{l}</NavLink>)}</nav>
    <main className="md:ml-56 max-w-3xl mx-auto p-5 pb-32"><Routes><Route path="/" element={<Navigate to="/guide" />} /><Route path="/guide" element={<Guide />} /><Route path="/today" element={<Today />} /><Route path="/timeline" element={<Timeline />} /><Route path="/tasks" element={<Tasks />} /><Route path="/decisions" element={<Decisions />} /><Route path="/blockers" element={<Blockers />} /><Route path="/settings" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/guide" />} /></Routes></main>
    <button className="btn big fixed bottom-20 md:bottom-6 right-5 z-10 rounded-full" onClick={() => setCap(true)} aria-label="Quick capture" style={{ boxShadow: '0 4px 14px rgba(0,0,0,.25)' }}>＋ Capture</button>
    {cap && <Capture onClose={() => { setCap(false); location.reload() }} />}</>
}
export default function App() {
  const [session, setSession] = useState<Session | null>(null); const [loading, setLoading] = useState(true)
  useEffect(() => { if (!configured) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s)); return () => sub.subscription.unsubscribe() }, [])
  return <SettingsProvider>{!configured ? <div className="max-w-xl mx-auto mt-24 p-4"><h1 className="text-2xl font-bold mb-2">Supabase not configured</h1><p>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> (in <code>.env.local</code> or Vercel), run the SQL migrations, and rebuild.</p></div>
    : loading ? <p className="p-6">Loading…</p> : !session ? <Auth /> : <BrowserRouter><Shell /></BrowserRouter>}</SettingsProvider>
}
