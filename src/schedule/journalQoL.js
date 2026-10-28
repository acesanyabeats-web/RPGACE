
/* ===MODULE:journalQoL=== */
// July 22 QoL request: "no search or filtering, doesn't surface the new
// audit trails, no tagging/categorisation." GODMODE evidence pass: the
// journal table's real column is `source` (schedule/feynman/oracle/
// beatLog/contentProductionLive/morning-routine/manual, confirmed by
// direct query) - already an implicit category, just never surfaced as
// filterable tags in the UI. No stable per-card id/class exists in
// refreshJournalDisplay's render (main.js, frozen) - unlike Encyclopedia,
// which tags each card with enc-card-${safeId} - so search/filter here
// works purely by textContent match over #journal-output's direct
// children rather than an id-based lookup; simpler, and doesn't require
// touching or duplicating the frozen render function.
RPGACE.register('journalQoL', {
  domain: 'schedule',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 28 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // twenty-seven predecessors already shipped and verified. Pure
  // internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale,
  // never rewritten and never split down the middle. Bodies are
  // deliberately NOT re-indented inside their new namespace, matching
  // the recently shipped docsLinks/encSync precedent, so the diff shows
  // only real changes rather than a whitespace wall.
  //
  // 6 real members: 4 functions, one declared data field (SOURCES) and
  // one UNDECLARED, RUNTIME-ASSIGNED data field (`_activeSource` — see
  // the dedicated note below, it is the whole risk of this module).
  // SOURCES stays at module scope. `init` stays a literal top-level
  // function (RPGACE.register() calls `module.init()` directly and
  // cannot see into a sub-object).
  //
  // This module splits 4 / 0: all four movable functions land in `ui`,
  // and `logic` is genuinely EMPTY — the honest inverse of the "empty
  // ui" precedent already shipped several times this series (encSync,
  // scheduleFixes), and kept as an explicit `logic: {}` so the module
  // still declares the same two-namespace shape as every sibling.
  // Classification, function by function, each checked against its
  // actual body rather than its name:
  //   • _injectControls → ui. Unambiguous: two `getElementById` reads,
  //     `document.createElement` ×2, `insertBefore` and
  //     `insertAdjacentElement`.
  //   • _makeChip → ui. Unambiguous: `document.createElement('button')`
  //     plus a full inline style/dataset build. Its onclick closure
  //     additionally runs `document.querySelectorAll` and writes
  //     `.style` on every chip.
  //   • _applyFilter → ui. Unambiguous: `getElementById`,
  //     `querySelectorAll('#journal-output > div')` and a
  //     `card.style.display` write per card. Worth naming that its
  //     matching is done on `card.textContent` rather than on any data
  //     model — there is no in-memory row list here at all (see the
  //     module's own July 22 header note above), so there is genuinely
  //     no data half of this function to lift into `logic`.
  //   • _injectAuditEntries → ui. SEE THE INSEPARABILITY NOTE BELOW —
  //     it runs two real Supabase reads, so it is named here rather
  //     than filed quietly.
  //
  // ─── _injectAuditEntries: why its Supabase reads stay in `ui` ─────
  // It opens with `document.getElementById('journal-output')` and an
  // `el.querySelector('.journal-audit-entry')` re-entry guard, so it
  // DISCOVERS DOM and qualifies for `ui` on the primary rule outright.
  // The `Promise.all` over `taxonomy_decision_log` +
  // `oracle_dev_suggestions` that follows is genuinely NOT separable
  // into `logic` without splitting the function down the middle, which
  // this pass's own rules forbid: the `.then` maps both result sets
  // straight into an HTML STRING and calls
  // `el.insertAdjacentHTML('afterbegin', html)` on the element captured
  // before the query was ever issued, then `self._applyFilter()`. The
  // rows are not returned, not stored and not reused; their only
  // consumer is the markup this function was already committed to
  // building. That is the exact shape jargonEncyclopedia.ui._openGlossary
  // and encTaxonomyLink.ui._injectButtons were both shipped on, and it
  // is reinforced here by the standing rule extension that building
  // HTML markup for injection is itself DOM construction.
  //
  // ─── `_activeSource`: the real bug this split had to not create ───
  // `_activeSource` is a module field that is never DECLARED as a
  // top-level key — it is created at runtime by `_injectControls`
  // (`self._activeSource = 'all';`) and reassigned by every chip's
  // onclick inside `_makeChip` (`self._activeSource = key;`), then READ
  // by `_applyFilter` (`this._activeSource || 'all'`). That read was
  // the one genuinely dangerous line in this module: inside `ui`,
  // `this` is the `ui` object, so `this._activeSource` would have been
  // `undefined` and the `|| 'all'` fallback would have swallowed it
  // completely — no error, no warning, just a source-filter chip that
  // visibly highlights when pressed and then filters nothing, forever.
  // This is the same bug class oracleDevBridge's `this.TABLE`
  // documented, with the extra trap that a grep of the top-level keys
  // does not reveal `_activeSource` at all. All three sites now go
  // through the module handle, so the field lives on the module exactly
  // where it always did.
  //
  // `this`/`self` accounting for all 4 moved functions, so a later
  // reader can check by grep rather than take it on trust:
  //   • _injectControls — already had `var self = this;`, swapped for
  //     the module handle IN PLACE (it sits after the three guards,
  //     none of which touches `this`, so control flow is unchanged).
  //     Captured for `self._makeChip(...)` ×2, `self.SOURCES` (a
  //     module-scope data field) and `self._activeSource = 'all'`.
  //   • _makeChip — same in-place swap. Captured by the button's
  //     onclick closure for `self._activeSource = key` and
  //     `self._applyFilter()`. Its inner `Array.prototype.forEach.call`
  //     callback uses a plain `b` parameter, not `this`, so nothing
  //     else there needed touching.
  //   • _applyFilter — had NO `var self` at all; the handle is inserted
  //     as its first statement and the bare `this._activeSource`
  //     rewritten. Its own `Array.prototype.forEach.call` callback uses
  //     a plain `card` parameter, untouched.
  //   • _injectAuditEntries — already had `var self = this;`, swapped
  //     in place. Captured by the `.then` for `self._applyFilter()`.
  //
  // Every one of those cross-references (`_makeChip`, `_applyFilter`)
  // is ui -> ui, so all four would in fact have kept working through a
  // bare `this.` — EXCEPT `_activeSource` and `SOURCES`, which are
  // module-scope DATA and would not have. Requalified uniformly anyway,
  // per the standing rule that the module must never depend on two
  // members happening to share a namespace.
  //
  // Zero external touchpoints confirmed by a fresh repo-wide grep for
  // `RPGACE.modules.journalQoL` (0 hits anywhere, rpgace_core.js and
  // index.html included) — the module is driven entirely by the
  // `window.refreshJournalDisplay` wrapper `init` installs, its own
  // 1500ms boot timer, and the `page:show` hook. The four `"_applyFilter"
  // / "_injectAuditEntries" / "_injectControls" / "_makeChip"` entries in
  // this file's own METHOD_MODULE_MAP (G109) are a generated name->module
  // DATA table, not call sites, and are unaffected by this split.
  // ══════════════════════════════════════════════════════════════════

  SOURCES: ['schedule', 'feynman', 'oracle', 'beatLog', 'contentProductionLive', 'morning-routine', 'manual'],
  // SL-4 (Oct 27 2026): plain names on the filter chips (the key still matches the card text).
  LABELS: { schedule: 'Schedule', feynman: 'Explain it back', oracle: 'Oracle', beatLog: 'Beat log', contentProductionLive: 'Content', 'morning-routine': 'Morning', manual: 'Written by you' },

  init: function() {
    var self = this;
    function patch() {
      if (typeof window.refreshJournalDisplay !== 'function' || window._journalQoLPatched) return;
      window._journalQoLPatched = true;
      var orig = window.refreshJournalDisplay;
      window.refreshJournalDisplay = function() {
        var result = orig.apply(this, arguments);
        Promise.resolve(result).then(function() {
          setTimeout(function() {
            self._injectAuditEntries();
            self._applyFilter();
          }, 80);
        });
        return result;
      };
    }
    patch();
    setTimeout(patch, 1500);
    setTimeout(function() { self._injectControls(); }, 1500);
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.journal) setTimeout(function() { self._injectControls(); }, 300);
    });
  },

  // ============================================================
  // logic — deliberately empty. All four movable functions in this
  // module construct or discover DOM (see the G53 block above); there
  // is no in-memory row model here to filter against, so there is no
  // data half to lift out. Kept as an explicit `{}` so the module
  // still declares the same two-namespace shape as every sibling.
  // ============================================================
  logic: {},

  // ============================================================
  // ui — rendering/DOM: injects the search box + source chips into
  // the Journal control row, builds each chip, applies the live
  // text/source filter over the rendered cards, and prepends the
  // read-only audit entries fetched from taxonomy_decision_log +
  // oracle_dev_suggestions.
  // ============================================================
  ui: {

  _injectControls: function() {
    if (document.getElementById('journal-search-input')) return;
    var countEl = document.getElementById('journal-count');
    var controlsRow = countEl ? countEl.parentElement : null;
    if (!controlsRow) return;
    var self = RPGACE.modules.journalQoL;

    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'journal-search-input';
    input.placeholder = '🔍 Search journal...';
    input.style.cssText = 'flex:1;min-width:160px;background:var(--panel2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 12px;font-size:13px;font-family:Rajdhani,sans-serif;outline:none';
    input.addEventListener('input', function() { self._applyFilter(); });
    controlsRow.insertBefore(input, countEl);

    var chipRow = document.createElement('div');
    chipRow.id = 'journal-source-chips';
    chipRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px';
    var allChip = self._makeChip('all', 'All');
    // Real bug fix (found + fixed in review, G53 batch 9): 'all' is the
    // real active source on first render (set below), but the chip
    // itself always renders with _makeChip's plain inactive style - so
    // nothing looked selected even though 'all' genuinely was. Apply
    // the same active-state styling _makeChip's own onclick uses.
    allChip.style.background = 'rgba(201,168,76,0.15)';
    allChip.style.borderColor = 'rgba(201,168,76,0.45)';
    allChip.style.color = 'var(--gold)';
    chipRow.appendChild(allChip);
    self.SOURCES.forEach(function(s) { chipRow.appendChild(self._makeChip(s, self.LABELS[s] || s)); });
    controlsRow.insertAdjacentElement('afterend', chipRow);
    self._activeSource = 'all';
    // SL-4: the chips fold into one "Show: All ▾" row; Refresh lives in the › side list.
    if (RPGACE.sideList) RPGACE.sideList.filterRow(chipRow, { prefix: 'Show', label: function() { var k = self._activeSource || 'all'; return k === 'all' ? 'All' : (self.LABELS[k] || k); } });
    var pg = document.getElementById('page-' + RPGACE.CONFIG.pages.journal);
    if (pg) pg._sideExtras = function() { return [['🔄', 'Refresh the journal', function() { refreshJournalDisplay(); }, 'journal-refresh']]; };
  },

  _makeChip: function(key, label) {
    var self = RPGACE.modules.journalQoL;
    var btn = document.createElement('button');
    btn.dataset.sourceKey = key;
    btn.textContent = label;
    btn.style.cssText = 'padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);color:rgba(226,226,236,0.5)';
    btn.onclick = function() {
      self._activeSource = key;
      Array.prototype.forEach.call(document.querySelectorAll('#journal-source-chips button'), function(b) {
        var on = b.dataset.sourceKey === key;
        b.style.background = on ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)';
        b.style.borderColor = on ? 'rgba(201,168,76,0.45)' : 'rgba(255,255,255,0.1)';
        b.style.color = on ? 'var(--gold)' : 'rgba(226,226,236,0.5)';
      });
      self._applyFilter();
    };
    return btn;
  },

  _applyFilter: function() {
    var self = RPGACE.modules.journalQoL;
    var input = document.getElementById('journal-search-input');
    var term = input ? input.value.trim().toLowerCase() : '';
    var source = self._activeSource || 'all';
    var cards = document.querySelectorAll('#journal-output > div');
    Array.prototype.forEach.call(cards, function(card) {
      var text = card.textContent.toLowerCase();
      var matchesTerm = !term || text.indexOf(term) !== -1;
      var matchesSource = source === 'all' || text.indexOf(source.toLowerCase()) !== -1;
      card.style.display = (matchesTerm && matchesSource) ? '' : 'none';
    });
  },

  // Surfaces taxonomy_decision_log + oracle_dev_suggestions (both built
  // earlier this session) as readable, clearly-tagged, READ-ONLY entries
  // in the Journal feed - this is exactly the "running log" page these
  // two append-only tables were missing a human-readable home in.
  // Fetched fresh each render (both tables are tiny; no caching concern),
  // prepended above the real journal entries, visually distinguished so
  // they're never confused with something Alex wrote or can delete.
  _injectAuditEntries: function() {
    var el = document.getElementById('journal-output');
    if (!el || el.querySelector('.journal-audit-entry')) return;
    if (el.textContent.indexOf('Your Journal is Empty') !== -1) return;

    var self = RPGACE.modules.journalQoL;
    Promise.all([
      RPGACE.sb.select('taxonomy_decision_log', 'order=created_at.desc&limit=10').catch(function() { return []; }),
      RPGACE.sb.select('oracle_dev_suggestions', 'order=created_at.desc&limit=10').catch(function() { return []; }),
    ]).then(function(results) {
      var decisions = results[0] || [];
      var suggestions = results[1] || [];
      var rows = decisions.map(function(d) {
        return { date: (d.created_at || '').slice(0, 10), label: '🧬 Taxonomy Decision', color: '#4CAF82', text: 'Placed at ' + (d.path || '') + (d.insight_text ? ': ' + d.insight_text.slice(0, 140) : '') };
      }).concat(suggestions.map(function(s) {
        return { date: (s.created_at || '').slice(0, 10), label: '🧪 Oracle Suggestion', color: '#4A8CCC', text: (s.suggestion_text || '').slice(0, 200), status: s.status };
      }));
      if (!rows.length) return;
      rows.sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });
      // Oct 15 2026 (Alex: "saved a journal entry... it disappeared"): these 20
      // system rows used to be prepended ABOVE his own entries, pushing a fresh
      // entry to 21st place. They now sit folded at the END, below his writing.
      var html = rows.map(function(r) {
        return '<div style="background:var(--panel2);border:1px solid var(--border);border-left:3px solid ' + r.color + ';border-radius:10px;padding:14px 16px;margin-bottom:12px;opacity:0.9">'
          + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">'
          + '<div style="font-family:Cinzel,serif;font-size:12px;color:' + r.color + ';font-weight:600">' + r.label + (r.status ? ' — ' + r.status : '') + '</div>'
          + '<div style="font-size:11px;color:var(--muted)">📅 ' + (r.date || '') + '</div>'
          + '</div>'
          + '<div style="font-size:12px;color:var(--text);line-height:1.6;margin-top:6px">' + r.text.replace(/</g, '&lt;') + '</div>'
          + '</div>';
      }).join('');
      el.insertAdjacentHTML('beforeend', '<details class="journal-audit-entry" style="margin-top:8px"><summary style="cursor:pointer;color:var(--muted);font-size:12px;padding:10px 4px;min-height:44px;display:flex;align-items:center">🧬 System log (' + rows.length + ') — taxonomy decisions and Oracle suggestions</summary>' + html + '</details>');
      self._applyFilter();
    });
  },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. No external caller invokes any METHOD of this module (verified
  // by a fresh grep of rpgace_core.js and index.html both — zero hits
  // for `RPGACE.modules.journalQoL` anywhere outside this module's own
  // body), so these exist for convention and for its OWN internal
  // calls: `init`'s `window.refreshJournalDisplay` wrapper calls
  // `self._injectAuditEntries()`/`self._applyFilter()`, its boot timer
  // and `page:show` listener both call `self._injectControls()`,
  // `ui._injectControls` calls `self._makeChip(...)`, `ui._makeChip`'s
  // onclick calls `self._applyFilter()`, and `ui._injectAuditEntries`'s
  // `.then` calls `self._applyFilter()` — every one of those `self`s is
  // the module, so each lands here first and is routed on to `ui`.
  _injectControls: function() { return this.ui._injectControls(); },
  _makeChip: function(key, label) { return this.ui._makeChip(key, label); },
  _applyFilter: function() { return this.ui._applyFilter(); },
  _injectAuditEntries: function() { return this.ui._injectAuditEntries(); },

});
/* ===END:journalQoL=== */
