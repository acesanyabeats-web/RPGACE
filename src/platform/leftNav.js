
/* ===MODULE:leftNav=== */
// Left slide-out navigation drawer (July 20). Replaces the old top
// .nav-tabs bar entirely (Alex's explicit request: "make the nav a menu on
// the left that has a button that brings it out with all the doms and sub
// doms. get rid of original nav with the left drop down list.").
//
// Owns: a hamburger toggle injected into the slim sticky .nav shell, the
// slide-out drawer panel, its backdrop, active-page highlighting, and the
// Research Lab / Schedule nested sub-navs. ALL overlay DOM is created via
// document.createElement and appended to document.body — never inside a
// .page div (the standing z-index click-intercept landmine).
//
// z-index: backdrop 10100, panel 10110 — above the app's 9998/9999 side
// panels + toasts (nav always reachable to escape an open side panel) but
// below dashDeck's 99999 popups (an open popup still wins if both are up;
// the drawer's plain showPage swap under it is accepted existing behaviour).
//
// Every nav row is wired via .onclick (JS property), NEVER an inline
// onclick="..." HTML attribute — main.js's frozen legacy [onclick*="..."]
// selectors must never match the drawer's buttons.
RPGACE.register('leftNav', {
  domain: 'platform',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 45 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // forty-four predecessors already shipped and verified. Pure
  // internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale,
  // never rewritten and never split down the middle. Bodies are
  // deliberately NOT re-indented inside their new namespace, matching
  // the docsLinks/encSync/journalQoL/shiftSync/knowledgeGap precedent,
  // so the diff shows only real changes rather than a whitespace wall.
  //
  // 12 real top-level keys, ALL of them functions — ZERO data fields,
  // declared or otherwise. Checked BOTH ways rather than assumed from
  // the shape: a direct read of every top-level key (`_items`, `init`,
  // `_initSwipeGesture`, `_injectStyles`, `_injectHamburger`,
  // `_buildDrawer`, `_renderItem`, `_go`, `toggle`, `open`, `close`,
  // `_syncActive`), and a grep of the whole module body for
  // `self.X =` / `this.X =` (0 hits), so this module has NONE of the
  // undeclared runtime-assigned field trap that journalQoL's
  // `_activeSource` and oracleDevBridge's `this.TABLE` both hit. Every
  // `X.Y =` write in the body is onto a locally-created DOM element
  // (`btn.id`, `row.className`, `s.dataset.page`, …) or a local
  // closure variable (`startX`/`startY`/`tracking` inside
  // `_initSwipeGesture`), never onto the module. `init` stays a
  // literal top-level function (RPGACE.register() calls `module.init()`
  // directly and cannot see into a sub-object) — byte-identical, its
  // own `self = this` genuinely IS the module, so its two
  // `_buildDrawer()` calls, its `page:show`/`research:tab-changed`
  // listeners, its Escape-key `close()` and its
  // `_initSwipeGesture()` call all still reach the right namespace
  // through the top-level pass-throughs below.
  //
  // This module splits 10 ui / 1 logic. Classification, function by
  // function, each checked against its actual body rather than its
  // name:
  //   • _initSwipeGesture → ui. Two `document.addEventListener` touch
  //     listeners, two `getElementById('ln-drawer')` reads and two
  //     `classList.contains('open')` reads. The swipe arithmetic
  //     (EDGE_ZONE / OPEN_THRESHOLD / CLOSE_THRESHOLD, the
  //     `Math.abs(dy) > Math.abs(dx)` vertical-scroll rejection) is
  //     inseparably a decision ABOUT the drawer element it just read.
  //   • _injectStyles → ui. Unambiguous: a `getElementById` idempotency
  //     guard, `createElement('style')`, a full CSS string build and
  //     `document.head.appendChild`.
  //   • _injectHamburger → ui. Unambiguous: `getElementById` guard,
  //     `querySelector('.nav')`, `createElement('button')`, an
  //     `onclick` assignment and `nav.insertBefore`.
  //   • _buildDrawer → ui. Unambiguous: `getElementById` guard, seven
  //     `createElement` calls, two `document.body.appendChild` handoffs
  //     and two `onclick` assignments. NOTE it is also the one real
  //     ui → logic caller in this module (`self._items()`) — see the
  //     cross-namespace note below.
  //   • _renderItem → ui. Unambiguous: it is handed a `list` element
  //     and builds a `.ln-card` button plus, for an item carrying
  //     `subItems`, a `.ln-subwrap` of `.ln-subcard` buttons — a dozen
  //     `createElement`/`appendChild`/`dataset`/`onclick` writes. The
  //     `subKind === 'research'` branch (kept on disk, harmlessly
  //     unused since researchTabs.TABS went permanently empty Aug 15)
  //     moves with it untouched, comment and all.
  //   • _go → ui. Two real reasons, either sufficient: it discovers DOM
  //     itself (`getElementById('page-' + page)`, the guard that exists
  //     because phylumPath's page shell is injected ~1500ms after load),
  //     and its whole remaining body is live page navigation
  //     (`showPage(page)` then `close()`) — the same "entire body is
  //     live page navigation is ui on dominant responsibility"
  //     precedent already applied elsewhere in this series.
  //   • toggle / open / close → ui. All three are pure drawer-element
  //     state machines: `getElementById('ln-drawer')` /
  //     `getElementById('ln-backdrop')`, `classList.add/remove/toggle`,
  //     `style.display` writes, and (in `open`) the deliberate
  //     double-`requestAnimationFrame` so the slide actually animates
  //     instead of snapping. Zero data work of any kind.
  //   • _syncActive → ui. `getElementById`, `querySelector('.page.active')`
  //     and three `querySelectorAll` sweeps writing `classList.toggle`.
  //     Its one non-DOM read (`researchTabs._activeTab()`) is only used
  //     to decide which class to toggle.
  //   • _items → logic. SEE THE DEDICATED NOTE BELOW — it is the one
  //     genuine call in this module, so it is argued rather than filed
  //     quietly.
  //
  // ─── _items: why the nav manifest is logic, not ui ────────────────
  // `_items` contains zero DOM of any kind — no `document.*`, no
  // `createElement`, no `innerHTML`, no `querySelector`/
  // `getElementById`, no listener (grepped, not assumed). Its entire
  // body is the `RPGACE.CONFIG.pages` readiness guard (the real July 22
  // ordering bug documented in its own comment) and a `return [...]` of
  // plain data objects: `{ icon, label, desc, page }`, some carrying a
  // `subItems` array of the same shape. Nothing in it is markup — the
  // `icon` values are emoji STRINGS inside a data record, not rendered
  // output, and `_renderItem` is what later turns each record into a
  // button. This is exactly the "returns a built STRING/record, never
  // assigned to innerHTML, never handed to a DOM element → logic"
  // precedent (jargonEncyclopedia's prompt builders, videoSummary's
  // `_key`/`_coerce`), not the "inseparable fetch+render" case: the
  // seam here already exists in the source as two separately named,
  // separately reachable functions, and `_items` returns its value to
  // its caller rather than drawing anything.
  //
  // ─── THE ONE DANGEROUS CROSS-NAMESPACE CALL ──────────────────────
  // `ui._buildDrawer` calls `self._items()`. That is the ONLY real
  // ui → logic call in this module, and it is the single most
  // dangerous line in the split: `_buildDrawer`'s pre-existing
  // `var self = this;` is swapped to the module handle IN PLACE, so
  // `self._items()` lands on the top-level pass-through and is routed
  // into `logic`. Left as `this.`, it would have read `ui._items`,
  // which does NOT exist on `ui` — and the failure would have been
  // SILENT rather than loud in the worst possible way: `_buildDrawer`
  // is called twice from `init` (once immediately, once on a 300ms
  // retry) and again from `toggle`/`open`'s lazy-build fallbacks, and a
  // TypeError there would have aborted the drawer build every time,
  // leaving the hamburger permanently opening nothing.
  //
  // `this`/`self` accounting for all 11 moved functions, so a later
  // reader can check by grep rather than take it on trust:
  //   • 4 already had `var self = this;` and get the module handle
  //     swapped in IN PLACE, never hoisted, so no control flow moved:
  //     ui._initSwipeGesture (captured for `self.open()`/`self.close()`
  //     inside its touchend handler), ui._injectHamburger (captured
  //     for the burger's `self.toggle()` onclick — and note it sits
  //     AFTER both early-return guards, neither of which touches
  //     `this`), ui._buildDrawer (the `self._items()` call above, plus
  //     `self.close()` for the backdrop/× onclicks and
  //     `self._renderItem(list, it)` per item — again declared after
  //     its own early-return guard), and ui._renderItem (captured for
  //     `self._go(it.page)`, `self._go(sub.page)` and `self.close()`).
  //   • 3 had no `var self` at all and used bare `this.X` calls —
  //     ui.toggle (`this._buildDrawer()`, `this.close()`, `this.open()`)
  //     and ui.open (`this._buildDrawer()`, `this._syncActive()`) each
  //     get the handle inserted as their first statement with every
  //     `this.` rewritten to `self.`, the videoPipeline pilot's own
  //     `var mod = RPGACE.modules.videoPipeline;` precedent; ui._go has
  //     exactly ONE `this` touch (`this.close();`) and is qualified
  //     directly to `RPGACE.modules.leftNav.close();` rather than
  //     gaining a one-use handle, keeping its short body short — the
  //     same call feynman.ui.closePanel already made. Left as `this.`,
  //     all three would have resolved against `ui`: `toggle`/`open`
  //     would have thrown on `ui._buildDrawer` (which does not exist
  //     there) on every hamburger press before init's retry landed, and
  //     `_go` would have thrown on `ui.close` after navigating,
  //     leaving the drawer stuck open over the new page.
  //   • 4 reference neither `this` nor `self` at all and moved
  //     completely untouched: ui._injectStyles, ui.close,
  //     ui._syncActive, logic._items.
  //
  // ─── EXTERNAL TOUCHPOINTS: two real ones, both LOAD-BEARING ───────
  // Named plainly rather than waved off, because both sit OUTSIDE the
  // register() block, immediately below `});` at the bottom of this
  // module — the July 22 "left sidebar takes ages to load" fix that
  // deliberately runs these two at script-parse time instead of behind
  // 'rpgace:ready':
  //   `RPGACE.modules.leftNav._injectStyles();`
  //   `RPGACE.modules.leftNav._injectHamburger();`
  // Both land on the top-level pass-throughs below. Had those been
  // omitted, this would have thrown UNCAUGHT MID-SCRIPT at parse time
  // and silently aborted every module registration after this point in
  // the file — the exact failure this module's own bottom comment
  // documents having already happened once (only 15 of ~40 modules
  // registered). That makes these two pass-throughs the highest-
  // consequence lines in this whole batch.
  // The alias check is clean: a repo-wide grep finds no
  // `var X = RPGACE.modules.leftNav;` local-alias site anywhere (unlike
  // knowledgeGap's `var kg = …` in dashDeck._openGaps). The dynamic-
  // lookup check is separately clean: the only real
  // `RPGACE.modules[variable]` site in the file is
  // contentProductionLive._findOracleCmdText, which reaches modules by
  // NAME STRING and then reads `.CMDS` — this module has no `CMDS`
  // field and is never named at any of its call sites. index.html has
  // zero references to it in any form (its one textual mention of
  // "leftNav" is inside a comment). The eight `"…": "leftNav"` entries
  // in this file's own METHOD_MODULE_MAP (G109, in the errorLog module)
  // are a generated name->module DATA table, not call sites, and are
  // unaffected by this split.
  // ══════════════════════════════════════════════════════════════════

  init: function() {
    var self = this;
    // _buildDrawer() reads RPGACE.CONFIG.pages via _items() - CONFIG isn't
    // defined until the `config` module's own registration further down
    // this file runs, so this must stay gated behind the normal
    // rpgace:ready path (init() already is). Building it here, not at
    // script-parse time alongside the instant hamburger below.
    //
    // Real ordering bug (found live July 22, pre-existing since this
    // module shipped): leftNav registers earlier in this file than
    // `config`, so when 'rpgace:ready' fires, THIS init() call always
    // runs before config.init() has set RPGACE.CONFIG - the first
    // _buildDrawer() call here always finds it missing. _items()/
    // _buildDrawer() now guard against that (return [] / bail rather
    // than throw or cache an empty shell), so this first call safely
    // no-ops; the setTimeout retry below runs after the same synchronous
    // 'rpgace:ready' pass has finished processing every module's queued
    // listener (config's included), by which point CONFIG is genuinely
    // set and the drawer builds for real.
    self._buildDrawer();
    setTimeout(function() { self._buildDrawer(); }, 300);
    // Active-page highlight sync. TOP-LEVEL listeners — NOT nested inside
    // another hook's callback (the mid-fire forEach landmine: a listener
    // added after rpgace:ready already fired would silently never run).
    RPGACE.hooks.on('page:show', function() { self._syncActive(); });
    RPGACE.hooks.on('research:tab-changed', function() { self._syncActive(); });
    // Escape closes the drawer.
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' || e.keyCode === 27) self.close();
    });
    self._initSwipeGesture();
  },

  // ============================================================
  // ui — rendering/DOM: everything that builds, discovers or mutates
  // the drawer's own DOM. The injected <style> block and the hamburger
  // button in the slim sticky .nav shell; the backdrop + slide-out
  // panel and the per-item .ln-card / .ln-subcard rows inside it; the
  // open/close/toggle element state machine (classList + style.display
  // + the double-rAF that makes the slide actually animate); the
  // edge-swipe gesture listeners; the active-page highlight sweep; and
  // the navigate-then-close handoff to showPage().
  // ============================================================
  ui: {

  // July 23 — swipe from the left edge to mid-screen opens the drawer,
  // matching native app drawer conventions. Deliberately NOT a live
  // finger-follow drag (that needs converting the drawer's CSS transition
  // into a JS-driven transform mid-gesture, real extra complexity) - a
  // simple start/end-position swipe reusing the EXISTING open()/close()
  // slide animation is the smaller, safer build for the same real result.
  _initSwipeGesture: function() {
    var self = RPGACE.modules.leftNav;
    var startX = null, startY = null, tracking = false;
    var EDGE_ZONE = 28, OPEN_THRESHOLD = 70, CLOSE_THRESHOLD = 60;

    document.addEventListener('touchstart', function(e) {
      if (!e.touches || !e.touches.length) return;
      var t = e.touches[0];
      var panel = document.getElementById('ln-drawer');
      var isOpen = panel && panel.classList.contains('open');
      // Only start tracking a gesture that could plausibly be "ours":
      // either starting right at the left edge (to open), or starting
      // anywhere while the drawer is already open (to close it).
      if (t.clientX <= EDGE_ZONE || isOpen) {
        startX = t.clientX; startY = t.clientY; tracking = true;
      } else {
        tracking = false;
      }
    }, { passive: true });

    document.addEventListener('touchend', function(e) {
      if (!tracking || startX === null) { tracking = false; return; }
      var t = (e.changedTouches && e.changedTouches[0]) || null;
      tracking = false;
      if (!t) return;
      var dx = t.clientX - startX, dy = t.clientY - startY;
      // Ignore mostly-vertical gestures (a normal scroll), only react to a
      // real horizontal swipe.
      if (Math.abs(dy) > Math.abs(dx)) return;
      var panel = document.getElementById('ln-drawer');
      var isOpen = panel && panel.classList.contains('open');
      if (!isOpen && dx > OPEN_THRESHOLD) self.open();
      else if (isOpen && dx < -CLOSE_THRESHOLD) self.close();
    }, { passive: true });
  },

  _injectStyles: function() {
    if (document.getElementById('ln-styles')) return;
    var st = document.createElement('style');
    st.id = 'ln-styles';
    st.textContent = [
      '#ln-burger{width:44px;height:44px;min-width:44px;display:flex;align-items:center;justify-content:center;background:none;border:none;color:var(--gold);font-size:20px;line-height:1;cursor:pointer;font-family:Rajdhani,sans-serif}',
      '#ln-burger:hover{color:var(--gold2)}',
      '#ln-backdrop{position:fixed;inset:0;background:rgba(8,8,16,0.6);z-index:10100;display:none;opacity:0;transition:opacity .28s var(--ease-out)}',
      '#ln-backdrop.open{opacity:1}',
      '#ln-drawer{position:fixed;top:0;left:0;height:100vh;width:min(280px,85vw);max-width:85vw;background:var(--darker);border-right:1px solid var(--border);z-index:10110;display:none;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.5);transform:translateX(-100%);transition:transform .28s var(--ease-drawer);font-family:Rajdhani,sans-serif;overflow-y:auto;overflow-x:hidden}',
      '#ln-drawer.open{transform:translateX(0)}',
      '#ln-hdr{display:flex;align-items:center;justify-content:space-between;padding:12px 8px 12px 16px;border-bottom:1px solid var(--border);flex-shrink:0}',
      '#ln-hdr .ln-brand{font-family:Cinzel,serif;font-size:14px;color:var(--gold);letter-spacing:2px;white-space:nowrap}',
      '.ln-close{width:44px;height:44px;background:none;border:none;color:var(--muted);font-size:24px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '.ln-close:hover{color:var(--text)}',
      '#ln-list{display:flex;flex-direction:column;gap:6px;padding:12px}',
      // Oct 10 2026 (N2 slice 5) — domain headings: the drawer is now the
      // only navigation, grouped by the same NAV_DOMAINS the popups use.
      '.ln-head{font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold);opacity:.8;margin:10px 2px 0}',
      '.ln-head:first-child{margin-top:0}',
      // Aug 4 restructure (Alex-requested): same dd-card visual identity as
      // dashDeck's dashboard grid - icon/title/desc, hover lift, gold active
      // state - single column (the drawer is 280px, dashDeck's 2-col grid
      // doesn't fit) rather than a flat button-row list.
      '.ln-card{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:9px 12px;display:flex;flex-direction:column;gap:3px;cursor:pointer;transition:border-color .2s,background .2s;width:100%;text-align:left}',
      '.ln-card:hover{border-color:var(--border2);background:var(--dark)}',
      '.ln-card.active{border-color:var(--gold);background:rgba(201,168,76,0.08)}',
      '.ln-card .ln-ctitle{display:flex;align-items:center;gap:8px;font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted)}',
      '.ln-card.active .ln-ctitle{color:var(--gold)}',
      '.ln-card:hover .ln-ctitle{color:var(--text)}',
      '.ln-count{margin-left:auto;min-width:22px;padding:1px 7px;border-radius:11px;background:var(--blue);color:#fff;font-size:12px;letter-spacing:0;text-align:center;font-variant-numeric:tabular-nums}',
      '.ln-card .ln-cdesc{font-family:Rajdhani,sans-serif;font-size:12px;color:var(--muted);opacity:.75;line-height:1.4}',
      // Research Lab's sub-tabs render as smaller inner cards nested right
      // beneath its own card (Alex's own framing: "inner cards showing
      // under") rather than an indented flat list.
      '.ln-subwrap{display:flex;flex-direction:column;gap:6px;margin:2px 4px 4px 18px;padding-left:10px;border-left:2px solid var(--border)}',
      '.ln-subcard{display:flex;align-items:center;gap:7px;width:100%;min-height:38px;padding:7px 10px;background:var(--dark);border:1px solid var(--border);border-radius:8px;color:var(--muted);font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;letter-spacing:.4px;text-align:left;cursor:pointer;transition:color .2s,border-color .2s,background .2s}',
      '.ln-subcard:hover{color:var(--text);border-color:var(--border2)}',
      '.ln-subcard.active{color:var(--gold);border-color:var(--gold);background:rgba(201,168,76,0.06)}',
      // Oct 15 2026 (KN-0): each area is a coloured band (icon, name, fold
      // chevron, one thin XP bar per realm) over its own entries.
      '.ln-area{display:flex;flex-direction:column;gap:6px}',
      '.ln-band{display:flex;flex-direction:column;gap:5px;width:100%;margin-top:8px;padding:9px 12px;border:1px solid var(--area-c);border-left-width:4px;border-radius:10px;background:color-mix(in srgb,var(--area-c) 12%,var(--darker));color:var(--text);cursor:pointer;text-align:left;font-family:Rajdhani,sans-serif;min-height:44px}',
      '.ln-band-top{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--area-c)}',
      '.ln-band-top .ln-chev{margin-left:auto;color:var(--muted);transition:transform .2s var(--ease-out)}',
      '.ln-area.folded .ln-chev{transform:rotate(-90deg)}',
      '.ln-area.folded .ln-abody{display:none}',
      '.ln-band.ln-band-go .ln-chev{font-size:18px;color:var(--area-c)}',
      '.ln-band.ln-band-go.active{background:rgba(201,168,76,0.12)}',
      '.ln-abody{display:flex;flex-direction:column;gap:6px}',
      '.ln-bars{display:flex;flex-direction:column;gap:3px}',
      '.ln-bar{display:grid;grid-template-columns:18px 1fr auto;align-items:center;gap:6px;font-size:11px;color:var(--muted);letter-spacing:.3px}',
      '.ln-bar-track{height:4px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden}',
      '.ln-bar-fill{height:100%;background:var(--area-c);transform-origin:left;transform:scaleX(0);transition:transform .4s var(--ease-out)}',
      '@media (prefers-reduced-motion: reduce){#ln-drawer,#ln-backdrop,.ln-bar-fill,.ln-chev{transition:none}}',
    ].join('');
    document.head.appendChild(st);
  },

  _injectHamburger: function() {
    if (document.getElementById('ln-burger')) return;
    var nav = document.querySelector('.nav');
    if (!nav) return;
    var self = RPGACE.modules.leftNav;
    var btn = document.createElement('button');
    btn.id = 'ln-burger';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open navigation menu');
    btn.textContent = '☰';
    btn.onclick = function() { self.toggle(); };
    nav.insertBefore(btn, nav.firstChild);
  },

  _buildDrawer: function() {
    if (document.getElementById('ln-drawer')) return;
    // THE one real ui -> logic call in this module: `self` MUST be the
    // module handle, not `this` (which is `ui` here) — `_items` lives in
    // `logic`, so `ui._items` does not exist. See the G53 block above.
    var self = RPGACE.modules.leftNav;
    var items = self._items();
    // CONFIG isn't ready yet (see _items' comment) - don't build an
    // empty, permanently-cached shell; bail out so a later retry (init()'s
    // own setTimeout below, or toggle()'s existing lazy-build fallback)
    // gets a real chance to build it with actual page data.
    if (!items.length) return;
    // Backdrop
    var back = document.createElement('div');
    back.id = 'ln-backdrop';
    back.onclick = function() { self.close(); };
    document.body.appendChild(back);
    // Panel
    var panel = document.createElement('div');
    panel.id = 'ln-drawer';
    panel.setAttribute('role', 'navigation');
    var hdr = document.createElement('div');
    hdr.id = 'ln-hdr';
    var brand = document.createElement('span');
    brand.className = 'ln-brand';
    brand.textContent = '⚔ RPGACE';
    var close = document.createElement('button');
    close.className = 'ln-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close navigation menu');
    close.textContent = '×';
    close.onclick = function() { self.close(); };
    hdr.appendChild(brand);
    hdr.appendChild(close);
    panel.appendChild(hdr);
    // FL-5 (Oct 27 2026): realm filter chips (Alex: "Keep domains, add realm filter").
    var chips = RPGACE.modules.leftNav.ui._realmChips();
    if (chips) panel.appendChild(chips);
    var list = document.createElement('div');
    list.id = 'ln-list';
    // Oct 15 2026 (KN-0): entries after a heading go inside that area's
    // band section so the whole area folds as one.
    var section = list;
    items.forEach(function(it) {
      if (it.heading) { section = RPGACE.modules.leftNav.ui._areaSection(list, it.heading, it.page); return; }
      self._renderItem(section, it);
    });
    panel.appendChild(list);
    document.body.appendChild(panel);
    RPGACE.modules.leftNav.ui.applyRealm(RPGACE.modules.leftNav.ui._savedRealm());
  },

  // FL-5: one chip per realm (+ All). Picking a realm shows only the menu
  // entries that feed it (realms from leftNav.logic.itemRealms) and opens
  // their bands; All puts the menu back as Alex left it. Kept per device.
  _realmChips: function() {
    var X = RPGACE.modules.xpSeason, ui = RPGACE.modules.leftNav.ui;
    if (!X || !X.ORDER) return null;
    var row = document.createElement('div');
    row.id = 'ln-realms';
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Filter the menu by realm');
    row.style.cssText = 'display:flex;gap:6px;overflow-x:auto;padding:6px 12px 8px;scrollbar-width:none;flex-shrink:0;';
    [''].concat(X.ORDER).forEach(function(k) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ln-realm'; b.dataset.realm = k;
      b.textContent = k ? X.REALMS[k].icon + ' ' + X.REALMS[k].name : 'All';
      b.style.cssText = 'flex:0 0 auto;min-height:36px;padding:4px 12px;border-radius:18px;border:1px solid var(--border);background:none;color:var(--text);font-size:13px;cursor:pointer;font-family:Rajdhani,sans-serif;white-space:nowrap;';
      b.onclick = function() { ui.applyRealm(k); try { localStorage.setItem('rpgace.ln.realm', k); } catch (e) {} };
      row.appendChild(b);
    });
    return row;
  },
  _savedRealm: function() { try { return localStorage.getItem('rpgace.ln.realm') || ''; } catch (e) { return ''; } },
  applyRealm: function(realm) {
    var panel = document.getElementById('ln-drawer');
    if (!panel) return;
    Array.prototype.forEach.call(panel.querySelectorAll('.ln-realm'), function(b) {
      var on = (b.dataset.realm || '') === (realm || '');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.style.background = on ? 'var(--gold)' : 'none';
      b.style.color = on ? '#111' : 'var(--text)';
      b.style.borderColor = on ? 'var(--gold)' : 'var(--border)';
    });
    Array.prototype.forEach.call(panel.querySelectorAll('.ln-card'), function(c) {
      var show = !realm || c.dataset.always === '1' || (' ' + (c.dataset.realms || '') + ' ').indexOf(' ' + realm + ' ') !== -1;
      c.hidden = !show;
      var sub = c.nextElementSibling;
      if (sub && sub.classList.contains('ln-subwrap')) sub.hidden = !show;
    });
    Array.prototype.forEach.call(panel.querySelectorAll('.ln-area'), function(a) {
      if (!realm) { a.hidden = false; if (a.dataset.filterOpened) { a.classList.add('folded'); delete a.dataset.filterOpened; } return; }
      var any = Array.prototype.some.call(a.querySelectorAll('.ln-card'), function(c) { return !c.hidden; });
      a.hidden = !any;
      if (any && a.classList.contains('folded')) { a.classList.remove('folded'); a.dataset.filterOpened = '1'; }
    });
  },

  // Aug 4 restructure (Alex-requested): "make the left nav the same
  // structure as dashboard - every card is a nav, research lab will have
  // the sub navs (inner cards) showing under." Builds a real dd-card-style
  // card per item instead of a plain button row; Research Lab's card is
  // immediately followed by its own .ln-subwrap of smaller inner cards
  // (one per researchTabs.TABS entry), same single-source-of-truth pattern
  // dashDeck._openResearch() already established for that tab list.
  _renderItem: function(list, it) {
    var self = RPGACE.modules.leftNav;
    if (it.heading) {
      var h = document.createElement('div');
      h.className = 'ln-head';
      h.textContent = it.heading;
      list.appendChild(h);
      return;
    }
    var row = document.createElement('button');
    row.className = 'ln-card';
    row.type = 'button';
    if (it.page) row.dataset.page = it.page;
    if (it.card) row.dataset.card = it.card;
    // FL-5: the realms this entry feeds, for the realm filter.
    var areaKey = list && list.parentNode && list.parentNode.dataset ? list.parentNode.dataset.area : '';
    row.dataset.realms = self.logic.itemRealms(it, areaKey).join(' ');
    if (!areaKey && !row.dataset.realms) row.dataset.always = '1';
    var title = document.createElement('div');
    title.className = 'ln-ctitle';
    title.textContent = it.icon + ' ' + it.label;
    // KN-6: a live count (filled by ui._fillCounts), hidden until known.
    if (it.count) { var cnt = document.createElement('span'); cnt.className = 'ln-count'; cnt.dataset.count = it.count; cnt.hidden = true; title.appendChild(cnt); }
    var desc = document.createElement('div');
    desc.className = 'ln-cdesc';
    desc.textContent = it.desc || '';
    row.appendChild(title);
    row.appendChild(desc);
    row.onclick = function() { self.ui.activate(it); };
    list.appendChild(row);

    // Sep 2 2026 — a real, generalized sub-card mechanism: any item can
    // carry `subItems` ([{icon,label,page}]), each rendered as a real
    // .ln-subcard navigating straight to its own page via _go(), same
    // visual language (.ln-subwrap/.ln-subcard, unchanged CSS) the old
    // research-tabs-specific subKind:'research' branch already used.
    if (it.subItems && it.subItems.length) {
      var wrap = document.createElement('div');
      wrap.className = 'ln-subwrap';
      it.subItems.forEach(function(sub) {
        var s = document.createElement('button');
        s.className = 'ln-subcard';
        s.type = 'button';
        if (sub.page) s.dataset.page = sub.page;
        s.textContent = sub.icon + ' ' + sub.label;
        // Oct 13 2026 (LL-2): a sub-card can also open a dashboard card or
        // run a small action (e.g. the Life Library filtered to books).
        s.onclick = function() { self.ui.activate(sub); };
        wrap.appendChild(s);
      });
      list.appendChild(wrap);
    } else if (it.subKind === 'research') {
      // Kept on disk, harmlessly unused (researchTabs.TABS has been
      // permanently empty since Aug 15 2026) — no remaining item sets this
      // subKind, `subItems` above is the real, live mechanism now.
      var rWrap = document.createElement('div');
      rWrap.className = 'ln-subwrap';
      var rt = RPGACE.modules.researchTabs;
      (rt && rt.TABS ? rt.TABS : []).forEach(function(t) {
        var s = document.createElement('button');
        s.className = 'ln-subcard';
        s.type = 'button';
        s.dataset.researchTab = t.key;
        s.textContent = t.label;
        s.onclick = function() {
          if (RPGACE.modules.researchTabs) RPGACE.modules.researchTabs.show(t.key);
          self.close();
        };
        rWrap.appendChild(s);
      });
      list.appendChild(rWrap);
    }
  },

  // Navigate to a page then close. Phylum Path's page shell is injected at
  // runtime (~1500ms after load) by phylumPath._injectPageShell — main.js's
  // showPage has no null guard on the target div, so guard here.
  // July 22 GODMODE finding: this unconditionally dereferenced
  // RPGACE.CONFIG.pages.phylumPath for EVERY click, regardless of which
  // page was clicked - if CONFIG somehow wasn't ready yet at click time,
  // this threw before ever reaching showPage()/this.close(), so the click
  // did nothing at all, silently, no error shown. Guarded defensively -
  // same principle as _items()'s guard just above.
  _go: function(page) {
    // Sep 26 2026 — generalized from the phylumPath-only guard this used to
    // be: jargonEncyclopedia's own new page shell is built on the same
    // late (setTimeout) boot-time schedule, so it can race a very early
    // click exactly the same way phylumPath already could. Real evidence
    // this was worth generalizing rather than adding a 2nd copy (rule 8):
    // both are late-injected pages reached via this same subItems path.
    var pages = RPGACE.CONFIG && RPGACE.CONFIG.pages ? RPGACE.CONFIG.pages : {};
    var LATE_PAGES = { phylumPath: 'Phylum Path', jargonEncyclopedia: 'Jargon', knowledge: 'Knowledge', beats: 'Beats', posting: 'Posting', library: 'Take in', screenshots: 'Screenshot Inbox', review: 'Review', study: 'Study' };
    for (var key in LATE_PAGES) {
      if (pages[key] && page === pages[key] && !document.getElementById('page-' + page)) {
        if (RPGACE.utils && RPGACE.utils.toast) RPGACE.utils.toast(LATE_PAGES[key] + ' still loading — try again in a moment', '#C9A84C', 2500);
        return;
      }
    }
    if (typeof showPage === 'function') showPage(page);
    // G53: one single `this` touch, qualified directly to the module
    // rather than gaining a one-use handle (feynman.ui.closePanel's own
    // precedent) — `this` is `ui` here, and `close` reaches the module's
    // top-level pass-through.
    RPGACE.modules.leftNav.close();
  },

  // Oct 10 2026 (N2 slice 5) — a nav entry can open a dashboard card
  // (a popup module: Cooking, Gym, Oversight...) instead of a page. Routed
  // through dashDeck._navOpenCard so N1's Back history and the popup's
  // domain crumb behave exactly as when the card was clicked.
  // Oct 21 2026 (SL-0): what tapping a menu entry does - shared by the
  // drawer rows and the ☰ side lists (RPGACE.sideList.areaGroup).
  activate: function(it) {
    var self = RPGACE.modules.leftNav;
    if (!it) return;
    if (it.run) { self.close(); it.run(); } else if (it.card) self._goCard(it.card); else if (it.page) self._go(it.page);
  },

  _goCard: function(key) {
    RPGACE.modules.leftNav.close();
    var dd = RPGACE.modules.dashDeck;
    if (dd && dd._navOpenCard) dd._navOpenCard(key);
  },

  toggle: function() {
    var self = RPGACE.modules.leftNav;
    var panel = document.getElementById('ln-drawer');
    if (!panel) { self._buildDrawer(); panel = document.getElementById('ln-drawer'); }
    if (panel && panel.classList.contains('open')) self.close(); else self.open();
  },

  open: function() {
    var self = RPGACE.modules.leftNav;
    var panel = document.getElementById('ln-drawer');
    var back = document.getElementById('ln-backdrop');
    if (!panel || !back) { self._buildDrawer(); panel = document.getElementById('ln-drawer'); back = document.getElementById('ln-backdrop'); }
    if (!panel || !back) return;
    self._syncActive();
    RPGACE.modules.leftNav.ui._fillBars();
    RPGACE.modules.leftNav.ui._fillCounts();
    back.style.display = 'block';
    panel.style.display = 'flex';
    // Force layout, then add .open on the next frame so the slide animates.
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        back.classList.add('open');
        panel.classList.add('open');
      });
    });
  },

  close: function() {
    var panel = document.getElementById('ln-drawer');
    var back = document.getElementById('ln-backdrop');
    if (!panel || !back) return;
    panel.classList.remove('open');
    back.classList.remove('open');
    setTimeout(function() {
      if (panel && !panel.classList.contains('open')) panel.style.display = 'none';
      if (back && !back.classList.contains('open')) back.style.display = 'none';
    }, 300);
  },

  _syncActive: function() {
    var panel = document.getElementById('ln-drawer');
    if (!panel) return;
    var activeDiv = document.querySelector('.page.active');
    var activePage = activeDiv ? activeDiv.id.replace('page-', '') : null;
    Array.prototype.forEach.call(panel.querySelectorAll('.ln-card'), function(r) {
      r.classList.toggle('active', r.dataset.page === activePage);
    });
    var rt = RPGACE.modules.researchTabs;
    var activeTab = (rt && rt._activeTab) ? rt._activeTab() : null;
    var onResearch = activePage === RPGACE.CONFIG.pages.research;
    Array.prototype.forEach.call(panel.querySelectorAll('.ln-subcard[data-research-tab]'), function(s) {
      s.classList.toggle('active', onResearch && s.dataset.researchTab === activeTab);
    });
    // Sep 2 2026 — the new, generalized subItems mechanism's own sub-cards
    // (real pages, not a research-tab key) highlight the same way the
    // top-level .ln-card rows already do.
    Array.prototype.forEach.call(panel.querySelectorAll('.ln-subcard[data-page]'), function(s) {
      s.classList.toggle('active', s.dataset.page === activePage);
    });
    // Oct 15 2026 (Alex: "roll up all tabs"): bands no longer open
    // themselves for the area you are in; a band that is a page button
    // (Oracle) is highlighted like a card.
    Array.prototype.forEach.call(panel.querySelectorAll('.ln-band[data-page]'), function(b) {
      b.classList.toggle('active', b.dataset.page === activePage);
    });
  },

  // KN-0: one area band + its body; returns the body to render entries into.
  // Oct 15 2026 (Alex): every band starts rolled up (only bands he opens
  // stay open, in rpgace.ln.open); a band with `page` is itself the button
  // to that page (Oracle) - no fold, no body.
  _areaSection: function(list, heading, page) {
    var ui = RPGACE.modules.leftNav.ui;
    var key = RPGACE.areaForLabel(heading), a = key ? RPGACE.AREAS[key] : null;
    var wrap = document.createElement('div');
    wrap.className = 'ln-area';
    if (key) wrap.dataset.area = key;
    wrap.style.setProperty('--area-c', a ? a.color : 'var(--gold)');
    if (!page && !(key && ui._foldedSet()[key])) wrap.classList.add('folded');
    var band = document.createElement('button');
    band.type = 'button';
    band.className = 'ln-band';
    band.setAttribute('aria-expanded', wrap.classList.contains('folded') ? 'false' : 'true');
    var top = document.createElement('div');
    top.className = 'ln-band-top';
    top.textContent = (a ? a.icon + ' ' : '') + heading;
    var chev = document.createElement('span');
    chev.className = 'ln-chev';
    chev.textContent = page ? '›' : '▾';
    top.appendChild(chev);
    if (page) { band.dataset.page = page; band.classList.add('ln-band-go'); band.removeAttribute('aria-expanded'); }
    band.appendChild(top);
    if (a && a.realms.length) {
      var bars = document.createElement('div');
      bars.className = 'ln-bars';
      a.realms.forEach(function(r) {
        var row = document.createElement('div');
        row.className = 'ln-bar';
        row.dataset.realm = r;
        row.innerHTML = '<span class="ln-bar-ic"></span><div class="ln-bar-track"><div class="ln-bar-fill"></div></div><span class="ln-bar-rk"></span>';
        bars.appendChild(row);
      });
      bars.style.display = 'none';
      band.appendChild(bars);
    }
    band.onclick = function() {
      if (page) { RPGACE.modules.leftNav._go(page); return; }
      var folded = wrap.classList.toggle('folded');
      band.setAttribute('aria-expanded', folded ? 'false' : 'true');
      if (key) ui._saveFold(key, folded);
    };
    wrap.appendChild(band);
    var body = document.createElement('div');
    body.className = 'ln-abody';
    wrap.appendChild(body);
    list.appendChild(wrap);
    return body;
  },

  // The bands Alex has opened (all others rolled up). Returns {key: 1}.
  _foldedSet: function() {
    try { return JSON.parse(localStorage.getItem('rpgace.ln.open') || '{}') || {}; } catch (e) { return {}; }
  },
  _saveFold: function(key, folded) {
    var f = RPGACE.modules.leftNav.ui._foldedSet();
    if (folded) delete f[key]; else f[key] = 1;
    try { localStorage.setItem('rpgace.ln.open', JSON.stringify(f)); } catch (e) {}
  },

  // KN-0: fill every realm bar from xpSeason (cached a minute). Bars stay
  // hidden when signed out or XP can't load.
  // KN-6: menu counts (Review = jargon waiting), from the owning module.
  _fillCounts: function() {
    var panel = document.getElementById('ln-drawer'), KR = RPGACE.modules.knowledgeReview;
    if (!panel || !KR || !KR.logic.pendingCount) return;
    var el = panel.querySelector('.ln-count[data-count="review"]');
    if (!el) return;
    KR.logic.pendingCount().then(function(n) {
      el.hidden = !n;
      el.textContent = n > 999 ? '999+' : String(n);
      el.setAttribute('aria-label', n + ' to review');
    }).catch(function() {});
  },
  _fillBars: function() {
    var X = RPGACE.modules.xpSeason, panel = document.getElementById('ln-drawer');
    if (!X || !X.logic.navBars || !panel) return;
    X.logic.navBars().then(function(map) {
      if (!map) return;
      Array.prototype.forEach.call(panel.querySelectorAll('.ln-bar'), function(row) {
        var r = row.dataset.realm, m = map[r], meta = X.REALMS[r];
        if (!m || !meta) return;
        row.querySelector('.ln-bar-ic').textContent = meta.icon;
        row.querySelector('.ln-bar-fill').style.transform = 'scaleX(' + m.pct.toFixed(3) + ')';
        row.querySelector('.ln-bar-rk').textContent = m.rank;
        row.title = meta.name + ': ' + m.rank + ' · ' + m.xp.toLocaleString('en-GB') + ' XP this Year';
        row.parentNode.style.display = '';
      });
    }).catch(function() {});
  },

  },

  // ============================================================
  // logic — business logic/data: the drawer's nav manifest. Zero DOM of
  // any kind; see the dedicated note in the G53 block above for why
  // returning a list of plain {icon,label,desc,page} records (which
  // ui._renderItem later turns into buttons) is data, not markup.
  // ============================================================
  logic: {

  // Top-level drawer items. `page` = a RPGACE.CONFIG.pages value.
  // `subKind` (optional): 'research' renders the 7 research tabs as sub-rows.
  // July 22 QoL: Schedule's own sub-nav (Daily/Weekly/Monthly/Import) removed
  // per direct request ("not needed") - Schedule's own in-page tab buttons
  // already do this job; having it twice was pure redundancy, not a feature.
  // FL-5: the realms a menu entry feeds - its card's realms, else its page
  // (an area page like Beats, or a mapped page slug), else its band's area.
  itemRealms: function(it, areaKey) {
    var X = RPGACE.modules.xpSeason || {}, A = RPGACE.AREAS || {}, pick = function(list) { return Array.isArray(list) && list.length ? list.slice() : null; };
    return pick(it.card && X.CARD_REALMS && X.CARD_REALMS[it.card])
      || pick(it.page && A[it.page] && A[it.page].realms)
      || pick(it.page && X.PAGE_REALMS && X.PAGE_REALMS[it.page])
      || pick(areaKey && A[areaKey] && A[areaKey].realms)
      || [];
  },

  _items: function() {
    // Real ordering bug, found live July 22 (not new - has existed
    // silently since this module shipped July 20): RPGACE.register()
    // queues every module's init() as a 'rpgace:ready' listener in FILE
    // REGISTRATION ORDER, and hooks.fire() runs that queue as a plain
    // forEach - no reordering. leftNav registers earlier in this file
    // than the `config` module, which is what actually sets
    // RPGACE.CONFIG (inside ITS OWN init(), not a bare top-level
    // assignment) - so leftNav.init() always ran before CONFIG existed.
    // This silently self-healed via toggle()'s own lazy-rebuild fallback
    // (by the time a user actually clicks the hamburger, config.init()
    // has long since run) - real in effect, but never actually fixed at
    // the root. Guard here + the retry in init() below fixes it properly.
    if (!RPGACE.CONFIG || !RPGACE.CONFIG.pages) return [];
    var P = RPGACE.CONFIG.pages;
    // Aug 4 restructure (Alex-requested): same card language as dashDeck's
    // #dd-grid (icon/title/desc, dd-card visual identity) instead of a
    // flat button-row list - every nav destination is now a real card,
    // not just a label. `desc` is new; `icon` replaces the old inline-emoji
    // convention so _renderItem can lay out icon/title/desc consistently.
    // Oct 10 2026 (N2 slice 5, Alex: "dashboard and left nav should be
    // deduplicated and sent into left nav only", grouped by domain) — the
    // drawer is now the ONE place to reach everything: every page plus
    // every dashboard card (card entries open the card's popup via
    // _goCard). Headings follow dashDeck.NAV_DOMAINS' domain names.
    // Record: records/2026-10/dashboard_landing_leftnav_paranoia_debate_2026-10-10.txt
    return [
      { icon: '🏠', label: 'Dashboard',     desc: 'Today, what\'s due, where you left off', page: P.dashboard },
      // Oct 15 2026 (Alex): the Oracle band itself opens Oracle - it had only one item.
      { heading: 'Oracle', page: P.oracle },
      { heading: 'Content & Video' },
      // BT-0 (Oct 16 2026): Beats home first in the Content band.
      // BT-7: the beat journey in step order under Beats home.
      { icon: '🥁', label: 'Beats', desc: 'Idea → Make → Mix → Log → Release → Sell', page: P.beats,
        subItems: [
          { icon: '💡', label: 'Idea Bank',        page: P.ideaBank },
          { icon: '📝', label: 'Beat Log',         page: P.beatLogPage },
          { icon: '🎬', label: 'My beats',         page: P.contentPipeline },
          // Opened through Beats so it gets the Beats ← Back / 🏠 row.
          { icon: '🎧', label: 'Reference tracks', page: P.musicworm, run: function() { var bh = RPGACE.modules.beatsHub; if (bh) bh.ui.go('refs'); } }
        ] },
      // PC-0 (Oct 17 2026): Posting home under Beats.
      { icon: '📣', label: 'Posting', desc: 'Idea → Plan → Record → Edit → Post', page: P.posting },
      // SH-0 (Oct 17 2026): Selling home under Posting.
      { icon: '💼', label: 'Selling', desc: 'Beats for sale · Artist outreach', page: P.selling },
      // SH-5b (Oct 17 2026): the shared Money page - also listed under Habits (Steward).
      { icon: '💷', label: 'Money', desc: 'In − out · subscriptions · receipts', page: P.money, run: function() { var mh = RPGACE.modules.moneyHub; if (mh) mh.open('selling'); } },
      // PC-6 (Oct 17 2026): the separate Content Pipeline entry (and its
      // Upload Workshop) is retired; My beats sits under Beats above.
      { heading: 'Knowledge' },
      // KN-6 (Oct 15 2026): the hub's 4 steps in order - Take in (Library,
      // Screenshots) -> Study (Bookworm + its worms) -> Learned (Encyclopedia,
      // Jargon) -> Map (Phylum Path) - then Review with its live count.
      // MusicWorm and Bibliography get sub-entries now (Alex's KN-6 go,
      // superseding the Sep 2 single-entry-point choice).
      // KR-8 (Oct 27 2026, Knowledge Rewire): Home · Take in · Study · Learned · Review.
      { icon: '🏠', label: 'Knowledge home', desc: 'What\'s next: take in, study, learned, review', page: P.knowledge },
      { icon: '📥', label: 'Take in', desc: 'Your Library: everything you took in (＋ to add)', page: P.library,
        subItems: [
          { icon: '📸', label: 'Screenshots', page: P.screenshots },
          { icon: '📚', label: 'Your books', run: function() { var m = RPGACE.modules.lifeLibrary; if (m) m.open({ filter: { kind: 'book' } }); } }
        ] },
      { icon: '📗', label: 'Study', desc: 'Bookworm, Videoworm, MusicWorm, exam practice', page: P.bookworm,
        subItems: [
          { icon: '🐛', label: 'Videoworm',    page: P.videoworm },
          { icon: '🎼', label: 'MusicWorm',    page: P.musicworm },
          { icon: '🎓', label: 'Exam practice', page: P.study, run: function() { var sh = RPGACE.modules.studyHub; if (sh) sh.open(); } }
        ] },
      { icon: '📖', label: 'Learned', desc: 'Write-ups, ideas and jargon', page: P.encyclopedia,
        subItems: [
          { icon: '📖', label: 'Jargon', page: P.jargonEncyclopedia },
          { icon: '🧬', label: 'Map (Phylum Path)', page: P.phylumPath }
        ] },
      { icon: '✅', label: 'Review', desc: 'Everything due: idea cards, exam redo, jargon', page: P.review, count: 'review' },
      { heading: 'Habits' },
      { icon: '🍳', label: 'Cooking',       desc: 'Recipes, stock, planned cooks',       card: 'cooking' },
      { icon: '🏋️', label: 'Gym',           desc: 'Today\'s workout, log, target, bests', card: 'gym' },
      { icon: '❤️', label: 'Health & body', desc: 'Food, weight, water, sleep', card: 'health' },
      { icon: '🛒', label: 'Shopping Wishlist', desc: 'Future purchases vs budget',     card: 'wishlist' },
      { icon: '💷', label: 'Money', desc: 'In − out · subscriptions · receipts', page: P.money, run: function() { var mh = RPGACE.modules.moneyHub; if (mh) mh.open('wishlist'); } },
      { heading: 'Schedule & Journal' },
      { icon: '☀️', label: 'My Day',        desc: 'Actions, plan my day, agenda',       page: P.agenda },
      { icon: '💡', label: 'Ideas',         desc: 'Every idea by realm: beats, posts, outings, new tasks', card: 'ideas' },
      { icon: '▶', label: 'Live now',       desc: 'The block you\'re in · new tasks · task catalogue', card: 'liveNow' },
      { icon: '📅', label: 'Calendar',      desc: 'Week, month, shifts and events',      page: P.schedule },
      { icon: '🧳', label: 'Plans',         desc: 'Trips, events, people to reach out to', card: 'plans' },
      { icon: '📓', label: 'Journal',       desc: 'Session logs, decisions',             page: P.journal },
      { icon: '🌅', label: 'Morning Brief', desc: 'Your day in one shot',                card: 'morningBrief' },
      { heading: 'Chronicles' },
      { icon: '📜', label: 'Chronicles',    desc: 'Every real win, sale, and expense',   page: P.chronicles },
      { heading: 'Oversight' },
      { icon: '📚', label: 'Oversight',     desc: 'Docs, smoke test, what works',        card: 'oversight' },
    ];
  },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. Two of these are LOAD-BEARING for a real external caller and
  // would fail LOUDLY (uncaught, mid-script, at parse time) if dropped:
  // `_injectStyles` and `_injectHamburger` are called on
  // `RPGACE.modules.leftNav` directly below this register() block, by
  // the July 22 "left sidebar takes ages to load" fix. The rest carry
  // this module's own internal calls — `init`'s two `_buildDrawer()`
  // calls, its `page:show`/`research:tab-changed` `_syncActive()`
  // listeners, its Escape-key `close()` and its `_initSwipeGesture()`;
  // `ui._buildDrawer`'s `_items()` (the one real ui -> logic hop) plus
  // its `close()`/`_renderItem()`; `ui._renderItem`'s two `_go()` calls
  // and its `close()`; `ui._initSwipeGesture`'s `open()`/`close()`;
  // `ui._injectHamburger`'s `toggle()`; and `ui.toggle`/`ui.open`'s own
  // `_buildDrawer()`/`close()`/`open()`/`_syncActive()` — every one of
  // those `self`s is the module, so each lands here first and is routed
  // on to the right namespace.
  _items: function() { return this.logic._items(); },
  _initSwipeGesture: function() { return this.ui._initSwipeGesture(); },
  _injectStyles: function() { return this.ui._injectStyles(); },
  _injectHamburger: function() { return this.ui._injectHamburger(); },
  _buildDrawer: function() { return this.ui._buildDrawer(); },
  _renderItem: function(list, it) { return this.ui._renderItem(list, it); },
  _go: function(page) { return this.ui._go(page); },
  _goCard: function(key) { return this.ui._goCard(key); },
  activate: function(it) { return this.ui.activate(it); },
  // SL-0: the menu entries under the given headings (sub-entries included).
  groupItems: function(headings) {
    var out = [], on = false;
    (this.logic._items() || []).forEach(function(it) {
      if (it.heading) { on = headings.indexOf(it.heading) !== -1; return; }
      if (!on) return;
      out.push(it);
      (it.subItems || []).forEach(function(sub) { out.push(sub); });
    });
    return out;
  },
  toggle: function() { return this.ui.toggle(); },
  open: function() { return this.ui.open(); },
  close: function() { return this.ui.close(); },
  _syncActive: function() { return this.ui._syncActive(); },

});
// July 22 QoL fix ("left sidebar takes ages to load"): the hamburger's
// anchor, .nav, is static HTML present in index.html from first paint -
// it doesn't depend on main.js's initApp() or any dynamic render. But
// _injectHamburger previously only ran inside init(), gated behind the
// full 'rpgace:ready' cascade for no real reason - neither
// _injectStyles() nor _injectHamburger() touch RPGACE.CONFIG or any
// other module's exports, so both are safe to run immediately at
// script-parse time, making the toggle button clickable well before the
// rest of the app finishes initializing.
//
// _buildDrawer() is deliberately NOT called here (real bug, found live
// July 22): it reads RPGACE.CONFIG.pages via _items(), and CONFIG isn't
// defined until the `config` module's own registration further down this
// same file runs. Calling it this early threw uncaught mid-script and
// silently aborted every module registration after this point in the
// file (uiBatchList, config itself, dashDeck, taxonomyTree, phylumPath,
// bookworm, and everything else — confirmed live: only 15 of ~40 modules
// had registered when this broke). _buildDrawer() stays on the normal
// init()-gated path; toggle()'s own existing lazy-build fallback already
// covers the rare case of a click landing before init() has run.
RPGACE.modules.leftNav._injectStyles();
RPGACE.modules.leftNav._injectHamburger();
/* ===END:leftNav=== */
