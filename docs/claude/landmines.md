# Landmines — the detail behind CLAUDE.md's short list

CLAUDE.md holds the rule for each item; this file holds the "why" and the edge cases. The incidents that taught them are in `CLAUDE_archive.md` and `patch_notes.html`.

## Oracle reply parsing
- `oracle:response-scanned` passes `lastMsg.textContent` read after `renderMarkdown()` has rendered the reply. `renderMarkdown()`'s `^\d+\. ` regex strips list numbers and `textContent` drops the line breaks between list items, so a numbered/bulleted list cannot be recovered. `addMsg` glues "✦ Oracle" onto the front with no separator.
- So: when a feature needs several items back, ask Oracle for one line joined with `" | "`, and strip the "✦ Oracle" prefix before parsing.
- A test that stubs `visualOracle._captureNextResponse` won't catch this. Call the real `addMsg()` and read `lastMsg.textContent`.

## Deploy and file layout
- Vercel Hobby allows 12 Serverless Functions; the project has 11 (`_context.js` doesn't count). Check `ls api/*.js | wc -l` before adding one; prefer a new `action` on `api/data-write.js` (pattern: `bundle-deliverables`). Deleting an `api/*.js` file also needs `grep -n "api/<name>" vercel.json` — `vercel.json` listed `api/noter.js` after deletion and broke the deploy.
- When a file is renamed or deleted, grep the whole repo — `vercel.json`, `scripts/*.py`, `.claude/settings.json`, `.github/workflows/*.yml` — not just source. The `main.js` merge (Aug 20) left four stale references found one at a time over a week. Rule also in `.claude/skills/CEO/SKILL.md` R19.
- `main.js` no longer exists. Its old global functions live in `rpgace_core.js` between `/* ===LEGACY:mainjs=== */` and `/* ===END:LEGACY:mainjs=== */`, outside the IIFE, so `index.html`'s inline `onclick="fnName()"` handlers (47 distinct names) still resolve. `graphify_river_group.py` reads that block via `_legacy_mainjs_text()` (cached).
- `index.html` loads one script, `rpgace_core.min.js`. Edit `rpgace_core.js`, then run `node scripts/minify_client.js` (`mangle:false` — renaming globals would break the onclick handlers) and bump the `?v=` cache-bust in the same commit. Extra libraries load at runtime via `document.createElement('script')` (e.g. `_ensurePdfJs()`).
- `exportEncyclopedia` contains a fake `</body></html>` inside a JS string, so a Python string-replace on `index.html` can cut the file. Edit it with targeted edits only.
- A fix on a branch isn't live: `rpgace.vercel.app` deploys from `main`. "Pushed" is not "merged"; "live" needs `list_deployments` showing the commit `READY` in production.
- GitHub Actions `deploy.yml` is a second, redundant trigger; Vercel's own Git integration is what deploys.

## Supabase
- No backup, no PITR (Free plan, Alex's settled choice — don't re-ask). Before destructive SQL: gather evidence, count rows before and after, snapshot to `records/` if large.
- `RPGACE.sb.insert()` returns nothing (`Prefer: return=minimal`). Need the new id → raw `fetch` + `Prefer: return=representation` + `response.ok` (patterns `phylumPath._insertNewSteps()`, `bookworm._createBookFromExtraction()`).
- Raw-fetch writes skip `RPGACE.cache` busting; call `RPGACE.cache.clear('table')` after.
  Example: `saveOracleToEncyclopedia`.
- Writes go through `RPGACE.sb.secureWrite()` → `/api/data-write` (service role, `ALLOWED_TABLES`) for locked tables. Tables that must stay anon-writable, and why:
  - `openmontage_jobs` — the separate OpenMontage CC session writes back with the anon key.
  - `oracle_fallback_queue` — the Fallback Drain Routine writes with the anon key.
  - `journal`, `intel_jobs`, `intel_reports`, `intel_watchlist`, `intel_bibliography` — external writers (Morning Brief Routine, `local_server.py`); spec `six_table_external_writer_migration_spec_2026-07-24.txt`.
  - `error_log`, `smoke_test_items`, `ceo_plan_items` — the live browser writes them (`errorLog._capture`, G109 cascade, Alex's hand-confirm).
- Status columns often have CHECK constraints; query `pg_constraint` before writing a new value.
- Destructive SQL through the connector tends to time out or be cancelled; write a paste file in `records/` and hand Alex the SQL plus a check query.

## Client runtime
- `RPGACE.hooks.fire()` never revisits listeners added mid-fire; `rpgace:ready` has already fired by the time `init()` runs, so call directly instead of `hooks.on('rpgace:ready')` inside `init()`.
- dashDeck stash guard can't tell open from closing: every `onClose` passes `force=true` to `_stashWidget(id, force)`. dashDeck popups sit at z-index 99999 (side panels/drawers/toasts are 9998-10110), so call `closeWidgetPopup(id)` before opening one of those from inside a popup.
- Fixed overlays are created with `document.createElement` and appended to `document.body`, never inside `.page` divs. Every `id="page-X"` div sits inside `#app`, before the script tags.
- Word-boundary regex treats hyphens as boundaries (`roll` matches `b-roll`); keyword lists use compound phrases.
- Cross-module signals use `RPGACE.hooks` named events, never a second MutationObserver on the same node.

## Freezes
- Real freezes are recorded in `perf_freezes`; read it before any freeze work. The ~669ms "App froze" alert was the boot script load and no longer alerts.
- Swipe freeze: `leftNav._initSwipeGesture` is a clean passive `touchstart`/`touchend` pair. Don't attempt a 5th blind fix; ask for `perf_freezes` evidence or a screen recording. The Long Task API gives duration only, no stack.

## Fallback lane
- Never tested against a real credit-exhaustion event. A Routine answer that doesn't parse leaves the row `status='answered'` with `resumed_at` null, retried every 5 min with only a `console.warn` — check for old `answered_at` rows with `resumed_at IS NULL`.

## Model and session limits
- Fable can run out of credits mid-task (plain failure notification). Report and ask; don't swap in another model without Alex's say-so.
- This session's proxy blocks `rpgace.vercel.app` and raw Supabase HTTP; Lighthouse/PageSpeed can't run from here (PageSpeed quota 0). Live checks go through MCP tools or Alex's own browser.
- Project-scoped custom agents (`.claude/agents/fable-readonly.md`) may not resolve mid-session; `/fableomnitrix` dispatches with `subagent_type:"Plan"`.
- The Supabase SQL approval pop-up is set in claude.ai connector permissions (https://claude.ai/customize/connectors → Supabase), not `.claude/settings.json`. Sessions can't edit their own permission files; hand Alex the exact step.
