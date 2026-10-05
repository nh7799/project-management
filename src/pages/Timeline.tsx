import { useRows } from '../hooks/useRows'
import { daysUntil, fmt, todayISO } from '../utils/dates'
import { Form, Err, Title, SectionHeader, Tag, Empty } from '../components/ui'
import type { EventRow } from '../types'

const UH = [
  ['Supervisors allocated ("all efforts", not guaranteed)', '2026-10-07', 'note'],
  ['Initial supervisor meeting window ends (8–14 Oct). Assignment 2 released 09:00', '2026-10-14', 'note'],
  ['Assignment 1: Project Selection (Canvas, 17:00)', '2026-10-15', 'official'],
  ['Logbook 1 closes 23:00', '2026-10-30', 'official'],
  ['Logbook 2 closes 23:00', '2026-11-13', 'official'],
  ['Assignment 2: Project Outline (10%) — Canvas, 17:00', '2026-11-16', 'official'],
  ['Logbook 3 closes 23:00', '2026-11-27', 'official'],
  ['Logbook 4 closes 23:00', '2026-12-11', 'official'],
  ['Christmas recess begins (back w/b 11 Jan). Check supervisor availability', '2026-12-21', 'note'],
  ['Logbook 5 closes 23:00', '2027-01-15', 'official'],
  ['Exam week (w/b 18 Jan)', '2027-01-18', 'note'],
  ['Logbook 6 closes 23:00', '2027-01-29', 'official'],
  ['Logbook 7 closes 23:00', '2027-02-12', 'official'],
  ['Logbook 8 closes 23:00', '2027-02-26', 'official'],
  ['Second markers allocated (w/b 1 Mar)', '2027-03-01', 'note'],
  ['Logbook 9 closes 23:00', '2027-03-12', 'official'],
  ['Logbook 10 closes 23:00', '2027-03-19', 'official'],
  ['Easter recess begins (w/b 22 and 29 Mar)', '2027-03-22', 'note'],
  ['Assignment 3: Project Report (65%) — Canvas, 15:00', '2027-04-09', 'official'],
  ['Viva / demonstration window opens (12–23 Apr). Compulsory.', '2027-04-12', 'official'],
  ['Viva window closes (alternative week w/b 19 Apr)', '2027-04-23', 'official'],
  ['Results released; referral period starts (3 calendar weeks)', '2027-06-07', 'note'],
  ['Referral submissions (w/b 5 Jul)', '2027-07-05', 'note'],
  ['Outline — personal target', '2026-11-09', 'personal'],
  ['Prototype — personal target', '2026-12-18', 'personal'],
  ['Core complete — personal target', '2027-01-29', 'personal'],
  ['Implementation freeze', '2027-03-05', 'personal'],
  ['Full report draft', '2027-03-19', 'personal'],
  ['Report submit — personal target', '2027-04-02', 'personal'],
  ['Report — warning date', '2027-04-06', 'warning'],
]

const KIND_OPTS = [
  { value: 'official', label: '🔴 Official (hard deadline)' },
  { value: 'personal', label: '🟢 Personal target' },
  { value: 'milestone', label: '🏁 Milestone' },
  { value: 'warning', label: '🟡 Warning' },
  { value: 'note', label: '📝 Note' },
]

