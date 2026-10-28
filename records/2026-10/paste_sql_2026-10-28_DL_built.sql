-- Oct 28 2026: Day Log & Live Now built (318262a). Run AFTER paste_sql_2026-10-28_DL_plan.sql (which creates the plan rows).
-- The editor shows only the LAST result; run the check alone.
update ceo_plan_items set status='yellow', evidence='Built 318262a (Oct 28), dl suite 29/29, not hand-tested: ' || title where plan_id=(select id from ceo_plans where name='Day Log & Live Now');
insert into system_updates (title, summary, category) values ('DL-1..7: Live now logs the day', 'Live now with no block puts a timed block on the timeline (task XP once); Doing Now buttons open Live now; I just did takes any two of start/finish/length; Do after/before chains incl. after any cook (Washing dishes set), due until done or skipped, evening review asks; Housekeeping = Homekeeper block. Commit 318262a. Untested by Alex.', 'feature');
-- CHECK (run alone): should print 7 rows, all yellow
select item_code, status from ceo_plan_items where plan_id=(select id from ceo_plans where name='Day Log & Live Now') order by item_code;
