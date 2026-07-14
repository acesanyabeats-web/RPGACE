# RPGACE Interconnection Map

**Format note (July 14):** converted from 21 chronological "PART N — date" append-only sections into fixed standing sections, organized by system/pipeline. Each section describes **current state** and gets edited in place as things change — this file no longer grows by appending a new dated part every session. (The old chronological version, if ever needed, is in git history prior to this commit — nothing here was silently dropped, just reorganized and de-duplicated; resolved bugs are folded into one-line notes instead of full play-by-plays, which still live in `patch_notes.html`/`patch_notes_archive.html`.)

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

**Entry points (all funnel into `RPGACE.utils.sendToOracle()` / `sendChat()`):** 4 panels — 🎛 Prod Oracle (14 commands), 🎬 YouTube Oracle (8 commands), 📸 Insta-Oracle (13 commands), 🎬 Visual Oracle (6 commands, grounded in the Phylum 14 filmmaker library — see Taxonomy Pipeline); 🔀 Repurpose (3-step popup); Beat Log's artist-matching brief; Morning Brief; Feynman phase dialogue; Agents tab (New Quests, Draft Email, YT Stats); Schedule Oracle's 3 entry points; Phylum Path's insight-placement + article-generation calls.

**Global taxonomy auto-scan (shipped, live):** every completed Oracle response is scanned client-side the instant `send-btn.disabled` flips back to `false` (no completion callback exists in `sendChat()`, so this signal is reused instead). 3-layer stack: (1) cheap local keyword scan always runs, zero Supabase cost; (2) confidence gate — only surfaces on 2+ phyla matches or 1+ gap-relevant concept; (3) silent "🌿 N topics" badge, click-to-expand pulls real gap scores from `taxonomy_tree`. This is the single passive link from every Oracle response back into the Taxonomy Tree hub.

**Concurrency guard (shipped):** `sendChat()`'s `send-btn.disabled=true` was only a visual guard — nothing stopped a second call firing programmatically while one was pending, and two overlapping calls shared one global `STATE.chatHistory` + one fixed `#typing-indicator` id, so whichever resolved first stole the other's response. Fixed via `window._oracleRequestInFlight`, checked first in `scheduleOracle._injectEntryPoints()`'s existing `sendChat` wrap — a second call while one's pending is blocked with a toast instead of firing concurrently.

**Canonical phylum labeling in prompts:** `RPGACE.utils.phylumContext(num)` (Latin/English name + one-line purpose) is prepended to every Oracle-bound prompt that names a phylum — `proposeLineage()`/`silentPropose()`'s "ROOT PHYLUM" line, Phylum Path's persona opener, Visual Oracle's Director Match. Short UI-only labels use the lighter `phylumLabel(num)` instead (no purpose line, no Oracle cost).

### Known open issues
- **Oracle 504 timeout on long structured responses** — confirmed response-shape-dependent, not universal: the 3-layer teaching format (simple→technical→expert) times out; shorter Socratic-method responses on the same topic complete fine. `maxDuration` raised to 60s, insufficient alone. Root cause narrowed to `callClaude()` (`api/_context.js`) being a single blocking, non-streaming call — generation time alone can exceed even the raised ceiling. A prior streaming attempt broke things and was reverted (dead code + `restoreSendChat` neutraliser still present, see Tech Debt below) — needs a deliberate decision before a second attempt, not a blind retry.
- **Streaming Oracle intercept — dead code, neutralised, not removed.** `restoreSendChat` sets `streamOracle = null` at module init; functionally stable but sitting on top of unused streaming hooks (`RPGACE.streamOracle` definition itself, dead Edge-runtime code in `api/oracle.js` history). Concrete cleanup task, not urgent: delete the dead code + the neutraliser module once confirmed nothing references `streamOracle`, re-run `rpgace_build.py check`.
- **F11 ingestion failure** — a YouTube URL Jina can't fetch produces silent "Content Unavailable" placeholder data instead of a clear error, flowing through Encyclopedia save / Schedule / Taxonomy queue unchecked. Needs `/api/scout` or `scheduleOracle._ingest()` to detect a failed/empty fetch and surface it before the 3-option reveal.

---

## Taxonomy Tree Pipeline

**Core model:** one self-referencing table (`taxonomy_tree`, `parent_id`), unlimited depth, replaced the older flat `taxonomy_nodes` mental model. Every row — Phylum through deepest leaf — is the same shape: name, Latin name (Phylum-only), phylum_number, materialized `path`, `explainer`, `deep_content` jsonb, `sources` jsonb. `taxonomy_proposals` is the staging table in front of it — nothing reaches the live tree without passing through here and being explicitly accepted/edited/rejected via the popup (`_acceptLineage()` / `_showProposalPopup()`).

