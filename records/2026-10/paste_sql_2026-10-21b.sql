-- Oct 21 2026 (2nd): the connector times out on ceo_plan_items updates. Paste into Supabase > SQL Editor > Run.
update ceo_plan_items set status='yellow', evidence='Built Oct 21: oracleProfessor.logic.answer/ask + prof: chat prefix + How I know fold-out; Opus 5.5 effort medium, Sonnet 4.6 on model-access error; shared readOracleStream with usage. 19 headless checks. Untested by Alex.', last_checked_at=now() where item_code='OP-4' and plan_id=(select id from ceo_plans where name='Oracle Professor Mode');
-- CHECK: should show OP-1..3 yellow, OP-4 yellow, OP-5 red
select item_code, status from ceo_plan_items where plan_id=(select id from ceo_plans where name='Oracle Professor Mode') order by item_code;
