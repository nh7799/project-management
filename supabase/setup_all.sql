-- ONE-FILE DATABASE SETUP. Paste this whole file into Supabase -> SQL Editor -> Run (once).
-- It is 0001 + 0002 + 0003 combined, in the correct order.
create table projects(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, title text not null, objective text, created_at timestamptz default now());
create table events(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, title text not null, date date not null, kind text not null check (kind in ('official','personal','warning','milestone')), done boolean default false, created_at timestamptz default now());
create table tasks(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, title text not null, tier text not null default 'core' check (tier in ('core','important','optional','stretch')), status text not null default 'todo' check (status in ('todo','done')), due date, created_at timestamptz default now());
create table daily_records(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, day date not null, mission text, objective text, biggest_win text, biggest_challenge text, learned text, first_task_tomorrow text, completed boolean default false, created_at timestamptz default now(), unique(user_id, day));
create table decisions(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, question text not null, chosen text, reason text, alternatives text, confidence int check (confidence between 1 and 5), decided_on date default current_date, created_at timestamptz default now());
create table blockers(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, title text not null, severity text default 'medium' check (severity in ('low','medium','high')), status text default 'open' check (status in ('open','resolved')), next_action text, created_at timestamptz default now());
do $$ declare t text; begin foreach t in array array['projects','events','tasks','daily_records','decisions','blockers'] loop
 execute format('alter table %I enable row level security', t);
 execute format('create index on %I(user_id)', t);
 execute format('create policy "own rows" on %I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
end loop; end $$;
create table guide_progress(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, step_key text not null, created_at timestamptz default now(), unique(user_id, step_key));
alter table guide_progress enable row level security;
create policy "own rows" on guide_progress for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ============================================================
-- Mission Control 2.0 — Full schema migration
-- Run this after 0001_core.sql and 0002_guide.sql
-- ============================================================

-- -------------------------------------------------------
-- PROFILES
-- -------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  student_name text,
  student_id text,
  programme text,
  pathway text,
  level text,
  project_title text,
  supervisor_name text,
  supervisor_email text,
  second_marker text,
  start_date date,
  submission_date date,
  viva_date date,
  study_days_per_week int default 5,
  daily_capacity_minutes int default 240,
  preferred_task_size text default 'medium',
  notification_preferences jsonb,
  theme_preferences jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table profiles enable row level security;
create policy if not exists "profiles_own" on profiles for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- -------------------------------------------------------
-- PHASES (project lifecycle phases)
-- -------------------------------------------------------
create table if not exists phases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  description text,
  order_index int not null default 0,
  status text not null default 'pending'
    check (status in ('pending','in_progress','complete','blocked','planned','skipped')),
  objectives text,
  mistakes_to_avoid text,
  done_when text,
  completion_criteria text,
  notes text,
  started_on date,
  completed_on date,
  created_at timestamptz default now()
);
alter table phases enable row level security;
create index if not exists phases_user_id on phases(user_id);
create policy if not exists "phases_own" on phases for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- MILESTONES
-- -------------------------------------------------------
create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  phase_id uuid references phases(id) on delete set null,
  title text not null,
  description text,
  outcome text,
  due_date date,
  status text not null default 'pending'
    check (status in ('planned','pending','upcoming','active','in_progress','done','complete','missed','overdue')),
  definition_of_done text,
  deliverables text,
  prerequisites text,
  evidence_required text,
  risk_notes text,
  risk text,
  completed_on date,
  created_at timestamptz default now()
);
alter table milestones enable row level security;
create index if not exists milestones_user_id on milestones(user_id);
create policy if not exists "milestones_own" on milestones for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- TASKS (upgrade from 0001 simple version)
-- -------------------------------------------------------
-- Add missing columns to tasks table if they don't exist
do $$ begin
  alter table tasks add column if not exists description text;
  alter table tasks add column if not exists priority text default 'important';
  alter table tasks add column if not exists estimate_minutes int;
  alter table tasks add column if not exists phase_id uuid references phases(id) on delete set null;
  alter table tasks add column if not exists report_section text;
  alter table tasks add column if not exists evidence_status text default 'missing'
    check (evidence_status in ('missing','draft','captured','verified'));
  alter table tasks add column if not exists definition_of_done text;
  alter table tasks add column if not exists blocker_reason text;
  alter table tasks add column if not exists blocked_since timestamptz;
  alter table tasks add column if not exists completed_at timestamptz;
  alter table tasks add column if not exists why text;
  alter table tasks add column if not exists output text;
  alter table tasks add column if not exists updated_at timestamptz default now();
