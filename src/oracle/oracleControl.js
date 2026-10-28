
/* voiceInput module retired Aug 30 2026 (real Fable-audit-driven ask,
   Alex confirmed: "Remove the browser mic now") - reverses G41 Phase 1's
   original keep-as-fallback design, ahead of Fish Audio actually shipping.
   No replacement voice-input path exists yet; that's real, honest, and
   Alex's own explicit choice, not an oversight. Full source preserved in
   git history (git log -p -- rpgace_core.js, search "voiceInput"). */

/* ===MODULE:oracleControl=== */
// Aug 26 2026 (G41 Phase 1, real /CEO Loop 1 plan, Alex-confirmed via
// /interrogation — records/2026-08/g41_oracle_control_ceo_spec_2026-08-26.txt).
// Two real, separate pieces, built together because they're one flow end to
// end (per the spec's own real correction — the overlay IS Oracle Control's
// front door, not a separate feature):
//   1. ACTION EXECUTION: a curated, live-editable vocabulary (oracle_actions,
//      Supabase — NOT a hardcoded JS constant, per Alex's own direct catch:
//      "why pre-written, just use supabase... so whenever i update a skill it
//      can give oracle an updated pre-written"). Oracle recognizes a matching
//      phrase and ends its reply with a trailer line (ORACLE_ACTION: <id>),
//      same real mechanism visualOracle's DIRECTOR_CHOSEN/EDL_JSON trailers
//      already prove in production (rule 8) — never open-ended NL parsing,
//      never auto-execute-without-confirm (rule 4, confirm_required starts
//      true on every row, deliberately conservative).
//   2. THE OVERLAY: a real, persistent, reachable-from-anywhere entry point
//      into Oracle, extending voiceInput's own proven "one fixed floating
//      button on every page" convention (rule 8) rather than inventing a
//      new one. Sends through the EXACT SAME real pipeline the dashboard
//      chat uses (#chat-input + sendChatWithImage(), never a 2nd parallel
//      Oracle-calling mechanism) so every existing grounding wrap and the
//      oracle:response-scanned hook keep working unchanged — #chat-msgs/
//      #chat-input persist in the DOM even while their page is hidden (the
//      .page display:none convention never destroys them), so this genuinely
//      works from any page, not just while Oracle's own dashboard is open.
// Honest Phase 1 scope, matching the spec's own §4d/§6e/§7d: exactly ONE real
// action (log_beat -> beatLog._submit, unchanged). No voice path yet (needs
// Fish Audio ASR, itself dormant until Alex activates a real key) — text
// only. No auto-execute. No open-ended action vocabulary.
RPGACE.register('oracleControl', {
  domain: 'oracle',

  _actions: [],
  _actionsFetchedAt: 0,
  _ACTIONS_TTL_MS: 10 * 60 * 1000,
  _overlayOpen: false,
  _recentErrorToasts: [],
  _MAX_RECENT_ERRORS: 5,
  // Sep 14 2026 (real Alex ask, on the Cooking module: "I want oracle
  // float button to be able to take criticisms while I'm on cooking
  // module so I can discuss what I want changed") - a real, generic
  // registry any module can plug into (rule 8, not a Cooking-specific
  // hardcode inside oracleControl) so the floating overlay can silently
  // ground a message in whatever the user is actually looking at right
  // now, instead of Alex having to restate a whole recipe by hand for
  // Oracle to understand what "the method" even refers to. Keyed by a
  // short module name; each value is a zero-arg fn returning a real
  // context string, or null/'' when there's nothing relevant right now
  // (e.g. no recipe card currently open) - never a fixed always-on block.
  _contextProviders: {},

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), batch 16, module 48 of 60 — real, ratified /CEO plan
  // item: split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // predecessors already shipped and verified. Pure internal-structure
  // refactor — zero functional, behavioural, UX, data or schema change;
  // every function below was MOVED wholesale, never rewritten and never
  // split down the middle.
  //
  // This module splits 6 ui (_showSuggestConfirm, _showActionConfirm,
  // _injectOverlayButton, _toggleOverlay, _sendFromOverlay,
  // _mirrorReplyToOverlay) / 10 logic (_listenForErrorToasts,
  // buildRecentErrorsBlock, _fetchActions, _byId, matchesAnyTrigger,
  // buildActionsBlock, buildSuggestBlock, _listenForReplies,
  // _approveSuggestedAction, _execute).
  //
  // Classification rule used, identical to every prior batch: a function
  // lives in `ui` if it CONSTRUCTS OR DISCOVERS DOM (document.*,
  // createElement, getElementById, querySelector, innerHTML); otherwise in
  // `logic`. Deliberately NOT counted as a ui signal, per the standing
  // precedent: opening ANOTHER module's popup, a page-nav call, or a bare
  // RPGACE.utils.toast() — a function that merely TRIGGERS a UI action
  // without constructing any DOM of its own is logic.
  //
  // The genuinely non-obvious calls, each named with the real evidence
  // rather than silently classified — and read with extra care, because
  // this module IS the human-consent gate in front of Oracle acting on
  // RPGACE (G41): the invariant that must survive this refactor is that
  // NOTHING executes without a real Accept click, and that the confirm
  // popup shown is always the one matching what is about to happen:
  //   • The four buildXBlock/matchesAnyTrigger functions return PROMPT
  //     TEXT strings, never markup, never assigned to `.innerHTML` and
  //     never handed to a DOM element — they are string-concatenated into
  //     the outbound `system` prompt inside oracleAppGrounding's own
  //     window.callOracle wrap. That is the "builds text, not markup"
  //     case this series already named, so they are `logic`, not `ui`,
  //     despite "build" being in three of their names. (The videoSummary
  //     markup-string extension does NOT apply: none of them opens a `'<`
  //     string literal.)
  //   • logic._listenForReplies is the trailer-scan hook consumer. It
  //     constructs and discovers no DOM of its own; its whole job is
  //     regex-matching Oracle's reply text, defensively JSON-parsing a
  //     suggestion trailer, and then CALLING the two `ui` confirm popups
  //     (and _mirrorReplyToOverlay). Classified `logic` on the "merely
  //     triggers UI" clause — logic → ui calls are normal in this series.
  //   • logic._execute is the real, safety-critical dispatch branch and is
  //     `logic` on the same clause, verified by direct read rather than by
  //     name: it names no document.* API at all. It resolves dashDeck /
  //     beatLog, calls dashDeck._openPage('beat-log-panel') (another
  //     module's page-nav, explicitly not a ui signal per the rule above),
  //     and falls through to a bare RPGACE.utils.toast on an unwired
  //     action_id. Its own honest "isn't wired up yet" fail-loud path is
  //     unchanged, so an approved-but-uncoded oracle_actions row still
  //     cannot do anything.
  //   • logic._approveSuggestedAction is `logic` on the primary rule: a
  //     real RPGACE.sb.secureWrite insert plus a toast, zero DOM. It is
  //     only ever reached from ui._showSuggestConfirm's Accept handler, so
  //     the human gate in front of the write is structurally intact.
  //   • The two confirm popups are `ui` on the primary rule (both do
  //     document.createElement inside their local `esc` helper, both write
  //     pop.box.innerHTML, both querySelector their own buttons). They are
  //     deliberately kept as TWO separate functions, as before — one asks
  //     "should this RUN now", the other "should this be ADDED to the
  //     recognized list"; merging them would have collapsed two genuinely
  //     different consent questions into one.
  //
  // Real shared-state check, done directly rather than assumed: a
  // whole-body grep for `self\.X =` / `this\.X =` found exactly three
  // runtime-written module fields — `_actions`, `_actionsFetchedAt` and
  // `_overlayOpen` — and, unlike chroniclesLog._allItems /
  // journalQoL._activeSource, all three ARE real declared top-level keys
  // already (plus `_recentErrorToasts`, mutated in place rather than
  // reassigned). Every one of them is kept at MODULE scope above,
  // deliberately not nested inside `logic` or `ui`:
  //   • `_actions` / `_actionsFetchedAt` / `_ACTIONS_TTL_MS` are the live
  //     oracle_actions cache + its TTL, written by logic._fetchActions and
  //     read by logic._byId, logic.matchesAnyTrigger and
  //     logic.buildActionsBlock. All four resolve them through
  //     `RPGACE.modules.oracleControl`. If this were wrong,
  //     matchesAnyTrigger would read a permanently-empty second copy and
  //     the whole action gate would silently never fire — the failure
  //     would look like "Oracle just ignores me", with no error anywhere.
  //   • `_recentErrorToasts` / `_MAX_RECENT_ERRORS` are written by
  //     logic._listenForErrorToasts and read by
  //     logic.buildRecentErrorsBlock — same module handle in both.
  //   • `_overlayOpen` is written ONLY by ui._toggleOverlay (verified by
  //     grep: 3 total references, the declaration plus both writes) and is
  //     still written through the module handle rather than `this`, so a
  //     future reader outside `ui` sees the same value.
  //
  // Real, load-bearing external touchpoints, all confirmed by grep and all
  // preserved by the pass-throughs below (checked in all three reference
  // forms per the standing two-greps discipline):
  //   • rpgace_core.js:9585-9619 — oracleAppGrounding's window.callOracle
  //     wrap takes a LOCAL ALIAS (`var oc = RPGACE.modules.oracleControl;`)
  //     and calls FOUR methods through it: `oc.matchesAnyTrigger(lower)`,
  //     `oc.buildActionsBlock()`, `oc.buildSuggestBlock()` and
  //     `oc.buildRecentErrorsBlock()`, each behind an `oc && oc.method &&`
  //     presence guard — so the pass-throughs must exist as own-properties
  //     on the module, which they do. This is the alias form a plain
  //     `RPGACE.modules.oracleControl.` grep would have missed entirely.
  //   • Five in-module `RPGACE.modules.oracleControl.X(...)` calls inside
  //     event handlers (:33368 _approveSuggestedAction, :33434 _execute,
  //     :33480 / :33501 _toggleOverlay, :33506 _sendFromOverlay) — these
  //     were ALREADY written against the module rather than `this`,
  //     because they run as DOM callbacks, and are unchanged.
  // No reference exists in index.html or any other file (checked;
  // api/data-write.js names _approveSuggestedAction in a comment only),
  // and no dynamic `RPGACE.modules['oracleControl']` bracket lookup exists.
  // ══════════════════════════════════════════════════════════════════

  init: function() {
    var self = this;
    self._fetchActions();
    self._listenForReplies();
    self._listenForErrorToasts();
    RPGACE.registerBootTask(function() { return self._injectOverlayButton(); });
  },

  // ============================================================
  // logic — business logic/data: the live oracle_actions cache, the
  // recent-error buffer, every outbound prompt-text block builder, the
  // trailer-scan hook consumer, the suggested-action write, and the real
  // action dispatch. Constructs and discovers no DOM, and builds no
  // markup string (see the rule extension above).
  // ============================================================
  logic: {

  // Aug 26 2026 (real Alex ask: "make these toast visible and hookable for
  // oracle to pick up") — this is the honest, buildable version of that:
  // Oracle still has zero live DOM-watching ability (it only ever runs
  // when a real message is sent to it), but it now carries real, recent
  // context about what actually just went wrong, so the NEXT time Alex
  // talks to it ("why does this keep failing"), it can see real evidence
  // instead of nothing. A small in-memory buffer (last 5, this session
  // only - not persisted, error_log.html already IS the durable record
  // via toast()'s own new _capture call) rather than a live subscription
  // firing an Oracle call on every toast, which would be a real,
  // unbounded per-error API cost (rule 11) for something that's usually
  // only relevant if Alex actually asks about it.
  _listenForErrorToasts: function() {
    var self = RPGACE.modules.oracleControl;
    RPGACE.hooks.on('rpgace:error-toast', function(evt) {
      self._recentErrorToasts.push(evt);
      if (self._recentErrorToasts.length > self._MAX_RECENT_ERRORS) self._recentErrorToasts.shift();
    });
  },

  // Rides the SAME oracleAppGrounding TRIGGER_KEYWORDS gate (rule 8, no
  // new heuristic) — that list already includes "known bug"/"known
  // issue"/"what's broken"/"whats broken", genuinely the right semantic
  // territory for "why do things keep failing." Returns '' (no block at
  // all) when nothing has actually gone wrong recently - never manufactures
  // a report out of an empty buffer.
  buildRecentErrorsBlock: function() {
    var self = RPGACE.modules.oracleControl;
    if (!self._recentErrorToasts.length) return '';
    var lines = self._recentErrorToasts.map(function(e) {
      var secsAgo = Math.round((Date.now() - e.ts) / 1000);
      return '- (' + secsAgo + 's ago) "' + e.msg + '"';
    });
    return '\n\nRECENT REAL ERROR TOASTS THIS SESSION (most recent ' + self._recentErrorToasts.length + '): if Alex asks why something is failing or broken, check whether one of these is the real cause before speculating:\n' + lines.join('\n');
  },

  // Sep 14 2026 - real, generic "what is Alex currently looking at"
  // registry for the floating overlay (see _contextProviders' own
  // comment above). A module calls this once, in its own init(), with a
  // zero-arg function; nothing here assumes what that function returns
  // beyond "a string, or something falsy when not relevant right now".
  registerContextProvider: function(key, fn) {
    if (!key || typeof fn !== 'function') return;
    RPGACE.modules.oracleControl._contextProviders[key] = fn;
  },

  // Real-time evaluation, never cached - a provider's own "is this still
  // relevant" check (e.g. cookingOracle's own _recipeCardOpen flag) must
  // run fresh on every overlay send, since the user may have closed
  // whatever they were looking at between messages.
  _buildRegisteredContext: function() {
    var providers = RPGACE.modules.oracleControl._contextProviders;
    var blocks = [];
    Object.keys(providers).forEach(function(key) {
      var text;
      try { text = providers[key](); } catch (e) { text = null; }
      if (text) blocks.push(String(text));
    });
    if (!blocks.length) return '';
    return 'Context on what I\'m currently looking at in the app: ' + blocks.join(' ') + '\n\nMy message: ';
  },

  // ── 1. Live oracle_actions fetch — same fetch-then-inject shape as       ──
  // ── oracle_module_anatomy (rule 8), so an edit/add/retire lands on the   ──
  // ── very next real Oracle call, zero redeploy needed for a content-only  ──
  // ── change.
  _fetchActions: function(force) {
    var self = RPGACE.modules.oracleControl;
    if (!force && self._actions.length && Date.now() - self._actionsFetchedAt < self._ACTIONS_TTL_MS) {
      return Promise.resolve(self._actions);
    }
    if (!RPGACE.sb || !RPGACE.sb.select) return Promise.resolve(self._actions);
    return RPGACE.sb.select('oracle_actions', 'active=eq.true&select=action_id,trigger_phrases,target,data_touched,explanation_significance,explanation_path_reasoning,explanation_benefit,confirm_required')
      .then(function(rows) {
        self._actions = rows || [];
        self._actionsFetchedAt = Date.now();
        return self._actions;
      })
      .catch(function() { return self._actions; }); // fails open — keeps whatever was already cached
  },

  _byId: function(actionId) {
    return (RPGACE.modules.oracleControl._actions || []).find(function(a) { return a.action_id === actionId; });
  },

  // Cheap, synchronous, cache-only check — deliberately never awaits a fresh
  // fetch (this runs inside oracleAppGrounding's own window.callOracle wrap,
  // which must stay synchronous up to the point it decides whether to await
  // anything at all — see that module's own comment on why a 4th wrap is a
  // real landmine). A cold cache just means this gate misses once; the
  // background _fetchActions() call from init() almost always wins the race.
  matchesAnyTrigger: function(lowerText) {
    return (RPGACE.modules.oracleControl._actions || []).some(function(a) {
      return (a.trigger_phrases || []).some(function(p) { return lowerText.indexOf(String(p).toLowerCase()) !== -1; });
    });
  },

  buildActionsBlock: function() {
    var self = RPGACE.modules.oracleControl;
    if (!self._actions.length) return '';
    var lines = self._actions.map(function(a) {
      return '- "' + (a.trigger_phrases || []).join('" / "') + '" -> ORACLE_ACTION: ' + a.action_id;
    });
    return '\n\nRECOGNIZED ACTIONS: if the user\'s message clearly, confidently matches one of the phrasings below, end your ENTIRE reply with exactly one trailer line, on its own line, nothing after it:\nORACLE_ACTION: <action_id>\n' + lines.join('\n') + '\nOnly emit this trailer when you are genuinely confident the user wants that specific action performed right now — never guess, and never emit more than one trailer in a single reply.';
  },

  // ── Aug 26 2026, G41 Phase 2 ("self-aware vocabulary growth") ────────────
  // Real Alex-confirmed choice, via /paranoia + /CEO-Drift (records/2026-08/
  // g41_oracle_control_ceo_spec_2026-08-26.txt section 9). Deliberately
  // keeps every existing safety property Phase 1 already established:
  // Oracle only ever DRAFTS a suggestion here, it never writes anything or
  // executes anything itself. A suggestion becomes a real, live oracle_
  // actions row only once Alex explicitly approves it (_approveSuggestedAction
  // below) - and EVEN THEN it still needs a real, human-coded _execute()
  // branch (same as log_beat has) before Accept on the per-use confirm can
  // ever do anything beyond an honest "not wired up yet" toast. Three real
  // gates, not one - see this module's own header comment.
  buildSuggestBlock: function() {
    return '\n\nSUGGESTING A NEW ACTION: if the user is asking you to DO something real in RPGACE (not just asking a question) that genuinely is NOT one of the recognized actions above, and you can confidently name a SPECIFIC real module/function from your own self-awareness knowledge (oracle_module_anatomy) that would handle it, you MAY end your reply with a suggestion trailer instead of an ORACLE_ACTION one - never both in the same reply. The trailer must be exactly this shape, on its own line, valid JSON, nothing after it:\nORACLE_SUGGEST_ACTION: {"target":"module.method","trigger_phrase":"a short phrase that would trigger this next time","description":"one plain sentence describing what this would do"}\nOnly do this when you are genuinely confident the module/function you are naming actually exists - never invent one. If you are not sure, say so in your reply instead and do not emit this trailer at all. This never executes anything by itself - it only ever proposes Alex add it to the recognized list.';
  },

  // ── 2. Trailer-scan consumer — same shared oracle:response-scanned hook  ──
  // ── DIRECTOR_CHOSEN/EDL_JSON already use (rule 8), fires regardless of   ──
  // ── which page/panel the reply actually rendered on (the observer      ──
  // ── watches #send-btn's disabled attribute + #chat-msgs' own content,   ──
  // ── neither gated on CSS visibility) — so this correctly fires whether  ──
  // ── the message came from the dashboard chat OR this module's own       ──
  // ── overlay (both funnel through the same real sendChatWithImage()).
  _listenForReplies: function() {
    var self = RPGACE.modules.oracleControl;
    RPGACE.hooks.on('oracle:response-scanned', function(text) {
      if (!text) return;
      var m = /ORACLE_ACTION:\s*([a-z0-9_]+)/i.exec(text);
      if (m) {
        var actionId = m[1];
        self._fetchActions().then(function() {
          var row = self._byId(actionId);
          if (!row) { console.warn('[oracleControl] unrecognized ORACLE_ACTION id:', actionId); return; }
          self._showActionConfirm(row);
        });
      }
      // Aug 26 2026, G41 Phase 2 — real, defensive JSON parse (rule 5: never
      // trust model JSON blindly). A malformed/incomplete trailer (a real
      // possibility — markdown rendering, a truncated reply) is silently
      // ignored, same fails-open discipline as everywhere else in this
      // project, never a thrown error surfaced to Alex.
      var sm = /ORACLE_SUGGEST_ACTION:\s*(\{[\s\S]*\})\s*$/i.exec(text);
      if (sm) {
        try {
          var suggestion = JSON.parse(sm[1]);
          if (suggestion && suggestion.target && suggestion.trigger_phrase && suggestion.description) {
            self._showSuggestConfirm(suggestion);
          }
        } catch (e) { console.warn('[oracleControl] malformed ORACLE_SUGGEST_ACTION JSON, ignored:', e.message); }
      }
      self._mirrorReplyToOverlay(text);
    });
  },

  // Writes a real, new oracle_actions row via the server-side write proxy
  // (this table is anon_read_only, matching oracle_module_anatomy's own
  // RLS posture — the plain anon key cannot insert into it directly).
  // action_id is derived defensively from the trigger phrase, never taken
  // as free text from the model (rule 5's own "sanitize structure-affecting
  // output in code" discipline).
  _approveSuggestedAction: function(suggestion) {
    var self = RPGACE.modules.oracleControl;
    var slug = String(suggestion.trigger_phrase || 'oracle_action')
      .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || ('oracle_action_' + Date.now());
    var today = new Date().toISOString().slice(0, 10);
    RPGACE.sb.secureWrite('oracle_actions', 'insert', {
      action_id: slug,
      trigger_phrases: [suggestion.trigger_phrase],
      target: suggestion.target,
      data_touched: [],
      explanation_significance: suggestion.description,
      explanation_path_reasoning: 'Suggested by Oracle from its own module self-awareness; approved by Alex on ' + today + '. Not yet wired to a real execution path unless a future session has coded one.',
      explanation_benefit: suggestion.description,
      confirm_required: true,
      active: true,
    }).then(function() {
      RPGACE.utils.toast('✅ Added "' + suggestion.trigger_phrase + '" to Oracle\'s recognized actions', '#4CAF82', 3000);
      self._fetchActions(true);
    }).catch(function(e) {
      console.warn('[oracleControl] failed to save suggested action:', e.message);
      RPGACE.utils.toast('⚠️ Could not save that suggestion: ' + e.message, '#E2A83D', 3500);
    });
  },

  // ── 4. Real execution — Phase 1 has exactly one real target, unchanged. ──
  _execute: function(row, details) {
    details = (details == null ? '' : String(details)).trim();
    if (row.action_id === 'log_beat') {
      var dd = RPGACE.modules.dashDeck;
      var bl = RPGACE.modules.beatLog;
      var runSubmit = function() { if (bl && bl._submit) bl._submit(); };
      // Same real open-then-inject-then-act pattern _openRetroactive already
      // uses (rule 8) — beatLog._submit reads its data straight off the
      // live DOM form (#bl-title/#bl-mood/etc, see _getForm), so the panel
      // has to actually be open and rendered before submit can read anything
      // real from it. If the form is empty, _submit's own existing
      // validation toasts "Add a beat title first" — the exact same
      // fail-loud behavior a manual click would get, unchanged.
      // Aug 31 2026 (UI11) — navigates to the real #page-beat-log instead of
      // a transient popup (dashDeck._openPage, PAGE_PANELS already carries
      // beat-log-panel's real ensure fn).
      if (dd && dd._openPage) {
        dd._openPage('beat-log-panel');
        setTimeout(runSubmit, 450);
      } else if (bl && bl._inject) {
        bl._inject();
        setTimeout(runSubmit, 450);
      } else {
        runSubmit();
      }
      return;
    }

    // F0 (Sep 2026) — 4 real dispatch branches for the quickPrompt rewire.
    // All 4 skip a live Oracle chat round-trip for RECOGNITION (Alex's own
    // confirmed answer — a button click is already unambiguous, unlike a
    // free-form typed/spoken request, so Oracle's own LLM doesn't need to
    // re-interpret it); yt_stats still relays real fetched data INTO
    // Oracle chat afterward, same as before this rewire — that's the real
    // payoff of the action, not a redundant recognition step, so it's
    // unchanged.
    if (row.action_id === 'log_outreach') {
      // XP-7: opens the outreach log form filled in from what Alex said;
      // nothing is saved until he presses Save there.
      var pt = RPGACE.modules.producerTools;
      var um = document.querySelectorAll('#chat-msgs .msg.user');
      var said = details || (um.length ? um[um.length - 1].textContent.trim() : '');
      pt.ui.openOutreach({ kind: pt.logic.outreachKind(said), note: said.slice(0, 300) });
      return;
    }
    if (row.action_id === 'new_quests') {
      var qe = RPGACE.modules.questEngine;
      if (!qe || !qe.refresh) { RPGACE.utils.toast('⚠️ Quest engine unavailable', '#E2A83D', 2500); return; }
      RPGACE.utils.toast('🔄 Checking for new quests...', '#9B59B6', 2200);
      qe.refresh(); // details is genuinely inert here — refresh() takes no real parameters
      return;
    }

    if (row.action_id === 'draft_email') {
      // Real, deliberate design choice: no live Oracle call happens here
      // (this action skips the chat round-trip like the other 3), so
      // "details" IS the real draft content — Alex types who it's to and
      // what it should say, this saves exactly that as a real Gmail draft.
      // Fails loud on either missing piece rather than guessing or
      // defaulting to Alex's own address (never sent as a payload value
      // without his explicit say-so).
      if (!details) { RPGACE.utils.toast('⚠️ Add who this is to and what it should say in the details box first', '#E2A83D', 3500); return; }
      var emailMatch = details.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
      if (!emailMatch) { RPGACE.utils.toast('⚠️ Include the recipient\'s email address in the details', '#E2A83D', 3500); return; }
      var todayStr = new Date().toLocaleDateString();
      RPGACE.api('GMAIL_CREATE_EMAIL_DRAFT', {
        subject: 'Collab Outreach — ' + todayStr,
        body: details,
        to: emailMatch[0],
      }).then(function() {
        RPGACE.utils.toast('📧 Draft saved to Gmail', '#9B6EC8', 3000);
      }).catch(function(err) {
        RPGACE.utils.toast('⚠️ Gmail draft failed: ' + err.message, '#CC4A4A', 3500);
      });
      return;
    }

    if (row.action_id === 'yt_stats') {
      // Real, unchanged Composio call this button has always used — moved
      // here from quickActions' own bespoke click handler (rule 8, one
      // real caller now that quickActions dispatches through this
      // module), only the trigger mechanism changed.
      var qaSend = RPGACE.modules.quickActions;
      RPGACE.utils.toast('Fetching YouTube stats...', '#C9A84C', 2000);
      RPGACE.api('SUPADATA_GET_YOUTUBE_CHANNEL', { id: '@AceSanyaBeats' })
        .then(function(result) {
          var d = result.data || result;
          var msg = '📊 YouTube Stats for @AceSanyaBeats:\n'
            + 'Channel: ' + (d.name || 'AceSanya') + '\n'
            + 'Handle: ' + (d.handle || '@AceSanyaBeats') + '\n'
            + 'Total Views: ' + (d.viewCount || 0) + '\n'
            + 'Videos Published: ' + (d.videoCount || 0) + '\n'
            + (d.description ? 'Bio: ' + d.description + '\n' : '')
            + (details ? '\nAdditional context: ' + details + '\n' : '')
            + '\nGiven this is an early-stage channel (FL Studio / UK hip hop, targeting aspiring producers 18-35), what are the 3 most important things I should do THIS WEEK to grow @AceSanyaBeats? Be specific and actionable.';
          if (qaSend && qaSend._send) qaSend._send(msg);
        })
        .catch(function(err) {
          if (qaSend && qaSend._send) qaSend._send('YouTube stats fetch failed: ' + err.message);
        });
      return;
    }

    if (row.action_id === 'log_notion') {
      // Real, unchanged Composio call this button has always used — same
      // rule-8 move as yt_stats above.
      var today2 = new Date().toISOString().split('T')[0];
      var pageTitle = 'RPGACE Session Log — ' + today2;
      RPGACE.api('NOTION_CREATE_NOTION_PAGE', {
        parent_id: '3830f922-7ad0-8064-ac35-f6ebaff22b99',
        title: pageTitle,
        markdown: '## Session Log\n**Date:** ' + today2 + '\n\n**Source:** RPGACE Oracle\n\nSession logged from RPGACE.' + (details ? '\n\n**Notes:** ' + details : ''),
      }).then(function() {
        RPGACE.utils.toast('📓 Logged to Notion: ' + pageTitle, '#9B6EC8', 3000);
      }).catch(function(err) {
        RPGACE.utils.toast('Notion failed: ' + err.message, '#CC4A4A', 3000);
      });
      return;
    }

    console.warn('[oracleControl] no execution handler wired for action:', row.action_id);
    RPGACE.utils.toast('⚠️ This Oracle action isn\'t wired up yet', '#E2A83D', 2500);
  },

  },

  // ============================================================
  // ui — rendering/DOM: the two DELIBERATELY-SEPARATE human confirm
  // popups (run-this-now vs. add-this-to-the-list), and the whole
  // floating overlay surface (button, panel, outbound send, reply
  // mirror).
  // ============================================================
  ui: {

  // ── Real, DISTINCT confirm — deliberately NOT the same popup as          ──
  // ── _showActionConfirm: this one only asks "should this be ADDED to the  ──
  // ── recognized list," never "should this run right now." Accepting here  ──
  // ── writes a real oracle_actions row (via the server-side write proxy,   ──
  // ── same pattern as every other RLS-restricted table) but does NOT      ──
  // ── execute anything - a brand-new action_id still hits _execute()'s own ──
  // ── honest "not wired up yet" toast until a human actually codes a real  ──
  // ── dispatch branch for it, exactly like log_beat's own branch was.
  _showSuggestConfirm: function(suggestion) {
    var dd = RPGACE.modules.dashDeck;
    if (!dd || !dd._popup) { console.warn('[oracleControl] dashDeck._popup unavailable, cannot show suggest confirm'); return; }
    var pop = dd._popup({
      eyebrow: '💡 Oracle has a suggestion',
      title: 'Add this as a new Oracle action?',
      accent: '#4CAF82',
      borderColor: '#4CAF82',
      width: '440px',
      noDefaultClose: true,
    });
    var esc = function(s) { var d = document.createElement('div'); d.textContent = String(s || ''); return d.innerHTML; };
    pop.box.innerHTML =
      '<div style="font-size:13px;color:rgba(226,226,236,0.85);margin-bottom:10px;">' + esc(suggestion.description) + '</div>' +
      '<div style="font-size:12px;color:rgba(226,226,236,0.55);margin-bottom:6px;"><b>Would call:</b> ' + esc(suggestion.target) + '</div>' +
      '<div style="font-size:12px;color:rgba(226,226,236,0.55);margin-bottom:14px;"><b>Trigger phrase:</b> "' + esc(suggestion.trigger_phrase) + '"</div>' +
      '<div style="font-size:11.5px;color:rgba(226,226,236,0.4);margin-bottom:14px;">This only adds it to Oracle\'s recognized list — it still needs a real, coded execution path before it can actually run anything, exactly like every other action here.</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
        '<button id="oc-suggest-deny" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(226,226,236,0.2);background:none;color:rgba(226,226,236,0.7);font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;">No thanks</button>' +
        '<button id="oc-suggest-accept" style="padding:8px 16px;border-radius:8px;border:none;background:#4CAF82;color:#fff;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;">Add as new action</button>' +
      '</div>';
    pop.box.querySelector('#oc-suggest-deny').onclick = function() { pop.close(); };
    pop.box.querySelector('#oc-suggest-accept').onclick = function() {
      pop.close();
      RPGACE.modules.oracleControl._approveSuggestedAction(suggestion);
    };
  },

  // ── 3. Confirm popup — matches taxonomy's own _showPlacementConfirm      ──
  // ── pattern (rule 4: a real button, never typed "yes"), routed through   ──
  // ── dashDeck._popup() per the spec's own resolved open question (§5i).
  _showActionConfirm: function(row) {
    var dd = RPGACE.modules.dashDeck;
    if (!dd || !dd._popup) { console.warn('[oracleControl] dashDeck._popup unavailable, cannot show confirm'); return; }
    var pop = dd._popup({
      eyebrow: '🔮 Oracle wants to act',
      title: row.action_id.replace(/_/g, ' '),
      accent: '#9B59B6',
      borderColor: '#9B59B6',
      width: '440px',
      noDefaultClose: true,
    });
    var esc = function(s) { var d = document.createElement('div'); d.textContent = String(s || ''); return d.innerHTML; };
    pop.box.innerHTML =
      '<div style="font-size:13px;color:rgba(226,226,236,0.85);margin-bottom:10px;"><b>What happens:</b> ' + esc(row.explanation_significance) + '</div>' +
      '<div style="font-size:13px;color:rgba(226,226,236,0.65);margin-bottom:10px;"><b>Data touched:</b> ' + esc((row.data_touched || []).join(', ')) + '</div>' +
      '<div style="font-size:13px;color:rgba(226,226,236,0.65);margin-bottom:10px;"><b>Why this path:</b> ' + esc(row.explanation_path_reasoning) + '</div>' +
      '<div style="font-size:13px;color:rgba(226,226,236,0.65);margin-bottom:14px;"><b>Benefit:</b> ' + esc(row.explanation_benefit) + '</div>' +
      // F0 (Sep 2026): a real, optional free-text field — Alex's own
      // direct ask alongside confirming "skip the live Oracle chat
      // round-trip" for the quickPrompt rewire ("question pop up on any
      // details I want to include, with option to add nothing if
      // needed"). Read once on Accept, passed straight through to
      // _execute as a plain string — genuinely inert for an action that
      // has nothing to attach it to (new_quests), the real required
      // input for one (draft_email needs a recipient address in here),
      // optional extra context for the rest.
      '<div style="margin-bottom:14px;">' +
        '<label style="display:block;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:rgba(226,226,236,0.5);margin-bottom:6px;">Any details to include? (optional)</label>' +
        '<textarea id="oc-details-input" rows="2" placeholder="Leave blank if not needed" style="width:100%;resize:vertical;background:rgba(255,255,255,0.04);border:1px solid rgba(226,226,236,0.15);border-radius:8px;color:var(--text);font-size:12.5px;padding:8px 10px;font-family:Rajdhani,sans-serif;box-sizing:border-box;"></textarea>' +
      '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
        '<button id="oc-deny-btn" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(226,226,236,0.2);background:none;color:rgba(226,226,236,0.7);font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;">Deny</button>' +
        '<button id="oc-accept-btn" style="padding:8px 16px;border-radius:8px;border:none;background:#9B59B6;color:#fff;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;">Accept</button>' +
      '</div>';
    pop.box.querySelector('#oc-deny-btn').onclick = function() {
      pop.close();
      RPGACE.utils.toast('Cancelled — nothing was done', '#E2A83D', 2200);
      // Spec §5ii's own recommended answer: a plain toast is enough for
      // Phase 1, a denial log is real future scope-creep for one action.
    };
    pop.box.querySelector('#oc-accept-btn').onclick = function() {
      var detailsEl = pop.box.querySelector('#oc-details-input');
      var details = detailsEl ? detailsEl.value : '';
      pop.close();
      RPGACE.modules.oracleControl._execute(row, details);
    };
  },

  // ── 5. The overlay — a real, persistent, reachable-from-anywhere entry   ──
  // ── point (spec §7). Extends voiceInput's own proven fixed-button        ──
  // ── convention (rule 8) rather than a 2nd competing floating element —   ──
  // ── sits directly beside the mic button, same size/z-index tier.        ──
  _injectOverlayButton: function() {
    if (document.getElementById('oc-floating-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'oc-floating-btn';
    btn.title = 'Talk to Oracle from anywhere';
    btn.textContent = '🔮';
    btn.style.cssText = 'position:fixed;bottom:24px;right:84px;width:52px;height:52px;border-radius:50%;background:#0c0c16;border:2px solid rgba(155,89,182,.5);color:#9B59B6;font-size:22px;cursor:pointer;z-index:999999;box-shadow:0 6px 20px rgba(0,0,0,.5);';
    btn.onclick = function() { RPGACE.modules.oracleControl._toggleOverlay(); };
    document.body.appendChild(btn);
  },

  _toggleOverlay: function() {
    var self = RPGACE.modules.oracleControl;
    var panel = document.getElementById('oc-overlay-panel');
    if (panel) { panel.remove(); self._overlayOpen = false; return; }
    self._overlayOpen = true;
    var box = document.createElement('div');
    box.id = 'oc-overlay-panel';
    box.style.cssText = 'position:fixed;bottom:84px;right:20px;width:min(340px,88vw);max-height:60vh;background:#0c0c16;border:1px solid rgba(155,89,182,.4);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.6);z-index:999998;display:flex;flex-direction:column;overflow:hidden;font-family:Rajdhani,sans-serif;';
    box.innerHTML =
      '<div style="padding:10px 14px;border-bottom:1px solid rgba(155,89,182,.25);font-size:12px;font-weight:700;letter-spacing:1px;color:#9B59B6;display:flex;justify-content:space-between;align-items:center;">' +
        '<span>🔮 ORACLE</span><button id="oc-ov-close" style="background:none;border:none;color:rgba(226,226,236,.5);font-size:16px;cursor:pointer;">✕</button>' +
      '</div>' +
      '<div id="oc-ov-log" style="flex:1;overflow-y:auto;padding:10px 14px;font-size:12.5px;color:rgba(226,226,236,.85);max-height:220px;"></div>' +
      '<div style="display:flex;gap:6px;padding:10px 12px;border-top:1px solid rgba(155,89,182,.2);">' +
        '<textarea id="oc-ov-input" rows="1" placeholder="Talk to Oracle..." style="flex:1;resize:none;background:rgba(255,255,255,.04);border:1px solid rgba(226,226,236,.15);border-radius:8px;color:var(--text);font-size:12.5px;padding:8px 10px;font-family:Rajdhani,sans-serif;"></textarea>' +
        '<button id="oc-ov-send" style="padding:0 14px;border-radius:8px;border:none;background:#9B59B6;color:#fff;font-weight:700;cursor:pointer;">Send</button>' +
      '</div>';
    document.body.appendChild(box);
    box.querySelector('#oc-ov-close').onclick = function() { RPGACE.modules.oracleControl._toggleOverlay(); };
    var send = function() {
      var input = box.querySelector('#oc-ov-input');
      var text = (input.value || '').trim();
      if (!text) return;
      RPGACE.modules.oracleControl._sendFromOverlay(text);
      input.value = '';
    };
    box.querySelector('#oc-ov-send').onclick = send;
    box.querySelector('#oc-ov-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
  },

  // Real reuse (rule 8), NOT a 2nd Oracle-calling mechanism: #chat-input/
  // #chat-msgs/#send-btn are real, static elements defined once in
  // index.html inside the Oracle page — RPGACE's .page display:none
  // convention never destroys them on navigation, so setting the value and
  // calling the SAME global sendChatWithImage() the real SEND button calls
  // works identically whether or not the Oracle page is the one currently
  // visible. This is genuinely the smallest possible build: zero forked
  // grounding, zero forked streaming, zero 2nd system prompt.
  _sendFromOverlay: function(text) {
    var log = document.getElementById('oc-ov-log');
    if (log) {
      var you = document.createElement('div');
      you.style.cssText = 'margin-bottom:8px;color:var(--gold,#C9A84C);';
      you.textContent = '🧑 ' + text;
      log.appendChild(you);
      var thinking = document.createElement('div');
      thinking.id = 'oc-ov-thinking';
      thinking.style.cssText = 'color:rgba(226,226,236,.4);font-style:italic;';
      thinking.textContent = 'Oracle is thinking...';
      log.appendChild(thinking);
      log.scrollTop = 99999;
    }
    var input = document.getElementById('chat-input');
    if (!input) { RPGACE.utils.toast('⚠️ Oracle chat isn\'t ready yet — open the Oracle page once first', '#E2A83D', 3000); return; }
    // Sep 14 2026 - real context grounding (see registerContextProvider's
    // own comment): the visible chat log/bubble above still shows Alex's
    // own exact typed words (`you.textContent = '🧑 ' + text`, unchanged),
    // only the ACTUAL text sent to Oracle gets the silent context prefix,
    // so criticism like "the method is poor" lands already knowing which
    // recipe/method "the method" refers to.
    var contextPrefix = RPGACE.modules.oracleControl.logic._buildRegisteredContext();
    window._ocLastTyped = text; // LL-4: a starred answer's title is what Alex typed, not the context prefix
    input.value = contextPrefix ? (contextPrefix + text) : text;
    if (typeof window.sendChatWithImage === 'function') window.sendChatWithImage();
    else if (typeof window.sendChat === 'function') window.sendChat();
  },

  // Mirrors whatever the real dashboard chat just rendered into the
  // overlay's own compact log, so a message sent from the overlay gets its
  // reply visible IN the overlay too, without a 2nd rendering of the real
  // reply text (this reads the same text oracle:response-scanned already
  // carries — never re-fetches or re-renders from scratch).
  _mirrorReplyToOverlay: function(text) {
    var log = document.getElementById('oc-ov-log');
    if (!log) return; // overlay isn't open — nothing to mirror into
    var thinking = document.getElementById('oc-ov-thinking');
    if (thinking) thinking.remove();
    var reply = document.createElement('div');
    reply.style.cssText = 'margin-bottom:8px;';
    // Sep 14 2026 - also strip a RECIPE_UPDATE_JSON: trailer (cookingOracle's
    // own "close the loop" trailer, see that module's registerContextProvider
    // block). This IS the one real shared strip point every trailer-emitting
    // consumer of this hook routes through (rule 8) - a raw JSON blob left
    // in the visible bubble would directly work against Alex's own ask for
    // a clean, minimal "only changes shown" decision surface (the real diff
    // itself shows in its own separate confirm popup, never here).
    reply.textContent = '🔮 ' + String(text || '')
      .replace(/\n?ORACLE_ACTION:\s*[a-z0-9_]+\s*$/i, '')
      .replace(/\n?RECIPE_UPDATE_JSON:\s*\{[\s\S]*\}\s*$/i, '')
      .trim();
    log.appendChild(reply);
    // LL-4: same ⭐ as the main chat, for the exchange sendChat just recorded.
    var ll = RPGACE.modules.lifeLibrary;
    if (ll && window._lastOracleExchange) {
      var star = ll.ui.starButton(window._lastOracleExchange);
      star.style.margin = '0 0 10px 0';
      log.appendChild(star);
    }
    log.scrollTop = 99999;
  },

  },

  // Thin top-level pass-throughs — preserve the exact existing public API.
  // Real, load-bearing external touchpoints these carry (see the G53 block
  // above): oracleAppGrounding's own window.callOracle wrap reaches FOUR of
  // them through a LOCAL ALIAS (`var oc = RPGACE.modules.oracleControl;` at
  // :9585) — matchesAnyTrigger, buildActionsBlock, buildSuggestBlock and
  // buildRecentErrorsBlock — each behind an `oc && oc.method &&` presence
  // guard, so every one must remain a real own-property on the module.
  // Also carries this module's own internal cross-namespace calls
  // (logic._listenForReplies -> ui._showActionConfirm /
  // ui._showSuggestConfirm / ui._mirrorReplyToOverlay;
  // ui._showSuggestConfirm -> logic._approveSuggestedAction;
  // ui._showActionConfirm -> logic._execute) — every one goes through the
  // module handle, never `this.ui.X` / `this.logic.X` directly, so no call
  // site inside the module had to change.
  _listenForErrorToasts: function() { return this.logic._listenForErrorToasts(); },
  buildRecentErrorsBlock: function() { return this.logic.buildRecentErrorsBlock(); },
  registerContextProvider: function(key, fn) { return this.logic.registerContextProvider(key, fn); },
  _fetchActions: function(force) { return this.logic._fetchActions(force); },
  _byId: function(actionId) { return this.logic._byId(actionId); },
  matchesAnyTrigger: function(lowerText) { return this.logic.matchesAnyTrigger(lowerText); },
  buildActionsBlock: function() { return this.logic.buildActionsBlock(); },
  buildSuggestBlock: function() { return this.logic.buildSuggestBlock(); },
  _listenForReplies: function() { return this.logic._listenForReplies(); },
  _approveSuggestedAction: function(suggestion) { return this.logic._approveSuggestedAction(suggestion); },
  _execute: function(row, details) { return this.logic._execute(row, details); },
  _showSuggestConfirm: function(suggestion) { return this.ui._showSuggestConfirm(suggestion); },
  _showActionConfirm: function(row) { return this.ui._showActionConfirm(row); },
  _injectOverlayButton: function() { return this.ui._injectOverlayButton(); },
  _toggleOverlay: function() { return this.ui._toggleOverlay(); },
  _sendFromOverlay: function(text) { return this.ui._sendFromOverlay(text); },
  _mirrorReplyToOverlay: function(text) { return this.ui._mirrorReplyToOverlay(text); },

});
/* ===END:oracleControl=== */
