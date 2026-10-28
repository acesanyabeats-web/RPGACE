
/* ===MODULE:ciAutoPropose=== */
// F4: silent taxonomy_proposals queueing at the end of every Content
// Intelligence pipeline run (syncIntelData), same guarded pattern as
// main.js's existing "auto-save new entries to encyclopedia" loop just
// above it — mirrors that loop's dedup-by-url/title + 5-item cap so this
// doesn't fan out into a burst of Oracle calls on a big backlog sync.
RPGACE.register('ciAutoPropose', {
  domain: 'knowledge',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 29 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // twenty-eight predecessors already shipped and verified. Pure
  // internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale,
  // never rewritten and never split down the middle. Bodies are
  // deliberately NOT re-indented inside their new namespace, matching
  // the recently shipped docsLinks/encSync precedent, so the diff shows
  // only real changes rather than a whitespace wall.
  //
  // 3 real members, all functions, no data fields at all (checked by
  // direct read of every top-level key, not assumed from the shape).
  // `init` stays a literal top-level function (RPGACE.register() calls
  // `module.init()` directly and cannot see into a sub-object) —
  // byte-identical, its own `self = this` genuinely IS the module, so
  // the `window.syncIntelData` wrapper it installs still reaches
  // `self._scan(all || [])` through the top-level pass-through below.
  //
  // This module splits 0 / 2: BOTH movable functions land in `logic`,
  // and `ui` is genuinely EMPTY — the same honest inverse already
  // shipped for encSync (26) and scheduleFixes (23), kept as an
  // explicit `ui: {}` so the module still declares the same
  // two-namespace shape as every sibling. Classification, function by
  // function, each checked against its actual body rather than its
  // name — and neither is a close call:
  //   • _scan → logic. Zero `document.*`, zero `createElement`, zero
  //     `innerHTML`, zero `querySelector`/`getElementById` (grepped,
  //     not assumed). Its whole body is data work: a localStorage
  //     dedup-guard read/write, a walk over the synced intel rows
  //     reading `insights.encyclopedia_entry.key_learnings` /
  //     `insights.key_learnings` / `insights.production_techniques`,
  //     a normalized-text dedup, a length prefilter, the free
  //     `RPGACE.utils._quickPhylaScan` keyword prefilter, the three
  //     volume caps, and the summary-blob fallback for older reports.
  //     Its single `RPGACE.utils.toast(...)` at the end is a TRIGGER
  //     of UI, not construction of it — the standing rule since the
  //     phylumPath pilot, and the same reasoning that put
  //     encTaxonomyLink.logic._propose and videoSummary.logic._runRetro
  //     in `logic` despite their user-facing feedback.
  //   • _dispatch → logic. Pure promise-throttling control flow: N
  //     workers pulling from one shared job list, each awaiting its own
  //     `RPGACE.modules.taxonomyTree.silentPropose(...)` before taking
  //     the next, with a per-item `.catch` that only `console.warn`s.
  //     No DOM of any kind, and no UI trigger either.
  //
  // The one real risk this split has to get right: a function moved
  // into `ui`/`logic` is invoked with `this` bound to THAT sub-object,
  // not the module. Exact accounting for both moved functions:
  //   • logic._scan — already had `var self = this;`, swapped for the
  //     module handle IN PLACE (it sits after the readiness guard,
  //     which does not touch `this`, so control flow is unchanged). It
  //     is used once, for `self._dispatch(jobs, CONCURRENCY)`. Left as
  //     `this.`, it would have read `logic._dispatch` — which DOES
  //     exist on `logic`, so this one would have kept working by luck
  //     rather than by design; requalified anyway so the module never
  //     depends on two functions happening to share a namespace.
  //   • logic._dispatch — references neither `this` nor `self` (its
  //     cross-module call to `RPGACE.modules.taxonomyTree.silentPropose`
  //     was already fully qualified); moved byte-identical, no handle
  //     needed and none added.
  //
  // Zero external METHOD touchpoints confirmed by a fresh repo-wide
  // grep for `RPGACE.modules.ciAutoPropose` (0 hits anywhere,
  // rpgace_core.js and index.html included) — the module is driven
  // entirely by the `window.syncIntelData` wrapper `init` installs. The
  // two `"_dispatch"`/`"_scan"` entries in this file's own
  // METHOD_MODULE_MAP (G109) are a generated name->module DATA table,
  // not call sites, and are unaffected by this split.
  //
  // REAL DATA-LEVEL TOUCHPOINT, THOUGH — named plainly because the
  // obvious grep does not show it: `_scan`'s dedup guard is the shared
  // localStorage key `rpgace_ci_proposed`, and `videoSummary` writes to
  // that SAME key (see its `_delete`/retro path) specifically so a
  // deleted report is never re-proposed by the next sync. That is a
  // real cross-module contract on the KEY NAME, not on any method, so
  // it is unaffected by this split — but a future reader changing the
  // guard format here must check that call site too.
  // ══════════════════════════════════════════════════════════════════

  init: function() {
    var self = this;
    function patch() {
      if (typeof window.syncIntelData !== 'function' || window._ciAutoProposePatched) return;
      window._ciAutoProposePatched = true;
      var orig = window.syncIntelData;
      window.syncIntelData = function() {
        var result = orig.apply(this, arguments);
        if (result && typeof result.then === 'function') {
          result.then(function(all) { self._scan(all || []); });
        }
        return result;
      };
    }
    patch();
    setTimeout(patch, 1500);
  },

  // ============================================================
  // ui — deliberately empty. Neither movable function in this module
  // touches the DOM at all (see the G53 block above); the only
  // user-facing thing either does is fire one shared
  // `RPGACE.utils.toast(...)`, which is a trigger, not construction.
  // Kept as an explicit `{}` so the module still declares the same
  // two-namespace shape as every sibling.
  // ============================================================
  ui: {},

  // ============================================================
  // logic — business logic/data: the per-insight scan that turns a
  // finished Content Intelligence sync into a bounded, deduplicated
  // list of taxonomy proposal jobs, and the throttled dispatcher that
  // feeds them to taxonomyTree.silentPropose a few at a time.
  // ============================================================
  logic: {

  // REWRITTEN July 19 (Fable audit follow-up, confirmed by Alex): the
  // old version proposed ONE title-led 300-char blob per video - which
  // is exactly why YouTube-sourced leaves were video titles instead of
  // concepts, and why a video never got book-depth treatment despite
  // intel_reports ALREADY storing per-video key_learnings and
  // production_techniques arrays from the analysis. Now each stored
  // insight is proposed individually through the same unified scored
  // engine book insights use - same rules, same justification, same
  // confidence.
  //
  // A4/A8 VOLUME FIX (Aug 23 2026) - Alex's own ask: "no way a 20 minute
  // video only has 3 insights; I want them all." Two real, separate
  // causes were found behind that, both fixed here:
  //
  //   1. WRONG READ PATH (the dominant one). This loop read
  //      `r.insights.key_learnings`, but the producer nests that array
  //      inside `encyclopedia_entry` - `production_techniques` is the
  //      only top-level one. Verified against the live table: 0 of 37
  //      rows have a top-level `key_learnings`, 37 of 37 have it nested.
  //      So every key learning ever extracted (a flat 5.00 per video)
  //      was silently discarded before proposal, and only production
  //      techniques (~3.16/video) ever reached the tree - ~61% of the
  //      real analysed content dropped on the floor. Both shapes are now
  //      read, deduplicated by normalized text so a row carrying both
  //      can't spend two Oracle calls on one identical insight.
  //   2. ARBITRARY TRUNCATION. `MAX_PER_VIDEO = 3` then sliced whatever
  //      survived down to 3. Live data averages 8.16 substantial items
  //      per video (max 12), so this clipped most of what was left.
  //
  // Caps still keep one sync bounded - each proposal is one real scored
  // ground-worker call (decidePlacementScored), so this is genuinely
  // premium spend, not free (rule 11). Retuned rather than removed:
  // MAX_PER_VIDEO 15 sits above the observed max of 12, so it is
  // effectively "all of them" for real data while still capping a
  // runaway if the upstream extraction prompt is ever deepened.
  // MAX_VIDEOS drops 5 -> 4 to trade videos-per-scan for per-video
  // completeness (which is what was actually asked for) - nothing is
  // lost, since the dedup guard means an unscanned video is simply
  // picked up by the next sync. MAX_TOTAL 45 covers 4 full videos at
  // the realistic worst case. Dispatch is throttled to CONCURRENCY at a
  // time instead of firing the whole batch at once, so a bigger cap
  // can't turn into a 45-wide simultaneous burst against the API.
  _scan: function(all) {
    if (!RPGACE.utils._quickPhylaScan || !RPGACE.modules.taxonomyTree) return;
    // LL-3: while the tree is paused, don't consume the dedup guard either -
    // a video synced during the pause is still picked up once it resumes.
    if (RPGACE.modules.taxonomyTree.logic.isPaused()) { RPGACE.modules.taxonomyTree.logic.checkPaused(); return; }
    var self = RPGACE.modules.ciAutoPropose;
    var guard = localStorage.getItem('rpgace_ci_proposed') || '';
    var checked = 0;
    var MAX_VIDEOS = 4, MAX_PER_VIDEO = 15, MAX_TOTAL = 45, CONCURRENCY = 3;
    var jobs = [];

    all.forEach(function(r) {
      if (checked >= MAX_VIDEOS || jobs.length >= MAX_TOTAL) return;
      var key = r.url || r.title;
      if (!key || guard.indexOf('|' + key + '|') !== -1) return;
      checked++;
      guard += '|' + key + '|';

      var enc = (r.insights && r.insights.encyclopedia_entry) || null;

      // Per-insight loop: the real analysed content, never the title.
      // Both the nested (real, live) and top-level (defensive, in case a
      // future/other producer writes that shape) key_learnings paths are
      // read, then deduplicated so one insight never costs two calls.
      var seen = {};
      var insightTexts = []
        .concat((enc && enc.key_learnings) || [])
        .concat((r.insights && r.insights.key_learnings) || [])
        .concat((r.insights && r.insights.production_techniques) || [])
        .map(function(t) { return String(t || '').trim(); })
        .filter(function(t) {
          if (t.length < 40) return false; // substantial only
          var k = t.toLowerCase();
          if (seen[k]) return false;
          seen[k] = 1;
          return true;
        });

      if (insightTexts.length) {
        insightTexts.slice(0, MAX_PER_VIDEO).forEach(function(insightText) {
          if (jobs.length >= MAX_TOTAL) return;
          var m = RPGACE.utils._quickPhylaScan(insightText);
          if (!m.length) return;
          jobs.push({ text: insightText.slice(0, 400), phylum: m[0].num, url: r.url || null });
        });
        return;
      }

      // Fallback for older reports with no stored insight arrays: the
      // old blob behavior, minus the title/creator (the audit-confirmed
      // source of title-shaped placements) - summary text only.
      var blob = [enc && enc.summary].filter(Boolean).join(' ');
      if (blob.length < 60) return;
      var matches = RPGACE.utils._quickPhylaScan(blob);
      if (matches.length === 0) return;
      jobs.push({ text: blob.slice(0, 400), phylum: matches[0].num, url: r.url || null });
    });

    // Real bug fix (found + fixed in review, G53 batch 9): unguarded,
    // unlike videoSummary's own write to this SAME shared key (its
    // retro/_delete path already wraps this exact call in try/catch) -
    // a quota exception here would throw uncaught inside _scan. Matched
    // to the sibling writer's convention.
    try { localStorage.setItem('rpgace_ci_proposed', guard); } catch (e) {}
    if (!jobs.length) return;
    self._dispatch(jobs, CONCURRENCY);
    RPGACE.utils.toast('🌳 ' + jobs.length + ' taxonomy proposal' + (jobs.length > 1 ? 's' : '') + ' queued for review', 'rgba(155,89,182,0.85)', 3000);
  },

  // Throttled dispatch - CONCURRENCY workers pulling from one shared
  // list, each awaiting its own call before taking the next. Same
  // fire-and-forget/never-block contract and same per-item .catch() as
  // before; only the arrival rate changed.
  _dispatch: function(jobs, concurrency) {
    var i = 0;
    function next() {
      if (i >= jobs.length) return Promise.resolve();
      var job = jobs[i++];
      return RPGACE.modules.taxonomyTree
        .silentPropose(job.text, job.phylum, 'content_intelligence', job.url)
        .catch(function(err) { console.warn('[ciAutoPropose] silentPropose failed:', err.message); })
        .then(next);
    }
    for (var w = 0; w < Math.min(concurrency, jobs.length); w++) next();
  },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. No external caller invokes any METHOD of this module (verified
  // by a fresh grep of rpgace_core.js and index.html both — zero hits
  // for `RPGACE.modules.ciAutoPropose` anywhere outside this module's
  // own body), so these exist for convention and for its OWN internal
  // calls: `init`'s `window.syncIntelData` wrapper calls
  // `self._scan(all || [])`, and `logic._scan` calls
  // `self._dispatch(jobs, CONCURRENCY)` — both of those `self`s are the
  // module, so each lands here first and is routed on to `logic`.
  //
  // Note for a future reader doing an external-touchpoint grep: this
  // module DOES make a real outbound cross-module call,
  // `RPGACE.modules.taxonomyTree.silentPropose(...)` in
  // `logic._dispatch`. That is a call OUT of this module and is
  // unaffected by this split; the "zero external touchpoints" fact
  // above is about calls INTO it.
  _scan: function(all) { return this.logic._scan(all); },
  _dispatch: function(jobs, concurrency) { return this.logic._dispatch(jobs, concurrency); },

});
/* ===END:ciAutoPropose=== */
