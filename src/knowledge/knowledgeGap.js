
/* ===MODULE:knowledgeGap=== */
RPGACE.register('knowledgeGap', {
  domain: 'knowledge',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 33 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // thirty-two predecessors already shipped and verified. Pure
  // internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale,
  // never rewritten and never split down the middle. Bodies are
  // deliberately NOT re-indented inside their new namespace, matching
  // the docsLinks/encSync/journalQoL/shiftSync precedent, so the diff
  // shows only real changes rather than a whitespace wall.
  //
  // 4 real members, all functions — ZERO data fields, declared or
  // otherwise. Checked BOTH ways, not assumed from the shape: a direct
  // read of every top-level key (only `init`/`_inject`/`_load`/
  // `_render`), and a grep of the whole module body for `self.X =` /
  // `this.X =` (0 hits), so this module has none of the undeclared
  // runtime-assigned field trap that journalQoL's `_activeSource` and
  // oracleDevBridge's `this.TABLE` both hit. The one `X.Y =` write in
  // the body — `node.applied_in_beat = true` inside `_render`'s Apply
  // Tonight handler — is a mutation of the caller-supplied gap ROW,
  // not of the module. `init` stays a literal top-level function
  // (RPGACE.register() calls `module.init()` directly and cannot see
  // into a sub-object) — byte-identical, its own `self = this`
  // genuinely IS the module, so its boot task and `page:show` listener
  // still reach `_inject` through the top-level pass-through below.
  //
  // This module splits 2 ui / 1 logic. Classification, function by
  // function, each checked against its actual body rather than its
  // name:
  //   • _inject → ui. Unambiguous: two `getElementById` reads, nine
  //     `document.createElement` calls, a full inline style build, an
  //     `onclick` assignment, and the `#dd-stash-holder` discover-or-
  //     create-then-`appendChild` handoff to dashDeck.
  //   • _render → ui. Unambiguous: three `getElementById` reads, a
  //     `grid.innerHTML = ''` wipe, then per gap row eleven more
  //     `createElement` calls, `.style` writes and two `onclick`
  //     handlers. Its colour-band arithmetic (`gap >= 7 ? … : …`) is
  //     the only data-shaped work in it and is inseparably a
  //     presentation decision about the card it is building.
  //   • _load → logic. SEE THE DEDICATED JUDGMENT-CALL NOTE BELOW —
  //     it is the one genuine call in this module, so it is argued
  //     here rather than filed quietly.
  //
  // ─── _load: why the fetch stays in `logic` despite feeding a render ─
  // `_load` contains zero DOM of any kind — no `document.*`, no
  // `createElement`, no `innerHTML`, no `querySelector`/
  // `getElementById`, no listener (grepped, not assumed). Its body is a
  // `RPGACE.modules.taxonomySync` presence guard, the Aug 22 `RPGACE.sb`
  // boot-race guard with its own 400ms self-retry, a
  // `taxonomySync.getTopGaps(6)` read, and a `.catch` that only
  // `console.warn`s. It then calls `self._render(nodes || [])`. Two
  // real readings existed:
  //   (a) `ui`, on the INSEPARABLE FETCH+RENDER rule — the rows it
  //       fetches are never returned, never stored and never reused;
  //       their only consumer is the render call on the next line.
  //   (b) `logic` — the function neither BUILDS nor DISCOVERS a DOM
  //       node of its own; it hands the rows to a separate, already-
  //       existing sibling that does all of that.
  // (b) was chosen, and specifically because the inseparability rule
  // has an explicit precondition this function does not meet: it
  // describes a fetch whose callback renders "straight into DOM nodes
  // THE SAME FUNCTION built or discovered" — the shape
  // journalQoL.ui._injectAuditEntries and jargonEncyclopedia.ui.
  // _openGlossary were both shipped on, where the element was captured
  // before the query was issued and there was genuinely no seam to cut
  // along. Here the seam already exists in the source: the author
  // split fetch from render into two named functions, and `_render` is
  // separately reachable (dashDeck's popup calls `_load` to refresh,
  // and `_render` could be handed rows from anywhere). Sending `_load`
  // to `ui` would mean an entire namespace-crossing on the strength of
  // one delegating call. `logic` -> `ui` calls are already normal in
  // this codebase (contentProductionLive has four, phylumPath and
  // bookworm many more), so this creates no new pattern. The honest
  // cost of (b), stated rather than hidden: a reader chasing "why is
  // the gap grid empty" will find the fetch and its boot-race retry in
  // `logic`, one hop away from the `ui` that draws it.
  //
  // `this`/`self` accounting for all 3 moved functions, so a later
  // reader can check by grep rather than take it on trust:
  //   • ui._inject — already had `var self = this;`, swapped for the
  //     module handle IN PLACE (it sits after both early-return
  //     guards, neither of which touches `this`, so control flow is
  //     unchanged). Captured twice for `self._load()` — once by the ↻
  //     button's onclick, once as the trailing initial load. Left as
  //     `this.`, both would have read `ui._load`, which does NOT exist
  //     on `ui` — a real TypeError on every dashboard boot. This is
  //     the single most dangerous line in the module.
  //   • logic._load — same in-place swap. Captured for its own 400ms
  //     `self._load()` retry and for `self._render(nodes || [])`; the
  //     second would have read `logic._render`, which does NOT exist
  //     on `logic` — a second real TypeError, this one silent (it
  //     fires inside a `.then` whose `.catch` would swallow it into a
  //     `console.warn`, leaving a permanently blank gap grid with no
  //     visible error).
  //   • ui._render — see the FLAGGED note at its own `var self` line:
  //     the local is PRE-EXISTING DEAD, read by nothing in the body.
  //     Swapped to the module handle in place rather than deleted,
  //     same as feynman.ui._showOracleOffer/_showDoNowChoice.
  //
  // ─── EXTERNAL TOUCHPOINTS: this module is NOT touchpoint-free ─────
  // Named plainly because the obvious grep does NOT show them and this
  // batch was briefed as "0 external touchpoints": a repo-wide grep for
  // the direct `RPGACE.modules.knowledgeGap.` form returns 0 hits, but
  // dashDeck._openGaps reaches this module through a LOCAL ALIAS and
  // calls TWO of its methods —
  //   `var kg  = RPGACE.modules.knowledgeGap; … kg._inject();`
  //   `var kg2 = RPGACE.modules.knowledgeGap; … kg2._load();`
  // — both guarded by `if (kg && kg._inject)` / `if (kg2 && kg2._load)`,
  // which is exactly what makes this dangerous: had the pass-throughs
  // below been omitted, those guards would have quietly evaluated
  // false and dashDeck's Knowledge Gaps card would have silently
  // stopped injecting and refreshing the widget, with no error thrown
  // anywhere. Both calls land on the top-level pass-throughs and are
  // routed on unchanged. The dynamic-lookup check is separately clean:
  // the only real `RPGACE.modules[variable]` site in the file is
  // contentProductionLive._findOracleCmdText, which reaches modules by
  // NAME STRING and then reads `.CMDS` — this module has no `CMDS`
  // field and is never named at any of its call sites. index.html has
  // zero references to it in any form. The `"_load": "knowledgeGap"`
  // entry in this file's own METHOD_MODULE_MAP (G109) is a generated
  // name->module DATA table, not a call site, and is unaffected.
  // ══════════════════════════════════════════════════════════════════

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self._inject(); });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.dashboard) {
        self._inject();
      }
    });
  },

  // ============================================================
  // ui — rendering/DOM: builds the Knowledge Gap Tracker panel and
  // stashes it in #dd-stash-holder for dashDeck's card popup to
  // relocate, then draws the gap cards (colour band, stats row, and
  // the Study Now / Apply Tonight actions) into its grid.
  // ============================================================
  ui: {

  _inject: function() {
    if (document.getElementById('kg-panel')) return;
    var page = document.getElementById('page-dashboard');
    if (!page) return;
    var self = RPGACE.modules.knowledgeGap;

    var panel = document.createElement('div');
    panel.id = 'kg-panel';
    panel.style.cssText = 'margin-bottom:24px;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';

    var title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = 'Knowledge Gap Tracker';

    var badge = document.createElement('div');
    badge.id = 'kg-badge';
    badge.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(42,191,176,0.7);background:rgba(42,191,176,0.08);border:1px solid rgba(42,191,176,0.2);border-radius:10px;padding:3px 10px;';
    badge.textContent = 'Loading...';

    var refreshBtn = document.createElement('button');
    refreshBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:rgba(226,226,236,0.3);cursor:pointer;font-size:11px;padding:3px 10px;margin-left:8px;';
    refreshBtn.textContent = '↻';
    refreshBtn.onclick = function() { self._load(); };

    hdr.appendChild(title);
    var badgeWrap = document.createElement('div');
    badgeWrap.style.cssText = 'display:flex;align-items:center;gap:6px;';
    badgeWrap.appendChild(badge);
    badgeWrap.appendChild(refreshBtn);
    hdr.appendChild(badgeWrap);
    panel.appendChild(hdr);

    var grid = document.createElement('div');
    grid.id = 'kg-grid';
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;';
    panel.appendChild(grid);

    var emptyState = document.createElement('div');
    emptyState.id = 'kg-empty';
    emptyState.style.cssText = 'display:none;font-size:12px;color:rgba(226,226,236,0.3);padding:16px;text-align:center;border:1px solid rgba(255,255,255,0.05);border-radius:8px;';
    emptyState.textContent = 'No taxonomy nodes yet. Sync your encyclopedia first.';
    panel.appendChild(emptyState);

    // July 20 Pass 1: this widget now lives inside dashDeck's Knowledge Gaps
    // card popup (_openGaps relocates the live node in/out). Inject straight
    // into the shared hidden stash holder so it is never visible on the raw
    // dashboard — dashDeck owns showing it. Prefer dashDeck's holder helper;
    // fall back to creating the same-id holder ourselves if dashDeck hasn't
    // run yet (id is shared, so whoever wins, both target it).
    var holder = document.getElementById('dd-stash-holder');
    if (!holder && RPGACE.modules.dashDeck && RPGACE.modules.dashDeck._ensureStash) {
      holder = RPGACE.modules.dashDeck._ensureStash();
    }
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'dd-stash-holder';
      holder.style.display = 'none';
      page.appendChild(holder);
    }
    holder.appendChild(panel);

    self._load();
    console.log('[RPGACE:knowledgeGap] Panel injected (stashed for dashDeck popup)');
  },

  _render: function(nodes) {
    // FLAGGED, NOT FIXED (G53 split, Sep 2026) — `self` on the next line
    // is a PRE-EXISTING DEAD LOCAL: nothing in this body reads it. Every
    // cross-module reach in here is already written in fully-qualified
    // form (`RPGACE.utils.phylumLabel`, `RPGACE.modules.dashDeck.
    // closeWidgetPopup`, `RPGACE.modules.feynman.start`, `RPGACE.utils.
    // sendToOracle`, `RPGACE.modules.taxonomySync.markApplied`), and the
    // two button handlers close over the `node`/`appliedStat` locals
    // rather than over the module. It was `var self = this;` before this
    // split and is swapped to the module handle in place like every
    // other one, so it stays CORRECT if a future edit ever does read it
    // — deleting it would be a real source change outside a pure
    // refactor's remit. Same treatment as feynman.ui._showOracleOffer.
    var self = RPGACE.modules.knowledgeGap;
    var grid = document.getElementById('kg-grid');
    var badge = document.getElementById('kg-badge');
    var empty = document.getElementById('kg-empty');
    if (!grid) return;

    grid.innerHTML = '';

    if (nodes.length === 0) {
      if (empty) empty.style.display = 'block';
      if (badge) badge.textContent = '0 gaps';
      return;
    }

    if (empty) empty.style.display = 'none';
    if (badge) badge.textContent = nodes.length + ' gaps tracked';

    nodes.forEach(function(node) {
      var gap = parseFloat(node.gap_score) || 5;
      var studied = node.study_count || 0;
      var applied = node.applied_in_beat || false;

      // Gap colour: red > 7, gold 4-7, teal < 4
      var gapColor = gap >= 7 ? '#CC4A4A' : gap >= 4 ? '#C9A84C' : '#2ABFB0';
      var gapBg = gap >= 7 ? 'rgba(226,84,84,0.06)' : gap >= 4 ? 'rgba(201,168,76,0.06)' : 'rgba(42,191,176,0.06)';
      var gapBorder = gap >= 7 ? 'rgba(226,84,84,0.2)' : gap >= 4 ? 'rgba(201,168,76,0.2)' : 'rgba(42,191,176,0.2)';

      var card = document.createElement('div');
      card.style.cssText = 'background:' + gapBg + ';border:1px solid ' + gapBorder + ';border-radius:8px;padding:14px 16px;position:relative;';

      var phylumLabel = document.createElement('div');
      phylumLabel.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:' + gapColor + ';opacity:0.7;margin-bottom:4px;';
      phylumLabel.textContent = node.phylum_number ? RPGACE.utils.phylumLabel(node.phylum_number) : 'Phylum ? · Unknown';

      var conceptName = document.createElement('div');
      conceptName.style.cssText = 'font-size:12px;font-weight:700;color:#D4DAF5;margin-bottom:8px;line-height:1.3;';
      conceptName.textContent = node.concept || 'Untitled';

      var statsRow = document.createElement('div');
      statsRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px;';

      var gapStat = document.createElement('div');
      gapStat.style.cssText = 'font-size:11px;color:' + gapColor + ';font-weight:700;';
      gapStat.textContent = 'Gap ' + gap.toFixed(1);

      var studiedStat = document.createElement('div');
      studiedStat.style.cssText = 'font-size:11px;color:rgba(226,226,236,0.35);';
      studiedStat.textContent = studied + 'x studied';

      var appliedStat = document.createElement('div');
      appliedStat.style.cssText = 'font-size:11px;color:' + (applied ? '#4CAF82' : 'rgba(226,226,236,0.2)') + ';';
      appliedStat.textContent = applied ? '✓ applied' : '○ not applied';

      statsRow.appendChild(gapStat);
      statsRow.appendChild(studiedStat);
      statsRow.appendChild(appliedStat);

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:6px;';

      var studyBtn = document.createElement('button');
      studyBtn.style.cssText = 'flex:1;padding:6px 8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:rgba(226,226,236,0.7);font-size:11px;font-weight:600;cursor:pointer;font-family:Rajdhani,sans-serif;';
      studyBtn.textContent = '🧠 Study Now';
      studyBtn.onclick = function() {
        // If this widget is currently hosted inside dashDeck's Knowledge Gaps
        // popup, close that popup FIRST — feynman.start opens #feynman-panel
        // at z-index 9999, below the popup overlay's 99999, so it would open
        // invisibly behind it otherwise. closeWidgetPopup stashes this live
        // node back to the holder (node moved, not destroyed) then removes the
        // overlay, so the closures below stay valid. No-op if no popup hosts
        // it (widget opened some other way).
        if (RPGACE.modules.dashDeck && RPGACE.modules.dashDeck.closeWidgetPopup) {
          RPGACE.modules.dashDeck.closeWidgetPopup('kg-panel');
        }
        if (typeof RPGACE.modules.feynman !== 'undefined' && typeof RPGACE.modules.feynman.start === 'function') {
          RPGACE.modules.feynman.start(node.concept, 'knowledgeGap');
        } else {
          RPGACE.utils.sendToOracle('Start a Feynman Loop session on: ' + node.concept + '. I want to master this concept for FL Studio UK hip hop production.');
        }
      };

      var askBtn = document.createElement('button');
      askBtn.style.cssText = 'flex:1;padding:6px 8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:5px;color:rgba(226,226,236,0.7);font-size:11px;font-weight:600;cursor:pointer;font-family:Rajdhani,sans-serif;';
      askBtn.textContent = '⚡ Apply Tonight';
      askBtn.onclick = function() {
        RPGACE.utils.sendToOracle('Give me one specific FL Studio exercise I can do tonight to apply this concept in a beat: ' + node.concept + '. Be specific, step-by-step, and give me an exact task I can complete in 30 minutes.');
        if (typeof RPGACE.modules.taxonomySync !== 'undefined') {
          RPGACE.modules.taxonomySync.markApplied(node.concept);
          node.applied_in_beat = true;
          appliedStat.style.color = '#4CAF82';
          appliedStat.textContent = '✓ applied';
        }
      };

      btnRow.appendChild(studyBtn);
      btnRow.appendChild(askBtn);

      card.appendChild(phylumLabel);
      card.appendChild(conceptName);
      card.appendChild(statsRow);
      card.appendChild(btnRow);
      grid.appendChild(card);
    });
  },

  },

  // ============================================================
  // logic — business logic/data: the guarded gap read. No DOM of any
  // kind; see the dedicated judgment-call note in the G53 block above
  // for why the trailing `self._render(...)` handoff does NOT pull it
  // into `ui`.
  // ============================================================
  logic: {

  _load: function() {
    var self = RPGACE.modules.knowledgeGap;
    if (!RPGACE.modules.taxonomySync) return;

    // Aug 22 (real /Routine follow-up, same root cause as
    // taxonomySync.getTopGaps' own new guard): this runs from a boot
    // task that fires before config.init() has set RPGACE.sb, so the
    // very first real call here always landed before RPGACE.sb existed.
    // getTopGaps' own guard stops the throw, but an empty result on
    // that first call would otherwise render "0 gaps" and never
    // self-correct (_inject's own existing-DOM check means _load never
    // gets called again on its own) — retry once, shortly after, so the
    // real gap count actually lands once RPGACE.sb is ready.
    if (!RPGACE.sb || !RPGACE.sb.select) {
      setTimeout(function() { self._load(); }, 400);
      return;
    }
    RPGACE.modules.taxonomySync.getTopGaps(6)
      .then(function(nodes) {
        self._render(nodes || []);
      })
      .catch(function(err) {
        console.warn('[knowledgeGap] load error:', err.message);
      });
  },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. Unlike most modules in this series these are genuinely
  // LOAD-BEARING for an external caller: dashDeck._openGaps reaches
  // `_inject` and `_load` through a local alias (`var kg =
  // RPGACE.modules.knowledgeGap; … kg._inject();`), behind a
  // `if (kg && kg._inject)` guard that would have failed SILENTLY had
  // these been dropped — see the external-touchpoints note in the G53
  // block above. They also carry this module's own internal calls:
  // `init`'s boot task and `page:show` listener both call
  // `self._inject()`, `ui._inject` calls `self._load()` twice (the ↻
  // button's onclick and the trailing initial load), and `logic._load`
  // reaches `self._load()` for its 400ms retry and `self._render(...)`
  // for the draw — every one of those `self`s is the module, so each
  // lands here first and is routed on to the right namespace.
  _inject: function() { return this.ui._inject(); },
  _render: function(nodes) { return this.ui._render(nodes); },
  _load: function() { return this.logic._load(); },

});
/* ===END:knowledgeGap=== */
