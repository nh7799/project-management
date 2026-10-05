import type { Task, Blocker, Phase, Evidence, ProjectHealth, ProjectHealthDimension, NextAction, DailyPlanBucket } from '../types'

/** Map a CapacitySlot string to minutes */
export const SLOT_MINUTES: Record<string, number> = {
  '15min': 15, '30min': 30, '1h': 60, '2h': 120, '3+': 240,
}
export function slotToMinutes(slot: string | number): number {
  if (typeof slot === 'number') return slot
  return (SLOT_MINUTES[slot] ?? parseInt(String(slot), 10)) || 120
}

export const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started', active: 'In progress', blocked: 'Blocked', done: 'Done', todo: 'To do',
  missing: 'Missing', draft: 'Draft', captured: 'Captured', verified: 'Verified',
  proposed: 'Proposed', decided: 'Decided', implemented: 'Implemented', revisited: 'Revisit', archived: 'Archived',
  pending: 'Pending', in_progress: 'In progress', complete: 'Complete', missed: 'Missed', planned: 'Planned',
  not_attempted: 'Not attempted', partially_met: 'Partially met', met: 'Met', out_of_scope: 'Out of scope', partial: 'Partial', exceeded: 'Exceeded',
  open: 'Open', resolved: 'Resolved',
  to_read: 'To read', reading: 'Reading', skimmed: 'Skimmed', read_fully: 'Read fully', annotated: 'Annotated',
  upcoming: 'Upcoming', held: 'Held',
  not_started_report: 'Not started', outlining: 'Outlining', drafting: 'Drafting', reviewing: 'Reviewing', finalised: 'Finalised',
  identified: 'Identified', mitigating: 'Mitigating', monitored: 'Monitored', closed: 'Closed', accepted: 'Accepted',
}

export const SEVERITY_COLOUR: Record<string, 'good'|'warn'|'danger'|'info'|'acc'|'muted'> = {
  low: 'good', medium: 'acc', high: 'warn', critical: 'danger',
  core: 'danger', important: 'warn', optional: 'info', stretch: 'muted',
  missing: 'danger', draft: 'warn', captured: 'acc', verified: 'good',
}

function toneFromScore(s: number): 'good' | 'warn' | 'danger' | 'acc' {
  if (s >= 80) return 'good'
  if (s >= 55) return 'acc'
  if (s >= 35) return 'warn'
  return 'danger'
}

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)) }

