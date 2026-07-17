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

**Normal chat grounded in the real taxonomy (built July 15, deliberate `main.js` exception).** Asked directly "which phylum is this" in ordinary conversation, Oracle invented a fictional classification (a "Kingdom" rank that doesn't exist in RPGACE, a phylum name that isn't one of the real 21) — `main.js`'s `sendChat()` system prompt (`ORACLE_SYS`) previously had zero taxonomy awareness; only the structured flows above did. `ORACLE_SYS` now reads the real 21-phylum list live from `taxonomyTree.PHYLUM_NAMES`/`PHYLUM_ENGLISH` (no duplicate hardcoded copy) and is told never to invent a category or rank outside it. Confirmed fixed live (a second real question correctly answered with a real phylum). Worth knowing: this only grounds *classification* — normal chat's actual technical content (FL Studio techniques, production advice) still comes entirely from Claude's general training, not from any RPGACE data lookup; only specific structured commands (Director Match, Beat Log's artist matching, Phylum Path's placement decision) pull real data into their prompts.

**Multi-model extractor/ground-worker pipeline (built July 16, Phylum Path's 3 Oracle calls only, so far).** `api/_context.js` now exposes `MODEL_EXTRACTOR` (`claude-fable-5`, a fast/cheap triage model) alongside `MODEL_GROUND_WORKER` (still `claude-sonnet-4-6`, the already-verified model — never guessed a new identifier); `callClaude()`/`api/oracle.js` both accept an optional `model` field, defaulting to the existing model when omitted, so every other Oracle caller in the app (native `callOracle()` chat included) is unaffected. `decidePlacement()`, `_generateInsightContent()`, and `_generateArticle()` each now run a fast Fable 5 outline pass first, then hand that outline to the ground-worker call as a "starting hint — verify and override" addition, with a `.catch()` fallback to ground-worker-alone if the extractor call fails. Not phylum-specific — applies wherever Phylum Path itself is enabled, currently just Phylum 1.

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

**"Old feeds new" — brain-selection routing (built July 15, live bug fix).** `proposeLineage()`/`silentPropose()` had zero real structural awareness beyond exact-name matching (`_checkForMorph`) — confirmed live to create a duplicate Order ("Harmony & Chord Theory") beside the pre-existing "Harmony" Order for near-identical content. Both now check `phylumPath.isEnabled(phylumNumber)` at the top and, for any phylum Phylum Path covers (still just Phylum 1), delegate the actual placement decision to its structure-aware 5-check reasoning instead of running their own flat generation. The 4 writers above are unchanged — only *how the destination gets decided* changed, and only for phylum 1. `silentPropose`'s Phylum-Path route still writes into the same `taxonomy_proposals` table, tagged `proposed_steps.engine: 'phylum_path'`.

**Review layer:** Dashboard "🌳 X taxonomy proposals waiting" badge (`taxonomyReviewQueue`) — batch popup, Accept/Edit/Reject per row. Legacy rows still reuse `_acceptLineage()`/`_showProposalPopup()` unchanged; rows tagged `engine: 'phylum_path'` are detected and routed through two new handlers (`_acceptPhylumPathProposal`/`_editPhylumPathProposal`) that reconstruct the real attach node by id and call `phylumPath._insertNewSteps()` instead — one queue, two engines, visually labeled ("🧬 Phylum Path ·" prefix). Accept on an Encyclopedia-sourced legacy proposal does a two-table write (new tree node + `taxonomy_node_id` back-reference on the originating `encyclopedia` row) — the one place accept-a-proposal isn't a single atomic insert.

**Rank naming:** `taxonomyTree.RANK_NAMES` / `rankNameForDepth(depth)` — Phylum/Order/Class/Family/Genus/Species/Variant by depth index. Previously a `taxonomy_map.html`-only display convention; now a real shared helper the live app reasons with (first consumer: Phylum Path).

**Phylum-matching / keyword scoring (`RPGACE.utils._PHYLA_KEYWORDS`):** full 21-phylum coverage, weighted terms (2=specific, 1=generic), word-boundary regex matching, shared threshold `PHYLA_MATCH_THRESHOLD` (3) — consumed by `_quickPhylaScan`, `isPlausiblePhylum`, and `contentRepurpose._detectPhyla` (all three converged onto one scorer; a fourth independent list, `taxonomySync.PHYLUM_MAP`, does a genuinely different job — bulk single-best-match classification into the older `taxonomy_nodes` table — and was deliberately left separate). Phylum 1 (Compositio) carries ~140 weighted terms vs. 6-8 for every other phylum — a deliberate, flagged asymmetry seeding the Phylum Path pilot (see below).

**🧬 Phylum Path** — bottom-up insight→article pipeline, direction-inverted from `proposeLineage`/`silentPropose`'s top-down one-shot placement. Piloted on Phylum 1 only; confirmed hand-tested July 15 (panel open, insight placement, auto-detect badge all pass — see patch_notes.html for full results). `decidePlacement()` (split out from the old combined `_placeInsight()`, reused by `proposeLineage`/`silentPropose` too, see "old feeds new" above) asks Oracle to pick an attach point (exact-path match, extending `_checkForMorph`'s duplicate-check idea to per-rank attachment) and however many new ranks are genuinely needed, reasoned through 5 explicit checks (pedagogical clarity / non-redundancy / practical applicability / structural fit / expansion headroom) — this project's Council-of-5 convention operationalized as an actual prompt instruction. **Confirm/deny/modify checkpoint (built July 15):** `_showPlacementConfirm()` now sits between decision and insert — shows the attach point (read-only) plus the new steps (editable/removable/insertable, same "+ Insert step" convention as the old popup), Accept/Reject — Phylum Path previously wrote straight to `taxonomy_tree` the instant Oracle decided, the one proposal path in RPGACE that had no human checkpoint at all. On accept, `_insertNewSteps()` chains new rows in via the same `Prefer: return=representation` pattern as `_acceptLineage`. `_generateArticle(node)` synthesizes a node + its descendants into a real Encyclopedia entry via `saveOracleToEncyclopedia()`, linked back via `taxonomy_node_id` — no new storage invented. Auto-detect entry point subscribes to a shared `RPGACE.hooks` event (`oracle:response-scanned`, fired from `_runPhylaScan`) rather than owning its own `MutationObserver`. **Highlight-to-Phylum-Path (built July 15):** reuses main.js's native `#text-select-popup` (same one `conidPot`'s "Save as Idea" button extends) to add a "🧬 Send to Phylum Path" button on any text selection (Oracle chat, Encyclopedia), opening the panel pre-filled.

**Dedicated nav tab + Linnaean drill-down (built July 16, "Phase 2").** New "🧬 Phylum Path" tab in the main nav (dynamically injected, no `main.js` change — `showPage()` is already page-name-agnostic), replacing the old flat scrolling list with real drill-down browsing: tap a node to descend into its children, breadcrumb to jump back up, sibling chips to browse sideways at the same depth (the "Circles" rabbit-hole nav idea, folded in directly). Articles are lazy + cached — checks Encyclopedia via `taxonomy_node_id` before ever calling Oracle, regenerates only on explicit "Refresh" tap. **Real bug found + fixed the same day:** the tab appeared to not render at all after shipping (not a caching issue, confirmed via incognito) — root cause was `RPGACE.register()`/`RPGACE.hooks.fire()`'s `rpgace:ready` re-subscription pattern (see Known open issues below), not the injection code itself, which was correct all along. Also fixed same day: no cache-busting query string on either script tag (added `?v=20260716a`), and a contradictory mobile `.nav-tab` CSS rule (`flex:1` inside `overflow-x:auto`) causing tab-label overlap/clipping.

**Canonical phylum labeling — shared touchpoint.** `taxonomyTree.PHYLUM_PURPOSE` (one-line role per phylum) + `RPGACE.utils.phylumLabel(num)`/`phylumContext(num)` are the single source of truth for how a phylum's name renders anywhere in the live app or in an Oracle prompt (see Oracle Pipeline above). Path breadcrumbs inside a generated lineage stay Latin-only by design — that convention is unchanged.

**Bridged phyla (reuse-before-invent):** Phylum 11 (Lingua Musicae) ← `beatLog.SCALE_COLOURS` (10 rows, `source='beatlog_scale_colours'`); Phylum 16 (Venditionis Beatorum) ← F16's 3 licence-term texts (`source='f16_licence_terms'`); Phylum 14 (Visio Cinematica) ← the 50-entry filmmaker library (`source='f14_filmmaker_library'`, read by Visual Oracle's Director Match).

