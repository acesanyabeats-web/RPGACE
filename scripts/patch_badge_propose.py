src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """    // Layer 3 continued: expensive gap-score pull, only on click
    RPGACE.utils._expandPhylaDetail = function(badge, matches, text) {
      var panel = document.createElement('div');
      panel.className = 'phyla-detail-panel';
      panel.style.cssText = 'margin-top:8px;padding:10px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:11px;';
      panel.innerHTML = '<div style="color:rgba(226,226,236,0.3);">Loading gap scores...</div>';
      badge.insertAdjacentElement('afterend', panel);

      RPGACE.sb.select('taxonomy_nodes', 'order=gap_score.desc&limit=100')
        .then(function(nodes) {
          nodes = nodes || [];
          panel.innerHTML = '';
          matches.slice(0, 5).forEach(function(m) {
            var relevantGaps = nodes.filter(function(n) { return n.phylum_number === m.num && n.gap_score >= 5; });
            var row = document.createElement('div');
            row.style.cssText = 'margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.04);';
            var isGap = relevantGaps.length > 0;
            row.innerHTML = '<span style="color:' + (isGap ? '#E25454' : '#3DAA6E') + ';font-weight:700;">' +
              (isGap ? '🔴 ' : '✅ ') + 'Phylum ' + m.num + ' — ' + m.name + '</span>' +
              (isGap ? '<div style="color:rgba(226,226,236,0.4);margin-top:2px;">Gap: ' + relevantGaps[0].concept + ' (' + parseFloat(relevantGaps[0].gap_score).toFixed(1) + '/10)</div>' : '');
            panel.appendChild(row);
          });
        }).catch(function() {
          panel.innerHTML = '<div style="color:#E25454;">Could not load gap scores</div>';
        });
    };"""

new = """    // Layer 3 continued: expensive gap-score pull, only on click
    // NOW SCROLLABLE (shows all N matches, not silently truncated to 5)
    // NOW includes a 🌳 Propose Lineage button per row, wired to taxonomyTree module
    RPGACE.utils._expandPhylaDetail = function(badge, matches, text) {
      var panel = document.createElement('div');
      panel.className = 'phyla-detail-panel';
      panel.style.cssText = 'margin-top:8px;padding:10px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:11px;max-height:280px;overflow-y:auto;';
      panel.innerHTML = '<div style="color:rgba(226,226,236,0.3);">Loading gap scores...</div>';
      badge.insertAdjacentElement('afterend', panel);

      RPGACE.sb.select('taxonomy_nodes', 'order=gap_score.desc&limit=100')
        .then(function(nodes) {
          nodes = nodes || [];
          panel.innerHTML = '';
          var countLabel = document.createElement('div');
          countLabel.style.cssText = 'font-size:9px;color:rgba(226,226,236,0.25);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;';
          countLabel.textContent = matches.length + ' topics detected · scroll for all';
          panel.appendChild(countLabel);

          matches.forEach(function(m) {
            var relevantGaps = nodes.filter(function(n) { return n.phylum_number === m.num && n.gap_score >= 5; });
            var row = document.createElement('div');
            row.style.cssText = 'margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.04);';
            var isGap = relevantGaps.length > 0;

            var topLine = document.createElement('div');
            topLine.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
            var label = document.createElement('span');
            label.style.cssText = 'color:' + (isGap ? '#E25454' : '#3DAA6E') + ';font-weight:700;';
            label.textContent = (isGap ? '🔴 ' : '✅ ') + 'Phylum ' + m.num + ' — ' + m.name;
            topLine.appendChild(label);

            var proposeBtn = document.createElement('button');
            proposeBtn.textContent = '🌳 Propose lineage';
            proposeBtn.style.cssText = 'padding:2px 8px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.25);border-radius:10px;color:#9B59B6;font-size:9px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;flex-shrink:0;';
            proposeBtn.onclick = function() {
              if (RPGACE.modules.taxonomyTree) {
                // Extract a reasonable topic snippet from the response text for this phylum's context
                var topicGuess = text.slice(0, 300);
                RPGACE.modules.taxonomyTree.proposeLineage(topicGuess, m.num, 'oracle', null);
              }
            };
            topLine.appendChild(proposeBtn);
            row.appendChild(topLine);

            if (isGap) {
              var gapLine = document.createElement('div');
              gapLine.style.cssText = 'color:rgba(226,226,236,0.4);margin-top:2px;';
              gapLine.textContent = 'Gap: ' + relevantGaps[0].concept + ' (' + parseFloat(relevantGaps[0].gap_score).toFixed(1) + '/10)';
              row.appendChild(gapLine);
            }
            panel.appendChild(row);
          });
        }).catch(function() {
          panel.innerHTML = '<div style="color:#E25454;">Could not load gap scores</div>';
        });
    };"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: scrollable panel + propose-lineage button per row")
else:
    print("ERROR: anchor not found")
