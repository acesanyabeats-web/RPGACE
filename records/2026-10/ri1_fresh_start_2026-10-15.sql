-- RI-1 Fresh start (Realm Inputs plan), Oct 15 2026.
-- Alex's answers: "Videos + articles, keep production ones (Recommended)"; kept items tagged
-- "Producer, change if needed (Recommended)". Books, jargon and everything else are untouched.
--
-- SAFETY NET (already done, verified): full copies of the 6 tables live in the private
-- `snapshots` schema (not reachable from the app or the anon key):
--   snapshots.ri1_20261015_intel_reports (44)       snapshots.ri1_20261015_encyclopedia (45)
--   snapshots.ri1_20261015_encyclopedia_insights (848) snapshots.ri1_20261015_library_items (47)
--   snapshots.ri1_20261015_intel_watchlist (26)     snapshots.ri1_20261015_intel_jobs (68)
-- snapshots.ri1_keep holds the 20 kept encyclopedia ids (19 production videos + the
-- "Music Theory for Computer Musicians" book article).
-- Restore one table: insert into public.X select * from snapshots.ri1_20261015_X on conflict do nothing;
--
-- Expected after: encyclopedia 20, encyclopedia_insights 327 (18 x 17 + Boom-Bap 21),
-- library_items 22 (19 videos + 3 books), intel_reports 19, watchlist <= 19, intel_jobs <= 19.
-- No foreign keys point at these tables (checked pg_constraint). library_items' xp_delete trigger
-- is harmless here: there are 0 xp_events rows for library_items.

begin;
delete from public.encyclopedia_insights
  where source_entry_id not in (select id::text from snapshots.ri1_keep);
delete from public.library_items
  where kind <> 'book' and (source_id is null or source_id not in (select id::text from snapshots.ri1_keep));
delete from public.intel_reports
  where url not in (select source_url from public.encyclopedia
                    where id in (select id from snapshots.ri1_keep) and source_url is not null);
delete from public.intel_watchlist
  where url not in (select source_url from public.encyclopedia
                    where id in (select id from snapshots.ri1_keep) and source_url is not null);
delete from public.intel_jobs
  where url not in (select source_url from public.encyclopedia
                    where id in (select id from snapshots.ri1_keep) and source_url is not null);
delete from public.encyclopedia where id not in (select id from snapshots.ri1_keep);

update public.intel_reports set realms = array['producer'];
update public.intel_jobs set realms = array['producer'];
update public.library_items set realms = array['producer']
  where kind <> 'book' or source_table = 'bookworm_books';
update public.bookworm_books set realms = array['producer'];
commit;

select (select count(*) from public.intel_reports) reports, (select count(*) from public.encyclopedia) articles,
       (select count(*) from public.encyclopedia_insights) idea_cards, (select count(*) from public.library_items) library,
       (select count(*) from public.intel_watchlist) watchlist, (select count(*) from public.intel_jobs) jobs;

-- Also pending from RI-0:
update public.ceo_plan_items set status = 'yellow', last_verdict = 'built, untested by Alex'
  where item_code = 'RI-0' and plan_id = '83816395-aa36-48f7-9aec-6c63003f860b';
