import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useRows<T extends { id: string }>(
  table: string, order = 'created_at', asc = false, extraFilter?: { eq?: [string, unknown]; gte?: [string, unknown]; lte?: [string, unknown] }
) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const subRef = useRef<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from(table).select('*') as any
    if (extraFilter?.eq) q = q.eq(extraFilter.eq[0], extraFilter.eq[1])
    if (extraFilter?.gte) q = q.gte(extraFilter.gte[0], extraFilter.gte[1])
    if (extraFilter?.lte) q = q.lte(extraFilter.lte[0], extraFilter.lte[1])
    q = q.order(order, { ascending: asc })
    const { data, error } = await q
    if (error) setError(error.message)
    else { setError(null); setRows((data || []) as T[]) }
    setLoading(false)
  }, [table, order, asc, extraFilter?.eq?.[0], extraFilter?.eq?.[1], extraFilter?.gte?.[0], extraFilter?.gte?.[1], extraFilter?.lte?.[0], extraFilter?.lte?.[1]])

  useEffect(() => {
    load()
    try {
      subRef.current = supabase.channel(`${table}-ch`).on(
        'postgres_changes', { event: '*', schema: 'public', table },
        () => load()
      ).subscribe()
    } catch { /* ignore if realtime disabled */ }
    return () => { if (subRef.current) subRef.current.unsubscribe() }
  }, [load, table])

  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await p
    setError(error ? error.message : null)
    if (!error) await load()
  }

  const add = (v: Record<string, unknown>) => run(supabase.from(table).insert(v))
  const upsert = (v: Record<string, unknown>) => run(supabase.from(table).upsert(v))
  const update = (id: string, v: Record<string, unknown>) =>
    run(supabase.from(table).update(v).eq('id', id))
  const remove = (id: string, ask = true) =>
    (!ask || confirm('Delete this record? This cannot be undone.'))
      ? run(supabase.from(table).delete().eq('id', id))
      : Promise.resolve()

  return { rows, loading, error, add, update, remove, upsert, reload: load }
}

export function useSingle<T extends { id: string }>(table: string, filter?: { eq?: [string, unknown] }) {
  const { rows, loading, error, add, update, remove, upsert } = useRows<T>(table, 'created_at', false, filter as any)
  return { row: rows[0], rows, loading, error, add, update, remove, upsert }
}
