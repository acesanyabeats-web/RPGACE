---
river_number: 8
river_name: "Platform"
kind: river
carries_data_flow: true
retired: false
color: "#cc4a4a"
source: "graphify_river_group.py — real, not guessed"
---

# Platform

## Real member modules (rpgace_core.js)

- [[leftNav]] — `rpgace_core.js:11846-12543`
- [[dashDeck]] — `rpgace_core.js:15377-17097`
- [[config]] — `rpgace_core.js:24718-26013`
- [[pwaInstall]] — `rpgace_core.js:34511-34557`
- [[authGate]] — `rpgace_core.js:34559-34778`
- [[pathRouter]] — `rpgace_core.js:36148-36386`
- [[perfWatch]] — `rpgace_core.js:36388-36436`

## Core infrastructure

- **Supabase** (live) via `RPGACE.sb.* (anon key, RLS-gated) + /api/data-write.js (service-role proxy for 19 restricted tables)` — the real hub every domain writes into/reads from — not a "connector" in the OpenMontage/Composio sense (RPGACE owns this data, it does not hand off to an external agent), but a real, load-bearing Total-system member in its own right, used by nearly every real domain.

## Total-systems connectors (real, external)

Canonical source: `ai_tooling_and_rules_map.md`'s own "External AI/tool providers" table — mirrored here for graphify/Obsidian display, not a second independent fact-set. Every real, built connector is listed regardless of test status — an untested one is marked, never hidden.

- **Anthropic (Claude API)** (live) via `api/oracle.js callClaude()` — the real default Oracle provider — every ungrounded Oracle call routes here unless a dormant provider (Kimi/Luna) is live. Oracle's Oracle Current is the harness; this IS the real external call, not RPGACE code.
- **OpenMontage** (live) via `openmontage_jobs Supabase queue` — agent-operated video pipeline, driven by a separate Claude Code session ("OpenMontage CC") in its own repo — never RPGACE-embedded. Real spring AND mouth both sit in Content & Video: opens at Content Production Live's "Generate Video," closes at "Mark ConID as Filmed" (the reservoir is polled, not pushed).
- **Composio** (live) via `api/composio.js / api/executor.js / api/orchestrate.js` — Gmail/Instagram/YouTube/Notion/GitHub connected-account automation — real triggering call sites confirmed by grep: Schedule & Journal's morningBrief (Gmail fetch) and Content & Video's contentRepurpose (Notion page + YouTube channel data via Supadata).
- **Moonshot AI (Kimi)** (dormant) via `api/oracle.js provider:'kimi'` **(not tested)** — real OpenAI-compatible scaffold, dormant until MOONSHOT_API_KEY is set — would be called from Oracle's Oracle Current in place of the default Anthropic call once live.
- **OpenAI (Luna)** (dormant) via `api/oracle.js provider:'luna'` **(not tested)** — same scaffold shape as Kimi, dormant until OPENAI_API_KEY is set — same Oracle relationship once live.
- **librosa** (optional/local) via `beat_audio_jobs + beat-audio bucket, a local Python script (real script identity UNCONFIRMED as of Aug 27)` **(not tested)** — BPM + Major/Minor key analysis only, needs Alex running a local Python snippet — not a hosted service. Triggered by Content & Video's Beat Log, nowhere else.
- **FFmpeg** (live (external repo)) via `OpenMontage's own pipeline, confirmed working July 31` — runs inside OpenMontage CC's OpenMontage environment, not RPGACE's own runtime — reached only via Content & Video's OpenMontage handoff (through this domain), never called directly by any RPGACE domain.
- **OpenArt** (deferred) via `none yet` **(not tested)** — Alex has a real, active subscription (confirmed Aug 30 2026), but zero real integration exists in OpenMontage's own tooling — no tool file, no registered provider (confirmed Sep 16 2026, GMR-1). fal.ai was set up as the real working alternative instead.
- **fal.ai** (live (external repo)) via `a real fal.ai key set up directly in the OpenMontage repo, Sep 16 2026` **(not tested)** — the real working provider OpenMontage CC actually uses (unlike OpenArt). RPGACE's own openmontage_jobs.brief provider note (rpgace_core.js contentProductionLive._buildVideoPipelinePayload) now names fal.ai as preferred, updated same day.
- **Graphify CC** (live) via `graphify_jobs Supabase queue` — the real 4th Total-system member — generates graphify-out/GRAPH_TREE.html + the cross-repo global graph. Dispatched from Oversight's own session-start check, deposits real findings back into the Oversight domain via graphify_jobs.
- **Jina AI** (live) via `r.jina.ai, 4 real call sites (scout.js/bookworm-fetch.js/main.js/_context.js)` — real, live URL-to-text fetch — load-bearing for Bookworm URL ingestion, Schedule Oracle, and chat-pasted-URL handling. Confirmed by direct grep, not assumed.
- **Last.fm** (live) via `api/lastfm.js, LASTFM_API_KEY` — real artist/tag discovery — refCorpus.findMatches()'s real fallback when no reference-corpus match exists; grows the corpus from its own results.
- **n8n** (built, unconfirmed) via `n8n/rota_sync_workflow.json (Cron -> scripts/fourth_rota.py)` **(not tested)** — real, importable workflow for F10's rota-sync automation — never test-run against a live unattended execution (2 manual login-confirmation gates deliberately untouched).
- **Whisper (OpenAI, local)** (built, unconfirmed this session) via `local_server.py / Python scripts on Alex's own machine` **(not tested)** — local speech-to-text — historically confirmed working July 7 (Content Intelligence: metadata->download->Whisper->frame extraction->Claude Vision->Oracle report). Current live status genuinely unconfirmed this session, same visibility gap as local_server.py's other integrations — do not claim active without asking Alex.
- **Unsplash** (built, not configured) via `api/search.js handleRecipeImage(), UNSPLASH_ACCESS_KEY` **(not tested)** — H11 (Sep 16 2026) real recipe-photo primary source — code checks for UNSPLASH_ACCESS_KEY and fails open to the Wikipedia fallback below when unset (not yet set as of this build). Oracle's Oracle Current is unrelated; this is triggered from Content & Video's cookingOracle recipe card.
- **Wikipedia REST API** (live) via `api/search.js handleRecipeImage() fallback, en.wikipedia.org/api/rest_v1` **(not tested)** — H11 (Sep 16 2026) real recipe-photo fallback — no key needed, live today, but only finds a photo for well-known named dishes with a matching Wikipedia article.