exception when duplicate_column then null;
end $$;

-- Update tasks status check to allow more statuses
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check
  check (status in ('todo','not_started','active','in_progress','blocked','done','complete','archived'));

alter table tasks drop constraint if exists tasks_tier_check;
alter table tasks add constraint tasks_tier_check
  check (tier in ('core','important','optional','stretch','critical','useful'));

-- -------------------------------------------------------
-- SUBTASKS
-- -------------------------------------------------------
create table if not exists subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  title text not null,
  done boolean default false,
  status text default 'todo' check (status in ('todo','in_progress','done')),
  order_index int default 0,
  completed_at timestamptz,
  created_at timestamptz default now()
);
alter table subtasks enable row level security;
create index if not exists subtasks_user_id on subtasks(user_id);
create index if not exists subtasks_task_id on subtasks(task_id);
create policy if not exists "subtasks_own" on subtasks for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- DEPENDENCIES
-- -------------------------------------------------------
create table if not exists dependencies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  depends_on uuid not null references tasks(id) on delete cascade,
  created_at timestamptz default now(),
  unique(task_id, depends_on)
);
alter table dependencies enable row level security;
create index if not exists dependencies_user_id on dependencies(user_id);
create policy if not exists "dependencies_own" on dependencies for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- BLOCKERS (upgrade from 0001)
-- -------------------------------------------------------
do $$ begin
  alter table blockers add column if not exists description text;
  alter table blockers add column if not exists blocker_type text default 'other';
  alter table blockers add column if not exists task_id uuid references tasks(id) on delete set null;
  alter table blockers add column if not exists suggested_action text;
  alter table blockers add column if not exists blocker_reason text;
  alter table blockers add column if not exists blocked_since timestamptz;
  alter table blockers add column if not exists resolved_at timestamptz;
  alter table blockers add column if not exists resolution text;
exception when duplicate_column then null;
end $$;

alter table blockers drop constraint if exists blockers_severity_check;
alter table blockers add constraint blockers_severity_check
  check (severity in ('low','medium','high','critical'));
alter table blockers drop constraint if exists blockers_status_check;
alter table blockers add constraint blockers_status_check
  check (status in ('open','resolved'));

-- -------------------------------------------------------
-- DECISIONS (upgrade from 0001)
-- -------------------------------------------------------
do $$ begin
  alter table decisions add column if not exists category text default 'other';
  alter table decisions add column if not exists status text default 'decided'
    check (status in ('proposed','decided','implemented','revisited','archived'));
  alter table decisions add column if not exists evidence text;
  alter table decisions add column if not exists consequence text;
  alter table decisions add column if not exists reversible boolean;
  alter table decisions add column if not exists revisit_date date;
  alter table decisions add column if not exists archived boolean default false;
exception when duplicate_column then null;
end $$;

