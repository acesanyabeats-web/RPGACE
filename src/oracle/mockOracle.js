
/* ===MODULE:mockOracle=== */
// Aug 6 (Alex out of real Anthropic credits, real "test the wiring without
// Oracle actually thinking" ask) — a real, honest fake-Oracle mode. Every
// reply generated this way is unmistakably labeled (rule 7 - fail loud,
// never silently indistinguishable from a real response), and the ONLY
// thing it replaces is the actual network call inside callOracle() in
// main.js (see the comment there) - every real button click, DOM update,
// hook fire (oracle:response-scanned), Supabase write, and trailer-parse
// (_saveDocToProduction's DIRECTOR_CHOSEN:/EDL_JSON: regexes) still runs
// authentically on top of the fake text, so this genuinely exercises real
// app wiring end-to-end without spending real API tokens. Off by default,
// zero DOM footprint when off (matches the no-post-login-pop-in
// convention every other module here follows).
RPGACE.register('mockOracle', {
  domain: 'oracle',

  // Aug 6, same day, 2nd pass: extended from a binary Dummy/Real switch to
  // a real 3-state Oracle Mode, per Alex's own direct spec ("in the toggle
  // in top right as a third mode. think of those oracle functions as
  // modes"). MODE_KEY replaces the old binary STORAGE_KEY; the old key is
  // migrated once in init() and never written again, so no dangling second
  // source of truth survives (rule 8). isEnabled() is kept as the exact
  // same method name/meaning ("is Dummy mode active") specifically because
  // main.js's callOracle() already calls it - zero change needed at that
  // call site for the dummy-mode branch.
  MODE_KEY: 'rpgace_oracle_mode',
  LEGACY_KEY: 'rpgace_mock_oracle',
  MODES: ['real', 'dummy', 'fallback'],

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), batch 16, module 49 of 60 — real, ratified /CEO plan
  // item: split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // predecessors already shipped and verified. Pure internal-structure
  // refactor — zero functional, behavioural, UX, data or schema change;
  // every function below was MOVED wholesale, never rewritten and never
  // split down the middle.
  //
  // This module splits 5 ui (_injectToggleButton, _injectScoutButton,
  // _renderState, _pushBodyBelow, _openScoutedList) / 7 logic (getMode,
  // setMode, isEnabled, isFallbackMode, toggle, _fakeReply,
  // _queueScoutItem).
  //
  // Classification rule used, identical to every prior batch: a function
  // lives in `ui` if it CONSTRUCTS OR DISCOVERS DOM (document.*,
  // createElement, getElementById, querySelector, innerHTML); otherwise in
  // `logic`. Deliberately NOT counted as a ui signal, per the standing
  // precedent: a bare RPGACE.utils.toast(), or calling another module's
  // popup helper — a function that merely TRIGGERS a UI action without
  // constructing any DOM of its own is logic.
  //
  // The genuinely non-obvious calls, each named with the real evidence
  // rather than silently classified — and read with extra care, because
  // this module is the Real/Dummy/Fallback gate main.js's own callOracle()
  // consults BEFORE deciding whether to make a real, billable API call.
  // The invariant that must survive this refactor is that getMode() always
  // reads the ONE persisted localStorage value, so Dummy mode can never
  // leak into a real call and Real mode can never be silently faked:
  //   • logic.getMode / logic.setMode / logic.isEnabled /
  //     logic.isFallbackMode / logic.toggle are the mode state machine.
  //     Their real store is localStorage (MODE_KEY), not a JS field, so
  //     there is no per-namespace copy that could diverge — but every one
  //     of them still resolves MODE_KEY/MODES through
  //     `RPGACE.modules.mockOracle` rather than `this`, since a bare
  //     `this.MODE_KEY` inside `logic` would be undefined and getMode()
  //     would silently start returning its 'real' fallback on EVERY call —
  //     i.e. Dummy/Fallback mode would appear to toggle in the UI while
  //     every Oracle send quietly went out as a real, billable API call.
  //     That is the single most dangerous way this particular split could
  //     have gone wrong, and it is why nothing here is left on `this`.
  //   • logic.setMode is `logic` on the "merely triggers UI" clause: its
  //     real job is the localStorage write; the three RPGACE.utils.toast
  //     calls and the trailing self._renderState() are triggers, not DOM
  //     construction of its own.
  //   • logic._fakeReply builds the synthetic reply TEXT (including the
  //     DIRECTOR_CHOSEN:/EDL_JSON: trailers) and streams it back through
  //     the caller's onChunk. It is text, never markup, never handed to a
  //     DOM element here — the real chat rendering happens downstream in
  //     main.js's own streaming path. `logic`, on the same "builds text,
  //     not markup" basis this series already named.
  //   • logic._queueScoutItem is `logic` on the primary rule: an
  //     RPGACE.sb.select dedup check plus an RPGACE.sb.secureWrite insert,
  //     then the same text-only acknowledgment shape as _fakeReply. Zero
  //     DOM.
  //   • ui._pushBodyBelow is the one judgment call worth stating plainly:
  //     it MEASURES a DOM element it discovers itself
  //     (getElementById('mock-oracle-bar').offsetHeight) and writes
  //     document.body.style.paddingTop. It discovers DOM, so it is `ui` on
  //     the primary rule — and it is 100% presentation (no data job behind
  //     the mutation), which is the same side of the beatLog/refCorpus
  //     mutating-a-caller's-element test.
  //
  // Real shared-state check, done directly rather than assumed: a
  // whole-body grep for `self\.X =` / `this\.X =` across the entire module
  // returned NOTHING — this module has no runtime-assigned module field at
  // all (the chroniclesLog._allItems / journalQoL._activeSource bug class
  // simply does not arise here). Its only state is the persisted
  // localStorage value read/written through the three declared top-level
  // constants (MODE_KEY, LEGACY_KEY, MODES), all kept at module scope
  // above and reached through the module handle from both namespaces.
  //
  // Two PRE-EXISTING DEAD LOCALS found while reading every body for this
  // split, both KEPT rather than deleted (deleting an inert local would be
  // a real source change outside a pure refactor's remit — the same call
  // chroniclesLog.ui._openCard's own dead `self` already set):
  //   • logic._queueScoutItem's `var self = this;` — declared, never read
  //     anywhere in its ~85-line body (verified by grep for `self\.`
  //     inside the function's own line range, zero hits).
  //   • ui._openScoutedList's `var self = this;` — same, zero hits across
  //     its ~137-line body.
  // Both are requalified IN PLACE to `var self = RPGACE.modules.mockOracle;`
  // so they are correct if a future edit ever does start using them,
  // rather than left holding a namespace sub-object.
  //
  // Real, load-bearing external touchpoints, all confirmed by grep and all
  // preserved by the pass-throughs below (checked in all three reference
  // forms per the standing two-greps discipline) — these are the ones that
  // matter most, since they sit inside callOracle() itself:
  //   • rpgace_core.js:152 — `RPGACE.modules.mockOracle.isEnabled()`
  //   • rpgace_core.js:153 — `._fakeReply(messages, system, onChunk)`
  //   • rpgace_core.js:161 — `.isFallbackMode()`
  //   • rpgace_core.js:162 — `._queueScoutItem(messages, system, onChunk)`
  //     (all four in the LEGACY former-main.js section's callOracle, each
  //     behind a `window.RPGACE && RPGACE.modules.mockOracle &&` guard.)
  // No local-alias (`var x = RPGACE.modules.mockOracle`) call site exists
  // anywhere, no dynamic `RPGACE.modules['mockOracle']` bracket lookup
  // exists, and no reference exists in index.html or any other file
  // (checked; the remaining rpgace_core.js hits at :13787/:13833/:22299
  // and manual.html are prose comments about this module, not calls).
  // ══════════════════════════════════════════════════════════════════

  init: function() {
    var self = this;
    try {
      if (!localStorage.getItem(this.MODE_KEY) && localStorage.getItem(this.LEGACY_KEY) === '1') {
        localStorage.setItem(this.MODE_KEY, 'dummy');
        localStorage.removeItem(this.LEGACY_KEY);
      }
    } catch (e) {}
    RPGACE.registerBootTask(function() { return self._injectToggleButton(); });
    RPGACE.registerBootTask(function() { return self._injectScoutButton(); });
  },

  // ============================================================
  // logic — business logic/data: the persisted Real/Dummy/Fallback mode
  // state machine, the synthetic dummy-reply generator, and the Fallback
  // Scout queue write. Constructs and discovers no DOM, and builds no
  // markup string (see the rule extension above).
  // ============================================================
  logic: {

  getMode: function() {
    var self = RPGACE.modules.mockOracle;
    try {
      var m = localStorage.getItem(self.MODE_KEY);
      return self.MODES.indexOf(m) !== -1 ? m : 'real';
    } catch (e) { return 'real'; }
  },
  setMode: function(mode) {
    var self = RPGACE.modules.mockOracle;
    if (self.MODES.indexOf(mode) === -1) return;
    try { localStorage.setItem(self.MODE_KEY, mode); } catch (e) {}
    if (mode === 'dummy') {
      RPGACE.utils.toast('🧪 Dummy Oracle ON — every Oracle reply from now on is fake, wiring-test only. No real API calls, no real cost.', '#E2A83D', 5000);
    } else if (mode === 'fallback') {
      RPGACE.utils.toast('📥 Fallback Scout Mode ON — every Oracle send now queues for later, free, instead of calling the real API. Open "Scouted" any time to browse answers.', 'rgba(201,168,76,0.9)', 6000);
    } else {
      RPGACE.utils.toast('✅ Real Oracle API — live calls resume', '#4CAF82', 3000);
    }
    self._renderState();
  },
  // Back-compat: "isEnabled" has always meant "is Dummy mode active" -
  // main.js's callOracle() calls this exact method name/meaning already.
  isEnabled: function() { return RPGACE.modules.mockOracle.getMode() === 'dummy'; },
  isFallbackMode: function() { return RPGACE.modules.mockOracle.getMode() === 'fallback'; },
  // Cycles Real -> Dummy -> Fallback -> Real on click.
  toggle: function() {
    var self = RPGACE.modules.mockOracle;
    var order = ['real', 'dummy', 'fallback'];
    var next = order[(order.indexOf(self.getMode()) + 1) % order.length];
    self.setMode(next);
  },

  // Real reply generator, called from main.js's callOracle() when mock
  // mode is on. Scans the outbound prompt for this app's own known
  // structured trailers (DIRECTOR_CHOSEN:, EDL_JSON:) so downstream
  // parsing genuinely gets exercised, not just the chat bubble text -
  // same real trailer names visualOracle._saveDocToProduction already
  // looks for, kept in sync by reading the same literal strings rather
  // than a second guessed format (rule 8).
  _fakeReply: function(messages, system, onChunk) {
    var lastUser = (messages || []).slice().reverse().filter(function (m) { return m.role === 'user'; })[0];
    var promptText = ((system || '') + ' ' + (lastUser && lastUser.content || '')).toLowerCase();

    var lines = [
      '🧪 [MOCK ORACLE — no real API call made, wiring test only]',
      '',
      'This is a synthetic stand-in reply while real Anthropic credits are unavailable. It exists to exercise real button/DOM/Supabase wiring end-to-end, not to represent real output quality — never treat this text as a genuine Oracle answer.',
    ];
    var full = lines.join('\n');

    return new Promise(function (resolve) {
      if (onChunk) {
        // Feed it back progressively so the real streaming-render path
        // (renderMarkdown, chat-box scroll behaviour) gets exercised too,
        // not just the final-result path.
        var parts = full.match(/[\s\S]{1,40}/g) || [full];
        var i = 0, acc = '';
        var iv = setInterval(function () {
          acc += parts[i] || '';
          onChunk(acc);
          i++;
          if (i >= parts.length) {
            clearInterval(iv);
            resolve({ content: [{ type: 'text', text: acc }] });
          }
        }, 55);
      } else {
        setTimeout(function () {
          resolve({ content: [{ type: 'text', text: full }] });
        }, 400 + Math.random() * 400);
      }
    });
  },

  // ── Fallback Scout mode — real behavior ─────────────────────────────
  // Called from main.js's callOracle() when getMode()==='fallback',
  // exactly parallel to _fakeReply's dummy-mode call site. Instead of
  // fabricating an answer, this queues the REAL prompt into
  // oracle_fallback_queue (same table, same RPGACE.sb.secureWrite write
  // path phylumPath._queueFallback already uses — rule 8, no second
  // write mechanism invented) with a new context.type:'scout_item'
  // discriminator, then returns an honest, unmistakably-labeled
  // acknowledgment — never a fake answer to the actual question asked.
  // The daily "RPGACE Fallback Drain" Routine (already live, unchanged)
  // answers these the same way it answers every other tier; Alex browses
  // real answers later via _openScoutedList(), never an auto-injected
  // chat reply (the browser tab/session may be long gone by the time a
  // daily-batch answer lands).
  //
  // Aug 6 (2nd pass, real /deduplication ask): a real, generic dedup
  // check runs BEFORE every insert — any caller that fires the exact
  // same prompt twice (the concrete case that surfaced this:
  // generateEncBullets() re-queuing an encyclopedia entry's preview-
  // bullet prompt on every page reload, since ENC_BULLET_CACHE alone
  // never persisted — see main.js's own fix for that specific root
  // cause) gets told it's already queued instead of minting a second
  // row. This is deliberately caller-agnostic (matches on prompt text
  // alone, not on which module queued it) so it protects every current
  // and future Fallback Scout caller the same way, per rule 8.
  _queueScoutItem: function (messages, system, onChunk) {
    // Pre-existing DEAD local (declared, never read anywhere in this
    // body) — kept, not deleted, and requalified to the module handle
    // per the G53 block above.
    var self = RPGACE.modules.mockOracle;
    var lastUser = (messages || []).slice().reverse().filter(function (m) { return m.role === 'user'; })[0];
    var promptText = (lastUser && lastUser.content) || '';

    var row = {
      prompt: promptText,
      tier: 'ground_worker_text',
      max_tokens: 1500,
      model: null,
      status: 'pending',
      context: { type: 'scout_item', queued_via: 'live_chat_fallback_mode', system: system || null }
    };

    // Fail loud (rule 7): a failed write must never come back looking
    // like a successful queue — this is checked explicitly rather than
    // swallowed, unlike a bare .catch(warn-and-continue) would produce.
    var ackLines = function (pendingCount, writeFailed, writeErr, wasDuplicate) {
      if (writeFailed) {
        return [
          '⚠️ [SCOUT QUEUE WRITE FAILED — this question was NOT saved]',
          '',
          'Real error: ' + (writeErr || 'unknown'),
          '',
          'Nothing was queued. Switch back to Real or Dummy mode, or try again — do not assume this was captured.',
        ].join('\n');
      }
      var lines = wasDuplicate ? [
        '♻️ [ALREADY SCOUTED — /deduplication caught an exact repeat, nothing new queued]',
        '',
        'This exact question is already sitting in your scouting queue — a second identical row was NOT created, so it won\'t be reanalysed twice for no reason. Check "📥 Scouted" for its real answer once the daily drain runs.',
      ] : [
        '📥 [SCOUTED — queued for free fallback processing, not answered live]',
        '',
        'This question was added to your scouting queue instead of calling the real API. It will be answered by the daily Fallback Drain (free, uses Claude Code\'s own access, no Anthropic API spend) — check "📥 Scouted" any time to browse real answers as they land.',
      ];
      lines.push('', 'Pending in queue: ' + pendingCount);
      if (pendingCount >= 10) {
        lines.push('', '🔔 10+ items waiting — the next daily drain will answer all of them. This app can\'t auto-fire the drain early from the browser (real limitation, not a bug) — ask a Claude Code session to fire it now if you want them answered sooner.');
      }
      return lines.join('\n');
    };

    var respond = function (pendingCount, writeFailed, writeErr, wasDuplicate) {
      var full = ackLines(pendingCount, writeFailed, writeErr, wasDuplicate);
      return new Promise(function (resolve) {
        if (onChunk) {
          var parts = full.match(/[\s\S]{1,40}/g) || [full];
          var i = 0, acc = '';
          var iv = setInterval(function () {
            acc += parts[i] || '';
            onChunk(acc);
            i++;
            if (i >= parts.length) {
              clearInterval(iv);
              resolve({ content: [{ type: 'text', text: acc }] });
            }
          }, 55);
        } else {
          setTimeout(function () { resolve({ content: [{ type: 'text', text: full }] }); }, 300);
        }
      });
    };

    // Fetch existing pending scout_item prompts (not just IDs) so an
    // exact repeat can be caught client-side before inserting - avoids
    // putting the full (up to ~3000+ char) prompt text into a URL
    // filter, which real long entries would make unreliable.
    return RPGACE.sb.select('oracle_fallback_queue', "context->>type=eq.scout_item&status=eq.pending&select=prompt&order=created_at.desc&limit=50")
      .catch(function () { return []; })
      .then(function (existingRows) {
        var pending = existingRows || [];
        var duplicate = pending.some(function (r) { return r.prompt === promptText; });
        if (duplicate) {
          return respond(pending.length, false, null, true);
        }
        var writeFailed = false, writeErr = null;
        return RPGACE.sb.secureWrite('oracle_fallback_queue', 'insert', [row])
          .catch(function (e) { writeFailed = true; writeErr = e.message; console.warn('[mockOracle] scout enqueue failed:', e.message); })
          .then(function () {
            return respond(writeFailed ? pending.length : pending.length + 1, writeFailed, writeErr, false);
          });
      });
  },

  },

  // ============================================================
  // ui — rendering/DOM: the permanent Oracle-mode status bar and its
  // reveal button, the mode switch and Scouted rows inside the shared
  // dev-status cluster, the per-mode repaint, the body-offset push, and
  // the "Scouted, Now Answered" browsable popup.
  // ============================================================
  ui: {

  // Aug 6 (real hand-test report: "i cant see dummy oracle right now...
  // it is not there") — replaced the small bottom-right circular button
  // (competing for space/attention with voiceInput's own floating mic
  // button, easy to miss) with a real, always-visible toggle switch fixed
  // at the top of the page. Alex's own exact spec: red track = Dummy
  // Oracle, click, slides to green = Oracle API. Unlike the old design
  // (which only showed a warning banner while mock mode was ON), this
  // switch is permanently rendered regardless of state — the discoverability
  // complaint was the real bug, not the toggle logic itself, so the fix is
  // "always there," not "smarter hiding."
  // Widened to a 3-position track same day (2nd pass) for the Fallback
  // mode: Real -> Dummy -> Fallback -> Real, cycling on click, per Alex's
  // own spec ("in the toggle in top right as a third mode").
  // Aug 22 (real Alex follow-up ask, 2nd redesign pass): "hide the
  // scouted button and dummy/fallback/api pill and local pill behind a
  // pressable button on the dummy oracle banner that will reveal those
  // three options." Real, structural change: the top strip is now a
  // PERMANENT bar (all 3 modes, not just dummy/fallback) carrying the
  // current mode label plus one reveal button (⚙) — the cluster (switch/
  // Scouted/Local, still built via the same shared getDevStatusCluster/
  // addClusterRow from the 1st redesign pass) now starts hidden and only
  // shows when that one button is pressed. Bar + switch are created
  // together in this one function (not split across 2 boot tasks) so
  // _renderState's very first call always finds every element it needs
  // — a real, deliberate ordering fix, not an accident: registerBootTask
  // runs each registration's fn() synchronously and in file order, so
  // splitting bar-creation into its own separate boot task risked
  // _renderState running before the bar existed on whichever pass ran
  // first.
  _injectToggleButton: function () {
    if (document.getElementById('mock-oracle-switch')) return;
    var self = RPGACE.modules.mockOracle;

    // The permanent status bar — always shown once logged in, in all 3
    // modes. Real content/color per mode set in _renderState; only the
    // reveal button's own behavior lives here.
    var bar = document.createElement('div');
    bar.id = 'mock-oracle-bar';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999998;display:flex;align-items:center;justify-content:center;background:#0f0f18;border-bottom:1px solid rgba(255,255,255,0.1);padding:6px 40px;font-family:Rajdhani,sans-serif;font-weight:700;font-size:12px;text-align:center;letter-spacing:0.5px;';

    var barLabel = document.createElement('span');
    barLabel.id = 'mock-oracle-bar-label';
    bar.appendChild(barLabel);

    var revealBtn = document.createElement('button');
    revealBtn.id = 'mock-oracle-bar-toggle';
    revealBtn.title = 'Show/hide Oracle mode controls (mode switch, Scouted, provider)';
    revealBtn.textContent = '⚙';
    revealBtn.style.cssText = 'position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:rgba(226,226,236,0.5);font-size:14px;line-height:1;cursor:pointer;padding:2px 6px;';
    revealBtn.onclick = function (e) {
      e.stopPropagation();
      var cluster = RPGACE.utils.getDevStatusCluster();
      var showing = cluster.style.display !== 'none';
      if (showing) {
        cluster.style.display = 'none';
      } else {
        cluster.style.top = bar.offsetHeight + 'px';
        cluster.style.display = 'flex';
      }
    };
    bar.appendChild(revealBtn);
    document.body.appendChild(bar);
    RPGACE.utils.hideUntilLogin(bar);

    // Aug 22 real redesign — this used to be its own separately-styled
    // floating pill (own background/border/radius/shadow at top:10px).
    // Now a plain row inside the shared RPGACE.utils dev-status cluster
    // (getDevStatusCluster/addClusterRow) alongside the Scouted button
    // and oracleProviderMode's switch, so all 3 read as one cohesive
    // control instead of 3 separately-bolted-on widgets — and, per this
    // same-day follow-up, hidden by default behind the bar's own ⚙
    // button rather than always visible.
    var wrap = document.createElement('div');
    wrap.id = 'mock-oracle-switch';
    wrap.title = 'Click to cycle Oracle Mode: Real API → Dummy (wiring tests, zero cost) → Fallback Scout (queue for free later answers)';
    wrap.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;';

    var track = document.createElement('div');
    track.id = 'mock-oracle-track';
    track.style.cssText = 'position:relative;width:56px;height:22px;border-radius:11px;flex-shrink:0;transition:background .2s ease;';

    var knob = document.createElement('div');
    knob.id = 'mock-oracle-knob';
    knob.style.cssText = 'position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.4);transition:left .2s ease;';
    track.appendChild(knob);

    var label = document.createElement('span');
    label.id = 'mock-oracle-label';
    label.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:.4px;white-space:nowrap;';

    wrap.appendChild(track);
    wrap.appendChild(label);
    wrap.onclick = function () { self.toggle(); };
    RPGACE.utils.addClusterRow(wrap);
    self._renderState();
  },

  // Small pill next to the switch, opening the "Scouted, Now Answered"
  // browsable list. Always present (not just while Fallback mode is
  // active) since past scouted items stay worth browsing regardless of
  // which mode is active right now.
  _injectScoutButton: function () {
    if (document.getElementById('mock-oracle-scout-btn')) return;
    var self = RPGACE.modules.mockOracle;
    var btn = document.createElement('div');
    btn.id = 'mock-oracle-scout-btn';
    btn.title = 'Browse scouted questions and their free fallback answers';
    // Aug 22 real redesign — now a plain row in the shared dev-status
    // cluster (see _injectToggleButton's own note), not its own floating
    // pill at a hardcoded top:44px offset.
    btn.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:.3px;color:rgba(201,168,76,0.85);cursor:pointer;';
    btn.textContent = '📥 Scouted';
    btn.onclick = function () { self._openScoutedList(); };
    RPGACE.utils.addClusterRow(btn);
  },

  _renderState: function () {
    var self = RPGACE.modules.mockOracle;
    var track = document.getElementById('mock-oracle-track');
    var knob = document.getElementById('mock-oracle-knob');
    var label = document.getElementById('mock-oracle-label');
    var barLabel = document.getElementById('mock-oracle-bar-label');
    if (!track || !knob || !label || !barLabel) return;

    var mode = self.getMode();
    if (mode === 'dummy') {
      // Dummy Oracle active — red, knob left.
      track.style.background = '#CC4A4A';
      knob.style.left = '2px';
      label.textContent = '🧪 Dummy Oracle';
      label.style.color = '#CC4A4A';
      barLabel.textContent = '🧪 DUMMY ORACLE ON — every reply is fake, wiring-test only';
      barLabel.style.color = '#CC4A4A';
    } else if (mode === 'fallback') {
      // Fallback Scout mode active — amber/gold, knob center.
      track.style.background = 'rgba(201,168,76,0.85)';
      knob.style.left = '19px';
      label.textContent = '📥 Fallback Scout';
      label.style.color = '#C9A84C';
      barLabel.textContent = '📥 FALLBACK SCOUT MODE — every send is queued, not answered live. Check "Scouted" for answers.';
      barLabel.style.color = '#C9A84C';
    } else {
      // Real Oracle API — green, knob right.
      track.style.background = '#4CAF82';
      knob.style.left = '36px';
      label.textContent = '✅ Oracle API';
      label.style.color = '#4CAF82';
      barLabel.textContent = '✅ Oracle API — live calls active';
      barLabel.style.color = '#4CAF82';
    }
    self._pushBodyBelow();
  },

  // Aug 22 (/Routine item A2) — Alex's own verbatim ask: "dummy oracle
  // blocks off the top of the html, I want the feature to make the html
  // slide down to make space for the oracle status mode, so both don't
  // obstruct each other." Real root cause: the full-width warning strip
  // above (position:fixed, top:0) had zero compensating offset on real
  // page content, so it simply covered whatever sat at the very top of
  // #app. Real, minimal fix — push document.body down by the strip's
  // own MEASURED height (never a guessed pixel value; its text can wrap
  // to 2 lines on a narrow phone). body uses normal document flow
  // (confirmed: style.css's own body{} rule has no fixed height/
  // overflow-y), so padding-top here genuinely moves #app's visible
  // content down rather than being silently absorbed by an inner scroll
  // container — every other position:fixed overlay in this file is
  // unaffected, since fixed elements position against the viewport,
  // never a parent's padding box.
  //
  // Deliberately NOT animated (rule 2/4 — real headless-browser evidence
  // gathered before shipping, not guessed): a `transition:padding-top`
  // version was built and tested first, and reproducibly left the
  // computed padding stuck at its old value after clearing it back to ''
  // — confirmed via 4 separate real headless-Chromium checks, including
  // one with a forced reflow and a 1000ms settle wait. Whether that's a
  // genuine cross-browser CSS quirk or an artifact of this test
  // environment's virtual-time handling was left unresolved rather than
  // gambled on — a correct instant shift beats a smoother one that can
  // leave a permanent stale gap at the top of the page. A plain, un-
  // animated set/clear was re-verified 100% correct across a full show
  // -> clear -> show cycle before shipping.
  //
  // Aug 22 (2nd redesign pass) — the bar is now permanent across all 3
  // modes (not just dummy/fallback), so this always applies now instead
  // of being cleared to '' in Real mode. Reads the live #mock-oracle-bar
  // element directly rather than taking a param, since _renderState no
  // longer creates/destroys a separate badge per mode — one persistent
  // bar, content updated in place.
  _pushBodyBelow: function () {
    var bar = document.getElementById('mock-oracle-bar');
    document.body.style.paddingTop = bar ? bar.offsetHeight + 'px' : '';
  },

  // "📥 Scouted, Now Answered" — real browsable list, confirms Q1 from the
  // earlier /paranoia interrogation round. Reads oracle_fallback_queue
  // directly (anon_all RLS, never restricted — same landmine-protected
  // table _checkFallbackAnswers already reads), newest first, showing
  // both still-pending and already-answered scout_item rows so Alex can
  // see the real state of his own queue, not just a black box.
  _openScoutedList: function () {
    // Pre-existing DEAD local (declared, never read anywhere in this
    // body) — kept, not deleted, and requalified to the module handle
    // per the G53 block above.
    var self = RPGACE.modules.mockOracle;
    var pop = RPGACE.modules.dashDeck._popup({
      dim: '0.92', scroll: true, width: '640px', borderColor: 'rgba(201,168,76,0.35)',
      eyebrow: 'Fallback Scout Mode', title: '📥 Scouted, Now Answered', accent: 'rgba(201,168,76,0.9)',
    });
    // pop.box is _popup's inner body div - a sibling of the eyebrow/title
    // and the default Close button, never their parent - so clearing it
    // to re-render the list can't wipe the popup's own chrome.
    var body = pop.box;

    var renderList = function () {
      body.innerHTML = '';
      var loading = document.createElement('div');
      loading.style.cssText = 'color:var(--muted);font-size:12px;padding:10px 0;';
      loading.textContent = 'Loading scouted items…';
      body.appendChild(loading);

      RPGACE.sb.select('oracle_fallback_queue', "context->>type=eq.scout_item&order=created_at.desc&limit=50")
        .then(function (rows) {
          loading.remove();
          if (!rows || !rows.length) {
            var empty = document.createElement('div');
            empty.style.cssText = 'color:var(--muted);font-size:12px;padding:10px 0;';
            empty.textContent = 'Nothing scouted yet. Switch the top-right toggle to 📥 Fallback Scout and send an Oracle message to queue your first item.';
            body.appendChild(empty);
            return;
          }
          rows.forEach(function (row) {
            var card = document.createElement('div');
            card.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px;';
            var answered = row.status === 'answered';

            // Status chip + delete button share one flex row so the bin
            // sits at the card's top-right instead of pushing the prompt
            // text around. The chip's own margin-bottom moves onto this
            // row so the spacing below is unchanged from before.
            var headRow = document.createElement('div');
            headRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;';

            var statusChip = document.createElement('span');
            statusChip.style.cssText = 'display:inline-block;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;padding:2px 8px;border-radius:10px;' + (answered ? 'background:rgba(76,175,130,0.15);color:#4CAF82;' : 'background:rgba(201,168,76,0.15);color:#C9A84C;');
            statusChip.textContent = answered ? '✅ Answered' : '⏳ Pending';
            headRow.appendChild(statusChip);

            // Per-item delete (A3). Alex's own reason: strip a queued
            // analysis he doesn't want BEFORE the daily Fallback Drain
            // spends real effort answering it, so junk never gets stored
            // or processed. Works on answered rows too, so a kept answer
            // he doesn't want can be cleared out the same way.
            //
            // Two clicks (arms, then confirms, 3s auto-disarm) - the
            // exact same idiom bookworm's own book-delete button uses,
            // deliberately reused rather than inventing a second delete
            // interaction (rule 8). No modal: low-risk, but permanent.
            //
            // Writes via the PLAIN anon-key RPGACE.sb.del, never
            // api/data-write.js's service-role proxy: oracle_fallback_queue
            // is deliberately anon-writable (verified live - its only RLS
            // policy is anon_all, USING(true), FOR ALL, granted to anon +
            // authenticated) because the external "RPGACE Fallback Drain"
            // Claude Code Routine writes back to it holding nothing but
            // the anon key. That's a standing landmine in CLAUDE.md, not
            // an oversight - do not "upgrade" this to secureWrite.
            // RPGACE.sb.del is already cache-bust-wrapped, so the
            // re-render below reads fresh rows rather than a stale
            // cached list.
            var delBtn = document.createElement('button');
            delBtn.textContent = '🗑';
            delBtn.title = 'Delete this scouted item';
            delBtn.style.cssText = 'background:none;border:none;color:rgba(226,84,84,0.4);cursor:pointer;font-size:13px;padding:2px 4px;flex-shrink:0;';
            var armed = false, busy = false;
            delBtn.onclick = function (e) {
              e.stopPropagation();
              if (busy) return;
              if (!armed) {
                armed = true;
                delBtn.textContent = '❌ Confirm';
                delBtn.style.color = '#CC4A4A';
                setTimeout(function () {
                  if (busy) return;
                  armed = false; delBtn.textContent = '🗑'; delBtn.style.color = 'rgba(226,84,84,0.4)';
                }, 3000);
                return;
              }
              busy = true;
              delBtn.textContent = '…';
              // RPGACE.sb.del resolves with the raw fetch Response and
              // does NOT reject on an HTTP error status, so .ok is
              // checked explicitly - otherwise a 401/403/404 would fall
              // straight into the success branch and claim a delete that
              // never happened (rule 7, fail loud).
              RPGACE.sb.del('oracle_fallback_queue', 'id=eq.' + row.id)
                .then(function (res) {
                  if (!res || !res.ok) {
                    busy = false; armed = false;
                    delBtn.textContent = '🗑'; delBtn.style.color = 'rgba(226,84,84,0.4)';
                    RPGACE.utils.toast('Delete failed (' + (res ? res.status + ' ' + res.statusText : 'no response') + ') — nothing was removed', '#CC4A4A', 4000);
                    return;
                  }
                  RPGACE.utils.toast('🗑 Deleted scouted item', 'rgba(226,226,236,0.5)', 2500);
                  renderList();
                })
                .catch(function (err) {
                  busy = false; armed = false;
                  delBtn.textContent = '🗑'; delBtn.style.color = 'rgba(226,84,84,0.4)';
                  RPGACE.utils.toast('Delete failed: ' + err.message, '#CC4A4A', 4000);
                });
            };
            headRow.appendChild(delBtn);
            card.appendChild(headRow);

            var promptEl = document.createElement('div');
            promptEl.style.cssText = 'font-size:12px;color:var(--text);white-space:pre-wrap;margin-bottom:' + (answered ? '8px' : '0') + ';';
            promptEl.textContent = row.prompt || '(no prompt text)';
            card.appendChild(promptEl);

            if (answered && row.answer) {
              var ansLbl = document.createElement('div');
              ansLbl.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(76,175,130,0.7);margin:8px 0 4px;';
              ansLbl.textContent = 'Real answer';
              card.appendChild(ansLbl);
              var ansEl = document.createElement('div');
              ansEl.style.cssText = 'font-size:12px;color:var(--muted);white-space:pre-wrap;';
              ansEl.textContent = row.answer;
              card.appendChild(ansEl);
            }
            body.appendChild(card);
          });
        })
        .catch(function (e) {
          loading.textContent = 'Could not load scouted items: ' + e.message;
        });
    };

    renderList();
  },

  },

  // Thin top-level pass-throughs — preserve the exact existing public API.
  // Real, load-bearing external touchpoints these carry (see the G53 block
  // above): the LEGACY former-main.js callOracle() at :152/:153/:161/:162
  // calls isEnabled(), _fakeReply(), isFallbackMode() and _queueScoutItem()
  // directly on the module, and those four sit in front of every real,
  // billable Anthropic API call in the app. Also carries this module's own
  // internal cross-namespace calls — logic.setMode -> ui._renderState,
  // logic.isEnabled/isFallbackMode/toggle -> logic.getMode,
  // ui._injectToggleButton -> logic.toggle + ui._renderState,
  // ui._injectScoutButton -> ui._openScoutedList, ui._renderState ->
  // logic.getMode + ui._pushBodyBelow — every one goes through the module
  // handle, never `this.ui.X` / `this.logic.X` directly, so no call site
  // inside the module had to change. `init` also calls _injectToggleButton
  // and _injectScoutButton through its own top-level `this`, landing here.
  getMode: function() { return this.logic.getMode(); },
  setMode: function(mode) { return this.logic.setMode(mode); },
  isEnabled: function() { return this.logic.isEnabled(); },
  isFallbackMode: function() { return this.logic.isFallbackMode(); },
  toggle: function() { return this.logic.toggle(); },
  _fakeReply: function(messages, system, onChunk) { return this.logic._fakeReply(messages, system, onChunk); },
  _queueScoutItem: function(messages, system, onChunk) { return this.logic._queueScoutItem(messages, system, onChunk); },
  _injectToggleButton: function() { return this.ui._injectToggleButton(); },
  _injectScoutButton: function() { return this.ui._injectScoutButton(); },
  _renderState: function() { return this.ui._renderState(); },
  _pushBodyBelow: function() { return this.ui._pushBodyBelow(); },
  _openScoutedList: function() { return this.ui._openScoutedList(); },

});
/* ===END:mockOracle=== */
