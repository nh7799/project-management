import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import list from '../data/projects.json'
import { useRows } from '../hooks/useRows'
import { Err, Title, stagger } from '../components/ui'

const P = list as { id: string; title: string; year: string }[]

export default function Projects() {
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [tab, setTab] = useState<'all' | 'short'>('all')
  const { rows, error, add, remove } = useRows<{ id: string; step_key: string }>('guide_progress')
  const saved = new Map(rows.filter(r => r.step_key.startsWith('proj:')).map(r => [r.step_key.slice(5), r.id]))
  const shown = P.filter(p => (tab === 'all' || saved.has(p.id)) && p.title.toLowerCase().includes(q.toLowerCase()))

  const updateQ = (v: string) => { setQ(v); if (v) setSp({ q: v }); else setSp({}) }

  return (
    <div>
      <Title sub={`${P.length} past project titles for inspiration. These are NOT specifications — make them your own take (handbook p.16).`}>
        🗂️ Project idea library
      </Title>
      <Err msg={error} />
      <section className="card mb-5">
        <h2 className="htitle sm mb-2">How to use this list</h2>
        <ol className="list-decimal ml-6 small stack tight">
          <li>Find a title that sparks curiosity and that you could explain in <b>one sentence</b>.</li>
          <li>Make it <b>your take</b>: your own analysis, your own methodology, your own solution. Copying is not allowed.</li>
          <li>Ask three questions: what problem does it solve? how would I <b>evaluate</b> it against a baseline? what is the research/CS angle?</li>
          <li>Shortlist 2–3 ideas, then discuss at your first supervisor meeting.</li>
        </ol>
        <div className="divider" />
        <div className="grid-3 small">
          <div className="card-soft" style={{ padding: '.7rem .85rem' }}><b>What CS principle?</b><p className="muted tiny mb-0 mt-1">Design methods, algorithms, data structures, complexity, data management, systems analysis — not "I learned React".</p></div>
          <div className="card-soft" style={{ padding: '.7rem .85rem' }}><b>How will I evaluate?</b><p className="muted tiny mb-0 mt-1">Baseline comparison, quantitative metrics, statistical tests, qualitative findings, limitations.</p></div>
          <div className="card-soft" style={{ padding: '.7rem .85rem' }}><b>Artefact + report</b><p className="muted tiny mb-0 mt-1">The artefact evidences your claims; the report is what gets marked. Both matter.</p></div>
        </div>
      </section>
      <input className="input mb-3" placeholder="Search titles (e.g. machine learning, IoT, accessibility, NLP, security)" value={q} onChange={e => updateQ(e.target.value)} aria-label="Search projects" />
      <div className="flex gap-2 mb-4">
        <button className="pill" aria-pressed={tab === 'all'} onClick={() => setTab('all')}>📚 All ({P.length})</button>
        <button className="pill" aria-pressed={tab === 'short'} onClick={() => setTab('short')}>⭐ Shortlist ({saved.size})</button>
      </div>
      <ul className="space-y-2">
        {shown.map((p, i) => {
          const id = saved.get(p.id)
          return (
            <motion.li key={p.id} {...stagger(i)} className="card lift flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
              <span className="flex-1" style={{ minWidth: 220 }}>
                <div style={{ fontWeight: 700 }}>{p.title}</div>
                <div className="small muted">{p.year} · {p.id}</div>
              </span>
              <button className="pill" aria-pressed={!!id} aria-label="Toggle shortlist"
                onClick={() => id ? remove(id, false) : add({ step_key: 'proj:' + p.id })}>
                {id ? '⭐ Saved' : '☆ Save'}
              </button>
            </motion.li>
          )
        })}
      </ul>
      {!shown.length && <div className="card muted">Nothing matches. Try a broader keyword or switch to the "All" tab.</div>}
    </div>
  )
}