-- -------------------------------------------------------
-- REQUIREMENTS
-- -------------------------------------------------------
create table if not exists requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  description text,
  type text not null default 'must'
    check (type in ('must','should','could','wont','programme','module','project')),
  category text not null default 'other'
    check (category in ('pass_rule','academic','technical','ethical','stakeholder',
                        'evaluation','artefact','referencing','other','programme','module','project')),
  source text,
  status text not null default 'not_attempted'
    check (status in ('not_attempted','in_progress','partially_met','met','out_of_scope','partial','exceeded')),
  created_at timestamptz default now()
);
alter table requirements enable row level security;
create index if not exists requirements_user_id on requirements(user_id);
create policy if not exists "requirements_own" on requirements for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- LEARNING OUTCOMES
-- -------------------------------------------------------
create table if not exists learning_outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  description text,
  category text,
  status text default 'not_started'
    check (status in ('not_started','in_progress','partially_met','met')),
  created_at timestamptz default now()
);
alter table learning_outcomes enable row level security;
create index if not exists learning_outcomes_user_id on learning_outcomes(user_id);
create policy if not exists "learning_outcomes_own" on learning_outcomes for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- EVIDENCE
-- -------------------------------------------------------
create table if not exists evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  type text not null default 'note'
    check (type in ('screenshot','video','document','code','dataset','email','notes',
                    'diagram','presentation','note','commit','test','data','meeting','other')),
  description text,
  status text not null default 'draft'
    check (status in ('missing','draft','captured','verified','partial','exceeded')),
  url text,
  captured_on date,
  task_id uuid references tasks(id) on delete set null,
  report_section text,
  tags text[],
  notes text,
  created_at timestamptz default now()
);
alter table evidence enable row level security;
create index if not exists evidence_user_id on evidence(user_id);
create policy if not exists "evidence_own" on evidence for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- DOCUMENTS (source library)
-- -------------------------------------------------------
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  source_type text not null default 'other',
  importance text default 'medium',
  evidence_status text default 'draft',
  url text,
  summary text,
  added_on date,
  tags text[],
  created_at timestamptz default now()
);
alter table documents enable row level security;
create index if not exists documents_user_id on documents(user_id);
create policy if not exists "documents_own" on documents for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- JUNCTION: requirements ↔ evidence
-- -------------------------------------------------------
create table if not exists requirement_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  requirement_id uuid not null references requirements(id) on delete cascade,
  evidence_id uuid not null references evidence(id) on delete cascade,
  unique(requirement_id, evidence_id)
);
alter table requirement_evidence enable row level security;
create policy if not exists "req_evi_own" on requirement_evidence for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- JUNCTION: tasks ↔ requirements
-- -------------------------------------------------------
create table if not exists task_requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  requirement_id uuid not null references requirements(id) on delete cascade,
  unique(task_id, requirement_id)
);
alter table task_requirements enable row level security;
create policy if not exists "task_req_own" on task_requirements for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- RESEARCH SOURCES
-- -------------------------------------------------------
create table if not exists research_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  authors text,
  year int,
  venue text,
  url text,
  status text not null default 'to_read'
    check (status in ('to_read','reading','skimmed','read_fully','annotated','archived','not_relevant')),
  read_progress_pct int default 0,
  category text,
  tags text[],
  research_question text,
  methodology text,
  dataset text,
  findings text,
  limitations text,
  relevance text,
  quotations text,
  interpretation text,
  added_on date,
  created_at timestamptz default now()
);
alter table research_sources enable row level security;
create index if not exists research_sources_user_id on research_sources(user_id);
create policy if not exists "research_sources_own" on research_sources for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- RESEARCH NOTES
-- -------------------------------------------------------
create table if not exists research_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  source_id uuid references research_sources(id) on delete set null,
  category text not null default 'summary'
    check (category in ('summary','critique','comparison','methodology','quote','gap','idea','todo')),
  title text not null,
  content text,
  tags text[],
  created_at timestamptz default now()
);
alter table research_notes enable row level security;
create index if not exists research_notes_user_id on research_notes(user_id);
create policy if not exists "research_notes_own" on research_notes for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- JOURNAL ENTRIES
-- -------------------------------------------------------
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  template text not null default 'general'
    check (template in ('general','experiment','development','meeting')),
  entry_date date not null default current_date,
  mood text default 'neutral',
  tags text[],
  content jsonb default '{}',
  activity text,
  objective text,
  happened text,
  interpretation text,
  next_action text,
  meeting_id uuid,
  created_at timestamptz default now()
);
alter table journal_entries enable row level security;
create index if not exists journal_entries_user_id on journal_entries(user_id);
create policy if not exists "journal_entries_own" on journal_entries for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- MEETINGS
-- -------------------------------------------------------
create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null default 'Supervisor meeting',
  kind text not null default 'supervisor'
    check (kind in ('supervisor','planning','review','other')),
  meeting_type text,
  status text not null default 'upcoming'
    check (status in ('upcoming','held','archived')),
  meeting_date date,
  duration_minutes int,
  location text,
  attendees text,
  agenda text,
  pre_meeting_tasks text,
  discussion text,
  feedback text,
  decisions text,
  actions text,
  questions_next text,
  journal_entry_id uuid references journal_entries(id) on delete set null,
  created_at timestamptz default now()
);
alter table meetings enable row level security;
create index if not exists meetings_user_id on meetings(user_id);
create policy if not exists "meetings_own" on meetings for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- RISKS
-- -------------------------------------------------------
create table if not exists risks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  description text,
  category text not null default 'other'
    check (category in ('technical','scope','schedule','resource','academic','quality',
                        'team','communication','ethics','external','security')),
  probability int not null default 2 check (probability between 1 and 5),
  impact int not null default 2 check (impact between 1 and 5),
  status text not null default 'identified'
    check (status in ('identified','mitigating','monitored','closed','accepted','open')),
  mitigation text,
  contingency text,
  trigger text,
  owner text,
  review_date date,
  identified_on date default current_date,
  created_at timestamptz default now()
);
alter table risks enable row level security;
create index if not exists risks_user_id on risks(user_id);
create policy if not exists "risks_own" on risks for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- REPORT SECTIONS
-- -------------------------------------------------------
create table if not exists report_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  order_index int not null default 0,
  title text not null,
  purpose text,
  evidence_required text,
  target_words int not null default 500,
  current_words int default 0,
  draft_status text not null default 'not_started'
    check (draft_status in ('not_started','outlining','drafting','reviewing','finalised')),
  notes text,
  created_at timestamptz default now()
);
alter table report_sections enable row level security;
create index if not exists report_sections_user_id on report_sections(user_id);
create policy if not exists "report_sections_own" on report_sections for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- DAILY PLANS
-- -------------------------------------------------------
create table if not exists daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  plan_date date not null,
  capacity_minutes int,
  capacity_slot text,
  start_state text,
  current_state text,
  must_do text[],
  should_do text[],
  optional_do text[],
  thirty_minutes text,
  generated_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, plan_date)
);
alter table daily_plans enable row level security;
create index if not exists daily_plans_user_id on daily_plans(user_id);
create policy if not exists "daily_plans_own" on daily_plans for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Update daily_records to allow capacity fields
do $$ begin
  alter table daily_records add column if not exists capacity_minutes int;
  alter table daily_records add column if not exists start_state text;
  alter table daily_records add column if not exists end_state text;
