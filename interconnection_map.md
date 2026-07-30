# RPGACE Interconnection Map

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

**Entry points (all funnel into `RPGACE.utils.sendToOracle()` / `sendChat()`):** 4 panels — 🎛 Prod Oracle (14 commands), 🎬 YouTube Oracle (8 commands), 📸 Insta-Oracle (13 commands), 🎬 Visual Oracle (6 commands, grounded in the Phylum 14 filmmaker library — see Taxonomy Pipeline); 🔀 Repurpose (3-step popup); Beat Log's artist-matching brief; Morning Brief; Feynman phase dialogue; Agents tab (New Quests, Draft Email, YT Stats); Schedule Oracle's 3 entry points; Phylum Path's insight-placement + article-generation calls.

**Global taxonomy auto-scan (shipped, live):** every completed Oracle response is scanned client-side the instant `send-btn.disabled` flips back to `false` (no completion callback exists in `sendChat()`, so this signal is reused instead). 3-layer stack: (1) cheap local keyword scan always runs, zero Supabase cost; (2) confidence gate — only surfaces on 2+ phyla matches or 1+ gap-relevant concept; (3) silent "🌿 N topics" badge, click-to-expand pulls real gap scores from `taxonomy_tree`. This is the single passive link from every Oracle response back into the Taxonomy Tree hub.

**Concurrency guard (shipped):** `sendChat()`'s `send-btn.disabled=true` was only a visual guard — nothing stopped a second call firing programmatically while one was pending, and two overlapping calls shared one global `STATE.chatHistory` + one fixed `#typing-indicator` id, so whichever resolved first stole the other's response. Fixed via `window._oracleRequestInFlight`, checked first in `scheduleOracle._injectEntryPoints()`'s existing `sendChat` wrap — a second call while one's pending is blocked with a toast instead of firing concurrently.

**Canonical phylum labeling in prompts:** `RPGACE.utils.phylumContext(num)` (Latin/English name + one-line purpose) is prepended to every Oracle-bound prompt that names a phylum — `proposeLineage()`/`silentPropose()`'s "ROOT PHYLUM" line, Phylum Path's persona opener, Visual Oracle's Director Match. Short UI-only labels use the lighter `phylumLabel(num)` instead (no purpose line, no Oracle cost).

**Normal chat grounded in the real taxonomy (built July 15, deliberate `main.js` exception).** Asked directly "which phylum is this" in ordinary conversation, Oracle invented a fictional classification (a "Kingdom" rank that doesn't exist in RPGACE, a phylum name that isn't one of the real 21) — `main.js`'s `sendChat()` system prompt (`ORACLE_SYS`) previously had zero taxonomy awareness; only the structured flows above did. `ORACLE_SYS` now reads the real 21-phylum list live from `taxonomyTree.PHYLUM_NAMES`/`PHYLUM_ENGLISH` (no duplicate hardcoded copy) and is told never to invent a category or rank outside it. Confirmed fixed live (a second real question correctly answered with a real phylum). Worth knowing: this only grounds *classification* — normal chat's actual technical content (FL Studio techniques, production advice) still comes entirely from Claude's general training, not from any RPGACE data lookup; only specific structured commands (Director Match, Beat Log's artist matching, Phylum Path's placement decision) pull real data into their prompts.

