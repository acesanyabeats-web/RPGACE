src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """  _injectDeleteButtons: function() {
    var self = this;
    var cards = document.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]');"""

new = """  _makeCollapsible: function(card) {
    if (card.dataset.collapsible) return;
    card.dataset.collapsible = '1';
    var header = card.querySelector('div[style*="justify-content:space-between"]');
    if (!header) return;
    // Find the body — everything after the header
    var children = Array.from(card.children);
    var headerIdx = children.indexOf(header);
    var bodyChildren = children.slice(headerIdx + 1);
    if (bodyChildren.length === 0) return;
    // Wrap body in collapsible container
    var body = document.createElement('div');
    body.dataset.colBody = '1';
    body.style.cssText = 'overflow:hidden;transition:max-height .25s ease,opacity .2s ease;max-height:600px;opacity:1;';
    bodyChildren.forEach(function(c) { body.appendChild(c); });
    card.appendChild(body);
    // Toggle indicator
    var indicator = document.createElement('span');
    indicator.textContent = ' ▾';
    indicator.style.cssText = 'font-size:10px;color:var(--muted);transition:transform .2s;display:inline-block;margin-left:4px;';
    var titleEl = header.querySelector('div[style*="font-size:13px"]');
    if (titleEl) titleEl.appendChild(indicator);
    // Click handler
    header.style.cursor = 'pointer';
    header.onclick = function() {
      var collapsed = body.dataset.collapsed === '1';
      if (collapsed) {
        body.style.maxHeight = '600px';
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
  },

  _injectDeleteButtons: function() {
    var self = this;
    var cards = document.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]');"""

if old in src:
    fixed = src.replace(old, new, 1)
    # Also call _makeCollapsible inside the card loop
    fixed = fixed.replace(
        "    cards.forEach(function(card) {\n      if (card.dataset.di) return;",
        "    cards.forEach(function(card) {\n      if (card.dataset.di) return;\n      self._makeCollapsible(card);"
    )
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: collapsible intel cards added")
else:
    print("ERROR: anchor not found")
