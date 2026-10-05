export type Kind = 'official' | 'personal' | 'warning' | 'milestone' | 'note'
export interface EventRow { id: string; title: string; date: string; kind: Kind; done?: boolean; description?: string | null }

export type TaskStatus = 'not_started' | 'active' | 'blocked' | 'done' | 'todo' | 'in_progress' | 'complete' | string
export type TaskTier = 'core' | 'important' | 'optional' | 'stretch' | 'critical' | 'useful' | string
export type EvidenceStatus = 'missing' | 'draft' | 'captured' | 'verified' | 'partial' | 'exceeded' | string
export interface Task {
  id: string
  title: string
  description?: string | null
  tier: TaskTier
  priority?: 1 | 2 | 3 | 4 | 5 | string | number
  status: TaskStatus
  phase_id?: string | null
  report_section?: string | null
  due?: string | null
  estimate_minutes?: number | null
  evidence_status?: EvidenceStatus
  definition_of_done?: string | null
  blocker_reason?: string | null
  blocked_since?: string | null
  completed_at?: string | null
  why?: string | null
  output?: string | null
  created_at?: string
  updated_at?: string
  user_id?: string
  [k: string]: any
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  done: boolean
  status?: 'todo' | 'in_progress' | 'done' | string
  completed_at?: string | null
  order_index: number
  [k: string]: any
}

export interface Dependency {
  id: string; task_id: string; depends_on: string
}

export type DailyMood = 'great' | 'good' | 'neutral' | 'frustrated' | 'overwhelmed' | 'tired'
export interface Daily {
  id: string; day: string
  mission?: string | null; objective?: string | null
  biggest_win?: string | null; biggest_challenge?: string | null
  learned?: string | null; first_task_tomorrow?: string | null
  completed?: boolean
  capacity_minutes?: number | null
  start_state?: DailyMood | null
  end_state?: DailyMood | null
  user_id?: string
}

export type DecisionStatus = 'proposed' | 'decided' | 'implemented' | 'revisited' | 'archived'
export type DecisionCategory = 'technical' | 'scope' | 'methodology' | 'tools' | 'schedule' | 'team' | 'risk' | 'academic' | 'other'
export interface Decision {
  id: string
  question: string
  chosen: string | null
  reason: string | null
  alternatives?: string[] | null
  evidence?: string | null
  consequence?: string | null
  reversible?: boolean | null
  revisit_date?: string | null
  status: DecisionStatus
  category: DecisionCategory
  confidence: number | null
  decided_on: string
  archived?: boolean | null
  user_id?: string
  [k: string]: any
}

export type BlockerType = 'scope' | 'knowledge' | 'technical' | 'motivation' | 'time' | 'resource' | 'feedback' | 'life'
export type BlockerSeverity = 'low' | 'medium' | 'high' | 'critical'
export type BlockerStatus = 'open' | 'resolved'
export interface Blocker {
  id: string
  title: string
  description?: string | null
  blocker_type: BlockerType
  severity: BlockerSeverity
  status: BlockerStatus
  task_id?: string | null
  suggested_action?: string | null
  blocker_reason?: string | null
  blocked_since?: string | null
  resolved_at?: string | null
  next_action?: string | null
  resolution?: string | null
  user_id?: string
  [k: string]: any
}

export interface GuideProgress { id: string; step_key: string; done: boolean; user_id?: string; data?: any }

export interface Profile {
  id: string
  student_name?: string | null
  student_id?: string | null
  programme?: string | null
  pathway?: string | null
  level?: string | null
  project_title?: string | null
  supervisor_name?: string | null
  supervisor_email?: string | null
  second_marker?: string | null
  start_date?: string | null
  submission_date?: string | null
  viva_date?: string | null
  study_days_per_week?: number | null
  daily_capacity_minutes?: number | null
  preferred_task_size?: 'pomodoro' | 'small' | 'medium' | 'large' | 'as_long_as_needed' | null
  notification_preferences?: {
    email_task_reminder?: boolean
    email_supervisor_reminder?: boolean
    push_deadline?: boolean
    push_blocker?: boolean
    email_weekly_summary?: boolean
    push_next_action?: boolean
    [k: string]: boolean | undefined
  } | null
  theme_preferences?: { theme?: string; accent?: string; density?: 'comfortable' | 'compact' } | null
  user_id?: string
  created_at?: string
  updated_at?: string
  [k: string]: any
}

export type PhaseStatus = 'pending' | 'active' | 'done' | 'at_risk' | 'skipped' | 'in_progress' | 'complete' | 'blocked' | 'planned' | string
export interface Phase {
  id: string
  name: string
  order_index: number
  status: PhaseStatus
  objectives?: string | null
  mistakes_to_avoid?: string | null
  done_when?: string | null
  notes?: string | null
  started_on?: string | null
  completed_on?: string | null
  user_id?: string
  [k: string]: any
}

