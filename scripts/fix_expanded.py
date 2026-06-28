src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

# Remove the polling loop
old_poll = """      // Polling loop to re-apply collapsible after any full re-render
      setInterval(function() {
        var uncollapsed = document.querySelectorAll(
          '[style*="background:var(--panel2)"][style*="margin-bottom:12px"]:not([data-collapsible])'
        );
        if (uncollapsed.length > 0) {
          self._injectAll();
        }
      }, 800);"""

new_poll = ""

# Change cards to start expanded
old_collapsed = """    // Start collapsed
    body.style.cssText = 'overflow:hidden;transition:max-height .3s ease,opacity .25s ease;max-height:0;opacity:0;';
    body.dataset.collapsed = '1';"""

new_collapsed = """    // Start expanded
    body.style.cssText = 'overflow:hidden;transition:max-height .3s ease,opacity .25s ease;max-height:1000px;opacity:1;';
    body.dataset.collapsed = '0';"""

# Change indicator to show expanded state
old_indicator = """    indicator.textContent = ' ▸';"""
new_indicator = """    indicator.textContent = ' ▾';"""

# Fix toggle onclick to correctly track state
old_header_click = """    header.onclick = function(e) {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      var collapsed = body.dataset.collapsed === '1';
      if (collapsed) {
        body.style.maxHeight = '1000px';
        body.style.opacity = '1';
        body.dataset.collapsed = '0';
        indicator.textContent = ' ▾';
      } else {
        body.style.maxHeight = '0';
        body.style.opacity = '0';
        body.dataset.collapsed = '1';
        indicator.textContent = ' ▸';
      }
    };"""

new_header_click = """    header.onclick = function(e) {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      var collapsed = body.dataset.collapsed === '1';
      if (collapsed) {
        body.style.maxHeight = '1000px';
        body.style.opacity = '1';
        body.dataset.collapsed = '0';
        indicator.textContent = ' ▾';
      } else {
        body.style.maxHeight = '0';
        body.style.opacity = '0';
        body.dataset.collapsed = '1';
        indicator.textContent = ' ▸';
      }
    };"""

if old_poll in src:
    fixed = src.replace(old_poll, new_poll, 1)
    fixed = fixed.replace(old_collapsed, new_collapsed, 1)
    fixed = fixed.replace(old_indicator, new_indicator, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: polling removed, cards start expanded, master toggle collapses all")
else:
    print("ERROR: polling anchor not found")
    idx = src.find('Polling loop')
    print("Found at:", idx)
