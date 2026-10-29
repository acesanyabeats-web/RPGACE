
/* ===MODULE:dashDeck=== */
// July 20 — Dashboard pass 1 of the DESIGN.md restructure (spec approved
// by Alex; structure from aingertomlin.co.nz, skin 100% existing RPGACE
// tokens - zero new colors/fonts, L1 interactions only). The one-scroll
// contract: character HUD (existing, untouched) answers "who am I";
// this module injects the 2x2 MODULE GRID ("what are my tools" - four
// cards, each eyebrow → name → one line → one live stat → one gold
// Enter link) directly under it, then ONE narrative-left/checklist-
// right split-section ("what needs me now") fed by live data. Existing
// widgets below are untouched in pass 1 - widget-by-widget
// consolidation is pass 2, after hand-test.
RPGACE.register('dashDeck', {
  domain: 'platform',

  // July 24: the [1400, 3000] dual-timer retry is gone - #page-dashboard
  // is static HTML already present at parse time (not dynamically
  // created), so there was never a real reason to retry at two delays.
  // One immediate call via registerBootTask, gated behind the boot
  // loader instead of firing after the user already sees the page.
  init: function() {
    var self = this;
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.dashboard) { setTimeout(function() { self._inject(); self._relocateQuestBoard(); }, 200); return; }
      var meta = self.logic._pageMeta(name);
      if (meta) self.logic._trailPush({ kind: 'page', key: name, icon: meta.icon, label: meta.label });
    });
    RPGACE.registerBootTask(function() { self._inject(); self._relocateQuestBoard(); });
    RPGACE.hooks.on('rpgace:login', function() { setTimeout(function() { self._refreshGlance(); }, 1200); });
  },

  // Order (July 20, Pass 2 — Fable's grouping): learning/building row, then
  // daily-use row, then knowledge-storage row. Oversight moved to last slot;
  // Agenda/Encyclopedia/Journal added as simple showPage navigation cards,
  // mirroring Oracle's own pattern (no popup needed — each is a full page).

  // Live pending-review count (taxonomy_proposals + taxonomy_links), set by
  // _refreshGlance. null until the first fetch resolves - see the Taxonomy &
  // Review card's go() for why null routes to the queue, not the browse page.
  _pendingReviewCount: null,

  MODULES: [
    // Aug 15 2026 (A5 Phase 1, then same-day follow-up) — the "🧠 Research
    // Lab" card is RETIRED entirely, not just narrowed. Idea Bank/Beat
    // Log/Corpus/Upload Workshop/Bibliography moved to Content
    // Pipeline/Corpus/Bookworm in Phase 1; File Analyzer + Video Finder
    // (the last 2 tabs) moved to Bookworm same day, per Alex's direct
    // ask after hand-testing Phase 1 ("i want these in bookworm under
    // the bookworm update i wanted too" — ties to A8). Nothing left here
    // to justify its own dashboard tile. dashDeck._openResearch() is kept
    // defined but unreferenced (same "kept on disk, nothing 404s"
    // precedent as the Meanders page) in case a future pass wants it back.
    // Aug 15 2026 (A5 Phase 1) — Corpus's own stand-alone dashboard card
    // was added here, per Alex's own literal wording ("corpus should be a
    // stand-alone card in dashboard"). REAL, CONFIRMED SUPERSESSION, Aug 31
    // 2026 (UI10) — Alex's own later, direct ask ("fully absorb corpus
    // into audio worm, the UI module is not needed there"): the card is
    // retired outright, not kept alongside the worm-picker route. MusicWorm
    // is now reachable only via Bookworm's own worm-picker (dashDeck
    // ._openBookworm, UI12) -> the real #page-musicworm (UI11). refCorpus
    // itself is untouched — still a real River VII module (CLAUDE.md rule
    // 15) — only this dashboard entry point is gone.
    { key: 'bookworm', accent: '--dd-purple-rgb', color: 'var(--purple)', emoji: '📖', name: 'Bookworm', desc: 'Whole books, chapter by chapter, into the taxonomy — with review checkpoints.', go: function() { RPGACE.modules.dashDeck._openBookworm(); } },
    // July 24 round 3 (Alex: the two tiles read as duplicates). Merged back
    // into ONE card. Round 2's separate 'reviewQueue' tile had the right
    // diagnosis (review needed a real card, not a stat line) but the wrong
    // shape: two adjacent tiles fed by the SAME pending count, one
    // navigating, one acting, both showing the same number. This card is now
    // primary-action = review, with Phylum Path browse as the empty-queue
    // fallback. Browsing is never stranded - leftNav keeps its own
    // '🧬 Phylum Path' entry. Also drops a real emoji collision: 📋 was used
    // by both this tile and 'agenda'.
    // _pendingReviewCount is set by _refreshGlance below. null = the count
    // hasn't resolved yet, and an unresolved count deliberately opens the
    // QUEUE rather than navigating away: _openQueue handles empty gracefully
    // ("Nothing waiting - all caught up"), whereas navigating away from a
    // click that meant "review" is the exact failure reported twice tonight.
    // Aug 11 2026 (real /paranoia+/Engineer pass, Alex's own ask: "make a
    // similar thing to chronicles... top 5 show most recent, skip button
    // to just access the actual taxonomy") — now opens _openCard() (a
    // compact top-5-most-recent view, mirroring chroniclesLog._openCard()
    // exactly) instead of the full _openQueue() (which renders every
    // pending row — 51 real rows as of this session, genuinely long).
    // _openCard() itself has the skip-to-tree button; the empty-queue
    // short-circuit below is unchanged, since there's nothing to review.
    // Sep 26 2026 — real Alex ask: give Taxonomy the exact same "picker
    // popup -> real sub-page" setup Bookworm's card already uses for
    // Videoworm/MusicWorm (dashDeck._openBookworm). Real, deliberate
    // behavior change from the old bypass-straight-to-review-queue shortcut
    // below: this card now ALWAYS opens the picker first, matching
    // Bookworm's own card exactly (which never bypasses its picker either),
    // rather than auto-opening one specific destination.
    { key: 'taxonomy', accent: '--dd-green-rgb', color: 'var(--green)', emoji: '🌳', name: 'Review', desc: 'Jargon to review one at a time; placements and gaps join once the tree is rebuilt.', go: function() { var m = RPGACE.modules.knowledgeReview; if (m) m.open(); else RPGACE.modules.dashDeck._openTaxonomy(); } }, // KN-3
    { key: 'oracle', accent: '--dd-gold-rgb', color: 'var(--gold)', emoji: '⚡', name: 'Oracle', desc: 'Chat grounded in your own gathered library — gaps become learning prompts.', go: function() { if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.oracle); } },
    { key: 'agenda', accent: '--dd-gold-rgb', color: 'var(--gold)', emoji: '☀️', name: 'My Day', desc: 'Your actions for today, plan my day around shifts, and today\'s agenda.', go: function() { if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.agenda); } },
    { key: 'morningBrief', accent: '--dd-gold-rgb', color: 'var(--gold)', emoji: '🌅', name: 'Morning Brief', desc: 'Your day in one shot — priorities, pending reviews, today\'s focus.', go: function() { RPGACE.modules.dashDeck._openMorningBrief(); } },
    { key: 'gaps', accent: '--dd-green-rgb', color: 'var(--green)', emoji: '🕳️', name: 'Knowledge Gaps', desc: 'What your library doesn\'t know yet — now part of Review.', go: function() { var m = RPGACE.modules.knowledgeReview; if (m) m.open(); else RPGACE.modules.dashDeck._openGaps(); } }, // KN-3
    { key: 'pipeline', accent: '--dd-purple-rgb', color: 'var(--purple)', emoji: '🎬', name: 'Content Pipeline', desc: 'Beats, posts and the ideas behind them.', go: function() { RPGACE.modules.dashDeck._openPipeline(); } },
    // Aug 6 (Engineer pass, real Video Pipeline → Content Pipeline
    // absorption, Alex's explicit /deduplication ask) — this card is
    // DELETED, not just relabeled. Every real video_jobs row has always
    // been created by beatLog._submit, so it was always a real step
    // inside Content Pipeline's own flow, never an independent workflow.
    // Its real functionality (stage tracker, paths+exports) now lives
    // inline in the Production Panel's Phase 4 — see
    // contentProductionLive._buildVideoJobStatus. See
    // engineer_pass_2026-08-06_11.txt for the full record.
    { key: 'encyclopedia', accent: '--dd-blue-rgb', color: 'var(--blue)', emoji: '📖', name: 'Encyclopedia', desc: 'Your compiled knowledge base, auto-built from the content pipeline.', go: function() { if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.encyclopedia); } },
    { key: 'journal', accent: '--dd-green-rgb', color: 'var(--green)', emoji: '📓', name: 'Journal', desc: 'Your running log — reflections, wins, and what to improve next.', go: function() { if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.journal); } },
    { key: 'oversight', accent: '--dd-blue-rgb', color: 'var(--blue)', emoji: '📚', name: 'Oversight', desc: 'Explaining docs, truth docs, and Smoke Test — what actually works.', go: function() { RPGACE.modules.dashDeck._openOversight(); } },
    { key: 'chronicles', accent: '--dd-gold-rgb', color: 'var(--gold)', emoji: '📜', name: 'The Chronicles', desc: 'Every real win, sale, and expense — one searchable log.', go: function() { RPGACE.modules.chroniclesLog._openCard(); } },
    // 2026-09-10 - HABITS domain, Cooking module (H2). Real /CEO Loop 1
    // interrogation: records/2026-09/habits_cooking_domain_interrogation_spec_2026-09-10.txt.
    // First real HABITS module, built inside the existing app using
    // existing UI conventions (dashDeck._popup(), no new stack/page) per
    // Alex's own direct correction. go: opens cookingOracle's own
    // self-contained popup directly, same accepted direct-module-call
    // pattern the 'oracle'/'agenda' cards above already use.
    { key: 'cooking', accent: '--dd-green-rgb', color: 'var(--green)', emoji: '🍳', name: 'Cooking', desc: 'Generate a recipe, save it to your journal, and see what you actually cook over time.', go: function() { var m = RPGACE.modules.cookingOracle; if (m && m.ui && m.ui._showModuleHub) m.ui._showModuleHub(); } },
    // 2026-09-14 - real Alex ask: "general shopping list module... future
    // purchases... plan out total budget." Deliberately standalone from
    // the 'cooking' card above (real, general future purchases - batteries,
    // a wok, FIFA 27 - not ingredients; see shoppingWishlist's own header
    // comment for the full real evidence this isn't a HABITS/Cooking item).
    // Oct 10 2026 — HABITS module 2 (D1, Alex's pick: "gym tracker").
    { key: 'health', accent: '--dd-purple-rgb', color: 'var(--purple)', emoji: '❤️', name: 'Health & body', desc: 'Calories and protein from a photo or a label, your gym programme with overload nudges, weight, water and sleep.', go: function() { var m = RPGACE.modules.healthBody; if (m) m.open(); } },
    { key: 'gym', accent: '--dd-purple-rgb', color: 'var(--purple)', emoji: '🏋️', name: 'Gym', desc: 'Today\'s workout from your programme, log a session, this week against your target, personal bests.', go: function() { var m = RPGACE.modules.gymTracker; if (m) m.open(); } },
    // Oct 13 2026 — LL-1 Life Library (Knowledge): what you took in.
    { key: 'library', accent: '--dd-blue-rgb', color: 'var(--blue)', emoji: '📚', name: 'Life Library', desc: 'Everything you took in: books, videos, links, lookups, notes, by date, shelf and topic.', go: function() { var m = RPGACE.modules.lifeLibrary; if (m) m.open(); } },
    { key: 'liveNow', accent: '--dd-gold-rgb', color: 'var(--gold)', emoji: '▶', name: 'Live now', desc: 'The realm block you are in: pick a type of work, do its tasks. Also New tasks and the task Catalogue.', go: function() { var m = RPGACE.modules.realmTasks; if (m) m.ui.openLive(); } },
    // DR-10 (Oct 27 2026): one Ideas door by realm.
    { key: 'ideas', accent: '--dd-gold-rgb', color: 'var(--gold)', emoji: '💡', name: 'Ideas', desc: 'Every idea in one place by realm: beat and post ideas, outing ideas and new tasks to keep. Tap one to open it where it lives.', go: function() { var m = RPGACE.modules.ideasDoor; if (m) m.open(); } },
    { key: 'plans', accent: '--dd-gold-rgb', color: 'var(--gold)', emoji: '🧳', name: 'Plans', desc: 'Trips, events and days out: Oracle researches and drafts, you book.', go: function() { var m = RPGACE.modules.tripPlans; if (m) m.open(); } },
    // Oct 11 2026 — S1 Screenshot Inbox (Knowledge).
    { key: 'screenshots', accent: '--dd-purple-rgb', color: 'var(--purple)', emoji: '📸', name: 'Screenshot Inbox', desc: 'Drop screenshots; Oracle reads them, you choose where each one goes.', go: function() { var m = RPGACE.modules.screenshotInbox; if (m) m.open(); } },
    { key: 'wishlist', accent: '--dd-blue-rgb', color: 'var(--blue)', emoji: '🛒', name: 'Shopping Wishlist', desc: 'Future purchases, priority-ranked against your real budget — never forgotten.', go: function() { var m = RPGACE.modules.shoppingWishlist; if (m && m.ui && m.ui._showMain) m.ui._showMain(); } },
  ],

  // ── GENERIC relocation infra (July 20, Pass 1) — same live-node-move
  // ── pattern proven by _ensureHolder/_stashBookworm, generalised so the
  // ── Knowledge Gap Tracker (#kg-panel) and Content Production Live
  // ── (#cpl-widget) widgets can live in their dashDeck card popups too.
  // ── One shared hidden holder (#dd-stash-holder) parks any relocated
  // ── widget while its popup is closed. The bookworm path deliberately
  // ── keeps its own proven _ensureHolder/_stashBookworm untouched.
  //
  // A follow-up pass wanting to relocate the quest board can reuse this
  // trio verbatim: _ensureStash() (holder), _stashWidget(id,force)
  // (move-back), _widgetPopups + closeWidgetPopup(id) (let a widget's own
  // action button dismiss the hosting popup before it navigates / opens a
  // higher-priority overlay).
  _widgetPopups: {}, // widgetId -> pop.close fn, registered while its popup is open

  // ── Oct 10 2026 — N1 of the ratified /CEO plan "RPGACE Domains,
  // ── Navigation & Deepstash Encyclopedia" (records/2026-10/
  // ── rpgace_domains_navigation_ceo_plan_2026-10-10.txt). Alex: phone Back
  // ── closes the popup you're in, and after that "revert back to page that
  // ── accessed the page i went back on". How it works:
  // ──  - every _popup pushes a history entry {page, popup, card};
  // ──  - pathRouter's popstate asks _navOnPopstate first: if a popup is
  // ──    open it closes, and the page does not change;
  // ──  - closing a popup any other way consumes its entry with
  // ──    history.back(), UNLESS the close was immediately followed by
  // ──    navigation - then the entry stays under the new page, and Back
  // ──    from that page lands on it and reopens the card it came from
  // ──    (_navAfterPage). An entry with no reopenable card is skipped.
  // ── NAV_DOMAINS groups the dashboard cards by domain for the popup
  // ── header's "Domain › Card" crumb and sibling chips.
  NAV_DOMAINS: {
    library: 'Knowledge', bookworm: 'Knowledge', taxonomy: 'Knowledge', gaps: 'Knowledge', encyclopedia: 'Knowledge', screenshots: 'Knowledge',
    oracle: 'Oracle',
    agenda: 'Schedule & Journal', morningBrief: 'Schedule & Journal', journal: 'Schedule & Journal', plans: 'Schedule & Journal', liveNow: 'Schedule & Journal', ideas: 'Schedule & Journal',
    pipeline: 'Content & Video', chronicles: 'Chronicles', cooking: 'Habits', gym: 'Habits',
    health: 'Habits', wishlist: 'Habits', oversight: 'Oversight',
  },
  _navStack: [],
  _activeCardKey: null,
  _activeCardAt: 0,
  _navIgnorePop: 0,
  _navReplaceUntil: 0,
  _navReplaceHref: '',

  _navCard: function(key) {
    for (var i = 0; i < this.MODULES.length; i++) if (this.MODULES[i].key === key) return this.MODULES[i];
    return null;
  },

  _navOpenCard: function(key) {
    var m = this._navCard(key);
    if (!m) return;
    this._activeCardKey = key;
    this._activeCardAt = Date.now();
    this.logic._trailPush({ kind: 'card', key: key, icon: m.emoji, label: m.name });
    m.go();
  },

  // The card a new popup belongs to: its parent popup's card, or the card
  // clicked in the last few seconds (some cards fetch data before opening).
  _navCurrentCard: function() {
    this._navPrune();
    var top = this._navStack[this._navStack.length - 1];
    if (top) return top.card;
    if (this._activeCardKey && Date.now() - this._activeCardAt < 4000) return this._activeCardKey;
    return null;
  },

  _navPrune: function() {
    this._navStack = this._navStack.filter(function(e) { return document.body.contains(e.overlay); });
  },

  _navPush: function(entry) {
    this._navPrune();
    this._navStack.push(entry);
    if (entry.card) this._activeCardKey = null;
    var st = history.state || {};
    var state = { page: st.page || null, popup: this._navStack.length, card: entry.card || null };
    try {
      // Replace (not push) only for a card reopened from history, and only
      // if no page navigation happened in between.
      if (Date.now() < this._navReplaceUntil && location.href === this._navReplaceHref) {
        this._navReplaceUntil = 0;
        history.replaceState(state, '', location.href);
      } else history.pushState(state, '', location.href);
      entry.pushed = true;
    } catch (e) {}
  },

  _navClosed: function(entry, keepHistory) {
    var i = this._navStack.indexOf(entry);
    if (i === -1) return; // already closed
    this._navStack.splice(i, 1);
    if (keepHistory || !entry.pushed) return;
    var self = this, href = location.href;
    // Deferred: if the close was part of navigating to another page, that
    // page's entry is now on top and this popup's entry must stay beneath it.
    setTimeout(function() {
      var st = history.state;
      if (location.href === href && st && st.popup) { self._navIgnorePop++; history.back(); }
    }, 0);
  },

  // Called by pathRouter's popstate listener. true = handled, don't change page.
  _navOnPopstate: function(e) {
    if (this._navIgnorePop > 0) { this._navIgnorePop--; return true; }
    this._navPrune();
    var top = this._navStack[this._navStack.length - 1];
    if (!top) return false;
    top.close(true);
    // Landed on an entry for a popup that is no longer open (e.g. the card
    // you switched away from with a sibling chip): reopen it.
    var st = e && e.state;
    if (st && st.popup && this._navStack.length < st.popup && st.card) this._navReopen(st.card);
    return true;
  },

  _navReopen: function(key) {
    var self = this;
    setTimeout(function() {
      self._navReplaceUntil = Date.now() + 4000;
      self._navReplaceHref = location.href;
      self._navOpenCard(key);
    }, 60);
  },

  // After pathRouter shows the page for a history entry: if that entry was a
  // popup, reopen the card it belonged to (replacing the entry, not adding one).
  _navAfterPage: function(state) {
    if (!state || !state.popup) return;
    if (state.card && this._navCard(state.card)) this._navReopen(state.card);
    else history.back();
  },

  // Sibling chip in a popup header: close this popup but keep its history
  // entry, so Back from the sibling returns here (_navOnPopstate reopens it).
  _navSwitchCard: function(entry, key) {
    if (entry.close) entry.close(true);
    this._navOpenCard(key);
  },

  // Metadata for every relocatable panel, in ONE place (rule 8) so
  // _openBookworm's worm picker, _openPipeline's sub-step buttons, and any
  // other caller (e.g. loadNote's "Load" handler) all open the exact same
  // popup for a given panel instead of each re-declaring its identity.
  PANEL_POPUPS: {
    'file-analyzer-panel':   { eyebrow: '🐛 Videoworm',                title: 'Analyse a video into real insights',        accent: 'var(--purple)', width: '760px' },
    'video-finder-panel':    { eyebrow: '🐛 Videoworm: Find Videos',   title: 'Search YouTube and feed URLs into Videoworm', accent: 'var(--purple)', width: '720px' },
    'bookworm-bibliography': { eyebrow: '📚 Bibliography',             title: 'Books you have finished',                    accent: 'var(--purple)', width: '640px' },
    'cp-idea-bank':          { eyebrow: '💡 Idea Bank',                title: 'Every saved content idea',                   accent: 'var(--gold)',   width: '720px' },
    'beat-log-panel':        { eyebrow: '🥁 Beat Log',                 title: 'Log a finished beat',                        accent: 'var(--gold)',   width: '720px' }
  },

  // ── PAGE_PANELS / _openPage — Aug 31 2026 (UI11), the real routable-page
  // sibling to PANEL_POPUPS/_openPanelPopup above. Same relocate-node
  // discipline (the real DOM node is MOVED, never cloned/rebuilt, so every
  // listener and inline onclick on it keeps working exactly as before) but
  // the destination is a real #page-<slug> div instead of a transient
  // popup. Pages never leave the DOM (showPage() only toggles .active), so
  // once a panel is moved in on its first real visit, it simply STAYS —
  // there is no "close" to move it back on, unlike a popup.
  //
  // taxtree-manual-btn sibling-carry: identical real problem and identical
  // fix as _openPanelPopup's own (see that function's own comment) — only
  // #cp-idea-bank/#beat-log-panel ever anchor phylumPath's manual-placement
  // button as a DOM sibling. Whichever of Idea Bank/Beat Log is visited
  // FIRST carries the button along permanently — the exact same order-
  // dependent behavior _openPanelPopup already had, not a new quirk this
  // introduces.
  PAGE_PANELS: {
    'bookworm-widget':       { slug: 'bookworm',        ensure: function() { var m = RPGACE.modules.bookworm; if (m && m._injectDashboardWidget) m._injectDashboardWidget(); } },
    'file-analyzer-panel':   { slug: 'videoworm',        ensure: null },
    'video-finder-panel':    { slug: 'videoworm',        ensure: null },
    'ref-corpus-panel':      { slug: 'musicworm',        ensure: function() { var m = RPGACE.modules.refCorpus; if (m && m._inject) m._inject(); } },
    'bookworm-bibliography': { slug: 'bibliography',     ensure: function() { var m = RPGACE.modules.bookworm; if (m && m._injectBibliographySection) m._injectBibliographySection(); } },
    'cpl-widget':            { slug: 'content-pipeline', ensure: function() { var m = RPGACE.modules.contentProductionLive; if (m && m._injectDashboardWidget) m._injectDashboardWidget(); } },
    // Oct 27 2026: a second visit redraws the list (a beat started elsewhere shows its 🎛 badge).
    'cp-idea-bank':          { slug: 'idea-bank',        ensure: function() { var m = RPGACE.modules.conidPot; if (!m) return; if (document.getElementById('cp-idea-bank-list') && m._refreshIdeaBank) m._refreshIdeaBank(); else if (m._injectIdeaBank) m._injectIdeaBank(); } },
    'beat-log-panel':        { slug: 'beat-log',         ensure: function() { var m = RPGACE.modules.beatLog; if (m && m._inject) m._inject(); } }
  },


  // G53 (Sep 2026) split note: ui holds real DOM construction - every
  // card/popup builder, the shared _popup() scaffolding itself (the
  // single most externally-depended-on function in the whole app, 38
  // real direct call sites plus dozens more via local alias), and the
  // widget-relocation helpers. logic holds the 2 genuinely non-DOM
  // functions - closeWidgetPopup (a lookup + call, no DOM of its own)
  // and _openPanelById (pure metadata delegation). Every moved function
  // was MOVED wholesale, never rewritten. Data fields (_pendingReviewCount/
  // MODULES/_widgetPopups/PANEL_POPUPS/PAGE_PANELS) all stay module-scope,
  // grouped together here rather than left interleaved with the functions
  // that use them, matching this series' established data-field convention.
  // Any function that reads a module-scope field or calls a sibling method
  // resolves through a direct `RPGACE.modules.dashDeck.X` reference (or
  // `var self = RPGACE.modules.dashDeck;` where the same field/method is
  // touched more than once), never bare `this.` - a function invoked as
  // ui.X()/logic.X() has `this` bound to that sub-object, not the module.
  // The real, highest-stakes fixes: _widgetPopups is read/written by 4
  // separate popup-opening functions (_openGaps/_openPanelPopup/
  // _openMorningBrief/closeWidgetPopup) and PAGE_PANELS is read by
  // _openPage, a function with dozens of real external callers across the
  // whole app - both were bare `this.X` in the original source and would
  // have silently broken (looked up on the wrong sub-object) the instant
  // this split shipped without the fix.

  // ui - rendering/DOM.
  ui: {

  // ── Pass 2 (July 20): the daily/weekly quest board used to render on the
  // ── dashboard alongside this deck — debulked into the Agenda page
  // ── (#page-quests), which already holds the career/health/lifestyle Quest
  // ── Board directly below. Moves the LIVE nodes (never rebuilds), so
  // ── buildAllQuests()'s getElementById lookups keep resolving and all
  // ── button handlers (btn.closest('.quest-card')) stay intact. Idempotent —
  // ── safe to call on every dashboard visit.
  _relocateQuestBoard: function() {
    var dq = document.getElementById('daily-quests');
    var wq = document.getElementById('weekly-quests');
    var pageQuests = document.getElementById('page-quests');
    var anchor = document.getElementById('career-quests');
    if (!dq || !wq || !pageQuests || !anchor) return;
    if (dq.closest && dq.closest('#page-quests')) return; // already relocated
    var anchorWrap = anchor.parentElement || anchor;
    [dq, wq].forEach(function(grid) {
      var heading = grid.previousElementSibling;
      var moveHeading = !!(heading && heading.classList && heading.classList.contains('section-title'));
      if (moveHeading) pageQuests.insertBefore(heading, anchorWrap);
      pageQuests.insertBefore(grid, anchorWrap);
    });
  },

  _injectStyles: function() {
    if (document.getElementById('dd-styles')) return;
    var st = document.createElement('style');
    st.id = 'dd-styles';
    st.textContent =
      ':root{--dd-gold-rgb:201,168,76;--dd-purple-rgb:155,110,200;--dd-green-rgb:76,175,130;--dd-blue-rgb:74,140,204}' +
      '@keyframes ddRiseIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
      '#dd-deck{max-width:1080px;margin:0 auto 20px auto}' +
      // Oct 10 2026 (N2 slice 5) — landing page.
      '.dd-ld-hello{padding:4px 2px 14px}.dd-ld-hello h2{font-family:Cinzel,serif;font-size:22px;color:var(--gold);letter-spacing:1px;margin:0}' +
      '.dd-ld-hello p{font-size:13px;color:var(--muted);margin:4px 0 0}' +
      '.dd-ld-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}' +
      '.dd-ld-sec{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:14px 14px 10px;min-width:0;animation:ddRiseIn .35s var(--ease-out) both}' +
      '.dd-ld-sec h3{font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text);margin:0 0 8px}' +
      '.dd-ld-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}' +
      '.dd-ld-row{display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:8px 10px;background:var(--dark);border:1px solid var(--border);border-radius:9px;color:var(--text);font-family:Rajdhani,sans-serif;text-align:left;box-sizing:border-box}' +
      'button.dd-ld-row{cursor:pointer;transition:border-color .2s}button.dd-ld-row:hover{border-color:var(--gold)}' +
      // TP-6 (Oct 14 2026): a book-by deadline that is today or overdue.
      '.dd-ld-row.dd-ld-hot{border-color:#e0a84c;background:rgba(224,168,76,0.10)}' +
      '.dd-ld-ic{font-size:18px;flex-shrink:0;width:24px;text-align:center}' +
      '.dd-ld-body{display:flex;flex-direction:column;min-width:0;flex:1}' +
      '.dd-ld-t{font-size:14px;font-weight:700;line-height:1.3;overflow-wrap:anywhere}' +
      '.dd-ld-s{font-size:12px;color:var(--muted);line-height:1.35;overflow-wrap:anywhere}' +
      '.dd-ld-empty{font-size:13px;color:var(--muted);padding:6px 2px}' +
      '.dd-ld-brief{width:100%;min-height:44px;margin-bottom:10px;background:rgba(201,168,76,0.1);border:1px solid var(--gold);border-radius:9px;color:var(--gold);font-family:Rajdhani,sans-serif;font-size:14px;font-weight:700;cursor:pointer}' +
      '.dd-ld-ask{display:flex;gap:8px;align-items:stretch}' +
      '.dd-ld-ask textarea{flex:1;min-width:0;resize:vertical;background:var(--dark);border:1px solid var(--border);border-radius:9px;color:var(--text);font-family:inherit;font-size:14px;padding:8px 10px}' +
      '.dd-ld-ask button{min-width:64px;min-height:44px;background:var(--gold);border:none;border-radius:9px;color:#111;font-family:Rajdhani,sans-serif;font-size:14px;font-weight:700;cursor:pointer}' +
      '@media (max-width:700px){.dd-ld-grid{grid-template-columns:1fr}}' +
      '#dd-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px}' +
      '.dd-card{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:18px 20px;display:flex;flex-direction:column;gap:8px;transition:border-color .2s,transform .15s;animation:ddRiseIn .35s var(--ease-out) both;cursor:pointer}' +
      '.dd-card:nth-child(2){animation-delay:.05s}.dd-card:nth-child(3){animation-delay:.1s}.dd-card:nth-child(4){animation-delay:.15s}' +
      '.dd-card:nth-child(5){animation-delay:.2s}.dd-card:nth-child(6){animation-delay:.25s}.dd-card:nth-child(7){animation-delay:.3s}.dd-card:nth-child(8){animation-delay:.35s}' +
      '.dd-card:nth-child(9){animation-delay:.4s}.dd-card:nth-child(10){animation-delay:.45s}.dd-card:nth-child(11){animation-delay:.5s}' +
      '.dd-card:nth-child(12){animation-delay:.55s}' +
      '.dd-card:hover{border-color:var(--border2)}.dd-card:active{transform:translateY(0)}' +
      '@media (hover:hover) and (pointer:fine){.dd-card:hover{transform:translateY(-2px)}}' +
      '.dd-eyebrow{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase}' +
      '.dd-card h3{font-size:14px;font-weight:700;color:var(--text);letter-spacing:1px;font-family:Rajdhani,sans-serif}' +
      '.dd-card p{font-size:12px;color:var(--muted);line-height:1.6}' +
      '.dd-glance{font-size:11px;color:var(--muted)}' +
      '.dd-go{margin-top:auto;font-size:12px;font-weight:700;color:var(--gold);min-height:38px;display:inline-flex;align-items:center;gap:6px}' +
      '.dd-card:hover .dd-go{color:var(--gold2)}' +
      '#dd-needs{display:grid;grid-template-columns:1.4fr 1fr;gap:24px;padding:20px 0;border-top:1px solid var(--border);animation:ddRiseIn .35s var(--ease-out) both;animation-delay:.2s}' +
      '#dd-needs .dd-story h2{font-size:15px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text);margin-bottom:8px;font-family:Rajdhani,sans-serif}' +
      '#dd-needs .dd-story p{font-size:13px;color:var(--muted);line-height:1.65;max-width:56ch}' +
      '.dd-glancebox{background:var(--panel2);border:1px solid var(--border);border-radius:10px;padding:14px 16px}' +
      '.dd-glancebox .dd-gtitle{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px}' +
      '.dd-glancebox ul{margin:0;padding:0}' +
      '.dd-glancebox li{list-style:none;font-size:12px;font-weight:600;line-height:1.7;color:var(--text);cursor:pointer;min-height:30px;display:flex;align-items:center}' +
      '.dd-glancebox li::before{content:"\\2726";color:var(--gold);margin-right:8px}' +
      '.dd-glancebox li:hover{color:var(--gold2)}' +
      // Shared popup scaffolding (P2-P5): overlay + box use existing tokens
      // only; L3 overlay shadow is the single permitted shadow (DESIGN.md §6).
      '.dd-pop-box{box-shadow:0 12px 40px rgba(0,0,0,.5)}' +
      '.dd-pop-gtitle{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin:16px 0 8px 0}' +
      '.dd-pop-gtitle:first-child{margin-top:0}' +
      '.dd-pop-row{display:flex;align-items:center;gap:10px;min-height:40px;padding:9px 11px;margin-bottom:6px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:border-color .15s}' +
      '.dd-pop-row:hover{border-color:var(--border2)}' +
      '.dd-pop-row:hover .dd-pop-rtitle{color:var(--gold2)}' +
      '.dd-pop-rtitle{font-size:13px;font-weight:700;color:var(--text);line-height:1.3}' +
      '.dd-pop-rdesc{font-size:11px;color:var(--muted);line-height:1.4}' +
      '.dd-pop-sec .dd-pop-rtitle{font-size:12px;color:var(--muted);font-weight:600}' +
      // Aug 18 real restructure — collapsible <details> groups replace
      // the old flat 40-row popup (Alex's own "too clunky" ask), same
      // real precedent as manual.html's Aug 6 <details>-by-Domain fix.
      '.dd-pop-details{margin-bottom:10px;border:1px solid var(--border);border-radius:10px;background:var(--panel2);overflow:hidden}' +
      '.dd-pop-details .dd-pop-rows{padding:2px 12px 12px}' +
      '.dd-pop-summary{cursor:pointer;list-style:none;padding:12px 14px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text);display:flex;align-items:center;justify-content:space-between;gap:8px}' +
      '.dd-pop-summary::-webkit-details-marker{display:none}' +
      '.dd-pop-summary:hover{color:var(--gold2)}' +
      '.dd-pop-summary::after{content:"\\25B8";color:var(--muted);transition:transform .15s var(--ease-out);flex-shrink:0}' +
      '.dd-pop-details[open]>.dd-pop-summary::after{transform:rotate(90deg)}' +
      '.dd-pop-subdetails{margin:8px 0;border:1px solid var(--border);background:var(--panel3);border-radius:8px}' +
      '.dd-pop-subdetails .dd-pop-summary{font-size:10px;padding:9px 12px}' +
      '.dd-chip{display:inline-block;border-radius:10px;padding:2px 9px;font-size:11px;font-weight:700}' +
      '@media (max-width:600px){#dd-grid{grid-template-columns:1fr}#dd-needs{grid-template-columns:1fr}#dd-needs .dd-glancebox{order:-1}.dd-go{min-height:44px}.dd-pop-row{min-height:44px}#kg-grid{grid-template-columns:1fr !important}}' +
      '@media (prefers-reduced-motion:reduce){.dd-card,#dd-needs,.dd-ld-sec{animation:none !important}}';
    document.head.appendChild(st);
  },

  _inject: function() {
    // Aug 31 2026 (UI13) — cpl-widget is no longer ever relocated into a
    // dashDeck overlay popup (_openPipeline is now pure navigation, see its
    // own comment) — it's a PERMANENT resident of #page-content-pipeline
    // once visited. _stashWidget('cpl-widget') here would have wrongly
    // yanked it back out of that page (into the hidden holder) every time
    // the dashboard re-renders, since `w.closest('.dd-overlay')` correctly
    // returns null for a node sitting inside a `.page`, not a popup — the
    // non-force guard that protects kg-panel/mb-wrap (still popup-relocated,
    // untouched by this pass) doesn't apply here anymore. Real bug caught
    // and fixed before shipping, not left in. bookworm-widget is the exact
    // same real class of bug (UI12 stopped relocating it into a popup too)
    // — _stashBookworm() removed from both call sites in this function for
    // the identical reason.
    if (document.getElementById('dd-deck')) { RPGACE.modules.dashDeck._stashWidget('kg-panel'); RPGACE.modules.dashDeck._stashWidget('mb-wrap'); RPGACE.modules.dashDeck._refreshGlance(); return; }
    var page = document.getElementById('page-dashboard');
    if (!page) return;
    RPGACE.modules.dashDeck._injectStyles();
    var self = RPGACE.modules.dashDeck;

    var deck = document.createElement('div');
    deck.id = 'dd-deck';
    // Oct 10 2026 (N2 slice 5) — the card grid is gone: every card now
    // lives in the left nav (Alex: "deduplicated and sent into left nav
    // only"). The dashboard is a landing page instead — Today / Due /
    // Continue / Morning Brief + Ask Oracle, his own four sections. MODULES
    // stays as the card registry (_navOpenCard, _pageBack, NAV_DOMAINS).
    // Record: records/2026-10/dashboard_landing_leftnav_paranoia_debate_2026-10-10.txt
    deck.innerHTML =
      '<div class="dd-ld-hello"><h2 id="dd-ld-greet">Today</h2><p id="dd-ld-date"></p><div id="dd-ld-daybtn" style="margin-top:8px;"></div></div>' +
      '<div class="dd-ld-grid">' +
        '<section class="dd-ld-sec"><h3>📅 Today</h3><ul class="dd-ld-list" id="dd-ld-today"><li class="dd-ld-empty">Loading…</li></ul></section>' +
        '<section class="dd-ld-sec"><h3>⚑ Due · waiting on you</h3><ul class="dd-ld-list" id="dd-ld-due"><li class="dd-ld-empty">Loading…</li></ul></section>' +
        '<section class="dd-ld-sec"><h3>↩ Continue where you left off</h3><ul class="dd-ld-list" id="dd-ld-continue"><li class="dd-ld-empty">Loading…</li></ul></section>' +
        '<section class="dd-ld-sec"><h3>🌅 Morning Brief + Ask Oracle</h3>' +
          '<button type="button" class="dd-ld-brief" id="dd-ld-brief">🌅 Open today\'s Morning Brief</button>' +
          '<div class="dd-ld-ask"><textarea id="dd-ld-ask-input" rows="2" placeholder="Ask Oracle anything…"></textarea>' +
          '<button type="button" id="dd-ld-ask-btn">Ask</button></div>' +
        '</section>' +
      '</div>';
    deck.querySelector('#dd-ld-brief').onclick = function() { self._navOpenCard('morningBrief'); };
    var askIn = deck.querySelector('#dd-ld-ask-input');
    deck.querySelector('#dd-ld-ask-btn').onclick = function() { self._askOracle(askIn.value); };
    askIn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); self._askOracle(askIn.value); }
    });

    // The character HUD (.char-header) is GLOBAL - it sits above the page
    // divs in index.html (verified line 42), so it is already the hero on
    // every page. The deck therefore goes in as page-dashboard's FIRST
    // child: hero (global) → module grid → needs-you → existing widgets.
    page.insertBefore(deck, page.firstChild);

    self._stashWidget('kg-panel');
    self._stashWidget('mb-wrap'); // cpl-widget/bookworm-widget deliberately NOT here — see _inject's own comment above.
    self._refreshGlance();
  },

  // Oct 10 2026 (N2 slice 5) — fills the landing page. Name kept: three
  // other modules call _refreshGlance after a change. Reads only — no
  // Oracle call, so it still works when Oracle is down. Rows only appear
  // when there is something in them.
  _refreshGlance: function() {
    var self = RPGACE.modules.dashDeck;
    var P = (RPGACE.CONFIG && RPGACE.CONFIG.pages) || {};
    var today = self.logic._localDate(new Date());
    var greet = document.getElementById('dd-ld-greet');
    if (!greet) return;
    var hr = new Date().getHours();
    greet.textContent = hr < 12 ? 'Good morning' : (hr < 18 ? 'Good afternoon' : 'Good evening');
    try { document.getElementById('dd-ld-date').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) {}
    var go = function(page) { return function() { if (typeof showPage === 'function' && page) showPage(page); }; };
    var card = function(key) { return function() { self._navOpenCard(key); }; };
    var sb = RPGACE.sb && RPGACE.sb.select ? RPGACE.sb : null;
    // Boot can run this before config.init() sets RPGACE.sb — retry a few
    // times rather than show "All clear" for data that never loaded.
    if (!sb) {
      self._ldRetries = (self._ldRetries || 0) + 1;
      if (self._ldRetries <= 6) setTimeout(function() { self._refreshGlance(); }, 1500);
      return;
    }
    self._ldRetries = 0;
    // Day Bookends (Oct 27 2026): ☀️ I'm up / 🌙 Going to bed.
    var md = RPGACE.modules.myDay;
    if (md && md.ui.dayButton) md.ui.dayButton(document.getElementById('dd-ld-daybtn'));
    var safe = function(pr) { return pr ? pr.then(function(r) { return Array.isArray(r) ? r : []; }, function() { return null; }) : Promise.resolve(null); };

    // ── TODAY ──
    var todayRows = [];
    try {
      (typeof getShiftsForDate === 'function' ? getShiftsForDate(today) : []).forEach(function(sh) {
        todayRows.push({ icon: '🧑‍🍳', text: 'Shift ' + sh.start + '–' + sh.end, sub: sh.role || '', on: go(P.schedule) });
      });
    } catch (e) {}
    try {
      var sched = (RPGACE.DB && RPGACE.DB.get) ? RPGACE.DB.get('sched') : [];
      // Oct 16 2026 DN-1: a running Doing Now entry gets its own row (first), not a timed slot.
      var dnRun = RPGACE.modules.doingNow ? RPGACE.modules.doingNow.logic.running(sched || []) : [];
      dnRun.forEach(function(x) {
        todayRows.push({ icon: '▶', text: 'Doing: ' + x.title, sub: RPGACE.modules.doingNow.logic.fmt(RPGACE.modules.doingNow.logic.mins(x)), on: go(P.agenda) });
      });
      (sched || []).filter(function(x) { return x && x.date === today && !x.completed && x.source_type !== 'doing_now'; })
        .sort(function(x, y) { return (x.hour * 60 + x.minute) - (y.hour * 60 + y.minute); })
        .slice(0, 4).forEach(function(x) {
          todayRows.push({ icon: '🕒', text: x.title, sub: String(x.hour).padStart(2, '0') + ':' + String(x.minute || 0).padStart(2, '0'), on: go(P.schedule) });
        });
    } catch (e) {}
    var gym = RPGACE.modules.gymTracker, md = RPGACE.modules.myDay;
    Promise.all([
      safe(sb.select('planned_cooks', 'select=id,scheduled_at,status&status=eq.scheduled&scheduled_at=gte.' + today + 'T00:00:00&scheduled_at=lte.' + today + 'T23:59:59')),
      gym && gym.logic && gym.logic.load ? safe(gym.logic.load()) : Promise.resolve(null),
      md ? md.logic.load().catch(function() { return null; }) : Promise.resolve(null)
    ]).then(function(r) {
      // Oct 12 2026 — My Day routines left today (replaces the old quest count).
      if (r[2] && r[2].routines.length) {
        var open = md.logic.dueCount(r[2].routines, r[2].logs, md.logic.iso());
        todayRows.push({ icon: '☀️', text: open ? open + ' action' + (open === 1 ? '' : 's') + ' left today' : 'All actions done today', sub: 'My Day', on: go(P.agenda) });
      }
      (r[0] || []).forEach(function(c) {
        var t = c.scheduled_at ? new Date(c.scheduled_at) : null;
        todayRows.push({ icon: '🍳', text: 'Planned cook', sub: t ? t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '', on: card('cooking') });
      });
      if (r[1]) {
        var n = gym.logic.thisWeek(r[1]);
        var target = gym.WEEKLY_TARGET || 5;
        todayRows.push({ icon: '🏋️', text: 'Gym ' + n + '/' + target + ' this week', sub: n >= target ? 'Target hit' : (target - n) + ' to go', on: card('gym') });
      }
      self._ldFill('dd-ld-today', todayRows, 'Nothing scheduled today.');
    });

    // ── DUE / WAITING ON YOU ──
    var rc = RPGACE.modules.recall, wl = RPGACE.modules.shoppingWishlist;
    var since = new Date(Date.now() - 4 * 86400000).toISOString();
    Promise.all([
      safe(sb.select('taxonomy_proposals', 'status=eq.pending&select=id')),
      safe(sb.select('taxonomy_links', 'status=eq.pending&select=id')),
      safe(sb.select('jargon_encyclopedia', 'status=eq.pending&select=id')),
      rc && rc.logic && rc.logic.loadDue ? safe(rc.logic.loadDue()) : Promise.resolve(null),
      safe(sb.select('journal', 'select=id&entry_type=eq.decision&outcome=is.null&review_on=lte.' + today)),
      safe(sb.select('wishlist_items', 'select=id,name,created_at,status&status=neq.bought&created_at=gte.' + since)),
      safe(sb.select('intel_jobs', 'select=id&status=eq.queued')),
      // count is a number, not rows, so not through safe() (which maps non-arrays to []).
      RPGACE.modules.screenshotInbox ? RPGACE.modules.screenshotInbox.logic.count().catch(function() { return 0; }) : Promise.resolve(0),
      // Oct 12 2026 (MD2-2): the Fourth cloud import's last run.
      safe(sb.select('sync_status', 'select=ok,message,ran_at&key=eq.rota')),
      // Oct 12 2026 (MD2-5): from Saturday, nudge to plan next week.
      (function() {
        var mdL = RPGACE.modules.myDay && RPGACE.modules.myDay.logic;
        if (!mdL || mdL.dow(today) < 6) return Promise.resolve(null);
        var nws = mdL.addDays(mdL.weekStart(today), 7);
        return Promise.all([
          safe(sb.select('routines', 'select=id&active=eq.true&cadence=in.(weekly,times_per_week)')),
          safe(sb.select('routine_plans', 'select=id&plan_date=gte.' + nws + '&plan_date=lte.' + mdL.addDays(nws, 6)))
        ]).then(function(x) { return { routines: (x[0] || []).length, plans: (x[1] || []).length }; });
      })(),
      // Oct 12 2026 (Trips & Plans TP-1): people to reach out to / birthdays.
      RPGACE.modules.tripPlans ? RPGACE.modules.tripPlans.logic.read('people', 'select=id,name,last_spoke,reach_every_days,birthday').catch(function() { return []; }) : Promise.resolve([]),
      // Oct 13 2026 (XP-5): this week's picked challenges (private, after sign-in).
      (function() {
        var xs = RPGACE.modules.xpSeason, tp2 = RPGACE.modules.tripPlans;
        if (!xs || !tp2 || !tp2.logic.signedIn()) return Promise.resolve(null);
        return tp2.logic.read('xp_challenges', 'select=status&kind=eq.weekly&status=in.(active,done)&period_start=eq.' + xs.logic.weekStart(today)).catch(function() { return null; });
      })(),
      // XP-8: Wrapped ready, new-year resolutions, year report check.
      RPGACE.modules.xpSeason ? RPGACE.modules.xpSeason.logic.yearDue(today) : Promise.resolve([]),
      // DT-2 (Oct 14 2026): from 18:00 (after a closing shift: just after midnight), is the next day planned?
      (function() {
        var mdL = RPGACE.modules.myDay && RPGACE.modules.myDay.logic, tgt = mdL ? mdL.nightBeforeTarget(new Date()) : null;
        return tgt ? mdL.nightBeforeStatus(tgt).catch(function() { return null; }) : Promise.resolve(null);
      })(),
      // MD2-9 (Oct 14 2026): Sunday-evening weekly review not written yet.
      (function() {
        var mdL = RPGACE.modules.myDay && RPGACE.modules.myDay.logic, ws = mdL ? mdL.reviewTarget(new Date()) : null;
        return ws ? mdL.reviewDone(ws).then(function(done) { return done ? null : ws; }).catch(function() { return null; }) : Promise.resolve(null);
      })(),
      // TP-6/TP-7 (Oct 14 2026): book-by deadlines, after-trip logs, people to sort a trip with.
      (function() {
        var tp3 = RPGACE.modules.tripPlans;
        if (!tp3 || !tp3.logic.signedIn()) return Promise.resolve(null);
        return Promise.all([
          tp3.logic.read('plans', 'select=id,title,status,start_date,end_date,people,details,created_at&status=in.(planning,booked,done)&limit=100'),
          tp3.logic.read('plan_tasks', 'select=id,plan_id,title,kind,due_by,done&done=eq.false&due_by=not.is.null&limit=500')
        ]).then(function(x) { return { plans: x[0], tasks: x[1] }; }).catch(function() { return null; });
      })(),
      // PC-5 (Oct 17 2026): posting target behind, stale planned / ready posts.
      (function() {
        var ph = RPGACE.modules.postingHub, tp4 = RPGACE.modules.tripPlans;
        if (!ph || !tp4 || !tp4.logic.signedIn()) return Promise.resolve([]);
        return ph.logic.loadDue(today).catch(function() { return []; });
      })(),
      // SH-3 (Oct 17 2026): follow-ups due (one row for the whole sweep).
      (function() {
        var sh = RPGACE.modules.sellingHub, tp5 = RPGACE.modules.tripPlans;
        if (!sh || !tp5 || !tp5.logic.signedIn()) return Promise.resolve([]);
        return sh.logic.loadDue().catch(function() { return []; });
      })()
    ]).then(function(r) {
      var due = [];
      var tax = (r[0] ? r[0].length : 0) + (r[1] ? r[1].length : 0);
      if (r[0]) self._pendingReviewCount = tax;
      if (tax) due.push({ icon: '🌳', text: 'Review ' + tax + ' taxonomy item' + (tax === 1 ? '' : 's'), sub: 'Placements waiting for your judgement',
        on: function() { var rq = RPGACE.modules.taxonomyReviewQueue; if (rq && rq._openCard) rq._openCard(); else self._navOpenCard('taxonomy'); } });
      var jar = r[2] ? r[2].length : 0;
      if (jar) due.push({ icon: '📖', text: 'Review ' + Math.min(10, jar) + ' jargon term' + (jar === 1 ? '' : 's'), sub: jar + ' waiting — a few a day', on: go(P.jargonEncyclopedia) });
      var rec = r[3] ? r[3].length : 0;
      if (rec) due.push({ icon: '🧠', text: rec + ' saved idea' + (rec === 1 ? '' : 's') + ' to recall', sub: 'In your Morning Brief', on: card('morningBrief') });
      var dec = r[4] ? r[4].length : 0;
      if (dec) due.push({ icon: '⚖', text: dec + ' decision' + (dec === 1 ? '' : 's') + ' to review', sub: 'How did it turn out?', on: go(P.journal) });
      (r[5] || []).forEach(function(it) {
        var c = wl && wl.logic && wl.logic._coolOff ? wl.logic._coolOff(it) : { active: true };
        if (!c.active) due.push({ icon: '🛒', text: it.name + ' — cool-off over', sub: 'Still want it? Buy or drop', on: card('wishlist') });
      });
      var q = r[6] ? r[6].length : 0;
      if (q) due.push({ icon: '🔗', text: q + ' shared link' + (q === 1 ? '' : 's') + ' queued', sub: 'Analysed when the local server runs on your PC', on: null });
      var shots = r[7] || 0;
      if (shots) due.push({ icon: '📸', text: shots + ' screenshot' + (shots === 1 ? '' : 's') + ' to sort', sub: 'Choose where each one goes', on: card('screenshots') });
      var rota = r[8] && r[8][0];
      if (rota) {
        var rotaAge = (Date.now() - Date.parse(rota.ran_at)) / 864e5;
        if (!rota.ok) due.push({ icon: '🧑‍🍳', text: 'Rota import needs you', sub: (rota.message || 'Fourth import failed') + ' — send a rota screenshot to Oracle', on: go(P.schedule) });
        else if (rotaAge > 9) due.push({ icon: '🧑‍🍳', text: 'Rota not updated for ' + Math.floor(rotaAge) + ' days', sub: 'The Monday Fourth import hasn\'t run — check GitHub Actions', on: go(P.schedule) });
      }
      var tp = RPGACE.modules.tripPlans;
      if (tp && r[10] && r[10].length) tp.logic.peopleDue(r[10], today).slice(0, 4).forEach(function(x) {
        due.push({ icon: x.kind === 'birthday' ? '🎂' : '📞', text: x.text, sub: x.kind === 'birthday' ? 'Birthday' : 'People', on: card('plans') });
      });
      if (tp && r[15]) tp.logic.tripDue(r[15].plans, r[15].tasks, r[10] || [], today).forEach(function(x) {
        due.push({ icon: x.icon, text: x.text, sub: x.sub, hot: !!x.hot, on: function() { tp.ui.open('plans', { planId: x.plan.id }); } });
      });
      (r[16] || []).forEach(function(x) {
        var ph2 = RPGACE.modules.postingHub;
        due.push({ icon: x.icon, text: x.text, sub: x.sub, hot: !!x.hot, on: function() {
          if (x.kind === 'ready') ph2.ui.openPost(x.post.id);
          else if (x.kind === 'planned') { ph2.open(); ph2.ui.act(x.post); }
          else ph2.open();
        } });
      });
      (r[17] || []).forEach(function(x) {
        due.push({ icon: x.icon, text: x.text, sub: x.sub, hot: !!x.hot, on: function() { if (x.go) { x.go(); return; } var sh2 = RPGACE.modules.sellingHub; sh2.open(); if (x.icon === '🔁') sh2.ui.openSweep(); } });
      });
      // XP-5: nudge only, never auto-picked (Alex: "Nudge, no auto-pick").
      if (Array.isArray(r[11]) && r[11].length < 3) due.push({ icon: '🎯', text: r[11].length ? 'Pick ' + (3 - r[11].length) + ' more challenge' + (r[11].length === 2 ? '' : 's') : 'Pick this week\'s 3 challenges',
        sub: '+75 XP each, counted automatically', on: function() { var xs = RPGACE.modules.xpSeason; if (xs) xs.openChallengePicker(); } });
      (r[12] || []).forEach(function(x) {
        var xs8 = RPGACE.modules.xpSeason;
        due.push({ icon: x.icon, text: x.text, sub: x.sub, on: x.kind === 'wrapped' ? function() { xs8.ui.openWrappedReport(x.id); } : x.kind === 'resolutions' ? function() { xs8.openSeason(); } : null });
      });
      if (r[13]) due.unshift(RPGACE.modules.myDay.logic.nightBeforeRow(r[13], today));
      if (r[14]) due.push({ icon: '📓', text: 'Weekly review', sub: '2 minutes: what went well, what slipped', on: function() {
        go(P.agenda)();
        var m = RPGACE.modules.myDay;
        if (m) m.logic.load().then(function() { m.ui.openReview(r[14]); }).catch(function(e) { RPGACE.utils.toast('⚠️ My Day could not load: ' + (e.message || e), '#CC4A4A', 3500, 'myDay'); });
      } });
      if (r[9] && r[9].routines && !r[9].plans) due.push({ icon: '📅', text: 'Plan next week', sub: 'Pick the days for your weekly actions', on: function() {
        go(P.agenda)(); setTimeout(function() { var m = RPGACE.modules.myDay; if (m) m.ui.openWeekPlanner(1); }, 400); } });
      // Realm Tasks: a block running -> back to Live now; new tasks to keep or drop.
      var rtm = RPGACE.modules.realmTasks;
      if (rtm) {
        var lb = rtm.logic.liveBlock();
        if (lb) due.unshift({ icon: '▶', text: 'Live now: ' + rtm.ui._realm(lb.run.realm).name + ' block', sub: 'Pick a type of work, do its tasks', hot: true, on: function() { rtm.ui.openLive(); } });
        var nIn = rtm.logic.inbox().length;
        if (nIn) due.push({ icon: '📥', text: nIn + ' new task' + (nIn === 1 ? '' : 's') + ' to keep or drop', sub: 'From videos, journal, Library and Oracle', on: function() { rtm.ui.openInbox(); } });
      }
      self._ldFill('dd-ld-due', due, 'All clear — nothing is waiting on you.');
    });

    // ── CONTINUE WHERE YOU LEFT OFF ──
    var cont = [];
    var seen = {};
    self.logic._trailRead().forEach(function(t) {
      var id = t.kind + ':' + t.key;
      if (seen[id] || cont.length >= 3) return;
      seen[id] = 1;
      cont.push({ icon: t.icon || '↩', text: t.label, sub: self.logic._ago(t.at), on: t.kind === 'card' ? card(t.key) : go(t.key) });
    });
    Promise.all([
      safe(sb.select('bookworm_books', 'status=eq.in_progress&select=id,title&order=created_at.desc&limit=2')),
      safe(sb.select('recipes', 'select=id,title,created_at&order=created_at.desc&limit=1')),
      safe(sb.select('content_productions', 'select=id,title,updated_at&order=updated_at.desc.nullslast&limit=1'))
    ]).then(function(r) {
      (r[0] || []).forEach(function(b) {
        cont.push({ icon: '🐛', text: 'Keep reading: ' + b.title, sub: 'Bookworm', on: function() { var bw = RPGACE.modules.bookworm; if (bw && bw._openBook) bw._openBook(b.id); } });
      });
      (r[1] || []).forEach(function(rcp) {
        cont.push({ icon: '🍽', text: rcp.title, sub: 'Latest recipe', on: function() {
          var co = RPGACE.modules.cookingOracle;
          if (!co || !co.logic || !co.logic._loadSavedRecipe) { self._navOpenCard('cooking'); return; }
          co.logic._loadSavedRecipe(rcp.id, function(err, recipe) {
            if (err) { RPGACE.utils.toast('⚠️ ' + err, '#CC4A4A', 3000); return; }
            co.ui._showRecipeCard(recipe, null, rcp.id);
          });
        } });
      });
      (r[2] || []).forEach(function(cp) {
        cont.push({ icon: '🎬', text: cp.title || 'Latest production', sub: 'Content Pipeline' + (cp.updated_at ? ' · ' + self.logic._ago(Date.parse(cp.updated_at)) : ''), on: go(P.contentPipeline) });
      });
      self._ldFill('dd-ld-continue', cont, 'Nothing to pick up yet — open something from the menu.');
      // UI Debloat: the section hides itself when there's nothing to continue.
      var contSec = document.getElementById('dd-ld-continue'); if (contSec && contSec.closest('section')) contSec.closest('section').style.display = cont.length ? '' : 'none';
    });
  },

  // One landing list: rows are buttons (44px tap targets); a row with no
  // action renders as plain text.
  _ldFill: function(id, rows, emptyText) {
    var ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = '';
    if (!rows.length) {
      var e = document.createElement('li');
      e.className = 'dd-ld-empty';
      e.textContent = emptyText;
      ul.appendChild(e);
      return;
    }
    rows.forEach(function(row) {
      var li = document.createElement('li');
      var el = document.createElement(row.on ? 'button' : 'div');
      el.className = 'dd-ld-row' + (row.hot ? ' dd-ld-hot' : '');
      if (row.on) { el.type = 'button'; el.onclick = row.on; }
      var ic = document.createElement('span');
      ic.className = 'dd-ld-ic';
      ic.textContent = row.icon;
      var body = document.createElement('span');
      body.className = 'dd-ld-body';
      var t = document.createElement('span');
      t.className = 'dd-ld-t';
      t.textContent = row.text;
      body.appendChild(t);
      if (row.sub) {
        var sbt = document.createElement('span');
        sbt.className = 'dd-ld-s';
        sbt.textContent = row.sub;
        body.appendChild(sbt);
      }
      el.appendChild(ic); el.appendChild(body);
      li.appendChild(el);
      ul.appendChild(li);
    });
  },

  // Ask Oracle from the landing page: the real chat input + sendChat on the
  // Oracle page — no second chat mechanism.
  _askOracle: function(text) {
    text = (text || '').trim();
    if (!text) return;
    var P = (RPGACE.CONFIG && RPGACE.CONFIG.pages) || {};
    if (typeof showPage === 'function') showPage(P.oracle);
    var inp = document.getElementById('chat-input');
    var landing = document.getElementById('dd-ld-ask-input');
    if (landing) landing.value = '';
    if (!inp || typeof sendChat !== 'function') return;
    inp.value = text;
    sendChat();
  },

  // ── Shared popup scaffolding (P2-P5). Overlay appended to document.body
  // ── per the standing landmine rule; box uses existing tokens only. Copies
  // ── the bookworm _renderChapterList overlay pattern, DESIGN.md-skinned.
  // ── close() runs opts.onClose BEFORE removing the overlay so a relocated
  // ── live node (the bookworm widget) can be moved out first, never destroyed.
  _popup: function(opts) {
    opts = opts || {};
    var overlay = document.createElement('div');
    overlay.className = 'dd-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,' + (opts.dim || '0.94') + ');z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;' + (opts.scroll ? 'overflow-y:auto;' : '');
    var box = document.createElement('div');
    box.className = 'dd-pop-box';
    // borderColor (July 30, popup-scaffolding consolidation): lets a
    // migrated per-module popup keep its own domain accent (purple for
    // Visual/Insta-Oracle, blue for Prod Oracle, etc.) instead of every
    // popup in the app flattening to one generic border the moment it
    // routes through this shared helper - the real reason this option
    // didn't exist until now is that all 11 original callers were
    // already fine with the plain default.
    box.style.cssText = 'position:relative;background:' + (opts.bg || 'var(--panel)') + ';border:1px solid ' + (opts.borderColor || 'var(--border)') + ';border-radius:12px;padding:24px 28px;width:min(' + (opts.width || '600px') + ',95vw);max-height:88vh;overflow-y:auto;font-family:Rajdhani,sans-serif;';
    // Oct 10 2026 (N1) — shared navigation for every popup: a history entry
    // (so phone Back closes this popup first) and a sticky header with
    // ← Back, "Domain › Card" and the other cards in the same domain.
    var dd = RPGACE.modules.dashDeck;
    var navEntry = { overlay: overlay, card: dd._navCurrentCard(), close: null, pushed: false };
    if (!opts.noNav) {
      var nav = document.createElement('div');
      nav.className = 'dd-pop-nav';
      nav.style.cssText = 'position:sticky;top:-24px;z-index:2;margin:-24px -28px 14px;padding:10px 28px;background:' + (opts.bg || 'var(--panel)') + ';border-bottom:1px solid var(--border);display:flex;flex-wrap:wrap;align-items:center;gap:8px;';
      var backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.textContent = '← Back';
      backBtn.setAttribute('aria-label', 'Back');
      backBtn.style.cssText = 'min-height:40px;padding:8px 14px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:14px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      backBtn.onclick = function() { close(); };
      nav.appendChild(backBtn);
      var cardMeta = navEntry.card ? dd._navCard(navEntry.card) : null;
      if (cardMeta) {
        var domain = dd.NAV_DOMAINS[cardMeta.key] || '';
        var crumb = document.createElement('span');
        crumb.style.cssText = 'font-size:13px;color:var(--muted);flex:1;min-width:120px;';
        crumb.textContent = (domain && domain !== cardMeta.name ? domain + ' › ' : '') + cardMeta.name;
        nav.appendChild(crumb);
        // Sibling cards only on the first popup of a stack, so nested
        // popups stay focused on their own task.
        // SL-0 (Oct 21 2026): the sibling-card chips moved into ☰ (Alex:
        // "Move into ☰"); the first popup of a card gets the area's list.
        var areaKey = domain && RPGACE.areaForLabel(domain);
        if (!dd._navStack.length && areaKey && RPGACE.sideList) {
          var cardKey = cardMeta.key;
          RPGACE.sideList.wire(overlay, nav, function() { return RPGACE.sideList.optsFor(areaKey, overlay, { card: cardKey }); });
        }
      }
      box.appendChild(nav);
      // Oct 13 2026 (XP-2): that domain's realm(s), this week vs usual.
      if (cardMeta && !dd._navStack.length && RPGACE.modules.xpSeason) {
        var xpStrip = RPGACE.modules.xpSeason.ui.popupStrip(cardMeta.key);
        if (xpStrip) box.appendChild(xpStrip);
      }
    }
    if (opts.eyebrow) {
      var eb = document.createElement('div');
      eb.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;color:' + (opts.accent || 'var(--gold)') + ';';
      eb.textContent = opts.eyebrow;
      box.appendChild(eb);
    }
    if (opts.title) {
      var ti = document.createElement('div');
      ti.style.cssText = 'font-size:15px;font-weight:700;color:var(--text);letter-spacing:1px;margin-bottom:14px;';
      ti.textContent = opts.title;
      box.appendChild(ti);
    }
    var body = document.createElement('div');
    box.appendChild(body);
    // keepHistory === true means the history entry is already gone (phone
    // Back) or is deliberately kept (switching to a sibling card).
    var close = function(keepHistory) {
      if (opts.onClose) { try { opts.onClose(); } catch (e) {} }
      overlay.remove();
      dd._navClosed(navEntry, keepHistory === true);
    };
    navEntry.close = close;
    // noDefaultClose (popup-scaffolding consolidation, July 30): several
    // migrated call sites already build their own close/cancel/submit
    // button(s) deep inside a multi-step flow - without this, they'd get
    // a second, redundant "Close" button for free, a real visible
    // regression this option exists specifically to avoid.
    if (!opts.noDefaultClose) {
      var closeBtn = document.createElement('button');
      closeBtn.textContent = opts.closeLabel || 'Close';
      closeBtn.style.cssText = 'display:block;width:100%;margin-top:16px;padding:11px;min-height:40px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--muted);font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      // Oct 15 2026 (Alex): Close takes you to the dashboard, not back to the
      // last page you were on. ← Back still steps back through popups.
      closeBtn.onclick = function() {
        close();
        var P = RPGACE.CONFIG && RPGACE.CONFIG.pages;
        if (!dd._navStack.length && P && P.dashboard && typeof showPage === 'function') {
          var cur = document.querySelector('.page.active');
          if (!cur || cur.id !== 'page-' + P.dashboard) showPage(P.dashboard);
        }
      };
      box.appendChild(closeBtn);
    }
    overlay.onclick = function(e) { if (e.target === overlay) close(); };
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    dd._navPush(navEntry);
    return { overlay: overlay, box: body, close: close };
  },

  // ── P3 Bookworm relocation. The live #bookworm-widget node is MOVED
  // ── (never cloned/rebuilt) between an open popup and a hidden holder so
  // ── getElementById('bookworm-widget') always succeeds (the bookworm
  // ── module no-ops its re-inject when the node exists) and all its
  // ── listeners + refresh cycle keep working.
  _ensureHolder: function() {
    var holder = document.getElementById('dd-bw-holder');
    if (!holder) {
      var page = document.getElementById('page-dashboard');
      if (!page) return null;
      holder = document.createElement('div');
      holder.id = 'dd-bw-holder';
      holder.style.display = 'none';
      page.appendChild(holder);
    }
    return holder;
  },

  // force=true skips the open-popup guard - used ONLY by the popup's own
  // onClose. Review finding (Sonnet, commit 3ee8f7c): at the moment
  // onClose fires the widget is still inside the CLOSING overlay, so the
  // ".dd-overlay" guard (correct for the periodic sweep, which must never
  // yank the widget out of a popup the user is actively using) wrongly
  // blocked the rescue too - overlay.remove() then destroyed the live
  // widget, and the next dashboard visit rebuilt it from scratch, losing
  // in-flight UI state. The guard can't tell "open" from "closing", so
  // the close path passes force=true.
  _stashBookworm: function(force) {
    var w = document.getElementById('bookworm-widget');
    if (!w) return;
    var holder = RPGACE.modules.dashDeck._ensureHolder();
    if (!holder) return;
    if (w.parentNode === holder) return;                         // already stashed
    if (!force && w.closest && w.closest('.dd-overlay')) return; // inside an open popup — leave it
    holder.appendChild(w);
  },

  _ensureStash: function() {
    var holder = document.getElementById('dd-stash-holder');
    if (!holder) {
      var page = document.getElementById('page-dashboard');
      if (!page) return null;
      holder = document.createElement('div');
      holder.id = 'dd-stash-holder';
      holder.style.display = 'none';
      page.appendChild(holder);
    }
    return holder;
  },

  // force=true skips the open-popup guard — used ONLY by a popup's own
  // onClose, where the widget is still inside the CLOSING overlay so the
  // .dd-overlay guard would otherwise wrongly block the rescue and
  // overlay.remove() would destroy the live node. Same reasoning as
  // _stashBookworm's force param (review finding, commit 3ee8f7c).
  _stashWidget: function(id, force) {
    var w = document.getElementById(id);
    if (!w) return;
    var holder = RPGACE.modules.dashDeck._ensureStash();
    if (!holder) return;
    if (w.parentNode === holder) return;                         // already stashed
    if (!force && w.closest && w.closest('.dd-overlay')) return; // inside an open popup — leave it
    holder.appendChild(w);
  },

  // ── Rebuilt Aug 31 2026 (UI12) — this used to embed the live bookworm-
  // widget node inline (relocate-into-popup, same as _openPanelPopup) PLUS
  // offer jump buttons to sub-panels — two different jobs on one popup.
  // Now it's PURE NAVIGATION: every destination is a real routable page
  // (UI11, dashDeck._openPage/PAGE_PANELS), never content embedded here.
  // Real Open+Resume discipline, per Alex's own confirmed ask: "Resume"
  // only ever appears when a real Supabase row backs it (never fabricated)
  // — Bookworm is the one destination here with a genuine "specific record
  // to jump back into" concept (bookworm._openBook(id), pre-existing),
  // so it's the only one that gets a real Resume button.
  _openBookworm: function() {
    var self = RPGACE.modules.dashDeck;
    var pop = self._popup({
      eyebrow: '📖 Bookworm',
      title: 'Choose where to go',
      accent: 'var(--purple)',
      width: '480px',
      closeLabel: 'Close'
    });
    var BTN = 'display:block;width:100%;margin-top:8px;padding:11px;min-height:44px;background:rgba(155,89,182,0.15);border:1px solid var(--purple);border-radius:8px;color:var(--purple);font-size:13px;font-weight:700;letter-spacing:1px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    var RESUME_BTN = 'display:block;width:100%;margin-top:6px;padding:11px;min-height:44px;background:rgba(226,168,61,.12);border:1px solid rgba(226,168,61,.45);border-radius:8px;color:#E2A83D;font-size:13px;font-weight:700;letter-spacing:1px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    var HD = 'margin-top:14px;margin-bottom:2px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);font-family:Rajdhani,sans-serif;';

    // KN-4: the Knowledge ← Back / 🏠 row (was the LL-7 header). The popup
    // closes first so the screen it opens is not left underneath it.
    if (RPGACE.areaNav) {
      RPGACE.areaNav.visit('knowledge', { key: 'study', label: 'Study', open: function() { self._openBookworm(); } });
      var kbar = RPGACE.areaNav.bar('knowledge');
      kbar.addEventListener('click', function(ev) { if (ev.target.closest('button')) pop.close(); }, true);
      pop.box.appendChild(kbar);
    }
    var openBookwormBtn = document.createElement('button');
    openBookwormBtn.textContent = '📖 Open Bookworm';
    openBookwormBtn.style.cssText = BTN;
    openBookwormBtn.onclick = function() { pop.close(); self._openPage('bookworm-widget'); };
    pop.box.appendChild(openBookwormBtn);

    // Real, live-queried Resume — a real in-progress book, most recently
    // started, or nothing rendered at all (never a fabricated placeholder).
    RPGACE.sb.select('bookworm_books', 'status=eq.in_progress&order=created_at.desc&limit=1&select=id,title,current_chapter_index')
      .then(function(rows) {
        var row = rows && rows[0];
        if (!row) return;
        var rbtn = document.createElement('button');
        rbtn.textContent = '▶ Resume: "' + row.title + '" (ch. ' + ((row.current_chapter_index || 0) + 1) + ')';
        rbtn.style.cssText = RESUME_BTN;
        rbtn.onclick = function() {
          pop.close();
          self._openPage('bookworm-widget', { after: function() {
            var bw = RPGACE.modules.bookworm;
            if (bw && bw._openBook) bw._openBook(row.id);
          }});
        };
        openBookwormBtn.insertAdjacentElement('afterend', rbtn);
      })
      .catch(function(e) { console.warn('[dashDeck] bookworm resume check:', e.message); });

    // Aug 15 2026 (A5 Phase 1) / Aug 22 2026 (W2/W3/W4, Worm Family Phase 1)
    // — real worm identities: Videoworm (was File Analyzer — analyses VIDEO
    // content only), MusicWorm (was Corpus, honestly labelled — real audio-
    // listening/insight extraction not built), Bibliography (not a worm,
    // own heading). Articleworm deliberately absent — no real existing
    // panel maps to it. Aug 31 2026 (UI11/UI12) — each now navigates to its
    // own real page via _openPage (PAGE_PANELS carries the real ensure-fn
    // for each, no need to repeat it here).
    var bookwormJumpBtns = [
      { heading: 'Choose a worm:',   label: '🐛 Open Videoworm',         panelId: 'file-analyzer-panel' },
      {                               label: '🐛 Videoworm: Find Videos', panelId: 'video-finder-panel' },
      {                               label: '🎼 Open MusicWorm',        panelId: 'ref-corpus-panel',
                                       note: 'Reference-track library. Insight extraction not yet built.' },
      // Oct 13 2026 (LL-2): the bibliography became the Life Library - books
      // you study here are Library items (kind 'book'). The old finished-
      // books/saved-links page stays reachable, read-only history.
      { heading: 'Reference shelf:', label: '📚 Your books (Life Library)', run: function() { var m = RPGACE.modules.lifeLibrary; if (m) m.open({ filter: { kind: 'book' } }); } },
      {                               label: '🗄 Old bibliography (before Oct 13)', panelId: 'bookworm-bibliography' }
    ];
    bookwormJumpBtns.forEach(function(jb) {
      if (jb.heading) {
        var hd = document.createElement('div');
        hd.textContent = jb.heading;
        hd.style.cssText = HD;
        pop.box.appendChild(hd);
      }
      var btn = document.createElement('button');
      btn.textContent = jb.label;
      btn.style.cssText = BTN;
      btn.onclick = function() { pop.close(); if (jb.run) jb.run(); else self._openPage(jb.panelId); };
      pop.box.appendChild(btn);
      if (jb.note) {
        var nt = document.createElement('div');
        nt.textContent = jb.note;
        nt.style.cssText = 'margin-top:4px;font-size:11px;color:var(--muted);line-height:1.5;font-family:Rajdhani,sans-serif;';
        pop.box.appendChild(nt);
      }
    });
  },

  // Sep 26 2026 — real Alex ask ("make jargon encyclopedia the same as
  // videoworm is for bookworm"), byte-for-byte the same shape as
  // _openBookworm above: a real "choose where to go" picker, real
  // live-queried pending count where one exists (never fabricated), plain
  // showPage navigation for the two real routable destinations.
  _openTaxonomy: function() {
    var self = RPGACE.modules.dashDeck;
    var pop = self._popup({
      eyebrow: '🌳 Taxonomy',
      title: 'Choose where to go',
      accent: 'var(--green)',
      width: '480px',
      closeLabel: 'Close'
    });
    var BTN = 'display:block;width:100%;margin-top:8px;padding:11px;min-height:44px;background:rgba(76,175,130,0.15);border:1px solid var(--green);border-radius:8px;color:var(--green);font-size:13px;font-weight:700;letter-spacing:1px;cursor:pointer;font-family:Rajdhani,sans-serif;';
    var HD = 'margin-top:14px;margin-bottom:2px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);font-family:Rajdhani,sans-serif;';

    var reviewBtn = document.createElement('button');
    reviewBtn.textContent = '🌳 Review Pending Placements';
    reviewBtn.style.cssText = BTN;
    reviewBtn.onclick = function() {
      pop.close();
      var rq = RPGACE.modules.taxonomyReviewQueue;
      if (rq && rq._openCard) rq._openCard();
    };
    pop.box.appendChild(reviewBtn);

    // Real, live-queried pending count — same field _refreshGlance already
    // sets, never a second fetch (rule 8).
    if (self._pendingReviewCount != null) {
      var note = document.createElement('div');
      note.textContent = self._pendingReviewCount + ' pending placement' + (self._pendingReviewCount === 1 ? '' : 's');
      note.style.cssText = 'margin-top:4px;font-size:11px;color:var(--muted);line-height:1.5;font-family:Rajdhani,sans-serif;';
      pop.box.appendChild(note);
    }

    var hd = document.createElement('div');
    hd.textContent = 'Browse:';
    hd.style.cssText = HD;
    pop.box.appendChild(hd);

    var treeBtn = document.createElement('button');
    treeBtn.textContent = '🧬 Browse Phylum Path';
    treeBtn.style.cssText = BTN;
    treeBtn.onclick = function() { pop.close(); if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.phylumPath); };
    pop.box.appendChild(treeBtn);

    var jargonBtn = document.createElement('button');
    jargonBtn.textContent = '📖 Open Jargon Encyclopedia';
    jargonBtn.style.cssText = BTN;
    jargonBtn.onclick = function() { pop.close(); if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.jargonEncyclopedia); };
    pop.box.appendChild(jargonBtn);
  },

  // ── Research Lab card popup (July 23) — Alex's explicit ask: instead of
  // ── jumping straight into the page, the card opens a scrollable list of
  // ── its 7 sub-navs as their own cards (same request as this project's
  // ── established card->popup->list pattern, e.g. _openOversight just
  // ── above). Reuses researchTabs.TABS as the single source of truth (so
  // ── this list and the in-page tab bar can never drift apart) and the
  // ── same .dd-pop-row/.dd-pop-rtitle/.dd-pop-rdesc styling _openOversight
  // ── already established, rather than a third one-off list layout.
  // ── Clicking a sub-card closes this popup and calls researchTabs.show(key)
  // ── - real single-tab lazy loading (see researchTabs' own July 23 note)
  // ── means only that one tab's widget actually loads, not all 7 at once.
  _openResearch: function() {
    var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '🧠 Research Lab', title: 'Pick a sub-nav', accent: 'var(--purple)', width: '520px' });
    var body = pop.box;
    var rt = RPGACE.modules.researchTabs;
    var tabs = (rt && rt.TABS) ? rt.TABS : [];
    tabs.forEach(function(t) {
      var row = document.createElement('div');
      row.className = 'dd-pop-row';
      var tw = document.createElement('div');
      tw.style.cssText = 'flex:1;min-width:0';
      var ti = document.createElement('div');
      ti.className = 'dd-pop-rtitle';
      ti.textContent = t.label;
      var ds = document.createElement('div');
      ds.className = 'dd-pop-rdesc';
      ds.textContent = t.desc || '';
      tw.appendChild(ti); tw.appendChild(ds);
      row.appendChild(tw);
      row.onclick = function() {
        pop.close();
        if (rt && rt.show) rt.show(t.key);
      };
      body.appendChild(row);
    });
  },

  // ── P2 Oversight popup: the seven primary living docs + working specs,
  // ── each opening in a new tab (same-origin relative URL).
  _openOversight: function() {
    // Aug 11 real restructure (A17, /CEO Loop 2): the flat "seven docs"
    // list is now a real 2-tier + 4-layer system (see CLAUDE.md's own
    // Oversight section) - smoke_test.html is the genuinely new 8th doc,
    // added here for the first time (it existed as a file with zero
    // in-app link until this fix, a real reachability bug Alex caught).
    var pop = RPGACE.modules.dashDeck._popup({ eyebrow: '📚 Oversight', title: 'Explaining docs, truth docs, and 3 new layers', accent: 'var(--blue)', width: '620px' });
    var body = pop.box;
    // July 31 real fix: this list had already unilaterally declared
    // taxonomy_placement_rules.txt "The 7th doc" with no matching entry
    // ever added to CLAUDE.md's own "SIX docs" section - real doc/code
    // drift, found while adding the actual 7th living doc
    // (ai_tooling_and_rules_map.md). Placement Rules moved to Working
    // specs where it honestly belongs (a narrow ruleset, not a full
    // dated/updated living doc like the other seven).
    var primary = [
      { icon: '📓', title: 'Patch Notes', desc: 'Tier (a) — Build history', href: '/patch_notes.html' },
      { icon: '🐂', title: 'Minotaur Map', desc: 'Tier (a) — Consumer-facing domains, functions, worked examples', href: '/minotaur_map.html' },
      { icon: '🔗', title: 'Interconnection Map', desc: 'Tier (b) — Module touchpoints, the truth', href: '/interconnection_map.md' },
      { icon: '🗺️', title: 'System Flow Map', desc: 'Tier (b) — Pipeline flow diagrams, the truth', href: '/system_flow_map.md' },
      { icon: '🤖', title: 'AI Tooling & Rules Map', desc: 'Tier (b) — Skills + rule files + external AI providers', href: '/ai_tooling_and_rules_map.md' },
      { icon: '🔭', title: 'Perspective Truth Map (live)', desc: 'Tier (b), 4th doc, new Sep 15 — every real element vs. every other, queried live from perspective_reports', href: '/perspective_map.html' },
      { icon: '🌳', title: 'Taxonomy Map (live)', desc: 'Queries the tree on every load — outside the tier system by design', href: '/taxonomy_map.html' },
      { icon: '🧪', title: 'Smoke Test', desc: 'Layer (d) — real, hand-tickable, what actually works right now', href: '/smoke_test.html' },
      { icon: '🩹', title: 'Error Log', desc: 'Layer (d), 2nd doc — every real error Total systems has seen, deduplicated, backtracked, fix history kept', href: '/error_log.html' },
      { icon: '🔮', title: 'Future Integrations', desc: 'The mirror image of the tier docs — ideas/planned/mid-build, never green', href: '/future_integrations.html' },
      { icon: '🟤', title: 'Achiever (Archive)', desc: 'Layer (e), past-tense half, new Aug 20/21 — the mirror image of Future Integrations: real facts/counts/rules that WERE true and a later real change made false (/colourgradient brown), distinct from Error Log\'s broken-code purple', href: '/achiever.html' },
      { icon: '🧭', title: 'Session Lessons & Rules Log', desc: 'New Aug 15 — real /misunderstanding, /drift, and obstacle-to-solution episodes per session, hand-authored via /Bedtime, feeding Alex + Orchestrator CC reflection', href: '/session_lessons.html' }
    ];
    // Aug 11: the other ~75 dated spec/backlog/debate records moved into
    // records/YYYY-MM/ (real Alex ask - repo root was "a fucking eye
    // sore," rule 5's own deliberate separation from the 8 living docs
    // preserved, just decluttered). These 7 stay as a real, curated
    // "worth a direct link" shortlist; hrefs updated to match. Full
    // categorized index of every archived file: ai_tooling_and_rules_map.md
    // Part 2.
    var secondary = [
      { icon: '⚖️', title: 'Placement Rules', desc: 'taxonomy_placement_rules.txt', href: '/taxonomy_placement_rules.txt' },
      { icon: '📐', title: 'DESIGN.md', desc: 'Structural restructure spec', href: '/DESIGN.md' },
      { icon: '💰', title: 'Token Cost Audit', desc: 'records/2026-07/token_cost_audit_2026-07-19.txt', href: '/records/2026-07/token_cost_audit_2026-07-19.txt' },
      { icon: '🔮', title: 'Oracle Grounding Spec', desc: 'records/2026-07/oracle_grounding_spec.txt', href: '/records/2026-07/oracle_grounding_spec.txt' },
      { icon: '📖', title: 'Bookworm Spec Backlog', desc: 'records/2026-07/bookworm_spec_backlog.txt', href: '/records/2026-07/bookworm_spec_backlog.txt' },
      { icon: '🗂️', title: 'Fable Master Plan', desc: 'records/2026-07/fable_master_plan.txt', href: '/records/2026-07/fable_master_plan.txt' },
      { icon: '📝', title: 'Session Handover', desc: 'records/2026-07/session_handover_2026-07-19.md', href: '/records/2026-07/session_handover_2026-07-19.md' }
    ];
    // Aug 18 real restructure — Alex's own direct ask ("too clunky"),
    // pasting the actual flat 40-row popup content back at Orchestrator
    // CC. Real root cause: 3 flat addGroup() sections, one (auto) alone
    // holding 24 rows with zero collapsing — same "flat list gets
    // unreadable past a certain size" problem manual.html's own 50-row
    // button catalog already hit and fixed (Aug 6, 9 real collapsible
    // <details> sections by Domain). Same real fix, same precedent, not
    // a new pattern invented here (rule 8). addGroup() now renders a
    // real <details>/<summary> per top-level category; addRows() is the
    // shared row-list renderer both addGroup() and its nested sub-
    // groups call, so a row's own markup/click-handler is defined once.
    var addRows = function(container, arr, isSec) {
      arr.forEach(function(d) {
        var row = document.createElement('div');
        row.className = 'dd-pop-row' + (isSec ? ' dd-pop-sec' : '');
        var tw = document.createElement('div');
        tw.style.cssText = 'flex:1;min-width:0';
        var t = document.createElement('div');
        t.className = 'dd-pop-rtitle';
        t.textContent = d.icon + ' ' + d.title;
        var ds = document.createElement('div');
        ds.className = 'dd-pop-rdesc';
        ds.textContent = d.desc;
        tw.appendChild(t); tw.appendChild(ds);
        row.appendChild(tw);
        row.onclick = function() { window.open(d.href, '_blank', 'noopener'); };
        container.appendChild(row);
      });
    };
    var addGroup = function(gtitle, arr, isSec, openByDefault, subgroups) {
      var det = document.createElement('details');
      det.className = 'dd-pop-details';
      if (openByDefault) det.open = true;
      var sum = document.createElement('summary');
      sum.className = 'dd-pop-summary';
      var count = subgroups ? subgroups.reduce(function(n, sg) { return n + sg.items.length; }, 0) : arr.length;
      sum.textContent = gtitle + ' (' + count + ')';
      det.appendChild(sum);
      var rows = document.createElement('div');
      rows.className = 'dd-pop-rows';
      det.appendChild(rows);
      if (subgroups) {
        subgroups.forEach(function(sg) {
          var subDet = document.createElement('details');
          subDet.className = 'dd-pop-details dd-pop-subdetails';
          var subSum = document.createElement('summary');
          subSum.className = 'dd-pop-summary';
          subSum.textContent = sg.title + ' (' + sg.items.length + ')';
          subDet.appendChild(subSum);
          var subRows = document.createElement('div');
          subRows.className = 'dd-pop-rows';
          addRows(subRows, sg.items, isSec);
          subDet.appendChild(subRows);
          rows.appendChild(subDet);
        });
      } else {
        addRows(rows, arr, isSec);
      }
      body.appendChild(det);
    };
    // Aug 18 restructure: the old flat 24-item `auto` array is now 5
    // real sub-groups by actual role, matching the same grouping logic
    // this whole session's own G-series work already established
    // (core drill-down chain vs. dimension/analysis pages vs. logic
    // pages vs. superseded-but-kept reference pages) — not invented
    // fresh for this popup, just finally surfaced here too.
    var graphifyGroup = [
      { icon: '🕸️', title: 'Graphify Map', desc: 'Code + doc knowledge graph — auto-refreshed by /update-logging-system, not hand-written', href: '/graphify-out/graph.html' },
      { icon: '🌳', title: 'Graphify Tree', desc: 'D3 collapsible tree view of RPGACE (950 nodes) — built by Graphify CC, the real 4th Total member', href: '/graphify-out/GRAPH_TREE.html' },
      { icon: '🕮', title: 'Obsidian Vault (browsable)', desc: 'River/zone knowledge notes with real working links — a static export since raw [[wikilinks]] only render inside the Obsidian app itself', href: '/graphify-out/obsidian_vault.html' }
    ];
    // Real Aug 21 2026 consolidation (G64) — Alex's own direct ask: "i
    // want those links to be reduced to a minimal number in oversight
    // for conciseness." The prior 5 sub-groups (23 individual page
    // links) are gone — every one of those 21 non-L0 pages is already
    // reachable from galaxy_map_hub.html's own real page index (built
    // same day), so listing them a second time here was the real
    // redundancy Alex meant. Just 2 real entries now: start at L0, then
    // browse everything else from the one real index.
    var galaxyHubGroup = [
      { icon: '🌌', title: 'Galaxy Map — RPGACE Total Systems (Level 0, start here)', desc: 'G93-G100, Aug 25 2026 — "External AI" fully retired as an L0 grouping; all 6 remaining real connectors (Composio/Jina AI/Last.fm/librosa/n8n/Whisper) promoted to their own real L0 units alongside Oracle. 15 real Level-0 units total now live as real bubbles on galaxy_map.html — every single one (G100) redirects straight to its own dedicated destination page on click, none left opening the old inline Infra/Inter choice-and-expand panel (that mechanism is now unreachable in practice, not deleted outright — a deliberate, low-risk scoping call). River pages (G93) and Current Series module pages (G94) each gained a real, evidence-computed Infra/Inter bubble row of their own: a river shows one bubble per real L0 unit whose Infra genuinely touches it (7 units have a clean river-grain mapping); a module shows Infra (exactly 1 touching unit) or a real Inter (2+ units genuinely composing there, e.g. beatLog: Last.fm+Oracle+Supabase) for the 5 units with real function-level evidence. Alex\'s own Infra (G96, all 21 real Decision Matrix decisions, river-grouped) and Skills\' own Infra (G97, SKILL_SECONDARY_RIVER) were already real facet data from an earlier same-day pass — this pass gave each its own real destination page instead of the old inline expand. G98 (diagram decongestion) was judged already satisfied by G100\'s redirect-everything change rather than requiring a separate, riskier hand-tuned-SVG edit.', href: '/graphify-out/galaxy_map.html' },
      { icon: '📇', title: 'Galaxy Map — Page Index (browse everything else)', desc: 'A real, distinct utility (Alex\'s own direct call, Aug 21: "keep as a real, standalone index") — the one page that catalogues every other real Galaxy Map page (Rivers, Modules, Current Series, Logic/Decisions, Supabase/Externals/Skills dimensions, Oversight Sync, and more), grouped by real Level with real "→ flows into" links, toggleable between a table and a node-graph view. Reachable from here so the rest of this popup can stay short.', href: '/graphify-out/galaxy_map_hub.html' }
    ];
    // Aug 23 2026 (UI8) — was the hardcoded literal
    // 'Primary — 6 file-based docs + the live taxonomy map + Smoke Test',
    // i.e. a claim of 8 items while the `primary` array above had grown to 12
    // (Error Log, Future Integrations, Achiever and Session Lessons were all
    // added Aug 12-21 without this label ever being revisited — a real,
    // user-visible undercount, and a textbook /colourgradient brown finding).
    // Counted from primary.length now, so it can never go stale the same way
    // again the next time a real doc is added to that list.
    addGroup('Primary — ' + primary.length + ' living docs (Tier a/b + layers d/e), incl. the live taxonomy map', primary, false, true);
    addGroup('Auto-generated', null, true, false, [
      { title: '🌌 Galaxy Map', items: galaxyHubGroup },
      { title: '🕸️ Graphify / Obsidian', items: graphifyGroup }
    ]);
    addGroup('Working specs', secondary, true, false);
  },

  // ── P4 Knowledge Gaps popup. July 20 Pass 1: relocates the LIVE Knowledge
  // ── Gap Tracker widget (#kg-panel, module knowledgeGap) into this card's
  // ── popup — the node is MOVED, never rebuilt, so its badge/refresh and
  // ── both row actions (Study Now, Apply Tonight) keep their real handlers.
  // ── Parked in #dd-stash-holder while the popup is closed. The old bespoke
  // ── gap-list query that used to live here is gone — the widget already
  // ── renders the same data (taxonomySync.getTopGaps) with richer rows.
  _openGaps: function() {
    var self = RPGACE.modules.dashDeck;
    var w = document.getElementById('kg-panel');
    if (!w) {
      var kg = RPGACE.modules.knowledgeGap;
      if (kg && kg._inject) { try { kg._inject(); } catch (e) {} }
      w = document.getElementById('kg-panel');
    }
    var pop = self._popup({
      eyebrow: '🕳️ Knowledge Gaps',
      title: 'What your library doesn\'t know yet',
      accent: 'var(--green)',
      width: '680px',
      closeLabel: 'Close',
      onClose: function() {
        self._stashWidget('kg-panel', true);
        delete self._widgetPopups['kg-panel'];
      }
    });
    self._widgetPopups['kg-panel'] = pop.close;
    if (w) {
      w.style.marginBottom = '0';
      pop.box.appendChild(w);
      // Refresh on open so the relocated widget shows current gaps.
      var kg2 = RPGACE.modules.knowledgeGap;
      if (kg2 && kg2._load) { try { kg2._load(); } catch (e) {} }
    } else {
      var msg = document.createElement('div');
      msg.style.cssText = 'color:var(--muted);font-size:13px;padding:16px 0;text-align:center;line-height:1.6';
      msg.textContent = 'Knowledge Gap Tracker is still loading — close this and try again in a moment.';
      pop.box.appendChild(msg);
    }
  },

  // ── _openPanelPopup — Aug 23 2026 (UI2), the real replacement for
  // _jumpToResearchPanel (deleted in the same pass, zero remaining callers).
  //
  // WHY IT CHANGED: the old helper's last two real steps were
  // `showPage(RPGACE.CONFIG.pages.research)` + scrollIntoView — i.e. navigate
  // AWAY to the Research Lab page and scroll down to the panel. That page is
  // retired (Alex: "research tab should be completely gone, with needed part
  // going to either the worms or content pipeline"), and showPage() has NO
  // null guard on its own `document.getElementById('page-'+name)` lookup, so
  // every one of these 6 buttons would have thrown the moment the div went.
  //
  // WHAT IT DOES NOW: the same relocate-into-popup pattern _openGaps /
  // _openCorpus / _openPipeline already prove — the panel's real DOM node is
  // MOVED into a fresh popup (never cloned, never rebuilt, so every listener
  // and inline onclick keeps working) and MOVED BACK to the shared staging
  // holder on close. This is deliberately the SAME visual entry point as
  // before (the same buttons in the same lists); only the destination
  // mechanism changed — the worm-picker layout itself is separately-scoped
  // work and is untouched here.
  //
  // TAXTREE-MANUAL-BTN SIBLING SAFETY: phylumPath's #taxtree-manual-btn
  // inserts itself as a DOM sibling immediately BEFORE whichever of
  // #cp-idea-bank / #beat-log-panel exists first — the exact reason those two
  // were never relocated before this pass (they'd have stranded it in a
  // hidden container). Fixed properly rather than worked around: if that
  // button is the panel's immediate previousElementSibling, it travels WITH
  // the panel into the popup and back out again, preserving the real
  // relationship instead of breaking it.
  //
  // PAGE:SHOW REPLACEMENT: 4 real page:show listeners keyed on the retired
  // page name ('learning'/'research'/RPGACE.CONFIG.pages.research) used to
  // re-run this content's own UI polish — config's applyIntelUI (Videoworm's
  // collapsed insight list), feynman._wireEncyclopediaButtons, intelDelete
  // ._injectAll, taxTreeManual._injectManualButton. page:show can never fire
  // with that name again, so this helper fires a real, honestly-named
  // 'worm-panel:open' hook instead, which all 4 now also listen on. Fired
  // AFTER the node is in the popup and visible, so anything measuring or
  // injecting into it sees the real, live layout.
  _openPanelPopup: function(opts) {
    var self = RPGACE.modules.dashDeck;
    opts = opts || {};
    var panelId = opts.panelId;
    var panel = document.getElementById(panelId);
    if (!panel && typeof opts.ensure === 'function') {
      try { opts.ensure(); } catch (e) {}
      panel = document.getElementById(panelId);
    }
    // Remember where it came from + how it was hidden, so close() puts it
    // back exactly as found rather than guessing at a default.
    var prevDisplay = panel ? panel.style.display : '';
    // phylumPath's #taxtree-manual-btn anchors itself immediately BEFORE
    // whichever of #cp-idea-bank / #beat-log-panel exists first. Deliberately
    // matched by ID + panel identity rather than by previousElementSibling:
    // _injectManualButton runs from a BOOT TASK, while both anchor panels are
    // lazily injected on first real demand, so at boot the button is inserted
    // at the top of the staging holder and the panel is appended to the end of
    // it later - adjacent in intent, not in the DOM. Matching on adjacency
    // alone would silently strand the button in the hidden holder (the exact
    // regression this carry exists to prevent). The .dd-overlay guard mirrors
    // _stashWidget's own: never rip the button out of a popup that still has
    // it on screen.
    var sib = null;
    if (panel && (panelId === 'cp-idea-bank' || panelId === 'beat-log-panel')) {
      var tb = document.getElementById('taxtree-manual-btn');
      if (tb && !(tb.closest && tb.closest('.dd-overlay'))) sib = tb;
    }
    var pop = self._popup({
      eyebrow: opts.eyebrow || '',
      title: opts.title || '',
      accent: opts.accent || 'var(--gold)',
      width: opts.width || '720px',
      closeLabel: 'Close',
      onClose: function() {
        var home = RPGACE.utils.panelHome();
        var p = document.getElementById(panelId);
        if (p && home) {
          // Order matters: the button must land immediately BEFORE the panel
          // again, so append it first, then the panel.
          if (sib) home.appendChild(sib);
          p.style.display = prevDisplay;
          home.appendChild(p);
        }
        delete self._widgetPopups[panelId];
      }
    });
    self._widgetPopups[panelId] = pop.close;
    if (panel) {
      if (sib) { sib.style.display = ''; pop.box.appendChild(sib); }
      panel.style.marginBottom = '0';
      panel.style.display = '';   // clear the staged display:none
      pop.box.appendChild(panel);
      RPGACE.hooks.fire('worm-panel:open', panelId);
    } else {
      var msg = document.createElement('div');
      msg.style.cssText = 'color:var(--muted);font-size:13px;padding:16px 0;text-align:center;line-height:1.6';
      msg.textContent = (opts.title || 'This panel') + ' is still loading — close this and try again in a moment.';
      pop.box.appendChild(msg);
    }
    return pop;
  },

  // KN-6 (Oct 15 2026): puts a panel on its own page (making it first if
  // needed) without navigating. _openPage uses it, and so does a worm page
  // reached straight from the menu or a link (knowledgeHub's page:show),
  // which used to show an empty page until opened once via its menu.
  _mountPanel: function(panelId) {
    var meta = RPGACE.modules.dashDeck.PAGE_PANELS[panelId];
    if (!meta) { console.warn('[dashDeck] _openPage: no PAGE_PANELS entry for', panelId); return null; }
    var target = document.getElementById('page-' + meta.slug);
    if (!target) { console.warn('[dashDeck] _openPage: missing #page-' + meta.slug); return null; }
    var panel = document.getElementById(panelId);
    if (!panel && typeof meta.ensure === 'function') {
      try { meta.ensure(); } catch (e) {}
      panel = document.getElementById(panelId);
    }
    if (panel && panel.parentElement !== target) {
      if (panelId === 'cp-idea-bank' || panelId === 'beat-log-panel') {
        var tb = document.getElementById('taxtree-manual-btn');
        if (tb && tb.nextElementSibling === panel) { tb.style.display = ''; target.appendChild(tb); }
      }
      panel.style.display = '';
      panel.style.marginBottom = '0';
      target.appendChild(panel);
      RPGACE.hooks.fire('worm-panel:open', panelId);
    }
    return meta;
  },

  // Navigate to a real page, relocating its real panel node into it on
  // first visit (idempotent — a panel already parented to its target page
  // is left untouched on a repeat call). opts.after runs post-navigation,
  // for a caller that needs to drill into one specific record (e.g. open a
  // specific book/ConID) once the page itself is showing.
  _openPage: function(panelId, opts) {
    opts = opts || {};
    var meta = RPGACE.modules.dashDeck._mountPanel(panelId);
    if (!meta) return;
    // Oct 10 2026 (Alex: "goes back to dashboard, not content pipeline"):
    // remember which dashboard card this page was opened from - N1's history
    // entry for that card's popup is still the current state here - so the
    // page's own Back button can step back exactly like phone Back does.
    var st = history.state;
    RPGACE.modules.dashDeck._pageOrigin = { slug: meta.slug, card: (st && st.popup && st.card) || null };
    if (typeof showPage === 'function') showPage(meta.slug);
    if (typeof opts.after === 'function') { try { opts.after(); } catch (e) {} }
  },

  // In-page "← Content Pipeline" / "← Bookworm" buttons. Came from that
  // card's menu: history.back() (popstate reopens the menu, same as phone
  // Back, and leaves no extra history entry). Reached directly (link,
  // bookmark, reload): show the dashboard and open the card's menu.
  _pageBack: function(cardKey) {
    var dd = RPGACE.modules.dashDeck;
    var active = document.querySelector('.page.active');
    var slug = active ? active.id.replace(/^page-/, '') : '';
    var o = dd._pageOrigin;
    if (o && o.slug === slug && o.card && history.length > 1) { dd._pageOrigin = null; history.back(); return; }
    if (typeof showPage === 'function') showPage('dashboard');
    if (cardKey) setTimeout(function() { dd._navOpenCard(cardKey); }, 60);
  },

  // ── P4b Corpus popup (Aug 15 2026, A5 Phase 1) — Corpus's own real
  // stand-alone dashboard card, per Alex's own literal ask. Uses the
  // established relocate-into-popup pattern (same as _openGaps).
  // Aug 23 2026 (UI2): this is no longer the exception it used to be —
  // Idea Bank / Beat Log / Upload Workshop / Videoworm / Videoworm-Find /
  // Bibliography ALL relocate into popups now too, via the shared
  // _openPanelPopup helper (which also solves the taxtree-manual-btn
  // sibling problem that kept 2 of them in-page until now). This function
  //
  // SUPERSEDED, Aug 31 2026 (UI10/UI12) — zero real remaining callers: the
  // MODULES dashboard card that called this is retired (UI10), and the
  // worm-picker's own "Open MusicWorm" button now calls
  // dashDeck._openPage('ref-corpus-panel') instead (UI12, a real page, not
  // this transient popup). Left defined rather than deleted — same "kept
  // on disk, nothing 404s" precedent as _openResearch() — in case a future
  // pass wants the popup shape back. This function
  // keeps its own bespoke shape because it is a real top-level dashboard
  // card with its own identity, not a sub-panel opened from another popup.
  // refCorpus._inject() called directly on demand, preserving the exact
  // same lazy-load-on-first-real-use behavior the July 23 performance fix
  // relied on (previously gated behind research:tab-active==='corpus').
  _openCorpus: function() {
    var self = RPGACE.modules.dashDeck;
    var w = document.getElementById('ref-corpus-panel');
    if (!w) {
      var rc = RPGACE.modules.refCorpus;
      if (rc && rc._inject) { try { rc._inject(); } catch (e) {} }
      w = document.getElementById('ref-corpus-panel');
    }
    var pop = self._popup({
      eyebrow: '🎼 Corpus',
      title: 'Reference tracks your beats get matched against',
      accent: 'var(--blue)',
      width: '640px',
      closeLabel: 'Close',
      onClose: function() {
        self._stashWidget('ref-corpus-panel', true);
        delete self._widgetPopups['ref-corpus-panel'];
      }
    });
    self._widgetPopups['ref-corpus-panel'] = pop.close;
    if (w) {
      w.style.marginBottom = '0';
      w.style.display = '';
      pop.box.appendChild(w);
    } else {
      var msg = document.createElement('div');
      msg.style.cssText = 'color:var(--muted);font-size:13px;padding:16px 0;text-align:center;line-height:1.6';
      msg.textContent = 'Corpus is still loading — close this and try again in a moment.';
      pop.box.appendChild(msg);
    }
    var foot = document.createElement('div');
    foot.style.cssText = 'margin-top:12px;font-size:11px;color:var(--muted);line-height:1.5';
    // Aug 23 2026 (UI9) — this string, and the Corpus dashboard card's own
    // `desc` above, both claimed Corpus "feeds the taxonomy tree". Direct grep
    // evidence (CLAUDE.md's own Aug 22 A5 Phase 2 entry, re-confirmed this
    // pass) says otherwise: zero reference_tracks -> taxonomy_tree write path
    // exists anywhere in the codebase. Corrected to what is actually true
    // today rather than swapped for a different aspirational claim; the real
    // feed is a genuine future build, named honestly as unbuilt.
    foot.textContent = 'Beat-matching reference library — Beat Log scores your beat against these tracks. Last.fm is a real fallback source (River VII). A real feed into the taxonomy tree is a planned future build, not live yet.';
    pop.box.appendChild(foot);
  },

  // ── P5 Content Pipeline popup. July 20 Pass 1: relocates the LIVE Content
  // ── Production Live widget (#cpl-widget, module contentProductionLive)
  // ── into this card's popup — node MOVED, never rebuilt, so every row
  // ── action (edit title, swap ConID, mark status, post details, Oracle
  // ── session, Beatstars listing, platform links) keeps its real handler.
  // ── Parked in #dd-stash-holder while closed. Aug 15 2026 (A5 Phase 1):
  // ── the footer chrome below the relocated widget now opens Idea Bank,
  // ── Beat Log, and Upload Workshop directly (Aug 23 2026, UI2: each as its
  // ── own relocate-into-popup via _openPanelById, previously a page nav)
  // ── instead of the old single "💡 Open Idea Bank" button that detoured
  // ── through Research Lab's own tab bar — those 3 panels' real owning
  // ── modules (conidPot/beatLog/videoPipeline) are all already River XI,
  // ── this just gives Content Pipeline a direct door to its own content.
  // ── Rebuilt Aug 31 2026 (UI13), same real reasoning as _openBookworm's
  // own UI12 rebuild — this used to embed the live cpl-widget node inline
  // AND offer jump buttons; now it's PURE NAVIGATION, every destination a
  // real routable page (UI11). Real Open+Resume discipline: Resume only
  // renders when a real Supabase row backs it. ConID List and Idea Bank
  // both have a genuine "specific record to jump back into" concept
  // (_activeConID/_activeId + _openProductionPanel; the idea itself),
  // so both get a real Resume — Beat Log (fresh-entry form) and Upload
  // Workshop (its real strategy-generation feature isn't built yet) never
  // do, per Alex's own direct confirmation.
  _openPipeline: function() {
    var self = RPGACE.modules.dashDeck;
    var pop = self._popup({
      eyebrow: '🎬 Content Pipeline',
      title: 'Choose where to go',
      accent: 'var(--purple)',
      width: '480px',
      closeLabel: 'Close'
    });
    var body = pop.box;
    var GOLD_BTN = 'display:block;width:100%;margin-top:8px;padding:11px;min-height:44px;background:rgba(var(--dd-gold-rgb),.15);border:1px solid var(--gold);border-radius:8px;color:var(--gold);font-size:13px;font-weight:700;letter-spacing:1px;cursor:pointer;font-family:Rajdhani,sans-serif;';

    // PC-6 (Oct 17 2026): the old Production Panel resume, Upload Workshop
    // and OBS raw buttons are retired; this pop-up just routes to the
    // Beats / Posting journeys and their three shared screens.
    var go = function(id, label, run) {
      var b = document.createElement('button');
      b.id = id; b.textContent = label; b.style.cssText = GOLD_BTN;
      b.onclick = function() { pop.close(); run(); };
      body.appendChild(b);
      return b;
    };
    go('dd-pipe-beats', '🥁 Beats home', function() { RPGACE.modules.beatsHub.open(); }).style.marginTop = '0';
    go('dd-pipe-posting', '📣 Posting', function() { RPGACE.modules.postingHub.open(); });
    go('dd-pipe-selling', '💼 Selling', function() { RPGACE.modules.sellingHub.open(); });
    go('dd-pipe-ideas', '💡 Idea Bank', function() { self._openPage('cp-idea-bank'); });
    go('dd-pipe-beatlog', '📝 Beat Log', function() { self._openPage('beat-log-panel'); });
    go('dd-pipe-mybeats', '🎬 My beats', function() { self._openPage('cpl-widget'); });
  },

  // /Engineer pass (July 28, round 2) — this card used to just prefill
  // Oracle's chat input with a static, non-live prompt (_prefillOracle +
  // MORNING_PROMPT, both removed) — a hollow duplicate of the real
  // morningBrief module, which auto-runs once a day, gathers live
  // Gmail/shift/YouTube/knowledge-gap/idea-bank data, and actually sends the
  // result to Oracle. That real module was never given a dashDeck home
  // either — it kept injecting its own #mb-wrap button straight onto
  // #page-dashboard outside the card grid (rule 8 — two divergent
  // implementations of the same feature). Same relocate-on-open pattern as
  // every other card here: the live #mb-wrap node (button, last-run label,
  // output) is MOVED into this popup, never rebuilt, so its real onclick
  // and auto-run output keep working.
  // MD-5 (Oct 20 2026): the Morning Brief card opens My Day's one
  // Good-morning screen, which carries the brief below the day.
  _openMorningBrief: function() {
    var md = RPGACE.modules.myDay;
    if (md && md.ui && md.ui.openMorning) return md.ui.openMorning();
    return RPGACE.modules.dashDeck.ui._openBriefOnly();
  },
  // The brief's own content (mb-wrap + its add-ons), filled into `host`.
  // Shared by the Good-morning screen and the plain brief (rule 8).
  _fillBrief: function(host) {
    var w = document.getElementById('mb-wrap');
    if (!w) {
      var mb = RPGACE.modules.morningBrief;
      if (mb && mb._injectButton) { try { mb._injectButton(); } catch (e) {} }
      w = document.getElementById('mb-wrap');
    }
    if (!w) {
      var msg = document.createElement('div');
      msg.style.cssText = 'color:var(--muted);font-size:13px;padding:16px 0;text-align:center;line-height:1.6';
      msg.textContent = 'Morning Brief is still loading — close this and try again in a moment.';
      host.appendChild(msg);
      return null;
    }
    w.style.marginBottom = '0';
    host.appendChild(w);
    var mbm = RPGACE.modules.morningBrief;
    if (mbm && mbm.ui && mbm.ui._showSaved) mbm.ui._showSaved().catch(function(e) { RPGACE.utils.toast('⚠️ Could not load today\'s brief: ' + (e.message || e), '#CC4A4A', 4000); });
    // L1 (Oct 10 2026): saved ideas due for recall sit at the top of the brief.
    // KR-3: one Review line (idea cards, exam redo, jargon) instead of the recall strip.
    if (RPGACE.modules.knowledgeReview) RPGACE.modules.knowledgeReview.ui.briefLine(w); else if (RPGACE.modules.recall) RPGACE.modules.recall.renderInto(w);
    // LL-6 (Oct 13 2026): one Library item a day.
    if (RPGACE.modules.lifeLibrary) RPGACE.modules.lifeLibrary.ui.renderDailyInto(w);
    // XP-6 (Oct 14 2026): one quiet line for level/rank-ups since yesterday.
    if (RPGACE.modules.xpSeason) RPGACE.modules.xpSeason.ui.renderBriefInto(w);
    if (RPGACE.modules.dailyLife) RPGACE.modules.dailyLife.renderInto(w);
    // RI-9 (Oct 15 2026): today's realm pick, with why, at the very top.
    if (RPGACE.modules.realmBrief) RPGACE.modules.realmBrief.ui.renderInto(w);
    return w;
  },
  _openBriefOnly: function() {
    var self = RPGACE.modules.dashDeck;
    var w = document.getElementById('mb-wrap');
    if (!w) {
      var mb = RPGACE.modules.morningBrief;
      if (mb && mb._injectButton) { try { mb._injectButton(); } catch (e) {} }
      w = document.getElementById('mb-wrap');
    }
    var pop = self._popup({
      eyebrow: '🌅 Morning Brief',
      title: 'Your day in one shot',
      accent: 'var(--gold)',
      width: '640px',
      closeLabel: 'Close',
      onClose: function() {
        self._stashWidget('mb-wrap', true);
        delete self._widgetPopups['mb-wrap'];
      }
    });
    self._widgetPopups['mb-wrap'] = pop.close;
    var body = pop.box;
    self.ui._fillBrief(body);
    var foot2 = document.createElement('div');
    foot2.style.cssText = 'margin-top:12px;font-size:11px;color:var(--muted);line-height:1.5';
    foot2.textContent = 'Written each morning at 7:00. If it is missing when you open it after 7:00, it is written for you then.';
    body.appendChild(foot2);
  },

  },

  // logic - business logic/data.
  logic: {

  // Oct 10 2026 (N2 slice 5) — the "trail": the data "Continue where you
  // left off" needed and nothing recorded. Every page shown and card opened
  // (dashboard excluded) is kept in localStorage, newest first, max 8.
  TRAIL_KEY: 'rpgace_trail',
  _localDate: function(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  _trailRead: function() {
    try { var t = JSON.parse(localStorage.getItem(RPGACE.modules.dashDeck.logic.TRAIL_KEY) || '[]'); return Array.isArray(t) ? t : []; } catch (e) { return []; }
  },
  _trailPush: function(entry) {
    if (!entry || !entry.key) return;
    var lg = RPGACE.modules.dashDeck.logic;
    var t = lg._trailRead().filter(function(x) { return !(x.kind === entry.kind && x.key === entry.key); });
    entry.at = Date.now();
    t.unshift(entry);
    try { localStorage.setItem(lg.TRAIL_KEY, JSON.stringify(t.slice(0, 8))); } catch (e) {}
  },
  // Label + icon for a page from the left-nav manifest (one source, rule 8).
  _pageMeta: function(page) {
    var ln = RPGACE.modules.leftNav;
    var items = ln && ln._items ? ln._items() : [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.page === page) return { icon: it.icon, label: it.label };
      var subs = it.subItems || [];
      for (var j = 0; j < subs.length; j++) if (subs[j].page === page) return { icon: subs[j].icon, label: subs[j].label };
    }
    return null;
  },
  _ago: function(at) {
    var m = Math.round((Date.now() - (at || 0)) / 60000);
    if (!(m >= 0)) return '';
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    var d = Math.round(h / 24);
    return d === 1 ? 'yesterday' : d + ' days ago';
  },

  // Called from inside a relocated widget's own action handler (Study Now,
  // Oracle session, Beatstars Listing) BEFORE it navigates or opens a
  // drawer/overlay — otherwise that surface renders BEHIND the still-open
  // dashDeck popup (kg's Feynman drawer is z-index 9999 < the popup's
  // 99999; showPage('advisor') just swaps pages under the overlay).
  // Running pop.close() here fires the popup's onClose (force-stashes the
  // widget back to the holder) then removes the overlay. Returns true if a
  // popup was actually closed. Safe no-op when no popup hosts the widget
  // (e.g. the widget is still on the raw dashboard) — the caller proceeds
  // either way.
  closeWidgetPopup: function(id) {
    var fn = RPGACE.modules.dashDeck._widgetPopups[id];
    if (fn) { try { fn(); } catch (e) {} return true; }
    return false;
  },

  // Convenience wrapper: open a relocatable panel by id using its own
  // registered identity above, with an optional lazy-inject function.
  //
  // SUPERSEDED, Aug 31 2026 (UI11) — zero real remaining callers: every
  // real call site that used to open one of these 6 panels in a transient
  // popup (_openBookworm/_openPipeline's own jump buttons, loadNote's Load
  // handler, both real Beat Log retroactive-open paths) now calls
  // dashDeck._openPage() instead, landing on a real permanent page (UI11)
  // rather than a popup. _openPanelPopup/_openPanelById/PANEL_POPUPS are
  // left defined rather than deleted — same "kept on disk, nothing 404s"
  // precedent as _openResearch() — in case a future pass wants the
  // transient-popup shape back for something new.
  _openPanelById: function(panelId, ensureFn) {
    var meta = RPGACE.modules.dashDeck.PANEL_POPUPS[panelId] || {};
    return RPGACE.modules.dashDeck._openPanelPopup({
      panelId: panelId, ensure: ensureFn,
      eyebrow: meta.eyebrow, title: meta.title, accent: meta.accent, width: meta.width
    });
  },

  },

  // Thin top-level pass-throughs - preserve the exact existing public
  // API. See ui/logic above for the real implementations.
  _relocateQuestBoard: function() { return this.ui._relocateQuestBoard(); },
  _injectStyles: function() { return this.ui._injectStyles(); },
  _inject: function() { return this.ui._inject(); },
  _refreshGlance: function() { return this.ui._refreshGlance(); },
  _ldFill: function(id, rows, e) { return this.ui._ldFill(id, rows, e); },
  _askOracle: function(text) { return this.ui._askOracle(text); },
  _popup: function(opts) { return this.ui._popup(opts); },
  _ensureHolder: function() { return this.ui._ensureHolder(); },
  _stashBookworm: function(force) { return this.ui._stashBookworm(force); },
  _ensureStash: function() { return this.ui._ensureStash(); },
  _stashWidget: function(id, force) { return this.ui._stashWidget(id, force); },
  _openBookworm: function() { return this.ui._openBookworm(); },
  _openTaxonomy: function() { return this.ui._openTaxonomy(); },
  _openResearch: function() { return this.ui._openResearch(); },
  _openOversight: function() { return this.ui._openOversight(); },
  _openGaps: function() { return this.ui._openGaps(); },
  _openPanelPopup: function(opts) { return this.ui._openPanelPopup(opts); },
  _openPage: function(panelId, opts) { return this.ui._openPage(panelId, opts); },
  _mountPanel: function(panelId) { return this.ui._mountPanel(panelId); },
  _pageBack: function(cardKey) { return this.ui._pageBack(cardKey); },
  _openCorpus: function() { return this.ui._openCorpus(); },
  _openPipeline: function() { return this.ui._openPipeline(); },
  _openMorningBrief: function() { return this.ui._openMorningBrief(); },
  closeWidgetPopup: function(id) { return this.logic.closeWidgetPopup(id); },
  _openPanelById: function(panelId, ensureFn) { return this.logic._openPanelById(panelId, ensureFn); },

});
/* ===END:dashDeck=== */
