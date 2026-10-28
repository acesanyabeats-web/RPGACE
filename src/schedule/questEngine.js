
/* ===MODULE:questEngine=== */
// A9 Phase 1 (Massive Expansion /CEO plan, Aug 23 2026). Two real jobs,
// both long-standing, both independently evidenced before being built:
//
// (1) PERSISTENCE. The Quest Board's completeQuest()/addXP() lived
//     ENTIRELY in memory - a plain `const QUESTS` object plus STATE
//     mutations, with zero Supabase writes anywhere (re-confirmed by
//     direct read this pass, not inherited from a doc). That is the same
//     July 22 GODMODE finding recorded in careerStatCard's own header
//     comment ("STATE lives only in memory with zero persistence
//     anywhere ... it silently resets to zero on every single page
//     load"), and the single most-repeated real item in
//     oracle_dev_suggestions - flagged independently 4 separate times
//     across 2026-07-28 and 2026-08-06, each time naming this same fix.
//     Completions now land as real `quest_log` rows, and boot restores
//     XP / level / per-quest done-state from them.
//
// (2) TIME TRACKING + GENUINELY APPLICABLE QUESTS. Alex's own verbatim
//     ask: "agendas generated should take into account the new pipelines
//     and capabilities of rpgace and schedule to make quests truly
//     applicable to me, and how much time I have, and then suggest a
//     block to fill out depending on how much time it takes to complete
//     for me."
//
// THE AVERAGING FORMULA is Alex's own, implemented literally rather than
// approximated: "when I executed task 0 times - estimate time for the
// task, when I complete it - average estimated time and 1st time
// execute, then when quest given again - average estimate and 1st and
// 2nd time duration of execution." So the original estimate is
// permanently sample 0, and every real completion joins the mean:
//
//     average = (estimate + SUM(every real actual)) / (1 + COUNT(actuals))
//
// 0 completions -> the bare estimate. 1 -> (estimate+a1)/2. 2 ->
// (estimate+a1+a2)/3. N -> (estimate + Sa)/(N+1). That is a CUMULATIVE,
// unbounded running mean, not a fixed two-sample blend -
// `quest_duration_stats` stores the running SUM and COUNT (never the
// individual samples), which is what keeps the update O(1) at any N.
// The identical function runs at all three scopes, per Alex's own
// closing line ("then average times for specific workflows are written
// exactly same for steps"): 'quest', 'workflow', 'step'.
//
// A completion that was never actually timed records a real quest_log
// row (the XP is real) but is deliberately EXCLUDED from the average -
// inventing a duration for it would quietly corrupt every future
// estimate, which is exactly the kind of fake progress rule 7 forbids.
//
// EXPLICITLY NOT BUILT HERE - A9 Phase 2, deliberately deferred, not
// forgotten: Oracle-generated DYNAMIC workflow-step generation, and the
// Schedule Oracle feedback loop. The WORKFLOWS table below is
// hand-written and static on purpose; Phase 2 replaces it with real
// generated steps once Phase 1's real duration data exists to ground
// them. Nothing in this module calls Oracle at all.
RPGACE.register('questEngine', {
  domain: 'schedule',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Aug 2026) — real, ratified /CEO plan item, and the EIGHTH
  // module to take this shape (after the videoPipeline/beatLog/bookworm/
  // phylumPath pilot, then contentProductionLive, conidPot and
  // videoSummary): this module is split into two internal namespaces,
  // `ui` (rendering/DOM) and `logic` (business logic/data), following the
  // exact shape those seven already shipped and verified. Pure internal-
  // structure refactor — zero functional, behavioural, UX, data or schema
  // change; every function below was MOVED wholesale, never rewritten,
  // never split down the middle, and its own body is otherwise untouched.
  //
  // 36 real members: 28 functions + 8 data fields. `init` stays a literal
  // top-level function (because RPGACE.register() calls `module.init()`
  // directly and cannot see into a sub-object, and its own `self`
  // genuinely IS the module — byte-identical, still calling the top-level
  // pass-throughs), 24 moved into `logic`, 3 into `ui`.
  //
  // The lopsided 24/3 split is REAL, not a misclassification: grep the
  // module for document.*/createElement/getElementById/querySelector/
  // innerHTML and every single hit falls inside exactly three functions
  // (_paintRestoredState, _inject, _renderPanel). questEngine is
  // overwhelmingly a data engine — four Supabase trigger scans, the
  // running-average formula, quest_log persistence, board-state restore —
  // with one panel bolted on the end. The split says so honestly rather
  // than padding `ui` out to look balanced.
  //
  // DATA FIELDS — one real difference from the earlier modules in this
  // series, named here rather than done silently. The other seven could
  // leave their data "exactly where it was" because it sat in one
  // contiguous block; questEngine's 8 data fields were INTERLEAVED with
  // its functions (NEEDS_INPUT_SOURCES sat between _scanTaxonomyReview and
  // _scanNeedsInput, TRIGGERS just after _scanNeedsInput, _boardStarts
  // between recordBoardCompletion and _persistBoardStarts). They are all
  // still at MODULE SCOPE — none moved into `ui`/`logic`, which is the
  // load-bearing part — but they are now grouped together at the top, each
  // still carrying its own explanatory comment verbatim. Object-literal
  // property ORDER is not load-bearing here: RPGACE.register() only ever
  // calls module.init() and never enumerates keys (confirmed by direct
  // read of R.register, not assumed), and nothing inside or outside this
  // module iterates the module object. The one dynamic lookup that exists,
  // logic.refresh's `self[fn]()` over the TRIGGERS array, is a named
  // property read, not an enumeration.
  //
  // The one real risk this split has to get right, function by function: a
  // function moved into `ui`/`logic` is invoked with `this` bound to THAT
  // sub-object, not the module. Every moved function that touches `this`
  // now opens with `var self = RPGACE.modules.questEngine;` and has every
  // pre-existing `this.X` rewritten to `self.X`, so each reference keeps
  // resolving to the module exactly as before — reaching the top-level
  // pass-throughs, which is precisely why every moved function keeps one.
  // That matters most for the real module-scope MUTATIONS, which must land
  // on the module and never on a sub-object or the two namespaces silently
  // desync: `self._stats` (logic._loadStats, logic.recordDuration),
  // `self._rows` (logic.refresh, logic.completeQuest, logic.dismissQuest),
  // `self._boardStarts` (logic._loadBoardStarts, logic._persistBoardStarts,
  // logic.recordBoardCompletion) and — the genuinely cross-namespace one —
  // `self._budget`, WRITTEN by ui._inject's own budget-input handler and
  // READ straight back by ui._renderPanel and, indirectly, by logic's
  // estimate filtering. If that one landed on `ui` instead of the module
  // the time-budget filter would still appear to work, which is exactly
  // why it is called out here rather than left to be noticed later.
  //
  // Exact accounting of the 27 moved functions, so a later reader can
  // check this by grep rather than take it on trust:
  //   • 16 already had `var self = this;` at or above their first
  //     `this.`/`self.` use and simply have that one line swapped for the
  //     handle, so the handle lands in exactly the same position and
  //     statement order is literally unchanged: logic._boot, _runBoot,
  //     _loadStats, recordDuration, _scanObsRaw, _scanNeedsInput, refresh,
  //     _createQuests, startQuest, completeQuest, dismissQuest,
  //     recordBoardCompletion, _restoreBoardState, _fmtEstimate, plus
  //     ui._inject and ui._renderPanel.
  //   • ui._inject is the single function that used BOTH forms: it had its
  //     own `var self = this;` AND one bare `this._renderPanel();` as its
  //     very last statement. The declaration is swapped as above and that
  //     one bare call is rewritten to `self._renderPanel();` — otherwise
  //     it would have resolved to `ui._renderPanel` and silently bypassed
  //     the pass-through.
  //   • 1 (logic.workflowEstimate) had `var self = this;` BELOW its first
  //     `this.` use, so the handle is hoisted to the top of the body:
  //     above one property lookup and one guarded early return. A bare
  //     property read of RPGACE.modules.questEngine has no side effects
  //     and the module is always registered before any of these can run,
  //     so ordering is unchanged in effect. (Same case videoSummary._delete
  //     and contentProductionLive._injectOracleBar already set precedent
  //     for.)
  //   • 5 had no `var self` at all and used bare `this.X` (logic.estimateFor,
  //     samplesFor, _persistBoardStarts, _loadBoardStarts, startBoardQuest):
  //     they get the handle inserted as their first statement — the
  //     videoPipeline pilot's own `var mod = RPGACE.modules.videoPipeline;`
  //     precedent.
  //   • 5 reference neither `this` nor `self` at all and moved completely
  //     untouched: logic.blend, logic._statId, logic._scanKnowledgeGaps,
  //     logic._scanTaxonomyReview, ui._paintRestoredState.
  //
  // `init` keeps its own `var self = this;` verbatim — that `this`
  // genuinely IS the module, and it is the only function in the module
  // where that is still true.
  //
  // Classification rule used (identical to the rule beatLog/
  // contentProductionLive/conidPot/videoSummary each recorded): a function
  // lives in `ui` if it CONSTRUCTS OR DISCOVERS DOM (document.*,
  // createElement, getElementById, querySelector, innerHTML); otherwise in
  // `logic`. Deliberately NOT counted as a ui signal, matching the
  // phylumPath pilot's own precedent: a bare window `confirm()`/`prompt()`
  // dialog, a `showPage()` page-nav call, or opening ANOTHER module's
  // picker/popup. A function that merely TRIGGERS a UI action without
  // constructing any DOM of its own is logic.
  //
  // videoSummary's markup-string RULE EXTENSION (a function returning
  // markup destined for `.innerHTML` counts as constructing DOM) was
  // checked against this module and DOES NOT APPLY: questEngine renders
  // exclusively through createElement/appendChild/textContent. The only
  // `innerHTML` in the whole module is ui._renderPanel's `grid.innerHTML
  // = ''` clear, which builds no markup, and a grep for a markup-opening
  // string literal returns exactly one hit — inside a comment. Recorded
  // here so a future reader knows the extension was considered and ruled
  // out on evidence, not forgotten.
  //
  // The genuinely mixed / judgment-call functions, each named here with the
  // real evidence rather than silently classified:
  //   • logic.startBoardQuest MUTATES a DOM element, but only one handed to
  //     it by its caller (`btn.textContent` / `btn.disabled` /
  //     `btn.style.opacity`) — it neither constructs nor discovers one.
  //     That is the exact shape videoSummary._runRetro and
  //     contentProductionLive._generateBundle were classified `logic` on,
  //     and its real job is data: the localStorage start-timestamp write
  //     via _loadBoardStarts/_persistBoardStarts.
  //   • logic._restoreBoardState is the module's biggest judgment call and
  //     is `logic` on its real job: it reads 1000 completed quest_log rows
  //     and rebuilds the legacy globals STATE (totalXP/tasksCompleted/
  //     level/xp, re-walking the real xpRequired bands) and QUESTS (per-
  //     quest `done` inside each recurrence window). It touches no DOM
  //     itself — the actual painting is delegated to ui._paintRestoredState
  //     and to the legacy global buildAllQuests(). Mutating a plain global
  //     object is data work, not rendering.
  //   • ui._paintRestoredState is the paint half of that same pair and is
  //     `ui` purely because it DISCOVERS DOM (document.getElementById plus
  //     textContent writes across six elements). It contains no decisions
  //     of its own — every value it writes was already computed by
  //     logic._restoreBoardState.
  //   • logic._runBoot, logic.refresh, logic.startQuest, logic.completeQuest
  //     and logic.dismissQuest are all in `logic` on the "merely triggers
  //     UI" clause: each ends in a `self._inject()` / `self._renderPanel()`
  //     call and builds no DOM here.
  //   • So logic -> ui cross-namespace calls are normal in this module,
  //     exactly as ui._inject/_renderPanel already call logic.* functions
  //     (self._loadStats, self.refresh, self.startQuest, self.completeQuest,
  //     self.dismissQuest, self._fmtEstimate, self.estimateFor). Every one
  //     of those calls goes through the top-level pass-throughs via
  //     `self.X`, never `this.ui.X` / `this.logic.X` directly, so no call
  //     site inside the module had to change.
  //
  // Three pre-existing oddities were found while reading every function for
  // this split and are FLAGGED IN PLACE, NOT FIXED — see the notes on
  // logic._scanObsRaw (a dead local), logic.startQuest/logic.completeQuest
  // (an inconsistent return type left behind by the Aug 24 2026 "return the
  // chain" fix) and logic.recordBoardCompletion (a latent clobber of the
  // persisted start-timestamp map).
  // ══════════════════════════════════════════════════════════════════

  // Real first-run estimates, in minutes. These are only ever sample 0 -
  // the moment one real timed completion lands, the running average
  // starts moving off them and never returns.
  DEFAULT_ESTIMATES: {
    knowledge_gap:    25,
    taxonomy_review:  20,
    needs_input:      15,
    board:            30,
  },

  // Hand-written step lists (Phase 1). A workflow's own estimate is the
  // SUM of its steps' current averages - Alex's "workflow calculates
  // what steps are needed to complete quest, calculate total of average
  // time for step execution."
  WORKFLOWS: {
    knowledge_gap: { label: 'Close a knowledge gap', steps: [
      { key: 'gap_study',   label: 'Study the concept',                   estimate: 15 },
      { key: 'gap_feynman', label: 'Feynman it back / log the insight',   estimate: 8 },
      { key: 'gap_apply',   label: 'Apply it in a real beat',             estimate: 12 },
    ] },
    taxonomy_review: { label: 'Clear the taxonomy review queue', steps: [
      { key: 'tax_open_queue', label: 'Open the review queue',            estimate: 2 },
      { key: 'tax_judge',      label: 'Judge each pending item',          estimate: 15 },
    ] },
    needs_input: { label: 'Answer what is waiting on you', steps: [
      { key: 'input_read',   label: 'Read what is waiting',               estimate: 5 },
      { key: 'input_answer', label: 'Give the real answer / confirm',     estimate: 10 },
    ] },
  },

  _stats: null,        // scope|stat_key -> row

  _rows: [],           // live open/in-progress quest_log rows

  _budget: null,       // "how much time have I got" filter, in minutes

  // (d) Anything that needs Alex's input. Real basis: four separate,
  //     genuinely existing "waiting on a human" signals already used by
  //     this project's own session-start checks and oversight docs.
  //     Each is a real query against a real column - if a source is
  //     empty it simply produces nothing, it is never padded out.
  //     The taxonomy review queue is a fifth such signal but has its own
  //     dedicated trigger above, so it is NOT double-counted here.
  NEEDS_INPUT_SOURCES: [
    { table: 'smoke_test_items', params: 'select=id,item_name&needs_confirm_highlight=is.true',
      label: 'hand-test confirmation', ref: 'smoke_test_needs_confirm',
      desc: 'shipped fix(es) waiting for you to confirm they actually work' },
    { table: 'error_log', params: 'select=id&status=eq.active',
      label: 'active error', ref: 'error_log_active',
      desc: 'unresolved error(s) in the error log' },
    { table: 'oracle_dev_suggestions', params: 'select=id&status=eq.new',
      label: 'Oracle suggestion', ref: 'oracle_dev_new',
      desc: 'suggestion(s) Oracle flagged to Orchestrator CC and nobody has reviewed' },
    { table: 'system_map_flags', params: 'select=id&status=eq.flagged',
      label: 'map integration flag', ref: 'system_map_flagged',
      desc: 'trickle-down/up finding(s) flagged by /cartographer' },
  ],

  // PC-6 (Oct 17 2026): _scanObsRaw retired with the OBS raw workflow.
  TRIGGERS: ['_scanKnowledgeGaps', '_scanTaxonomyReview', '_scanNeedsInput'],

  _boardStarts: null,

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self._boot(); });
    RPGACE.hooks.on('page:show', function(name) {
      // DR-2/DR-7: the 🎯 quest panel is gone from My Day; the scan still runs.
      if (name === RPGACE.CONFIG.pages.agenda) self.refresh();
    });
  },

  // ============================================================
  // logic — business logic/data: constructs and discovers no DOM.
  // ============================================================
  logic: {

    _boot: function() {
      var self = RPGACE.modules.questEngine;
      if (!RPGACE.sb || !RPGACE.sb.select) {
        // Same real boot-order race taxonomySync.getTopGaps and
        // dashDeck._refreshGlance already guard against: this boot task can
        // fire before config.init() has set RPGACE.sb. Retry once rather
        // than resolving to a permanently empty board.
        setTimeout(function() { self._boot(); }, 400);
        return Promise.resolve();
      }
      // Aug 30 (real Fable-audit finding, F1 — the same real bug class as
      // morningBrief._autoRun's own Aug 22 fix, never applied here): this
      // boot task fires at MODULE-INIT time via registerBootTask, before any
      // real login, since #gate's own hide only happens inside
      // checkPassword()'s success branch. refresh() below can reach
      // _createQuests() -> RPGACE.sb.secureWrite(), which needs
      // authGate._apiSecret to attach the auth header - pre-login that's
      // null, so every quest-log write gets a real, valid JSON 401 back
      // from requireAuth() (confirmed live in error_log, Aug 27-28: a real
      // "Unauthorized" wave distinct from the still-separately-diagnosed
      // "Unexpected token '<'" HTML-response wave). Same real fix, same
      // real signal, no new mechanism (rule 8): wait for 'rpgace:login' if
      // login hasn't happened yet.
      var apiSecretReady = RPGACE.modules.authGate && RPGACE.modules.authGate._apiSecret;
      if (!apiSecretReady) {
        var off = RPGACE.hooks.on('rpgace:login', function() {
          off();
          self._runBoot();
        });
        return Promise.resolve();
      }
      return self._runBoot();
    },

    _runBoot: function() {
      var self = RPGACE.modules.questEngine;
      return self._loadStats()
        .then(function() { return self._restoreBoardState(); })
        .then(function() { return self.refresh(); })
        .catch(function(e) { console.warn('[questEngine] boot:', e.message); });
    },

    // ── the formula ────────────────────────────────────────────────────
    // One implementation, three scopes (rule 8). See the header comment.
    blend: function(estimate, completionCount, totalActual) {
      var est = Number(estimate) || 0;
      var n = Number(completionCount) || 0;
      var tot = Number(totalActual) || 0;
      return (est + tot) / (n + 1);
    },

    _statId: function(scope, key) { return scope + '|' + key; },

    _loadStats: function() {
      var self = RPGACE.modules.questEngine;
      return RPGACE.sb.select('quest_duration_stats', 'select=*&limit=500')
        .then(function(rows) {
          self._stats = {};
          (rows || []).forEach(function(r) { self._stats[self._statId(r.scope, r.stat_key)] = r; });
          return self._stats;
        })
        .catch(function(e) {
          console.warn('[questEngine] stats load failed:', e.message);
          self._stats = self._stats || {};
          return self._stats;
        });
    },

    // Current best-known duration for a key: the real running average once
    // any real data exists, otherwise the caller's first-run estimate.
    estimateFor: function(scope, key, fallback) {
      var self = RPGACE.modules.questEngine;
      var row = self._stats && self._stats[self._statId(scope, key)];
      if (row && row.average_minutes != null) return Number(row.average_minutes);
      return Number(fallback) || 0;
    },

    // How much of that estimate is real, for honest labelling.
    samplesFor: function(scope, key) {
      var self = RPGACE.modules.questEngine;
      var row = self._stats && self._stats[self._statId(scope, key)];
      return row ? (Number(row.completion_count) || 0) : 0;
    },

    // A workflow's estimate = the sum of its steps' current averages.
    workflowEstimate: function(workflowKey) {
      var self = RPGACE.modules.questEngine;
      var wf = self.WORKFLOWS[workflowKey];
      if (!wf) return null;
      var total = 0;
      wf.steps.forEach(function(s) { total += self.estimateFor('step', s.key, s.estimate); });
      return total;
    },

    // Records one real completion at one scope, per Alex's formula.
    // actualMinutes === null means "completed but never timed" - the row is
    // still real, but it is NOT folded into the average (see header).
    recordDuration: function(scope, key, label, firstEstimate, actualMinutes) {
      var self = RPGACE.modules.questEngine;
      var id = self._statId(scope, key);
      var existing = self._stats && self._stats[id];
      var actual = (actualMinutes == null) ? null : Number(actualMinutes);
      if (actual != null && (!isFinite(actual) || actual < 0)) actual = null;

      // Real gap found + fixed during the A9 verification pass (Aug 24
      // 2026): an untimed first-ever completion used to still write a
      // completion_count:0 row here. Harmless in practice - estimateFor/
      // samplesFor already fall back to the exact same estimate/0 with no
      // row at all - but a needless write that reads as data when it is
      // not, and doesn't match this function's own "must not touch the
      // stats table" spirit for an untimed completion. Skip outright.
      if (!existing && actual == null) return Promise.resolve(null);

      if (!existing) {
        var est = Number(firstEstimate) || 0;
        var count = actual == null ? 0 : 1;
        var total = actual == null ? 0 : actual;
        var payload = {
          scope: scope, stat_key: key, label: label || key,
          estimate_minutes: est,
          completion_count: count,
          total_actual_minutes: total,
          average_minutes: self.blend(est, count, total),
          last_actual_minutes: actual,
          updated_at: new Date().toISOString(),
        };
        return RPGACE.sb.secureWrite('quest_duration_stats', 'insert', payload)
          .then(function(data) {
            var row = (data && data[0]) || payload;
            self._stats[id] = row;
            return row;
          });
      }

      if (actual == null) return Promise.resolve(existing);

      var newCount = (Number(existing.completion_count) || 0) + 1;
      var newTotal = (Number(existing.total_actual_minutes) || 0) + actual;
      var upd = {
        completion_count: newCount,
        total_actual_minutes: newTotal,
        // estimate_minutes is deliberately never rewritten - it is sample 0
        // of the mean, forever.
        average_minutes: self.blend(existing.estimate_minutes, newCount, newTotal),
        last_actual_minutes: actual,
        updated_at: new Date().toISOString(),
      };
      return RPGACE.sb.secureWrite('quest_duration_stats', 'update', upd, 'id=eq.' + existing.id)
        .then(function() {
          Object.keys(upd).forEach(function(k) { existing[k] = upd[k]; });
          return existing;
        });
    },

    // ── the 4 real triggers ────────────────────────────────────────────
    // Every one of these queries a real table and only ever produces a
    // quest from a real row that actually came back. Nothing here invents
    // quest content; a trigger with no matching data produces no quests,
    // and says so.


    // (b) Closing knowledge gaps. Real basis: `taxonomy_nodes` rows with
    //     applied_in_beat=false and gap_score>0 - the exact same definition
    //     dashDeck._refreshGlance's own "gaps tracked" count uses. Reuses
    //     taxonomySync.getTopGaps rather than a second hand-rolled query.
    _scanKnowledgeGaps: function() {
      var ts = RPGACE.modules.taxonomySync;
      if (!ts || !ts.getTopGaps) return Promise.resolve([]);
      return ts.getTopGaps(3)
        .then(function(nodes) {
          return (nodes || []).filter(function(n) { return Number(n.gap_score) > 0; }).map(function(n) {
            return {
              kind: 'knowledge_gap',
              workflow: 'knowledge_gap',
              key: 'knowledge_gap',
              name: 'Close the gap: ' + n.concept,
              description: 'Gap score ' + Number(n.gap_score).toFixed(1) + '/10, and it has never been applied in a real beat.',
              category: 'career', questType: 'generated', xp: 90,
              sourceTable: 'taxonomy_nodes', sourceRef: n.id,
            };
          });
        })
        .catch(function(e) { console.warn('[questEngine] gap scan:', e.message); return []; });
    },

    // (c) Taxonomy nodes to review. Real basis: pending `taxonomy_proposals`
    //     + pending `taxonomy_links` - the same two queries the review
    //     queue itself and dashDeck's "Needs you now" list already run.
    //     Deliberately ONE quest for the whole queue rather than one per
    //     row: at the real current backlog size that would mint dozens of
    //     quests for what is genuinely one sitting of work.
    _scanTaxonomyReview: function() {
      return Promise.all([
        RPGACE.sb.select('taxonomy_proposals', 'select=id&status=eq.pending'),
        RPGACE.sb.select('taxonomy_links', 'select=id&status=eq.pending')
      ]).then(function(res) {
        var total = ((res[0] || []).length) + ((res[1] || []).length);
        if (!total) return [];
        return [{
          kind: 'taxonomy_review',
          workflow: 'taxonomy_review',
          key: 'taxonomy_review',
          name: 'Review ' + total + ' pending taxonomy item' + (total === 1 ? '' : 's'),
          description: (res[0] || []).length + ' proposal' + ((res[0] || []).length === 1 ? '' : 's') + ' and ' +
                       (res[1] || []).length + ' fusion link' + ((res[1] || []).length === 1 ? '' : 's') +
                       ' are waiting on your judgement.',
          category: 'career', questType: 'generated', xp: 80,
          sourceTable: 'taxonomy_proposals,taxonomy_links', sourceRef: 'review_queue',
        }];
      }).catch(function(e) { console.warn('[questEngine] review scan:', e.message); return []; });
    },

    _scanNeedsInput: function() {
      var self = RPGACE.modules.questEngine;
      return Promise.all(self.NEEDS_INPUT_SOURCES.map(function(src) {
        return RPGACE.sb.select(src.table, src.params)
          .then(function(rows) { return { src: src, n: (rows || []).length }; })
          .catch(function() { return { src: src, n: 0 }; });
      })).then(function(results) {
        return results.filter(function(r) { return r.n > 0; }).map(function(r) {
          return {
            kind: 'needs_input',
            workflow: 'needs_input',
            key: 'needs_input:' + r.src.ref,
            name: r.n + ' ' + r.src.label + (r.n === 1 ? '' : 's') + ' need you',
            description: r.n + ' ' + r.src.desc + ' (' + r.src.table + ').',
            category: 'career', questType: 'generated', xp: 60,
            sourceTable: r.src.table, sourceRef: r.src.ref,
          };
        });
      });
    },

    // ── generation ─────────────────────────────────────────────────────
    // DR-2 (Oct 27 2026, plan "Day & Habits Rewire"): scans no longer make
    // quests. What they find becomes Realm Tasks (Alex: "all quests should be
    // tasks decided by realms"): each system alert is one live Builder task
    // that re-opens while its count is above 0 and closes at 0; knowledge
    // gaps and the taxonomy queue go to the Scholar inbox, only while the
    // taxonomy tree has rows (same dormant rule as KR-4). quest_log stays the
    // done-ledger.
    TASK_TITLES: { smoke_test_needs_confirm: 'Confirm hand-tested fixes', error_log_active: 'Clear active errors',
      oracle_dev_new: 'Answer Oracle suggestions', system_map_flagged: 'Review map integration flags' },
    refresh: function() {
      var self = RPGACE.modules.questEngine, rt = RPGACE.modules.realmTasks, tt = RPGACE.modules.taxonomyTree;
      if (!RPGACE.sb || !RPGACE.sb.select || !rt) return Promise.resolve();
      var paused = !tt || !tt.logic || !tt.logic.isPaused || tt.logic.isPaused();
      var scans = ['_scanNeedsInput'].concat(paused ? [] : ['_scanKnowledgeGaps', '_scanTaxonomyReview']);
      return Promise.all(scans.map(function(fn) { return self[fn](); }))
        .then(function(batches) {
          var cands = [];
          batches.forEach(function(b) { cands = cands.concat(b || []); });
          return self.logic.toTasks(cands);
        })
        .catch(function(e) {
          console.warn('[questEngine] refresh:', e.message);
          RPGACE.utils.toast('Task scan failed: ' + e.message, '#CC4A4A', 4000, 'questEngine');
        });
    },
    toTasks: function(cands) {
      var self = RPGACE.modules.questEngine, L = RPGACE.modules.realmTasks.logic;
      var live = self.NEEDS_INPUT_SOURCES.map(function(src) {
        var c = cands.filter(function(x) { return x.kind === 'needs_input' && x.sourceRef === src.ref; })[0];
        return self.logic.liveTask(src, c);
      });
      var inbox = cands.filter(function(c) { return c.kind !== 'needs_input'; }).map(function(c) {
        return L.add({ realm: 'scholar', title: c.name, notes: c.description, kind: 'once', status: 'inbox',
          sources: [{ table: c.sourceTable, ref: String(c.sourceRef), label: 'scan' }] }).catch(function() { return null; });
      });
      return Promise.all(live.concat(inbox));
    },
    // One stable-titled Builder task per alert source: kept with the count in
    // its notes while there is something waiting, done when there is nothing.
    // Read by title (any status) so a done row is re-opened, not re-inserted
    // (the realm_tasks dedup trigger swallows a same-title insert).
    liveTask: function(src, c) {
      var self = RPGACE.modules.questEngine, L = RPGACE.modules.realmTasks.logic;
      var title = self.logic.TASK_TITLES[src.ref] || ('Check ' + src.label + 's');
      return L.read('realm_tasks', 'select=*&realm=eq.builder&title=eq.' + encodeURIComponent(title) + '&limit=1').then(function(rows) {
        var t = Array.isArray(rows) && rows[0];
        if (c) {
          var notes = c.name + ' — ' + c.description;
          if (t) return (t.status !== 'kept' || t.notes !== notes) ? L.update(t, { status: 'kept', notes: notes }) : t;
          return L.add({ realm: 'builder', title: title, notes: notes, kind: 'once', status: 'kept', sources: [{ table: 'needs_input', ref: src.ref, label: 'system' }] });
        }
        if (t && t.status === 'kept') return L.update(t, { status: 'done' });
        return null;
      }).catch(function(e) { console.warn('[questEngine] live task:', e.message); return null; });
    },

    // RC-3 (Oct 15 2026): a quest's realm - its category when that is a
    // realm, else the old category mapped (career->producer ...), else Life.
    questRealmKey: function(r) {
      var X = RPGACE.modules.xpSeason, c = String((r && r.category) || '').toLowerCase();
      if (X && X.REALMS[c]) return c;
      return RPGACE.QUEST_CATEGORY_REALM[c] || 'life';
    },
    questRealmInfo: function(r) {
      var X = RPGACE.modules.xpSeason;
      return X ? X.REALMS[RPGACE.modules.questEngine.logic.questRealmKey(r)] || null : null;
    },
    // RC-3: where a quest came from -> { label, open } (open may be null).
    sourceLink: function(r) {
      if (!r || !r.source_table) return null;
      var t = r.source_table, ref = String(r.source_ref || ''), P = (RPGACE.CONFIG && RPGACE.CONFIG.pages) || {};
      var page = function(k) { return function() { if (typeof showPage === 'function') showPage(P[k]); }; };
      var review = function() { var m = RPGACE.modules.knowledgeReview; if (m) m.open(); };
      var doc = function(f) { return function() { window.open(f, '_blank', 'noopener'); }; };
      if (t === 'intel_reports') {
        var url = ref.split('#q')[0];
        return { label: 'a video you analysed', open: /^https?:\/\//.test(url) ? doc(url) : page('encyclopedia') };
      }
      if (t === 'realm_suggest') {
        var X = RPGACE.modules.xpSeason, rk = ref.split(':')[0], R = X && X.REALMS[rk];
        return { label: 'what your ' + (R ? R.name : 'realm') + ' realm knows', open: function() {
          var je = RPGACE.modules.jargonEncyclopedia; if (je) je._realmFilter = rk; page('jargonEncyclopedia')();
        } };
      }
      if (t === 'taxonomy_nodes') return { label: 'a knowledge gap', open: review };
      if (t.indexOf('taxonomy_') === 0) return { label: 'your review queue', open: review };
      if (t === 'routines') return { label: 'My Day', open: page('agenda') };
      if (t === 'chore_blocks') return { label: 'a planned block in My Day', open: page('agenda') };
      if (t === 'smoke_test_items') return { label: 'the hand-test list', open: doc('smoke_test.html') };
      if (t === 'error_log') return { label: 'the error log', open: doc('error_log.html') };
      if (t === 'oracle_dev_suggestions') return { label: 'an Oracle flag for Claude Code', open: null };
      if (t === 'system_map_flags') return { label: 'a Galaxy Map flag', open: doc('graphify-out/galaxy_map.html') };
      return { label: t.replace(/_/g, ' '), open: null };
    },
    // RC-3: suggest up to 3 quests for one realm from what it knows (its
    // accepted jargon + Library titles). One Oracle call, skipped when the
    // realm knows nothing yet. Resolves to [{ name, action, xp }].
    suggestFor: function(realm) {
      var X = RPGACE.modules.xpSeason, R = X && X.REALMS[realm];
      if (!R) return Promise.reject(new Error('Unknown realm'));
      return RPGACE.realmKnowledgeFor(realm).then(function(k) {
        if (!k.terms.length && !k.items.length) {
          var e = new Error('Your ' + R.name + ' realm knows nothing yet - accept jargon or add Library items for it first');
          e.empty = true; throw e;
        }
        return RPGACE.modules.questEngine.logic.askSuggest(R, k.terms, k.items);
      });
    },
    askSuggest: function(R, terms, items) {
      var prompt = 'Suggest 3 small, concrete quests for my ' + R.name + ' realm, each doable in one sitting, that put what I know into practice.\n' +
        (terms.length ? 'Terms I know: ' + terms.join(', ') + '\n' : '') +
        (items.length ? 'Things I have read or watched: ' + items.join('; ') + '\n' : '') +
        'Reply on ONE line only, the 3 quests separated by " | ", each as: quest name ~ one-sentence action ~ XP (a whole number 10-100). No numbering, no other text.';
      return RPGACE.modules.phylumPath._callGroundWorkerText(prompt, 400).then(function(txt) {
        return RPGACE.modules.questEngine.logic.parseSuggest(txt);
      });
    },
    parseSuggest: function(txt) {
      txt = String(txt || '').replace(/^\s*✦\s*Oracle\s*/, '').trim();
      return txt.split(/\s*\|\s*|\n+/).map(function(part) {
        var bits = part.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').split(/\s*~\s*/);
        var name = (bits[0] || '').trim();
        if (!name || name.length < 3 || !(bits[1] || '').trim()) return null;
        var xp = parseInt(bits[2], 10);
        return { name: name.slice(0, 120), action: (bits[1] || '').trim().slice(0, 300), xp: isNaN(xp) ? 50 : xp };
      }).filter(Boolean).slice(0, 3);
    },
    // One suggestion -> one quest. Same kind (and daily XP cap) as quests
    // from inputs; the realm is the category.
    // Realm Tasks (Oct 27 2026): a realm suggestion becomes a kept realm
    // task (duplicate-checked), not a quest.
    addSuggested: function(realm, q) {
      var rt = RPGACE.modules.realmTasks;
      if (!rt) return Promise.reject(new Error('Tasks are not loaded'));
      var slug = String(q.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
      var xp = Math.max(5, Math.min(100, Math.round((Number(q.xp) || 50) / 5) * 5));
      return rt.logic.keepIdea({ realm: realm, title: q.name, notes: q.action || '', xp: xp, source: { table: 'realm_suggest', ref: realm + ':' + slug, label: 'realm ideas' } });
    },
    _createQuests: function(cands) {
      var self = RPGACE.modules.questEngine;
      return Promise.all(cands.map(function(c) {
        var est = self.workflowEstimate(c.workflow);
        if (est == null) est = self.estimateFor('quest', c.key, self.DEFAULT_ESTIMATES[c.kind] || 30);
        var payload = {
          quest_key: c.key, quest_kind: c.kind, name: c.name, description: c.description,
          category: c.category, quest_type: c.questType, xp: c.xp,
          source_table: c.sourceTable, source_ref: String(c.sourceRef),
          workflow_key: c.workflow || null,
          estimated_minutes: Math.round(est * 10) / 10,
          status: 'open',
        };
        return RPGACE.sb.secureWrite('quest_log', 'insert', payload)
          .then(function(data) {
            var row = (data && data[0]) || null;
            if (!row || !row.id) return row;
            var wf = self.WORKFLOWS[c.workflow];
            if (!wf) return row;
            // Real step rows - this is what makes "total of average time for
            // step execution" a checkable number rather than a claim.
            var steps = wf.steps.map(function(s, i) {
              return {
                quest_key: s.key, quest_kind: 'workflow_step', name: s.label,
                category: c.category, quest_type: 'step', xp: 0,
                workflow_key: c.workflow, parent_quest_id: row.id, step_index: i,
                estimated_minutes: self.estimateFor('step', s.key, s.estimate),
                status: 'open',
              };
            });
            return RPGACE.sb.secureWrite('quest_log', 'insert', steps).then(function() { return row; });
          })
          .catch(function(e) {
            // Rule 7 - never silently swallow a failed write. But the unique
            // partial index on (quest_kind, source_ref) WHERE status='open'
            // is a LEGITIMATE, expected rejection: it means this exact quest
            // is already open, which is the index doing its job, not a
            // failure worth alarming Alex about. secureWrite only surfaces
            // the generic top-level error string (the PostgREST detail stays
            // in the response body), so rather than string-matching a
            // message this endpoint does not actually pass through, ask the
            // real table directly whether that row now exists.
            return RPGACE.sb.select('quest_log',
              'select=id&status=eq.open&quest_kind=eq.' + encodeURIComponent(c.kind) +
              '&source_ref=eq.' + encodeURIComponent(String(c.sourceRef)) + '&limit=1')
              .then(function(hit) {
                if (hit && hit.length) {
                  console.log('[questEngine] quest already open for ' + c.kind + '/' + c.sourceRef);
                  return null;
                }
                console.warn('[questEngine] create failed:', e.message);
                RPGACE.utils.toast('Could not create quest "' + c.name + '": ' + e.message, '#CC4A4A', 5000, 'questEngine');
                return null;
              })
              .catch(function() {
                console.warn('[questEngine] create failed:', e.message);
                RPGACE.utils.toast('Could not create quest "' + c.name + '": ' + e.message, '#CC4A4A', 5000, 'questEngine');
                return null;
              });
          });
      })).then(function(rows) { return rows.filter(Boolean); });
    },

    // ── start / complete for generated quests ──────────────────────────
    startQuest: function(id) {
      // Real bug fixed Sep 2 (flagged by the G53 split's own review, fixed
      // here as a clearly separate change): the Aug 24 2026 A9-verification
      // fix made the HAPPY path return its promise chain but left this
      // guard path returning bare `undefined` - an inconsistent return
      // type (a thenable when it acts, undefined when it no-ops) that
      // would throw on a caller doing .then() whenever the guard fired.
      // Fixed to return Promise.resolve() instead - zero-risk for the
      // current real call sites (an in-page button handler that ignores
      // the return; 3 external callers that touch neither this nor
      // completeQuest below), and correct for any future caller that
      // awaits it. dismissQuest has no guard, so it was already consistent.
      var self = RPGACE.modules.questEngine;
      var row = self._rows.filter(function(r) { return r.id === id; })[0];
      if (!row || row.started_at) return Promise.resolve();
      var now = new Date().toISOString();
      // Return the chain (real bug found + fixed during the A9 verification
      // pass, Aug 24 2026: this used to be fire-and-forget with nothing
      // returned, so a caller had no way to actually await the write - the
      // in-page ▶ button never needed that, but startQuest is also called
      // directly by module code, which does.
      return RPGACE.sb.secureWrite('quest_log', 'update', { started_at: now }, 'id=eq.' + id)
        .then(function() {
          row.started_at = now;
          RPGACE.utils.toast('⏱ Timing "' + row.name + '"', '#2ABFB0', 2500);
          self._renderPanel();
        })
        .catch(function(e) {
          RPGACE.utils.toast('Could not start timer: ' + e.message, '#CC4A4A', 4500);
        });
    },

    completeQuest: function(id) {
      var self = RPGACE.modules.questEngine;
      var row = self._rows.filter(function(r) { return r.id === id; })[0];
      // Same real fix as startQuest above - return Promise.resolve() from
      // the guard instead of bare undefined.
      if (!row || row.status !== 'open') return Promise.resolve();
      var now = new Date();
      var actual = row.started_at ? ((now - new Date(row.started_at)) / 60000) : null;
      if (actual != null) actual = Math.round(actual * 10) / 10;

      // Same real fix as startQuest above - return the chain.
      return RPGACE.sb.secureWrite('quest_log', 'update',
        { status: 'completed', completed_at: now.toISOString(), actual_minutes: actual },
        'id=eq.' + id)
        .then(function() {
          row.status = 'completed';
          // Quest scope, then the workflow scope it belongs to - "exactly
          // same for steps" per Alex, same function both times.
          var chain = self.recordDuration('quest', row.quest_key, row.name,
            row.estimated_minutes, actual);
          if (row.workflow_key) {
            chain = chain.then(function() {
              return self.recordDuration('workflow', row.workflow_key,
                (self.WORKFLOWS[row.workflow_key] || {}).label || row.workflow_key,
                row.estimated_minutes, actual);
            });
          }
          return chain;
        })
        .then(function() {
          if (typeof addXP === 'function') addXP(row.xp || 0);
          RPGACE.utils.toast('✓ ' + row.name + (actual != null ? ' — ' + actual + ' min logged' : ' — completed (untimed)'),
            '#4AAE6E', 3500);
          self._rows = self._rows.filter(function(r) { return r.id !== id; });
          self._renderPanel();
        })
        .catch(function(e) {
          RPGACE.utils.toast('Quest completion did NOT save: ' + e.message, '#CC4A4A', 6000);
          console.warn('[questEngine] complete failed:', e.message);
        });
    },

    dismissQuest: function(id) {
      var self = RPGACE.modules.questEngine;
      // Same real fix as startQuest/completeQuest above - return the chain.
      return RPGACE.sb.secureWrite('quest_log', 'update', { status: 'dismissed' }, 'id=eq.' + id)
        .then(function() {
          self._rows = self._rows.filter(function(r) { return r.id !== id; });
          self._renderPanel();
        })
        .catch(function(e) { RPGACE.utils.toast('Dismiss failed: ' + e.message, '#CC4A4A', 4500); });
    },

    // ── Quest Board persistence (the real fix for the 4x-flagged gap) ──
    // Called directly from the legacy completeQuest(); `q` is the real
    // QUESTS entry that was just ticked.
    recordBoardCompletion: function(q) {
      var self = RPGACE.modules.questEngine;
      if (!q || !RPGACE.sb || !RPGACE.sb.secureWrite) return Promise.resolve();
      // Real bug fixed Sep 2 (flagged by the G53 split's own review, fixed
      // here as a clearly separate change): if _boardStarts was still null
      // here (only possible if _loadBoardStarts had never run this page
      // load - true today only because makeCard() happens to call it on
      // every render, a real ordering dependency on a different function
      // in a different file section, not a guarantee), _persistBoardStarts
      // would have written `{}` over localStorage['rpgace_quest_starts'],
      // silently destroying every OTHER board quest's real in-flight start
      // timestamp. Calling _loadBoardStarts() here directly removes the
      // dependency entirely - it's already idempotent (early-returns if
      // _boardStarts is already populated), so this is a zero-risk no-op
      // on the current always-safe call path, and a real fix for any
      // future caller that doesn't happen to go through makeCard() first.
      self._loadBoardStarts();
      var started = self._boardStarts && self._boardStarts[q.id];
      var actual = started ? Math.round(((Date.now() - started) / 60000) * 10) / 10 : null;
      if (self._boardStarts) delete self._boardStarts[q.id];
      self._persistBoardStarts();

      var est = self.estimateFor('quest', q.id, self.DEFAULT_ESTIMATES.board);
      return RPGACE.sb.secureWrite('quest_log', 'insert', {
        quest_key: q.id, quest_kind: 'board', name: q.name, description: q.desc,
        category: q.cat, quest_type: q.type, xp: q.xp || 0,
        estimated_minutes: est, actual_minutes: actual,
        status: 'completed', completed_at: new Date().toISOString(),
        started_at: started ? new Date(started).toISOString() : null,
      }).then(function() {
        return self.recordDuration('quest', q.id, q.name, est, actual);
      }).then(function() {
        if (actual != null) RPGACE.utils.toast('⏱ ' + actual + ' min logged for "' + q.name + '"', '#2ABFB0', 3000);
      }).catch(function(e) {
        // Rule 7. The in-memory tick already happened and the XP already
        // showed - saying nothing here would leave Alex believing a
        // completion was saved when it was not, which is the exact failure
        // this whole module exists to end.
        RPGACE.utils.toast('⚠ "' + q.name + '" was NOT saved: ' + e.message, '#CC4A4A', 6000);
        console.warn('[questEngine] board completion failed:', e.message);
      });
    },

    _persistBoardStarts: function() {
      var self = RPGACE.modules.questEngine;
      try { localStorage.setItem('rpgace_quest_starts', JSON.stringify(self._boardStarts || {})); } catch (e) {}
    },

    _loadBoardStarts: function() {
      var self = RPGACE.modules.questEngine;
      if (self._boardStarts) return self._boardStarts;
      try { self._boardStarts = JSON.parse(localStorage.getItem('rpgace_quest_starts') || '{}'); }
      catch (e) { self._boardStarts = {}; }
      return self._boardStarts;
    },

    // Called from the board card's own ▶ button. A board quest is a
    // small, same-session thing, so its in-flight start time is a genuine
    // per-viewer convenience - localStorage, not a Supabase round trip.
    startBoardQuest: function(id, btn) {
      var self = RPGACE.modules.questEngine;
      var starts = self._loadBoardStarts();
      if (starts[id]) return;
      starts[id] = Date.now();
      self._persistBoardStarts();
      if (btn) { btn.textContent = '⏱ timing'; btn.disabled = true; btn.style.opacity = '0.6'; }
      RPGACE.utils.toast('⏱ Timer started', '#2ABFB0', 2000);
    },

    // ── restore what used to evaporate on every page load ──────────────
    _restoreBoardState: function() {
      var self = RPGACE.modules.questEngine;
      return RPGACE.sb.select('quest_log',
        'select=quest_key,quest_kind,xp,completed_at&status=eq.completed&order=completed_at.desc&limit=1000')
        .then(function(rows) {
          rows = rows || [];
          if (typeof STATE === 'undefined' || !STATE) return;
          var totalXP = 0;
          rows.forEach(function(r) { totalXP += Number(r.xp) || 0; });
          STATE.totalXP = totalXP;
          STATE.tasksCompleted = rows.length;
          // Walk the same real per-level bands addXP/levelUp use, so a
          // restored level means exactly what an earned one means.
          var lvl = 1, rem = totalXP;
          while (lvl <= STATE.xpRequired.length && rem >= STATE.xpRequired[lvl - 1]) {
            rem -= STATE.xpRequired[lvl - 1]; lvl++;
          }
          STATE.level = lvl; STATE.xp = rem;
          self._paintRestoredState();

          // Re-tick board quests already completed inside their own real
          // recurrence window, so a daily quest done this morning still
          // reads as done after a reload.
          var now = Date.now();
          var windowMs = { daily: 864e5, weekly: 6048e5, monthly: 2592e6 };
          if (typeof QUESTS === 'undefined' || !QUESTS) return;
          var doneKeys = {};
          rows.forEach(function(r) {
            if (r.quest_kind !== 'board' || !r.completed_at) return;
            if (doneKeys[r.quest_key]) return;
            doneKeys[r.quest_key] = new Date(r.completed_at).getTime();
          });
          Object.keys(QUESTS).forEach(function(group) {
            (QUESTS[group] || []).forEach(function(q) {
              var t = doneKeys[q.id];
              if (!t) return;
              var win = windowMs[q.type] || windowMs.daily;
              if (now - t < win) q.done = true;
            });
          });
          if (typeof buildAllQuests === 'function') buildAllQuests();
        })
        .catch(function(e) { console.warn('[questEngine] restore:', e.message); });
    },

    _fmtEstimate: function(row) {
      var self = RPGACE.modules.questEngine;
      var scope = 'quest', key = row.quest_key;
      var mins = self.estimateFor(scope, key, row.estimated_minutes);
      var n = self.samplesFor(scope, key);
      var txt = '~' + (Math.round(mins * 10) / 10) + ' min';
      if (n === 0) txt += ' · estimate only, never timed';
      else txt += ' · averaged over ' + n + ' real run' + (n === 1 ? '' : 's') + ' + the original estimate';
      return { mins: mins, text: txt };
    },
  },

  // ============================================================
  // ui — rendering/DOM: every document.* / createElement /
  // getElementById / querySelector / innerHTML hit in this module
  // lives inside exactly these three functions.
  // ============================================================
  ui: {

    // Oct 13 2026 (XP-1): the card is no longer painted from quest_log here;
    // quest/routine XP now reaches the xp_events ledger through the
    // database trigger, and xpSeason paints the card from that one source.
    _paintRestoredState: function() {
      if (RPGACE.modules.xpSeason) RPGACE.modules.xpSeason.ui.renderCard();
      if (typeof updateSkillTree === 'function') { try { updateSkillTree(); } catch (e) {} }
    },

    // ── UI ─────────────────────────────────────────────────────────────
    _inject: function() {
      if (document.getElementById('qe-panel')) return;
      var page = document.getElementById('page-quests');
      if (!page) return;
      var self = RPGACE.modules.questEngine;

      var panel = document.createElement('div');
      panel.id = 'qe-panel';
      panel.style.cssText = 'border-top:1px solid var(--border);padding-top:18px;margin-bottom:24px;';

      var hdr = document.createElement('div');
      hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px;';
      var t = document.createElement('div');
      t.className = 'section-title';
      t.style.margin = '0';
      t.textContent = '🎯 Generated From Your Real Data';
      hdr.appendChild(t);

      var controls = document.createElement('div');
      controls.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;';

      // "how much time I have" - the real, data-backed half of Alex's ask.
      var mins = document.createElement('input');
      mins.id = 'qe-budget';
      mins.type = 'number'; mins.min = '5'; mins.step = '5'; mins.placeholder = 'mins free';
      mins.style.cssText = 'width:86px;background:var(--panel2,#12121c);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:Rajdhani,sans-serif;font-size:12px;padding:4px 8px;';
      mins.oninput = function() {
        var v = parseFloat(mins.value);
        self._budget = (isFinite(v) && v > 0) ? v : null;
        self._renderPanel();
      };
      controls.appendChild(mins);

      var rescan = document.createElement('button');
      rescan.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.4);cursor:pointer;font-size:11px;padding:4px 10px;';
      rescan.textContent = '↻ Rescan';
      rescan.onclick = function() { self._loadStats().then(function() { return self.refresh(); }); };
      controls.appendChild(rescan);

      hdr.appendChild(controls);
      panel.appendChild(hdr);

      var note = document.createElement('div');
      note.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:12px;line-height:1.5;';
      note.textContent = 'Every quest here comes from a real row in your own data — an OBS ConID, a tracked knowledge gap, the taxonomy review queue, or something genuinely waiting on you. Times are real running averages once you have actually timed a run.';
      panel.appendChild(note);

      var grid = document.createElement('div');
      grid.id = 'qe-grid';
      grid.className = 'quest-grid';
      panel.appendChild(grid);

      var first = page.querySelector('.section-title');
      if (first && first.parentNode === page) page.insertBefore(panel, first.nextSibling);
      else page.appendChild(panel);
      self._renderPanel();
    },

    _renderPanel: function() {
      var grid = document.getElementById('qe-grid');
      if (!grid) return;
      var self = RPGACE.modules.questEngine;
      grid.innerHTML = '';

      var rows = self._rows.slice();
      if (self._budget != null) {
        rows = rows.filter(function(r) { return self._fmtEstimate(r).mins <= self._budget; });
      }

      if (!rows.length) {
        var empty = document.createElement('div');
        empty.style.cssText = 'font-size:12px;color:var(--muted);padding:14px;border:1px solid var(--border);border-radius:8px;';
        empty.textContent = self._budget != null
          ? 'Nothing currently fits in ' + self._budget + ' minutes.'
          : 'No generated quests right now — none of the four triggers found real matching data.';
        grid.appendChild(empty);
        return;
      }

      rows.forEach(function(r) {
        var est = self._fmtEstimate(r);
        var card = document.createElement('div');
        card.className = 'quest-card ' + (r.category || 'career');

        var top = document.createElement('div');
        top.className = 'quest-top';
        // RI-7 + RC-3: every quest shows its realm icon (old categories mapped).
        var qRealm = self.logic.questRealmInfo(r);
        var nm = document.createElement('div'); nm.className = 'quest-name'; nm.textContent = (qRealm ? qRealm.icon + ' ' : '') + r.name;
        var xp = document.createElement('div'); xp.className = 'quest-xp'; xp.textContent = '+' + (r.xp || 0) + ' XP';
        top.appendChild(nm); top.appendChild(xp);
        card.appendChild(top);

        var desc = document.createElement('div');
        desc.className = 'quest-desc'; desc.textContent = r.description || '';
        card.appendChild(desc);

        var time = document.createElement('div');
        time.style.cssText = 'font-size:11px;color:#2ABFB0;margin:6px 0 2px;';
        time.textContent = '⏱ ' + est.text;
        card.appendChild(time);

        if (r.workflow_key && self.WORKFLOWS[r.workflow_key]) {
          var wf = self.WORKFLOWS[r.workflow_key];
          var steps = document.createElement('div');
          steps.style.cssText = 'font-size:10px;color:var(--muted);margin-bottom:6px;line-height:1.6;';
          steps.textContent = 'Workflow · ' + wf.steps.map(function(s) {
            return s.label + ' (' + Math.round(self.estimateFor('step', s.key, s.estimate)) + 'm)';
          }).join(' → ');
          card.appendChild(steps);
        }

        // RC-3: where the quest came from, as a link back to it.
        var src = self.logic.sourceLink(r);
        if (src) {
          var from = document.createElement(src.open ? 'button' : 'div');
          from.className = 'quest-from';
          from.textContent = '📍 From: ' + src.label;
          from.style.cssText = 'display:block;text-align:left;font-size:12px;color:var(--muted);margin:4px 0 6px;padding:0;background:none;border:none;font-family:inherit;' + (src.open ? 'min-height:40px;cursor:pointer;text-decoration:underline;' : '');
          if (src.open) { from.type = 'button'; from.onclick = function(e) { e.stopPropagation(); src.open(); }; }
          card.appendChild(from);
        }
        var tags = document.createElement('div');
        tags.className = 'quest-tags';
        [r.quest_kind].forEach(function(x) {
          if (!x) return;
          var s = document.createElement('span'); s.className = 'tag'; s.textContent = x;
          tags.appendChild(s);
        });
        card.appendChild(tags);

        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

        if (!r.started_at) {
          var startBtn = document.createElement('button');
          startBtn.className = 'complete-btn';
          startBtn.style.cssText = 'flex:1;border-color:#2ABFB0;color:#2ABFB0;';
          startBtn.textContent = '▶ Start timer';
          startBtn.onclick = function() { self.startQuest(r.id); };
          btnRow.appendChild(startBtn);
        } else {
          var timing = document.createElement('div');
          timing.style.cssText = 'flex:1;font-size:11px;color:#2ABFB0;align-self:center;';
          timing.textContent = '⏱ running since ' + new Date(r.started_at).toLocaleTimeString();
          btnRow.appendChild(timing);
        }

        var doneBtn = document.createElement('button');
        doneBtn.className = 'complete-btn';
        doneBtn.style.flex = '1';
        doneBtn.textContent = '◎ Mark Complete';
        doneBtn.onclick = function() { self.completeQuest(r.id); };
        btnRow.appendChild(doneBtn);

        var dis = document.createElement('button');
        dis.className = 'complete-btn';
        dis.style.cssText = 'flex:0 0 auto;border-color:var(--border);color:var(--muted);';
        dis.textContent = '✕';
        dis.title = 'Dismiss this quest';
        dis.onclick = function() { self.dismissQuest(r.id); };
        btnRow.appendChild(dis);

        card.appendChild(btnRow);
        grid.appendChild(card);
      });
    },
  },

  // Thin top-level pass-throughs — these preserve the exact existing
  // public API byte-for-byte. `this` is always the module object itself,
  // because every real call site invokes them as a property access on the
  // module (`self.X` from inside this module's own init / boot chain /
  // promise chains / button handlers, or RPGACE.modules.questEngine.X(...))
  // — never a detached function reference.
  //
  // Real external API surface, from a fresh whole-repo grep run for this
  // split, covering BOTH the `RPGACE.modules.questEngine.X` direct form AND
  // every local-alias form (`var qe = RPGACE.modules.questEngine`), the
  // bracket form `RPGACE.modules['questEngine']`, and index.html's inline
  // onclick handlers: this module has THREE real external call sites, all
  // of them in this same file's own LEGACY:mainjs section (the mechanically
  // merged former main.js), and all three invoke a TOP-LEVEL method on the
  // module object, so all three keep working byte-identically through the
  // pass-throughs below:
  //   • makeCard()        -> qe._loadBoardStarts()[q.id]   (now logic)
  //   • completeQuest()   -> qe.recordBoardCompletion(q)   (now logic)
  //   • startBoardQuest() -> qe.startBoardQuest(id, btn)   (now logic)
  // index.html itself contains ZERO references to this module by name — the
  // Quest Board's `onclick="startBoardQuest(...)"` / `onclick=
  // "completeQuest(...)"` handlers are generated inside makeCard's own
  // innerHTML string and call those legacy GLOBALS, which are the three
  // wrappers above.
  //
  // A real name collision worth knowing before touching either side: this
  // module's own `completeQuest` and `startBoardQuest` are DIFFERENT
  // functions from the legacy globals of the same names. The legacy global
  // `startBoardQuest(id, btn)` does delegate to this module's
  // `startBoardQuest`; the legacy global `completeQuest(id, xp, btn)` does
  // NOT delegate to this module's `completeQuest(id)` — it calls
  // `recordBoardCompletion(q)` instead. They are two genuinely different
  // quest systems (the in-memory board vs. the generated quest_log rows)
  // that happen to share two method names.
  //
  // All 27 moved functions keep a pass-through regardless, for two real
  // reasons: the module's own internal call graph reaches nearly every one
  // of them through `self.X` (which resolves to the module, i.e. to these),
  // and the module's real member surface must stay byte-identical to before
  // this split. The 8 DATA fields are data, stay at module scope, and are
  // NOT pass-throughs.
  //
  // Note for a future reader: errorLog.METHOD_MODULE_MAP (the G109 stack-
  // trace attribution table) is keyed by method NAME, and this split changes
  // no method name — scripts/generate_method_module_map.py was re-run before
  // and after and produced byte-identical output, confirmed, not assumed.
  _boot: function() { return this.logic._boot(); },
  _runBoot: function() { return this.logic._runBoot(); },
  blend: function(estimate, completionCount, totalActual) { return this.logic.blend(estimate, completionCount, totalActual); },
  _statId: function(scope, key) { return this.logic._statId(scope, key); },
  _loadStats: function() { return this.logic._loadStats(); },
  estimateFor: function(scope, key, fallback) { return this.logic.estimateFor(scope, key, fallback); },
  samplesFor: function(scope, key) { return this.logic.samplesFor(scope, key); },
  workflowEstimate: function(workflowKey) { return this.logic.workflowEstimate(workflowKey); },
  recordDuration: function(scope, key, label, firstEstimate, actualMinutes) { return this.logic.recordDuration(scope, key, label, firstEstimate, actualMinutes); },
  _scanKnowledgeGaps: function() { return this.logic._scanKnowledgeGaps(); },
  _scanTaxonomyReview: function() { return this.logic._scanTaxonomyReview(); },
  _scanNeedsInput: function() { return this.logic._scanNeedsInput(); },
  refresh: function() { return this.logic.refresh(); },
  _createQuests: function(cands) { return this.logic._createQuests(cands); },
  startQuest: function(id) { return this.logic.startQuest(id); },
  completeQuest: function(id) { return this.logic.completeQuest(id); },
  dismissQuest: function(id) { return this.logic.dismissQuest(id); },
  recordBoardCompletion: function(q) { return this.logic.recordBoardCompletion(q); },
  _persistBoardStarts: function() { return this.logic._persistBoardStarts(); },
  _loadBoardStarts: function() { return this.logic._loadBoardStarts(); },
  startBoardQuest: function(id, btn) { return this.logic.startBoardQuest(id, btn); },
  _restoreBoardState: function() { return this.logic._restoreBoardState(); },
  _paintRestoredState: function() { return this.ui._paintRestoredState(); },
  _inject: function() { return this.ui._inject(); },
  _fmtEstimate: function(row) { return this.logic._fmtEstimate(row); },
  _renderPanel: function() { return this.ui._renderPanel(); },

});
/* ===END:questEngine=== */
