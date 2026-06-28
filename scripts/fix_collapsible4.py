src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """  _injectInsights: function() {
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
      card.dataset.di4 = '1';
      var te = card.querySelector('[style*="font-weight:600"]');
      var title = te ? te.textContent.replace('☁️','').trim() : '';
      /* Get entry id and url from localStorage */
      var entry = self._findEntry('rpgace_intel_insights', title);
      var flexRow = card.querySelector('[style*="justify-content:space-between"]');
      if (!flexRow || !flexRow.children[1]) return;
      var scoreBox = flexRow.children[1];
      var btn = self._mkBtn(function() {
        self._confirm(title, entry ? entry.url : '', card, function(saveBib) {
          self._deleteInsight(entry, title, card, saveBib);
        });
      });
      scoreBox.insertBefore(btn, scoreBox.firstChild);
    });
  },"""

new = """  _injectInsights: function() {
    var self = this;
    var cards = document.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]');
    if (cards.length > 0) {
      self._injectMasterToggle(cards[0].parentElement);
    }
    cards.forEach(function(card) {
      if (card.dataset.di4) return;
      card.dataset.di4 = '1';
      var te = card.querySelector('[style*="font-weight:600"]');
      var title = te ? te.textContent.replace('☁️','').trim() : '';
      var entry = self._findEntry('rpgace_intel_insights', title);
      var flexRow = card.querySelector('[style*="justify-content:space-between"]');
      if (!flexRow || !flexRow.children[1]) return;
      var scoreBox = flexRow.children[1];
      // Inject DEL button BEFORE making collapsible (DOM structure must be intact)
      var btn = self._mkBtn(function() {
        self._confirm(title, entry ? entry.url : '', card, function(saveBib) {
          self._deleteInsight(entry, title, card, saveBib);
        });
      });
      scoreBox.insertBefore(btn, scoreBox.firstChild);
      // Now make collapsible — header row stays visible, everything else collapses
      self._makeCollapsible(card);
    });
  },"""

# Also fix _injectMasterToggle text to be shorter
old_toggle = "label.textContent = 'Insights · Click to expand all';"
new_toggle = "label.textContent = 'Click to see insights list';"

old_toggle2 = "label.textContent = allExpanded ? 'Insights · Click to collapse all' : 'Insights · Click to expand all';"
new_toggle2 = "label.textContent = allExpanded ? 'Hide insights list' : 'Click to see insights list';"

if old in src:
    fixed = src.replace(old, new, 1)
    fixed = fixed.replace(old_toggle, new_toggle, 1)
    fixed = fixed.replace(old_toggle2, new_toggle2, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: DEL before collapsible, shorter master toggle text")
else:
    print("ERROR: anchor not found")
    idx = src.find('_injectInsights')
    print("Found at:", idx)
