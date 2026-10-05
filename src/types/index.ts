export type Kind = 'official'|'personal'|'warning'|'milestone'|'note'
export interface EventRow { id:string; title:string; date:string; kind:Kind; done:boolean }

export type Tier = 'core'|'important'|'optional'|'stretch'
export type TaskStatus = 'not_started'|'active'|'blocked'|'done'|'todo'
export type EvidenceStatus = 'missing'|'draft'|'captured'|'verified'
export type Priority = 'critical'|'important'|'useful'

export interface Task {
  id:string; title:string; tier?:Tier; status:TaskStatus; due:string|null;
  description?:string; phase_id?:string|null; priority?:Priority; estimate_minutes?:number;
  evidence_status?:EvidenceStatus; definition_of_done?:string;
  blocker_reason?:string; blocked_since?:string|null; completed_at?:string|null;
  report_section?:string; why?:string; output?:string;
  created_at?:string;
}

export interface Subtask { id:string; task_id:string; title:string; status:'todo'|'done'; order_index:number; created_at?:string }
export interface Dependency { id:string; task_id:string; depends_on:string; created_at?:string }

export type DailyStatus = boolean
export interface Daily {
  id:string; day:string; mission:string|null; objective:string|null;
  biggest_win:string|null; biggest_challenge:string|null; learned:string|null;
  first_task_tomorrow:string|null; completed:boolean; created_at?:string;
}

export type DecisionStatus = 'open'|'decided'|'revisited'|'archived'
export type DecisionCategory = 'technical'|'academic'|'method'|'scope'|'risk'|'schedule'|'architecture'|'tool'|'other'
export interface Decision {
  id:string; question:string; chosen:string|null; reason:string|null;
  alternatives:string|null; confidence:number|null; decided_on:string;
  evidence?:string; consequence?:string; reversible?:boolean; revisit_date?:string|null;
  status?:DecisionStatus; category?:DecisionCategory; created_at?:string;
}

export type BlockerStatus = 'open'|'resolved'
export type BlockerSeverity = 'low'|'medium'|'high'
export type BlockerType = 'waiting_person'|'waiting_info'|'technical'|'unclear'|'missing_resource'|'too_difficult'|'lack_of_time'|'other'
export interface Blocker {
  id:string; title:string; severity:BlockerSeverity; status:BlockerStatus;
  next_action:string|null; blocker_type?:BlockerType;
  suggested_action?:string; task_id?:string|null; created_at?:string;
}

export interface Profile {
  id:string; programme?:string; pathway?:string; current_level?:string;
  project_title?:string; supervisor?:string; start_date?:string|null;
  submission_date?:string|null; study_days?:string; daily_capacity?:string;
  preferred_task_size?:string; notify_deadlines?:boolean; notify_evidence?:boolean;
  notify_meetings?:boolean; created_at?:string; updated_at?:string;
}

export type PhaseStatus = 'pending'|'in_progress'|'blocked'|'complete'
export interface Phase {
  id:string; name:string; description?:string; order_index:number; status:PhaseStatus;
  objectives?:string; common_mistakes?:string; completion_criteria?:string;
  start_date?:string|null; end_date?:string|null; created_at?:string;
}

export type MilestoneStatus = 'pending'|'upcoming'|'active'|'overdue'|'complete'
export interface Milestone {
  id:string; title:string; outcome?:string; deliverables?:string; prerequisites?:string;
  evidence_required?:string; risk?:string; definition_of_done?:string; due_date?:string|null;
  status:MilestoneStatus; phase_id?:string|null; created_at?:string;
}

export type RequirementType = 'programme'|'module'|'project'|'objective'
export type RequirementStatus = 'pending'|'partial'|'met'|'exceeded'
export interface Requirement {
  id:string; type:RequirementType; title:string; description?:string; category?:string;
  source?:string; status:RequirementStatus; parent_id?:string|null; created_at?:string;
}

export type LOCategory = 'knowledge'|'practical'|'transferable'
export type LOStatus = 'pending'|'partial'|'met'
export interface LearningOutcome {
  id:string; title:string; description?:string; category:LOCategory; module?:string;
  status:LOStatus; created_at?:string;
}

export type EvidenceType = 'note'|'screenshot'|'document'|'commit'|'test'|'code'|'diagram'|'data'|'meeting'|'other'
export interface Evidence {
  id:string; title:string; type:EvidenceType; description?:string; url?:string;
  status:EvidenceStatus; task_id?:string|null; requirement_id?:string|null;
  report_section?:string; tags?:string; captured_at?:string|null; created_at?:string;
}

export type DocumentType = 'programme_spec'|'handbook'|'module_guide'|'supervisor'|'assessment'|'rubric'|'lecture'|'paper'|'note'|'screenshot'|'meeting'|'artefact'|'dataset'|'experiment'|'diagram'|'draft'|'other'
export type DocumentImportance = 'critical'|'important'|'reference'|'archive'
export type DocEvidenceStatus = 'pending'|'reviewed'|'annotated'|'cited'
export interface Document {
  id:string; title:string; source_type:DocumentType; date?:string|null;
  phase_id?:string|null; importance:DocumentImportance; notes?:string; url?:string;
  tags?:string; evidence_status:DocEvidenceStatus; created_at?:string;
}