**Phylum 1 data state:** 23 original rows had flat `parent_id: null` (pre-July-12 bug) — backfilled via `path`-matching, zero orphans remaining. One garbage-named leaf (a 298-char quest-plan blob) cleaned up. 32 new rows added from a 90-term jargon sweep, organized under the 5 existing Orders plus a new 6th ("Genre & Production Vocabulary"), tagged `source: phylum_path_manual`. Two artist/track-specific leaves (Dave x Central Cee, Endshpiel & Miyagi) were moved **out** of the tree into `encyclopedia` case-study entries (`source: 'taxonomy_case_study'`, linked back via `taxonomy_node_id`) — the tree classifies general reusable concepts only, case studies belong in Encyclopedia. Current row count: 53. A dedicated "case study" phylum for this pattern is a **deferred future idea**, not yet scoped (see `/root/.claude/plans/woolly-watching-lamport.md`).

**🔗 Fusion links (built July 16) — cross-taxonomy connections, any rank, any phylum.** New `taxonomy_links` table (`node_a_id`, `node_b_id`, `link_insight` one-sentence explainer, `status` pending/confirmed/rejected) — symmetric by construction, one row shown identically from either node's side, answering a gap the strict one-parent tree can't represent (the same idea usefully showing up in more than one branch, or two separate ideas combining into a real technique). `phylumPath._findFusionLinks()` runs the same extractor/ground-worker pipeline as the module's other 3 Oracle calls, fires fire-and-forget right after `_insertNewSteps()` lands a new leaf, searches the ENTIRE tree (all phyla) for genuine connections, stages candidates as `pending`. `taxonomyReviewQueue` renders pending links as a "🔗 Fusion Link" card in the same badge/popup as `taxonomy_proposals` (Confirm/Reject only). Confirmed links render in the Phylum Path drill-down view (`_renderFusionLinks`), click-to-jump only when both ends sit in the currently-enabled phylum. New nodes only going forward — no retroactive scan of the existing tree. First 2 real links seeded for the "Theory-to-Emotion Connection" leaf (Compositio) → Anatomia's Theory vs Composition Distinction and Lingua Musicae's Visual Identity & Mood Mapping.

