import { createClient as sbCreate } from '@supabase/supabase-js'
import type { Profile } from '../types'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || ''
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || ''

export const configured = Boolean(url && key)

export function createClient(u?: string, k?: string) {
  return sbCreate(u || url, k || key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: { headers: { 'X-App-Version': 'mission-control-2.0' } },
  })
}

export const supabase = createClient()

export async function ensureProfile(userId: string, patch: Partial<Profile> = {}) {
  if (!userId) return null
  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .limit(1)
      .maybeSingle()

    if (existing) {
      if (Object.keys(patch).length > 0) {
        await supabase.from('profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', userId)
      }
      return existing
    }

    // New user — create profile with sensible defaults
    const payload: Partial<Profile> = {
      id: userId,
      student_name: '',
      start_date: new Date().toISOString().slice(0, 10),
      study_days_per_week: 5,
      daily_capacity_minutes: 240,
      preferred_task_size: 'medium',
      notification_preferences: { push_next_action: true, email_task_reminder: true },
      theme_preferences: { theme: 'light', accent: 'blue', density: 'comfortable' },
      ...patch,
    }
    const { data } = await supabase.from('profiles').insert(payload).select().maybeSingle()

    // Seed standard project phases, report sections, and requirements for new users
    try {
      await supabase.rpc('seed_user_defaults', { p_user_id: userId })
    } catch {
      // Seed function may not exist in older deployments — silently skip
    }

    return data ?? payload
  } catch {
    return null
  }
}
