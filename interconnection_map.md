# RPGACE Interconnection Map
**Notation key** (per your spec): `●` = button/trigger &nbsp; `→` = data transport (solid) &nbsp; `⋯>` = another module chips in along the step (dotted) &nbsp; `▢` = arrival point (module, node, Supabase table, or display)

---

## PART 1 — Every Button: Role, Function Chain, Diagram

### ORACLE Domain

**● 🎛 Prod. Oracle**
`toggleProdOraclePanel()` → `prodOraclePanel` module opens panel → user picks 1 of 14 commands → `fillGaps()` ⋯> `sendToOracle()` → ▢ **Oracle API (Claude)** → ▢ **chat-msgs display**

**● 🎬 YouTube Oracle**
Direct button (`yt-ob`) → `youtubeOracle` module → 8 commands → `fillGaps()` ⋯> `sendToOracle()` → ▢ **Oracle API** → ▢ **chat-msgs display**

**● 📸 Insta-Oracle**
`toggleInstaPanel()` → `instaOraclePanel` → 13 commands → `fillGaps()` ⋯> `sendToOracle()` → ▢ **Oracle API** → ▢ **chat-msgs display**

**● 🎬 Visual Oracle**
`visual-oracle-btn` → `visualOracle` → 6 commands ⋯> reads **Phylum XXV taxonomy** for filmmaker match → `sendToOracle()` → ▢ **Oracle API** → ▢ **chat-msgs display**

**● 🔀 Repurpose** (quick bar)
`contentRepurpose.openPopup()` → Step 1 (Oracle dropdown, reads `chat-msgs`) → Step 2 (your contribution, text field) → Step 3 `_detectPhyla()` ⋯> reads **taxonomySync gap scores** ⋯> reads **encyclopedia + taxonomy_nodes (Supabase)** → Generate button → ▢ **Oracle API** (4 platform outputs + script) → `contentProductionLive.createEntry()` → ▢ **Supabase `content_productions`** → ▢ **Dashboard ConID tracker**

**● 💡 Save ideas to bank** (appears under Oracle panel responses)
`conidPot.saveIdea()` → `_extractTitle()` → duplicate check ⋯> `_similarity()` scan against existing pot entries → ▢ **Supabase `conid_pot`** → ▢ **Idea Bank (Research tab)**

**● 💡 Save as Idea** (text-select popup, Oracle chat + Encyclopedia)
Same as above, triggered from highlighted text instead of full message → ▢ **Supabase `conid_pot`**

---

### LEARNING Domain

**● 🗑 DEL** (Intel cards, both collapsed + expanded views)
`intelDelete._deleteUnified()` → ▢ **Supabase `intel_reports`** (delete) ⋯> ▢ **Supabase `encyclopedia`** (delete) ⋯> ▢ **Supabase `taxonomy_nodes`** (delete) → localStorage sync → ▢ **both collapsed + expanded intel views update simultaneously**

**● 🔄 Refresh / ⚡ Sync** (Encyclopedia tab)
Wraps `window.syncAndPush()` → `pushLocalToSupabase()` (main.js, calls `localhost:7842`) ⋯> `encSync._dedup()` runs 2.5s later on localStorage → ▢ **localStorage `rpgace_encyclopedia`** → ▢ **Encyclopedia display**
*(Root cause of July 1 lag traced to this chain — see Patch Notes.)*

**● 🌿 Sync Taxonomy** (Encyclopedia tab)
`taxonomySync` push → ▢ **Supabase `taxonomy_nodes`**

**● 🧠 Study Now** (Knowledge Gap Tracker, Dashboard)
Triggers `feynman.start(concept)` → 3-phase loop ⋯> `sendToOracle()` → ▢ **Oracle API** → on completion `taxonomySync.updateGapScore()` → ▢ **Supabase `taxonomy_nodes`**

**● ⚡ Apply Tonight** (Knowledge Gap Tracker)
`taxonomySync.markApplied()` directly → ▢ **Supabase `taxonomy_nodes`** (no Oracle call)

**● 📖 Save to Encyclopedia** (Oracle chat footer)
Feynman-adjacent save function → ▢ **Supabase `encyclopedia`**

**● 📓 Save to Journal** (Oracle chat footer)
`saveToJournal()` → ▢ **Supabase `journal_entries`**

---

### CONTENT Domain

**● Drag-and-drop zone** (Beat Log)
`beatLog._parseFilename()` → regex extraction (BPM/key/scale/mood/energy from filename) → ▢ **form fields pre-filled** *(no Supabase write yet)*

**● ⚡ Log Beat + Find Artists** (Beat Log)
`beatLog._submit()` → ▢ **Supabase `video_jobs`** (write) ⋯> `refCorpus.findMatches()` reads **Supabase `reference_tracks`** ⋯> falls back to **Last.fm API** if no corpus match ⋯> `taxonomySync.markApplied()` → ▢ **Supabase `taxonomy_nodes`** → `sendToOracle()` → ▢ **Oracle API** (artist matches + 4 outputs + script) → `saveToJournal()` → ▢ **Journal** + XP award → ▢ **Dashboard**