## Flows into

- → Knowledge — **A module calls code in another domain** (5 real call(s), e.g. leftNav -> researchTabs.show; dashDeck -> screenshotInbox.count; dashDeck -> recall.renderInto)
- → Habits — **A module calls code in another domain** (1 real call(s), e.g. dashDeck -> dailyLife.renderInto)
- → Chronicles — **A module calls code in another domain** (1 real call(s), e.g. dashDeck -> chroniclesLog._openCard)

## Fed by

- ← [[01 — Oracle.md|Oracle]] — **A module calls code in another domain** (2 real call(s), e.g. captionsPanel -> dashDeck._popup; mockOracle -> dashDeck._popup)
- ← [[02 — Content & Video.md|Content & Video]] — **A module calls code in another domain** (8 real call(s), e.g. visualOracle -> dashDeck._popup; contentRepurpose -> dashDeck._popup; refCorpus -> dashDeck._popup)
- ← [[03 — Knowledge.md|Knowledge]] — **A module calls code in another domain** (11 real call(s), e.g. pathways -> dashDeck._popup; encyclopediaPosts -> dashDeck._popup; recall -> dashDeck._popup)
- ← [[04 — Habits.md|Habits]] — **A module calls code in another domain** (4 real call(s), e.g. cookingOracle -> dashDeck._popup; shoppingWishlist -> dashDeck._popup; gymTracker -> dashDeck._popup)
- ← [[05 — Schedule & Journal.md|Schedule & Journal]] — **A module calls code in another domain** (4 real call(s), e.g. agendaReminder -> dashDeck._popup; scheduleOracle -> dashDeck._popup; morningBrief -> dashDeck._ensureStash)
- ← [[06 — Chronicles.md|Chronicles]] — **A module calls code in another domain** (1 real call(s), e.g. careerStatCard -> dashDeck._popup)

---
*Generated by `scripts/graphify_to_obsidian.py` — real data from `graphify_river_group.py` + `minotaur_map.html`'s own flow connectors, never guessed. Re-run after a river/zone changes; this file is fully regenerated each time, not hand-edited.*