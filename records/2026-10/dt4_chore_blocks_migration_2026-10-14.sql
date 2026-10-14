-- DT-4 Chore block (Oct 14 2026): a timed block filled with the most overdue chores.
create table if not exists public.chore_blocks (
  id uuid primary key default gen_random_uuid(),
  block_date date not null,
  start_time text not null,              -- 'HH:MM'
  mins integer not null check (mins between 10 and 480),
  routine_ids uuid[] not null default '{}',
  agenda_id text,                        -- rpgace_agendas.id written by scheduleToCalendar
  status text not null default 'planned' check (status in ('planned','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists chore_blocks_date_idx on public.chore_blocks (block_date);
alter table public.chore_blocks enable row level security;
create policy anon_read_only on public.chore_blocks for select to anon using (true);
create policy authenticated_all on public.chore_blocks for all to authenticated using (true) with check (true);
