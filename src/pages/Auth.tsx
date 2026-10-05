import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Err } from '../components/ui'

export default function Auth() {
  const [email, setE] = useState('')
  const [pw, setP] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const go = async (up: boolean) => {
    setErr(null); setInfo(''); setLoading(true)
    const { error, data } = up
      ? await supabase.auth.signUp({ email, password: pw })
      : await supabase.auth.signInWithPassword({ email, password: pw })
    setLoading(false)
    if (error) setErr(error.message)
    else if (up && !data.session) setInfo('📧 Confirmation email sent. Check your inbox, confirm, then sign in.')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div className="hero mb-4">
          <div className="small" style={{ opacity: .92 }}>Final-Year Project OS</div>
          <h1 className="htitle lg mt-1" style={{ fontWeight: 800 }}>🚀 Mission Control</h1>
          <p style={{ opacity: .92, marginTop: '.25rem' }}>Turn an intimidating final-year project into calm, evidence-backed actions.</p>
        </div>
        <div className="card">
          <div className="stack tight mb-4">
            <div><div className="hsection">What you get</div></div>
            <div className="row" style={{ gap: '.5rem' }}><span>🎯</span><span className="small muted">Next best action, every single day</span></div>
            <div className="row" style={{ gap: '.5rem' }}><span>🧾</span><span className="small muted">Evidence-first task system</span></div>
            <div className="row" style={{ gap: '.5rem' }}><span>📘</span><span className="small muted">Report builder & evidence map</span></div>
            <div className="row" style={{ gap: '.5rem' }}><span>🧭</span><span className="small muted">17 phases · milestones · risks · decisions</span></div>
            <div className="row" style={{ gap: '.5rem' }}><span>📱</span><span className="small muted">Mobile-first · 5-tab bottom navigation</span></div>
          </div>
          <Err msg={err} />
          {info && <div className="good mb-3">{info}</div>}
          <div className="stack tight">
            <label>Email
              <input className="input" type="email" placeholder="you@university.ac.uk" value={email} onChange={e => setE(e.target.value)} />
            </label>
            <label>Password <span className="muted tiny">(min 6 characters)</span>
              <input className="input" type="password" placeholder="••••••••" minLength={6} value={pw} onChange={e => setP(e.target.value)} />
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn big" style={{ flex: 1 }} onClick={() => go(false)} disabled={loading}>🔓 Sign in</button>
            <button className="btn ghost big" style={{ flex: 1 }} onClick={() => go(true)} disabled={loading}>✍️ Create account</button>
          </div>
          <p className="tiny muted mt-4 mb-0 text-center">
            Your data is stored in your own Supabase project with Row Level Security — only you can see it.
          </p>
        </div>
      </div>
    </div>
  )
}
