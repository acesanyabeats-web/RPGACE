src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

# Find the _makeCollapsible and _injectMasterToggle block and replace entirely
# with the new two-container architecture wired into _injectInsights

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
    // Start expanded
    body.style.cssText = 'overflow:hidden;transition:max-height .3s ease,opacity .25s ease;max-height:1000px;opacity:1;';
    body.dataset.collapsed = '0';
    bodyChildren.forEach(function(c) { body.appendChild(c); });
    card.appendChild(body);
    var indicator = document.createElement('span');
    indicator.textContent = ' ▾';
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
    label.textContent = 'Click to see insights list';
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
      label.textContent = allExpanded ? 'Hide insights list' : 'Click to see insights list';
    };
    container.insertBefore(bar, container.firstChild);
  },"""

new = """  _pausePolling: function() {
    window._intelViewExpanded = true;
    if (typeof window.startIntelPolling === 'function' && !window._origIntelPoll) {
      window._origIntelPoll = window.startIntelPolling;
      window.startIntelPolling = function() {
        if (window._intelViewExpanded) return;
        return window._origIntelPoll.apply(this, arguments);
      };
    }
  },

  _resumePolling: function() {
    window._intelViewExpanded = false;
  },

  _buildCollapsedList: function(container) {
    // Container A — compact collapsed list built from localStorage
    var existing = document.getElementById('intel-collapsed-list');
    if (existing) existing.remove();
    var entries = [];
    try {
      entries = JSON.parse(localStorage.getItem('rpgace_intel_insights') || '[]');
    } catch(e) { entries = []; }
    if (entries.length === 0) return;
    var self = this;
    var list = document.createElement('div');
    list.id = 'intel-collapsed-list';
    list.style.cssText = 'margin-bottom:8px;';
    entries.forEach(function(entry) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;margin-bottom:4px;';
      var left = document.createElement('div');
      left.style.cssText = 'flex:1;min-width:0;margin-right:12px;';
      var title = document.createElement('div');
      title.style.cssText = 'font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      title.textContent = (entry.title || 'Untitled').replace('☁️','').trim();
      var meta = document.createElement('div');
      meta.style.cssText = 'font-size:10px;color:var(--muted);margin-top:2px;';
      meta.textContent = (entry.creator || '') + (entry.date ? ' · ' + entry.date : '');
      left.appendChild(title);
      left.appendChild(meta);
      var right = document.createElement('div');
      right.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0;';
      var score = document.createElement('div');
      var s = parseInt(entry.score) || 0;
      score.style.cssText = 'font-size:13px;font-weight:700;color:' + (s >= 8 ? 'var(--green)' : s >= 6 ? 'var(--gold)' : 'var(--muted)') + ';';
      score.textContent = s + '/10';
      var bar = document.createElement('div');
      bar.style.cssText = 'font-size:9px;color:var(--muted);letter-spacing:0;';
      var filled = Math.round(s);
      bar.textContent = '█'.repeat(filled) + '░'.repeat(10 - filled);
      var del = self._mkBtn(function() {
        self._confirm(entry.title, entry.url || '', row, function(saveBib) {
          self._deleteInsight(entry, entry.title, row, saveBib);
          row.remove();
        });
      });
      right.appendChild(bar);
      right.appendChild(score);
      right.appendChild(del);
      row.appendChild(left);
      row.appendChild(right);
      list.appendChild(row);
    });
    container.insertBefore(list, container.firstChild);
  },

  _injectMasterToggle: function(container) {
    if (!container || document.getElementById('kg-master-toggle')) return;
    var self = this;
    // Build collapsed list immediately
    self._buildCollapsedList(container);
    // Hide main.js expanded container
    var mainContainer = container;
    var cards = mainContainer.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]');
    cards.forEach(function(c) { c.style.display = 'none'; });
    var bar = document.createElement('div');
    bar.id = 'kg-master-toggle';
    bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:9px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;margin-bottom:8px;cursor:pointer;user-select:none;';
    var label = document.createElement('span');
    label.style.cssText = 'font-size:11px;font-weight:700;color:rgba(226,226,236,0.45);letter-spacing:2px;text-transform:uppercase;';
    label.textContent = 'Insights · ' + (JSON.parse(localStorage.getItem('rpgace_intel_insights')||'[]').length) + ' videos · Click to expand';
    var chevron = document.createElement('span');
    chevron.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.25);';
    chevron.textContent = '▸';
    bar.appendChild(label);
    bar.appendChild(chevron);
    var expanded = false;
    bar.onclick = function() {
      expanded = !expanded;
      var collList = document.getElementById('intel-collapsed-list');
      var fullCards = mainContainer.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]');
      if (expanded) {
        self._pausePolling();
        if (collList) collList.style.display = 'none';
        fullCards.forEach(function(c) { c.style.display = ''; });
        chevron.textContent = '▾';
        label.textContent = 'Insights · Click to collapse';
      } else {
        self._resumePolling();
        self._buildCollapsedList(mainContainer);
        if (collList) collList.style.display = '';
        fullCards.forEach(function(c) { c.style.display = 'none'; });
        chevron.textContent = '▸';
        var count = JSON.parse(localStorage.getItem('rpgace_intel_insights')||'[]').length;
        label.textContent = 'Insights · ' + count + ' videos · Click to expand';
      }
    };
    mainContainer.insertBefore(bar, mainContainer.firstChild);
  },"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: two-container intel view with polling pause")
else:
    print("ERROR: anchor not found")
    idx = src.find('_makeCollapsible')
    print("_makeCollapsible at:", idx)