export function calcHealth(
  tasks: Task[],
  evidenceOrCount: number | Evidence[],
  reportSections: { draft_status: string; current_words?: number | null; target_words: number }[],
  sources: { status: string }[],
  blockers: Blocker[],
  risksOrPhases?: { probability: number; impact: number; status: string }[] | Phase[],
  phasesOrUndef?: Phase[],
): ProjectHealth {
  // Accept either an Evidence[] array or a plain count — backward compatible
  const evidenceCount = Array.isArray(evidenceOrCount) ? evidenceOrCount.length : evidenceOrCount
  // Support both 5-arg (old call signature where phases/risks are omitted) and full 7-arg signatures
  const sevenArg = phasesOrUndef !== undefined
  const risks: { probability: number; impact: number; status: string }[] = sevenArg
    ? (risksOrPhases as { probability: number; impact: number; status: string }[]) ?? []
    : []
  const phases: Phase[] = sevenArg
    ? (phasesOrUndef ?? [])
    : (risksOrPhases as Phase[] ?? [])
  // Execution dimension: task completion momentum (core weighting)
  const coreDone = tasks.filter(t => t.tier === 'core' && t.status === 'done').length
  const coreTotal = Math.max(1, tasks.filter(t => t.tier === 'core').length)
  const overallDone = tasks.filter(t => t.status === 'done').length
  const overallTotal = Math.max(1, tasks.length)
  const overdueBlocked = tasks.filter(t => t.status === 'blocked' || (t.due && t.status !== 'done' && new Date(t.due) < new Date())).length
  const execScore = clamp(
    (coreDone / coreTotal) * 60
    + (overallDone / overallTotal) * 25
    + clamp(100 - overdueBlocked * 18, 0, 100) * 0.15 * 100 / 15
  )
  const execution: ProjectHealthDimension = {
    score: Math.round(execScore), tone: toneFromScore(execScore), label: 'execution',
    summary: `${tasks.filter(t=>t.status==='done').length}/${tasks.length} tasks done. ${tasks.filter(t=>t.status==='blocked').length} blocked.`,
  }

  // Evidence dimension: evidence-status coverage of done tasks
  const doneTasks = tasks.filter(t => t.status === 'done')
  const evSupporting = doneTasks.filter(t => t.evidence_status === 'captured' || t.evidence_status === 'verified').length
  const evScore = doneTasks.length === 0 ? clamp(tasks.length * 5 + evidenceCount * 2, 10, 95)
    : clamp((evSupporting / doneTasks.length) * 75 + Math.min(25, evidenceCount * 0.5))
  const evidence: ProjectHealthDimension = {
    score: Math.round(evScore), tone: toneFromScore(evScore), label: 'evidence',
    summary: `${evSupporting}/${doneTasks.length} done tasks have evidence. ${evidenceCount} evidence items stored.`,
  }

  // Writing dimension: report draft_status weighted progression
  const stepWeights: Record<string, number> = { not_started: 0, outlining: 20, drafting: 45, reviewing: 75, finalised: 100 }
  const wAvg = reportSections.length === 0 ? 0 :
    reportSections.reduce((s, r) => s + (stepWeights[r.draft_status] ?? 0) * (r.target_words || 1), 0)
      / reportSections.reduce((s, r) => s + (r.target_words || 1), 0)
  const wordsWritten = reportSections.reduce((s, r) => s + (r.current_words || 0), 0)
  const wordsTarget = Math.max(1, reportSections.reduce((s, r) => s + r.target_words, 0))
  const wScore = clamp(wAvg * 0.7 + Math.min(100, wordsWritten / wordsTarget * 100) * 0.3)
  const writing: ProjectHealthDimension = {
    score: Math.round(wScore), tone: toneFromScore(wScore), label: 'writing',
    summary: `${reportSections.filter(r=>r.draft_status==='finalised'||r.draft_status==='reviewing').length}/${reportSections.length||'?'} sections advanced. ${wordsWritten.toLocaleString()}/${wordsTarget.toLocaleString()} words.`,
  }

  // Research dimension: source reading progress
  const STATUS_PCT: Record<string, number> = {
    to_read: 0, reading: 35, skimmed: 55, read_fully: 85, annotated: 100, archived: 100, not_relevant: 100,
  }
  const readProgress = sources.length === 0 ? 0 :
    sources.reduce<number>((s, src) => s + Number(STATUS_PCT[src.status] ?? 0), 0) / sources.length
  const rScore = sources.length === 0 ? 15 : clamp(readProgress)
  const research: ProjectHealthDimension = {
    score: Math.round(rScore), tone: toneFromScore(rScore), label: 'research',
    summary: sources.length ? `${sources.length} sources tracked. Avg reading stage: ~${Math.round(readProgress)}%` : 'No sources yet — consider adding some background reading.',
  }

  // Risk dimension: open exposure (prob×impact × open weights)
  const totalExposure = risks.reduce((s, r) => s + (r.status !== 'closed' && r.status !== 'accepted' ? r.probability * r.impact : 0), 0)
  const maxExposure = Math.max(1, risks.length * 25)
  const rkScore = clamp(100 - (totalExposure / maxExposure) * 100)
  const risk: ProjectHealthDimension = {
    score: Math.round(rkScore), tone: toneFromScore(rkScore), label: 'risk',
    summary: risks.length ? `${risks.filter(r=>r.status!=='closed'&&r.status!=='accepted').length}/${risks.length} risks open. Exposure ${totalExposure}/${maxExposure}.` : 'No risks registered yet — spend 10 minutes identifying top 3.',
  }

  // Schedule dimension: phases advancement rate + blockers age
  const phasesDone = phases.filter(p => p.status === 'done').length
  const phasesActive = phases.filter(p => p.status === 'active').length
  const phasesTotal = Math.max(1, phases.length)
  const openBlockers = blockers.filter(b => b.status === 'open').length
  const agedBlockers = blockers.filter(b => b.status === 'open' && b.blocked_since && (Date.now() - new Date(b.blocked_since).getTime()) / 86400000 > 3).length
  const schedScore = clamp(
    (phasesDone / phasesTotal) * 55
    + (Math.min(1, phasesActive) * 30)
    + clamp(100 - openBlockers * 12 - agedBlockers * 15, 0, 100) * 0.15
  )
  const schedule: ProjectHealthDimension = {
    score: Math.round(schedScore), tone: toneFromScore(schedScore), label: 'schedule',
    summary: `${phasesDone}/${phasesTotal} phases done. ${phasesActive} active. ${openBlockers} open blockers.`,
  }

  const weights = { execution: 0.25, evidence: 0.2, writing: 0.2, research: 0.1, risk: 0.1, schedule: 0.15 }
  const overallScore = Math.round(
    execution.score * weights.execution
    + evidence.score * weights.evidence
    + writing.score * weights.writing
    + research.score * weights.research
    + risk.score * weights.risk
    + schedule.score * weights.schedule
  )
  const overallTone = toneFromScore(overallScore)
  const overallLabel =
    overallScore >= 85 ? 'Thriving' : overallScore >= 70 ? 'Healthy' : overallScore >= 50 ? 'Getting there' :
    overallScore >= 35 ? 'Stalling' : overallScore >= 20 ? 'At risk' : 'Needs urgent triage'

  return {
    overallScore, overallTone, overallLabel,
    dimensions: { execution, evidence, writing, research, risk, schedule },
    // backward-compat direct accessors
    overall: { score: overallScore, label: overallLabel, tone: overallTone, summary: `Overall project health: ${overallLabel} (${overallScore}/100)` },
    execution, evidence, writing, research, risk, schedule,
  }
}

