-- XP-7 (Oct 14 2026): tracking the Mind, Hustler and Steward realms need.
-- Alex's answers: sleep = "Mark one routine"; outreach log in the Business
-- tab + Oracle chat + linked to People; budget week = weekly spending limit;
-- cool-off XP = bought after waiting.

-- 1. Sleep routine flag (one at most) + Lake gate (kept 21 of the last 28 days).
alter table public.routines add column if not exists is_sleep boolean not null default false;
create unique index if not exists routines_one_sleep on public.routines (is_sleep) where is_sleep;

create or replace function public.xp_check_lake() returns int
language plpgsql security definer set search_path to 'public' as $$
declare v_day date := (now() at time zone 'Europe/London')::date; n int;
begin
  select count(distinct (q.completed_at at time zone 'Europe/London')::date) into n
    from quest_log q join routines r on r.id::text = q.source_ref
    where r.is_sleep and q.quest_kind = 'routine' and q.status = 'completed'
      and (q.completed_at at time zone 'Europe/London')::date > v_day - 28;
  if n >= 21 then perform xp_unlock('lake', 'gate', 'mind', 'Lake'); end if;
  return coalesce(n, 0);
end $$;
update public.xp_unlock_defs set how = 'Keep your sleep routine 21 of the last 28 days' where key = 'lake';

-- 2. Outreach and collab log (private).
create table if not exists public.outreach_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('outreach', 'collab')),
  who text not null,
  person_id uuid references public.people(id) on delete set null,
  note text,
  done_on date not null default ((now() at time zone 'Europe/London')::date),
  created_at timestamptz not null default now()
);
alter table public.outreach_log enable row level security;  -- no policies: read/write via /api/data-write

-- Linked person: logging it counts as catching up (the people trigger pays caught_up).
create or replace function public.outreach_touch_person() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.person_id is not null then
    update people set last_spoke = new.done_on where id = new.person_id and (last_spoke is null or last_spoke < new.done_on);
  end if;
  return new;
end $$;
create or replace trigger outreach_touch_person after insert on public.outreach_log
  for each row execute function public.outreach_touch_person();

-- 3. New XP rules.
insert into public.xp_rules (action, realm, base_xp, capped, label) values
  ('outreach_sent', 'hustler', 10, true, 'Outreach sent'),
  ('collab_done', 'hustler', 150, false, 'Collab done'),
  ('cooloff_waited', 'steward', 30, false, 'Bought after the wait'),
  ('budget_week', 'steward', 50, false, 'Budget kept this week')
on conflict do nothing;

-- 4. Weekly spending limit.
alter table public.xp_settings add column if not exists weekly_spend_limit numeric;
alter table public.xp_settings add column if not exists weekly_limit_from date;

-- 5. XP triggers on the new sources.
create or replace trigger xp_change after insert or update on public.outreach_log for each row execute function public.xp_on_change();
create or replace trigger xp_delete after delete on public.outreach_log for each row execute function public.xp_on_delete();
create or replace trigger xp_change after update on public.wishlist_items for each row execute function public.xp_on_change();

