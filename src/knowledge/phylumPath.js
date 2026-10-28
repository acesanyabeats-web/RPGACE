
/* ===MODULE:phylumPath=== */
// "Phylum Path" - bottom-up insight-to-article pipeline. Distinct from
// taxonomyTree.proposeLineage/silentPropose (which places one topic into a
// path FROM a phylum DOWN to a leaf, in one shot). This instead starts from
// a granular teaching insight and builds UP: the insight anchors at the
// deepest rank it needs, attaching under existing structure where possible
// (real duplicate-detection lives in decidePlacementScored's own prompt +
// sanitizePlacement's dedup-extend branch below — taxonomyTree used to have
// a separate, parallel exact-name checker, _checkForMorph, but it was
// unreachable dead code and deleted Sep 25 2026, see taxonomyTree's
// _acceptLineage), and any rank along the way can get
// its own synthesized reference article in Encyclopedia (reuses
// saveOracleToEncyclopedia + taxonomy_node_id linking, same as F7's
// encTaxonomyLink).
//
// Piloted on Phylum 1 (Compositio), joined by Phylum 2 (Percussio) July 17
// once its keyword sweep + tree build were done - ENABLED_PHYLA is the
// list to extend as more phyla clear the Phylum Development Framework's
// steps 1-4. PHYLUM_NUM is now the UI's *currently active/selected*
// phylum (mutable via the phylum-switcher pills in both the side panel
// and the nav-tab page), not a hardcoded pilot constant - every function
// below already took phylumNumber as a parameter rather than hardcoding
// it, so generalizing was a UI change (a switcher + a wider enabled-list
// check), not a rewrite.
//
// Persona: extends Prod Oracle's existing "Master Learning" 3-layer method
// (simple terms -> technical mechanics -> expert nuance) with a "private
// tutor, PhD in this phylum" framing, grounded via
// RPGACE.utils.phylumContext() - reused prompt shape, not reinvented.
//
// Depth flexes per insight (as many or as few new ranks as genuinely
// needed, same philosophy as proposeLineage), decided by an explicit
// 5-perspective check embedded in the placement prompt (pedagogical
// clarity / non-redundancy / practical applicability / structural fit /
// expansion headroom) - the phylum-appropriate version of this project's
// Council of 5 convention, operationalized as a real prompt instruction
// instead of only a human planning ritual.
//
// Scoped per the questionnaire: new insights only (no retroactive repair
// of Phylum 1's pre-existing flat-parent_id nodes); manual button triggers
// article regeneration (no auto-regen); every rank gets its own article,
// including the phylum root itself.
RPGACE.register('phylumPath', {
  domain: 'knowledge',

  // G53 (Aug 2026) — real, ratified /CEO plan item, module 4 of 4 and the
  // LAST of the pilot (after videoPipeline, beatLog and bookworm): this
  // module is split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape those three
  // already shipped and verified. Pure internal-structure refactor — zero
  // functional, behavioural, UX, data or schema change; every function below
  // was MOVED wholesale, never rewritten or split down the middle.
  //
  // 40 real functions: `init` stays a literal top-level function (because
  // RPGACE.register() calls `module.init()` directly and cannot see into a
  // sub-object, and its own `self` genuinely IS the module — so its body is
  // byte-identical and still calls the top-level pass-throughs, exactly as
  // bookworm's own init does), 21 moved into `logic`, 18 into `ui`.
  //
  // Shared constants + transient state stay at module scope: PHYLUM_NUM (the
  // mutable currently-selected phylum), ENABLED_PHYLA, EXTRACTOR_MODEL,
  // MECHANICAL_MODEL, CONDENSE_THRESHOLD_CHARS, _focusNodeId,
  // _renderGeneration, plus the undeclared `_fallbackSweepInFlight` flag
  // _checkFallbackAnswers sets on itself at runtime.
  //
  // The one real risk this split has to get right, function by function: a
  // function moved into `ui`/`logic` is invoked with `this` bound to THAT
  // sub-object, not the module. Every moved function that used to open with
  // `var self = this;` now opens with `var self = RPGACE.modules.phylumPath;`,
  // and every cross-namespace call is explicitly qualified `self.ui.X` /
  // `self.logic.X` (module-scope properties stay bare: `self.PHYLUM_NUM`,
  // `self.ENABLED_PHYLA`, `self._focusNodeId`, `self._renderGeneration`,
  // `self._fallbackSweepInFlight`).
  //
  // Four of the five module-scope WRITES in this module are what made that
  // pinning load-bearing rather than cosmetic — verified by grep, not
  // asserted: `_switchPhylum` and `open` both assign `PHYLUM_NUM`, and
  // `_loadNodesAndRender` assigns both `_focusNodeId` and `_renderGeneration`.
  // All four are `ui` functions. Left as a bare `this.X =` / an unpinned
  // `self` they would have silently written onto the `ui` sub-object while
  // every reader kept reading the module's own copy — a state desync with no
  // thrown error anywhere, which `node --check` cannot catch. The fifth,
  // `_fallbackSweepInFlight` (a re-entrancy guard in `logic`), has the same
  // shape and is pinned the same way.
  //
  // 6 of the 39 moved functions never referenced `this`/`self` at all and are
  // byte-identical moves apart from the +2 re-indent (verified by de-indenting
  // each new body and diffing it against the original, not asserted):
  // _isCreditExhaustionError, _queueFallback, sanitizePlacement, _close,
  // _showPlacementConfirm, _showArticleConfirm. Three more had no `var self`
  // but did reach the module through a bare `this.` and so needed a pin
  // inserted rather than rewritten: _resolvePlacementDecision, _switchPhylum,
  // _jumpToNode (plus the two genuine one-liners, isEnabled and
  // decidePlacement, which use the fully-qualified
  // `RPGACE.modules.phylumPath....` form inline rather than growing a
  // three-line body for a single reference).
  //
  // Exactly ONE line-ORDER change was made anywhere in the module, and only
  // because the alternative was worse: `open`'s `var self = this;` used to sit
  // on the SECOND line, below a guard clause that already called `this._close()`.
  // The pin now sits on the first line so that guard can use it. Provably
  // behaviour-identical — `var` is hoisted, the assignment has no side effect,
  // and the guard never read `self`.
  //
  // Classification rule used (stated so a later reader can check it rather
  // than guess), the same one bookworm's split states: a function lives in
  // `ui` if it constructs or discovers LIVE PAGE DOM (document.*,
  // createElement/getElementById/querySelector, innerHTML on a page node);
  // otherwise in `logic`. Two real refinements were needed here and are named
  // rather than applied silently:
  //   • `_jumpToNode` is `ui` despite containing no DOM marker at all — its
  //     whole body is a live page-navigation call (_switchPhylum /
  //     _loadNodesAndRender). Same judgment, and the same precedent, as
  //     bookworm's own `_goToDashboard`.
  //   • `_placeInsight` and `_generateArticle` are `logic` despite each
  //     OPENING a confirm popup, because neither builds any DOM itself — each
  //     is a decide-then-confirm-then-write orchestrator that delegates the
  //     rendering to `self.ui._showPlacementConfirm` / `self.ui._showArticleConfirm`.
  //     Same shape and same precedent as bookworm's `_openBook` /
  //     `_openCurrentChapter`, which are `logic` and call `self.ui._render*`.
  //
  // NO function in this module is genuinely mixed in bookworm's sense (real
  // live-DOM construction AND a real persistent write in the same body) —
  // that is a checkable claim, and it was checked by grep rather than assumed:
  // zero of the 18 `ui` functions contain a `RPGACE.sb.secureWrite` call, and
  // zero of the 21 `logic` functions contain a `document.` reference. What
  // the `ui` side does contain is read-only `RPGACE.sb.select` in 4 functions
  // (_renderTree, _loadNodesAndRender, _articleSection, _renderFusionLinks) —
  // each fetching exactly the rows it is about to render, which is display
  // work, not business logic, so none of them was split.
  //
  // One cosmetic pre-existing oddity was preserved rather than tidied:
  // `_injectNavTab` declares a `self` it never uses (it is also confirmed dead
  // code — see CLAUDE.md). Its `var self = this;` was still repointed at the
  // module, because leaving it pointing at the `ui` sub-object would be a trap
  // for the next person to add a line to it.
  //
  // Two shared constants' doc comments moved with the CONSTANT rather than
  // with the function they also describe, since the two are adjacent in the
  // original source and the constant is what a reader looks up:
  // CONDENSE_THRESHOLD_CHARS carries the Headroom-pattern write-up for
  // `logic._condenseIfLarge`, and EXTRACTOR_MODEL carries the
  // extractor→ground-worker pipeline banner.

  // Currently active/selected phylum for the panel + nav-tab UI - mutable
  // at runtime via _switchPhylum(), defaults to Phylum 1 on first load.
  PHYLUM_NUM: 1,

  // Every phylum Phylum Path actually covers (placement, auto-detect,
  // nav-tab browsing, fusion-link search). Extend this list once a phylum
  // clears framework steps 1-4 (spec, keyword sweep, tree build, data
  // repair) - phyla 2-5 added July 17 individually, phyla 6-10
  // (Instrumentarium, Sensus Auris, Anatomia, Historia, Psychologia)
  // added the same day as one batch, pushed live together.
  // Engineer pass 2026-07-30: 11 (Lingua Musicae) + 14 (Visio Cinematica)
  // added, real content in place first (6 + 8 leaves respectively,
  // built from Alex's own real category lists), the keyword-collision
  // fix already applied, and Neural Frames -> OpenMontage swapped
  // through every real reference before enabling either phylum here.
  // Engineer pass 2026-08-11: the remaining 9 named phyla added in one
  // real pass, Alex's own explicit ask ("just use it," referring to the
  // GODMODE+Council-of-5 category-list content he'd already sent for
  // 12-21) — same real discipline as 11/14: real jargon-bucket leaves
  // built first (42 leaves across 12/13/15/16/17/18/19/20, "Covers:"
  // format matching the established convention), _PHYLA_KEYWORDS
  // enriched from his own category lists with his own overlap-analysis
  // collision warnings applied directly, a real automated cross-phylum
  // collision scan run and 2 genuine new collisions fixed ("hook" vs
  // Phylum 1, "genre evolution" vs Phylum 9 — Historia's own prior
  // claim, per Alex's own retrospective-vs-forward-looking distinction).
  // 21 (Miscellaneous Ordinanda) enabled with deliberately zero leaf
  // content and zero keywords, per Alex's own explicit design for it —
  // a real, honest "nothing here yet, catch-all only" state, not an
  // oversight. Fusion-link pass and hand-test both still real, tracked
  // gaps (same standing status 11/14 have already had since July 30).
  ENABLED_PHYLA: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],

  // ══════════════════════════════════════════════════════════════════
  // July 16: extractor -> ground-worker pipeline for all 3 of Phylum
  // Path's Oracle calls (decidePlacement, _generateInsightContent,
  // _generateArticle). A fast/cheap Fable 5 pass produces a structured
  // plan/outline first; the existing verified-working model (still
  // claude-sonnet-4-6, the ground worker) does the actual detailed
  // reasoning/writing, using that plan as a starting hint it can
  // expand or override, not a locked-in answer. If the extractor call
  // fails or times out, each caller falls back to the ground worker
  // alone with the original single-call prompt - the extractor is a
  // pure quality/framing addition, never a hard dependency.
  // ══════════════════════════════════════════════════════════════════
  EXTRACTOR_MODEL: 'claude-fable-5',

  // Third model tier, added July 19 with Alex's explicit confirmation
  // (token-cost retune): purely MECHANICAL text jobs - whitespace/
  // formatting cleanup, one-line rewording - go to Haiku at ~1/4 the
  // ground worker's price. Judgment work (placement, scoring, teaching,
  // fusion) stays on the ground worker; outlining stays on the extractor.
  // CLAUDE.md's model section documents all three.
  MECHANICAL_MODEL: 'claude-haiku-4-5-20251001',

  // Real Headroom-pattern helper (Aug 11 2026) — Alex asked where token
  // compression would help without hurting output quality; real answer
  // given directly, prompt caching built first (zero quality risk, see
  // api/_context.js's cacheableSystem). This is the second, genuinely
  // different case: large VARIABLE content (a full video transcript, a
  // full book chapter) that changes every call, so caching structurally
  // cannot help it — the real fit for Headroom's own actual mechanic
  // (compress before it reaches the judgment-making call).
  //
  // Real, deliberately conservative design, not a blind "summarize
  // everything" pass: only fires above a real, generous length
  // threshold (short/typical content is NEVER touched - zero risk to
  // the common case); uses the cheap MECHANICAL_MODEL tier (Haiku) for a
  // narrowly-scoped task - strip genuine filler (intros, sponsor reads,
  // repeated phrasing), never summarize or drop a specific technique,
  // quote, plugin name, or attribution - a materially SAFER task for a
  // cheap model than "produce a good summary," since it only has to
  // recognize filler, not decide what matters; and fails OPEN on any
  // error (bad JSON, empty result, a thrown fetch) by returning the
  // ORIGINAL untouched text - a failed compression attempt must never
  // silently shrink or corrupt what the real ground-worker judgment call
  // actually sees.
  //
  // Real, live call site since Aug 11 — bookworm._analyzeChapter (logic
  // block, see rpgace_core.js's bookworm module) calls this before its own
  // 12000-char safety cap, so the cap holds condensed substantive content
  // instead of losing whatever came after the first page of filler. This
  // comment used to claim "NOT wired into any live call site yet" — stale
  // since that same Aug 11 pass; corrected here Sep 2 (found + fixed during
  // the G53 phylumPath split's own review, an unrelated pass — this is a
  // pure comment fix, zero behavior change, per rule 8/achiever discipline
  // for a stale CLAIM rather than broken code).
  CONDENSE_THRESHOLD_CHARS: 6000,

  // Sep 25 2026 — real /CEO Phase 1 item, curriculum-restructure spec
  // (records/2026-09/taxonomy_curriculum_jargon_encyclopedia_merge_spec_
  // 2026-09-25.txt). Raised from the original hard cap of 6 (Variant) —
  // real /commit-archaeologist evidence found that cap was never
  // arbitrary: taxonomy_placement_rules.txt's own R2 ("DEPTH NEVER
  // EXCEEDS 6") was written after a real depth-14 corruption chain
  // (commit 42ca91e), so this is a deliberate NEW fixed ceiling, not a
  // removal of the guard — sanitizePlacement below still hard-trims
  // anything past it, same mechanism, just roomier, giving real
  // curriculum-breakdown depth (Order->Class->Family->Genus->Species->
  // ...->one jargon term) more room before hitting a wall. RANK_NAMES
  // stays a 7-entry cosmetic display list (confirmed via commit
  // d992888 — borrowed from taxonomy_map.html, never a structural
  // constraint); rankNameForDepth already falls back to 'Rank '+depth
  // past index 6, so no new rank names are needed for this to work.
  MAX_TREE_DEPTH: 10,

  _focusNodeId: null, // null = phylum root

  _renderGeneration: 0,

  init: function() {
    var self = this;
    // Found + fixed July 16: init() only ever runs because 'rpgace:ready'
    // already fired - RPGACE.register() wires every module's init() to
    // that same event (rpgace_core.js ~line 415). Re-subscribing to
    // 'rpgace:ready' from INSIDE init() (as this used to do, twice) is a
    // latent reliability bug: RPGACE.hooks.fire() iterates listeners via
    // a plain Array.forEach, which never revisits entries pushed onto the
    // array after iteration starts - so a listener registered here could
    // silently never fire on the very pass currently invoking init().
    // Confirmed via direct testing: manually re-firing 'rpgace:ready' a
    // second time made both this button and the new nav tab (below)
    // appear instantly, which is what exposed this. Calling directly
    // instead, since 'rpgace:ready' has unambiguously already happened by
    // the time this code runs. Same pattern found in ~25 other places in
    // this file - flagged in the plan doc, not fixed everywhere this pass.
    setTimeout(function() { self._injectButton(); }, 1500);
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) setTimeout(function() { self._injectButton(); }, 600);
      if (name === RPGACE.CONFIG.pages.phylumPath) self._loadNodesAndRender(self._focusNodeId);
      self._checkFallbackAnswers();
    });
    // Claude-fallback build (July 24): a cheap periodic check for any
    // fallback_queue row an external Routine has already answered while
    // this tab was open - a single SELECT every 5 minutes, never a busy
    // poll. Also runs once shortly after boot and on every page:show
    // above so a session that's been open a while doesn't wait a full
    // 5 minutes to notice.
    setTimeout(function() { self._checkFallbackAnswers(); }, 4000);
    setInterval(function() { self._checkFallbackAnswers(); }, 5 * 60 * 1000);
    // Subscribes to the shared oracle:response-scanned hook instead of
    // installing a second MutationObserver on #send-btn - the original
    // version of this module did exactly that (duplicate observer +
    // duplicate chat-DOM query on every single Oracle response, forever),
    // found and fixed same-session. RPGACE.utils._runPhylaScan already
    // computes `matches` for all 21 phyla on every response; this just
    // reads phylum 1's score back out of that instead of re-scoring.
    RPGACE.hooks.on('oracle:response-scanned', function(text, lastMsg, matches) {
      self._checkLastResponse(text, lastMsg, matches);
    });
    self._patchTextSelect();
    // Phase 2 (July 15): dedicated nav tab + full drill-down page.
    // July 20: _injectNavTab() call removed — the old top nav-tabs bar is
    // gone; the leftNav drawer owns Phylum Path's nav entry now. The page
    // shell injection stays (unrelated, still required).
    setTimeout(function() { self._injectPageShell(); }, 1500);
  },

  // ============================================================
  // logic — business logic/data: Oracle calls, placement decisions,
  // Supabase reads/writes. No live-page DOM construction or lookup.
  // Kept in the same relative order as before the split.
  // ============================================================
  logic: {

    // July 15: "old feeds new" unification - taxonomyTree.proposeLineage()/
    // silentPropose() check this before running their own flat top-down
    // path-generation, and delegate to decidePlacement()/_insertNewSteps()
    // below instead when the target phylum is enabled here.
    isEnabled: function(phylumNumber) { return RPGACE.modules.phylumPath.ENABLED_PHYLA.indexOf(phylumNumber) !== -1; },

    // July 24 — Claude Code fallback lane (judged same session, built after
    // Alex's explicit go-ahead: table created, scope confirmed). Real
    // pre-existing bug fixed here at the same time: none of these 3 shared
    // functions ever checked `data.error` before this - api/oracle.js
    // returns a real HTTP 500 with {error: message} on any Anthropic
    // failure, but `data.content` on that shape is undefined, so
    // _callGroundWorkerText used to silently resolve to an EMPTY STRING
    // (never a rejected promise) and the JSON variants threw an opaque
    // "No JSON found" - the real error text (e.g. a credit-exhaustion
    // message) never reached any caller. Fixed by checking `data.error`
    // first, always, in all 3.
    //
    // `context` is a new, OPTIONAL 4th/3rd param passed only by callers
    // that can actually make use of a later fallback answer (Bookworm's
    // chapter cascade, Content Intelligence's silent proposal path) -
    // deliberately NOT populated for callers with nothing resumable to
    // hand back to (e.g. a live Oracle chat message), so the queue only
    // ever holds real, actionable rows instead of untraceable noise.
    _isCreditExhaustionError: function(msg) {
      if (!msg) return false;
      var m = String(msg).toLowerCase();
      return m.indexOf('credit balance') !== -1 || m.indexOf('insufficient credit') !== -1;
    },

    _queueFallback: function(prompt, tier, maxTokens, model, context) {
      if (!context) return;
      RPGACE.sb.secureWrite('oracle_fallback_queue', 'insert', [{
        prompt: prompt, tier: tier, max_tokens: maxTokens, model: model || null,
        status: 'pending', context: context
      }]).then(function() {
        RPGACE.utils.toast('🔌 API credits low — queued for Claude Code fallback (checked automatically)', 'rgba(201,168,76,0.85)', 4000);
      }).catch(function(e) { console.warn('[phylumPath] fallback enqueue failed:', e.message); });
    },

    _callExtractor: function(prompt, maxTokens, context) {
      var self = RPGACE.modules.phylumPath;
      return fetch('/api/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          system: 'You return only valid JSON, no markdown formatting, no explanation text.',
          max_tokens: maxTokens,
          model: self.EXTRACTOR_MODEL,
        })
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (data && data.error) {
          var err = new Error(data.error);
          if (context && self.logic._isCreditExhaustionError(data.error)) {
            err.fallbackQueued = true;
            self.logic._queueFallback(prompt, 'extractor', maxTokens, self.EXTRACTOR_MODEL, context);
          }
          throw err;
        }
        var raw = (data.content || []).map(function(c) { return c.text || ''; }).join('');
        var cleaned = raw.replace(/```json|```/g, '').trim();
        var match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON found in extractor response');
        return JSON.parse(match[0]);
      });
    },

    // Ground worker calls omit `model` entirely - api/oracle.js defaults to
    // the existing verified-working MODEL constant when none is given. The
    // optional `model` param (July 19) lets mechanical callers pass
    // MECHANICAL_MODEL; api/oracle.js forwards it as-is.
    _callGroundWorkerJSON: function(prompt, maxTokens, model, context) {
      var self = RPGACE.modules.phylumPath;
      return fetch('/api/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          system: 'You return only valid JSON, no markdown formatting, no explanation text.',
          max_tokens: maxTokens,
          model: model || undefined,
        })
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (data && data.error) {
          var err = new Error(data.error);
          if (context && self.logic._isCreditExhaustionError(data.error)) {
            err.fallbackQueued = true;
            self.logic._queueFallback(prompt, 'ground_worker_json', maxTokens, model, context);
          }
          throw err;
        }
        var raw = (data.content || []).map(function(c) { return c.text || ''; }).join('');
        var cleaned = raw.replace(/```json|```/g, '').trim();
        var match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON found in Oracle response');
        return JSON.parse(match[0]);
      });
    },

    _callGroundWorkerText: function(prompt, maxTokens, model, context) {
      var self = RPGACE.modules.phylumPath;
      return fetch('/api/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          model: model || undefined,
        })
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (data && data.error) {
          var err = new Error(data.error);
          if (context && self.logic._isCreditExhaustionError(data.error)) {
            err.fallbackQueued = true;
            self.logic._queueFallback(prompt, 'ground_worker_text', maxTokens, model, context);
          }
          throw err;
        }
        return (data.content || []).map(function(c) { return c.text || ''; }).join('');
      });
    },

    _condenseIfLarge: function(text, context) {
      var self = RPGACE.modules.phylumPath;
      text = text || '';
      if (text.length <= self.CONDENSE_THRESHOLD_CHARS) return Promise.resolve(text);
      var prompt = 'Strip ONLY genuine filler from the text below - intros, ' +
        'sponsor reads, repeated phrasing, off-topic tangents. Do NOT ' +
        'summarize, shorten, or paraphrase any specific technique, plugin ' +
        'name, quote, number, or creator/artist attribution - preserve ' +
        'every one of those exactly as written, in the original order. If ' +
        'you are not confident a passage is pure filler, keep it. Return ' +
        'ONLY the cleaned text, no preamble, no markdown fences.\n\n' + text;
      return self.logic._callGroundWorkerText(prompt, 2000, self.MECHANICAL_MODEL, context)
        .then(function(cleaned) {
          cleaned = (cleaned || '').trim();
          // Fails open on a genuinely broken result too, not just a thrown
          // error - an empty or suspiciously tiny result is worse than no
          // compression at all, never trusted over the real original text.
          if (!cleaned || cleaned.length < text.length * 0.3) return text;
          return cleaned;
        })
        .catch(function() { return text; });
    },

    // ── Fallback-answer sweep — called periodically while the app is open ──
    // Checks oracle_fallback_queue for rows an external Claude Code Remote
    // Routine has already answered, and dispatches each to whichever module
    // knows how to resume that TYPE of call. Deliberately conservative: a
    // row with no recognized context.type, or no context at all, is left
    // alone - answered-but-unresumed is a safe, inspectable state, never a
    // silent action on something this code doesn't understand.
    _checkFallbackAnswers: function() {
      var self = RPGACE.modules.phylumPath;
      if (self._fallbackSweepInFlight) return;
      self._fallbackSweepInFlight = true;
      RPGACE.sb.select('oracle_fallback_queue', 'status=eq.answered&resumed_at=is.null&order=created_at.asc&limit=10')
        .then(function(rows) {
          (rows || []).forEach(function(row) {
            var ctx = row.context || {};
            if (ctx.type === 'bookworm_chapter_insight' && RPGACE.modules.bookworm) {
              RPGACE.modules.bookworm._resumeFromFallback(row);
            } else if (ctx.type === 'silent_propose' && RPGACE.modules.taxonomyTree) {
              RPGACE.modules.taxonomyTree._resumeSilentProposeFromFallback(row);
            } else if (ctx.cc && RPGACE.modules.orchestratorCC && RPGACE.modules.orchestratorCC.logic.handles(ctx.type)) {
              // CC-2: chapters / weekly challenges / Wrapped answered by Orchestrator CC
              RPGACE.modules.orchestratorCC.logic.resumeRow(row);
            }
            // Any other/no context: left answered, unresumed - inspectable
            // manually, never acted on blind.
          });
        })
        .catch(function(e) { console.warn('[phylumPath] fallback sweep failed:', e.message); })
        .then(function() {
          // CC-2: Orchestrator CC jobs waiting past fallback_hours go to the API.
          var oc = RPGACE.modules.orchestratorCC;
          return oc ? oc.logic.sweepStale() : null;
        })
        .then(function() { self._fallbackSweepInFlight = false; });
    },

    // ── Decide (don't write) where a bottom-up insight belongs ──────────
    // Fetches existing structure, asks Oracle to decide an attach point +
    // however many new ranks are genuinely needed (the 5-perspective check
    // stands in for this project's Council of 5 convention here). Returns a
    // decision only - callers (the confirm popup below, or taxonomyTree's
    // proposeLineage/silentPropose once routed here) own what happens next.
    // Split out July 15 so the old top-down system can reuse this same
    // structure-aware decision instead of its own duplicate-blind one.
    // ══════════════════════════════════════════════════════════════════
    // UNIFIED PLACEMENT ENGINE — July 19, from the Fable tree audit.
    // Before this there were THREE different placement pipelines with
    // measurably different output quality (real evidence, queried from the
    // live tree): taxonomyTree's flat prompt (worst: video-title leaves,
    // pre-assumed fit, no score, no justification), this module's old
    // two-call decidePlacement (middle: 5 checks but no score, no stored
    // justification, extra extractor call = extra cost), and bookworm's
    // scored cascade (best-logged: 5 checks + numeric confidence +
    // justification + reword loop). Everything now routes here — the
    // best-logged version, generalized — one prompt, one call, one place
    // to fix. The audit's confirmed failure modes are addressed as
    // EXPLICIT RULES in the prompt below, each tied to a real observed
    // failure, plus mechanical guards in sanitizePlacement/_insertNewSteps
    // that hold even if a model regression slips past the wording.
    // priorLeaves: optional array of leaf names already created by the
    // same batch (e.g. earlier insights from the same book chapter) —
    // audit finding: without this, one chapter about inversions created
    // 5+ overlapping sibling leaves, each individually scored 9/10,
    // because every insight was placed blind to its siblings.
    decidePlacementScored: function(insightText, phylumNumber, priorLeaves, fallbackContext) {
      var self = RPGACE.modules.phylumPath;
      return RPGACE.sb.select('taxonomy_tree', 'phylum_number=eq.' + phylumNumber + '&order=path.asc').then(function(existing) {
        existing = existing || [];
        // TOKEN-COST RETUNE July 19: the structure listing used to print
        // every node's FULL slash-joined path - each line repeating its
        // entire ancestor chain (Compositio alone: ~10.6k chars ≈ ~2.9k
        // tokens PER CALL, and this is the most-called prompt in the app).
        // Now: an indented, NUMBERED name tree - same complete structural
        // information (order=path.asc keeps children under parents, indent
        // shows depth), ~65% fewer tokens. The model returns the NUMBER of
        // the attach node instead of copying a path string character-for-
        // character - cheaper AND more robust (no exact-string mismatch
        // failures). Path strings still accepted as a fallback for safety.
        var pathList = existing.length
          ? existing.map(function(n, i) {
              var indent = '';
              for (var d = 0; d < (n.depth || 0); d++) indent += ' ';
              return (i + 1) + '.' + indent + n.name + (n.node_type === 'leaf' ? ' *' : '');
            }).join('\n')
          : '(nothing mapped yet - this will be the first entry)';
        var priorBlock = (priorLeaves && priorLeaves.length)
          ? '\n\nLEAVES ALREADY CREATED BY THIS SAME BATCH/CHAPTER (in addition to the structure above):\n- ' + priorLeaves.join('\n- ') + '\n'
          : '';
        var prompt = RPGACE.prompt('tutor', { subject: RPGACE.utils.phylumContext(phylumNumber) }) + ' as a formal academic discipline.\n\n' +
          'An insight to place: "' + insightText + '"\n\n' +
          'EXISTING STRUCTURE in this phylum (numbered; indentation = depth under the phylum root; * marks a leaf):\n' + pathList + priorBlock + '\n\n' +
          'First decide honestly: does this insight genuinely belong in THIS phylum - not just loosely related? If it would sit more naturally in a DIFFERENT discipline, return fits:false rather than stretching a justification to make it fit here. A placement that needs a creative argument to defend is a wrong placement.\n\n' +
          'Then, using these 5 checks - pedagogical clarity, non-redundancy, practical applicability, structural fit, expansion headroom - decide where it attaches (the NUMBER of the existing node from the list above, or null for a new path from the phylum root), the new rank steps needed, one-sentence explainers per step, a one-sentence justification citing which check(s) drove the decision, and a self-scored confidence 1-10.\n\n' +
          'HARD RULES, each from a real corruption found in this tree:\n' +
          '1. NAMING: every step name is a general CONCEPT label - never a video/song/book title, never an artist name, never a year, never platform text like "| FL Studio Tutorial". If the insight text is itself a content title, name the leaf after the TECHNIQUE it teaches.\n' +
          '2. NO NEAR-DUPLICATE SIBLINGS: if an existing leaf (or a batch leaf listed above) already covers this concept or a facet of it, attach to/extend THAT area - do not create another sibling restating it. Several narrow facets of one concept belong as ONE leaf, not five.\n' +
          '3. STEPS ARE SINGLE RANKS: each newSteps entry is ONE new rank\'s own name - never a "/"-joined path, never a restatement of the attach path or any earlier step, never two ideas joined by "; then" or similar.\n' +
          '4. DEPTH: the rank chain starts Phylum(0)→Order→Class→Family→Genus→Species→Variant(6) and may continue past that - a placement may NEVER exceed depth ' + (self.MAX_TREE_DEPTH || 10) + '. Prefer 1-2 new steps for a single insight; more than 3 is almost always padding.\n\n' +
          'Return ONLY JSON: {"fits": true, "attachTo": 12, "newSteps": ["..."], "explainers": ["..."], "justification": "...", "confidenceScore": 8} (attachTo: node NUMBER or null)';
        return self.logic._callGroundWorkerJSON(prompt, 700, undefined, fallbackContext).then(function(parsed) {
          return self.logic._resolvePlacementDecision(parsed, phylumNumber, existing);
        });
      });
    },

    // ══════════════════════════════════════════════════════════════════
    // Sep 25 2026 — real Phase 4 build, curriculum-restructure spec
    // (records/2026-09/taxonomy_curriculum_jargon_encyclopedia_merge_
    // spec_2026-09-25.txt Section 13). The top-down counterpart to
    // decidePlacementScored above: that function reacts to ONE insight
    // at a time; this designs a whole real CURRICULUM breakdown for a
    // phylum in one call — "the next biggest separable chunks... like a
    // curriculum... until one jargon word is left," Alex's own words.
    // Reuses the same numbered-indented existing-structure list
    // decidePlacementScored already uses (rule 8, rule 11 token cost) so
    // Oracle designs AROUND real existing content instead of duplicating
    // it — real, checked need: Phylum 12's own 6 bucket-style leaves + 1
    // dangling branch chain (Section 10b) are exactly the kind of
    // pre-existing content a blind top-down pass would otherwise repeat.
    //
    // Returns a real tree: [{name, explainer, children: [...]}, ...],
    // the exact shape _showTreeConfirm/_insertTreeNodes already expect —
    // built for that popup from the start, not adapted after the fact.
    // A defensive recursive sanitizer runs on the parsed JSON before it
    // ever reaches the UI (rule 5 — never trust model JSON blindly):
    // drops any node with an empty/missing name, and hard-stops
    // recursion at MAX_TREE_DEPTH below the phylum root regardless of
    // how deep the model's own JSON claims to nest (the same "guard
    // holds even if the prompt is ignored" discipline sanitizePlacement
    // already established for the bottom-up path) — on top of, not
    // instead of, _insertTreeNodes' own real per-node depth check at
    // insert time.
    _generateCurriculumTree: function(phylumNumber) {
      var self = RPGACE.modules.phylumPath;
      var cap = self.MAX_TREE_DEPTH || 10;
      return RPGACE.sb.select('taxonomy_tree', 'phylum_number=eq.' + phylumNumber + '&order=path.asc').then(function(existing) {
        existing = existing || [];
        var pathList = existing.length
          ? existing.map(function(n, i) {
              var indent = '';
              for (var d = 0; d < (n.depth || 0); d++) indent += ' ';
              return (i + 1) + '.' + indent + n.name + (n.node_type === 'leaf' ? ' *' : '');
            }).join('\n')
          : '(nothing mapped yet - this is a genuinely fresh phylum)';

        var prompt = RPGACE.prompt('tutor', { subject: RPGACE.utils.phylumContext(phylumNumber) }) + ' as a formal academic discipline, designing a real curriculum syllabus for this whole subject.\n\n' +
          'EXISTING STRUCTURE already in this phylum (numbered; indentation = depth under the phylum root; * marks a leaf) - design AROUND this, never recreate or duplicate anything already listed here:\n' + pathList + '\n\n' +
          'TASK: design the real curriculum breakdown for this discipline, like a syllabus outline, not a flat list of trivia.\n\n' +
          'METHOD: divide the discipline into its biggest genuinely SEPARABLE chunks first (major branches of the subject). Divide each of those into its own next-biggest separable chunks, recursively - using REAL organizing axes where the subject actually has them (e.g. by genre, by era/time period, by technique family, by instrument) rather than inventing arbitrary categories. Keep dividing a branch until it cannot be split further without landing on ONE SPECIFIC, INDIVIDUAL jargon term or concept - that is a real leaf, the bottom of that branch. Not every branch needs to reach the same depth - a genuinely simple sub-area should bottom out sooner than a genuinely deep one.\n\n' +
          'HARD RULES:\n' +
          '1. NAMING: every node name is a general CONCEPT/CATEGORY label, never a video/song/book title, never an artist name, never platform text.\n' +
          '2. NO NEAR-DUPLICATE OF EXISTING CONTENT: if the existing structure above already covers a concept, do not recreate it - design around it instead.\n' +
          '3. A LEAF IS ONE JARGON TERM: a leaf\'s name is a single specific term/concept, not a bucket covering several unrelated terms at once.\n' +
          '4. DEPTH: this phylum currently sits at depth 0 (the root) unless the existing structure above already goes deeper - your new branches may go at most ' + cap + ' ranks below the phylum root. Prefer natural depth over padding every branch to the same level.\n' +
          '5. Give every node a one-sentence explainer/description of what it covers.\n\n' +
          'Return ONLY JSON: {"tree": [{"name": "...", "explainer": "...", "children": [{"name": "...", "explainer": "...", "children": []}]}]} - a real recursive array of root-level chunks. An empty or absent "children" array means that node is a real leaf.';

        return self.logic._callGroundWorkerJSON(prompt, 4000).then(function(parsed) {
          var tree = (parsed && parsed.tree) || [];
          var sanitize = function(nodes, depth) {
            if (!Array.isArray(nodes) || depth > cap) return [];
            var out = [];
            nodes.forEach(function(n) {
              var name = String((n && n.name) || '').trim();
              if (!name) return;
              out.push({
                name: name,
                explainer: String((n && n.explainer) || '').trim(),
                children: sanitize(n && n.children, depth + 1),
              });
            });
            return out;
          };
          return sanitize(tree, 1);
        });
      });
    },

    // Split out of decidePlacementScored above (July 24, Claude-fallback
    // build) so the exact same "turn a parsed JSON answer into a real
    // placement decision" logic can run either right after a live call
    // (above) or later, against an answer an external Claude Code Remote
    // Routine produced for a queued row (resumeFallbackPlacement below) -
    // one shared function per rule 8, not two copies that could drift.
    _resolvePlacementDecision: function(parsed, phylumNumber, existing) {
      var self = RPGACE.modules.phylumPath;
      var attachNode = null;
      if (parsed.attachTo !== null && parsed.attachTo !== undefined && parsed.attachTo !== '') {
        var idx = parseInt(parsed.attachTo, 10);
        if (!isNaN(idx) && idx >= 1 && idx <= existing.length) {
          attachNode = existing[idx - 1];
        } else if (typeof parsed.attachTo === 'string') {
          // Fallback: a model that answers with a path or bare name
          // string instead of the number still resolves.
          attachNode = existing.find(function(n) { return n.path === parsed.attachTo || n.name === parsed.attachTo; }) || null;
        }
      }
      var sanitized = self.logic.sanitizePlacement(
        attachNode ? attachNode.path : '',
        attachNode ? attachNode.depth : 0,
        parsed.newSteps || []
      );
      return {
        fits: !!parsed.fits, phylumNumber: phylumNumber, attachNode: attachNode,
        attachPath: attachNode ? attachNode.path : null,
        newSteps: sanitized.steps,
        explainers: parsed.explainers || [],
        justification: parsed.justification || '', confidenceScore: parsed.confidenceScore || 0
      };
    },

    // Given a fallback queue row's raw `answer` text (produced by a
    // Claude Code Remote Routine re-sending the exact same stored prompt,
    // never the app's own exhausted key) and the phylumNumber it was
    // scoped to, re-fetches the CURRENT tree (it may have changed since
    // the row was queued) and resolves the same decision shape the live
    // path would have produced. Used by both bookworm._resumeFromFallback
    // and taxonomyTree._resumeSilentProposeFromFallback.
    resumeFallbackPlacement: function(rawAnswerText, phylumNumber) {
      var self = RPGACE.modules.phylumPath;
      var parsed;
      try {
        var cleaned = String(rawAnswerText || '').replace(/```json|```/g, '').trim();
        var match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON found in fallback answer');
        parsed = JSON.parse(match[0]);
      } catch (e) {
        return Promise.reject(e);
      }
      return RPGACE.sb.select('taxonomy_tree', 'phylum_number=eq.' + phylumNumber + '&order=path.asc').then(function(existing) {
        return self.logic._resolvePlacementDecision(parsed, phylumNumber, existing || []);
      });
    },

    // Mechanical guard for placement steps - holds even when a prompt
    // regression (or a raw human paste in an Edit box, the actual cause of
    // the depth-14 corruption found July 19) slips garbage past the model
    // rules. Splits path-like steps, drops steps that restate any rank
    // already in the attach path or an earlier step, and hard-caps the
    // final depth at MAX_TREE_DEPTH - on overflow it keeps the LAST step
    // (the actual content leaf) plus as many leading intermediates as
    // fit, because losing an intermediate grouping is recoverable while
    // losing the leaf loses the insight itself.
    sanitizePlacement: function(attachPath, attachDepth, newSteps) {
      var self = RPGACE.modules.phylumPath;
      var cleaned = [];
      var notes = [];
      var soFarLower = (attachPath || '').split('/').map(function(s) { return s.trim().toLowerCase(); }).filter(Boolean);
      (newSteps || []).forEach(function(step) {
        if (!step) return;
        var parts = String(step).split('/').map(function(s) { return s.trim(); }).filter(Boolean);
        if (parts.length > 1) notes.push('split path-like step "' + String(step).slice(0, 60) + '"');
        parts.forEach(function(candidate) {
          if (soFarLower.indexOf(candidate.toLowerCase()) !== -1) {
            notes.push('dropped duplicate rank "' + candidate.slice(0, 60) + '"');
            return;
          }
          cleaned.push(candidate);
          soFarLower.push(candidate.toLowerCase());
        });
      });
      var cap = self.MAX_TREE_DEPTH || 10;
      var maxNew = cap - (attachDepth || 0);
      if (maxNew < 1) maxNew = 1;
      if (cleaned.length > maxNew) {
        var leaf = cleaned[cleaned.length - 1];
        cleaned = cleaned.slice(0, maxNew - 1).concat([leaf]);
        notes.push('trimmed to depth cap ' + cap + ' (kept leaf)');
      }
      return { steps: cleaned, notes: notes };
    },

    // Back-compat wrapper - callers that only need {attachNode, newSteps,
    // explainers} (the confirm-popup flow, proposeLineage delegation) get
    // the same shape as before, now with the scored engine's justification
    // and confidence riding along for free. The old two-call extractor+
    // worker body is deleted, not kept - one call is cheaper and the
    // scored prompt is strictly more rigorous.
    decidePlacement: function(insightText, phylumNumber, fallbackContext) {
      return RPGACE.modules.phylumPath.logic.decidePlacementScored(insightText, phylumNumber, null, fallbackContext);
    },

    // ── Manual-panel entry point: decide, confirm, then insert ──────────
    _placeInsight: function(insightText, phylumNumber) {
      var self = RPGACE.modules.phylumPath;
      RPGACE.utils.toast('🧬 Deciding placement...', '#4CAF82', 2500);

      return self.logic.decidePlacement(insightText, phylumNumber).then(function(decision) {
        return new Promise(function(resolve, reject) {
          self.ui._showPlacementConfirm(phylumNumber, decision.attachNode, decision.newSteps, decision.explainers, insightText,
            function(finalSteps, finalExplainers) {
              // W5: the manual Phylum Path panel has no explicit source label
              // in its own scope — 'oracle' is the honest identity here (the
              // placement decision came from an Oracle-scored engine run this
              // panel triggered), not a guessed worm name.
              self.logic._insertNewSteps(phylumNumber, decision.attachNode, finalSteps, finalExplainers, insightText,
                { source: 'oracle', title: (insightText || '').slice(0, 80) })
                .then(function() { resolve({ inserted: true }); })
                .catch(reject);
            },
            function() { resolve({ inserted: false }); }
          );
        });
      });
    },

    // Chained insert, same pattern as taxonomyTree._acceptLineage (needs the
    // real inserted id back each time to chain parent_id correctly, since
    // RPGACE.sb.insert() defaults to Prefer:return=minimal).
    // Aug 11 2026 — real gap found and fixed, per Alex's own explicit
    // design: "keep the new leaf sprigging... as long as /deduplication
    // runs so no 2 same insights are ever created, always one with that
    // insight having only one, most applicable and logical phylum path."
    // decidePlacementScored's own prompt already has this rule (Hard Rule
    // 2: "NO NEAR-DUPLICATE SIBLINGS... attach to/extend THAT area") —
    // but the code here directly contradicted it: when the ground worker
    // correctly decided an insight belongs on an ALREADY-EXISTING leaf
    // with zero new steps needed (the exact "extend, don't duplicate"
    // case Hard Rule 2 describes), this function rejected outright
    // instead of extending. Real fix: if attachNode is an existing LEAF
    // and there's nothing new to insert, honor "extend" literally —
    // refresh that one leaf's own article with the new insight folded
    // in (_generateInsightContent, the same real 3-layer generator every
    // other leaf already uses), never reject. A genuinely new insight
    // still sprouts its own new leaf exactly as before — this only
    // closes the real duplicate-prevention path the prompt already
    // promised but the code never delivered.
    // Aug 22 2026 — W5 of the "Worm Family & Encyclopedia Wrapper" /CEO
    // plan (Phase 1). New OPTIONAL 6th parameter `sourceMeta`, default
    // null: {source:'bookworm'|'videoworm'|'oracle'|<string>, title:'...'}.
    // This function is the ONE real choke point every "insight accepted
    // into the taxonomy tree" moment converges on, from every source
    // (Bookworm, Content Intelligence via the review queue, Oracle chat,
    // the Phylum Path panel) — confirmed by direct grep, 6 real call
    // sites — so it is the single correct place to hang the new
    // Encyclopedia companion-entry write, exactly like the July 22
    // taxonomy_decision_log audit row already hanging here. Every caller
    // that does NOT pass sourceMeta behaves byte-identically to before.
    //
    // Aug 23 2026 — A6 (Massive Expansion): `sourceMeta` gained an OPTIONAL
    // `bibliographyId` field — the real UUID of a `bibliography` row (either
    // a saved link or a completed book, per Alex's own confirmed "both"
    // answer) this specific insight was analysed FROM. When present, this
    // reuses the bibliography table's own already-existing
    // `phyla_touched`/`total_insights_placed` columns (the same ones
    // bookworm._markBookComplete already populates in bulk at book-completion
    // time) to record the real, incremental bidirectional link A6 asks for
    // ("each insight... is tied back to its source bibliography link") —
    // no new schema, no new table. Genuinely dormant today: no current real
    // caller has a bibliography.id to pass (A7's OBS-raw scripting phase is
    // the confirmed real future trigger; built now per Alex's own "build the
    // structure now, dormant" answer, same pattern as A10's Kimi/Luna
    // routing). Deliberately NOT wired into the dedup-extend early-return
    // branch above this function's own newSteps.length guard — that branch
    // already has a real, separately-flagged companion-entry gap (see the
    // Worm Family Aug 22 record), left alone here rather than folded into
    // an unrelated fix.
    _insertNewSteps: function(phylumNumber, attachNode, newSteps, explainers, insightText, sourceMeta) {
      var self = RPGACE.modules.phylumPath;
      if (!newSteps.length) {
        if (attachNode && attachNode.node_type === 'leaf') {
          RPGACE.utils.toast('♻️ Deduplicated — extending existing leaf: ' + attachNode.name, '#4CAF82', 4000);
          RPGACE.sb.secureWrite('taxonomy_decision_log', 'insert', {
            phylum_number: phylumNumber,
            node_id: attachNode.id,
            path: attachNode.path,
            insight_text: (insightText || '').slice(0, 2000),
            source: 'phylum_path_dedup_extend',
          }).catch(function() {});
          // Sep 25 2026 — real Phase 1b fix, curriculum-restructure spec
          // (records/2026-09/taxonomy_curriculum_jargon_encyclopedia_
          // merge_spec_2026-09-25.txt). Real gap found: this branch never
          // passed sourceMeta, so a SECOND (or third...) insight landing
          // on an already-existing jargon leaf never created its own
          // linked Encyclopedia row — only the "new leaf" branch below
          // did. That's the exact mechanism the whole "insights are a
          // real collection tied to a jargon leaf" idea depends on, so a
          // dedup-extended leaf needs the SAME companion-entry write the
          // new-leaf path already has, not a lesser version of it. Same
          // shape as the new-leaf block below (rule 8, not a second
          // pattern) — fire-and-forget, never blocks the real content
          // regeneration this branch already does.
          if (sourceMeta && sourceMeta.source) {
            RPGACE.sb.secureWrite('encyclopedia', 'insert', {
              title: sourceMeta.title || (insightText || '').slice(0, 80),
              content: insightText || '',
              source: sourceMeta.source,
              taxonomy_node_id: attachNode.id,
            }).catch(function() {});
          }
          return self.logic._generateInsightContent(attachNode, phylumNumber, insightText);
        }
        return Promise.reject(new Error('Oracle returned no new steps to place this insight'));
      }

      // Choke-point guard (July 19, from the Fable tree audit): EVERY
      // taxonomy write from every pipeline lands here, so sanitize here -
      // not only in the model-output path. The depth-14 corruption chain
      // ("...Chord Voicing & Inversion/Compositio/Harmony/...", 12 garbage
      // rows) got in through Bookworm's Edit box, which split raw human
      // input on "/" and passed it straight in - the model-side sanitizer
      // never saw it. A guard at the single write site can't be bypassed
      // by any current or future caller.
      var guarded = self.logic.sanitizePlacement(attachNode ? attachNode.path : '', attachNode ? attachNode.depth : 0, newSteps);
      if (guarded.notes.length) {
        console.warn('[phylumPath] sanitizePlacement corrected a placement at insert time:', guarded.notes.join('; '));
        RPGACE.utils.toast('⚠️ Placement auto-corrected: ' + guarded.notes.join('; '), '#E2A83D', 5000);
      }
      newSteps = guarded.steps;
      if (!newSteps.length) return Promise.reject(new Error('Placement rejected: every step duplicated an existing rank in the attach path'));

      var tt = RPGACE.modules.taxonomyTree;
      var phylumLatin = tt ? tt.PHYLUM_NAMES[phylumNumber] : ('Phylum ' + phylumNumber);
      var parentId = attachNode ? attachNode.id : null;
      var baseDepth = attachNode ? attachNode.depth : 0;
      var pathSoFar = attachNode ? attachNode.path : phylumLatin;
      var chain = Promise.resolve();
      var finalRow = null;

      newSteps.forEach(function(stepName, i) {
        chain = chain.then(function() {
          pathSoFar += '/' + stepName;
          var isLast = (i === newSteps.length - 1);
          var currentPath = pathSoFar;
          var currentParent = parentId;
          var currentDepth = baseDepth + i + 1;

          return RPGACE.sb.secureWrite('taxonomy_tree', 'insert', {
              parent_id: currentParent,
              depth: currentDepth,
              name: stepName,
              latin_name: null,
              phylum_number: phylumNumber,
              path: currentPath,
              node_type: isLast ? 'leaf' : 'branch',
              explainer: explainers[i] || '',
              sources: [{ type: 'phylum_path', id: null }],
            }).then(function(result) {
            var row = Array.isArray(result) ? result[0] : result;
            if (row && row.id) parentId = row.id;
            if (isLast) finalRow = row;
          });
        });
      });

      return chain.then(function() {
        RPGACE.utils.toast('✅ Placed: ' + pathSoFar, '#4CAF82', 4000);
        if (finalRow) {
          // July 22 — event-sourcing/audit-log idea from the book-batch
          // Aintergration pass (CLAUDE.md, Worked Precedent 4): every
          // taxonomy commit from every pipeline routes through this one
          // choke point, so this is the single place to log WHAT actually
          // got committed without touching any of the ~6 call sites above
          // it. Fire-and-forget, same as the fusion-link pass below - a
          // failed audit-log write must never block the real commit that
          // already succeeded.
          RPGACE.sb.secureWrite('taxonomy_decision_log', 'insert', {
            phylum_number: phylumNumber,
            node_id: finalRow.id || null,
            path: pathSoFar,
            insight_text: (insightText || '').slice(0, 2000),
            source: 'phylum_path',
          }).catch(function() {});
          // Aug 22 2026 — W5: the Encyclopedia companion entry. Alex's own
          // words: "all sources get entries of quotes and context that
          // explain a chosen insight" — a CHOSEN insight, i.e. one the
          // real human-gated taxonomy decision above has already committed,
          // never a second placement decision of its own. Content is a
          // DIRECT EXCERPT of insightText (his own confirmed answer, Q10) —
          // no new Oracle call, zero added token cost as volume ramps
          // (rule 11). Reuses the EXISTING encyclopedia.source and
          // encyclopedia.taxonomy_node_id columns (rule 8 — F7's own
          // Encyclopedia->Taxonomy back-reference already uses the latter;
          // this is the same real relationship in the other direction, not
          // a second column). Fire-and-forget with the same idiom as the
          // audit row above: this is a parallel, always-deletable browsing
          // layer, so a failed write must never block or fail the real
          // taxonomy_tree commit that has already succeeded.
          if (sourceMeta && sourceMeta.source) {
            RPGACE.sb.secureWrite('encyclopedia', 'insert', {
              title: sourceMeta.title || (insightText || '').slice(0, 80),
              content: insightText || '',
              source: sourceMeta.source,
              taxonomy_node_id: finalRow.id || null,
            }).catch(function() {});
          }
          // A6 (Massive Expansion), Aug 23 2026 — the real bibliography
          // back-link. Read-then-write, not an atomic increment: secureWrite's
          // 'update' does a plain PATCH with whatever payload it's given, and
          // there's no server-side RPC for "append to this jsonb array /
          // increment this int" here. Accepted as a real, proportionate risk —
          // this fires for a single user's own reference tracking, dormant
          // until a real caller exists, not a high-concurrency path. A failed
          // read or write here must never affect the real taxonomy commit
          // above, which has already succeeded — fire-and-forget, same as the
          // Encyclopedia companion write and the fusion-link pass below.
          if (sourceMeta && sourceMeta.bibliographyId) {
            RPGACE.sb.select('bibliography', 'id=eq.' + sourceMeta.bibliographyId + '&select=phyla_touched,total_insights_placed')
              .then(function(rows) {
                var row = (rows && rows[0]) || null;
                if (!row) return;
                var touched = row.phyla_touched;
                if (typeof touched === 'string') { try { touched = JSON.parse(touched); } catch (e) { touched = null; } }
                if (!Array.isArray(touched)) touched = [];
                if (touched.indexOf(phylumNumber) === -1) touched = touched.concat([phylumNumber]);
                var placed = (typeof row.total_insights_placed === 'number' ? row.total_insights_placed : 0) + 1;
                return RPGACE.sb.secureWrite('bibliography', 'update',
                  { phyla_touched: touched, total_insights_placed: placed },
                  'id=eq.' + sourceMeta.bibliographyId);
              })
              .catch(function(e) { console.warn('[phylumPath] bibliography back-link update failed:', e.message); });
          }
          // Fire-and-forget - a missed fusion-link pass shouldn't block the
          // insight's own content generation, same pattern as F18's auto
          // Visual Treatment Doc trigger elsewhere in this file.
          self.logic._findFusionLinks(finalRow, phylumNumber);
          // Sep 25 2026 — content generation is now ALSO fire-and-forget
          // (was: awaited/returned) so this promise resolves with the real
          // inserted row instead of _generateInsightContent's own write
          // result. Safe: every one of the 3 existing real callers
          // (_placeInsight, taxonomyReviewQueue's _acceptPhylumPathProposal/
          // _editPhylumPathProposal) already ignores the resolved value —
          // confirmed by direct read, not assumed — so this only ADDS a real
          // capability (taxonomyTree._acceptLineage's own dedup pass needs
          // finalRow.id back for its Encyclopedia back-reference write).
          self.logic._generateInsightContent(finalRow, phylumNumber, insightText);
        }
        return finalRow;
      });
    },

    // ══════════════════════════════════════════════════════════════════
    // Sep 25 2026 — real P1 build, curriculum-restructure spec (records/
    // 2026-09/taxonomy_curriculum_jargon_encyclopedia_merge_spec_2026-09-
    // 25.txt Section 9/11). _insertNewSteps above only ever commits ONE
    // linear chain (a single root-to-leaf path) — a real top-down
    // curriculum breakdown is a genuine TREE (one Order can have several
    // Classes, each with several jargon leaves), and calling
    // _insertNewSteps once per leaf path would re-insert every shared
    // ancestor as a separate duplicate row. This is the real, separate
    // tree-aware sibling that does NOT have that bug — it inserts each
    // node exactly once, threading the real inserted id to its children,
    // same "Prefer:return=representation, thread the real id" discipline
    // _insertNewSteps/_acceptLineage already use.
    //
    // treeNodes shape (an ARRAY of root nodes — a phylum can propose
    // several top-level Orders at once, not just one):
    //   [{ name, explainer, children: [ {name, explainer, children: [...]}, ... ] }, ...]
    // A node with an empty/missing `children` array is a real leaf — it
    // gets the SAME real leaf side-effects _insertNewSteps already gives
    // a new leaf (an Encyclopedia companion row when sourceMeta.source is
    // set, a real _findFusionLinks pass, real _generateInsightContent),
    // reusing those two functions directly rather than a second copy
    // (rule 8).
    //
    // Real, explicit non-goal, named rather than silently skipped: this
    // does NOT dedup-check against existing children the way
    // decidePlacementScored's bottom-up path does — a top-down curriculum
    // proposal is reviewed and editable by Alex in _showTreeConfirm
    // BEFORE this ever runs, so a human already had the chance to catch
    // a real duplicate; adding a second detector here would be
    // redundant, not safer.
    //
    // Real, explicit depth-cap handling: MAX_TREE_DEPTH is enforced per
    // node during the walk (not just at the leaf, since a tree can
    // overflow the cap at any branch) — a node past the cap, and
    // everything under it, is skipped and counted, never silently
    // dropped without a toast telling Alex how many were cut.
    _insertTreeNodes: function(phylumNumber, attachNode, treeNodes, sourceMeta) {
      var self = RPGACE.modules.phylumPath;
      var cap = self.MAX_TREE_DEPTH || 10;
      var baseDepth = attachNode ? attachNode.depth : 0;
      var tt = RPGACE.modules.taxonomyTree;
      var basePath = attachNode ? attachNode.path : (tt ? tt.PHYLUM_NAMES[phylumNumber] : ('Phylum ' + phylumNumber));
      var baseParentId = attachNode ? attachNode.id : null;
      var skipped = 0;
      var insertedCount = 0;

      function insertOne(node, parentId, parentPath, depth) {
        if (depth > cap) { skipped++; return Promise.resolve(); }
        // Defensive strip only, same spirit as sanitizePlacement's
        // path-like-step guard — Alex's own review pass in
        // _showTreeConfirm is the real gate here, this just stops a
        // stray "/" from silently corrupting the real path column.
        var name = String((node && node.name) || '').split('/')[0].trim();
        if (!name) return Promise.resolve();
        var path = parentPath + '/' + name;
        var children = (node.children || []).filter(function(c) { return c && String(c.name || '').trim(); });
        var isLeaf = !children.length;

        return RPGACE.sb.secureWrite('taxonomy_tree', 'insert', {
            parent_id: parentId, depth: depth, name: name, latin_name: null,
            phylum_number: phylumNumber, path: path,
            node_type: isLeaf ? 'leaf' : 'branch',
            explainer: node.explainer || '',
            sources: [{ type: 'phylum_path_tree', id: null }],
          }).then(function(result) {
          var row = Array.isArray(result) ? result[0] : result;
          if (!row || !row.id) return;
          insertedCount++;
          RPGACE.sb.secureWrite('taxonomy_decision_log', 'insert', {
            phylum_number: phylumNumber, node_id: row.id, path: path,
            insight_text: (node.explainer || '').slice(0, 2000),
            source: 'phylum_path_tree_commit',
          }).catch(function() {});

          if (isLeaf) {
            if (sourceMeta && sourceMeta.source) {
              RPGACE.sb.secureWrite('encyclopedia', 'insert', {
                title: sourceMeta.title || name,
                content: node.explainer || '',
                source: sourceMeta.source,
                taxonomy_node_id: row.id,
              }).catch(function() {});
            }
            // Fire-and-forget, same real pattern _insertNewSteps already
            // uses at its own leaf point — a missed fusion-link pass or a
            // slow content-gen call must never hold up the rest of the
            // tree commit still in flight.
            self.logic._findFusionLinks(row, phylumNumber);
            self.logic._generateInsightContent(row, phylumNumber, node.explainer || name);
            return;
          }

          var chain = Promise.resolve();
          children.forEach(function(child) {
            chain = chain.then(function() { return insertOne(child, row.id, path, depth + 1); });
          });
          return chain;
        }).catch(function(e) {
          console.warn('[phylumPath] tree node insert failed:', name, e.message);
        });
      }

      var rootChain = Promise.resolve();
      (treeNodes || []).forEach(function(node) {
        rootChain = rootChain.then(function() { return insertOne(node, baseParentId, basePath, baseDepth + 1); });
      });
      return rootChain.then(function() {
        if (skipped) RPGACE.utils.toast('⚠️ ' + skipped + ' node(s) skipped — past the depth-' + cap + ' cap', '#E2A83D', 5000);
        RPGACE.utils.toast('✅ Curriculum breakdown committed: ' + insertedCount + ' node(s)', '#4CAF82', 4000);
        return insertedCount;
      });
    },

    // ══════════════════════════════════════════════════════════════════
    // Sep 25 2026 — Step C2 of the jargon-encyclopedia anchor-table
    // restructure (records/2026-09/taxonomy_curriculum_jargon_
    // encyclopedia_merge_spec_2026-09-25.txt, Section 18): Alex's own
    // direct answer ("Archive so b, then we review archived to see
    // what fits, what needs changing and what needs removal") — a real
    // per-item review over the 260 archived leaf rows this session's
    // Step C created. Fetches only rows not yet worked through this
    // queue (status='archived', not yet flipped to 'archived_reviewed'
    // by _resolveArchivedLeaf below) for the phylum currently open.
    // ══════════════════════════════════════════════════════════════════
    _fetchArchivedLeafQueue: function(phylumNumber) {
      return RPGACE.sb.select('taxonomy_tree',
        'phylum_number=eq.' + phylumNumber +
        '&node_type=eq.leaf&status=eq.archived&order=path.asc&limit=500'
      ).then(function(rows) { return rows || []; });
    },

    // One real, human-gated decision per archived leaf — Alex's own
    // click IS the checkpoint rule 4 requires, so a 'keep'/'edit'
    // resolution writes straight to jargon_encyclopedia with
    // status='accepted' rather than sitting 'pending' behind a second
    // review (that pending gate is for Step D's fresh AI-generated
    // terms, a genuinely different, unreviewed-by-a-human source).
    // 'discard' writes nothing — the term is simply not carried
    // forward. Either way the source taxonomy_tree row is marked
    // 'archived_reviewed' (a new, additive status value — nothing else
    // in the codebase filters on it) so it never resurfaces in the
    // queue, win or lose.
    _resolveArchivedLeaf: function(row, action, editedTerm, editedExplainer) {
      var self = RPGACE.modules.phylumPath;
      var markReviewed = function() {
        return RPGACE.sb.secureWrite('taxonomy_tree', 'update',
          { status: 'archived_reviewed', updated_at: new Date().toISOString() },
          'id=eq.' + row.id
        ).catch(function() {});
      };
      if (action === 'discard') return markReviewed();
      var term = (editedTerm || row.name || '').trim();
      if (!term) return markReviewed();
      return RPGACE.sb.secureWrite('jargon_encyclopedia', 'insert', {
        term: term,
        phylum_number: row.phylum_number,
        explainer: (editedExplainer != null ? editedExplainer : (row.explainer || '')),
        deep_content: row.deep_content || {},
        status: 'accepted',
        source: [{ type: 'archived_leaf_review', archived_node_id: row.id, edited: !!(editedTerm || editedExplainer != null) }],
      }).then(function() { return markReviewed(); });
    },

    // ══════════════════════════════════════════════════════════════════
    // Sep 25 2026 — AI pre-triage for the archived-leaf review queue,
    // real follow-up per Alex's own ask ("build it out"). One batched
    // Oracle call per chunk of up to 25 archived leaves (never one call
    // per item — real token-cost discipline, rule 11) suggesting a
    // starting keep/edit/discard + one-line reason per leaf. NEVER
    // auto-applied — _showArchivedReviewQueue only shows it as a
    // labeled hint Alex can accept or override with his own click,
    // same "AI proposes, human confirms" shape as everywhere else.
    // Fails open to no suggestions (an empty map) on any error — a
    // missing pre-triage degrades to a fully manual queue, never blocks
    // real review from happening.
    // ══════════════════════════════════════════════════════════════════
    _pretriageArchivedBatch: function(phylumNumber, leaves) {
      var self = RPGACE.modules.phylumPath;
      var chunks = [];
      for (var i = 0; i < leaves.length; i += 25) chunks.push(leaves.slice(i, i + 25));
      var suggestionsByIndex = {};
      var chain = Promise.resolve();
      chunks.forEach(function(chunk, chunkIdx) {
        chain = chain.then(function() {
          var listText = chunk.map(function(leaf, i) {
            return (i + 1) + '. "' + leaf.name + '" - ' + (leaf.explainer || '(no explainer)');
          }).join('\n');
          var prompt = RPGACE.prompt('tutor', { subject: RPGACE.utils.phylumContext(phylumNumber) }) + ' as a formal academic discipline, reviewing a batch of archived taxonomy entries to decide which are worth carrying forward as real jargon terms.\n\n' +
            'ENTRIES (numbered):\n' + listText + '\n\n' +
            'For EACH entry, decide: KEEP (a genuinely useful, real jargon term or concept as-is), EDIT (the underlying idea is useful but the name/explainer is too vague, too broad, or reads as a category rather than one specific term - give a better single-term name + explainer), or DISCARD (redundant, not real jargon, or too broad a bucket to be one term). Give a one-sentence reason for every entry.\n\n' +
            'Return ONLY JSON: {"suggestions": [{"index": 1, "action": "keep"|"edit"|"discard", "reason": "...", "suggestedTerm": "..." (only if action is edit), "suggestedExplainer": "..." (only if action is edit)}, ...]} - one entry per numbered item above, in order.';
          return self.logic._callGroundWorkerJSON(prompt, 3000).then(function(parsed) {
            var suggestions = (parsed && parsed.suggestions) || [];
            suggestions.forEach(function(s) {
              var localIdx = parseInt(s.index, 10);
              if (isNaN(localIdx) || localIdx < 1 || localIdx > chunk.length) return;
              var globalLeaf = chunk[localIdx - 1];
              var globalIdx = leaves.indexOf(globalLeaf);
              if (globalIdx === -1) return;
              suggestionsByIndex[globalIdx] = {
                action: (s.action === 'edit' || s.action === 'discard') ? s.action : 'keep',
                reason: String(s.reason || '').slice(0, 300),
                suggestedTerm: s.suggestedTerm ? String(s.suggestedTerm).slice(0, 200) : null,
                suggestedExplainer: s.suggestedExplainer ? String(s.suggestedExplainer).slice(0, 500) : null,
              };
            });
          }).catch(function(e) {
            console.warn('[phylumPath] pretriage chunk ' + chunkIdx + ' failed:', e.message);
          });
        });
      });
      return chain.then(function() { return suggestionsByIndex; });
    },

    // ══════════════════════════════════════════════════════════════════
    // Sep 25 2026 — Step D, real jargon-term generation (the mechanism
    // for filling each phylum toward its ~90-term target, per Section
    // 17-19 of the curriculum-restructure spec). One batched Oracle
    // call generates up to `count` new, distinct jargon terms for a
    // phylum, explicitly told to avoid the real existing terms passed
    // in (same-phylum dedup at the PROMPT level, cheap and preventive).
    // A real code-level dedup guard still runs at insert time in
    // _buildOutJargonEncyclopedia below - the prompt asking nicely is
    // never trusted alone (rule 5, never trust model JSON blindly).
    // ══════════════════════════════════════════════════════════════════
    _generateJargonTermsBatch: function(phylumNumber, existingTerms, count) {
      var self = RPGACE.modules.phylumPath;
      var existingList = (existingTerms && existingTerms.length)
        ? existingTerms.join(', ')
        : '(none yet)';
      var prompt = RPGACE.prompt('tutor', { subject: RPGACE.utils.phylumContext(phylumNumber) }) + ' as a formal academic discipline.\n\n' +
        'ALREADY-COVERED real jargon terms for this phylum (never repeat or trivially rephrase any of these): ' + existingList + '\n\n' +
        'TASK: generate ' + count + ' more REAL, DISTINCT jargon terms actually used by real practitioners in this discipline - each a single word or short phrase (never a full sentence, never a broad category name), with one real, specific, concise sentence explaining what it means.\n\n' +
        'Return ONLY JSON: {"terms": [{"term": "...", "explainer": "..."}, ...]} - exactly ' + count + ' entries, no duplicates among themselves either.';
      var maxTok = Math.max(600, count * 70 + 300);
      return self.logic._callGroundWorkerJSON(prompt, maxTok).then(function(parsed) {
        var terms = (parsed && parsed.terms) || [];
        return terms.map(function(t) {
          return { term: String((t && t.term) || '').trim(), explainer: String((t && t.explainer) || '').trim() };
        }).filter(function(t) { return t.term; });
      });
    },

    // Orchestrator: for each enabled phylum, computes the real gap
    // toward `perPhylumTarget` (accepted + pending rows already there,
    // never counting rejected ones toward "have"), generates ONE batch
    // (capped at `batchCap` per call - real, bounded cost, rule 11;
    // reaching the full target needs multiple real runs, named plainly,
    // never silently claimed done in one pass), and inserts new rows as
    // status='pending' (Step D content is AI-generated and unreviewed -
    // real rule-4 human checkpoint still required before 'accepted',
    // unlike the C2 keep/edit path where Alex's own click IS the gate).
    // Real dedup, two layers: same-phylum (case-insensitive exact match
    // against every existing term for that phylum, any status) and
    // cross-phylum (case-insensitive exact match against every OTHER
    // phylum's existing terms - a genuine cross-cutting term is rare
    // enough that an exact-name collision is worth a human look, not a
    // silent skip disguised as success).
    _buildOutJargonEncyclopedia: function(perPhylumTarget, batchCap, sourceTag) {
      var self = RPGACE.modules.phylumPath;
      perPhylumTarget = perPhylumTarget || 90;
      batchCap = batchCap || 20;
      var report = { generated: 0, skippedDuplicate: 0, perPhylum: {}, errors: [] };
      return RPGACE.sb.select('jargon_encyclopedia', 'select=term,phylum_number,status').then(function(allRows) {
        allRows = allRows || [];
        var chain = Promise.resolve();
        self.ENABLED_PHYLA.forEach(function(phylumNumber) {
          chain = chain.then(function() {
            var samePhylum = allRows.filter(function(r) { return r.phylum_number === phylumNumber; });
            var haveCount = samePhylum.filter(function(r) { return r.status !== 'rejected'; }).length;
            var gap = perPhylumTarget - haveCount;
            if (gap <= 0) { report.perPhylum[phylumNumber] = { skipped: 'target already met' }; return; }
            var genCount = Math.min(gap, batchCap);
            var existingNames = samePhylum.map(function(r) { return r.term; });
            var allLowerNames = allRows.map(function(r) { return (r.term || '').toLowerCase().trim(); });
            return self.logic._generateJargonTermsBatch(phylumNumber, existingNames, genCount).then(function(terms) {
              var chain2 = Promise.resolve();
              var insertedThisPhylum = 0, skippedThisPhylum = 0;
              terms.forEach(function(t) {
                var lower = t.term.toLowerCase().trim();
                if (allLowerNames.indexOf(lower) !== -1) { skippedThisPhylum++; report.skippedDuplicate++; return; }
                allLowerNames.push(lower);
                chain2 = chain2.then(function() {
                  return RPGACE.sb.secureWrite('jargon_encyclopedia', 'insert', {
                    term: t.term, phylum_number: phylumNumber, explainer: t.explainer,
                    status: 'pending', source: [{ type: sourceTag || 'phylum_path_bulk_generate' }],
                  }).then(function() { insertedThisPhylum++; report.generated++; })
                    .catch(function(e) { report.errors.push(phylumNumber + ': ' + e.message); });
                });
              });
              return chain2.then(function() {
                report.perPhylum[phylumNumber] = { inserted: insertedThisPhylum, skippedDuplicate: skippedThisPhylum, gapRemaining: gap - insertedThisPhylum };
              });
            }).catch(function(e) {
              report.errors.push(phylumNumber + ' generation failed: ' + e.message);
            });
          });
        });
        return chain.then(function() { return report; });
      });
    },

    // Mirrors _resolveArchivedLeaf's shape for the simpler pending-term
    // case - no second table involved (the row IS the anchor already),
    // just its own status flip. Accept/edit-then-accept writes straight
    // to 'accepted' (Alex's own click on this popup IS the checkpoint);
    // reject flips to 'rejected', kept for audit, never deleted.
    _resolvePendingTerm: function(row, action, editedTerm, editedExplainer) {
      // Oct 15 2026 (KN-3): a failed save used to be swallowed silently, so the
      // term looked done but was not. Now it toasts and resolves false;
      // callers still get a resolved promise (they reload or keep the term).
      var fail = function(e) { RPGACE.utils.toast('⚠️ Jargon not saved: ' + (e && e.message || e), '#CC4A4A', 4000, 'phylumPath'); return false; };
      // KN-6: the menu's Review count re-reads after any decision.
      var KR = RPGACE.modules.knowledgeReview; if (KR && KR.logic) KR.logic._count = null;
      if (action === 'reject') {
        return RPGACE.sb.secureWrite('jargon_encyclopedia', 'update',
          { status: 'rejected', updated_at: new Date().toISOString() }, 'id=eq.' + row.id
        ).then(function() { return true; }, fail);
      }
      var payload = { status: 'accepted', updated_at: new Date().toISOString() };
      if (editedTerm) payload.term = editedTerm;
      if (editedExplainer != null) payload.explainer = editedExplainer;
      return RPGACE.sb.secureWrite('jargon_encyclopedia', 'update', payload, 'id=eq.' + row.id).then(function() { return true; }, fail);
    },

    // ══════════════════════════════════════════════════════════════════
    // July 16: fusion links - cross-taxonomy connections between a new
    // leaf and topically-related nodes ANYWHERE else in the tree (any
    // rank, any phylum), staged in the new taxonomy_links table and
    // confirmed/rejected through the same review queue as taxonomy
    // proposals (taxonomyReviewQueue). Answers a question the strict
    // one-parent tree can't: "does this same idea show up somewhere
    // else, and how do the two combine into something new." A link is
    // symmetric - one row, shown identically from either node's side
    // (see _renderFusionLinks) - and carries a one-sentence insight
    // explaining HOW the two connect, not just that they're similar.
    // New nodes only, going forward - no retroactive scan of the
    // existing tree this pass (same precedent as Phylum Path's original
    // "new insights only" scope decision).
    // ══════════════════════════════════════════════════════════════════
    // TOKEN-COST RETUNE July 19 (confirmed by Alex, the single biggest
    // culprit in the £10 burn): the old version sent EVERY node's full path
    // (~58.5k chars ≈ ~16k tokens at 491 nodes) TWICE per approved insight -
    // once to the Fable extractor (premium pricing) and once to the ground
    // worker. ~32k tokens per approval, growing with the tree. Now:
    // 1. The Fable triage call is GONE - one ground-worker call does the job.
    // 2. A free client-side keyword prefilter scores every candidate by word
    //    overlap with the new node's name/leaf context and sends only the
    //    top 60 - a genuine fusion needs topical overlap to exist at all, so
    //    zero-overlap candidates were pure token padding.
    // 3. Candidates are sent as NUMBERED [Phylum] Name lines (not full
    //    paths); the model returns the number, mapped back client-side -
    //    more robust than exact-path-string matching too.
    // 4. If fewer than 3 candidates score any overlap, the call is SKIPPED
    //    entirely - nothing plausibly fuses, so spend nothing.
    // Net: ~32k tokens (part premium) → ~1-2k (ground worker only), ~94% cut,
    // with auto-fire behavior kept per Alex's explicit choice.
    _findFusionLinks: function(node, phylumNumber) {
      var self = RPGACE.modules.phylumPath;
      if (!node) return Promise.resolve();

      return RPGACE.sb.select('taxonomy_tree', 'select=id,name,path,phylum_number&order=phylum_number.asc,path.asc')
        .then(function(allNodes) {
          allNodes = allNodes || [];
          var tt = RPGACE.modules.taxonomyTree;
          // Exclude the node itself and anything on its own direct
          // ancestor/descendant line (path prefix match) - fusion links are
          // for genuinely separate branches, not restating the tree's own
          // existing parent/child structure.
          var others = allNodes.filter(function(n) {
            return n.id !== node.id &&
              (n.path || '').indexOf(node.path + '/') !== 0 &&
              (node.path || '').indexOf(n.path + '/') !== 0;
          });
          if (!others.length) return;

          // Free keyword prefilter: score candidates by shared words (>3
          // chars) with the new node's name + its two nearest ancestors.
          var ctxWords = (node.name + ' ' + (node.path || '').split('/').slice(-3).join(' '))
            .toLowerCase().split(/\W+/).filter(function(w) { return w.length > 3; });
          var uniq = {};
          ctxWords = ctxWords.filter(function(w) { if (uniq[w]) return false; uniq[w] = true; return true; });
          var scored = others.map(function(n) {
            var hay = n.name.toLowerCase();
            var score = 0;
            ctxWords.forEach(function(w) { if (hay.indexOf(w) !== -1) score++; });
            return { n: n, score: score };
          }).filter(function(s) { return s.score > 0; })
            .sort(function(a, b) { return b.score - a.score; })
            .slice(0, 60);
          if (scored.length < 3) return; // nothing plausibly fuses - spend nothing

          var candidates = scored.map(function(s) { return s.n; });
          var candList = candidates.map(function(n, i) {
            var phName = tt ? (tt.PHYLUM_NAMES[n.phylum_number] || ('Phylum ' + n.phylum_number)) : ('Phylum ' + n.phylum_number);
            return (i + 1) + '. [' + phName + '] ' + n.name;
          }).join('\n');

          var prompt = RPGACE.prompt('tutor', { subject: 'all music production disciplines' }) + ', looking for genuine "fusion discipline" connections - places where two separately-classified ideas actually combine into a real technique, system, or craft angle a producer could use, not just two things that happen to share a topic.\n\n' +
            'NEW NODE just added: "' + node.name + '" (' + node.path + ')\n\n' +
            'CANDIDATE NODES (numbered, pre-filtered for topical overlap; [Phylum] Name):\n' + candList + '\n\n' +
            'Pick 0-3 REAL connections only - it is fine to return zero if nothing genuinely fuses. For each real connection, write a one-sentence insight explaining exactly HOW/WHY the two connect (this note will be shown on both nodes, so phrase it as the shared idea, not "node A relates to node B").\n\n' +
            'Return ONLY JSON: {"links": [{"n": 12, "insight": "..."}]}';

          return self.logic._callGroundWorkerJSON(prompt, 500)
            .then(function(parsed) {
              var links = (parsed && parsed.links) || [];
              if (!links.length) return;

              var chain = Promise.resolve();
              links.forEach(function(link) {
                var li = parseInt(link.n, 10);
                var match = (!isNaN(li) && li >= 1 && li <= candidates.length)
                  ? candidates[li - 1]
                  : candidates.find(function(n) { return n.path === link.path || n.name === link.path; });
                if (!match) return;
                chain = chain.then(function() {
                  return RPGACE.sb.secureWrite('taxonomy_links', 'insert', {
                    node_a_id: node.id,
                    node_b_id: match.id,
                    link_insight: link.insight || '',
                    status: 'pending'
                  }).catch(function() {});
                });
              });
              return chain;
            });
        }).catch(function(e) {
          console.warn('[phylumPath] fusion link search failed:', e.message);
        });
    },

    // ── Content generation for the new deepest node - extends Prod         ──
    // ── Oracle's "Master Learning" 3-layer method with a private-tutor-PhD  ──
    // ── persona, per the questionnaire's answer, rather than a new prompt   ──
    // ── shape from scratch. Originally a deliberate separate call from      ──
    // ── taxonomyTree's own _generateNodeContent (real Phylum 1 data showed  ──
    // ── deep_content empty on every node that older call was supposed to   ──
    // ── have populated). Sep 25 2026: _generateNodeContent deleted outright ──
    // ── — a real dedup pass (see taxonomyTree._acceptLineage) found it had  ──
    // ── zero remaining callers once _acceptLineage was rerouted through     ──
    // ── this function's own richer 3-layer-with-outline method instead.    ──
    // July 15 smoke test: real Phrygian-Dominant insight got cut off mid-
    // sentence at max_tokens:1200 asking for a full 3-layer teaching format.
    // Same class of issue as the already-open Oracle 504 timeout bug -
    // generation time, not just token count, is the real ceiling. Trimmed
    // the ask to explicitly stay short (this is a reference note attached to
    // one taxonomy leaf, not a full lesson - Feynman/Prod Oracle already own
    // the full-length teaching job elsewhere) and lowered max_tokens to
    // match the placement call's already-reliable budget, rather than
    // raising it further.
    _generateInsightContent: function(node, phylumNumber, insightText) {
      var self = RPGACE.modules.phylumPath;
      var extractorPrompt = 'You are outlining a short teaching note before a tutor writes it in full.\n\n' +
        'TOPIC: "' + node.name + '" (part of: ' + node.path + ')\n' +
        'INSIGHT: "' + insightText + '"\n\n' +
        'Produce a brief outline for a 3-layer teaching method:\n' +
        '- SIMPLE ANGLE: the one plain-terms hook to open with\n' +
        '- TECHNICAL MECHANIC: the one specific mechanism/technique to explain\n' +
        '- EXPERT NUANCE: the one thing most tutorials miss about this\n\n' +
        'Return ONLY JSON: {"simpleAngle": "...", "technicalMechanic": "...", "expertNuance": "..."}';

      return self.logic._callExtractor(extractorPrompt, 250)
        .catch(function(e) {
          console.warn('[phylumPath] insight-content extractor failed, ground worker writes cold:', e.message);
          return null;
        })
        .then(function(outline) {
          var outlineBlock = outline
            ? '\n\nA FASTER TRIAGE PASS ALREADY OUTLINED THIS (a starting angle - expand or correct as needed, do not just restate it):\n' +
              '- Simple angle: ' + outline.simpleAngle + '\n' +
              '- Technical mechanic: ' + outline.technicalMechanic + '\n' +
              '- Expert nuance: ' + outline.expertNuance + '\n'
            : '';

          // Aug 11 2026 — this exact prompt is what produced the leaf Alex
          // praised directly ("Second-Based Root Motion," the fifth-based-
          // vs second-based-motion contrast in its Technical Mechanics
          // layer) — real evidence, not guessed, since this function's own
          // output is what's sitting in that node's deep_content. The
          // contrast wasn't explicitly asked for though; it emerged on its
          // own. Made explicit now so it's reliable rather than lucky —
          // same real upgrade this pass's prompt used to carry over to
          // taxonomyTree's own (now-deleted) _generateNodeContent by hand.
          var prompt = RPGACE.prompt('tutor', { subject: RPGACE.utils.phylumContext(phylumNumber) }) + ', teaching a UK hip hop / drill producer who works in FL Studio.\n\n' +
            'TOPIC: "' + node.name + '" (part of: ' + node.path + ')\n' +
            'THE INSIGHT THAT PROMPTED THIS: "' + insightText + '"' + outlineBlock + '\n\n' +
            'Teach this using the 3-layer method: simple terms first, then technical mechanics (where a genuinely different or older/more common alternative approach exists, contrast this against it directly and explain why the difference matters in practice — a real comparison beats a flat definition), then the one expert nuance most tutorials miss. Be specific to FL Studio. Keep this concise — under 350 words total across all 3 layers, this is a reference note attached to one taxonomy leaf, not a full lesson.';

          return self.logic._callGroundWorkerText(prompt, 700);
        })
        .then(function(text) {
          return RPGACE.sb.secureWrite('taxonomy_tree', 'update', {
            deep_content: { generated: text, generated_at: new Date().toISOString() }
          }, 'id=eq.' + node.id);
        }).catch(function(e) {
          console.warn('[phylumPath] content generation failed:', e.message);
        });
    },

    // ── Article generation, any rank (or the phylum root itself if node   ──
    // ── is null) - manual button trigger only, per the questionnaire.     ──
    // ── Split July 17 into text-generation (this function) + a confirm    ──
    // ── popup + save (_generateArticle below) - the original version      ──
    // ── wrote straight to Encyclopedia with zero human checkpoint, the    ──
    // ── one Phylum Path Oracle call that had never gotten the same        ──
    // ── review-before-write treatment as insight placement did back in    ──
    // ── Phase 1. Real gap found hand-testing the drill-down live.         ──
    _generateArticleText: function(node) {
      var self = RPGACE.modules.phylumPath;
      var phylumNumber = node ? node.phylum_number : self.PHYLUM_NUM;
      RPGACE.utils.toast('📄 Gathering content...', '#9B6EC8', 2500);

      return RPGACE.sb.select('taxonomy_tree', 'phylum_number=eq.' + phylumNumber + '&order=path.asc')
        .then(function(allNodes) {
          allNodes = allNodes || [];
          var relevant = node
            ? allNodes.filter(function(n) { return n.id === node.id || (n.path || '').indexOf(node.path + '/') === 0; })
            : allNodes;

          var contentBlock = relevant.map(function(n) {
            var deep = (n.deep_content && n.deep_content.generated) ? n.deep_content.generated : '';
            return '### ' + n.name + '\n' + (n.explainer || '') + (deep ? '\n' + deep : '');
          }).join('\n\n');

          var tt = RPGACE.modules.taxonomyTree;
          var title = node ? node.name : (tt ? tt.PHYLUM_NAMES[phylumNumber] : ('Phylum ' + phylumNumber));
          var rankLabel = node ? (tt ? tt.rankNameForDepth(node.depth) : 'Node') : 'Phylum';

          // July 15 smoke test: this call (max_tokens:1800, the longest of
          // Phylum Path's 3 Oracle calls) failed outright with a JSON-parse
          // error on "Church Modes" - Vercel's function timeout returned an
          // HTML error page instead of JSON. Reproduces the already-open
          // Oracle 504 timeout bug. Trimmed the ask + lowered max_tokens as
          // a scoped mitigation (same move already made for
          // _generateNodeContent and _generateInsightContent) - the timeout
          // itself still needs its own dedicated fix (streaming or chunked
          // generation), not another blind retry.
          //
          // July 16: extractor pass added on top of that mitigation - Fable
          // 5 outlines the article's structure first (which sub-points
          // matter, what the throughline is), so the ground worker writes
          // from a real outline instead of winging structure cold. Doesn't
          // change the token/length mitigation above, just the quality of
          // what gets written within that budget.
          var extractorPrompt = 'You are outlining a reference article before it gets written in full.\n\n' +
            'TOPIC: "' + title + '" (' + rankLabel + (node ? ', part of: ' + node.path : ', the root discipline itself') + ')\n\n' +
            'ACCUMULATED CONTENT to synthesize:\n\n' + (contentBlock || '(nothing accumulated yet)') + '\n\n' +
            'Produce a brief outline:\n' +
            '- THROUGHLINE: the one organizing idea that ties everything below together, one sentence.\n' +
            '- KEEP: up to 4 sub-points from the accumulated content that are most worth keeping in the final article.\n' +
            '- SKIP: anything redundant or minor worth leaving out.\n\n' +
            'Return ONLY JSON: {"throughline": "...", "keep": ["...", "..."], "skip": ["...", "..."]}';

          return self.logic._callExtractor(extractorPrompt, 300)
            .catch(function(e) {
              console.warn('[phylumPath] article extractor failed, ground worker writes cold:', e.message);
              return null;
            })
            .then(function(outline) {
              var outlineBlock = outline
                ? '\n\nA FASTER TRIAGE PASS ALREADY OUTLINED THIS (a starting structure - expand or correct as needed, do not just restate it):\n' +
                  '- Throughline: ' + outline.throughline + '\n' +
                  '- Worth keeping: ' + ((outline.keep && outline.keep.length) ? outline.keep.join('; ') : '(none flagged)') + '\n' +
                  '- Worth skipping: ' + ((outline.skip && outline.skip.length) ? outline.skip.join('; ') : '(none flagged)') + '\n'
                : '';

              var prompt = RPGACE.prompt('tutor', { subject: RPGACE.utils.phylumContext(phylumNumber) }) + '.\n\n' +
                'Write a reference article for "' + title + '" (' + rankLabel + (node ? ', part of: ' + node.path : ', the root discipline itself') + ').\n\n' +
                'Synthesize the following accumulated teaching content from this topic and everything beneath it in the tree:\n\n' + (contentBlock || '(nothing accumulated yet - write a short foundational overview instead)') + outlineBlock + '\n\n' +
                'Produce a well-organized synthesis a producer can use as a standing reference, not just a restated list. Keep it under 500 words — concise and usable beats exhaustive. If the accumulated content contains a real comparison against an older/alternative approach, keep that contrast intact rather than flattening it into a generic definition — that specific kind of caveat is exactly what makes a reference entry worth reading twice.';

              return self.logic._callGroundWorkerText(prompt, 1000);
            })
            .then(function(text) {
              var articleTitle = title + ' — ' + rankLabel + ' Reference';
              return { articleTitle: articleTitle, text: text };
            });
        });
    },

    // Manual-button entry point - generates the text, shows the confirm
    // popup, only saves on Approve. Returns a promise that resolves once
    // the user has made a choice either way (approved or denied), same
    // shape as _placeInsight's { inserted: bool } pattern, so the button's
    // .then() (cache-clear + re-render) runs consistently regardless of
    // which way the user went.
    _generateArticle: function(node) {
      var self = RPGACE.modules.phylumPath;
      return self.logic._generateArticleText(node).then(function(result) {
        var articleTitle = result.articleTitle, text = result.text;
        return new Promise(function(resolve) {
          self.ui._showArticleConfirm(node, articleTitle, text,
            function() {
              if (typeof saveOracleToEncyclopedia !== 'function') {
                RPGACE.utils.toast('Article generated but saveOracleToEncyclopedia() not found', '#CC4A4A', 3500);
                resolve({ saved: false });
                return;
              }
              saveOracleToEncyclopedia(articleTitle, text).then(function() {
                if (node) {
                  return RPGACE.sb.secureWrite('encyclopedia', 'update', { taxonomy_node_id: node.id }, 'title=eq.' + encodeURIComponent(articleTitle)).catch(function() {});
                }
              }).then(function() {
                RPGACE.utils.toast('✅ Article saved to Encyclopedia: ' + articleTitle, '#4CAF82', 4000);
                // Fire-and-forget, same pattern as _findFusionLinks - a missed
                // concept-fusion pass shouldn't block the article save itself.
                self.logic._findConceptFusion(node, text);
                resolve({ saved: true });
              });
            },
            function() {
              RPGACE.utils.toast('Article discarded', 'rgba(226,226,236,0.5)', 2500);
              resolve({ saved: false });
            }
          );
        });
      }).catch(function(e) {
        RPGACE.utils.toast('Error generating article: ' + e.message, '#CC4A4A', 3500);
      });
    },

    // ══════════════════════════════════════════════════════════════════
    // July 17: Concept Fusion - distinct from _findFusionLinks() above.
    // That system links a single new LEAF insight to other specific leaves
    // (narrow, technique-level connections). This instead looks at a whole
    // BRANCH's synthesized article (Genus/Family/Order/Class - anything
    // above a leaf) once _generateArticle() writes it, and asks whether
    // merging that branch's actual concept with a distant branch anywhere
    // else in the tree (any rank, any phylum - Genus-to-Family, Family-to-
    // Order, whatever genuinely fits) would produce a NEW teachable idea
    // neither branch covers alone. If so, it doesn't just link the two -
    // it proposes a brand new taxonomy leaf representing the merge itself,
    // staged through the same taxonomy_proposals confirm/reject review as
    // every other tree write (engine: 'concept_fusion'), plus 2
    // taxonomy_links rows connecting the new node back to both sources
    // once accepted. Cross-phylum only, matching the "discipline far away"
    // framing - same-phylum branch relationships are already just tree
    // structure. Scoped to node_type==='branch' (Order/Class/Family/Genus)
    // so it never fires on a plain leaf article, where _findFusionLinks
    // already owns the narrower connection job.
    // ══════════════════════════════════════════════════════════════════
    _findConceptFusion: function(node, articleText) {
      var self = RPGACE.modules.phylumPath;
      if (!node || node.node_type !== 'branch') return Promise.resolve();

      return RPGACE.sb.select('taxonomy_tree', 'select=id,name,path,phylum_number,depth,node_type,explainer&order=phylum_number.asc,path.asc')
        .then(function(allNodes) {
          allNodes = allNodes || [];
          var tt = RPGACE.modules.taxonomyTree;
          var others = allNodes.filter(function(n) {
            return n.node_type === 'branch' && n.phylum_number !== node.phylum_number;
          });
          if (!others.length) return;

          var pathList = others.map(function(n) {
            var phName = tt ? (tt.PHYLUM_NAMES[n.phylum_number] || ('Phylum ' + n.phylum_number)) : ('Phylum ' + n.phylum_number);
            return '- [' + phName + '] ' + n.path + (n.explainer ? ' — ' + n.explainer : '');
          }).join('\n');

          var extractorPrompt = 'You are a fast triage pass looking for concept-fusion candidates across disciplines.\n\n' +
            'BRANCH CONCEPT: "' + node.name + '" (' + node.path + ')\n' +
            'ITS SYNTHESIZED ARTICLE:\n' + (articleText || '').slice(0, 1500) + '\n\n' +
            'OTHER BRANCHES ACROSS THE TAXONOMY (different phyla only):\n' + pathList + '\n\n' +
            'Shortlist up to 5 branches whose core concept, combined with this one, might form a genuinely new teachable idea neither branch covers alone - not just related topics.\n\n' +
            'Return ONLY JSON: {"candidates": ["path1", "path2"]}';

          return self.logic._callExtractor(extractorPrompt, 350)
            .catch(function(e) {
              console.warn('[phylumPath] concept-fusion extractor failed, ground worker scans cold:', e.message);
              return null;
            })
            .then(function(shortlist) {
              var candidateBlock = (shortlist && shortlist.candidates && shortlist.candidates.length)
                ? '\n\nA FASTER TRIAGE PASS ALREADY SHORTLISTED THESE (verify and refine, do not just accept blindly):\n' + shortlist.candidates.join('\n')
                : '';

              var prompt = RPGACE.prompt('tutor', { subject: 'all music production disciplines' }) + ', looking specifically for a "concept fusion" - two branches from DIFFERENT parts of the taxonomy whose core ideas genuinely combine into a NEW teachable concept, distinct from either branch alone. This is a higher bar than a simple connection: the merge itself should be worth its own leaf, giving a producer a real new angle neither discipline provides in isolation.\n\n' +
                'BRANCH CONCEPT: "' + node.name + '" (' + node.path + ')\n' +
                'ITS SYNTHESIZED ARTICLE:\n' + (articleText || '').slice(0, 2000) + '\n\n' +
                'OTHER BRANCHES (different phyla only):\n' + pathList + candidateBlock + '\n\n' +
                'Decide: is there ONE genuine fusion here, or none? Zero is a completely fine answer - most branches will not have one. If yes:\n' +
                '- TARGET PATH: the exact existing path string of the other branch to merge with.\n' +
                '- ATTACH UNDER: "source" or "target" - whichever branch is the more natural home for the new merged concept.\n' +
                '- NEW NAME: a short, specific name for the new merged concept (this becomes a new taxonomy leaf).\n' +
                '- SYNTHESIS: 2-3 sentences explaining what the merged concept actually is and how it gives a producer a genuinely new angle.\n\n' +
                'Return ONLY JSON: {"found": true/false, "targetPath": "...", "attachUnder": "source", "newName": "...", "synthesis": "..."}';

              return self.logic._callGroundWorkerJSON(prompt, 600);
            })
            .then(function(parsed) {
              if (!parsed || !parsed.found || !parsed.targetPath || !parsed.newName) return;
              var target = others.find(function(n) { return n.path === parsed.targetPath; });
              if (!target) return;

              var attachNode = (parsed.attachUnder === 'target') ? target : node;
              var otherNode = (parsed.attachUnder === 'target') ? node : target;

              return RPGACE.sb.secureWrite('taxonomy_proposals', 'insert', {
                source_type: 'phylum_path_concept_fusion',
                source_id: node.id,
                proposed_path: attachNode.path + '/' + parsed.newName,
                phylum_number: attachNode.phylum_number,
                proposed_steps: {
                  engine: 'concept_fusion',
                  attachToId: attachNode.id,
                  otherNodeId: otherNode.id,
                  newName: parsed.newName,
                  synthesis: parsed.synthesis || ''
                },
                status: 'pending'
              }).catch(function(e) {
                console.warn('[phylumPath] concept-fusion proposal write failed:', e.message);
              });
            });
        }).catch(function(e) {
          console.warn('[phylumPath] concept-fusion search failed:', e.message);
        });
    },

    // Generates (or reuses a cached) short synthesis article specifically
    // about HOW two fusion-linked nodes connect, not either one alone -
    // lazy + cached on taxonomy_links.link_article, same "check cache first,
    // only call Oracle on demand" convention as _articleSection's node
    // articles. Single-tier ground-worker call (no extractor pass) since
    // this is a narrow, already-scoped synthesis, not a whole branch.
    _generateLinkArticle: function(link, nodeA, nodeB) {
      var self = RPGACE.modules.phylumPath;
      var tt = RPGACE.modules.taxonomyTree;
      var phA = tt ? (tt.PHYLUM_NAMES[nodeA.phylum_number] || ('Phylum ' + nodeA.phylum_number)) : ('Phylum ' + nodeA.phylum_number);
      var phB = tt ? (tt.PHYLUM_NAMES[nodeB.phylum_number] || ('Phylum ' + nodeB.phylum_number)) : ('Phylum ' + nodeB.phylum_number);
      var prompt = RPGACE.prompt('tutor', { subject: 'music production' }) + ', explaining a genuine cross-discipline connection to a student.\n\n' +
        'Two separately-classified taxonomy concepts have been linked as a "fusion connection":\n\n' +
        'A) [' + phA + '] ' + nodeA.path + '\n' + (nodeA.explainer || '') + '\n\n' +
        'B) [' + phB + '] ' + nodeB.path + '\n' + (nodeB.explainer || '') + '\n\n' +
        'The confirmed reason they connect: "' + (link.link_insight || '') + '"\n\n' +
        'Write a short synthesis (under 300 words) explaining HOW these two ideas genuinely combine or reinforce each other in practice, with one concrete example a producer could apply. This is specifically about the connection between them, not a general overview of either concept alone.';

      return self.logic._callGroundWorkerText(prompt, 600).then(function(text) {
        return RPGACE.sb.secureWrite('taxonomy_links', 'update', {
          link_article: { generated: text, generated_at: new Date().toISOString() }
        }, 'id=eq.' + link.id).then(function() { return text; });
      });
    },

  },

  // ============================================================
  // ui — rendering/DOM: the side panel, the drill-down page, the two
  // confirm popups, the interlink popup. Delegates every non-display
  // decision to logic.* rather than deciding itself.
  // Kept in the same relative order as before the split.
  // ============================================================
  ui: {

    // Switches the active phylum and re-renders whichever Phylum Path UI
    // surface is currently mounted (side panel or nav-tab page) - both read
    // self.PHYLUM_NUM dynamically already, so this is just: update the
    // constant, refresh whichever labels were set at initial render, then
    // re-fetch. Silently no-ops for a phylum that isn't enabled.
    // focusId is optional - when a caller already knows which node it wants
    // to land on after the switch (e.g. _jumpToNode() following a fusion
    // link across phyla), pass it through here so the nav-tab page loads
    // straight to that node instead of the phylum root, avoiding a wasted
    // extra fetch/race between two _loadNodesAndRender calls.
    _switchPhylum: function(num, focusId) {
      var self = RPGACE.modules.phylumPath;
      if (!self.logic.isEnabled(num) || self.PHYLUM_NUM === num) return;
      self.PHYLUM_NUM = num;

      var panel = document.getElementById('phylum-path-panel');
      if (panel) {
        var sub = panel.querySelector('.pp-panel-sub');
        if (sub) sub.textContent = RPGACE.utils.phylumLabel(num);
        var purpose = panel.querySelector('.pp-panel-purpose');
        if (purpose) purpose.textContent = RPGACE.utils.phylumContext(num);
        var textarea = document.getElementById('phylum-path-input');
        var tt0 = RPGACE.modules.taxonomyTree;
        if (textarea) textarea.placeholder = 'Paste or describe a specific teaching insight - a fact, technique, or observation about ' + (tt0 ? tt0.PHYLUM_NAMES[num] : 'this phylum') + '...';
        panel.querySelectorAll('.pp-switch-pill').forEach(function(p) {
          var active = (parseInt(p.dataset.num, 10) === num);
          p.style.opacity = active ? '1' : '0.65';
          p.style.background = active ? 'rgba(61,170,110,0.14)' : 'rgba(255,255,255,0.02)';
          p.style.borderColor = active ? 'rgba(61,170,110,0.4)' : 'rgba(61,170,110,0.15)';
        });
        self.ui._renderTree();
      }

      var pageTitle = document.getElementById('pp-phylum-title');
      if (pageTitle) pageTitle.textContent = '🧬 Phylum Path';
      var pageSwitcher = document.getElementById('pp-phylum-switcher');
      if (pageSwitcher) {
        pageSwitcher.querySelectorAll('.pp-switch-pill').forEach(function(p) {
          var active = (parseInt(p.dataset.num, 10) === num);
          p.style.opacity = active ? '1' : '0.65';
          p.style.background = active ? 'rgba(61,170,110,0.14)' : 'rgba(255,255,255,0.02)';
          p.style.borderColor = active ? 'rgba(61,170,110,0.4)' : 'rgba(61,170,110,0.15)';
        });
        // Only re-fetch the drill-down view if it's the actually-visible
        // page - avoids a wasted background Supabase call when the switch
        // came from the side panel instead (the nav-tab page div persists
        // in the DOM once injected, whether visible or not).
        var page = document.getElementById('page-' + RPGACE.CONFIG.pages.phylumPath);
        if (page && page.classList.contains('active')) self.ui._loadNodesAndRender(focusId || null);
      }
    },

    // Builds the shared phylum-switcher (one row per ENABLED_PHYLA entry,
    // grouped under PHYLUM_SCOPE_GROUPS headers) - used identically by the
    // side panel and the nav-tab page so there's one switcher implementation,
    // not two. Rewritten July 17 from a flat wrap of pills (cramped once 10
    // phyla were live, no grouping, small tap targets) into a vertical
    // grouped list - bigger clickable rows, grouped by larger scope so the
    // full 21-phylum future doesn't just become one long undifferentiated
    // row of pills either.
    _renderPhylumSwitcher: function() {
      var self = RPGACE.modules.phylumPath;
      var tt = RPGACE.modules.taxonomyTree;
      var wrap = document.createElement('div');
      wrap.className = 'pp-switcher';
      wrap.style.cssText = 'margin-bottom:12px;';
      // RC-1 (Oct 15 2026): realms are the top level, each opening to its
      // phyla (map from realm_lenses.json via RPGACE.phylumRealms). Until the
      // map has loaded, the old scope groups show and swap in once it's ready.
      var groups = self.ui._realmGroups();
      if (!groups) {
        groups = (tt && tt.PHYLUM_SCOPE_GROUPS) ? tt.PHYLUM_SCOPE_GROUPS : [{ label: 'Phyla', phyla: self.ENABLED_PHYLA }];
        RPGACE.phylumRealms().then(function() { self.ui._refreshSwitchers(); }).catch(function() {});
      }
      groups.forEach(function(group) {
        var enabledInGroup = group.phyla.filter(function(n) { return self.logic.isEnabled(n); });
        if (!enabledInGroup.length) return;
        var target = wrap;
        if (group.realm) {
          var open = self._openRealms ? !!self._openRealms[group.realm] : enabledInGroup.indexOf(self.PHYLUM_NUM) !== -1;
          var head = document.createElement('button');
          head.type = 'button';
          head.className = 'pp-realm-head';
          head.dataset.realm = group.realm;
          head.dataset.phyla = enabledInGroup.join(',');
          head.setAttribute('aria-expanded', open ? 'true' : 'false');
          head.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%;min-height:44px;text-align:left;padding:8px 12px;margin:6px 0 4px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.25);border-radius:8px;color:var(--gold);font-size:14px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
          head.innerHTML = '<span class="pp-realm-name" style="flex:1;"></span><span class="pp-realm-count" style="font-size:11px;font-weight:400;color:rgba(226,226,236,0.55);"></span><span class="pp-realm-caret">' + (open ? '▾' : '▸') + '</span>';
          head.querySelector('.pp-realm-name').textContent = group.label + ' · ' + enabledInGroup.length + ' phyl' + (enabledInGroup.length === 1 ? 'um' : 'a');
          var body = document.createElement('div');
          body.className = 'pp-realm-body';
          body.dataset.realm = group.realm;
          body.hidden = !open;
          body.style.cssText = 'padding-left:8px;';
          head.onclick = function() {
            var nowOpen = body.hidden;
            body.hidden = !nowOpen;
            head.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
            head.querySelector('.pp-realm-caret').textContent = nowOpen ? '▾' : '▸';
            self._openRealms = self._openRealms || {};
            self._openRealms[group.realm] = nowOpen;
          };
          wrap.appendChild(head); wrap.appendChild(body);
          target = body;
        } else {
          var lbl = document.createElement('div');
          lbl.textContent = group.label;
          lbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.35);margin:10px 0 4px;';
          wrap.appendChild(lbl);
        }
        enabledInGroup.forEach(function(num) {
          var active = (num === self.PHYLUM_NUM);
          var row = document.createElement('button');
          row.className = 'pp-switch-pill';
          row.dataset.num = num;
          row.style.cssText = 'display:block;width:100%;text-align:left;padding:8px 12px;margin-bottom:4px;background:' + (active ? 'rgba(61,170,110,0.14)' : 'rgba(255,255,255,0.02)') + ';border:1px solid rgba(61,170,110,' + (active ? '0.4' : '0.15') + ');border-radius:7px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;opacity:' + (active ? '1' : '0.65') + ';';
          var nameEl = document.createElement('div');
          nameEl.textContent = tt ? tt.PHYLUM_NAMES[num] : ('Phylum ' + num);
          var glossEl = document.createElement('div');
          glossEl.textContent = tt ? (tt.PHYLUM_ENGLISH[num] || '') : '';
          glossEl.style.cssText = 'font-size:11px;font-weight:400;color:rgba(226,226,236,0.4);margin-top:1px;';
          row.appendChild(nameEl); row.appendChild(glossEl);
          row.onclick = function() { self.ui._switchPhylum(num); };
          target.appendChild(row);
        });
      });
      return wrap;
    },

    // RC-1: [{realm, label, phyla}] in xpSeason order + Miscellaneous, or
    // null while the realm map hasn't loaded.
    _realmGroups: function() {
      var map = RPGACE.phylumRealmMap, X = RPGACE.modules.xpSeason;
      if (!map || !X) return null;
      var out = X.ORDER.filter(function(r) { return (map.byRealm[r] || []).length; }).map(function(r) {
        return { realm: r, label: X.REALMS[r].icon + ' ' + X.REALMS[r].name, phyla: map.byRealm[r].slice().sort(function(a, b) { return a - b; }) };
      });
      var homeless = RPGACE.modules.phylumPath.ENABLED_PHYLA.filter(function(n) { return !map.byPhylum[n]; });
      if (homeless.length) out.push({ label: 'Miscellaneous', phyla: homeless });
      return out;
    },
    _refreshSwitchers: function() {
      var self = RPGACE.modules.phylumPath;
      document.querySelectorAll('.pp-switcher').forEach(function(old) { old.parentNode.replaceChild(self.ui._renderPhylumSwitcher(), old); });
      if (RPGACE.modules.lifeLibrary) RPGACE.modules.lifeLibrary.ui.renderSwitcherCounts();
    },

    // ── Highlight-any-text entry point ──────────────────────────────────
    // July 15: reuses main.js's existing native #text-select-popup (the
    // "🔍 Identify" popup that already appears over Oracle chat + Encyclopedia
    // text on selection) instead of building a second selection listener -
    // same exact pattern conidPot._patchTextSelect() already established for
    // its "💡 Save as Idea" button, just a different appended button and its
    // own dataset flag so both patches can coexist on the same popup without
    // re-patching each other.
    _patchTextSelect: function() {
      var self = RPGACE.modules.phylumPath;
      var obs = new MutationObserver(function(muts) {
        muts.forEach(function(m) {
          m.addedNodes.forEach(function(node) {
            if (node.nodeType !== 1) return;
            var popup = node.id === 'text-select-popup' ? node :
                        node.querySelector && node.querySelector('#text-select-popup');
            if (!popup) return;
            if (popup.dataset.ppPatched) return;
            popup.dataset.ppPatched = '1';
            var btn = document.createElement('button');
            btn.textContent = '🧬 Send to Phylum Path';
            btn.style.cssText = 'padding:4px 10px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.25);border-radius:5px;color:#4CAF82;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-left:6px;';
            btn.onclick = function() {
              var selectedText = window.getSelection ? window.getSelection().toString() : '';
              var text = selectedText || popup.dataset.selectedText || '';
              if (!text) { RPGACE.utils.toast('Select some text first', '#CC4A4A', 2000); return; }
              self.ui.open(text.slice(0, 2000));
            };
            var btnRow = popup.querySelector('div');
            if (btnRow) btnRow.appendChild(btn);
            else popup.appendChild(btn);
          });
        });
      });
      obs.observe(document.body, { childList: true, subtree: true });
    },

    _injectButton: function() {
      if (document.getElementById('phylum-path-btn')) return;
      var self = RPGACE.modules.phylumPath;
      var row = document.querySelector('.quick-row');
      if (!row) return;
      var btn = document.createElement('button');
      btn.id = 'phylum-path-btn';
      btn.className = 'agent-btn';
      btn.textContent = '🧬 Phylum Path';
      btn.style.cssText = 'border-color:rgba(61,170,110,0.4);color:#4CAF82;background:rgba(61,170,110,0.08);margin-left:4px;';
      btn.onclick = function() { self.ui.open(); };
      row.appendChild(btn);
    },

    // ── Auto-detect entry point: reads phylum 1's score straight out of   ──
    // ── the shared scan's already-computed `matches` array (fired via the  ──
    // ── 'oracle:response-scanned' hook - see init()) rather than owning    ──
    // ── its own MutationObserver or re-scoring the text itself. Surfaces   ──
    // ── an opt-in button, never auto-commits anything to Supabase.        ──
    _checkLastResponse: function(text, lastMsg, matches) {
      var self = RPGACE.modules.phylumPath;
      // July 17: was hardcoded to self.PHYLUM_NUM (Phylum 1 only) - now
      // checks every enabled phylum and opens on whichever one actually
      // matched, so Percussio-relevant responses get their own badge too.
      var m = matches.find(function(m) { return self.logic.isEnabled(m.num); });
      if (!m) return;

      var badge = document.createElement('button');
      badge.textContent = '🧬 Add to Phylum Path? (' + m.name + ')';
      badge.style.cssText = 'margin-top:6px;padding:3px 10px;background:rgba(61,170,110,0.08);border:1px solid rgba(61,170,110,0.25);border-radius:12px;color:#4CAF82;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      // Fixed July 17: this used to just open the side panel pre-filled,
      // requiring a SECOND click on "Place this insight" inside it before
      // decidePlacement()/the confirm popup ever ran - easy to miss (a real
      // report: "no pop-up showed up" after clicking this badge). Now goes
      // straight to placement decision + the confirm popup in one click,
      // matching what the badge visually promises.
      badge.onclick = function() {
        badge.remove();
        RPGACE.utils.toast('🧬 Deciding placement...', '#4CAF82', 2500);
        self.logic._placeInsight(text.slice(0, 2000), m.num).catch(function(e) {
          RPGACE.utils.toast('Error: ' + e.message, '#CC4A4A', 3500);
        });
      };
      lastMsg.appendChild(badge);
    },

    // ── Panel ──────────────────────────────────────────────────────────
    _close: function() {
      RPGACE.ui.slideOutPanel(document.getElementById('phylum-path-panel'), 'right');
    },

    open: function(prefillText, phylumNumber) {
      var self = RPGACE.modules.phylumPath;
      if (document.getElementById('phylum-path-panel')) { self.ui._close(); return; }
      if (phylumNumber && self.logic.isEnabled(phylumNumber)) self.PHYLUM_NUM = phylumNumber;
      var panel = document.createElement('div');
      panel.id = 'phylum-path-panel';
      panel.style.cssText = 'position:fixed;top:0;right:0;width:min(440px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(61,170,110,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;';

      var hdr = document.createElement('div');
      hdr.style.cssText = 'background:rgba(61,170,110,0.06);border-bottom:1px solid rgba(61,170,110,0.12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
      var ht = document.createElement('div');
      var lb = document.createElement('div');
      lb.textContent = 'PHYLUM PATH';
      lb.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(61,170,110,0.65);margin-bottom:3px;';
      var sub = document.createElement('div');
      sub.className = 'pp-panel-sub';
      sub.textContent = RPGACE.utils.phylumLabel(self.PHYLUM_NUM);
      sub.style.cssText = 'font-size:12px;font-weight:700;color:#D4DAF5;';
      ht.appendChild(lb); ht.appendChild(sub);
      var cb = document.createElement('button');
      cb.textContent = '×';
      cb.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:20px;line-height:1;padding:4px;';
      cb.onclick = function() { self.ui._close(); };
      hdr.appendChild(ht); hdr.appendChild(cb);
      panel.appendChild(hdr);

      var body = document.createElement('div');
      body.style.cssText = 'flex:1;overflow-y:auto;padding:14px;';

      // Phylum switcher - only shows once there's more than one enabled
      // phylum to pick between (Compositio + Percussio, July 17 onward).
      if (self.ENABLED_PHYLA.length > 1) body.appendChild(self.ui._renderPhylumSwitcher());

      var purposeNote = document.createElement('div');
      purposeNote.className = 'pp-panel-purpose';
      purposeNote.textContent = RPGACE.utils.phylumContext(self.PHYLUM_NUM);
      purposeNote.style.cssText = 'font-size:11px;color:rgba(61,170,110,0.6);margin-bottom:14px;letter-spacing:0.3px;line-height:1.5;border-left:2px solid rgba(61,170,110,0.3);padding-left:8px;';
      body.appendChild(purposeNote);

      // Manual insight entry
      var entryLbl = document.createElement('div');
      entryLbl.textContent = 'Add an insight';
      entryLbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:6px;';
      body.appendChild(entryLbl);

      var tt0 = RPGACE.modules.taxonomyTree;
      var textarea = document.createElement('textarea');
      textarea.id = 'phylum-path-input';
      textarea.placeholder = 'Paste or describe a specific teaching insight - a fact, technique, or observation about ' + (tt0 ? tt0.PHYLUM_NAMES[self.PHYLUM_NUM] : 'this phylum') + '...';
      textarea.value = prefillText || '';
      textarea.rows = 5;
      textarea.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:12px;padding:10px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;margin-bottom:10px;';
      body.appendChild(textarea);

      var placeBtn = document.createElement('button');
      placeBtn.textContent = '🧬 Place this insight';
      placeBtn.style.cssText = 'width:100%;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:18px;';
      placeBtn.onclick = function() {
        var text = document.getElementById('phylum-path-input').value.trim();
        if (!text) { RPGACE.utils.toast('Add an insight first', '#CC4A4A', 2000); return; }
        placeBtn.disabled = true;
        placeBtn.textContent = '⏳ Placing...';
        self.logic._placeInsight(text, self.PHYLUM_NUM).then(function(result) {
          placeBtn.disabled = false;
          placeBtn.textContent = '🧬 Place this insight';
          if (result && result.inserted) {
            document.getElementById('phylum-path-input').value = '';
            self.ui._renderTree();
          }
        }).catch(function(e) {
          placeBtn.disabled = false;
          placeBtn.textContent = '🧬 Place this insight';
          RPGACE.utils.toast('Error: ' + e.message, '#CC4A4A', 3500);
        });
      };
      body.appendChild(placeBtn);

      // Phylum-level article button (the root itself - no taxonomy_tree row
      // exists for it, node=null is the signal _generateArticle reads as "the
      // whole phylum" rather than one specific node).
      var phylumArticleBtn = document.createElement('button');
      phylumArticleBtn.textContent = '📄 Generate Phylum-Level Article';
      phylumArticleBtn.className = 'tax-dormant-hide';
      phylumArticleBtn.style.cssText = 'width:100%;padding:8px;background:rgba(155,89,182,0.08);border:1px solid rgba(155,89,182,0.25);border-radius:6px;color:#9B6EC8;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;margin-bottom:14px;';
      phylumArticleBtn.onclick = function() { self.logic._generateArticle(null); };
      body.appendChild(phylumArticleBtn);

      var treeLbl = document.createElement('div');
      treeLbl.textContent = 'Current structure';
      treeLbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin-bottom:8px;';
      body.appendChild(treeLbl);

      var treeList = document.createElement('div');
      treeList.id = 'phylum-path-tree';
      treeList.innerHTML = '<div style="color:rgba(226,226,236,0.25);font-size:11px;">Loading...</div>';
      body.appendChild(treeList);

      panel.appendChild(body);
      RPGACE.ui.slideInPanel(panel, {edge:'right'});

      self.ui._renderTree();
    },

    _renderTree: function() {
      var self = RPGACE.modules.phylumPath;
      var treeList = document.getElementById('phylum-path-tree');
      if (!treeList) return;
      treeList.innerHTML = '<div style="color:rgba(226,226,236,0.25);font-size:11px;">Loading...</div>';

      RPGACE.sb.select('taxonomy_tree', 'phylum_number=eq.' + self.PHYLUM_NUM + '&order=path.asc')
        .then(function(nodes) {
          nodes = nodes || [];
          treeList.innerHTML = '';
          if (nodes.length === 0) {
            treeList.innerHTML = '<div style="color:rgba(226,226,236,0.2);font-size:11px;">Nothing mapped yet - add the first insight above.</div>';
            return;
          }
          var tt = RPGACE.modules.taxonomyTree;
          nodes.forEach(function(node) {
            var row = document.createElement('div');
            row.style.cssText = 'padding:8px 10px;border:1px solid rgba(255,255,255,0.05);border-radius:6px;margin-bottom:6px;background:rgba(255,255,255,0.02);';
            var rankLbl = document.createElement('div');
            rankLbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(61,170,110,0.6);margin-bottom:2px;';
            rankLbl.textContent = (tt ? tt.rankNameForDepth(node.depth) : 'Depth ' + node.depth) + (node.node_type === 'leaf' ? ' · leaf' : '');
            var nameEl = document.createElement('div');
            nameEl.style.cssText = 'font-size:12px;font-weight:600;color:#D4DAF5;margin-bottom:6px;';
            nameEl.textContent = node.name;
            var artBtn = document.createElement('button');
            artBtn.textContent = '📄 Generate/Refresh Article';
            artBtn.style.cssText = 'padding:3px 8px;background:rgba(155,89,182,0.06);border:1px solid rgba(155,89,182,0.2);border-radius:5px;color:#9B6EC8;font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
            artBtn.onclick = function() { self.logic._generateArticle(node); };
            row.appendChild(rankLbl); row.appendChild(nameEl); row.appendChild(artBtn);
            treeList.appendChild(row);
          });
        }).catch(function(e) {
          treeList.innerHTML = '<div style="color:#CC4A4A;font-size:11px;">Load error: ' + e.message + '</div>';
        });
    },

    // ── Confirm/deny/modify checkpoint ──────────────────────────────────
    // July 15: was missing entirely - _placeInsight used to write straight
    // to taxonomy_tree the instant Oracle decided a placement, with zero
    // human checkpoint (every other proposal path in RPGACE has one). Same
    // editable-steps convention as taxonomyTree._showProposalPopup, but
    // scoped to what Phylum Path actually does - only ever appends new
    // steps below an attach point, never edits existing structure - so
    // there's no full-path editor, just the attach point (read-only) plus
    // the new steps (editable/removable/insertable).
    _showPlacementConfirm: function(phylumNumber, attachNode, newSteps, explainers, insightText, onAccept, onReject) {
      var tt = RPGACE.modules.taxonomyTree;
      var steps = (newSteps || []).slice();
      var expl = (explainers || []).slice();

      var pop = RPGACE.modules.dashDeck._popup({
        dim: '0.92', scroll: true, width: '520px', bg: '#0f0f1a', borderColor: 'rgba(61,170,110,0.3)',
        accent: 'rgba(61,170,110,0.6)', eyebrow: 'Phylum Path · Confirm Placement',
        title: RPGACE.utils.phylumLabel(phylumNumber), noDefaultClose: true,
      });
      var overlay = pop.overlay, box = pop.box;

      var attachLine = document.createElement('div');
      attachLine.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.5);margin-bottom:14px;line-height:1.6;padding:10px 12px;background:rgba(61,170,110,0.04);border-left:2px solid rgba(61,170,110,0.3);border-radius:0 6px 6px 0;';
      attachLine.innerHTML = attachNode
        ? '<strong style="color:rgba(226,226,236,0.75);">Attaching under:</strong> ' + attachNode.path
        : '<strong style="color:rgba(226,226,236,0.75);">Starting a new path</strong> from ' + (tt ? tt.PHYLUM_NAMES[phylumNumber] : 'the phylum root') + ' — no matching existing branch found.';
      box.appendChild(attachLine);

      var stepsContainer = document.createElement('div');
      stepsContainer.style.cssText = 'margin-bottom:16px;';
      var preview = document.createElement('div');
      preview.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.3);margin-bottom:16px;padding:8px 10px;background:rgba(255,255,255,0.02);border-radius:6px;';

      function updatePreview() {
        var base = attachNode ? attachNode.path : ((tt ? tt.PHYLUM_NAMES[phylumNumber] : ('Phylum ' + phylumNumber)));
        preview.textContent = base + (steps.length ? '/' + steps.join('/') : '');
      }

      function renderSteps() {
        stepsContainer.innerHTML = '';
        steps.forEach(function(step, i) {
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:8px 10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;';
          var depthLabel = document.createElement('span');
          depthLabel.style.cssText = 'font-size:11px;color:rgba(61,170,110,0.5);flex-shrink:0;min-width:16px;';
          depthLabel.textContent = (i + 1) + '.';
          var stepInput = document.createElement('input');
          stepInput.type = 'text'; stepInput.value = step;
          stepInput.style.cssText = 'flex:1;background:none;border:none;color:#D4DAF5;font-size:12px;font-family:Rajdhani,sans-serif;outline:none;';
          stepInput.oninput = function() { steps[i] = stepInput.value; updatePreview(); };
          var delBtn = document.createElement('button');
          delBtn.textContent = '×';
          delBtn.style.cssText = 'background:none;border:none;color:rgba(226,84,84,0.5);cursor:pointer;font-size:14px;flex-shrink:0;';
          delBtn.onclick = function() { steps.splice(i, 1); expl.splice(i, 1); renderSteps(); updatePreview(); };
          row.appendChild(depthLabel); row.appendChild(stepInput); row.appendChild(delBtn);
          stepsContainer.appendChild(row);
        });
        var addBtn = document.createElement('button');
        addBtn.textContent = '+ Insert step';
        addBtn.style.cssText = 'padding:5px 12px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:rgba(226,226,236,0.35);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
        addBtn.onclick = function() { steps.push('New step'); expl.push(''); renderSteps(); updatePreview(); };
        stepsContainer.appendChild(addBtn);
      }
      renderSteps();
      updatePreview();
      box.appendChild(stepsContainer);
      box.appendChild(preview);

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
      var acceptBtn = document.createElement('button');
      acceptBtn.textContent = '✓ Accept & Generate Content';
      acceptBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      acceptBtn.onclick = function() {
        if (!steps.length) { RPGACE.utils.toast('No steps left to place', '#CC4A4A', 2500); return; }
        overlay.remove();
        onAccept(steps, expl);
      };
      var rejectBtn = document.createElement('button');
      rejectBtn.textContent = '✗ Reject';
      rejectBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:8px;color:#CC4A4A;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      rejectBtn.onclick = function() { overlay.remove(); if (onReject) onReject(); };
      btnRow.appendChild(acceptBtn); btnRow.appendChild(rejectBtn);
      box.appendChild(btnRow);
    },

    // ══════════════════════════════════════════════════════════════════
    // Sep 25 2026 — real P1 build, curriculum-restructure spec (records/
    // 2026-09/taxonomy_curriculum_jargon_encyclopedia_merge_spec_2026-09-
    // 25.txt Section 9/11). Same real checkpoint discipline as
    // _showPlacementConfirm above (rule 4 — every taxonomy write gets a
    // human confirm before it commits), generalized from a flat chain to
    // a real nested TREE: a top-down curriculum proposal can branch
    // (several Classes under one Order, several leaves under one Class),
    // and Alex needs to see and edit the WHOLE proposed subtree at once —
    // "what the phylum path would look like when generated," his own
    // words — not one flat list.
    //
    // treeNodes: an array of root nodes, each {name, explainer, children}
    // (children optionally absent/empty — that's a real leaf). Mutated
    // in place as Alex edits, same idiom _showPlacementConfirm's own
    // steps/expl arrays already use. Accept calls
    // phylumPath.logic._insertTreeNodes (the real tree-aware sibling of
    // _insertNewSteps built alongside this).
    _showTreeConfirm: function(phylumNumber, attachNode, treeNodes, onAccept, onReject) {
      var tt = RPGACE.modules.taxonomyTree;
      var pop = RPGACE.modules.dashDeck._popup({
        dim: '0.92', scroll: true, width: '620px', bg: '#0f0f1a', borderColor: 'rgba(61,170,110,0.3)',
        accent: 'rgba(61,170,110,0.6)', eyebrow: 'Phylum Path · Confirm Curriculum Breakdown',
        title: RPGACE.utils.phylumLabel(phylumNumber), noDefaultClose: true,
      });
      var overlay = pop.overlay, box = pop.box;

      var attachLine = document.createElement('div');
      attachLine.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.5);margin-bottom:14px;line-height:1.6;padding:10px 12px;background:rgba(61,170,110,0.04);border-left:2px solid rgba(61,170,110,0.3);border-radius:0 6px 6px 0;';
      attachLine.innerHTML = attachNode
        ? '<strong style="color:rgba(226,226,236,0.75);">Attaching under:</strong> ' + attachNode.path
        : '<strong style="color:rgba(226,226,236,0.75);">Building from the phylum root:</strong> ' + (tt ? tt.PHYLUM_NAMES[phylumNumber] : ('Phylum ' + phylumNumber));
      box.appendChild(attachLine);

      var countLine = document.createElement('div');
      countLine.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.3);margin-bottom:14px;';
      box.appendChild(countLine);

      var treeContainer = document.createElement('div');
      treeContainer.style.cssText = 'margin-bottom:16px;max-height:50vh;overflow-y:auto;';
      box.appendChild(treeContainer);

      function countNodes(nodes) {
        var n = 0;
        (nodes || []).forEach(function(node) { n += 1 + countNodes(node.children); });
        return n;
      }
      function updateCount() {
        countLine.textContent = countNodes(treeNodes) + ' real node(s) in this proposed breakdown.';
      }

      // Real 2-click arm/confirm delete, same standing convention as
      // Bookworm's own 🗑 (Building Guide rule 8) — no heavy modal for a
      // single-node removal, but never a silent one-click delete either.
      function mkDeleteBtn(onConfirm) {
        var btn = document.createElement('button');
        btn.textContent = '🗑';
        btn.title = 'Delete this node and everything under it';
        btn.style.cssText = 'background:none;border:none;color:rgba(226,84,84,0.5);cursor:pointer;font-size:13px;flex-shrink:0;';
        var armed = false, armTimer = null;
        btn.onclick = function() {
          if (!armed) {
            armed = true; btn.textContent = 'Confirm?'; btn.style.color = '#CC4A4A'; btn.style.fontWeight = '700';
            armTimer = setTimeout(function() { armed = false; btn.textContent = '🗑'; btn.style.color = 'rgba(226,84,84,0.5)'; btn.style.fontWeight = 'normal'; }, 3000);
            return;
          }
          clearTimeout(armTimer);
          onConfirm();
        };
        return btn;
      }

      // Recursive renderer — one row per node, indented by real depth,
      // collapsible when it has children (default expanded, matching
      // Alex's own "make everything visually digestible" ask — a reader
      // should see the whole shape at once, collapse only what they
      // don't need right now).
      function renderNodes(nodes, container, depth) {
        container.innerHTML = '';
        nodes.forEach(function(node, i) {
          if (!node.children) node.children = [];
          var row = document.createElement('div');
          row.style.cssText = 'margin-left:' + (depth * 16) + 'px;margin-bottom:6px;';

          var head = document.createElement('div');
          head.style.cssText = 'display:flex;align-items:center;gap:6px;padding:7px 9px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;';

          var toggle = document.createElement('span');
          toggle.style.cssText = 'font-size:10px;color:rgba(61,170,110,0.6);flex-shrink:0;cursor:' + (node.children.length ? 'pointer' : 'default') + ';width:12px;';
          toggle.textContent = node.children.length ? (node._collapsed ? '▸' : '▾') : '·';
          var childWrap = document.createElement('div');
          toggle.onclick = function() {
            if (!node.children.length) return;
            node._collapsed = !node._collapsed;
            toggle.textContent = node._collapsed ? '▸' : '▾';
            childWrap.style.display = node._collapsed ? 'none' : 'block';
          };
          head.appendChild(toggle);

          var nameInput = document.createElement('input');
          nameInput.type = 'text'; nameInput.value = node.name || '';
          nameInput.placeholder = 'Node name';
          nameInput.style.cssText = 'flex:1;min-width:120px;background:none;border:none;color:#D4DAF5;font-size:12px;font-weight:700;font-family:Rajdhani,sans-serif;outline:none;';
          nameInput.oninput = function() { node.name = nameInput.value; };
          head.appendChild(nameInput);

          var explInput = document.createElement('input');
          explInput.type = 'text'; explInput.value = node.explainer || '';
          explInput.placeholder = 'Description...';
          explInput.style.cssText = 'flex:2;min-width:140px;background:none;border:none;color:rgba(226,226,236,0.5);font-size:11px;font-style:italic;font-family:Rajdhani,sans-serif;outline:none;';
          explInput.oninput = function() { node.explainer = explInput.value; };
          head.appendChild(explInput);

          var addChildBtn = document.createElement('button');
          addChildBtn.textContent = '+';
          addChildBtn.title = 'Add a child under this node';
          addChildBtn.style.cssText = 'background:none;border:1px solid rgba(61,170,110,0.25);border-radius:4px;color:#4CAF82;cursor:pointer;font-size:12px;font-weight:700;flex-shrink:0;width:20px;height:20px;line-height:1;';
          addChildBtn.onclick = function() {
            node.children.push({ name: 'New node', explainer: '', children: [] });
            node._collapsed = false;
            toggle.textContent = '▾';
            childWrap.style.display = 'block';
            renderNodes(node.children, childWrap, depth + 1);
            updateCount();
          };
          head.appendChild(addChildBtn);

          head.appendChild(mkDeleteBtn(function() {
            nodes.splice(i, 1);
            renderNodes(nodes, container, depth);
            updateCount();
          }));

          row.appendChild(head);

          childWrap.style.cssText = 'display:' + (node._collapsed ? 'none' : 'block') + ';';
          if (node.children.length) renderNodes(node.children, childWrap, depth + 1);
          row.appendChild(childWrap);

          container.appendChild(row);
        });

        var addRootBtn = document.createElement('button');
        addRootBtn.textContent = '+ Add ' + (depth === 0 ? 'root node' : 'sibling');
        addRootBtn.style.cssText = 'margin-left:' + (depth * 16) + 'px;padding:5px 12px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:rgba(226,226,236,0.35);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
        addRootBtn.onclick = function() {
          nodes.push({ name: 'New node', explainer: '', children: [] });
          renderNodes(nodes, container, depth);
          updateCount();
        };
        container.appendChild(addRootBtn);
      }

      renderNodes(treeNodes, treeContainer, 0);
      updateCount();

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
      var acceptBtn = document.createElement('button');
      acceptBtn.textContent = '✓ Accept & Build';
      acceptBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      acceptBtn.onclick = function() {
        if (!countNodes(treeNodes)) { RPGACE.utils.toast('No nodes left to build', '#CC4A4A', 2500); return; }
        overlay.remove();
        onAccept(treeNodes);
      };
      var rejectBtn = document.createElement('button');
      rejectBtn.textContent = '✗ Reject';
      rejectBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:8px;color:#CC4A4A;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      rejectBtn.onclick = function() { overlay.remove(); if (onReject) onReject(); };
      btnRow.appendChild(acceptBtn); btnRow.appendChild(rejectBtn);
      box.appendChild(btnRow);
    },

    // ══════════════════════════════════════════════════════════════════
    // Sep 25 2026 — real Phase 4 entry point (the "🌱 Generate Curriculum
    // Breakdown" button _injectPageShell now injects). Ties the whole
    // pilot together: generate (logic._generateCurriculumTree) → review
    // (this module's own _showTreeConfirm) → commit
    // (logic._insertTreeNodes) — three real, separately-built pieces,
    // wired here rather than merged into one function, so each stays
    // independently testable/reusable (rule 8 — _showTreeConfirm/
    // _insertTreeNodes have no idea this button exists, and shouldn't).
    _generateCurriculumBreakdown: function() {
      var self = RPGACE.modules.phylumPath;
      var phylumNumber = self.PHYLUM_NUM;
      RPGACE.utils.toast('🌱 Designing curriculum breakdown — this can take a moment...', '#4CAF82', 4000);
      self.logic._generateCurriculumTree(phylumNumber).then(function(tree) {
        if (!tree.length) { RPGACE.utils.toast('Oracle returned no real breakdown to review', '#CC4A4A', 3500); return; }
        self.ui._showTreeConfirm(phylumNumber, null, tree, function(finalTree) {
          self.logic._insertTreeNodes(phylumNumber, null, finalTree, { source: 'oracle', title: 'Curriculum breakdown' })
            .then(function() { self._loadNodesAndRender(self._focusNodeId); });
        });
      }).catch(function(e) {
        RPGACE.utils.toast('Error designing curriculum: ' + e.message, '#CC4A4A', 3500);
      });
    },

    // ══════════════════════════════════════════════════════════════════
    // Sep 25 2026 — Step C2's real UI, the tool Alex asked for directly
    // ("then we review archived to see what fits, what needs changing
    // and what needs removal"). One-item-at-a-time queue over that
    // phylum's archived leaves (logic._fetchArchivedLeafQueue) — a full
    // list of up to 75 rows at once (Phylum 1's real count) would be
    // overwhelming; a queue keeps each real decision focused. Editable
    // inline fields double as both "keep" (leave untouched) and "edit
    // then keep" (change first) — one action, not two buttons, since
    // the two are the same write with or without an edit first.
    // ══════════════════════════════════════════════════════════════════
    _showArchivedReviewQueue: function() {
      var self = RPGACE.modules.phylumPath;
      var phylumNumber = self.PHYLUM_NUM;
      self.logic._fetchArchivedLeafQueue(phylumNumber).then(function(queue) {
        if (!queue.length) { RPGACE.utils.toast('✅ Nothing archived left to review for this phylum', '#4CAF82', 3500); return; }
        var total = queue.length;
        var idx = 0;
        var kept = 0, discarded = 0;
        // Sep 25 2026 — real AI pre-triage (logic._pretriageArchivedBatch):
        // fetched in the background so the queue is usable immediately,
        // never blocking Alex's real review on a slow Oracle round-trip.
        // Empty until it resolves; renderCurrent below reads whatever's
        // there at the moment it's called, so a late-arriving suggestion
        // just shows up on the next render (including a re-render this
        // fetch triggers once it lands).
        var suggestions = {};
        self.logic._pretriageArchivedBatch(phylumNumber, queue).then(function(s) {
          suggestions = s;
          renderCurrent();
        }).catch(function() {});

        var pop = RPGACE.modules.dashDeck._popup({
          dim: '0.92', width: '560px', bg: '#0f0f1a', borderColor: 'rgba(201,168,76,0.3)',
          accent: 'rgba(201,168,76,0.6)', eyebrow: '🗄️ Reviewing archived jargon terms',
          title: RPGACE.utils.phylumLabel(phylumNumber), noDefaultClose: true,
        });
        var overlay = pop.overlay, box = pop.box;

        function renderCurrent() {
          box.innerHTML = '';
          if (idx >= queue.length) {
            var done = document.createElement('div');
            done.style.cssText = 'text-align:center;padding:20px 0;color:var(--text);';
            done.innerHTML = '<div style="font-size:14px;font-weight:700;margin-bottom:8px;">Review complete</div>'
              + '<div style="font-size:12px;color:var(--muted);">' + kept + ' kept · ' + discarded + ' discarded, out of ' + total + '</div>';
            box.appendChild(done);
            var closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close';
            closeBtn.style.cssText = 'width:100%;margin-top:14px;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
            closeBtn.onclick = function() { overlay.remove(); };
            box.appendChild(closeBtn);
            return;
          }
          var row = queue[idx];
          var progress = document.createElement('div');
          progress.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:10px;';
          progress.textContent = (idx + 1) + ' of ' + total + ' — ' + row.path;
          box.appendChild(progress);

          var sugg = suggestions[idx];
          var termInp, explInp;
          if (sugg) {
            var suggBox = document.createElement('div');
            suggBox.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.7);background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.2);border-radius:6px;padding:8px 10px;margin-bottom:10px;';
            var actionLabel = sugg.action === 'keep' ? '✓ KEEP' : (sugg.action === 'discard' ? '✗ DISCARD' : '✏️ EDIT');
            suggBox.innerHTML = '<strong style="color:var(--gold);">🤖 Suggested: ' + actionLabel + '</strong> — ' + String(sugg.reason || '').replace(/</g, '&lt;');
            if (sugg.action === 'edit' && sugg.suggestedTerm) {
              suggBox.innerHTML += '<div style="margin-top:4px;">→ "' + String(sugg.suggestedTerm).replace(/</g, '&lt;') + '"</div>';
              var useSuggBtn = document.createElement('button');
              useSuggBtn.textContent = 'Use this edit';
              useSuggBtn.style.cssText = 'margin-top:6px;padding:4px 10px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:5px;color:var(--gold);font-size:10.5px;cursor:pointer;font-family:Rajdhani,sans-serif;';
              useSuggBtn.onclick = function() {
                termInp.value = sugg.suggestedTerm || termInp.value;
                if (sugg.suggestedExplainer) explInp.value = sugg.suggestedExplainer;
              };
              suggBox.appendChild(useSuggBtn);
            }
            box.appendChild(suggBox);
          }

          termInp = document.createElement('input');
          termInp.type = 'text';
          termInp.value = row.name || '';
          termInp.style.cssText = 'width:100%;margin-bottom:8px;padding:8px 12px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700;';
          box.appendChild(termInp);

          var explInp = document.createElement('textarea');
          explInp.value = row.explainer || '';
          explInp.rows = 3;
          explInp.style.cssText = 'width:100%;margin-bottom:12px;padding:8px 12px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Rajdhani,sans-serif;font-size:12px;resize:vertical;';
          box.appendChild(explInp);

          var btnRow = document.createElement('div');
          btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
          var keepBtn = document.createElement('button');
          keepBtn.textContent = '✓ Keep (edit above first if needed)';
          keepBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
          keepBtn.onclick = function() {
            keepBtn.disabled = true; discardBtn.disabled = true;
            var editedTerm = termInp.value.trim() !== (row.name || '').trim() ? termInp.value.trim() : null;
            var editedExpl = explInp.value !== (row.explainer || '') ? explInp.value : null;
            self.logic._resolveArchivedLeaf(row, 'keep', editedTerm, editedExpl).then(function() {
              kept++; idx++; renderCurrent();
            });
          };
          var discardBtn = document.createElement('button');
          discardBtn.textContent = '✗ Discard';
          discardBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:8px;color:#CC4A4A;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
          discardBtn.onclick = function() {
            keepBtn.disabled = true; discardBtn.disabled = true;
            self.logic._resolveArchivedLeaf(row, 'discard').then(function() {
              discarded++; idx++; renderCurrent();
            });
          };
          btnRow.appendChild(keepBtn); btnRow.appendChild(discardBtn);
          box.appendChild(btnRow);

          var skipBtn = document.createElement('button');
          skipBtn.textContent = 'Skip for now (leave archived, ask again later)';
          skipBtn.style.cssText = 'width:100%;margin-top:8px;padding:6px;background:none;border:none;color:var(--muted);font-size:10.5px;cursor:pointer;font-family:Rajdhani,sans-serif;text-decoration:underline;';
          skipBtn.onclick = function() { idx++; renderCurrent(); };
          box.appendChild(skipBtn);
        }

        // Re-appended inside renderCurrent's own box.innerHTML='' reset
        // would wipe a one-time-appended close button, so it's built
        // once here and re-attached after every render instead.
        var closeX = document.createElement('button');
        closeX.textContent = '✕';
        closeX.style.cssText = 'position:absolute;top:14px;right:14px;background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;';
        closeX.onclick = function() { overlay.remove(); };
        box.style.position = 'relative';
        var _origRenderCurrent = renderCurrent;
        renderCurrent = function() { _origRenderCurrent(); box.appendChild(closeX); };

        renderCurrent();
      }).catch(function(e) {
        RPGACE.utils.toast('Error loading archived queue: ' + e.message, '#CC4A4A', 3500);
      });
    },

    // ══════════════════════════════════════════════════════════════════
    // Sep 25 2026 — real Step D counterpart to the archived-leaf queue
    // above: reviews jargon_encyclopedia rows a bulk generation pass
    // (logic._buildOutJargonEncyclopedia, or Claude Code's own direct
    // authorship — both tag their real source) left status='pending'.
    // Same queue-popup shape as _showArchivedReviewQueue (rule 8 — a
    // shared visual pattern, not a shared backend op, since this one
    // only ever touches jargon_encyclopedia's own status, never a
    // second table). Accept/edit-then-accept writes 'accepted' (Alex's
    // click IS the checkpoint); Reject writes 'rejected', kept for
    // audit, never deleted.
    // ══════════════════════════════════════════════════════════════════
    _showPendingTermsReviewQueue: function() {
      var self = RPGACE.modules.phylumPath;
      var phylumNumber = self.PHYLUM_NUM;
      RPGACE.sb.select('jargon_encyclopedia', 'phylum_number=eq.' + phylumNumber + '&status=eq.pending&order=term.asc&limit=500').then(function(queue) {
        queue = queue || [];
        if (!queue.length) { RPGACE.utils.toast('✅ No pending generated terms to review for this phylum', '#4CAF82', 3500); return; }
        var total = queue.length;
        var idx = 0;
        var accepted = 0, rejected = 0;

        var pop = RPGACE.modules.dashDeck._popup({
          dim: '0.92', width: '560px', bg: '#0f0f1a', borderColor: 'rgba(201,168,76,0.3)',
          accent: 'rgba(201,168,76,0.6)', eyebrow: '📋 Reviewing generated jargon terms',
          title: RPGACE.utils.phylumLabel(phylumNumber), noDefaultClose: true,
        });
        var overlay = pop.overlay, box = pop.box;

        function renderCurrent() {
          box.innerHTML = '';
          if (idx >= queue.length) {
            var done = document.createElement('div');
            done.style.cssText = 'text-align:center;padding:20px 0;color:var(--text);';
            done.innerHTML = '<div style="font-size:14px;font-weight:700;margin-bottom:8px;">Review complete</div>'
              + '<div style="font-size:12px;color:var(--muted);">' + accepted + ' accepted · ' + rejected + ' rejected, out of ' + total + '</div>';
            box.appendChild(done);
            var closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close';
            closeBtn.style.cssText = 'width:100%;margin-top:14px;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
            closeBtn.onclick = function() { overlay.remove(); };
            box.appendChild(closeBtn);
            return;
          }
          var row = queue[idx];
          var progress = document.createElement('div');
          progress.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:10px;';
          var srcType = (row.source && row.source[0] && row.source[0].type) || 'unknown';
          progress.textContent = (idx + 1) + ' of ' + total + ' — source: ' + srcType;
          box.appendChild(progress);

          var termInp = document.createElement('input');
          termInp.type = 'text';
          termInp.value = row.term || '';
          termInp.style.cssText = 'width:100%;margin-bottom:8px;padding:8px 12px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Rajdhani,sans-serif;font-size:13px;font-weight:700;';
          box.appendChild(termInp);

          var explInp = document.createElement('textarea');
          explInp.value = row.explainer || '';
          explInp.rows = 3;
          explInp.style.cssText = 'width:100%;margin-bottom:12px;padding:8px 12px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:Rajdhani,sans-serif;font-size:12px;resize:vertical;';
          box.appendChild(explInp);

          var btnRow = document.createElement('div');
          btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
          var acceptBtn = document.createElement('button');
          acceptBtn.textContent = '✓ Accept (edit above first if needed)';
          acceptBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
          acceptBtn.onclick = function() {
            acceptBtn.disabled = true; rejectBtn.disabled = true;
            var editedTerm = termInp.value.trim() !== (row.term || '').trim() ? termInp.value.trim() : null;
            var editedExpl = explInp.value !== (row.explainer || '') ? explInp.value : null;
            self.logic._resolvePendingTerm(row, 'accept', editedTerm, editedExpl).then(function() {
              accepted++; idx++; renderCurrent();
            });
          };
          var rejectBtn = document.createElement('button');
          rejectBtn.textContent = '✗ Reject';
          rejectBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:8px;color:#CC4A4A;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
          rejectBtn.onclick = function() {
            acceptBtn.disabled = true; rejectBtn.disabled = true;
            self.logic._resolvePendingTerm(row, 'reject').then(function() {
              rejected++; idx++; renderCurrent();
            });
          };
          btnRow.appendChild(acceptBtn); btnRow.appendChild(rejectBtn);
          box.appendChild(btnRow);

          var skipBtn = document.createElement('button');
          skipBtn.textContent = 'Skip for now (leave pending, ask again later)';
          skipBtn.style.cssText = 'width:100%;margin-top:8px;padding:6px;background:none;border:none;color:var(--muted);font-size:10.5px;cursor:pointer;font-family:Rajdhani,sans-serif;text-decoration:underline;';
          skipBtn.onclick = function() { idx++; renderCurrent(); };
          box.appendChild(skipBtn);
        }

        var closeX = document.createElement('button');
        closeX.textContent = '✕';
        closeX.style.cssText = 'position:absolute;top:14px;right:14px;background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;';
        closeX.onclick = function() { overlay.remove(); };
        box.style.position = 'relative';
        var _origRenderCurrent2 = renderCurrent;
        renderCurrent = function() { _origRenderCurrent2(); box.appendChild(closeX); };

        renderCurrent();
      }).catch(function(e) {
        RPGACE.utils.toast('Error loading pending terms: ' + e.message, '#CC4A4A', 3500);
      });
    },

    // Confirm/deny popup shown between article generation and saving - same
    // checkpoint pattern as _showPlacementConfirm, just simpler (nothing to
    // edit, an article is either worth keeping or it isn't). Approve saves
    // to Encyclopedia + links taxonomy_node_id + fires the existing Concept
    // Fusion pass; Deny discards and does nothing.
    _showArticleConfirm: function(node, articleTitle, text, onApprove, onDeny) {
      var pop = RPGACE.modules.dashDeck._popup({
        dim: '0.92', scroll: true, width: '560px', bg: '#0f0f1a', borderColor: 'rgba(155,89,182,0.3)',
        accent: 'rgba(155,89,182,0.6)', eyebrow: 'Phylum Path · Confirm Article',
        title: articleTitle, noDefaultClose: true,
      });
      var overlay = pop.overlay, box = pop.box;

      var body = document.createElement('div');
      body.style.cssText = 'white-space:pre-wrap;font-size:12px;color:rgba(226,226,236,0.75);line-height:1.7;background:rgba(155,89,182,0.04);border:1px solid rgba(155,89,182,0.15);border-radius:8px;padding:14px;margin-bottom:16px;';
      body.textContent = text;
      box.appendChild(body);

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
      var approveBtn = document.createElement('button');
      approveBtn.textContent = '✓ Save to Encyclopedia';
      approveBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      approveBtn.onclick = function() { overlay.remove(); onApprove(); };
      var denyBtn = document.createElement('button');
      denyBtn.textContent = '✗ Discard';
      denyBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(226,84,84,0.2);border-radius:8px;color:#CC4A4A;font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      denyBtn.onclick = function() { overlay.remove(); if (onDeny) onDeny(); };
      btnRow.appendChild(approveBtn); btnRow.appendChild(denyBtn);
      box.appendChild(btnRow);
    },

    // ══════════════════════════════════════════════════════════════════
    // PHASE 2 (July 15): dedicated nav tab, Linnaean drill-down browsing.
    // Confirmed decisions: Phylum 1 only (not all 21 with placeholders),
    // articles are lazy-generated + cached (not auto-regenerated), Circles
    // (the old "rabbit-hole nav" idea, previously deferred pending a
    // Research-tab declutter) folds straight into this instead of getting
    // its own build - sibling browsing at any level IS the rabbit-hole
    // concept, finally given a real home. Direct-from-chat placement
    // deliberately held back this pass. Insight-adding still happens via
    // the existing side panel / auto-detect badge / highlight-select -
    // this tab is for browsing + reading, not a duplicate entry point.
    // ══════════════════════════════════════════════════════════════════
    _injectNavTab: function() {
      if (document.getElementById('phylum-path-nav-tab')) return;
      var self = RPGACE.modules.phylumPath;
      var tabs = document.querySelector('.nav-tabs');
      if (!tabs) return;
      var btn = document.createElement('button');
      btn.id = 'phylum-path-nav-tab';
      btn.className = 'nav-tab';
      btn.textContent = '🧬 Phylum Path';
      btn.onclick = function() { showPage(RPGACE.CONFIG.pages.phylumPath, btn); };
      tabs.appendChild(btn);
    },

    _injectPageShell: function() {
      if (document.getElementById('page-' + RPGACE.CONFIG.pages.phylumPath)) return;
      var self = RPGACE.modules.phylumPath;
      var app = document.getElementById('app');
      if (!app) return;
      var page = document.createElement('div');
      page.className = 'page';
      page.id = 'page-' + RPGACE.CONFIG.pages.phylumPath;
      page.innerHTML =
        '<div class="section-title" id="pp-phylum-title">🧬 Phylum Path</div>' +
        '<div id="pp-phylum-switcher" style="margin-bottom:10px;"></div>' +
        '<div id="pp-breadcrumb" style="margin-bottom:10px;"></div>' +
        '<div id="pp-siblings" style="margin-bottom:14px;"></div>' +
        '<div id="pp-shelf" style="margin-bottom:14px;"></div>' + // LL-7: what's gathered on this shelf
        '<div id="pp-body"></div>';
      app.appendChild(page);
      // Switcher only shows once there's more than one enabled phylum.
      if (self.ENABLED_PHYLA.length > 1) {
        document.getElementById('pp-phylum-switcher').appendChild(self.ui._renderPhylumSwitcher());
        if (RPGACE.modules.lifeLibrary) RPGACE.modules.lifeLibrary.ui.renderSwitcherCounts(); // LL-7
      }
      // Sep 25 2026 — real Phase 4 entry point, curriculum-restructure
      // spec (records/2026-09/taxonomy_curriculum_jargon_encyclopedia_
      // merge_spec_2026-09-25.txt Section 13). This page shell only ever
      // builds once — the early-return guard above — manual-trigger-only
      // per the module's own standing convention (no auto-fire on a real
      // Oracle curriculum-design call). Sep 26 2026 — jargonEncyclopedia
      // no longer injects a button here (see that module's own header
      // comment); this is now the ONLY button on this title.
      var titleEl = document.getElementById('pp-phylum-title');
      if (titleEl && titleEl.parentNode && !document.getElementById('pp-gen-curriculum-btn')) {
        var genBtn = document.createElement('button');
        genBtn.id = 'pp-gen-curriculum-btn'; genBtn.className = 'tax-dormant-hide';
        genBtn.textContent = '🌱 Generate Curriculum Breakdown';
        genBtn.style.cssText = 'margin-bottom:10px;margin-left:8px;padding:6px 14px;background:var(--panel2);border:1px solid var(--border);border-radius:8px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;display:inline-block;';
        genBtn.onclick = function() { self.ui._generateCurriculumBreakdown(); };
        titleEl.insertAdjacentElement('afterend', genBtn);
      }
      // Sep 26 2026 — real Alex ask ("taxonomy dom way better in structure"):
      // the "🗄️ Review Archived Terms" and "📋 Review Pending Terms" buttons
      // that used to crowd this title (Sep 25) are REMOVED from here.
      // Archived-terms review is genuinely dead right now (taxonomy_tree is
      // a real 0-row table since the same-day full wipe — nothing to
      // review), and pending-terms review is superseded by the new,
      // real standalone Jargon Encyclopedia page (browse all 520 terms,
      // status badges, inline Accept/Edit/Reject) — reached via leftNav's
      // Phylum Path subItem or the Taxonomy dashboard card's picker, not a
      // button on this title anymore. Neither underlying function
      // (_showArchivedReviewQueue/_showPendingTermsReviewQueue/
      // _resolvePendingTerm) was deleted — kept on disk, same "harmless
      // unused" precedent as dashDeck._openResearch; _resolvePendingTerm
      // is still real and live, called cross-module from the new Jargon
      // Encyclopedia page.
    },

    // Fetches (fresh every render - cache-bust already covers writes) the
    // full Phylum 1 node set once per render pass, rather than once per
    // helper function, to avoid N redundant selects while building one view.
    //
    // Aug 11 2026 — real bug found and fixed (Alex's own report: clicking
    // any Order row just re-showed the exact same root-level view every
    // time, unchanged). Real root cause: this function had no protection
    // against overlapping calls. Every child row/breadcrumb/sibling chip
    // click calls this directly (never through showPage), but
    // init()'s own 'page:show' listener ALSO calls
    // `self._loadNodesAndRender(self._focusNodeId)` independently — if
    // that fires again (a real page:show re-fire is a documented class
    // of bug in this exact codebase, CLAUDE.md's own hooks.fire()
    // landmine) while a row-click's own fetch is still in flight, both
    // calls race, and whichever Supabase response resolves LAST wins —
    // even if it's the stale, older one (e.g. a page:show re-fire
    // reading the OLD self._focusNodeId before the click's own
    // synchronous assignment lands). A real generation token closes the
    // whole class of "stale async response clobbers a fresher one," not
    // just one specific trigger of it — the fresher call always wins,
    // no matter which of several possible sources fired the older one.
    _loadNodesAndRender: function(focusId) {
      var self = RPGACE.modules.phylumPath;
      self._focusNodeId = focusId;
      var myGen = ++self._renderGeneration;
      var body = document.getElementById('pp-body');
      if (body) body.innerHTML = '<div style="color:rgba(226,226,236,0.25);font-size:12px;">Loading...</div>';
      // LL-7: the phylum's shelf (Library items, idea cards, jargon), shown
      // only at the phylum root, not while drilled into a node.
      var shelf = document.getElementById('pp-shelf'), ll = RPGACE.modules.lifeLibrary;
      if (shelf) { shelf.dataset.num = self.PHYLUM_NUM; if (focusId) shelf.innerHTML = ''; else if (ll) ll.ui.renderShelf(self.PHYLUM_NUM); }

      RPGACE.sb.select('taxonomy_tree', 'phylum_number=eq.' + self.PHYLUM_NUM + '&order=path.asc')
        .then(function(nodes) {
          if (myGen !== self._renderGeneration) return; // a newer render already started - discard this stale one
          self.ui._renderDrillDown(nodes || [], focusId);
        }).catch(function(e) {
          if (myGen !== self._renderGeneration) return;
          if (body) body.innerHTML = '<div style="color:#CC4A4A;font-size:12px;">Load error: ' + e.message + '</div>';
        });
    },

    _renderDrillDown: function(allNodes, focusId) {
      var self = RPGACE.modules.phylumPath;
      var tt = RPGACE.modules.taxonomyTree;
      var focus = focusId ? allNodes.find(function(n) { return n.id === focusId; }) : null;

      // ── Breadcrumb: walk parent_id chain from focus up to root ──
      var crumb = document.getElementById('pp-breadcrumb');
      if (crumb) {
        crumb.innerHTML = '';
        var chain = [];
        var walk = focus;
        while (walk) {
          chain.unshift(walk);
          walk = walk.parent_id ? allNodes.find(function(n) { return n.id === walk.parent_id; }) : null;
        }
        var rootCrumb = document.createElement('span');
        rootCrumb.textContent = (tt ? tt.PHYLUM_NAMES[self.PHYLUM_NUM] : 'Phylum ' + self.PHYLUM_NUM);
        rootCrumb.style.cssText = 'cursor:pointer;color:' + (!focus ? '#4CAF82;font-weight:700;' : 'rgba(61,170,110,0.6);') + 'font-size:12px;';
        rootCrumb.onclick = function() { self.ui._loadNodesAndRender(null); };
        crumb.appendChild(rootCrumb);
        chain.forEach(function(n, i) {
          var sep = document.createElement('span');
          sep.textContent = ' › ';
          sep.style.cssText = 'color:rgba(226,226,236,0.25);font-size:12px;';
          crumb.appendChild(sep);
          var seg = document.createElement('span');
          seg.textContent = n.name;
          var isLast = (i === chain.length - 1);
          seg.style.cssText = 'cursor:pointer;color:' + (isLast ? '#4CAF82;font-weight:700;' : 'rgba(61,170,110,0.6);') + 'font-size:12px;';
          seg.onclick = function() { self.ui._loadNodesAndRender(n.id); };
          crumb.appendChild(seg);
        });
        // Explicit "up one level" affordance - previously the only way back
        // was clicking a specific breadcrumb word, easy to miss (especially
        // on mobile). Real gap found hand-testing the drill-down live.
        if (focus) {
          var backBtn = document.createElement('button');
          backBtn.textContent = '⬅ Back';
          backBtn.style.cssText = 'display:block;margin-top:8px;padding:5px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.6);font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
          backBtn.onclick = function() { self.ui._loadNodesAndRender(focus.parent_id || null); };
          crumb.appendChild(backBtn);
        }
      }

      // ── Siblings ("scope" — Circles' rabbit-hole concept, browse ──
      // ── sideways without changing depth) ─────────────────────────
      var sibWrap = document.getElementById('pp-siblings');
      if (sibWrap) {
        sibWrap.innerHTML = '';
        var parentId = focus ? focus.parent_id : null;
        var siblings = allNodes.filter(function(n) {
          return focus ? n.parent_id === parentId && n.id !== focus.id : false;
        });
        if (focus && siblings.length) {
          var lbl = document.createElement('div');
          lbl.textContent = 'Other ' + (tt ? tt.rankNameForDepth(focus.depth) : 'items') + ' here:';
          lbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(226,226,236,0.3);margin-bottom:6px;';
          sibWrap.appendChild(lbl);
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
          siblings.forEach(function(s) {
            var chip = document.createElement('button');
            chip.textContent = s.name;
            chip.style.cssText = 'padding:4px 10px;background:rgba(61,170,110,0.06);border:1px solid rgba(61,170,110,0.2);border-radius:12px;color:#4CAF82;font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
            chip.onclick = function() { self.ui._loadNodesAndRender(s.id); };
            row.appendChild(chip);
          });
          sibWrap.appendChild(row);
        }
      }

      // ── Body: purpose line + children list, or leaf content ──────
      var body = document.getElementById('pp-body');
      if (!body) return;
      body.innerHTML = '';

      var purposeLine = document.createElement('div');
      purposeLine.textContent = focus ? (focus.explainer || '') : RPGACE.utils.phylumContext(self.PHYLUM_NUM);
      purposeLine.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.5);margin-bottom:14px;line-height:1.6;border-left:2px solid rgba(61,170,110,0.3);padding-left:10px;';
      if (purposeLine.textContent) body.appendChild(purposeLine);

      body.appendChild(self.ui._articleSection(focus));

      if (focus) {
        var linksWrap = document.createElement('div');
        linksWrap.id = 'pp-links-' + focus.id;
        body.appendChild(linksWrap);
        self.ui._renderFusionLinks(focus, linksWrap);
      }

      var children = allNodes.filter(function(n) {
        return focus ? n.parent_id === focus.id : n.parent_id === null;
      });

      if (children.length) {
        var childLbl = document.createElement('div');
        childLbl.textContent = focus ? 'Drill in' : 'Orders';
        childLbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.4);margin:16px 0 8px;';
        body.appendChild(childLbl);
        children.forEach(function(c) {
          var row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid rgba(255,255,255,0.06);border-radius:8px;margin-bottom:6px;cursor:pointer;background:rgba(255,255,255,0.02);';
          var left = document.createElement('div');
          var rankLbl = document.createElement('div');
          rankLbl.textContent = (tt ? tt.rankNameForDepth(c.depth) : 'Depth ' + c.depth) + (c.node_type === 'leaf' ? ' · leaf' : '');
          rankLbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(61,170,110,0.6);';
          var nameLbl = document.createElement('div');
          nameLbl.textContent = c.name;
          nameLbl.style.cssText = 'font-size:13px;font-weight:600;color:#D4DAF5;';
          left.appendChild(rankLbl); left.appendChild(nameLbl);
          var arrow = document.createElement('span');
          arrow.textContent = '→';
          arrow.style.cssText = 'color:rgba(61,170,110,0.5);font-size:14px;';
          row.appendChild(left); row.appendChild(arrow);
          row.onclick = function() { self.ui._loadNodesAndRender(c.id); };
          body.appendChild(row);
        });
      } else if (focus && focus.node_type === 'leaf') {
        var deep = (focus.deep_content && focus.deep_content.generated) ? focus.deep_content.generated : '';
        if (deep) {
          var deepBox = document.createElement('div');
          deepBox.style.cssText = 'white-space:pre-wrap;font-size:12px;color:rgba(226,226,236,0.7);line-height:1.7;background:rgba(255,255,255,0.02);border-radius:8px;padding:14px;margin-top:12px;';
          deepBox.textContent = deep;
          body.appendChild(deepBox);
        }
      }
    },

    // ── Lazy + cached article view: checks Encyclopedia (via ──────────
    // ── taxonomy_node_id) for an existing article before ever calling ──
    // ── Oracle - only regenerates on explicit "Refresh" tap. Reuses    ──
    // ── _generateArticle()/saveOracleToEncyclopedia()'s existing       ──
    // ── upsert-on-title behavior, no new storage or column needed.     ──
    _articleSection: function(focus) {
      var self = RPGACE.modules.phylumPath;
      var wrap = document.createElement('div');
      wrap.id = 'pp-article-' + (focus ? focus.id : 'root');
      wrap.style.cssText = 'margin-bottom:6px;';

      var renderButton = function(label, cached) {
        wrap.innerHTML = '';
        if (cached) {
          var box = document.createElement('div');
          box.style.cssText = 'white-space:pre-wrap;font-size:12px;color:rgba(226,226,236,0.75);line-height:1.7;background:rgba(155,89,182,0.04);border:1px solid rgba(155,89,182,0.15);border-radius:8px;padding:14px;margin-bottom:8px;';
          box.textContent = cached;
          wrap.appendChild(box);
        }
        var btn = document.createElement('button');
        btn.textContent = label;
        btn.className = 'tax-dormant-hide';
        btn.style.cssText = 'padding:6px 14px;background:rgba(155,89,182,0.08);border:1px solid rgba(155,89,182,0.25);border-radius:6px;color:#9B6EC8;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
        btn.onclick = function() {
          btn.disabled = true; btn.textContent = '⏳ Generating...';
          self.logic._generateArticle(focus).then(function() {
            // saveOracleToEncyclopedia() (main.js) writes via a raw fetch,
            // not RPGACE.sb.insert/update - the cache-busting wrapper never
            // fires for it, so the just-written row could show stale for up
            // to 60s on the immediate re-check below without this.
            RPGACE.cache.clear('encyclopedia');
            self.ui._loadNodesAndRender(self._focusNodeId);
          });
        };
        wrap.appendChild(btn);
      };

      if (!focus) {
        renderButton('📄 Generate Phylum-Level Article', null);
        return wrap;
      }

      var title = focus.name + ' — ' + (RPGACE.modules.taxonomyTree ? RPGACE.modules.taxonomyTree.rankNameForDepth(focus.depth) : 'Node') + ' Reference';
      RPGACE.sb.select('encyclopedia', 'taxonomy_node_id=eq.' + focus.id + '&limit=1')
        .then(function(rows) {
          if (rows && rows[0]) renderButton('🔄 Refresh Article', rows[0].content);
          else renderButton('📄 Generate/Refresh Article', null);
        }).catch(function() { renderButton('📄 Generate/Refresh Article', null); });

      return wrap;
    },

    // ── Fusion links for the focused node - confirmed cross-taxonomy       ──
    // ── connections (see _findFusionLinks above). Rendered symmetrically   ──
    // ── from either side of a link since taxonomy_links doesn't privilege  ──
    // ── node_a over node_b - whichever node you're looking at, the OTHER   ──
    // ── one is what gets shown. Every link is now clickable (July 17 -     ──
    // ── previously only same-phylum links were, cross-phylum ones just    ──
    // ── displayed inert) and opens the interlink article popup below       ──
    // ── instead of jumping straight there, so the connection itself gets   ──
    // ── explained before you navigate away from either side.               ──
    _renderFusionLinks: function(focus, wrap) {
      var self = RPGACE.modules.phylumPath;
      wrap.innerHTML = '';
      RPGACE.sb.select('taxonomy_links', 'status=eq.confirmed&or=(node_a_id.eq.' + focus.id + ',node_b_id.eq.' + focus.id + ')')
        .then(function(links) {
          links = links || [];
          if (!links.length) return;
          var otherIds = links.map(function(l) { return l.node_a_id === focus.id ? l.node_b_id : l.node_a_id; });
          return RPGACE.sb.select('taxonomy_tree', 'id=in.(' + otherIds.join(',') + ')&select=id,name,path,phylum_number,explainer').then(function(nodes) {
            var byId = {};
            (nodes || []).forEach(function(n) { byId[n.id] = n; });
            var tt = RPGACE.modules.taxonomyTree;

            var lbl = document.createElement('div');
            lbl.textContent = '🔗 Fusion connections';
            lbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(52,152,219,0.6);margin:14px 0 8px;';
            wrap.appendChild(lbl);

            links.forEach(function(l) {
              var otherId = l.node_a_id === focus.id ? l.node_b_id : l.node_a_id;
              var other = byId[otherId];
              if (!other) return;
              var row = document.createElement('div');
              row.style.cssText = 'padding:10px 12px;margin-bottom:6px;background:rgba(52,152,219,0.05);border:1px solid rgba(52,152,219,0.15);border-radius:8px;cursor:pointer;';

              var phName = tt ? (tt.PHYLUM_NAMES[other.phylum_number] || ('Phylum ' + other.phylum_number)) : ('Phylum ' + other.phylum_number);
              var pathEl = document.createElement('div');
              pathEl.style.cssText = 'font-size:11px;font-weight:600;color:#3498DB;margin-bottom:3px;';
              pathEl.textContent = '[' + phName + '] ' + other.path;
              row.appendChild(pathEl);

              if (l.link_insight) {
                var insightEl = document.createElement('div');
                insightEl.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.55);font-style:italic;';
                insightEl.textContent = l.link_insight;
                row.appendChild(insightEl);
              }

              row.onclick = function() { self.ui._showLinkArticle(l, focus, other); };
              wrap.appendChild(row);
            });
          });
        }).catch(function() {});
    },

    // Jumps the nav-tab page to a specific node, switching phylum first if
    // needed - shared by the interlink popup's two exit buttons below.
    _jumpToNode: function(node) {
      var self = RPGACE.modules.phylumPath;
      if (node.phylum_number !== self.PHYLUM_NUM) {
        self.ui._switchPhylum(node.phylum_number, node.id);
      } else {
        self.ui._loadNodesAndRender(node.id);
      }
    },

    // Popup shown when a fusion-connection row is clicked - the interlink
    // article itself (cached or generate-on-demand), plus 2 exit buttons
    // jumping into either source node's own location, per the explicit ask
    // that a fusion article should have "an exit button into both parent
    // folders it is made from."
    _showLinkArticle: function(link, focus, other) {
      var self = RPGACE.modules.phylumPath;
      var pop = RPGACE.modules.dashDeck._popup({
        dim: '0.92', scroll: true, width: '560px', bg: '#0f0f1a', borderColor: 'rgba(52,152,219,0.3)',
        accent: 'rgba(52,152,219,0.6)', eyebrow: '🔗 Fusion Connection',
        title: focus.name + ' ↔ ' + other.name, noDefaultClose: true,
      });
      var overlay = pop.overlay, box = pop.box;

      if (link.link_insight) {
        var insight = document.createElement('div');
        insight.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.5);font-style:italic;margin-bottom:14px;';
        insight.textContent = link.link_insight;
        box.appendChild(insight);
      }

      var articleWrap = document.createElement('div');
      articleWrap.style.cssText = 'margin-bottom:16px;';
      box.appendChild(articleWrap);

      var renderArticleBox = function(label, cached) {
        articleWrap.innerHTML = '';
        if (cached) {
          var cbox = document.createElement('div');
          cbox.style.cssText = 'white-space:pre-wrap;font-size:12px;color:rgba(226,226,236,0.75);line-height:1.7;background:rgba(52,152,219,0.05);border:1px solid rgba(52,152,219,0.15);border-radius:8px;padding:14px;margin-bottom:8px;';
          cbox.textContent = cached;
          articleWrap.appendChild(cbox);
        }
        var genBtn = document.createElement('button');
        genBtn.textContent = label;
        genBtn.style.cssText = 'padding:6px 14px;background:rgba(52,152,219,0.08);border:1px solid rgba(52,152,219,0.25);border-radius:6px;color:#3498DB;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
        genBtn.onclick = function() {
          genBtn.disabled = true; genBtn.textContent = '⏳ Generating...';
          self.logic._generateLinkArticle(link, focus, other).then(function(text) {
            renderArticleBox('🔄 Refresh Interlink Article', text);
          }).catch(function(e) {
            RPGACE.utils.toast('Error generating interlink article: ' + e.message, '#CC4A4A', 3500);
            genBtn.disabled = false; genBtn.textContent = label;
          });
        };
        articleWrap.appendChild(genBtn);
      };
      renderArticleBox(link.link_article && link.link_article.generated ? '🔄 Refresh Interlink Article' : '📄 Generate Interlink Article', link.link_article ? link.link_article.generated : null);

      var exitLbl = document.createElement('div');
      exitLbl.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(226,226,236,0.35);margin-bottom:6px;';
      exitLbl.textContent = 'Exit into either side this is made from';
      box.appendChild(exitLbl);

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
      var focusBtn = document.createElement('button');
      focusBtn.textContent = '↳ ' + focus.name;
      focusBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);border-radius:8px;color:#4CAF82;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      focusBtn.onclick = function() { overlay.remove(); self.ui._jumpToNode(focus); };
      var otherBtn = document.createElement('button');
      otherBtn.textContent = '↳ ' + other.name;
      otherBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);border-radius:8px;color:#4CAF82;font-size:11px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      otherBtn.onclick = function() { overlay.remove(); self.ui._jumpToNode(other); };
      btnRow.appendChild(focusBtn); btnRow.appendChild(otherBtn);
      box.appendChild(btnRow);

      var closeBtn = document.createElement('button');
      closeBtn.textContent = '✗ Close';
      closeBtn.style.cssText = 'display:block;margin-top:10px;padding:8px 16px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(226,226,236,0.4);font-size:11px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      closeBtn.onclick = function() { overlay.remove(); };
      box.appendChild(closeBtn);
    },

  },

  // ============================================================
  // Thin top-level pass-throughs — one for every moved function, so the
  // module object exposes exactly the same method names it did before this
  // split. `this` here is always the module itself: every real call site
  // invokes these as a property access on RPGACE.modules.phylumPath (or on a
  // `var pp = RPGACE.modules.phylumPath;` local alias, this codebase's own
  // established idiom), never as a detached function reference.
  //
  // phylumPath is by far the most externally-reached of the four G53 pilot
  // modules. A fresh repo-wide grep (not the briefed list taken on trust)
  // confirms 11 real members are reached from outside the module, across two
  // idioms — `RPGACE.modules.phylumPath.X` and the `pp.X` local alias:
  //   • ENABLED_PHYLA          <- taxonomyTree's phylum sweep, + 7 pp.* sites
  //   • MECHANICAL_MODEL       <- 3 pp.* mechanical-tier callers
  //   • isEnabled              <- taxonomyTree's proposeLineage/silentPropose
  //   • decidePlacement        <- the same two, via the back-compat wrapper
  //   • decidePlacementScored  <- bookworm's chapter cascade
  //   • _callGroundWorkerJSON  <- 6 pp.* sites (the most-reused helper)
  //   • _callGroundWorkerText  <- ciAutoPropose + 2 pp.* sites
  //   • _condenseIfLarge       <- bookworm's _analyzeChapter
  //   • _insertNewSteps        <- 5 pp.* sites (taxonomyReviewQueue, bookworm)
  //   • _showPlacementConfirm  <- 2 pp.* review-queue sites
  //   • resumeFallbackPlacement<- bookworm + taxonomyTree fallback resume
  // Two of those (ENABLED_PHYLA, MECHANICAL_MODEL) are plain data and stay
  // at module scope untouched; the other nine are covered by the
  // pass-throughs below. Every other moved function gets one too, matching
  // the convention the first three pilot modules already set.
  //
  // Also verified, since a property-name reach is easy to miss (bookworm's
  // own split found two): the generated METHOD_MODULE_MAP near the foot of
  // this file resolves a method name to its owning module by NAME, so the
  // pass-throughs keep every phylumPath entry in it resolving correctly —
  // the nested copy and the pass-through are both phylumPath, so no new
  // ambiguity is introduced. There is no dashDeck.PAGE_PANELS `ensure:` hook
  // or dashDeck.MODULES `go:` string pointing at any phylumPath method
  // (checked directly); the only string-keyed 'phylumPath' outside this
  // module is RPGACE.CONFIG.pages.phylumPath, a page id, not a method reach.
  // ============================================================
  isEnabled: function(phylumNumber) { return this.logic.isEnabled(phylumNumber); },
  _isCreditExhaustionError: function(msg) { return this.logic._isCreditExhaustionError(msg); },
  _queueFallback: function(prompt, tier, maxTokens, model, context) { return this.logic._queueFallback(prompt, tier, maxTokens, model, context); },
  _callExtractor: function(prompt, maxTokens, context) { return this.logic._callExtractor(prompt, maxTokens, context); },
  _callGroundWorkerJSON: function(prompt, maxTokens, model, context) { return this.logic._callGroundWorkerJSON(prompt, maxTokens, model, context); },
  _callGroundWorkerText: function(prompt, maxTokens, model, context) { return this.logic._callGroundWorkerText(prompt, maxTokens, model, context); },
  _condenseIfLarge: function(text, context) { return this.logic._condenseIfLarge(text, context); },
  _checkFallbackAnswers: function() { return this.logic._checkFallbackAnswers(); },
  decidePlacementScored: function(insightText, phylumNumber, priorLeaves, fallbackContext) { return this.logic.decidePlacementScored(insightText, phylumNumber, priorLeaves, fallbackContext); },
  _generateCurriculumTree: function(phylumNumber) { return this.logic._generateCurriculumTree(phylumNumber); },
  _resolvePlacementDecision: function(parsed, phylumNumber, existing) { return this.logic._resolvePlacementDecision(parsed, phylumNumber, existing); },
  resumeFallbackPlacement: function(rawAnswerText, phylumNumber) { return this.logic.resumeFallbackPlacement(rawAnswerText, phylumNumber); },
  sanitizePlacement: function(attachPath, attachDepth, newSteps) { return this.logic.sanitizePlacement(attachPath, attachDepth, newSteps); },
  decidePlacement: function(insightText, phylumNumber, fallbackContext) { return this.logic.decidePlacement(insightText, phylumNumber, fallbackContext); },
  _placeInsight: function(insightText, phylumNumber) { return this.logic._placeInsight(insightText, phylumNumber); },
  _insertNewSteps: function(phylumNumber, attachNode, newSteps, explainers, insightText, sourceMeta) { return this.logic._insertNewSteps(phylumNumber, attachNode, newSteps, explainers, insightText, sourceMeta); },
  _insertTreeNodes: function(phylumNumber, attachNode, treeNodes, sourceMeta) { return this.logic._insertTreeNodes(phylumNumber, attachNode, treeNodes, sourceMeta); },
  _fetchArchivedLeafQueue: function(phylumNumber) { return this.logic._fetchArchivedLeafQueue(phylumNumber); },
  _resolveArchivedLeaf: function(row, action, editedTerm, editedExplainer) { return this.logic._resolveArchivedLeaf(row, action, editedTerm, editedExplainer); },
  _pretriageArchivedBatch: function(phylumNumber, leaves) { return this.logic._pretriageArchivedBatch(phylumNumber, leaves); },
  _generateJargonTermsBatch: function(phylumNumber, existingTerms, count) { return this.logic._generateJargonTermsBatch(phylumNumber, existingTerms, count); },
  _buildOutJargonEncyclopedia: function(perPhylumTarget, batchCap, sourceTag) { return this.logic._buildOutJargonEncyclopedia(perPhylumTarget, batchCap, sourceTag); },
  _resolvePendingTerm: function(row, action, editedTerm, editedExplainer) { return this.logic._resolvePendingTerm(row, action, editedTerm, editedExplainer); },
  _showPendingTermsReviewQueue: function() { return this.ui._showPendingTermsReviewQueue(); },
  _findFusionLinks: function(node, phylumNumber) { return this.logic._findFusionLinks(node, phylumNumber); },
  _generateInsightContent: function(node, phylumNumber, insightText) { return this.logic._generateInsightContent(node, phylumNumber, insightText); },
  _generateArticleText: function(node) { return this.logic._generateArticleText(node); },
  _generateArticle: function(node) { return this.logic._generateArticle(node); },
  _findConceptFusion: function(node, articleText) { return this.logic._findConceptFusion(node, articleText); },
  _generateLinkArticle: function(link, nodeA, nodeB) { return this.logic._generateLinkArticle(link, nodeA, nodeB); },
  _switchPhylum: function(num, focusId) { return this.ui._switchPhylum(num, focusId); },
  _renderPhylumSwitcher: function() { return this.ui._renderPhylumSwitcher(); },
  _patchTextSelect: function() { return this.ui._patchTextSelect(); },
  _injectButton: function() { return this.ui._injectButton(); },
  _checkLastResponse: function(text, lastMsg, matches) { return this.ui._checkLastResponse(text, lastMsg, matches); },
  _close: function() { return this.ui._close(); },
  open: function(prefillText, phylumNumber) { return this.ui.open(prefillText, phylumNumber); },
  _renderTree: function() { return this.ui._renderTree(); },
  _showPlacementConfirm: function(phylumNumber, attachNode, newSteps, explainers, insightText, onAccept, onReject) { return this.ui._showPlacementConfirm(phylumNumber, attachNode, newSteps, explainers, insightText, onAccept, onReject); },
  _showTreeConfirm: function(phylumNumber, attachNode, treeNodes, onAccept, onReject) { return this.ui._showTreeConfirm(phylumNumber, attachNode, treeNodes, onAccept, onReject); },
  _generateCurriculumBreakdown: function() { return this.ui._generateCurriculumBreakdown(); },
  _showArchivedReviewQueue: function() { return this.ui._showArchivedReviewQueue(); },
  _showArticleConfirm: function(node, articleTitle, text, onApprove, onDeny) { return this.ui._showArticleConfirm(node, articleTitle, text, onApprove, onDeny); },
  _injectNavTab: function() { return this.ui._injectNavTab(); },
  _injectPageShell: function() { return this.ui._injectPageShell(); },
  _loadNodesAndRender: function(focusId) { return this.ui._loadNodesAndRender(focusId); },
  _renderDrillDown: function(allNodes, focusId) { return this.ui._renderDrillDown(allNodes, focusId); },
  _articleSection: function(focus) { return this.ui._articleSection(focus); },
  _renderFusionLinks: function(focus, wrap) { return this.ui._renderFusionLinks(focus, wrap); },
  _jumpToNode: function(node) { return this.ui._jumpToNode(node); },
  _showLinkArticle: function(link, focus, other) { return this.ui._showLinkArticle(link, focus, other); },

});
/* ===END:phylumPath=== */
