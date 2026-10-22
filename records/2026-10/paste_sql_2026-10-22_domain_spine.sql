-- Domain Spine & Externals (ED-3..ED-5), Oct 22 2026.
-- Supabase writes timed out from the session (reads worked), so these are for pasting
-- into the Supabase SQL editor (project gripopghczmrbrhqtqbm). All are scoped UPDATEs/one INSERT;
-- nothing is deleted. Run the whole file once.

begin;

-- 1. Plan rows (ceo_plans name 'Domain Spine & Externals')
update ceo_plan_items set status='yellow', last_verdict='on track',
  evidence='ED-3 f9c4c23: 21 externals (Gemini, Tavily off, Fish Audio dormant, Supadata, Google Health planned added); every one mapped to domains; Claude domains computed from code (all 8); live/dormant/off/planned tags; Externals+Connectors merged into galaxy_map_externals.html (Web/By domain/Cards/Call sites; connectors.html redirects keeping #hash); each domain lists its externals. Pipeline idempotent, anchors fresh, headless 5/5 OK. Untested by Alex.'
where item_code='ED-3' and plan_id=(select id from ceo_plans where name='Domain Spine & Externals');

update ceo_plan_items set status='yellow', last_verdict='on track',
  evidence='ED-4 e43a7c0: Oracle calls, human gates, decision catalog, Alex click path, branch ledger, load triggers, loops render per domain on galaxy_map_domain.html (scripts/galaxy_map_domain_dims.py, same data functions, counts match: 22/9/6+3/14/4947). 8 old pages incl. Dimensions Matrix are redirects keeping #hash; DIMENSION_PAGES/sidebar keep only outside-the-app dimensions; hub marks them MERGED. Headless 9/9 redirect cases land on the entry, 0 errors. Untested by Alex.'
where item_code='ED-4' and plan_id=(select id from ceo_plans where name='Domain Spine & Externals');

update ceo_plan_items set status='yellow', last_verdict='on track',
  evidence='ED-5: pipeline twice byte-identical, verify_anchors fresh, edge evidence 97.0%, tags balanced (1 pre-existing unclosed details on galaxy_map_current.html), headless link checks, patch_notes card card-2026-10-22-domain-spine-externals, interconnection_map/ai_tooling_and_rules_map/docs/claude/oversight.md/galaxy rules/SELF_KNOWLEDGE updated, this paste file for the timed-out writes.'
where item_code='ED-5' and plan_id=(select id from ceo_plans where name='Domain Spine & Externals');

-- 2. Smoke-test row whose page moved (status untouched — Alex confirmed it; the page is now a section)
update smoke_test_items
set description = replace(description, 'galaxy_map_load.html',
      'galaxy_map_domain.html#in-app-dims (Load triggers, per domain; galaxy_map_load.html redirects there since ED-4, Oct 22 2026)'),
    needs_confirm_highlight = true
where id = '9b1591c7-4707-40e4-91cb-ec9be1448509';

-- 3. Dimension-kind perspective reports: note which pages left (not superseded — both kinds still exist)
update perspective_reports
set findings = coalesce(findings, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'date', '2026-10-22', 'source', 'ED-4',
      'note', 'In-app dimension pages (Oracle, Decisions, Decision Matrix, Dimensions Matrix, Level 6, Load, Loops, Alex Path) and Connectors were folded into galaxy_map_domain.html / galaxy_map_externals.html and now redirect. Remaining Dimension pages: Supabase, External AIs, Skills, Orchestrator CC, OpenMontage CC, Oversight Sync, Local Analysis Pipeline, Generator Toolchain.')),
    updated_at = now()
where id in ('e48d6bff-d8d3-4b77-977a-f0056703d4a4', '658a6b7b-1d2c-4d58-a3a3-b84bb729a8fc');

-- 4. Chronicles row
insert into system_updates (title, summary, category) values (
  'Domain Spine & Externals: the 8 domains are now the one spine (ED-1..ED-5)',
  'Oracle''s self-description cut from 99K to 27K chars and sent by domain (only the needed blocks); docs/claude topic files one per domain with /CEO loading only those; 21 external AIs each mapped to their domains and tagged live/dormant/off/planned on one External AIs page; in-app Galaxy Map dimensions folded into each domain, old pages redirect.',
  'infrastructure');

commit;

-- CHECK (run after): expect ED-1..ED-5 = yellow, green, yellow, yellow, yellow; 1 smoke row mentioning galaxy_map_domain.html;
-- 2 perspective rows with an ED-4 finding; 1 system_updates row today with this title.
select item_code, status from ceo_plan_items
 where plan_id=(select id from ceo_plans where name='Domain Spine & Externals') order by item_code;
select count(*) as smoke_repointed from smoke_test_items
 where id='9b1591c7-4707-40e4-91cb-ec9be1448509' and description like '%galaxy_map_domain.html%';
select count(*) as persp_noted from perspective_reports
 where id in ('e48d6bff-d8d3-4b77-977a-f0056703d4a4','658a6b7b-1d2c-4d58-a3a3-b84bb729a8fc') and findings::text like '%ED-4%';
select title, created_at from system_updates where title like 'Domain Spine & Externals%';
