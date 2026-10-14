-- DT-3 Chores (Oct 14 2026): per-chore "every N days" countdown from last done.
-- Additive only. Checked pg_constraint first (routines_cadence_chk listed the allowed values).
alter table public.routines add column if not exists every_days integer;
alter table public.routines add column if not exists last_done_before date;  -- "last done before RPGACE tracked it"; ticks after it win
alter table public.routines drop constraint if exists routines_cadence_chk;
alter table public.routines add constraint routines_cadence_chk
  check (cadence = any (array['daily','weekly','times_per_week','once','next_time','every_days']));
alter table public.routines drop constraint if exists routines_every_days_chk;
alter table public.routines add constraint routines_every_days_chk
  check (every_days is null or (every_days between 1 and 365));
-- Chore ticks earn Homekeeper realm XP (area 'Chores').
do $$
declare d text;
begin
  d := pg_get_functiondef('public.xp_on_change'::regproc);
  if position('when ''chores'' then ''homekeeper''' in d) = 0 then
    d := replace(d, 'when ''home'' then ''homekeeper''', 'when ''home'' then ''homekeeper'' when ''chores'' then ''homekeeper''');
    execute d;
  end if;
end $$;
