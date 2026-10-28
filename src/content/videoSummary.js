
/* ===MODULE:videoSummary=== */
// July 19 — the "Video Summary" page (approved plan, spec answers
// recorded there): replaces the Insights tab's flat rows with per-video
// summary cards. Collapsed card = video meta + its TOP 3 insights ranked
// by the unified scored engine's stored confidence, each with insight
// text, taxonomy path, and justification. Expanding shows ALL insights
// as readable prose, then a grouped Taxonomy placements section. Old
// videos (no per-insight proposals) get a per-video "🧬 Run Phylum Path"
// retro button (max 4 sequential calls, explicit click only). ZERO
// Oracle calls in the render path - Council-of-5 presence comes from the
// stored justification/confidenceScore, never re-computed.
//
// DELIBERATE: cards use the .vs-card CLASS, never inline
// background:var(--panel2)+margin-bottom:12px styles, and every card has
// an id - this makes intelDelete's legacy insight-UI selector match 0
// cards and its MutationObserver ignore our renders, cleanly retiring
// that module's master-toggle/collapsed-list without editing it (its
// watchlist delete, bibliography section, and _deleteUnified stay in
// active use - our 🗑 calls _deleteUnified directly).
RPGACE.register('videoSummary', {
  domain: 'content',
  // ══════════════════════════════════════════════════════════════════
  // G53 (Aug 2026) — real, ratified /CEO plan item, and the SEVENTH
  // module to take this shape (after the videoPipeline/beatLog/bookworm/
  // phylumPath pilot, then contentProductionLive and conidPot): this
  // module is split into two internal namespaces, `ui` (rendering/DOM)
  // and `logic` (business logic/data), following the exact shape those
  // six already shipped and verified. Pure internal-structure refactor —
  // zero functional, behavioural, UX, data or schema change; every
  // function below was MOVED wholesale, never rewritten, never split down
  // the middle, and its own body is otherwise untouched.
  //
  // 29 real functions: `init` stays a literal top-level function (because
  // RPGACE.register() calls `module.init()` directly and cannot see into a
  // sub-object, and its own `self` genuinely IS the module — byte-identical,
  // still calling the top-level pass-throughs), 14 moved into `logic`, 14
  // into `ui`. All 5 module-scope DATA fields — PROPOSALS_TTL, _proposals,
  // _proposalsAt, _fetching, _expanded — stay exactly where they were. Only
  // functions moved.
  //
  // The one real risk this split has to get right, function by function: a
  // function moved into `ui`/`logic` is invoked with `this` bound to THAT
  // sub-object, not the module. Every moved function that touches `this`
  // now opens with `var self = RPGACE.modules.videoSummary;` and has every
  // pre-existing `this.X` rewritten to `self.X`, so each reference keeps
  // resolving to the module exactly as before — reaching the top-level
  // pass-throughs, which is precisely why every moved function keeps one.
  // That matters most for the four real module-scope MUTATIONS, which must
  // land on the module and never on a sub-object or the cached-proposal
  // state silently desyncs between namespaces: `self._fetching`,
  // `self._proposals` and `self._proposalsAt` (logic._fetchProposals) and
  // `self._expanded[key]` (ui._toggle, read straight back by ui._cardHtml).
  //
  // Exact accounting of the 28 moved functions, so a later reader can check
  // this by grep rather than take it on trust:
  //   • 11 already had `var self = this;` and simply have that one line
  //     swapped for the handle. In 9 of them it sat at or above the first
  //     `this.` use, so the handle lands in exactly the same position and
  //     statement order is literally unchanged.
  //   • The other 2 of those 11 (logic._maybeRefresh, logic._delete) had it
  //     BELOW their first `this.` use, so the handle is hoisted to the top
  //     of the body: in _maybeRefresh it moves above 2 side-effect-free
  //     early-return guards, in _delete above a lookup, a guarded early
  //     return and two local `var`s. A bare property read of
  //     RPGACE.modules.videoSummary has no side effects and the module is
  //     always registered before any of these can run, so ordering is
  //     unchanged in effect. (Same case contentProductionLive._injectOracleBar
  //     and conidPot._updateBriefRotationLabel already set precedent for.)
  //   • 9 had no `var self` at all and used bare `this.X` (_statusChip,
  //     _placementRowHtml, _headerHtml, _verdictHtml, _proseHtml,
  //     _footerHtml, _toggle, _findByKey, _saveEnc): they get the handle
  //     inserted as their first statement — the videoPipeline pilot's own
  //     `var mod = RPGACE.modules.videoPipeline;` precedent.
  //   • 8 (_esc, _key, _sid, _reports, _cleanTitle, _conf, _coerce,
  //     ui._injectStyles) reference neither `this` nor `self` at all and
  //     moved completely untouched.
  //
  // `init` keeps its own `return orig.apply(this, arguments);` verbatim —
  // that `this` is the CALL-SITE receiver of the window.loadIntelInsights
  // wrapper, not the module, and it is the only nested-function `this` in
  // the whole module. It is deliberately NOT rewritten, and is a second
  // independent reason init could not have been moved even if the
  // register() constraint above did not already settle it.
  //
  // Classification rule used (identical to the rule beatLog/
  // contentProductionLive/conidPot each recorded): a function lives in `ui`
  // if it CONSTRUCTS OR DISCOVERS DOM (document.*, createElement,
  // getElementById, querySelector, innerHTML); otherwise in `logic`.
  // Deliberately NOT counted as a ui signal, matching the phylumPath pilot's
  // own precedent: a bare window `confirm()`/`prompt()` dialog, a
  // `showPage()` page-nav call, or opening ANOTHER module's picker/popup. A
  // function that merely TRIGGERS a UI action without constructing any DOM
  // of its own is logic.
  //
  // ONE REAL EXTENSION to that rule, named here rather than applied
  // silently, because videoSummary is the first module in this batch that
  // renders by HTML-STRING CONCATENATION instead of createElement: a
  // function that returns a markup string destined for `.innerHTML` counts
  // as constructing DOM and lives in `ui`, even though it names no
  // document.* API. Grep signal: its body builds string literals opening
  // `'<` AND names no document.* API — exactly 10 of the 14 `ui` functions
  // (_statusChip, _placementRowHtml, _headerHtml, _verdictHtml,
  // _legacyBulletsHtml, _bulletGroupHtml, _proseHtml, _placementsHtml,
  // _footerHtml, _cardHtml). A bare `'<` grep returns 11 rather than 10, the
  // extra being ui._render itself, which holds the empty-state markup inline
  // but is classified on the primary DOM rule, not this extension. Those 10
  // feed one real sink, ui._render's `el.innerHTML = ...`. Reading
  // the rule literally instead would have put this module's entire render
  // layer into `logic` and left `ui` holding four functions — the opposite
  // of what the split is for. logic._esc is the deliberate counter-example
  // that keeps the extension honest: it is a bare RPGACE.utils.escapeHtml
  // call that builds no markup of its own, so it stays in `logic`.
  //
  // The genuinely mixed / judgment-call functions, each named here with the
  // real evidence rather than silently classified:
  //   • logic._delete and logic._runRetro both MUTATE a DOM element, and
  //     only one handed to them by their caller (`card.remove()`;
  //     `btn.disabled` / `btn.textContent` spinner state) — neither
  //     constructs nor discovers one. That is the exact shape
  //     contentProductionLive._generateBundle was classified `logic` on, and
  //     their real jobs are data: _delete rewrites the localStorage report
  //     array (or delegates to intelDelete._deleteUnified), _runRetro drives
  //     the sequential taxonomyTree.silentPropose chain and the
  //     rpgace_ci_proposed guard string. _delete additionally uses a bare
  //     window.confirm(), explicitly not a ui signal per the rule above.
  //   • logic._maybeRefresh and logic._saveEnc are in `logic` on the
  //     "merely triggers UI" clause: _maybeRefresh is a TTL/in-flight guard
  //     that then calls _render, _saveEnc is a cache lookup that then calls
  //     the legacy global window.saveIntelToEncyclopedia(idx). Neither
  //     builds DOM here.
  //   • So logic -> ui cross-namespace calls are normal in this module
  //     (_maybeRefresh, _delete and _runRetro all end in a _render), exactly
  //     as ui._render/_cardHtml/_toggle/_bindDelegation already call logic.*
  //     functions. Every one of those calls goes through the top-level
  //     pass-throughs via `self.X`, never `this.ui.X` / `this.logic.X`
  //     directly, so no call site inside the module had to change.
  //   • ui._injectStyles and ui._render are the only two functions in the
  //     module that name a document.* API at all. ui._toggle and
  //     ui._bindDelegation DISCOVER DOM through an element handed to them
  //     (`card.querySelector`, `ev.target.closest`, `addEventListener`) and
  //     are in `ui` on that basis, not on the markup-string extension.
  //
  // One pre-existing bug was found while reading every function for this
  // split and is FLAGGED IN PLACE, NOT FIXED — see the re-entrancy note on
  // logic._fetchProposals' catch block below.
  // ══════════════════════════════════════════════════════════════════

  PROPOSALS_TTL: 30000,
  _proposals: null, // null = never loaded (distinct from [] = loaded, none)
  _proposalsAt: 0,
  _fetching: false,
  _expanded: {},


  init: function() {
    var self = this;
    function patch() {
      if (typeof window.loadIntelInsights !== 'function' || window._videoSummaryPatched) return;
      window._videoSummaryPatched = true;
      var orig = window.loadIntelInsights;
      window.loadIntelInsights = function() {
        try { self._render(); }
        catch (e) {
          console.warn('[videoSummary] render failed, falling back:', e.message);
          return orig.apply(this, arguments);
        }
      };
    }
    patch();
    setTimeout(patch, 1500);
    setTimeout(function() { if (typeof window.loadIntelInsights === 'function') window.loadIntelInsights(); }, 1700);
  },

  // ============================================================
  // logic — business logic/data: constructs and discovers no DOM,
  // and builds no markup string (see the rule extension above).
  // ============================================================
  logic: {


    _esc: function(s) { return RPGACE.utils.escapeHtml(s); },
    _key: function(r) { return RPGACE.modules.intelDedup.dedupKey(r); },
    _sid: function(key) {
      var h = 5381;
      for (var i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0;
      return 'vs' + (h >>> 0).toString(36);
    },
    _reports: function() {
      try { return JSON.parse(localStorage.getItem('rpgace_intel_insights') || '[]'); } catch (e) { return []; }
    },
    _cleanTitle: function(r) { return String((r && r.title) || 'Untitled').replace('☁️', '').trim(); },
    _conf: function(p) { return (p.proposed_steps && Number(p.proposed_steps.confidenceScore)) || 0; },
    _coerce: function(b) {
      return typeof b === 'object' && b !== null ? (b.insight || b.technique || b.tip || b.steal || JSON.stringify(b)) : String(b);
    },

    _fetchProposals: function(force) {
      var self = RPGACE.modules.videoSummary;
      if (!RPGACE.sb || !RPGACE.sb.select) return Promise.resolve(self._proposals || []);
      if (force && RPGACE.cache && RPGACE.cache.clear) RPGACE.cache.clear('taxonomy_proposals');
      self._fetching = true;
      return RPGACE.sb.select('taxonomy_proposals', 'source_type=eq.content_intelligence&select=id,source_id,proposed_path,proposed_steps,status,created_at&order=created_at.desc&limit=1000')
        .then(function(rows) {
          self._proposals = rows || [];
          self._proposalsAt = Date.now();
          self._fetching = false;
          return self._proposals;
        }).catch(function(e) {
          // Real bug fixed Sep 2 (flagged by the G53 split's own review,
          // fixed here as a clearly separate change): this catch used to
          // resolve without ever advancing _proposalsAt, so on a
          // persistently failing taxonomy_proposals select, _maybeRefresh
          // -> _render re-entered without bound - _render ends in
          // _maybeRefresh, which saw a still-stale _proposalsAt and a
          // now-false _fetching, refetched, failed, and its .then() called
          // _render again. Async (no stack overflow) but a real hot loop
          // of network calls + full re-renders for as long as the failure
          // persisted. Fixed by stamping _proposalsAt on failure too - the
          // existing PROPOSALS_TTL (30s) now naturally backs off a failing
          // fetch exactly like it already throttles a healthy one, with no
          // new mechanism needed. _proposals itself is untouched on
          // failure (still keeps the last-known-good list, never nulled
          // out) - only the retry timing changes.
          self._proposalsAt = Date.now();
          self._fetching = false;
          console.warn('[videoSummary] proposals fetch failed:', e.message);
          return self._proposals || []; // keep last-known - never null-out on failure
        });
    },

    _proposalsFor: function(key) {
      var self = RPGACE.modules.videoSummary;
      var dd = RPGACE.modules.intelDedup;
      var out = (self._proposals || []).filter(function(p) {
        if (!p.source_id) return false;
        var pk = String(p.source_id).indexOf('title:') === 0
          ? String(p.source_id).toLowerCase()
          : dd.normUrl(p.source_id);
        return pk === key;
      });
      out.sort(function(a, b) { return self._conf(b) - self._conf(a); });
      return out;
    },

    _maybeRefresh: function() {
      var self = RPGACE.modules.videoSummary;
      if (self._fetching) return;
      if (Date.now() - self._proposalsAt <= self.PROPOSALS_TTL) return;
      self._fetchProposals(false).then(function() { self._render(); });
    },

    _findByKey: function(key) {
      var self = RPGACE.modules.videoSummary;
      var arr = self._reports();
      var dd = RPGACE.modules.intelDedup;
      for (var i = 0; i < arr.length; i++) {
        if (dd.dedupKey(arr[i]) === key) return { entry: arr[i], idx: i };
      }
      return null;
    },

    // Kills the old index bug: the index is computed against the LIVE
    // storage array at click time - the same array main.js's frozen
    // saveIntelToEncyclopedia re-reads - never baked into render order.
    _addQuest: function(key, btn) {
      var self = RPGACE.modules.videoSummary, PW = RPGACE.modules.pathways;
      var found = self._findByKey(key);
      if (!found || !PW) { RPGACE.utils.toast('Report no longer in cache', 'rgba(226,84,84,0.85)', 2500); return; }
      btn.disabled = true;
      PW.logic.addQuest(found.entry, Number(btn.getAttribute('data-qi'))).then(function() {
        btn.textContent = '✓ Added';
        RPGACE.utils.toast('➕ Task kept', 'var(--gold)', 2200, 'videoSummary');
      }).catch(function(e) {
        btn.disabled = false;
        RPGACE.utils.toast('Couldn\'t keep the task: ' + e.message, '#CC4A4A', 4000, 'videoSummary');
      });
    },

    _saveEnc: function(key) {
      var self = RPGACE.modules.videoSummary;
      var found = self._findByKey(key);
      if (!found) { RPGACE.utils.toast('Report no longer in cache', 'rgba(226,84,84,0.85)', 2500); return; }
      if (typeof window.saveIntelToEncyclopedia === 'function') window.saveIntelToEncyclopedia(found.idx);
    },

    _delete: function(key, card) {
      var self = RPGACE.modules.videoSummary;
      var found = self._findByKey(key);
      if (!found) { if (card) card.remove(); return; }
      var title = self._cleanTitle(found.entry);
      var del = RPGACE.modules.intelDelete;
      if (del && del._deleteUnified) {
        del._deleteUnified(found.entry, title, card, null);
      } else if (window.confirm('Delete "' + title + '"?')) {
        var arr = self._reports();
        arr.splice(found.idx, 1);
        try { localStorage.setItem('rpgace_intel_insights', JSON.stringify(arr)); } catch (e) {}
        self._render();
      }
    },

    // On-demand retro-analysis for pre-per-insight-loop videos (confirmed
    // answer: per video, never bulk). Sequential silentPropose chain - the
    // unified scored engine does the placement + justification + score;
    // proposals land in the Dashboard review queue like any other.
    _runRetro: function(key, btn) {
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = '🧬 Analysing…';
      var self = RPGACE.modules.videoSummary;
      var reset = function(label) { btn.disabled = false; btn.textContent = label || '🧬 Run Phylum Path'; };
      var found = self._findByKey(key);
      if (!found) { RPGACE.utils.toast('Report no longer in cache', 'rgba(226,84,84,0.85)', 2500); reset(); return; }
      if (!RPGACE.modules.taxonomyTree || !RPGACE.utils._quickPhylaScan) { RPGACE.utils.toast('Taxonomy engine not ready', 'rgba(226,84,84,0.85)', 2500); reset(); return; }
      if (RPGACE.modules.taxonomyTree.logic.isPaused()) { RPGACE.utils.toast('🌳 The tree is paused until the phyla are rebuilt — this video\'s ideas are already in the Encyclopedia', 'rgba(155,89,182,0.85)', 4000); reset(); return; } // LL-3
      var r = found.entry;
      var ins = r.insights || {};
      var enc = ins.encyclopedia_entry || {};
      var texts = [].concat(enc.key_learnings || []).concat(ins.production_techniques || [])
        .map(function(t) { return String(self._coerce(t)).trim(); })
        .filter(function(t) { return t.length >= 40; })
        .slice(0, 4);
      if (!texts.length) { RPGACE.utils.toast('No substantial insights stored for this video', 'rgba(226,84,84,0.85)', 3000); reset(); return; }
      var sourceId = r.url || ('title:' + self._cleanTitle(r).toLowerCase());
      var queued = 0;
      var chain = Promise.resolve();
      texts.forEach(function(t) {
        chain = chain.then(function() {
          var m = RPGACE.utils._quickPhylaScan(t);
          if (!m.length) return;
          return RPGACE.modules.taxonomyTree.silentPropose(t.slice(0, 400), m[0].num, 'content_intelligence', sourceId)
            .then(function() { queued++; })
            .catch(function(e) { console.warn('[videoSummary] retro propose failed:', e.message); });
        });
      });
      chain.then(function() {
        // Append to ciAutoPropose's guard so the 30s scan never re-proposes
        // a video the user just retro-analysed (same key format it uses).
        var guard = localStorage.getItem('rpgace_ci_proposed') || '';
        var gk = r.url || r.title;
        if (gk && guard.indexOf('|' + gk + '|') === -1) {
          try { localStorage.setItem('rpgace_ci_proposed', guard + '|' + gk + '|'); } catch (e) {}
        }
        RPGACE.utils.toast(queued ? ('🌳 ' + queued + ' placement' + (queued > 1 ? 's' : '') + ' queued for review') : 'No phylum match found in stored insights', 'rgba(155,89,182,0.85)', 3500);
        return self._fetchProposals(true);
      }).then(function() { self._render(); });
    },

  },

  // ============================================================
  // ui — rendering/DOM: constructs or discovers DOM, or returns a
  // markup string destined for ui._render's el.innerHTML sink.
  // ============================================================
  ui: {


    _injectStyles: function() {
      if (document.getElementById('vs-styles')) return;
      var st = document.createElement('style');
      st.id = 'vs-styles';
      st.textContent =
        '.vs-card{background:var(--panel2);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:11px}' +
        '.vs-clamp2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
        '.vs-btn{background:none;border:1px solid var(--border);color:var(--text);border-radius:6px;padding:9px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;min-height:38px}' +
        '.vs-chip{display:inline-block;border-radius:10px;padding:2px 8px;font-size:11px;font-weight:700;margin-right:4px}';
      document.head.appendChild(st);
    },

    _render: function() {
      var self = RPGACE.modules.videoSummary;
      self._injectStyles();
      var el = document.getElementById('intel-insights-content');
      if (!el) return;
      var reports = self._reports();
      // VW-0 (Oct 20 2026): newest analyser version seen (intel_reports.analyser_version,
      // set by local_server/intel_common.py); older reports get a label.
      self._newestAnalyser = reports.reduce(function(m, r) { return r.analyser_version && (!m || r.analyser_version > m) ? r.analyser_version : m; }, null);
      if (!reports.length) {
        el.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px">No insights yet.<br><br>Run the Intel script and paste a URL.<br>Reports appear here automatically within 30 seconds.</div>';
        return;
      }
      el.innerHTML = reports.map(function(r) { return self._cardHtml(r); }).join('');
      self._mountRealms(el);
      self._bindDelegation(el);
      RPGACE.ui.batchList(el, 5);
      self._maybeRefresh();
    },

    // VW-4: realm sections are DOM (tappable times, quest card handlers), so
    // they go in after the card HTML.
    _mountRealms: function(el) {
      var self = RPGACE.modules.videoSummary, PW = RPGACE.modules.pathways;
      if (!PW) return;
      Array.prototype.forEach.call(el.querySelectorAll('.vs-realm-mount'), function(m) {
        var found = self._findByKey(m.getAttribute('data-vs-key'));
        var node = found && PW.ui.realmSections(found.entry);
        if (node) m.appendChild(node);
      });
    },

    _statusChip: function(status) {
      var self = RPGACE.modules.videoSummary;
      if (status === 'pending') return '<span class="vs-chip" style="background:rgba(201,168,76,0.15);color:var(--gold)">⏳ pending</span>';
      if (status === 'accepted') return '<span class="vs-chip" style="background:rgba(61,170,110,0.15);color:var(--green)">✓ accepted</span>';
      if (status === 'rejected') return '<span class="vs-chip" style="background:rgba(226,84,84,0.15);color:var(--red)">✗ rejected</span>';
      return '<span class="vs-chip" style="background:rgba(255,255,255,0.06);color:var(--muted)">' + self._esc(status || '?') + '</span>';
    },

    _placementRowHtml: function(p, clamp) {
      var self = RPGACE.modules.videoSummary;
      var steps = p.proposed_steps || {};
      return '<div style="border-left:2px solid rgba(155,89,182,0.4);padding-left:10px;margin-bottom:8px">' +
        '<div' + (clamp ? ' class="vs-clamp2"' : '') + ' style="font-size:12px;color:var(--text)">' + self._esc(steps.insightText) + '</div>' +
        '<div style="font-size:11px;color:var(--gold)">' + self._esc(p.proposed_path) + '</div>' +
        (steps.justification ? '<div style="font-size:11px;color:var(--muted);font-style:italic">' + self._esc(steps.justification) + '</div>' : '') +
        '<span class="vs-chip" style="background:rgba(155,89,182,0.15);color:var(--purple)">⚖ ' + self._conf(p) + '/10</span>' +
        self._statusChip(p.status) +
        '</div>';
    },

    _headerHtml: function(r) {
      var self = RPGACE.modules.videoSummary;
      var score = r.score || 0;
      var bar = '█'.repeat(score) + '░'.repeat(Math.max(0, 10 - score));
      var scoreColor = score >= 7 ? 'var(--green)' : score >= 5 ? 'var(--gold)' : 'var(--red)';
      var when = '';
      try { when = new Date(r.date || r.created_at).toLocaleDateString(); } catch (e) {}
      return '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">' +
        '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--text)">' + self._esc(self._cleanTitle(r)) + '</div>' +
        '<div style="font-size:11px;color:var(--muted)">' + self._esc(r.creator || '') + ' · ' + self._esc(r.platform || '') + ' · ' + self._esc(when) + '</div></div>' +
        '<div style="text-align:right;margin-left:12px"><div style="font-size:18px;font-weight:700;color:' + scoreColor + '">' + score + '/10</div>' +
        '<div style="font-size:10px;color:var(--muted);font-family:monospace">' + bar + '</div></div></div>';
    },

    _verdictHtml: function(r) {
      var self = RPGACE.modules.videoSummary;
      var v = r.insights && r.insights.verdict_summary, nw = self._newestAnalyser;
      var old = nw && r.source !== 'local' && r.analyser_version !== nw
        ? '<div class="intel-old-analyser" style="font-size:11px;color:#e0a84c;margin-bottom:6px">⚠ Made by an older analyser' + (r.analyser_version ? ' (' + self._esc(r.analyser_version) + ')' : '') + ' — re-run it for the new realm reading</div>' : '';
      return old + (v ? '<div style="font-size:12px;color:var(--gold2);margin-bottom:8px;font-style:italic">"' + self._esc(v) + '"</div>' : '');
    },

    _legacyBulletsHtml: function(r) {
      var self = RPGACE.modules.videoSummary;
      var kl = (r.insights && r.insights.encyclopedia_entry && r.insights.encyclopedia_entry.key_learnings) || [];
      var bullets = kl.slice(0, 3).map(function(b) { return '• ' + self._esc(self._coerce(b)); }).join('<br>');
      var html = bullets ? '<div style="font-size:12px;color:var(--muted)">' + bullets + '</div>' : '';
      if (self._proposals === null) {
        html += '<div style="font-size:11px;color:var(--muted);margin-top:4px">taxonomy placements loading…</div>';
      }
      return html;
    },

    _bulletGroupHtml: function(label, items) {
      var self = RPGACE.modules.videoSummary;
      if (!items || !items.length) return '';
      return '<div style="font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(201,168,76,0.6);text-transform:uppercase;margin:10px 0 4px">' + label + '</div>' +
        '<div style="font-size:12px;color:rgba(226,226,236,0.7);line-height:1.7">' +
        items.map(function(b) { return '• ' + self._esc(self._coerce(b)); }).join('<br>') + '</div>';
    },

    _proseHtml: function(r) {
      var self = RPGACE.modules.videoSummary;
      var ins = r.insights || {};
      var enc = ins.encyclopedia_entry || {};
      var html = '<div style="font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(201,168,76,0.6);text-transform:uppercase;margin:10px 0 6px">Summary</div>';
      html += self._verdictHtml(r);
      if (enc.summary) html += '<div style="font-size:12px;color:rgba(226,226,236,0.75);line-height:1.7;margin-bottom:6px">' + self._esc(enc.summary) + '</div>';
      // VW-4: reports made since VW-2 carry realm sections - those replace the
      // old boxes; pathways.ui.realmSections fills this mount after render.
      if (ins.realm_sections && RPGACE.modules.pathways) {
        return html + '<div class="vs-realm-mount" data-vs-key="' + self._esc(self._key(r)) + '"></div>';
      }
      // RI-4: a score + why per realm the video was read through.
      var rs = r.realm_scores || ins.realm_scores || {}, X = RPGACE.modules.xpSeason;
      html += self._bulletGroupHtml('Through your realms', Object.keys(rs).map(function(k) {
        var meta = X && X.REALMS[k], v = rs[k] || {};
        return (meta ? meta.icon + ' ' + meta.name : k) + ' ' + (v.score || '?') + '/10' + (v.why ? ' - ' + v.why : '');
      }));
      html += self._bulletGroupHtml('Key learnings', enc.key_learnings);
      var realmsOf = r.realms || ins.realms || [];
      html += self._bulletGroupHtml(!realmsOf.length || realmsOf.indexOf('producer') !== -1 ? 'Production techniques' : 'Techniques & practices', ins.production_techniques);
      html += self._bulletGroupHtml('What to steal', ins.what_to_steal);
      html += self._questsHtml(r);
      return html;
    },

    // RI-7: suggested quests with one "+ Add" each (delegated: data-vs-action="quest").
    _questsHtml: function(r) {
      var self = RPGACE.modules.videoSummary, PW = RPGACE.modules.pathways, X = RPGACE.modules.xpSeason;
      if (!PW) return '';
      var qs = PW.logic.questsFromReport(r);
      if (!qs.length) return '';
      return '<div style="font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(201,168,76,0.6);text-transform:uppercase;margin:10px 0 4px">Suggested quests</div>' +
        qs.map(function(q, i) {
          var realm = PW.logic.questRealm(r, q), meta = X && X.REALMS[realm];
          return '<div class="vs-quest" data-realm="' + self._esc(realm) + '" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid var(--border)">' +
            '<span style="flex:1;min-width:160px;font-size:13px;color:rgba(226,226,236,0.85);line-height:1.5">' + (meta ? meta.icon + ' ' : '') + self._esc(q.name) + (q.action ? ' - ' + self._esc(q.action) : '') + '</span>' +
            '<span style="font-size:12px;color:var(--muted)">+' + PW.logic.questXp(q.xp) + (meta ? ' ' + self._esc(meta.name) : '') + ' XP</span>' +
            '<button type="button" class="vs-quest-add" data-vs-action="quest" data-qi="' + i + '" style="min-height:44px;padding:6px 14px;background:none;border:1px solid var(--gold);border-radius:8px;color:var(--gold);font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif">+ Add</button>' +
          '</div>';
        }).join('');
    },

    _placementsHtml: function(props, sid) {
      var self = RPGACE.modules.videoSummary;
      var html = '<div style="font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(155,89,182,0.6);text-transform:uppercase;margin:14px 0 6px">Taxonomy placements</div>';
      if (props.length) {
        html += props.map(function(p) { return self._placementRowHtml(p, false); }).join('');
      } else if (self._proposals === null) {
        html += '<div style="font-size:11px;color:var(--muted)">taxonomy placements loading…</div>';
      } else {
        html += '<div style="font-size:12px;color:var(--muted);margin-bottom:6px">No placements yet — this video was analysed before per-insight placement existed.</div>' +
          '<button class="vs-btn" data-vs-action="retro" id="vs-retro-x-' + sid + '" style="color:var(--purple);border-color:rgba(155,89,182,0.4)">🧬 Run Phylum Path</button>';
      }
      return html;
    },

    _footerHtml: function(r, expanded, showRetro, sid) {
      var self = RPGACE.modules.videoSummary;
      var html = '<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">' +
        '<button class="vs-btn" data-vs-action="toggle">' + (expanded ? '▴ Collapse' : '▾ Details') + '</button>' +
        '<button class="vs-btn" data-vs-action="enc">📖 Encyclopedia</button>';
      if (r.url) html += '<a class="vs-btn" style="text-decoration:none;color:var(--muted);display:inline-flex;align-items:center" href="' + self._esc(r.url) + '" target="_blank">🔗 Original</a>';
      if (showRetro) html += '<button class="vs-btn" data-vs-action="retro" id="vs-retro-' + sid + '" style="color:var(--purple);border-color:rgba(155,89,182,0.4)">🧬 Run Phylum Path</button>';
      html += '<button class="vs-btn" data-vs-action="del" style="color:rgba(226,84,84,0.8)">🗑</button></div>';
      return html;
    },

    _cardHtml: function(r) {
      var self = RPGACE.modules.videoSummary;
      var key = self._key(r);
      var sid = self._sid(key);
      var title = self._cleanTitle(r);
      var props = self._proposalsFor(key);
      var expanded = !!self._expanded[key];
      var showRetro = self._proposals !== null && props.length === 0;

      var collapsedBody;
      if (props.length) {
        collapsedBody = self._verdictHtml(r) + props.slice(0, 3).map(function(p) { return self._placementRowHtml(p, true); }).join('');
      } else {
        collapsedBody = self._verdictHtml(r) + self._legacyBulletsHtml(r);
      }

      return '<div class="vs-card" id="vs-card-' + sid + '" data-vs-key="' + self._esc(key) + '" data-intel-title="' + self._esc(title) + '">' +
        '<div id="vs-collapsed-' + sid + '" style="display:' + (expanded ? 'none' : 'block') + '">' +
          self._headerHtml(r) + collapsedBody + self._footerHtml(r, false, showRetro, sid) +
        '</div>' +
        '<div id="vs-expanded-' + sid + '" style="display:' + (expanded ? 'block' : 'none') + '">' +
          self._headerHtml(r) + self._proseHtml(r) + self._placementsHtml(props, sid) + self._footerHtml(r, true, false, sid) +
        '</div>' +
        '</div>';
    },

    _bindDelegation: function(el) {
      if (el._vsDelegated) return;
      el._vsDelegated = true;
      var self = RPGACE.modules.videoSummary;
      el.addEventListener('click', function(ev) {
        var btn = ev.target.closest ? ev.target.closest('[data-vs-action]') : null;
        if (!btn) return;
        var card = btn.closest('.vs-card');
        if (!card) return;
        var key = card.getAttribute('data-vs-key');
        var action = btn.getAttribute('data-vs-action');
        if (action === 'toggle') self._toggle(key, card);
        else if (action === 'enc') self._saveEnc(key);
        else if (action === 'retro') self._runRetro(key, btn);
        else if (action === 'del') self._delete(key, card);
        else if (action === 'quest') self._addQuest(key, btn);
      });
    },

    _toggle: function(key, card) {
      var self = RPGACE.modules.videoSummary;
      self._expanded[key] = !self._expanded[key];
      var coll = card.querySelector('[id^="vs-collapsed-"]');
      var exp = card.querySelector('[id^="vs-expanded-"]');
      if (coll) coll.style.display = self._expanded[key] ? 'none' : 'block';
      if (exp) exp.style.display = self._expanded[key] ? 'block' : 'none';
    },
  },

  // Thin top-level pass-throughs — these preserve the exact existing
  // public API byte-for-byte. `this` is always the module object itself,
  // because every real call site invokes them as a property access on the
  // module (`self.X` from inside this module's own init / delegated click
  // handler / promise chains, or RPGACE.modules.videoSummary.X(...)) —
  // never a detached function reference.
  //
  // Real external API surface, from a fresh whole-repo grep run for this
  // split, covering BOTH the `RPGACE.modules.videoSummary.X` direct form
  // AND every local-alias form (`var x = RPGACE.modules.videoSummary`), the
  // bracket form `RPGACE.modules['videoSummary']`, and index.html's inline
  // onclick handlers: this module has ZERO external callers anywhere in the
  // repo. It is genuinely self-contained — it registers itself, wraps the
  // legacy global window.loadIntelInsights inside its own init(), and drives
  // everything else through its own delegated click handler. The only real
  // cross-module traffic runs the other way (it CALLS intelDedup,
  // intelDelete, taxonomyTree, RPGACE.ui/utils, and the two legacy globals
  // window.loadIntelInsights / window.saveIntelToEncyclopedia).
  //
  // All 28 moved functions keep a pass-through regardless, for two real
  // reasons: the module's own internal call graph reaches nearly every one
  // of them through `self.X` (which resolves to the module, i.e. to these),
  // and the module's real member surface must stay byte-identical to before
  // this split. The 5 DATA fields are data, stay at module scope, and are
  // NOT pass-throughs.
  //
  // Note for a future reader: errorLog.METHOD_MODULE_MAP (the G109 stack-
  // trace attribution table) is keyed by method NAME, and this split changes
  // no name — a fresh run of scripts/generate_method_module_map.py before
  // and after produces byte-identical output, verified.
  _esc: function(s) { return this.logic._esc(s); },
  _key: function(r) { return this.logic._key(r); },
  _sid: function(key) { return this.logic._sid(key); },
  _reports: function() { return this.logic._reports(); },
  _cleanTitle: function(r) { return this.logic._cleanTitle(r); },
  _conf: function(p) { return this.logic._conf(p); },
  _coerce: function(b) { return this.logic._coerce(b); },
  _fetchProposals: function(force) { return this.logic._fetchProposals(force); },
  _proposalsFor: function(key) { return this.logic._proposalsFor(key); },
  _injectStyles: function() { return this.ui._injectStyles(); },
  _render: function() { return this.ui._render(); },
  _maybeRefresh: function() { return this.logic._maybeRefresh(); },
  _statusChip: function(status) { return this.ui._statusChip(status); },
  _placementRowHtml: function(p, clamp) { return this.ui._placementRowHtml(p, clamp); },
  _headerHtml: function(r) { return this.ui._headerHtml(r); },
  _verdictHtml: function(r) { return this.ui._verdictHtml(r); },
  _legacyBulletsHtml: function(r) { return this.ui._legacyBulletsHtml(r); },
  _bulletGroupHtml: function(label, items) { return this.ui._bulletGroupHtml(label, items); },
  _proseHtml: function(r) { return this.ui._proseHtml(r); },
  _placementsHtml: function(props, sid) { return this.ui._placementsHtml(props, sid); },
  _footerHtml: function(r, expanded, showRetro, sid) { return this.ui._footerHtml(r, expanded, showRetro, sid); },
  _cardHtml: function(r) { return this.ui._cardHtml(r); },
  _bindDelegation: function(el) { return this.ui._bindDelegation(el); },
  _toggle: function(key, card) { return this.ui._toggle(key, card); },
  _findByKey: function(key) { return this.logic._findByKey(key); },
  _saveEnc: function(key) { return this.logic._saveEnc(key); },
  _addQuest: function(key, btn) { return this.logic._addQuest(key, btn); },
  _mountRealms: function(el) { return this.ui._mountRealms(el); },
  _questsHtml: function(r) { return this.ui._questsHtml(r); },
  _delete: function(key, card) { return this.logic._delete(key, card); },
  _runRetro: function(key, btn) { return this.logic._runRetro(key, btn); },

});
/* ===END:videoSummary=== */
