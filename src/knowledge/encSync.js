
/* ===MODULE:encSync=== */
RPGACE.register('encSync', {
  domain: 'knowledge',

  // G53 (Sep 2026), module 26 of 60. init stays literal top-level.
  // All 3 movable functions are zero-DOM (localStorage/global-function
  // wrapping/keyword-scan+taxonomy-write logic, no document.* anywhere)
  // - all land in logic, ui is genuinely empty, the honest inverse of
  // the "empty logic" precedent already shipped 4x this series. _patch
  // had `var self = this;` requalified to the module handle (it's
  // captured by two later closures calling `self._clearBacklog()`/
  // `self._autoPropose(...)`, both cross-namespace-safe once inside
  // logic since all three land there together). Zero external
  // touchpoints confirmed via repo-wide grep. Handled directly given
  // the trivial scope (no real judgment call - the DOM-keyword rule
  // is unambiguous here).
  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self._patch(); });
  },

  logic: {

  _clearBacklog: function() {
    /* Wipe URL queue so next sync doesn't reimport the same items */
    var hadUrls = !!localStorage.getItem('rpgace_enc_saved');
    localStorage.removeItem('rpgace_enc_saved');
    localStorage.removeItem('rpgace_intel_insights');
    return hadUrls;
  },

  _patch: function() {
    if (window._encSyncPatched) return;
    var fn = window.syncAndPush;
    var clr = window.clearEncyclopedia;
    if (!fn || !clr) return;

    window._encSyncPatched = true;
    var self = RPGACE.modules.encSync;

    /* ── Patch syncAndPush ── */
    window.syncAndPush = function() {
      var before = 0;
      try {
        var prev = JSON.parse(localStorage.getItem('rpgace_encyclopedia') || '[]');
        before = prev.length;
      } catch(e) {}

      fn.apply(this, arguments);

      /* Give the original function time to finish (it likely does fetch/setState) */
      setTimeout(function() {
        self._clearBacklog();

        try {
          var after = JSON.parse(localStorage.getItem('rpgace_encyclopedia') || '[]');
          var net = after.length - before;
          var msg = net > 0
            ? '✅ ' + net + ' new entries added'
            : net === 0
              ? '✓ Already up to date'
              : '✓ Sync complete';
          RPGACE.utils.toast(msg, 'rgba(201,168,76,0.9)', 3500);
          if (typeof window.refreshEncyclopediaDisplay === 'function') {
            window.refreshEncyclopediaDisplay();
          }
          self._autoPropose(after);
        } catch(e) {}
      }, 2500);
    };

    /* ── Patch clearEncyclopedia ── */
    window.clearEncyclopedia = function() {
      self._clearBacklog();
      clr.apply(this, arguments);
      RPGACE.utils.toast('?? Encyclopedia + backlog cleared', 'rgba(226,84,84,0.9)', 2500);
    };

    console.log('[RPGACE:encSync] Patched syncAndPush + clearEncyclopedia');
  },

  // F5: silent taxonomy_proposals queueing for Encyclopedia entries, same
  // pattern/guard as ciAutoPropose's F4 hook on Content Intelligence. Capped
  // at 5 checks per sync so one big backlog sync can't fire a burst of
  // Oracle calls.
  _autoPropose: function(entries) {
    if (!RPGACE.utils._quickPhylaScan || !RPGACE.modules.taxonomyTree) return;
    if (RPGACE.modules.taxonomyTree.logic.isPaused()) { RPGACE.modules.taxonomyTree.logic.checkPaused(); return; } // LL-3
    var guard = localStorage.getItem('rpgace_enc_proposed') || '';
    var queued = 0, checked = 0;
    (entries || []).forEach(function(e) {
      if (checked >= 5) return;
      var key = (e.title || '').toLowerCase().trim();
      if (!key || guard.indexOf('|' + key + '|') !== -1) return;
      checked++;
      guard += '|' + key + '|';
      var blob = (e.title || '') + ' ' + (e.content || '');
      if (blob.length < 60) return;
      var matches = RPGACE.utils._quickPhylaScan(blob);
      if (matches.length === 0) return;
      RPGACE.modules.taxonomyTree.silentPropose(blob.slice(0, 300), matches[0].num, 'encyclopedia', e.id || null)
        .catch(function(err) { console.warn('[encSync] silentPropose failed:', err.message); });
      queued++;
    });
    localStorage.setItem('rpgace_enc_proposed', guard);
    if (queued > 0) {
      RPGACE.utils.toast('🌳 ' + queued + ' taxonomy proposal' + (queued > 1 ? 's' : '') + ' queued for review', 'rgba(155,89,182,0.85)', 3000);
    }
  },

  },

  ui: {},

  _clearBacklog: function() { return this.logic._clearBacklog(); },
  _patch: function() { return this.logic._patch(); },
  _autoPropose: function(entries) { return this.logic._autoPropose(entries); },

});
/* ===END:encSync=== */