export default function Timeline() {
  const { rows, error, add, update, remove, upsert } = useRows<EventRow>('events', 'date', true)
  const today = todayISO()

  const grouped = {
    overdue: rows.filter(e => !e.done && daysUntil(e.date) < 0).sort((a, b) => daysUntil(a.date) - daysUntil(b.date)),
    today: rows.filter(e => daysUntil(e.date) === 0),
    upcoming7: rows.filter(e => !e.done && daysUntil(e.date) >= 1 && daysUntil(e.date) <= 7).sort((a, b) => daysUntil(a.date) - daysUntil(b.date)),
    upcoming: rows.filter(e => !e.done && daysUntil(e.date) >= 8).sort((a, b) => daysUntil(a.date) - daysUntil(b.date)),
    done: rows.filter(e => e.done).sort((a, b) => daysUntil(b.date) - daysUntil(a.date)).slice(0, 20),
  }

  const officialCount = rows.filter(e => e.kind === 'official').length

  const loadDefaults = async () => {
    for (const [title, date, kind] of UH) {
      await upsert({ title, date, kind: kind as any, done: false })
    }
  }

  const Group = ({ title, items, tone, icon }: { title: string; items: EventRow[]; tone?: 'bad'|'warn'|'acc'|'ok'|'good'; icon: string }) => (
    items.length > 0 && (
      <div className="card mb-4">
        <SectionHeader title={`${icon} ${title}`} sub={`${items.length} item${items.length > 1 ? 's' : ''}`} />
        <ul className="timeline-line mt-3" style={{ listStyle: 'none', paddingLeft: '1.5rem' }}>
          {items.map(e => {
            const n = daysUntil(e.date)
            return (
              <li key={e.id} className={`timeline-item ${e.done ? 'done' : n < 0 ? '' : n < 7 ? '' : 'pending'}`}>
                <div className="row between" style={{ alignItems: 'start', gap: '.5rem', flexWrap: 'wrap' }}>
                  <div className="row" style={{ gap: '.6rem', flex: 1, minWidth: 0, alignItems: 'start' }}>
                    <input className="checkbox" style={{ marginTop: 4 }} type="checkbox" checked={e.done} onChange={() => update(e.id, { done: !e.done })} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row" style={{ gap: '.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className={e.done ? 'line-through' : ''} style={{ fontWeight: 600 }}>{e.title}</span>
                        <Tag tone={e.kind === 'official' ? 'bad' : e.kind === 'warning' ? 'warn' : e.kind === 'milestone' ? 'acc' : e.kind === 'personal' ? 'ok' : undefined}>
                          {e.kind}
                        </Tag>
                        {n < 0 && !e.done && <Tag tone="bad">{-n}d overdue</Tag>}
                        {n === 0 && !e.done && <Tag tone="warn">Today</Tag>}
                        {n > 0 && n <= 7 && !e.done && <Tag tone="warn">{n}d</Tag>}
                      </div>
                      <div className="tiny muted">{fmt(e.date)}{e.done ? ' · done' : n >= 0 ? ` · ${n === 0 ? 'today' : `in ${n} day${n === 1 ? '' : 's'}`}` : ` · ${-n} day${-n === 1 ? '' : 's'} ago`}</div>
                    </div>
                  </div>
                  <button className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => remove(e.id, false)} aria-label="Remove event">🗑</button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    )
  )

  return (
    <div>
      <Title
        sub={`${officialCount} official · ${rows.filter(e => !e.done && daysUntil(e.date) < 0).length} overdue · ${rows.length} total`}
        right={rows.length === 0 && <button className="btn" onClick={loadDefaults}>📅 Load UH 2026/27 dates</button>}
      >
        📅 Timeline / deadlines
      </Title>
      <Err msg={error} />

      <Form
        cols={2}
        label="➕ Add event"
        fields={[
          { name: 'title', label: 'Title', required: true, placeholder: 'e.g. Supervisor meeting #3' },
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'kind', label: 'Type', options: KIND_OPTS },
        ]}
        onSubmit={add}
      />

      {rows.length === 0 ? (
        <Empty title="No dates loaded yet" hint="Load the UH 2026/27 defaults above or add your own custom dates." action={<button className="btn" onClick={loadDefaults}>📅 Load UH 2026/27 dates</button>} />
      ) : (
        <>
          <div className="card mb-4">
            <SectionHeader title="Today is" sub={fmt(today)} />
            <div className="grid-4">
              <div className="stat-card"><div className="hsection">Official loaded</div><div className="htitle sm">{officialCount}</div></div>
              <div className="stat-card"><div className="hsection">Overdue</div><div className="htitle sm" style={{ color: '#d9534f' }}>{grouped.overdue.length}</div></div>
              <div className="stat-card"><div className="hsection">Due this week</div><div className="htitle sm" style={{ color: '#d99a2b' }}>{grouped.upcoming7.length + grouped.today.filter(e => !e.done).length}</div></div>
              <div className="stat-card"><div className="hsection">Completed</div><div className="htitle sm" style={{ color: '#35a96a' }}>{grouped.done.length}</div></div>
            </div>
          </div>
          <Group title="Overdue" items={grouped.overdue} tone="bad" icon="🔴" />
          <Group title="Today" items={grouped.today} tone="warn" icon="📍" />
          <Group title="Next 7 days" items={grouped.upcoming7} tone="warn" icon="🗓" />
          <Group title="Upcoming later" items={grouped.upcoming} icon="⏳" />
          <Group title="Recently completed" items={grouped.done} tone="ok" icon="✅" />
        </>
      )}
    </div>
  )
}
