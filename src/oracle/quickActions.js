
/* ===MODULE:quickActions=== */
RPGACE.register('quickActions', {
  domain: 'oracle',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026) — real, ratified /CEO plan item, and the NINETEENTH
  // module to take this shape (after the videoPipeline/beatLog/bookworm/
  // phylumPath pilot, then contentProductionLive, conidPot, videoSummary,
  // questEngine, intelDelete, feynman, taxonomyReviewQueue, youtubeOracle,
  // tiktokOracle, instaOraclePanel, jargonEncyclopedia, encyclopediaQoL,
  // pathRouter and oracleDevBridge): split into two internal namespaces,
  // `ui` (rendering/DOM) and `logic` (business logic/data), following
  // the exact shape those eighteen already shipped and verified. Pure
  // internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale,
  // never rewritten and never split down the middle.
  //
  // 3 real members, all functions, no data fields at all (checked by
  // direct read of every top-level key, not assumed from the shape).
  // `init` stays a literal top-level function (RPGACE.register() calls
  // `module.init()` directly and cannot see into a sub-object) —
  // byte-identical, its own `self = this` genuinely IS the module, so
  // both its boot task and its page:show hook still reach
  // `self._setup()` through the top-level pass-through below.
  //
  // REAL, HONEST RESULT WORTH NAMING RATHER THAN HIDING: both movable
  // functions land in `ui`, and `logic` below is genuinely EMPTY —
  // the same real precedent youtubeOracle, jargonEncyclopedia and
  // encyclopediaQoL already set. That is not a classification failure
  // or a shortcut; it is what this module actually is once looked at
  // squarely: a chat-box driver and a button-rewiring pass over an
  // existing DOM row. Each was checked by a keyword grep of its own
  // body, never inferred from its name:
  //   • _send → ui. Two `document.querySelector` lookups (`#chat-input`,
  //     then `#send-btn` with an attribute-selector fallback), a direct
  //     `input.value` write, a synthetic `input` Event dispatch and a
  //     real `btn.click()`. DOM discovery and DOM driving throughout.
  //   • _setup → ui. DOM discovery and wiring end to end:
  //     `document.querySelector('.quick-row')`, `row.querySelectorAll`
  //     twice, `dataset` guard writes, `cloneNode`/`removeAttribute`/
  //     `parentNode.replaceChild` node surgery on the 4 broken
  //     quickPrompt buttons, and three `addEventListener` attachments.
  //
  // ─── why _setup's two Composio calls do NOT earn a `logic` half ────
  // Named explicitly, because a reader skimming for `RPGACE.api(` will
  // find two real outbound Composio calls in this file and reasonably
  // ask why neither was separated out. Both
  // (`SUPADATA_GET_YOUTUBE_CHANNEL` and `NOTION_CREATE_NOTION_PAGE`)
  // live INSIDE an `addEventListener` callback, not in `_setup`'s own
  // top-level body — `_setup` never invokes either one; it only
  // ATTACHES the closures that will, later, when Alex actually clicks.
  // `_setup`'s own executed body is 100% DOM discovery and wiring.
  // Extracting the two API calls into `logic` would therefore mean
  // splitting a function down the middle, which this pass's own rules
  // forbid outright — and would buy nothing, since the extracted half
  // would still have to be handed the same `self._send` callback to be
  // useful. Left exactly as they are, and the emptiness of `logic` is
  // stated outright rather than papered over by a token extraction.
  // The empty `logic: {}` is kept deliberately so the module still
  // presents the same two-namespace shape as its eighteen siblings.
  //
  // The one real risk this split has to get right, function by
  // function: a function moved into `ui`/`logic` is invoked with `this`
  // bound to THAT sub-object, not the module. Exact accounting for both
  // moved functions, so a later reader can check by grep rather than
  // take it on trust:
  //   • _send — references neither `this` nor `self`; moved
  //     byte-identical, no handle needed and none added.
  //   • _setup — already had `var self = this;`, that one line swapped
  //     for the module handle IN PLACE (`var self =
  //     RPGACE.modules.quickActions;`) so statement order is unchanged.
  //     It matters: `self` is captured by all three of its
  //     addEventListener closures, which call `self._send(...)` three
  //     times between them (the quickPrompt rewire, the YT-stats
  //     success path, the YT-stats failure path). Left as `this.`, it
  //     would have read `ui._send` — which DOES exist on `ui`, so this
  //     one would have kept working by luck rather than by design; it
  //     is requalified anyway so the module never depends on two
  //     functions happening to share a namespace.
  // ══════════════════════════════════════════════════════════════════
  //
  // REAL, SUPERSEDING UPDATE (F0, Sep 2026): the G53 block above describes
  // _setup as it was on the day of the split — that description is now
  // historical, kept as-said per this project's own doc-discipline rather
  // than rewritten. _setup was rewritten for real, Alex's own directive
  // ("wire the quickPrompt buttons into how they actually feed Oracle"):
  // the two Composio calls named above (SUPADATA_GET_YOUTUBE_CHANNEL,
  // NOTION_CREATE_NOTION_PAGE) moved OUT of this module entirely, into
  // oracleControl._execute's own yt_stats/log_notion branches — all 4
  // buttons now dispatch through oracleControl._showActionConfirm instead
  // of _setup's own bespoke handlers. _setup is still `ui` (still
  // discovers `.quick-row` and wires real click listeners), still has an
  // empty `logic`, but no longer clones/replaces DOM nodes and no longer
  // owns any Composio call. Full spec:
  // records/2026-09/f0_quickprompt_oracle_rewire_spec_2026-09-04.txt.
  // ══════════════════════════════════════════════════════════════════

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self._setup(); });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) {
        setTimeout(function() { self._setup(); }, 300);
      }
    });
  },

  // ============================================================
  // logic — business logic/data: no DOM, pure computation + writes.
  // Genuinely empty here, deliberately and honestly — see the
  // dedicated note in the G53 block above for why _setup's two
  // Composio calls do not belong in it.
  // ============================================================
  logic: {},

  // ============================================================
  // ui — rendering/DOM. Both real functions: driving the Oracle chat
  // box, and the one-time rewiring pass over the quick-action button
  // row (including replacing the 4 buttons whose inline onclick
  // handlers reference a `quickPrompt` global that does not exist —
  // this runtime patch is what makes them work at all).
  // ============================================================
  ui: {

    _send: function(text) {
      var input = document.querySelector('#chat-input');
      if (!input) return;
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof sendChat === 'function') {
        sendChat();
      } else {
        var btn = document.querySelector('#send-btn') || document.querySelector('button[onclick*="sendChat"]');
        if (btn) btn.click();
      }
    },

    // F0 (Sep 2026) — real rewire, per Alex's own directive (Aug 23-24,
    // un-actioned until now): "they actually work, but are pointless in
    // this format — it needs to be changed by how it is wired into
    // oracle." All 4 real quickPrompt buttons now dispatch through
    // oracleControl's real confirm+execute mechanism (the SAME
    // oracle_actions row, the SAME confirm popup, the SAME _execute
    // dispatch a free-form typed/spoken request would hit) instead of each
    // having its own bespoke click handler — one real, unambiguous
    // button->action_id map, since a button click already knows exactly
    // which action is meant (Oracle's own LLM recognition step stays
    // available for free-form chat, it just isn't needed here). Full
    // spec: records/2026-09/f0_quickprompt_oracle_rewire_spec_2026-09-04.txt.
    // Real, previously-undocumented redundancy this replaces: the OLD code
    // below wired every "broken" quickPrompt button to a generic
    // self._send(text) chat-relay FIRST, then separately re-found and
    // ADDED a second listener for the YT-stats/Notion buttons — meaning
    // both would have fired on one click (a raw "Check my YouTube stats"
    // chat message, immediately followed by the real fetched-data relay).
    // This rewrite assigns exactly one handler per button, closing that
    // gap as a side effect of the real ask, not a separately-flagged fix.
    _setup: function() {
      var row = document.querySelector('.quick-row');
      if (!row || row.dataset.qa === '1') return;
      row.dataset.qa = '1';

      var TEXT_TO_ACTION = {
        '📋 New quests':    'new_quests',
        '📧 Draft email':   'draft_email',
        '🎬 YT stats':      'yt_stats',
        '📓 Log to Notion': 'log_notion',
      };

      var oc = RPGACE.modules.oracleControl;
      if (!oc || !oc._fetchActions) { console.warn('[quickActions] oracleControl unavailable, quick-action bar not wired'); return; }

      oc._fetchActions().then(function() {
        Array.from(row.querySelectorAll('button')).forEach(function(btn) {
          var actionId = TEXT_TO_ACTION[btn.textContent.trim()];
          if (!actionId || btn.dataset.qa) return;
          btn.dataset.qa = '1';
          btn.removeAttribute('onclick');
          btn.addEventListener('click', function() {
            var actionRow = oc._byId(actionId);
            if (!actionRow) { RPGACE.utils.toast('⚠️ This quick action isn\'t configured yet', '#E2A83D', 2500); return; }
            oc._showActionConfirm(actionRow);
          });
        });
        console.log('[RPGACE:quickActions] Quick-action bar patched (F0 rewire — all 4 through oracleControl)');
      });
    },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. No external caller invokes any METHOD of this module (verified
  // by grep of the whole repo for `RPGACE.modules.quickActions.` and of
  // index.html both — zero hits outside this module's own body; the
  // module is driven entirely by the boot task and the page:show hook
  // that `init` registers). These exist for convention and for its OWN
  // internal calls: `init` calls `self._setup()` twice, and `ui._setup`
  // reaches `self._send(...)` from three separate click closures —
  // every one of those `self`s is the module, so each lands here first
  // and is routed on to the right namespace.
  _send: function(text) { return this.ui._send(text); },
  _setup: function() { return this.ui._setup(); },

});
/* ===END:quickActions=== */
