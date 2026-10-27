-- Knowledge Rewire: built, headless-tested, not yet hand-tested -> yellow.
-- Paste into Supabase SQL editor. Check after: should print 8 rows, all yellow.
update ceo_plan_items set status = 'yellow', last_verdict = 'built (c539d7e), headless 25 suites green, awaiting Alex hand-test', last_checked_at = now()
where item_code in ('KR-1','KR-2','KR-3','KR-4','KR-5','KR-6','KR-7','KR-8');
select item_code, status from ceo_plan_items where item_code like 'KR-%' order by item_code;
