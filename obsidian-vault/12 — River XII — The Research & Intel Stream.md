---
river_number: 12
river_name: "River XII — The Research & Intel Stream"
kind: river
carries_data_flow: true
retired: false
color: "#4A90E2"
source: "graphify_river_group.py — real, not guessed"
---

# River XII — The Research & Intel Stream

## Real member modules (rpgace_core.js)

- [[researchTabs]] — `rpgace_core.js:8614-8813`
- [[intelBatchList]] — `rpgace_core.js:9220-9250`
- [[intelDelete]] — `rpgace_core.js:10192-10935`
- [[intelDedup]] — `rpgace_core.js:12120-12251`
- [[ciAutoPropose]] — `rpgace_core.js:7794-7941`

## Core infrastructure

- **Supabase** (live) via `RPGACE.sb.* (anon key, RLS-gated) + /api/data-write.js (service-role proxy for 19 restricted tables)` — the real hub every river writes into/reads from — not a "connector" in the OpenMontage/Composio sense (RPGACE owns this data, it does not hand off to an external agent), but a real, load-bearing Total-system member in its own right, used by nearly every real river.

## Total-systems connectors (real, external)

Canonical source: `ai_tooling_and_rules_map.md`'s own "External AI/tool providers" table — mirrored here for graphify/Obsidian display, not a second independent fact-set. Every real, built connector is listed regardless of test status — an untested one is marked, never hidden.

- **Anthropic (Claude API)** (live) via `api/oracle.js callClaude()` — the real default Oracle provider — every ungrounded Oracle call routes here unless a dormant provider (Kimi/Luna) is live. River III's Oracle Current is the harness; this IS the real external call, not RPGACE code.
- **OpenMontage** (live) via `openmontage_jobs Supabase queue` — agent-operated video pipeline, driven by a separate Claude Code session ("OpenMontage CC") in its own repo — never RPGACE-embedded. Real spring AND mouth both sit in River XI: opens at Content Production Live's "Generate Video," closes at "Mark ConID as Filmed" (the reservoir is polled, not pushed).
- **Composio** (live) via `api/composio.js / api/executor.js / api/orchestrate.js` — Gmail/Instagram/YouTube/Notion/GitHub connected-account automation — real triggering call sites confirmed by grep: River V's morningBrief (Gmail fetch) and River XI's contentRepurpose (Notion page + YouTube channel data via Supadata).
- **Moonshot AI (Kimi)** (dormant) via `api/oracle.js provider:'kimi'` **(not tested)** — real OpenAI-compatible scaffold, dormant until MOONSHOT_API_KEY is set — would be called from River III's Oracle Current in place of the default Anthropic call once live.
- **OpenAI (Luna)** (dormant) via `api/oracle.js provider:'luna'` **(not tested)** — same scaffold shape as Kimi, dormant until OPENAI_API_KEY is set — same River III relationship once live.
- **librosa** (optional/local) via `beat_audio_jobs + beat-audio bucket, a local Python script (real script identity UNCONFIRMED as of Aug 27)` **(not tested)** — BPM + Major/Minor key analysis only, needs Alex running a local Python snippet — not a hosted service. Triggered by River XI's Beat Log, nowhere else.
- **FFmpeg** (live (external repo)) via `OpenMontage's own pipeline, confirmed working July 31` — runs inside OpenMontage CC's OpenMontage environment, not RPGACE's own runtime — reached only via River XI's OpenMontage handoff (through this river), never called directly by any RPGACE river.
- **OpenArt** (deferred) via `none yet` **(not tested)** — "connect it at a later date" — a named future video-gen companion to OpenMontage, not wired to anything yet
- **Graphify CC** (live) via `graphify_jobs Supabase queue` — the real 4th Total-system member — generates graphify-out/GRAPH_TREE.html + the cross-repo global graph. Dispatched from River IX's own session-start check, deposits real findings back into River XIV via graphify_jobs.
- **Jina AI** (live) via `r.jina.ai, 4 real call sites (scout.js/bookworm-fetch.js/main.js/_context.js)` — real, live URL-to-text fetch — load-bearing for Bookworm URL ingestion, Schedule Oracle, and chat-pasted-URL handling. Confirmed by direct grep, not assumed.
- **Last.fm** (live) via `api/lastfm.js, LASTFM_API_KEY` — real artist/tag discovery — refCorpus.findMatches()'s real fallback when no reference-corpus match exists; grows the corpus from its own results.
- **n8n** (built, unconfirmed) via `n8n/rota_sync_workflow.json (Cron -> scripts/fourth_rota.py)` **(not tested)** — real, importable workflow for F10's rota-sync automation — never test-run against a live unattended execution (2 manual login-confirmation gates deliberately untouched).
- **Whisper (OpenAI, local)** (built, unconfirmed this session) via `local_server.py / Python scripts on Alex's own machine` **(not tested)** — local speech-to-text — historically confirmed working July 7 (Content Intelligence: metadata->download->Whisper->frame extraction->Claude Vision->Oracle report). Current live status genuinely unconfirmed this session, same visibility gap as local_server.py's other integrations — do not claim active without asking Alex.

## Flows into

- → [[08 — River VIII — The Confluence Pool.md|River VIII — The Confluence Pool]] — **Real persisted write** (Content Intelligence real write path — the pending-proposal/review-queue flow)

## Fed by

- ← [[02 — River II — The Great Confluence.md|River II — The Great Confluence]] — **Page / UI routing** (Content Intel page selected)

---
*Generated by `scripts/graphify_to_obsidian.py` — real data from `graphify_river_group.py` + `minotaur_map.html`'s own flow connectors, never guessed. Re-run after a river/zone changes; this file is fully regenerated each time, not hand-edited.*