**Four writers into `taxonomy_proposals`, all silent/non-blocking except manual:**
| Source | Fires when |
|---|---|
| Oracle response badge ("🌿 N topics") | User clicks the badge |
| Content Intelligence pipeline (`ciAutoPropose`) | End of every unattended sync run, keyword-gated |
| Encyclopedia sync (`encSync._autoPropose()`) | End of every sync, same gating |
| Manual — 🌳 Propose to Taxonomy (Encyclopedia cards, `encTaxonomyLink`) | Per-entry, on demand |

**Review layer:** Dashboard "🌳 X taxonomy proposals waiting" badge (`taxonomyReviewQueue`) — batch popup, Accept/Edit/Reject per row, reusing `_acceptLineage()`/`_showProposalPopup()` unchanged. Accept on an Encyclopedia-sourced proposal does a two-table write (new tree node + `taxonomy_node_id` back-reference on the originating `encyclopedia` row) — the one place accept-a-proposal isn't a single atomic insert.

**Rank naming:** `taxonomyTree.RANK_NAMES` / `rankNameForDepth(depth)` — Phylum/Order/Class/Family/Genus/Species/Variant by depth index. Previously a `taxonomy_map.html`-only display convention; now a real shared helper the live app reasons with (first consumer: Phylum Path).

**Phylum-matching / keyword scoring (`RPGACE.utils._PHYLA_KEYWORDS`):** full 21-phylum coverage, weighted terms (2=specific, 1=generic), word-boundary regex matching, shared threshold `PHYLA_MATCH_THRESHOLD` (3) — consumed by `_quickPhylaScan`, `isPlausiblePhylum`, and `contentRepurpose._detectPhyla` (all three converged onto one scorer; a fourth independent list, `taxonomySync.PHYLUM_MAP`, does a genuinely different job — bulk single-best-match classification into the older `taxonomy_nodes` table — and was deliberately left separate). Phylum 1 (Compositio) carries ~140 weighted terms vs. 6-8 for every other phylum — a deliberate, flagged asymmetry seeding the Phylum Path pilot (see below).

**🧬 Phylum Path** — bottom-up insight→article pipeline, direction-inverted from `proposeLineage`/`silentPropose`'s top-down one-shot placement. Piloted on Phylum 1 only. `_placeInsight()` asks Oracle to pick an attach point (exact-path match, extending `_checkForMorph`'s duplicate-check idea to per-rank attachment) and however many new ranks are genuinely needed, reasoned through 5 explicit checks (pedagogical clarity / non-redundancy / practical applicability / structural fit / expansion headroom) — this project's Council-of-5 convention operationalized as an actual prompt instruction. New rows chain in via the same `Prefer: return=representation` pattern as `_acceptLineage`. `_generateArticle(node)` synthesizes a node + its descendants into a real Encyclopedia entry via `saveOracleToEncyclopedia()`, linked back via `taxonomy_node_id` — no new storage invented. Auto-detect entry point subscribes to a shared `RPGACE.hooks` event (`oracle:response-scanned`, fired from `_runPhylaScan`) rather than owning its own `MutationObserver`.

**Canonical phylum labeling — shared touchpoint.** `taxonomyTree.PHYLUM_PURPOSE` (one-line role per phylum) + `RPGACE.utils.phylumLabel(num)`/`phylumContext(num)` are the single source of truth for how a phylum's name renders anywhere in the live app or in an Oracle prompt (see Oracle Pipeline above). Path breadcrumbs inside a generated lineage stay Latin-only by design — that convention is unchanged.

**Bridged phyla (reuse-before-invent):** Phylum 11 (Lingua Musicae) ← `beatLog.SCALE_COLOURS` (10 rows, `source='beatlog_scale_colours'`); Phylum 16 (Venditionis Beatorum) ← F16's 3 licence-term texts (`source='f16_licence_terms'`); Phylum 14 (Visio Cinematica) ← the 50-entry filmmaker library (`source='f14_filmmaker_library'`, read by Visual Oracle's Director Match).

**Phylum 1 data state:** 23 original rows had flat `parent_id: null` (pre-July-12 bug) — backfilled via `path`-matching, zero orphans remaining. One garbage-named leaf (a 298-char quest-plan blob) cleaned up. 32 new rows added from a 90-term jargon sweep, organized under the 5 existing Orders plus a new 6th ("Genre & Production Vocabulary"), tagged `source: phylum_path_manual`. Two artist/track-specific leaves (Dave x Central Cee, Endshpiel & Miyagi) were moved **out** of the tree into `encyclopedia` case-study entries (`source: 'taxonomy_case_study'`, linked back via `taxonomy_node_id`) — the tree classifies general reusable concepts only, case studies belong in Encyclopedia. Current row count: 53. A dedicated "case study" phylum for this pattern is a **deferred future idea**, not yet scoped (see `/root/.claude/plans/woolly-watching-lamport.md`).

