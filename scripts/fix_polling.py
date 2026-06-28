src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """      var _injecting = false;
      var obs = new MutationObserver(function(muts) {
        if (_injecting) return;
        var relevant = muts.some(function(m) {
          return Array.from(m.addedNodes).some(function(n) {
            return n.nodeType === 1 && !n.dataset.di4 && !n.dataset.colBody && !n.id;
          });
        });
        if (!relevant) return;
        _injecting = true;
        setTimeout(function() {
          self._injectAll();
          _injecting = false;
        }, 200);
      });
      obs.observe(document.body, { childList: true, subtree: true });"""

new = """      var obs = new MutationObserver(function(muts) {
        if (muts.some(function(m) { return m.addedNodes.length > 0; })) {
          setTimeout(function() { self._injectAll(); }, 150);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      // Polling loop to re-apply collapsible after any full re-render
      setInterval(function() {
        var uncollapsed = document.querySelectorAll(
          '[style*="background:var(--panel2)"][style*="margin-bottom:12px"]:not([data-collapsible])'
        );
        if (uncollapsed.length > 0) {
          self._injectAll();
        }
      }, 800);"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: polling loop re-applies collapsible after any re-render")
else:
    print("ERROR: anchor not found")
