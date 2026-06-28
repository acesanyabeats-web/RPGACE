src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """    // Override syncIntelData and startIntelPolling to re-apply our UI after every rerender
    setTimeout(function() {
      function reapplyIntelUI() {
        if (RPGACE.modules.intelDelete && typeof RPGACE.modules.intelDelete._injectAll === 'function') {
          // Remove stale toggle so it gets re-injected fresh
          var tog = document.getElementById('kg-master-toggle');
          if (tog) tog.remove();
          var lst = document.getElementById('intel-collapsed-list');
          if (lst) lst.remove();
          // Reset di4 markers so injection re-runs on all cards
          document.querySelectorAll('[data-di4]').forEach(function(e) { delete e.dataset.di4; });
          RPGACE.modules.intelDelete._injectAll();
        }
      }

      if (typeof window.syncIntelData === 'function' && !window._syncIntelPatched) {
        window._syncIntelPatched = true;
        var _origSync = window.syncIntelData;
        window.syncIntelData = function() {
          var result = _origSync.apply(this, arguments);
          // Re-apply our UI 600ms after sync completes
          setTimeout(reapplyIntelUI, 600);
          return result;
        };
      }

      if (typeof window.startIntelPolling === 'function' && !window._pollPatched) {
        window._pollPatched = true;
        var _origPoll = window.startIntelPolling;
        window.startIntelPolling = function() {
          var result = _origPoll.apply(this, arguments);
          // Re-apply our UI 600ms after polling starts
          setTimeout(reapplyIntelUI, 600);
          return result;
        };
      }

      if (typeof window.loadIntelInsights === 'function' && !window._loadIntelPatched) {
        window._loadIntelPatched = true;
        var _origLoad = window.loadIntelInsights;
        window.loadIntelInsights = function() {
          var result = _origLoad.apply(this, arguments);
          setTimeout(reapplyIntelUI, 600);
          return result;
        };
      }

    }, 2000);"""

new = """    // Intercept intel rerenders immediately — non-destructive re-apply
    function reapplyIntelUI() {
      if (!RPGACE.modules.intelDelete) return;
      var id = RPGACE.modules.intelDelete;
      if (typeof id._injectAll !== 'function') return;

      // Only rebuild if the toggle is missing (genuine rerender happened)
      var toggleExists = !!document.getElementById('kg-master-toggle');
      if (toggleExists) return; // nothing to do — UI is intact

      // Rebuild collapsed list and toggle without touching di4 markers
      var cards = document.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]');
      if (cards.length === 0) return;
      var container = cards[0].parentElement;
      if (!container) return;

      // Remove stale list if any
      var old = document.getElementById('intel-collapsed-list');
      if (old) old.remove();

      // Hide full cards, inject toggle and collapsed list
      cards.forEach(function(c) { c.style.display = 'none'; });
      id._injectMasterToggle(container);

      // Re-inject DEL buttons on any cards missing them
      id._injectAll();
    }

    // Run immediately on ready
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(reapplyIntelUI, 500);
    });

    // Intercept intel functions — run immediately, not after 2s delay
    function patchIntelFns() {
      if (typeof window.syncIntelData === 'function' && !window._syncIntelPatched) {
        window._syncIntelPatched = true;
        var _origSync = window.syncIntelData;
        window.syncIntelData = function() {
          var result = _origSync.apply(this, arguments);
          setTimeout(reapplyIntelUI, 700);
          return result;
        };
      }
      if (typeof window.startIntelPolling === 'function' && !window._pollPatched) {
        window._pollPatched = true;
        var _origPoll = window.startIntelPolling;
        window.startIntelPolling = function() {
          var result = _origPoll.apply(this, arguments);
          setTimeout(reapplyIntelUI, 700);
          return result;
        };
      }
      if (typeof window.loadIntelInsights === 'function' && !window._loadIntelPatched) {
        window._loadIntelPatched = true;
        var _origLoad = window.loadIntelInsights;
        window.loadIntelInsights = function() {
          var result = _origLoad.apply(this, arguments);
          setTimeout(reapplyIntelUI, 700);
          return result;
        };
      }
    }
    // Patch immediately and again after 1s to catch late-loading functions
    patchIntelFns();
    setTimeout(patchIntelFns, 1000);"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: non-destructive reapplyIntelUI, immediate patch, no flicker")
else:
    print("ERROR: anchor not found")