exception when duplicate_column then null;
end $$;

-- -------------------------------------------------------
-- WEEKLY REVIEWS
-- -------------------------------------------------------
create table if not exists weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  week_start date not null,
  went_well text,
  went_poorly text,
  learned text,
  next_week_focus text,
  blockers text,
  risks text,
  supervisor_action text,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);
alter table weekly_reviews enable row level security;
create index if not exists weekly_reviews_user_id on weekly_reviews(user_id);
create policy if not exists "weekly_reviews_own" on weekly_reviews for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- NOTIFICATIONS
-- -------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null,
  title text not null,
  body text,
  href text,
  read boolean default false,
  due_on date,
  created_at timestamptz default now()
);
alter table notifications enable row level security;
create index if not exists notifications_user_id on notifications(user_id);
create policy if not exists "notifications_own" on notifications for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- SETTINGS KV
-- -------------------------------------------------------
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null,
  value jsonb,
  created_at timestamptz default now(),
  unique(user_id, key)
);
alter table settings enable row level security;
create index if not exists settings_user_id on settings(user_id);
create policy if not exists "settings_own" on settings for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- -------------------------------------------------------
-- AUDIT LOG
-- -------------------------------------------------------
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  action text not null,
  table_name text,
  row_id text,
  before jsonb,
  after jsonb,
  note text,
  created_at timestamptz default now()
);
alter table audit_log enable row level security;
create index if not exists audit_log_user_id on audit_log(user_id);
create policy if not exists "audit_log_own" on audit_log for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- SEED FUNCTION: called once per user to seed standard phases
-- and report sections. Idempotent — safe to call repeatedly.
-- ============================================================
create or replace function seed_user_defaults(p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  -- Seed the 17 standard project phases
  if not exists (select 1 from phases where user_id = p_user_id) then
    insert into phases (user_id, name, order_index, status, objectives, done_when, mistakes_to_avoid) values
      (p_user_id, 'Project setup',                 0,  'pending',     'Configure the environment and understand the full project lifecycle.', 'Profile filled, official dates loaded, backup strategy confirmed.', 'Skipping handbook; not loading official dates; no backup plan.'),
      (p_user_id, 'Problem definition',             1,  'pending',     'Define a clear, bounded, researchable CS problem.', 'A 100–200 word draft describing the problem, stakeholders and computational context.', 'Vague problem; scope too wide; no CS angle; no stakeholders.'),
      (p_user_id, 'Background research',            2,  'pending',     'Gain foundational context of the domain.', '5+ background sources each with structured notes.', 'Only reading, not writing notes; no synthesis of ideas.'),
      (p_user_id, 'Literature review',              3,  'pending',     'Critically review academic literature and identify the research gap.', 'Key research areas identified; sources critically compared; research gap explained.', 'Descriptive not analytical; no gap; no comparison.'),
      (p_user_id, 'Requirements',                   4,  'pending',     'Define testable, prioritised project requirements.', 'Requirements documented, linked to objectives, each with an acceptance test.', 'Vague requirements; no priority; no acceptance test.'),
      (p_user_id, 'Research question / objectives', 5,  'pending',     'Finalise focused research questions and measurable objectives.', 'Research questions agreed with supervisor; each objective has a measurable outcome.', 'Questions too broad; not measurable; no success metric.'),
      (p_user_id, 'Methodology',                    6,  'pending',     'Justify the research and development methodology.', 'Chosen method documented with alternatives and rationale tied to research questions.', 'No justification; method doesn''t answer the RQs; no baseline plan.'),
      (p_user_id, 'System design',                  7,  'pending',     'Produce documented architecture and component design.', 'Architecture diagram exists; design decisions recorded with rationale.', 'No diagrams; undocumented decisions; jumping to code.'),
      (p_user_id, 'Implementation',                 8,  'pending',     'Build a working, version-controlled, buildable artefact.', 'Core functionality works; repository version-controlled; build instructions written.', 'Scope creep; no commits; no build instructions; over-engineering.'),
      (p_user_id, 'Testing',                        9,  'pending',     'Rigorous testing documented, including failures.', 'Test cases documented; passes AND failures recorded; evidence for each requirement.', 'Only happy path; no test evidence; no failure records.'),
      (p_user_id, 'Evaluation',                     10, 'pending',     'Meaningful, evidenced evaluation against objectives.', 'Baseline identified; metrics defined; results compared; findings interpreted.', 'No baseline; unsupported claims; no interpretation.'),
      (p_user_id, 'Analysis',                       11, 'pending',     'Interpret results; connect meaning back to research questions.', 'Interpretation of findings tied to research questions; limitations written.', 'Description only; no meaning; no limitations.'),
      (p_user_id, 'Dissertation/report writing',    12, 'pending',     'Complete structured report draft with all evidence embedded.', 'All sections drafted with evidence; references cited correctly.', 'Everything last minute; no cross-referencing; missing citations.'),
      (p_user_id, 'Final refinement',               13, 'pending',     'Polish, proofread, verify, produce submission-ready PDF.', 'Spell-checked, grammar-checked, buddy-reviewed; PDF generated and verified.', 'Not enough proofreading; wrong formatting; late rush.'),
      (p_user_id, 'Submission preparation',         14, 'pending',     'Everything packaged for correct on-time submission.', 'PDF submitted to Supervisor AND Second Marker; code uploaded; before 15:00 Fri 9 Apr.', 'Missed a submission point; wrong file; after deadline.'),
      (p_user_id, 'Presentation / viva / demonstration', 15, 'pending', 'Compulsory: deliver 20-min viva with ≤10 min demo.', 'Time arranged with both markers; demo practised; likely questions rehearsed.', 'Over-running; reading from script; no rehearsal.'),
      (p_user_id, 'Final archive',                  16, 'pending',     'A complete, recoverable archive of the entire project.', 'Archive exists containing code, data, report, decisions, journal; two copies stored.', 'Losing code/data; no second backup; incomplete record.');
  end if;

  -- Seed standard report sections
  if not exists (select 1 from report_sections where user_id = p_user_id) then
    insert into report_sections (user_id, order_index, title, purpose, target_words, draft_status) values
      (p_user_id, 0,  'Abstract',                   'A ≤200 word summary of the entire project.', 200, 'not_started'),
      (p_user_id, 1,  'Introduction',               'Context, motivation, scope and structure of the report.', 600, 'not_started'),
      (p_user_id, 2,  'Literature Review',          'Critical review of relevant academic literature, identifying the research gap.', 2000, 'not_started'),
      (p_user_id, 3,  'Requirements / Problem Definition', 'Clearly stated, testable, prioritised requirements linked to objectives.', 800, 'not_started'),
      (p_user_id, 4,  'Methodology',                'Justified research and development approach with alternatives considered.', 1000, 'not_started'),
      (p_user_id, 5,  'System Design',              'Architecture, component design, data model, and key design decisions.', 1000, 'not_started'),
      (p_user_id, 6,  'Implementation',             'Description of the artefact built, how it was built, and key technical decisions.', 1500, 'not_started'),
      (p_user_id, 7,  'Testing',                    'Test plan, test cases, results (passes and failures), and evidence.', 1000, 'not_started'),
      (p_user_id, 8,  'Evaluation',                 'Results against baselines, metrics, and meaningful comparison.', 1000, 'not_started'),
      (p_user_id, 9,  'Analysis',                   'Interpretation of findings, limitations, and threats to validity.', 800, 'not_started'),
      (p_user_id, 10, 'Discussion',                 'Broader implications, connection to literature, alternative interpretations.', 600, 'not_started'),
      (p_user_id, 11, 'Conclusions & Future Work',  '≤1 page: key findings, how objectives were met, future directions.', 500, 'not_started'),
      (p_user_id, 12, 'Project Management Review',  '≤2 pages: compare original vs actual Gantt; reflect on process.', 600, 'not_started'),
      (p_user_id, 13, 'References',                 'All sources cited in Harvard format.', 400, 'not_started'),
      (p_user_id, 14, 'Appendices',                 'Supporting material: code excerpts, raw data, ethics forms, extra diagrams.', 1000, 'not_started');
  end if;

  -- Seed key pass-rule requirements
  if not exists (select 1 from requirements where user_id = p_user_id) then
    insert into requirements (user_id, title, description, type, category, source, status) values
      (p_user_id, 'Pass the Project Report (≥40%)', 'Must score at least 40% in the Project Report to pass the module, regardless of other component scores.', 'must', 'pass_rule', 'Handbook v0.9 p.34', 'not_attempted'),
      (p_user_id, 'Pass the Viva / Demonstration (≥40%)', 'Must score at least 40% in the Viva to pass the module. Missing the viva results in a grade of 0.', 'must', 'pass_rule', 'Handbook v0.9 p.34', 'not_attempted'),
      (p_user_id, 'Pass overall (≥40% combined)', 'Must achieve at least 40% overall across all weighted components.', 'must', 'pass_rule', 'Handbook v0.9 p.34', 'not_attempted'),
      (p_user_id, 'Submit Project Selection by 15 Oct 17:00', 'Assignment 1: Project Selection Form on Canvas. Lateness reduces time-management grade.', 'must', 'academic', 'Handbook v0.9 p.38', 'not_attempted'),
      (p_user_id, 'Submit Project Outline by 16 Nov 17:00 (10%)', 'Assignment 2: Project Outline worth 10%. Must include Gantt, risks, ethics checklist and Harvard references.', 'must', 'academic', 'Handbook v0.9 p.17', 'not_attempted'),
      (p_user_id, 'Submit Project Report by 9 Apr 15:00 (65%)', 'Same PDF to BOTH Supervisor and Second Marker submission points. Code to Additional Resources.', 'must', 'academic', 'Handbook v0.9 p.8', 'not_attempted'),
      (p_user_id, 'Attend and pass Viva 12–23 Apr (20%)', 'Compulsory 20-min viva with ≤10 min demo. Arrange time with BOTH markers. Book room.', 'must', 'academic', 'Handbook v0.9 p.26', 'not_attempted'),
      (p_user_id, 'Complete logbook entries (5%)', '7 of 10 entries must be completed for full marks. Submit before Friday 23:00 each week.', 'must', 'academic', 'Handbook v0.9 p.7', 'not_attempted'),
      (p_user_id, 'Build and evidence an artefact', 'Every project must create an artefact demonstrating "design, build and test". The artefact must be evidenced in the report.', 'must', 'artefact', 'Handbook v0.9 p.5', 'not_attempted'),
      (p_user_id, 'Literature review must be analytical, not descriptive', 'The review must critically compare sources, identify the research gap, and link to your approach. Descriptive-only reviews are marked down.', 'must', 'academic', 'Handbook v0.9 p.29', 'not_attempted'),
      (p_user_id, 'Document testing with passes AND failures', 'Software submitted with no testing evidence is marked down. Must show test cases, results, and failures.', 'must', 'artefact', 'Handbook v0.9 p.24', 'not_attempted'),
      (p_user_id, 'Use Harvard referencing throughout', 'Harvard (or Vancouver/numeric) referencing required. Cite everything: books, journals, code, datasets, images.', 'must', 'referencing', 'Handbook v0.9 p.23', 'not_attempted'),
      (p_user_id, 'Obtain ethics approval before any primary data collection', 'Required whenever third parties participate. Approval must come BEFORE the work. Allow 2–6 weeks.', 'must', 'ethical', 'Handbook v0.9 p.13', 'not_attempted'),
      (p_user_id, 'No AI-generated content in documentation', 'AI tools (e.g. ChatGPT) are not permitted to write any project documentation. This is academic misconduct.', 'must', 'academic', 'Handbook v0.9 p.11', 'not_attempted'),
      (p_user_id, 'Maintain version control throughout', 'Code must be version-controlled. Loss of data is not an acceptable reason for incomplete submission.', 'should', 'technical', 'Handbook v0.9 p.9', 'not_attempted');
  end if;
end;
$$;

-- Grant execute to authenticated users
grant execute on function seed_user_defaults(uuid) to authenticated;
