-- XP-3 (Oct 13 2026): realm ranks, gated titles, badges, trophy cabinet, gym PB, cuisine tag.
-- Applied in pieces via the Supabase connector (lock_timeout 5s). Record of what is live.
-- 1. Tables: xp_ladders (realm, idx, name, min_xp, gate), xp_unlock_defs (key, kind badge|title|gate,
--    realm, name, how, auto, icon, sort), xp_unlocks (key, kind rank|career_rank|badge|title|gate, realm,
--    name, season [-1 = forever], status earned|claimed, proof, note, unlocked_at; unique (key, season)),
--    xp_settings (id=1, revenue_target). All RLS on, no policies (private; /api/data-write only).
--    recipes.cuisine text. xp_rules + ('gym_pb','athlete',30,capped false).
-- 2. Ladders: min_xp = steady week x [0,2,6,14,26,40,56]; career ranks = 4x min_xp (computed in
--    xp_check_unlocks). Steady weeks: producer 360, creator 200, hustler 80, chef 145, athlete 140,
--    scholar 140, life 80, homekeeper 70, mind 70, steward 70, explorer 25, connector 40, builder 75.
--    Gates: chef 3 sous_chef, chef 4 head_chef, hustler 3 closer, hustler 6 tycoon, athlete 3 gladiator,
--    scholar 5 polymath, life 3 pathfinder, mind 5 lake, steward 3 safe, explorer 5 globetrotter,
--    connector 6 heart.
-- 3. Functions below. xp_award now calls xp_check_unlocks() after a new row lands.
-- 4. Triggers: xp_gym_pb (gym_sets AFTER INSERT), xp_settings_check (xp_settings AFTER UPDATE),
--    xp_claim_check (xp_unlocks AFTER INSERT when status='claimed').
-- 5. The 8 existing recipes tagged: Indonesian, Korean, Chinese x2, Malaysian, British x2, French.
-- Verified in rolled-back DO blocks: sale -> closer/first_sale/first_100_month + hustler rank 1;
-- explorer XP stops at rank 4 without the Globetrotter gate; Heart refused on a 35-day gap;
-- PB once per exercise per session, none for a first-ever exercise; target 50 + sale 60 -> tycoon.
create or replace function public.xp_unlock(p_key text, p_kind text, p_realm text, p_name text, p_season int default -1, p_note text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.xp_unlocks (key, kind, realm, name, season, note)
-- 6. xp_settings.progress jsonb + progress_at: xp_check_unlocks() writes a progress snapshot at the end
--    (cooks, cook_recipes, cuisines, sales, season_revenue, gym_run, video_run, path_run, phyla,
--    countries, released_season, jargon_reviewed, people_tracked) for the Trophy cabinet.
--    xp_settings_check only fires when revenue_target changes (no recursion).
-- Bug found and fixed same day: the first live version named a CTE column `w` while `w` was also
-- the plpgsql loop variable, so the whole check failed silently (swallowed warning). Renamed to
-- ws / wi; caught by noticing progress stayed NULL after a manual run. The live function is the
-- one below (pg_get_functiondef is authoritative).
create or replace function public.xp_unlock(p_key text, p_kind text, p_realm text, p_name text, p_season int default -1, p_note text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  insert into public.xp_unlocks (key, kind, realm, name, season, note)
  values (p_key, p_kind, p_realm, p_name, p_season, p_note)
  on conflict (key, season) do nothing;
end $$;

create or replace function public.xp_check_unlocks()
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_day date := (now() at time zone 'Europe/London')::date;
  v_season int := case when v_day < date '2027-01-01' then 0 else extract(year from v_day)::int end;
  v_from date := case when v_season = 0 then date '1900-01-01' else make_date(v_season, 1, 1) end;
  v_to date := case when v_season = 0 then date '2026-12-31' else make_date(v_season, 12, 31) end;
  v_cooked int; v_recipes int; v_cuisines int; v_n int; v_target numeric; v_ok boolean;
  d record; c record; rl record; lad record;
  v_prev_ok boolean; v_xp bigint; v_wk date; wi int; v_week_ok boolean; v_week_n int;
  v_gym_run int; v_video_run int; v_path_run int := 0; v_path_live boolean := true; v_phyla int; v_countries int;
  v_rev numeric; v_released int; v_jargon int; v_sales int; v_people int;
begin
  -- Chef
  select count(*) into v_cooked from planned_cooks where status = 'cooked';
  select count(distinct rid), count(distinct nullif(lower(trim(r.cuisine)), '')) into v_recipes, v_cuisines
    from planned_cooks pc cross join lateral unnest(pc.recipe_ids) rid left join recipes r on r.id::text = rid::text
    where pc.status = 'cooked';
  if v_cooked >= 1 then perform xp_unlock('first_cook', 'badge', 'chef', 'First cook'); end if;
  if v_cooked >= 20 then perform xp_unlock('sous_chef', 'gate', 'chef', 'Sous Chef'); end if;
  if v_cooked >= 50 and v_recipes >= 10 and v_cuisines >= 3 then perform xp_unlock('head_chef', 'gate', 'chef', 'Head Chef'); end if;

  -- Hustler
  if exists (select 1 from chronicles_finance where type = 'sale') then
    perform xp_unlock('first_sale', 'badge', 'hustler', 'First sale');
    perform xp_unlock('closer', 'gate', 'hustler', 'Closer');
  end if;
  if exists (select 1 from chronicles_finance where type = 'sale' group by date_trunc('month', coalesce(entry_date, created_at::date)) having sum(amount) >= 100) then
    perform xp_unlock('first_100_month', 'badge', 'hustler', 'First £100 month');
  end if;
  select revenue_target into v_target from xp_settings where id = 1;
  if v_target is not null and v_target > 0 and (select coalesce(sum(amount), 0) from chronicles_finance
      where type = 'sale' and coalesce(entry_date, created_at::date) between v_from and v_to) >= v_target then
    perform xp_unlock('tycoon', 'gate', 'hustler', 'Tycoon', -1, 'Season ' || v_season || ' target £' || v_target);
  end if;

  -- Producer / Creator
  if exists (select 1 from content_productions where released_at is not null) then
    perform xp_unlock('first_beat_released', 'badge', 'producer', 'First beat released');
    perform xp_unlock('released_artist', 'title', 'producer', 'Released Artist');
  end if;
  if (select count(*) from content_productions where released_at is not null
      and (released_at at time zone 'Europe/London')::date between v_from and v_to) >= 25 then
    perform xp_unlock('catalogue_builder', 'title', 'producer', 'Catalogue Builder', -1, 'Season ' || v_season);
  end if;
  if exists (select 1 from content_productions where posted_at is not null)
     or exists (select 1 from xp_events where action = 'video_posted' and status <> 'removed') then
    perform xp_unlock('first_video', 'badge', 'creator', 'First video');
  end if;
  with wk as (
    select distinct date_trunc('week', x.d)::date ws from (
      select (posted_at at time zone 'Europe/London')::date d from content_productions where posted_at is not null
      union all select earned_on from xp_events where action = 'video_posted' and status <> 'removed') x),
  g as (select wk.ws - (row_number() over (order by wk.ws))::int * 7 grp from wk)
  select coalesce(max(n), 0) into v_video_run from (select count(*) n from g group by grp) z;
  if v_video_run >= 12 then perform xp_unlock('consistent_creator', 'title', 'creator', 'Consistent Creator'); end if;

  -- Athlete
  if exists (select 1 from xp_events where action = 'gym_pb' and status <> 'removed') then
    perform xp_unlock('first_pb', 'badge', 'athlete', 'First PB');
  end if;
  if exists (select 1 from gym_sessions group by date_trunc('week', performed_on) having count(*) >= 5) then
    perform xp_unlock('five_gym_week', 'badge', 'athlete', '5-gym week');
  end if;
  with wk as (select date_trunc('week', performed_on)::date ws from gym_sessions group by 1 having count(*) >= 3),
  g as (select wk.ws - (row_number() over (order by wk.ws))::int * 7 grp from wk)
  select coalesce(max(n), 0) into v_gym_run from (select count(*) n from g group by grp) z;
  if v_gym_run >= 4 then perform xp_unlock('gladiator', 'gate', 'athlete', 'Gladiator'); end if;

  -- Scholar
  if exists (select 1 from bibliography) or exists (select 1 from xp_events where action = 'book_finished' and status <> 'removed') then
    perform xp_unlock('first_book', 'badge', 'scholar', 'First book');
  end if;
  if (select count(*) from jargon_encyclopedia where status in ('accepted', 'rejected')) >= 100 then
    perform xp_unlock('jargon_100', 'badge', 'scholar', '100 jargon terms');
  end if;
  select count(distinct p) into v_n from (
    select jsonb_array_elements_text(case when jsonb_typeof(phyla_touched) = 'array' then phyla_touched else '[]'::jsonb end) p from bibliography) x;
  v_phyla := v_n;
  if v_n >= 8 then perform xp_unlock('polymath', 'gate', 'scholar', 'Polymath'); end if;

  -- Life: every planned routine kept for the last 6 full weeks
  -- Pathfinder: count back from last week how many full weeks every
  -- planned routine was kept (weeks with nothing planned break the run).
  for wi in 1..6 loop
    v_wk := date_trunc('week', v_day)::date - 7 * wi;
    v_week_ok := true; v_week_n := 0;
    for rl in select r.id, case r.cadence when 'daily' then 7 when 'weekly' then coalesce(array_length(r.days, 1), 0)
                when 'times_per_week' then coalesce(r.times_per_week, 0) else 0 end exp
              from routines r where r.active and r.created_at::date <= v_wk loop
      if rl.exp > 0 then
        v_week_n := v_week_n + 1;
        if (select count(*) from quest_log q where q.quest_kind = 'routine' and q.source_ref = rl.id::text and q.status = 'completed'
            and (q.completed_at at time zone 'Europe/London')::date between v_wk and v_wk + 6) < rl.exp then
          v_week_ok := false;
        end if;
      end if;
    end loop;
    exit when not (v_week_ok and v_week_n > 0);
    v_path_run := v_path_run + 1;
  end loop;
  if v_path_run >= 6 then perform xp_unlock('pathfinder', 'gate', 'life', 'Pathfinder'); end if;

  -- Explorer
  for c in select min(trim(country)) country, lower(trim(country)) k from plans
           where status = 'done' and nullif(trim(country), '') is not null group by lower(trim(country)) loop
    perform xp_unlock('new_country:' || c.k, 'badge', 'explorer', 'New country: ' || c.country);
  end loop;
  select count(distinct lower(trim(country))) into v_countries from plans where status = 'done' and nullif(trim(country), '') is not null;
  if v_countries >= 5 then
    perform xp_unlock('globetrotter', 'gate', 'explorer', 'Globetrotter');
  end if;

  -- Connector: nobody overdue at any point in the last 90 days
  if exists (select 1 from people where reach_every_days > 0) then
    v_ok := true;
    for d in select p.id, p.reach_every_days, p.created_at, p.last_spoke from people p where p.reach_every_days > 0 loop
      if d.created_at::date > v_day - 90 then v_ok := false; exit; end if;
      if not exists (
        with t as (
          select x.dt from (
            select split_part(e.source_id, ':', 2)::date dt from xp_events e
              where e.action = 'caught_up' and e.source_id like d.id::text || ':%' and e.status <> 'removed'
            union select d.last_spoke) x where x.dt is not null
          union select v_day),
        s as (select dt, lag(dt) over (order by dt) prev from t)
        select 1 from s where prev is not null and dt > v_day - 90 and dt - greatest(prev, v_day - 90) > d.reach_every_days
        union all select 1 where (select min(dt) from t) > v_day - 90 + d.reach_every_days
      ) then null; else v_ok := false; exit; end if;
    end loop;
    if v_ok then perform xp_unlock('heart', 'gate', 'connector', 'Heart'); end if;
  end if;

  -- Ranks: season (resets) and career (4x slower). A rank needs its XP and its gate,
  -- and every rank below it.
  for rl in select distinct realm from xp_ladders loop
    select coalesce(sum(xp), 0) into v_xp from xp_events where realm = rl.realm and status = 'active' and season = v_season;
    v_prev_ok := true;
    for lad in select * from xp_ladders where realm = rl.realm and idx > 0 order by idx loop
      exit when not v_prev_ok;
      if v_xp >= lad.min_xp and (lad.gate is null or exists (select 1 from xp_unlocks where key = lad.gate)) then
        perform xp_unlock('rank:' || rl.realm || ':' || lad.idx, 'rank', rl.realm, lad.name, v_season);
      else v_prev_ok := false; end if;
    end loop;
    select coalesce(sum(xp), 0) into v_xp from xp_events where realm = rl.realm and status = 'active';
    v_prev_ok := true;
    for lad in select * from xp_ladders where realm = rl.realm and idx > 0 order by idx loop
      exit when not v_prev_ok;
      if v_xp >= lad.min_xp * 4 and (lad.gate is null or exists (select 1 from xp_unlocks where key = lad.gate)) then
        perform xp_unlock('career:' || rl.realm || ':' || lad.idx, 'career_rank', rl.realm, lad.name);
      else v_prev_ok := false; end if;
    end loop;
  end loop;
  -- Progress snapshot for the Trophy cabinet (read-only for the client).
  select count(*) into v_sales from chronicles_finance where type = 'sale';
  select coalesce(sum(amount), 0) into v_rev from chronicles_finance where type = 'sale' and coalesce(entry_date, created_at::date) between v_from and v_to;
  select count(*) into v_released from content_productions where released_at is not null and (released_at at time zone 'Europe/London')::date between v_from and v_to;
  select count(*) into v_jargon from jargon_encyclopedia where status in ('accepted', 'rejected');
  select count(*) into v_people from people where reach_every_days > 0;
  update xp_settings set progress_at = now(), progress = jsonb_build_object(
    'cooks', v_cooked, 'cook_recipes', v_recipes, 'cuisines', v_cuisines, 'sales', v_sales, 'season_revenue', v_rev,
    'gym_run', v_gym_run, 'video_run', v_video_run, 'path_run', v_path_run, 'phyla', v_phyla, 'countries', v_countries,
    'released_season', v_released, 'jargon_reviewed', v_jargon, 'people_tracked', v_people) where id = 1;
exception when others then
  raise warning 'xp_check_unlocks failed: %', sqlerrm;
end $$;

revoke execute on function public.xp_unlock(text, text, text, text, int, text) from public, anon;
revoke execute on function public.xp_check_unlocks() from public, anon;
