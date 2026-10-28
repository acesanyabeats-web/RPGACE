
/* ===MODULE:intelDelete=== */
RPGACE.register('intelDelete', {
  domain: 'knowledge',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Aug/Sep 2026) — real, ratified /CEO plan item, and the NINTH
  // module to take this shape (after the videoPipeline/beatLog/bookworm/
  // phylumPath pilot, then contentProductionLive, conidPot, videoSummary
  // and questEngine): this module is split into two internal namespaces,
  // `ui` (rendering/DOM) and `logic` (business logic/data), following the
  // exact shape those eight already shipped and verified. Pure internal-
  // structure refactor — zero functional, behavioural, UX, data or schema
  // change; every function below was MOVED wholesale, never rewritten,
  // never split down the middle, and its own body is otherwise untouched.
  //
  // 22 real members, ALL of them functions — intelDelete has ZERO plain
  // data fields (checked by direct read of every top-level key, not
  // assumed), so the data-field regrouping questEngine's own split had to
  // do does not arise here and nothing was moved for that reason. `init`
  // stays a literal top-level function (because RPGACE.register() calls
  // `module.init()` directly and cannot see into a sub-object, and its own
  // `self` genuinely IS the module — byte-identical, still calling the
  // top-level pass-throughs), 11 moved into `logic`, 10 into `ui`.
  //
  // The near-even 11/10 split is real: intelDelete is genuinely two
  // things bolted together — a delete/suppression CASCADE (Supabase
  // deletes across intel_reports/intel_watchlist/encyclopedia/
  // taxonomy_nodes, the localStorage insight+watchlist caches, the
  // reanalysis-pool tombstone write and the `bibliography` save) and a
  // RENDER layer (the collapsed insight list, the master toggle, the
  // encyclopedia preview popup, the delete-confirm overlay, the DEL
  // buttons and the Encyclopedia-tab bibliography section). The split
  // draws the line between exactly those two halves.
  //
  // The one real risk this split has to get right, function by function: a
  // function moved into `ui`/`logic` is invoked with `this` bound to THAT
  // sub-object, not the module. Every moved function that touches `this`
  // now opens with `var self = RPGACE.modules.intelDelete;`, so each
  // reference keeps resolving to the module exactly as before — reaching
  // the top-level pass-throughs, which is precisely why every moved
  // function keeps one. Exact accounting, so a later reader can check this
  // by grep rather than take it on trust:
  //   • 9 already had `var self = this;` and simply have that one line
  //     swapped for the handle IN PLACE, so the handle lands in exactly
  //     the same position and statement order is literally unchanged:
  //     logic._deleteUnified, logic._deleteInsight, logic._deleteWatchlist,
  //     logic._saveBib, ui._buildCollapsedList, ui._injectMasterToggle,
  //     ui._injectInsights, ui._injectWatchlist, ui._injectBibSection.
  //     (Four of those nine declare it after a guard/early return rather
  //     than on line 1 — _buildCollapsedList, _injectMasterToggle,
  //     _injectBibSection and _deleteUnified's own callers aside — and the
  //     declaration stays exactly where it was rather than being hoisted,
  //     so nothing about their control flow moved.)
  //   • 1 (ui._injectAll) had no `var self` at all and used two bare
  //     `this.X` calls: it gets the handle inserted as its first statement
  //     and both calls rewritten to `self.X` — the videoPipeline pilot's
  //     own `var mod = RPGACE.modules.videoPipeline;` precedent. Left as
  //     `this.` it would have resolved to `ui._injectInsights` /
  //     `ui._injectWatchlist` and silently bypassed the pass-throughs.
  //   • 11 reference neither `this` nor `self` at all and moved completely
  //     untouched: logic._sbDel, logic._sbInsert, logic._pausePolling,
  //     logic._resumePolling, logic._fmtDate, logic._findEntry,
  //     logic._rmLocal, ui._showEncPopup, ui._mkBtn, ui._hideCard,
  //     ui._confirm.
  // `init` keeps its own `var self = this;` verbatim — that `this`
  // genuinely IS the module, and it is the only function in the module
  // where that is still true.
  //
  // Classification rule used (identical to the rule beatLog/
  // contentProductionLive/conidPot/videoSummary/questEngine each
  // recorded): a function lives in `ui` if it CONSTRUCTS OR DISCOVERS DOM
  // (document.*, createElement, getElementById, querySelector, innerHTML);
  // otherwise in `logic`. Deliberately NOT counted as a ui signal,
  // matching the phylumPath pilot's own precedent: a bare window
  // `confirm()`/`prompt()` dialog, a `showPage()` page-nav call, or
  // opening ANOTHER module's picker/popup. A function that merely TRIGGERS
  // a UI action without constructing any DOM of its own is logic.
  //
  // videoSummary's markup-string RULE EXTENSION (a function returning or
  // assigning markup destined for `.innerHTML` counts as constructing DOM)
  // WAS checked against this module and is real here — ui._showEncPopup,
  // ui._buildCollapsedList and ui._injectBibSection each assign a markup
  // string to `.innerHTML` — but it changes NO classification, because all
  // three already qualify on the primary rule via createElement. Recorded
  // so a future reader knows the extension was applied and found
  // redundant here, not forgotten. logic._deleteUnified is the deliberate
  // counter-example that keeps it honest: it names document.* but builds
  // no markup at all.
  //
  // The genuinely mixed / judgment-call functions — FOUR of them, each
  // named here with the real evidence rather than silently classified.
  // Two are classified AGAINST the primary rule's literal reading and two
  // are classified where the primary rule is silent; in all four the
  // tiebreak is DOMINANT RESPONSIBILITY, which is the same tiebreak
  // videoSummary/questEngine already used ("...and its real job is data"):
  //   • logic._deleteUnified is this module's biggest judgment call. It
  //     DOES discover DOM — two `document.querySelector` lookups by
  //     data-attribute and one `document.getElementById('kg-master-toggle')`
  //     — so a literal reading of the primary rule would put it in `ui`.
  //     It is `logic` on dominant responsibility: its body is a numbered
  //     7-step delete cascade of which 5 steps are pure data (the
  //     intel_reports delete, the localStorage cache rewrite, the
  //     reanalysis-pool tombstone via RPGACE.utils.logReanalysisCandidate,
  //     the optional _saveBib, the encyclopedia + taxonomy_nodes deletes)
  //     and only 3 lines are DOM — and those 3 REMOVE the rows that
  //     represented the just-deleted data, plus one count-label refresh.
  //     It constructs nothing. Filing the module's central data operation
  //     under `ui` would defeat the point of the split, which is exactly
  //     the argument videoSummary's own rule extension turned on.
  //   • logic._saveBib is the same shape, smaller: one
  //     `document.getElementById('rpgace-bib-section')` used purely as a
  //     PRESENCE GUARD ("is that section on screen right now?") before
  //     delegating the actual re-render to ui._injectBibSection. Its real
  //     job is the single `bibliography` insert — per CLAUDE.md it is the
  //     ONE real bibliography write path in the project (rule 8) — so it
  //     is `logic`.
  //   • ui._injectAll is a two-line dispatcher that calls
  //     _injectInsights + _injectWatchlist and nothing else. The primary
  //     rule is SILENT on it (it neither constructs nor discovers DOM), so
  //     the literal default would be `logic`, and questEngine's own
  //     "merely triggers UI" clause points the same way. It is `ui`
  //     anyway, on the one real distinction from that precedent: every
  //     questEngine function classified on that clause (logic._runBoot,
  //     logic.refresh, logic.startQuest…) does REAL DATA WORK and merely
  //     ENDS in a UI call. _injectAll does no data work whatsoever — UI
  //     orchestration is its entire and only job, and both of its callees
  //     are `ui`. Named here rather than filed quietly, because it is one
  //     of the three externally-called methods (see the API note below).
  //   • ui._hideCard is the same silent-rule case: it mutates an element
  //     handed to it by its caller (`card.style.transition` / `.opacity` /
  //     `.display`) and neither constructs nor discovers one, which is the
  //     exact shape questEngine.logic.startBoardQuest and
  //     videoSummary.logic._runRetro were both classified `logic` on. The
  //     difference is the half of that precedent's own reasoning that does
  //     NOT hold here: those two were `logic` because "its real job is
  //     data". _hideCard has no data job at all — a 180ms opacity fade
  //     then display:none is 100% presentation — so dominant
  //     responsibility puts it in `ui`. Its two callers
  //     (logic._deleteInsight, logic._deleteWatchlist) reach it through
  //     the pass-through via `self._hideCard(card)`, unchanged.
  //   • So logic -> ui cross-namespace calls are normal in this module
  //     (_deleteUnified -> _confirm, _deleteInsight/_deleteWatchlist ->
  //     _hideCard, _saveBib -> _injectBibSection), exactly as ui ->
  //     logic calls already are (_buildCollapsedList -> _fmtDate/
  //     _deleteUnified, _injectInsights -> _findEntry/_deleteUnified,
  //     _injectWatchlist -> _findEntry/_deleteWatchlist). Every one of
  //     those calls goes through the top-level pass-throughs via `self.X`,
  //     never `this.ui.X` / `this.logic.X` directly, so no call site
  //     inside the module had to change.
  //
  // THREE pre-existing oddities were found while reading every function
  // for this split and are FLAGGED IN PLACE, NOT FIXED — see the notes on
  // logic._pausePolling/_resumePolling (a whole feature with zero callers,
  // so the polling pause it exists to perform never actually engages),
  // logic._deleteInsight (zero callers, superseded by _deleteUnified) and
  // logic._deleteWatchlist (a real live `r.ok` check against a value that
  // is never a Response, so a SUCCESSFUL delete always console-warns that
  // it failed). A fourth, _sbInsert's zero callers, was already flagged
  // in place by the Aug 23 2026 pass and is left exactly as it was.
  // ══════════════════════════════════════════════════════════════════

  // Aug 23 2026 - the old BIB localStorage key ('rpgace_intel_bibliography')
  // is gone. A saved reference is now a real row in the shared `bibliography`
  // table (book_id IS NULL = a saved link; book_id IS NOT NULL = a completed
  // book, written by bookworm._markBookComplete). One table, one
  // discriminator, zero new schema - and the Supabase row is the single
  // source of truth, so there is no local mirror left to drift from it.

  // July 24 audit fix: the entire body below (the 500/1200/3000ms inject
  // passes, the bib-section timeout, AND the MutationObserver that
  // auto-detects newly added cards) used to live inside a dead
  // rpgace:ready listener - none of it ever ran. The MutationObserver in
  // particular meant new cards appearing on the research page without a
  // page navigation (page:show) never got their delete/watchlist buttons
  // injected at all. Also removed SB_URL/SB_KEY (confirmed unused via
  // grep - _sbDel/_sbInsert below already route through
  // RPGACE.sb.secureWrite, never these) and replaced the bare 'learning'/
  // 'research' literal check with the shared RPGACE.CONFIG.pages.research
  // constant per the project's own page-name convention.
  init: function() {
    var self = this;
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'encyclopedia') {
        setTimeout(function() { self._injectBibSection(); }, 500);
      }
    });
    // Aug 23 2026 (UI2) - the research-page branch removed above fired
    // _injectAll() (delete + watchlist buttons on intel insight/watchlist
    // cards). Those cards live inside #file-analyzer-panel, which now opens as
    // its own dashDeck popup rather than on the retired Research Lab page.
    RPGACE.hooks.on('worm-panel:open', function(panelId) {
      if (panelId !== 'file-analyzer-panel') return;
      setTimeout(function() { self._injectAll(); }, 400);
    });
    // July 24 - the [500,1200,3000] retry staggering existed to catch
    // cards that populate asynchronously after render; the MutationObserver
    // below already covers that case (new cards trigger a fresh _injectAll),
    // so one boot-gated call is enough - it no longer needs to race the
    // user's own post-login clock.
    RPGACE.registerBootTask(function() {
      self._injectAll();
      self._injectBibSection();
    });
    var _obsTimer = null;
    var obs = new MutationObserver(function(muts) {
      // Only fire for actual new card nodes, not our own injections
      var relevant = muts.some(function(m) {
        return Array.from(m.addedNodes).some(function(n) {
          return n.nodeType === 1 && !n.dataset.di4 && !n.dataset.dw4 && !n.id;
        });
      });
      if (!relevant) return;
      if (_obsTimer) clearTimeout(_obsTimer);
      _obsTimer = setTimeout(function() { self._injectAll(); }, 300);
    });
    // Aug 23 2026 (UI2/UI3) — the old "only watch the research page
    // container, not entire body" narrowing is gone with the page itself:
    // 'page-research' was confirmed-dead and 'page-learning' is retired, and
    // the intel cards this observer watches for now render inside a dashDeck
    // popup appended to document.body. document.body IS the correct root now
    // (it was already this chain's own final fallback), not a widened scope.
    obs.observe(document.body, { childList: true, subtree: true });
  },

  // ============================================================
  // logic — business logic/data. See the classification rule and
  // the four named judgment calls in the header block above.
  // ============================================================
  logic: {

    /* ── Supabase helpers ─────────────────────────── */
    // Routed through the authenticated write-proxy (Approach B phase 2) -
    // real gap found July 24: taxonomy_nodes deletes via this wrapper were
    // never caught by phase 1's grep verification since it only searched
    // for literal RPGACE.sb.del/insert calls, not this module's own helper.
    _sbDel: function(table, filter) {
      return RPGACE.sb.secureWrite(table, 'delete', null, filter);
    },

    // Aug 23 2026 - HONEST NOTE: this helper currently has ZERO callers. Its one
    // real caller was _deleteUnified's intel_bibliography insert, now routed
    // through _saveBib instead. Left in place (rather than deleted) because it
    // is a 3-line generic sibling of the still-live _sbDel above and any future
    // intelDelete write would want it - but do not assume it is exercised by
    // anything today. Delete it if nothing has picked it up.
    _sbInsert: function(table, row) {
      return RPGACE.sb.secureWrite(table, 'insert', row);
    },

    // ⚠️ PRE-EXISTING, FLAGGED NOT FIXED (G53 split, Sep 2026 — found while
    // reading every function for the ui/logic classification, deliberately
    // left byte-identical). BOTH _pausePolling and _resumePolling have ZERO
    // callers anywhere: a whole-repo grep for each name returns exactly two
    // hits apiece — the definition here, and errorLog's generated
    // METHOD_MODULE_MAP entry. Nothing in this module, in the LEGACY:mainjs
    // section, in any other module or in index.html ever calls them.
    // The real consequence is NOT that this code is merely unused: the
    // `window._intelViewExpanded` flag these two exist to manage IS live —
    // ui._injectMasterToggle's own onclick sets it directly on expand/
    // collapse, and logic._deleteUnified reads it to decide whether to
    // refresh the count label. What never happens is the OTHER half of
    // _pausePolling's job: the `window.startIntelPolling` wrapper it would
    // install is never installed, so the intel poll is never actually
    // paused while the expanded view is open — the feature these functions
    // name silently does not engage. Either wire _pausePolling/
    // _resumePolling into _injectMasterToggle's toggle handler (which
    // already sets the flag by hand right where these would belong), or
    // delete both — but that is a real behaviour decision, not a refactor.
    _pausePolling: function() {
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

    _fmtDate: function(raw) {
      if (!raw) return '';
      // Handle ISO timestamps
      if (raw.includes('T') || raw.includes('+')) {
        try {
          var d = new Date(raw);
          return d.toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'});
        } catch(e) { return raw; }
      }
      return raw;
    },

    _deleteUnified: function(entry, title, rowEl, cardEl) {
      var self = RPGACE.modules.intelDelete;
      self._confirm(title, entry ? entry.url : '', rowEl || cardEl, function(saveBib) {
        // 1. Delete from Supabase intel_reports
        if (entry && entry.id) {
          self._sbDel('intel_reports', 'id=eq.' + entry.id)
            .then(function() {
              console.log('[intelDelete] Supabase intel_reports deleted:', entry.id);
            }).catch(function(e) { console.warn('[intelDelete]', e); });
        }
        // 2. Delete from localStorage intel_insights
        self._rmLocal('rpgace_intel_insights', title);
        // 2b. Aug 27 2026 (/Routine item #1) - log the real url into the
        // reanalysis pool so it can never be silently resurrected by
        // syncIntelData's 30s poll pulling the same stale extraction back
        // from local_server.py, but stays free to be reprocessed fresh.
        if (entry && entry.url) {
          RPGACE.utils.logReanalysisCandidate(entry.url, title, 'intel_reports', entry.date || entry.created_at || null, 'bad_extraction');
        }
        // 3. Save to bibliography if requested.
        // Aug 23 2026 - this used to hand-roll its own
        // _sbInsert('intel_bibliography', ...) with a silent .catch(), a real
        // second copy of _saveBib's job that would have kept writing to the
        // retired table after _saveBib moved off it. Routed through the one
        // shared implementation instead (rule 8) - which also means this path
        // now fails loud like the other two.
        if (saveBib && entry && entry.url) {
          self._saveBib(title, entry.url);
        }
        // 4. Remove from collapsed list
        var collRow = document.querySelector('[data-intel-title="' + CSS.escape(title) + '"]');
        if (collRow) collRow.remove();
        // 5. Remove from expanded list
        var expCard = document.querySelector('[data-intel-card="' + CSS.escape(title) + '"]');
        if (expCard) expCard.remove();
        // 6. Remove encyclopedia entry with same title
        self._sbDel('encyclopedia', 'title=eq.' + encodeURIComponent(title))
          .then(function() { console.log('[intelDelete] Encyclopedia entry removed:', title); })
          .catch(function(){});
        // 7. Remove taxonomy node with same concept
        self._sbDel('taxonomy_nodes', 'concept=eq.' + encodeURIComponent(title))
          .then(function() { console.log('[intelDelete] Taxonomy node removed:', title); })
          .catch(function(){});
        // Update collapsed list count in toggle
        setTimeout(function() {
          var tog = document.getElementById('kg-master-toggle');
          if (tog) {
            var remaining = JSON.parse(localStorage.getItem('rpgace_intel_insights')||'[]').length;
            var lbl = tog.querySelector('span');
            if (lbl && !window._intelViewExpanded) {
              lbl.textContent = 'Insights · ' + remaining + ' videos · Click to expand';
            }
          }
        }, 200);
      });
    },

    _findEntry: function(key, title) {
      try {
        var d = JSON.parse(localStorage.getItem(key)||'[]');
        return d.find(function(x){ return (x.title||'').trim() === title; }) || null;
      } catch(e) { return null; }
    },

    /* ── Delete from Supabase ───────────────────────── */
    // ⚠️ PRE-EXISTING, FLAGGED NOT FIXED (G53 split, Sep 2026 — found while
    // reading every function for the ui/logic classification, deliberately
    // left byte-identical). This function has ZERO callers: a whole-repo
    // grep for `_deleteInsight` returns exactly two hits — this definition
    // and errorLog's generated METHOD_MODULE_MAP entry. It was superseded by
    // _deleteUnified (which is what ui._buildCollapsedList and
    // ui._injectInsights both actually call), and _deleteUnified does
    // strictly more: the same intel_reports delete and localStorage rewrite,
    // PLUS the reanalysis-pool tombstone write, the encyclopedia and
    // taxonomy_nodes deletes, and the collapsed/expanded row removal. This
    // one is the older, narrower version left behind. It also carries the
    // same `r.ok` bug flagged on _deleteWatchlist below. Deleting it is a
    // real cleanup decision (it would change the module's member surface),
    // not part of a pure refactor.
    _deleteInsight: function(entry, title, card, saveBib) {
      var self = RPGACE.modules.intelDelete;
      /* Remove from Supabase intel_reports by id */
      if (entry && entry.id) {
        self._sbDel('intel_reports', 'id=eq.' + entry.id)
          .then(function(r) {
            if (r.ok) {
              console.log('[intelDelete] Deleted from intel_reports:', entry.id);
            } else {
              console.warn('[intelDelete] Supabase delete failed:', r.status);
            }
          }).catch(function(e) { console.warn('[intelDelete]', e); });
      }
      /* Remove from local storage */
      self._rmLocal('rpgace_intel_insights', title);
      /* Hide card */
      self._hideCard(card);
      /* Save to bibliography if requested */
      if (saveBib && entry) self._saveBib(title, entry.url||'');
      // Aug 23 2026 - this used to claim 'Deleted + saved to bibliography'
      // synchronously, before _saveBib's real async write had resolved. The save
      // now reports its own real outcome (success OR failure) in its own toast,
      // so this one only claims the part that actually happened here (rule 7).
      RPGACE.utils.toast('Deleted', 'rgba(226,84,84,0.9)', 2000);
    },

    // ⚠️ PRE-EXISTING, FLAGGED NOT FIXED (G53 split, Sep 2026 — found while
    // reading every function for the ui/logic classification, deliberately
    // left byte-identical). Unlike _deleteInsight above this one IS live —
    // ui._injectWatchlist wires it to every watchlist card's DEL button —
    // and it has a real, currently-firing bug: the `.then(function(r) { if
    // (r.ok) ... else console.warn('Watchlist delete failed:', r.status) })`
    // below checks `r.ok` on the resolved value of _sbDel, i.e. of
    // RPGACE.sb.secureWrite. secureWrite does NOT resolve to a Response —
    // read it directly: it resolves to `body.data` from its own
    // `r.json().then(function(body) { return body.data; })`, and it THROWS
    // (never resolves) on a non-ok HTTP status. So on a genuinely
    // SUCCESSFUL delete `r.ok` is undefined, the else branch runs, and the
    // console reads "[intelDelete] Watchlist delete failed: undefined" — the
    // exact opposite of what happened. The delete itself is unaffected (the
    // promise resolved, the row is gone) and a real failure still surfaces
    // through the .catch, so this is console-noise/diagnostic-inversion, not
    // data loss — but it would badly mislead anyone debugging this path.
    // logic._deleteUnified, the live insight-side equivalent, gets this
    // right (a bare `.then(function() {...})` that touches no `.ok`).
    // The same wrong check sits in the dead _deleteInsight above.
    _deleteWatchlist: function(url, title, card, saveBib) {
      var self = RPGACE.modules.intelDelete;
      /* Remove from Supabase intel_watchlist by url */
      if (url) {
        // Real bug fixed Sep 2 (flagged by the G53 split's own review,
        // fixed here as a clearly separate change): _sbDel resolves via
        // RPGACE.sb.secureWrite, which resolves to body.data (an array of
        // deleted rows) on success and REJECTS with a real Error on
        // failure - it never resolves an object carrying .ok/.status.
        // Checking r.ok here always read undefined, so this logged
        // "Watchlist delete failed: undefined" on EVERY successful
        // delete - a real diagnostic inversion, not a functional bug (the
        // delete itself always worked; a genuine failure still correctly
        // surfaces via .catch below). Fixed to match the already-correct
        // pattern _deleteUnified uses for the same secureWrite call shape.
        self._sbDel('intel_watchlist', 'url=eq.' + encodeURIComponent(url))
          .then(function() {
            console.log('[intelDelete] Deleted from intel_watchlist:', url);
          }).catch(function(e) { console.warn('[intelDelete]', e); });
      }
      self._rmLocal('rpgace_intel_watchlist', title);
      self._hideCard(card);
      if (saveBib) self._saveBib(title, url);
      // Aug 23 2026 - this used to claim 'Deleted + saved to bibliography'
      // synchronously, before _saveBib's real async write had resolved. The save
      // now reports its own real outcome (success OR failure) in its own toast,
      // so this one only claims the part that actually happened here (rule 7).
      RPGACE.utils.toast('Deleted', 'rgba(226,84,84,0.9)', 2000);
    },

    _rmLocal: function(key, title) {
      try {
        var d = JSON.parse(localStorage.getItem(key)||'[]');
        localStorage.setItem(key, JSON.stringify(
          d.filter(function(x){ return (x.title||'').trim() !== title; })
        ));
      } catch(e) {}
    },

    /* ── Bibliography ───────────────────────────────── */
    // Aug 23 2026 - writes a LINK row into the shared `bibliography` table
    // (book_id left null = the discriminator), replacing the old dual write to
    // localStorage + intel_bibliography. intel_bibliography itself is
    // deliberately untouched: its 15 real June rows stay exactly where they
    // are, this is a "new saves go to the new place" change, not a migration.
    //
    // MUST be secureWrite - `bibliography` runs anon_read_only + authenticated_all
    // RLS, so a plain anon insert would 401. The old silent .catch() is gone
    // (rule 7): the Supabase row is now the only record of a save, so a failed
    // write has to say so rather than being swallowed into a local cache
    // nothing else reads.
    //
    // completed_at (NOT NULL DEFAULT now()) is reused loosely here as "when
    // this reference was saved" - Alex's own accepted reuse of the column, not
    // drift. total_chapters / total_insights_placed / phyla_touched stay null,
    // which is exactly what the null-book_id readers below key off.
    // Oct 13 2026 (LL-2, Alex: "bibliography to become the life library"):
    // new saves go to the Life Library (one place, link dedup there); the
    // old `bibliography` link rows stay as read-only history.
    _saveBib: function(title, url) {
      var lib = RPGACE.modules.lifeLibrary;
      if (!lib) return Promise.resolve(RPGACE.utils.toast('Life Library is not loaded - the link was NOT kept', '#CC4A4A', 5000));
      return lib.logic.add({ title: title, url: url || '', kind: url ? null : 'note' }).then(function(res) {
        RPGACE.utils.toast(res.duplicate ? '📚 Already in your Life Library' : '📚 Saved to Life Library', 'rgba(61,170,110,0.9)', 2500);
      }).catch(function(e) {
        RPGACE.utils.toast('Life Library save FAILED: ' + ((e && e.message) || 'unknown error') + ' — the reference was NOT kept', '#CC4A4A', 5000);
      });
    },

  },

  // ============================================================
  // ui — rendering/DOM. See the classification rule and the four
  // named judgment calls in the header block above.
  // ============================================================
  ui: {

    /* ── Inject buttons on both card types ─────────── */
    _injectAll: function() {
      var self = RPGACE.modules.intelDelete;
      self._injectInsights();
      self._injectWatchlist();
    },

    _showEncPopup: function(entry) {
      var existing = document.getElementById('enc-preview-popup');
      if (existing) { existing.remove(); return; }
      var popup = document.createElement('div');
      popup.id = 'enc-preview-popup';
      popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(560px,90vw);max-height:80vh;background:#0f0f1a;border:1px solid rgba(201,168,76,0.25);border-radius:12px;z-index:99999;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,0.7);';
      var hdr = document.createElement('div');
      hdr.style.cssText = 'padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0;';
      var htxt = document.createElement('div');
      var ht = document.createElement('div');
      ht.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(201,168,76,0.6);margin-bottom:4px;text-transform:uppercase;';
      ht.textContent = 'Encyclopedia Preview';
      var hs = document.createElement('div');
      hs.style.cssText = 'font-size:13px;font-weight:700;color:#D4DAF5;line-height:1.3;max-width:440px;';
      hs.textContent = (entry.title || '').replace('☁️','').trim();
      htxt.appendChild(ht); htxt.appendChild(hs);
      var cb = document.createElement('button');
      cb.textContent = '×';
      cb.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:20px;padding:0 4px;flex-shrink:0;';
      cb.onclick = function() { popup.remove(); };
      hdr.appendChild(htxt); hdr.appendChild(cb);
      var body = document.createElement('div');
      body.style.cssText = 'flex:1;overflow-y:auto;padding:16px 20px;';
      // Load from Supabase encyclopedia
      body.innerHTML = '<div style="color:rgba(226,226,236,0.35);font-size:12px;">Loading...</div>';
      RPGACE.sb.select('encyclopedia', 'title=eq.' + encodeURIComponent(entry.title || '') + '&limit=1')
        .then(function(rows) {
          if (!rows || rows.length === 0) {
            body.innerHTML = '<div style="color:rgba(226,226,236,0.35);font-size:12px;">No encyclopedia entry found for this video.</div>';
            return;
          }
          var enc = rows[0];
          var content = enc.content || '';
          body.innerHTML = '';
          var pre = document.createElement('div');
          pre.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.75);line-height:1.8;white-space:pre-wrap;';
          pre.textContent = content.slice(0, 1500) + (content.length > 1500 ? '...' : '');
          body.appendChild(pre);
        }).catch(function() {
          body.innerHTML = '<div style="color:rgba(226,226,236,0.35);font-size:12px;">Could not load encyclopedia entry.</div>';
        });
      var ftr = document.createElement('div');
      ftr.style.cssText = 'padding:12px 20px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:8px;flex-shrink:0;';
      var goBtn = document.createElement('button');
      goBtn.textContent = '📖 Go to Encyclopedia';
      goBtn.style.cssText = 'flex:1;padding:8px 16px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.25);border-radius:6px;color:var(--gold,#C9A84C);cursor:pointer;font-size:12px;font-weight:700;font-family:Rajdhani,sans-serif;';
      goBtn.onclick = function() {
        popup.remove();
        if (typeof showPage === 'function') showPage('encyclopedia');
      };
      var closeBtn = document.createElement('button');
      closeBtn.textContent = 'Close';
      closeBtn.style.cssText = 'padding:8px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.4);cursor:pointer;font-size:12px;font-family:Rajdhani,sans-serif;';
      closeBtn.onclick = function() { popup.remove(); };
      ftr.appendChild(goBtn); ftr.appendChild(closeBtn);
      popup.appendChild(hdr); popup.appendChild(body); popup.appendChild(ftr);
      // Backdrop
      var backdrop = document.createElement('div');
      backdrop.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99998;';
      backdrop.onclick = function() { popup.remove(); backdrop.remove(); };
      document.body.appendChild(backdrop);
      document.body.appendChild(popup);
    },

    _buildCollapsedList: function(container) {
      var existing = document.getElementById('intel-collapsed-list');
      if (existing) existing.remove();
      var entries = [];
      try {
        entries = JSON.parse(localStorage.getItem('rpgace_intel_insights') || '[]');
      } catch(e) { entries = []; }
      if (entries.length === 0) return;
      var self = RPGACE.modules.intelDelete;
      var list = document.createElement('div');
      list.id = 'intel-collapsed-list';
      list.style.cssText = 'margin-bottom:8px;';

      entries.forEach(function(entry) {
        var title = (entry.title || 'Untitled').replace('☁️','').trim();
        var s = parseInt(entry.score) || 0;
        var scoreColor = s >= 8 ? 'var(--green)' : s >= 6 ? 'var(--gold,#C9A84C)' : 'var(--muted)';

        // Main row
        var row = document.createElement('div');
        row.dataset.intelTitle = title;
        row.style.cssText = 'background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:6px;margin-bottom:4px;overflow:hidden;';

        var header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;padding:8px 12px;gap:8px;cursor:pointer;';

        // Expand indicator
        var expInd = document.createElement('span');
        expInd.textContent = '▸';
        expInd.style.cssText = 'font-size:11px;color:var(--muted);flex-shrink:0;transition:transform .15s;';

        var left = document.createElement('div');
        left.style.cssText = 'flex:1;min-width:0;';
        var titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        titleEl.textContent = title;
        var meta = document.createElement('div');
        meta.style.cssText = 'font-size:11px;color:var(--muted);margin-top:1px;';
        meta.textContent = (entry.creator || '') + (entry.date ? ' · ' + self._fmtDate(entry.date) : '');
        left.appendChild(titleEl); left.appendChild(meta);

        var right = document.createElement('div');
        right.style.cssText = 'display:flex;align-items:center;gap:6px;flex-shrink:0;';

        var bar = document.createElement('div');
        bar.style.cssText = 'font-size:11px;color:var(--muted);';
        bar.textContent = '█'.repeat(s) + '░'.repeat(10 - s);

        var scoreEl = document.createElement('div');
        scoreEl.style.cssText = 'font-size:12px;font-weight:700;color:' + scoreColor + ';min-width:28px;text-align:right;';
        scoreEl.textContent = s + '/10';

        // Encyclopedia button
        var encBtn = document.createElement('button');
        encBtn.textContent = '📖';
        encBtn.title = 'Encyclopedia preview';
        encBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:rgba(226,226,236,0.5);cursor:pointer;font-size:11px;padding:2px 6px;';
        encBtn.onclick = function(e) { e.stopPropagation(); self._showEncPopup(entry); };

        // DEL button — unified delete
        var delBtn = self._mkBtn(function() {
          self._deleteUnified(entry, title, row, null);
        });

        right.appendChild(bar);
        right.appendChild(scoreEl);
        right.appendChild(encBtn);
        right.appendChild(delBtn);

        header.appendChild(expInd);
        header.appendChild(left);
        header.appendChild(right);

        // Inline expanded body
        var body = document.createElement('div');
        body.style.cssText = 'overflow:hidden;max-height:0;transition:max-height .25s var(--ease-out);border-top:0 solid rgba(255,255,255,0.05);';
        var bodyInner = document.createElement('div');
        bodyInner.style.cssText = 'padding:10px 14px;font-size:12px;color:rgba(226,226,236,0.65);line-height:1.7;';

        // Verdict summary from insights object
        var ins = entry.insights || {};
        if (ins.verdict_summary) {
          var summary = document.createElement('div');
          summary.style.cssText = 'font-style:italic;color:rgba(226,226,236,0.5);margin-bottom:10px;border-left:2px solid rgba(201,168,76,0.3);padding-left:8px;font-size:11px;';
          summary.textContent = '"' + ins.verdict_summary + '"';
          bodyInner.appendChild(summary);
        }

        // What to steal / content insights bullets
        var steals = ins.what_to_steal || ins.content_strategy_insights || ins.production_techniques || [];
        if (typeof steals === 'string') steals = steals.split('\u2022').filter(function(b){return b.trim();});
        if (!Array.isArray(steals)) steals = [];
        steals.slice(0, 3).forEach(function(b) {
          var txt = typeof b === 'object' ? (b.insight || b.technique || b.tip || b.steal || JSON.stringify(b)) : b;
          var li = document.createElement('div');
          li.style.cssText = 'margin-bottom:6px;padding-left:14px;position:relative;font-size:11px;color:rgba(226,226,236,0.65);';
          li.innerHTML = '<span style="position:absolute;left:0;color:var(--gold,#C9A84C);">\u2022</span>' + txt.toString().trim();
          bodyInner.appendChild(li);
        });

        // UI Debloat: the full write-up, big and first.
        if (entry.url && RPGACE.modules.encyclopediaPosts) {
          var full = document.createElement('button'); full.type = 'button'; full.className = 'iv-full';
          full.textContent = '📖 Read the full write-up';
          full.style.cssText = 'display:block;width:100%;min-height:44px;margin-top:10px;border-radius:10px;border:1px solid var(--gold);background:none;color:var(--gold);font:inherit;font-weight:700;font-size:14px;cursor:pointer;';
          full.onclick = function(e) { e.stopPropagation(); RPGACE.modules.encyclopediaPosts.ui.openByUrl(entry.url); };
          bodyInner.appendChild(full);
        }
        // Original link
        if (entry.url) {
          var link = document.createElement('a');
          link.href = entry.url;
          link.target = '_blank';
          link.textContent = '🔗 Original';
          link.style.cssText = 'display:inline-block;margin-top:8px;font-size:11px;color:var(--blue,#4A8CCC);text-decoration:none;';
          bodyInner.appendChild(link);
        }

        body.appendChild(bodyInner);

        // Toggle expand on header click
        var isOpen = false;
        header.onclick = function(e) {
          if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
          isOpen = !isOpen;
          if (isOpen) {
            body.style.maxHeight = body.scrollHeight + 'px';
            body.style.borderTopWidth = '1px';
            expInd.style.transform = 'rotate(90deg)';
          } else {
            body.style.maxHeight = '0';
            body.style.borderTopWidth = '0';
            expInd.style.transform = 'rotate(0deg)';
          }
        };

        row.appendChild(header);
        row.appendChild(body);
        list.appendChild(row);
      });

      container.insertBefore(list, container.firstChild);
    },

    _injectMasterToggle: function(container) {
      if (!container || document.getElementById('kg-master-toggle')) return;
      var self = RPGACE.modules.intelDelete;
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
      };
      mainContainer.insertBefore(bar, mainContainer.firstChild);
    },

    _injectInsights: function() {
      var self = RPGACE.modules.intelDelete;
      var cards = document.querySelectorAll('[style*="background:var(--panel2)"][style*="margin-bottom:12px"]');
      if (cards.length > 0) {
        self._injectMasterToggle(cards[0].parentElement);
      }
      cards.forEach(function(card) {
        if (card.dataset.di4) return;
        card.dataset.di4 = '1';
        var te = card.querySelector('[style*="font-weight:600"]');
        var title = te ? te.textContent.replace('☁️','').trim() : '';
        // Tag card for cross-delete
        card.dataset.intelCard = title;
        var entry = self._findEntry('rpgace_intel_insights', title);
        var flexRow = card.querySelector('[style*="justify-content:space-between"]');
        if (!flexRow || !flexRow.children[1]) return;
        var scoreBox = flexRow.children[1];
        // Use unified delete
        var btn = self._mkBtn(function() {
          self._deleteUnified(entry, title, null, card);
        });
        scoreBox.insertBefore(btn, scoreBox.firstChild);
      });
    },

    _injectWatchlist: function() {
      var self = RPGACE.modules.intelDelete;
      document.querySelectorAll('[style*="rgba(139,92,246"]').forEach(function(card) {
        if (card.dataset.dw4) return;
        card.dataset.dw4 = '1';
        var content = card.children[1];
        var te = content ? content.querySelector('div') : null;
        var title = te ? te.textContent.trim() : '';
        if (!title) return;
        var entry = self._findEntry('rpgace_intel_watchlist', title);
        var url = entry ? (entry.url||'') : '';
        var btn = self._mkBtn(function() {
          self._confirm(title, url, card, function(saveBib) {
            self._deleteWatchlist(url, title, card, saveBib);
          });
        });
        btn.style.marginLeft = 'auto';
        btn.style.flexShrink = '0';
        card.appendChild(btn);
      });
    },

    _mkBtn: function(cb) {
      var btn = document.createElement('button');
      btn.textContent = 'DEL';
      btn.style.cssText = 'background:rgba(226,84,84,0.12);border:1px solid rgba(226,84,84,0.35);color:rgba(226,84,84,0.85);border-radius:4px;padding:3px 8px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;display:block;';
      btn.onclick = function(e) { e.stopPropagation(); cb(); };
      return btn;
    },

    _hideCard: function(card) {
      card.style.transition = 'opacity .18s';
      card.style.opacity = '0';
      setTimeout(function(){ card.style.display = 'none'; }, 200);
    },

    /* ── Confirmation popup ─────────────────────────── */
    _confirm: function(title, url, card, onDecide) {
      var ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:10001;display:flex;align-items:center;justify-content:center;font-family:Rajdhani,sans-serif;';
      var box = document.createElement('div');
      box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(226,84,84,0.3);border-radius:10px;padding:24px 28px;width:min(360px,90vw);';
      function el(tag, css, txt) { var e=document.createElement(tag); e.style.cssText=css||''; if(txt!==undefined)e.textContent=txt; return e; }
      box.appendChild(el('div','font-size:14px;font-weight:700;color:#D4DAF5;margin-bottom:6px;','Delete Report'));
      box.appendChild(el('div','font-size:11px;color:rgba(226,226,236,0.4);margin-bottom:16px;line-height:1.4;', title.length>65?title.substring(0,65)+'...':title));
      box.appendChild(el('div','font-size:13px;font-weight:600;color:rgba(226,226,236,0.85);margin-bottom:8px;','Save URL to bibliography?'));
      box.appendChild(el('div','font-size:10px;color:rgba(201,168,76,0.55);margin-bottom:18px;font-family:monospace;word-break:break-all;', url?(url.length>60?url.substring(0,60)+'...':url):'No URL'));
      var row = el('div','display:flex;gap:8px;flex-wrap:wrap;');
      function mkb(label, bg, bd, col, saveBib) {
        var b = el('button','flex:1;min-width:80px;background:'+bg+';border:1px solid '+bd+';color:'+col+';border-radius:6px;padding:9px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;', label);
        b.onclick = function(){ ov.remove(); onDecide(saveBib); };
        return b;
      }
      row.appendChild(mkb('Yes, save it','rgba(61,170,110,0.12)','rgba(61,170,110,0.35)','rgba(61,170,110,0.9)', true));
      row.appendChild(mkb('No, just delete','rgba(226,84,84,0.1)','rgba(226,84,84,0.3)','rgba(226,84,84,0.8)', false));
      var cancel = el('button','background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(226,226,236,0.3);border-radius:6px;padding:9px 14px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;','Cancel');
      cancel.onclick = function(){ ov.remove(); };
      row.appendChild(cancel);
      box.appendChild(row);
      ov.appendChild(box);
      document.body.appendChild(ov);
    },

    /* ── Bibliography section in Encyclopedia tab ── */
    // Aug 23 2026 - repointed off localStorage onto a real live Supabase read
    // of the shared `bibliography` table, filtered to LINK rows only
    // (book_id=is.null). Completed books (book_id NOT NULL) are deliberately
    // excluded here: they already have their own real coverage in Chronicles
    // (careerStatCard) and in Bookworm's own Bibliography panel, so listing
    // them a third time would just duplicate that.
    //
    // Same visual shape as before (header + count, one row per source, a Clear
    // affordance) - the only structural change is that it is now async, so it
    // renders a Loading state first, matching bookworm._injectBibliographySection's
    // own already-established fetch-then-fill pattern rather than inventing a
    // second one.
    //
    // force=true rebuilds an already-present section in place (used after a
    // real save/delete) instead of the old bare "already exists, bail" guard.
    _injectBibSection: function(force) {
      var self = RPGACE.modules.intelDelete;
      // Oct 12 2026: the boot task can run before config.init() sets
      // RPGACE.sb ("boot task failed ... reading 'select'"); page:show
      // re-runs this once the Encyclopedia page opens.
      if (!RPGACE.sb || !RPGACE.sb.select) return;
      var existing = document.getElementById('rpgace-bib-section');
      if (existing && !force) return;
      var enc = document.getElementById('page-encyclopedia');
      if (!enc) return;
      if (existing) existing.remove();

      function el(tag, css, txt) { var e = document.createElement(tag); e.style.cssText = css || ''; if (txt !== undefined) e.textContent = txt; return e; }

      var s = el('div', 'margin-top:32px;border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;padding-bottom:32px;');
      s.id = 'rpgace-bib-section';
      var hdr = el('div', 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;');
      var htxt = el('div', 'font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.7);text-transform:uppercase;', 'BIBLIOGRAPHY · LOADING…');
      var clr = el('button', 'background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(226,226,236,0.3);border-radius:4px;padding:3px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700;display:none;', 'Clear');
      hdr.appendChild(htxt); hdr.appendChild(clr); s.appendChild(hdr);
      var list = el('div', '');
      list.appendChild(el('div', 'font-size:12px;color:rgba(226,226,236,0.25);font-style:italic;', 'Loading…'));
      s.appendChild(list);
      enc.appendChild(s);

      RPGACE.sb.select('bibliography', 'select=id,title,source_url,completed_at&book_id=is.null&order=completed_at.desc&limit=100')
        .then(function(rows) {
          rows = Array.isArray(rows) ? rows : [];
          htxt.textContent = 'BIBLIOGRAPHY · ' + rows.length + ' SOURCE' + (rows.length === 1 ? '' : 'S');
          list.innerHTML = '';
          if (!rows.length) {
            list.appendChild(el('div', 'font-size:12px;color:rgba(226,226,236,0.3);font-style:italic;', 'No saved references yet. Delete a Videoworm card and choose "Yes, save it" to build this list.'));
            return;
          }
          clr.style.display = '';
          // Clear is a real Supabase delete now, not a one-click
          // localStorage.removeItem - so it gets the same 2-click arm/confirm
          // treatment every other destructive action in this project uses
          // (Bookworm's 🗑, mockOracle's scouted-item delete). It deletes by
          // the explicit ids currently on screen (id=in.(...)), never a blanket
          // book_id=is.null filter, so a row saved after this fetch resolved
          // can't be destroyed by a click aimed at rows the user could see.
          // There is no Supabase backup or PITR (standing landmine), which is
          // exactly why this is scoped to the visible set.
          var ids = rows.map(function(r) { return r.id; });
          var clrArmed = false, clrBusy = false;
          clr.onclick = function() {
            if (clrBusy) return;
            if (!clrArmed) {
              clrArmed = true;
              clr.textContent = '❌ Delete all ' + ids.length + '?';
              clr.style.color = '#CC4A4A';
              setTimeout(function() {
                if (clrBusy) return;
                clrArmed = false; clr.textContent = 'Clear'; clr.style.color = 'rgba(226,226,236,0.3)';
              }, 3000);
              return;
            }
            clrBusy = true;
            clr.textContent = '…';
            RPGACE.sb.secureWrite('bibliography', 'delete', null, 'id=in.(' + ids.join(',') + ')')
              .then(function() {
                RPGACE.utils.toast('🗑 Cleared ' + ids.length + ' saved reference' + (ids.length === 1 ? '' : 's'), 'rgba(226,226,236,0.5)', 2500);
                self._injectBibSection(true);
              })
              .catch(function(e) {
                clrBusy = false; clrArmed = false;
                clr.textContent = 'Clear'; clr.style.color = 'rgba(226,226,236,0.3)';
                RPGACE.utils.toast('Clear FAILED: ' + ((e && e.message) || 'unknown error') + ' — nothing was removed', '#CC4A4A', 5000);
              });
          };

          rows.forEach(function(b) {
            var row = el('div', 'display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);align-items:flex-start;');
            var dot = el('span', 'color:rgba(201,168,76,0.5);flex-shrink:0;', '•');
            var info = el('div', 'flex:1;min-width:0;');
            var t = el('div', 'font-size:12px;font-weight:600;color:rgba(226,226,236,0.75);margin-bottom:2px;font-family:Rajdhani,sans-serif;', b.title || 'Untitled');
            var lnk = document.createElement('a');
            lnk.href = b.source_url || '#';
            lnk.target = '_blank';
            lnk.rel = 'noopener';
            lnk.textContent = b.source_url ? (b.source_url.length > 65 ? b.source_url.substring(0, 65) + '...' : b.source_url) : 'No URL';
            lnk.style.cssText = 'font-size:10px;color:rgba(201,168,76,0.55);text-decoration:none;font-family:monospace;word-break:break-all;';
            info.appendChild(t); info.appendChild(lnk);
            // Per-row 2-click arm/confirm delete, same shape as mockOracle's
            // scouted-item 🗑 - granular removal without reaching for Clear.
            var del = el('button', 'background:none;border:none;color:rgba(226,84,84,0.4);cursor:pointer;font-size:13px;padding:2px 4px;flex-shrink:0;font-family:Rajdhani,sans-serif;', '🗑');
            del.title = 'Delete this saved reference';
            var armed = false, busy = false;
            del.onclick = function(e) {
              e.stopPropagation();
              if (busy) return;
              if (!armed) {
                armed = true;
                del.textContent = '❌ Confirm';
                del.style.color = '#CC4A4A';
                setTimeout(function() {
                  if (busy) return;
                  armed = false; del.textContent = '🗑'; del.style.color = 'rgba(226,84,84,0.4)';
                }, 3000);
                return;
              }
              busy = true;
              del.textContent = '…';
              RPGACE.sb.secureWrite('bibliography', 'delete', null, 'id=eq.' + b.id)
                .then(function() {
                  RPGACE.utils.toast('🗑 Deleted saved reference', 'rgba(226,226,236,0.5)', 2500);
                  self._injectBibSection(true);
                })
                .catch(function(err) {
                  busy = false; armed = false;
                  del.textContent = '🗑'; del.style.color = 'rgba(226,84,84,0.4)';
                  RPGACE.utils.toast('Delete FAILED: ' + ((err && err.message) || 'unknown error') + ' — nothing was removed', '#CC4A4A', 5000);
                });
            };
            row.appendChild(dot); row.appendChild(info); row.appendChild(del);
            list.appendChild(row);
          });
        })
        .catch(function(e) {
          htxt.textContent = 'BIBLIOGRAPHY';
          list.innerHTML = '';
          list.appendChild(el('div', 'font-size:12px;color:#CC4A4A;', 'Load error: ' + ((e && e.message) || 'unknown error')));
        });
    },

  },

  // Thin top-level pass-throughs — these preserve the exact existing
  // public API byte-for-byte. `this` is always the module object itself,
  // because every real call site invokes them as a property access on the
  // module (`self.X` from inside this module's own init / MutationObserver
  // / boot task / promise chains / button handlers, or
  // `RPGACE.modules.intelDelete.X(...)` from outside) — never a detached
  // function reference.
  //
  // Real external API surface, from a fresh whole-repo grep run for this
  // split, covering the `RPGACE.modules.intelDelete.X` direct form, every
  // local-alias form (`var del = RPGACE.modules.intelDelete`), the bracket
  // form `RPGACE.modules['intelDelete']`, index.html's inline onclick
  // handlers, AND this same file's own LEGACY:mainjs section (lines 24 -
  // 4712, the mechanically merged former main.js — the section a prior
  // module's split in this series found real callers hiding in): this
  // module has TWO real external call sites reaching FOUR distinct
  // methods, all of them local-alias form, all of them invoking a
  // TOP-LEVEL method on the module object, so all four keep working
  // byte-identically through the pass-throughs below:
  //   • videoSummary.logic._delete
  //       -> `var del = RPGACE.modules.intelDelete;`
  //          del._deleteUnified(entry, title, card, null)   (now logic)
  //       and it guards on `del && del._deleteUnified` first, which the
  //       pass-through keeps truthy exactly as before.
  //   • config's applyIntelUI (inside config.init)
  //       -> `var id = RPGACE.modules.intelDelete;`
  //          id._buildCollapsedList(parent)                 (now ui)
  //          id._injectMasterToggle(parent)                 (now ui)
  //          id._injectAll()                                (now ui)
  //       and it guards on `!RPGACE.modules.intelDelete` first.
  // index.html contains ZERO references to this module or to any of its
  // method names — verified by direct grep, not assumed. The LEGACY:mainjs
  // section contains exactly ONE occurrence of the string "intelDelete"
  // and it is inside a comment. The one dynamic bracket-form module lookup
  // that exists anywhere in the file (contentProductionLive
  // ._findOracleCmdText's `RPGACE.modules[moduleName]`) only ever reads
  // `.CMDS` and is only ever called with the three Oracle persona panels —
  // checked directly, it can never reach this module.
  //
  // All 21 moved functions keep a pass-through regardless, for two real
  // reasons: the module's own internal call graph reaches nearly every one
  // of them through `self.X` (which resolves to the module, i.e. to
  // these), and the module's real member surface must stay byte-identical
  // to before this split. There are no data fields to leave out.
  //
  // Note for a future reader: errorLog.METHOD_MODULE_MAP (the G109 stack-
  // trace attribution table) is keyed by method NAME, and this split
  // changes no method name — scripts/generate_method_module_map.py was
  // re-run before and after and produced byte-identical output,
  // confirmed, not assumed.
  _sbDel: function(table, filter) { return this.logic._sbDel(table, filter); },
  _sbInsert: function(table, row) { return this.logic._sbInsert(table, row); },
  _pausePolling: function() { return this.logic._pausePolling(); },
  _resumePolling: function() { return this.logic._resumePolling(); },
  _fmtDate: function(raw) { return this.logic._fmtDate(raw); },
  _deleteUnified: function(entry, title, rowEl, cardEl) { return this.logic._deleteUnified(entry, title, rowEl, cardEl); },
  _findEntry: function(key, title) { return this.logic._findEntry(key, title); },
  _deleteInsight: function(entry, title, card, saveBib) { return this.logic._deleteInsight(entry, title, card, saveBib); },
  _deleteWatchlist: function(url, title, card, saveBib) { return this.logic._deleteWatchlist(url, title, card, saveBib); },
  _rmLocal: function(key, title) { return this.logic._rmLocal(key, title); },
  _saveBib: function(title, url) { return this.logic._saveBib(title, url); },
  _injectAll: function() { return this.ui._injectAll(); },
  _showEncPopup: function(entry) { return this.ui._showEncPopup(entry); },
  _buildCollapsedList: function(container) { return this.ui._buildCollapsedList(container); },
  _injectMasterToggle: function(container) { return this.ui._injectMasterToggle(container); },
  _injectInsights: function() { return this.ui._injectInsights(); },
  _injectWatchlist: function() { return this.ui._injectWatchlist(); },
  _mkBtn: function(cb) { return this.ui._mkBtn(cb); },
  _hideCard: function(card) { return this.ui._hideCard(card); },
  _confirm: function(title, url, card, onDecide) { return this.ui._confirm(title, url, card, onDecide); },
  _injectBibSection: function(force) { return this.ui._injectBibSection(force); },

});
/* ===END:intelDelete=== */
