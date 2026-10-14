-- MD2-8/MD2-11 (Oct 14 2026), applied via Supabase MCP as migration md2_trackers_cutback.
create table if not exists public.cutback_items (
  id uuid primary key default gen_random_uuid(),
  name text not null, icon text, unit text,
  baseline integer check (baseline is null or baseline >= 0),
  target integer not null default 0 check (target >= 0),
  active boolean not null default true, sort integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.cutback_log (
  item_id uuid not null references public.cutback_items(id) on delete cascade,
  day date not null,
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (item_id, day)
);
alter table public.cutback_items enable row level security;
alter table public.cutback_log enable row level security;
create policy authenticated_all on public.cutback_items for all to authenticated using (true) with check (true);
create policy authenticated_all on public.cutback_log for all to authenticated using (true) with check (true);
alter table public.myday_settings add column if not exists tracker_days jsonb;
insert into public.xp_rules (action, realm, base_xp, capped, label)
values ('cutback_day', 'mind', 15, false, 'Day kept at or under a cut-back target')
on conflict (action) do nothing;
create or replace function public.xp_cutback_close()
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_today date := (now() at time zone 'Europe/London')::date;
  v_x int;
  rec record;
begin
  select base_xp into v_x from xp_rules where action = 'cutback_day';
  for rec in
    select l.item_id, l.day, l.count, i.target, i.name from cutback_log l join cutback_items i on i.id = l.item_id
    where l.day between v_today - 7 and v_today - 1 and l.count <= i.target
  loop
    insert into xp_events (season, realm, action, source_table, source_id, base_xp, multiplier, xp, earned_on, note)
    values (xp_year_of(rec.day), 'mind', 'cutback_day', 'cutback_log', rec.item_id::text || ':' || rec.day::text, v_x, 1, v_x, rec.day,
            rec.name || ': ' || rec.count || ' of ' || rec.target)
    on conflict (source_table, source_id, action) do nothing;
  end loop;
  perform xp_check_unlocks();
end $$;
select cron.schedule('xp-cutback-close', '10 0 * * *', 'select public.xp_cutback_close()');
-- Verified in a rolled-back transaction: 1 award for a day under target, 0 for a day over, re-run idempotent.
