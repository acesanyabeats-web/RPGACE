-- Realm Tasks plan rows -> yellow (built, not hand-tested). Updates to ceo_plan_items stall on the connector's
-- confirmation question, so paste this into the Supabase SQL editor (project gripopghczmrbrhqtqbm). No deletes.
update ceo_plan_items set status='yellow', last_verdict='on_track', last_checked_at=now(),
  evidence='3356824 built; headless 24/24; DB: 52 kept + 175 proposed + 107 inbox; feeds by trigger. Untested by Alex.'
where plan_id=(select id from ceo_plans where name='Realm Tasks Oct 27');
-- CHECK: expect RT-1..RT-7 all yellow.
select item_code, status from ceo_plan_items where plan_id=(select id from ceo_plans where name='Realm Tasks Oct 27') order by 1;
