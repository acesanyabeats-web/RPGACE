/* ===MODULE:knowledgeGap=== */
RPGACE.register('knowledgeGap', {

  init: function() {
    var self = this;
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._inject(); }, 1000);
    });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.dashboard) {
        setTimeout(function() { self._inject(); }, 400);
      }
    });
  },

  _inject: function() {
    if (document.getElementById('kg-panel')) return;
    var page = document.getElementById('page-dashboard');
    if (!page) return;
    var self = this;

    var panel = document.createElement('div');
    panel.id = 'kg-panel';
    panel.style.cssText = 'margin-bottom:24px;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';

    var title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = 'Knowledge Gap Tracker';

    var badge = document.createElement('div');
    badge.id = 'kg-badge';
    badge.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(42,191,176,0.7);background:rgba(42,191,176,0.08);border:1px solid rgba(42,191,176,0.2);border-radius:10px;padding:3px 10px;';
    badge.textContent = 'Loading...';

    var refreshBtn = document.createElement('button');
    refreshBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);cursor:pointer;font-size:10px;padding:3px 10px;margin-left:8px;';
    refreshBtn.textContent = '↻';
    refreshBtn.onclick = function() { self._load(); };

    hdr.appendChild(title);
    var badgeWrap = document.createElement('div');
    badgeWrap.style.cssText = 'display:flex;align-items:center;gap:6px;';
    badgeWrap.appendChild(badge);
    badgeWrap.appendChild(refreshBtn);
    hdr.appendChild(badgeWrap);
    panel.appendChild(hdr);

    var grid = document.createElement('div');
    grid.id = 'kg-grid';
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;';
    panel.appendChild(grid);

    var emptyState = document.createElement('div');
    emptyState.id = 'kg-empty';
    emptyState.style.cssText = 'display:none;font-size:12px;color:rgba(226,226,236,0.3);padding:16px;text-align:center;border:1px solid rgba(255,255,255,0.05);border-radius:8px;';
    emptyState.textContent = 'No taxonomy nodes yet. Sync your encyclopedia first.';
    panel.appendChild(emptyState);

    // Insert before the first section-title (quest grid)
    var firstTitle = page.querySelector('.section-title');
    if (firstTitle) {
      page.insertBefore(panel, firstTitle);
    } else {
      page.insertBefore(panel, page.firstChild);
    }

    self._load();
    console.log('[RPGACE:knowledgeGap] Panel injected');
  },

  _load: function() {
    var self = this;
    if (!RPGACE.modules.taxonomySync) return;

    RPGACE.modules.taxonomySync.getTopGaps(6)
      .then(function(nodes) {
        self._render(nodes || []);
      })
      .catch(function(err) {
        console.warn('[knowledgeGap] load error:', err.message);
      });
  },

  _render: function(nodes) {
    var self = this;
    var grid = document.getElementById('kg-grid');
    var badge = document.getElementById('kg-badge');
    var empty = document.getElementById('kg-empty');
    if (!grid) return;

    grid.innerHTML = '';

    if (nodes.length === 0) {
      if (empty) empty.style.display = 'block';
      if (badge) badge.textContent = '0 gaps';
      return;
    }

    if (empty) empty.style.display = 'none';
    if (badge) badge.textContent = nodes.length + ' gaps tracked';

    nodes.forEach(function(node) {
      var gap = parseFloat(node.gap_score) || 5;
      var studied = node.study_count || 0;
      var applied = node.applied_in_beat || false;

      // Gap colour: red > 7, gold 4-7, teal < 4
      var gapColor = gap >= 7 ? '#E25454' : gap >= 4 ? '#C9A84C' : '#2ABFB0';
      var gapBg = gap >= 7 ? 'rgba(226,84,84,0.06)' : gap >= 4 ? 'rgba(201,168,76,0.06)' : 'rgba(42,191,176,0.06)';
      var gapBorder = gap >= 7 ? 'rgba(226,84,84,0.2)' : gap >= 4 ? 'rgba(201,168,76,0.2)' : 'rgba(42,191,176,0.2)';

      var card = document.createElement('div');
      card.style.cssText = 'background:' + gapBg + ';border:1px solid ' + gapBorder + ';border-radius:8px;padding:14px 16px;position:relative;';

      var phylumLabel = document.createElement('div');
      phylumLabel.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:' + gapColor + ';opacity:0.7;margin-bottom:4px;';
      phylumLabel.textContent = 'Phylum ' + (node.phylum_number || '?') + ' · ' + (node.phylum_name || 'Unknown');

      var conceptName = document.createElement('div');
      conceptName.style.cssText = 'font-size:12px;font-weight:700;color:#E2E2EC;margin-bottom:8px;line-height:1.3;';
      conceptName.textContent = node.concept || 'Untitled';

      var statsRow = document.createElement('div');
      statsRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px;';

      var gapStat = document.createElement('div');
      gapStat.style.cssText = 'font-size:10px;color:' + gapColor + ';font-weight:700;';
      gapStat.textContent = 'Gap ' + gap.toFixed(1);

      var studiedStat = document.createElement('div');
      studiedStat.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.35);';
      studiedStat.textContent = studied + 'x studied';

      var appliedStat = document.createElement('div');
      appliedStat.style.cssText = 'font-size:10px;color:' + (applied ? '#3DAA6E' : 'rgba(226,226,236,0.2)') + ';';
      appliedStat.textContent = applied ? '✓ applied' : '○ not applied';

      statsRow.appendChild(gapStat);
      statsRow.appendChild(studiedStat);
      statsRow.appendChild(appliedStat);

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:6px;';

      var studyBtn = document.createElement('button');
      studyBtn.style.cssText = 'flex:1;padding:6px 8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:rgba(226,226,236,0.7);font-size:10px;font-weight:600;cursor:pointer;font-family:Rajdhani,sans-serif;';
      studyBtn.textContent = '🧠 Study Now';
      studyBtn.onclick = function() {
        if (typeof RPGACE.modules.feynman !== 'undefined' && typeof RPGACE.modules.feynman.start === 'function') {
          RPGACE.modules.feynman.start(node.concept, 'knowledgeGap');
        } else {
          RPGACE.utils.sendToOracle('Start a Feynman Loop session on: ' + node.concept + '. I want to master this concept for FL Studio UK hip hop production.');
        }
      };

      var askBtn = document.createElement('button');
      askBtn.style.cssText = 'flex:1;padding:6px 8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:rgba(226,226,236,0.7);font-size:10px;font-weight:600;cursor:pointer;font-family:Rajdhani,sans-serif;';
      askBtn.textContent = '⚡ Apply Tonight';
      askBtn.onclick = function() {
        RPGACE.utils.sendToOracle('Give me one specific FL Studio exercise I can do tonight to apply this concept in a beat: ' + node.concept + '. Be specific, step-by-step, and give me an exact task I can complete in 30 minutes.');
        if (typeof RPGACE.modules.taxonomySync !== 'undefined') {
          RPGACE.modules.taxonomySync.markApplied(node.concept);
          node.applied_in_beat = true;
          appliedStat.style.color = '#3DAA6E';
          appliedStat.textContent = '✓ applied';
        }
      };

      btnRow.appendChild(studyBtn);
      btnRow.appendChild(askBtn);

      card.appendChild(phylumLabel);
      card.appendChild(conceptName);
      card.appendChild(statsRow);
      card.appendChild(btnRow);
      grid.appendChild(card);
    });
  },

});
/* ===END:knowledgeGap=== */
