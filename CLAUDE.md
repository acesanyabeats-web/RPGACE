# RPGACE — CLAUDE.md
Read automatically by Claude Code at the start of every session in this folder.

## Who you're working with
Alex (@AceSanyaBeats), UK music producer, Derby. Building RPGACE — a personal AI operating system for music production and content creation. Solo project.

## The governing rule
"Does this result in a beat made or video posted within 48 hours?" Yes → build now. No → wait. **Standing exception: RPGACE infrastructure itself is exempt** — building the system that builds beats counts.

## Architecture — never violate without explicit confirmation
- **main.js is FROZEN.** Edit only as a deliberate, logged exception, with `node --check main.js` before every commit. Log the exception in patch_notes.html same session.
- **All new code goes in rpgace_core.js**, via `RPGACE.register()`, built through `py rpgace_build.py` (new/add/update/check) — never hand-edited. (Note: the July 12 session hand-edited rpgace_core.js directly via Edit-tool calls instead of through the script — same `/* ===MODULE:x=== */`/`/* ===END:x=== */` marker convention the tool itself produces, and `node --check` was run after every change, so the result is structurally equivalent. Still worth going back through `rpgace_build.py` for those modules — ciAutoPropose, taxonomyReviewQueue, encTaxonomyLink, agendaReminder, scheduleOracle — if you want standalone `mod_*.js` source files for them like every earlier module has.)
- Working dir: `C:\Users\acesa\Downloads\rpgace-vercel-v4`. Python automation scripts live separately: `C:\Users\acesa\RPGACE`.

## Known landmines — condensed from the original rule set, still true
- **Never add a second `<script>` tag to `index.html`.** Exactly one `<script src="main.js"></script>` plus `<script src="rpgace_core.js"></script>` — adding another breaks the password gate via race conditions.
- **Never use Python string-replace on `index.html`.** `exportEncyclopedia` contains `</body></html>` inside a JS string literal — naive replacement hits that fake tag first and corrupts the file. Use targeted edits instead.
- **All fixed overlays (modals, focus overlays, timer widgets) must be created dynamically via `document.createElement` and appended to `document.body`** — never placed inside `.page` divs, which intercept clicks via z-index even when `display:none` in some browsers.
- **Every `id="page-X"` div must appear before the `<script>` tags**, inside `#app` — the `.page`/`.page.active` CSS only works there.

## Non-negotiable process rules
1. **Pull real source before editing.** `window.functionName.toString()` in browser console for client-side, `type filename` for server-side. Never guess at function internals.
2. **Screenshot or real DOM output before positioning/layout code.** Never infer container geometry.
3. **Grep before adding new UI behavior** — check if an existing function already touches the same elements. RPGACE has a history of duplicate/conflicting implementations from skipping this step (two parallel scheduling systems, three independent chat-parsers, duplicate button injection, three independent copies of the phyla keyword list — found and fixed July 6-12).
4. **One failed fix = stop, get real evidence, don't patch blind a second time.**
5. **Multi-subsystem asks (3+ new pieces) get spec'd and deferred whole**, never half-built. Log the spec, don't start coding until confirmed.
6. **Every confirmed idea or fix updates all four Oversight docs in the same session** — patch_notes.html, interconnection_map.md, manual.html, taxonomy_map.html. Not optional, not batched later.

## Oversight — the four docs, read these for full context
Deployed at rpgace.vercel.app, also in this project root. Named and extended to 4 members on July 12 (was "the three living docs"):
- **patch_notes.html** — day-by-day build history, the canonical F-series roadmap (F0 onward — NOT the old R-items or original 36-step list, which are historical only), every bug found/fixed, Tier 6 future integrations (a-f)
- **interconnection_map.md** — structural touchpoints between modules, 17-part diagram chain (atomic → module → domain → full-system), confirms Oracle and Taxonomy Tree as the two real hubs everything converges on except Schedule (which runs fully independent)
- **manual.html** — polished merged reference, leverage guides per feature, full button catalog, Supabase table reference, F0-F18 roadmap status table
- **taxonomy_map.html** — **live document**, queries `taxonomy_tree` directly from Supabase on every page load. Never needs a manual data update, unlike the other 3 — only touch it if its own code/columns change.

**Before starting any nontrivial task, read the relevant sections of these four files first** — they exist specifically to prevent re-discovering already-solved problems or rebuilding already-shipped features. Check the real current state (git log, live Supabase schema, actual running code) before trusting a prior doc's claim — this project has a repeated history of docs describing something as "done" when the underlying code says otherwise.

