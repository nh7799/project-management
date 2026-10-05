import type { Task, Evidence, ReportSection, ResearchSource, Risk, ProjectHealth } from '../types'
import { daysUntil } from './dates'

export function calcHealth(
  tasks: Task[], evidence: Evidence[], sections: ReportSection[],
  sources: ResearchSource[], risks: Risk[]
): ProjectHealth {
  const totalT = tasks.length || 1
  const doneT = tasks.filter(t => t.status === 'done').length
  const execution = Math.round((doneT / totalT) * 100)

  const tasksNeedEv = tasks.filter(t => t.status === 'done' && t.tier !== 'stretch').length || 1
  const tasksWithEv = tasks.filter(t => t.status === 'done' && (t.evidence_status === 'captured' || t.evidence_status === 'verified')).length
  const fromEv = evidence.length > 0 ? Math.min(100, Math.round(evidence.length * 8)) : 0
  const evidenceScore = Math.round((tasksWithEv / tasksNeedEv) * 60 + fromEv * 0.4)

  const totalSecs = sections.length || 1
  const draftedSecs = sections.filter(s => s.draft_status !== 'not_started').length
  const totalWordsTarget = sections.reduce((a, s) => a + (s.target_word_count || 0), 0) || 1
  const totalWordsCurrent = sections.reduce((a, s) => a + (s.current_word_count || 0), 0)
  const writing = Math.round(((draftedSecs / totalSecs) * 0.4 + Math.min(1, totalWordsCurrent / totalWordsTarget) * 0.6) * 100)

  const totalSources = sources.length || 1
  const readSources = sources.filter(s => s.read_status === 'read' || s.read_status === 'used_in_report').length
  const relevance = sources.filter(s => s.relevance && s.relevance.length > 10).length
  const research = Math.round(((readSources / totalSources) * 0.5 + (Math.min(1, relevance / (totalSources * 0.6))) * 0.5) * 100)

  const openRisks = risks.filter(r => r.status === 'open')
  const hi = openRisks.filter(r => r.impact === 'high' && r.probability === 'high').length
  const md = openRisks.filter(r => !(r.impact === 'high' && r.probability === 'high')).length
  const risk = Math.max(0, 100 - (hi * 25 + md * 10))

  const overall =
    (execution + evidenceScore + writing + research) / 4 >= 70 && risk >= 50 ? 'On track' :
    (execution + evidenceScore + writing + research) / 4 >= 40 && risk >= 30 ? 'Needs attention' :
    'At risk'

  return { execution, evidence: evidenceScore, writing, research, risk, overall }
}

export function chooseNextAction(
  tasks: Task[], deps: { task_id: string; depends_on: string }[], blockers: { status: string; task_id?: string | null }[],
  phases: { id: string; status: string }[]
): { reason: string; expectedOutcome: string; estimatedMinutes: number; unlocks: string; definitionOfDone: string; task: Task | null; priority: 'critical'|'important'|'useful' } {
  const openBlocked = new Set(blockers.filter(b => b.status === 'open' && b.task_id).map(b => b.task_id))

  const activePhaseIds = new Set(phases.filter(p => p.status === 'in_progress').map(p => p.id))
  const doneTasks = new Set(tasks.filter(t => t.status === 'done').map(t => t.id))

  const canStart = (t: Task) => {
    if (t.status === 'done') return false
    if (openBlocked.has(t.id)) return false
    const myDeps = deps.filter(d => d.task_id === t.id).map(d => d.depends_on)
    return myDeps.every(d => doneTasks.has(d))
  }

  const score = (t: Task): number => {
    let s = 0
    if (t.priority === 'critical') s += 1000
    else if (t.priority === 'important') s += 500
    if (t.tier === 'core') s += 300
    else if (t.tier === 'important') s += 150
    if (t.due) {
      const d = daysUntil(t.due)
      if (d < 0) s += 800 - d
      else if (d < 3) s += 600
      else if (d < 7) s += 400
      else if (d < 14) s += 200
    }
    if (t.phase_id && activePhaseIds.has(t.phase_id)) s += 100
    if (t.estimate_minutes && t.estimate_minutes <= 60) s += 40
    if (t.definition_of_done) s += 20
    return s
  }

  const candidates = tasks.filter(canStart).sort((a, b) => score(b) - score(a))
  const pick = candidates[0] || null

  const downstreams = pick ? deps.filter(d => d.depends_on === pick.id).length : 0
  const priority = pick?.priority || (pick && pick.tier === 'core' ? 'important' : 'useful') as any
  return {
    task: pick,
    reason: pick
      ? pick.due && daysUntil(pick.due) < 3 ? `It is due soon (${daysUntil(pick.due) < 0 ? `${-daysUntil(pick.due)}d overdue` : daysUntil(pick.due) + 'd left'}) and is ${pick.tier || 'important'}.`
        : downstreams > 0 ? `It unlocks ${downstreams} downstream task(s) and matters for your current phase.`
        : pick.why || `It is a ${pick.tier || 'scoped'} task in your current work.`
      : 'No actionable tasks found yet. Create your first core task.',
    expectedOutcome: pick?.output || (pick ? 'Tangible progress on this task and a clear completion signal.' : 'Your first task defined so the system can help you plan.'),
    estimatedMinutes: pick?.estimate_minutes || 30,
    unlocks: pick ? (downstreams > 0 ? `Enables ${downstreams} next task(s).` : 'Clears the way for follow-up work in this phase.') : 'Enables the planning engine to recommend next actions.',
    definitionOfDone: pick?.definition_of_done || (pick ? 'Completed according to its own definition of done, with evidence captured.' : 'Task saved with title, priority, and a clear definition of done.'),
    priority
  }
}

