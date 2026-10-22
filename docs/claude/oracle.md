# Oracle and app-wide facts

Read before touching `api/oracle.js`, `callOracle`, `sendChat`, any `window.callOracle` wrapper, `oracleAppGrounding`, `oracleControl`, navigation/areas, auth or performance code.

## Oracle chat
- Streaming: `api/oracle.js` proxies Anthropic SSE on `stream:true`; `callOracle` takes an optional 4th `onChunk`; `sendChat` renders progressively through XSS-safe `renderMarkdown()` (escapes HTML first via `_escChatHtml()`). `maxDuration` 300. `sendChat`'s cap is 3000 tokens.
- All three `window.callOracle` wrappers (`oracleTreeGrounding`, `oracleAppGrounding`, `oracleFetchGuard`) must forward all four arguments with `orig.apply`; forwarding three silently turns streaming off.
- Oracle Professor Mode (`oracleProfessor`, OP-1..5): Haiku plans, `gather`, `condense`, Opus (`PROF_MODEL` = `claude-opus-5-5`) answers, cost line from `PRICES`. [story](../../patch_notes.html#card-2026-10-21-oracle-routing)
- `oracleAppGrounding` gates (keyword-triggered; `forceGroundNext()` forces one): app self-knowledge `SELF_KNOWLEDGE`, live facts (recent `system_updates`, incl. `design-scan` rows), `oracle_module_anatomy` (13 riskiest modules), `askMyData` (`DATA_QUERY:` trailer, 18 read-only sources). `prodOraclePanel`'s 5thDimension command calls `forceGroundNext()`. [X1](../../patch_notes.html#card-2026-10-10-ask-my-data) [anatomy](../../patch_notes.html#card-2026-07-31-oracle-architecture-anatomy-self-awareness-table-built)
- `SELF_KNOWLEDGE` is hand-kept: update it in the same session as any domain/architecture change, naming the owning module or table. Checks: `scripts/check_self_knowledge_staleness.py`, `scripts/check_self_knowledge_contradictions.py`. [story](../../patch_notes.html#card-2026-09-23-oversight-docs-just-an-appendix-real) [check](../../patch_notes.html#card-2026-09-23-real-self_knowledge-staleness-check-shipped-closing)
- `oracle:response-scanned` gets rendered `textContent` — see the landmine in CLAUDE.md before parsing lists. Trailers in use: `RECIPE_JSON:`, `RECIPE_UPDATE_JSON:`, `DIRECTOR_CHOSEN:`, `EDL_JSON:`, `ORACLE_ACTION:`, `ORACLE_SUGGEST_ACTION:`, `DATA_QUERY:`, `WEB_QUERY:`, `PLAN_JSON`.
- `visualOracle._captureNextResponse` arms only after a confirmed send (`sendToOracle()`/`sendChat()` report success). [story](../../patch_notes.html#card-2026-08-06-engineer-real-bugfix-pass-dangling-oracle-capture)
- `oracleControl` (G41): curated `oracle_actions` drive a confirm-before-execute popup. `logic._execute()` has branches for `log_beat`, `new_quests`, `draft_email`, `yt_stats`, `log_notion` (plus `log_outreach` via XP-7); an approved row with no branch shows a "not wired up yet" toast. The 4 `quickPrompt` buttons and the Agents quick-actions bar route through it (`quickActions._setup()` rewires them at runtime). Fish Audio TTS/ASR is a dormant scaffold awaiting a key. [F0](../../patch_notes.html#card-2026-09-04-f0-built-quickprompt-buttons-rewired-into) [F15](../../patch_notes.html#card-2026-09-22-f15-shipped-agents-page-quick-actions-bar-rewired)
- `oracleDevBridge` "🧪 Flag to Orchestrator CC" writes `oracle_dev_suggestions` (16000-char cap). [story](../../patch_notes.html#card-2026-08-06-full-oracle_dev_suggestions-review-all-11-rows)
- Oracle Mode switch: Real / Dummy (`mockOracle.isEnabled()` returns a labelled fake reply, zero cost) / Fallback Scout (queues to `oracle_fallback_queue`; "📥 Scouted, Now Answered" popup). Dev chrome hides until login (`hideUntilLogin()`), sits in one collapsible dev-status bar; `_pushBodyBelow()` keeps the banner off content. `encyclopedia.preview_bullets` caches bullets. [modes](../../patch_notes.html#card-2026-08-06-same-day-2nd-pass-oracle-mode) [dummy](../../patch_notes.html#card-2026-08-06-mock-oracle-testing-mode-built-paranoia) [dedup](../../patch_notes.html#card-2026-08-06-same-day-3rd-pass-real-deduplication) [A2](../../patch_notes.html#card-2026-08-22-a2-dummy-fallback-oracle-banner-no) [login gate](../../patch_notes.html#card-2026-08-22-real-hand-test-follow-up-login-gate-chrome-hidden) [dev bar](../../patch_notes.html#card-2026-08-22-collapsible-oracle-mode-panel-boot-task-select)
- Credit-exhaustion detection `phylumPath._isCreditExhaustionError` matches "credit balance"/"insufficient credit" — a guess, never seen live; fails open.
- `RPGACE_ORACLE_NOTES.md` is the only file Oracle may write for dev suggestions (see CLAUDE.md).
- Voice input (`voiceInput`) is retired; no voice path until a Fish Audio key exists.

## Models the code calls
- `claude-sonnet-4-6` — ground worker (judgment work).
- `claude-haiku-4-5-20251001` — mechanical tier only (`phylumPath.MECHANICAL_MODEL`, `local_server/rpgace_intel.py`) and Professor planning.
- `claude-opus-5-5` — Oracle Professor answers (`oracleProfessor.PROF_MODEL`).
- `claude-fable-5` — extractor/outlining (`EXTRACTOR_MODEL`, `api/_context.js` `MODEL_EXTRACTOR`).
- `gemini-2.5-flash` — web search in `api/search.js`.
- Never: `claude-sonnet-4-20250514`, `claude-3-5-sonnet`. Never guess a new ID; never route judgment work to the mechanical tier.

## Navigation, areas, domains
- Every module declares `domain:` from `RPGACE.DOMAINS` (8 domains); `scripts/check_module_domains.py` checks it. Galaxy Map Level 1 is `galaxy_map_domain.html`.
- Areas: `RPGACE.AREAS`, foldable nav bands, `RPGACE.areaNav` Back/🏠, ☰ side list `RPGACE.sideList` on every area bar (SL-0). Popup history/Back via `dashDeck._nav*`. Dashboard landing + one grouped menu. [N1](../../patch_notes.html#card-2026-10-10-back-navigation)
- Popups: all overlays route through `dashDeck._popup()` (exception `_showEncPopup`). Boot: `RPGACE.registerBootTask` is the one gate; widgets inject into `#dd-stash-holder`.
- Plans of record: domains/navigation `records/2026-10/rpgace_domains_navigation_ceo_plan_2026-10-10.txt`; side list `records/2026-10/side_list_everywhere_ceo_2026-10-21.txt` (SL-1..5 queued); 50-project extensions `records/2026-10/fifty_claude_projects_paranoia_2026-10-10.txt`.
- Built Oct 10 (yellow): `encyclopediaPosts`, `askMyData`, `captionsPanel`, `pathways`, `shoppingWishlist` cool-off + `decisionJournal`, `shareInbox`, `recall`, `producerTools`, `dailyLife` (fridge photo → stock via `cookingOracle.logic._upsertStock`, watchlist digest, own-words brief), `gymTracker`. [D1](../../patch_notes.html#card-2026-10-10-daily-life) [gym](../../patch_notes.html#card-2026-10-10-gym-tracker)

## Speed and UI tokens
- `perfWatch` writes private `perf_freezes` (LoAF scripts+invoker, last 12 crumbs, slow resources, boot phase); boot-phase blocks (`!RPGACE._bootDoneAt`) don't toast. The old ~669ms "App froze" alert was the boot script load. Pending connector-cancelled SQL: `records/2026-10/pending_sql_2026-10-14.sql`. [story](../../patch_notes.html#card-2026-10-14-polish-speed)
- Animation tokens `--ease-out`/`--ease-drawer`; `RPGACE.ui.slideInPanel`/`slideOutPanel`; hover transforms gated behind `@media (hover:hover) and (pointer:fine)`; `#focus-concept-panel` keeps `transition:all` on purpose. ~72 hardcoded hex colours (21 values) have no token yet — open decision.
- `/impeccable` wraps only the free `npx impeccable detect`; the paid install returns 403.

## Auth
- `api/auth.js` checks `process.env.CORRECT_PW` server-side and returns `RPGACE_API_SECRET`; `authGate` attaches it to every `/api/*` call and keeps it in localStorage, re-checked via `/api/auth` `token` branch; "🔒 Sign out on this device" in the left nav. Every endpoint calls `requireAuth()` (`api/_context.js`). Details: `docs/claude/security.md`. [stay signed in](../../patch_notes.html#card-2026-10-10-stay-signed-in)
