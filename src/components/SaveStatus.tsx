import { useEffect, useState } from 'react'
import { saveStatus, useSaveStatus } from '../lib/saveStatus'

function ago(at: number, now: number) {
  const s = Math.max(0, Math.round((now - at) / 1000))
  return s < 10 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.round(s / 60)} min ago`
}

/** Honest save feedback: never shows "saved" unless the last write succeeded. */
export default function SaveStatus() {
  const s = useSaveStatus()
  const [now, setNow] = useState(Date.now())
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000)
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { clearInterval(t); window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (!online) return (
    <div role="alert" className="card" style={{ margin: '0 0 .75rem', padding: '.6rem .9rem', borderLeft: '4px solid currentColor' }}>
      <strong>You are offline.</strong> Changes made now will NOT be saved. Keep this tab open and try again once you are back online.
    </div>
  )
  if (s.state === 'failed') return (
    <div role="alert" className="card" style={{ margin: '0 0 .75rem', padding: '.6rem .9rem', borderLeft: '4px solid currentColor' }}>
      <strong>Your changes have NOT been saved.</strong> {s.message ? <span className="muted">({s.message})</span> : null}
      <button className="btn ml-2" onClick={saveStatus.dismiss}>Dismiss</button>
    </div>
  )
  const text = s.state === 'saving' ? 'Saving…' : s.state === 'saved' && s.at ? `Saved ${ago(s.at, now)}` : ''
  return <div role="status" aria-live="polite" className="tiny muted" style={{ minHeight: '1.2em', textAlign: 'right' }}>{text}</div>
}
