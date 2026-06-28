src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = "console.log('[RPGACE:config] CONFIG + RPGACE.sb ready');"

new = """console.log('[RPGACE:config] CONFIG + RPGACE.sb ready');

    // Override syncIntelData and startIntelPolling to re-apply our UI after every rerender
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

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: syncIntelData / startIntelPolling / loadIntelInsights intercepted")
else:
    print("ERROR: anchor not found")
