import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SECS } from '../data/handbook'
import list from '../data/projects.json'
type R = { label: string; sub: string; to: string }
const PAGES: R[] = [['home', 'Home'], ['today', 'Today'], ['checklist', 'Checklist'], ['timeline', 'Timeline'], ['handbook', 'Handbook'], ['projects', 'Project library'], ['tasks', 'Tasks'], ['decisions', 'Decisions'], ['blockers', 'Blockers'], ['settings', 'Settings']].map(([p, l]) => ({ label: l, sub: 'Page', to: '/' + p }))
export default function Palette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState(''); const nav = useNavigate()
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [onClose])
  const res = useMemo(() => { const s = q.toLowerCase(); if (!s) return PAGES
    const hb: R[] = SECS.flatMap(x => x.items.filter(i => (i.t + i.d).toLowerCase().includes(s)).map(i => ({ label: i.t, sub: 'Handbook · ' + x.title, to: `/handbook?q=${encodeURIComponent(i.t)}` })))
    const pj: R[] = (list as { title: string; year: string }[]).filter(p => p.title.toLowerCase().includes(s)).slice(0, 6).map(p => ({ label: p.title, sub: 'Project · ' + p.year, to: `/projects?q=${encodeURIComponent(p.title)}` }))
    return [...PAGES.filter(p => p.label.toLowerCase().includes(s)), ...hb.slice(0, 8), ...pj] }, [q])
  const go = (r: R) => { nav(r.to); onClose() }
  return <div className="fixed inset-0 z-30 grid place-items-start justify-center pt-24 p-4" style={{ background: 'rgba(0,0,0,.5)' }} onClick={onClose}>
    <motion.div initial={{ opacity: 0, y: -10, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="card w-full max-w-xl" onClick={e => e.stopPropagation()} role="dialog" aria-label="Search everything">
      <input autoFocus className="input" placeholder="Search handbook, projects and pages…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && res[0] && go(res[0])} />
      <ul className="mt-3 max-h-80 overflow-auto">{res.map(r => <li key={r.to + r.label}><button className="w-full text-left rounded-xl px-3 py-2 hover:bg-[var(--surface2)]" onClick={() => go(r)}>{r.label}<div className="text-sm text-slate-400">{r.sub}</div></button></li>)}</ul></motion.div></div>
}