export function chooseNextAction(
  tasks: Task[],
  deps: { task_id: string; depends_on: string }[],
  blockers: { status: string; task_id?: string | null }[],
  phases: { id: string; status: string }[],
): NextAction {
  if (tasks.length === 0) {
    return {
      task: null,
      reason: 'Create your first core task (with definition of done) so we have something to schedule.',
      expectedOutcome: 'A short list of concrete tasks, each with a "done when" statement.',
      estimatedMinutes: 15,
      unlocks: 'Daily planning, phase progression, and evidence linking.',
      definitionOfDone: 'At least 3 core tasks created, each with a definition of done and an estimate.',
      priority: 'critical',
    }
  }

  const blockedTaskIds = new Set(blockers.filter(b => b.status === 'open').map(b => b.task_id))
  const depMap = new Map<string, string[]>()
  deps.forEach(d => {
    if (!depMap.has(d.task_id)) depMap.set(d.task_id, [])
    depMap.get(d.task_id)!.push(d.depends_on)
  })

  const statuses = new Map(tasks.map(t => [t.id, t.status]))
  const isUnblocked = (t: Task) => {
    if (t.status === 'blocked') return false
    if (blockedTaskIds.has(t.id)) return false
    const depsFor = depMap.get(t.id) ?? []
    for (const depId of depsFor) {
      if (statuses.get(depId) !== 'done') return false
    }
    return true
  }

  const now = Date.now()
  const priorityScore = (t: Task) => {
    const tierS = t.tier === 'core' ? 100 : t.tier === 'important' ? 70 : t.tier === 'optional' ? 35 : 15
    const prio = Number(t.priority ?? 3)
    const prioS = prio * 12
    const dueS = t.due
      ? Math.max(0, 40 - Math.floor((new Date(t.due).getTime() - now) / 86400000) * 3)
      : 0
    const activePhaseBoost = t.phase_id && phases.find(p => p.id === t.phase_id && p.status === 'active') ? 15 : 0
    const estimateBoost = (t.estimate_minutes && t.estimate_minutes <= 45) ? 8 : 0
    const statusS = t.status === 'active' ? 10 : t.status === 'not_started' ? 0 : -200
    return tierS + prioS + dueS + activePhaseBoost + estimateBoost + statusS
  }

  const candidates = tasks.filter(t => t.status !== 'done' && isUnblocked(t)).sort((a, b) => priorityScore(b) - priorityScore(a))
  const top = candidates[0]
  const task = top ?? tasks.find(t => t.status !== 'done') ?? tasks[0]

  const depsRemaining = (depMap.get(task?.id ?? '') ?? [])
    .filter(d => statuses.get(d) !== 'done').length

  const reason = (() => {
    const parts: string[] = []
    if (task.tier === 'core') parts.push('Core-tier (miss it = fail to pass)')
    else if (task.tier === 'important') parts.push('Important-tier (high marks impact)')
    const tp = Number(task.priority ?? 0)
    if (tp >= 4) parts.push(`Priority ${tp}/5`)
    if (task.due) {
      const days = Math.ceil((new Date(task.due).getTime() - now) / 86400000)
      parts.push(days < 0 ? `${-days}d OVERDUE` : days === 0 ? 'Due today' : `Due in ${days}d`)
    }
    if (task.phase_id && phases.find(p => p.id === task.phase_id && p.status === 'active')) parts.push('Unlocks the currently active phase')
    if (task.estimate_minutes && task.estimate_minutes <= 45) parts.push(`Small ${task.estimate_minutes}m task — quick win, momentum builder`)
    return parts.length ? parts.join(' · ') : 'Highest-ranked remaining task by priority + tier + due.'
  })()

  const unlocks = (() => {
    const unlockCount = deps.filter(d => d.depends_on === task.id).length
    if (unlockCount === 0) return 'Progresses current phase and moves any due dates forward.'
    return `Immediately unblocks ${unlockCount} dependent task${unlockCount === 1 ? '' : 's'} in your list.`
  })()

  const priority =
    (task.tier === 'core' && (task.due ? new Date(task.due).getTime() - now < 4 * 86400000 : true)) || (task.due && new Date(task.due).getTime() - now < 0) ? 'critical'
    : task.tier === 'core' || task.tier === 'important' ? 'important'
    : 'useful'

  return {
    task,
    reason,
    expectedOutcome: task.output || task.definition_of_done || 'One step closer to the phase being complete.',
    estimatedMinutes: task.estimate_minutes ?? 45,
    unlocks: depsRemaining > 0 ? `Has ${depsRemaining} unmet dependencies — consider starting one of those instead. → ${unlocks}` : unlocks,
    definitionOfDone: task.definition_of_done || `${task.title} completed, tested, and evidenced.`,
    priority,
  }
}