do $$
declare d text;
begin
  -- xp_on_change: outreach_log + wishlist_items branches.
  d := pg_get_functiondef('public.xp_on_change'::regproc);
  if position('outreach_log' in d) = 0 then
    d := replace(d, E'    elsif t = ''smoke_test_items'' then',
      E'    elsif t = ''outreach_log'' then\n' ||
      E'      if tg_op = ''INSERT'' then\n' ||
      E'        perform public.xp_award(case when new.kind = ''collab'' then ''collab_done'' else ''outreach_sent'' end, t, new.id::text, null, null, new.who);\n' ||
      E'      end if;\n' ||
      E'    elsif t = ''wishlist_items'' then\n' ||
      E'      if tg_op = ''UPDATE'' and new.status = ''bought'' and old.status is distinct from ''bought''\n' ||
      E'         and new.bought_at >= new.created_at + interval ''24 hours'' then\n' ||
      E'        perform public.xp_award(''cooloff_waited'', t, new.id::text, null, null, new.name);\n' ||
      E'      end if;\n' ||
      E'    elsif t = ''smoke_test_items'' then');
    execute d;
  end if;

  -- xp_check_unlocks: Lake before ranks; sleep_days in the progress snapshot.
  d := pg_get_functiondef('public.xp_check_unlocks'::regproc);
  if position('xp_check_lake' in d) = 0 then
    d := replace(d, 'v_rev numeric; v_released int;', 'v_rev numeric; v_released int; v_sleep int;');
    d := replace(d, E'  -- Ranks: season', E'  -- XP-7: Lake (sleep routine kept 21 of 28 days).\n  v_sleep := xp_check_lake();\n\n  -- Ranks: season');
    d := replace(d, E'''people_tracked'', v_people)', E'''people_tracked'', v_people, ''sleep_days'', v_sleep)');
    execute d;
  end if;

  -- xp_close_periods: budget-kept week (needs a limit and at least one logged expense).
  d := pg_get_functiondef('public.xp_close_periods'::regproc);
  if position('budget_week' in d) = 0 then
    d := replace(d, 'v_first date; v_p date; v_n int; v_bonus int;', 'v_first date; v_p date; v_n int; v_bonus int; v_limit numeric; v_from date; v_cnt int; v_spent numeric; v_bx int;');
    d := replace(d, E'  if v_first is null then return; end if;\n',
      E'  if v_first is null then return; end if;\n  select weekly_spend_limit, weekly_limit_from into v_limit, v_from from xp_settings where id = 1;\n  select base_xp into v_bx from xp_rules where action = ''budget_week'';\n');
    d := replace(d, E'    perform xp_save_report(''week'', v_p',
      E'    -- XP-7: weekly spending limit kept (at least one expense logged that week).\n' ||
      E'    if v_limit is not null and v_from is not null and v_p >= date_trunc(''week'', v_from)::date then\n' ||
      E'      select count(*), coalesce(sum(amount), 0) into v_cnt, v_spent from chronicles_finance\n' ||
      E'        where type = ''expense'' and coalesce(entry_date, created_at::date) between v_p and v_p + 6;\n' ||
      E'      if v_cnt > 0 and v_spent <= v_limit then\n' ||
      E'        insert into xp_events (season, realm, action, source_table, source_id, base_xp, multiplier, xp, earned_on, note)\n' ||
      E'        values (xp_year_of(v_p + 6), ''steward'', ''budget_week'', ''xp_weeks'', v_p::text, v_bx, 1, v_bx, v_p + 6, ''£'' || v_spent || '' of £'' || v_limit)\n' ||
      E'        on conflict (source_table, source_id, action) do nothing;\n' ||
      E'      end if;\n' ||
      E'    end if;\n' ||
      E'    perform xp_save_report(''week'', v_p');
    execute d;
  end if;
end $$;

-- 6. Oracle can offer to log outreach (confirm first, then the form opens filled in).
insert into public.oracle_actions (action_id, trigger_phrases, target, data_touched, explanation_significance, explanation_path_reasoning, explanation_benefit, confirm_required, active)
select 'log_outreach', array['log outreach', 'I sent a beat to', 'I reached out to', 'log a collab', 'I did a collab with'],
  'producerTools.ui.openOutreach', array['outreach_log', 'people'],
  'Opens the outreach log form in the Business tab, filled in from what you told Oracle. Nothing is saved until you press Save. Outreach pays 10 Hustler XP (capped per day), a collab 150; picking a person also counts as catching up with them.',
  'XP-7 (Oct 14 2026): Alex asked for outreach to be loggable from Oracle chat as well as the Business tab.',
  'Outreach and collabs finally count towards the Hustler realm without retyping them somewhere else.', true, true
where not exists (select 1 from public.oracle_actions where action_id = 'log_outreach');
