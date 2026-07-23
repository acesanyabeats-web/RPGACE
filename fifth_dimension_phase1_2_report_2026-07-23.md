# /5thDimension — Phase 1 & 2 Evidence Report
**Run 2026-07-23. Sonnet 5 substituting for a Fable dispatch that ran out of usage credits (Alex-authorized).**
Scope: Phase 1 (what's actually built, real code/git/Supabase evidence) and Phase 2 (what's reported as done, the six oversight docs + Chronicles/`system_updates`) only. No Phase 3 debate, no rewiring plan, no edits to `rpgace_core.js`/`main.js`/`index.html`. This file is the only artifact produced.

---

## SIDE A: WHAT'S ACTUALLY BUILT (real code evidence)

### 0. Repo shape
- `rpgace_core.js`: 15,740 lines, **49** `RPGACE.register('name', {...})` modules between `/* ===MODULE:x=== */`/`/* ===END:x=== */` markers (CLAUDE.md's own "roughly 40+" is now stale-low by ~9).
- `main.js`: 4,626 lines, frozen. `index.html`: 633 lines. Exactly two `<script>` tags present (`index.html:458` `main.js?v=20260716a`, `index.html:459` `rpgace_core.js?v=20260723e`) — the two-script rule holds.
- 213 total commits in git history (`git log --oneline | wc -l`).

### main.js real structure (frozen, confirmed by direct read)
- `CORRECT_PW = 'jddj12alexpillBDE'` (main.js:7) — a plain string constant.
- `checkPassword()` (main.js:8-19): compares `pw-input.value === CORRECT_PW` **entirely in client JS**, then calls `initApp()`. No server round-trip, no token issued. Confirms the CLAUDE.md security-note claim verbatim — the password is trivially readable via view-source and the check has zero relationship to `/api/*` endpoints.
- `STATE` (main.js:24): `{xp:0, level:1, totalXP:0, tasksCompleted:0, xpRequired:[...], chatHistory:[], chatMode:'chat', importedShifts:[]}` — a plain in-memory object, no `localStorage`/Supabase write anywhere near it. Confirms "resets to zero every page load" claim.
- `QUESTS`, `SKILLS` (main.js:28, 69): hardcoded quest/skill-tree data driving `buildQS`/`buildAllQuests`/`completeQuest`/`addXP`/`levelUp`/`buildSkillTree`.
- `AGENT_ACTIONS` (main.js:81) + `buildAgentActions()`/`triggerAgent()`/`agentLog()` (main.js:126-178): 8 real Composio one-click actions, a connected-apps bar, activity log — real, not empty, per `agentsIntoOracle`'s own comment.
- `showPage(name, tab)` (main.js:690): toggles `.page`/`.nav-tab` classes, special-cases `learning`/`encyclopedia` to call `refreshEncyclopediaDisplay()`. Does **not** call `showSched()` on schedule entry (the exact bug `scheduleFixes` module's comment describes and claims to have fixed via a wrap, not a main.js edit).
- Schedule/timer/focus system: `buildTimeSlots`, `showSched`, `parseICS/CSV/Text`, `applyShifts`, `renderDailyGrid` (main.js:1848), `initAgendas`/`renderAgendas`/`markAgendaDone`/`startDoNow`/Focus-Mode timer chain (main.js:735-1058) — all real, substantial, pre-existing code main.js already had before any rpgace_core.js module layered on top.

### index.html real structure
Static `<div class="page" id="page-X">` entries, in order: `page-dashboard` (92), `page-quests` (100), `page-schedule` (125), `page-advisor` (157), `page-agents` (215), `page-learning` (241), `page-encyclopedia` (461), `page-journal` (513) — **8 static pages**, all before the two script tags as the landmine requires.
- **`#page-chronicles` does NOT exist statically in index.html.** It is created at runtime by `chroniclesLog._injectPageShell()` (rpgace_core.js:15340ish), appended to `#app` — an established, already-precedented pattern (`phylumPath._injectPageShell` did the same thing first). Real code confirms the CLAUDE.md/doc claim that Chronicles has "a full dedicated `#page-chronicles` log page" — it exists, just injected rather than static.

### Module inventory (all 49, file:line, one-line real function, doc-match note)
| Module | Line | What it actually does | Doc match? |
|---|---|---|---|
| `youtubeOracle` | 566 | Static CMDS prompt library for a YouTube-niche Oracle panel | matches manual/patch_notes descriptions |
| `prodOraclePanel` | 688 | Prod. Oracle command panel; now **16 CMDS** incl. Council of 5 (cmd 15) and /5thDimension (cmd 16) | matches patch_notes' latest counts |
| `instaOraclePanel` | 796 | Insta-Oracle content-creator command panel | matches |
| `quickActions` | 896 | Injects quick-action buttons on the Oracle page after `rpgace:ready` | matches |
| `visualOracle` | 999 | Phylum-14 (Visio Cinematica) director-match / visual-treatment CMDS | matches |
| `contentRepurpose` | 1138 | Oracle-message → repurposed multi-platform content, `_detectPhyla()` keyword scan | matches interconnection_map's Repurpose section |
| `feynman` | 1580 | Session-based Socratic/Feynman teaching prompts | matches |
| `encSync` | 2138 | Syncs Encyclopedia entries, silent auto-propose to taxonomy | matches (F5) |
| `ciAutoPropose` | 2243 | Silent `taxonomy_proposals` queueing at end of Content Intelligence sync (F4) | matches |
| `oracleTreeGrounding` | 2341 | Oracle chat reads taxonomy leaf names/explainers on keyword match | matches (July 19 "top priority" item) |
| `oracleAppGrounding` | 2439 | Oracle reads dashDeck's live cards + status digest | matches (July 22 Phase 1) |
| `oracleDevBridge` | 2527 | "🧪 Flag for Claude Code" button → `oracle_dev_suggestions` table | matches; table confirmed 0 rows live |
| `oracleFetchGuard` | 2599 | Hardens Oracle against prompt injection from fetched web content | matches |
| `researchTabs` | 2655 | Research Lab single-active-tab visibility + 7 sub-nav tabs | matches July 23 Round 3 reversal-of-reversal history |
| `leftNav` | 2815 | Hamburger + slide-out drawer, replaces old top nav-tabs bar | matches |
| `intelListBatcher` | 3166 | Registered name differs from its own marker (`uiBatchList` in comments) — shared "show more" list helper | **naming mismatch**, harmless, not doc-visible |
| `taxonomyReviewQueue` | 3190 | Dashboard batch-review popup over pending `taxonomy_proposals` (F6) | matches |
| `encTaxonomyLink` | 3553 | Per-Encyclopedia-card "🌳 Propose to Taxonomy" button (F7) | matches |
| `agendaReminder` | 3667 | 3rd Start/Done/Reminder button on Daily Grid agenda blocks (F9) | matches |
| `scheduleOracle` | 3767 | Schedule Oracle MVP: YouTube/PDF/text ingestion, 3-option reveal (F11) | matches; F11's Jina-failure bug still open per patch_notes |
| `intelDelete` | 4009 | Cascade delete across intel_reports/encyclopedia/taxonomy_nodes | matches |
| `dashDeck` | 4609 | 12-card dashboard command deck + "needs you now" panel | matches (was 11, now 12 with Chronicles folded in) |
| `intelDedup` | 5250 | Normalized-URL dedup fix for Content Intelligence rows | matches (July 19 fix) |
| `videoSummary` | 5392 | Per-video insight-summary cards on the Insights tab | matches |
| `taxonomySync` | 5731 | `PHYLUM_MAP`, bulk classification into the older `taxonomy_nodes` table | matches interconnection_map's explicit "deliberately left separate" note |
| `knowledgeGap` | 5962 | Dashboard Knowledge Gap widget | matches |
| `taxonomyTree` | 6167 | `PHYLUM_NAMES` (21 Latin phyla), tree render, proposal popups, lineage accept | matches |
| `phylumPath` | 6938 | Insight-to-article bottom-up placement pipeline, `decidePlacementScored` (the real "Council-of-5" scoring code, distinct from the chat protocol of the same name) | matches; naming collision explicitly documented in CLAUDE.md itself |
| `bookworm` | 8607 | Whole-book ingestion, chapter detection, insight review loop, `bibliography` table write on full completion | matches; `bibliography`=0 rows confirms no book has ever fully completed |
| `config` | 10337 | Sets `RPGACE.CONFIG` globals incl. Supabase URL/key, `RPGACE.sb` helper (insert/select/del), `RPGACE.hooks` | matches |
| `beatLog` | 11431 | Beat-logging with scale→colour palette mapping (Phylum 11) | matches |
| `refCorpus` | 12227 | Reference-track corpus, now gated behind `research:tab-active` (July 23 fix) | matches |
| `contentProductionLive` | 12497 | ConID live tracker + Oracle session | matches |
| `videoPipeline` | 13147 | Status-tracker-only Video Pipeline (F17), rescoped — confirmed no render engine exists anywhere in the codebase | matches; `video_jobs`=0 rows confirms "never actually persisted" claim |
| `conidPot` | 13471 | Day-based morning-brief rotation, Idea Bank | matches |
| `morningBrief` | 14093 | In-app morning brief (separate from the Claude Code Remote Routine) | matches |
| `suppressQuestPopup` | 14331 | Suppresses a legacy quest-suggestion popup | matches |
| `restoreSendChat` | 14356 | Neutralizes dead streaming-Oracle code (`RPGACE.streamOracle = null`) | matches; still-open tech-debt item confirmed live in patch_notes |
| `docsLinks` | 14372 | Injects oversight-doc links on the dashboard | matches |
| `shiftSync` | 14451 | External Python-script shift-sync cache fix | matches |
| `scheduleFixes` | 14516 | Daily-view nav-on-first-load + XP-per-view bug fixes | matches |
| `agentsIntoOracle` | 14591 | Folds Agents page actions into Oracle AI | matches |
| `encyclopediaQoL` | 14649 | Real keyword search + taxonomy-link status surfaced | matches |
| `journalQoL` | 14748 | Search/filter/tag surfacing over the `source` column | matches |
| `pwaInstall` | 14889 | manifest.json/sw.js registration, runs pre-`rpgace:ready` | matches; `manifest.json`/`sw.js`/`icons/` all present on disk |
| `careerStatCard` | 14907 | Real weighted Output/Growth career score from Supabase, replacing cosmetic HP/MP/Streak | matches |
| `chroniclesLog` | 15327 | Runtime-injected `#page-chronicles`, filters, finance ledger UI | matches; `chronicles_finance`=0 rows confirms nothing logged yet |
| `jargonEncyclopedia` | 15562 | Button surfacing the `jargon_encyclopedia` Postgres view | matches; view not independently re-verified this pass (out of scope for SQL introspection given no `information_schema` check was run for it) |
| `pathRouter` | 15629 | pushState per-page URLs, wraps `checkPassword`/`page:show` | matches |
| `perfWatch` | 15698 | `PerformanceObserver('longtask')` toast watcher | matches |

### Real Supabase state (project `gripopghczmrbrhqtqbm`, queried live, not estimated)
| Table | Rows | RLS | Notes |
|---|---|---|---|
| `taxonomy_tree` | 491 | ✅ enabled | real Phylum→Variant tree |
| `taxonomy_proposals` | 108 | ✅ enabled | **pending=60, rejected=39, accepted=9** — the "60 pending" backlog CLAUDE.md logged July 20 is unchanged as of today |
| `taxonomy_links` | 68 | ✅ enabled | **confirmed=21, pending=47** — matches CLAUDE.md's July 20-corrected figure exactly |
| `taxonomy_nodes` | 90 | ✅ enabled | legacy flat store, still actively read/written (12 call sites in rpgace_core.js) — correctly flagged as legacy in interconnection_map.md/manual.html/system_flow_map.md |
| `bookworm_books` | 1 | ❌ **disabled** | "Music Theory for Computer Musicians", `status=in_progress` |
| `bookworm_chapters` | 26 | ❌ **disabled** | complete=3, in_progress=1, pending=22 — matches July 20 audit numbers exactly, unchanged |
| `bibliography` | 0 | ❌ **disabled** | confirms no book has ever fully completed the pipeline |
| `intel_bibliography` | 15 | ✅ enabled | a **different** table — Content Intelligence's own bibliography (`intelDelete.BIB` constant), unrelated to Bookworm's `bibliography` |
| `content_productions` | 5 | ✅ enabled | Analysed=1, Idea=4 |
| `journal` | 37 | ✅ enabled | source breakdown: oracle=23, schedule=5, beatLog=5, feynman=3, contentProductionLive=1 |
| `encyclopedia` | 68 | ✅ enabled | |
| `encyclopedia_insights` | 106 | ✅ enabled | |
| `reference_tracks` | 32 | ✅ enabled | |
| `chronicles_finance` | 0 | ✅ enabled | built, never used — no sale/expense logged yet |
| `system_updates` | 12 | ✅ enabled | Chronicles' Claude-Code-activity feed; 12 real rows, most recent is the /5thDimension entry itself |
| `oracle_dev_suggestions` | 0 | ✅ enabled | nothing flagged by Oracle yet — session-start check would find nothing new |
| `taxonomy_decision_log` | 0 | ✅ enabled | audit-log built, never yet written to (no placement decided since it shipped) |
| `video_jobs` | 0 | ✅ enabled | confirms "F17 has never had a job persist" claim |
| `conid_pot` | 3 | ✅ enabled | |
| `rpgace_shifts` | 15 | ✅ enabled | |
| `rpgace_agendas` | 1 | ✅ enabled | |
| `intel_reports`/`intel_watchlist`/`intel_jobs` | 35/26/52 | ✅ enabled | |

**Security advisories (live, `get_advisors`):** exactly 3 tables with RLS fully disabled — `bookworm_books`, `bookworm_chapters`, `bibliography` — matching CLAUDE.md's security note precisely, no more, no less. Additionally, every other RLS-enabled table uses an `anon_all`-style `USING(true)` policy — technically "RLS enabled" but functionally wide open to the anon key for every table in the project (a real, milder version of the same exposure, not previously named this precisely in any oversight doc). `RPGACE.sb.headers()` (rpgace_core.js:10370) confirms the publishable key is sent as both `apikey` and `Authorization: Bearer` on every request, and `Prefer: return=minimal` is hardcoded on all writes — confirms the `sb.insert()` "never returns the row" landmine exactly.

**`/api/*.js` real auth check:** read `api/oracle.js` and `api/_context.js` directly. `setCORS()` (api/_context.js:94) sets only `Access-Control-Allow-Origin: '*'`/Methods/Headers — no token, header, or session check exists anywhere in either file. Confirms the security finding verbatim: any caller who finds the URL can invoke Oracle/Composio actions with zero gate.

**`RPGACE.hooks.fire()` re-subscription bug:** read the real implementation (rpgace_core.js:194-200) — plain `Array.prototype.forEach` over `this._reg[event]`. Per spec, `forEach` does not visit elements appended to the array after iteration begins, so a listener added via `.on()` from inside a handler running during the same `fire()` call is genuinely never invoked. Confirms the landmine exactly, not just plausible-sounding.

### git log — real timeline (confirmed via `git log --oneline`, 213 commits)
Recent arc, oldest→newest of the visible tail: early Bookworm chapter-detection debugging (~30 commits) → tree-audit/unification (July 19) → dashboard/nav rebuild (July 20, ~10 commits) → Aintergration framework + book-batch audits (July 20-22) → Oracle self-awareness/dev-bridge (July 22) → Chronicles/finance/PWA/career-card (July 22) → QoL passes + real nav-lag root-causing, twice (July 22-23) → pathRouter/swipeable-nav/Chronicles-card-only/perfWatch/Research-Lab-lazy-load (July 23) → this session's `/5thDimension` skill commit (`e6c4656`, HEAD). No commit in the visible 100-line log is unmerged/orphaned from `main` — the standing "merge to main before hand-test" rule appears to be holding structurally (not independently verified branch-by-branch this pass).

---

## SIDE B: WHAT'S REPORTED AS DONE (the docs)

### patch_notes.html (659 lines, most recent cards read in full)
- Top-of-file, most recent (`July 23, Round 4`): claims to have shipped `.claude/skills/5thDimension/SKILL.md` + Oracle command 16, explicitly **not run end-to-end**, Phase 1-2 dispatched to background — this report is the delivery of exactly that claim.
- Round 3 (July 23): claims Research Lab single-tab lazy loading restored, `researchTabs._inject()` dead-code bug fixed, "File Analyzer" rename, new dashboard popup — all flagged "code-reviewed/reasoning-verified... never clicked through live" honestly.
- Round 2 (July 23): Chronicles made card-only, `perfWatch` shipped instead of a second blind fix, explicit "not yet hand-tested."
- Round 1 (July 23): claims real 10-20s post-login lag root-caused and fixed (careerStatCard prefetch), `pathRouter` shipped, Chronicles folded into dashboard's 12th card, swipeable nav — two self-caught bugs (`global.addEventListener` scope bug, back-button default-page bug) disclosed in the same entry.
- "🏁 July 22 — Session ended here" card: claims the whole ~150-chapter book processed, Council of 5 shipped as Oracle command, Oracle self-awareness + dev bridge, 2 security gaps found, all six docs updated, **nothing hand-tested**.
- "Still Open" section (curated July 14, says ~15 stale cards archived): lists Oracle 504 timeout (confirmed reproduced, unfixed), F11 silent-failure bug (unfixed), F16/F17/F18 smoke tests (never hand-tested), the ~25-site `rpgace:ready` re-subscription audit (flagged, not audited), streaming-Oracle tech debt (workaround only).
- **Doc-internal staleness note:** the "Still Open" section's own header text says "Curated July 14" but several cards inside it reference July 15/16/17 events — the section has clearly been added to without its own header being refreshed to match; a minor version of the same doc-staleness pattern CLAUDE.md warns about generally.

### interconnection_map.md (257 lines)
Claims (section headers, read in full): Oracle Pipeline, Taxonomy Tree Pipeline (with explicit "known open issues" subsections), Content Production Pipeline, independent Schedule system, a Shared Touchpoint Cross-Reference table, Encyclopedia↔Taxonomy link, a Future Integration Vision (a-f, "confirmed direction, not yet scoped"), Bookworm↔Phylum Path "first confirmed live pipeline run" (July 18), unified placement engine (July 19), dashboard rebuild (July 20), nav rebuild (July 20), **Chronicles as "a shared aggregation touchpoint across 8 tables"** (July 22), and an explicit note that Oracle's self-awareness digest is "hand-maintained... not a live one" to CLAUDE.md (i.e., Oracle's grounding text has to be manually kept in sync with this file — a real, self-disclosed staleness risk baked into the architecture itself).

### manual.html (413 lines)
Polished button catalog + Supabase table reference + fixed-bugs table + roadmap status (F0-F18). Spot-checked: `taxonomy_nodes` row explicitly labeled "Legacy flat gap scores" (line 251) — matches Side A finding exactly, no drift. DEL(Intel) button description ("cascade delete: intel_reports + encyclopedia + taxonomy_nodes", line 216) matches `intelDelete` module's real code.

### system_flow_map.md (381 lines)
Section 0 "Verified Component Inventory" claims a grep-verified module list "July 17" — **stale**: the file's own §10 truth table has clearly been appended to as late as July 22 (Oracle self-awareness, PWA, career stat card, `/scope` entries all present), but the doc's own top-of-file dating and §0 inventory were never bumped to match — the header literally undersells how current the body actually is. §10's three-way truth table ("Built AND verified" / "Built but NEVER verified" / "Claimed/discussed but NOT built") is the single most load-bearing claim-surface in the whole project and reads as internally honest — every item Side A checked against it (RLS gap, API-auth gap, `video_jobs`=0, `bibliography`=0, `taxonomy_proposals` backlog) matched real evidence with no daylight.

### minotaur_map.html (495 lines)
Nine "Rivers" (I-IX), each explicitly cross-referenced to a `system_flow_map.md` section via `.correspond` divs. River VIII is named in CLAUDE.md's own current-state notes as "the first wing where water leaves RPGACE entirely" (the Claude Code Remote bridge). River IX (§423) is explicitly described as the newest confluence — Chronicles — and explicitly claims "for the first time, water from the Far Shore (River VIII) flows back the other way" into the same estuary. Matches `system_updates`/Chronicles' real two-way existence (Side A confirmed `system_updates` has 12 real rows, most from Claude Code activity, readable in-app).

### taxonomy_map.html
Live-query page (queries Supabase `taxonomy_tree` on load per CLAUDE.md) — not treated as static content per the task's own instruction; its accuracy is a function of `taxonomy_tree`'s real 491 rows, which Side A already confirmed exist.

### system_updates (Supabase, read in full, 12 rows, newest first)
Chronologically consistent with patch_notes.html's own claims: PWA, career-stat-card rebuild, Chronicles+finance ledger, `/scope` skill, Council of 5 as Oracle command, Oracle self-awareness bridge, security-gap findings (API auth + `CORRECT_PW`), QoL cleanup + nav-lag double-root-cause, Jargon Encyclopedia/Book Knowledge + `/debate` skill, "July 22 session closed," then the four July 23 rounds culminating in the `/5thDimension` entry itself. No row makes a claim Side A couldn't independently verify or trace to a real commit.

### chronicles_finance (Supabase)
0 rows. Doc claim ("a real personal finance ledger... explicitly personal-visibility, not bookkeeping-grade") accurately describes a table that has been built but never used — the docs do NOT claim any actual sale/expense has been logged, so this is not a drift, just a genuinely empty real feature.

---

## PRELIMINARY DRIFT NOTES

1. **No genuine "claimed-done-but-code-disagrees" drift was found this pass** — the standout historical pattern this project explicitly warns about (docs claiming something is "done" when the code disagrees) did **not** reproduce in this sweep. Every specific, checkable claim in patch_notes.html / interconnection_map.md / system_flow_map.md / manual.html / minotaur_map.html / system_updates that Side A could verify against real code, `git log`, or live Supabase data matched. This itself is worth flagging as a real, positive finding, not an absence of effort.
2. **Module count is stale-low in CLAUDE.md's own prose** ("roughly 40+ modules") — real count is 49. Minor, cosmetic, doesn't affect any functional claim.
3. **`system_flow_map.md`'s own header/§0 dating says "July 17"** while its §10 truth table body has clearly been edited as recently as July 22 — the doc is internally inconsistent about its own age, the same class of staleness the project's rules exist to prevent, just applied to a date-stamp rather than a feature claim.
4. **`intelListBatcher` (registered name) vs `uiBatchList` (its own module-marker comment, rpgace_core.js:3131-3182)** — a real naming mismatch between the `RPGACE.register()` call and its surrounding `/* ===MODULE:x=== */` marker. Harmless (doesn't break anything, confirmed by `node --check`-style reasoning — it's just a naming split), but not mentioned in any doc, and worth a one-line fix for anyone auditing the marker convention going forward.
5. **Two same-word "bibliography" tables exist** (`bibliography`, Bookworm's whole-book completion record, RLS disabled, 0 rows; `intel_bibliography`, Content Intelligence's own separate bibliography, RLS enabled, 15 rows) — both real, both correctly used by their respective modules, but no doc calls out that they are two unrelated tables sharing a near-identical name. A future reader querying "bibliography" in Supabase without this report could easily check the wrong one.
6. **The `anon_all`-style `USING(true)` RLS policies on every other table** (not just the 3 with RLS fully disabled) is a real, live Supabase advisory finding this pass surfaced that no oversight doc names this precisely — CLAUDE.md's security note only calls out the 3 fully-disabled tables by name. Functionally the exposure is similar (anon key can read/write nearly everything project-wide) but the framing in CLAUDE.md ("not every table actually has RLS turned on... treat as a per-table fact to verify") undersells that even the tables with RLS "on" are permissive-all. Worth a sharper framing in a future oversight pass, not a new problem — same underlying Tier 3 issue already flagged.
7. **`taxonomy_proposals`' 60-pending backlog is unchanged since July 20** despite three more sessions of feature-building on top of it (July 21-23) — no doc claims otherwise, so this isn't a contradiction, but it is worth surfacing plainly: the review-queue backlog is not shrinking on its own, and nothing built since has been aimed at it.

---
*Phase 1 & 2 only. Phase 3 (debate/reconciliation) and beyond intentionally not attempted — reserved for a session with Alex present.*
