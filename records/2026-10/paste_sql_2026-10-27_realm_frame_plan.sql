-- Realm Frame & Folder Architecture: built, headless-tested, not yet hand-tested -> yellow.
-- Paste into Supabase SQL editor. Check after: should print 9 rows, all yellow.
update ceo_plan_items set status = 'yellow', last_verdict = 'built (822f33c), headless 25 suites green, awaiting Alex hand-test', last_checked_at = now()
where item_code in ('RF-1','RF-2','RF-3','RF-4','RF-5','RF-6','RF-7','RF-8','RF-9');
select item_code, status from ceo_plan_items where item_code like 'RF-%' order by item_code;
