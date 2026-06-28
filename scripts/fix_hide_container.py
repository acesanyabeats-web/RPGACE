src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """    // Intercept intel rerenders immediately — non-destructive re-apply
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

new = """    // Intel UI: hide main.js container, show our collapsed list instead
    function applyIntelUI() {
      if (!RPGACE.modules.intelDelete) return;
      var id = RPGACE.modules.intelDelete;

      // If expanded mode is active, don't touch anything
      if (window._intelViewExpanded) return;

      var container = document.getElementById('intel-insights-content');
      if (!container) return;

      // Hide main.js full cards
      container.style.display = 'none';

      // Inject toggle + collapsed list above the container
      var parent = container.parentElement;
      if (!parent) return;

      // Remove stale elements
      var oldToggle = document.getElementById('kg-master-toggle');
      if (oldToggle) oldToggle.remove();
      var oldList = document.getElementById('intel-collapsed-list');
      if (oldList) oldList.remove();

      // Build fresh collapsed list and toggle
      id._buildCollapsedList(parent);
      id._injectMasterToggle(parent);

      // Also inject DEL buttons into hidden cards for when user expands
      setTimeout(function() { id._injectAll(); }, 100);
    }

    // Hook into page:show for the research/learning tab
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'learning' || name === 'research') {
        // Run at multiple intervals to catch main.js finishing its render
        [300, 800, 1500, 3000].forEach(function(d) {
          setTimeout(applyIntelUI, d);
        });
      }
    });

    // Also intercept intel reload functions
    function patchIntelFns() {
      if (typeof window.syncIntelData === 'function' && !window._syncIntelPatched) {
        window._syncIntelPatched = true;
        var _origSync = window.syncIntelData;
        window.syncIntelData = function() {
          var result = _origSync.apply(this, arguments);
          setTimeout(applyIntelUI, 800);
          return result;
        };
      }
      if (typeof window.loadIntelInsights === 'function' && !window._loadIntelPatched) {
        window._loadIntelPatched = true;
        var _origLoad = window.loadIntelInsights;
        window.loadIntelInsights = function() {
          var result = _origLoad.apply(this, arguments);
          setTimeout(applyIntelUI, 800);
          return result;
        };
      }
      if (typeof window.startIntelPolling === 'function' && !window._pollPatched) {
        window._pollPatched = true;
        var _origPoll = window.startIntelPolling;
        window.startIntelPolling = function() {
          var result = _origPoll.apply(this, arguments);
          setTimeout(applyIntelUI, 800);
          return result;
        };
      }
    }
    patchIntelFns();
    setTimeout(patchIntelFns, 1500);"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: hide intel-insights-content, show collapsed list on page show")
else:
    print("ERROR: anchor not found")
