-- PS-1 freeze recorder, Oct 14 2026 (apply_migration 'perf_freezes_recorder').
create table if not exists public.perf_freezes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ms integer not null, blocking_ms integer,
  phase text check (phase in ('boot','use')), since_load_ms integer,
  page text, build text, source text check (source in ('loaf','longtask')),
  scripts jsonb, last_actions jsonb, resources jsonb, boot_pending integer, device text
);
create index if not exists perf_freezes_created on public.perf_freezes (created_at desc);
alter table public.perf_freezes enable row level security;
create policy authenticated_all on public.perf_freezes for all to authenticated using (true) with check (true);
