
/* ===MODULE:researchTabs=== */
// July 19 — Research page redesign, tab bar showing one section at a time.
// July 22 — Alex asked for the opposite ("get rid of research tab as a
// wrapper, just keep the sub doms on display") — tab-gating removed, all
// 7 sections rendered simultaneously.
// July 23 — REAL REVERSAL, confirmed by Alex this round: real evidence
// (reading every research sub-module's init) showed at least 6 separate
// modules (refCorpus, beatLog, conidPot's Idea Bank, bookworm's
// Bibliography section, contentRepurpose's Workshop button, plus this
// module's own _apply cascade) each inject their own widget AND fire a
// real Supabase fetch, all within the same ~900-1800ms post-boot window,
// REGARDLESS of which page is even showing (`.page` divs exist in the DOM
// at all times, just hidden via CSS — `document.getElementById('page-
// learning')` succeeds even when Research Lab was never opened). Alex
// reported a real 12-23 SECOND freeze opening the left nav shortly after
// login — squarely inside that same window. Real single-tab lazy loading
// is back, now built the RIGHT way: each of those 6 modules' own fetch/
// inject only fires the first time ITS OWN tab becomes active (via the new
// 'research:tab-active' hook below), not at raw boot regardless of page,
// and not simultaneously with the other 5 the first time Research Lab is
// opened either. Per Alex's own answer this round: cached for the session
// once loaded (switching tabs back and forth after the first real load is
// instant, no repeat fetch) — an in-page tab bar stays for quick switching
// (his other explicit answer), it doesn't force a round-trip through the
// dashboard card's popup every time.
RPGACE.register('researchTabs', {
  domain: 'knowledge',

  // `desc` added July 23 — single source of truth for the new Research Lab
  // dashboard-card popup's sub-nav cards (dashDeck._openResearch), so the
  // tab bar and the popup can never drift out of sync with each other.
  //
  // Aug 15 2026 — real A5 Phase 1 (Research Lab dismantling, Alex's own
  // ask: "ship where it should be to make river 5 a lot more managable").
  // 5 of the original 7 tabs are REMOVED here — not deleted, relocated:
  // Idea Bank + Beat Log + Upload Workshop now open directly from the
  // 🎬 Content Pipeline card (dashDeck._openPipeline), Corpus got its own
  // stand-alone dashboard card (dashDeck._openCorpus, per Alex's own
  // literal wording), Bibliography now opens from the 📖 Bookworm card
  // (dashDeck._openBookworm). Real Galaxy Map evidence (CLAUDE.md rule
  // 15) confirmed the OWNING MODULES were already correctly placed
  // (beatLog/conidPot/videoPipeline = River XI, refCorpus = River VII,
  // bookworm = River IV) — this was purely a UI/entry-point fix, no
  // module relocation, no data-model change. The 5 panels themselves are
  // untouched and still physically live in #page-learning (see each
  // dashDeck open-function's own comment for why they were NOT
  // relocated) — only their lazy-load triggers moved from a
  // researchTabs tab-key to a direct call from the new open-functions.
  // Aug 15 2026 (same day, real follow-up ask, Alex hand-tested Phase 1
  // and directly asked for the last 2 tabs too: "i want these in bookworm
  // under the bookworm update i wanted too" — ties to A8, "Bookworm
  // absorbs Content Intelligence entirely"). File Analyzer + Video Finder
  // now open from the 📖 Bookworm card (dashDeck._openBookworm). TABS is
  // now genuinely empty — Research Lab has zero content of its own left.
  // researchTabs itself is deliberately NOT deleted (same "kept on disk,
  // nothing 404s" precedent as the Meanders page) — _inject()/_apply()
  // stay real, functioning, and simply have nothing to do; #page-learning
  // stays a valid navigation target for the many real call sites that
  // still route there to reach these 2 panels via the new jump buttons.
  // Real Phase 2, explicitly NOT built this pass, logged instead
  // (Alex's own words, kept as a real future idea, not guessed at):
  // rename File Analyzer → "Videoworm"/"Articleworm" and route its real
  // insights through Bookworm's own placement logic (A8's full ask);
  // give Corpus a "MusicWorm" identity with real audio-listening
  // capability, mapped against taxonomy phyla as a case study (his own
  // words: "just a bare idea right now, but migration would be
  // awesome"); a real "which worm?" picker landing on Bookworm's card,
  // toggleable between worms on one page, each worm feeding relevant
  // context into Oracle chat alongside the existing platform-Oracle
  // panels ("a winning formula for me and RPGACE total systems").
  TABS: [],

  // Tab keys already given their one real load this session — checked
  // before firing 'research:tab-active' so a tab switched back to never
  // re-fetches/re-fires, matching Alex's "cache for the session" answer.
  _firedKeys: {},

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 40 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // predecessors already shipped and verified. Pure internal-structure
  // refactor — zero functional, behavioural, UX, data or schema change;
  // every function below was MOVED wholesale, never rewritten and never
  // split down the middle.
  //
  // This module splits 1 logic (_activeTab) / 4 ui (_inject,
  // _resolveSections, _apply, show). `_resolveSections` goes to `ui`
  // despite currently always returning `{}` (a real, honest side effect
  // of A5 Phase 1's dismantling, unchanged by this refactor) — its body
  // still does real DOM discovery (`getElementById`), matching this
  // series' own established "any real DOM touch, read or write, is a ui
  // signal" convention, not just markup construction. `TABS`/
  // `_firedKeys` stay module-scope fields; `init` stays a literal
  // top-level function.
  //
  // Real, load-bearing external touchpoint, confirmed by grep: a sub-
  // card click handler elsewhere in this file calls
  // `RPGACE.modules.researchTabs.show(t.key)` directly, guarded behind
  // `if (RPGACE.modules.researchTabs)`. Preserved via the pass-through
  // below.
  // ══════════════════════════════════════════════════════════════════

  init: function() {
    var self = this;
    // July 23 real find (GODMODE): _inject() - the function that actually
    // BUILDS the #research-tab-bar DOM element - was never called anywhere
    // in the codebase. init() only ever called _apply() (which sorts
    // visibility of an already-built bar), so the in-page tab bar has
    // never actually existed in the live app. Now genuinely load-bearing
    // since Alex explicitly asked to keep it for quick tab switching -
    // fixed by calling _inject() alongside _apply() everywhere the latter
    // already ran.
    [1200, 2500, 4500, 8000].forEach(function(ms) {
      setTimeout(function() { self._inject(); self._apply(); }, ms);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.research) { self._inject(); self._apply(); }
    });
    RPGACE.hooks.on('research:panel-injected', function() { self._apply(); });
  },

  // ============================================================
  // logic — the one pure-data function in this module.
  // ============================================================
  logic: {

  _activeTab: function() {
    return localStorage.getItem('rpgace_research_tab') || 'intel';
  },

  },

  // ============================================================
  // ui — rendering/DOM: the tab bar, section visibility, and the
  // Research Lab page-navigation entry point.
  // ============================================================
  ui: {

  // Section roots resolved fresh on every apply - injected panels may
  // not exist yet on early passes, and that must never break anything.
  //
  // Aug 15 2026 (same day, real follow-up) — intel/finder (File Analyzer/
  // Video Finder) detection removed here too, same reasoning as the
  // Phase 1 removals below: TABS is now empty, so this always returns {}.
  // Kept as a real function (not deleted) since _apply() still calls it
  // harmlessly — File Analyzer/Video Finder are now reached via
  // dashDeck._openBookworm()'s own jump buttons, which unhide them
  // directly (#file-analyzer-panel/#video-finder-panel) rather than
  // routing through this tab-visibility mechanism.
  _resolveSections: function() {
    var page = document.getElementById('page-learning');
    if (!page) return {};
    var out = {};
    // Aug 15 2026 (A5 Phase 1) — workshop/ideas/corpus/beatlog/biblio
    // deliberately no longer resolved here: those 5 panels are no longer
    // researchTabs-managed (see the TABS comment above). They still
    // physically exist in #page-learning; dashDeck's own open-functions
    // (_openCorpus, _openPipeline's Beat Log/Idea Bank/Upload Workshop
    // buttons, _openBookworm's Bibliography button) unhide + scroll to
    // them directly on demand instead of this module toggling their
    // visibility as a "tab."
    return out;
  },

  _inject: function() {
    var self = RPGACE.modules.researchTabs;
    if (document.getElementById('research-tab-bar')) return;
    var page = document.getElementById('page-learning');
    if (!page) return;
    var anchor = page.querySelector('.section-title');
    if (!anchor) return;

    var bar = document.createElement('div');
    bar.id = 'research-tab-bar';
    bar.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 18px 0;';
    self.TABS.forEach(function(t) {
      var btn = document.createElement('button');
      btn.dataset.tabKey = t.key;
      btn.textContent = t.label;
      // Thumb-sized targets per the standing mobile-first rule.
      btn.style.cssText = 'padding:9px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);color:rgba(226,226,236,0.5);';
      btn.onclick = function() {
        localStorage.setItem('rpgace_research_tab', t.key);
        self._apply();
      };
      bar.appendChild(btn);
    });
    anchor.parentElement.insertBefore(bar, anchor.nextSibling);
  },

  // July 23 — real single-tab visibility is back (see module header for
  // why). Also the one real trigger point for lazy per-tab loading: the
  // FIRST time a key becomes active, fire 'research:tab-active' so that
  // tab's own module does its one real inject+fetch — never again this
  // session (the _firedKeys guard), and never for the other 6 tabs at once.
  _apply: function() {
    var self = RPGACE.modules.researchTabs;
    var active = self._activeTab();
    var sections = self._resolveSections();
    var bar = document.getElementById('research-tab-bar');
    if (bar) {
      Array.prototype.forEach.call(bar.children, function(btn) {
        var on = btn.dataset.tabKey === active;
        btn.style.background = on ? 'rgba(155,89,182,0.15)' : 'rgba(255,255,255,0.03)';
        btn.style.borderColor = on ? 'rgba(155,89,182,0.45)' : 'rgba(255,255,255,0.1)';
        btn.style.color = on ? '#B07CC6' : 'rgba(226,226,236,0.5)';
      });
    }
    Object.keys(sections).forEach(function(key) {
      sections[key].style.display = (key === active) ? '' : 'none';
    });
    if (!self._firedKeys[active]) {
      self._firedKeys[active] = true;
      RPGACE.hooks.fire('research:tab-active', active);
    }
    // Batch the long lists (July 22: tightened 8→5, a direct QoL request -
    // "this list needs to be further collapsable, takes too long to load
    // and read" - same helper, just a smaller default reveal).
    RPGACE.ui.batchList(document.getElementById('intel-insights-content'), 5);
    RPGACE.ui.batchList(document.getElementById('rc-list'), 5);
  },

  // Public entry point used by the leftNav drawer's Research sub-nav AND
  // the new Research Lab dashboard-card popup's sub-cards.
  show: function(key) {
    var self = RPGACE.modules.researchTabs;
    localStorage.setItem('rpgace_research_tab', key);
    var page = document.getElementById('page-learning');
    var onResearch = page && page.classList.contains('active');
    if (!onResearch && typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.research);
    self._inject();
    self._apply();
    var sections = self._resolveSections();
    var target = sections[key];
    if (target) setTimeout(function() { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, onResearch ? 0 : 200);
    RPGACE.hooks.fire('research:tab-changed');
  },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. Real, load-bearing external touchpoint: a sub-card click
  // handler elsewhere in this file calls
  // `RPGACE.modules.researchTabs.show(t.key)` directly. Also carries
  // this module's own internal calls: `init`'s timers and hook
  // listeners call `self._inject()`/`self._apply()`, and every ui
  // function above reaches its siblings through `self.X` — every one of
  // those `self`s is the module, so each lands here first and is
  // routed on to the right namespace.
  _activeTab: function() { return this.logic._activeTab(); },
  _resolveSections: function() { return this.ui._resolveSections(); },
  _inject: function() { return this.ui._inject(); },
  _apply: function() { return this.ui._apply(); },
  show: function(key) { return this.ui.show(key); },

});
/* ===END:researchTabs=== */
