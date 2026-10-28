# RPGACE Interconnection Map

## Per-domain sections (CK-3/4, Oct 28 2026)
This file keeps the cross-domain picture; each domain's own sections moved, unchanged, to its folder:
- **Oracle** → [`docs/domains/oracle/interconnections.md`](docs/domains/oracle/interconnections.md) (9 sections)
- **Content** → [`docs/domains/content/interconnections.md`](docs/domains/content/interconnections.md) (8 sections)
- **Knowledge** → [`docs/domains/knowledge/interconnections.md`](docs/domains/knowledge/interconnections.md) (21 sections)
- **Habits** → [`docs/domains/habits/interconnections.md`](docs/domains/habits/interconnections.md) (9 sections)
- **Schedule** → [`docs/domains/schedule/interconnections.md`](docs/domains/schedule/interconnections.md) (35 sections)
- **Chronicles** → [`docs/domains/chronicles/interconnections.md`](docs/domains/chronicles/interconnections.md) (9 sections)
- **Platform** → [`docs/domains/platform/interconnections.md`](docs/domains/platform/interconnections.md) (14 sections)

**Format note (July 14, re-pruned July 28):** converted from 21 chronological "PART N — date" append-only sections into fixed standing sections, organized by system/pipeline. Each section describes **current state** and gets edited in place as things change — this file no longer grows by appending a new dated part every session. Despite that July 14 rule, ~20 dated "built July NN" narrative headers had re-accumulated by July 28 (a Council-of-5+GODMODE oversight-doc audit found this doc had drifted back into a second changelog duplicating patch_notes.html) — condensed back to current-architecture-only sections that same day. The full incident-by-incident history for anything summarized here, old or new, lives in `patch_notes.html`/`patch_notes_archive.html` — this file should describe what's true now, never what happened when.

**Notation key:** `●` = button/trigger &nbsp; `→` = data transport (solid) &nbsp; `⋯>` = another module chips in along the step (dotted) &nbsp; `▢` = arrival point (module, node, Supabase table, or display)

---

## The two real hubs (read this first)

Every domain in RPGACE ultimately touches one of exactly two hubs — **Oracle** (generation) or **Taxonomy Tree** (knowledge structure) — except the **Schedule system**, which runs as a genuinely separate, self-contained loop (shifts + agendas + calendar) with no taxonomy dependency at all. The Schedule system could be extracted or rebuilt independently without touching Oracle or Taxonomy; a change to either hub ripples through nearly everything else.

```
                              ┌─────────────────┐
                              │   ORACLE HUB     │
                              │  (Claude API)    │
                              └────────┬─────────┘
                    ▲                  │                  ▲
                    │                  ▼                  │
         ┌──────────┴──────┐  ┌────────────────┐  ┌──────┴──────────┐
         │  4 Oracle Panels │  │ Every response  │  │ Feynman, Beat   │
         │  (Prod/YT/Insta/ │  │ auto-scans for  │  │ Log briefs,     │
         │   Visual)        │  │ taxonomy (🌿)   │  │ Morning Brief   │
         └──────────────────┘  └────────┬────────┘  └─────────────────┘
                                          │
                                          ▼
                              ┌─────────────────────┐
                              │  TAXONOMY TREE HUB   │
                              │  (taxonomy_tree +    │
                              │   taxonomy_proposals)│
                              └──────────┬───────────┘
                    ▲                    │                    ▲
                    │                    ▼                    │
         ┌──────────┴───────┐  ┌──────────────────┐  ┌───────┴──────────┐
         │ Manual entry /    │  │ Knowledge Gap     │  │ Content Intel +  │
         │ Phylum Path       │  │ Tracker reads     │  │ Encyclopedia     │
         │ (Research tab)    │  │ gap scores         │  │ auto-propose      │
         └───────────────────┘  └──────────────────┘  └───────────────────┘

         Meanwhile, on a parallel independent track:

         [rpgace_shifts] ◀──sync──▶ [shiftSync module] ◀──sync──▶ [rpgace_agendas]
                                            │
                                            ▼
                              [Weekly / Daily / Monthly Calendar]
                                            │
                                            ▼
                              [scheduleToCalendar() — single write path]
```

---

## Oracle Pipeline

