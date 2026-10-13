-- XP Season Pass, XP-1 (Oct 13 2026). Additive only: 2 new private tables,
-- 3 new content_productions columns, 1 award function, 2 trigger functions,
-- triggers on 15 source tables. No existing row is changed.
-- Ratified values: records/2026-10/xp_season_pass_ceo_loop1_2026-10-13.txt

-- 1. Beat ticks (Alex: "Add two ticks to the beat card")
alter table public.content_productions
  add column if not exists finished_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists release_url text;

-- 2. Rules: one row per earnable action. Fix a value here, no deploy needed.
create table if not exists public.xp_rules (
  action text primary key,
  realm text not null,
  base_xp integer not null,
  capped boolean not null default false,  -- same action, same day: 100%, 50%, then 0
  label text not null
);
alter table public.xp_rules enable row level security;
drop policy if exists authenticated_all on public.xp_rules;
create policy authenticated_all on public.xp_rules for all to authenticated using (true) with check (true);

insert into public.xp_rules (action, realm, base_xp, capped, label) values
  ('beat_logged',     'producer',   30,  true,  'Beat logged'),
  ('beat_finished',   'producer',   120, false, 'Beat finished'),
  ('beat_released',   'producer',   300, false, 'Beat released'),
  ('treatment_done',  'creator',    60,  false, 'Visual treatment done'),
  ('video_posted',    'creator',    300, false, 'Video posted'),
  ('sale',            'hustler',    100, false, 'Sale (2 XP per £1, min 100)'),
  ('cook_finished',   'chef',       60,  false, 'Cook finished (+10 per extra recipe)'),
  ('recipe_saved',    'chef',       25,  false, 'Recipe saved'),
  ('gym_session',     'athlete',    40,  false, 'Gym session'),
  ('chapter_done',    'scholar',    30,  false, 'Chapter analysed'),
  ('book_finished',   'scholar',    300, false, 'Book finished'),
  ('jargon_reviewed', 'scholar',    3,   true,  'Jargon term reviewed'),
  ('library_added',   'scholar',    3,   true,  'Library item added by hand'),
  ('journal_entry',   'life',       15,  true,  'Journal entry you wrote'),
  ('quest_done',      'life',       0,   false, 'Quest completed (its own XP)'),
  ('routine_tick',    'life',       0,   false, 'My Day routine (its own XP, realm from its area)'),
  ('expense_logged',  'steward',    5,   true,  'Expense logged'),
  ('plan_made',       'explorer',   30,  false, 'Plan made'),
  ('trip_done',       'explorer',   200, false, 'Trip or plan done'),
  ('caught_up',       'connector',  20,  false, 'Caught up with someone on time'),
  ('hand_test',       'builder',    20,  false, 'Feature hand-tested and ticked'),
  ('flag',            'builder',    15,  false, 'Flag to Claude Code')
on conflict (action) do update set realm = excluded.realm, base_xp = excluded.base_xp, capped = excluded.capped, label = excluded.label;

-- 3. The ledger. One row per earned action; it is a copy, not tied to the
-- source row's life (Alex: old XP stays even if the record is deleted).
create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  season integer not null,                 -- 0 = "Season 0: Construction" (pre-season), else the year
  realm text not null,
  action text not null,
  source_table text not null,
  source_id text not null,
  base_xp integer not null,
  multiplier numeric not null default 1,
  xp integer not null,
  earned_on date not null,                 -- Europe/London day
  earned_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'pending_confirm', 'removed')),
  note text,
  unique (source_table, source_id, action)
);
create index if not exists xp_events_season_idx on public.xp_events (season, earned_on);
alter table public.xp_events enable row level security;
drop policy if exists authenticated_all on public.xp_events;
create policy authenticated_all on public.xp_events for all to authenticated using (true) with check (true);

