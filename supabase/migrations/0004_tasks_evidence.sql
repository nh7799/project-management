alter table tasks add column if not exists description text;
alter table tasks add column if not exists phase_id uuid references phases on delete set null;
alter table tasks add column if not exists priority text default 'important' check (priority in ('critical','important','useful'));
alter table tasks add column if not exists estimate_minutes int;
alter table tasks add column if not exists status text default 'todo' check (status in ('not_started','active','blocked','done'));
alter table tasks add column if not exists evidence_status text default 'missing' check (evidence_status in ('missing','draft','captured','verified'));
alter table tasks add column if not exists definition_of_done text;
alter table tasks add column if not exists blocker_reason text;
alter table tasks add column if not exists blocked_since date;
alter table tasks add column if not exists completed_at timestamptz;
alter table tasks add column if not exists report_section text;
alter table tasks add column if not exists why text;
alter table tasks add column if not exists output text;

create table subtasks(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  task_id uuid not null references tasks on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo','done')),
  order_index int not null default 0,
  created_at timestamptz default now()
);

create table dependencies(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  task_id uuid not null references tasks on delete cascade,
  depends_on uuid not null references tasks on delete cascade,
  created_at timestamptz default now(),
  unique(task_id, depends_on)
);

create table requirements(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null default 'programme' check (type in ('programme','module','project','objective')),
  title text not null,
  description text,
  category text,
  source text,
  status text not null default 'pending' check (status in ('pending','partial','met','exceeded')),
  parent_id uuid references requirements on delete set null,
  created_at timestamptz default now()
);

create table learning_outcomes(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  description text,
  category text not null check (category in ('knowledge','practical','transferable')),
  module text default '6COM2018',
  status text not null default 'pending' check (status in ('pending','partial','met')),
  created_at timestamptz default now()
);

create table evidence(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  type text not null default 'note' check (type in ('note','screenshot','document','commit','test','code','diagram','data','meeting','other')),
  description text,
  url text,
  status text not null default 'draft' check (status in ('draft','captured','verified')),
  task_id uuid references tasks on delete set null,
  requirement_id uuid references requirements on delete set null,
  report_section text,
  tags text,
  captured_at timestamptz default now(),
  created_at timestamptz default now()
);

create table documents(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  source_type text not null default 'other' check (source_type in ('programme_spec','handbook','module_guide','supervisor','assessment','rubric','lecture','paper','note','screenshot','meeting','artefact','dataset','experiment','diagram','draft','other')),
  date date,
  phase_id uuid references phases on delete set null,
  importance text not null default 'reference' check (importance in ('critical','important','reference','archive')),
  notes text,
  url text,
  tags text,
  evidence_status text not null default 'pending' check (evidence_status in ('pending','reviewed','annotated','cited')),
  created_at timestamptz default now()
);

create table requirement_evidence(
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references requirements on delete cascade,
  evidence_id uuid not null references evidence on delete cascade,
  created_at timestamptz default now(),
  unique(requirement_id, evidence_id)
);

create table task_requirements(
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks on delete cascade,
  requirement_id uuid not null references requirements on delete cascade,
  created_at timestamptz default now(),
  unique(task_id, requirement_id)
);

do $$ declare t text; begin foreach t in array array['subtasks','dependencies','requirements','learning_outcomes','evidence','documents','requirement_evidence','task_requirements'] loop
 execute format('alter table %I enable row level security', t);
 execute format('create index on %I(user_id)', t);
 execute format('create policy "own rows" on %I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
end loop; end $$;

insert into requirements(user_id, type, title, description, category, source)
select id, 'programme', '6COM2018 Computer Science Project (30 credits, 80% coursework, 20% practical)', 'Final-year capstone project across Semesters A and B', 'module', 'Programme specification' from auth.users union all
select id, 'project', 'Original thought and critical analysis', 'Demonstrate original thinking with critically analysed literature and argued decisions', 'academic', 'Handbook p.5' from auth.users union all
select id, 'project', 'Design, build and test an artefact', 'Every project must produce an artefact showing design, build, and test with evidence of successes and failures', 'technical', 'Handbook p.5' from auth.users union all
select id, 'project', 'Meaningful evaluation', 'Evaluation using baseline comparison, justified metrics, interpretation of findings and clear limitations', 'evaluation', 'Handbook p.29' from auth.users union all
select id, 'project', 'Justified decisions', 'Decisions recorded with alternatives, rationale and consequences to show critical thinking', 'academic', 'Spec quality guardrails' from auth.users union all
select id, 'project', 'Proper referencing (Harvard)', 'Every source cited including books, journals, videos, code, datasets, images; all reference details from day 1', 'integrity', 'Handbook p.23' from auth.users union all
select id, 'project', 'Ethics approval before any participant work', 'Approval before surveys, interviews, experiments including friends/family; takes 2–6 weeks', 'ethics', 'Handbook p.13' from auth.users union all
select id, 'project', '40% minimum in Report AND Viva AND overall', 'Pass rule: at least 40% in each of Report, Viva, and overall module', 'pass_rule', 'Handbook p.34' from auth.users;

insert into learning_outcomes(user_id, title, description, category)
select id, 'Knowledge and understanding of CS principles relevant to the project', 'Demonstrate systematic understanding of the underpinning CS principles and research context', 'knowledge' from auth.users union all
select id, 'Practical skills: design, build, test, evaluate', 'Apply practical skills in design, implementation, testing and evaluation beyond taught modules', 'practical' from auth.users union all
select id, 'Transferable skills: project management, critical analysis, communication', 'Apply critical analysis, planning, decision making, report writing and presentation', 'transferable' from auth.users union all
select id, 'Justified, reflective decisions with recorded rationale', 'Demonstrate critical reflection on decisions and learning via justified choices in context', 'transferable' from auth.users union all
select id, 'Academic integrity and proper referencing', 'Apply referencing correctly and observe academic integrity including data and ethics protocols', 'transferable' from auth.users;