## Current state (July 14, 2026) — don't re-discover this
- **Full numbered roadmap (F0–F18) is now shipped.** F12 (Schedule Oracle Phase 2) is the only deferred item left, and it was deliberately deferred, not skipped.
- **Canonical phylum labeling shipped July 14.** `taxonomyTree.PHYLUM_PURPOSE` (one-line role per phylum) plus `RPGACE.utils.phylumLabel(num)`/`phylumContext(num)` are now the single source of truth for how a phylum's name is shown anywhere — short UI text uses `phylumLabel` ("Phylum N — Latin (English)"), anything sent to Oracle uses `phylumContext` (adds ". Purpose: ..."). Applied everywhere a phylum name appeared in the live app plus `taxonomy_map.html`. Fixed 2 real bugs found in the process: Phylum 14 had been displayed/prompted as "Phylum XXV" in 6 places in `visualOracle` (data was always correctly tagged 14 in Supabase, only text was stale), and `lastfm_beat_match` was writing `phylum_number: 17` while claiming "Fons Educationis" (actually phylum 12). Also bridged 2 already-populated-elsewhere phyla into `taxonomy_nodes`: Phylum 11 (Lingua Musicae) from `beatLog.SCALE_COLOURS`, Phylum 16 (Venditionis Beatorum) from F16's licence-term text. Full brainstorm menu (F0-F18 improvement ideas + taxonomy expansion per phylum, not all built) logged at `/root/.claude/plans/woolly-watching-lamport.md`.
- 30+ modules live across 7 domains (ORACLE/LEARNING/SCHEDULE/CONTENT/JOURNAL/SYSTEM/CONFIG)
- Taxonomy tree (recursive, self-referencing, `taxonomy_tree` + `taxonomy_proposals` tables) shipped July 6, full propose/accept/edit/reject/morph cycle. Auto-propose from Content Intelligence + Encyclopedia sync (F4/F5), Dashboard review queue (F6), and a per-entry manual propose button on Encyclopedia cards (F7) shipped July 12 — the originally-scoped four-trigger system is complete.
- `_acceptLineage()`'s tree insert was silently landing every multi-step lineage flat (parent_id always null) until fixed July 12 — anything accepted before that date is flat, not nested, and wasn't retroactively migrated.
- Phylum-matching (F8) rebuilt July 12: full 21-phylum keyword coverage (was 14), weighted scoring instead of raw count, word-boundary matching instead of substring.
- Phylum XXV Filmmaker Library (F14) shipped July 12, then corrected same day — first pass over-indexed on UK/Afrobeats music-video directors; replaced with a canonical film-directors library (Bay, Tarantino, Kubrick, Spielberg, Scorsese, Hitchcock, Cameron, Nolan, Fincher, Ridley Scott, del Toro, Miyazaki, and more — 50 total) spanning action/thriller/horror/animation/arthouse, grounding `visualOracle`'s Director Match command in real data instead of pure improvisation.
- Schedule Oracle Phase 1 / MVP (F11) shipped July 12 — 3 entry points, `/api/scout`+`/api/analyst` ingestion, sequential 3-option reveal. Phase 2 (F12: carousel, two-tier session memory, auto-routing) not started, depends on F11.
- Beat Selling licence/price fields (F15) shipped July 12 on `content_productions`. Precondition for F16.
- **Beatstars listing generator (F16) shipped July 13, scoped down** — BeatStars has no public API for creating listings (confirmed via web search, same category of premise-break as F10), so it generates ready-to-paste title/description/tags/licence content via Oracle instead of auto-posting. Button lives on `contentProductionLive`'s ConID rows, shown once `licence_type` is set.
- **Video Pipeline tracker (F17) shipped July 13, scoped down** — no render/EDL backend exists anywhere (`local_server.py` only serves Content Intelligence endpoints; no render engine in the stack), so it's a status tracker only over `video_jobs` (Beat Logged → Raw → Edited → Rendered → Exported, 4 export-URL slots), no in-app rendering.
- **`video_jobs` table didn't exist in Supabase until July 13** — found while scoping F17. `beatLog` had been inserting into it since it shipped, silently failing every time (error swallowed by a console-only catch). Table now created; not yet confirmed working by hand.
- **Auto Visual Treatment Doc (F18) shipped July 13** — optional checkbox on Beat Log, waits for the Oracle concurrency guard to clear, then auto-fires visualOracle's Visual Treatment Doc template with real beat data, F14-grounded.
- **Oracle request cross-wiring fixed July 13** — overlapping `sendChat()` calls (e.g. a slow Director Match still pending when another panel fires a new request) could steal each other's response via shared `STATE.chatHistory`/`#typing-indicator`. Fixed with a `window._oracleRequestInFlight` guard in `scheduleOracle`'s existing `sendChat` wrap — no `main.js` edit needed.
- Content Intelligence pipeline confirmed fully working end-to-end
- Cross-device sync confirmed working for both shifts (`rpgace_shifts`) and scheduled tasks (`rpgace_agendas`)
- n8n rota-sync workflow (F10) built and importable (`n8n/rota_sync_workflow.json`) but not yet test-run — `fourth_rota.py` now reads `.fourth_credentials` if present, but the two manual "press Enter" login-confirmation gates are untouched and untested against a real unattended run.
- **Biggest confirmed-not-built item: Taxonomy Sorting Agent** — one classification agent (not per-node AI), cost confined to exactly 2 touchpoints (classification call + Lineage Proposal justification text), tree itself stays free static data
- **Known open bug:** Oracle 504 timeout on long structured responses — `maxDuration` raised to 60s, insufficient on its own. Root cause confirmed July 12: `callClaude()` is a single blocking non-streaming call, so generation time alone can exceed even the raised ceiling. A prior streaming attempt broke things and was reverted (dead code + `restoreSendChat` neutraliser still in `rpgace_core.js`) — needs a deliberate decision before a second attempt, not a blind retry.
- **F11 ingestion failure still open** — a YouTube URL Jina can't fetch produces silent "Content Unavailable" placeholder data instead of a clear error, found during July 13's smoke test.
- **Nothing from July 12 or July 13 has been fully hand-tested yet.** Full smoke-test list is in patch_notes.html's Still Open section — do this before trusting or building further on any of it.

