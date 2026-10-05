create table report_sections(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  order_index int not null default 0,
  purpose text,
  evidence_required text,
  current_word_count int default 0,
  target_word_count int,
  draft_status text not null default 'not_started' check (draft_status in ('not_started','drafting','reviewing','polished','complete')),
  evidence_gaps text,
  notes text,
  created_at timestamptz default now()
);

create table daily_plans(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  plan_date date not null default current_date,
  capacity_minutes int,
  capacity_slot text not null default '3+' check (capacity_slot in ('15min','30min','1h','2h','3+')),
  current_state text not null default 'okay' check (current_state in ('ready','okay','overloaded','lost','blocked')),
  must_do text,
  should_do text,
  optional_do text,
  thirty_minutes text,
  generated_at timestamptz default now(),
  unique(user_id, plan_date)
);

create table weekly_reviews(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  review_week date not null,
  completed text,
  evidence_created text,
  changes_made text,
  learned text,
  went_wrong text,
  decisions_made text,
  still_blocked text,
  next_objective text,
  created_at timestamptz default now(),
  unique(user_id, review_week)
);

create table notifications(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  body text,
  type text not null default 'info' check (type in ('info','deadline','evidence','blocker','meeting','risk')),
  read boolean default false,
  related_type text,
  related_id uuid,
  created_at timestamptz default now()
);

create table settings(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null,
  value text,
  created_at timestamptz default now(),
  unique(user_id, key)
);

create table audit_log(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  record_type text not null,
  record_id uuid,
  action text not null check (action in ('created','updated','deleted','completed','reopened','archived','evidence_attached','deadline_changed','decision_changed')),
  old_value text,
  new_value text,
  created_at timestamptz default now()
);

do $$ declare t text; begin foreach t in array array['report_sections','daily_plans','weekly_reviews','notifications','settings','audit_log'] loop
 execute format('alter table %I enable row level security', t);
 execute format('create index on %I(user_id)', t);
 execute format('create policy "own rows" on %I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
end loop; end $$;

insert into report_sections(user_id, title, order_index, purpose, evidence_required, target_word_count, draft_status)
select id, 'Title page / Abstract', 0, 'Identify the project and summarise in ≤200 words', 'Abstract, cover details from Canvas template', 200, 'not_started' from auth.users union all
select id, 'Introduction', 1, 'Set the scene, state aims and objectives, overview of chapters', 'Problem statement, aims, research questions', 1000, 'not_started' from auth.users union all
select id, 'Background / Literature Review', 2, 'Analytical (not descriptive) review for a non-expert reader; identify research gap', 'Critically compared sources, research gap, Harvard references', 2500, 'not_started' from auth.users union all
select id, 'Project Work / Methodology', 3, 'Explain successes, failures, alternatives considered and why you chose the approach', 'Gantt chart, decisions log, methodology with justification', 2000, 'not_started' from auth.users union all
select id, 'Design / System architecture', 4, 'Document architecture, component design, design decisions and rationale', 'Architecture diagram, component design, design choices', 1000, 'not_started' from auth.users union all
select id, 'Implementation', 5, 'Document the build: what was built, how, key challenges and solutions', 'Code structure, build evidence, implementation screenshots', 1000, 'not_started' from auth.users union all
select id, 'Testing, Results, Discussion & Evaluation', 6, 'Test cases (pass AND fail), results, baseline comparison, interpreted findings, limitations', 'Test evidence, baseline vs proposed metrics, evaluation', 1500, 'not_started' from auth.users union all
select id, 'Conclusions & Future Work', 7, '≤1 page; qualitative and quantitative wrap-up tied back to aims', 'Achievements summary, future work ideas', 500, 'not_started' from auth.users union all
select id, 'Project Management Review', 8, '≤2 pages; compare all Gantt chart versions and review progress against plan', 'Gantt chart comparisons, risk register outcomes, decisions', 500, 'not_started' from auth.users union all
select id, 'References / Bibliography / Appendices', 9, 'Harvard references, cited everything, appendices referenced from the text', 'All sources cited, appendices properly cross-referenced', 0, 'not_started' from auth.users;