**● + Add Track / ⚡ Bulk Import** (Reference Corpus)
Direct insert → ▢ **Supabase `reference_tracks`** → ▢ **corpus list display**

**● → Mark [Status]** (ConID cards — Idea/Scripted/Filmed/Edited/Posted/Analysed)
`contentProductionLive.updateEntry()` → ▢ **Supabase `content_productions`** (status field) → ▢ **progress bar re-renders**

**● 📋 Add post details** (ConID cards, Filmed/Edited status)
Opens questionnaire (YouTube/Instagram/TikTok URLs, raw footage path) → `updateEntry()` → ▢ **Supabase `content_productions`** → status auto-advances to Posted

**● ⇄ Swap ConID**
Dropdown of all ConIDs → switches `_activeConID` / `_activeId` in-memory → ▢ **Dashboard widget re-renders with selected ConID** *(no Supabase write)*

**● ✎ Edit title** (ConID cards)
Inline input → `updateEntry()` → ▢ **Supabase `content_productions`** (title field)

**● 💬 Oracle session** (ConID cards)
Sets active ConID → switches to Oracle tab → `sendToOracle()` with ConID context seeded → ▢ **Oracle API** ⋯> `_injectOracleBar()` shows active ConID banner in Oracle tab

**● 🎬 Switch to Production Panel** (Option B, Oracle bar)
`contentProductionLive._openProductionPanel()` → slide-in panel, 3 phases (Pre-prod/Production/Post-prod) ⋯> raw footage path field writes to ▢ **Supabase `content_productions`**

**● End session** (Oracle bar)
`_endSession()` → compiles chat-msgs innerText → ▢ **Supabase `content_productions`** (`oracle_session` field) ⋯> `saveToJournal()` → ▢ **Journal**

**● 📅 Add to Agenda** (Idea Bank connector)
Pushes ConIDPot idea directly to `localStorage rpgace_sched_agendas` → ▢ **Schedule tab display**

