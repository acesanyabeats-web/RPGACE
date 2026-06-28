src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """    bar.onclick = function() {
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
    };"""

new = """    bar.onclick = function() {
      expanded = !expanded;
      var collList = document.getElementById('intel-collapsed-list');
      var intelContainer = document.getElementById('intel-insights-content');
      if (expanded) {
        window._intelViewExpanded = true;
        if (collList) collList.style.display = 'none';
        if (intelContainer) intelContainer.style.display = '';
        chevron.textContent = '▾';
        label.textContent = 'Insights · Click to collapse';
      } else {
        window._intelViewExpanded = false;
        if (collList) collList.style.display = '';
        if (intelContainer) intelContainer.style.display = 'none';
        chevron.textContent = '▸';
        var count = JSON.parse(localStorage.getItem('rpgace_intel_insights')||'[]').length;
        label.textContent = 'Insights · ' + count + ' videos · Click to expand';
      }
    };"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: master toggle uses intel-insights-content container")
else:
    print("ERROR: anchor not found")
