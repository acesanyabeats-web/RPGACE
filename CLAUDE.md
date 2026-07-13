# RPGACE — Claude Code Project Context

## WHAT THIS IS
RPGACE is a gamified life management web app for Alex (@AceSanyaBeats) — UK music producer
(Russian/French, grew up London) building toward 100k YouTube with FL Studio content.
Live: https://rpgace.vercel.app
Local: C:\Users\acesa\Downloads\rpgace-vercel-v4
Deploy: npx vercel --prod (or git push if GitHub Actions is set up)

---

## FILE STRUCTURE (after Step 1 split)
```
rpgace-vercel-v4/
  index.html      ← HTML shell — pages, nav, gate div. Loads main.js AND rpgace_core.js.
  main.js         ← Original application logic (Step 1 split). "Never modify again" per
                    rpgace_core.js's own header — new features go in rpgace_core.js instead.
  rpgace_core.js  ← Everything since Step 8+. RPGACE.register() module system — this is
                    where new features actually get added now, not main.js.
  style.css       ← ALL styles. Edit this for visual changes.
  CLAUDE.md       ← This file (you're reading it)
  api/
    _context.js   ← Composio account IDs + API keys
    oracle.js     ← Oracle AI endpoint
    executor.js   ← Composio tool executor
    scout.js      ← Content Intelligence scout
    analyst.js    ← Content Intelligence analyst
    noter.js      ← Note generation
    orchestrate.js← Multi-agent orchestrator
    search.js     ← YouTube search (no API key needed)
  vercel.json     ← Routing config
  saved_conversation.md ← Seeded Oracle session (INSTA-ORACLE strategy)
  patch_notes.html, interconnection_map.md, manual.html, taxonomy_map.html
                  ← the 4 Oversight docs — see OVERSIGHT DOCS section below
```

---

## OVERSIGHT DOCS — update these at the end of every session

**"Oversight"** is these 4 files, treated as one group:

| File | Type | What it's for |
|---|---|---|
| `patch_notes.html` | Hand-updated log | Day-by-day build log — what shipped, bugs found/fixed, still-open items |
| `interconnection_map.md` | Hand-updated log | Every button/module's full function chain, data flow, Supabase touchpoints |
| `manual.html` | Hand-updated log | Polished merge of Patch Notes + Interconnection Map + architecture, for daily reference |
| `taxonomy_map.html` | **Live document** | Queries `taxonomy_tree` directly from Supabase on every page load — never a stale snapshot, unlike the other 3 |

All 4 are linked from the Dashboard's "Oversight" box (`docsLinks` module in `rpgace_core.js`), always pointing at whatever is currently deployed.

