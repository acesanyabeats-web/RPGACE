-- DT-1 Day templates (Oct 14 2026). One table for both kinds of row:
--   source 'saved'  = a named template Alex saved ("Save as template")
--   source 'locked' = the record of a day he locked in (what the learning reads)
-- items = [{type:'routine'|'chore_block'|'item', routine_id, title, start:'HH:MM', mins, category, place, journey_mins}]
create table if not exists public.day_templates (
  id uuid primary key default gen_random_uuid(),
  name text,
  kind text not null check (kind in ('off','early','late')),
  weekday integer check (weekday between 1 and 7),
  source text not null check (source in ('saved','locked')),
  day_date date,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists day_templates_kind_idx on public.day_templates (kind, source, day_date);
alter table public.day_templates enable row level security;
create policy anon_read_only on public.day_templates for select to anon using (true);
create policy authenticated_all on public.day_templates for all to authenticated using (true) with check (true);
