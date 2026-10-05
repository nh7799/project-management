import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRows } from '../hooks/useRows'
import { Risk } from '../types'
import { H, Title, Pill, Form, Empty, Card, Tag, Divider, stagger, Err, Donut } from '../components/ui'

const CATEGORIES = ['technical','scope','schedule','resource','academic','quality','team','communication','ethics','external','security'] as const
const STATUSES = ['identified','mitigating','monitored','closed','accepted'] as const
const PROBABILITIES = [1,2,3,4,5] as const
const IMPACTS = [1,2,3,4,5] as const

const COLOUR = (score: number) =>
  score >= 20 ? 'danger' : score >= 12 ? 'warn' : score >= 6 ? 'acc' : 'good'

export default function Risks() {
  const { rows: risks, loading, error, add, update, remove } = useRows<Risk>('risks')
  const [filter, setFilter] = useState<Risk['status']|'all'|'open'>('open')

  const filtered = useMemo(() => risks.filter(r => {
    if (filter === 'all') return true
    if (filter === 'open') return r.status !== 'closed' && r.status !== 'accepted'
    return r.status === filter
  }), [risks, filter])

  const matrixData = useMemo(() => {
    const grid: number[][] = Array.from({length:5}, () => Array(5).fill(0))
    risks.forEach(r => { grid[r.impact-1]?.[r.probability-1] !== undefined && (grid[r.impact-1][r.probability-1]++) })
    return grid
  }, [risks])

  const exposure = useMemo(() => risks.reduce((s,r) => s + (r.probability * r.impact), 0), [risks])
  const maxExposure = risks.length * 25 || 1

  if (error) return <Err e={error} />

  return (
    <div className="stack">
      <Title
        eyebrow="§19 Risk Register"
        title="Risk Register & Mitigation"
        subtitle="If you can foresee it, you can prepare for it. Probability × Impact = Prioritisation."
      >
        <div className="row wrap gap-2">
          <Pill tone="info">{risks.length} registered</Pill>
          <Pill tone={exposure / maxExposure > 0.5 ? 'warn' : 'good'}>Total exposure {exposure}/{maxExposure}</Pill>
          <Pill tone="muted">Top {risks.filter(r => r.probability*r.impact >= 12).length} high-severity</Pill>
        </div>
      </Title>

      <div className="grid-2">
        <Card>
          <div className="hsection mb-2">🔥 Risk matrix (Impact × Probability)</div>
          <div className="grid" style={{ gridTemplateColumns: 'auto repeat(5, 1fr)', gap: 4 }}>
            <div></div>
            {PROBABILITIES.map(p => <div key={p} className="muted sm text-center">P{p}</div>)}
            {IMPACTS.slice().reverse().map(i => (
              <div key={i} className="contents">
                <div className="muted sm">I{i}</div>
                {PROBABILITIES.map(p => {
                  const score = i * p
                  const count = matrixData[i-1]?.[p-1] ?? 0
                  return (
                    <div key={p} className="row center" style={{
                      background: `color-mix(in oklab, var(--${COLOUR(score)}) ${20 + score*3}%, transparent)`,
                      border: `1px solid var(--line)`,
                      borderRadius: 'var(--radius)',
                      minHeight: 40,
                      fontWeight: 600,
                    }}>
                      {count > 0 ? count : '·'}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="mt-3 muted sm">Read: P=Probability 1→5, I=Impact 1→5. Higher-right = highest priority.</div>
        </Card>

        <Card>
          <div className="hsection mb-2">🎯 Overall exposure</div>
          <Donut percent={Math.min(100, exposure / maxExposure * 100)}
            tone={COLOUR((exposure / maxExposure) * 25)}
            label="Exposure"
            sub={`${exposure} risk-score`}
          />
        </Card>
      </div>

      <div className="card-soft">
        <div className="hsection mb-3">⚠️ Register a new risk</div>
        <Form
          initial={{
            title: '', description: '', category: 'technical',
            probability: '3', impact: '3', status: 'identified',
            mitigation: '', contingency: '', trigger: '', owner: '', review_date: '',
          }}
          onSubmit={async (d) => {
            await add({
              title: String(d.title),
              description: String(d.description),
              category: String(d.category) as Risk['category'],
              probability: parseInt(String(d.probability),10) as Risk['probability'],
              impact: parseInt(String(d.impact),10) as Risk['impact'],
              status: String(d.status) as Risk['status'],
              mitigation: String(d.mitigation || null) || null,
              contingency: String(d.contingency || null) || null,
              trigger: String(d.trigger || null) || null,
              owner: String(d.owner || null) || null,
              review_date: String(d.review_date || null) || null,
              identified_on: new Date().toISOString().slice(0,10),
            } as unknown as Risk)
          }}
          submitLabel="Add risk"
          cols={2}
          fields={[
            { key: 'title', label: 'Risk title — what could go wrong?', type: 'text', required: true, colSpan: 2 },
            { key: 'category', label: 'Category', type: 'select', options: CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase()+c.slice(1) })) },
            { key: 'status', label: 'Status', type: 'select', options: STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase()+s.slice(1) })) },
            { key: 'probability', label: 'Probability (1=rare → 5=certain)', type: 'select', options: PROBABILITIES.map(p => ({ value: String(p), label: `${p} — ${['Rare','Unlikely','Possible','Likely','Certain'][p-1]}` })) },
            { key: 'impact', label: 'Impact (1=minor → 5=critical)', type: 'select', options: IMPACTS.map(i => ({ value: String(i), label: `${i} — ${['Negligible','Minor','Moderate','Major','Critical'][i-1]}` })) },
            { key: 'description', label: 'Full description + consequences if realised', type: 'textarea', rows: 3, colSpan: 2 },
            { key: 'mitigation', label: 'Mitigation (how to REDUCE probability/impact)', type: 'textarea', rows: 2, colSpan: 2 },
            { key: 'contingency', label: 'Contingency (what to do IF it happens)', type: 'textarea', rows: 2, colSpan: 2 },
            { key: 'trigger', label: 'Trigger condition(s) that would activate contingency', type: 'text', colSpan: 2 },
            { key: 'owner', label: 'Owner (who watches this risk)' },
            { key: 'review_date', label: 'Next review date', type: 'date' },
          ]}
        />
      </div>

      <Card>
        <div className="row between wrap gap-2">
          <H size="h3">📋 Risk register</H>
          <div className="tabs scroll-x">
            {[['open','Open'],...STATUSES.map(s => [s,s.charAt(0).toUpperCase()+s.slice(1)]),['all','All']].map(([k,l]) => (
              <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k as typeof filter)}>{l}</button>
            ))}
          </div>
        </div>
        <Divider />
        {loading ? <Empty icon="⏳" title="Loading risks…" /> :
         filtered.length === 0 ? <Empty icon="🛡️" title="No risks registered here yet" subtitle="Think through: technical, schedule, academic and external risks you might face." /> :
        <motion.div variants={stagger} initial="initial" animate="animate" className="stack sm">
          {filtered
            .sort((a,b) => (b.probability*b.impact) - (a.probability*a.impact))
            .map(r => {
              const score = r.probability * r.impact
              return (
                <motion.div key={r.id} variants={stagger.children}
                  className="card-soft"
                  style={{ borderLeft: `4px solid var(--${COLOUR(score)})` }}
                >
                  <div className="row between wrap gap-2 mb-2">
                    <div className="row wrap gap-2 items-center">
                      <span className="pill" style={{
                        background: `color-mix(in oklab, var(--${COLOUR(score)}) 25%, transparent)`,
                        fontWeight: 700,
                        borderColor: `var(--${COLOUR(score)})`,
                      }}>P{r.probability}×I{r.impact} = {score}</span>
                      <H size="h4" inline>{r.title}</H>
                      <Tag tone="info">{r.category}</Tag>
                      <Tag tone={
                        r.status === 'closed' ? 'good' :
                        r.status === 'mitigating' ? 'acc' :
                        r.status === 'monitored' ? 'warn' :
                        r.status === 'accepted' ? 'muted' : 'danger'
                      }>{r.status}</Tag>
                      {r.review_date && <Tag tone="muted">🔍 {String(r.review_date).slice(0,10)}</Tag>}
                      {r.owner && <Tag tone="muted">👤 {r.owner}</Tag>}
                    </div>
                    <div className="row gap-1">
                      <select className="input sm" value={r.status}
                        onChange={e => void update(r.id, { status: e.target.value as Risk['status'] })}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button className="btn ghost sm" onClick={() => remove(r.id)}>Delete</button>
                    </div>
                  </div>
                  {r.description && <div className="muted mb-2">{r.description}</div>}
                  <div className="grid-2">
                    {r.mitigation && (
                      <div className="card-soft good sm" style={{ background: 'color-mix(in oklab, var(--good) 8%, transparent)' }}>
                        <div className="label good">🛡️ Mitigation</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{r.mitigation}</div>
                      </div>
                    )}
                    {r.contingency && (
                      <div className="card-soft warn sm" style={{ background: 'color-mix(in oklab, var(--warn) 8%, transparent)' }}>
                        <div className="label warn">🚨 Contingency</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{r.contingency}</div>
                      </div>
                    )}
                    {r.trigger && (
                      <div className="col-span-2">
                        <span className="pill warn sm">🚩 Trigger: {r.trigger}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
        </motion.div>}
      </Card>
    </div>
  )
}
