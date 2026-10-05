import { useEffect, useState } from 'react'
import { useRows } from '../hooks/useRows'
import { todayISO, daysUntil } from '../utils/dates'
import { Err, Title, input, btn } from '../components/ui'
import type { Daily, EventRow, Blocker, Task } from '../types'
const fields: [keyof Daily, string][] = [['mission','Mission'],['objective','Primary objective'],['biggest_win','Biggest win'],['biggest_challenge','Biggest challenge'],['learned','What I learned'],['first_task_tomorrow','First task tomorrow']]
export default function Today() {
  const d = useRows<Daily>('daily_records', 'day'), ev = useRows<EventRow>('events', 'date', true), bl = useRows<Blocker>('blockers'), tk = useRows<Task>('tasks')
  const day = todayISO(); const rec = d.rows.find(r => r.day === day)
  const [f, setF] = useState<Record<string, string>>({})
  useEffect(() => { setF(Object.fromEntries(fields.map(([k]) => [k, (rec?.[k] as string) ?? '']))) }, [rec?.id, d.loading])
  const next = ev.rows.filter(e => !e.done && daysUntil(e.date) >= 0)[0]
  const openB = bl.rows.filter(b => b.status === 'open'), coreOpen = tk.rows.filter(t => t.tier === 'core' && t.status === 'todo').length
  const stretchOpen = tk.rows.filter(t => t.tier === 'stretch' && t.status === 'todo').length
  const overdue = ev.rows.filter(e => !e.done && daysUntil(e.date) < 0).length
  const health = overdue || openB.some(b => b.severity === 'high') ? 'AT RISK' : openB.length || (stretchOpen && coreOpen) ? 'NEEDS ATTENTION' : 'ON TRACK'
  const why = [overdue && `${overdue} overdue event(s)`, openB.length && `${openB.length} open blocker(s)`, stretchOpen && coreOpen && `${stretchOpen} stretch task(s) active while ${coreOpen} core task(s) remain`].filter(Boolean).join('; ') || 'No overdue items, blockers or scope warnings.'
  const save = async (completed: boolean) => { const v = { ...f, completed }; rec ? await d.update(rec.id, v) : await d.add({ ...v, day }) }
  return <div><Title>Today — {day}</Title><Err msg={d.error || ev.error || bl.error || tk.error} />
    <div className="mb-6 rounded border border-slate-800 p-4"><div className="text-xs text-slate-400">PROJECT HEALTH</div><div className="text-lg font-semibold">{health}</div><div className="text-sm text-slate-400">Reason: {why}</div>
      <div className="mt-3 text-sm">{next ? <>Next deadline: <b>{next.title}</b> ({next.kind}) in {daysUntil(next.date)} day(s)</> : 'No upcoming deadlines — add some on the Timeline page.'}</div></div>
    <form className="grid gap-3" onSubmit={e => { e.preventDefault(); save(rec?.completed ?? false) }}>
      {fields.map(([k, l]) => <label key={k} className="text-xs text-slate-400">{l}<textarea rows={2} className={input} value={f[k] ?? ''} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>)}
      <div className="flex gap-2"><button className={btn}>{rec ? 'Save day' : 'Start today'}</button>
        {rec && <button type="button" className={btn} onClick={() => save(true)}>{rec.completed ? 'Day completed ✓ (re-save)' : 'End day'}</button>}</div></form></div>
}
