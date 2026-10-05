import { createClient } from '@supabase/supabase-js'
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || ''
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || ''
export const configured = Boolean(url && key)
export const supabase = createClient(url || 'http://localhost:54321', key || 'missing', {
  auth: { persistSession: true, autoRefreshToken: true }
})

export async function ensureProfile(userId: string, patch: Record<string, unknown> = {}) {
  const { data } = await supabase.from('profiles').select('id').eq('id', userId).limit(1)
  if (!data?.length) {
    await supabase.from('profiles').insert({ id: userId, ...patch })
  } else if (Object.keys(patch).length) {
    await supabase.from('profiles').update(patch).eq('id', userId)
  }
}
