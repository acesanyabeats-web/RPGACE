-- MD2-9 habit design (Oct 14 2026), applied via Supabase MCP as migration md2_habit_design.
alter table public.routines add column if not exists minimum text;
alter table public.routines add column if not exists after_routine_id uuid references public.routines(id) on delete set null;
-- Weekly reviews (journal.source = 'weekly_review') earn the normal journal_entry XP:
-- xp_on_change's journal branch list became ('manual', 'decision_journal', 'weekly_review').
do $$
declare d text := pg_get_functiondef('public.xp_on_change'::regproc);
begin
  if position('''weekly_review''' in d) = 0 then
    d := replace(d, $q$in ('manual', 'decision_journal')$q$, $q$in ('manual', 'decision_journal', 'weekly_review')$q$);
    execute d;
  end if;
end $$;
