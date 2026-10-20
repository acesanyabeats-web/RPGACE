-- MD-2 (Oct 20 2026): additive. Connector cancelled it; a session retries it (Alex asked not to be handed SQL).
alter table chore_blocks add column if not exists method text;
alter table chore_blocks drop constraint if exists chore_blocks_method_chk;
alter table chore_blocks add constraint chore_blocks_method_chk check (method is null or method in ('pomodoro','deep50','deep90','timebox','none'));
alter table myday_settings add column if not exists realm_methods jsonb not null default '{}'::jsonb;
create table if not exists week_templates (id uuid primary key default gen_random_uuid(), name text not null, blocks jsonb not null default '[]'::jsonb, created_at timestamptz not null default now());
alter table week_templates enable row level security;
create policy anon_read_only on week_templates for select to anon using (true);
create policy authenticated_all on week_templates for all to authenticated using (true) with check (true);
