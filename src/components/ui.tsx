import { useState, type ReactNode } from 'react'
export const input = 'w-full rounded bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm'
export const btn = 'rounded bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-sm text-white'
export const Err = ({ msg }: { msg: string | null }) => msg ? <p className="rounded bg-red-950 border border-red-800 p-2 text-sm text-red-300">Error: {msg}</p> : null
export const Title = ({ children }: { children: ReactNode }) => <h1 className="text-xl font-semibold mb-4">{children}</h1>
type F = { name: string; label: string; type?: string; options?: string[]; required?: boolean }
export function AddForm({ fields, onAdd, label = 'Add' }: { fields: F[]; onAdd: (v: Record<string, unknown>) => Promise<void>; label?: string }) {
  const [v, setV] = useState<Record<string, string>>({})
  return <form className="grid gap-2 sm:grid-cols-2 mb-6 rounded border border-slate-800 p-3" onSubmit={async e => {
    e.preventDefault(); const out: Record<string, unknown> = {}
    for (const f of fields) { const val = v[f.name] ?? (f.options ? f.options[0] : undefined); if (val !== undefined && val !== '') out[f.name] = f.type === 'number' ? Number(val) : val }
    await onAdd(out); setV({}) }}>
    {fields.map(f => <label key={f.name} className="text-xs text-slate-400">{f.label}
      {f.options ? <select className={input} value={v[f.name] ?? f.options[0]} onChange={e => setV({ ...v, [f.name]: e.target.value })}>{f.options.map(o => <option key={o}>{o}</option>)}</select>
        : <input className={input} type={f.type ?? 'text'} required={f.required} value={v[f.name] ?? ''} onChange={e => setV({ ...v, [f.name]: e.target.value })} />}</label>)}
    <button className={btn + ' sm:col-span-2'}>{label}</button></form>
}
