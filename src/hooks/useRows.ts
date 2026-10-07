import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { saveStatus } from '../lib/saveStatus'

export interface ExtraFilter {
  eq?: [string, unknown]
  gte?: [string, unknown]
  lte?: [string, unknown]
  neq?: [string, unknown]
}

export function useRows<T extends { id: string }>(
  table: string,
  order = 'created_at',
  asc = false,
  extraFilter?: ExtraFilter,
) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let q: any = supabase.from(table).select('*')
      if (extraFilter?.eq) q = q.eq(extraFilter.eq[0], extraFilter.eq[1])
      if (extraFilter?.gte) q = q.gte(extraFilter.gte[0], extraFilter.gte[1])
      if (extraFilter?.lte) q = q.lte(extraFilter.lte[0], extraFilter.lte[1])
      if (extraFilter?.neq) q = q.neq(extraFilter.neq[0], extraFilter.neq[1])
      q = q.order(order, { ascending: asc })
      const { data, error } = await q
      if (error) setError(error.message)
      else { setError(null); setRows((data ?? []) as T[]) }
    } catch (e: any) { setError(e?.message ?? 'load failed') }
    setLoading(false)
  }, [table, order, asc, extraFilter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    try {
      const channel = supabase.channel(`${table}-rows`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload: any) => {
          setRows(prev => {
            const e = payload.eventType
            if (e === 'INSERT') return [...prev, payload.new as T].filter((x, i, a) => a.findIndex(y => y.id === x.id) === i)
            if (e === 'UPDATE') return prev.map(r => r.id === payload.new.id ? payload.new as T : r)
            if (e === 'DELETE') return prev.filter(r => r.id !== payload.old.id)
            return prev
          })
        })
        .subscribe()
      return () => { void supabase.removeChannel(channel) }
    } catch { /* no-op: realtime only when configured */ }
  }, [table])

  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => {
    saveStatus.saving()
    try {
      const { error } = await p
      setError(error ? error.message : null)
      if (error) saveStatus.failed(error.message); else saveStatus.saved()
    } catch (e: any) {
      const m = e?.message ?? 'db call failed'
      setError(m); saveStatus.failed(m)
    }
    await load()
  }

  const add = (v: Record<string, unknown>) => run(supabase.from(table).insert(v))
  const update = (id: string, v: Record<string, unknown>) => run(supabase.from(table).update(v).eq('id', id))
  const remove = (id: string, ask = true) =>
    (!ask || confirm('Delete this record? This cannot be undone.'))
      ? run(supabase.from(table).delete().eq('id', id))
      : Promise.resolve()

  const upsert = (v: Record<string, unknown>) => run(supabase.from(table).upsert(v, { onConflict: 'id' }))
  const reload = load

  return { rows, loading, error, add, update, remove, upsert, reload }
}

export function useSingle<T extends { id: string }>(
  table: string,
  order = 'created_at',
  asc = false,
  extraFilter?: ExtraFilter,
) {
  const multi = useRows<T>(table, order, asc, extraFilter)
  return {
    row: multi.rows[0] ?? null,
    rows: multi.rows,
    loading: multi.loading,
    error: multi.error,
    add: multi.add,
    update: (id: string, v: Record<string, unknown>) => multi.update(id, v),
    remove: multi.remove,
    upsert: multi.upsert,
    reload: multi.reload,
  }
}
