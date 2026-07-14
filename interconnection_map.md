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

---

## PART 16 — Diagram Chain: Atomic → Module → Domain → Full System

Built via GODMODE + Council of 5, July 8. Same content as Parts 1-15, presented as a progressive visual chain — each level combines the pieces from the level before it, so the mechanism is understandable at every scale rather than only as one dense final diagram.

### Level 1 — Atomic (one button, one path)

**Example A: Save an idea**
```
[💡 Save Ideas button]
        │
        ▼
[conidPot.saveIdea()]
        │
        ▼
[Supabase: conid_pot table]
```

**Example B: Schedule a task**
```
[Click free calendar row]
        │
        ▼
[scheduleToCalendar()]
        │
        ├──▶ [localStorage: rpgace_sched_agendas]  (instant UI)
        │
        └──▶ [Supabase: rpgace_agendas]  (cross-device sync)
```

**Example C: Propose a taxonomy lineage**
```
[🌳 Propose lineage button]
        │
        ▼
[taxonomyTree.proposeLineage()]
        │
        ▼
[Oracle API — generates path]
        │
        ▼
[Popup: accept / edit / reject]
        │
        ▼ (on accept)
[Supabase: taxonomy_tree]
```

### Level 2 — Module (several atomic paths combined)

**Beat Log module — 4 atomic paths firing from ONE button click**
```
                    [⚡ Log Beat + Find Artists]
                              │
        ┌──────────────┬──────┴───────┬──────────────┐
        ▼              ▼              ▼              ▼
  [Supabase:      [refCorpus       [taxonomySync   [Oracle API:
   video_jobs]     .findMatches()]  .markApplied()] content brief]
        │              │                                │
        │              ▼                                │
        │        [Last.fm API]                          │
        │        (if no corpus match)                   │
        │                                                ▼
        │                                        [Journal + XP award]
        ▼
  [Beat Log display updates]
```

**Taxonomy Tree module — the propose/accept cycle, full loop**
```
[Any insight source] ──▶ [proposeLineage()] ──▶ [Oracle: generate path]
                                                        │
                                                        ▼
                                          [_checkForMorph() — duplicate check]
                                                        │
                                          ┌─────────────┴─────────────┐
                                          ▼                           ▼
                                   [New lineage]              [Existing match found]
                                          │                           │
                                          ▼                           ▼
                                [Show accept/edit/reject]   [Offer: update existing]
                                          │
                                          ▼ (accept)
                          ┌───────────────┴───────────────┐
                          ▼                                ▼
                [Supabase: taxonomy_tree]          [_generateNodeContent()]
                   (write real nodes)                       │
                                                              ▼
                                                    [Oracle: deep leaf content]
```

### Level 3 — Domain (modules combined within one domain)

**CONTENT domain — how Beat Log, Repurpose, and Content Production Live chain together**
```
[Beat Log] ──produces──▶ [Content ideas + artist brief]
                                    │
                                    ▼
                          [🔀 Repurpose (3-step popup)]
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                              ▼
          [4 platform outputs]          [contentProductionLive.createEntry()]
                                                    │
                                                    ▼
                                          [New ConID, tracked:
                                    Idea→Scripted→Filmed→Edited→Posted→Analysed]
                                                    │
                                                    ▼
                                          [Dashboard widget updates]
```

**LEARNING domain — how Encyclopedia, Feynman, and Taxonomy Tree feed each other**
```
[Encyclopedia entry] ──┬──▶ [Knowledge Gap Tracker: surfaces top gap]
                        │              │
                        │              ▼
                        │    [🧠 Study Now → Feynman Loop (3 phases)]
                        │              │
                        │              ▼
                        │    [Journal save + gap score update]
                        │
                        └──▶ [🌳 Propose lineage → Taxonomy Tree]
                                       │
                                       ▼
                             [taxonomy_tree: new/updated node]
```