**● ⚡ Activate ConID** (Idea Bank connector)
`contentProductionLive.createEntry()` (same as Repurpose's endpoint) → ▢ **Supabase `content_productions`** ⋯> updates originating pot entry status → ▢ **Supabase `conid_pot`** (status: activated)

---

### JOURNAL Domain

**● ☀️ Morning Brief** (Dashboard)
`morningBrief._generate()` → parallel: `_getGmail()` ⋯> **Composio Gmail API**; `_getShifts()` ⋯> **localStorage**; `_getYouTube()` ⋯> **Supadata API**; `_getKnowledgeGaps()` ⋯> **taxonomySync**; `getIdeasForBrief()` ⋯> **Supabase `conid_pot`** (day-rotation logic) → all assembled → `sendToOracle()` → ▢ **Oracle API** → ▢ **Dashboard display**

---

### AGENTS Tab (moved from Oracle quick bar)

**● 📋 New Quests** → `sendToOracle()` → ▢ **Oracle API** → ▢ **chat display**
**● 📧 Draft Email** → `fillGaps()` ⋯> `sendToOracle()` → ▢ **Oracle API**
**● 📓 Log to Notion** → direct → ▢ **Composio `NOTION_CREATE_NOTION_PAGE`**
**● 🎬 YT Stats** → direct → ▢ **Composio `SUPADATA_GET_YOUTUBE_CHANNEL`** ⋯> `sendToOracle()` → ▢ **Oracle API**

---

## PART 2 — Every Function, Grouped by What It Ultimately Produces

**→ Produces an Oracle-generated text output:**
`youtubeOracle` commands · `prodOraclePanel` commands · `instaOraclePanel` commands · `visualOracle` commands · `contentRepurpose._generate()` · `beatLog._submit()` (artist matching prompt) · `morningBrief._generate()` · `feynman` phase dialogue · Agents tab: New Quests, Draft Email, YT Stats

**→ Produces a Supabase write (persistent data):**
`beatLog._submit()` → `video_jobs` · `refCorpus` add/bulk → `reference_tracks` · `contentProductionLive.createEntry()` / `updateEntry()` → `content_productions` · `conidPot.saveIdea()` → `conid_pot` · `taxonomySync.markApplied()` / `.updateGapScore()` → `taxonomy_nodes` · `intelDelete._deleteUnified()` → 3-table cascade delete · `encSync` sync → `encyclopedia` · Feynman save → `encyclopedia` + `journal_entries`

**→ Produces a UI re-render only (no persistence):**
`_parseFilename()` (Beat Log drag-drop) · `⇄ Swap ConID` · Idea Bank filter tabs (All/Potential/Starred/Gap) · `_injectMasterToggle()` collapse/expand (Intel view)

**→ Produces an external API call (non-Claude):**
Last.fm search (`refCorpus` fallback) · Composio Gmail (`morningBrief`, Agents Draft Email) · Composio Notion (Agents Log to Notion) · Supadata YouTube (`morningBrief`, Agents YT Stats)

**→ Produces a cross-module trigger (fires something else):**
`beatLog._submit()` triggers `taxonomySync.markApplied()` AND `refCorpus.findMatches()` AND Journal save AND XP award — single button, four downstream effects
`contentRepurpose._generate()` triggers `contentProductionLive.createEntry()` — Repurpose's output becomes Content Production Live's input
`conidPot` "Activate ConID" triggers the same `createEntry()` endpoint as Repurpose — two different entry points converge on one function

---

## PART 3 — Compiled Cross-Reference: Shared Touchpoints ("Thinking Dimensions")

This is the actual interconnection map — grouped by **shared destination**, not by domain. Anything in the same row already talks to the same place; wiring a new feature to read/write there means it automatically joins this cluster with zero new plumbing.

| Shared Touchpoint | Modules/Buttons That Already Write Here | Modules/Buttons That Already Read Here | What This Means For New Features |
|---|---|---|---|
| **Supabase `taxonomy_nodes`** | taxonomySync, knowledgeGap (Apply Tonight), feynman (post-loop), beatLog (markApplied), intelDelete (cascade delete) | contentRepurpose (`_detectPhyla`), visualOracle (Phylum XXV), knowledgeGap tracker display | Any future module that needs "what do I know / what's a gap" should read this table directly — it's already the single source of truth, don't build a second one |
| **`content_productions`** | contentRepurpose (create), conidPot (activate), all ConID card buttons (update) | Dashboard ConID widget, Oracle bar (active ConID context) | This is the actual project-tracker spine — Steps 30-32 (beat selling) and Step 34 (Video Pipeline) should extend this table's columns, not create a parallel one |
| **`conid_pot`** | conidPot.saveIdea (from Oracle panels + text-select) | Idea Bank display, morningBrief (day-rotation pull), contentRepurpose dropdown (indirectly, via chat-msgs not the table itself — *gap: dropdown doesn't read conid_pot directly yet, this is the ConIDPot-vs-raw-message parsing issue flagged earlier tonight* | Fixing the dropdown to read `conid_pot` instead of parsing raw chat-msgs would resolve the "grabs wrong idea" bug permanently — single highest-leverage fix available right now |
| **Oracle API (`sendToOracle` / `RPGACE.streamOracle`)** | Every panel, every quick action, feynman, morningBrief, beatLog, contentRepurpose | Nothing reads *from* it except the chat display itself | This is a true hub — anything text-generation-shaped already knows how to reach it. Stop Slop rules (logged, not yet built) belong here as a single shared prefix, benefiting every caller at once instead of module-by-module |
| **localStorage `rpgace_encyclopedia`** | encSync (post-sync dedupe) | Encyclopedia tab display | Now structurally protected by the Supabase UNIQUE constraint — this localStorage layer is genuinely just a display cache going forward, not a second source of truth to keep in sync manually |
| **`chat-msgs` DOM (not a database)** | Every Oracle response append | contentRepurpose dropdown, conidPot `_getOracleMessages()`, `_injectSaveBtn()` | This is the fragile point — three separate modules parse the same live DOM independently instead of one shared "recent Oracle output" accessor. Worth a shared `RPGACE.utils.getRecentOracleMessages(n)` helper so all three stop duplicating the same DOM-walk logic |

---

### The one structural insight this whole map surfaces

Three modules — `contentRepurpose`, `conidPot`, and the Idea Bank's "Save ideas" button — all independently parse `chat-msgs` to find recent Oracle output, using three slightly different DOM-walking functions. That's the actual "not interconnected enough" problem, concretely located: not a lack of connections, but *duplicate* connections to the same place built three separate times instead of once, shared.

**The single highest-leverage interconnection fix available:** build one `RPGACE.utils.getRecentOracleMessages(n)` helper in the `config` module, have all three callers use it instead of their own copy. Same output, one shared implementation, and any future module that needs "what did Oracle just say" gets it for free instead of writing a fourth DOM-parser.


---

## PART 4 — Future Steps (15 Onward), Grouped by What They'll Connect To

Same logic as Part 3: grouped by shared touchpoint, not by step number, so it's visible in advance which future steps will cluster together and which are genuinely standalone.

### Group A — Extends the Schedule/Agenda layer (currently localStorage-only)
**Step 15 — Work Style Selector** → writes `localStorage rpgace_work_style` → read by agenda generator
**Step 16 — Flow State Integration** → writes `journal_entries` (pre/post session energy) → read by agenda generator
**R-24 — Shift difficulty → agenda wiring** → reads Step 16's data + shift ratings → feeds agenda generator
**R-21 — Shifts to Supabase** → migrates shift data from localStorage-only to `rpgace_shifts` table

*Cluster insight: all four feed one thing — the agenda generator's Oracle prompt. None of these need their own display surface; they're all inputs to a single existing output. Build order matters here: R-21 should land before R-24, since R-24 reads shift data that R-21 is migrating.*

---

### Group B — Extends the taxonomy_nodes hub (already the busiest table in the system)
**Step 27 — Taxonomy Sync (encyclopedia → nodes)** → writes `taxonomy_nodes` automatically from encyclopedia entries
**Step 28 — Daily Knowledge Pipeline (n8n)** → writes `taxonomy_nodes` + `encyclopedia` on a 6am schedule
**Step 33 — Phylum XXV Filmmaker Library** → writes `taxonomy_nodes` (50 director profiles) → read by visualOracle
**Timestamped Insights (scheduled)** → writes timestamp field to insights that already populate `taxonomy_nodes`/`encyclopedia`

*Cluster insight: this is the single biggest concentration of future work touching one table. Per Part 3's finding, `taxonomy_nodes` is already the system's real source of truth — these four steps make it richer and more automated, they don't need new infrastructure, just more writers into an existing pipe.*

---

### Group C — Extends content_productions (the project-tracker spine)
**Steps 30-32 — Beat Selling Integration** → adds licence/pricing columns to `content_productions`
**Beatstars auto-listing** (future, depends on 30-32) → reads those new columns → writes to Beatstars API
**Step 34 — Video Pipeline Tab** → reads `raw_footage_path` (already a column) → writes render status back
**Step 35 — Visual Treatment Generator** → reads Beat Log data → writes to `content_productions` as a new entry type

*Cluster insight: per Part 3, this table is already the spine for ConID tracking. All four future steps are column additions or new-entry-type additions to something that exists today — none require a second tracking table.*

---

### Group D — Standalone (no shared touchpoint with existing modules yet)
**Step 17A — Morning Brief n8n automation** → infrastructure-only, doesn't touch a new table, just changes *when* `morningBrief._generate()` fires
**Step 36 — Pre-Launch Checklist** → manual/ops tasks, not a code module at all
**Multi-channel Oracle access (Telegram/Slack)** → would be a genuinely new touchpoint — first module to reach Oracle from outside the web app itself

*Cluster insight: Group D is the honest "actually new architecture" bucket. Everything else in the future roadmap is extending pipes that already exist — this group is the only place where truly new infrastructure gets built rather than existing infrastructure getting richer.*

---

### What this reveals about build order

Reading Groups A–D together: **Group B should be prioritised over Groups A and C**, not because of the 48-hour rule, but because three separate future steps (27, 28, 33) all deepen the same table that Group C's future steps (30-32, 35) will need to *read from* for context. Building Group C before Group B means beat-selling and visual-treatment features launch against a thinner taxonomy than they'll have available later — same class of "built the feature before the foundation" issue as the failed automated-recognition idea earlier tonight, just at roadmap scale instead of single-feature scale.


---

## PART 5 — Log of Ideas Added After Initial Map (kept in sync with Patch Notes)

This section exists so both documents stay aligned. Every new idea logged to Patch Notes gets a matching entry here, showing where it fits in the touchpoint structure above rather than just existing as a standalone note.

### Universal taxonomy detection — GLOBAL via sendToOracle — CONFIRMED, FINAL SPEC, BUILD NEXT SESSION
**Extends:** the existing `_detectPhyla()` function (Part 1, Repurpose button) — but scope widened from 5 named call sites to **fully global**, hooked into `RPGACE.utils.sendToOracle` itself (Part 1's true hub, per the Part 3 finding: "Oracle API — every panel, every quick action... already knows how to reach it").
**Confirmed hook mechanism:** `sendChat()` (main.js, verified from original source) has no completion callback. Detection fires by watching `send-btn.disabled` flip `true`→`false`, which happens synchronously right after `checkForQuestSuggestions(reply)` runs on the same response text — same signal, reused, no new main.js dependency, main.js stays untouched.
**Final architecture (Council of 5, 9 options evaluated):**
1. **Base — cheap local keyword scan, always runs**, zero Supabase cost, fires on every response instantly
2. **Filter — confidence-gated**, only surfaces if 2+ phyla or 1+ gap-relevant concept found, otherwise nothing renders
3. **Display — silent badge ("🌿 N topics"), click-to-expand**, expensive Supabase gap-score pull only happens on click, full checklist UI reused from Repurpose Step 3
**Fits into:** Group B (Part 4) massively widened — instead of 5 new readers of `taxonomy_nodes`, this is now *every* Oracle-touching surface in the system becoming a passive reader, gated so cost stays near the current single-reader baseline.
**Why this is the biggest single interconnection change in the map:** it turns the Oracle hub (Part 3) into a two-way relationship with the taxonomy hub (Part 3) for the first time — previously Oracle only *fed from* taxonomy when explicitly asked (Repurpose); now every Oracle output passively *reports back* what taxonomy it touched, everywhere, cheaply.
**Status:** SHIPPED, live as of July 2. Confirmed working end-to-end: keyword scan fires on every response, confidence gate correctly suppresses weak matches, badge renders, click-expand pulls real gap scores from `taxonomy_nodes`.
**Real bug found during build:** initial wiring used `RPGACE.hooks.on('rpgace:ready', ...)` to attach the observer — this silently failed on every page load because RPGACE's hooks system has no event-replay mechanism (`fire()` only calls handlers registered *before* it runs; `rpgace:ready` had already fired before the `config` module finished registering the callback). Fixed by calling the init function directly with its own self-retry, bypassing the event entirely. This is now a known failure pattern worth checking any time new code depends on `rpgace:ready` firing correctly from inside a module that loads late.

### Shared `getRecentOracleMessages()` helper
**Already logged in Part 3** as the standalone structural insight — no change needed, cross-referencing here for completeness since it originated the same audit this whole document is built from.

### Timestamped Insights + Self-Correcting Frame Pull
**New touchpoint:** adds a timestamp field to the existing insight-generation pipeline (Content Intelligence → `encyclopedia`/`taxonomy_nodes`), and introduces the first on-demand call to **yt-dlp + FFmpeg** (both already installed locally, previously unused by any RPGACE module directly).
**Fits into:** Group B (Part 4) — this is another taxonomy/encyclopedia enrichment step, alongside Steps 27/28/33. Should be sequenced with those three, not built in isolation, since all four are the same "make the knowledge base richer" cluster.

### Beatstars auto-listing + DistroKid reference
**Fits into:** Group C (Part 4) exactly as scoped — Beatstars extends `content_productions` columns, DistroKid stays a manual link field until (a) an account exists and (b) any public API emerges.

### Multi-channel Oracle access (Telegram/Slack via Composio)
**Fits into:** Group D (Part 4) — confirmed standalone, the one genuinely new architecture surface in the current future-roadmap, not an extension of an existing touchpoint.

### Sonnet 5 upgrade (brainstorm stage)
**Touchpoint:** `api/_context.js` `MODEL` constant — single source of truth already confirmed imported by both `oracle.js` and `orchestrate.js`. Not a structural change, a value change, once the exact model string is verified rather than assumed.

---

**Standing instruction, logged here for continuity:** any new idea from this point forward gets written to *both* `RPGACE_PATCH_NOTES.html` (dated entry, full detail) and this file (which touchpoint/group it belongs to, one paragraph). Patch Notes is the record of what and why; this map is the record of where it connects. Keeping both in sync is what stops future sessions from re-discovering the same interconnection gaps from scratch.

---

## PART 6 — Recursive Taxonomy Tree (July 2, GODMODE Council of 5)

The largest interconnection change since the original map — this doesn't just add a new touchpoint, it **replaces the shape** of the `taxonomy_nodes` touchpoint entirely, upgrading it from flat Phylum→concept to unlimited-depth drill-down.

### New tables, new touchpoints
**`taxonomy_tree`** — self-referencing (`parent_id`), any depth, replaces the mental model of `taxonomy_nodes` as "one flat list per phylum." Every node (Phylum through deepest leaf) is the same row shape: name, path, explainer, deep_content, sources.
**`taxonomy_proposals`** — a staging table sitting *in front of* `taxonomy_tree`. Nothing reaches the live tree without passing through here first and being explicitly accepted.

### Four writers into `taxonomy_proposals` (all new)
| Source | Fires when | Blocks pipeline? |
|---|---|---|
| Oracle response badge (existing "🌿 N topics") | User clicks the badge | No — proposal generation happens on click, review is separate |
| Content Intelligence pipeline | End of every unattended run | No — writes silently, pipeline continues |
| Encyclopedia sync | End of every sync | No — same silent-queue pattern |
| Manual button (new) | User-initiated, on demand | N/A — always synchronous by design |

### The review layer (new)
A single Dashboard indicator — **"🌳 X taxonomy proposals waiting"** — becomes the one place all four sources converge for human review. This is architecturally identical to how ConIDPot already works (silent save → later batch review → promote to real tracked entity), just applied to taxonomy structure instead of content ideas. Confirms a pattern is now used twice in RPGACE, which is worth noting: **silent-queue-then-batch-review** is becoming a standard RPGACE interaction shape, not a one-off.

### What this means for Part 3's original cross-reference table
The `taxonomy_nodes` row in Part 3 said: *"Any future module that needs 'what do I know / what's a gap' should read this table directly — it's already the single source of truth."* That statement now needs a caveat: once the tree ships, **new reads should go through `taxonomy_tree`, not `taxonomy_nodes`** — the old table doesn't disappear (existing gap scores, existing concepts stay valid data), but new development should treat the tree as the deeper, more current source, and existing `taxonomy_nodes` rows become effectively depth-0/1 entries within the new structure rather than a separate parallel system.

### Generation logic — the merged prompt
Every accepted node fires one prompt combining two structures: spaced-repetition/Feynman/active-recall framing (learning velocity) + apprentice-to-mastery/stages-tasks-shortcuts framing (expert depth). This reuses the node's own name as the topic — meaning the *same* generation function works whether the node is "Music Theory" (branch, gets explainer only) or "1-1-3-4 Progression" (leaf, gets full technical content). One function, two output depths, gated by `node_type`.

### Sequencing note, consistent with Part 4's Group B insight
Part 4 already flagged that Steps 27/28/33 (all taxonomy-deepening) should land before Steps 30-32/35 (which *read* taxonomy for context). This tree build **is** that deepening work, arriving ahead of schedule relative to the numbered steps — meaning Steps 30-32 and 35, whenever they're built, will have a genuinely deep tree to draw from rather than the flat structure Part 4 was written against. Good sequencing, arrived at independently of the original roadmap order.


---

## PART 7 — Discovered Touchpoint: main.js Schedule Functions (frozen-file violation)

Surfaced accidentally via `git status` during docs cleanup, July 2. Not part of any planned architecture — a pre-existing, undocumented modification to the frozen `main.js` file, committed 11+ days after it was made, with origin untraced.

### New functions, now part of the live system (touchpoint, not a module)
`showSched(type, btn)` → conditionally calls: `autoApplyStoredShifts()`, `buildMonthSlots()`, `buildWeekSlots()`, `initDailyNav()`, `renderDailyGrid()`, `_addSchedButtons()`
`renderAgendas()` → calls `patchAgendaCardsWithSchedule()` on a 400ms delay

### Why this matters structurally, not just as a bug
This is the **first main.js touchpoint** in either document — every other function map (Part 1, Part 2) exclusively covers `rpgace_core.js` modules calling into main.js's pre-existing frozen functions, never main.js being modified itself. This breaks that clean separation, and until the "not showing anymore" bug is diagnosed, it's unclear whether these functions still integrate correctly with `RPGACE.hooks` or if they're now a silent second schedule-rendering path running alongside whatever `rpgace_core.js` modules also do for Schedule.

### Open question for next diagnosis session
Does `rpgace_shifts` (localStorage key, referenced by `autoApplyStoredShifts`) still hold valid data? Does this code assume a Supabase `rpgace_shifts` table exists (logged separately under R-21 as "not yet built")? If the code expects Supabase-backed shifts that were never actually created, that alone explains "worked once, then stopped" — the code degrades gracefully to nothing rather than erroring loudly.


---

## PART 8 — Encyclopedia ↔ Taxonomy Tree Bidirectional Link (confirmed, next session)

Directly resolves the gap Part 3 originally flagged: *"Encyclopedia and taxonomy_nodes currently don't cross-reference each other at all despite being conceptually related."* This part supersedes that gap with a confirmed fix.

### The connection, once built
`encyclopedia` entries gain a forward-reference field → pointing to `taxonomy_tree.id` node(s) generated from them
`taxonomy_tree.sources` (already schema'd, unused until now) → stores the back-reference to the originating `encyclopedia.id`

This makes **two previously isolated touchpoints** (the `encyclopedia` table and the `taxonomy_tree` table, Part 6) into one navigable pair — a user can move from an insight to its structured taxonomy placement and back, with context following across the switch.

### New trigger, same queue
A "🌳 Propose to Taxonomy" button on Encyclopedia cards is **not a fifth trigger source** — it's a second, manual-mode entry into the same `taxonomy_proposals` queue that the silent Encyclopedia-sync auto-propose (Part 6, still unbuilt) will also feed. Same table, same review popup, two ways in: automatic (sync-triggered, silent, batched) and manual (per-entry, deliberate, immediate).

### Stability note carried from Council of 5
Accepting a proposal that originated from an Encyclopedia entry now requires a two-table write (new tree node + back-reference update on the entry), not the single-table write every other trigger source uses. This is the first place in the entire map where accept-a-proposal isn't a single atomic insert — worth flagging for whoever builds this that sequencing/failure-handling needs explicit thought, not just a copy-paste of the existing `_acceptLineage()` logic.


---

## PART 9 — Schedule System: Bugs Found + Unified Scheduling Spec (July 6)

### Bugs fixed this session
**`_calDateStr` UTC/local mismatch:** the calendar's date-computation and date-formatting used two different time bases (local for computing which day, UTC for formatting the lookup string) — a subtle but total correctness bug in the Weekly/Monthly touchpoint from Part 4/6. Fixed by making both local-consistent.
**`rpgace_sched_agendas` vs `rpgace_scheduled_agendas` key mismatch:** confirms a pattern worth watching for elsewhere in the codebase — a single-character key name drift between a writer (`confirmSchedule`, 3 other functions) and a reader (`_calGetSchedAgendas`, 2 call sites) silently broke a touchpoint for an unknown length of time with no error, no console warning, just silent non-display.
**Two dead duplicate functions removed** (`buildMonthSlots`, `buildWeekSlots` old versions) — confirms the June 24 uncommitted main.js changes (Part 7) added new implementations without removing what they replaced.

### New confirmed touchpoint: unified `scheduleToCalendar()`
This is a genuinely new shared function, not yet built, that will become **the single write path into the Weekly/Daily/Monthly calendar system** — currently only `confirmSchedule()` writes here; after this ships, Feynman Loop (new Research-tab sub-section) and Production Live/ConID will write through the same function.

**Data shape:** existing `{title, category, duration_mins, time, date, xp}` plus new `source_type`/`source_id` fields — lets any calendar block link back to its origin module.

**Fits into:** extends Group A (Part 4) — the Schedule/Agenda cluster — by adding new writers (Feynman, Production Live, ConID) into the same calendar data flow that Group A already established between Steps 15/16/R-24.

### Daily-view compaction algorithm (confirmed spec, not yet built)
Converts a flat event list into a gap-filled timeline: multi-hour items become one compacted 2-line block instead of repeating per hour row; partial-hour boundaries split into free/task/free sub-segments down to 15-minute granularity. This is a rendering-layer change only — reads from the same `_calGetShifts()`/`_calGetSchedAgendas()` functions already in use, no new data touchpoint.


---

## PART 10 — Schedule Oracle (locked spec, next session)

The most architecturally significant confirmed-but-unbuilt feature in the whole map — it becomes a new hub, not just another module, once built.

### New touchpoints this creates
- **Content ingestion router** — reads YouTube (via existing Supadata pipeline), PDF, and plain text; routes each to the right existing native handler rather than building new parsers
- **Two-tier session memory, clarified:** an ephemeral "strict rules" layer that self-destructs at Approve (first instance in RPGACE of deliberately-erased memory), and a separate, persistent "approved summary" layer that survives through Start and module completion - because Feynman/Production Live/Encyclopedia need that exact context as their generation input, not a vague restatement. The Reminder button is a view onto this persistent layer, not a separate copy.
- **Post-approval router** — a new decision point that chooses between three existing destinations (Feynman Loop, Production Live, Encyclopedia) based on classifying the approved summary's content

### Fits into existing structure
This is the same "unify, don't duplicate" pattern as `scheduleToCalendar()` (Part 9) - one shared engine (`scheduleOracle()`) callable from 3 different entry points (Oracle-tab direct launch, Oracle-tab chat mode, Oracle-tab URL field), same as `scheduleToCalendar` being callable from both the Agenda-card button and the detailed Schedule modal.

The **Reminder button** extends the exact Start/Done button pattern built in Part 9's Daily Grid rebuild - same styling, same click-handling approach, just a third button and a different click action (redisplay stored summary instead of state-changing).

The **auto-routing confidence gate** reuses the same 2+ keyword confidence-gate concept from Part 6's taxonomy detection, applied to a new classification problem (which module to launch) instead of the original one (which phylum matches).

### Deliberately deferred, not forgotten
Instagram/TikTok ingestion, raw mp3/mp4 upload - both explicitly out of MVP scope. Confirmed reason: Instagram already known-blocked (per `sendChat`'s own system prompt, discovered mid-session), TikTok never attempted anywhere in RPGACE, raw audio needs Whisper which currently only exists in local Python scripts, not the web app itself.


---

## PART 11 — July 6 Day Log Summary (full reflection in Patch Notes)

Full Council-of-5-converged reflection lives in `patch_notes.html` under "July 6 — Day Log." Summary for the map's own record:

**Root pattern behind today's hardest stretch (6-iteration Daily Grid rebuild):** positioning logic was written and shipped before ever seeing real rendered output. Fixed by abandoning pixel-math positioning entirely for normal document flow — fewer ways to be wrong beats more careful math.

**Three bugs, one shared cause:** UTC/local date mismatch (3 locations), two incompatible parallel scheduling systems, duplicate button injection — all three trace back to code being added without first checking what already existed at that touchpoint.

**Five new development rules logged** (screenshot-before-positioning-code, grep-before-adding-UI-behaviour, prefer-flow-over-absolute-positioning, verify-before-second-blind-patch, defer-whole-multi-subsystem-asks) — full text in Patch Notes, referenced here so both documents point to the same standing rules rather than duplicating them differently.

**Confirms the standing update discipline held all session:** every new idea (taxonomy tree extensions, Schedule Oracle, main.js discoveries) got logged to both files as it was confirmed, not batched at the end — this is now the proven default working pattern for RPGACE sessions going forward.


---

## PART 12 — RPGACE Full Manual Breakdown + Future Patch Notes Roadmap (July 6, closing)

### Full Manual Breakdown now live
`rpgace.vercel.app/manual.html` merges this Interconnection Map, Patch Notes, and the original architecture manual into one document — full session history, per-feature leverage guides, complete bug log, and a "Food For Thought" section analyzing genuine code-merge opportunities (4 confirmed worth doing, 2 explicitly rejected with reasoning). Sidebar is collapsible, defaults collapsed on mobile.

### Future Patch Notes — full roadmap, F1 through F18
A complete, numbered, dependency-ordered consolidation of every confirmed-but-unbuilt item across the entire July 1-6 session now lives in Patch Notes under "Future Patch Notes," styled like the original July 1st Reboot's 36-step checklist. Five tiers:

1. **Tier 1 (F1-F3)** — small system-level simplifications (shared Oracle-message helper, shared keyword-scoring helper, dead dedup removal) — the three confirmed Food-For-Thought merges, now given step numbers and priority
2. **Tier 2 (F4-F8)** — taxonomy tree completion — the four remaining trigger/UI pieces plus the deferred selection-criteria brainstorm
3. **Tier 3 (F9-F12)** — schedule system completion — Reminder button, Task Scheduler automation, Schedule Oracle Phases 1 and 2
4. **Tier 4 (F13-F18)** — original July 1st Reboot steps still pending, renumbered and cross-referenced to what's already been superseded
5. **Tier 5** — low-priority ideas and explicitly blocked items (multi-channel Oracle, Sonnet 5 upgrade, DistroKid, frame-pull system)

This is now the single authoritative "what's next" reference — future sessions should start here rather than reconstructing priority order from scattered individual entries across both documents.


---

## PART 13 — Taxonomy Sorting Agent (July 8, replaces earlier per-node council concept)

Major architecture correction from Part 6/9's earlier framing. Supersedes any implication that AI reasoning lives inside the tree itself.

### The corrected model
**One agent, not per-node AI.** The "Taxonomy Sorting Agent" knows the full tree structure and, given any insight, either maps it onto an existing path or invents a new one autonomously (new classes/orders, not just new leaves), always via accept/reject/modify.

### Cost architecture — the actual design constraint
AI reasoning is confined to exactly two touchpoints: the Sorting Agent's classification decision, and the Council-of-5 justification text shown at Lineage Proposal time. **The tree itself — every node, every browse, every display — is pure static data with zero AI cost.** This is the opposite of "AI in every node," which was the original ask's literal wording; the corrected version keeps the same functional outcome (intelligent, justified placement) at a fraction of the cost.

### New shared touchpoint: book knowledge table
A new Supabase table, explicitly designed to be queried by any domain — not siloed to taxonomy. Oracle is named specifically as a future consumer. Reuses the ingestion pipeline already spec'd for Schedule Oracle's PDF handling rather than building parallel infrastructure.

### Jargon Encyclopedia — the payoff view
Not new infrastructure — a read-only view over `taxonomy_tree`'s leaf nodes. Confirms the tree's design (name + explainer per node) was already shaped to support this without modification.

### Explicitly deferred
Circles (rabbit-hole nav) stays inside Research tab. A Research-tab declumping session is now a confirmed prerequisite, logged as its own future item.

### Known open bug, blocking full confidence in this session's testing
Propose-lineage button missing on phyla beyond the 5th in the scrollable badge panel — real cause not yet confirmed, needs `_expandPhylaDetail`'s actual current source.


---

## PART 14 — Future Integration Vision (a-f), July 8

Six confirmed future directions, logged for continuity. Full detail in Patch Notes Tier 6.

**a-d** extend already-established touchpoints: social platforms extend Composio connectors; video editing extends F17/F18; the learning environment unifies Feynman+Encyclopedia+Taxonomy into one curriculum; auto-logging extends Journal+Content Production Live.

**e — Autonomous self-improvement meta-agent.** The most structurally novel item logged this session — an agent with standing permission to *directly correct* confirmed-poor existing implementations without asking, while still requiring permission to *adopt* new ideas. This is a genuinely different governance shape than anything else in RPGACE, which otherwise never modifies itself without an explicit user-issued instruction each time.

**f — Competitor/book insight pipeline, with a concrete worked template.** Insight → taxonomy leaf node → structured summary (what/how/used-on-what) → clickable footnote back to source. This confirms `intel_bibliography`'s purpose extends beyond Content Intelligence specifically into general taxonomy leaf sourcing — the same citation infrastructure serves both. Directly connects to the Taxonomy Sorting Agent (Part 13): once that agent exists, insights from books/competitor research become just another input source alongside Oracle/Content Intelligence/Encyclopedia sync, all converging on the same leaf-creation-with-footnote pattern.

**Open design question, carried forward:** the exact template structure for a "complete outlook" leaf summary needs designing once, so every Sorting-Agent-created node is consistent rather than separately reasoned each time.


---

## PART 15 — Oracle Timeout Bug (July 8, partial fix, still open)

New touchpoint discovered: `api/oracle.js`'s `maxDuration` config, previously unset (using Vercel's account-default ceiling). Raised to 60s — insufficient on its own.

**Diagnostic finding worth preserving:** the bug is response-shape-dependent, not universal. Long, heavily-structured multi-part responses (3-layer teaching format) time out; shorter conversational/Socratic-method responses on the identical topic complete normally. This narrows the real cause to either genuine generation-time length or a hang inside `callClaude()` (`api/_context.js`), not a blanket Oracle failure.

**Next diagnostic step:** pull real `api/_context.js` source before any further fix attempt — consistent with the standing rule against guessing at unseen server-side code.

