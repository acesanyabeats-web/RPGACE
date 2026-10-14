-- DT-7 realm blocks (Oct 14 2026). A block for any of the 13 XP realms.
-- 1) chore_blocks: kind 'realm' + which realm.
alter table public.chore_blocks add column if not exists realm text;
alter table public.chore_blocks drop constraint if exists chore_blocks_kind_chk;
alter table public.chore_blocks add constraint chore_blocks_kind_chk check (kind in ('chores','cooking','shopping','realm'));
-- 2) A ticked realm-block activity with no XP source of its own writes a quest_log row
--    (quest_kind 'block', category = realm); it pays its own XP into that realm.
insert into public.xp_rules (action, realm, base_xp, capped, label)
values ('block_tick', 'life', 0, false, 'Realm block activity (its XP, its realm)')
on conflict (action) do nothing;
do $$
declare d text;
begin
  d := pg_get_functiondef('public.xp_on_change'::regproc);
  if position('block_tick' in d) = 0 then
    d := replace(d, '          if new.quest_kind = ''routine'' then',
      '          if new.quest_kind = ''block'' then
            v_realm := case when lower(coalesce(new.category, '''')) in (''producer'',''creator'',''hustler'',''chef'',''athlete'',''scholar'',''life'',''homekeeper'',''mind'',''steward'',''explorer'',''connector'',''builder'')
              then lower(new.category) else ''life'' end;
            perform public.xp_award(''block_tick'', t, new.id::text, new.xp, v_realm, new.name);
          elsif new.quest_kind = ''routine'' then');
    execute d;
  end if;
end $$;