### Level 4 — Full System (every domain converging on the two real hubs)

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
         │ Manual entry      │  │ Knowledge Gap     │  │ Future: Content  │
         │ (Research tab)    │  │ Tracker reads     │  │ Intelligence +   │
         │                   │  │ gap scores         │  │ Encyclopedia     │
         │                   │  │                    │  │ auto-propose      │
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

### What this chain reveals, stated plainly

Every domain in RPGACE ultimately touches one of exactly two hubs — **Oracle** (for generation) or **Taxonomy Tree** (for knowledge structure) — except the Schedule system, which runs as a genuinely separate, self-contained loop (shifts + agendas + calendar) with no taxonomy dependency at all. This is useful to know precisely: the Schedule system could be extracted or rebuilt independently without touching Oracle or Taxonomy, but any change to either hub ripples through nearly everything else.

### New standing rule, confirmed July 8 — renamed and extended July 12: "Oversight"

Every future documentation update applies to all living docs by default, not only when explicitly requested — same discipline already proven to work for code changes, now formalized for documentation too. As of July 12 this group has a name and a fourth member: **Oversight** = Patch Notes, this Interconnection Map, the Full Manual, and the new **Taxonomy Map** (`taxonomy_map.html`). The first three are hand-updated session logs; Taxonomy Map queries `taxonomy_tree` live from Supabase on every page load, so it never needs a manual data update — only its own code changes if the underlying columns change. "Update Oversight" now means: update all 4 with what happened in the session, each in the format it's actually good at (Patch Notes = full narrative, Interconnection Map = new/changed function chains, Full Manual = polished lighter-touch sync, Taxonomy Map = usually nothing, it's live). See `CLAUDE.md`'s OVERSIGHT DOCS section for the durable version of this rule.

---

## PART 17 — July 12 Session: Taxonomy Proposals Pipeline, Schedule Oracle Phase 1, Oversight (this session)

**● 🌳 Propose to Taxonomy** (Encyclopedia cards, per-entry — new)
`encTaxonomyLink._propose()` → `taxonomyTree.silentPropose()` (same Oracle-generated lineage as the interactive `proposeLineage()`, but queues instead of popping the accept dialog) → ▢ **Supabase `taxonomy_proposals`** (`status: 'pending'`) → card shows "⏳ Proposal pending review" until reviewed

**● Content Intelligence sync completion → silent auto-propose** (new)
`ciAutoPropose` wraps `window.syncIntelData` → keyword-gated scan of each new report (2+ weighted hits, see Part 13/F8 below) → `taxonomyTree.silentPropose()` → ▢ **Supabase `taxonomy_proposals`**

**● Encyclopedia sync completion → silent auto-propose** (new)
`encSync._autoPropose()`, same wrap-and-scan pattern as above, hooked into the existing `syncAndPush` patch → ▢ **Supabase `taxonomy_proposals`**

**● 🌳 X taxonomy proposals waiting** (Dashboard badge — new)
`taxonomyReviewQueue._inject()` reads count of ▢ **Supabase `taxonomy_proposals`** where `status=pending` → click → batch popup → **Accept** reuses `taxonomyTree._acceptLineage()` unchanged (writes ▢ **`taxonomy_tree`**, marks the originating proposal `accepted`) → **Edit** reuses `taxonomyTree._showProposalPopup()` unchanged → **Reject** marks the proposal row `rejected` directly, no tree write

**● 🔔 Reminder** (Daily Grid agenda blocks, third button alongside Start/Done — new)
`agendaReminder` wraps `renderDailyGrid()` → reads the block's own row from `localStorage.rpgace_sched_agendas` → popup shows stored title/description/category/duration/XP, no Oracle call, no Supabase read

