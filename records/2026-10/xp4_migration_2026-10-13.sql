-- XP-4 (Oct 13 2026): the "was this done?" question + saved reports. Applied via the Supabase
-- connector. Answers recorded in xp_season_pass_ceo_loop1_2026-10-13.txt section 12.
-- 1. xp_reports (kind week|month|season|year, period_start, period_end, label, data jsonb,
--    unique(kind, period_start)); RLS on, no policies (private, /api/data-write read only).
-- 2. xp_rules + ('balance_bonus','life',50,false,'Balance bonus'). Tycoon/Catalogue Builder
--    wording: "this year's revenue target", "25 beats in one year".
-- 3. pg_cron enabled; job 'xp-close-periods' at '5 0 * * *' (00:05 UTC = after London midnight
--    all year) runs select public.xp_close_periods().
-- 4. xp_check_unlocks notes: 'Season ' || v_season -> 'Year ' || v_season (2 places).
-- Seasons are UK weather seasons (Spring Mar-May, Summer Jun-Aug, Autumn Sep-Nov, Winter Dec-Feb).
-- The yearly pass is a "Year" (Year 0: Construction, then Year 2027); column names unchanged.
-- Verified in a rolled-back block: week of 7 Sep with 6 realms -> +50 balance bonus, an
-- unanswered pending row kept (active), week 515 XP / month 515 / Summer 2026 report saved,
-- labels "Winter 2026/27" (for Dec 2026 and Jan 2027) and "Spring 2027".
-- Year number for a London date: 0 before 2027-01-01, else the calendar year.
create or replace function public.xp_year_of(d date) returns int language sql immutable as $$
  select case when d < date '2027-01-01' then 0 else extract(year from d)::int end $$;

-- UK weather season containing d: Spring Mar-May, Summer Jun-Aug, Autumn Sep-Nov, Winter Dec-Feb.
create or replace function public.xp_season_start(d date) returns date language sql immutable as $$
  select case
    when extract(month from d) = 12 then make_date(extract(year from d)::int, 12, 1)
    when extract(month from d) in (1, 2) then make_date(extract(year from d)::int - 1, 12, 1)
    else make_date(extract(year from d)::int, (3 + ((extract(month from d)::int - 3) / 3) * 3), 1) end $$;

create or replace function public.xp_season_label(s date) returns text language sql immutable as $$
  select case extract(month from s)::int
    when 3 then 'Spring ' || extract(year from s)::int
    when 6 then 'Summer ' || extract(year from s)::int
    when 9 then 'Autumn ' || extract(year from s)::int
    else 'Winter ' || extract(year from s)::int || '/' || lpad(((extract(year from s)::int + 1) % 100)::text, 2, '0') end $$;

-- One frozen snapshot of a period. Never overwrites an existing report.
create or replace function public.xp_save_report(p_kind text, p_start date, p_end date, p_label text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v jsonb; v_year int := xp_year_of(p_end);
begin
  with e as (select * from xp_events where status <> 'removed' and earned_on between p_start and p_end)
  select jsonb_build_object(
    'xp', coalesce((select sum(xp) from e), 0),
    'events', (select count(*) from e),
    'realms', coalesce((select jsonb_object_agg(realm, t) from (select realm, sum(xp) t from e group by realm having sum(xp) > 0) r), '{}'::jsonb),
    'realms_touched', (select count(distinct realm) from e where xp > 0 and action <> 'balance_bonus'),
    'best_day', (select jsonb_build_object('day', earned_on, 'xp', t) from (select earned_on, sum(xp) t from e group by earned_on order by 2 desc, 1 limit 1) b),
    'top_actions', coalesce((select jsonb_agg(jsonb_build_object('action', action, 'xp', t, 'n', n) order by t desc) from (select action, sum(xp) t, count(*) n from e group by action order by 2 desc limit 5) a), '[]'::jsonb),
    'balance_bonus', coalesce((select sum(xp) from e where action = 'balance_bonus'), 0),
    'unlocks', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'name', name, 'realm', realm, 'at', unlocked_at) order by unlocked_at)
                from xp_unlocks where (unlocked_at at time zone 'Europe/London')::date between p_start and p_end), '[]'::jsonb),
    'year', v_year,
    'year_xp_to_date', coalesce((select sum(xp) from xp_events where status <> 'removed' and season = v_year and earned_on <= p_end), 0)
  ) into v;
  insert into xp_reports (kind, period_start, period_end, label, data) values (p_kind, p_start, p_end, p_label, v)
  on conflict (kind, period_start) do nothing;
