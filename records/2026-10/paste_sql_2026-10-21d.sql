-- Oct 21 2026: AC-1 plan row (the connector times out on ceo_plan_items updates).
-- Paste into Supabase -> SQL Editor -> Run. Check: the last line returns AC-1 | yellow.
update ceo_plan_items
set status = 'yellow', last_verdict = 'on_track', last_checked_at = now(),
    evidence = 'Commit d5470d5: on-screen Routine->Action labels, myDay.logic.actionList + #dn-drop-actions in doingNow.ui.openDropList. ac1_test 7/7, mdx 49/49, sl0 28/28; dn/dn4 failures pre-existing. Open: picking an Action does not tick it (double XP without a DB change). Untested by Alex.'
where item_code = 'AC-1';
select item_code, status from ceo_plan_items where item_code in ('SL-0', 'AC-1');