export type ReadStatus = 'unread'|'skimmed'|'read'|'revisit'|'used_in_report'
export interface ResearchSource {
  id:string; title:string; authors?:string; year?:number|null; doi?:string; url?:string;
  citation?:string; research_question?:string; methodology?:string; dataset?:string;
  findings?:string; limitations?:string; relevance?:string; quotations?:string;
  interpretation?:string; related_papers?:string; requirement_id?:string|null;
  read_status:ReadStatus; tags?:string; created_at?:string;
}

export type JournalTemplate = 'general'|'experiment'|'development'|'meeting'
export interface JournalEntry {
  id:string; entry_date:string; template:JournalTemplate; activity?:string;
  objective?:string; expected?:string; happened?:string; evidence_links?:string;
  interpretation?:string; problems?:string; decision_made?:string; justification?:string;
  next_action?:string; experiment_question?:string; experiment_hypothesis?:string;
  experiment_method?:string; experiment_variables?:string; experiment_results?:string;
  experiment_interpretation?:string; experiment_limitations?:string; experiment_next?:string;
  dev_goal?:string; dev_work_done?:string; dev_problems?:string; dev_solution?:string;
  dev_evidence?:string; dev_next_action?:string; meeting_agenda?:string;
  meeting_discussion?:string; meeting_feedback?:string; meeting_decisions?:string;
  meeting_actions?:string; meeting_questions_next?:string; tags?:string; created_at?:string;
}

export type RiskCategory = 'technical'|'academic'|'time'|'research'|'data'|'ethical'|'security'|'hardware'|'software'|'dependency'|'personal'
export type RiskProbability = 'low'|'medium'|'high'
export type RiskImpact = 'low'|'medium'|'high'
export type RiskStatus = 'open'|'mitigated'|'contained'|'closed'
export interface Risk {
  id:string; title:string; category:RiskCategory; probability:RiskProbability;
  impact:RiskImpact; trigger?:string; mitigation?:string; contingency?:string;
  owner?:string; review_date?:string|null; status:RiskStatus; created_at?:string;
}

export type MeetingType = 'supervisor'|'planning'|'review'|'other'
export type MeetingStatus = 'upcoming'|'held'|'archived'
export interface Meeting {
  id:string; meeting_type:MeetingType; meeting_date:string; agenda?:string;
  discussion?:string; feedback?:string; decisions?:string; actions?:string;
  questions_next?:string; follow_up_date?:string|null; status:MeetingStatus;
  journal_id?:string|null; created_at?:string;
}

export type DraftStatus = 'not_started'|'drafting'|'reviewing'|'polished'|'complete'
export interface ReportSection {
  id:string; title:string; order_index:number; purpose?:string;
  evidence_required?:string; current_word_count?:number; target_word_count?:number;
  draft_status:DraftStatus; evidence_gaps?:string; notes?:string; created_at?:string;
}

export type CapacitySlot = '15min'|'30min'|'1h'|'2h'|'3+'
export type CurrentState = 'ready'|'okay'|'overloaded'|'lost'|'blocked'
export interface DailyPlan {
  id:string; plan_date:string; capacity_minutes?:number|null; capacity_slot:CapacitySlot;
  current_state:CurrentState; must_do?:string; should_do?:string; optional_do?:string;
  thirty_minutes?:string; generated_at?:string|null;
}

export interface WeeklyReview {
  id:string; review_week:string; completed?:string; evidence_created?:string;
  changes_made?:string; learned?:string; went_wrong?:string; decisions_made?:string;
  still_blocked?:string; next_objective?:string; created_at?:string;
}

export type NotifType = 'info'|'deadline'|'evidence'|'blocker'|'meeting'|'risk'
export interface Notification {
  id:string; title:string; body?:string; type:NotifType; read:boolean;
  related_type?:string; related_id?:string|null; created_at?:string;
}

export interface GuideProgress { id:string; step_key:string; created_at?:string }
export interface ProjectRow { id:string; title:string; objective?:string; created_at?:string }

export interface NextAction {
  task: Task | null;
  reason: string;
  expectedOutcome: string;
  estimatedMinutes: number;
  unlocks: string;
  definitionOfDone: string;
  priority: Priority;
}

export interface ProjectHealth {
  execution: number; evidence: number; writing: number; research: number; risk: number;
  overall: string;
}

export interface AuditLog {
  id:string; record_type:string; record_id?:string|null;
  action:'created'|'updated'|'deleted'|'completed'|'reopened'|'archived'|'evidence_attached'|'deadline_changed'|'decision_changed';
  old_value?:string; new_value?:string; created_at?:string;
}
