-- Oct 21 2026: everything the Supabase connector refused that is still missing (checked live).
-- Paste into Supabase > SQL Editor > New query > Run. Then run the CHECK at the bottom.

-- 1. Oracle Professor Mode: OP-2 built (commit bfa7efd)
update ceo_plan_items set status='yellow', evidence='Built Oct 21 commit bfa7efd: oracleProfessor.logic.gather (fetchSource x4 + sections + webLookup on sanitized topic, noPicker, 20s withTimeout, errors[]). 11 headless checks. Not in chat yet; untested by Alex.', last_checked_at=now() where item_code='OP-2' and plan_id=(select id from ceo_plans where name='Oracle Professor Mode');

-- 1b. OP-3 built (commit c0e21b6)
update ceo_plan_items set status='yellow', evidence='Built Oct 21 commit c0e21b6: oracleProfessor.logic.evidenceText + condense (<=3000 chars as-is; else one Haiku call -> source-tagged bullet brief, raw fallback with reason). 12 headless checks. Not in chat yet; untested by Alex.', last_checked_at=now() where item_code='OP-3' and plan_id=(select id from ceo_plans where name='Oracle Professor Mode');

-- 2 + 3. From Oct 14 (Health hand-test rows, freeze-alert root cause, Polish rows)
insert into smoke_test_items (category, item_name, description, status, source_ref, linked_plan_item_id) values
('RPGACE App — Modules','Health: log food from a meal photo (healthBody, HB-1)','Health and body, Today tab, Meal photo. HOW TO TEST: photograph a plate; items appear with grams; foods found in the UK tables show a tick and corrected numbers, others say Oracle estimate; change grams and calories rescale; Save adds them and the totals bar moves.','unverified','patch_notes.html#card-2026-10-14-health-body','20815df4-2fa7-4b35-8300-23a92b2aa6ff'),
('RPGACE App — Modules','Health: label photo, typed food, from your cooks (healthBody, HB-1)','HOW TO TEST: Label photo shows per 100g and the pack portion, set grams and save; Type it gives editable rows; From your cooks lists a recipe cooked in the last 3 days with per-serving numbers; delete needs two taps.','unverified','patch_notes.html#card-2026-10-14-health-body','20815df4-2fa7-4b35-8300-23a92b2aa6ff'),
('RPGACE App — Modules','Health: gym programme and overload nudge (healthBody, HB-2)','Gym plan tab: pick a programme and days, Save. HOW TO TEST: on a gym day each exercise shows last time sets and a nudge (+2.5kg when every set hit the top of the range); Start this workout opens the Gym log prefilled; editing an exercise list saves.','unverified','patch_notes.html#card-2026-10-14-health-body','25c8810b-2ce5-4d49-ae86-60b314d6128e'),
('RPGACE App — Modules','Health: water, weight, sleep, trends, My Day card (healthBody, HB-3)','HOW TO TEST: +1 glass and undo change water; save a weight and see the 7-day average; tap 7h for sleep; Trends shows the weight chart and 14 days; My Day shows a Health today card with calories and protein vs targets and today workout.','unverified','patch_notes.html#card-2026-10-14-health-body','7a6b11dd-e103-474b-9500-f085dfb1b162');

-- Also pending (Polish and speed, Oct 14 2026; cancelled by the connector):
update error_log set rationale = 'Oct 14 2026: root cause found by a headless profile at 6x CPU throttle (phone speed). Loading rpgace_core.min.js (1.9MB) is one ~692ms block (compile + top-level run), matching the ~669ms these alerts report; module start-up adds ~288ms. Both happen behind the boot loader.', backtrack_note = 'Fix shipped Oct 14 2026 (PS-2): no toast/error_log row for blocks before boot finishes (recorded in perf_freezes as phase boot). Leave active until perf_freezes confirms no after-boot freezes of this size.' where id = '81bcf07f-bbda-46ea-b684-6b290a2c726c';
insert into smoke_test_items (category, item_name, description, status, source_ref) values
('RPGACE App — Modules','Freeze recorder + no startup freeze alert (perfWatch, PS-1/PS-2)','HOW TO TEST: open RPGACE fresh on the phone; there should be no red App froze alert during the loading screen. Use the app normally for a day; any freeze after loading still alerts, and a perf_freezes row says what was running.','unverified','patch_notes.html#card-2026-10-14-polish-speed'),
('RPGACE App — Modules','Cooking buttons one size (cookingOracle, PS-3)','HOW TO TEST: open Cooking, a recipe card and Cook Mode; main buttons are the same height, small row buttons (Use X instead, Pick from stock) are easy to tap, Cook Mode Back/Next are big.','unverified','patch_notes.html#card-2026-10-14-polish-speed');


-- CHECK (should show: OP-2 yellow | OP-3 yellow | err Oct 14 2026: root cause | 6 smoke rows)
select item_code k, status v from ceo_plan_items where item_code in ('OP-2','OP-3') and plan_id=(select id from ceo_plans where name='Oracle Professor Mode')
union all select 'err', left(rationale,30) from error_log where id='81bcf07f-bbda-46ea-b684-6b290a2c726c'
union all select 'smoke rows', count(*)::text from smoke_test_items where item_name like 'Health:%' or item_name like 'Freeze recorder%' or item_name like 'Cooking buttons one size%';