## Style
Direct, unhedged technical correction preferred over polite hedging — it produces faster fixes. Council of 5 + GODMODE framing used for major architecture decisions: real pushback and real questions before big builds, never agreement-then-build. When something doesn't work, get real evidence before a second attempt rather than guessing again.

## Remote Control — laptop ↔ phone workflow (confirmed working, July 2026)

**To move a live Claude Code session from laptop to phone:**
1. On laptop, inside a running Claude Code session: `/remote-control`
2. This prints a session URL like `https://claude.ai/code/session_XXXXX`
3. Open that exact URL directly in your phone's browser (Safari/Chrome) — connects instantly to the same live session
4. Laptop must stay powered on and connected the whole time — Remote Control syncs to a session running locally, it does not move execution to the cloud

**To move back from phone to laptop:** same session stays live on both — just switch back to the laptop terminal, still the same conversation.

**Plan mode reminder:** use `/plan` (typed inside an active session) or Shift+Tab twice to toggle plan mode mid-session. `--permission-mode plan` is a startup flag only, used when first launching `claude`, not a command typed inside a running session.

## Oversight logging — NOT automatic, confirmed limitation

There is no way to auto-trigger a doc update just by opening a Remote Control session URL or switching devices — Claude Code has no hook for "device changed" and opening a link can't fire a file write. This was explicitly investigated and ruled out July 8.

**The actual working pattern:** at the end of any work session (on either device), explicitly say **"update oversight"** (or "end session" / "log this session" — same trigger, same result). This prompts a review of what changed (git diff + conversation summary) and a structured update to all four Oversight docs — patch_notes.html, interconnection_map.md, manual.html, taxonomy_map.html (usually a no-op for taxonomy_map.html specifically, since it's live) — each in the format it's actually good at, not a copy-paste of one summary into 4 files. This is a deliberate action you take, not something that fires automatically, and that's the more reliable design: it happens exactly when you mean it to.

## Known working API model
Always use: claude-sonnet-4-6
Never use: claude-sonnet-4-20250514 (wrong), claude-3-5-sonnet (wrong)

## Security note (July 12)
This repo is **public** on GitHub. The old CLAUDE.md's Passwords & Secrets section (app password, Composio key) was exposed in git history as a result — that section is deliberately not present in this file. If the app password (`CORRECT_PW` in main.js) or the Composio key haven't been rotated since, treat that as still outstanding. The Supabase key is a "publishable" key by design (protected by RLS, not secrecy) — not a real exposure. `.env.local` was also found tracked in git (a since-expired Vercel OIDC token) and has been untracked + gitignored.