### Known open issues
- **`_generateNodeContent()`'s `deep_content` is empty on every real Phylum 1 leaf**, despite the function supposedly populating it — best-supported but *not empirically confirmed* theory is the same Oracle 504 timeout as above, failing silently since the call is fire-and-forget. Prompt trimmed (5 sections/1500 tokens → 2/900) on that theory; not confirmed fixed.
- **Taxonomy Sorting Agent — biggest confirmed-not-built item.** One classification agent (not per-node AI): given any insight, maps it onto an existing tree path or invents a new one, always via accept/reject/modify. AI cost confined to exactly 2 touchpoints (the classification call + the Council-of-5 justification text shown at Lineage Proposal time) — the tree itself stays pure static data, zero AI cost per browse/display. A planned "book knowledge" Supabase table (queryable by any domain, Oracle included) and a read-only "Jargon Encyclopedia" view over tree leaves both depend on this shipping first.

---

## Content Production Pipeline

**Spine table: `content_productions`.** Written by `contentRepurpose.createEntry()`, `conidPot`'s "Activate ConID", and every ConID card button (`updateEntry()` — status/title/details). Read by the Dashboard ConID widget and the Oracle bar's active-ConID context. Status flow: Idea → Scripted → Filmed → Edited → Posted → Analysed.

**Beat Log (`beatLog` module) → `video_jobs`:** drag-and-drop filename parsing pre-fills BPM/key/scale/mood/energy (no write); "⚡ Log Beat + Find Artists" writes to `video_jobs`, triggers `refCorpus.findMatches()` (Last.fm fallback if no corpus match), `taxonomySync.markApplied()`, an Oracle content brief, a Journal save, and an XP award — one button, several downstream effects. **The `video_jobs` table didn't exist in Supabase until July 13** — every save had been silently failing since Beat Log shipped (error swallowed by a console-only `.catch()`); table now created, not yet confirmed working by hand.

**🎧 Beatstars Listing (F16, scoped down):** BeatStars has no public API for creating listings (confirmed via web search) — button generates ready-to-paste title/description/tags/licence content via Oracle instead of auto-posting. Shown on ConID rows once `licence_type` is set (F15); pulls real BPM/key/mood from a matching `video_jobs` row when one exists, degrades gracefully otherwise.

**📹 Video Pipeline tracker (F17, scoped down):** no render/EDL backend exists anywhere in the stack (`local_server.py` only serves Content Intelligence endpoints) — status tracker only over `video_jobs` (Beat Logged → Raw → Edited → Rendered → Exported, 4 export-URL slots), no in-app rendering.

**🎬 Auto Visual Treatment Doc (F18):** optional Beat Log checkbox, waits for the Oracle concurrency guard to clear, then auto-fires Visual Oracle's treatment-doc structure with real beat data, grounded in the same F14 filmmaker library as Director Match.

**🔀 Repurpose:** Step 1 (Oracle-message dropdown) → Step 2 (user contribution) → Step 3 `_detectPhyla()` (reads Taxonomy Tree gap scores + Encyclopedia/taxonomy_nodes) → Generate → 4 platform outputs + script → `contentProductionLive.createEntry()`. Repurpose's output becomes Content Production Live's input; `conidPot`'s "Activate ConID" converges on the same `createEntry()` endpoint from a second entry point.

### Known open issues
- F16 and F17/F18 shipped July 13, not yet hand-tested by hand (see Smoke-Test Backlog in `patch_notes.html`).

---

## Schedule System (independent track — no Taxonomy dependency)

`rpgace_shifts` ↔ `shiftSync` ↔ `rpgace_agendas` → Weekly/Daily/Monthly Calendar → `scheduleToCalendar()` (single write path, extended with `source_type`/`source_id` so any block can link back to its origin module).

**🔔 Reminder** (`agendaReminder`) — third button alongside Start/Done on Daily Grid blocks, reads the block's own stored title/description/category/duration/XP straight from `localStorage.rpgace_sched_agendas`, no Oracle call, no Supabase read.

**📅 Schedule Oracle (F11, Phase 1 shipped):** 3 entry points (direct-launch button, chat-mode `schedule oracle:`/`schedule this:`/`learn later:` prefix intercepting `sendChat()`, panel's own paste field) → `scheduleOracle._ingest()` → `/api/scout` (URL detect + Jina fetch) ⋯> `/api/analyst` (type-aware analysis) → sequential 3-option reveal, one at a time: Save to Encyclopedia → Schedule a session (real Schedule modal, pre-filled) → Queue for Taxonomy Tree (same `silentPropose()` path Encyclopedia's button uses). **Phase 2 (F12 — carousel toggle, two-tier session memory, auto-routing confidence gate) is not started**, explicitly depends on F11 proving out first.

