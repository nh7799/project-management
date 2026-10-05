import { useRows } from '../hooks/useRows'
import { AddForm, Err, Title } from '../components/ui'
import type { Task } from '../types'
export default function Tasks() {
  const { rows, error, add, update, remove } = useRows<Task>('tasks')
  const core = rows.filter(t => t.tier === 'core' && t.status === 'todo').length, stretch = rows.filter(t => t.tier === 'stretch' && t.status === 'todo').length
  return <div><Title>Tasks</Title><Err msg={error} />
    {core > 0 && stretch > 0 && <p className="warn mb-4">Scope guard: {stretch} stretch task(s) open while {core} core task(s) remain. Finish core first.</p>}
    <AddForm label="Add task" onAdd={add} fields={[{ name: 'title', label: 'Task', required: true }, { name: 'tier', label: 'Scope', options: ['core', 'important', 'optional', 'stretch'] }, { name: 'due', label: 'Due', type: 'date' }]} />
    <ul className="divide-y divide-slate-800">{rows.map(t => <li key={t.id} className="py-3 flex gap-3 items-center">
      <input type="checkbox" checked={t.status === 'done'} onChange={() => update(t.id, { status: t.status === 'done' ? 'todo' : 'done' })} />
      <span className={'flex-1 ' + (t.status === 'done' ? 'line-through text-slate-500' : '')}>{t.title}</span><span className="text-xs uppercase text-slate-400">{t.tier}</span>{t.due && <span className="text-xs text-slate-500">{t.due}</span>}
      <button className="text-slate-500" onClick={() => remove(t.id)}>✕</button></li>)}</ul></div>
}
