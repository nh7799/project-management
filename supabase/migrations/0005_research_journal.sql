create table research_sources(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  authors text,
  year int,
  doi text,
  url text,
  citation text,
  research_question text,
  methodology text,
  dataset text,
  findings text,
  limitations text,
  relevance text,
  quotations text,
  interpretation text,
  related_papers text,
  requirement_id uuid references requirements on delete set null,
  read_status text not null default 'unread' check (read_status in ('unread','skimmed','read','revisit','used_in_report')),
  tags text,
  created_at timestamptz default now()
);

create table research_notes(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  source_id uuid references research_sources on delete set null,
  title text not null,
  content text,
  category text check (category in ('citation','methodology','findings','limitations','relevance','quotation','interpretation','idea')),
  tags text,
  created_at timestamptz default now()
);

create table journal_entries(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  entry_date date not null default current_date,
  template text not null default 'general' check (template in ('general','experiment','development','meeting')),
  activity text,
  objective text,
  expected text,
  happened text,
  evidence_links text,
  interpretation text,
  problems text,
  decision_made text,
  justification text,
  next_action text,
  experiment_question text,
  experiment_hypothesis text,
  experiment_method text,
  experiment_variables text,
  experiment_results text,
  experiment_interpretation text,
  experiment_limitations text,
  experiment_next text,
  dev_goal text,
  dev_work_done text,
  dev_problems text,
  dev_solution text,
  dev_evidence text,
  dev_next_action text,
  meeting_agenda text,
  meeting_discussion text,
  meeting_feedback text,
  meeting_decisions text,
  meeting_actions text,
  meeting_questions_next text,
  tags text,
  created_at timestamptz default now()
);

alter table decisions add column if not exists alternatives text;
alter table decisions add column if not exists evidence text;
alter table decisions add column if not exists consequence text;
alter table decisions add column if not exists reversible boolean default true;
alter table decisions add column if not exists revisit_date date;
alter table decisions add column if not exists status text default 'decided' check (status in ('open','decided','revisited','archived'));
alter table decisions add column if not exists category text default 'technical' check (category in ('technical','academic','method','scope','risk','schedule','architecture','tool','other'));

create table risks(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  category text not null default 'technical' check (category in ('technical','academic','time','research','data','ethical','security','hardware','software','dependency','personal')),
  probability text not null default 'medium' check (probability in ('low','medium','high')),
  impact text not null default 'medium' check (impact in ('low','medium','high')),
  trigger text,
  mitigation text,
  contingency text,
  owner text default 'self',
  review_date date,
  status text not null default 'open' check (status in ('open','mitigated','contained','closed')),
  created_at timestamptz default now()
);

alter table blockers add column if not exists blocker_type text default 'other' check (blocker_type in ('waiting_person','waiting_info','technical','unclear','missing_resource','too_difficult','lack_of_time','other'));
alter table blockers add column if not exists suggested_action text;
alter table blockers add column if not exists task_id uuid references tasks on delete set null;

create table meetings(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  meeting_type text not null default 'supervisor' check (meeting_type in ('supervisor','planning','review','other')),
  meeting_date date not null,
  agenda text,
  discussion text,
  feedback text,
  decisions text,
  actions text,
  questions_next text,
  follow_up_date date,
  status text not null default 'upcoming' check (status in ('upcoming','held','archived')),
  journal_id uuid references journal_entries on delete set null,
  created_at timestamptz default now()
);

do $$ declare t text; begin foreach t in array array['research_sources','research_notes','journal_entries','risks','meetings'] loop
 execute format('alter table %I enable row level security', t);
 execute format('create index on %I(user_id)', t);
 execute format('create policy "own rows" on %I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
end loop; end $$;
