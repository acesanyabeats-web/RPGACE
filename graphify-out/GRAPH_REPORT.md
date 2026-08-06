# Graph Report - RPGACE  (2026-08-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 953 nodes · 1425 edges · 67 communities (58 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.54)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `30b83f55`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.js
- rpgace_intel.py
- _context.js
- 001 — Replace bare `ease` with real easing tokens everywhere
- RPGACE — CLAUDE.md
- rpgace_core.js
- callOracle
- Animation Standards Reference
- RPGACE Interconnection Map
- buildMonthSlots
- rpgace_build.py
- What You Must Do When Invoked
- Animation Audit Playbook
- RPGACE — System Flow Map
- archaeologist.py
- _sbGet
- SIDE B: WHAT'S REPORTED AS DONE (the docs)
- addXP
- Glossary
- RPGACE — Software Architecture Analysis & Foundation Plan
- initApp
- 2. Shipped this session
- showPage
- manifest.json
- Oracle Session — INSTA-ORACLE Command 1 + Content Rebuild
- DESIGN.md — RPGACE Structural Restructure
- sendChat
- saveToJournal
- generateAgendas
- functions
- Part 2 — Every rule/`.md`/`.txt` file that influences the system, by real authority level
- Commit Archaeologist
- graphify reference: extra exports and benchmark
- applyShifts
- RPGACE SYSTEM CONTEXT
- fourth_rota.py
- Current state (July 24, 2026, session end) — don't re-discover this
- Reading git history without inventing intent
- /Engineer — build it, then prove the report about it is true
- RPGACE Judgment Funnel — Omnitrix, Council of 5, GODMODE, Aintergration
- /scope — the whole picture, in digestible grouped bits
- graphify reference: query, path, explain
- /loggingregen — per-doc regeneration against role + dedup
- /Regeneration — audit the whole tree, one bounded pass at a time
- /Routine — the daily Top 10, decided by real debate instead of by whoever spoke first
- package.json
- /5thDimension — built vs. reported, then how to rewire it well
- /free-for-all-debate — individual competitors, not two teams
- /impeccable — design-pattern scan, standalone or as a Bedtime/Summary sub-step
- /interrogation — ask before guessing, on anything that would actually change
- /5thDimension — Phase 3 & 4: Reconciliation + The Rewiring Debate
- /Bedtime — closing out a session for real, not just saying "done"
- /debate — adversarial case-building before a real decision
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- /restructure — would this repo change RPGACE-Claude Code's skeleton, and should it
- /Summary — a real, evidence-checked recap when context needs restoring
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- n8n workflows
- recolor
- .claude/CLAUDE.md
- extraction-spec.md
- split.py
- sw.js
- Path