**● 📅 Schedule Oracle** (3 entry points — new, Phase 1 only)
Direct-launch button, chat-mode trigger (`schedule oracle:` / `schedule this:` / `learn later:` prefix intercepts `sendChat()`), or the panel's own paste field → `scheduleOracle._ingest()` → ▢ **`/api/scout`** (URL detect + Jina fetch + type ID) ⋯> ▢ **`/api/analyst`** (type-aware analysis) → sequential 3-option reveal, one acknowledged at a time: **Save to Encyclopedia** → ▢ **Supabase `encyclopedia`**; **Schedule a session** → `openSchedModal()` pre-filled, same write path as the existing Schedule system; **Queue for Taxonomy Tree** → same `silentPropose()` path as the Encyclopedia button above. Phase 2 (carousel toggle, two-tier session memory, auto-routing confidence gate) is not built — depends on this phase, separate pass.

**● 🎬 Director Match** (Visual Oracle, existing button — chain corrected)
Previously told Claude to imagine "the Phylum XXV filmmaker library" with no real data behind it. Now `visualOracle._withFilmmakerLibrary()` reads ▢ **Supabase `taxonomy_nodes`** (`source='f14_filmmaker_library'`, 50 real director profiles spanning action/blockbuster/arthouse/horror/animation, phylum 14) and injects the real list into the prompt before it reaches ▢ **Oracle API**.