export function buildDailyPlan(
  capacity: '15min'|'30min'|'1h'|'2h'|'3+',
  tasks: Task[], deps: any[], blockers: any[], phases: any[]
): { must_do: string; should_do: string; optional_do: string; thirty_minutes: string } {
  const capMin = { '15min': 15, '30min': 30, '1h': 60, '2h': 120, '3+': 240 }[capacity]
  const openBlocked = new Set(blockers.filter((b: any) => b.status === 'open' && b.task_id).map((b: any) => b.task_id))
  const doneTasks = new Set(tasks.filter(t => t.status === 'done').map(t => t.id))

  const list = tasks.filter(t => {
    if (t.status === 'done') return false
    if (openBlocked.has(t.id)) return false
    return deps.filter((d: any) => d.task_id === t.id).every((d: any) => doneTasks.has(d.depends_on))
  }).sort((a, b) => {
    const sa = (a.priority === 'critical' ? 3 : a.priority === 'important' ? 2 : 1) + (a.tier === 'core' ? 2 : a.tier === 'important' ? 1 : 0)
    const sb = (b.priority === 'critical' ? 3 : b.priority === 'important' ? 2 : 1) + (b.tier === 'core' ? 2 : b.tier === 'important' ? 1 : 0)
    return sb - sa
  })

  let sum = 0; const must: string[] = []; const should: string[] = []; const opt: string[] = []
  for (const t of list) {
    const est = t.estimate_minutes || 45
    const label = t.title + (est ? ` (${est}m)` : '')
    if (sum + est <= capMin * 0.5) { must.push(label); sum += est }
    else if (sum + est <= capMin * 0.85) { should.push(label); sum += est }
    else { opt.push(label) }
  }
  const thirty = list.find(t => (t.estimate_minutes || 45) <= 30)?.title || list[0]?.title || 'Start your highest priority task'
  return {
    must_do: must.length ? must.join('; ') : 'Pick your single most important task and focus on it.',
    should_do: should.length ? should.join('; ') : 'Continue after must-do if energy remains.',
    optional_do: opt.length ? opt.slice(0, 3).join('; ') : 'Nothing scheduled — use leftover time for notes or review.',
    thirty_minutes: thirty
  }
}

export const SEVERITY_COLOUR: Record<string, string> = {
  low: 'var(--accent)', medium: '#d99a2b', high: '#d9534f'
}
export const STATUS_LABEL: Record<string, { label: string; colour: string; icon: string }> = {
  On track:   { label: 'On track',       colour: '#35a96a', icon: '🟢' },
  'Needs attention': { label: 'Needs attention', colour: '#d99a2b', icon: '🟡' },
  'At risk':  { label: 'At risk',        colour: '#d9534f', icon: '🔴' },
}
