
/* ===MODULE:encyclopediaQoL=== */
// July 22 QoL request: "no real search, disconnected from taxonomy tree,
// no sense of what's actually been used." GODMODE evidence pass found:
// - Search: Encyclopedia only ever had category filter + sort-workflow
//   tabs (main.js setEncCategory/setEncSort) - no keyword search existed.
// - Taxonomy: encTaxonomyLink (this file) already tracks/shows link status
//   via entry.taxonomy_node_id - genuinely NOT disconnected - but the
//   status badge only ever appears in the EXPANDED per-entry view, so
//   Alex would have to open every card individually to see it. That's a
//   real visibility gap, not a missing feature.
// - Usage tracking ("what's actually been used"): confirmed via schema
//   check - the encyclopedia table has no applied/used column at all.
//   A real tracking mechanism needs a new column (a migration, Tier 3) -
//   deliberately NOT added here without Alex's explicit go; flagged in
//   patch_notes instead of guessed at.
//
// Search implementation: filters ALREADY-RENDERED cards by textContent
// match rather than re-deriving main.js's own filter/sort logic - avoids
// duplicating frozen-file behaviour, and re-applies after every
// re-render (wraps window.renderEncEntries, same established pattern as
// encTaxonomyLink just above) so it survives category/sort clicks.
RPGACE.register('encyclopediaQoL', {
  domain: 'knowledge',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026) — real, ratified /CEO plan item, and the SIXTEENTH
  // module to take this shape (after the videoPipeline/beatLog/bookworm/
  // phylumPath pilot, then contentProductionLive, conidPot, videoSummary,
  // questEngine, intelDelete, feynman, taxonomyReviewQueue, youtubeOracle,
  // tiktokOracle, instaOraclePanel and jargonEncyclopedia): split into two
  // internal namespaces, `ui` (rendering/DOM) and `logic` (business
  // logic/data), following the exact shape those fifteen already shipped
  // and verified. Pure internal-structure refactor — zero functional,
  // behavioural, UX, data or schema change; every function below was
  // MOVED wholesale, never rewritten and never split down the middle.
  //
  // 4 real members, all functions, no data fields (checked by direct
  // read of every top-level key, not assumed). `init` stays a literal
  // top-level function (RPGACE.register() calls `module.init()`
  // directly and cannot see into a sub-object) — byte-identical,
  // including its `window.renderEncEntries` wrap, whose inner closure
  // still calls `self._injectTaxBadges()`/`self._applySearch()` against
  // the module and therefore lands on the top-level pass-throughs.
  //
  // REAL, HONEST RESULT WORTH NAMING RATHER THAN HIDING: all 3 movable
  // functions land in `ui`, and `logic` below is genuinely EMPTY — the
  // second module in this batch where that is the true answer. Each
  // body was grepped BOTH ways before concluding this (for DOM
  // keywords, and separately for anything that ISN'T DOM-related — a
  // real computation, a Supabase call, an Oracle call), rather than
  // reading names or taking a prior description on trust:
  //   • _injectSearchBar — getElementById ×2, createElement,
  //     addEventListener, insertBefore. DOM throughout; no computation
  //     of any kind.
  //   • _applySearch — reads the live input's `.value`, querySelectorAll
  //     over the rendered cards, and sets `card.style.display`. Its
  //     only "computation" is an inline `.toLowerCase().indexOf()`
  //     against each card's own `textContent` — that is a read OF the
  //     DOM, not a separable business rule, and this module's own
  //     header note above says so outright: it deliberately filters
  //     ALREADY-RENDERED cards rather than re-deriving the underlying
  //     filter/sort logic. There is no data-layer half to extract.
  //   • _injectTaxBadges — querySelectorAll, dataset read/write,
  //     querySelector ×2, createElement, appendChild. It does hold one
  //     genuinely non-DOM line (a `.find()` over
  //     `window.ENC_ALL_ENTRIES`), but that lookup is keyed on a
  //     `data-entry-id` attribute read out of the card being iterated,
  //     inside the per-card DOM loop — extracting it would mean
  //     splitting the function down the middle, which this pass's own
  //     rules forbid. Moved wholesale to `ui`, correctly.
  // Zero Supabase reads/writes and zero Oracle calls exist anywhere in
  // this module — it is purely a presentation layer over data other
  // modules already fetched, which is exactly why `logic` is empty. The
  // empty `logic: {}` is kept deliberately so the module still presents
  // the same two-namespace shape as its fifteen siblings, with the
  // emptiness stated outright rather than silently omitted.
  //
  // `this`/`self` accounting for all 3 moved functions, so a later
  // reader can check by grep rather than take it on trust:
  //   • _injectSearchBar — already had `var self = this;`, that one
  //     line swapped for the module handle IN PLACE (it sits after the
  //     three early-return guards, none of which touch `this`), so
  //     statement order is literally unchanged. Left as `this`, the
  //     input listener's `self._applySearch()` would have resolved
  //     against `ui`, which has no such key — a real TypeError on
  //     every keystroke in the search box.
  //   • _applySearch — references neither `this` nor `self`; moved
  //     byte-identical, no handle needed and none added.
  //   • _injectTaxBadges — same: no `this`/`self` anywhere in its body
  //     (its inner `forEach` callback closes over nothing from the
  //     module), moved byte-identical.
  // ══════════════════════════════════════════════════════════════════

  init: function() {
    var self = this;
    function patch() {
      if (typeof window.renderEncEntries !== 'function' || window._encQoLPatched) return;
      window._encQoLPatched = true;
      var orig = window.renderEncEntries;
      window.renderEncEntries = function() {
        var result = orig.apply(this, arguments);
        setTimeout(function() {
          self._injectTaxBadges();
          self._applySearch();
        }, 60);
        return result;
      };
    }
    patch();
    setTimeout(patch, 1500);
    setTimeout(function() { self._injectSearchBar(); }, 1500);
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.encyclopedia) setTimeout(function() { self._injectSearchBar(); }, 300);
    });
  },

  // ============================================================
  // logic — business logic/data: no DOM, pure computation + writes.
  // Genuinely EMPTY for this module (see the G53 note above): all 3
  // movable functions touch the DOM directly, and this module makes no
  // Supabase or Oracle calls at all. Kept rather than omitted so the
  // two-namespace shape matches its fifteen siblings and the emptiness
  // is stated, not silent.
  // ============================================================
  logic: {},

  // ============================================================
  // ui — rendering/DOM: injects the search input into the Encyclopedia
  // control row, filters the already-rendered cards, and stamps the
  // taxonomy-link status badge onto each card's visible header row.
  // ============================================================
  ui: {

    _injectSearchBar: function() {
      if (document.getElementById('enc-search-input')) return;
      var countEl = document.getElementById('enc-count');
      var controlsRow = countEl ? countEl.parentElement : null;
      if (!controlsRow) return;
      var self = RPGACE.modules.encyclopediaQoL;

      var input = document.createElement('input');
      input.type = 'text';
      input.id = 'enc-search-input';
      input.placeholder = '🔍 Search entries...';
      input.style.cssText = 'flex:1;min-width:160px;background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 12px;font-size:13px;font-family:Rajdhani,sans-serif;outline:none';
      input.addEventListener('input', function() { self._applySearch(); });
      controlsRow.insertBefore(input, countEl);
    },

    _applySearch: function() {
      var input = document.getElementById('enc-search-input');
      var term = input ? input.value.trim().toLowerCase() : '';
      var cards = document.querySelectorAll('#enc-output > div[id^="enc-card-"]');
      Array.prototype.forEach.call(cards, function(card) {
        var match = !term || card.textContent.toLowerCase().indexOf(term) !== -1;
        card.style.display = match ? '' : 'none';
      });
    },

    // Surfaces the SAME entry.taxonomy_node_id status encTaxonomyLink
    // already tracks, but in the always-visible header row instead of only
    // after expanding - the data-entry-id attribute is already present in
    // each card's expanded section (just visually hidden, not absent from
    // the DOM), so this reads it directly rather than recomputing anything.
    _injectTaxBadges: function() {
      var cards = document.querySelectorAll('#enc-output > div[id^="enc-card-"]');
      Array.prototype.forEach.call(cards, function(card) {
        if (card.dataset.taxBadge) return;
        card.dataset.taxBadge = '1';
        var idHolder = card.querySelector('[data-entry-id]');
        var id = idHolder ? idHolder.getAttribute('data-entry-id') : null;
        var entry = (window.ENC_ALL_ENTRIES || []).find(function(e) { return String(e.id || e.created_at) === String(id); });
        // Header row is the div with the toggleEncEntry onclick; its first
        // child wraps [title div, meta div] - meta is that wrapper's last
        // child. Explicit structural knowledge from the real markup, not a
        // generic nth-child guess that could match the wrong nested div.
        var headerRow = card.querySelector('[onclick^="toggleEncEntry"]');
        var metaRow = headerRow && headerRow.firstElementChild && headerRow.firstElementChild.lastElementChild;
        if (!entry || !metaRow) return;
        var badge = document.createElement('span');
        if (entry.taxonomy_node_id) {
          badge.textContent = ' · 🌳 Linked';
          badge.style.color = '#4CAF82';
        } else {
          badge.textContent = ' · ○ Not yet placed';
          badge.style.color = 'rgba(226,226,236,0.35)';
        }
        metaRow.appendChild(badge);
      });
    },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. No external caller invokes any METHOD of this module (verified
  // by grep of rpgace_core.js and index.html both, and of the whole repo
  // for `RPGACE.modules.encyclopediaQoL.` — zero hits outside this
  // module's own body), so these exist for convention and for its OWN
  // internal calls: `init`'s `window.renderEncEntries` wrap calls
  // `self._injectTaxBadges()` and `self._applySearch()`, its two timers/
  // page:show hook call `self._injectSearchBar()`, and `ui.
  // _injectSearchBar`'s input listener calls `self._applySearch()` —
  // every one of those `self`s is the module, so each lands here first.
  _injectSearchBar: function() { return this.ui._injectSearchBar(); },
  _applySearch: function() { return this.ui._applySearch(); },
  _injectTaxBadges: function() { return this.ui._injectTaxBadges(); },

});
/* ===END:encyclopediaQoL=== */
