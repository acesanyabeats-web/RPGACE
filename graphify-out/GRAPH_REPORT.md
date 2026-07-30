# Graph Report - .  (2026-07-30)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 603 nodes · 1009 edges · 148 communities (143 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.54)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e94bcb59`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 30
- Community 32

## God Nodes (most connected - your core abstractions)
1. `setCORS()` - 25 edges
2. `requireAuth()` - 23 edges
3. `addXP()` - 21 edges
4. `callOracle()` - 15 edges
5. `initApp()` - 15 edges
6. `setLearnStatus()` - 15 edges
7. `process_url()` - 15 edges
8. `sendChat()` - 14 edges
9. `renderEncEntries()` - 14 edges
10. `callClaude()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `handler()` --calls--> `setCORS()`  [EXTRACTED]
  api/auth.js → api/_context.js
- `handler()` --calls--> `callClaude()`  [EXTRACTED]
  api/analyst.js → api/_context.js
- `detectChapterListByOracle()` --calls--> `callClaude()`  [EXTRACTED]
  api/bookworm-fetch.js → api/_context.js
- `handler()` --calls--> `callClaude()`  [EXTRACTED]
  api/noter.js → api/_context.js
- `handler()` --calls--> `callClaude()`  [EXTRACTED]
  api/oracle.js → api/_context.js

## Import Cycles
- None detected.

## Communities (148 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (38): handler(), TYPE_PROMPTS, handler(), charFuzzyPattern(), collectMatches(), declusterByOffset(), detectChapterListByOracle(), detectChaptersByRegex() (+30 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (20): CAT_COL, CAT_ICON, CONFIG, DEFAULT_SHIFTS, ENC_BULLET_CACHE, ENC_CATEGORY_MAP, ENC_INSIGHT_CACHE, ENC_INSIGHTS (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (36): Path, add_to_watchlist(), analyse_frames(), banner(), batch_process(), call_claude(), check_ytdlp(), download_video() (+28 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (34): addInstaQuest(), addToEncyclopedia(), addXP(), agentLog(), callComposio(), callOracle(), compileEncyclopedia(), completeQuest() (+26 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (20): advance(), applyIntelUI(), chapterNumOf(), commitChapters(), el(), _fb(), get(), _key() (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (29): acceptJumpToEnc(), clearScheduledAgendas(), exitFocusToEnc(), extractVSTsFromText(), fetchFromLocal(), fetchFromSupabase(), fetchWatchlistFromLocal(), fetchWatchlistFromSupabase() (+21 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (29): approveInsights(), approveInsightsFromCache(), autoExtractAllInCategory(), deleteEncEntry(), detectCategory(), ENC_ALL_ENTRIES, extractInsightsAuto(), extractInsightsSemiAuto() (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.23
Nodes (25): cmd_add(), cmd_check(), cmd_cleanup(), cmd_deploy(), cmd_list(), cmd_migrate(), cmd_new(), cmd_remove() (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (20): ArchaeologistError, blame_authors(), build_report(), changed_file_details(), classify_message(), git(), historical_paths(), history_hashes() (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (16): _addSchedButtons(), _calDateStr(), closeSchedModal(), confirmSchedule(), confirmScheduleModal(), _fracClock(), initDailyNav(), initSchedModal() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (14): background_color, description, display, display_override, icons, id, name, orientation (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (14): maxDuration, maxDuration, maxDuration, maxDuration, maxDuration, maxDuration, functions, api/analyst.js (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.16
Nodes (14): AGENT_ACTIONS, buildAgentActions(), buildSkillTree(), buildTimeSlots(), checkPassword(), checkServerStatus(), initApp(), levelUp() (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (13): AGENDA_LIST, clearJournal(), closeFocusOverlay(), closeJournalEntry(), completeScheduledTask(), deleteJournalEntry(), hideTimerWidget(), logDailyAction() (+5 more)

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (13): autoApplyStoredShifts(), closePasteRota(), generateAgendas(), getFreeWindows(), getShiftContext(), getShifts(), getShiftsForDate(), getTodayShifts() (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.21
Nodes (12): addMsg(), checkForQuestSuggestions(), _escChatHtml(), fireBeatAnalysis(), fireInstaCommand(), fireProdCommand(), isInstaOracleQuery(), renderInstaMsg() (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.20
Nodes (10): beginSession(), closeSessionSetup(), handleFocusSelect(), loadFocusEntries(), onSessionTimerEnd(), openFocusOverlay(), setupFocusTextSelect(), showTimerWidget() (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.27
Nodes (10): buildMonthSlots(), buildWeekSlots(), _calCellItems(), _calFmtShort(), _calGetSchedAgendas(), _calGetShifts(), _calMondayOf(), calMonthNav() (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.31
Nodes (9): applyShifts(), dzDrop(), dzLeave(), handleFile(), parseCSV(), parseICS(), parsePasteInput(), parseText() (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (8): day_abbr(), extract(), get_credentials(), Line 1 = username, line 2 = password, if CRED_FILE exists and is filled in.…, Try a list of selectors, click the first one found., Fill the first matching field., try_click(), try_fill()

### Community 20 - "Community 20"
Cohesion: 0.25
Nodes (8): fetch_reports(), push_report(), push_watchlist(), Insert a row into a Supabase table., Push a full Intel report to Supabase., Push a watchlist entry to Supabase (upsert by URL)., Fetch recent reports from Supabase., supabase_post()

### Community 21 - "Community 21"
Cohesion: 0.40
Nodes (5): acceptSuggestions(), buildAllQuests(), buildQS(), closeSuggestion(), makeCard()

### Community 22 - "Community 22"
Cohesion: 0.60
Nodes (5): deleteNote(), initLearning(), renderDB(), savePipelineToDB(), updateDBStats()

### Community 23 - "Community 23"
Cohesion: 0.50
Nodes (4): collapseEncEntry(), expandEncEntry(), scrollToVSTInEntry(), toggleEncEntry()

### Community 24 - "Community 24"
Cohesion: 0.67
Nodes (3): handleGlobalSelect(), initGlobalTextSelect(), SELECTABLE_PAGES

### Community 25 - "Community 25"
Cohesion: 0.67
Nodes (3): handlePipelineFile(), pipelineDragLeave(), pipelineDrop()

## Knowledge Gaps
- **46 isolated node(s):** `MODEL_EXTRACTOR`, `MODEL_GROUND_WORKER`, `TYPE_PROMPTS`, `config`, `CONFIG` (+41 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `syntax_check()` connect `Community 7` to `Community 2`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `initApp()` (e.g. with `refreshEncyclopediaDisplay()` and `setupManualInsightSelection()`) actually correct?**
  _`initApp()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MODEL_EXTRACTOR`, `MODEL_GROUND_WORKER`, `TYPE_PROMPTS` to the rest of the system?**
  _46 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.10745098039215686 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11411411411411411 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10160427807486631 - nodes in this community are weakly interconnected._