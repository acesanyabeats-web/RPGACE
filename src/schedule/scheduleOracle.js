
/* ===MODULE:scheduleOracle=== */
// F11: Schedule Oracle, Phase 1 (MVP). Per the roadmap: 3 Oracle-tab entry
// points, YouTube+PDF+text ingestion, sequential 3-option reveal with
// alert-style acknowledgment between each. Built as an extension of the
// existing taxonomy popup's visual language (dark overlay, bordered box,
// accept/reject-style buttons) - not a literal reuse of
// taxonomyTree._showProposalPopup, since that component is structurally
// specific to editable multi-step lineage paths and doesn't generalise to
// arbitrary sequential options; same look and interaction rhythm instead.
//
// Ingestion deliberately reuses the existing /api/scout + /api/analyst
// agents (already do URL-detection + Jina fetch + type-aware analysis)
// rather than building new ingestion infrastructure - this is genuinely
// Phase 1 scope; F12 (carousel toggle, two-tier session memory,
// auto-routing confidence gate) is NOT built here, it depends on this
// phase and is its own separate pass.
RPGACE.register('scheduleOracle', {
  domain: 'schedule',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 35 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // thirty-four predecessors already shipped and verified. Pure
  // internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale,
  // never rewritten and never split down the middle. Bodies are
  // deliberately NOT re-indented inside their new namespace, matching
  // the docsLinks/encSync/journalQoL/shiftSync precedent, so the diff
  // shows only real changes rather than a whitespace wall.
  //
  // 6 real members: 5 functions and ONE declared data field,
  // `TRIGGER_PREFIXES`, which stays at module scope (it is read once,
  // by `ui._injectEntryPoints`'s `window.sendChat` wrapper, but module
  // scope is where it already correctly lives and moving a public-
  // looking config array into a namespace would change its address for
  // no gain). Checked for the undeclared-runtime-field trap BOTH ways,
  // not assumed: a direct read of every top-level key, and a grep of
  // the whole module body for `self.X =` / `this.X =` (0 hits) — so
  // this module has none of what journalQoL's `_activeSource` and
  // oracleDevBridge's `this.TABLE` both hit. `init` stays a literal
  // top-level function (RPGACE.register() calls `module.init()`
  // directly and cannot see into a sub-object) — byte-identical, its
  // own `self = this` genuinely IS the module, so its boot task and
  // `page:show` listener still reach `_injectEntryPoints` through the
  // top-level pass-through below.
  //
  // NOTE ON COUNT — this batch was briefed as "roughly 8 functions".
  // The real figure is 5 top-level functions (`init` + 4 movable); the
  // extra count is nested closures that are NOT module members and are
  // not split: the three `action: function(done)` handlers inside
  // `_showOptionSequence`'s `steps` array, plus its local `renderStep`
  // and `advance`. All of them moved with their enclosing function,
  // untouched. (This is also why this file's own METHOD_MODULE_MAP has
  // a bare `"action": "scheduleOracle"` entry — it is a generated
  // name->module DATA table that picked up those object-literal keys,
  // not a call site, and is unaffected by this split.)
  //
  // This module splits 3 ui / 1 logic. Classification, function by
  // function, each checked against its actual body rather than its
  // name:
  //   • _injectEntryPoints → ui. Unambiguous: `getElementById`,
  //     `document.querySelector('.quick-row')`, `createElement`, an
  //     `onclick` assignment and an `appendChild` for entry point A;
  //     and inside the `window.sendChat` wrapper it installs for entry
  //     point C, `document.getElementById('chat-input')`, a read of
  //     `input.value`, a write of `input.value = ''` and a real
  //     `input.dispatchEvent(new Event('input', …))`.
  //   • _openPanel → ui. Unambiguous: `getElementById` re-entry guard,
  //     `dashDeck._popup(...)`, three `createElement` calls, two
  //     `onclick` assignments, `appendChild` ×3 and `input.focus()`.
  //   • _showOptionSequence → ui. Its `steps` array is the only part
  //     with a data flavour, but each entry is a UI STEP DESCRIPTOR
  //     (icon, title, body copy, button label) whose `action` is a
  //     handler wired to that step's button; the function's real body
  //     is the local `renderStep`, which calls `dashDeck._popup(...)`
  //     once per step, builds the body/button row with `createElement`
  //     and drives the sequential reveal through `advance`. Nothing
  //     here is separable into `logic` without splitting the function
  //     down the middle, which this pass forbids.
  //   • _ingest → logic. SEE THE DEDICATED NOTE BELOW — the one
  //     genuine judgment call in this module.
  //
  // ─── _ingest: why the two fetches stay in `logic` ─────────────────
  // `_ingest` contains zero DOM of any kind — no `document.*`, no
  // `createElement`, no `innerHTML`, no `querySelector`/
  // `getElementById`, no listener (grepped, not assumed). Its body is
  // a `POST /api/scout` (URL-or-text detection + Jina fetch), a chained
  // `POST /api/analyst` on the scout result, and a `.catch`; it then
  // hands the assembled `{title, analysis, sourceURL}` to
  // `self._showOptionSequence(...)`. Two real readings existed:
  //   (a) `ui`, on the INSEPARABLE FETCH+RENDER rule — the scout/
  //       analyst results are never returned to the caller and never
  //       stored; their only consumer is the popup sequence.
  //   (b) `logic` — the function neither BUILDS nor DISCOVERS a DOM
  //       node of its own; it hands its result to a separate, already-
  //       existing sibling that does all of that.
  // (b) was chosen, on exactly the same reasoning applied to
  // knowledgeGap.logic._load in this same batch: the inseparability
  // rule's own precondition is that the fetch callback renders
  // straight into DOM nodes THE SAME FUNCTION built or discovered, and
  // that is plainly not the case here — the seam already exists in the
  // source, the author having split ingestion from presentation into
  // two named functions. The three `RPGACE.utils.toast(...)` calls
  // (progress, progress, error) do not change this: a toast is a
  // TRIGGER of UI, not construction of it — the standing rule since
  // the phylumPath pilot, and the same reasoning that put
  // ciAutoPropose.logic._scan, encTaxonomyLink.logic._propose and
  // videoSummary.logic._runRetro in `logic` despite their user-facing
  // feedback. The honest cost of (b), stated rather than hidden: a
  // reader chasing "why did Schedule Oracle show an error toast" will
  // find the failure path in `logic`, one hop away from the `ui` that
  // would otherwise have drawn the options.
  //
  // `this`/`self` accounting for all 4 moved functions, so a later
  // reader can check by grep rather than take it on trust:
  //   • ui._injectEntryPoints — already had `var self = this;`,
  //     swapped for the module handle IN PLACE (it is the function's
  //     first statement; nothing precedes it). Captured for
  //     `self._openPanel()` (entry point A's button onclick),
  //     `self.TRIGGER_PREFIXES` and `self._openPanel(rest)` (both
  //     inside the sendChat wrapper). Left as `this.`, the first and
  //     third would have read `ui._openPanel` — which DOES exist on
  //     `ui`, so they would have kept working by luck rather than by
  //     design; the second would have read `ui.TRIGGER_PREFIXES`,
  //     which does NOT exist, and `undefined.find(...)` is a real
  //     TypeError thrown INSIDE the global `window.sendChat` wrapper —
  //     i.e. it would have broken EVERY Oracle chat send in the app,
  //     not just this module. That is the single most dangerous line
  //     in this batch. All three requalified.
  //     ⚠️ DELIBERATELY NOT TOUCHED in the same function:
  //     `origSend.apply(this, arguments)`. That `this` is the
  //     wrapper's own call-site receiver being forwarded to the
  //     original `window.sendChat`, NOT a module reference —
  //     rewriting it would be a real behavioural change.
  //   • ui._openPanel — same in-place swap (it sits after the
  //     `getElementById` re-entry guard, which does not touch `this`).
  //     Captured once, by the Ingest button's onclick, for
  //     `self._ingest(text)` — which left bare would have read
  //     `ui._ingest`, and `_ingest` is the one function that does NOT
  //     live on `ui`: a real TypeError on the primary button of this
  //     module's own panel.
  //   • logic._ingest — same in-place swap. Captured once, inside the
  //     analyst `.then`, for `self._showOptionSequence(...)` — which
  //     left bare would have read `logic._showOptionSequence`, another
  //     real TypeError, and a silent one: it fires inside a promise
  //     chain whose `.catch` would swallow it into a generic "Error:
  //     …" toast, so the ingest would appear to fail rather than to
  //     have half-succeeded.
  //   • ui._showOptionSequence — see the FLAGGED note at its own
  //     `var self` line: the local is PRE-EXISTING DEAD, read by
  //     nothing in the body. Swapped to the module handle in place
  //     rather than deleted, same as feynman.ui._showOracleOffer.
  //
  // Zero external METHOD touchpoints confirmed by a fresh repo-wide
  // grep, and unlike knowledgeGap/morningBrief in this same batch this
  // one really is clean: `RPGACE.modules.scheduleOracle` returns 0 hits
  // in any form — direct, bracket, or local-alias (`var x =
  // RPGACE.modules.scheduleOracle`) — across rpgace_core.js and
  // index.html both. The dynamic-lookup check is separately clean: the
  // only real `RPGACE.modules[variable]` site in the file is
  // contentProductionLive._findOracleCmdText, which reaches modules by
  // NAME STRING and then reads `.CMDS` — this module has no `CMDS`
  // field and is never named at that call site. The only other
  // `scheduleOracle` string in code is `window._scheduleOracleChatPatched`,
  // this module's OWN global patch guard, not a module lookup. The
  // module is driven entirely by the boot task and `page:show`
  // listener `init` registers, plus the `window.sendChat` wrapper it
  // installs. The `"_ingest"`/`"_injectEntryPoints"`/
  // `"_showOptionSequence"` entries in this file's own
  // METHOD_MODULE_MAP (G109) are a generated name->module DATA table,
  // not call sites, and are unaffected by this split.
  // ══════════════════════════════════════════════════════════════════

  TRIGGER_PREFIXES: ['schedule oracle:', 'schedule this:', 'learn later:'],

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self._injectEntryPoints(); });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) setTimeout(function() { self._injectEntryPoints(); }, 600);
    });
  },

  // ============================================================
  // ui — rendering/DOM: installs both visible entry points (the
  // Oracle-tab launch button and the `window.sendChat` trigger-prefix
  // wrapper), builds the URL/text intake panel, and drives the
  // sequential 3-option reveal popup.
  // ============================================================
  ui: {

  // Entry point A: direct-launch button. Entry point C: chat-mode trigger
  // phrase, wraps window.sendChat once.
  _injectEntryPoints: function() {
    var self = RPGACE.modules.scheduleOracle;
    if (!document.getElementById('sched-oracle-btn')) {
      var row = document.querySelector('.quick-row');
      if (row) {
        var btn = document.createElement('button');
        btn.id = 'sched-oracle-btn';
        btn.className = 'agent-btn';
        btn.textContent = '📅 Schedule Oracle';
        btn.style.cssText = 'border-color:rgba(74,144,226,0.4);color:#4A8CCC;background:rgba(74,144,226,0.08);margin-left:4px;';
        btn.onclick = function() { self._openPanel(); };
        row.appendChild(btn);
      }
    }
    if (typeof window.sendChat === 'function' && !window._scheduleOracleChatPatched) {
      window._scheduleOracleChatPatched = true;
      var origSend = window.sendChat;
      window.sendChat = function() {
        // General concurrency guard - bundled here since this is the one
        // place window.sendChat gets wrapped, not Schedule-Oracle-specific.
        // sendChat()'s send-btn.disabled=true is only a VISUAL guard - it
        // doesn't stop a second call fired programmatically (e.g. a Visual
        // Oracle / Prod Oracle panel button calling sendToOracle() while a
        // prior request is still pending). Two overlapping calls share one
        // global STATE.chatHistory and one fixed #typing-indicator id, so
        // whichever response resolves first steals the other's placeholder -
        // confirmed via testing: a slow request (Director Match, near the
        // Oracle timeout ceiling) got its content silently swapped with a
        // faster one fired while it was still pending. Blocking overlap
        // entirely removes the chance of that happening, no main.js edit
        // needed.
        // Aug 6 (Engineer pass, real Content Pipeline bugfix) — this guard
        // already stopped a SECOND request from firing while one was in
        // flight, but returned bare `undefined` on the blocked path,
        // identical to what it returns on a genuinely successful send with
        // no promise result. Every caller that arms a
        // visualOracle._captureNextResponse() listener right before calling
        // sendChat()/sendToOracle() had no way to tell "blocked, don't
        // arm" from "sent, arm away" - so a blocked send left its capture
        // dangling, armed for a response that was never coming, ready to
        // wrongly consume whatever DIFFERENT reply happened to land next
        // (RPGACE.hooks.fire() broadcasts to every registered listener for
        // an event, confirmed by direct read - there is no per-request
        // tagging). Real evidence trail: Alex's own hand-test report
        // (2026-08-06) showed a missing style_profiles row for a director
        // pick Oracle DID make, and content-pipeline "duplicated stages" -
        // both consistent with a dangling auto-chain capture (F18's
        // _autoVisualTreatment) getting silently blocked by a manual click
        // grabbing the in-flight slot first, then wrongly firing on that
        // manual flow's own reply once it landed. Returning `false` here
        // (instead of undefined) lets every call site that cares check it.
        if (window._oracleRequestInFlight) {
          // Real fix, Sep 2 2026 (Fable-audit item "Toast-capture tuning" -
          // an info-shaped nudge, not an error, was landing in error_log
          // because #CC4A4A is toast()'s own real trigger for the G109
          // error-capture net (see toast()'s header comment). "Please wait,
          // a request is already in flight" is a normal rate-limit-style
          // guard, not something broken - recolored to #E2A83D, this
          // codebase's own established soft-warning color, so it renders
          // correctly (a real amber nudge, not a red error) AND no longer
          // false-positives into error_log.
          RPGACE.utils.toast('⏳ Oracle is still answering — wait for it to finish first', '#E2A83D', 2800);
          return false;
        }
        var input = document.getElementById('chat-input');
        var val = input ? input.value.trim() : '';
        var lower = val.toLowerCase();
        var matchedPrefix = self.TRIGGER_PREFIXES.find(function(p) { return lower.indexOf(p) === 0; });
        if (matchedPrefix) {
          var rest = val.slice(matchedPrefix.length).trim();
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          self._openPanel(rest);
          return false;
        }
        window._oracleRequestInFlight = true;
        var result = origSend.apply(this, arguments);
        if (result && typeof result.then === 'function') {
          result.finally(function() { window._oracleRequestInFlight = false; });
        } else {
          window._oracleRequestInFlight = false;
        }
        return true;
      };
    }
  },

  // Entry point B: the panel's own URL/text field.
  _openPanel: function(prefill) {
    if (document.getElementById('sched-oracle-panel')) return;
    var self = RPGACE.modules.scheduleOracle;
    var pop = RPGACE.modules.dashDeck._popup({
      dim: '0.9', width: '520px', borderColor: 'rgba(74,144,226,0.3)',
      eyebrow: 'Schedule Oracle · Phase 1', title: 'What do you want to learn / schedule?',
      noDefaultClose: true,
    });
    var overlay = pop.overlay, box = pop.box;
    overlay.id = 'sched-oracle-panel';

    var input = document.createElement('textarea');
    input.id = 'sched-oracle-input';
    input.placeholder = 'Paste a YouTube link, a PDF link, or just type/paste text...';
    input.value = prefill || '';
    input.style.cssText = 'width:100%;min-height:100px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#D4DAF5;font-size:13px;padding:10px 12px;outline:none;font-family:Rajdhani,sans-serif;resize:vertical;margin-bottom:14px;';

    var goBtn = document.createElement('button');
    goBtn.textContent = '🔮 Ingest + Analyse';
    goBtn.style.cssText = 'padding:10px 20px;background:rgba(74,144,226,0.12);border:1px solid rgba(74,144,226,0.35);border-radius:8px;color:#4A8CCC;font-size:13px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
    goBtn.onclick = function() {
      var text = input.value.trim();
      if (!text) { RPGACE.utils.toast('Paste a link or type something first', '#CC4A4A', 2000); return; }
      overlay.remove();
      self._ingest(text);
    };

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(226,226,236,0.3);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;margin-left:8px;';
    cancelBtn.onclick = function() { overlay.remove(); };

    box.appendChild(input); box.appendChild(goBtn); box.appendChild(cancelBtn);
    input.focus();
  },

  // Sequential 3-option reveal - one option shown at a time, each requires
  // an explicit action or an explicit skip before the next one appears.
  _showOptionSequence: function(data) {
    // FLAGGED, NOT FIXED (G53 split, Sep 2026) — `self` on the next line
    // is a PRE-EXISTING DEAD LOCAL: nothing in this body reads it. The
    // three step `action` handlers reach their targets through globals
    // and fully-qualified forms (`saveOracleToEncyclopedia`,
    // `openSchedModal`, `RPGACE.utils._quickPhylaScan`,
    // `RPGACE.modules.taxonomyTree.silentPropose`, `RPGACE.utils.toast`),
    // and the local `renderStep`/`advance` closures close over `steps`
    // and `idx`, never over the module. It was `var self = this;` before
    // this split and is swapped to the module handle in place like every
    // other one, so it stays CORRECT if a future edit ever does read it
    // — deleting it would be a real source change outside a pure
    // refactor's remit. Same treatment as feynman.ui._showOracleOffer.
    var self = RPGACE.modules.scheduleOracle;
    var steps = [
      {
        icon: '📖', title: 'Save to Encyclopedia',
        body: 'Save this as a permanent knowledge base entry, searchable later.',
        actionLabel: '📖 Save now',
        action: function(done) {
          if (typeof saveOracleToEncyclopedia !== 'function') { done(); return; }
          saveOracleToEncyclopedia(data.title, '## ' + data.title + '\n\n' + data.analysis + (data.sourceURL ? '\n\n**Source:** ' + data.sourceURL : ''), data.sourceURL)
            .then(function() { RPGACE.utils.toast('✅ Saved to Encyclopedia', '#4CAF82', 2500); done(); })
            .catch(function(e) { RPGACE.utils.toast('Error: ' + e.message, '#CC4A4A', 3000); done(); });
        }
      },
      {
        icon: '📅', title: 'Schedule a learning session',
        body: 'Block real time to study this via the Schedule modal.',
        actionLabel: '📅 Schedule',
        action: function(done) {
          if (typeof openSchedModal === 'function') {
            openSchedModal({ title: 'Study: ' + data.title, description: data.analysis.slice(0, 300), category: 'learning', xp: 60, duration_mins: 45 });
          }
          done();
        }
      },
      {
        icon: '🌳', title: 'Queue for Taxonomy Tree',
        body: 'Silently generate a taxonomy lineage proposal from this content, reviewable later from the Dashboard queue (same F4/F5/F6 pipeline).',
        actionLabel: '🌳 Queue proposal',
        action: function(done) {
          if (!RPGACE.utils._quickPhylaScan || !RPGACE.modules.taxonomyTree) { done(); return; }
          var blob = data.title + ' ' + data.analysis;
          var matches = RPGACE.utils._quickPhylaScan(blob);
          if (matches.length === 0) { RPGACE.utils.toast('No clear phylum match for this content', '#CC4A4A', 2500); done(); return; }
          RPGACE.modules.taxonomyTree.silentPropose(blob.slice(0, 300), matches[0].num, 'schedule_oracle', null)
            .then(function() { RPGACE.utils.toast('🌳 Queued — review from Dashboard', 'rgba(155,89,182,0.85)', 3000); done(); })
            .catch(function(e) { RPGACE.utils.toast('Error: ' + e.message, '#CC4A4A', 3000); done(); });
        }
      }
    ];

    var idx = 0;
    function renderStep() {
      var s = steps[idx];
      var pop = RPGACE.modules.dashDeck._popup({
        dim: '0.92', width: '480px', borderColor: 'rgba(74,144,226,0.3)',
        eyebrow: 'Option ' + (idx + 1) + ' of ' + steps.length,
        title: s.icon + ' ' + s.title, noDefaultClose: true,
      });
      var overlay = pop.overlay, box = pop.box;

      var body = document.createElement('div');
      body.style.cssText = 'font-size:12px;color:rgba(226,226,236,0.55);line-height:1.6;margin-bottom:18px;';
      body.textContent = s.body;

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';

      var advance = function() {
        overlay.remove();
        idx++;
        if (idx < steps.length) renderStep();
        else RPGACE.utils.toast('✅ Schedule Oracle pass complete', '#4A8CCC', 2500);
      };

      var actionBtn = document.createElement('button');
      actionBtn.textContent = s.actionLabel;
      actionBtn.style.cssText = 'flex:1;padding:10px;background:rgba(61,170,110,0.12);border:1px solid rgba(61,170,110,0.35);border-radius:8px;color:#4CAF82;font-size:12px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      actionBtn.onclick = function() {
        actionBtn.disabled = true;
        actionBtn.textContent = 'Working...';
        s.action(advance);
      };

      var skipBtn = document.createElement('button');
      skipBtn.textContent = idx < steps.length - 1 ? 'Skip →' : 'Done';
      skipBtn.style.cssText = 'padding:10px 16px;background:none;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:rgba(226,226,236,0.4);font-size:12px;cursor:pointer;font-family:Rajdhani,sans-serif;';
      skipBtn.onclick = advance;

      btnRow.appendChild(actionBtn); btnRow.appendChild(skipBtn);
      box.appendChild(body); box.appendChild(btnRow);
    }
    renderStep();
  },

  },

  // ============================================================
  // logic — business logic/data: the /api/scout + /api/analyst
  // ingestion chain. No DOM; see the dedicated judgment-call note in
  // the G53 block above for why the trailing
  // `self._showOptionSequence(...)` handoff and the three progress/
  // error toasts do NOT pull it into `ui`.
  // ============================================================
  logic: {

  // Ingestion: /api/scout handles URL-or-text detection + Jina fetch (works
  // for YouTube page text and PDF URLs, not a full video transcript pipeline
  // - that's Content Intelligence's job, not this one) + type identification.
  // /api/analyst produces a type-aware structured analysis from it.
  _ingest: function(text) {
    var self = RPGACE.modules.scheduleOracle;
    RPGACE.utils.toast('🔮 Ingesting content...', '#4A8CCC', 2500);
    fetch('/api/scout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, type: 'auto' })
    })
    .then(function(r) { return r.json(); })
    .then(function(scout) {
      if (scout.error) throw new Error(scout.error);
      RPGACE.utils.toast('🔮 Analysing (' + scout.detectedType + ')...', '#4A8CCC', 2500);
      return fetch('/api/analyst', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: scout.content, detectedType: scout.detectedType, title: scout.title })
      }).then(function(r) { return r.json(); }).then(function(analyst) {
        if (analyst.error) throw new Error(analyst.error);
        self._showOptionSequence({ title: scout.title, analysis: analyst.analysis, sourceURL: scout.sourceURL });
      });
    })
    .catch(function(e) {
      RPGACE.utils.toast('Error: ' + e.message, '#CC4A4A', 3500);
    });
  },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. No external caller invokes any METHOD of this module (verified
  // by a fresh grep of rpgace_core.js and index.html both — zero hits
  // for `RPGACE.modules.scheduleOracle` in any form, direct, bracket or
  // local-alias), so these exist for convention and for its OWN
  // internal calls: `init`'s boot task and `page:show` listener both
  // call `self._injectEntryPoints()`, `ui._injectEntryPoints` calls
  // `self._openPanel()` from the launch button and `self._openPanel(rest)`
  // from the sendChat trigger-prefix branch, `ui._openPanel`'s Ingest
  // button calls `self._ingest(text)`, and `logic._ingest` calls
  // `self._showOptionSequence(...)` once the analyst response lands —
  // every one of those `self`s is the module, so each lands here first
  // and is routed on to the right namespace.
  _injectEntryPoints: function() { return this.ui._injectEntryPoints(); },
  _openPanel: function(prefill) { return this.ui._openPanel(prefill); },
  _showOptionSequence: function(data) { return this.ui._showOptionSequence(data); },
  _ingest: function(text) { return this.logic._ingest(text); },

});
/* ===END:scheduleOracle=== */
