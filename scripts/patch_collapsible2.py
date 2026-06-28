src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """  _injectInsights: function() {
    var self = this;
    document.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]').forEach(function(card) {
      if (card.dataset.di4) return;
      card.dataset.di4 = '1';"""

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
  },

  _injectInsights: function() {
    var self = this;
    document.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]').forEach(function(card) {
      if (card.dataset.di4) return;
      card.dataset.di4 = '1';
      self._makeCollapsible(card);"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: collapsible intel cards added")
else:
    print("ERROR: anchor not found")
    # Show what's actually there
    idx = src.find('_injectInsights')
    if idx > 0:
        print("Found at index", idx)
        print(repr(src[idx:idx+200]))
