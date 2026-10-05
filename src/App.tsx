import { useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { configured, supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Today from './pages/Today'
import Timeline from './pages/Timeline'
import Tasks from './pages/Tasks'
import Decisions from './pages/Decisions'
import Blockers from './pages/Blockers'
export default function App() {
  const [session, setSession] = useState<Session | null>(null); const [loading, setLoading] = useState(true)
  useEffect(() => { if (!configured) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s)); return () => sub.subscription.unsubscribe() }, [])
  if (!configured) return <div className="max-w-xl mx-auto mt-24 p-4 text-sm"><h1 className="text-xl font-semibold mb-2">Supabase not configured</h1><p>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env.local</code> (or Vercel environment variables), apply <code>supabase/migrations</code>, then restart. See README.</p></div>
  if (loading) return <p className="p-6">Loading…</p>
  if (!session) return <Auth />
  const link = ({ isActive }: { isActive: boolean }) => 'px-2 py-1 rounded ' + (isActive ? 'bg-slate-800' : 'text-slate-400')
  return <BrowserRouter><nav className="flex flex-wrap gap-1 items-center p-3 border-b border-slate-800 text-sm">
    {['today', 'timeline', 'tasks', 'decisions', 'blockers'].map(p => <NavLink key={p} to={'/' + p} className={link}>{p}</NavLink>)}
    <button className="ml-auto text-slate-400" onClick={() => supabase.auth.signOut()}>Sign out</button></nav>
    <main className="max-w-3xl mx-auto p-4"><Routes><Route path="/" element={<Navigate to="/today" />} /><Route path="/today" element={<Today />} /><Route path="/timeline" element={<Timeline />} /><Route path="/tasks" element={<Tasks />} /><Route path="/decisions" element={<Decisions />} /><Route path="/blockers" element={<Blockers />} /><Route path="*" element={<Navigate to="/today" />} /></Routes></main></BrowserRouter>
}
