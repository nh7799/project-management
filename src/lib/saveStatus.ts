import { useSyncExternalStore } from 'react'

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed'
export interface SaveSnapshot { state: SaveState; at: number | null; message: string | null }

let snap: SaveSnapshot = { state: 'idle', at: null, message: null }
const subs = new Set<() => void>()
const set = (s: SaveSnapshot) => { snap = s; subs.forEach(f => f()) }

export const saveStatus = {
  saving: () => set({ ...snap, state: 'saving', message: null }),
  saved: () => set({ state: 'saved', at: Date.now(), message: null }),
  failed: (message: string) => set({ ...snap, state: 'failed', message }),
  dismiss: () => set({ ...snap, state: snap.at ? 'saved' : 'idle', message: null }),
  get: () => snap,
}

export function useSaveStatus(): SaveSnapshot {
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, saveStatus.get, saveStatus.get)
}
