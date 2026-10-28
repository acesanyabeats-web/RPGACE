
/* ===MODULE:pathRouter=== */
// July 23 — Alex: "make rpgace a multi-page URL." Real GODMODE finding
// before building: vercel.json's catch-all rewrite ("/(.*)" -> "/index.html")
// already serves index.html for ANY path today, so a real URL per page
// needs zero server-side change - purely client-side pushState routing on
// top of the existing showPage()/page:show wrap. Council of 5 deliberately
// DECOUPLED this from the bigger, separate "split rpgace_core.js into
// multiple files" ask - that's a much higher-risk refactor (~40
// interdependent modules, a fragile already-documented rpgace:ready timing
// pattern) held back for its own dedicated pass, not bundled in here.
RPGACE.register('pathRouter', {
  domain: 'platform',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026) — real, ratified /CEO plan item, and the SEVENTEENTH
  // module to take this shape (after the videoPipeline/beatLog/bookworm/
  // phylumPath pilot, then contentProductionLive, conidPot, videoSummary,
  // questEngine, intelDelete, feynman, taxonomyReviewQueue, youtubeOracle,
  // tiktokOracle, instaOraclePanel, jargonEncyclopedia and
  // encyclopediaQoL): split into two internal namespaces, `ui`
  // (rendering/DOM) and `logic` (business logic/data), following the
  // exact shape those sixteen already shipped and verified. Pure
  // internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale,
  // never rewritten and never split down the middle.
  //
  // 6 real members: 5 functions and ONE plain data field,
  // `_syncingFromHistory` (checked by direct read of every top-level
  // key, not assumed). That field STAYS AT MODULE SCOPE and was not
  // moved — it is real cross-function state written by `init`'s
  // popstate closure and read by `_pushIfNeeded`, and a copy inside
  // `ui`/`logic` would be a second, divergent flag rather than the one
  // real one. `init` stays a literal top-level function (RPGACE.
  // register() calls `module.init()` directly and cannot see into a
  // sub-object) — byte-identical, its own `self = this` genuinely IS
  // the module, so its popstate closure still reads/writes the real
  // `self._syncingFromHistory` and still reaches `self._slugFromPath`
  // through the top-level pass-through below.
  //
  // Unlike the other two modules in this batch, this one splits for
  // real: 3 functions in `logic`, 1 in `ui`. Classification, function
  // by function, each checked against its actual body rather than its
  // name:
  //   • _validSlugs → logic. Reads RPGACE.CONFIG, Object.keys, map.
  //     Zero DOM, zero navigation, pure derivation.
  //   • _slugFromPath → logic. String normalisation plus a membership
  //     test against _validSlugs(). Zero DOM. It reads the `pathname`
  //     it is GIVEN as an argument — it does not reach for `location`
  //     itself — so it is pure even of browser state.
  //   • _routeFromCurrentURL → ui. Contains zero literal DOM keywords,
  //     and is classified `ui` anyway on DOMINANT RESPONSIBILITY, per
  //     the established precedent already shipped for
  //     phylumPath._jumpToNode, bookworm._goToDashboard and
  //     instaOraclePanel._intercept: its entire job is deciding and
  //     driving which page the user sees, via a real `showPage(slug)`
  //     call. Classified by what it actually does, never by keyword
  //     match.
  //   • _pushIfNeeded → logic. SEE THE DEDICATED NOTE BELOW — this was
  //     the one genuinely open call in this batch and is named here
  //     rather than decided quietly.
  //
  // ─── _pushIfNeeded: the open call, both readings stated ───────────
  // Superficially it looks like _routeFromCurrentURL's twin: both touch
  // `location.pathname` and a `history.*` method, neither touches
  // `document`. Two real, defensible readings existed:
  //   (a) `ui`, for symmetry — both are "URL/history management", they
  //       are a matched push/read pair, and a reader looking for one
  //       would expect to find the other beside it. `history.pushState`
  //       also has a genuinely user-visible effect (the address bar,
  //       and what the Back button will do next).
  //   (b) `logic` — it never drives what the user sees. It is called
  //       FROM the `page:show` hook, i.e. AFTER a navigation has
  //       already been performed by someone else, and its whole job is
  //       keeping the browser's URL record consistent with the page
  //       that is already showing. It calls no `showPage`, renders
  //       nothing, constructs nothing, reads no element. Its body is
  //       three guards and one state write.
  // (b) was chosen, and (a) rejected, for two real reasons. First, the
  // dominant-responsibility precedent invoked above exists specifically
  // for functions whose job IS live navigation; _pushIfNeeded's job
  // explicitly is not, so applying that override here would be
  // extending a precedent past the thing it was created for. Second,
  // classifying it `ui` purely because it resembles its sibling would
  // be shape-matching — the exact reasoning this pass's own rules warn
  // against ("classify by what the function actually DOES, never by
  // keyword-match alone"). `history.pushState` is a state write to the
  // session history record, closer in kind to a persistence call than
  // to a render; and `history` cannot itself be the discriminator here,
  // since _routeFromCurrentURL's own `history.replaceState` is
  // incidental to the `showPage` call that actually earns it `ui`.
  // The honest cost of (b), stated rather than hidden: the push/read
  // pair now lives in two different namespaces, which is a small
  // readability loss. That is the trade, made deliberately.
  //
  // `this`/`self` accounting for all 4 moved functions, so a later
  // reader can check by grep rather than take it on trust:
  //   • _validSlugs — references neither `this` nor `self`; moved
  //     byte-identical, no handle needed and none added.
  //   • _slugFromPath — used bare `this._validSlugs()`; a module handle
  //     is inserted as its first statement and the call rewritten to
  //     `self._validSlugs()`. Left as `this.`, it would have read
  //     `logic._validSlugs` — which DOES exist on `logic`, so this one
  //     would have kept working by luck rather than by design; it is
  //     requalified anyway so the module never depends on two
  //     functions happening to share a namespace.
  //   • _routeFromCurrentURL — used bare `this._slugFromPath(...)`;
  //     handle inserted as its first statement, call rewritten to
  //     `self.`. This one genuinely WOULD have broken: `_slugFromPath`
  //     lives in `logic`, so `this._slugFromPath` inside `ui` is
  //     undefined — a real TypeError on every login, killing deep-link
  //     routing entirely.
  //   • _pushIfNeeded — read bare `this._syncingFromHistory`; handle
  //     inserted as its first statement, read rewritten to `self.`.
  //     THIS IS THE MOST DANGEROUS ONE IN THE MODULE and it fails
  //     SILENTLY rather than loudly: left as `this.`, it would have
  //     read `logic._syncingFromHistory`, which is `undefined` and
  //     therefore always falsy, so the re-entrancy guard would never
  //     fire. The real consequence: during a Back-button navigation,
  //     `init`'s popstate handler calls `showPage`, which fires
  //     `page:show`, which calls this function — and with the guard
  //     dead it would pushState a NEW history entry while the user is
  //     travelling backwards through history. No error, no warning,
  //     just a browser Back button that stops working correctly.
  // ══════════════════════════════════════════════════════════════════

  _syncingFromHistory: false,

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:login', function() { self._routeFromCurrentURL(); });
    RPGACE.hooks.on('page:show', function(name) { self._pushIfNeeded(name); });
    // NOTE: not `global.addEventListener` - this module is defined AFTER
    // the outer IIFE's own closing `})(window);` (line 510), so the IIFE's
    // `global` parameter is out of scope here entirely. Real bug found via
    // testing (the listener silently never attached, "global is not
    // defined" in the module-init failure log) - every other module past
    // that point correctly uses `window`/bare globals instead.
    window.addEventListener('popstate', function(e) {
      // Going back to the root URL (no page pushed onto that history
      // entry, e.g. the very first page load) has neither e.state.page
      // nor a recognizable path - falling through would silently leave
      // whatever page was already showing on screen, un-navigated.
      // Default to the dashboard in that case rather than doing nothing.
      // Oct 10 2026 (N1): an open popup closes first; the page stays put.
      var dd = RPGACE.modules.dashDeck;
      if (dd && dd._navOnPopstate && dd._navOnPopstate(e)) return;
      var pages = RPGACE.CONFIG && RPGACE.CONFIG.pages;
      var name = (e.state && e.state.page) || self._slugFromPath(location.pathname) || (pages && pages.dashboard);
      if (!name) return;
      self._syncingFromHistory = true;
      if (typeof showPage === 'function') showPage(name);
      self._syncingFromHistory = false;
      // Oct 10 2026 (N1): a popup's entry reopens the card it belonged to.
      if (dd && dd._navAfterPage) dd._navAfterPage(e.state);
    });
  },

  // ============================================================
  // logic — business logic/data: no DOM, pure computation + state.
  // Slug derivation/validation, plus the history-record sync that
  // keeps the URL consistent with the already-showing page (see the
  // dedicated _pushIfNeeded note in the G53 block above for why that
  // one lands here and not in `ui`).
  // ============================================================
  logic: {

    _validSlugs: function() {
      var pages = RPGACE.CONFIG && RPGACE.CONFIG.pages;
      if (!pages) return [];
      return Object.keys(pages).map(function(k) { return pages[k]; });
    },

    _slugFromPath: function(pathname) {
      var self = RPGACE.modules.pathRouter;
      var slug = (pathname || '/').replace(/^\/+/, '').replace(/\/+$/, '');
      return self._validSlugs().indexOf(slug) !== -1 ? slug : null;
    },

    _pushIfNeeded: function(name) {
      var self = RPGACE.modules.pathRouter;
      if (self._syncingFromHistory) return;
      if (!name) return;
      var target = '/' + name;
      if (location.pathname === target) return;
      try { history.pushState({ page: name }, '', target); } catch (e) {}
    },

  },

  // ============================================================
  // ui — the one function here whose real job is driving which page
  // the user actually sees (a live showPage() navigation), classified
  // on dominant responsibility per the established precedent, despite
  // containing no literal DOM keyword of its own.
  // ============================================================
  ui: {

    // Runs once, right after real login (never before - #app is hidden and
    // showPage() has nothing to act on pre-login). Reads whatever page the
    // URL already names (a bookmark, a shared link, a hard refresh on a
    // deep page) and shows it instead of always defaulting to the dashboard.
    _routeFromCurrentURL: function() {
      var self = RPGACE.modules.pathRouter;
      var slug = self._slugFromPath(location.pathname);
      if (slug && typeof showPage === 'function') {
        showPage(slug);
      } else {
        // No recognizable page in the URL (a fresh "/" visit) - dashboard is
        // already showing from the raw HTML default, but give this root
        // entry real state too, so a later "back" to it lands on a properly
        // recognized page instead of relying on the popstate fallback.
        var pages = RPGACE.CONFIG && RPGACE.CONFIG.pages;
        if (pages && pages.dashboard) {
          try { history.replaceState({ page: pages.dashboard }, '', location.pathname); } catch (e) {}
        }
      }
    },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. No external caller invokes any METHOD of this module (verified
  // by grep of rpgace_core.js and index.html both, and of the whole repo
  // for `RPGACE.modules.pathRouter.` — zero hits outside this module's
  // own body; the module is driven entirely by the two hooks and the
  // popstate listener that `init` registers), so these exist for
  // convention and for its OWN internal calls: `init`'s rpgace:login
  // hook calls `self._routeFromCurrentURL()`, its page:show hook calls
  // `self._pushIfNeeded(name)`, its popstate closure calls
  // `self._slugFromPath(...)`, and `logic._slugFromPath` itself reaches
  // `self._validSlugs()` — every one of those `self`s is the module, so
  // each lands here first and is routed on to the right namespace.
  _validSlugs: function() { return this.logic._validSlugs(); },
  _slugFromPath: function(pathname) { return this.logic._slugFromPath(pathname); },
  _pushIfNeeded: function(name) { return this.logic._pushIfNeeded(name); },
  _routeFromCurrentURL: function() { return this.ui._routeFromCurrentURL(); },

});
/* ===END:pathRouter=== */
