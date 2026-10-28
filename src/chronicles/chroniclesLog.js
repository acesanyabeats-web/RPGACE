
/* ===MODULE:chroniclesLog=== */
// July 22, round 3 — Alex: "call this whole group the chronicles, that can
// have an expand button that shows logs of what's done, this can then be
// tied to future accounting and logistics metrics for drum kit and beat
// sales, spending on equipment for tax write off etc." Interrogated first
// (real answers recorded verbatim in chronicles_spec_backlog.txt) rather
// than guessing at scope, since this touches real financial record-keeping:
// full log page (not just a bigger inline list), a personal-visibility-only
// finance tracker (not bookkeeping-grade), a SEPARATE finance ledger table
// (chronicles_finance - not inside Phylum 17 Negotium, which stays reserved
// for conceptual business/tax knowledge and is deliberately untouched here),
// manual entry only (no BeatStars/bank integration in this pass).
//
// Page injected at runtime (same proven pattern as phylumPath._injectPageShell
// - main.js's showPage() only needs an element with a matching #page-<name>
// id and class="page" to exist by click time, it doesn't care when or how
// it was created). No main.js edit.
RPGACE.register('chroniclesLog', {
  domain: 'chronicles',
  // LL-8 (Oct 13 2026): the 14 flat type chips became 8 life sections.
  // Each section is the set of item types it shows; 'all' shows everything.
  SECTIONS: [
    { key: 'all',      label: 'All',                  types: null },
    { key: 'content',  label: '🎵 Beats & content',   types: ['content_shipped', 'content_idea', 'post', 'track', 'outreach', 'doing_content'] },
    { key: 'cooking',  label: '🍳 Recipes cooked',    types: ['cook', 'doing_cook'] },
    { key: 'trips',    label: '✈️ Trips, plans & memories', types: ['trip', 'memory'] },
    { key: 'learning', label: '📚 Learning',          types: ['insight', 'bibliography', 'proposal', 'doing_learning', 'study'] },
    { key: 'life',     label: '💪 Life',              types: ['quest', 'gym', 'journal', 'unlock', 'report', 'challenge', 'treat', 'doing_life'] },
    { key: 'money',    label: '💷 Money',             types: ['finance_sale', 'finance_expense', 'agreed_sale'] },
    { key: 'updates',  label: '🛠 App updates',       types: ['system_update'] }
  ],
  // 'Personal' added 2026-09-14 - the real category shoppingWishlist._markBought
  // writes here (Alex's own confirmed answer: "under personal expenses"),
  // reusing this exact suggestion list rather than a 2nd hand-typed one.
  CATEGORY_SUGGESTIONS: ['Equipment', 'Software & Plugins', 'Drum Kits & Samples', 'Studio & Rent', 'Marketing', 'Beat Sale', 'Sample Pack Sale', 'Mixing/Mastering Service', 'Travel', 'Personal', 'Other'],

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 42 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // predecessors already shipped and verified. Pure internal-structure
  // refactor — zero functional, behavioural, UX, data or schema change;
  // every function below was MOVED wholesale, never rewritten and never
  // split down the middle.
  //
  // This module splits 7 ui (_injectPageShell, _renderFilterChips,
  // _paintDigest, _renderSummary, _renderList, _showAddForm, _openCard)
  // / 2 logic (_render, _renderOversightDigest). `_render` and
  // `_renderOversightDigest` both go to `logic` on the same
  // fetch/render-seam precedent already established this series (their
  // real job is fetching + orchestrating, delegating the actual DOM
  // write to already-separate named `ui` functions) — `_render` never
  // touches DOM directly itself; `_renderOversightDigest`'s one DOM
  // touch is a presence guard (`getElementById('chron-digest')`, bail
  // if missing), not construction or a content write, and its real
  // content write is fully delegated to the separately-named
  // `_paintDigest`.
  //
  // Real, DANGEROUS shared-state risk, checked directly and handled
  // with extra care: `_activeFilter`/`_searchText`/`_allItems`/
  // `_digestCache`/`_digestFetching` are ALL undeclared, runtime-
  // assigned module fields (never a top-level `field: null` key —
  // `init` creates the first two, `_render`/`_renderOversightDigest`
  // create the rest) — the exact undeclared-runtime-field bug class
  // journalQoL._activeSource and oracleDevBridge.TABLE already hit
  // earlier this series, invisible to a plain top-level-key grep. Every
  // one of these fields is read/written across BOTH namespaces (e.g.
  // `logic._render` sets `_allItems`, `ui._renderList` reads it) — every
  // function that touches any of them uses `var self =
  // RPGACE.modules.chroniclesLog;` (the MODULE, never `this`), so all
  // five fields always resolve to the SAME shared storage regardless of
  // which sub-namespace the reading/writing function lives in. Getting
  // this wrong (e.g. a stray `this.` inside a moved function) would have
  // silently split `_allItems` into disconnected `ui`/`logic` copies —
  // `_render` would populate one copy, `_renderList` would forever read
  // an empty other one, and the whole page would silently show nothing.
  //
  // Real, load-bearing external touchpoint, confirmed by grep: a
  // dashboard card's `go:` function calls
  // `RPGACE.modules.chroniclesLog._openCard()` directly. Preserved via
  // the pass-through below.
  // ══════════════════════════════════════════════════════════════════

  init: function() {
    var self = this;
    self._activeFilter = 'all';
    self._searchText = '';
    self._injectPageShell();
    RPGACE.hooks.on('page:show', function(name) {
      var pageId = RPGACE.CONFIG && RPGACE.CONFIG.pages ? RPGACE.CONFIG.pages.chronicles : null;
      if (pageId && name === pageId) self._render();
    });
  },

  // ============================================================
  // ui — rendering/DOM: the full Chronicles page, filter chips, the
  // digest paint, the summary chips, the item list, the add-sale/expense
  // form, and the dashboard-card popup preview.
  // ============================================================
  ui: {

  _injectPageShell: function() {
    var self = RPGACE.modules.chroniclesLog;
    if (!RPGACE.CONFIG || !RPGACE.CONFIG.pages) return;
    var pageId = 'page-' + RPGACE.CONFIG.pages.chronicles;
    if (document.getElementById(pageId)) return;
    var app = document.getElementById('app');
    if (!app) return;

    var page = document.createElement('div');
    page.className = 'page';
    page.id = pageId;
    page.innerHTML =
      '<div class="section-title">📜 The Chronicles — Full Log</div>' +
      '<div id="chron-digest" style="display:none;font-size:11px;color:var(--muted);border:1px solid var(--border);border-radius:8px;padding:8px 12px;margin-bottom:12px;line-height:1.6;"></div>' +
      '<div id="chron-summary" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;"></div>' +
      '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center;">' +
        '<input id="chron-search" type="text" placeholder="Search the log…" style="flex:1;min-width:180px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-family:Rajdhani,sans-serif;font-size:13px;">' +
        '<button id="chron-add-btn" style="padding:8px 14px;background:var(--gold);border:none;border-radius:8px;color:#000;font-weight:700;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;">+ Log Sale / Expense</button>' +
      '</div>' +
      '<div id="chron-filters" style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;"></div>' +
      '<div id="chron-list"></div>';
    app.appendChild(page);

    var searchInp = page.querySelector('#chron-search');
    searchInp.addEventListener('input', function() { self._searchText = searchInp.value.toLowerCase(); self._renderList(); });
    page.querySelector('#chron-add-btn').addEventListener('click', function() { self._showAddForm(); });
  },

  _renderFilterChips: function() {
    var self = RPGACE.modules.chroniclesLog;
    var el = document.getElementById('chron-filters');
    if (!el) return;
    el.innerHTML = '';
    var counts = {};
    (self._allItems || []).forEach(function(it) { counts[it.type] = (counts[it.type] || 0) + 1; });
    self.SECTIONS.forEach(function(sec) {
      var f = sec.key;
      var active = f === self._activeFilter;
      var n = sec.types ? sec.types.reduce(function(a, t) { return a + (counts[t] || 0); }, 0) : (self._allItems || []).length;
      var b = document.createElement('button');
      b.textContent = sec.label + (self._allItems ? ' · ' + n : '');
      b.style.cssText = 'padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;border:1px solid ' + (active ? 'var(--gold)' : 'var(--border)') + ';background:' + (active ? 'var(--gold)' : 'var(--panel2)') + ';color:' + (active ? '#000' : 'var(--muted)') + ';';
      b.onclick = function() { self._activeFilter = f; self._renderFilterChips(); self._renderList(); };
      el.appendChild(b);
    });
    // SL-5 (Oct 27 2026): the 9 section chips fold into one "Show: … ▾" row.
    if (self._chipRow && !document.body.contains(self._chipRow.row)) self._chipRow = null;
    if (!self._chipRow && RPGACE.sideList && !el._sideFilter) self._chipRow = RPGACE.sideList.filterRow(el, { prefix: 'Show', label: function() {
      var sec = self.SECTIONS.filter(function(x) { return x.key === self._activeFilter; })[0] || self.SECTIONS[0];
      var n = (self._allItems || []).filter(function(it) { return !sec.types || sec.types.indexOf(it.type) !== -1; }).length;
      return sec.label + (self._allItems ? ' · ' + n : '');
    } });
    else if (self._chipRow) self._chipRow.refresh();
  },

  _paintDigest: function(lines) {
    var el = document.getElementById('chron-digest');
    if (!el || !lines || !lines.length) return;
    el.innerHTML = lines.map(function(l) { return '<div>' + l.replace(/</g, '&lt;') + '</div>'; }).join('');
    el.style.display = 'block';
  },

  _renderSummary: function(finance) {
    var el = document.getElementById('chron-summary');
    if (!el) return;
    var sales = finance.filter(function(r) { return r.type === 'sale'; });
    var expenses = finance.filter(function(r) { return r.type === 'expense'; });
    var totalSales = sales.reduce(function(s, r) { return s + Number(r.amount || 0); }, 0);
    var totalExpenses = expenses.reduce(function(s, r) { return s + Number(r.amount || 0); }, 0);
    var byCat = {};
    expenses.forEach(function(r) { var c = r.category || 'Other'; byCat[c] = (byCat[c] || 0) + Number(r.amount || 0); });
    var catLine = Object.keys(byCat).sort(function(a, b) { return byCat[b] - byCat[a]; })
      .map(function(c) { return c + ': £' + byCat[c].toFixed(2); }).join(' • ') || 'No expenses logged yet';

    function chip(label, val, color) {
      return '<div style="background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:10px 16px;text-align:center;min-width:110px">'
        + '<div style="font-family:Cinzel,serif;font-size:17px;color:' + color + '">' + val + '</div>'
        + '<div style="font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-top:2px">' + label + '</div></div>';
    }
    el.innerHTML = chip('Total Sales', '£' + totalSales.toFixed(2), 'var(--green)')
      + chip('Total Expenses', '£' + totalExpenses.toFixed(2), 'var(--red)')
      + chip('Net', (totalSales - totalExpenses >= 0 ? '£' : '-£') + Math.abs(totalSales - totalExpenses).toFixed(2), 'var(--gold)')
      + '<div style="flex-basis:100%;font-size:11px;color:var(--muted);padding:4px 2px">Expenses by category: ' + catLine.replace(/</g, '&lt;') + '</div>'
      + '<div style="flex-basis:100%;font-size:11px;color:var(--muted);font-style:italic;padding:0 2px">Personal visibility tracker only — not bookkeeping-grade. Keep real receipts for actual tax filing.</div>';
  },

  _renderList: function() {
    var self = RPGACE.modules.chroniclesLog;
    var listEl = document.getElementById('chron-list');
    if (!listEl || !self._allItems) return;
    var q = self._searchText;
    var sec = self.SECTIONS.filter(function(x) { return x.key === self._activeFilter; })[0];
    var types = sec ? sec.types : null;
    var filtered = self._allItems.filter(function(it) {
      if (types && types.indexOf(it.type) === -1) return false;
      if (q && it.label.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    listEl.innerHTML = '';
    if (!filtered.length) {
      var empty = document.createElement('div');
      empty.style.cssText = 'font-size:12px;color:var(--muted);padding:20px 0;text-align:center';
      var tp = RPGACE.modules.tripPlans;
      empty.textContent = (self._activeFilter === 'trips' && !(tp && tp.logic.signedIn()))
        ? 'Sign in to see your finished trips and plans (they are kept private).'
        : (self._activeFilter === 'trips' ? 'No finished trips or plans yet. Mark a plan done in Plans and it shows here.' : 'Nothing matches yet.');
      listEl.appendChild(empty);
      return;
    }
    filtered.forEach(function(it) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;';
      row.onmouseenter = function() { row.style.background = 'var(--panel2)'; };
      row.onmouseleave = function() { row.style.background = 'transparent'; };
      var icon = document.createElement('span'); icon.style.fontSize = '14px'; icon.textContent = it.icon;
      var label = document.createElement('span'); label.style.cssText = 'flex:1;font-size:12px;color:var(--text);'; label.textContent = it.label;
      var date = document.createElement('span'); date.style.cssText = 'font-size:11px;color:var(--muted);'; date.textContent = RPGACE.modules.careerStatCard._relTime(it.t);
      row.appendChild(icon); row.appendChild(label); row.appendChild(date);
      row.onclick = function() { RPGACE.modules.careerStatCard._showDetail(it); };
      listEl.appendChild(row);
    });
  },

  _showAddForm: function() {
    var self = RPGACE.modules.chroniclesLog;
    var dd = RPGACE.modules.dashDeck;
    if (!dd || !dd._popup) { console.warn('[RPGACE:chroniclesLog] dashDeck._popup unavailable'); return; }
    var pop = dd._popup({ eyebrow: '📜 The Chronicles', title: 'Log a real sale or expense', width: '480px', accent: 'var(--gold)' });
    var today = new Date().toISOString().slice(0, 10);
    var datalistOpts = self.CATEGORY_SUGGESTIONS.map(function(c) { return '<option value="' + c + '">'; }).join('');
    pop.box.innerHTML =
      '<div style="display:flex;flex-direction:column;gap:10px;">' +
        '<label style="font-size:11px;color:var(--muted)">Type<select id="cf-type" style="width:100%;margin-top:4px;padding:8px;background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:Rajdhani,sans-serif;">' +
          '<option value="expense">🧾 Expense (equipment, plugins, etc.)</option>' +
          '<option value="sale">💰 Sale (beat sold, drum kit sold, etc.)</option>' +
        '</select></label>' +
        '<label style="font-size:11px;color:var(--muted)">Date<input id="cf-date" type="date" value="' + today + '" style="width:100%;margin-top:4px;padding:8px;background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:Rajdhani,sans-serif;"></label>' +
        '<label style="font-size:11px;color:var(--muted)">Item<input id="cf-item" type="text" placeholder="e.g. Ableton Move, Custom drum kit" style="width:100%;margin-top:4px;padding:8px;background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:Rajdhani,sans-serif;"></label>' +
        '<label style="font-size:11px;color:var(--muted)">Category<input id="cf-category" type="text" list="cf-cat-list" placeholder="e.g. Equipment" style="width:100%;margin-top:4px;padding:8px;background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:Rajdhani,sans-serif;"><datalist id="cf-cat-list">' + datalistOpts + '</datalist></label>' +
        '<label style="font-size:11px;color:var(--muted)">Amount (£)<input id="cf-amount" type="number" min="0" step="0.01" placeholder="e.g. 149.99" style="width:100%;margin-top:4px;padding:8px;background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:Rajdhani,sans-serif;"></label>' +
        '<label style="font-size:11px;color:var(--muted)">Notes (optional)<textarea id="cf-notes" rows="2" style="width:100%;margin-top:4px;padding:8px;background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:Rajdhani,sans-serif;resize:vertical;"></textarea></label>' +
        '<div id="cf-error" style="color:#CC4A4A;font-size:11px;display:none;"></div>' +
        '<button id="cf-submit" style="padding:10px;background:var(--gold);border:none;border-radius:8px;color:#000;font-weight:700;font-size:13px;cursor:pointer;font-family:Rajdhani,sans-serif;">Save to Chronicles</button>' +
      '</div>';

    pop.box.querySelector('#cf-submit').onclick = function() {
      var g = function(id) { var el = pop.box.querySelector(id); return el ? el.value.trim() : ''; };
      var errEl = pop.box.querySelector('#cf-error');
      var item = g('#cf-item'), amountRaw = g('#cf-amount'), date = g('#cf-date');
      var amount = parseFloat(amountRaw);
      if (!item || !amountRaw || isNaN(amount) || amount < 0) {
        errEl.textContent = 'Item and a valid amount are required.';
        errEl.style.display = 'block';
        return;
      }
      var row = {
        type: g('#cf-type') || 'expense',
        entry_date: date || today,
        item: item,
        category: g('#cf-category') || 'Other',
        amount: amount,
        notes: g('#cf-notes') || null
      };
      RPGACE.sb.secureWrite('chronicles_finance', 'insert', row).then(function() {
        RPGACE.cache.clear('chronicles_finance');
        if (RPGACE.utils && RPGACE.utils.toast) RPGACE.utils.toast('✓ Logged to Chronicles', 'var(--gold)', 2200);
        pop.close();
        self._render();
      }).catch(function(e) {
        errEl.textContent = 'Save failed: ' + e.message;
        errEl.style.display = 'block';
      });
    };
  },

  // July 23 — folded into the dashDeck card grid, same popup pattern as
  // Oversight/Knowledge Gaps: a compact preview (top 5, same shared
  // _buildItems/detail-popup logic the dashboard feed and full log page
  // already use) plus a real button into the full #page-chronicles page.
  _openCard: function() {
    // Pre-existing dead local, unused anywhere in this function's own
    // body (checked directly) — kept and swapped to the module handle
    // in place rather than deleted, same treatment as
    // knowledgeGap.ui._render / scheduleOracle.ui._showOptionSequence
    // elsewhere in this series: deleting an inert local would be a real
    // source change outside a pure refactor's remit.
    var self = RPGACE.modules.chroniclesLog;
    var dd = RPGACE.modules.dashDeck;
    var csc = RPGACE.modules.careerStatCard;
    if (!dd || !dd._popup || !csc) return;
    var pop = dd._popup({ eyebrow: '📜 The Chronicles', title: 'Recent activity', accent: 'var(--gold)', width: '520px' });
    pop.box.innerHTML = '<div id="dd-chron-list" style="font-size:12px;color:var(--muted)">Loading…</div><button id="dd-chron-full" style="margin-top:14px;width:100%;padding:10px;background:var(--gold);border:none;border-radius:8px;color:#000;font-weight:700;font-size:13px;cursor:pointer;font-family:Rajdhani,sans-serif;">View Full Log →</button>';
    pop.box.querySelector('#dd-chron-full').onclick = function() {
      pop.close();
      if (typeof showPage === 'function') showPage(RPGACE.CONFIG.pages.chronicles);
    };
    csc._fetchAll().then(function(data) {
      var shipped = data.content.filter(function(r) { return csc._isShipped(r); });
      var ideas = data.content.filter(function(r) { return !csc._isShipped(r); });
      var items = csc._buildItems(data, shipped, ideas).slice(0, 5);
      var listEl = pop.box.querySelector('#dd-chron-list');
      if (!listEl) return;
      if (!items.length) { listEl.textContent = 'No real activity logged yet.'; return; }
      listEl.innerHTML = '';
      items.forEach(function(it) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;font-size:12px;color:var(--text);';
        row.innerHTML = '<span>' + it.icon + '</span><span style="flex:1">' + String(it.label).replace(/</g, '&lt;') + '</span><span style="color:var(--muted);font-size:11px">' + csc._relTime(it.t) + '</span>';
        row.onclick = function() { csc._showDetail(it); };
        listEl.appendChild(row);
      });
    }).catch(function(e) {
      var listEl = pop.box.querySelector('#dd-chron-list');
      if (listEl) listEl.textContent = 'Load failed: ' + e.message;
    });
  }

  },

  // ============================================================
  // logic — business logic/data: the two fetch-and-delegate
  // orchestrators. Neither constructs or writes DOM directly.
  // ============================================================
  logic: {

  _render: function() {
    var self = RPGACE.modules.chroniclesLog;
    var csc = RPGACE.modules.careerStatCard;
    if (!csc) return;
    csc._fetchAll().then(function(data) {
      var shipped = data.content.filter(function(r) { return csc._isShipped(r); });
      var ideas = data.content.filter(function(r) { return !csc._isShipped(r); });
      self._allItems = csc._buildItems(data, shipped, ideas);
      self._renderSummary(data.finance || []);
      self._renderFilterChips();
      self._renderList();
    }).catch(function(e) {
      console.warn('[RPGACE:chroniclesLog] render failed', e.message);
    });
    self._renderOversightDigest();
  },

  // Journal/Chronicles/oversight cross-feed idea, Alex-confirmed July 24:
  // "measured doses" on-open digest, sourced from all six oversight docs
  // (not just minotaur_map) - kept deliberately light. Fetches ONCE per
  // session (this project's own real freeze history came from repeated
  // re-fetches on every page:show - careerStatCard._fetchAll had exactly
  // this bug, fixed earlier), fails open/silent if any doc is unreachable,
  // and shows short excerpts only - no markdown parsing, no new dependency.
  _renderOversightDigest: function() {
    var self = RPGACE.modules.chroniclesLog;
    var el = document.getElementById('chron-digest');
    if (!el) return;
    if (self._digestCache) { self._paintDigest(self._digestCache); return; }
    if (self._digestFetching) return;
    self._digestFetching = true;

    Promise.all([
      fetch('/CLAUDE.md').then(function(r) { return r.ok ? r.text() : null; }).catch(function() { return null; }),
      fetch('/patch_notes.html').then(function(r) { return r.ok ? r.text() : null; }).catch(function() { return null; }),
    ]).then(function(results) {
      var claudeMd = results[0], patchNotes = results[1];
      var lines = [];

      if (claudeMd) {
        var stateMatch = claudeMd.match(/^## Current state.*\n- (.+)$/m);
        if (stateMatch) lines.push('🧭 ' + stateMatch[1].replace(/\*\*/g, '').slice(0, 160));
      }
      if (patchNotes) {
        var cardMatch = patchNotes.match(/<div class="card-title">([^<]+)<\/div>/);
        if (cardMatch) lines.push('📋 Latest: ' + cardMatch[1].replace(/&amp;/g, '&').slice(0, 160));
      }

      self._digestCache = lines;
      self._digestFetching = false;
      self._paintDigest(lines);
    }).catch(function() { self._digestFetching = false; });
  },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. Real, load-bearing external touchpoint: a dashboard card's
  // `go:` function calls `RPGACE.modules.chroniclesLog._openCard()`
  // directly. Also carries this module's own internal calls and the
  // shared-state routing described in the G53 block above — every
  // `self` inside a moved function is the module, so each lands here
  // first and is routed on to the right namespace.
  _injectPageShell: function() { return this.ui._injectPageShell(); },
  _renderFilterChips: function() { return this.ui._renderFilterChips(); },
  _paintDigest: function(lines) { return this.ui._paintDigest(lines); },
  _renderSummary: function(finance) { return this.ui._renderSummary(finance); },
  _renderList: function() { return this.ui._renderList(); },
  _showAddForm: function() { return this.ui._showAddForm(); },
  _openCard: function() { return this.ui._openCard(); },
  _render: function() { return this.logic._render(); },
  _renderOversightDigest: function() { return this.logic._renderOversightDigest(); },

});
/* ===END:chroniclesLog=== */
