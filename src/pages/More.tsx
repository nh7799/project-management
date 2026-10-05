import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useRows } from '../hooks/useRows'
import { H, Title, Pill, Empty, Card, Tag, Divider, Err } from '../components/ui'

const LINKS = [
  { group: 'Daily planning', links: [
    ['/home', '🏠 Today Dashboard', 'Your command centre — what matters right now'],
    ['/today', '🌅 Start / End my day', 'Daily questions, check-in, wrap-up'],
  ]},
  { group: 'Project engine', links: [
    ['/project', '🧭 Project phases & milestones', '17-phase lifecycle, milestone definitions-of-done'],
    ['/tasks', '✅ Tasks', 'Tasks with subtasks, dependencies, DoD, evidence'],
    ['/timeline', '📅 Timeline', 'Deadlines, UH dates, milestones, personal events'],
  ]},
  { group: 'Academic layer', links: [
    ['/evidence', '🧾 Evidence hub', 'Evidence, docs, requirements, evidence-map coverage'],
    ['/report', '📑 Report builder', '10 sections with word-counts, evidence gaps, statuses'],
    ['/checklist', '✅ Academic checklist', 'Mandatory UH checklist with progress and warnings'],
    ['/handbook', '📚 Handbook', 'All UH dates, weights, grading, handbook reference'],
    ['/projects', '💡 Projects library', 'Browse / shortlist project ideas'],
  ]},
  { group: 'Research & knowledge', links: [
    ['/research', '🔬 Research', 'Paper library + structured reading-notes workspace'],
    ['/journal', '📓 Journal', 'General / experiment / development / meeting templates'],
    ['/decisions', '🪧 Decisions log', 'Rationale, alternatives, trade-offs, revisit dates'],
  ]},
  { group: 'Risks, blockers, meetings', links: [
    ['/risks', '🛡️ Risks', 'Register, matrix, mitigation, contingency, owners'],
    ['/blockers', '🚧 Blockers', '8-type blockers + auto recovery-playbook suggestions'],
    ['/meetings', '👥 Meetings', 'Agenda → record → auto journal entry, brief generator'],
  ]},
  { group: 'Me & resources', links: [
    ['/profile', '👤 Profile / onboarding', '12 programme fields, deadlines, capacity'],
    ['/guide', '🧭 Onboarding guide', '12-step getting-started with auto-detection'],
    ['/settings', '⚙️ Settings', 'Theme, density, animations, font, text size'],
  ]},
] as const