export type MilestoneStatus = 'planned' | 'in_progress' | 'done' | 'missed' | 'complete' | 'active' | 'overdue' | string
export interface Milestone {
  id: string
  phase_id?: string | null
  title: string
  description?: string | null
  due_date?: string | null
  status: MilestoneStatus
  definition_of_done?: string | null
  deliverables?: string | null
  prerequisites?: string | null
  evidence_required?: string | null
  risk_notes?: string | null
  completed_on?: string | null
  user_id?: string
  [k: string]: any
}

export type RequirementCategory = 'pass_rule' | 'academic' | 'technical' | 'ethical' | 'stakeholder' | 'evaluation' | 'artefact' | 'referencing' | 'other' | 'programme' | 'module' | 'project' | string
export type RequirementType = 'must' | 'should' | 'could' | 'wont' | 'programme' | 'module' | 'project' | string
export type RequirementStatus = 'not_attempted' | 'in_progress' | 'partially_met' | 'met' | 'out_of_scope' | 'partial' | 'exceeded' | string
export interface Requirement {
  id: string
  title: string
  description?: string | null
  type: RequirementType
  category: RequirementCategory
  source?: string | null
  status: RequirementStatus
  user_id?: string
  [k: string]: any
}

export interface LearningOutcome {
  id: string
  title: string
  description?: string | null
  category?: string | null
  status?: 'not_started' | 'in_progress' | 'partially_met' | 'met' | string | null
  user_id?: string
  [k: string]: any
}

export type EvidenceType = 'screenshot' | 'video' | 'document' | 'code' | 'dataset' | 'email' | 'notes' | 'diagram' | 'presentation' | 'other'
export interface Evidence {
  id: string
  title: string
  type: EvidenceType
  description?: string | null
  status: EvidenceStatus
  url?: string | null
  captured_on?: string | null
  task_id?: string | null
  report_section?: string | null
  tags?: string[] | null
  notes?: string | null
  user_id?: string
  [k: string]: any
}

export type DocumentSource = 'supervisor_email' | 'handbook' | 'lecture_notes' | 'canvas_assignment' | 'example_report' | 'paper' | 'dataset' | 'code_repo' | 'meeting_notes' | 'interview' | 'survey' | 'diary' | 'own_writing' | 'feedback' | 'ethics_form' | 'risk_assessment' | 'other'
export type DocumentImportance = 'critical' | 'high' | 'medium' | 'low' | 'important' | 'reference' | string
export interface Document {
  id: string
  title: string
  source_type: DocumentSource
  importance: DocumentImportance
  evidence_status: EvidenceStatus
  url?: string | null
  summary?: string | null
  added_on?: string | null
  tags?: string[] | null
  user_id?: string
  [k: string]: any
}

export interface RequirementEvidence { id: string; requirement_id: string; evidence_id: string }
export interface TaskRequirements { id: string; task_id: string; requirement_id: string }

export type SourceStatus = 'to_read' | 'reading' | 'skimmed' | 'read_fully' | 'annotated' | 'archived' | 'not_relevant'
export interface ResearchSource {
  id: string
  title: string
  authors?: string | null
  year?: number | null
  venue?: string | null
  url?: string | null
  status: SourceStatus
  read_progress_pct?: number | null
  category?: string | null
  tags?: string[] | null
  research_question?: string | null
  methodology?: string | null
  dataset?: string | null
  findings?: string | null
  limitations?: string | null
  relevance?: string | null
  quotations?: string | null
  interpretation?: string | null
  added_on?: string | null
  user_id?: string
  [k: string]: any
}

export type ResearchNoteCategory = 'summary' | 'critique' | 'comparison' | 'methodology' | 'quote' | 'gap' | 'idea' | 'todo'
export interface ResearchNote {
  id: string
  source_id?: string | null
  category: ResearchNoteCategory
  title: string
  content?: string | null
  tags?: string[] | null
  created_at?: string
  user_id?: string
  [k: string]: any
}

export type JournalTemplate = 'general' | 'experiment' | 'development' | 'meeting'
export interface JournalEntry {
  id: string
  title: string
  template: JournalTemplate
  entry_date: string
  mood: DailyMood | string
  tags?: string[] | null
  content: Record<string, string>
  created_at?: string
  meeting_id?: string | null
  user_id?: string
  [k: string]: any
}

export type RiskCategory = 'technical' | 'scope' | 'schedule' | 'resource' | 'academic' | 'quality' | 'team' | 'communication' | 'ethics' | 'external' | 'security' | string
export type RiskStatus = 'identified' | 'mitigating' | 'monitored' | 'closed' | 'accepted' | 'open' | string
export interface Risk {
  id: string
  title: string
  description?: string | null
  category: RiskCategory
  probability: 1 | 2 | 3 | 4 | 5 | number
  impact: 1 | 2 | 3 | 4 | 5 | number
  status: RiskStatus
  mitigation?: string | null
  contingency?: string | null
  trigger?: string | null
  owner?: string | null
  review_date?: string | null
  identified_on?: string | null
  user_id?: string
  [k: string]: any
}

