create table profiles(
  id uuid primary key references auth.users on delete cascade,
  programme text,
  pathway text,
  current_level text,
  project_title text,
  supervisor text,
  start_date date,
  submission_date date,
  study_days text,
  daily_capacity text,
  preferred_task_size text,
  notify_deadlines boolean default true,
  notify_evidence boolean default true,
  notify_meetings boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table phases(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  description text,
  order_index int not null default 0,
  status text not null default 'pending' check (status in ('pending','in_progress','blocked','complete')),
  objectives text,
  common_mistakes text,
  completion_criteria text,
  start_date date,
  end_date date,
  created_at timestamptz default now(),
  unique(user_id, order_index)
);

create table milestones(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  outcome text,
  deliverables text,
  prerequisites text,
  evidence_required text,
  risk text,
  definition_of_done text,
  due_date date,
  status text not null default 'pending' check (status in ('pending','upcoming','active','overdue','complete')),
  phase_id uuid references phases on delete set null,
  created_at timestamptz default now()
);

do $$ declare t text; begin foreach t in array array['profiles','phases','milestones'] loop
 execute format('alter table %I enable row level security', t);
 execute format('create index on %I(user_id)', t);
 execute format('create policy "own rows" on %I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
end loop; end $$;

insert into phases(user_id, name, description, order_index, status, objectives, common_mistakes, completion_criteria)
select id, 'Project setup', 'Initial configuration and planning', 0, 'pending', 'Configure the application and understand the project scope', 'Skipping setup, not reading the handbook', 'User profile complete, handbook read, deadlines loaded' from auth.users union all
select id, 'Problem definition', 'Define the research problem and scope', 1, 'pending', 'Clearly define the problem, stakeholders, and context', 'Vague problem, scope too broad', '100-200 word problem statement with stakeholders and CS context' from auth.users union all
select id, 'Background research', 'Initial background reading and context', 2, 'pending', 'Gather foundational understanding of the problem domain', 'Only reading, not taking structured notes', 'At least 5 background sources with structured notes' from auth.users union all
select id, 'Literature review', 'Critical review of academic literature', 3, 'pending', 'Identify research gap and relevant academic sources', 'Descriptive not analytical, no synthesis', 'Research gap identified, sources critically compared, citations recorded' from auth.users union all
select id, 'Requirements', 'Define project requirements and objectives', 4, 'pending', 'Clear requirements and measurable objectives', 'Ambiguous requirements, no testable outcomes', 'Requirements documented, linked to objectives, each testable' from auth.users union all
select id, 'Research question / objectives', 'Finalise research questions and project objectives', 5, 'pending', 'Specific, measurable, achievable research questions', 'Questions too broad or unfocused', 'Research questions finalised with supervisor agreement' from auth.users union all
select id, 'Methodology', 'Design the research and development methodology', 6, 'pending', 'Justified approach for research and building', 'No justification, method not aligned with questions', 'Methodology justified with alternatives considered and rationale' from auth.users union all
select id, 'System design', 'Architectural and detailed design', 7, 'pending', 'Documented system architecture and component design', 'Design undocumented, jumping straight to code', 'Architecture diagram, component design, design decisions recorded' from auth.users union all
select id, 'Implementation', 'Build the artefact', 8, 'pending', 'Core functional artefact', 'Scope creep, no testing, no documentation', 'Core features working, version controlled, buildable' from auth.users union all
select id, 'Testing', 'Rigorous testing of the artefact', 9, 'pending', 'Comprehensive testing including failures', 'Only happy path, no test evidence', 'Test cases documented, passes and failures recorded, evidence captured' from auth.users union all
select id, 'Evaluation', 'Evaluate against objectives', 10, 'pending', 'Meaningful evaluation with baseline comparison', 'No baseline, unsupported claims', 'Baseline comparison, metrics collected, findings interpreted' from auth.users union all
select id, 'Analysis', 'Analyse and interpret results', 11, 'pending', 'Interpret results and connect back to research questions', 'Just description, no meaning', 'Results interpreted, limitations stated, conclusions drawn' from auth.users union all
select id, 'Dissertation/report writing', 'Write the final report', 12, 'pending', 'Complete, structured report draft', 'Writing everything last minute', 'All report sections drafted, evidence embedded, Turnitin under threshold' from auth.users union all
select id, 'Final refinement', 'Polish and refine report and artefact', 13, 'pending', 'Final polished version ready for submission', 'Not enough proofreading, last minute rush', 'Buddy reviewed, spell checked, cross-references valid, PDF generated' from auth.users union all
select id, 'Submission preparation', 'Final submission checks and packaging', 14, 'pending', 'Everything ready for submission', 'Missed checklists, wrong files', 'All files ready, identical PDFs to both markers, code uploaded' from auth.users union all
select id, 'Presentation / viva / demonstration', 'Prepare and deliver the viva', 15, 'pending', 'Compelling demonstration and answers', 'Not rehearsed, over-running demo', 'Demo rehearsed to 10 min, questions anticipated, artefact pre-run' from auth.users union all
select id, 'Final archive', 'Archive all project materials', 16, 'pending', 'Complete recoverable archive', 'Losing code or data after submission', 'Full project archive: code, data, report, evidence, decisions' from auth.users;
