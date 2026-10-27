-- FL-6 plan row + Chronicles row, Oct 27 2026 (the session write timed out). Paste into the
-- Supabase SQL editor (project gripopghczmrbrhqtqbm) and run once. No deletes.
begin;
update ceo_plan_items set status='yellow', last_verdict='on track',
 evidence='FL-6 53e25a1: +1 water button on My Day health card (healthBody.myDayCard, same addBody water write, count updates in place); Accept all on My Recipes (cookingOracle.ui._acceptAllStepsBanner, two-click, sequential secureWrite per recipe, steps_previous backup, failures stay listed) for the 8 live steps_proposed recipes. Tick-all-in-aisle dropped (aisle already a grouping, H13); sleep chip dropped (watch instead). Pixel Watch 4 added to wishlist_items high priority. Headless 11/11. Untested by Alex.'
where item_code='FL-6' and plan_id=(select id from ceo_plans where name='Oracle Flags Oct 27');
insert into system_updates (title, summary, category)
select 'FL-6: +1 water on My Day, Accept all for recipe step splits',
 'My Day health card gets a +1 water button (one glass to body_log). My Recipes shows Accept all when recipes have new one-action Cook Mode steps waiting (8 now); two taps, old steps kept. Pixel Watch 4 added to the wishlist at high priority for sleep and health data (HB-4 later).',
 'feature'
where not exists (select 1 from system_updates where title='FL-6: +1 water on My Day, Accept all for recipe step splits');
commit;
-- CHECK: expect FL-6 = yellow, and exactly 1 row for the title.
select item_code, status from ceo_plan_items where plan_id=(select id from ceo_plans where name='Oracle Flags Oct 27') order by item_code;
select count(*) from system_updates where title='FL-6: +1 water on My Day, Accept all for recipe step splits';