end $$;

-- Closes every finished week/month/season/year that has no report yet.
-- Week close first: pending (deleted-this-week) XP nobody answered is kept,
-- then the balance bonus (5+ realms 50, 8+ realms 150), then the snapshot.
create or replace function public.xp_close_periods()
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_today date := (now() at time zone 'Europe/London')::date;
  v_first date; v_p date; v_n int; v_bonus int;
begin
  select min(earned_on) into v_first from xp_events;
  if v_first is null then return; end if;

  for v_p in select generate_series(date_trunc('week', v_first)::date, date_trunc('week', v_today)::date - 7, interval '7 days')::date loop
    continue when exists (select 1 from xp_reports where kind = 'week' and period_start = v_p);
    update xp_events set status = 'active' where status = 'pending_confirm' and earned_on between v_p and v_p + 6;
    select count(distinct realm) into v_n from xp_events
      where status = 'active' and xp > 0 and action <> 'balance_bonus' and earned_on between v_p and v_p + 6;
    v_bonus := case when v_n >= 8 then 150 when v_n >= 5 then 50 else 0 end;
    if v_bonus > 0 then
      insert into xp_events (season, realm, action, source_table, source_id, base_xp, multiplier, xp, earned_on, note)
      values (xp_year_of(v_p + 6), 'life', 'balance_bonus', 'xp_weeks', v_p::text, v_bonus, 1, v_bonus, v_p + 6, v_n || ' realms this week')
      on conflict (source_table, source_id, action) do nothing;
    end if;
    perform xp_save_report('week', v_p, v_p + 6, 'Week of ' || trim(to_char(v_p, 'FMDD Mon YYYY')));
  end loop;

  for v_p in select generate_series(date_trunc('month', v_first)::date, (date_trunc('month', v_today) - interval '1 month')::date, interval '1 month')::date loop
    continue when exists (select 1 from xp_reports where kind = 'month' and period_start = v_p);
    perform xp_save_report('month', v_p, (v_p + interval '1 month')::date - 1, trim(to_char(v_p, 'FMMonth YYYY')));
  end loop;

  for v_p in select generate_series(xp_season_start(v_first), (xp_season_start(v_today) - interval '3 months')::date, interval '3 months')::date loop
    continue when exists (select 1 from xp_reports where kind = 'season' and period_start = v_p);
    perform xp_save_report('season', v_p, (v_p + interval '3 months')::date - 1, xp_season_label(v_p));
  end loop;

  for v_p in select generate_series(date_trunc('year', v_first)::date, (date_trunc('year', v_today) - interval '1 year')::date, interval '1 year')::date loop
    continue when exists (select 1 from xp_reports where kind = 'year' and period_start = v_p);
    perform xp_save_report('year', v_p, (v_p + interval '1 year')::date - 1,
      case when xp_year_of(v_p) = 0 then 'Year 0: Construction' else 'Year ' || extract(year from v_p)::int end);
  end loop;

  perform xp_check_unlocks();
  -- No exception handler on purpose: pg_cron is the only caller, and a raised
  -- error is recorded in cron.job_run_details instead of vanishing.
end $$;

revoke execute on function public.xp_save_report(text, date, date, text) from public, anon;
revoke execute on function public.xp_close_periods() from public, anon;