**● 📋 Add post details, licence + price fields** (ConID cards — extended)
Same questionnaire, two new fields → ▢ **Supabase `content_productions`** (`licence_type`, `price` — both nullable, precondition for F16's Beatstars listing generator, see Part 18)

**● n8n rota sync** (new, file-based — not a live app touchpoint)
`n8n/rota_sync_workflow.json`, importable Cron trigger → Execute Command running `scripts/fourth_rota.py` locally, which now reads `.fourth_credentials` if present instead of always blocking on interactive login prompts. Not wired to any Supabase table directly — the script still writes a local console-command file for manual paste, unchanged.

**Phyla keyword scoring, corrected (F8, affects every chain above that calls `silentPropose`/`isPlausiblePhylum`)**
`RPGACE.utils._PHYLA_KEYWORDS` now covers all 21 phyla (was 14), each keyword weighted (2=specific, 1=generic) instead of counted flatly, matched by word-boundary regex instead of substring, threshold moved to `RPGACE.utils.PHYLA_MATCH_THRESHOLD` (3) shared by `_quickPhylaScan`, `isPlausiblePhylum`, and `contentRepurpose._detectPhyla` (a third independent copy of this list, found and consolidated onto the same scorer).

## PART 18 — July 13 Session: First Real Smoke Test + F16, F17, F18 (this session)

**Confirmed via smoke test:** F14's grounding is real (Director Match matched Malick/Wong Kar-wai/Villeneuve correctly from the corrected library, not invented). Two bugs found and one fixed:

**● Oracle request concurrency guard** (`scheduleOracle._injectEntryPoints()`'s existing `window.sendChat` wrap — extended)
Root cause of the "Learn in 20 Hours" (Prod Oracle) response coming back as filmmaker content: `sendChat()`'s `send-btn.disabled=true` is a visual-only guard, `STATE.chatHistory` is one shared global array, and `#typing-indicator` is one shared fixed DOM id referenced by multiple completion handlers — so two overlapping requests (a slow Director Match still pending + a new Prod Oracle click) could cross-wire, whichever resolved first stealing the other's placeholder. Fixed by adding a `window._oracleRequestInFlight` guard as the first check in the wrap — a second call while one's pending is now blocked with a toast instead of firing concurrently. No `main.js` edit needed.

**● F11 ingestion failure still silent** (not fixed this session, flagged only)
A YouTube URL Jina couldn't fetch produced "Content Unavailable" placeholder data that flowed silently through Encyclopedia save / Schedule / Taxonomy queue instead of stopping with a clear error.

**● 🎧 Beatstars Listing (F16 — new, scoped down from original "auto-listing" spec)**
Premise-checked first, same discipline as F10: BeatStars has no public API for creating listings (confirmed via web search — a repeatedly-requested, still-unimplemented feature on their end). Rescoped to content generation, not auto-posting. `contentProductionLive`'s ConID action row gets a new button, shown only when F15's `licence_type` field is set on that row → `_generateBeatstarsListing(row)` queries ▢ **Supabase `video_jobs`** (`status=beat_logged`, fuzzy title match against the ConID title) for a matching Beat Log entry, pulling real BPM/key/mood when one exists and falling back to ConID-only data when it doesn't → builds a prompt carrying the actual licence terms text for lease/non-exclusive/exclusive (written out directly, not left for Oracle to invent) plus price → ▢ **Oracle API** returns title options, description, tags, and the licence terms block, ready to paste into BeatStars by hand. Depends on F15's fields (cleared July 12) and, loosely, on Beat Log (`beatLog` module → `video_jobs`) for the richer BPM/key/mood version — degrades gracefully without it. Not yet hand-tested.

**Bigger finding while building the above: ▢ Supabase `video_jobs` did not exist.** Confirmed via `list_tables` — the table `beatLog` has been inserting into since it shipped was never actually created, so every Beat Log save has been silently failing (the insert's `.catch()` only logs a console warning). This also means F16's lookup above would always have hit its graceful-fallback path in practice. Created the table this session (migration `create_video_jobs_table`, RLS policy matching `content_productions`'/`reference_tracks`' `anon_all` convention) with the columns `beatLog` already assumed (`title, status, script, edl, raw_path, style_profile_id`) plus what F17 (below) needed.

**● 📹 Video Pipeline tracker (F17 — new, scoped down from original "EDL review, approve & render, connects to local_server.py job queue" spec)**
Premise-checked, same discipline as F10/F16: `local_server.py`'s only confirmed endpoints (`main.js` lines 3959–4174) are `/reports`, `/push-to-supabase`, `/watchlist` — Content Intelligence only, nothing render-related — and no EDL generator or render engine exists anywhere in the stack. Rescoped, per direction, to tracking only. New `videoPipeline` module: dashboard widget mirroring `contentProductionLive`'s ConID tracker's exact visual pattern (progress-dot bar, colour-coded status badge) over ▢ **Supabase `video_jobs`** rows. Five stages: `beat_logged → raw_footage → edited → rendered → exported`, one "→ Mark [stage]" button per row (`videoPipeline.updateEntry()`, same direct-PATCH pattern as `contentProductionLive.updateEntry()`). "📋 Paths + exports" popup holds `raw_path`/`edited_path`/`rendered_path`/`notes` plus the 4 export slots the spec asked for (`export_paths` jsonb: youtube/instagram/tiktok/beatstars) — plain text fields for a URL or path once that step is done manually outside RPGACE, no automation. "+ New" creates a standalone job (`status: 'raw_footage'`) for videos that don't originate from Beat Log. Not yet hand-tested.

**● 🎬 Auto Visual Treatment Doc (F18 — new)**
Optional checkbox on the Beat Log form, off by default (it's a second Oracle call). When checked, `beatLog._waitThenAutoVisualTreatment()` polls `window._oracleRequestInFlight` (the same guard from the concurrency fix above) until the main beat-log Oracle response clears — firing immediately would just get blocked by that guard and silently dropped — then `_autoVisualTreatment()` builds visualOracle's own Visual Treatment Doc structure directly from the beat's real title/key/scale/BPM/mood/colour-palette (no manual trip through the Visual Oracle panel, no placeholder-filling via `fillGaps`) and reuses `visualOracle._withFilmmakerLibrary()` — the same F14 grounding Director Match uses — so Oracle names a real director rather than inventing one. Sends to ▢ **Oracle API** via `RPGACE.utils.sendToOracle()`. Not yet hand-tested.

## PART 19 — July 14: phylum labeling system + 2 bugs + 2 bridged phyla (this session)

Started as a no-code brainstorm session grounded by two Explore agents (real F0-F18 state from patch_notes.html/manual.html; real per-phylum data counts from Supabase + rpgace_core.js), written up as a menu of future ideas at `/root/.claude/plans/woolly-watching-lamport.md`. Extended into a real build once the brainstorm surfaced two concrete bugs and a well-scoped labeling requirement.

**Two bugs found + fixed, not previously logged anywhere:**
1. Phylum 14 (Visio Cinematica) was displayed and sent to Oracle as "Phylum XXV" in 6 places inside `visualOracle` (Director Match's command text, the panel subtitle, the panel note, the `_withFilmmakerLibrary()` injected block, and F18's checkbox label) — a leftover from an old numbering scheme. The Supabase data itself was always correctly tagged `phylum_number=14`; only display/prompt text was wrong.
2. `beatLog._addNewArtistsToTaxonomy()` (the `lastfm_beat_match` source) wrote `phylum_number: 17` while its own comment and `phylum_name` field both said "Fons Educationis" — but Fons Educationis is phylum 12, not 17 (17 is Negotium). Fixed the number to match the already-correct name. No rows existed yet from this path.

**● Canonical phylum labeling — new shared touchpoint**
Added `taxonomyTree.PHYLUM_PURPOSE` (one-line role reminder per phylum, sitting alongside the existing `PHYLUM_NAMES`/`PHYLUM_ENGLISH` maps on the same module) plus two new `RPGACE.utils` helpers that read those maps at call time: `phylumLabel(num)` → `"Phylum N — Latin (English)"` for short UI text, and `phylumContext(num)` → the same plus `". Purpose: ..."` for anything headed to ▢ **Oracle API**. Every live-app site that named a phylum was switched to call one of these two — `visualOracle` (all 6 sites from bug #1, now correct by construction), `contentRepurpose`'s detected-phyla list, `knowledgeGap`'s gap cards, `taxonomyTree`'s propose-lineage dropdown, both `proposeLineage()` and `silentPropose()`'s Oracle-bound "ROOT PHYLUM" prompt line (this is the one that matters most — every taxonomy lineage generation now hands Oracle the phylum's English name and purpose, not just its Latin name), `_showProposalPopup()` (now also renders the purpose line beneath the title), `beatLog`'s eyebrow + colour-palette display, and `refCorpus`'s eyebrow (two phyla). `taxonomy_map.html`'s own `PHYLA` object gained a `purp` field and three render sites (phylum-overview cards, per-phylum tree section headers, the transition-diagram group labels, the empty-phyla list) now show it. Deliberately left alone: the Latin-only path breadcrumbs inside a generated lineage (e.g. "Compositio → Chord Voicings → ...") — that's an existing, intentional convention stated directly in the lineage-generation prompt ("Only the Phylum name uses Latin. Every other step uses plain, clear English"), not a labeling gap.

**● Two phyla bridged with already-existing data, instead of new reference libraries**
Per the brainstorm doc's "reuse before invent" finding — several empty phyla already had their real content sitting elsewhere in the app, just never tagged into taxonomy:
- Phylum 11 (Lingua Musicae) ← `beatLog.SCALE_COLOURS` (10 scale→colour mappings, previously code-only) → 10 new rows in ▢ **Supabase `taxonomy_nodes`**, `source='beatlog_scale_colours'`.
- Phylum 16 (Venditionis Beatorum) ← F16's 3 hardcoded licence-term texts (lease/non-exclusive/exclusive) → 3 new rows, `source='f16_licence_terms'`.
Both follow the same `source`-tagging convention F14 established (`f14_filmmaker_library`).

**Deliberately not built this pass** (logged as future menu items in the plan file, not dropped silently): new from-scratch reference libraries for the other empty phyla, the Oracle 504 timeout fix, F11's ingestion-failure fix, and the rest of the F0-F18 depth-improvement tiers from the brainstorm.

## PART 20 — July 14: "Phylum Path" — bottom-up insight → article pipeline, Phylum 1 pilot (this session)

Spec'd via an 8-question questionnaire before any code was written (full record: `/root/.claude/plans/woolly-watching-lamport.md`) — a new pipeline, direction-inverted from the existing `taxonomyTree.proposeLineage`/`silentPropose` (top-down: one topic placed into a path from phylum to leaf, in one shot). Phylum Path instead starts from a granular teaching insight and builds up, attaching at whatever rank it genuinely needs.

**New shared touchpoint: `taxonomyTree.RANK_NAMES` + `rankNameForDepth(depth)`** — Phylum/Order/Class/Family/Genus/Species/Variant by depth index. Previously this naming convention only existed as a display-only array inside `taxonomy_map.html`; this is the first time the live app itself reasons about rank names rather than raw `depth` integers.

**● 🧬 Phylum Path (new module, `phylumPath`)**
Button in the Oracle quick-row → panel showing `RPGACE.utils.phylumContext(1)` (purpose reminder), a manual insight textarea, "📄 Generate Phylum-Level Article" for the root, and a live tree of ▢ **Supabase `taxonomy_tree`** rows for phylum 1, each with its own "📄 Generate/Refresh Article" button.

`_placeInsight(text, phylumNumber)` → fetches existing phylum-1 structure → ▢ **Oracle API** with a prompt asking it to decide an attach point (must exact-match an existing `path` string — extends `_checkForMorph`'s exact-match idea to per-rank attachment instead of only whole-leaf duplicate detection) and however many new ranks are genuinely needed, reasoned through 5 explicit checks (pedagogical clarity / non-redundancy / practical applicability / structural fit / expansion headroom) — the phylum-specific operationalization of this project's Council-of-5 convention as an actual prompt instruction, not just a human planning ritual → `_insertNewSteps()` chains the new rows into ▢ **`taxonomy_tree`** using the exact same `Prefer: return=representation` chained-`parent_id` pattern as `_acceptLineage` → `_generateInsightContent()` fires a second ▢ **Oracle API** call (persona: "private tutor, PhD in this phylum", extending Prod Oracle's existing 3-layer method — simple terms → technical mechanics → expert nuance — rather than a new prompt shape) and PATCHes the deepest new node's `deep_content`.

`_generateArticle(node)` (node `null` = the phylum root itself) → gathers that node + all descendants' `explainer`/`deep_content` → ▢ **Oracle API** synthesizes a real article → `saveOracleToEncyclopedia()` (main.js) → ▢ **`encyclopedia`** → `taxonomy_node_id` linked back, same mechanism F7's `encTaxonomyLink` already established (no new article storage built).

**● Auto-detect entry point** — reuses the exact same `#send-btn` disabled-attribute completion signal `RPGACE.utils._initPhylaObserver` already watches (a second, independent `MutationObserver` instance, not a modification of the shared one), scores the last completed Oracle response against phylum 1's newly-enriched keyword list (`RPGACE.utils.phylaKeywordScore`), and surfaces an opt-in "🧬 Add to Phylum Path?" button rather than auto-committing anything — same "detect, then let the human confirm" shape as F4/F5/F6's proposal queue.

**Real data finding that shaped scope, not fixed this pass**: live-queried phylum 1's real 23 `taxonomy_tree` rows before designing — every row has `parent_id: null` (the known pre-July-12 flat-lineage bug, confirmed still un-migrated; questionnaire answer: repair deferred, Phylum Path only touches new insights), and `deep_content` is empty on all of them despite `_generateNodeContent` supposedly populating it — a second, previously-undiscovered bug, also deferred (questionnaire answer: Phylum Path uses its own separate content-gen call regardless, doesn't block on investigating this).

**Feeds into F8's phyla-keyword scorer** (Part 18 above) — phylum 1's keyword list was enriched from 7 to ~140 terms this session (a real jargon sweep across scales/modes, chord types, progressions, melody construction, harmony, intervals, UK-drill production slang, and FL Studio-specific terms) specifically to seed both Phylum Path's placement quality and its auto-detect gate. Deliberately asymmetric with the other 20 phyla (still 6-8 terms each) — flagged as a real tradeoff in patch_notes.html, not silently absorbed.

Not yet hand-tested — no live browser session available in this environment.

**Two fixes made same session, immediately after shipping the above** (asked to audit the codebase for efficiency upgrades — found both, verified, and fixed rather than just reporting):

**● `RPGACE.cache.clear()` bug — cache-busting on write never worked**
`RPGACE.cache` (60s TTL, transparently wraps every ▢ **`RPGACE.sb.select()`**) stores entries under `table + '|' + params`. `RPGACE.sb.insert()`/`update()`/`del()`'s cache-busting wrappers all called `RPGACE.cache.clear(table)` with the bare table name — never matching a real composite key, so busting silently did nothing since the caching layer was added. Confirmed via a standalone Node simulation before/after. Fixed to prefix-match (`k === key || k.indexOf(key + '|') === 0`). Real-world effect: any table not in the `noCache` list (`taxonomy_tree`/`taxonomy_nodes` included) could serve stale reads for up to 60s after a write — directly relevant to Phylum Path's tree view above.

**● Self-inflicted duplicate `MutationObserver`**
Phylum Path's auto-detect (built minutes earlier, same session) installed its own second observer on `#send-btn`, duplicating `RPGACE.utils._initPhylaObserver`'s existing one and re-querying the chat DOM again on every completed Oracle response — the exact "didn't grep before adding new UI behavior" pattern this project has repeatedly caught before. Fixed by adding a new `RPGACE.hooks.fire('oracle:response-scanned', text, lastMsg, matches)` call inside `_runPhylaScan` (right after computing `matches`, before its own 2+-phyla confidence gate), and having `phylumPath` subscribe to that hook instead of owning an observer — also lets it read phylum 1's score straight out of the already-computed `matches` instead of re-scoring. 4 `MutationObserver` instances → 3; any future per-phylum auto-detect is now a hook subscription, not another observer.

## PART 21 — July 14: Phylum 1 data repair + full tree buildout from the 90-term jargon sweep (this session)

Done directly against ▢ **Supabase `taxonomy_tree`** via SQL, not through the live app (no browser access this session):

**● Flat `parent_id` bug fixed on real data** — all 23 pre-existing Phylum 1 rows had `parent_id: null` (the known pre-July-12 bug, confirmed still un-migrated). Backfilled by matching each row's `path` minus its last `/segment` against another row's full `path` in the same phylum; verified zero depth>1 rows with a null `parent_id` afterward.

**● Garbage-named leaf cleaned up** — a node whose `name` was a 298-character gamified quest-plan blob (found while designing Phylum Path) renamed to a real concept label, with the original text relocated into `deep_content` and a proper `explainer` added.

**● `taxonomyTree._generateNodeContent()` trimmed** — best-supported theory for `deep_content` being empty on every real leaf: the same already-documented Oracle 504 timeout, failing silently since this call is fire-and-forget (`.catch()` only `console.warn`s). Cut from a 5-section/1500-token ask to the 2 sections unique to this column (explainer + real technical content), dropping 3 sections that duplicated Feynman/Prod Oracle's existing coverage elsewhere. Not empirically confirmed as the actual cause — if leaves still come back empty, the timeout needs its own dedicated fix next, not another blind prompt trim.

**● Phylum 1 tree built out from the 90-term jargon sweep** — 32 new rows extending the 5 existing Orders plus one brand-new 6th Order ("Genre & Production Vocabulary" for UK-drill/FL-Studio-specific jargon that didn't fit the existing 5). Every one of the 90 terms lives under a real node now, grouped into coherent terminology-bucket leaves (e.g. "Cadence & Resolution Vocabulary" holds cadence/resolution/tension/i-iv-v/ii-v-i/circle of fifths/pivot chord/modulation/progression) rather than 90 individual leaves. All new rows chained via real `parent_id` from creation (no repeat of the flat-lineage bug). Tagged `source: phylum_path_manual`; terminal nodes carry a placeholder `deep_content` flagging that full teaching content isn't generated yet, ready for Phylum Path's "Generate/Refresh Article" button. Total Phylum 1 row count: 23 → 55.

Not yet hand-tested in the live app — all verified via direct SQL query, not by clicking through the UI.
