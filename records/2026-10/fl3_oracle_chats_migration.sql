-- FL-3 (Oct 27 2026): Oracle chat memory. Private: no anon policy; written and read
-- only through /api/data-write (signed in). One row per question + answer.
create table if not exists public.oracle_chats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text,
  question text not null,
  answer text not null
);
create index if not exists oracle_chats_created_idx on public.oracle_chats (created_at desc);
alter table public.oracle_chats enable row level security;
create policy authenticated_all on public.oracle_chats for all to authenticated using (true) with check (true);
comment on table public.oracle_chats is 'FL-3: every Oracle chat exchange, so Oracle can look back (askMyData source chats). Private.';
