-- Oct 21 2026 (2nd): the connector times out on ceo_plan_items updates. Paste into Supabase > SQL Editor > Run.
update ceo_plan_items set status='yellow', evidence='Built Oct 21: oracleProfessor.logic.answer/ask + prof: chat prefix + How I know fold-out; Opus 5.5 effort medium, Sonnet 4.6 on model-access error; shared readOracleStream with usage. 19 headless checks. Untested by Alex.', last_checked_at=now() where item_code='OP-4' and plan_id=(select id from ceo_plans where name='Oracle Professor Mode');
-- CHECK: should show OP-1..3 yellow, OP-4 yellow, OP-5 red
select item_code, status from ceo_plan_items where plan_id=(select id from ceo_plans where name='Oracle Professor Mode') order by item_code;

-- OP-5 (added after OP-4): plan complete
update ceo_plan_items set status='yellow', evidence='Built Oct 21: automatic routing (ownedElsewhere pass-through, free/Haiku route, deep -> professor, quick -> picked sections only via oracleAppGrounding._buildBlock(sections)), quick: prefix, cost line. 15 headless checks. Untested by Alex.', last_checked_at=now() where item_code='OP-5' and plan_id=(select id from ceo_plans where name='Oracle Professor Mode');
-- CHECK again: all five OP rows should now be yellow
select item_code, status from ceo_plan_items where plan_id=(select id from ceo_plans where name='Oracle Professor Mode') order by item_code;

-- CC-0 (Orchestrator CC Analysis plan)
update ceo_plan_items set status='yellow', evidence='Built Oct 21: app_settings background_analysis + orchestratorCC switch row in dev-status cluster + nextPickup/waiting helpers. 8 headless checks. Nothing routed yet. Untested by Alex.', last_checked_at=now() where item_code='CC-0' and plan_id=(select id from ceo_plans where name='Orchestrator CC Analysis');

-- CC-1
update ceo_plan_items set status='yellow', evidence='Built Oct 21: cc mode in both runners (prepare_for_cc -> awaiting_cc, bucket intel-cc), scripts/intel_cc_worker.py list/fetch/finish/release with shared parse_insights + push_report, Videoworm waiting line, 12h fallback (use_api) pulled forward from CC-4. 25+3+5 headless checks. Untested live.', last_checked_at=now() where item_code='CC-1' and plan_id=(select id from ceo_plans where name='Orchestrator CC Analysis');

-- CC-4
update ceo_plan_items set status='yellow', evidence='Built Oct 21: scheduled task trig_01Sqkyndoq1Wn53xg15d5TCC (5 */2 * * * UTC, fresh session, max 5 videos per run) drives scripts/intel_cc_worker.py; fallback stays 12h (Alex); anchor_minute 5. Smoke run finished clean in 26s. Untested on a real video.', last_checked_at=now() where item_code='CC-4' and plan_id=(select id from ceo_plans where name='Orchestrator CC Analysis');

-- CC-2
update ceo_plan_items set status='yellow', evidence='Built Oct 21: orchestratorCC.logic.queue/resumeRow/sweepStale over oracle_fallback_queue (context.cc); Bookworm chapter extraction (whole chapter, cc_queued_at), weekly challenge ideas, Year Wrapped paragraph; worker jobs/job/answer; CC task answers 10 per run. 14+1+6 headless checks. Untested live.', last_checked_at=now() where item_code='CC-2' and plan_id=(select id from ceo_plans where name='Orchestrator CC Analysis');

-- CC-3
update ceo_plan_items set status='yellow', evidence='Built Oct 21: one Morning Brief - task trig_015uRjGVrdmiwc5zxq47mMA6 at 05:39 UK runs scripts/morning_brief_cc.py gather/save (one checked journal row); morningBrief shows it + live inbox/YouTube, API only when missing. Found: old task never saved a row. 8+5 headless checks. Untested live.', last_checked_at=now() where item_code='CC-3' and plan_id=(select id from ceo_plans where name='Orchestrator CC Analysis');

-- CC-5
update ceo_plan_items set status='yellow', evidence='Oct 21: plan built; 30-day counts 10 videos / 0 chapters / 2 challenge suggestions; est. saving ~£1.50-2/month at current use; live runs to be checked after the 05:39 brief.', last_checked_at=now() where item_code='CC-5' and plan_id=(select id from ceo_plans where name='Orchestrator CC Analysis');