-- 4. The one award function. Never raises: an XP bug can't block a save.
create or replace function public.xp_award(p_action text, p_table text, p_id text,
  p_xp integer default null, p_realm text default null, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.xp_rules;
  v_base integer;
  v_day date := (now() at time zone 'Europe/London')::date;
  v_n integer;
  v_mult numeric := 1;
begin
  select * into r from public.xp_rules where action = p_action;
  if not found then return; end if;
  v_base := coalesce(p_xp, r.base_xp);
  if v_base is null or v_base <= 0 then return; end if;
  if r.capped then
    select count(*) into v_n from public.xp_events
      where action = p_action and earned_on = v_day and status <> 'removed';
    v_mult := case when v_n = 0 then 1 when v_n = 1 then 0.5 else 0 end;
  end if;
  insert into public.xp_events (season, realm, action, source_table, source_id, base_xp, multiplier, xp, earned_on, note)
  values (case when v_day < date '2027-01-01' then 0 else extract(year from v_day)::int end,
          coalesce(p_realm, r.realm), p_action, p_table, p_id, v_base, v_mult, round(v_base * v_mult)::int, v_day, p_note)
  on conflict (source_table, source_id, action) do nothing;
exception when others then
  raise warning 'xp_award failed for % %: %', p_action, p_id, sqlerrm;
end $$;

-- 5. One trigger function for every source table.
create or replace function public.xp_on_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t text := tg_table_name;
  n integer;
  v_realm text;
begin
  begin
    if t = 'content_productions' then
      if tg_op = 'INSERT' and new.content_type = 'music_video' then
        perform public.xp_award('beat_logged', t, new.id::text, null, null, new.title);
      end if;
      if tg_op = 'UPDATE' then
        if new.status = 'Scripted' and old.status is distinct from 'Scripted' then
          perform public.xp_award('treatment_done', t, new.id::text, null, null, new.title);
        end if;
        if (new.status = 'Posted' and old.status is distinct from 'Posted')
           or (coalesce(new.youtube_url, new.instagram_url, new.tiktok_url) is not null
               and coalesce(old.youtube_url, old.instagram_url, old.tiktok_url) is null) then
          perform public.xp_award('video_posted', t, new.id::text, null, null, new.title);
        end if;
        if new.finished_at is not null and old.finished_at is null then
          perform public.xp_award('beat_finished', t, new.id::text, null, null, new.title);
        end if;
        if new.released_at is not null and old.released_at is null then
          perform public.xp_award('beat_released', t, new.id::text, null, null, new.title);
        end if;
      end if;
    elsif t = 'planned_cooks' then
      if new.status = 'cooked' and (tg_op = 'INSERT' or old.status is distinct from 'cooked') then
        n := greatest(coalesce(array_length(new.recipe_ids, 1), 1), 1);
        perform public.xp_award('cook_finished', t, new.id::text, 60 + 10 * (n - 1));
      end if;
    elsif t = 'recipes' then
      perform public.xp_award('recipe_saved', t, new.id::text, null, null, new.title);
    elsif t = 'gym_sessions' then
      perform public.xp_award('gym_session', t, new.id::text);
    elsif t = 'bookworm_chapters' then
      if new.status = 'complete' and old.status is distinct from 'complete' then
        perform public.xp_award('chapter_done', t, new.id::text, null, null, new.chapter_title);
      end if;
    elsif t = 'bibliography' then
      if new.book_id is not null then
        perform public.xp_award('book_finished', t, new.id::text, null, null, new.title);
      end if;
    elsif t = 'jargon_encyclopedia' then
      if old.status = 'pending' and new.status in ('accepted', 'rejected') then
        perform public.xp_award('jargon_reviewed', t, new.id::text, null, null, new.term);
      end if;
    elsif t = 'library_items' then
      if new.source_table is null then
        perform public.xp_award('library_added', t, new.id::text, null, null, new.title);
      end if;
    elsif t = 'journal' then
      if new.source in ('manual', 'decision_journal') then
        perform public.xp_award('journal_entry', t, new.id::text, null, null, new.title);
      end if;
    elsif t = 'chronicles_finance' then
      if new.type = 'sale' then
        perform public.xp_award('sale', t, new.id::text, greatest(100, round(coalesce(new.amount, 0) * 2)::int), null, new.item);
      elsif new.type = 'expense' then
        perform public.xp_award('expense_logged', t, new.id::text, null, null, new.item);
      end if;
    elsif t = 'plans' then
      if new.status in ('planning', 'booked', 'done') then
        perform public.xp_award('plan_made', t, new.id::text, null, null, new.title);
      end if;
      if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
        perform public.xp_award('trip_done', t, new.id::text, null, null, new.title);
      end if;
    elsif t = 'people' then
      if tg_op = 'UPDATE' and new.last_spoke is not null and new.last_spoke is distinct from old.last_spoke
         and (old.last_spoke is null or new.reach_every_days is null
              or new.last_spoke <= old.last_spoke + new.reach_every_days) then
        perform public.xp_award('caught_up', t, new.id::text || ':' || new.last_spoke::text, null, null, new.name);
      end if;
    elsif t = 'smoke_test_items' then
      if new.status = 'confirmed_working' and old.status is distinct from 'confirmed_working' then
        perform public.xp_award('hand_test', t, new.id::text || ':' || (now() at time zone 'Europe/London')::date::text, null, null, new.item_name);
      end if;
    elsif t = 'oracle_dev_suggestions' then
      perform public.xp_award('flag', t, new.id::text);
    elsif t = 'quest_log' then
      if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') and coalesce(new.xp, 0) > 0 then
        if new.quest_kind = 'routine' then
          v_realm := case lower(coalesce(new.category, ''))
            when 'music' then 'producer' when 'content' then 'creator' when 'health' then 'athlete'
            when 'learning' then 'scholar' when 'home' then 'homekeeper' when 'coding' then 'builder'
            when 'mind' then 'mind' else 'life' end;
          perform public.xp_award('routine_tick', t, new.id::text, new.xp, v_realm, new.name);
        else
          perform public.xp_award('quest_done', t, new.id::text, new.xp, null, new.name);
        end if;
      end if;
    end if;
  exception when others then
    raise warning 'xp_on_change failed on %: %', t, sqlerrm;
  end;
  return new;
end $$;

-- 6. Undo: a source row deleted in the same week -> its XP waits for
-- "was this actually done?" (XP-4 asks; it still counts until then).
-- Older XP stays.
create or replace function public.xp_on_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    update public.xp_events set status = 'pending_confirm'
      where source_table = tg_table_name and status = 'active'
        and (source_id = old.id::text or source_id like old.id::text || ':%')
        and earned_on >= date_trunc('week', (now() at time zone 'Europe/London'))::date;
  exception when others then
    raise warning 'xp_on_delete failed on %: %', tg_table_name, sqlerrm;
  end;
  return old;
end $$;

-- 7. Triggers (AFTER, so a failure here can never undo the save).
do $$
declare tb text;
begin
  foreach tb in array array['content_productions','planned_cooks','recipes','gym_sessions','bookworm_chapters',
    'bibliography','jargon_encyclopedia','library_items','journal','chronicles_finance','plans','people',
    'smoke_test_items','oracle_dev_suggestions','quest_log'] loop
    execute format('drop trigger if exists xp_change on public.%I', tb);
    execute format('create trigger xp_change after insert or update on public.%I for each row execute function public.xp_on_change()', tb);
    execute format('drop trigger if exists xp_delete on public.%I', tb);
    execute format('create trigger xp_delete after delete on public.%I for each row execute function public.xp_on_delete()', tb);
  end loop;
end $$;

-- APPLIED VERSION NOTES (Oct 13 2026):
-- * Applied in pieces (apply_migration timed out on the full script):
--   xp1_beat_tick_columns, xp1_rules_and_events_tables, rules seed (execute_sql),
--   xp1_award_function (+ revoke execute from public, anon), xp1_change_function
--   (xp_on_change + xp_on_delete), then triggers one small execute_sql batch at a
--   time with lock_timeout 5s (15 tables x xp_change + xp_delete, verified 15/15).
-- * The applied xp_on_change nests every old.* check inside a tg_op = 'UPDATE'
--   (or INSERT-or-changed) check, so INSERT rows never read OLD.
-- * Verified with rolled-back DO blocks (results raised, nothing kept): gym 40;
--   journal manual 15/8/0, app-written 0; sale 80 -> 160, sale 20 -> 100,
--   expense 5; cook with 2 recipes 70; plan made 30 + trip done 200; Home routine
--   -> homekeeper 10; beat logged 30 / finished 120 / released 300, treatment 60,
--   video posted 300. Same-week delete -> pending_confirm verified by Alex in the
--   SQL editor (gym_session=40[pending_confirm], rolled back); the connector holds
--   any statement containing DELETE for user approval, so the session couldn't run it.
