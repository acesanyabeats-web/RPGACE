

/* ===MODULE:docsLinks=== */
RPGACE.register('docsLinks', {
  domain: 'oversight',

  // G53 (Sep 2026), module 25 of 60. init stays literal top-level.
  // _inject is confirmed dead (a bare `return;` as its first real
  // statement - already noted below, predates this split) but its
  // unreachable body is real DOM-construction code (createElement,
  // querySelector, insertBefore), so it's classified ui on the
  // primary rule same as any other module - logic empty. Zero
  // external touchpoints confirmed via repo-wide grep. Handled
  // directly given the trivial single-function scope; the dead-code
  // status is untouched, per the standing restructure-only rule.
  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self._inject(); });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'dashboard') self._inject();
    });
  },

  logic: {},

  ui: {
  _inject: function() {
    // Neutered 2026-07-20 — this widget's content is now a strict subset of
    // dashDeck's Oversight card popup (_openOversight), which also has 6
    // additional working-spec docs this widget never had. Keep this module
    // registered (marker convention) but inert. IMPORTANT: if a new oversight
    // doc ships, add it to dashDeck._openOversight's list, not here — this
    // array is now dead code kept only as an audit trail.
    return;
    if (document.getElementById('docs-links-box')) return;
    var page = document.getElementById('page-dashboard');
    if (!page) return;

    var box = document.createElement('div');
    box.id = 'docs-links-box';
    box.style.cssText = 'background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 16px;margin-bottom:16px;';

    var label = document.createElement('div');
    label.style.cssText = 'font-family:Cinzel,serif;font-size:11px;color:rgba(226,226,236,0.4);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;';
    label.textContent = '📚 Oversight — 7 Docs, Always Latest';
    box.appendChild(label);

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

    // "Oversight" = these 7 documents, treated as one group. Patch Notes,
    // Interconnection Map, and Full Manual are hand-updated session logs;
    // Taxonomy Map queries Supabase live on every load and never goes stale
    // on its own. System Flow Map (Mermaid diagrams) and Minotaur Map (the
    // labyrinth mental-map visual) were added July 17/18; Placement Rules
    // (the 7th doc) was wired in here July 20 after it was reported missing
    // ("cant find 7th doc") - this list is the real, live source of what
    // "Oversight" links to, so it must be updated the same session any new
    // doc is added, not left to drift (found stale at 4 on July 18 despite 2
    // more docs already existing for a day). All 7 get updated together at
    // the end of every session (see CLAUDE.md's Oversight section).
    var links = [
      { label: '📓 Patch Notes', href: '/patch_notes.html', color: '#C9A84C' },
      { label: '🔗 Interconnection Map', href: '/interconnection_map.md', color: '#4A8CCC' },
      { label: '📘 Full Manual', href: '/manual.html', color: '#9B6EC8' },
      { label: '🌳 Taxonomy Map', href: '/taxonomy_map.html', color: '#2ABFB0' },
      { label: '🗺️ System Flow Map', href: '/system_flow_map.md', color: '#E2A83D' },
      { label: '🐂 Minotaur Map', href: '/minotaur_map.html', color: '#CC4A4A' },
      { label: '⚖️ Placement Rules', href: '/taxonomy_placement_rules.txt', color: '#4A8CCC' }
    ];

    links.forEach(function(l) {
      var a = document.createElement('a');
      a.href = l.href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = l.label;
      a.style.cssText = 'flex:1;min-width:120px;text-align:center;padding:9px 12px;background:' + l.color + '14;border:1px solid ' + l.color + '40;border-radius:8px;color:' + l.color + ';font-size:12px;font-weight:700;text-decoration:none;font-family:Rajdhani,sans-serif;';
      row.appendChild(a);
    });

    box.appendChild(row);

    var firstChild = page.querySelector('.section-title') || page.firstChild;
    if (firstChild) page.insertBefore(box, firstChild);
    else page.appendChild(box);
  },
  },

  _inject: function() { return this.ui._inject(); },

});
/* ===END:docsLinks=== */
