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