export default function More() {
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)
  const [showSafety, setShowSafety] = useState(false)

  const tables = [
    'projects','events','tasks','subtasks','dependencies','daily_records','decisions',
    'blockers','guide_progress','profiles','phases','milestones','requirements',
    'learning_outcomes','evidence','documents','requirement_evidence','task_requirements',
    'research_sources','research_notes','journal_entries','risks','meetings',
    'report_sections','daily_plans','weekly_reviews','notifications','settings','audit_log',
  ]

  const runExport = async () => {
    setExporting(true)
    try {
      const { createClient } = await import('../lib/supabase')
      const sb = createClient()
      const tablesData: Record<string, unknown> = {}
      for (const t of tables) {
        try {
          const { data } = await sb.from(t).select('*').limit(5000)
          tablesData[t] = data
        } catch { /* skip if table missing in old DB */ }
      }
      const bundle = {
        exportedAt: new Date().toISOString(),
        schema: 'mission-control v2.0 (63-section spec)',
        tables: tablesData,
      }
      const json = JSON.stringify(bundle, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `project-mission-control-archive-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  return (
    <div className="stack">
      <Title
        eyebrow="§50 Hub, §51 Safety Net, §52 Export"
        title="More — everything else"
        subtitle="Navigation hub, orientation, safety net, and full-project export archive."
      >
        <div className="row wrap gap-2">
          <Pill tone="info">{LINKS.reduce((s,g) => s + g.links.length, 0)} pages</Pill>
          <Pill tone="acc">{tables.length} data tables exportable</Pill>
        </div>
      </Title>

      <div className="card-soft" style={{ borderLeft: '4px solid var(--accent)', background: 'color-mix(in oklab, var(--accent) 8%, transparent)' }}>
        <div className="hsection mb-2">📖 Read this first — orientation</div>
        <div className="grid-2">
          <div>
            <H size="h4" inline>This is not a to-do list app</H>
            <div className="muted mt-1">
              Mission Control is a calm, focused operating system for your final-year project.
              It expects you to be <strong>evidence-first</strong> and <strong>phase-aware</strong>,
              and it will tell you what to do next, even when you feel lost.
            </div>
          </div>
          <div>
            <H size="h4" inline>The 60-second rule</H>
            <ol className="list ml-4 mt-1">
              <li>Open 🏠 Today → read the 🎯 Next Action card</li>
              <li>Press ▶ START and time-box yourself (25m / pomodoro)</li>
              <li>When done: mark task done + log evidence</li>
              <li>If stuck: raise a 🚧 Blocker (auto playbook)</li>
              <li>End the day from 🌅 Today → End my day</li>
            </ol>
          </div>
          <div>
            <H size="h4" inline>The 10 success questions (§60)</H>
            <ol className="list ml-4 mt-1 muted sm">
              <li>What phase am I in?</li><li>What's most important today?</li>
              <li>Why that, not something else?</li><li>When will I know I'm finished?</li>
              <li>What evidence backs this?</li><li>What's the next hard deadline?</li>
              <li>What's blocking me?</li><li>What did I accomplish recently?</li>
              <li>Which requirements am I meeting?</li><li>What's the next right move?</li>
            </ol>
            <div className="sm good mt-2">→ All 10 are answered on the Today dashboard in under 5 seconds.</div>
          </div>
          <div>
            <H size="h4" inline>Keyboard shortcuts</H>
            <ul className="list ml-4 mt-1 muted sm">
              <li><code>Ctrl / ⌘ + K</code> — global search (pages, tasks, evidence, meetings, dates…)</li>
              <li><code>C</code> (any page) — floating ➕ Capture button</li>
              <li>Click any <strong>icon + label</strong> in the bottom tab bar — works with screen readers</li>
            </ul>
          </div>
        </div>
      </div>

      <Card>
        <div className="row between wrap gap-2">
          <H size="h3">🗺️ All pages</H>
          <div className="muted sm">Click any card to jump there</div>
        </div>
        <Divider />
        <div className="stack sm">
          {LINKS.map(group => (
            <div key={group.group}>
              <div className="label">{group.group}</div>
              <div className="grid-2">
                {group.links.map(([path, title, desc]) => (
                  <motion.button key={path} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="card-soft text-left"
                    onClick={() => navigate(path)}
                  >
                    <div className="row between wrap gap-2">
                      <div className="hsection mb-1">{title}</div>
                      <Tag tone="muted">{path}</Tag>
                    </div>
                    <div className="muted sm">{desc}</div>
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="row between wrap gap-2">
          <H size="h3">🎒 Project Safety Net (§51)</H>
          <button className={showSafety ? 'btn sm' : 'btn ghost sm'} onClick={() => setShowSafety(s => !s)}>
            {showSafety ? 'Hide' : 'Show triage'}
          </button>
        </div>
        <Divider />
        {!showSafety ? <Empty icon="🛟" title="Factual reassurance, when you feel behind or overwhelmed"
          subtitle="Open this to see: (a) real progress numbers from your data, (b) scope reduction, (c) recovery plans, (d) 7-path triage." />
        : (
          <SafetyNetPanel />
        )}
      </Card>

      <Card>
        <div className="row between wrap gap-2 items-center">
          <div>
            <H size="h3" inline>📦 Export project archive (§52)</H>
            <div className="muted sm">One-click JSON bundle of every table, for backups, supervisor hand-off, or submission artefact.</div>
          </div>
          <button className="btn big" disabled={exporting} onClick={runExport}>
            {exporting ? '⏳ Exporting…' : '⬇️ Download full archive (.json)'}
          </button>
        </div>
        <Divider />
        <div className="row wrap gap-1">
          {tables.map(t => <Tag key={t} tone="muted">{t}</Tag>)}
        </div>
      </Card>
    </div>
  )
}

function SafetyNetPanel() {
  const { rows: tasks } = useRows<any>('tasks')
  const { rows: evidence } = useRows<any>('evidence')
  const { rows: decisions } = useRows<any>('decisions')
  const { rows: journal } = useRows<any>('journal_entries')
  const { rows: blockers } = useRows<any>('blockers')

  const done = tasks.filter(t => t.status === 'done').length
  const withEvidence = tasks.filter(t => t.status === 'done' && (t.evidence_status === 'captured' || t.evidence_status === 'verified')).length

  return (
    <div className="stack sm">
      <div className="card-soft good" style={{ background: 'color-mix(in oklab, var(--good) 8%, transparent)' }}>
        <H size="h4" inline>📊 Factual progress summary (not affirmations)</H>
        <div className="grid-4 mt-2">
          <Stat label="Tasks created" value={tasks.length} />
          <Stat label="Tasks done" value={done} />
          <Stat label="Done w/ evidence" value={withEvidence} />
          <Stat label="Evidence items" value={evidence.length} />
          <Stat label="Decisions logged" value={decisions.length} />
          <Stat label="Journal entries" value={journal.length} />
          <Stat label="Blockers resolved" value={blockers.filter(b => b.status === 'resolved').length} />
          <Stat label="Blockers open" value={blockers.filter(b => b.status === 'open').length} tone="warn" />
        </div>
      </div>

      <div className="card-soft warn" style={{ background: 'color-mix(in oklab, var(--warn) 8%, transparent)' }}>
        <H size="h4" inline>🔽 When you're behind: scope reduction playbook</H>
        <ol className="list ml-4 mt-1">
          <li><strong>Sort tasks by tier.</strong> Do all <span className="pill sm acc">core</span> first. Move <span className="pill sm muted">stretch</span> to "post-submission ideas".</li>
          <li><strong>Drop non-pass-requirement features.</strong> Go to <Tag tone="muted">/evidence → Requirements</Tag> — anything not supporting a pass-rule gets deferred.</li>
          <li><strong>Shrink the artefact, not the report.</strong> A smaller, solid artefact + a well-evidenced report beats a big buggy one.</li>
          <li><strong>Tell your supervisor.</strong> A quick 2-liner email: "I'm reducing scope from X to Y; my minimum viable project is now Z."</li>
        </ol>
      </div>

      <div className="card-soft acc" style={{ background: 'color-mix(in oklab, var(--accent) 8%, transparent)' }}>
        <H size="h4" inline>🗺️ Recovery plan template</H>
        <ol className="list ml-4 mt-1">
          <li>Today → open <Tag tone="muted">/today → Daily check-in</Tag>, be honest about capacity and state.</li>
          <li>Get 1 concrete <span className="pill sm good">MUST DO</span> finished before lunch (pick from Today plan).</li>
          <li>Raise one <Tag tone="muted">/blockers</Tag> that has been unspoken.</li>
          <li>Schedule next <Tag tone="muted">/meetings</Tag> supervisor meeting — go with a written brief.</li>
          <li>Before bed → End my day from <Tag tone="muted">/today</Tag> — the 4 wrap-up questions will reset your head.</li>
        </ol>
      </div>

      <div className="card-soft info" style={{ background: 'color-mix(in oklab, var(--info) 8%, transparent)' }}>
        <H size="h4" inline>🛟 The 7-path "I feel lost" triage</H>
        <div className="grid-2 mt-1">
          {[
            ['Requirements unclear →', 'Go /evidence → Requirements tab, list what "pass" actually needs.'],
            ['Don\'t know what to work on →', 'Go /home → click the 🎯 Next Action card.'],
            ['Don\'t understand a concept →', 'Go /research → add source, then use Reading view 8-section grid.'],
            ['Stuck on a problem →', 'Go /blockers → raise blocker, auto playbook suggests recovery.'],
            ['Too much scope at once →', 'Open Safety Net → Scope reduction playbook (above).'],
            ['Feeling behind →', 'Run Recovery plan (above) + read the factual progress numbers.'],
            ["Good enough is fine, I don't need perfect →", 'Use "good enough" principle. Archive stretch tasks. Protect submission date.'],
          ].map(([h, b]) => (
            <div key={h} className="card-soft">
              <div className="label">{h}</div>
              <div className="sm muted">{b}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tone = 'acc' }: { label: string; value: number; tone?: 'acc'|'warn'|'good'|'danger'|'info'|'muted' }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color: `var(--${tone})` }}>{value}</div>
      <div className="stat-label muted sm">{label}</div>
    </div>
  )
}