**The Phylum Development Framework (codified July 16) + Percussio (Phylum 2), framework pass 1.** The Phylum 1 build process, generalized into 7 repeatable steps (spec pass → keyword sweep → tree build → data repair → enable Phylum Path → fusion-link pass → hand-test), full detail in `/root/.claude/plans/woolly-watching-lamport.md`. Percussio (previously 0 rows) is the first phylum run through it: keyword sweep done (8 → 194 terms across Drum Elements/808s & Bass Percussion/Rhythm & Pattern Construction/Time Signature & Subdivision/Genre-Specific UK Drill & Trap Jargon/Mixing-Processing Percussion/DAW-FL Studio-specific), tree built (39 rows, 4 Orders → 9 Species leaves), both done directly against Supabase/the codebase.

**Sonus Designatio (Phylum 3), framework pass (built July 17).** Third phylum through the Phylum Development Framework: keyword sweep 7 → 150 terms across 8 categories, data repair on the existing "Synthesizers" branch (same flat-`parent_id` pattern as Phylum 1's original bug, 5 rows backfilled via path-matching), tree build (42 new rows extending 2 existing Orders + 2 new Orders, 11 → 53 total). A real cross-phylum keyword-collision check was run before adopting the new list (parsed every phylum's live keyword list, checked for exact bare-term matches across all 21) specifically to test whether Sonus Designatio's sound-design vocabulary collides with Visio Cinematica's filmmaking vocabulary (both use words like "atmospheric"/"cinematic"/"eerie") — result: zero exact shared bare terms between the two. Real overlaps exist instead with the genuinely adjacent crafts Percussio, Compositio, and Mixtura, all legitimate shared technique vocabulary (e.g. `glide`/`portamento` describe the same real technique in both 808 programming and synth envelopes), not false-positive bleed. Not yet enabled for Phylum Path (just needs a 3rd `ENABLED_PHYLA` entry) or hand-tested.

**Mixtura (Phylum 4), framework pass (built July 17).** Fourth phylum through the framework: keyword sweep 8 → 151 terms across 8 categories, data repair on the existing "Vocal Processing" branch (same flat-`parent_id` pattern, 3 rows backfilled), tree build (41 new rows extending the existing EQ Order + 5 new Orders, 7 → 48 total). Same collision-check discipline as Phylum 3, this time testing the flagged "space"/"depth"/"clarity" concern against Visio Cinematica - result: none of those words exist as bare keywords anywhere across all 21 phyla (always compound phrases), so no literal collision. Real overlaps found are genuine adjacent-craft vocabulary with Percussio, Sonus Designatio, Magistra (mastering) and Sensus Auris (reference/critical listening).

**Magistra (Phylum 5), framework pass (built July 17).** Fifth phylum through the framework: keyword sweep 6 → 113 terms across 9 categories. Same collision-check discipline as Phylums 3/4, this time testing "balance"/"character"/"warmth" against Visio Cinematica's visual/grading vocabulary - zero bare-term collisions, same pattern holding. Real finding: Magistra and Mixtura share 14 exact bare terms, the heaviest overlap of any two phyla in this exercise (mastering is genuinely downstream of mixing). Made an explicit call rather than leaving it ambiguous: removed `loudness war`/`streaming loudness target` from Mixtura (final-delivery concerns, not mixing ones) and kept them Magistra-exclusive, while leaving genuinely dual-stage terms (limiter, headroom, glue compression, shared plugins) in both phyla as legitimate signal. No data repair needed (0 pre-existing rows). Tree build: 54 new rows across 6 Orders.

