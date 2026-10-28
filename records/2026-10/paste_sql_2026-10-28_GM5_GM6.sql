-- Oct 28 2026, Generic Missions GM-5/GM-6 plan rows + Chronicles row.
-- The connector's approval pop-up timed out twice; paste these in the Supabase SQL editor.
-- 1) GM-5 built (7dad1f5)
update ceo_plan_items set status='yellow', evidence='Built 7dad1f5 (Oct 28): myDay.ui.pickContext in Plan block; cards untried first, type own, Decide later; block item keeps context. gm5 15/15. Not hand-tested.' where id='8c9f7a5c-8b67-4128-937a-e1ae76153490';
-- 2) GM-6 built (92ee997)
update ceo_plan_items set status='yellow', evidence='Built 92ee997 (Oct 28): Generate a recipe in the mission picker; Use saves to My Recipes, generated card with recipe_id, cookingOracle.logic.planMissionCook (scheduled planned_cooks on the block agenda, grocery list, chore_blocks.planned_cook_id). gm6 17/17 (model + save stubbed). Not hand-tested.' where id='868d929c-d7ac-45b5-b0c0-c684a54e9986';
-- 3) Chronicles row for GM-6
insert into system_updates (title, summary, category) values ('GM-6: Generate a recipe for a Chef mission', 'In the Plan block mission picker, Generate asks the recipe engine for mission + card. Use saves it to My Recipes, keeps it as a card, makes it the block''s planned cook (no second Schedule entry) and puts missing items on a grocery list. Commit 92ee997. Untested by Alex.', 'feature');
-- CHECK: should print GM-5 yellow, GM-6 yellow, and 1
select item_code, status from ceo_plan_items where item_code in ('GM-5','GM-6') order by item_code;
select count(*) from system_updates where title like 'GM-6:%';
