# Content domain — Beats, Posting, Selling, Videoworm, external lanes

Read before touching any `domain: 'content'` module, `intel_*` tables, `local_server/`, or the OpenMontage lane. `moneyHub` is habits-domain; `producerTools`/`captionsPanel` are oracle-domain.

Modules (`domain: 'content'`, 10): `visualOracle`, `contentRepurpose`, `videoSummary`, `beatLog`, `refCorpus`, `contentProductionLive`, `conidPot`, `beatsHub`, `postingHub`, `sellingHub`.
## Beats, Posting, Selling (area regen plans 4-6, all built, yellow until Alex hand-tests)
- Beats (Producer) BT-0..8, record `records/2026-10/beats_producer_ceo_plan_2026-10-16.txt`. [story](../../patch_notes.html#card-2026-10-16-beats-done) `oracleEntry` Save as entry. [story](../../patch_notes.html#card-2026-10-16-oracle-save-entry)
- Posting PC-0..7: `postingHub` + `posts` table. [home](../../patch_notes.html#card-2026-10-17-posting-home) [Chronicles](../../patch_notes.html#card-2026-10-17-posting-done)
- Selling SH-0..7: `sellingHub`; `moneyHub` (Money page, Hustler + Steward); beat↔deal/People/Chronicles links. [story](../../patch_notes.html#card-2026-10-17-selling-home) `producerTools` (💼 Business tab). [B1](../../patch_notes.html#card-2026-10-10-producer-tools) O1 `captionsPanel`. [O1](../../patch_notes.html#card-2026-10-10-platform-oracle)
- `content_productions` holds beats only; posts live in `posts`.
- Retired Oct 17 2026 (code deleted, rows kept): Visual Treatment, Director Match + picker, Production Panels, Generate Video/Captions, OBS raw, Activate ConID, Upload Workshop, `videoPipeline`. [story](../../patch_notes.html#card-2026-10-17-old-video-tools-retired)
- `reference_tracks.scale`/`genre` are 0/32 filled — the cause of "beat matches are always the same". A backfill popup exists, never run (`beat_log_matching_spec_backlog_2026-07-28.txt`).
- No beat-grid audio sync exists (scene timing is LLM-estimated). Optional local librosa analysis (`beat_audio_jobs` + `beat-audio` bucket) gives BPM + major/minor only and needs `local_server.py` running.
- RPGACE does not generate video. It briefs and hands off (`beat_video_workflow_separation_and_6step_chain_spec_backlog_2026-07-30.txt`: steps 1/3 done, 2/4 partial, 5/6 not started).

## Videoworm / intel pipeline
- Laptop runs a Git clone at `%USERPROFILE%\RPGACE-code`; `start_server.bat` does `git pull`. `local_server.py` (port 7842) and `rpgace_intel.py` live in the repo; `ANALYSER_VERSION` in `local_server/intel_common.py` is stamped on every report.
- Analysis: whole timed transcript + 8 frames → `insights.realm_sections` (quoted, timed points; quotes checked in code) + `how_made` for Creator/Producer/Hustler; shown by `pathways.ui.realmSections`; realm idea cards via `encyclopediaPosts.realmIdeas`; a re-run replaces report/article/cards. [story](../../patch_notes.html#card-2026-10-21-videoworm-done)
- Videoworm reads the real `intel_jobs` queue. [story](../../patch_notes.html#card-2026-10-15-videoworm-status) Analysis on/off switch: `orchestratorCC` + `app_settings` (`background_analysis`). [CC](../../patch_notes.html#card-2026-10-21-analysis-switch)
- Deletes stick: `intel_reanalysis_pool` + `encyclopedia.source_url` suppress a merge candidate only if it is the same age or older than the deletion. [story](../../patch_notes.html#card-2026-08-27-delete-doesn-t-stick-fixed-videosummary)
- `intelDedup` dedups Content Intelligence rows by normalised URL + title fallback.
- `api/scout.js` and `api/analyst.js` are live (ingestion path), not leftovers.

## External handoff lanes (both deliberately anon-writable — see landmines)
- `openmontage_jobs`: async queue to a separate OpenMontage CC session in another repo (`calesthio/OpenMontage`; `add_repo` refuses cross-owner adds). Last real job (Calibri) correctly failed rather than faking a render. No provider guarantees character consistency, so briefs carry a Character Reference Block. fal.ai is the configured provider; OpenArt has no integration. Alex rules out paid spend for now. Kickoff prompt: `openmontage_kickoff_prompt_2026-07-31.txt`. Free GPU path paused; fixes kept on branch `fix/hunyuan-ltx2-variant-loading`. [story](../../patch_notes.html#card-2026-08-04-colab-kaggle-free-gpu-integration-scoped-not)
- `oracle_fallback_queue`: credit-exhaustion fallback drained by the "RPGACE Fallback Drain" Routine (plain anon key). Never exercised against a real credit-exhaustion event.
- "Total" = the RPGACE app + RPGACE CC (Orchestrator: evidence, dispatch, RPGACE-side work) + OpenMontage CC (executor in its own repo) + Graphify CC. No live session-to-session link; Supabase queues only. OpenMontage CC cannot run RPGACE skills, so each dispatch carries its own bounded goal list and "report real results including errors". Every dispatch reports OUTPUT + INFRASTRUCTURE KNOWLEDGE. "Engineer CC" is the retired old name. [rename](../../patch_notes.html#card-2026-08-13-engineer-cc-retired-now-openmontage-cc) [A13](../../patch_notes.html#card-2026-08-11-same-day-continued-prompt-caching-shipped)
- Graphify CC writes to `graphify_jobs`/`total_system_members`/`total_system_activity`; cross-repo graph in `graphify-out/GRAPH_TREE.html`. [story](../../patch_notes.html#card-2026-08-06-same-day-18th-pass-graphify-cc)