## God Nodes (most connected - your core abstractions)
1. `RPGACE Interconnection Map` - 25 edges
2. `setCORS()` - 22 edges
3. `RPGACE — CLAUDE.md` - 22 edges
4. `requireAuth()` - 20 edges
5. `Animation Standards Reference` - 16 edges
6. `process_url()` - 15 edges
7. `addXP()` - 15 edges
8. `initApp()` - 15 edges
9. `callOracle()` - 14 edges
10. `sendChat()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `handler()` --calls--> `setCORS()`  [EXTRACTED]
  api/auth.js → api/_context.js
- `handler()` --calls--> `callClaude()`  [EXTRACTED]
  api/analyst.js → api/_context.js
- `detectChapterListByOracle()` --calls--> `callClaude()`  [EXTRACTED]
  api/bookworm-fetch.js → api/_context.js
- `handler()` --calls--> `callClaude()`  [EXTRACTED]
  api/oracle.js → api/_context.js
- `handler()` --calls--> `callClaude()`  [EXTRACTED]
  api/orchestrate.js → api/_context.js

## Import Cycles
- None detected.

## Communities (67 total, 9 thin omitted)

### Community 0 - "main.js"
Cohesion: 0.04
Nodes (40): acceptSuggestions(), beginSession(), buildAllQuests(), buildQS(), CAT_COL, CAT_ICON, clearScheduledAgendas(), closeSessionSetup() (+32 more)

### Community 1 - "rpgace_intel.py"
Cohesion: 0.07
Nodes (53): Path, build_component_zone_map(), build_id_river_map(), deterministic_jitter(), extract_array(), line_of(), parse_module_ranges(), patch_dataset_mapping() (+45 more)

### Community 2 - "_context.js"
Cohesion: 0.09
Nodes (42): handler(), TYPE_PROMPTS, handler(), charFuzzyPattern(), collectMatches(), declusterByOffset(), detectChapterListByOracle(), detectChaptersByRegex() (+34 more)

### Community 3 - "001 — Replace bare `ease` with real easing tokens everywhere"
Cohesion: 0.04
Nodes (39): 001 — Replace bare `ease` with real easing tokens everywhere, Boundaries, Problem, Repo conventions to follow, Steps, Target, Verification, 002 — Consolidate 6+ duplicated drawer slide-in blocks into one shared helper (+31 more)

### Community 4 - "RPGACE — CLAUDE.md"
Cohesion: 0.06
Nodes (35): Aintergration — third-party framework/tool/agent assessment (Alex-confirmed July 20), Architecture — never violate without explicit confirmation, Building guide for lower models — follow these patterns exactly, Context/logging efficiency rules (log without losing meaning), Council of 5 — pre-build deliberation, Current state — durable facts (pruned July 31 per this file's own doc-discipline rule), External handoff lanes (both deliberately unguarded — see landmines), GODMODE — maximum-rigor deliberation (+27 more)

### Community 5 - "rpgace_core.js"
Cohesion: 0.09
Nodes (20): advance(), applyIntelUI(), chapterNumOf(), commitChapters(), el(), _fb(), get(), _key() (+12 more)

### Community 6 - "callOracle"
Cohesion: 0.10
Nodes (28): approveInsights(), approveInsightsFromCache(), autoExtractAllInCategory(), callOracle(), deleteEncEntry(), detectCategory(), ENC_ALL_ENTRIES, extractInsightsAuto() (+20 more)

### Community 7 - "Animation Standards Reference"
Cohesion: 0.07
Nodes (25): Aggressive Escalation Triggers, Guidelines, Operating Posture, Part 1 — Findings table (REQUIRED), Part 2 — Verdict (REQUIRED), Remedial Preference Hierarchy, Required Output Format, Reviewing Animations (+17 more)

### Community 8 - "RPGACE Interconnection Map"
Cohesion: 0.08
Nodes (26): Accessibility — voice input, API auth, write-proxy, and RLS — current security architecture, Bookworm ↔ Phylum Path — confirmed live end-to-end, Claude Code fallback lane — architecture, Content Pipeline overseer — `content_productions` ↔ `video_jobs` ↔ `style_profiles`, Content Production Pipeline, Cross-doc sync conventions, Dashboard architecture — `dashDeck` (+18 more)

### Community 9 - "buildMonthSlots"
Cohesion: 0.11
Nodes (26): _addSchedButtons(), buildMonthSlots(), buildWeekSlots(), _calCellItems(), _calDateStr(), _calFmtShort(), _calGetSchedAgendas(), _calGetShifts() (+18 more)

### Community 10 - "rpgace_build.py"
Cohesion: 0.23
Nodes (25): cmd_add(), cmd_check(), cmd_cleanup(), cmd_deploy(), cmd_list(), cmd_migrate(), cmd_new(), cmd_remove() (+17 more)

### Community 11 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 12 - "Animation Audit Playbook"
Cohesion: 0.09
Nodes (21): 1. Purpose & frequency, 2. Easing & duration, 3. Physicality & origin, 4. Interruptibility, 5. Performance, 6. Accessibility, 7. Cohesion & tokens, 8. Missed opportunities (+13 more)

### Community 13 - "RPGACE — System Flow Map"
Cohesion: 0.09
Nodes (21): 0. Verified Component Inventory, 10. Built vs NOT built — the truth table (created July 17; live numbers re-queried July 31), 11. Content & Video Production Pipeline — added July 31, rebuilt Aug 5, 1. Top-Level System Map, 2. Oracle Chat Request Flow (`main.js sendChat` + wraps), 3. Phylum Path Insight Placement (the core taxonomy write path), 4. Article Generation + Concept Fusion, 5. Bookworm (whole-book → taxonomy pipeline) (+13 more)

### Community 14 - "archaeologist.py"
Cohesion: 0.22
Nodes (20): ArchaeologistError, blame_authors(), build_report(), changed_file_details(), classify_message(), git(), historical_paths(), history_hashes() (+12 more)

### Community 15 - "_sbGet"
Cohesion: 0.13
Nodes (20): checkServerStatus(), fetchFromLocal(), fetchFromSupabase(), fetchWatchlistFromLocal(), fetchWatchlistFromSupabase(), fireBeatAnalysis(), handleFocusSelect(), importIntelJSON() (+12 more)

### Community 16 - "SIDE B: WHAT'S REPORTED AS DONE (the docs)"
Cohesion: 0.11
Nodes (18): 0. Repo shape, /5thDimension — Phase 1 & 2 Evidence Report, chronicles_finance (Supabase), git log — real timeline (confirmed via `git log --oneline`, 213 commits), index.html real structure, interconnection_map.md (257 lines), main.js real structure (frozen, confirmed by direct read), manual.html (413 lines) (+10 more)

### Community 17 - "addXP"
Cohesion: 0.16
Nodes (19): addInstaQuest(), addXP(), compileEncyclopedia(), completeQuest(), generateNotes(), learnVideo(), loadNote(), markAgendaDone() (+11 more)

### Community 18 - "Glossary"
Cohesion: 0.11
Nodes (17): Animation Vocabulary, Easing — how speed changes over an animation, Entrances & Exits — how elements appear and disappear, Examples, Feedback & Interaction — responding to the user's actions, Glossary, Instructions, Looping & Ambient Motion — animations that run on their own (+9 more)

### Community 19 - "RPGACE — Software Architecture Analysis & Foundation Plan"
Cohesion: 0.12
Nodes (16): API Pattern — 3 Different Styles, Architecture Diagram, Current State — Full Audit, Duplicate Functions (3 versions each), Global State Chaos, Implementation Plan, localStorage — Raw and Unprotected, Quick Reference — What Goes Where (+8 more)

### Community 20 - "initApp"
Cohesion: 0.15
Nodes (16): AGENT_ACTIONS, buildAgentActions(), buildSkillTree(), buildTimeSlots(), checkPassword(), deleteNote(), initApp(), initLearning() (+8 more)

### Community 21 - "2. Shipped this session"
Cohesion: 0.12
Nodes (15): 1. How to use this doc, 2.10 Security — OPEN, do not forget, 2.1 Bookworm chapter detection — finished and CONFIRMED on a real book, 2.2 Bookworm UX (commits `ee0f2e2`, `ba31a38`) — built, NOT hand-tested, 2.3 Reader formatting (commit `9550e40`) — built, NOT hand-tested, 2.4 Tree audit → ONE unified placement engine (commit `42ca91e`), 2.5 Tree cleanup G1–G5 — EXECUTED (commits `b9c4f1b`, `28d8fb6`), 2.6 YouTube per-insight loop + review-queue reasoning (commit `28d8fb6`) (+7 more)

### Community 22 - "showPage"
Cohesion: 0.17
Nodes (15): acceptJumpToEnc(), exitFocusToEnc(), extractVSTsFromText(), goToEncFromFocus(), pushLocalToSupabase(), quickSaveToEncyclopedia(), refreshEncyclopediaDisplay(), saveEncWithVSTs() (+7 more)

### Community 23 - "manifest.json"
Cohesion: 0.13
Nodes (14): background_color, description, display, display_override, icons, id, name, orientation (+6 more)

### Community 24 - "Oracle Session — INSTA-ORACLE Command 1 + Content Rebuild"
Cohesion: 0.13
Nodes (14): COMMAND 1 — NICHE DOMINATION SCAN, CONFIRMED ANCHOR: PILLAR 3 — FL STUDIO SECRETS SERIES, Full Weekly Schedule, GROWTH INTEL, How to find vocalists under 5K (15 minute method), Oracle Session — INSTA-ORACLE Command 1 + Content Rebuild, PILLAR A — FL STUDIO SECRETS SERIES (anchor), PILLAR B — MADE DIFFERENT (outsider producer angle) (+6 more)

### Community 25 - "DESIGN.md — RPGACE Structural Restructure"
Cohesion: 0.14
Nodes (13): 10. Page Redesign Audit — July 20, 2nd session (GODMODE + Council of 5, Omnitrix skipped per Alex — Fable 5 ran out of usage credits mid-dispatch, so this pass was done solo by Sonnet 5, no second-agent review; extra care taken as a result, smaller scope shipped than a reviewed pass would have), 1. Visual Theme & Atmosphere, 2. Color Palette & Roles, 3. Typography Rules, 4. Component Stylings, 5. Layout Principles, 6. Depth & Elevation, 7. Animation & Interaction (L1) (+5 more)

### Community 26 - "sendChat"
Cohesion: 0.19
Nodes (14): addMsg(), agentLog(), callComposio(), checkForQuestSuggestions(), _escChatHtml(), fireInstaCommand(), fireProdCommand(), isInstaOracleQuery() (+6 more)

### Community 27 - "saveToJournal"
Cohesion: 0.15
Nodes (13): AGENDA_LIST, clearJournal(), closeFocusOverlay(), closeJournalEntry(), completeScheduledTask(), deleteJournalEntry(), hideTimerWidget(), logDailyAction() (+5 more)

### Community 28 - "generateAgendas"
Cohesion: 0.18
Nodes (13): autoApplyStoredShifts(), closePasteRota(), generateAgendas(), getFreeWindows(), getShiftContext(), getShifts(), getShiftsForDate(), getTodayShifts() (+5 more)

### Community 29 - "functions"
Cohesion: 0.15
Nodes (12): maxDuration, maxDuration, maxDuration, maxDuration, maxDuration, functions, api/analyst.js, api/executor.js (+4 more)

### Community 30 - "Part 2 — Every rule/`.md`/`.txt` file that influences the system, by real authority level"
Cohesion: 0.17
Nodes (11): 1a. Global/native — generic capability, present but largely inert for RPGACE, 1b. Global/native — genuinely load-bearing for RPGACE, used repeatedly this session and prior ones, 1c. RPGACE-authored, project-scoped only (for contrast — full detail already lives in CLAUDE.md's "Invokable frameworks" and "Skills, tooling, security" sections, not repeated here), Notably absent — a real gap, not an oversight, Part 1 — Claude Code skills present in this environment, Part 2 — Every rule/`.md`/`.txt` file that influences the system, by real authority level, Part 3 — What this doc changes about the oversight system itself, RPGACE — AI Tooling & Rules Map (+3 more)

### Community 31 - "Commit Archaeologist"
Cohesion: 0.18
Nodes (10): Commit Archaeologist, Evidence rules, Files, Follow-ups, Gather the target, Read the JSON, Run the dig, When not to use (+2 more)

### Community 32 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 33 - "applyShifts"
Cohesion: 0.31
Nodes (9): applyShifts(), dzDrop(), dzLeave(), handleFile(), parseCSV(), parseICS(), parsePasteInput(), parseText() (+1 more)

### Community 34 - "RPGACE SYSTEM CONTEXT"
Cohesion: 0.22
Nodes (8): API RULES — NEVER BREAK THESE, CONFIRMED WORKING TOOLS, DEFINITIVE CONNECTED ACCOUNTS, RPGACE SYSTEM CONTEXT, STALE IDs — NEVER USE THESE, TOOL NAME ERRORS — NEVER USE THESE, URL FETCHING, USER

### Community 35 - "fourth_rota.py"
Cohesion: 0.33
Nodes (8): day_abbr(), extract(), get_credentials(), Line 1 = username, line 2 = password, if CRED_FILE exists and is filled in.…, Try a list of selectors, click the first one found., Fill the first matching field., try_click(), try_fill()

### Community 36 - "Current state (July 24, 2026, session end) — don't re-discover this"
Cohesion: 0.25
Nodes (7): CLAUDE.md — Archive, Current state (July 24, 2026, session end) — don't re-discover this, Prior state (July 18, 2026) — still true unless superseded above, Prior state (July 20, 2026, session end) — still true unless superseded above, Prior state (July 22, 2026, session end) — still true unless superseded above, Prior state (July 23, 2026, first session) — still true unless superseded above, Prior state (July 23, 2026, second session) — still true unless superseded above

### Community 37 - "Reading git history without inventing intent"
Cohesion: 0.25
Nodes (7): Authorship has two meanings, Change-risk checklist, Co-change is correlation, File history and line history answer different questions, Intent signals and confidence, Reading git history without inventing intent, Timeline categories are routing hints

### Community 38 - "/Engineer — build it, then prove the report about it is true"
Cohesion: 0.29
Nodes (6): /Engineer — build it, then prove the report about it is true, Guardrails, One pass — the five stages, in order, Re-looping — capped, and only on objective failure, The Objective Completion Gate — the real pass/fail, What this skill is NOT

### Community 39 - "RPGACE Judgment Funnel — Omnitrix, Council of 5, GODMODE, Aintergration"
Cohesion: 0.29
Nodes (6): Aintergration — third-party framework/tool/agent assessment, Council of 5 — pre-build deliberation, GODMODE — maximum-rigor evidence-gathering, Omnitrix — the 3-agent build workflow (reweighted after a real failure), RPGACE Judgment Funnel — Omnitrix, Council of 5, GODMODE, Aintergration, The Judgment Funnel — which tier a task sits at

### Community 40 - "/scope — the whole picture, in digestible grouped bits"
Cohesion: 0.29
Nodes (6): Grouping — the "digestible bits" output shape, Handing off to the seven docs, /scope — the whole picture, in digestible grouped bits, What this skill does NOT do, What to gather (real evidence, never a doc's own claim), When to run this

### Community 41 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 42 - "/loggingregen — per-doc regeneration against role + dedup"
Cohesion: 0.33
Nodes (5): /loggingregen — per-doc regeneration against role + dedup, Procedure, per doc, Running it across all six docs + Chronicles in one session, The two hard checks, run against every doc in turn, What this skill does NOT do

### Community 43 - "/Regeneration — audit the whole tree, one bounded pass at a time"
Cohesion: 0.33
Nodes (5): Guardrails, Procedure, /Regeneration — audit the whole tree, one bounded pass at a time, The three tiers, always run in this order, What this skill is NOT

### Community 44 - "/Routine — the daily Top 10, decided by real debate instead of by whoever spoke first"
Cohesion: 0.33
Nodes (5): Guardrails, Output, /Routine — the daily Top 10, decided by real debate instead of by whoever spoke first, The procedure, in order, When to run it

### Community 45 - "package.json"
Cohesion: 0.40
Nodes (4): archiver, dependencies, archiver, type

### Community 46 - "/5thDimension — built vs. reported, then how to rewire it well"
Cohesion: 0.40
Nodes (4): /5thDimension — built vs. reported, then how to rewire it well, Guardrails, The procedure, in order, What "everything built off this" means

### Community 47 - "/free-for-all-debate — individual competitors, not two teams"
Cohesion: 0.40
Nodes (4): /free-for-all-debate — individual competitors, not two teams, Guardrails, The procedure, in order, When to use this instead of `/debate`

### Community 48 - "/impeccable — design-pattern scan, standalone or as a Bedtime/Summary sub-step"
Cohesion: 0.40
Nodes (4): As a Bedtime/Summary sub-step, /impeccable — design-pattern scan, standalone or as a Bedtime/Summary sub-step, Standalone use ("/impeccable"), Why this feeds Oracle, not just Claude Code

### Community 49 - "/interrogation — ask before guessing, on anything that would actually change"
Cohesion: 0.40
Nodes (4): Guardrails, /interrogation — ask before guessing, on anything that would actually change, Procedure, When to run it

### Community 50 - "/5thDimension — Phase 3 & 4: Reconciliation + The Rewiring Debate"
Cohesion: 0.40
Nodes (4): /5thDimension — Phase 3 & 4: Reconciliation + The Rewiring Debate, Phase 3 — Reconciling Side A vs Side B, Phase 4 — The Rewiring Debate, What Phase 5 actually needs from Alex (when he's rested, not now)

### Community 51 - "/Bedtime — closing out a session for real, not just saying "done""
Cohesion: 0.50
Nodes (3): /Bedtime — closing out a session for real, not just saying "done", Guardrails, The procedure, in order

### Community 52 - "/debate — adversarial case-building before a real decision"
Cohesion: 0.50
Nodes (3): /debate — adversarial case-building before a real decision, Guardrails, The procedure, in order

### Community 53 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 54 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 55 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 56 - "/restructure — would this repo change RPGACE-Claude Code's skeleton, and should it"
Cohesion: 0.50
Nodes (3): Guardrails, /restructure — would this repo change RPGACE-Claude Code's skeleton, and should it, The procedure, in order

### Community 57 - "/Summary — a real, evidence-checked recap when context needs restoring"
Cohesion: 0.50
Nodes (3): Guardrails, /Summary — a real, evidence-checked recap when context needs restoring, The procedure, in order

## Knowledge Gaps
- **394 isolated node(s):** `MODEL_EXTRACTOR`, `MODEL_GROUND_WORKER`, `TYPE_PROMPTS`, `config`, `id` (+389 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `MODEL_EXTRACTOR`, `MODEL_GROUND_WORKER`, `TYPE_PROMPTS` to the rest of the system?**
  _394 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.js` be split into smaller, more focused modules?**
  _Cohesion score 0.03753957485300769 - nodes in this community are weakly interconnected._
- **Should `rpgace_intel.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0707070707070707 - nodes in this community are weakly interconnected._
- **Should `_context.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0936408106219427 - nodes in this community are weakly interconnected._
- **Should `001 — Replace bare `ease` with real easing tokens everywhere` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `RPGACE — CLAUDE.md` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `rpgace_core.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08912655971479501 - nodes in this community are weakly interconnected._