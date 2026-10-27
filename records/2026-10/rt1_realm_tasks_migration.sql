-- RT-1 Realm Tasks (Oct 27 2026). Paste into the Supabase SQL editor (project gripopghczmrbrhqtqbm) if the
-- session's migration timed out. Additive only: 2 new tables, 1 function pair, 1 trigger, RLS policies. No deletes.
create table if not exists realm_task_types (
  id text primary key, realm text not null, key text not null, label text not null, icon text,
  sort int not null default 0, created_at timestamptz not null default now()
);
create table if not exists realm_tasks (
  id uuid primary key default gen_random_uuid(),
  realm text not null, type_key text, title text not null, norm_title text, notes text,
  kind text not null default 'repeat' check (kind in ('repeat','once')),
  rest_days int not null default 2,
  earns text not null default 'tick' check (earns in ('real','tick','xp')),
  xp int, mins int not null default 30, opens text, how text, link_table text, link_id text,
  status text not null default 'inbox' check (status in ('inbox','proposed','kept','dropped','done')),
  dup_of uuid references realm_tasks(id) on delete set null,
  sources jsonb not null default '[]'::jsonb,
  last_done_at timestamptz, done_count int not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists realm_tasks_realm_status on realm_tasks (realm, status);
create index if not exists realm_tasks_norm_trgm on realm_tasks using gin (norm_title gin_trgm_ops);
create or replace function realm_task_norm(t text) returns text language sql immutable as $$
  select trim(regexp_replace(regexp_replace(lower(coalesce(t,'')), '[^a-z0-9 ]+', ' ', 'g'), '\s+', ' ', 'g'))
$$;
create or replace function realm_tasks_dedup() returns trigger language plpgsql as $$
declare ex realm_tasks%rowtype; sim real; src jsonb;
begin
  new.norm_title := realm_task_norm(new.title);
  new.updated_at := now();
  if tg_op = 'UPDATE' then return new; end if;
  if new.norm_title = '' then return null; end if;
  if exists (select 1 from routines r where r.active and realm_task_norm(r.title) = new.norm_title) then return null; end if;
  select * into ex from realm_tasks t where t.norm_title = new.norm_title limit 1;
  if ex.id is null then
    select t.* into ex from realm_tasks t
     where t.realm = new.realm and t.norm_title % new.norm_title
     order by similarity(t.norm_title, new.norm_title) desc limit 1;
  end if;
  if ex.id is not null then
    sim := case when ex.norm_title = new.norm_title then 1 else similarity(ex.norm_title, new.norm_title) end;
    if sim >= 0.72 then
      for src in select * from jsonb_array_elements(coalesce(new.sources, '[]'::jsonb)) loop
        if not exists (select 1 from jsonb_array_elements(ex.sources) e where e->>'table' = src->>'table' and e->>'ref' = src->>'ref') then
          update realm_tasks set sources = sources || jsonb_build_array(src), updated_at = now() where id = ex.id;
          ex.sources := ex.sources || jsonb_build_array(src);
        end if;
      end loop;
      return null;
    elsif sim >= 0.5 then
      new.dup_of := ex.id;
      if new.status not in ('inbox','proposed') then new.status := 'inbox'; end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists realm_tasks_dedup on realm_tasks;
create trigger realm_tasks_dedup before insert or update of title on realm_tasks for each row execute function realm_tasks_dedup();
alter table realm_tasks enable row level security;
alter table realm_task_types enable row level security;
drop policy if exists authenticated_all on realm_tasks;
drop policy if exists authenticated_all on realm_task_types;
create policy authenticated_all on realm_tasks for all to authenticated using (true) with check (true);
create policy authenticated_all on realm_task_types for all to authenticated using (true) with check (true);

-- CHECK: expect 2 tables, the trigger, and 'merged' = 0 rows added on the second insert.
select table_name from information_schema.tables where table_name in ('realm_tasks','realm_task_types');
select tgname from pg_trigger where tgname = 'realm_tasks_dedup';