export function buildDailyPlan(
  capacityMinutesOrSlot: number | string,
  tasks: Task[],
  deps: { task_id: string; depends_on: string }[],
  blockers: { status: string; task_id?: string | null }[],
  phases: Phase[],
): DailyPlanBucket {
  const capacityMinutes = slotToMinutes(capacityMinutesOrSlot)
  // Build a priority-ranked list using the same scoring as chooseNextAction,
  // then bucket by capacity cutoffs: 50% → MUST, next 30% → SHOULD, rest → OPTIONAL.
  const blockedTaskIds = new Set(blockers.filter(b => b.status === 'open').map(b => b.task_id))
  const depMap = new Map<string, string[]>()
  deps.forEach(d => {
    if (!depMap.has(d.task_id)) depMap.set(d.task_id, [])
    depMap.get(d.task_id)!.push(d.depends_on)
  })
  const statuses = new Map(tasks.map(t => [t.id, t.status]))
  const isUnblocked = (t: Task) => {
    if (t.status === 'blocked' || t.status === 'done') return false
    if (blockedTaskIds.has(t.id)) return false
    return (depMap.get(t.id) ?? []).every(d => statuses.get(d) === 'done')
  }
  const now = Date.now()
  const score = (t: Task) => {
    const tierS = t.tier === 'core' ? 100 : t.tier === 'important' ? 70 : t.tier === 'optional' ? 35 : 15
    const prio = Number(t.priority ?? 3)
    const prioS = prio * 12
    const dueS = t.due ? Math.max(0, 40 - Math.floor((new Date(t.due).getTime() - now) / 86400000) * 3) : 0
    const phaseBoost = t.phase_id && phases.find(p => p.id === t.phase_id && p.status === 'active') ? 15 : 0
    const estBoost = (t.estimate_minutes && t.estimate_minutes <= 45) ? 8 : 0
    const statusS = t.status === 'active' ? 10 : 0
    return tierS + prioS + dueS + phaseBoost + estBoost + statusS
  }

  const ranked = tasks.filter(isUnblocked).sort((a, b) => score(b) - score(a))
  const cap = Math.max(60, capacityMinutes)

  const must_do: string[] = []
  const should_do: string[] = []
  const optional_do: string[] = []
  let acc = 0
  for (const t of ranked) {
    const est = t.estimate_minutes ?? 45
    if (acc + est <= cap * 0.5) { must_do.push(t.title); acc += est }
    else if (acc + est <= cap * 0.8) { should_do.push(t.title); acc += est }
    else { optional_do.push(t.title) }
  }

  if (must_do.length === 0 && ranked[0]) { must_do.push(ranked[0].title) }

  const thirtyMin = ranked.find(t => (t.estimate_minutes ?? 45) <= 30)?.title
    ?? must_do[0]
    ?? (ranked[0]?.title || '')

  return {
    must_do: must_do.slice(0, 4),
    should_do: should_do.slice(0, 5),
    optional_do: optional_do.slice(0, 8),
    thirty_minutes: thirtyMin,
  }
}
