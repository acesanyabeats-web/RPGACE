# RPGACE Session Handover — July 18–19, 2026 (Fable session)

**Written for the next Claude session (Sonnet 5) to read cold and continue
building correctly.** Every claim below is traceable to a commit in
`git log 0f4ab80..a27fa0d`, a patch_notes.html card, or a committed spec file.
Nothing here is aspirational — test-status flags are honest.

---

## 1. How to use this doc

Read in this order before writing any code:

1. **`CLAUDE.md`** — the operating rules. The ones that were violated at real
   cost this session and are NOT optional:
   - `main.js` is FROZEN. All new code goes in `rpgace_core.js` via
     `RPGACE.register()` between `/* ===MODULE:x=== */` markers. Run
     `node --check rpgace_core.js` after every edit.
   - **Merge to `main` and push BEFORE telling Alex something is ready to
     test.** rpgace.vercel.app deploys from `main` only. Pattern used all
     session: commit on `claude/rpgace-master-steps-uobp98`, push, then
     `git checkout main && git merge --ff-only <branch> && git push`, then
     back to the branch.
   - One failed fix = STOP. Get real evidence (Vercel runtime logs, direct
     Supabase SQL, Alex's pasted output) before a second attempt. This rule
     paid off repeatedly this session.
   - Every taxonomy write gets a human checkpoint. AI proposes, Alex confirms.
   - Model IDs: ground worker `claude-sonnet-4-6`, extractor `claude-fable-5`.
     Never anything else.
   - Oversight discipline: every shipped thing gets a patch_notes.html card
     (with honest "not yet hand-tested" flags) the same session.
2. **`taxonomy_placement_rules.txt`** — the placement rules (R1–R7) with the
   real corruption evidence behind each, and the G1–G5 cleanup log.
3. **`oracle_grounding_spec.txt`** — the Oracle tree-grounding spec (verbatim
   confirmed answers) and how the callOracle wrap works.
4. **`bookworm_spec_backlog.txt`** — Bookworm's spec Q&A history (Rounds 1–3).

---

## 2. Shipped this session

### 2.1 Bookworm chapter detection — finished and CONFIRMED on a real book

- **Bare "N Title" heading tier** (`api/bookworm-fetch.js`,
  `resolveChapterHeadingsMechanically`): this book's true chapter openings are
  bare "1 Musical Sound" lines with no word "Chapter" — "Chapter N Title" only
  recurs as a running header. A highest-priority bare-number+char-fuzzy-title
  pattern was added (with a look-behind exclusion so the TOC's joined
  "Chapter1MusicalSound" tail can't false-match). Commit `0f4ab80`.
- **Three silent chapter-swallowing paths closed** (commit `7d89a63`): chapter 2
  once vanished with zero log trace. Fixes: `dropClusteredBoundaries` scoped to
  the regex-fallback path only (it was running unconditionally and could
  silently delete a genuine short chapter); the TOC-recircle JSON-parse miss now
  logs; the <400-char merge-forward step now logs.
- **Chapter-1 anchor direction corrected** (commit `c0fb0b0`): the earlier
  "latest match before chapter 2" fix landed on a running header near chapter
  1's END, so merge-forward silently discarded ~25k real characters. Corrected
  to "FIRST genuine occurrence after the front-matter cluster" (pool all 3
  candidate tiers, drop anything within 600 chars of the earliest/TOC mention,
  take the first survivor), plus a DIAG log dumping every candidate offset with
  surrounding text.
- **Status: HAND-TESTED AND CONFIRMED** by Alex on the real 26-chapter book —
  chapter 1 reads as full real prose end to end.

### 2.2 Bookworm UX (commits `ee0f2e2`, `ba31a38`) — built, NOT hand-tested

- **Chapter tick list + click-to-jump**: clicking a book card opens
  `_renderChapterList` (✅/🔄/✍️/⏳ per chapter, any chapter clickable).
  Complete chapters open read-only `_renderChapterSummary`. The old
  jump-to-current behavior lives on as `_openCurrentChapter` for internal
  auto-continue flows. All Exit buttons navigate to Dashboard via
  `_goToDashboard()`.
- **Background extraction**: "I've Read This" fires `_analyzeChapter` and
  returns to Dashboard immediately.
- **Resumable analysis**: `bookworm_chapters.pending_insight_texts` (jsonb) +
  `analysis_heartbeat` (timestamptz) columns added (migrations applied).
  `_analyzeChapter` persists the full remaining insight list up front;
  `_continueAnalyzingInBackground` pops each as placed + stamps the heartbeat;
  `_resumeChapterAnalysis` re-enters from ANY tab; the waiting screen shows a
  "▶ Resume Analysis" button when the heartbeat is stale >45s. **Honest
  limitation, unsolved**: no server-side lock — Resume while the original tab
  is alive-but-slow could double-run. Acceptable for a single-user tool.
- **Backgrounded leaf creation**: Approve advances to the next insight
  immediately; the taxonomy write goes through `_queueLeafCreation` (single
  shared chain so `_insertNewSteps`'s chained parent_id inserts never overlap).
  `_patchChapterInsightAt` serializes ALL insight-array writes through one
  queue so the immediate advance and the later background write can't clobber
  each other. Each insight carries `leafStatus` (pending/created/failed);
  `_renderChapterSummary` shows honest chips + a "🔁 Retry Leaf Creation"
  button on failures.

### 2.3 Reader formatting (commit `9550e40`) — built, NOT hand-tested

`_formatChapterForReading` + "✨ Clean Up Formatting for Reading" button in the
chapter-read view. Rejoins PDF-split words ("M usical"→"Musical"), normalizes
whitespace, adds paragraph breaks — with a strict no-word-changes prompt +
5-check self-verification. **Chunked** (`_chunkTextForFormatting`, ~1800 chars,
whitespace-only splits, max_tokens 900 per chunk) specifically to stay inside
the documented 504 safe zone — never send a whole chapter through one call.
Cached to `bookworm_chapters.formatted_text` (column added), one-time cost per
chapter, toggle to original afterwards.

### 2.4 Tree audit → ONE unified placement engine (commit `42ca91e`)

Audit of everything accepted July 18–19 (direct Supabase queries) found real
garbage: an 11-row depth-14 corruption chain (entered via Bookworm's
unsanitized Edit box), 3 video-title leaves (old flat Content-Intelligence
prompt), 5+ overlapping sibling leaves from one chapter (each blind-placed,
each scored 9/10 individually), physics content shoehorned into Anatomia
meta-knowledge branches, and parallel beat-selling taxonomies in two phyla.

Fix, three defense layers (full detail + rules R1–R7 in
`taxonomy_placement_rules.txt`):

1. **Prompt**: `phylumPath.decidePlacementScored(insightText, phylumNumber,
   priorLeaves)` is now THE single placement engine for every source. Hard
   rules baked in: concept-label naming (never titles/artists/years), no
   near-duplicate siblings, single-rank steps, depth ≤6, fits:false over
   stretching. `decidePlacement` is a thin wrapper; bookworm's
   `_decidePlacementScored` delegates; `taxonomyTree.proposeLineage`/
   `silentPropose` route unconditionally through the ViaPhylumPath variants
   (their old flat prompt bodies are DELETED — do not resurrect them).
2. **Mechanical on model output**: `phylumPath.sanitizePlacement(attachPath,
   attachDepth, steps)` — splits path-like steps, drops rank duplicates,
   depth-caps at 6 keeping the leaf.
3. **Choke point**: `_insertNewSteps` re-runs `sanitizePlacement` on whatever
   it receives — catches raw Edit-box input no other layer sees. Cannot be
   bypassed by any caller.

Bookworm batches also pass already-created leaf names (`priorLeaves`) into
each subsequent placement (anti-fragmentation). Cheaper too: one 700-token
call per decision (the old extractor triage call and the 800-token flat call
are gone).

### 2.5 Tree cleanup G1–G5 — EXECUTED (commits `b9c4f1b`, `28d8fb6`)

All on Alex's explicit go, every delete preceded by reference checks
(children/fusion links/encyclopedia refs), verified after: **0 title/year-named
nodes, 0 orphans, 0 broken fusion links, 0 rows above depth 6.** Details in
`taxonomy_placement_rules.txt` G-section (incl. G4's new
`Anatomia/Acoustics & Sound Fundamentals/Physics of Musical Tone` branch and
the fact that phylum roots have NO depth-0 row — depth-1 Orders have
parent_id NULL).

### 2.6 YouTube per-insight loop + review-queue reasoning (commit `28d8fb6`)

- `ciAutoPropose._scan` REWRITTEN: proposes each stored `key_learnings` /
  `production_techniques` item individually through the unified engine instead
  of one title-led 300-char blob (the root cause of title-shaped placements).
  Caps: 5 new videos/sync, 3 insights/video, 9 proposals total. Fallback for
  old reports without insight arrays uses summary text only — never the title.
- `_silentProposeViaPhylumPath` now stores `justification` + `confidenceScore`
  in `proposed_steps`; `taxonomyReviewQueue` renders them on phylum_path cards.
- **NOT hand-tested** — the next Content Intelligence sync exercises it.

### 2.7 Oracle tree grounding (commit `b0a5939`) — built, NOT hand-tested

Module `oracleTreeGrounding`: chainable wrap on `window.callOracle` (main.js's
single Oracle funnel — zero main.js edits), gated by conversational persona
markers ("You are the Oracle —", the Prod Oracle teacher persona) so JSON/
placement/formatter calls are never touched. On a phylum-keyword match
(`_quickPhylaScan`), injects the top-6 relevant tree leaves (path + explainer
ONLY — never deep_content, per the 504 rule) with instructions to ground the
answer in Alex's own library first and cite leaves by name; when nothing
relevant exists, Oracle says "not in your RPGACE library yet" and offers
Phylum Path placement. Retrieval errors fall through untouched. Spec +
confirmed answers verbatim: `oracle_grounding_spec.txt`.
**Hand-test**: ask about chord inversions (leaves exist) → answer should cite
leaf names; ask something unmapped → the offer should appear.

### 2.8 Research page redesign (commit `7c10ac4`) — built, NOT hand-tested

- `researchTabs`: sub-tab bar on `#page-learning` (🧠 Intelligence / 🎬 Video
  Finder / 💡 Idea Bank / 🎼 Corpus / 🥁 Beat Log / 🔀 Workshop / 📚
  Bibliography), one section visible at a time, last tab remembered,
  late-injected panels re-resolved at staggered delays, unfound sections fall
  back to visible. index.html untouched.
- `RPGACE.ui.batchList(container, 8)`: shared show-8 + "Show more" helper;
  `intelListBatcher` re-applies it after each 30s intel sync re-render.
- Beat Log taxonomy picker: chip wall replaced by search-to-reveal (2+ chars),
  selected chips always visible, selection mechanism unchanged.
- Supabase `intel_reports` deduped 59→35 (kept watchlisted/newest per title).
- **Fact worth keeping**: "inject before login" was investigated and is ALREADY
  true — the password gate is a pure overlay, `rpgace:ready` fires at
  load+150ms, all injection timers finish before a human can type the password.

### 2.9 Video Summary page (commit `a27fa0d`) — built, 27/27 headless tests, NOT browser-tested

Two modules (inserted between `===END:intelDelete===` and
`===MODULE:taxonomySync===`):

- **`intelDedup`** — root-cause duplicate fix for the localStorage cache the
  Insights tab actually renders from: `normUrl` (youtu.be/shorts/m.youtube/
  params/hash all collapse to `youtube.com/watch?v=<id>`), title fallback keys,
  richest-row-wins `_pick` with Supabase-id backfill, `purge()` on load + after
  every sync (chainable wrap on `syncIntelData`), `#intel-stats` rewritten with
  deduped counts. (Earlier Supabase-side dedup alone did NOT fix the UI —
  main.js's `mergeByUrl` exact-string match let cached bad rows persist
  through every sync.)
- **`videoSummary`** — replaces the flat Insights list: per-video cards with
  top-3 insights ranked by the engine's STORED confidence (text + path +
  justification + ⚖ chip + pending/accepted/rejected status), 8 + Show-more,
  expand to full prose summary + grouped Taxonomy placements, on-demand
  "🧬 Run Phylum Path" retro button for pre-loop videos (max 4 sequential
  silentPropose calls, appends to the `rpgace_ci_proposed` guard). ZERO Oracle
  calls in the render path. 📖 Encyclopedia fixed via key-lookup at click time
  (old storage-index bug). 🗑 reuses `intelDelete._deleteUnified`.
- **CRITICAL landmine encoded in the code**: cards use the `.vs-card` CLASS and
  carry ids — deliberately so `intelDelete`'s legacy selector
  `[style*="background:var(--panel2)"][style*="margin-bottom:12px"]` matches 0
  cards and its MutationObserver (ignores nodes with ids) stays quiet. NEVER
  put those substrings in the cards' inline styles.
- Headless tests (real shipped code sliced by markers and eval'd in Node) live
  in the session scratchpad pattern — re-runnable approach documented in the
  patch_notes card.

### 2.10 Security — OPEN, do not forget

`bookworm_books`, `bookworm_chapters`, `bibliography` have **RLS DISABLED** —
fully readable/writable by anyone with the public Supabase key. NOT fixed:
blind `ENABLE ROW LEVEL SECURITY` would break the app's own reads/writes.
Needs a deliberate policy design pass. CLAUDE.md's security note was corrected
to stop claiming blanket RLS protection.

---

## 3. Open threads — build/test next, in this order

1. **Hand-tests owed** (everything in §2 flagged NOT hand-tested): Video
   Summary click-through (cards, expand, Show more, 📖 targets right video,
   🗑, retro run), Oracle grounding both cases, Research tabs + Beat Log
   picker, Bookworm resume + queued-leaf flows + reader formatting, next CI
   sync's per-insight proposals + review-queue reasoning display.
2. **Session A3** (`fable_master_plan.txt`): walk the chapter-by-chapter
   read → insight → approve loop on the REAL PDF book (detection is proven;
   the loop has only ever been proven on the manual book).
3. **RLS policy pass** (§2.10).
4. **Known backlog, untouched this session**: Oracle 504 streaming/chunking
   fix (root fix, not another token trim — dead streaming code +
   `restoreSendChat` cleanup included); audit ~25 `hooks.on('rpgace:ready')`
   re-subscription sites (latent never-fires bugs); shared
   `RPGACE.ui.popup()` scaffolding consolidation; F16/F17/F18 hand-tests;
   phyla 11–21 framework passes; Taxonomy Sorting Agent; cross-phylum dedup
   (rules file R6 notes it as the remaining structural gap).

---

## 4. Working style that made this session work (keep it)

- Diagnose from data: Vercel runtime logs, direct Supabase SQL, Alex's pasted
  raw output — never from memory or a second guess.
- Spec multi-piece asks first (AskUserQuestion), record answers verbatim in a
  committed .txt, then build exactly that.
- Council-of-5 / GODMODE = the scored engine's 5 checks + confidence +
  justification, SURFACED to Alex — never extra Oracle calls for ceremony.
- Fail loud (toasts, DIAG console.warn), honest patch_notes flags, and the
  merge-to-main rule on every single ship.
