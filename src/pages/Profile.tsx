import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSingle } from '../hooks/useRows'
import { Profile } from '../types'
import { H, Title, Pill, Form, Empty, Card, Tag, Divider, Err } from '../components/ui'

const PROGRAMMES = ['BSc Computer Science','BSc Computer Science (Games)','BSc Software Engineering','BSc Data Science','BSc AI & ML','BSc Cyber Security','Other']
const PATHWAYS = ['General','Software Engineering','Data & AI','Cyber Security','Games Technology','Research (postgrad prep)']
const LEVELS = ['Level 4 (Year 1)','Level 5 (Year 2)','Level 6 (Year 3)','Level 7 (Masters)','Placement / sandwich']
const STUDY_DAYS = [0,1,2,3,4,5,6,7]
const PREFERRED_TASK_SIZES = ['pomodoro','small','medium','large','as_long_as_needed']
const NOTIFS = ['email_task_reminder','email_supervisor_reminder','push_deadline','push_blocker','email_weekly_summary','push_next_action'] as const

export default function ProfilePage() {
  const { row: profile, loading, error, add, update, reload } = useSingle<Profile>('profiles')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (saved) { const t = setTimeout(() => setSaved(false), 2500); return () => clearTimeout(t) }
  }, [saved])

  if (error) return <Err e={error} />

  return (
    <div className="stack">
      <Title
        eyebrow="§27 Profile / Onboarding Wizard"
        title="Your project profile"
        subtitle="Tell the Mission Control about your context — dates, programme, capacity. All features tune to these values."
      >
        {profile && (
          <div className="row wrap gap-2">
            <Pill tone="acc">{profile.programme ?? 'No programme set'}</Pill>
            {profile.project_title && <Pill tone="info">Project: {profile.project_title.slice(0,40)}{profile.project_title.length > 40 ? '…' : ''}</Pill>}
            {profile.supervisor_name && <Pill tone="good">Supervisor: {profile.supervisor_name}</Pill>}
            {profile.daily_capacity_minutes && <Pill tone="muted">Daily capacity {profile.daily_capacity_minutes}m</Pill>}
          </div>
        )}
      </Title>

      {loading && !profile ? <Empty icon="⏳" title="Loading profile…" /> :
        <Card>
          <div className="row between wrap gap-2">
            <H size="h3">🧙 Onboarding wizard</H>
            {saved && <Tag tone="good">✓ Saved</Tag>}
          </div>
          <Divider />
          <Form
            initial={{
              student_name: profile?.student_name ?? '',
              student_id: profile?.student_id ?? '',
              programme: profile?.programme ?? PROGRAMMES[0],
              pathway: profile?.pathway ?? '',
              level: profile?.level ?? LEVELS[2],
              project_title: profile?.project_title ?? '',
              supervisor_name: profile?.supervisor_name ?? '',
              supervisor_email: profile?.supervisor_email ?? '',
              second_marker: profile?.second_marker ?? '',
              start_date: profile?.start_date ?? new Date().toISOString().slice(0,10),
              submission_date: profile?.submission_date ?? '',
              viva_date: profile?.viva_date ?? '',
              study_days_per_week: String(profile?.study_days_per_week ?? 5),
              daily_capacity_minutes: String(profile?.daily_capacity_minutes ?? 240),
              preferred_task_size: profile?.preferred_task_size ?? 'medium',
              notification_preferences: (profile?.notification_preferences ?? (NOTIFS.map(n => ({ [n]: n === 'push_next_action' })) as unknown as Profile['notification_preferences'])),
              theme_preferences: profile?.theme_preferences ?? { theme: 'day', accent: 'blue', density: 'comfortable' },
            }}
            onSubmit={async (d) => {
              const payload: Partial<Profile> = {
                student_name: String(d.student_name),
                student_id: String(d.student_id),
                programme: String(d.programme),
                pathway: String(d.pathway || null) || null,
                level: String(d.level),
                project_title: String(d.project_title || null) || null,
                supervisor_name: String(d.supervisor_name || null) || null,
                supervisor_email: String(d.supervisor_email || null) || null,
                second_marker: String(d.second_marker || null) || null,
                start_date: String(d.start_date || null) || null,
                submission_date: String(d.submission_date || null) || null,
                viva_date: String(d.viva_date || null) || null,
                study_days_per_week: parseInt(String(d.study_days_per_week), 10) || 0,
                daily_capacity_minutes: parseInt(String(d.daily_capacity_minutes), 10) || 0,
                preferred_task_size: String(d.preferred_task_size) as Profile['preferred_task_size'],
                notification_preferences: d.notification_preferences as Profile['notification_preferences'],
                theme_preferences: d.theme_preferences as Profile['theme_preferences'],
              }
              if (profile) { await update(profile.id, payload); setSaved(true) }
              else { await add(payload as unknown as Profile); setSaved(true); void reload() }
            }}
            submitLabel="💾 Save profile"
            cols={2}
            fields={[
              { key: 'student_name', label: 'Full name', type: 'text', required: true },
              { key: 'student_id', label: 'Student ID / number', type: 'text' },
              { key: 'programme', label: 'Programme of study', type: 'select', options: PROGRAMMES.map(p => ({ value: p, label: p })) },
              { key: 'pathway', label: 'Pathway / specialism', type: 'select', options: PATHWAYS.map(p => ({ value: p, label: p })) },
              { key: 'level', label: 'Academic level / year', type: 'select', options: LEVELS.map(l => ({ value: l, label: l })) },
              { key: 'project_title', label: 'Working project title', type: 'text', colSpan: 2 },
              { key: 'supervisor_name', label: 'Supervisor name' },
              { key: 'supervisor_email', label: 'Supervisor email' },
              { key: 'second_marker', label: 'Second marker (if known)' },
              { key: 'start_date', label: 'Project start date', type: 'date' },
              { key: 'submission_date', label: 'Final report submission deadline', type: 'date' },
              { key: 'viva_date', label: 'Viva / presentation date (if known)', type: 'date' },
              { key: 'study_days_per_week', label: 'Days per week committed to project', type: 'select', options: STUDY_DAYS.map(n => ({ value: String(n), label: `${n} day${n===1?'':'s'}` })) },
              { key: 'daily_capacity_minutes', label: 'Minutes per day you can spend on project (e.g. 240 = 4h)', type: 'select', options: [
                60,90,120,150,180,210,240,300,360,420,480,540,600
              ].map(n => ({ value: String(n), label: `${n} min (${Math.floor(n/60)}h${n%60?` ${n%60}m`:''})` })) },
              { key: 'preferred_task_size', label: 'Default task size to recommend', type: 'select', options: PREFERRED_TASK_SIZES.map(t => ({ value: t, label: t.replace('_',' ') })) },
            ]}
          >
            <div className="col-span-2">
              <Divider />
              <H size="h4" inline>🔔 Notification preferences</H>
              <div className="grid-2 mt-2">
                {NOTIFS.map(key => {
                  const initial: Profile['notification_preferences'] = (profile?.notification_preferences as any) ?? {} as any
                  return (
                    <label key={key} className="checkbox">
                      <input type="checkbox" defaultChecked={initial?.[key] !== false} name={`np_${key}`} />
                      <span className="label">{key.replace(/_/g, ' ')}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </Form>
        </Card>
      }

      {profile && profile.submission_date && (
        <Card>
          <H size="h3">⏰ Countdown to submission</H>
          <Divider />
          <CountdownCard dateStr={profile.submission_date} label="Final submission" tone="danger" />
          {profile.viva_date && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
              <CountdownCard dateStr={profile.viva_date} label="Viva / presentation" tone="warn" />
            </motion.div>
          )}
        </Card>
      )}
    </div>
  )
}

function CountdownCard({ dateStr, label, tone }: { dateStr: string; label: string; tone: 'danger'|'warn'|'acc'|'good' }) {
  const diff = new Date(dateStr).getTime() - Date.now()
  const days = Math.ceil(diff / 86400000)
  const weeks = Math.floor(days / 7)
  const remDays = days % 7
  const colour = tone
  return (
    <div className="card-soft" style={{ borderLeft: `4px solid var(--${colour})` }}>
      <div className="row between wrap gap-2 items-center">
        <div>
          <div className="hsection">{label}</div>
          <div className="muted sm">{dateStr}</div>
        </div>
        <div className="row center gap-4">
          <div className="row col center">
            <div className="stat-value" style={{ color: `var(--${colour})` }}>{days >= 0 ? days : Math.abs(days)}</div>
            <div className="stat-label muted sm">days {days >= 0 ? 'left' : 'overdue'}</div>
          </div>
          <div className="row col center">
            <div className="stat-value">{weeks >= 0 ? weeks : 0}</div>
            <div className="stat-label muted sm">weeks</div>
          </div>
          <div className="row col center">
            <div className="stat-value">{remDays >= 0 ? remDays : 0}</div>
            <div className="stat-label muted sm">+ days</div>
          </div>
        </div>
      </div>
    </div>
  )
}