**n8n rota sync (F10):** `n8n/rota_sync_workflow.json` (Cron trigger → Execute Command running `scripts/fourth_rota.py`, which now reads `.fourth_credentials` if present). Two manual "press Enter" login-confirmation gates and a manual-console-paste step (no direct Supabase write) are deliberately untouched — not yet test-run against a real unattended execution.

---

## Shared Touchpoint Cross-Reference

Grouped by **shared destination**, not by domain — anything in the same row already talks to the same place; wiring a new feature to read/write there joins the cluster with zero new plumbing.

| Shared Touchpoint | Writers | Readers | Note |
|---|---|---|---|
| **`taxonomy_tree` + `taxonomy_proposals`** | See Taxonomy Pipeline's 4 writers + Phylum Path | Knowledge Gap Tracker, contentRepurpose (`_detectPhyla`), Visual Oracle, `taxonomy_map.html` | The system's real source of truth for "what do I know / what's a gap" — new features should read here directly, not build a second store |
| **`content_productions`** | contentRepurpose (create), conidPot (activate), all ConID buttons (update) | Dashboard ConID widget, Oracle bar | The project-tracker spine — F15/F16/F17/F18 all extended this table's columns rather than creating a parallel one |
| **`conid_pot`** | conidPot.saveIdea (Oracle panels + text-select) | Idea Bank display, Morning Brief (day-rotation), contentRepurpose dropdown | Repurpose's dropdown still parses raw `chat-msgs` instead of reading `conid_pot` directly — the one remaining "grabs the wrong idea" gap, would resolve permanently if pointed at the table instead |
| **Oracle API** (`sendToOracle`) | Every panel, every quick action, Feynman, Morning Brief, Beat Log, Repurpose, Schedule Oracle, Phylum Path | The chat display itself | True hub — see Oracle Pipeline section above for current state, guards, and open issues |
| **`video_jobs`** | Beat Log (`_submit()`) | F16 (Beatstars listing), F17 (Video Pipeline tracker) | Table didn't exist until July 13 — see Content Production Pipeline |
| **`chat-msgs` DOM** (not a database) | Every Oracle response append | `RPGACE.utils.getRecentOracleMessages(n)` (F1 — collapsed 3 independent DOM-parsers into one shared helper) | Resolved: contentRepurpose, conidPot, and the Save-Idea injector all now share one implementation instead of three |

---

## Encyclopedia ↔ Taxonomy Tree Link

`encyclopedia.taxonomy_node_id` (nullable uuid, added for F7) makes the two tables a navigable pair in both directions: an Encyclopedia entry can point to the tree node it generated, and a tree node reached via Phylum Path's article generation points back to the entry that documents it. Two entry points into the same `taxonomy_proposals` queue — automatic (sync-triggered, silent, batched) and manual (🌳 Propose to Taxonomy button, per-entry, immediate) — both land in the same review popup.

---

## Future Integration Vision (a-f) — confirmed direction, not yet scoped

Full detail in `patch_notes.html`'s Tier 6. One-line summary per item, each extending an existing touchpoint above except (e):
- **(a)** Social platform integrations — extends Composio connectors
- **(b)** Video editing/scripting integration — extends F17/F18 (Content Production Pipeline)
- **(c)** Full learning environment — unifies Feynman + Encyclopedia + Taxonomy Tree into one curriculum
- **(d)** Auto-logging videos/beats/career progress — extends Journal + Content Production Live
- **(e)** Autonomous RPGACE self-improvement meta-agent — the one genuinely novel governance shape: permission required to *adopt* a new idea, no permission required to *correct* a confirmed-bad existing implementation. Needs careful scoping before any build.
- **(f)** Competitor/book insight pipeline into Taxonomy — insight → tree leaf → structured "complete outlook" summary → clickable footnote back to source (reuses `intel_bibliography`). Directly feeds the Taxonomy Sorting Agent once that ships — books/competitor research become just another proposal source alongside Oracle/Content Intelligence/Encyclopedia sync.

---

## Standing rule: Oversight

Every documentation update applies to all 4 Oversight docs by default, not only when explicitly requested — same discipline as code changes, formalized for docs. **Oversight** = Patch Notes (full narrative + F-series roadmap), this Interconnection Map (structural touchpoints, standing sections updated in place), the Full Manual (`manual.html`, polished quick-reference), and Taxonomy Map (`taxonomy_map.html`, queries `taxonomy_tree` live from Supabase every load — never needs a manual data update, only touched if its own code/columns change). See `CLAUDE.md`'s Oversight section for the durable version of this rule.
