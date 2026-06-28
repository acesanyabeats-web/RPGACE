src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """  _makeCollapsible: function(card) {
    if (card.dataset.collapsible) return;
    card.dataset.collapsible = '1';
    var header = card.querySelector('[style*="justify-content:space-between"]');
    if (!header) return;
    var children = Array.from(card.children);
    var headerIdx = children.indexOf(header);
    var bodyChildren = children.slice(headerIdx + 1);
    if (bodyChildren.length === 0) return;
    var body = document.createElement('div');
    body.dataset.colBody = '1';
    body.style.cssText = 'overflow:hidden;transition:max-height .25s ease,opacity .2s ease;max-height:1000px;opacity:1;';
    bodyChildren.forEach(function(c) { body.appendChild(c); });
    card.appendChild(body);
    var indicator = document.createElement('span');
    indicator.textContent = ' ▾';
    indicator.style.cssText = 'font-size:10px;color:var(--muted);transition:transform .2s;display:inline-block;margin-left:4px;vertical-align:middle;';
    var titleEl = card.querySelector('[style*="font-weight:600"]');
    if (titleEl) titleEl.appendChild(indicator);
    header.style.cursor = 'pointer';
    var origClick = header.onclick;
    header.onclick = function(e) {
      if (e.target.closest('button')) return;
      var collapsed = body.dataset.collapsed === '1';
      if (collapsed) {
        body.style.maxHeight = '1000px';
        body.style.opacity = '1';
        body.dataset.collapsed = '0';
        indicator.style.transform = 'rotate(0deg)';
      } else {
        body.style.maxHeight = '0';
        body.style.opacity = '0';
        body.dataset.collapsed = '1';
        indicator.style.transform = 'rotate(-90deg)';
      }
    };
  },"""

new = """  _makeCollapsible: function(card) {
    if (card.dataset.collapsible) return;
    card.dataset.collapsible = '1';
    var header = card.querySelector('[style*="justify-content:space-between"]');
    if (!header) return;
    var children = Array.from(card.children);
    var headerIdx = children.indexOf(header);
    var bodyChildren = children.slice(headerIdx + 1);
    if (bodyChildren.length === 0) return;
    var body = document.createElement('div');
    body.dataset.colBody = '1';
    // Start collapsed
    body.style.cssText = 'overflow:hidden;transition:max-height .3s ease,opacity .25s ease;max-height:0;opacity:0;';
    body.dataset.collapsed = '1';
    bodyChildren.forEach(function(c) { body.appendChild(c); });
    card.appendChild(body);
    var indicator = document.createElement('span');
    indicator.textContent = ' ▸';
    indicator.style.cssText = 'font-size:10px;color:var(--muted);display:inline-block;margin-left:4px;vertical-align:middle;';
    var titleEl = card.querySelector('[style*="font-weight:600"]');
    if (titleEl) titleEl.appendChild(indicator);
    header.style.cursor = 'pointer';
    header.onclick = function(e) {
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
    };
  },

  _injectMasterToggle: function(container) {
    if (!container || document.getElementById('kg-master-toggle')) return;
    var self = this;
    var bar = document.createElement('div');
    bar.id = 'kg-master-toggle';
    bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;margin-bottom:10px;cursor:pointer;';
    var label = document.createElement('span');
    label.style.cssText = 'font-size:11px;font-weight:700;color:rgba(226,226,236,0.5);letter-spacing:2px;text-transform:uppercase;';
    label.textContent = 'Insights · Click to expand all';
    var chevron = document.createElement('span');
    chevron.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.3);';
    chevron.textContent = '▸';
    bar.appendChild(label); bar.appendChild(chevron);
    var allExpanded = false;
    bar.onclick = function() {
      allExpanded = !allExpanded;
      document.querySelectorAll('[data-col-body]').forEach(function(body) {
        if (allExpanded) {
          body.style.maxHeight = '1000px';
          body.style.opacity = '1';
          body.dataset.collapsed = '0';
          var ind = body.parentElement && body.parentElement.querySelector('[style*="margin-left:4px"]');
          if (ind) ind.textContent = ' ▾';
        } else {
          body.style.maxHeight = '0';
          body.style.opacity = '0';
          body.dataset.collapsed = '1';
          var ind = body.parentElement && body.parentElement.querySelector('[style*="margin-left:4px"]');
          if (ind) ind.textContent = ' ▸';
        }
      });
      chevron.textContent = allExpanded ? '▾' : '▸';
      label.textContent = allExpanded ? 'Insights · Click to collapse all' : 'Insights · Click to expand all';
    };
    container.insertBefore(bar, container.firstChild);
  },"""

if old in src:
    # Also fix _injectInsights to inject master toggle and ensure DEL buttons still work
    new_inject = new + """

  _injectInsights: function() {
    var self = this;
    // Find the insights container to inject master toggle
    var cards = document.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]');
    if (cards.length > 0) {
      self._injectMasterToggle(cards[0].parentElement);
    }
    cards.forEach(function(card) {
      if (card.dataset.di4) return;
      // Make collapsible FIRST (before adding DEL button)
      self._makeCollapsible(card);
      card.dataset.di4 = '1';"""
    
    old_inject = new + """

  _injectInsights: function() {
    var self = this;
    document.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]').forEach(function(card) {
      if (card.dataset.di4) return;
      card.dataset.di4 = '1';
      self._makeCollapsible(card);"""

    fixed = src.replace(old, new, 1)
    # Now fix the _injectInsights to put makeCollapsible before di4 marker and add master toggle
    fixed = fixed.replace(old_inject, new_inject, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: collapsible cards start collapsed, DEL buttons restored, master toggle added")
else:
    print("ERROR: _makeCollapsible anchor not found")
    idx = src.find('_makeCollapsible')
    print("_makeCollapsible found at index:", idx)
