-- Oracle Flags Oct 27: plan rows + Chronicles rows that timed out from the session.
-- Paste into the Supabase SQL editor (project gripopghczmrbrhqtqbm). Updates + inserts only.
update ceo_plan_items set status='yellow', last_verdict='on track', last_checked_at=now(),
  evidence='FL-7 db93769: private work_links table (clock_in, break, clock_out; clock_out updated Oct 27 to its own page), myDay.ui.workRow on the Now/Next card from 30 min before a shift to 30 min after; links never in the repo. Headless 6/6 with test links. Untested by Alex on a real shift.'
  where item_code='FL-7' and plan_id=(select id from ceo_plans where name='Oracle Flags Oct 27');
update ceo_plan_items set status='yellow', last_verdict='on track', last_checked_at=now(),
  evidence='FL-3 d3ae279: every Oracle exchange (normal + Professor) saved by saveOracleChat() from addReplySaveRow() into private oracle_chats (created Oct 27); askMyData source chats + past-conversation triggers. Headless 6/6. Untested by Alex.'
  where item_code='FL-3' and plan_id=(select id from ceo_plans where name='Oracle Flags Oct 27');
insert into system_updates (title, summary, category) values
 ('Clock in / Break / Clock out on My Day', 'During a shift (30 min either side) the My Day Now/Next card shows Clock in, Break and Clock out, opening Alex''s phone2fork pages. Links are kept in a private table, not in the code.', 'feature'),
 ('Oracle remembers your chats', 'Every Oracle question and answer is now saved privately; asking "what did we talk about" or "do you remember" makes Oracle look back through past chats.', 'feature');
-- CHECK: expect FL-3 = yellow, FL-7 = yellow, and 2 rows.
select item_code, status from ceo_plan_items where item_code in ('FL-3','FL-7') and plan_id=(select id from ceo_plans where name='Oracle Flags Oct 27');
select title from system_updates where created_at > now() - interval '1 hour' order by created_at desc;
