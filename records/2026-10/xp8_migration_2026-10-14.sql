-- XP-8 (Oct 14 2026): Year Wrapped + Hall of Seasons.
-- Alex: "Swipe cards", "One short paragraph" (Oracle, once per year, saved),
-- "Pop up once", "Yes, 'Year so far'".

-- The one Oracle paragraph for a closed year, and when Wrapped first popped up.
alter table public.xp_reports add column if not exists wrapped_text text;
alter table public.xp_reports add column if not exists wrapped_seen_at timestamptz;

-- Saved reports also carry treats earned, the best week and outreach/collab count.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.xp_save_report'::regproc);
  if position('best_week' in d) = 0 then
    d := replace(d, E'    ''year'', v_year,',
      E'    ''treats'', coalesce((select jsonb_agg(jsonb_build_object(''title'', title, ''at'', earned_at) order by earned_at)\n' ||
      E'                from xp_treats where status = ''earned'' and (earned_at at time zone ''Europe/London'')::date between p_start and p_end), ''[]''::jsonb),\n' ||
      E'    ''best_week'', (select jsonb_build_object(''start'', ws, ''xp'', t) from (select date_trunc(''week'', earned_on)::date ws, sum(xp) t from e group by 1 order by 2 desc, 1 limit 1) w),\n' ||
      E'    ''outreach'', (select count(*) from outreach_log where done_on between p_start and p_end),\n' ||
      E'    ''year'', v_year,');
    execute d;
  end if;
end $$;