**Multi-model extractor/ground-worker pipeline (built July 16, Phylum Path's 3 Oracle calls only, so far).** `api/_context.js` now exposes `MODEL_EXTRACTOR` (`claude-fable-5`, a fast/cheap triage model) alongside `MODEL_GROUND_WORKER` (still `claude-sonnet-4-6`, the already-verified model — never guessed a new identifier); `callClaude()`/`api/oracle.js` both accept an optional `model` field, defaulting to the existing model when omitted, so every other Oracle caller in the app (native `callOracle()` chat included) is unaffected. `decidePlacement()`, `_generateInsightContent()`, and `_generateArticle()` each now run a fast Fable 5 outline pass first, then hand that outline to the ground-worker call as a "starting hint — verify and override" addition, with a `.catch()` fallback to ground-worker-alone if the extractor call fails. Not phylum-specific — applies wherever Phylum Path itself is enabled, currently just Phylum 1.

**Oracle self-awareness + two-way Claude Code bridge — current architecture.** `oracleAppGrounding` reads `dashDeck.MODULES` + a hand-maintained status digest + a live `_liveFactsLine()` (module count, pending-review count, 5 most recent `system_updates` rows, latest `/impeccable` design-scan result), injected into the system prompt only when a message is capability/roadmap-shaped. `oracleFetchGuard` wraps the same prompt-build function unconditionally, marking `[FETCHED CONTENT...]`/`[INSTAGRAM POST...]`/`[YouTube Video...]` blocks as data, never instructions. `oracleDevBridge` adds a "🧪 Flag for Claude Code" button on substantial replies, writing to `oracle_dev_suggestions` — the one path from the app back into a Claude Code session. `phylumPath._insertNewSteps` fire-and-forget writes to `taxonomy_decision_log`, an append-only audit trail independent of which taxonomy pipeline produced the commit. Outside the app: a daily Claude Code Remote Routine (`trig_015uRjGVrdmiwc5zxq47mMA6`) queries Supabase directly and writes a Morning Brief into `journal`. Full build history in patch_notes.html.

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

**The Phylum Development Framework** — the repeatable 7-step process (spec pass → keyword sweep → tree build → data repair → enable Phylum Path → fusion-link pass → hand-test) every phylum goes through before Phylum Path covers it. All 10 of `ENABLED_PHYLA` (Compositio through Psychologia) have cleared it — keyword-collision checks between adjacent crafts are run as a standing step and have never found a real bare-term collision across all 21 phyla (always compound phrases or genuine shared technique vocabulary between adjacent crafts). Full per-phylum build history (keyword counts, tree sizes, hand-test cases) lives in patch_notes.html; not repeated here.

**🌌 Concept Fusion** — `phylumPath._findConceptFusion(node, articleText)`, triggered off `_generateArticle()`'s success path for any node above a leaf. Distinct from leaf-level fusion links: instead of linking two existing things, it asks whether a distant cross-phylum branch genuinely combines with this one into a NEW teachable concept, proposing a real new leaf via `taxonomy_proposals` (`engine: 'concept_fusion'`). Accepting creates the node plus 2 confirmed `taxonomy_links` rows back to both sources.

**Phylum Path's UI** — grouped vertical phylum switcher (`taxonomyTree.PHYLUM_SCOPE_GROUPS`, only showing groups with an enabled member), drill-down with an explicit Back button, article generation gated behind a confirm popup (the same checkpoint pattern as insight placement), and fusion-link "interlink articles" (`_showLinkArticle()`) synthesizing how two linked concepts combine. `ENABLED_PHYLA` is a plain array — extending to an 11th phylum is adding a number once that phylum clears the framework, no UI rework needed.

**Bookworm** — whole-book ingestion into Phylum Path, chapter by chapter. `bookworm` module + `api/bookworm-fetch.js`. Three entry points converge on one `_createBookFromExtraction()` insert path and one `_renderStructureFound()` confirmation screen: paste a URL (one uncapped Jina fetch, separate from `api/scout.js`'s 8000-char-capped path), paste a table of contents manually (`_startBookFromTOC()`, with `_looksLikeTableOfContents()` guarding against pasting a TOC as chapter-1 body text), or upload a PDF (`_startBookFromPDF()`, extracted entirely client-side via a runtime-loaded PDF.js — the raw file never leaves the browser). Chapter detection is Oracle-primary (semantic reading of the TOC, self-verified against 5 explicit checks) with a fully deterministic, zero-model mechanical fallback for locating each chapter's real position in the body text (`resolveChapterHeadingsMechanically()`, character-fuzzy-matched, reading-order-bounded) — the original regex/body-recall approach was replaced outright after proving structurally unreliable against real PDF-extracted text, not patched. Per chapter: `_analyzeChapter()` extracts every distinct insight, cascades each through `decidePlacementScored`'s Council-of-5 scored reasoning across its most-related phylum then the rest, with a reword-retry loop for mediocre scores. Review is per-insight (Approve/Reject/Edit), checkpointed so exiting mid-book resumes exactly where you left off; only awaits the first insight, continuing the rest via `_continueAnalyzingInBackground()` so a chapter's insights stream in rather than blocking on the whole batch. Completed books land in a Bibliography section on the Research page (`bibliography` table). New tables: `bookworm_books`, `bookworm_chapters`, `bibliography`. Copyright discipline (CLAUDE.md rule 7) has been exercised for real — shadow-library and "complete with files" sources are declined outright regardless of a claimed separate purchase.

### Known open issues
- **`_generateNodeContent()`'s `deep_content` empty-leaf mystery — partially resolved.** July 15 testing confirmed `deep_content` is *not* always empty — Phylum Path's own content-gen call (`_generateInsightContent`, a separate function) produced real content on a live insight. The original mystery (why `_generateNodeContent` specifically comes back empty) is unconfirmed either way — not re-tested this session, still flagged as open.
- **Oracle 504 timeout — now reproduced concretely, still unfixed.** `phylumPath._generateArticle()` (`max_tokens:1800`) failed outright with a JSON-parse error (Vercel timeout page instead of JSON) during July 15 testing. Real data point: failure scales with requested length (700 tokens worked, 1200 truncated, 1800 failed outright). Mitigated for Phylum Path's 2 calls via trimmed asks + lower token ceilings (same pattern as the July 14 `_generateNodeContent` trim) — the underlying timeout itself is still untouched, needs a dedicated fix (streaming/chunking), not another blind trim.
- **`phylumPath.PHYLUM_NUM` generalization — shipped July 17, all 4 phyla live.** See the "Phylum Path generalized" paragraph above. Not yet hand-tested.
- **`RPGACE.hooks`/`rpgace:ready` re-subscription bug — found July 16, ~25 places flagged, not audited.** `RPGACE.register()` wires every module's `init()` as a listener on `'rpgace:ready'` itself, so `init()` only runs because that event already fired — but `RPGACE.hooks.fire()`'s plain `Array.forEach` never revisits listeners pushed onto the array during its own iteration. Any module calling `RPGACE.hooks.on('rpgace:ready', ...)` from inside its own `init()` can silently never have that listener fire. `phylumPath`'s 2 occurrences (side-panel button, nav tab) were fixed by calling the injector functions directly instead. Grep found ~25 more occurrences of the same call elsewhere in `rpgace_core.js` — each needs checking individually (called from inside that module's own `init()` = the bug; called from elsewhere reacting to another module's readiness = fine). Not audited this pass.
- **Taxonomy Sorting Agent — this is not a separate agent, book and non-book insights share one placement engine.** `bookworm._decidePlacementScored` is a one-line pass-through to `phylumPath.decidePlacementScored` — the same function `encSync`/`ciAutoPropose` call for non-book inputs. `book_knowledge` (a `security_invoker` view unnesting `bookworm_chapters.insights`, approved rows only) and `jargon_encyclopedia` (a `security_invoker` view over `taxonomy_tree WHERE node_type='leaf' AND status='accepted'`) are both real, zero-new-table read surfaces over this shared data — Jargon Encyclopedia surfaces as a button inside Phylum Path's page.
- **Phylum Path Phase 2 drill-down UI — shipped July 16, see the Phylum Path paragraph above** (dedicated nav tab, Linnaean drill-down, sibling "Circles" browsing) — no longer parked, now live for Phylum 1.
- **Claude general-knowledge audit — redesigned, not built as originally scoped, July 22.** The original 3-part idea (seed the tree from general knowledge, score relevance, audit assumptions) was interrogated: Alex confirmed general/generic Claude knowledge should never be injected into the tree directly. Redesigned around a new `/debate` skill (`.claude/skills/debate/SKILL.md`) — structured adversarial rounds comparing Claude's general training against a specific real gathered insight, producing a comparison only; nothing gets written to the tree as a side effect of running a debate, a "won" debate still requires a separate, explicit build decision afterward. Not yet run on a real topic — Alex asked to hold off rather than pick one this pass.

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
- **(f)** Competitor/book insight pipeline into Taxonomy — insight → tree leaf → structured "complete outlook" summary → clickable footnote back to source (reuses `intel_bibliography`). The shared placement engine this depends on already exists (see "Taxonomy Sorting Agent" above, corrected July 22) — books/competitor research can already become just another proposal source alongside Oracle/Content Intelligence/Encyclopedia sync; this item is now genuinely just the bibliography-footnote UI work, not blocked on any agent.

---

## Bookworm ↔ Phylum Path — confirmed live end-to-end

Bookworm's insight-review loop (`_analyzeChapter` → `_placeInsightCascade` → `_decidePlacementScored` → `_renderInsightReview`'s Approve/Reject/Edit checkpoint → `phylumPath._insertNewSteps`) has run end to end in production on real books, including real approvals and rejects. Chapter-boundary detection for PDF-sourced text is Oracle-primary with a deterministic mechanical fallback (see Taxonomy Tree Pipeline above for the current architecture) — the original body-text-recall approach that preceded it is gone from the codebase entirely, not deprecated.

---

## Unified placement engine

`phylumPath.decidePlacementScored(insightText, phylumNumber, priorLeaves)` is the single placement engine for the whole app — `decidePlacement` is a thin wrapper over it, `bookworm._decidePlacementScored` delegates to it, and `taxonomyTree.proposeLineage`/`silentPropose` both route through it unconditionally for every phylum, including ones Phylum Path doesn't otherwise cover. Every placement decision is exactly one ground-worker call, structure-aware, 5-check-scored. Mechanical guard: `phylumPath.sanitizePlacement` runs on every engine decision AND inside `_insertNewSteps` (the single write choke point) — path-like steps, duplicate ranks, and depth>6 placements are stopped regardless of caller, including raw human Edit-box input. Rules + evidence: `taxonomy_placement_rules.txt` (repo root).

---

## Dashboard architecture — `dashDeck`

The dashboard is a `dashDeck` module — a command-card grid (each card either `showPage()`s to a real page or opens a widget popup) plus a "Needs you now" panel. The defining pattern is **live-node relocation, not rebuild**: `_ensureStash`/`_stashWidget(id, force)`/`_widgetPopups`/`closeWidgetPopup` move an already-injected widget's *actual DOM node* into a card popup on open and stash it back on close, preserving live state/bindings instead of re-rendering. `bookworm`, `knowledgeGap`, `contentProductionLive`, `videoPipeline`, and `morningBrief` widgets all live inside dashDeck popups this way. Each widget's own module owns injecting its DOM node straight into the shared `#dd-stash-holder` (never onto the raw dashboard) — this is the one correct pattern, since dashDeck's own boot task runs before every other module's in registration order, so a widget that injects onto the raw page and waits for dashDeck to retroactively stash it will render loose on first paint (a real bug found and fixed twice this way, for `videoPipeline` and `morningBrief`, on top of `contentProductionLive`'s already-correct July 20 original). **z-index contract, load-bearing for any new popup work**: dashDeck popups sit at **99999**, above the 9998/10110 side-panel/drawer/toast tier — any button inside a dashDeck popup that opens one of those lower surfaces must call `closeWidgetPopup(id)` first or it opens behind the popup. `_openOversight` lists all 7 oversight docs.

## Content Pipeline overseer — `content_productions` ↔ `video_jobs` ↔ `style_profiles`

`content_productions` (Content Pipeline/ConID, stages Idea→Scripted→Filmed→Edited→Posted→Analysed) is the real overseer of the beat-to-posted-video journey; `video_jobs` (F17, stages beat_logged→raw_footage→edited→rendered→exported) is its linked, more granular file-path sub-tracker via `video_jobs.content_production_id`. `beatLog._submit()` creates the `content_productions` row first (status `'Idea'`, real beat metadata in `creative_docs.beat_meta`), then the linked `video_jobs` row — Beat Log is Content Pipeline's real entry point, not a second orphaned tracker. Creative documents (Visual Treatment, Director Match, Storyboard, etc. — Visual Oracle's F14 commands) save into `content_productions.creative_docs` (jsonb, keyed by doc type) via `visualOracle._saveDocToProduction()`, reached either automatically (F18's auto-treatment flow, which already knows its target row) or through an explicit "💾 Save to Content Pipeline" picker on any manually-fired Visual Oracle command. A shared one-shot `visualOracle._captureNextResponse()` (built on the existing `oracle:response-scanned` hook, which only fires once per fully-completed reply — safe against mid-stream truncation) captures the real response text without a second API call. Two prompts ask Oracle for a structured trailer line the save logic parses: `DIRECTOR_CHOSEN:` (Director Match/Visual Treatment Doc) resolves the real filmmaker in `taxonomy_nodes` (`source='f14_filmmaker_library'`) into a genuine `style_profiles` row, linked via `video_jobs.style_profile_id`; `EDL_JSON:` (Storyboard Scene Builder) becomes a real structured shot list saved onto the linked `video_jobs.edl`. Both columns existed as dead, never-populated design intent before this; neither is dead now.

---

## Navigation architecture — `leftNav` drawer

Every top-level page lives in a `document.body`-appended slide-out drawer (`leftNav`, z-index 10110, backdrop 10100 — above the 9998/9999 side-panel/toast tier, below dashDeck's 99999), opened via hamburger toggle or a swipe gesture (`_initSwipeGesture`). Research Lab and Schedule expand into sub-navs; `researchTabs.show(key)` is the drawer's entry point into tab switching, firing `research:tab-changed`. Real pushState URLs (`pathRouter`) wrap `checkPassword`/`page:show`, using `vercel.json`'s existing catch-all rewrite — zero server changes. Every Research-page sub-injector appends directly to `#page-learning` (never nested inside another panel, never `firstChild`) and fires `research:panel-injected`, which `researchTabs` uses to re-sort tab visibility if a panel lands late. Each of 6 real Research Lab sub-modules only fetches its data once a `research:tab-active` hook fires for its own tab (per-session cache, not re-fetch-on-switch) — a deliberate single-tab lazy-load discipline, kept genuinely separate from the boot-task gate below (a different mechanism solving a different problem).

## The Chronicles — shared aggregation across `system_updates` + app tables

`careerStatCard` and `chroniclesLog` both consume one shared `_fetchAll()`/`_buildItems()` pair — the dashboard preview and the full log page can never drift on what counts as an "item." Every item, regardless of source table, normalizes to `{t, icon, label, type, row}` and routes through one shared detail-popup renderer (`_detailFor`/`_showDetail`, itself reusing `dashDeck._popup`). `chronicles_finance` (real sale/expense rows, personal-visibility only) and `system_updates` (Claude Code's own real changes to RPGACE) feed the same pipeline as Alex's in-app activity — one shared timeline, not two records. `bookworm_chapters` is excluded from the streak/recent-activity date logic (bulk-insert timestamp, not real completion time) and `chronicles_finance` from the XP/Level score itself — both deliberate exclusions.

## Popup scaffolding — one shared helper, project-wide

Every popup-style overlay in `rpgace_core.js` (26 real sites, spanning `phylumPath`, `bookworm`, `conidPot`, `videoPipeline`, `contentPipeline`, and the shared `RPGACE.utils.fillGaps` used by 40+ Oracle command entries) constructs its DOM via one shared `RPGACE.modules.dashDeck._popup(opts)` helper — `{eyebrow, title, width, dim, scroll, bg, borderColor, accent, noDefaultClose, onClose}` in, `{overlay, box, close}` out (`box` is the inner content div, not the outer styled card). One exception is documented and deliberate: `_showEncPopup` (Encyclopedia Preview) uses a genuinely different transform-centered/separate-backdrop/pinned-footer layout, same class of exception as `uiSlidePanel`'s own leftNav-drawer case. A future popup behavior/style fix now lands in one place instead of needing to be reapplied at up to 26 call sites.

## Oracle self-awareness digest — hand-maintained + live facts, a real cross-doc convention

`oracleAppGrounding.SELF_KNOWLEDGE` is a condensed, hand-written digest of CLAUDE.md's Current State — deliberately NOT live-parsed, to avoid a second source of truth alongside `system_flow_map.md`'s own truth table. **Standing convention**: whoever updates CLAUDE.md's Current State updates this string in the same session. `_liveFactsLine()` supplements it with real freshly-sourced facts that fail open if unavailable (module count, pending-review count, recent `system_updates` rows, latest `/impeccable` design-scan result) — see Oracle Pipeline above for the current field list.

## API auth, write-proxy, and RLS — current security architecture

Every `/api/*` call requires a shared secret (`authGate`'s global `fetch()` wrap attaching `X-RPGACE-Auth`, checked by every endpoint's `requireAuth()`). `api/data-write.js` + `RPGACE.sb.secureWrite()` route all real writes through a service-role-key server endpoint, bypassing RLS entirely at the client. **Real historical lesson worth keeping structurally**: this codebase has three distinct raw-fetch idioms for writing to Supabase (`RPGACE.sb.insert/update/del`, `fetch(RPGACE.sb.url(table))`, and an inline `RPGACE.CONFIG.supabase.url + '/rest/v1/...'` pattern) plus a fourth in `main.js` specifically (hardcoded-credential raw fetches) — a "zero remaining writes" claim must check all four, in every file, not just the most obvious idiom in the most obvious file. Full current RLS state (which tables are flipped, which are deliberately excluded and why) lives in CLAUDE.md's Security note — read that for the authoritative live state rather than this file, which only tracks the interconnection pattern.

## Claude Code fallback lane — architecture

When a shared ground-worker call detects Anthropic credit exhaustion (`phylumPath._isCreditExhaustionError`), it queues to `oracle_fallback_queue` (`_queueFallback`/`_checkFallbackAnswers` sweep) instead of failing silently. `bookworm._resumeFromFallback` continues a chapter's placement cascade; `taxonomyTree._resumeSilentProposeFromFallback` handles the simpler atomic Content-Intelligence/Encyclopedia-sync case — both delegate to a shared `resumeFallbackPlacement` rather than duplicating resume logic. An hourly "RPGACE Fallback Drain" Claude Code Remote Routine drains the queue via the same anon-key curl pattern as the Morning Brief Routine. Real, still-open risks (Routine writes would 403 silently if this table's RLS is ever flipped; a malformed answer leaves a row stuck) are tracked in CLAUDE.md's landmines section, not duplicated here.

## Cross-doc sync conventions

`api/_context.js` is the single source of truth for Composio `ACCOUNTS`/`TOOL_ALIASES`/CORS — `api/composio.js` and `api/search.js` import from it rather than keeping their own copies (a real drift between two hand-rolled copies was found and fixed once; don't reintroduce a second copy). The Minotaur Map and `system_flow_map.md` §8 must never drift independently — a change to one Claude-fallback-shaped flow updates both in the same session, per the Minotaur Map's own footnote rule.

## Shared boot-loader gate: `RPGACE.registerBootTask`

Any module's boot-time UI injection registers via `RPGACE.registerBootTask(fn)` instead of a bare `setTimeout(fn, delay)` — the boot loader's own hide logic awaits `Promise.all(RPGACE._bootTasks)` before hiding, so "no loads happen after login" is enforced project-wide from one choke point rather than per-module discipline. `page:show`/`research:tab-active` remain a deliberately separate mechanism (lazy re-injection for pages not yet visited) — not conflated with boot-time pop-in. The dashboard's "Needs you now" list (`dd-needs-list`) is the single source for pending-review counts, combining `taxonomy_proposals` and `taxonomy_links` — `taxonomyReviewQueue` keeps only `_openQueue()`'s accept/reject popup logic, which the list item calls into.

---

## /Regeneration skill — taxonomy-quality audit, not a live agent

`.claude/skills/Regeneration/SKILL.md` — a project-scoped, human-gated 3-tier audit (Tier 0: deterministic SQL structural checks; Tier 1: bounded AI judgment reusing `decidePlacementScored`'s rubric; Tier 2: generative reorganisation, explicit-ask-only). Never writes to `taxonomy_tree` directly — output is a report plus, where applicable, rows into the existing `taxonomy_proposals` review queue. Interconnects with `phylumPath` (reads its rubric, respects `ENABLED_PHYLA`), `taxonomyReviewQueue` (the only human-checkpoint path), and the Minotaur Map's River VI ("The Judgment Chamber"). Its first real pass's findings are resolved — see CLAUDE.md's Current State.

## Standing rule: Oversight

Every documentation update applies to all 4 Oversight docs by default, not only when explicitly requested — same discipline as code changes, formalized for docs. **Oversight** = Patch Notes (full narrative + F-series roadmap), this Interconnection Map (structural touchpoints, standing sections updated in place), the Full Manual (`manual.html`, polished quick-reference), and Taxonomy Map (`taxonomy_map.html`, queries `taxonomy_tree` live from Supabase every load — never needs a manual data update, only touched if its own code/columns change). See `CLAUDE.md`'s Oversight section for the durable version of this rule.
