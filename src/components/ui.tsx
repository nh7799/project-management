import { useState, type ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'

export const input = 'input'
export const btn = 'btn'

// ─── Error display ───────────────────────────────────────────
export interface ErrProps { e?: any; msg?: string | null; error?: any }
export const Err = ({ e, msg, error }: ErrProps) => {
  const m = msg ?? (e?.message ?? e) ?? (error?.message ?? error)
  if (!m) return null
  return (
    <div className="card-soft mb-4" role="alert" style={{ borderLeft: '4px solid var(--danger)', background: 'color-mix(in oklab, var(--danger) 8%, transparent)' }}>
      <div className="danger"><b>⚠️ Something went wrong: </b>
        <span>{typeof m === 'string' ? m : JSON.stringify(m).slice(0, 200)}</span>
      </div>
      <p className="small muted mt-2">
        If this keeps happening, try refreshing the page. Your data is saved automatically.
      </p>
    </div>
  )
}

// ─── Page title ──────────────────────────────────────────────
export interface TitleProps {
  children?: ReactNode
  eyebrow?: string
  title?: string | ReactNode
  subtitle?: string | ReactNode
  sub?: string
  right?: ReactNode
  actions?: ReactNode
}
export const Title = ({ children, eyebrow, title, subtitle, sub, right, actions }: TitleProps) => (
  <header className="mb-5 flex flex-wrap justify-between items-start gap-3">
    <div className="stack" style={{ gap: '.35rem' }}>
      {eyebrow && <div className="label">{eyebrow}</div>}
      <h1 className="htitle lg">{title ?? children}</h1>
      {(subtitle ?? sub) && <p className="muted mt-1">{subtitle ?? sub}</p>}
    </div>
    {right ?? actions}
  </header>
)

// ─── Heading ─────────────────────────────────────────────────
export interface HProps {
  size?: 'h1' | 'h2' | 'h3' | 'h4' | 'sm' | 'xs' | 'lg' | string
  level?: 1 | 2 | 3 | 4 | string | number
  inline?: boolean
  children: ReactNode
  sub?: string
  className?: string
}
export const H = ({ size, level, inline, children, sub, className }: HProps) => {
  let Heading: any = 'h2'
  if (typeof level === 'number') Heading = `h${Math.max(1, Math.min(6, level))}`
  else if (typeof size === 'string' && /^h[1-6]$/.test(size)) Heading = size
  const sizeClass =
    size === 'h1' || size === 'lg' ? 'lg' :
    size === 'h4' || size === 'sm' || size === 'xs' ? 'sm' :
    size === 'h3' ? 'sm' : ''
  return (
    <div className={`${className ?? ''} ${inline ? 'inline-flex items-baseline' : 'mb-2'}`} style={inline ? { display: 'inline-block' } : undefined}>
      <Heading className={`htitle ${sizeClass}`} style={inline ? { display: 'inline-block', marginRight: '.35rem' } : undefined}>{children}</Heading>
      {sub && <span className={`muted sm ${inline ? 'ml-2' : ''}`}>{sub}</span>}
    </div>
  )
}

// ─── Pill button ─────────────────────────────────────────────
export const Pill = ({ tone, active, children, onClick, sm, ...rest }: { tone?: string; sm?: boolean; active?: boolean; children: ReactNode; onClick?: () => void; [k: string]: any }) => (
  <button className={`pill ${sm ? 'sm' : ''} ${tone ?? ''}`} aria-pressed={!!active} onClick={onClick} {...rest}>{children}</button>
)

// ─── Form field types ─────────────────────────────────────────
export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'date' | 'checkbox' | 'password' | 'email' | 'time' | 'datetime-local' | 'url' | 'tel'
export interface Field {
  key?: string
  label: string
  name?: string
  type?: FieldType
  options?: (string | number | { value: string | number; label: string })[]
  required?: boolean
  placeholder?: string
  multi?: boolean
  rows?: number
  min?: number
  max?: number
  step?: number
  colSpan?: 1 | 2 | 3 | 'full' | number
  defaultValue?: string | number | null
  [k: string]: any
}
export interface FormProps {
  fields: Field[]
  onSubmit?: (v: Record<string, unknown>) => Promise<void> | void
  onAdd?: (v: Record<string, unknown>) => Promise<void> | void
  label?: string
  initial?: Record<string, any>
  submitLabel?: string
  cols?: 1 | 2 | 3 | number
  sm?: boolean
  children?: ReactNode
  id?: string
}

export function Form({ fields, onSubmit, onAdd, label = 'Save', initial = {}, submitLabel, cols = 1, sm, children }: FormProps) {
  const [v, setV] = useState<Record<string, any>>(initial as any)
  const [busy, setBusy] = useState(false)
  const colsClass =
    cols === 1 ? '' :
    cols === 2 ? 'md:grid-cols-2' :
    cols === 3 ? 'md:grid-cols-3' :
    `md:grid-cols-${cols}`

  const fieldName = (f: Field) => f.key ?? f.name ?? String(Math.random())

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const out: Record<string, unknown> = { ...v }
      for (const f of fields) {
        const k = fieldName(f)
        let val: any = v[k]
        if (val === undefined || val === null || val === '') {
          if (f.defaultValue !== undefined && f.defaultValue !== null) { val = f.defaultValue }
          else if (f.options && f.type === 'select') {
            const first = f.options[0]
            val = typeof first === 'object' ? first.value : first
          }
        }
        if (f.type === 'number' && (val !== undefined && val !== '')) {
          out[k] = Number(val)
        } else if (f.type === 'checkbox') {
          out[k] = Boolean(val)
        } else if (val !== undefined && val !== '') {
          out[k] = val
        } else if (f.required) {
          out[k] = ''
        }
      }
      const handler = onSubmit || onAdd
      if (handler) await handler(out)
      if (Object.keys(initial ?? {}).length === 0) setV({})
    } finally {
      setBusy(false)
    }
  }

  const spanClass = (c?: number | string) =>
    c === 2 || c === 'full' ? 'md:col-span-2' :
    c === 3 ? 'md:col-span-3' : ''

  return (
    <form onSubmit={submit} className={`card grid gap-3 mb-5 ${colsClass}`} style={sm ? { padding: 'var(--pad)' } : undefined}>
      {fields.map(f => {
        const k = fieldName(f)
        const value = v[k] ?? (f.defaultValue !== undefined ? f.defaultValue :
          f.type === 'checkbox' ? false :
          (f.options ? (typeof f.options[0] === 'object' ? (f.options[0] as any).value : f.options[0]) : ''))
        const colStyle = spanClass(f.colSpan)
        return (
          <label key={k} className={colStyle}>
            <span className="block text-sm font-medium mb-1" style={{ color: 'var(--muted)' }}>
              {f.label}{f.required && <span style={{ color: 'var(--danger)' }}> *</span>}
            </span>
            {f.type === 'textarea' || f.multi ? (
              <textarea className="textarea"
                rows={f.rows ?? 3}
                required={f.required}
                placeholder={f.placeholder}
                value={value ?? ''}
                onChange={e => setV({ ...v, [k]: e.target.value })}
              />
            ) : f.type === 'select' ? (
              <select className="input" required={f.required}
                value={String(value ?? '')}
                onChange={e => setV({ ...v, [k]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
              >
                {f.options!.map(o =>
                  typeof o === 'object'
                    ? <option key={String(o.value)} value={o.value}>{o.label}</option>
                    : <option key={String(o)} value={o}>{o}</option>
                )}
              </select>
            ) : f.type === 'checkbox' ? (
              <label className="checkbox" style={{ gap: '.5rem' }}>
                <input type="checkbox" checked={Boolean(value)}
                  onChange={e => setV({ ...v, [k]: e.target.checked })}
                />
                <span>{f.placeholder ?? f.label}</span>
              </label>
            ) : (
              <input
                className="input"
                type={f.type ?? 'text'}
                required={f.required}
                placeholder={f.placeholder}
                min={f.min} max={f.max} step={f.step}
                value={value ?? ''}
                onChange={e => setV({ ...v, [k]: f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })}
              />
            )}
          </label>
        )
      })}
      {children}
      <div className={cols >= 2 ? 'md:col-span-full' : ''}>
        <button className={`btn ${busy ? 'opacity-70' : ''}`} disabled={busy}>
          {busy ? '⏳ Saving…' : (submitLabel ?? label)}
        </button>
      </div>
    </form>
  )
}

export const AddForm = Form

// ─── Progress bar ─────────────────────────────────────────────
export interface BarProps {
  pct?: number
  percent?: number
  label?: string
  tone?: 'good' | 'warn' | 'danger' | 'info' | 'acc' | 'muted' | string
}
export const Bar = ({ pct, percent, label, tone }: BarProps) => {
  const value = Math.max(0, Math.min(100, (percent ?? pct ?? 0)))
  const toneVar = tone ? `var(--${tone})` : 'var(--accent)'
  return (
    <div>
      {label && <div className="row between sm muted mb-1"><span>{label}</span><b style={{ color: 'var(--ink)' }}>{Math.round(value)}%</b></div>}
      <div className="bar" style={{ height: 10, background: 'var(--surface3)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--line)' }}>
        <motion.i initial={{ width: 0 }} animate={{ width: `${value}%` } as any}
          style={{ display: 'block', height: '100%', background: toneVar, borderRadius: 999 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ─── Donut chart ──────────────────────────────────────────────
export interface DonutProps {
  pct?: number
  percent?: number
  size?: number
  stroke?: number
  label?: ReactNode
  sub?: string
  tone?: 'good' | 'warn' | 'danger' | 'info' | 'acc' | 'muted' | string
}
export const Donut = ({ pct, percent, size = 88, stroke = 10, label, sub, tone }: DonutProps) => {
  const value = Math.max(0, Math.min(100, (percent ?? pct ?? 0)))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (value / 100) * c
  const colour = tone ? `var(--${tone})` : 'var(--accent)'
  const labelContent = label !== undefined ? label : `${Math.round(value)}%`
  return (
    <div className="row center" style={{ position: 'relative', width: '100%', justifyContent: 'flex-start', gap: '1rem' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} className="progress-donut">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface3)" strokeWidth={stroke} />
          <motion.circle
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: off }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={colour} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={off}
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
        </svg>
        <div className="row col center" style={{ position: 'absolute', inset: 0 }}>
          <div style={{ fontWeight: 700, fontSize: size * 0.26 }}>{labelContent}</div>
        </div>
      </div>
      {sub && <div className="muted">{sub}</div>}
    </div>
  )
}

// ─── Stagger animation helper ─────────────────────────────────
export type StaggerFn = {
  (_i?: number): { initial: any; animate: any }
  initial: any
  animate: any
  children: any
  [key: string]: any
}
export const stagger: StaggerFn = Object.assign(
  (_i?: number) => ({
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut', delay: (_i || 0) * 0.03 } },
  }),
  {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
    children: {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
    },
  }
) as any

// ─── Card wrapper ─────────────────────────────────────────────
export const Card = ({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) => (
  <section className={`card ${className}`} style={style}>{children}</section>
)

// ─── Stat card ────────────────────────────────────────────────
export const Stat = ({ label, value, sub, icon, tone }: {
  label: string
  value: ReactNode
  sub?: string
  icon?: ReactNode
  tone?: 'good' | 'warn' | 'danger' | 'info' | 'acc' | 'muted' | string
}) => (
  <div className="stat-card">
    <div className="row between wrap gap-1">
      <div className="label">{label}</div>
      {icon && <span aria-hidden>{icon}</span>}
    </div>
    <div className="stat-value" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</div>
    {sub && <div className={`stat-label muted ${tone ? tone : ''}`}>{sub}</div>}
  </div>
)

// ─── Tag / chip ───────────────────────────────────────────────
export type TagTone = 'acc' | 'good' | 'info' | 'warn' | 'danger' | 'muted' | 'ok' | 'bad' | 'primary' | 'success' | 'error'
export const Tag = ({ children, tone, sm, kind, className, style, ...rest }: {
  children: ReactNode
  tone?: TagTone | string
  sm?: boolean
  kind?: string
  className?: string
  style?: React.CSSProperties
  [k: string]: any
}) => {
  const normalise: Record<string, string> = { ok: 'good', bad: 'danger', primary: 'acc', success: 'good', error: 'danger' }
  const t = (tone && normalise[tone]) ?? tone ?? ''
  return <span
    className={`pill ${sm ? 'sm' : ''} ${t} ${className ?? ''}`.trim()}
    style={{ fontWeight: 600, ...style }}
    data-kind={kind}
    {...rest}
  >{children}</span>
}

// ─── Project status line ──────────────────────────────────────
export const StatusLine = ({ status, reason }: { status: any; reason?: string }) => {
  const statusStr = typeof status === 'object' && status !== null
    ? String(status.label || status.summary || 'Project active')
    : String(status || 'Project active')
  const statusTone = typeof status === 'object' && status !== null && status.tone
    ? String(status.tone)
    : undefined
  const toneMap: Record<string, string> = {
    'On track': 'good', 'Healthy': 'good', 'Thriving': 'good',
    'Needs attention': 'warn', 'Stalling': 'warn',
    'At risk': 'danger', 'Needs urgent triage': 'danger',
  }
  const iconMap: Record<string, string> = {
    'On track': '🟢', 'Healthy': '🟢', 'Thriving': '🚀',
    'Needs attention': '🟡', 'Stalling': '⚠️',
    'At risk': '🔴', 'Needs urgent triage': '🚨',
  }
  const t = statusTone ?? toneMap[statusStr] ?? 'acc'
  const i = iconMap[statusStr] ?? 'ℹ️'
  return (
    <div className="card">
      <div className="row between wrap gap-2">
        <div className="row items-center" style={{ gap: '.6rem' }}>
          <span className="status-dot" style={{ background: `var(--${t})` }} />
          <div>
            <div className="label">Project status</div>
            <div className="htitle sm">{statusStr}</div>
          </div>
        </div>
        <Tag tone={t as any}>{i} {statusStr}</Tag>
      </div>
      {reason && <p className="muted sm mt-2">{reason}</p>}
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────
export const Divider = ({ label }: { label?: string }) => (
  <div style={{ height: 1, background: 'var(--line)', margin: '1rem 0', position: 'relative' }}>
    {label && (
      <span className="pill sm" style={{
        position: 'absolute', top: '50%', left: '1rem',
        transform: 'translateY(-50%)',
        background: 'var(--surface)', border: '1px solid var(--line)',
      }}>{label}</span>
    )}
  </div>
)

// ─── Empty state ──────────────────────────────────────────────
export interface EmptyProps {
  icon?: ReactNode
  title: string
  subtitle?: string
  hint?: string
  action?: ReactNode
  actions?: ReactNode
  sub?: string
}
export const Empty = ({ icon, title, subtitle, hint, action, actions }: EmptyProps) => (
  <div className="empty" style={{ padding: '2rem 1.25rem', textAlign: 'center' }}>
    {icon && <div style={{ fontSize: '2.2rem', marginBottom: '.5rem' }}>{icon}</div>}
    <div className="htitle sm mb-1">{title}</div>
    {(subtitle ?? hint) && <p className="muted sm mb-3" style={{ maxWidth: 520, marginInline: 'auto' }}>{subtitle ?? hint}</p>}
    {action ?? actions}
  </div>
)

// ─── Modal ────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null
  return (
    <div className="backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: .98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: .99 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`modal ${wide ? 'wide' : ''}`}
        onClick={e => e.stopPropagation()}
        style={wide ? { maxWidth: 920 } : undefined}
        role="document"
      >
        <div className="row between mb-3">
          {title && <h2 className="htitle sm">{title}</h2>}
          <button className="icon-btn" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        {children}
      </motion.div>
    </div>
  )
}

// ─── Next Action Card ─────────────────────────────────────────
export interface NextAction {
  task: any
  reason: string
  expectedOutcome: string
  estimatedMinutes: number
  unlocks: string
  definitionOfDone: string
  priority: 'critical' | 'important' | 'useful'
}
export const NextActionCard = ({ action, onStart, onNotReady, onBlocked, onOther }: {
  action: NextAction
  onStart?: () => void
  onNotReady?: () => void
  onBlocked?: () => void
  onOther?: () => void
}) => {
  const prioTone: Record<string, string> = { critical: 'danger', important: 'warn', useful: 'info' }
  const prioLabel: Record<string, string> = { critical: 'CRITICAL — do today', important: 'IMPORTANT — do soon', useful: 'USEFUL — when time' }
  return (
    <div className="next-action-card mb-5">
      <div className="row between wrap gap-2 mb-3">
        <div>
          <div className="label" style={{ color: 'var(--accent)' }}>🎯 Your next best action</div>
          <h2 className="htitle sm mt-1">{action.task?.title || 'Create your first core task'}</h2>
        </div>
        <Tag tone={prioTone[action.priority] as any} sm>{prioLabel[action.priority] ?? action.priority}</Tag>
      </div>
      {action.task?.why && <p className="muted mb-3" style={{ lineHeight: 1.55 }}>{action.task.why}</p>}
      <div className="grid-2 mb-4" style={{ gap: '.6rem' }}>
        <div className="card-soft" style={{ padding: '.65rem .85rem' }}>
          <div className="label mb-1">Why now</div>
          <div className="small">{action.reason}</div>
        </div>
        <div className="card-soft" style={{ padding: '.65rem .85rem' }}>
          <div className="label mb-1">Work for</div>
          <div className="small"><b>{action.estimatedMinutes} minutes</b></div>
        </div>
        <div className="card-soft" style={{ padding: '.65rem .85rem' }}>
          <div className="label mb-1">Expected output</div>
          <div className="small">{action.expectedOutcome}</div>
        </div>
        <div className="card-soft" style={{ padding: '.65rem .85rem', borderLeft: '3px solid var(--good)' }}>
          <div className="label mb-1">Done when</div>
          <div className="small">{action.definitionOfDone}</div>
        </div>
      </div>
      {action.unlocks && (
        <div className="info mb-4" style={{ padding: '.6rem .85rem' }}>
          <span className="small"><b>Unlocks: </b>{action.unlocks}</span>
        </div>
      )}
      <div className="row wrap gap-2">
        {onStart && <button className="btn big" onClick={onStart}>▶ START</button>}
        {onNotReady && <button className="btn ghost" onClick={onNotReady}>⏳ Not ready yet</button>}
        {onBlocked && <button className="btn ghost" onClick={onBlocked}>🚧 I'm blocked</button>}
        {onOther && <button className="btn ghost" onClick={onOther}>🔄 Something else</button>}
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────
export function SectionHeader({ title, sub, icon, action }: { title: string; sub?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="row between flex-wrap mb-3" style={{ alignItems: 'end' }}>
      <div>
        <div className="label">{icon ? <span style={{ marginRight: 4 }}>{icon}</span> : null}{title}</div>
        {sub && <div className="htitle sm">{sub}</div>}
      </div>
      {action}
    </div>
  )
}

// ─── Health score bar ─────────────────────────────────────────
export const HealthBar = ({ label, score, tone }: { label: string; score: number; tone?: string }) => {
  const color = tone ? `var(--${tone})` : score >= 80 ? 'var(--good)' : score >= 55 ? 'var(--accent)' : score >= 35 ? 'var(--warn)' : 'var(--danger)'
  return (
    <div className="health-row">
      <span className="health-label">{label}</span>
      <div className="health-bar-wrap">
        <motion.div
          className="health-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ background: color }}
        />
      </div>
      <span style={{ fontSize: '.78rem', fontWeight: 700, width: 36, textAlign: 'right', color }}>{score}%</span>
    </div>
  )
}

// ─── Phase status badge ───────────────────────────────────────
export const PhaseBadge = ({ status }: { status: string }) => {
  const labels: Record<string, string> = {
    pending: '⬜ Pending', in_progress: '🔵 In progress', complete: '✅ Complete',
    blocked: '🟡 Blocked', planned: '📋 Planned', skipped: '⏩ Skipped',
  }
  return <span className={`phase-badge ${status}`}>{labels[status] ?? status.replace(/_/g, ' ')}</span>
}

// ─── Tip / info box ───────────────────────────────────────────
export const InfoBox = ({ icon = 'ℹ️', title, children, tone = 'info' }: {
  icon?: string; title?: string; children: ReactNode; tone?: 'info' | 'warn' | 'good' | 'danger'
}) => (
  <div className={tone} style={{ borderRadius: 'var(--radius-sm)', padding: '.75rem 1rem' }}>
    {title && <div style={{ fontWeight: 700, marginBottom: '.25rem' }}>{icon} {title}</div>}
    {!title && <span>{icon} </span>}
    {children}
  </div>
)

// ─── Confirm delete button ────────────────────────────────────
export const DeleteBtn = ({ onConfirm, label = 'Delete', className = '' }: {
  onConfirm: () => void
  label?: string
  className?: string
}) => {
  const [asking, setAsking] = useState(false)
  if (asking) return (
    <span className="row" style={{ gap: '.35rem' }}>
      <span className="small muted">Sure?</span>
      <button className="btn sm danger" onClick={() => { setAsking(false); onConfirm() }}>Yes, delete</button>
      <button className="btn sm ghost" onClick={() => setAsking(false)}>Cancel</button>
    </span>
  )
  return (
    <button className={`btn ghost sm ${className}`} onClick={() => setAsking(true)}>🗑 {label}</button>
  )
}

// ─── Loading spinner ──────────────────────────────────────────
export const Loading = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="p-8 text-center muted">
    <div className="pulse" style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>⌛</div>
    <div className="small">{label}</div>
  </div>
)
