-- XP-5 (Oct 13 2026): weekly challenges, season resolutions, realm quests. Applied via the connector.
-- Answers: xp_season_pass_ceo_loop1_2026-10-13.txt section 13.
-- Tables (RLS on, no policies, /api/data-write only):
--   xp_challenges (kind weekly|resolution|realm_quest, period_start/end, title, realm,
--     metric_actions text[] (null = ticked by hand), measure count|xp, target, progress, xp, size,
--     source rules|oracle|alex|gate, status suggested|active|done|missed|expired, step_key unique, done_at)
--   xp_quest_steps (key, gate, realm, label, progress_key [xp_settings.progress key], target, step, sort)
--     seeded: 3 steps each for sous_chef, head_chef, gladiator, polymath, pathfinder, globetrotter,
--     consistent_creator, catalogue_builder (24 rows).
-- xp_rules + challenge_done 75, resolution_kept 1000, realm_quest_step 50 (all life, uncapped; the
--   real XP is passed per row: 75 per weekly, 500/1000/1500 per resolution size, 50 per step).
-- Trigger xp_challenge_change (AFTER INSERT/UPDATE on xp_challenges) -> xp_on_challenge().
-- xp_check_unlocks() now ends with: perform xp_update_challenges(); perform xp_quest_check();
-- xp_close_periods() week loop: active weekly -> missed, suggested -> expired (before the report);
--   season loop: active resolutions -> missed (before the season report).
-- xp_save_report() data gains 'challenges' (done/missed in the period; quest steps by done_at).
-- Verified (rolled back): 2 gym + challenge "Gym 3" = progress 2; 3rd gym -> weekly 75 + resolution
--   1000 paid; hand-ticked "Call Mum" -> 75; cooks 6 -> sous_chef:1 step 50; week close -> missed,
--   expired, report lists the missed challenge.
-- Counts every active challenge/resolution that has a metric; a met target completes it and pays.
create or replace function public.xp_update_challenges()
returns void language plpgsql security definer set search_path to 'public' as $$
declare c record; v int;
begin
  for c in select * from xp_challenges where status = 'active' and metric_actions is not null loop
    if c.measure = 'xp' then
      select coalesce(sum(xp), 0) into v from xp_events
        where status <> 'removed' and realm = c.realm and earned_on between c.period_start and c.period_end
          and action not in ('challenge_done','resolution_kept','realm_quest_step','balance_bonus');
    else
      select count(*) into v from xp_events
        where status <> 'removed' and action = any(c.metric_actions) and earned_on between c.period_start and c.period_end;
    end if;
    if v >= c.target then
      update xp_challenges set progress = v, status = 'done', done_at = now() where id = c.id;
      perform xp_award(case when c.kind = 'resolution' then 'resolution_kept' else 'challenge_done' end,
        'xp_challenges', c.id::text, c.xp, c.realm, c.title);
    elsif v <> c.progress then
      update xp_challenges set progress = v where id = c.id;
    end if;
  end loop;
end $$;

-- Realm quest steps: each step pays once when the progress snapshot reaches its target.
create or replace function public.xp_quest_check()
returns void language plpgsql security definer set search_path to 'public' as $$
declare s record; p jsonb; v_day date := (now() at time zone 'Europe/London')::date;
begin
  select progress into p from xp_settings where id = 1;
  if p is null then return; end if;
  for s in select * from xp_quest_steps order by sort loop
    if coalesce((p ->> s.progress_key)::numeric, 0) >= s.target
       and not exists (select 1 from xp_challenges where step_key = s.key) then
      insert into xp_challenges (kind, period_start, period_end, title, realm, target, progress, xp, source, status, step_key, done_at)
      values ('realm_quest', v_day, v_day, s.label, s.realm, s.target, (p ->> s.progress_key)::numeric::int, 50, 'gate', 'done', s.key, now())
      on conflict (step_key) do nothing;
      perform xp_award('realm_quest_step', 'xp_quest_steps', s.key, 50, s.realm, s.label);
    end if;
  end loop;
end $$;

-- Picking a challenge (insert active, or suggested -> active) counts what is already earned
-- in its period; ticking a hand-checked one done pays it.
create or replace function public.xp_on_challenge()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  begin
    if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
      perform xp_update_challenges();
    elsif tg_op = 'UPDATE' and new.status = 'done' and old.status = 'active' and new.metric_actions is null then
      update xp_challenges set done_at = coalesce(done_at, now()) where id = new.id;
      perform xp_award(case when new.kind = 'resolution' then 'resolution_kept' else 'challenge_done' end,
        'xp_challenges', new.id::text, new.xp, new.realm, new.title);
    end if;
  exception when others then raise warning 'xp_on_challenge failed: %', sqlerrm;
  end;
  return new;
end $$;

revoke execute on function public.xp_update_challenges() from public, anon;
revoke execute on function public.xp_quest_check() from public, anon;
revoke execute on function public.xp_on_challenge() from public, anon;
