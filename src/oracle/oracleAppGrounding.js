
/* ===MODULE:oracleAppGrounding=== */
// July 22 — Phase 1 of Alex's "Oracle as orchestrator" request. GODMODE
// evidence pass found Oracle had ZERO awareness of RPGACE's own dashboard
// or its 34 internal modules - the only "orchestrator" that existed was
// /api/orchestrate.js's fixed 6-action Composio whitelist for EXTERNAL
// services (Gmail/Notion/YouTube/Instagram/GitHub/Canva), nothing about
// RPGACE itself. Council of 5 verdict: read-only self-awareness is safe
// and valuable (same risk profile as oracleTreeGrounding, already
// shipped); autonomous action-triggering across internal modules is a
// real risk (several modules write/delete data, exactly why CLAUDE.md's
// human-checkpoint-on-every-taxonomy-write rule exists) and was
// deliberately NOT built here - parked as a future idea per Alex's
// explicit call, see CLAUDE.md's Judgment Funnel notes on this session.
//
// Same wrap-window.callOracle pattern as oracleTreeGrounding (own guard
// flag, own keyword gate, fails open on any error) - composes safely
// with that module's wrap regardless of init order, same as every other
// chained sendChat/callOracle wrap already in this file.
RPGACE.register('oracleAppGrounding', {
  domain: 'oracle',

  PERSONA_MARKERS: ['You are the Oracle —', "You are Alex's personal 300IQ music production teacher"],

  // July 28 real bug found: prodOraclePanel's own "5thDimension — Built vs
  // Reported" command literally instructs Oracle to "ground yourself using
  // whatever real self-awareness data you actually have access to" - but
  // its actual prompt text never contains any of the keywords below, so
  // the exact command whose whole purpose is a grounded self-audit was the
  // one command that NEVER received this module's grounding block. This is
  // the real root cause of a live overclaim ("taxonomy tree structurally
  // complete" for all 21 phyla when only 10 are) - not a missing live
  // fact, the entire block was skipped. Fixed two ways: these commands now
  // force-inject via forceGroundNext() (see prodOraclePanel.run()) rather
  // than relying on keyword luck, AND 5thdimension-shaped phrases are
  // added below as a real second line of defense if this method is ever
  // called some other way.
  // `_forceNext` stays a MODULE-SCOPE field — `init`'s own wrap reads
  // it via its own module-level `self` (init is never moved), so it
  // must live at the same address `logic.forceGroundNext` below writes
  // to. The function itself moved into `logic` (see the G53 block
  // further below, right after SELF_KNOWLEDGE) since keeping it here
  // right beside the field it sets would have made the split harder to
  // verify, not easier — it now sits with its 6 logic siblings instead.
  _forceNext: false,

  // Cheap free keyword gate (rule 11 - never pay tokens on every message
  // for a block only relevant sometimes). Deliberately broad since a
  // missed trigger just means Oracle answers without this context, same
  // safe-fallback shape as everywhere else this pattern is used.
  TRIGGER_KEYWORDS: [
    'what can you do', 'what can rpgace', 'what can this app', 'what features',
    'what have you built', "what's built", 'whats built', "what's missing",
    'whats missing', 'not built yet', 'what should i work on', 'what should i build',
    'what should we build', 'known bug', 'known issue', "what's broken", 'whats broken',
    'underused', 'limitation', 'self audit', 'self-audit', 'dashboard card',
    '5thdimension', 'built vs reported', 'ground yourself', 'self-awareness data',
    'what modules', 'roadmap', 'unlock', 'capabilit', 'what are you capable',
    'what is rpgace', 'suggest a fix', 'suggest an improvement',
  ],

  // July 31 — second, SEPARATE gate for anatomy-shaped questions ("how does
  // X actually work"), feeding _buildAnatomyBlock() below. Deliberately NOT
  // merged into TRIGGER_KEYWORDS: that list gates the hand-written
  // SELF_KNOWLEDGE status digest (what's built / what's missing), this one
  // gates a live per-module mechanism lookup - two genuinely different
  // questions that should be answerable independently. Checked phrase-by-
  // phrase against the list above for substring collision before shipping:
  // none found in either direction, so a message can legitimately match
  // both and get both blocks, which is correct rather than duplicated.
  //
  // Compound phrases only, never bare words - the same word-boundary
  // landmine that governs every keyword list in this project (a bare 'how'
  // or 'module' would fire on almost every message and pay for a lookup
  // that returns nothing).
  //
  // Real gap found on the first real hand-test (July 31, Alex): "what's the
  // gotcha with authGate" matched NONE of the original 8 "how does X work"
  // -shaped phrases below, so the lookup never even fired for a module that
  // IS in the table - _buildAnatomyBlock()'s own name/keyword scoring never
  // got a chance to run. Fixed two ways: broader natural phrasings added,
  // AND the curated module names themselves (lowercase + spaced-camelCase,
  // matching _anatomyNameVariants' own logic) added directly as triggers -
  // naming one of these modules at all is itself a strong enough signal to
  // attempt the lookup, regardless of how the question is phrased around
  // it. Keep this list in sync with oracle_module_anatomy's real rows.
  ANATOMY_KEYWORDS: [
    'how does', 'how do you', 'under the hood', 'which module handles',
    'why is it built', 'internals', 'how is it implemented',
    'walk me through the code', 'the gotcha', 'any gotchas', 'what\'s the catch',
    'known issue with', 'quirks of', 'tell me about the', 'explain the',
    'dashdeck', 'dash deck', 'phylumpath', 'phylum path', 'authgate', 'auth gate',
    'oracleappgrounding', 'oracletreegrounding', 'bookworm', 'taxonomytree',
    'taxonomy tree', 'leftnav', 'left nav', 'beatlog', 'beat log',
    'contentproductionlive', 'videopipeline', 'video pipeline', 'voiceinput',
    'voice input',
  ],

  // Hand-maintained condensed digest, not live-parsed from the oversight
  // docs - deliberately, to avoid a second live source of truth alongside
  // system_flow_map.md's actual built/not-built table (the July 20 audit
  // found stale-doc drift three separate times; a second copy invites a
  // fourth). Whoever updates CLAUDE.md's "Current state"/"Known open
  // bugs"/"Biggest confirmed-not-built items" sections should update this
  // string in the same session - same discipline as every other oversight
  // doc, just condensed for token cost (rule 11).
  SELF_KNOWLEDGE: '[[CORE]] RPGACE STATUS - Oracle\'s notes about its own app, last reviewed Oct 28 2026. Answer honestly from these notes: never invent a feature, never call something finished unless it says Alex hand-tested it; assume everything here is built but NOT hand-tested by Alex unless a line says otherwise (smoke_test.html holds his own ticks; well under half of its rows are confirmed). The notes are split into 8 domain sections (ORACLE, CONTENT, KNOWLEDGE, HABITS, SCHEDULE, CHRONICLES, OVERSIGHT, PLATFORM), the same 8 groups as the left menu and RPGACE.DOMAINS; only the sections relevant to a message are sent with it. RPGACE is Alex\'s personal app (UK music producer, Derby): beats, posting, selling, learning, cooking, gym and health, his day, money and XP. One client script (served minified as rpgace_core.min.js; its source is the hub rpgace_core.js -> src/<domain>/<module>.js, one file per module, read whole via scripts/core_source.py), Supabase for data, Vercel for hosting and /api functions, Claude for Oracle. 81 registered modules, each with a domain key and a ui/logic split. XP: ONE system - database triggers write every xp_events row from xp_rules (the app never awards XP itself), 13 realms (Producer, Creator, Hustler, Chef, Athlete, Scholar, Life, Homekeeper, Mind, Steward, Explorer, Connector, Builder). Every input, quest, plan and activity carries chosen realms (RPGACE.realmPicker, up to 4; Not now holds an input until realms are picked). Oracle cannot save data, award XP or act on its own: it suggests, and Alex confirms through the app. RPGACE never sends messages, books or pays for anything. There is no Supabase backup or point-in-time recovery (Alex chose the Free plan; do not re-raise it). Known open gaps: reference_tracks scale/genre are mostly empty, so beat matches repeat; no beat-grid audio sync exists; the old swipe freeze has no root cause (freezes are now recorded in perf_freezes); steps from Samsung/Google are not connected. Design rules (DESIGN.md section 0, Oct 27): augment Alex\'s thinking rather than just store things (Engelbart), and each piece does one job with plain shared formats between (Unix). Every realm has the same frame built once (realmFrame: target, what\'s next, ready from other realms, Tasks, Live, Take in, Log, Prompts, Weekly review); a realm only adds its own tools (realm_lenses.json "frame"). If Alex asks what to build next, give ONE concrete suggestion grounded in a real gap.\n\n[[ORACLE]] ORACLE (domain oracle: chat, grounding, actions, Professor; the Oracle page shows only the chat - its tool buttons and 8 agent actions are in the side list and the 🧰 button, agentsIntoOracle.toolsToSide). When Alex\'s message names a realm or one of its tools, Oracle also gets that realm\'s live brief (target, XP this and last week, next tasks, what other realms have waiting; realmFrame.logic.brief). Oracle\'s shared prompts are files in prompts/ (RPGACE.prompt), changed only through Claude Code. Chat streams from api/oracle.js (Claude, prompt caching on every call, a 3000-token reply cap); renderMarkdown escapes HTML first. Oracle Professor (oracleProfessor module, on for every chat message): a cheap Haiku planner picks which data sources and which of these note sections a message needs; deep questions (why, compare, plan, explain, long) get gather -> condense -> an Opus 5.5 answer with Answer / Counter-case / Confidence / Unknowns, source tags, a How I know fold-out and a cost line (Sonnet if Opus is unavailable, said so); other messages get a normal reply with only the picked sections. prof: forces a professor answer, quick: forces a normal one; messages owned by other features (prefixes like schedule oracle:, links, trips, recipes, Oracle actions) are never routed. The web topic sent to Gemini is strictly cleaned (no names, places, numbers, dates or I/my words). Ask My Data (askMyData module): Oracle can request one read-only lookup with a DATA_QUERY trailer across every area (past Oracle chats - every question and answer is kept in the private oracle_chats table since Oct 27 2026, so a question like what did we talk about or do you remember looks them up - stock, recipes, planned cooks, wishlist, journal, quests, agenda, watchlist, analysed videos, encyclopedia, idea cards, jargon, reference tracks, finance, books, productions, changelog, routines, xp_events, plans, food_log, body_log, posts, people, outreach, subscriptions, screenshots, perspective_reports); up to 30 rows, shown to Alex, answer from those rows only, never writes. Web lookups (webLookup module): in the main chat only, a WEB_QUERY line reuses a Life Library lookup from the last 30 days or sends the question to /api/search (Gemini, needs GEMINI_API_KEY), saves it as a web_lookup library_items row and shows the sources; at most one search per message. Oracle Control (oracleControl module, oracle_actions table): a confirm-before-execute popup with 5 wired actions (log_beat, new_quests, draft_email, yt_stats, log_notion) plus log_outreach which only opens the form; reached from the floating 🔮 button and the Oracle page Tools row. Oracle may suggest a new action (ORACLE_SUGGEST_ACTION), but it only joins the list after Alex approves and still needs coded wiring before it does anything. Deep dive (deepDive module): a 🧭 Deep dive button under any reply that lists 3+ questions opens one pop-up per question (answer, Back, Skip, Next; kept on the device while going), then an extra-thoughts pop-up, then sends one compiled prompt (answers, skipped numbers, extra thoughts) to Oracle for one complete answer; nothing goes to the journal unless Alex taps 📓 on that answer. Save as entry (oracleEntry module): 📓 under a reply saves a journal entry (⭐ big day = +50 XP over its realms) or turns it into a ➕ Task for a realm (realmTasks; realm missions were removed Oct 27 2026); ⭐ on a reply also files it in the Life Library. Oracle Mode switch (cog on the top bar): Real, Dummy (labelled fake replies, no cost) or Fallback Scout (sends queue to oracle_fallback_queue). Background analysis switch (orchestratorCC module, app_settings): Orchestrator CC (a Claude Code session on Alex\'s Claude plan) every 2 hours by default, or the API at once; anything waiting 12 hours goes to the API. On Orchestrator CC: videos are downloaded/transcribed by the runner and analysed by scripts/intel_cc_worker.py every 2 hours (up to 5); Bookworm chapter extraction, weekly challenge ideas and the Year Wrapped paragraph go through oracle_fallback_queue. Oracle page layout: chat input under the messages, one Tools row (New quests, Draft email, Log to Notion, YT stats, Prod. Oracle, Platform Oracle, Visual Oracle, Repurpose, Schedule Oracle, Phylum Path), Agent actions & connected apps folded at the bottom. Platform Oracle (captionsPanel module): one panel with Instagram / YouTube / TikTok caption commands; producer tools (producerTools module) are prompts placed in Selling\'s steps (A&R Critic, Artist Outreach, Contract Red Flags, Negotiation Rehearsal) and Beats\' idea step (Playlist Psychologist). Grounding: these notes go in only by section; anatomy questions read oracle_module_anatomy; mockOracle and oracleFetchGuard wrap calls. No voice: the browser mic was removed (Aug 30 2026) and Fish Audio is a dormant scaffold with no key. Kimi/Luna routing in api/oracle.js is dormant (no keys) - never claim RPGACE runs on other AI providers today; Claude is the only live chat model.\n\n[[CONTENT]] CONTENT & VIDEO (domain content: Beats, Posting, Selling, Idea Bank). Content Pipeline is a pop-up routing to Beats home, Posting, Selling, Idea Bank, Beat Log and My beats; the old video tools (Visual Treatment, Director Match, Production Panels, Upload Workshop, OBS raw, Activate ConID, the video-job tracker) were removed Oct 17 2026; Visual Oracle keeps 4 commands (copyright risk, mood board, storyboard, OpenMontage brief). BEATS (beatsHub module): Idea -> Make -> Mix -> Log (= finished) -> Release -> Sell with live counts. Start making on an idea (conid_pot) starts a Producer Doing Now session (making/mixing, time adds up on the idea). Beat Log (beatLog module) saves a content_productions row with finished_at, drive + folder of the WAV/stems, stems checklist and session time; Scan audio finds BPM and Major/Minor on the device (never uploaded). Release = links in content_productions.release_links (first one pays beat_released 300). Sell: licence tiers per beat (defaults MP3 lease £30, WAV lease £50, Trackout £100, Exclusive £500 in xp_settings.licence_defaults; a beat\'s own prices never change), Beatstars listing text, Log a sale = chronicles_finance sale linked to the beat (Hustler 2 XP per pound, min 100). Reference tracks (refCorpus): Look up fills Major/Minor, BPM and genre via Gemini 8 at a time, reviewed with Accept/Skip; Last.fm fills beat-match gaps. POSTING (postingHub module, posts table): Idea -> Plan -> Record -> Edit -> Post -> Results; + New post (title, type beat video/tutorial/short clip/studio-life, realms, Creator default). Idea Bank ideas are tagged beat or post (conid_pot.kind). Plan screen: hook, script, shot list, optional Oracle draft, platforms (Instagram, YouTube, TikTok) and one caption per platform; beat videos pick a logged beat and can be sent to the OpenMontage queue (openmontage_jobs). Plan done pays 60 Creator once. Record it / Edit it start Doing Now sessions whose minutes add to posts.record_mins / edit_mins; Ready to post saves file names and places (nothing uploaded). Post it takes one full link per platform (YouTube, Instagram, TikTok, DistroKid); the first link marks it posted and pays 300 Creator; a beat video\'s links also release its beat. Weekly target xp_settings.posts_per_week (default 2) with Due nudges. Results (views, stats) is not built. Each posted post is one Chronicles entry with every stage and time. SELLING (sellingHub module): Beats for sale (List, Promote, Sell, Paid) and Artist outreach (Find artists, Pitch, Follow up, Deal, Paid) with a what\'s-next list closest to money first. The Selling home is just What\'s next plus 4 tiles, each opening its own page: Beats for sale, Artist outreach, Outreach & collabs log, Money in (sellingHub.ui.openSection). Private artists, pitches and pitch_sends tables; a send moves potential pitch -> potential close (pushback) or agreed sale -> paid, or ends as no / no reply, kept in pitch_sends.history with Back a step (never Paid). New pitch: offer type, beats, price, message (Oracle can draft it with {name}); Copy & open copies it and opens their Instagram or email - nothing is sent by RPGACE. Mark sent logs outreach (outreach_log, Hustler XP). Follow-ups due 5 days after sending, then 7; a Follow-up sweep and a Due row. Funnel on Selling home. Money in: monthly income target (xp_settings.monthly_income_target, Tycoon = 12x), income by type (chronicles_finance.income_kind), best-selling beats, earnings per beat. Deals link both ways: a beat\'s Sell screen lists its pitches; People linked to an artist show it. OpenMontage: RPGACE does not make video; a separate Claude Code session (OpenMontage CC, its own repo, fal.ai for generation) takes briefs from openmontage_jobs; paid providers are ruled out for now. Repurpose (contentRepurpose) reads Notion/YouTube via Composio/Supadata.\n\n[[KNOWLEDGE]] KNOWLEDGE (domain knowledge: take in, study, learn, map). Knowledge home (knowledgeHub, /knowledge; menu Home - Take in - Study - Learned - Review, Knowledge Rewire Oct 27): a What\'s next line and 4 steps - Take in (one ＋ Take in door, knowledgeHub.ui.openTakeIn: link, text, screenshot, book, file, track or Find videos, each handed to its own engine; Life Library is the list, Screenshots and Your books sit under it), Study (Bookworm, Videoworm, MusicWorm, Exam practice), Learned (encyclopediaPosts.ui.showLearned: Write-ups | Ideas | Jargon | Map tabs, one searchable write-up list; Phylum Path is the Map), Review (knowledgeReview: one list of idea cards due, exam questions to redo and jargon to accept, with Explain it back; the Morning Brief shows its count as one line), shown as tap tiles; every Knowledge page has Back + home and links onward. Taxonomy-growth buttons are hidden while the tree is empty (taxonomyTree.markDormant). Videoworm (knowledgeHub.ui.slimVideoworm) shows the analysed reports plus Take in and Find videos; Sync, Manual import, How it works and server status are in its side list. Life Library (lifeLibrary, /library, private library_items): everything taken in (links, videos, books, music, files, courses, notes, quotes, recommendations from People) with date, ONE phylum shelf, topics and realms; a link saved twice stays one item. A saved video\'s 📖 Read the write-up button (and the same button on an expanded Videoworm insight) opens its full Encyclopedia write-up by matching the video link (encyclopediaPosts.ui.openByUrl); if none exists yet it falls back to Videoworm. It fills itself (keyword shelf only, no Oracle call) from analysed videos, screenshots, hand-added reference tracks and ⭐ Oracle replies. Morning Brief shows one item a day (30-day no-repeat). Each input earns 60 XP over its realms (first 3 a day). Screenshot Inbox (screenshotInbox, /screenshots, private screenshots table + bucket): Oracle reads each once (text, description, tags, kind, up to two suggested homes); Alex chooses Wishlist, idea card, recipe, journal, keep or delete; a rota is recognised and can import shifts; a receipt can be a business expense. Share to RPGACE (shareInbox): Share anything - the Android share sheet (iPhone via a Shortcut) and the Videoworm box take a video link, a web page link or plain text (40+ characters) and queue it into intel_jobs (text in intel_jobs.text under a text:<hash> key, so the same text is never queued twice); a web page is read as text (r.jina.ai) and a text is analysed as it is, through the same realm prompt and quote check as videos, with paragraph marks (¶3) instead of times; each becomes an Encyclopedia write-up and a Life Library link or note (rpgace_intel.process_page, SA-1). Videoworm (local_server/rpgace_intel.py on Alex\'s PC, or Orchestrator CC): reads the whole timed transcript and 8 frames through the picked realms (realm_lenses.json); intel_reports.insights.realm_sections holds per realm a 1-10 score, why, what it teaches, 3-7 key points each with a checked transcript quote and time, a Try this and 3 quest ideas, plus how_made for Creator/Producer/Hustler; quotes not in the transcript are dropped in code; analyser_version is stamped; stuck jobs re-queue after 2 hours; Videoworm shows queue state with Retry. Encyclopedia (encyclopediaPosts): every report becomes an article plus idea cards (encyclopedia_insights, one per key point and Try this, realm-tagged), read Deepstash-style; Ideas | Jargon | Sources tabs; a re-run replaces the report, article and cards. Every report\'s per-realm task ideas go by themselves into the Realm Tasks 📥 inbox (realm_tasks, database trigger, duplicate-checked); tapping one in a report keeps it. Pathways: add the creator to the watchlist, jargon in the article; Make these quests sends them to Realm Tasks (realmTasks). Taxonomy: 29 phyla (22-29 are the life realms: Ars Culinaria, Corpus Athleticum, Ars Vivendi, Cura Domus, Res Pecuniaria, Peregrinatio, Mens Sana, Societas; 11 is Learning Methods; realm-to-phylum map in realm_lenses.json). taxonomy_tree has 0 rows - every phylum is empty below phylum level until a new structure is built around reviewed jargon; automatic tree growth is paused while it is empty (taxonomyTree.isPaused) - never claim any phylum has depth. jargon_encyclopedia is the standalone term table (545+ terms, most pending, written by a Claude Code session); the Jargon page (jargonEncyclopedia) shows every term with status filters, realm filter, Met in links and inline Accept/Edit/Reject; Knowledge Review (/review, knowledgeReview) shows pending terms one at a time under its due line. Phylum Path groups phyla under realms with each phylum\'s shelf (Library items, idea cards, jargon). Each realm card shows what it knows and a knowledge path: Oracle proposes 3 milestones, Alex accepts one, done ones pay XP sized to the rank gap and every 3 unlock a title.\n\n[[KNOWLEDGE/STUDY]] Recall (recall module): saved idea cards come back after 1, 3, 7, 16, 35 days with Again / Got it; Bookworm chapters have Cards. Bookworm (bookworm module, bookworm_books/bookworm_chapters): reads a PDF/URL/typed book chapter by chapter through the book\'s realms, insights tagged with a realm; chapters pay half Scholar, half the book\'s realms. Study (studyHub, /study): AWS Certified AI Practitioner - 18 lessons via RPGACE features, 300 Claude-written practice questions (not real exam questions), Quick 10 / topic / 65-question timed mock / service names / Redo, wrong answers on the recall schedule, +2 Scholar per correct (max 30 a day), estimated score out of 1000. Feynman: Explain it back.\n\n[[HABITS]] HABITS (domain habits: Cooking, Gym, Health & body, Wishlist, Money). COOKING (cookingOracle): home = Recipes -> Plan a cook -> Shop -> Cook -> Stock with a what\'s-next line; every screen has Back, Cooking home and a ☰ shortcut list. Generate a recipe in Oracle chat (RECIPE_JSON trailer; a Narrow it down step for short requests); recipes are cups + weight, one action per step with a done cue and equipment; a 🔮 critique gives a diff-only update to Accept/Deny; adding an ingredient offers to update the method. My Recipes lists every recipe with in-stock state and last cooked. Ingredient colours: green plenty, yellow short, red none, blue same-aisle alternative, purple will run low, orange a substitute in stock (confirmable, or merged as the same item; only ratios Alex gave, e.g. tamarind concentrate ~1/3 of paste, 8 garlic cloves per bulb), brown omittable. Planned cooks (planned_cooks: draft/scheduled/cooked/discarded) are packed by a joint hands + oven/stovetop scheduler that front-loads prep across recipes, pushed to the calendar; a draft is never lost and emptying only discards a draft. Shopping lists are aisle-sorted with need/in basket/bought; Done shopping moves the basket into stock and the rest to the Top-up list. Stock (pantry_stock: Pantry, Fridge, Freezer, Equipment) is grouped by food type with cooking/baking tags; amounts use his cup measures (kitchen_equipment) and grams for solids; Add from a photo lists food Oracle sees for review. Every finished cook previews what it takes out of stock (Put it all back undo, once only). Cook Mode: one step per screen with scaled ingredients, equipment, done cue and resume; waiting steps get timers that carry on in a bottom bar; 💬 Ask inside Cook Mode; the last Done asks Actual cook / Just a preview / Not finished (an unplanned actual cook still logs a cooked row and Chef XP). The 8 older recipes have proposed one-action splits waiting: Use these steps per recipe, or ✅ Accept all at the top of My Recipes (two taps; old steps kept as a backup). Nutrition per recipe from cofid_foods (7,743 UK/India/China/Japan/SE Asia foods) then Open Food Facts. Recipe photos: Unsplash if a key exists, else Wikipedia. GYM (gymTracker, gym_sessions/gym_sets): sessions with sets, reps, kg; weekly count against 5; personal bests (+30 Athlete) and estimated 1-rep max; Repeat last. HEALTH & BODY (healthBody, private food_log/body_log/health_settings): food from a meal or label photo or typed words -> items with grams, re-checked against cofid_foods (those numbers win), editable; From your cooks adds one serving; calories and protein against targets (set on the Targets tab); a Quick log row on Today: +1 glass, Weight, Sleep, and cigarettes/coffee from My Day\'s cut-back counters (healthBody.ui.cutTiles writes cutback_log). Water, weight (7-day average), sleep, 14-day trends; the My Day health card has a +1 💧 button (one glass, same body_log write). Sleep is typed in until a watch is connected (a Pixel Watch 4 is top of the wishlist; Google Health API planned). GYM is one page (gymTracker card, Oct 27 DR-9): today\'s workout from the programme (healthBody.ui.renderGym into #gym-plan: PPL / Upper-Lower / Full body over chosen days, +2.5kg nudge at the top of the range; Start opens the gym log prefilled), log a session, target and bests. Health & body tabs are Today, Trends, Targets; healthBody.ui.open(\'gym\') opens the Gym card. EXERCISE LIBRARY (exerciseLibrary, exercises table, DR-12): on the Gym page; Weights/Bodyweight/Cardio/Stretches/Mobility, each grouped by Chest/Back/Shoulders/Arms/Core/Legs/Glutes/Full body with regions per group; exercises from Athlete videos are read once by the cheap model and saved only after Alex keeps them (linked to the video); a built-in starter list fills gaps and is always labelled not from his videos; a combo shows which regions of each group are hit, partly hit or missed and suggests exercises for gaps; Add combo as Athlete tasks makes repeating Athlete tasks. Steps are not connected (Samsung partners only, Google Fit closing; Google Health API planned). WISHLIST (shoppingWishlist, wishlist_items): general purchases with priority and a budget-fit (add form behind Add an item; budget setting and Money link in the side list); an optional why; a 24-hour cool-off before buying (bought after it = +30 Steward); bought asks the price paid and logs a Chronicles Finance expense; can be marked For the business. MONEY (moneyHub, shared by Hustler and Steward): this month in minus out, subscriptions (private subscriptions table, renewal Due rows, logged once), business purchases with a receipt photo Oracle reads, UK tax-year business costs; no tax export or bank import. Weekly spend limit (xp_settings.weekly_spend_limit) pays +50 Steward if kept. Daily life (dailyLife): fridge photo to stock, watchlist digest in Morning Brief.\n\n[[SCHEDULE]] SCHEDULE & JOURNAL (domain schedule: My Day, Live now, Plans, Calendar, shifts, Morning Brief, Journal). PHONE ALARM (alarmSounds, Oct 28): the wake alarm rings Alex\'s Android through MacroDroid, which checks the alarm-feed edge function every minute (RING/WAIT) and plays one of his own sounds (alarm_sounds, picked at random; YouTube links are pulled to audio by the laptop\'s local_server); I\'m up or the phone\'s stop shortcut ends it; My Day shows whether the phone is checking in. MY DAY (myDay): Now/Next, Doing now / I just did, one draggable day timeline (myDay.logic.segments: shift + travel, chore_blocks, 🌅 Morning and 🌙 Night bookends) with an Add from realms button below it (myDay.ui.openRealmPicker: due Actions, then each realm\'s kept tasks, into the next free gap or the running block); no Tray or quest list. Hold to drag, pull to resize, swipe right done, left tomorrow; myDay.logic.guard refuses overlaps, pushes with a 10-minute buffer, asks before a move over 30 minutes, always with Undo. DAY BOOKENDS (myday_settings.day_state): the day starts on ☀️ I\'m up and ends on 🌙 Going to bed (one button on the dashboard and Now/Next); nothing opens by the clock. I\'m up sets wake to that minute, stops the alarm, slides planned blocks later (Undo), offers a missed review, then Good morning (shift, Morning tasks, frog, blocks, brief). Going to bed runs the evening review (journal evening_review, +10 Mind), then Good night and the alarm (myday_alarms: now + sleep target, earlier for a shift; a push every 5 minutes until I\'m up, max 2 hours). A Morning block only counts as missed on a day started with I\'m up. Plan week: drag blocks; + Realm block; methods Pomodoro, Deep work, Time-box, Just tick it. Plan my day: blocks only, each filled with 📋 Plan block from that realm\'s due Actions; optional frog or 1-3-5. Focus timer: a full run adds +15 to the realm. Weekly review Sunday evening (journal weekly_review). Chores repeat every N days from the last tick, never stack; a housekeeping block takes the most overdue. Block ticks +10 XP. Habit design: minimum vs goal, stacks, never miss twice; Days since and Cutting back (cutback_items/cutback_log, +15 Mind per day at or under target). ✅ What you did shows in the day view (myDay.logic.loadDid, not stored). CALENDAR (scheduleFixes, menu label Calendar, DR-8): Week, Month and Shifts only (no Daily tab; My Day is the day view); cells show one-off events (eventMemories); tapping a day (scheduleFixes.ui.openDay) opens My Day on that date. SHIFTS (shiftSync, rpgace_shifts): rota screenshot, paste, or the weekly Fourth import (failures on Due); items on a shift warn first. Work buttons (private work_links): Clock in / Break / Clock out on Now/Next around a shift open his phone2fork page; RPGACE cannot confirm the clock-in. PLANS (tripPlans, private travel_profile/people/plans/plan_tasks): up to 3 web searches then one Oracle draft (itinerary, book-by dates, documents for his French/Russian passports with UK settled status, packing, money limit, official links); tasks, status, Add to calendar; book-by dates on Due; paid tasks log a Travel expense; trip log (journal trip_log). Ideas tab: 5-8 ideas (never anyone from People). People: birthdays, last spoke, reach-out reminders. Morning Brief at 07:00 by Orchestrator CC (API backup; pressing Morning Brief earlier writes it with the API, morningBrief.logic.writeNow), shown as a 5-chapter story (myDay.ui.openMorning), with Today\'s realm (realmBrief), My Day picks, recall, Library pick, watchlist. IDEAS door (ideasDoor, DR-10): one 💡 Ideas menu entry lists every idea by realm - Idea Bank conid_pot (beat to Producer, post to Creator), saved outing ideas (plans status idea, Explorer) and realm_tasks inbox (its realm); tapping opens its home; nothing is stored there. Journal: decisions with a look-back date (decisionJournal). Phone alerts: push_subscriptions + myday-push edge function.\n\n[[SCHEDULE/MISSIONS]] TASKS AND QUESTS (DR-1..5, Oct 27): every to-do is a realm task; there are no open quests; quest_log is only the done-ledger (Actions, blocks, and tasks ticked outside a block, quest_kind task) and the database pays its realm. questEngine keeps live Builder tasks (Clear active errors, Confirm hand-tested fixes, Answer Oracle suggestions, Review map integration flags) open while something waits. A realm task with a cadence is an Action (realm_tasks.cadence/every_days/days/due_date/after_task_id/minimum; 17 moved from routines, old ticks matched via legacy_routine_id; myDay.logic.loadTaskActions); only the Morning routine stays in routines; a tick pays the task\'s realm. REALM TASKS (realmTasks, private realm_tasks + realm_task_types): 13 realms x 5 types; 52 original activities kept, 175 proposals to keep or drop in 🗂 Catalogue; the database merges duplicate titles and keeps every source. New tasks arrive in the 📥 inbox from analysed videos, I want to / I will journal lines and Life Library saves; ➕ Task on Oracle replies, idea cards and book insights. ▶ Live now opens when a realm block starts: top 3 tasks of a type, Done ticks it into the block (its own XP, never twice); repeatable tasks rest 2 days. GENERIC MISSIONS (realmTasks, Oct 27): a mission is a generic task with a context kind (recipe/combo/reference/post/card); specifics are cards in private mission_contexts. 4 realms have 45; New tasks files video tasks as cards (realmTasks.logic.fileInbox). Plan block asks a ticked mission for a card (myDay.ui.pickContext): Chef generates a recipe as the cook (cookingOracle.planMissionCook), others pick a combo/reference/post (realmTasks.CONTEXT_SOURCES); Live now shows it, Done pays its XP. ONE-OFF EVENTS (eventMemories, private memories, DR-6): an upcoming event has a date/time and a timeline entry; afterwards My Day asks How was it? and it becomes a kept memory (note, optional photo) in Chronicles and the Memories view; confirming pays +25 to its realm. LIVE NOW (doingNow merged in, rpgace_agendas doing_now): a task started with no block is timed onto the timeline, its own tick pays (xp_on_doing_now skips task_id); typed ones pay 30 (3/day); I just did takes two of start/finish/length; Done loads chained tasks as Next (realm_tasks.after_task_id, after_kind cook), due till done or skipped. Housekeeping blocks are Homekeeper. Builder updates in Chronicles grow one 🛠 Building RPGACE block on the timeline (trigger builder_time_on_update on system_updates, 45 min gap, no XP; pending Alex\'s paste Oct 28). Covering half a block asks Did this replace your block? (also after I just did); a block that passed empty asks What happened? (day_misses; Sunday review counts reasons).\n\n[[CHRONICLES]] CHRONICLES (domain chronicles: XP Season Pass, Chronicles log, profile card). XP SEASON PASS (xpSeason module, private xp_events/xp_rules): xp_on_change triggers on 15+ tables call xp_award; examples - beat logged 30, finished 120, released 300; video posted 300, post planned 60; sale 2 per pound (min 100); cook finished 60 (+10 per extra recipe), recipe saved 25; gym 40; chapter 30, book 300, jargon review 3; journal entry he wrote 15; expense 5; plan made 30, trip done 200; caught up 20; hand-tested feature 20; shipped RPGACE change 30 Builder (5 a day); auto-made things earn 0. Capped repeats pay 100%, 50%, then 0. The pass is a YEAR (Year 0: Construction from Oct 13 2026 to Dec 31; each 1 Jan resets; career never resets); a season is a UK weather season. Level 1 = 500 XP, +25 per level. Sky ladder: Spark, Ember, Flame, Comet, Star, Nova, Constellation, Galaxy. Each realm has 7 named ranks (year and slower career); some are gated by real events (Sous Chef 20 cooks, Head Chef 50 cooks + 10 recipes + 3 cuisines, Closer first sale, Tycoon yearly target, Gladiator 3 gym a week for 4 weeks, Polymath books in 8 phyla, Pathfinder routines kept 6 weeks, Lake sleep routine 21 of 28 days, Safe, Globetrotter 5 countries, Heart nobody overdue 3 months). Titles and badges (automatic or claimed) pay no XP. Same-week deletes ask was it done? (unanswered keeps it). pg_cron closes periods nightly: balance bonus, frozen xp_reports per week, month, season and year. Weekly challenges (pick up to 3, 75 XP each, counted automatically), season resolutions (1-5, 500/1000/1500), realm quests (3 steps of 50 toward each gate), knowledge-path milestones. Treats pinned to a goal (marked earned, nothing bought), card themes by level, quiet flair. Year Wrapped swipe cards when a year closes (one Oracle paragraph), Year-so-far, Hall of Seasons, January nudges. The dashboard shows a 2-page swipe XP card (overall, then the 13-realm wheel); each domain shows its realm card. CHRONICLES PAGE (chroniclesLog, items from careerStatCard): searchable log with 8 sections (All, Beats & content, Recipes cooked, Trips & plans, Learning, Life, Money, App updates) - beats, posts with full stage reports, cooks with recipe names, done plans, quests, gym, journal, unlocks, reports, Doing Now activities by realm, finance (personal-visibility ledger, not bookkeeping-grade).\n\n[[OVERSIGHT]] OVERSIGHT (domain oversight: dev docs and error tracking, mostly for Claude Code). errorLog: thrown errors and red toasts are saved to error_log (deduped), traced to their owning module, given that module\'s perspective_reports baseline, and flip its smoke_test_items row to broken (a green plan item to purple); it only sees errors that throw or toast and never fixes anything. oracleDevBridge: 🧪 Flag to Orchestrator CC saves an Oracle reply as an oracle_dev_suggestions row a Claude Code session reviews at its next start. docsLinks / the Oversight popup link the dev docs: patch_notes.html (dated build history), minotaur_map.html (plain-language map of domains), interconnection_map.md / system_flow_map.md / ai_tooling_and_rules_map.md / perspective_map.html (truth docs), smoke_test.html (Alex\'s hand-ticks), error_log.html, future_integrations.html (planned, blue/red/yellow), achiever.html (claims that stopped being true), session_lessons.html, and the Galaxy Map (graphify-out, a generated developer map: L0 units -> 8 domains -> modules -> functions, with pages for things outside the app such as External AIs, Claude Code sessions, Supabase and the PC pipeline; each domain lists the external AIs it uses, tagged live/dormant/off/planned, and its in-app dimensions: Oracle calls, human gates, decisions, the menu path, branch ledger, load triggers and loops). Developer rules live in CLAUDE.md and docs/claude/*.md, which the app never reads. Plans for builds are tracked in ceo_plans/ceo_plan_items (Orchestrator CC only; the app shows no CEO UI).\n\n[[PLATFORM]] PLATFORM (domain platform: sign-in, navigation, dashboard, speed). Shared helpers live in one kit (kit module, RPGACE.kit: escape, dates, buttons, 2-tap confirm, private reads, search lists, and kit.ask, the one door for one-shot Oracle calls). Sign-in: the password is checked server-side (api/auth.js); a device stays signed in with a server-issued secret checked on launch (authGate); Sign out on this device in the left menu; every /api function checks the secret. RLS is on every table; most are anon read-only with writes through /api/data-write; a few stay anon-writable on purpose (oracle_fallback_queue, openmontage_jobs, error_log, smoke_test_items, ceo_plan_items) - never suggest restricting them without checking. The left menu (leftNav) is the one place to reach everything, in coloured folding bands per area with a realm XP bar, plus realm chips at the top (All + 13 realms) that show only the entries feeding that realm; every area page and popup has a shortcut list opened by swipe-right or the small › tab on the left screen edge (RPGACE.sideList); area home pages (Knowledge, Beats, Posting, Selling, Cooking) show their steps as a grid of tap tiles (RPGACE.areaNav.steps: one button runs directly, more open a small sheet; a Posting stage tile lists the posts in that stage); empty boxes hide themselves (Continue where you left off, What you did, the Work shifts box shrinks to one line); the dashboard XP card is only as tall as the page you are on; each area page shows one slim realm line (xpSeason.ui.strip) that opens a realm home with the full realm card, a target (Hustler: money in this month vs the monthly goal from chronicles_finance) and buttons to every page feeding that realm (xpSeason.ui.openRealmHome); popups have Back with history and phone Back closes them first (dashDeck, pathRouter). The dashboard is a landing page: Today (shifts, tasks, planned cook, routines left, gym this week), Due - waiting on you (reviews, recall, decisions, cool-offs, book-by dates, reach-outs, shifts sync, posts behind, etc. - a row only when something is there), Continue where you left off, Morning Brief and an Ask Oracle box; it makes no Oracle call itself. Installable PWA (Android/desktop). perfWatch saves freezes over half a second to perf_freezes with what was running; startup blocks no longer alert. The old Content Intelligence sync (every 30s on every page) was the main freeze source until Oct 27; it now runs only while its list is on screen. Orchestrator CC switch lives here (orchestratorCC).',

  init: function() {
    var self = this;
    function patch() {
      if (typeof window.callOracle !== 'function' || window._appGroundingPatched) return;
      window._appGroundingPatched = true;
      var orig = window.callOracle;
      window.callOracle = function(messages, system, maxTokens) {
        // Consume the force flag unconditionally, before any early return -
        // otherwise a call that fails the persona/message check below would
        // leave a stale true sitting around to wrongly force-ground some
        // later, unrelated call.
        var forced = self._forceNext;
        self._forceNext = false;
        var isConversational = typeof system === 'string' && self.PERSONA_MARKERS.some(function(m) { return system.indexOf(m) !== -1; });
        if (!isConversational || !messages || !messages.length) {
          return orig.apply(this, arguments);
        }
        var lastUser = null;
        for (var i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'user') { lastUser = String(messages[i].content || ''); break; }
        }
        if (!lastUser) return orig.apply(this, arguments);
        var lower = lastUser.toLowerCase();
        // OP-5 (Oct 21 2026): when oracleProfessor routed this chat turn it
        // leaves the app-note sections it picked (one-shot). Then only those
        // go in — never the whole SELF_KNOWLEDGE — and they go in even when
        // no keyword matched. null = not routed: old behaviour, unchanged.
        var prof = RPGACE.modules.oracleProfessor;
        var profSecs = prof ? prof.logic.takeSections() : null;
        var matched = forced || self.TRIGGER_KEYWORDS.some(function(k) { return lower.indexOf(k) !== -1; }) || !!(profSecs && profSecs.length);
        // July 31: the anatomy lookup is gated by its OWN keyword list and
        // rides inside THIS SAME wrap rather than adding a 4th
        // window.callOracle wrapper. Real reason (CLAUDE.md landmine): every
        // existing wrapper has to forward all 4 arguments or a matched block
        // silently downgrades a streaming call to blocking - a 4th wrap would
        // be a 4th chance to get that wrong for zero benefit.
        var anatomyHit = self.ANATOMY_KEYWORDS.some(function(k) { return lower.indexOf(k) !== -1; });
        // Aug 26 2026 (G41 Phase 1, Oracle Control) - a real THIRD gate,
        // riding this same wrap rather than a 4th window.callOracle wrapper
        // (same landmine anatomyHit's own comment already names: every wrap
        // must forward all 4 args or a matched block silently downgrades
        // streaming - a 4th wrap is a 4th chance to get that wrong for zero
        // benefit). oracleControl owns its own live-fetched trigger-phrase
        // list (the real oracle_actions Supabase table) - this only asks
        // whether the CURRENT message matches one, synchronously, from
        // whatever oracleControl already has cached (fails open to false if
        // the cache hasn't warmed yet, same discipline as everywhere else).
        var oc = RPGACE.modules.oracleControl;
        var actionHit = !!(oc && oc.matchesAnyTrigger && oc.matchesAnyTrigger(lower));
        // H15 (Sep 16 2026, real Alex ask: "yes, general chat too — build
        // it") - a real FOURTH gate, riding this same wrap (same landmine
        // as anatomyHit/actionHit above - every window.callOracle wrap
        // must forward all 4 args or silently downgrade streaming, so a
        // 4th physical wrap is a 4th chance to get that wrong for zero
        // benefit). cookingOracle owns its own real keyword list AND its
        // own "not while a card's already open" guard (RECIPE_UPDATE_JSON
        // territory, a different real mechanism, not this).
        var cook = RPGACE.modules.cookingOracle;
        var recipeGenHit = !!(cook && cook.matchesRecipeGenTrigger && cook.matchesRecipeGenTrigger(lower));
        // Oct 10 2026 (X1, Ask my data) - a 5th gate in this SAME wrap, for
        // the same reason as the 3 above: never a new window.callOracle
        // wrapper. askMyData owns its own trigger list and source catalog.
        var amd = RPGACE.modules.askMyData;
        var dataHit = !!(amd && amd.matchesDataTrigger && amd.matchesDataTrigger(lower));
        // Oct 13 2026 (LL-5, web lookups) - a 6th gate in this SAME wrap:
        // only sendChat's own main-chat turn (marked one-shot just before
        // its callOracle), so recipe/extractor/system calls never see it.
        var wl = RPGACE.modules.webLookup;
        var webHit = !!(wl && wl.logic.takeChatTurn());
        // RF-6 (Oct 27 2026) - a 7th gate in this SAME wrap: a message about
        // a realm (its name or one of its tools, from the realm registry)
        // gets that realm's live brief (target, next tasks, waiting from
        // other realms). Async like the anatomy lookup; fails open.
        var rfm = RPGACE.modules.realmFrame;
        var realmHits = rfm ? rfm.logic.realmsIn(lower, rfm._reg) : [];
        if (!matched && !anatomyHit && !actionHit && !recipeGenHit && !dataHit && !webHit && !realmHits.length) return orig.apply(this, arguments);
        // ED-1: not routed (forced or keyword hit) -> the free keyword plan
        // picks sections, so the full digest is never sent.
        var pickSecs = profSecs || (prof ? prof.logic.fallbackPlan(lastUser).sections : null);
        var block = matched ? self._buildBlock(pickSecs) : '';
        if (dataHit) block += amd.buildDataBlock();
        if (webHit) block += wl.logic.buildWebBlock();
        if (recipeGenHit && cook && cook.buildRecipeGenBlock) block += cook.buildRecipeGenBlock();
        // Registered-actions list is shown whenever EITHER gate fires -
        // actionHit (the message matches one already) or matched (the
        // broader self-audit gate, which also covers "what should I work
        // on"-shaped requests) - Oracle needs to see the CURRENT list in
        // both cases: to recognize a real match, and (Aug 26 2026, G41
        // Phase 2) to know what's genuinely NOT yet registered before it
        // can suggest adding something new.
        if ((actionHit || matched) && oc && oc.buildActionsBlock) block += oc.buildActionsBlock();
        // Aug 26 2026 (G41 Phase 2, "self-aware vocabulary growth" -
        // Alex's own confirmed choice via /paranoia+/CEO-Drift, records/
        // 2026-08/g41_oracle_control_ceo_spec_2026-08-26.txt section 9).
        // Deliberately gated on the SAME `matched` (TRIGGER_KEYWORDS) gate
        // rather than a brand-new heuristic keyword list - reuses an
        // already-tuned, already-live gate (rule 8) whose existing phrases
        // ("what should i work on", "suggest a fix", "suggest an
        // improvement") already sit in the right semantic territory,
        // rather than risk a fresh, unproven "does this sound like an
        // action request" heuristic. A real gap is honestly accepted here
        // for v1 (some genuine "do X" phrasings won't hit this gate) -
        // acceptable because a wrongly-fired OR wrongly-missed suggestion
        // has zero real effect: it only ever proposes a row Alex must
        // separately approve, which then still needs a real coded
        // _execute() branch before it can do anything at all (see
        // oracleControl._execute's own comment) - three real gates, not one.
        if (matched && oc && oc.buildSuggestBlock) block += oc.buildSuggestBlock();
        // Aug 26 2026, same day, immediate follow-up ("make these toast
        // visible and hookable for oracle to pick up") - same TRIGGER_
        // KEYWORDS gate again (rule 8), which already includes "known
        // bug"/"what's broken"-shaped phrases. Returns '' when nothing
        // real has gone wrong recently, so this never pads a normal reply.
        if (matched && oc && oc.buildRecentErrorsBlock) block += oc.buildRecentErrorsBlock();
        // July 28: was orig.call(this, messages, system+block, maxTokens) -
        // a fixed 3-arg forward that silently dropped any 4th+ argument
        // (main.js's callOracle gained an optional onChunk callback the
        // same day for real streaming). A matched grounding block should
        // never silently turn a streaming call into a non-streaming one.
        var newArgs = Array.prototype.slice.call(arguments);
        var callerThis = this;
        if (realmHits.length) {
          return Promise.all(realmHits.map(function(k) { return rfm.logic.brief(k).catch(function() { return ''; }); }))
            .then(function(bs) { return anatomyHit ? self._buildAnatomyBlock(lastUser).catch(function() { return ''; }).then(function(a) { return { bs: bs, a: a }; }) : { bs: bs, a: '' }; })
            .then(function(x) {
              var rb = x.bs.filter(Boolean).join('\n');
              newArgs[1] = system + block + (rb ? '\n\n' + rb : '') + (x.a || '');
              return orig.apply(callerThis, newArgs);
            });
        }
        if (!anatomyHit) {
          newArgs[1] = system + block;
          return orig.apply(callerThis, newArgs);
        }
        // Anatomy lookup is async (one live Supabase read). Fails open on
        // ANY error or empty result: the call still goes through with
        // whatever the synchronous path already produced, never rejected,
        // never delayed past a single failed fetch.
        return self._buildAnatomyBlock(lastUser).catch(function() { return ''; }).then(function(anatomyBlock) {
          newArgs[1] = system + block + (anatomyBlock || '');
          return orig.apply(callerThis, newArgs);
        });
      };
    }
    patch();
    setTimeout(patch, 1500);
  },

  // July 23 — "make live" (Alex-confirmed: "yes make live, always automate
  // where it makes improvements", following /5thDimension's finding that
  // this whole block is "hand-maintained... not live" per interconnection_
  // map.md's own words). Deliberately NOT a wholesale rewrite of
  // SELF_KNOWLEDGE into a live-generated string - the /5thDimension debate's
  // own honest counter-case stands: a live query that silently fails and
  // shows stale-looking data is worse than an honestly-stale hand-written
  // note, because it LOOKS current. Instead, only the specific numbers that
  // actually go stale fast get a real live source, added ALONGSIDE the
  // existing qualitative text, and only when a real value is actually in
  // hand - if the cache is empty (first call, or the last fetch failed),
  // this block is simply omitted, never replaced with a guess. Same
  // fails-open philosophy this module's own header comment already states.

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 44 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // predecessors already shipped and verified. Pure internal-structure
  // refactor — zero functional, behavioural, UX, data or schema change;
  // every function below was MOVED wholesale, never rewritten and never
  // split down the middle.
  //
  // This module splits 0 ui / 7 logic (forceGroundNext, _refreshLiveFacts,
  // _liveFactsLine, _buildBlock, _anatomyNameVariants, _loadAnatomyIndex,
  // _buildAnatomyBlock) — a genuine "empty ui" case, same precedent as
  // authGate/oracleTreeGrounding elsewhere in this series: this whole
  // module is prompt-text assembly and Supabase reads that ride inside
  // the shared `window.callOracle` wrap `init` installs, never touching
  // a single DOM node. `PERSONA_MARKERS`/`TRIGGER_KEYWORDS`/
  // `ANATOMY_KEYWORDS`/`SELF_KNOWLEDGE`/`_forceNext`/`_liveCache`/
  // `_LIVE_TTL_MS`/`_anatomyIndex`/`_anatomyIndexAt`/`_ANATOMY_TTL_MS`
  // all stay module-scope fields, untouched. `init` stays a literal
  // top-level function and needed ZERO internal changes — its own
  // `var self = this;` already correctly resolves to the module (init
  // is never moved), and every one of its calls (`self._buildBlock()`,
  // `self._buildAnatomyBlock(...)`) already goes through what becomes a
  // real pass-through below.
  //
  // Real, DANGEROUS shared-field risk, checked and handled with extra
  // care given how central this module is to every grounded Oracle
  // call: `forceGroundNext` writes `_forceNext` (a module-scope field
  // `init`'s own wrap reads via ITS OWN module-level `self`) — a naive
  // `this._forceNext = true` inside the moved function would instead
  // set `logic._forceNext` (since it's called through
  // `module.logic.forceGroundNext()`, so `this` there is `logic`, not
  // the module) — the exact bug class this series' own convention
  // exists to prevent. `_buildBlock` originally used bare `this.` with
  // NO `var self` declaration at all (`this._refreshLiveFacts()`,
  // `this.SELF_KNOWLEDGE`, `this._liveFactsLine()`) — the single most
  // dangerous line in this module, since a wrong `this` there would
  // have silently returned `undefined` for the ENTIRE self-knowledge
  // digest on every single grounded Oracle reply, with no error, no
  // crash, just Oracle confidently answering without its own status
  // digest. Both fixed with an explicit
  // `var self = RPGACE.modules.oracleAppGrounding;` requalification.
  //
  // Real, load-bearing external touchpoint, confirmed by grep, not
  // assumed: `prodOraclePanel`'s "5thDimension" command calls
  // `RPGACE.modules.oracleAppGrounding.forceGroundNext()` directly.
  // Preserved via the pass-through below.
  // ══════════════════════════════════════════════════════════════════

  // ============================================================
  // ui — genuinely empty. Zero DOM anywhere in this module (checked
  // directly, not assumed) — declared explicitly rather than omitted,
  // matching the established "empty namespace" precedent elsewhere in
  // this series (e.g. authGate.ui, youtubeOracle.logic).
  // ============================================================
  ui: {},

  // `_liveCache`/`_LIVE_TTL_MS`/`_anatomyIndex`/`_anatomyIndexAt`/
  // `_ANATOMY_TTL_MS` all stay module-scope fields too, same reasoning
  // as `_forceNext` — read/written by multiple functions below, all
  // consistently requalified to the module rather than relying on
  // same-namespace `this` binding, matching this whole series'
  // established convention.
  _liveCache: { taxonomyPending: null, recentUpdates: null, designScan: null, fetchedAt: 0 },
  _LIVE_TTL_MS: 10 * 60 * 1000,
  _anatomyIndex: null,
  _anatomyIndexAt: 0,
  _ANATOMY_TTL_MS: 10 * 60 * 1000,

  logic: {

  forceGroundNext: function() {
    var self = RPGACE.modules.oracleAppGrounding;
    self._forceNext = true;
  },

  _refreshLiveFacts: function() {
    var self = RPGACE.modules.oracleAppGrounding;
    if (Date.now() - self._liveCache.fetchedAt < self._LIVE_TTL_MS) return;
    if (!RPGACE.sb || !RPGACE.sb.select) return;
    self._liveCache.fetchedAt = Date.now(); // claim the slot before the await resolves - avoids a duplicate fetch if triggered twice quickly
    RPGACE.sb.select('taxonomy_proposals', 'status=eq.pending&select=id').then(function(rows) {
      self._liveCache.taxonomyPending = (rows || []).length;
    }).catch(function() { /* fails open - next _buildBlock() just omits this line */ });
    // July 25 (Alex-confirmed, both option 2 and 3 of the /impeccable
    // build): Oracle should be able to see real recent Claude Code
    // activity, not just app-side data. system_updates is already the
    // one real log of every Claude Code change (Chronicles' own source) -
    // reusing it here rather than inventing a second feed (rule 8). The
    // most recent design-scan row (written by the /impeccable skill as a
    // Bedtime/Summary sub-step, never by live app code) is called out
    // separately since that's specifically what Alex asked Oracle to be
    // able to comment on.
    RPGACE.sb.select('system_updates', 'order=created_at.desc&limit=5&select=title,summary,category,created_at').then(function(rows) {
      rows = rows || [];
      self._liveCache.recentUpdates = rows;
      self._liveCache.designScan = rows.find(function(r) { return r.category === 'design-scan'; }) || null;
    }).catch(function() { /* fails open - same as every other line here */ });
  },

  _liveFactsLine: function() {
    var self = RPGACE.modules.oracleAppGrounding;
    var moduleCount = RPGACE.modules ? Object.keys(RPGACE.modules).length : null;
    var bits = [];
    // Module count is genuinely free and always-accurate - no network,
    // no cache, no staleness possible (fixes the /5thDimension Phase 1
    // finding that CLAUDE.md's own "roughly 40+" prose was stale-low).
    if (moduleCount) bits.push(moduleCount + ' real modules registered right now');
    // July 28: free, always-accurate (reads the module's own live array,
    // no network) - a second, independent line of defense against the
    // exact overclaim this module's real bug caused ("structurally
    // complete" for all 21 when only these are actually built).
    var pp = RPGACE.modules && RPGACE.modules.phylumPath;
    if (pp && Array.isArray(pp.ENABLED_PHYLA)) {
      bits.push('phyla actually built out via the Development Framework right now: ' + pp.ENABLED_PHYLA.join(', ') + ' (the rest of the ' + Object.keys(RPGACE.modules.taxonomyTree.PHYLUM_NAMES).length + ' named phyla have no tree content yet)');
    }
    if (typeof self._liveCache.taxonomyPending === 'number') {
      bits.push(self._liveCache.taxonomyPending + ' taxonomy proposals pending review, queried live just now');
    }
    if (self._liveCache.recentUpdates && self._liveCache.recentUpdates.length) {
      bits.push('most recent Claude Code changes to RPGACE: ' + self._liveCache.recentUpdates.map(function(r) { return '"' + r.title + '"'; }).join(', '));
    }
    if (self._liveCache.designScan) {
      var dsSummary = String(self._liveCache.designScan.summary || '').slice(0, 200);
      bits.push('latest design-quality scan on record: "' + self._liveCache.designScan.title + '" — ' + dsSummary);
    }
    return bits.length ? '\n\nLIVE FACTS (queried this moment, not hand-written): ' + bits.join('; ') + '.' : '';
  },

  _buildBlock: function(sections) {
    // Real, dangerous fix (G53 split) — this function originally used
    // bare `this.` with NO `var self` declaration at all. Called as
    // `module.logic._buildBlock()` via the pass-through, `this` here
    // is the `logic` sub-object, not the module — `this.SELF_KNOWLEDGE`
    // would have silently returned `undefined` (SELF_KNOWLEDGE is a
    // module-scope field) on every single grounded Oracle reply, with
    // no error, no crash. Requalified to the module explicitly.
    var self = RPGACE.modules.oracleAppGrounding;
    self._refreshLiveFacts();
    // OP-5: sections = the app-note sections oracleProfessor picked for this
    // turn (array) -> only those; null/undefined -> the full digest.
    var prof = RPGACE.modules.oracleProfessor;
    // ED-1: never the whole digest - core + the picked domain sections.
    var notes = prof ? prof.logic.sectionsText(sections || []) : self.SELF_KNOWLEDGE;
    var dd = RPGACE.modules && RPGACE.modules.dashDeck;
    var cardLines = '';
    if (dd && dd.MODULES) {
      cardLines = dd.MODULES.map(function(m) { return '- ' + m.name + ': ' + m.desc; }).join('\n');
    }
    return '\n\n---\n' + notes +
      self._liveFactsLine() +
      (cardLines ? '\n\nRPGACE\'s live dashboard cards right now:\n' + cardLines : '') +
      '\n\nIf Alex asks what to build/fix next, give ONE concrete, specific suggestion grounded in the real gaps above - not a generic list.';
  },

  // ── ANATOMY LOOKUP (July 31) ────────────────────────────────────────
  // Oracle runs as a stateless Vercel function - it can never read
  // rpgace_core.js, graphify-out/, or the six oversight docs. SELF_KNOWLEDGE
  // above answers "what's built"; this answers "how does that specific thing
  // actually work", from the `oracle_module_anatomy` table (curated by Claude
  // Code sessions only - nothing in the app writes to it, and it is
  // deliberately NOT in api/data-write.js's ALLOWED_TABLES).
  //
  // Shape is lifted from oracleTreeGrounding._buildGroundingBlock rather than
  // hand-rolled (rule 8a): cheap free local scan -> live Supabase SELECT
  // scoped to what matched -> score -> top-N -> inject -> fail open. The
  // index fetch (module_name/layer/keywords only, no prose) is TTL-cached so
  // repeated anatomy questions in one session cost one network read, not one
  // per message; the full-prose rows are fetched ONLY for the 2-3 that
  // actually scored. (`_anatomyIndex`/`_anatomyIndexAt`/`_ANATOMY_TTL_MS`
  // moved to module scope, same reasoning as `_liveCache` above — see
  // the G53 block further up.)

  // 'dashDeck' -> ['dashdeck', 'dash deck'] so a human typing "how does the
  // dash deck work" still matches a camelCase module name. Compound-phrase
  // discipline still holds: these are whole names, never bare adjectives.
  _anatomyNameVariants: function(name) {
    var lower = String(name || '').toLowerCase();
    var spaced = String(name || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
    return spaced !== lower ? [lower, spaced] : [lower];
  },

  _loadAnatomyIndex: function() {
    var self = RPGACE.modules.oracleAppGrounding;
    if (self._anatomyIndex && (Date.now() - self._anatomyIndexAt < self._ANATOMY_TTL_MS)) {
      return Promise.resolve(self._anatomyIndex);
    }
    if (!RPGACE.sb || !RPGACE.sb.select) return Promise.resolve([]);
    return RPGACE.sb.select('oracle_module_anatomy', 'select=module_name,layer,keywords&limit=200')
      .then(function(rows) {
        rows = Array.isArray(rows) ? rows : [];
        self._anatomyIndex = rows;
        self._anatomyIndexAt = Date.now();
        return rows;
      })
      .catch(function() { return []; });
  },

  _buildAnatomyBlock: function(userText) {
    var self = RPGACE.modules.oracleAppGrounding;
    var lower = String(userText || '').toLowerCase();
    if (!lower) return Promise.resolve('');
    return self._loadAnatomyIndex().then(function(index) {
      if (!index.length) return '';
      // Free local scoring - no tokens, no second network call. A module
      // named outright is a much stronger signal than a keyword brush, so
      // it scores higher and wins the top-3 slots.
      var scored = index.map(function(row) {
        var score = 0;
        self._anatomyNameVariants(row.module_name).forEach(function(v) {
          if (v && lower.indexOf(v) !== -1) score += 5;
        });
        (row.keywords || []).forEach(function(k) {
          if (k && lower.indexOf(String(k).toLowerCase()) !== -1) score += 2;
        });
        return { name: row.module_name, score: score };
      }).filter(function(s) { return s.score > 0; })
        .sort(function(a, b) { return b.score - a.score; })
        .slice(0, 3);
      // Nothing matched: emit NOTHING. An anatomy-shaped question about
      // something not in the table (a general music question phrased "how
      // does X work") must cost zero extra tokens, same as a missed
      // TRIGGER_KEYWORDS gate.
      if (!scored.length) return '';
      // Module names are plain identifiers by construction; strip anything
      // else rather than percent-encoding, because PostgREST parses in.()'s
      // own commas/parens from the raw query string - encoding them breaks
      // the filter rather than escaping it.
      var names = scored.map(function(s) { return String(s.name).replace(/[^A-Za-z0-9_.-]/g, ''); })
        .filter(Boolean).join(',');
      if (!names) return '';
      return RPGACE.sb.select('oracle_module_anatomy',
        'module_name=in.(' + names + ')&select=module_name,layer,purpose,anatomy,connects_to,gotchas,source_ref'
      ).then(function(rows) {
        rows = Array.isArray(rows) ? rows : [];
        if (!rows.length) return '';
        // Re-apply the local ranking - PostgREST returns rows in table
        // order, not in the order they were asked for.
        var order = {};
        scored.forEach(function(s, i) { order[s.name] = i; });
        rows.sort(function(a, b) { return (order[a.module_name] || 0) - (order[b.module_name] || 0); });
        var lines = rows.map(function(r) {
          var bits = ['- ' + r.module_name + ' (' + r.layer + ') — ' + r.purpose];
          if (r.anatomy) bits.push('  HOW IT ACTUALLY WORKS: ' + r.anatomy);
          if (r.connects_to) bits.push('  CONNECTS TO: ' + r.connects_to);
          if (r.gotchas) bits.push('  GOTCHA: ' + r.gotchas);
          if (r.source_ref) bits.push('  SOURCE: ' + r.source_ref);
          return bits.join('\n');
        }).join('\n\n');
        return '\n\n---\nRPGACE INTERNAL ANATOMY (real curated notes on the specific parts of RPGACE\'s own code this message is asking about — written by the Claude Code sessions that actually built them, not guessed):\n' + lines + '\n' +
          'Answer from these first and cite the module name and its source file:line so Alex can go look at the real code. The GOTCHA lines are real, already-hit landmines — mention the relevant one rather than giving generic advice. If the question is about a part of RPGACE that is NOT described above, say plainly that you do not have its internals on hand rather than inventing a mechanism.';
      }).catch(function() { return ''; });
    }).catch(function() { return ''; });
  },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. Real, load-bearing external touchpoint: `prodOraclePanel`'s
  // "5thDimension" command calls
  // `RPGACE.modules.oracleAppGrounding.forceGroundNext()` directly.
  // Also carries this module's own internal calls: `init`'s wrap calls
  // `self._buildBlock()`/`self._buildAnatomyBlock(...)`, and every
  // logic function above reaches its siblings/fields through `self.X`
  // — every one of those `self`s is the module, so each lands here
  // first and is routed on to the right namespace.
  forceGroundNext: function() { return this.logic.forceGroundNext(); },
  _refreshLiveFacts: function() { return this.logic._refreshLiveFacts(); },
  _liveFactsLine: function() { return this.logic._liveFactsLine(); },
  _buildBlock: function(sections) { return this.logic._buildBlock(sections); },
  _anatomyNameVariants: function(name) { return this.logic._anatomyNameVariants(name); },
  _loadAnatomyIndex: function() { return this.logic._loadAnatomyIndex(); },
  _buildAnatomyBlock: function(userText) { return this.logic._buildAnatomyBlock(userText); },

});
/* ===END:oracleAppGrounding=== */