**Entry points (all funnel into `RPGACE.utils.sendToOracle()` / `sendChat()`):** 5 panels — 🎛 Prod Oracle (14 commands), 🎬 YouTube Oracle (8 commands), 📸 Insta-Oracle (13 commands), 🎵 TikTok Oracle (8 commands — real TikTok-mechanic commands: FYP algorithm/completion rate, trending sounds, sub-1-second hooks, loop/rewatch engineering, duets/stitches; deliberately a separate panel from Insta-Oracle rather than folded in, since TikTok's real discovery mechanic is a pure interest/FYP graph, genuinely different from Instagram's follower-graph-plus-explore model Insta-Oracle's own commands are built around), 🎬 Visual Oracle (6 commands, grounded in the Phylum 14 filmmaker library — see Taxonomy Pipeline); 🔀 Repurpose (3-step popup); Beat Log's artist-matching brief; Morning Brief; Feynman phase dialogue; Agents tab (New Quests, Draft Email, YT Stats); Schedule Oracle's 3 entry points; Phylum Path's insight-placement + article-generation calls.

**Global taxonomy auto-scan:** every completed Oracle response is scanned client-side the instant `send-btn.disabled` flips back to `false` (no completion callback exists in `sendChat()`, so this signal is reused instead). 3-layer stack: (1) cheap local keyword scan always runs, zero Supabase cost; (2) confidence gate — only surfaces on 2+ phyla matches or 1+ gap-relevant concept; (3) silent "🌿 N topics" badge, click-to-expand pulls real gap scores from `taxonomy_tree`. This is the single passive link from every Oracle response back into the Taxonomy Tree hub.

**Concurrency guard:** `sendChat()`'s `send-btn.disabled=true` was only a visual guard — nothing stopped a second call firing programmatically while one was pending, and two overlapping calls shared one global `STATE.chatHistory` + one fixed `#typing-indicator` id, so whichever resolved first stole the other's response. Fixed via `window._oracleRequestInFlight`, checked first in `scheduleOracle._injectEntryPoints()`'s existing `sendChat` wrap — a second call while one's pending is blocked with a toast instead of firing concurrently.

**Canonical phylum labeling in prompts:** `RPGACE.utils.phylumContext(num)` (Latin/English name + one-line purpose) is prepended to every Oracle-bound prompt that names a phylum — `proposeLineage()`/`silentPropose()`'s "ROOT PHYLUM" line, Phylum Path's persona opener, Visual Oracle's Director Match. Short UI-only labels use the lighter `phylumLabel(num)` instead (no purpose line, no Oracle cost).

**Multi-model extractor/ground-worker pipeline — currently scoped to Phylum Path's 3 Oracle calls only.** `api/_context.js` now exposes `MODEL_EXTRACTOR` (`claude-fable-5`, a fast/cheap triage model) alongside `MODEL_GROUND_WORKER` (still `claude-sonnet-4-6`, the already-verified model — never guessed a new identifier); `callClaude()`/`api/oracle.js` both accept an optional `model` field, defaulting to the existing model when omitted, so every other Oracle caller in the app (native `callOracle()` chat included) is unaffected. `decidePlacement()`, `_generateInsightContent()`, and `_generateArticle()` each now run a fast Fable 5 outline pass first, then hand that outline to the ground-worker call as a "starting hint — verify and override" addition, with a `.catch()` fallback to ground-worker-alone if the extractor call fails. Not phylum-specific — applies wherever Phylum Path itself is enabled, currently just Phylum 1.

### Known open issues
- **F11 ingestion failure** — a YouTube URL Jina can't fetch produces silent "Content Unavailable" placeholder data instead of a clear error, flowing through Encyclopedia save / Schedule / Taxonomy queue unchecked. Needs `/api/scout` or `scheduleOracle._ingest()` to detect a failed/empty fetch and surface it before the 3-option reveal.

---

## Schedule System (independent track — no Taxonomy dependency)

`rpgace_shifts` ↔ `shiftSync` ↔ `rpgace_agendas` → Weekly/Daily/Monthly Calendar → `scheduleToCalendar()` (single write path, extended with `source_type`/`source_id` so any block can link back to its origin module).

**🗑 No templates** (AC-2, Oct 21 2026) — `day_templates`/`week_templates` and their code (`learnedSource`, `savedTemplates`, `save/removeDayTemplate`, `templateFromWeek`, `save/applyWeekTemplate`) are gone. Plan my day always opens on `logic.buildDay(date, [])` (what's due, fitted around shifts); `lockDay` no longer writes a day record; `logic.nightBeforeStatus` counts a day planned when it has Schedule entries or `logic.dayBlocks(date)`.

**🧺 Kitchen: done shopping, stock types, kit measures** (Oct 21 2026) — `cookingOracle.logic._finishShopping(listId, addBasket, cb)`: basket items go to stock through `_defaultLocation` + `_addStock`, then `bought=true`. Unfound items go through `_addToTopUpList`, which dedupes. Then `shopping_lists.status='done'`; the hub Shop step skips done lists. Stock page: `_loadStockByLocation` reads `ingredients(food_type,use)`, falling back to `logic.stockType`/`stockUse` guesses, grouped by `logic.STOCK_TYPES`; `ui._editStockTags` → `logic.setStockTags` (secureWrite `ingredients`). Measures: the one formatter `_fmtMeasurement(amount, unit, {name, grams})` uses `logic._kit` (from `kitchen_equipment` via `_loadEquipment`/`_parseKit`). It gives grams for solids when scales exist and a weight is known (`grams_estimate`, or `_gramsPer` noted by `_noteGrams` when a recipe card or Cook Mode opens); otherwise `_kitVolume` (owned cup measures plus "¼/½/¾ of the ¼ cup", tsp for the rest).

**📅 Schedule Oracle (F11, Phase 1 shipped):** 3 entry points (direct-launch button, chat-mode `schedule oracle:`/`schedule this:`/`learn later:` prefix intercepting `sendChat()`, panel's own paste field) → `scheduleOracle._ingest()` → `/api/scout` (URL detect + Jina fetch) ⋯> `/api/analyst` (type-aware analysis) → sequential 3-option reveal, one at a time: Save to Encyclopedia → Schedule a session (real Schedule modal, pre-filled) → Queue for Taxonomy Tree (same `silentPropose()` path Encyclopedia's button uses). **Phase 2 (F12 — carousel toggle, two-tier session memory, auto-routing confidence gate) is not started**, explicitly depends on F11 proving out first.

**n8n rota sync (F10):** `n8n/rota_sync_workflow.json` (Cron trigger → Execute Command running `scripts/fourth_rota.py`, which now reads `.fourth_credentials` if present). Two manual "press Enter" login-confirmation gates and a manual-console-paste step (no direct Supabase write) are deliberately untouched — not yet test-run against a real unattended execution.

---

## Realm frame (Oct 27 2026)

`realm_lenses.json` is the realm registry: lens (Python analyser + app) and `frame` (target, tools, feeds, starters). `realmFrame` reads it with `xp_settings` and live counters to draw every realm home's universal frame, the slim realm line's target, and Oracle's realm brief (via `oracleAppGrounding`'s wrap). Area hubs share `areaNav.next` (What's next) and `areaNav.steps` (tiles). Prompts: `prompts/*.md` -> `R.PROMPTS` -> `RPGACE.prompt()`.

## Shared Touchpoint Cross-Reference

Grouped by **shared destination**, not by domain — anything in the same row already talks to the same place; wiring a new feature to read/write there joins the cluster with zero new plumbing.

| Shared Touchpoint | Writers | Readers | Note |
|---|---|---|---|
| **`taxonomy_tree` + `taxonomy_proposals`** | See Taxonomy Pipeline's 4 writers + Phylum Path | Knowledge Gap Tracker, contentRepurpose (`_detectPhyla`), Visual Oracle, `taxonomy_map.html` | The system's real source of truth for "what do I know / what's a gap" — new features should read here directly, not build a second store |
| **`content_productions`** | contentRepurpose (create), conidPot (activate), all ConID buttons (update) | Dashboard ConID widget, Oracle bar | The project-tracker spine — F15/F16/F17/F18 all extended this table's columns rather than creating a parallel one |
| **`conid_pot`** | conidPot.saveIdea (Oracle panels + text-select) | Idea Bank display, Morning Brief (day-rotation), contentRepurpose dropdown | Repurpose's dropdown still parses raw `chat-msgs` instead of reading `conid_pot` directly — the one remaining "grabs the wrong idea" gap, would resolve permanently if pointed at the table instead |
| **Oracle API** (`sendToOracle`) | Every panel, every quick action, Feynman, Morning Brief, Beat Log, Repurpose, Schedule Oracle, Phylum Path | The chat display itself | True hub — see Oracle Pipeline section above for current state, guards, and open issues |
| **`video_jobs`** | Beat Log (`_submit()`) | F16 (Beatstars listing), F17 (Video Pipeline tracker) | A real, granular file-path sub-tracker — see Content Production Pipeline |
| **`chat-msgs` DOM** (not a database) | Every Oracle response append | `RPGACE.utils.getRecentOracleMessages(n)` (F1 — collapsed 3 independent DOM-parsers into one shared helper) | Resolved: contentRepurpose, conidPot, and the Save-Idea injector all now share one implementation instead of three |

---

## Encyclopedia ↔ Taxonomy Tree Link

`encyclopedia.taxonomy_node_id` (nullable uuid, added for F7) makes the two tables a navigable pair in both directions: an Encyclopedia entry can point to the tree node it generated, and a tree node reached via Phylum Path's article generation points back to the entry that documents it. Two entry points into the same `taxonomy_proposals` queue — automatic (sync-triggered, silent, batched) and manual (🌳 Propose to Taxonomy button, per-entry, immediate) — both land in the same review popup.

**`encyclopedia.preview_bullets` — the entry's own persisted "destination of planned output," checked before ever calling Oracle.** `generateEncBullets()` previously held its cache in a plain in-memory JS object (`ENC_BULLET_CACHE`) that evaporated on every page reload, so the identical Oracle prompt (and, once Fallback Scout mode existed, the identical queue row) re-fired every time the Encyclopedia page loaded, even for entries already generated in a prior session. A successful generation now persists to this column via `RPGACE.sb.secureWrite`; a transient failure never does, so the row can't get poisoned with a placeholder fallback bullet.

---

## Future Integration Vision (Items 1-6) — confirmed direction, not yet scoped
**Renamed from "(a-f)" — a real /paranoia-audit finding**: this section's own old lettering collided with the NEW, unrelated oversight-tier lettering (a)-(f) named in CLAUDE.md's Oversight section (Tier a/b, layers c/d/e/f) — same letters, two completely different meanings, a real confusion risk for any future reader or Oracle grounding query. Renumbered to plain items, content unchanged.

Full detail in `patch_notes.html`'s Tier 6. One-line summary per item, each extending an existing touchpoint above except Item 5:
- **1.** Social platform integrations — extends Composio connectors. **Scope confirmed via `/interrogation`**: the Content/Video Pipeline unification explicitly stops at Captions Generating (captions saved to the ConID, stage marked complete) — Composio auto-posting is a real, separately-scoped follow-up, not folded into that build. Full spec: `content_video_pipeline_unification_spec_2026-08-05.txt`.
- **2.** Video editing/scripting integration — extends F17/F18 (Content Production Pipeline)
- **3.** Full learning environment — unifies Feynman + Encyclopedia + Taxonomy Tree into one curriculum
- **4.** Auto-logging videos/beats/career progress — extends Journal + Content Production Live
- **5.** Autonomous RPGACE self-improvement meta-agent — the one genuinely novel governance shape: permission required to *adopt* a new idea, no permission required to *correct* a confirmed-bad existing implementation. Needs careful scoping before any build.
- **6.** Competitor/book insight pipeline into Taxonomy — insight → tree leaf → structured "complete outlook" summary → clickable footnote back to source (reuses `intel_bibliography`). The shared placement engine this depends on already exists (see "Taxonomy Sorting Agent" above) — books/competitor research can already become just another proposal source alongside Oracle/Content Intelligence/Encyclopedia sync; this item is now genuinely just the bibliography-footnote UI work, not blocked on any agent.

---

## Bookworm ↔ Phylum Path — confirmed live end-to-end

Bookworm's insight-review loop (`_analyzeChapter` → `_placeInsightCascade` → `_decidePlacementScored` → `_renderInsightReview`'s Approve/Reject/Edit checkpoint → `phylumPath._insertNewSteps`) has run end to end in production on real books, including real approvals and rejects. Chapter-boundary detection for PDF-sourced text is Oracle-primary with a deterministic mechanical fallback (see Taxonomy Tree Pipeline above for the current architecture) — the original body-text-recall approach that preceded it is gone from the codebase entirely, not deprecated.

---

## Content Pipeline overseer — `content_productions` ↔ `video_jobs` ↔ `style_profiles`

`content_productions` is the beat table (Beats plan, BT-0..8; old ConID stages and the `video_jobs` tracker retired Oct 17 2026, PC-6); posts are the separate private `posts` table (Posting plan). Both feed XP through `xp_on_change`.

---

## Oracle self-awareness digest — hand-maintained + live facts, a real cross-doc convention

`oracleAppGrounding.SELF_KNOWLEDGE` is a condensed, hand-written digest of CLAUDE.md's Current State — deliberately NOT live-parsed, to avoid a second source of truth alongside `system_flow_map.md`'s own truth table. **Standing convention**: whoever updates CLAUDE.md's Current State updates this string in the same session. `_liveFactsLine()` supplements it with real freshly-sourced facts that fail open if unavailable (module count, pending-review count, recent `system_updates` rows, latest `/impeccable` design-scan result) — see Oracle Pipeline above for the current field list.

**Architecture/anatomy grounding — a second, separate gate inside the SAME `window.callOracle` wrap, not a new wrapper.** `SELF_KNOWLEDGE` answers "what's built" (feature status); it has zero grounding on "how does X actually work" (module internals) — a real, distinct question Oracle could not answer before. `ANATOMY_KEYWORDS` (anatomy-shaped phrases: "how does", "under the hood", "which module handles", etc. — checked against `TRIGGER_KEYWORDS` for collision, none found) gates `_buildAnatomyBlock()`, which reuses `oracleTreeGrounding`'s proven retrieval shape (cheap local scan of message against a TTL-cached module-name/keyword index → live Supabase `SELECT` scoped to only the top-scoring matches → format → inject) against a new `oracle_module_anatomy` table. Deliberately Oracle-only, not a shared Claude-Code resource — Claude Code sessions already have direct repo + `graphify-out/` access, which is strictly better than a Supabase prose copy; building a Claude-Code-facing duplicate would have been a real rule-8 violation. The table is curated by Claude Code sessions per architectural change (same discipline as the six oversight docs), NOT auto-parsed from graphify (too mechanical for conversational grounding text), and is deliberately excluded from `api/data-write.js`'s `ALLOWED_TABLES` since nothing in the app writes to it client-side. First batch: 13 rows, scoped to the riskiest/most complex modules (Alex's own choice) — `dashDeck`, `phylumPath`, `authGate`, `oracleAppGrounding`, `oracleTreeGrounding`, `bookworm`, `config`, `taxonomyTree`, `leftNav`, `beatLog`, `contentProductionLive`, `videoPipeline`, `voiceInput`. Full debate/design record: `oracle_architecture_anatomy_db_debate_2026-07-31.txt`.

## API auth, write-proxy, and RLS — current security architecture

Every `/api/*` call requires a shared secret (`authGate`'s global `fetch()` wrap attaching `X-RPGACE-Auth`, checked by every endpoint's `requireAuth()`). `api/data-write.js` + `RPGACE.sb.secureWrite()` route all real writes through a service-role-key server endpoint, bypassing RLS entirely at the client. **Real historical lesson worth keeping structurally**: this codebase has three distinct raw-fetch idioms for writing to Supabase (`RPGACE.sb.insert/update/del`, `fetch(RPGACE.sb.url(table))`, and an inline `RPGACE.CONFIG.supabase.url + '/rest/v1/...'` pattern) plus a fourth in `main.js` specifically (hardcoded-credential raw fetches) — a "zero remaining writes" claim must check all four, in every file, not just the most obvious idiom in the most obvious file. Full current RLS state (which tables are flipped, which are deliberately excluded and why) lives in CLAUDE.md's Security note — read that for the authoritative live state rather than this file, which only tracks the interconnection pattern.

## Oracle API layer — prompt caching, free-tier routing, and content condensing

Three real additions to `api/_context.js`/`api/oracle.js`, all deliberately server-side-only so no client call site needed to change to get the first two:

`cacheableSystem()` (`api/_context.js`) wraps any outgoing `system` string in Anthropic's `cache_control:{type:'ephemeral'}` block form before it reaches `callClaude()` or either of `api/oracle.js`'s two direct-fetch paths (streaming, images) — every server-side caller of Claude benefits automatically, including `api/analyst.js` via the shared `callClaude()`, without needing its own change (rule 8). Real, checked architecture reason this works: `oracleAppGrounding`'s `window.callOracle` wrap builds `system` as persona-text-then-grounding-block, in that fixed order, with the actual per-question dynamic content living in `messages` — so the same `system` string genuinely recurs across real calls sharing a persona/grounding state, a real caching target rather than a guess.

`phylumPath._condenseIfLarge()` (rpgace_core.js) is a real, tested, but **not yet wired into any live call site** Headroom-pattern helper: above a 6000-char threshold, sends raw content to the cheap `MECHANICAL_MODEL` tier with a narrowly-scoped instruction (strip genuine filler, preserve every specific technique/quote/attribution exactly), fails open to the untouched original on any error or a suspiciously small result. The real intended targets — Bookworm chapter text, Content Intelligence video dumps — both need their own dedicated read before this gets wired in (rule 1); this is the ready building block, not the integration.

`api/oracle.js`'s `provider:'kimi'|'luna'` branch calls Moonshot's/OpenAI's real OpenAI-compatible chat/completions endpoints directly (`callFreeTierProvider`), normalizing the response to Anthropic's own `{content:[{type:'text',text}]}` shape so no client-side parsing needs a second path. Dormant until `MOONSHOT_API_KEY`/`OPENAI_API_KEY` exist — no current caller sends `provider` yet. Deliberately NOT OmniRoute (the third-party gateway) — its own real architecture needs a persistent server, a genuine mismatch with RPGACE's Vercel-serverless posture, reconfirmed with fresh evidence after the original verdict.

## `session_memory` — Supabase-backed cross-session context

A real answer to the claude-mem Aintergration ask, but built as RPGACE's own Supabase table (`session_memory` — `summary`/`key_decisions`/`open_threads`/`referenced_inputs` jsonb, a generated `tsvector` column for full-text search) rather than adopting the third-party tool, because claude-mem's local `~/.claude-mem/` storage doesn't survive Claude Code Remote's ephemeral per-session containers. `/Bedtime`'s new Step 1b writes one row per session; `/Routine` and `/Summary` both read it as part of their own evidence pass. Deliberately distinct from CLAUDE.md's own Current State (durable, hand-pruned facts) and `patch_notes.html` (what shipped) — `session_memory`'s real, distinct job is capturing the fuller texture neither of those keeps: rejected alternatives, small real asides, and explicit attachment references, searchable by content rather than requiring a session to know which dated file to open.

## The `/CEO` datasheet — Supabase-backed plan/build-status tracking, Orchestrator-CC-internal only

`ceo_plans`/`ceo_plan_items`/`ceo_reports` is the Supabase datasheet backing `/CEO`'s Grounded Mode and `/colourgradient`'s benchmark reads — `/drift`'s own VERDICT/BASIS state, tracked per plan item, plus a shared derivation for two genuinely different OFF states: `paused` (manual `/stopCEO`, only `/ResumeCEO` resumes it) and `dormant` (fully derived — auto-resumes the instant new non-green content exists anywhere, no stored flag). `future_integrations.html` is the real, queryable presentation of the same `ceo_plan_items.status` column, filtered to non-green rows — never a second copy of the same data (rule 8), a snapshot render of it. **Real correction**: an earlier pass built a live app-facing UI module (`ceoMode`, a fixed top-left pill) reading/writing this data directly inside `rpgace_core.js` — removed the same day per Alex's own direct correction ("ceo should not be present in rpgace, only orchestrator CC"). This datasheet is real, live, and actively used — but purely as Orchestrator-CC-internal working data, the same posture as `session_memory`/`graphify_jobs`, never rendered or exposed anywhere in the deployed RPGACE product.

## Client architecture — one script, one Galaxy Map entry point

**Source ladder (CK-8, Oct 28 2026).** The one served script `rpgace_core.min.js` is built from a ladder: `rpgace_core.js` is a hub of `// @file` lines (no code) → `src/_core/core.js` (config, utils, `RPGACE.register`, the legacy main.js section) → `src/<domain>/<module>.js` (one per registered module, gaps and DOMAIN banners travel with the next module). `scripts/core_source.py`/`.js` join the hub's files in memory for every tool (graphify, Galaxy Map, checks, minify, prompt builder via `write_region`); no joined copy is written. `rpgace_core.js:N` citations mean line N of the joined source (`core_source.py where N`). The first split was byte-identical (join and `min.js`). [story](patch_notes.html#card-2026-10-28-ck8-source-ladder)

**The client ships as exactly ONE script** — `main.js` was mechanically merged into `rpgace_core.js` (Alex's own direct ask, zero logic rewrite), living on as a marked `LEGACY` section near the top of the file; `index.html` loads only `rpgace_core.min.js`. Every hardcoded tooling reference to `main.js` as a separate file (`graphify_river_group.py`'s own module-window-bridge detection, `.claude/settings.json`'s `check_commands`) has been updated to match — the settings.json entry was a real, missed 2nd instance of this exact bug class, found and fixed during a later `/Bedtime` sweep, not part of the original merge pass.

**The Galaxy Map's real Level 0 is `graphify-out/galaxy_map.html` itself** — the 9-unit fused L0 model (RPGACE Architecture, Orchestrator CC, OpenMontage CC, Graphify CC, External AI, Skills, Alex, Supabase, Oversight Docs) renders as real bubbles directly ON that page, not a separate file; clicking a unit presents a real Infra/Inter facet choice. That same page also carries a real map/table toggle (table = the original 17-edge L0 matrix, reused directly). A shared "level rail" (`inject_level_rail()`, `graphify_river_group.py`) now appears on every one of the 20 real Galaxy Map pages, giving one-click navigation across the whole L0→L6 ladder from anywhere. **A new, permanent Galaxy Development Framework rule (R22, `.claude/skills/CEO/SKILL.md`) governs every future Galaxy Map addition**: the table/matrix representation is always built or updated FIRST; any bubble/map view is a pure rendering layer over that same data, never an independently-imagined second dataset. `galaxy_map_decision_matrix.html` (unifying all 21 real human-confirm/logic/text-input decisions by river and documentation depth) is the reference implementation this rule was extracted from.

## Accessibility — voice input (retired Aug 30 2026)

`voiceInput` (the Oracle-chat 🎤 button + a persistent body-level floating 🎤) is **retired** — real Alex ask, ahead of Fish Audio shipping, not a bug fix (see CLAUDE.md's Known Landmines). Both buttons and the module are deleted; git history preserves the source. No voice-input path exists in the app until a real Fish Audio API key is activated (`oracleControl`/G41's dormant TTS/ASR scaffold). This paragraph is deliberately kept short rather than describing retired mechanics in present tense — see `patch_notes.html`'s Aug 30 card for the real removal narrative.

## Cross-doc sync conventions

`api/_context.js` is the single source of truth for Composio `ACCOUNTS`/`TOOL_ALIASES`/CORS — `api/composio.js` and `api/search.js` import from it rather than keeping their own copies (a real drift between two hand-rolled copies was found and fixed once; don't reintroduce a second copy). The Minotaur Map and `system_flow_map.md` §8 must never drift independently — a change to one Claude-fallback-shaped flow updates both in the same session, per the Minotaur Map's own footnote rule.

## Shared boot-loader gate: `RPGACE.registerBootTask`

Any module's boot-time UI injection registers via `RPGACE.registerBootTask(fn)` instead of a bare `setTimeout(fn, delay)` — the boot loader's own hide logic awaits `Promise.all(RPGACE._bootTasks)` before hiding, so "no loads happen after login" is enforced project-wide from one choke point rather than per-module discipline. `page:show`/`research:tab-active` remain a deliberately separate mechanism (lazy re-injection for pages not yet visited) — not conflated with boot-time pop-in. The dashboard's "Needs you now" list (`dd-needs-list`) is the single source for pending-review counts, combining `taxonomy_proposals` and `taxonomy_links` — `taxonomyReviewQueue` keeps only `_openQueue()`'s accept/reject popup logic, which the list item calls into.

---

## Standing rule: Oversight

**Scoped to the whole Total system, not RPGACE-internal architecture alone**: graphify's own river taxonomy is 12 live app-code rivers (I-XII, real `rpgace_core.js` modules) plus 5 retired Total-systems categories (XIII-XVII, see the current-state note below) now expressed as per-actor Infra/Inter breakdowns instead of numbered rivers. `ai_tooling_and_rules_map.md`'s own "External AI/tool providers" table is the canonical source for every connector's real status; `scripts/graphify_river_group.py`'s `EXTERNAL_CONNECTORS` hand-mirrors those same facts so they surface inside graphify's own node-info bridge and the Obsidian vault. Chronicles (`system_updates`) remains the live, in-app record of the same work.

**Current state (G102 retirement + G103 rechronologize, real as of that pass; the Rivers XIII-XVII numbering is now further superseded — see `CLAUDE.md`'s own Galaxy Map bullet for the real, current 12-live-river/5-retired-row structure, Sep 15 2026)**: Rivers XIII-XVII (renumbered from their original XII-XVI so River XII could open up for the real, live Research & Intel Stream river, moved there from XVII) are marked **deprecated/merged** in `scripts/graphify_river_group.py`'s `RIVER_RETIRED`, per Alex's own confirmed answer ("all 5 and yes too") — not deleted, since real code/docs still cite them by name. Real evidence: all 5 always had zero real `rpgace_core.js` modules — they were a role-description of a Total-systems category, never a river of actual app code. The Galaxy Map's own L0 Infra/Inter system (G77-G100) gives each of those same real categories its own evidence-grounded bubble system at finer grain than one river-wide note ever gave, so this is a real upgrade in coverage, not a loss of it. Every Galaxy Map page that renders a retired river now shows a real "⚠️ Retired — see instead" banner naming its L0-unit successor — Supabase/Oracle/Composio/Jina AI/Last.fm/librosa/n8n/Whisper for River XIII, the Skills unit for River XIV, the Oversight Docs unit for River XV, and Orchestrator CC's own unit (an honestly-flagged **partial** successor, not a full 1:1 match) for River XVI/XVII. **`minotaur_map.html` no longer carries a "Rivers XIII-XVII — The Total System Gateway" section at all** (real, Sep 23 2026 — the doc was rebuilt as a deliberately simplified consumer page with zero internal architecture/connector detail; the Galaxy Map is now the sole real representation of this).

## Architecture — three layers, two real hubs, the real build workflow

*(Relocated verbatim from `manual.html`'s own "Architecture" section, Sep 23 2026, Minotaur/Manual Unification M2 — `rpgace_build.py` confirmed still real and present in the repo root before this move, not stale.)*

```
LAYER 1: main.js — LEGACY section, mechanically absorbed into rpgace_core.js Aug 20 2026 (see CLAUDE.md's Known landmines)
LAYER 2: rpgace_core.js — all domain modules, via RPGACE.register()
LAYER 3: api/ (Vercel serverless) — oracle.js, intel.js, composio.js, data-write.js
```

The two real hubs everything converges on (confirmed via the full interconnection audit above): **Oracle** (Claude API, generation) and **Taxonomy Tree** (knowledge structure). Only the Schedule system runs fully independent of both.

Real build-command workflow (the "Master Build Tool," `rpgace_build.py`, confirmed live in the repo root):
```
py rpgace_build.py new DOMAIN moduleName
# write logic in mod_moduleName.js
py rpgace_build.py add DOMAIN mod_moduleName.js
py rpgace_build.py check
git add rpgace_core.js && git commit -m "..." && git push
npx vercel --prod
```
This is a real, still-live tool — not the only way to edit `rpgace_core.js` (direct Edit-tool edits following the `/* ===MODULE:x=== */` marker convention are established precedent too, per CLAUDE.md's own Architecture section), but the documented CLI path for a from-scratch new module.

## Every Button, Cataloged

*(Relocated verbatim from `manual.html`, Sep 23 2026, Minotaur/Manual Unification M2/M3 — manual.html retired, git history preserves the original HTML/CSS presentation. Content unchanged; reformatted from HTML tables to markdown. For per-row fusion with the Galaxy Map's own Current(L3) series, see that doc's own note this section inherited: most rows' "Chain" cell already names the real module/function it calls, which is the row's real fusion point — deliberately not a per-row retrofit of static links, which would itself go stale; resolve a Chain cell's module name against `RIVER_MODULES` in `scripts/graphify_river_group.py`, or open that module's river section on `graphify-out/galaxy_map_module.html`, for the precise river.)*

### GLOBAL (6 buttons)

| Button | Chain |
|---|---|
| 🧪/✅/📥 Oracle Mode switch (top-right) | `mockOracle` module (Aug 6) — a real fixed pill cycling Real API → 🧪 Dummy (wiring-test replies, zero cost) → 📥 Fallback Scout (queues the send for free later answering) on click. A paired "📥 Scouted" pill browses every queued item. |
| ☰ Left Nav Drawer | `leftNav` module (July 20) — hamburger in the slim sticky `.nav` shell slides in a left drawer listing top-level pages; Schedule expands inline. Research Lab drawer entry retired with the page itself (A5 Phase 1/UI2). |
| 🃏 Dashboard command deck (12 cards) | `dashDeck` module (July 20) — command cards in three thematic rows plus a "Needs you now" panel. Each card either `showPage()`s or opens a widget popup (`_openBookworm`/`_openGaps`/`_openPipeline`/`_openMorningBrief`/`_openOversight`/`_openCorpus`, plus `taxonomyReviewQueue._openCard`/`chroniclesLog._openCard`). Research Lab card retired (UI2, Aug 23) — `dashDeck.MODULES` no longer carries a `key:'research'` entry. |
| 🎤 Voice input — **RETIRED Aug 30 2026** | Built July 29 (`voiceInput` module), retired ahead of Fish Audio shipping per Alex's direct ask (Aug 30 Fable Total-Systems Audit). Both buttons and the module deleted; no voice-input path exists until a real Fish Audio key is activated. |
| 🔮 Oracle Control (global floating overlay) | `oracleControl` module (Aug 26 2026, G41) — a real, persistent body-level floating button reusing the real dashboard `sendChatWithImage()`/`sendChat()` pipeline verbatim. A real Content Pipeline action ("log the beat") shows a real confirm popup (what happens / data touched / why / benefit) before doing anything. Oracle can also suggest growing its own recognized-action list, gated behind a separate approval popup. Genuinely unverified by Alex's own hand — headless-Chromium-verified only. |
| 📜 The Chronicles (dashboard card) → View Full Log → | `careerStatCard` + `chroniclesLog` (July 22) — a real dashDeck card opening a popup with the 5 most recent real actions across 8 Supabase tables + a button to the full `#page-chronicles` log page (search box, type filter chips, full history). |

### DASHBOARD (1 button)

| Button | Chain |
|---|---|
| 🌳 Taxonomy & Review (dashboard card) | Opens the review popup when anything's pending, falls back to the Phylum Path browse page when empty. Card's own count fed by one shared `Promise.all` in `dashDeck._refreshGlance()`. |

### JOURNAL (1 button)

| Button | Chain |
|---|---|
| ☀️ Morning Brief | 4-source (Gmail, shifts, YouTube, top gap). Also runs automatically every day at 6am UTC via a Claude Code Remote Routine, writing into `journal` and pushing a phone notification. The dashDeck card opens this real widget in a popup (`_openMorningBrief`). |

### SHOPPING WISHLIST (standalone domain, Sep 14 2026)

| Button | Chain |
|---|---|
| 🛒 Shopping Wishlist (dashboard card) | Opens `shoppingWishlist.ui._showMain` — a general future-purchase list (batteries, household goods, gaming — deliberately not ingredients, which stay HABITS' own job). |
| + Add | Adds an item with a real price estimate, priority, and an optional free-text category tag. A real priority-first greedy budget-fit algorithm shows which items currently fit a set budget target. |
| 🛒 Bought | A distinct confirm asks what was actually PAID — writes a real `chronicles_finance` expense row using the real price paid, then flips the item's own status to bought. |
| 🗑 (2-click arm/confirm) | Standard project-wide 2-click delete pattern — never deletes on a single click. |

## Screenshot Inbox (S1, Oct 11 2026)

`screenshotInbox` (Knowledge) owns the locked `screenshots` table and private `screenshots` bucket; it never touches either directly — every read/write is `POST /api/data-write` `action:'screenshots'` (`upload`/`update`/`list`/`count`/`delete`, `requireAuth` + service role). Images go through `RPGACE.utils.resizeImage` and are read by `RPGACE.utils.oracleVision` (both shared with `dailyLife`'s fridge photo). Routing reuses the real writers: `shoppingWishlist.logic._addItem`, `encyclopedia_insights` via `secureWrite` (`source_entry_id 'shot:<id>'`, recall schedule from `recall.logic.dueIn`), `journal` via `secureWrite`, and `cookingOracle.ui._showGenerateForm`. Readers: `askMyData` (source `screenshots`, `secure:true` → `screenshotInbox.logic.searchRows`), `dashDeck` Due row (`logic.count`), `encyclopediaPosts`' Saved list (opens `shot:` ideas in the inbox). Share sheet: `manifest.json` POST share target → `sw.js` → image to cache `rpgace-share` + `/?share_image=<key>` (screenshotInbox), links → the old `?share_url=` GET (shareInbox, whose `sentScreen` both use).
