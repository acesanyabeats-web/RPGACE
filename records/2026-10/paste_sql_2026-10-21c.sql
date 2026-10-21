-- Paste into Supabase SQL editor (project gripopghczmrbrhqtqbm). The connector times out on ceo_plan_items UPDATEs.
-- Check after: select item_code,status from ceo_plan_items where item_code like 'CC-%' or item_code like 'MDX-%' order by 1;  -> all 14 rows say yellow
-- CC-2
update ceo_plan_items set status='yellow', evidence='Built Oct 21: orchestratorCC.logic.queue/resumeRow/sweepStale over oracle_fallback_queue (context.cc); Bookworm chapter extraction (whole chapter, cc_queued_at), weekly challenge ideas, Year Wrapped paragraph; worker jobs/job/answer; CC task answers 10 per run. 14+1+6 headless checks. Untested live.', last_checked_at=now() where item_code='CC-2' and plan_id=(select id from ceo_plans where name='Orchestrator CC Analysis');

-- CC-3
update ceo_plan_items set status='yellow', evidence='Built Oct 21: one Morning Brief - task trig_015uRjGVrdmiwc5zxq47mMA6 at 05:39 UK runs scripts/morning_brief_cc.py gather/save (one checked journal row); morningBrief shows it + live inbox/YouTube, API only when missing. Found: old task never saved a row. 8+5 headless checks. Untested live.', last_checked_at=now() where item_code='CC-3' and plan_id=(select id from ceo_plans where name='Orchestrator CC Analysis');

-- CC-5
update ceo_plan_items set status='yellow', evidence='Oct 21: plan built; 30-day counts 10 videos / 0 chapters / 2 challenge suggestions; est. saving ~£1.50-2/month at current use; live runs to be checked after the 05:39 brief.', last_checked_at=now() where item_code='CC-5' and plan_id=(select id from ceo_plans where name='Orchestrator CC Analysis');
-- MDX-0..7
update ceo_plan_items set status='yellow', evidence='Built Oct 21: myDay.ui.renderMdx (Now+Next, log buttons, timeline, tray, 🌅/🌙 pins), dayView/weekView/_dragify/blockSheet/openDrawer, logic daySegs/moveItem/didBlock/startBlockNow/trayModel/placeFromTray/moveBlockTo, doingNow.openDropList, Daily Schedule timeline. mdx_test 49/49 headless. Untested by Alex.', last_checked_at=now() where item_code like 'MDX-%' and plan_id=(select id from ceo_plans where name='My Day Declutter & Drag');
