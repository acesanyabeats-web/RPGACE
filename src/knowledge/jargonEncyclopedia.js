
/* ===MODULE:jargonEncyclopedia=== */
// July 22 — "biggest confirmed-not-built items" list (CLAUDE.md) named a
// Taxonomy Sorting Agent and a Jargon Encyclopedia as blocked on it.
//
// Sep 26 2026 — REAL FULL UI REWORK, Alex's own direct ask: "i currently
// have no way of accessing jargon encyclopedia terms, it is poorly
// designed... jargon ui rework to get it working as if i was a consumer,"
// then, after real /interrogation, "make jargon encyclopedia the same as
// videoworm is for bookworm" — i.e. the exact same real, already-proven
// picker-popup -> real standalone page pattern dashDeck._openBookworm/
// PAGE_PANELS already uses for Videoworm/MusicWorm, applied to Taxonomy
// (dashDeck._openTaxonomy, new) and leftNav (Phylum Path's own new
// subItems entry) — never a button crammed onto Phylum Path's title
// again (the July 22 "build in to the existing" call is superseded by
// this direct, later ask). Real, concrete cause this closes: ALL 520
// real curated terms are `status='pending'` right now (2 same-day
// batches, same session) and the OLD glossary only ever queried
// `status=eq.accepted` — it rendered permanently empty, which is
// literally the "no way of accessing" bug Alex reported. Confirmed via
// direct /interrogation answer: the reworked view shows EVERY status
// (pending/accepted/rejected), each with a real status badge, and lets
// Alex Accept/Edit/Reject right there inline — no separate one-at-a-time
// review queue anymore. `phylumPath._resolvePendingTerm` (the real,
// already-proven write function) is reused unchanged via a cross-module
// call, never re-implemented here (rule 8) — this module owns browsing/
// display, phylumPath still owns the one real write path.
RPGACE.register('jargonEncyclopedia', {
  domain: 'knowledge',

  // Real, honest status->badge lookup, module-scope data (G53-family
  // convention: data fields grouped at module top-level, not interleaved
  // with functions). `_allTerms`/`_insightsByNode` are populated at
  // runtime by `_loadAndRenderTerms` — declared here explicitly rather
  // than left as the old code's undeclared dynamic writes, since this is
  // a real functional rewrite, not a pure structural move.
  STATUS_META: {
    pending:  { label: '🟡 Pending',  color: 'var(--gold)' },
    accepted: { label: '🟢 Accepted', color: 'var(--green)' },
    rejected: { label: '🔴 Rejected', color: 'var(--red)' }
  },
  _activeStatus: 'all',
  _allTerms: null,
  _insightsByNode: null,

  init: function() {
    var self = this;
    RPGACE.hooks.on('page:show', function(name) {
      var pageId = RPGACE.CONFIG && RPGACE.CONFIG.pages ? RPGACE.CONFIG.pages.jargonEncyclopedia : null;
      if (pageId && name === pageId) {
        // LL-7: a phylum filter only applies when arriving from a Phylum Path shelf link.
        if (self._phylumFilter && Date.now() - (self._phylumFilterAt || 0) > 5000) self._phylumFilter = null;
        self._injectPageShell();
        // KN-5: a term tapped on a Phylum Path shelf arrives searched.
        var sEl = document.getElementById('jarg-search');
        if (self._focusTerm && Date.now() - (self._focusTermAt || 0) < 5000) { if (sEl) sEl.value = self._focusTerm; self._focusShown = self._focusTerm; }
        else if (self._focusShown && sEl && sEl.value === self._focusShown) { sEl.value = ''; self._focusShown = null; }
        self._focusTerm = null;
        self._loadAndRenderTerms();
        // LL-2: Jargon is the 2nd tab of the Encyclopedia (one tab bar, owned by encyclopediaPosts).
        var ep = RPGACE.modules.encyclopediaPosts;
        if (ep) ep.ui._injectTabs('jargon');
      }
    });
    // Same real precedent as phylumPath._injectPageShell — build the page
    // div early (unconditionally, idempotent), not gated on first visit,
    // so a direct nav/leftNav click always finds real markup waiting.
    setTimeout(function() { self._injectPageShell(); }, 1700);
  },

  // ============================================================
  // logic — genuinely EMPTY, same honest precedent as before this
  // rewrite: every real function here touches the DOM directly (page
  // shell, filter chips, term rows, the edit popup), and the one real
  // WRITE this page triggers reuses phylumPath's own logic function
  // rather than duplicating it (rule 8).
  // ============================================================
  logic: {},

  // ============================================================
  // ui — the real standalone page: shell, filter chips, search, term
  // rows with inline Accept/Edit/Reject, and the edit popup.
  // ============================================================
  ui: {

    _injectPageShell: function() {
      var self = RPGACE.modules.jargonEncyclopedia;
      if (document.getElementById('page-' + RPGACE.CONFIG.pages.jargonEncyclopedia)) return;
      var app = document.getElementById('app');
      if (!app) return;
      var page = document.createElement('div');
      page.className = 'page';
      page.id = 'page-' + RPGACE.CONFIG.pages.jargonEncyclopedia;
      page.innerHTML =
        '<div class="section-title">📖 Learned</div>' +
        '<div id="jarg-tabs"></div>' +
        '<div style="font-size:12px;color:var(--muted);margin-bottom:14px;">Every real curated term, across every phylum — browse, search, and review.</div>' +
        '<input id="jarg-search" type="text" placeholder="Search terms..." style="width:100%;margin-bottom:10px;padding:8px 12px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Rajdhani,sans-serif;font-size:13px;">' +
        '<div id="jarg-filters" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;"></div>' +
        '<div id="jarg-list">Loading…</div>';
      app.appendChild(page);
      self.ui._renderFilterChips();
      var searchInp = document.getElementById('jarg-search');
      searchInp.addEventListener('input', function() { self.ui._applyFiltersAndRender(); });
    },

    _chipStyle: function(active) {
      return 'padding:5px 12px;border-radius:14px;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;border:1px solid ' + (active ? 'var(--gold)' : 'var(--border)') + ';background:' + (active ? 'rgba(201,168,76,0.18)' : 'var(--panel2)') + ';color:' + (active ? 'var(--gold)' : 'var(--muted)') + ';';
    },

    _renderFilterChips: function() {
      var self = RPGACE.modules.jargonEncyclopedia;
      var wrap = document.getElementById('jarg-filters');
      if (!wrap) return;
      var CHIPS = [
        { key: 'all', label: 'All' },
        { key: 'pending', label: '🟡 Pending' },
        { key: 'accepted', label: '🟢 Accepted' },
        { key: 'rejected', label: '🔴 Rejected' }
      ];
      wrap.innerHTML = '';
      CHIPS.forEach(function(c) {
        var chip = document.createElement('button');
        chip.textContent = c.label;
        chip.style.cssText = self.ui._chipStyle(c.key === (self._activeStatus || 'all'));
        chip.onclick = function() { self._activeStatus = c.key; self.ui._renderFilterChips(); self.ui._applyFiltersAndRender(); };
        wrap.appendChild(chip);
      });
    },

    // Real fix for the actual reported bug: queries EVERY status, not
    // just `accepted` (the old query's own filter is exactly why the
    // glossary rendered permanently empty against 520 real pending
    // rows). `r.taxonomy_node_id` (not `r.id`, the anchor's own id) is
    // still the real FK to look up linked Encyclopedia insights on — an
    // anchor with no taxonomy_node_id yet has nothing to look up
    // (honestly shown as "not yet placed in the tree," not an error).
    _loadAndRenderTerms: function() {
      var self = RPGACE.modules.jargonEncyclopedia;
      var listEl = document.getElementById('jarg-list');
      if (!listEl) return;
      listEl.textContent = 'Loading…';
      Promise.all([RPGACE.sb.select('jargon_encyclopedia', 'select=id,term,phylum_number,explainer,status,taxonomy_node_id&order=phylum_number.asc,term.asc&limit=2000'),
        RPGACE.phylumRealms().catch(function() { return null; })]).then(function(res) {
        var rows = res[0] || [];  // RC-1: the realm map loads alongside, for realm badges + filter
        self._allTerms = rows;
        // Real batched fetch — one query for every visible term's linked
        // insight rows, never one query per term (N+1). A term with zero
        // linked rows (including every not-yet-placed anchor) just gets
        // an empty array; a failed fetch degrades to showing terms with
        // no insight collection rather than failing the whole page.
        var ids = rows.map(function(r) { return r.taxonomy_node_id; }).filter(Boolean);
        var fetchInsights = ids.length
          ? RPGACE.sb.select('encyclopedia', 'taxonomy_node_id=in.(' + ids.join(',') + ')&select=id,title,content,source,taxonomy_node_id&order=created_at.asc').catch(function() { return []; })
          : Promise.resolve([]);
        fetchInsights.then(function(insightRows) {
          var byNode = {};
          (insightRows || []).forEach(function(ins) {
            if (!byNode[ins.taxonomy_node_id]) byNode[ins.taxonomy_node_id] = [];
            byNode[ins.taxonomy_node_id].push(ins);
          });
          self._insightsByNode = byNode;
          self.ui._applyFiltersAndRender();
          self.ui._loadMetIn(rows);
        });
      }).catch(function(e) {
        listEl.textContent = 'Load failed: ' + e.message;
      });
    },

    // LL-6: where each term was met - Library items (private, after login)
    // and idea cards. Computed once per load, then the list re-renders.
    _loadMetIn: function(terms) {
      var self = RPGACE.modules.jargonEncyclopedia, ll = RPGACE.modules.lifeLibrary;
      if (!ll) return;
      var items = ll.logic.signedIn() ? (ll._loaded ? Promise.resolve(ll._items) : ll.logic.load()) : Promise.resolve([]);
      var ideas = RPGACE.sb.select('encyclopedia_insights', 'select=insight_text,source_entry_id,source_entry_title&limit=3000');
      Promise.all([items.catch(function() { return []; }), ideas.catch(function() { return []; })]).then(function(r) {
        self._metIn = ll.logic.metIn(terms, r[0] || [], r[1] || []);
        self.ui._applyFiltersAndRender();
      });
    },

    _applyFiltersAndRender: function() {
      var self = RPGACE.modules.jargonEncyclopedia;
      var listEl = document.getElementById('jarg-list');
      var searchEl = document.getElementById('jarg-search');
      if (!listEl) return;
      var rows = self._allTerms || [];
      var status = self._activeStatus || 'all';
      var q = ((searchEl && searchEl.value) || '').toLowerCase();
      var pf = self._phylumFilter || null; // LL-7: set by a Phylum Path shelf link
      // RC-1: realm filter row (each term's realm = its phylum's realm).
      var rf = self._realmFilter || '';
      var fwrap = document.getElementById('jarg-filters');
      if (fwrap && fwrap.parentNode) {
        var oldRow = document.getElementById('jarg-realms'); if (oldRow) oldRow.remove();
        var rrow = RPGACE.realmFilterRow({ counts: RPGACE.realmCounts(rows, 'jargon_encyclopedia'), selected: rf, onPick: function(k) { self._realmFilter = k; self.ui._applyFiltersAndRender(); } });
        rrow.id = 'jarg-realms';
        fwrap.parentNode.insertBefore(rrow, fwrap.nextSibling);
      }
      var filtered = rows.filter(function(r) {
        if (status !== 'all' && r.status !== status) return false;
        if (pf && r.phylum_number !== pf) return false;
        if (rf && RPGACE.realmOf('jargon_encyclopedia', r).indexOf(rf) === -1) return false;
        if (q && (r.term || '').toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      var chip = document.getElementById('jarg-phylum-chip');
      if (pf && !chip && listEl.parentNode) {
        chip = document.createElement('button'); chip.type = 'button'; chip.id = 'jarg-phylum-chip';
        chip.style.cssText = 'margin:0 0 8px;min-height:32px;padding:4px 12px;border-radius:16px;border:1px solid var(--gold);background:none;color:var(--gold);font-size:12px;cursor:pointer;font-family:inherit;';
        chip.onclick = function() { self._phylumFilter = null; chip.remove(); self.ui._applyFiltersAndRender(); };
        listEl.parentNode.insertBefore(chip, listEl);
      }
      if (chip) { if (pf) chip.textContent = 'Phylum ' + pf + ' only · ✕'; else chip.remove(); }
      self.ui._renderTerms(listEl, filtered);
    },

    // Real DOM per row (not an innerHTML string, unlike the old read-only
    // renderer) — a pending term needs real, live Accept/Edit/Reject
    // button handlers, not just markup.
    _renderTerms: function(listEl, rows) {
      var self = RPGACE.modules.jargonEncyclopedia;
      listEl.innerHTML = '';
      if (!rows.length) {
        var empty = document.createElement('div');
        empty.style.cssText = 'color:var(--muted);font-size:12px;padding:8px 0';
        empty.textContent = 'No terms match this filter yet.';
        listEl.appendChild(empty);
        return;
      }
      var byNode = self._insightsByNode || {};
      rows.forEach(function(r) {
        var row = document.createElement('div');
        row.style.cssText = 'padding:10px 0;border-bottom:1px solid var(--border);';

        var head = document.createElement('div');
        head.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
        var meta = self.STATUS_META[r.status] || { label: r.status || '?', color: 'var(--muted)' };
        var badge = document.createElement('span');
        badge.textContent = meta.label;
        badge.style.cssText = 'font-size:10px;font-weight:700;color:' + meta.color + ';';
        var termEl = document.createElement('span');
        termEl.style.cssText = 'font-size:13px;font-weight:700;color:var(--text);';
        termEl.textContent = r.term || '';
        var phylumEl = document.createElement('span');
        phylumEl.style.cssText = 'font-size:10px;color:var(--muted);';
        var jr = RPGACE.realmOf('jargon_encyclopedia', r)[0], JX = RPGACE.modules.xpSeason;
        phylumEl.className = 'jarg-realm';
        phylumEl.textContent = (jr && JX && JX.REALMS[jr] ? JX.REALMS[jr].icon + ' ' + JX.REALMS[jr].name + ' · ' : '') + 'Phylum ' + r.phylum_number;
        head.appendChild(badge); head.appendChild(termEl); head.appendChild(phylumEl);
        row.appendChild(head);

        var expl = document.createElement('div');
        expl.style.cssText = 'font-size:11px;color:var(--muted);margin-top:3px;';
        expl.textContent = r.explainer || '';
        row.appendChild(expl);
        var met = self._metIn && self._metIn[String(r.term || '').toLowerCase()];
        if (met && met.length && RPGACE.modules.lifeLibrary) row.appendChild(RPGACE.modules.lifeLibrary.ui.metInLine(met));

        var insights = r.taxonomy_node_id ? (byNode[r.taxonomy_node_id] || []) : [];
        // Oct 10 2026 (N2, Knowledge slice): the "Not yet placed in the tree
        // — anchor only." line was printed under every term; while the tree
        // is empty it is true of all 545, so it said nothing. Only placed
        // terms get a line now.
        if (!r.taxonomy_node_id) {
          // nothing
        } else if (insights.length) {
          var iwrap = document.createElement('div');
          iwrap.style.cssText = 'margin-top:6px;padding-left:10px;border-left:2px solid rgba(201,168,76,0.25);';
          insights.forEach(function(ins) {
            var idiv = document.createElement('div');
            idiv.style.cssText = 'font-size:10.5px;color:rgba(226,226,236,0.55);margin-top:4px;line-height:1.5;';
            idiv.textContent = (ins.source || 'insight') + ': ' + (ins.content || ins.title || '');
            iwrap.appendChild(idiv);
          });
          row.appendChild(iwrap);
        }

        if (r.status === 'pending') {
          var actions = document.createElement('div');
          actions.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
          var BTNBASE = 'padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;border:1px solid ';

          var acceptBtn = document.createElement('button');
          acceptBtn.textContent = '✓ Accept';
          acceptBtn.style.cssText = BTNBASE + 'var(--green);background:rgba(76,175,130,0.15);color:var(--green);';
          acceptBtn.onclick = function() {
            var pp = RPGACE.modules.phylumPath;
            if (!pp || !pp._resolvePendingTerm) return;
            pp._resolvePendingTerm(r, 'accept').then(function() { self.ui._loadAndRenderTerms(); });
          };

          var editBtn = document.createElement('button');
          editBtn.textContent = '✎ Edit';
          editBtn.style.cssText = BTNBASE + 'var(--gold);background:rgba(201,168,76,0.15);color:var(--gold);';
          editBtn.onclick = function() { self.ui._showEditPopup(r); };

          var rejectBtn = document.createElement('button');
          rejectBtn.textContent = '✗ Reject';
          rejectBtn.style.cssText = BTNBASE + 'var(--red);background:rgba(204,74,74,0.15);color:var(--red);';
          rejectBtn.onclick = function() {
            var pp = RPGACE.modules.phylumPath;
            if (!pp || !pp._resolvePendingTerm) return;
            pp._resolvePendingTerm(r, 'reject').then(function() { self.ui._loadAndRenderTerms(); });
          };

          actions.appendChild(acceptBtn); actions.appendChild(editBtn); actions.appendChild(rejectBtn);
          row.appendChild(actions);
        }

        // LL-5: "🔗 Find links" - library first, then a web search; saved
        // to the Life Library as a web lookup.
        var wl = RPGACE.modules.webLookup;
        if (wl && r.term) row.appendChild(wl.ui.findLinksButton(r.term, 'music production term'));

        listEl.appendChild(row);
      });
    },

    // Small, self-contained edit popup — same real dashDeck._popup()
    // scaffolding every other editor in this app uses (rule 8), never a
    // bare window prompt()/confirm(). Reuses phylumPath._resolvePendingTerm
    // for the actual write (the same function Accept above calls),
    // passing the edited term/explainer through — one real write path,
    // not a second one.
    _showEditPopup: function(r) {
      var self = RPGACE.modules.jargonEncyclopedia;
      var dd = RPGACE.modules.dashDeck;
      if (!dd || !dd._popup) return;
      var pop = dd._popup({ eyebrow: '✎ Edit term', title: r.term || '', accent: 'var(--gold)', width: '480px' });
      pop.box.innerHTML =
        '<label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;">Term</label>' +
        '<input id="jarg-edit-term" type="text" value="' + String(r.term || '').replace(/"/g, '&quot;') + '" style="width:100%;margin-bottom:10px;padding:8px 12px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Rajdhani,sans-serif;font-size:13px;">' +
        '<label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;">Explainer</label>' +
        '<textarea id="jarg-edit-expl" rows="4" style="width:100%;margin-bottom:12px;padding:8px 12px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Rajdhani,sans-serif;font-size:13px;resize:vertical;">' + String(r.explainer || '').replace(/</g, '&lt;') + '</textarea>' +
        '<button id="jarg-edit-save" style="width:100%;padding:10px;background:var(--green);border:none;border-radius:8px;color:#000;font-weight:700;font-size:13px;cursor:pointer;font-family:Rajdhani,sans-serif;">✓ Save &amp; Accept</button>';
      pop.box.querySelector('#jarg-edit-save').onclick = function() {
        var newTerm = pop.box.querySelector('#jarg-edit-term').value.trim();
        var newExpl = pop.box.querySelector('#jarg-edit-expl').value;
        var pp = RPGACE.modules.phylumPath;
        if (!pp || !pp._resolvePendingTerm) { pop.close(); return; }
        pp._resolvePendingTerm(r, 'edit', newTerm, newExpl).then(function() {
          pop.close();
          self.ui._loadAndRenderTerms();
        });
      };
    },

  },

  // Thin top-level pass-throughs — preserve the exact convention every
  // other split module in this file uses. `init` calls `self.
  // _injectPageShell()`/`self._loadAndRenderTerms()`, and every internal
  // `self.ui.X()` call inside `ui` resolves directly against the `ui`
  // sub-object (no pass-through needed there) — these exist for external
  // callers and for the module's own top-level init.
  _injectPageShell: function() { return this.ui._injectPageShell(); },
  _loadAndRenderTerms: function() { return this.ui._loadAndRenderTerms(); },

});
/* ===END:jargonEncyclopedia=== */