**When the user says "update oversight"**, it means: update all 4 files with what actually happened in the session just finished — new features, bugs found and fixed (or found and deliberately left), schema changes, corrected doc claims that turned out to be stale. This is not a copy-paste of the same summary into 4 files — each has a different job:
- `patch_notes.html` gets the full session narrative (what shipped, what broke, root causes, what's still open) — append a new dated entry or extend the current one, don't overwrite prior entries.
- `interconnection_map.md` gets any new/changed button, module, or data-flow chain — update the specific Part(s) affected, not a full rewrite.
- `manual.html` gets a lighter-touch sync — pull the polished version of whatever changed into the relevant section.
- `taxonomy_map.html` needs no manual data update (it's live) — only touch it if its own code/columns changed.

Before editing any of them, check the real current state (git log, live Supabase schema, actual running code) rather than trusting a prior doc's claim — this project has a repeated history of docs describing something as "done" when the underlying code says otherwise. Confirm, don't assume.

---

## CRITICAL RULES — READ BEFORE EDITING

### 1. NEVER add a second <script> tag to index.html
There is exactly ONE <script src="main.js"></script> in index.html. Adding early scripts
breaks the password gate via race conditions. All JS goes in main.js only.

### 2. NEVER use Python string replace on index.html for JS/HTML injection
The exportEncyclopedia function contains </body></html> inside a JS string literal.
Naive string replacement hits the fake tag first and corrupts the file.
Use targeted AST-level edits to main.js instead.

### 3. All fixed overlays must be body-level, created by JS
Modals, focus overlays, timer widgets — create them dynamically via document.createElement
and append to document.body inside initApp(). Never place position:fixed elements inside
.page divs. They intercept clicks via z-index even when display:none in some browsers.

### 4. Pages must stay inside #app div in index.html
The CSS .page { display:none } and .page.active { display:block } only works for pages
inside #app. Pages outside #app are always visible and stack on top of each other.
Verify: every id="page-X" div must appear BEFORE the <script src="main.js"> tag.

### 5. Run node --check main.js before every deploy
Always verify syntax after edits. The file is ~3000 lines and a missing backtick
silently breaks the entire app.

---

## PASSWORDS & SECRETS
App password: jddj12alexpillBDE (stored as CORRECT_PW in main.js)
Supabase URL: https://gripopghczmrbrhqtqbm.supabase.co
Supabase Key: sb_publishable_0Z8C5X-FOLrw95VYKxZVCw_4golMyXf
Composio Key: ak_AvD9xe8vKYKERZXhyQJ8
Notion parent page ID: 3830f922-7ad0-8064-ac35-f6ebaff22b99
Anthropic key location: C:\Users\acesa\RPGACE\.anthropic_key

---

## SUPABASE TABLES
- encyclopedia       — knowledge entries (title, content, date, source, vst_tags[])
- encyclopedia_insights — extracted insights (source_entry_id, insight_text, micro_categories[], macro_category, status)
- intel_reports      — Content Intelligence analysis results
- intel_watchlist    — tracked channels/creators
- intel_jobs         — CI job queue (url, status: queued/processing/complete/failed)
- journal            — Oracle conversation logs (title, content, date, source)

RLS policy for ALL tables (anon writes must work):
  create policy "anon_all" on TABLE for all to anon using (true) with check (true);

---

## COMPOSIO ACCOUNTS
All share user_id: pg-test-abb2beca-619d-46dd-b1b9-aa0df04efae1 except Notion

| App       | account_id          |
|-----------|---------------------|
| Gmail     | ca_7oagofAi-tkv     |
| YouTube   | ca_yfUI2ySIgkat     |
| Instagram | ca_BuczS_wYvxRd     |
| GitHub    | ca_0dwb1yCGD-Dk     |
| Canva     | ca_9U6ZLJW-DxFg     |
| Supadata  | ca_rxEcC9_UzPkL     |
| Notion    | ca_Qfjy_TRBQA7T (user_id: notionACE) |

Working Composio tools:
- GMAIL_CREATE_EMAIL_DRAFT {subject, body, to:""}
- GMAIL_FETCH_EMAILS {max_results, label_ids}
- NOTION_CREATE_NOTION_PAGE {parent_id:"3830f922...", title, markdown}
- SUPADATA_GET_YOUTUBE_CHANNEL {id:"@AceSanyaBeats"}
- INSTAGRAM_BASIC_DISPLAY_MEDIA_DETAILS {}
- CANVA_LIST_DESIGNS {}
- GITHUB_CREATE_A_REPOSITORY {name, description, private, auto_init}

NEVER USE: NOTION_CREATE_PAGE (wrong), YOUTUBE_LIST_VIDEOS (wrong)

---

## NAV STRUCTURE
Dashboard · 📋 Agenda · Schedule · AI Advisor · ⚡ Agents · 🔬 Research · 📖 Encyclopedia · 📓 Journal

showPage(name, tabElement) — switches visible .page div and updates .nav-tab active class

---

## KEY FUNCTIONS IN main.js

### Gate
- checkPassword() — validates CORRECT_PW, hides gate, shows app, calls initApp()
- togglePwVis() — show/hide password input

### App Init
- initApp() — called once after gate passes. Builds quests, sets up chat, starts polling.
  DO NOT call initApp() anywhere else. DO NOT add _APP_READY/_GATE_PASSED flags.

### Oracle / Chat
- sendChat() — handles user message, routes to Oracle or agent tools
- callOracle(messages, systemPrompt, maxTokens) — calls Anthropic API
- addMsg(text, role, instaMode) — renders message in chat

### Encyclopedia
- refreshEncyclopediaDisplay() — fetches from Supabase, renders entries
- renderEncEntries() — renders filtered/sorted entry cards
- ENC_ALL_ENTRIES — global array of all encyclopedia entries
- ENC_SORT — current sort: 'recent'|'unique'|'steal'|'action'|'context'
- ENC_CATEGORY — current filter: 'all'|'beat'|'mixing'|'vst'|'genre'|'artist'|'strategy'|'content'|'notes'
- generateEncBullets(entry, allEntries) — AI generates 7-bullet preview for collapsed entry
- ENC_BULLET_CACHE — object keyed by entry id, caches generated bullets

### Insights
- extractInsightsAuto(entry, silent) — auto-extracts 5-10 insights, saves to Supabase
- extractInsightsSemiAuto(entry, safeId) — shows approval UI before saving
- saveManualInsight() — saves text selection as insight
- parseInsightJSON(raw) — 4-strategy robust JSON parser for AI insight output
- loadInsightsByCategory(macroCategory) — shows insights grouped by micro-category
- loadVSTInspector() — shows VST → entries map for VST/Plugins category

### VST System
- extractVSTsFromText(text) — returns array of VST/plugin names found in text
- extractVSTContext(content, vstName) — finds usage context sentence for a VST
- renderVSTChips(vsts, safeId) — orange clickable chips on collapsed entry
- renderVSTFooter(vsts, rawContent) — VST list with context at bottom of expanded entry
- highlightVSTsInContent(htmlContent, vsts) — wraps VST mentions with anchor spans

### INSTA-ORACLE
- isInstaOracleQuery(text) — detects Instagram-related queries
- INSTA_ORACLE_SYS — full INSTA-ORACLE system prompt (10 rules + 7 commands)
- INSTA_COMMANDS — object mapping 1-7 to command prompts
- fireInstaCommand(num) — fires command 1/2/7 immediately, pre-fills 3/4/5/6
- toggleInstaPanel() — shows/hides the 7-command panel in Oracle footer

### Journal
- saveToJournal(title, content, source) — saves to Supabase journal table
- refreshJournalDisplay() — fetches and renders journal entries
- quickSaveToJournal() — saves last Oracle reply as journal entry

### Content Intelligence
- syncIntelData(force) — polls Supabase for intel results
- startIntelPolling() — polls intel_jobs every 30s
- showJumpToEncDialog(videoTitle) — post-processing prompt to jump to encyclopedia
- learnVideo(id, title, thumb, channel) — submits video URL to intel_jobs queue

### Parsing
- parseInsightJSON(raw) — robust 4-strategy parser:
  1. Direct JSON.parse after cleaning
  2. Regex extract array [...]
  3. Object-by-object extraction
  4. Line-by-line fallback
  Always use this for ALL AI JSON responses. Never use JSON.parse directly.

### XP / Quests
- addXP(amount) — adds to STATE.xp, checks for level up
- showXPToast(amount) — shows floating +XP notification
- buildAllQuests() — populates quest grids from QUESTS object

---

## FEATURES TO ADD (Step 5 — in priority order)

### 1. parseInsightJSON (BLOCKER — add first, other features depend on it)
Already described above. The robust parser that prevents all JSON errors from AI responses.

### 2. INSTA-ORACLE 7 Growth Commands panel
Add a command panel to Oracle chat footer (pink gradient, 7 buttons).
The INSTA_ORACLE_SYS prompt already contains the 7 commands.
Add: toggleInstaPanel(), fireInstaCommand(num), INSTA_COMMANDS object.
UI: "📸 Insta-Oracle" button in quick-actions row opens the panel.

### 3. VST context (what the producer uses it FOR)
Enhance extractVSTContext() to pull the sentence where the VST is mentioned.
Show context next to VST name in renderVSTFooter().

### 4. Notes AI panel removed
Remove the "📝 3 — NOTES AI" panel from Research tab in index.html.
The Video Finder → Learn → CI queue already replaces this functionality.

### 5. Agenda tab (rename Quests)
- Nav tab: "Quests" → "📋 Agenda"
- page-quests: add Agenda section ABOVE existing Quest Board
- Daily agenda generation from encyclopedia + journal via Oracle
- 5 agendas: 2 beat, 1 content, 1 growth, 1 personal/learning
- Cache per day (localStorage key includes date string)
- Manual refresh button
- Cards: title, description, category chip, duration, XP, why-today
- Action buttons: ▶ Do Now | 📅 Schedule | ✓ Done

### 6. Schedule inline picker
On "📅 Schedule" click, expand a time-picker inline within the agenda card:
  [time input: 19:00] [45 min] [Confirm] [Cancel]
On Confirm: save to localStorage('rpgace_scheduled_agendas'), mark agenda as scheduled.

### 7. Timer widget (created dynamically by JS)
createFocusModeElements() called inside initApp() appends to document.body:
  - #timer-widget: position:fixed, top:16px, right:16px, z-index:500, pointer-events:none
    Shows: label (WARM-UP / SESSION / COMPLETE) + time (MM:SS) + sublabel
  - #return-to-session-btn: position:fixed, bottom:24px, left:16px, z-index:9999
    Shows when focus overlay is temporarily closed to browse encyclopedia

### 8. Do Now → Session Setup → Focus Mode flow
Do Now click → session setup appears (inside dynamically-created full-screen overlay):
  Duration picker: [25] [45] [60] [90] [Custom input] → [🔥 Begin Warm-up]
Submit → 
  Focus overlay content loads (related encyclopedia entries)
  Warm-up timer starts: 5:00 counting down in timer widget
After warm-up →
  Session timer starts: chosen duration counting down
Session end →
  Timer shows ✓ COMPLETE in green
  Stop-reason panel appears in overlay:
    [⏰ Ran out of time] [📱 Got interrupted] [🧠 Lost focus] [✓ Finished early]
  Overlay stays open until user clicks ✕ Exit Session

### 9. Text selection AI in focus overlay
User selects text inside focus overlay:
  → AI identifies concept using 2 paragraphs of surrounding context
  → Sticky panel at top shows: concept meaning + 5 related insights
  → Each insight clickable: closes overlay, switches to encyclopedia, expands entry
  → Return to Session button appears (bottom-left, gold)
  → Click Return: reopens focus overlay exactly as it was

### 10. Stop reason logging
When stop reason is tapped, save to journal:
  Title: "Session Log — [agenda title]"
  Content: "Reason stopped: [reason] | Planned: [duration]min | Date: [date]"
  Source: 'session'
If "Finished early" tapped: auto-mark agenda as done, close overlay, award XP.

---

## CONTENT STRATEGY (reference for agenda generation)
- Content pillars: FL Studio Secrets (2x/week) | Made Different (1x/week) | Producer Challenge (1x/week)
- Target: 10k Instagram followers → 100k YouTube subscribers
- Authentic angle: Russian/French/London background — "outsider producer"
- Alex works hospitality shifts — agendas must fit 25-90 min gaps
- Active VSTs: Omnisphere, Serum, FL Studio built-ins
- Account: @AceSanyaBeats (YouTube + Instagram)

---

## LOCAL INTEL SYSTEM
Script: C:\Users\acesa\RPGACE\rpgace_intel.py
Server: C:\Users\acesa\RPGACE\local_server.py (port 7842)
Run: cd C:\Users\acesa\RPGACE && python local_server.py
Flow: RPGACE submits URL → Supabase intel_jobs → local server polls → yt-dlp downloads →
      Whisper transcribes → Claude Vision analyses → results pushed to Supabase → app auto-displays
Python: 3.14 | FFmpeg: 8.1.1 | Whisper: small model cached
Windows SSL workaround: ssl.CERT_NONE for urllib requests

---

## DEPLOYMENT
Vercel project URL: https://rpgace.vercel.app
Deploy command: npx vercel --prod
(After Step 4 GitHub Actions: deploy happens automatically on git push to main)

## KNOWN WORKING API MODEL
Always use: claude-sonnet-4-6
Never use: claude-sonnet-4-20250514 (wrong), claude-3-5-sonnet (wrong)