**Phylum Path generalized to multiple phyla (built July 17) — Percussio, Sonus Designatio, Mixtura & Magistra all enabled together.** `phylumPath.PHYLUM_NUM` (a single hardcoded scalar threaded through ~10 places) is now `ENABLED_PHYLA: [1, 2, 3, 4]` + mutable "currently active phylum" UI state. `isEnabled()` checks list membership instead of equality — `proposeLineage()`/`silentPropose()`'s existing routing check automatically covers all 4 new phyla with no separate change. New `_switchPhylum()`/`_renderPhylumSwitcher()` — a pill row (one per enabled phylum, now 5) in both the side panel and the nav-tab page — updates the active phylum and re-fetches whichever view is actually visible. Auto-detect (`_checkLastResponse`) now checks every enabled phylum's score instead of only Phylum 1's, opening the panel pre-scoped to whichever phylum's keywords matched. Deliberately pushed each new phylum live the same session it was built, a departure from the original "one at a time, review before next" pacing used for Percussio alone. Extending to a 6th phylum going forward is just adding a number to `ENABLED_PHYLA` once that phylum clears framework steps 1-4 — no further UI rework needed.

### Known open issues
- **`_generateNodeContent()`'s `deep_content` empty-leaf mystery — partially resolved.** July 15 testing confirmed `deep_content` is *not* always empty — Phylum Path's own content-gen call (`_generateInsightContent`, a separate function) produced real content on a live insight. The original mystery (why `_generateNodeContent` specifically comes back empty) is unconfirmed either way — not re-tested this session, still flagged as open.
- **Oracle 504 timeout — now reproduced concretely, still unfixed.** `phylumPath._generateArticle()` (`max_tokens:1800`) failed outright with a JSON-parse error (Vercel timeout page instead of JSON) during July 15 testing. Real data point: failure scales with requested length (700 tokens worked, 1200 truncated, 1800 failed outright). Mitigated for Phylum Path's 2 calls via trimmed asks + lower token ceilings (same pattern as the July 14 `_generateNodeContent` trim) — the underlying timeout itself is still untouched, needs a dedicated fix (streaming/chunking), not another blind trim.
- **`phylumPath.PHYLUM_NUM` generalization — shipped July 17, all 4 phyla live.** See the "Phylum Path generalized" paragraph above. Not yet hand-tested.
- **`RPGACE.hooks`/`rpgace:ready` re-subscription bug — found July 16, ~25 places flagged, not audited.** `RPGACE.register()` wires every module's `init()` as a listener on `'rpgace:ready'` itself, so `init()` only runs because that event already fired — but `RPGACE.hooks.fire()`'s plain `Array.forEach` never revisits listeners pushed onto the array during its own iteration. Any module calling `RPGACE.hooks.on('rpgace:ready', ...)` from inside its own `init()` can silently never have that listener fire. `phylumPath`'s 2 occurrences (side-panel button, nav tab) were fixed by calling the injector functions directly instead. Grep found ~25 more occurrences of the same call elsewhere in `rpgace_core.js` — each needs checking individually (called from inside that module's own `init()` = the bug; called from elsewhere reacting to another module's readiness = fine). Not audited this pass.
- **Taxonomy Sorting Agent — biggest confirmed-not-built item.** One classification agent (not per-node AI): given any insight, maps it onto an existing tree path or invents a new one, always via accept/reject/modify. AI cost confined to exactly 2 touchpoints (the classification call + the Council-of-5 justification text shown at Lineage Proposal time) — the tree itself stays pure static data, zero AI cost per browse/display. A planned "book knowledge" Supabase table (queryable by any domain, Oracle included) and a read-only "Jargon Encyclopedia" view over tree leaves both depend on this shipping first.
- **Phylum Path Phase 2 drill-down UI — shipped July 16, see the Phylum Path paragraph above** (dedicated nav tab, Linnaean drill-down, sibling "Circles" browsing) — no longer parked, now live for Phylum 1.
- **Claude general-knowledge audit (parked, not built)** — 3-part future idea: expand taxonomy from Claude's general training (not just gathered insights), score how relevant that general knowledge actually is to this specific niche discipline, and audit Claude's own claims for assumption/contradiction against real gathered insights. No design decisions made.

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