export type MeetingKind = 'supervisor' | 'planning' | 'review' | 'other'
export type MeetingStatus = 'upcoming' | 'held' | 'archived'
export interface Meeting {
  id: string
  title: string
  kind: MeetingKind
  status: MeetingStatus
  meeting_date?: string | null
  duration_minutes?: number | null
  location?: string | null
  attendees?: string | null
  agenda?: string | null
  pre_meeting_tasks?: string | null
  discussion?: string | null
  feedback?: string | null
  decisions?: string | null
  actions?: string | null
  questions_next?: string | null
  journal_entry_id?: string | null
  user_id?: string
  created_at?: string
  [k: string]: any
}

export type DraftStatus = 'not_started' | 'outlining' | 'drafting' | 'reviewing' | 'finalised'
export interface ReportSection {
  id: string
  order_index: number
  title: string
  purpose?: string | null
  evidence_required?: string | null
  target_words: number
  current_words?: number | null
  draft_status: DraftStatus
  notes?: string | null
  user_id?: string
  [k: string]: any
}

export interface DailyPlan {
  id: string
  plan_date: string
  capacity_minutes?: number | null
  start_state?: string | null
  must_do?: string[] | null
  should_do?: string[] | null
  optional_do?: string[] | null
  thirty_minutes?: string | null
  created_at?: string
  user_id?: string
}

export interface WeeklyReview {
  id: string
  week_start: string
  went_well?: string | null
  went_poorly?: string | null
  learned?: string | null
  next_week_focus?: string | null
  blockers?: string | null
  risks?: string | null
  supervisor_action?: string | null
  user_id?: string
}

export type NotificationType = 'task_due' | 'deadline_approaching' | 'blocker_stale' | 'meeting_soon' | 'weekly_review_due' | 'risk_review_due'
export interface NotifRow {
  id: string
  type: NotificationType
  title: string
  body?: string | null
  href?: string | null
  read?: boolean
  due_on?: string | null
  created_at?: string
  user_id?: string
}

export interface SettingsKV { id: string; key: string; value: any; user_id?: string }

export type AuditAction = 'created' | 'updated' | 'deleted' | 'restored' | 'archived' | 'status_changed' | 'exported' | 'imported' | 'logged_in'
export interface AuditLogRow {
  id: string
  action: AuditAction
  table_name?: string | null
  row_id?: string | null
  before?: any
  after?: any
  note?: string | null
  created_at?: string
  user_id?: string
}

export interface ProjectHealthDimension {
  score: number;       // 0..100
  label: string;       // e.g. "execution"
  tone: 'good' | 'warn' | 'danger' | 'info' | 'acc' | 'muted' | string
  summary: string;     // 1-line human-readable
}

export interface ProjectHealth {
  overallScore: number                // 0..100 weighted blend
  overallLabel: string                // e.g. "Healthy" / "At risk"
  overallTone: 'good' | 'warn' | 'danger' | 'info' | 'acc'
  dimensions: {
    execution: ProjectHealthDimension
    evidence:  ProjectHealthDimension
    writing:   ProjectHealthDimension
    research:  ProjectHealthDimension
    risk:      ProjectHealthDimension
    schedule:  ProjectHealthDimension
  }
  // backward compat aliases — short names used by Home / page dashboards
  overall: { score: number; label: string; tone: 'good'|'warn'|'danger'|'info'|'acc'; summary: string }
  execution: ProjectHealthDimension
  evidence:  ProjectHealthDimension
  writing:   ProjectHealthDimension
  research:  ProjectHealthDimension
  risk:      ProjectHealthDimension
  schedule:  ProjectHealthDimension
}

export interface NextAction {
  task: Task | null
  reason: string
  expectedOutcome: string
  estimatedMinutes: number
  unlocks: string
  definitionOfDone: string
  priority: 'critical' | 'important' | 'useful'
}

export interface DailyPlanBucket {
  must_do: string[]
  should_do: string[]
  optional_do: string[]
  thirty_minutes: string
}

export type ResearchNotes = ResearchNote   // compat alias (plural)

export type CapacitySlot = '15min' | '30min' | '1h' | '2h' | '3+'
export type CurrentState =
  | 'ready' | 'calm' | 'tired' | 'stressed' | 'overwhelmed' | 'motivated'
  | 'unsure' | 'focused' | 'distracted' | 'burnt_out' | 'anxious' | string

export interface DailyPlan {
  id: string
  plan_date: string
  capacity_minutes?: number | null
  start_state?: CurrentState | string | null
  capacity_slot?: CapacitySlot | null
  must_do?: string[] | null
  should_do?: string[] | null
  optional_do?: string[] | null
  thirty_minutes?: string | null
  created_at?: string
  user_id?: string
}
