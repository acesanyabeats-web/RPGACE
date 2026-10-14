-- XP-6 (Oct 13 2026): level-up records, treats, theme choice.
-- Alex's answers: themes "Accent + card frame"; treats pinned to year level,
-- realm rank, season resolution kept, or a week with all 3 challenges done;
-- earned = mark earned + 🎁 note (Wishlist cool-off unchanged); flair quiet.

-- 1. Level-ups become dated records like ranks (kind 'level').
alter table public.xp_unlocks drop constraint if exists xp_unlocks_kind_check;
alter table public.xp_unlocks add constraint xp_unlocks_kind_check
  check (kind = any (array['rank','career_rank','badge','title','gate','level']));

create or replace function public.xp_level_for(p_xp bigint) returns int
language plpgsql immutable as $$
declare lvl int := 1; need bigint := 500; rem bigint := greatest(0, coalesce(p_xp, 0));
begin
  while rem >= need loop rem := rem - need; lvl := lvl + 1; need := 500 + 25 * (lvl - 1); end loop;
  return lvl;
end $$;

create or replace function public.xp_check_levels() returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  v_day date := (now() at time zone 'Europe/London')::date;
  v_season int := case when v_day < date '2027-01-01' then 0 else extract(year from v_day)::int end;
  v_lvl int; i int;
begin
  select xp_level_for(coalesce(sum(xp), 0)::bigint) into v_lvl from xp_events where status <> 'removed' and season = v_season;
  for i in 2..coalesce(v_lvl, 1) loop
    perform xp_unlock('level:' || i, 'level', 'life', 'Level ' || i, v_season);
  end loop;
end $$;

-- 2. Treats.
create table if not exists public.xp_treats (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  wishlist_item_id uuid references public.wishlist_items(id) on delete set null,
  target_kind text not null check (target_kind in ('year_level','realm_rank','resolution','weekly_all3')),
  realm text,
  target_value int,
  challenge_id uuid references public.xp_challenges(id) on delete set null,
  season int not null,
  status text not null default 'waiting' check (status in ('waiting','earned','dropped')),
  earned_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.xp_treats enable row level security;  -- private: no policies, read/write via /api/data-write

alter table public.wishlist_items add column if not exists treat_earned_at timestamptz;
alter table public.xp_settings add column if not exists theme text not null default 'default';

create or replace function public.xp_check_treats() returns void
language plpgsql security definer set search_path to 'public' as $$
declare t record; v_ok boolean;
begin
  for t in select * from xp_treats where status = 'waiting' loop
    v_ok := case t.target_kind
      when 'year_level' then exists (select 1 from xp_unlocks where key = 'level:' || t.target_value and season = t.season)
      when 'realm_rank' then exists (select 1 from xp_unlocks where key = 'rank:' || t.realm || ':' || t.target_value and season = t.season)
      when 'resolution' then exists (select 1 from xp_challenges where id = t.challenge_id and status = 'done')
      when 'weekly_all3' then exists (
        select 1 from xp_challenges where kind = 'weekly' and status = 'done'
          and period_start >= date_trunc('week', t.created_at at time zone 'Europe/London')::date
        group by period_start having count(*) >= 3)
      else false end;
    if v_ok then
      update xp_treats set status = 'earned', earned_at = now() where id = t.id and status = 'waiting';
      if t.wishlist_item_id is not null then
        update wishlist_items set treat_earned_at = coalesce(treat_earned_at, now()) where id = t.wishlist_item_id;
      end if;
    end if;
  end loop;
end $$;

create or replace function public.xp_on_treat() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin perform xp_check_treats(); return null; end $$;
create or replace trigger xp_treat_added after insert on public.xp_treats
  for each statement execute function public.xp_on_treat();

-- 3. Run both at the end of every unlock check (after challenges + quests).
do $$
declare d text;
begin
  d := pg_get_functiondef('public.xp_check_unlocks'::regproc);
  if position('xp_check_levels' in d) = 0 then
    d := replace(d, 'perform xp_quest_check();', E'perform xp_quest_check();\n  -- XP-6: level-up records, then treats.\n  perform xp_check_levels();\n  perform xp_check_treats();');
    execute d;
  end if;
end $$;
