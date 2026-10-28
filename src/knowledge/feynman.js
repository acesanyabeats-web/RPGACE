

/* ===END_DOMAIN:ORACLE=== */

/* ===DOMAIN:LEARNING=== */

/* ===MODULE:feynman=== */
RPGACE.register('feynman', {
  domain: 'knowledge',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Aug/Sep 2026) — real, ratified /CEO plan item, and the TENTH
  // module to take this shape (after the videoPipeline/beatLog/bookworm/
  // phylumPath pilot, then contentProductionLive, conidPot, videoSummary,
  // questEngine and intelDelete): this module is split into two internal
  // namespaces, `ui` (rendering/DOM) and `logic` (business logic/data),
  // following the exact shape those nine already shipped and verified.
  // Pure internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale, never
  // rewritten, never split down the middle, and its own body is otherwise
  // untouched (the move was performed by a deterministic line-range
  // extract + an explicit, asserted list of `this`/`self` requalifications,
  // not by retyping, so no character of any body could drift silently).
  //
  // 23 real members: 21 functions and TWO plain data fields, `session` and
  // `PROMPTS` (checked by direct read of every top-level key, not assumed).
  // Both data fields STAY AT MODULE SCOPE and were not moved — the same
  // rule questEngine's own split recorded — because a copy inside `ui` or
  // `logic` would be a second, divergent session/prompt bag rather than
  // the one real one. Unlike questEngine, feynman's two data fields were
  // ALREADY grouped at the top of the object literal rather than
  // interleaved with functions, so no regrouping was needed here; they sit
  // exactly where they were. `init` stays a literal top-level function
  // (because RPGACE.register() calls `module.init()` directly and cannot
  // see into a sub-object, and its own `self` genuinely IS the module —
  // byte-identical, still calling the top-level pass-throughs), 8 moved
  // into `logic`, 12 into `ui`.
  //
  // The 8/12 split leaning to `ui` is real and reflects what this module
  // actually is: a slide-in teaching PANEL (its own header/progress bar/
  // message list/textarea, plus four separate injection sites that graft
  // Feynman buttons onto Oracle chat, the Do-Now dialog, Encyclopedia
  // cards and Agenda cards) wrapped around a small three-phase
  // conversation ENGINE (session state, three Oracle round-trips, a score
  // parse, and one save fan-out to localStorage/Journal/spaced-repetition/
  // taxonomy). The split draws the line between exactly those two halves.
  //
  // The one real risk this split has to get right, function by function: a
  // function moved into `ui`/`logic` is invoked with `this` bound to THAT
  // sub-object, not the module. Every moved function that touches `this`
  // now reaches the module through `var self = RPGACE.modules.feynman;`,
  // so each reference keeps resolving to the module exactly as before —
  // reaching the top-level pass-throughs, which is precisely why every
  // moved function keeps one. Exact accounting for all 20 moved functions,
  // so a later reader can check this by grep rather than take it on trust:
  //   • 11 already had a `var self = this;` line and simply have that one
  //     line swapped for the handle IN PLACE, so the handle lands in
  //     exactly the same position and statement order is literally
  //     unchanged: logic._wrapStartDoNow, logic._runPhase1,
  //     logic._runPhase2, logic._runPhase3, logic._saveSession,
  //     ui._wireOracleDetection, ui._showOracleOffer, ui._showDoNowChoice,
  //     ui._wireEncyclopediaButtons, ui._wireAgendaCards,
  //     ui._showCompleteActions. (Three of those eleven declare it after a
  //     guard/early return rather than on line 1 — _showOracleOffer,
  //     _wrapStartDoNow and _wireOracleDetection — and the declaration
  //     stays exactly where it was rather than being hoisted, so nothing
  //     about their control flow moved.)
  //   • 2 had no `var self` at all and used bare `this.X` calls:
  //     logic.start and ui.submit each get the handle inserted as their
  //     first statement, with every `this.` rewritten to `self.` — the
  //     videoPipeline pilot's own `var mod = RPGACE.modules.videoPipeline;`
  //     precedent. Left as `this.`, logic.start would have written its
  //     session object onto `logic` and read a nonexistent `logic.session`
  //     forever after; ui.submit would have read `ui.session` (undefined)
  //     and its `if (!this.session) return;` guard would have silently
  //     ended every session at the first SUBMIT press. This is the single
  //     highest-consequence correctness detail in the whole split.
  //   • 1 (ui.closePanel) has exactly one `this` touch and no `var self`
  //     at all: `this.session = null;` is qualified directly to
  //     `RPGACE.modules.feynman.session = null;` rather than gaining a
  //     one-use handle, which keeps the two-line body two lines.
  //   • 6 reference neither `this` nor `self` at all and moved completely
  //     untouched apart from indentation: logic._extractConcept,
  //     logic._updateTaxonomyNode, ui._openPanel, ui._addMessage,
  //     ui._setLoading, ui._setPhase.
  // `init` keeps its own `var self = this;` verbatim — that `this`
  // genuinely IS the module, and it is the only function in the module
  // where that is still true.
  //
  // Classification rule used (identical to the rule beatLog/
  // contentProductionLive/conidPot/videoSummary/questEngine/intelDelete
  // each recorded): a function lives in `ui` if it CONSTRUCTS OR DISCOVERS
  // DOM (document.*, createElement, getElementById, querySelector,
  // innerHTML); otherwise in `logic`. Deliberately NOT counted as a ui
  // signal, matching the phylumPath pilot's own precedent: a bare window
  // `confirm()`/`prompt()` dialog, a `showPage()` page-nav call, or
  // opening ANOTHER module's picker/popup. A function that merely TRIGGERS
  // a UI action without constructing any DOM of its own is logic.
  //
  // videoSummary's markup-string RULE EXTENSION (a function returning or
  // assigning markup destined for `.innerHTML` counts as constructing DOM)
  // WAS checked against this module and is real here — ui._showOracleOffer,
  // ui._showDoNowChoice, ui._openPanel, ui._addMessage and
  // ui._showCompleteActions each assign a built markup string to
  // `.innerHTML` — but it changes NO classification, because all five
  // already qualify on the primary rule via createElement/getElementById.
  // Recorded so a future reader knows the extension was applied and found
  // redundant here, not forgotten. logic._saveSession is the deliberate
  // counter-example that keeps it honest: it assembles a large multi-line
  // string (`journalContent`) with the same `[...].join('\n')` idiom the
  // ui functions use, but that string is DATA — it goes to saveToJournal()
  // and addMsg(), never to an `.innerHTML` — so the extension correctly
  // does not reach it and it stays `logic`.
  //
  // The genuinely mixed / judgment-call functions — FIVE of them, each
  // named here with the real evidence rather than silently classified.
  // One is classified AGAINST the primary rule's literal reading, one is
  // classified where the primary rule is silent, and three sit on a real
  // ui/logic seam; in all five the tiebreak is DOMINANT RESPONSIBILITY,
  // the same tiebreak videoSummary/questEngine/intelDelete already used:
  //   • logic._runPhase3 is this module's biggest judgment call, and the
  //     one function classified against the literal rule. It DOES discover
  //     and mutate DOM — `document.querySelector('#feynman-panel > div:
  //     last-child')` then `inputArea.style.display = 'none'` — so a
  //     literal reading would put it in `ui`. It is `logic` on dominant
  //     responsibility: those are 2 lines out of ~30, and everything else
  //     is the phase-3 business step (write session.gapAnswer and
  //     session.phase, the Oracle round-trip, the `/SCORE[:\s]+(\d+)/i`
  //     regex parse that produces session.score, writing session.report and
  //     session.completedAt, then the fan-out to _showCompleteActions and
  //     _saveSession). The 2 DOM lines merely retire the input control the
  //     session no longer needs; they construct nothing. This is the exact
  //     shape intelDelete's logic._deleteUnified was classified on, and
  //     filing the module's terminal state transition under `ui` would
  //     defeat the point of the split.
  //   • logic._wrapStartDoNow is the odd one out among the four trigger-
  //     wiring functions (its three siblings _wireOracleDetection,
  //     _wireEncyclopediaButtons and _wireAgendaCards are all `ui`). It
  //     touches ZERO DOM — no document.* anywhere in its body — and what
  //     it actually does is replace the global window.startDoNow with a
  //     wrapper that reads `window.STATE.agendas[idx].category` and
  //     branches: 'learning' goes to the Feynman choice, everything else
  //     falls through to the original. That branch IS a real routing
  //     decision on real data, and all the DOM lives in the callee
  //     (ui._showDoNowChoice) it delegates to — which is precisely the
  //     "merely TRIGGERS a UI action without constructing any DOM of its
  //     own is logic" clause. Its three siblings genuinely differ: each of
  //     them runs querySelector/createElement itself.
  //   • logic.start is the module's main entry point and the one method
  //     reached from OUTSIDE it (see the API note below). The primary rule
  //     is effectively silent on it — it neither constructs nor discovers
  //     DOM — and the literal default of `logic` is also the right answer
  //     on dominant responsibility: its real body is building the session
  //     object (id/concept/source/phase/explanation/gapAnswer/score/
  //     startedAt), which is this module's whole state, and only then does
  //     it end in two UI/engine calls. That is questEngine.logic.startQuest's
  //     precedent exactly ("does REAL DATA WORK and merely ENDS in a UI
  //     call").
  //   • ui.submit is the mirror image of logic.start and is the one place
  //     the two precedents pull in opposite directions, so the reasoning is
  //     spelled out rather than assumed. It DOES discover DOM
  //     (getElementById('feynman-input'), then reads and clears `.value`),
  //     so the primary rule puts it in `ui` on its literal reading — and
  //     the dominant-responsibility check AGREES rather than overriding:
  //     its only non-DOM work is a two-branch phase increment that
  //     immediately dispatches to logic._runPhase2/_runPhase3, which hold
  //     all the real work. It is deliberately NOT classified on
  //     questEngine's "real data work then ends in a UI call" clause,
  //     because unlike logic.start it does no substantive data work of its
  //     own — harvesting the user's typed text out of the textarea is the
  //     definitional ui job, and the phase counter is bookkeeping around
  //     it. (Its `if (!self.session) return;` guard and its `self.session
  //     .phase` reads are exactly why it needed the inserted handle.)
  //   • ui.closePanel is genuinely mixed in two lines: it discovers DOM
  //     (getElementById('feynman-panel') handed to RPGACE.ui.slideOutPanel)
  //     AND it clears real state (`session = null`). It is `ui` on
  //     dominant responsibility — closing the panel is 100% presentation,
  //     and dropping the session is the one-line consequence of that, not
  //     an independent data operation. It is also reachable from generated
  //     onclick markup in two separate places (ui._openPanel's × button and
  //     ui._showCompleteActions' "Close Panel" button), both of which call
  //     `RPGACE.modules.feynman.closePanel()` — i.e. the top-level
  //     pass-through — so the classification cannot break either.
  //   • So logic -> ui cross-namespace calls are normal in this module
  //     (start -> _openPanel, _runPhase1/2/3 -> _setPhase/_setLoading/
  //     _addMessage, _runPhase3 -> _showCompleteActions, _wrapStartDoNow ->
  //     _showDoNowChoice), exactly as ui -> logic calls already are
  //     (_wireOracleDetection -> _extractConcept, _wireEncyclopediaButtons/
  //     _wireAgendaCards -> start, submit -> _runPhase2/_runPhase3).
  //     Every one of those calls goes through the top-level pass-throughs
  //     via `self.X`, never `this.ui.X` / `this.logic.X` directly, so no
  //     call site inside the module had to change.
  //
  // FOUR pre-existing oddities were found while reading every function for
  // this split and are FLAGGED IN PLACE, NOT FIXED (each carries its own
  // note at the exact spot):
  //   • PROMPTS.singleShot has ZERO callers anywhere — confirmed by a
  //     whole-repo grep, which finds only its own definition and the
  //     generated method-module map. A whole prompt-builder that no code
  //     path can reach.
  //   • ui._showOracleOffer, ui._showDoNowChoice and
  //     ui._showCompleteActions each declare a `self` local that nothing in
  //     their body ever reads (and _showCompleteActions declares an unused
  //     `concept` alongside it). Harmless dead locals. They are swapped to
  //     the module handle like every other `var self = this;` rather than
  //     deleted, because deleting them would be a real source change
  //     outside this pass's remit — and swapping keeps them correct if a
  //     future edit ever does read them.
  // ══════════════════════════════════════════════════════════════════

  /* ── Session state ─────────────────────────────── */
  // Module-scope DATA — stays at module scope, NEVER moved into
  // `ui`/`logic`. Read/written from inside both namespaces as
  // `self.session` (self = RPGACE.modules.feynman) so it resolves to
  // the one real session object rather than a per-namespace copy.
  session: null,

  /* ── System prompts ────────────────────────────── */
  // Module-scope DATA (a bag of pure string-builders, zero DOM, zero
  // `this`). Same rule as `session` above: stays at module scope,
  // reached from `logic._runPhase1/2/3` as `self.PROMPTS.phaseN(...)`.
  /* ── System prompts ─────────────────────────────────── */
  PROMPTS: {

    phase1: function(concept, context) {
      return 'You are running a Feynman learning session for a UK music producer named Alex (@AceSanyaBeats) who makes UK drill and hip hop in FL Studio.\n\nThe concept is: ' + concept + '\n' + (context ? 'Context from Alex\'s knowledge base:\n' + context + '\n' : '') + '\nYour job in this phase:\n1. Greet Alex briefly\n2. Ask him to explain ' + concept + ' in his own words — as if teaching someone who has never heard of it\n3. Tell him: no jargon, no looking anything up, just what he actually understands right now\n4. Be warm but direct. One short paragraph response only.\n\nDo NOT explain the concept yourself.';
    },

    phase2: function(concept, explanation) {
      return 'You are running a Feynman gap analysis for a music producer learning: ' + concept + '\n\nAlex\'s explanation:\n"' + explanation + '"\n\nYour job:\n1. Identify the 2-3 most critical gaps or vague points in this explanation\n2. Ask ONE focused question targeting the most important gap\n3. The question should make him think, not confirm — it should expose what he can\'t explain yet\n4. Keep your response to 3 sentences max\n\nDo NOT fill in the gaps for him. Do NOT over-praise. Just probe.';
    },

    phase3: function(concept, explanation, gapAnswer) {
      return 'You are completing a Feynman session for Alex, a UK music producer learning: ' + concept + '\n\nHis initial explanation:\n"' + explanation + '"\n\nHis gap response:\n"' + gapAnswer + '"\n\nGenerate a structured session report in this EXACT format:\n\n**FEYNMAN REPORT — ' + concept + '**\n\n**VERIFIED:** [2-3 things he clearly understands]\n\n**GAPS FOUND:** [1-2 specific things he couldn\'t explain or explained incorrectly]\n\n**SCORE:** [X/10] — [one sentence why]\n\n**NEXT STUDY:** [One specific action — e.g. "Watch Adam Neely\'s Dorian video, focus on the raised 6th"]\n\n**CONTENT ANGLE:** [One YouTube video idea that comes directly from the way he explained this concept — should be a tutorial only he could make based on his current understanding]\n\nBe honest with the score. A 6/10 is good progress. A 10/10 means he can teach it from scratch.';
    },

    // FLAGGED, NOT FIXED (G53 split, Aug/Sep 2026) — DEAD PROMPT BUILDER.
    // singleShot has ZERO callers anywhere: a whole-repo grep (rpgace_core.js
    // + index.html + every .html/.js in the tree) finds only this definition
    // and the generated errorLog.METHOD_MODULE_MAP entry that names it. The
    // "rapid one-question Feynman check" it describes is not reachable from
    // any code path — start() always runs the full 3-phase flow via
    // logic._runPhase1/2/3, which use phase1/phase2/phase3 only. Left exactly
    // as-is: whether to wire it up or delete it is a real product decision,
    // not something a pure-refactor pass should make.
    singleShot: function(concept, context) {
      return 'Run a rapid one-question Feynman check for Alex on: ' + concept + '\n\n' + (context || '') + '\n\nAsk ONE question that tests whether he actually understands this or just recognises the term. Make it specific to FL Studio and beat-making where possible. Keep it to 1-2 sentences.';
    },
  },

  /* ── Init: wire all triggers ────────────────────────── */
  init: function() {
    var self = this;

    /* Trigger 1: Oracle page — detect learning intent in chat */
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'oracle') self._wireOracleDetection();
    });

    /* Trigger 2: Agenda Do Now — intercept learning category */
    self._wrapStartDoNow();

    /* Trigger 3: Encyclopedia page — add session buttons */
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'encyclopedia') {
        setTimeout(function() { self._wireEncyclopediaButtons(); }, 400);
      }
    });
    /* Trigger 3b: Aug 23 2026 (UI2) - the '|| name === "learning"' half of the
       listener above covered the retired Research Lab page, whose enc-styled
       cards now render inside a dashDeck popup instead. _wireEncyclopediaButtons
       scans the whole document for .enc-entry/.enc-card/[class*="enc-"] and
       self-skips anything already wired, so re-running it on a worm-panel open
       is both correct and cheap. */
    RPGACE.hooks.on('worm-panel:open', function() {
      setTimeout(function() { self._wireEncyclopediaButtons(); }, 400);
    });

    /* Trigger 4: Agendas rendered — add Feynman button to learning cards */
    RPGACE.hooks.on('agendas:rendered', function() {
      setTimeout(function() { self._wireAgendaCards(); }, 300);
    });

    console.log('[RPGACE:feynman] Module ready');
  },

  // ============================================================
  // logic — business logic/data. See the classification rule and the
  // named judgment calls in the header block above.
  // ============================================================
  logic: {

    _extractConcept: function(text) {
      var patterns = [
        /teach me (?:about )?(.+)/i,
        /explain (.+)/i,
        /what is (.+)/i,
        /how does (.+) work/i,
        /i want to learn (.+)/i,
        /help me understand (.+)/i,
        /learn about (.+)/i,
      ];
      for (var i = 0; i < patterns.length; i++) {
        var m = text.match(patterns[i]);
        if (m && m[1]) {
          return m[1].replace(/[?.!]$/, '').trim().slice(0, 60);
        }
      }
      return null;
    },

    /* ── TRIGGER: Do Now on learning agenda ─────────────── */
    _wrapStartDoNow: function() {
      if (window._rpgace_feynman_donow_wired) return;
      window._rpgace_feynman_donow_wired = true;
      var self = RPGACE.modules.feynman;

      if (typeof window.startDoNow !== 'function') return;
      var orig = window.startDoNow;
      window.startDoNow = function(idx) {
        var agendas = (window.STATE && STATE.agendas) || [];
        var agenda  = agendas[idx];
        if (agenda && agenda.category === 'learning') {
          self._showDoNowChoice(idx, agenda, orig);
        } else {
          orig.call(window, idx);
        }
      };
    },

    /* ════════════════════════════════════════════════════════
       CORE: START SESSION
    ════════════════════════════════════════════════════════ */
    start: function(concept, source) {
      var self = RPGACE.modules.feynman;
      self.session = {
        id:          RPGACE.utils.id(),
        concept:     concept,
        source:      source || 'direct',
        phase:       1,
        explanation: '',
        gapAnswer:   '',
        score:       0,
        startedAt:   new Date().toISOString(),
      };
      self._openPanel(concept);
      self._runPhase1();
    },

    /* ── Phase 1: Ask user to explain ───────────────────── */
    _runPhase1: function() {
      var self    = RPGACE.modules.feynman;
      var concept = self.session.concept;
      self._setPhase(1);
      self._setLoading(true);

      RPGACE.oracle(
        [{ role: 'user', content: 'Begin Phase 1 of the Feynman session for concept: ' + concept }],
        self.PROMPTS.phase1(concept, '')
      ).then(function(resp) {
        var text = resp && resp.content ? resp.content[0].text : (typeof resp === 'string' ? resp : 'Explain ' + concept + ' in your own words, as simply as possible.');
        self._addMessage(text, 'oracle');
        self._setLoading(false);
      }).catch(function(e) {
        self._addMessage('Explain "' + concept + '" in plain language — no jargon, as if teaching someone completely new to music production.', 'oracle');
        self._setLoading(false);
      });
    },

    /* ── Phase 2: Probe gaps ─────────────────────────────── */
    _runPhase2: function(explanation) {
      var self    = RPGACE.modules.feynman;
      var concept = self.session.concept;
      self.session.explanation = explanation;
      self._setPhase(2);
      self._addMessage(explanation, 'user');
      self._setLoading(true);

      RPGACE.oracle(
        [{ role: 'user', content: 'User explained: ' + explanation }],
        self.PROMPTS.phase2(concept, explanation)
      ).then(function(resp) {
        var text = resp && resp.content ? resp.content[0].text : (typeof resp === 'string' ? resp : "What's the one thing about " + concept + " you find hardest to explain?");
        self._addMessage(text, 'oracle');
        self._setLoading(false);
      }).catch(function(e) {
        self._addMessage("Now the hard part — what's the piece of " + concept + " you find hardest to explain?", 'oracle');
        self._setLoading(false);
      });
    },

    /* ── Phase 3: Report ─────────────────────────────────── */
    _runPhase3: function(gapAnswer) {
      var self    = RPGACE.modules.feynman;
      var concept = self.session.concept;
      self.session.gapAnswer = gapAnswer;
      self.session.phase     = 3;
      self._setPhase(3);
      self._addMessage(gapAnswer, 'user');
      self._setLoading(true);

      /* Hide input while generating report */
      var inputArea = document.querySelector('#feynman-panel > div:last-child');
      if (inputArea) inputArea.style.display = 'none';

      RPGACE.oracle(
        [{ role: 'user', content: 'Gap answer: ' + gapAnswer }],
        self.PROMPTS.phase3(concept, self.session.explanation, gapAnswer)
      ).then(function(resp) {
        var report = resp && resp.content ? resp.content[0].text : (typeof resp === 'string' ? resp : 'Session complete. Review your explanation of ' + concept + '.');
        self.session.report    = report;
        self.session.completedAt = new Date().toISOString();

        /* Extract score */
        var scoreMatch = report.match(/SCORE[:\s]+(\d+)/i);
        self.session.score = scoreMatch ? parseInt(scoreMatch[1]) : 6;

        self._addMessage(report, 'oracle');
        self._setLoading(false);
        self._showCompleteActions();
        self._saveSession();
      }).catch(function(e) {
        self._addMessage('Session complete. Review your notes on ' + concept + '.', 'oracle');
        self._setLoading(false);
      });
    },

    /* ════════════════════════════════════════════════════════
       SAVE SESSION
       Journal + localStorage + Taxonomy + Spaced Repetition
    ════════════════════════════════════════════════════════ */
    _saveSession: function() {
      var self    = RPGACE.modules.feynman;
      var session = self.session;
      if (!session) return;

      /* 1. Save to RPGACE.DB (localStorage) */
      RPGACE.DB.push('feynman_sessions', {
        concept:     session.concept,
        source:      session.source,
        score:       session.score,
        explanation: session.explanation,
        gapAnswer:   session.gapAnswer,
        report:      session.report,
        startedAt:   session.startedAt,
        completedAt: session.completedAt,
      });

      /* 2. Save to Journal */
      var journalContent = [
        '**Feynman Loop — ' + session.concept + '**',
        '',
        '**My explanation:**',
        session.explanation,
        '',
        '**Gap I found:**',
        session.gapAnswer,
        '',
        '**Session Report:**',
        session.report || '',
        '',
        'Score: ' + session.score + '/10',
        'Source: ' + session.source,
        'Duration: ~' + Math.round((new Date(session.completedAt) - new Date(session.startedAt)) / 60000) + ' min',
      ].join('\n');

      if (typeof saveToJournal === 'function') {
        saveToJournal(
          'Feynman: ' + session.concept + ' (' + session.score + '/10)',
          journalContent,
          'feynman'
        ).catch(function(e) { console.warn('[feynman] Journal save failed:', e.message); });
      }

      /* 3. Send report to Oracle chat (as an assistant message) */
      if (typeof addMsg === 'function' && session.report) {
        setTimeout(function() {
          addMsg(
            '\uD83E\uDDE0 **Feynman Report — ' + session.concept + '**\n\n' + session.report,
            'assistant'
          );
        }, 500);
      }

      /* 4. Spaced repetition — create follow-up agenda */
      var daysOut   = session.score >= 7 ? 7 : 3;
      var followUp  = new Date();
      followUp.setDate(followUp.getDate() + daysOut);
      var followDate = RPGACE.utils.dateStr(followUp);

      RPGACE.DB.push('sched', {
        date:           followDate,
        hour:           10,
        title:          'Feynman Review: ' + session.concept,
        description:    'Spaced repetition — re-test understanding. Previous score: ' + session.score + '/10',
        category:       'learning',
        estimated_mins: 20,
        xp:             30,
        from_feynman:   true,
        feynman_score:  session.score,
      });

      RPGACE.utils.toast(
        '\uD83E\uDDE0 Session saved ' + session.score + '/10 \u00B7 Review in ' + daysOut + ' days',
        '#4A8CCC', 4000
      );

      /* 5. Update taxonomy node in Supabase (non-blocking) */
      self._updateTaxonomyNode(session.concept, session.score);

      /* 6. Log to daily action log */
      var today = RPGACE.utils.dateStr();
      var log   = RPGACE.DB.get('log') || {};
      if (!log[today]) log[today] = [];
      log[today].push({
        time:    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        title:   'Feynman: ' + session.concept,
        summary: 'Score ' + session.score + '/10. ' + (session.score < 7 ? 'Gaps found — review in 3 days.' : 'Verified.'),
        done:    true,
        id:      RPGACE.utils.id(),
      });
      RPGACE.DB.set('log', log);
    },

    _updateTaxonomyNode: function(concept, score) {
      // Route through taxonomySync module which uses RPGACE.sb helpers and correct schema
      if (RPGACE.modules.taxonomySync && typeof RPGACE.modules.taxonomySync.updateGapScore === 'function') {
        RPGACE.modules.taxonomySync.updateGapScore(concept, score);
        console.log('[feynman] Taxonomy gap score updated via taxonomySync:', concept, 'score:', score);
      } else {
        console.warn('[feynman] taxonomySync not available — gap score not updated');
      }
    },

  },

  // ============================================================
  // ui — rendering/DOM. Constructs or discovers DOM, or its dominant
  // responsibility is presentation. See the header block above.
  // ============================================================
  ui: {

    /* ── TRIGGER: Oracle chat intent detection ──────────── */
    _wireOracleDetection: function() {
      if (window._rpgace_feynman_oracle_wired) return;
      window._rpgace_feynman_oracle_wired = true;
      var self = RPGACE.modules.feynman;

      var chatInput = document.getElementById('chat-input');
      if (!chatInput) return;

      /* Detect learning intent on Enter / send */
      chatInput.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter' || e.shiftKey) return;
        var text = chatInput.value.toLowerCase().trim();
        var learningIntent = [
          'teach me', 'explain', 'what is', 'how does', 'i want to learn',
          'help me understand', 'feynman', 'study', 'learn about',
        ];
        var isLearning = learningIntent.some(function(phrase) {
          return text.includes(phrase);
        });
        if (isLearning && text.length > 8) {
          /* Extract concept from message */
          var concept = self._extractConcept(chatInput.value);
          if (concept) {
            /* Show a subtle offer inline — don't block the normal chat */
            setTimeout(function() { self._showOracleOffer(concept); }, 800);
          }
        }
      }, { passive: true });
    },

    _showOracleOffer: function(concept) {
      if (document.getElementById('feynman-offer')) return;
      // FLAGGED, NOT FIXED (G53 split) — `self` on the next line is a
      // PRE-EXISTING DEAD LOCAL: nothing in this body reads it (the Start
      // Session button reaches the module through the global
      // RPGACE.modules.feynman.start(...) form written into the markup
      // string instead). It was `var self = this;` before this split and is
      // swapped to the module handle in place like every other one, so it
      // stays CORRECT if a future edit ever does read it — deleting it
      // would be a real source change outside a pure refactor's remit.
      var self = RPGACE.modules.feynman;
      var offer = document.createElement('div');
      offer.id = 'feynman-offer';
      offer.style.cssText = 'background:rgba(74,144,226,0.1);border:1px solid rgba(74,144,226,0.3);border-radius:8px;padding:10px 14px;margin:8px 0;font-family:Rajdhani,sans-serif;font-size:12px;display:flex;align-items:center;gap:10px;';
      offer.innerHTML = '<span style="color:#4A8CCC;font-weight:700">\uD83E\uDDE0 Feynman Loop detected</span>'
        + '<span style="color:rgba(226,226,236,0.6);flex:1">Study "' + concept + '" properly — explain it to verify you know it.</span>'
        + '<button onclick="RPGACE.modules.feynman.start(\'' + concept.replace(/'/g, "\\'") + '\',\'oracle\')" '
        + 'style="background:rgba(74,144,226,0.2);border:1px solid #4A8CCC;color:#4A8CCC;border-radius:5px;padding:4px 10px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;font-size:11px;white-space:nowrap">'
        + 'Start Session</button>'
        + '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:14px">\u00D7</button>';

      var chatBox = document.getElementById('chat-box') || document.querySelector('.chat-messages');
      if (chatBox) chatBox.appendChild(offer);
      setTimeout(function() { if (offer.parentNode) offer.remove(); }, 8000);
    },

    _showDoNowChoice: function(idx, agenda, orig) {
      // FLAGGED, NOT FIXED (G53 split) — same PRE-EXISTING DEAD LOCAL as
      // ui._showOracleOffer above: nothing in this body reads `self`. Both
      // of this dialog's action buttons reach their target through globals
      // written into the markup string (RPGACE.modules.feynman.start(...)
      // and window._origStartDoNow(...)), never through `self`. Swapped to
      // the module handle in place rather than deleted, same reasoning.
      var self = RPGACE.modules.feynman;
      /* Remove any existing choice */
      var existing = document.getElementById('feynman-choice');
      if (existing) existing.remove();

      var choice = document.createElement('div');
      choice.id = 'feynman-choice';
      choice.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#0f0f18;border:1px solid rgba(74,144,226,0.4);border-radius:12px;padding:24px;z-index:9998;min-width:300px;font-family:Rajdhani,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,0.6)';
      choice.innerHTML = '<div style="font-family:Cinzel,serif;font-size:14px;color:#C9A84C;margin-bottom:8px">\uD83D\uDCDA ' + agenda.title + '</div>'
        + '<div style="color:rgba(226,226,236,0.7);font-size:12px;margin-bottom:20px">This is a learning session. How do you want to approach it?</div>'
        + '<div style="display:flex;flex-direction:column;gap:8px">'
        + '<button onclick="RPGACE.modules.feynman.start(\'' + agenda.title.replace(/'/g, "\\'") + '\',\'agenda\');document.getElementById(\'feynman-choice\').remove()" '
        + 'style="background:rgba(74,144,226,0.15);border:1px solid rgba(74,144,226,0.4);color:#4A8CCC;padding:10px 14px;border-radius:7px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;font-size:13px;text-align:left">'
        + '\uD83E\uDDE0 Feynman Loop — Test your understanding</button>'
        + '<button onclick="window._origStartDoNow(' + idx + ');document.getElementById(\'feynman-choice\').remove()" '
        + 'style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(226,226,236,0.7);padding:10px 14px;border-radius:7px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;font-size:13px;text-align:left">'
        + '\u25B6 Standard Do Now — Timer only</button>'
        + '<button onclick="document.getElementById(\'feynman-choice\').remove()" style="background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:11px;margin-top:4px">Cancel</button>'
        + '</div>';
      window._origStartDoNow = orig;
      document.body.appendChild(choice);
    },

    /* ── TRIGGER: Encyclopedia taxonomy buttons ──────────── */
    _wireEncyclopediaButtons: function() {
      var self = RPGACE.modules.feynman;
      /* Look for encyclopedia entry headers with taxonomy info */
      var entries = document.querySelectorAll('.enc-entry,.enc-card,[class*="enc-"]');
      entries.forEach(function(entry) {
        if (entry.querySelector('.feynman-enc-btn')) return;
        var title = entry.querySelector('h3,h4,.enc-title,.entry-title');
        if (!title) return;
        var concept = title.textContent.trim();
        var btn = document.createElement('button');
        btn.className = 'feynman-enc-btn';
        btn.style.cssText = 'font-size:11px;font-family:Rajdhani,sans-serif;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:rgba(74,144,226,0.1);border:1px solid rgba(74,144,226,0.3);color:#4A8CCC;padding:3px 8px;border-radius:4px;cursor:pointer;margin-left:8px;vertical-align:middle';
        btn.textContent = '\uD83E\uDDE0 Feynman';
        btn.onclick = function(e) {
          e.stopPropagation();
          self.start(concept, 'encyclopedia');
        };
        title.appendChild(btn);
      });
    },

    /* ── TRIGGER: Agenda card Feynman button ─────────────── */
    _wireAgendaCards: function() {
      var self = RPGACE.modules.feynman;
      var agendas = (window.STATE && STATE.agendas) || [];
      document.querySelectorAll('.agenda-card,.agenda-item').forEach(function(card, i) {
        if (card.querySelector('.feynman-card-btn')) return;
        var agenda = agendas[i];
        if (!agenda || agenda.category !== 'learning') return;
        var btn = document.createElement('button');
        btn.className = 'feynman-card-btn';
        btn.style.cssText = 'font-size:11px;font-family:Rajdhani,sans-serif;font-weight:700;background:rgba(74,144,226,0.1);border:1px solid rgba(74,144,226,0.3);color:#4A8CCC;padding:3px 8px;border-radius:4px;cursor:pointer;margin-top:4px;display:block';
        btn.textContent = '\uD83E\uDDE0 Feynman Test';
        btn.onclick = function(e) {
          e.stopPropagation();
          self.start(agenda.title, 'agenda');
        };
        card.appendChild(btn);
      });
    },

    /* ── Panel UI ────────────────────────────────────────── */
    _openPanel: function(concept) {
      var existing = document.getElementById('feynman-panel');
      if (existing) existing.remove();

      var panel = document.createElement('div');
      panel.id = 'feynman-panel';
      panel.style.cssText = [
        'position:fixed;top:0;right:0;width:min(420px,100vw);height:100vh',
        'background:#0c0c16;border-left:1px solid rgba(74,144,226,0.2)',
        'z-index:9999;display:flex;flex-direction:column',
        'box-shadow:-20px 0 60px rgba(0,0,0,0.5)',
        'font-family:Rajdhani,sans-serif',
      ].join(';');

      panel.innerHTML = [
        '<div style="background:rgba(74,144,226,0.08);border-bottom:1px solid rgba(74,144,226,0.2);padding:16px 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">',
          '<div>',
            '<div style="font-family:Cinzel,serif;font-size:11px;color:rgba(74,144,226,0.7);letter-spacing:2px;text-transform:uppercase">Feynman Loop</div>',
            '<div id="feynman-concept" style="font-size:15px;font-weight:700;color:#D4DAF5;margin-top:2px">' + concept + '</div>',
          '</div>',
          '<div style="display:flex;align-items:center;gap:10px">',
            '<div id="feynman-phase-badge" style="font-size:11px;font-weight:700;letter-spacing:1px;color:#4A8CCC;background:rgba(74,144,226,0.1);border:1px solid rgba(74,144,226,0.3);border-radius:10px;padding:3px 10px">Phase 1/3</div>',
            '<button onclick="RPGACE.modules.feynman.closePanel()" style="background:none;border:none;color:rgba(226,226,236,0.4);cursor:pointer;font-size:18px;line-height:1">\u00D7</button>',
          '</div>',
        '</div>',
        /* Progress bar */
        '<div style="height:3px;background:rgba(255,255,255,0.05);flex-shrink:0">',
          '<div id="feynman-progress" style="height:100%;width:100%;background:#4A8CCC;transform:scaleX(0.33);transform-origin:left;transition:transform .4s var(--ease-out)"></div>',
        '</div>',
        /* Messages */
        '<div id="feynman-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px"></div>',
        /* Input area */
        '<div style="border-top:1px solid rgba(255,255,255,0.06);padding:12px;flex-shrink:0">',
          '<textarea id="feynman-input" placeholder="Type your explanation here..." rows="3" ',
            'style="width:100%;background:#12121e;border:1px solid rgba(255,255,255,0.1);border-radius:7px;color:#D4DAF5;',
            'padding:10px 12px;font-family:Rajdhani,sans-serif;font-size:13px;resize:none;outline:none;box-sizing:border-box"></textarea>',
          '<div style="display:flex;gap:8px;margin-top:8px">',
            '<button id="feynman-submit" onclick="RPGACE.modules.feynman.submit()" ',
              'style="flex:1;background:rgba(74,144,226,0.2);border:1px solid rgba(74,144,226,0.5);color:#4A8CCC;',
              'padding:9px;border-radius:7px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;font-size:13px;letter-spacing:1px">',
              'SUBMIT',
            '</button>',
          '</div>',
        '</div>',
      ].join('');

      RPGACE.ui.slideInPanel(panel, {edge:'right'});
    },

    closePanel: function() {
      RPGACE.ui.slideOutPanel(document.getElementById('feynman-panel'), 'right');
      RPGACE.modules.feynman.session = null;
    },

    _addMessage: function(text, role) {
      var msgs = document.getElementById('feynman-messages');
      if (!msgs) return;
      var isOracle = role === 'oracle';
      var msg = document.createElement('div');
      msg.style.cssText = [
        'padding:10px 13px;border-radius:8px;font-size:12px;line-height:1.6;max-width:92%',
        isOracle
          ? 'background:rgba(74,144,226,0.08);border:1px solid rgba(74,144,226,0.15);color:rgba(226,226,236,0.85);align-self:flex-start'
          : 'background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.15);color:rgba(226,226,236,0.85);align-self:flex-end',
      ].join(';');
      /* Render basic markdown bold */
      msg.innerHTML = text.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#D4DAF5">$1</strong>').replace(/\n/g, '<br>');
      msgs.appendChild(msg);
      msgs.scrollTop = msgs.scrollHeight;
    },

    _setLoading: function(on) {
      var btn = document.getElementById('feynman-submit');
      var inp = document.getElementById('feynman-input');
      if (btn) btn.disabled = on;
      if (inp) inp.disabled = on;
      if (btn) btn.textContent = on ? 'THINKING...' : 'SUBMIT';
    },

    _setPhase: function(phase) {
      var badge = document.getElementById('feynman-phase-badge');
      var bar   = document.getElementById('feynman-progress');
      var labels = { 1: 'Phase 1/3 — Explain', 2: 'Phase 2/3 — Gap Check', 3: 'Phase 3/3 — Report' };
      var scales  = { 1: 0.33, 2: 0.66, 3: 1 };
      if (badge) badge.textContent = labels[phase] || 'Phase ' + phase;
      if (bar)   bar.style.transform = 'scaleX(' + (scales[phase] || 0.33) + ')';
    },

    /* ── Submit handler (phase router) ──────────────────── */
    submit: function() {
      var self = RPGACE.modules.feynman;
      var inp = document.getElementById('feynman-input');
      if (!inp) return;
      var text = inp.value.trim();
      if (!text) return;
      inp.value = '';

      if (!self.session) return;

      if (self.session.phase === 1) {
        self.session.phase = 2;
        self._runPhase2(text);
      } else if (self.session.phase === 2) {
        self.session.phase = 3;
        self._runPhase3(text);
      }
    },

    /* ── Actions after report ────────────────────────────── */
    _showCompleteActions: function() {
      // FLAGGED, NOT FIXED (G53 split) — TWO pre-existing dead locals here,
      // not one: `self` is never read (the Close Panel button in the markup
      // below reaches the module via the global
      // RPGACE.modules.feynman.closePanel() form), and `concept` is never
      // read either — the panel this builds shows only the score, the
      // review-interval chip and the "Saved to Journal" chip, and never
      // names the concept. `score` on the third line IS read, twice. Only
      // the `this` -> module-handle requalification was applied; removing
      // either dead local is a real source change this pass does not make.
      var self    = RPGACE.modules.feynman;
      var concept = self.session.concept;
      var score   = self.session.score;

      var actions = document.createElement('div');
      actions.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:14px 16px;border-top:1px solid rgba(255,255,255,0.06)';
      actions.innerHTML = [
        '<div style="font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.4);text-transform:uppercase;margin-bottom:4px">Session saved</div>',
        '<div style="display:flex;gap:8px">',
          '<div style="flex:1;background:rgba(74,144,226,0.08);border:1px solid rgba(74,144,226,0.2);border-radius:7px;padding:10px;text-align:center">',
            '<div style="font-size:22px;font-weight:700;color:#4A8CCC;font-family:Cinzel,serif">' + score + '<span style="font-size:12px">/10</span></div>',
            '<div style="font-size:11px;color:rgba(226,226,236,0.5);margin-top:2px">Feynman Score</div>',
          '</div>',
          '<div style="flex:2;display:flex;flex-direction:column;gap:5px">',
            score < 7
              ? '<div style="font-size:11px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);color:#C9A84C;border-radius:5px;padding:6px 10px">\u23F0 Review scheduled in 3 days</div>'
              : '<div style="font-size:11px;background:rgba(61,170,110,0.1);border:1px solid rgba(61,170,110,0.3);color:#4CAF82;border-radius:5px;padding:6px 10px">\u2713 Verified — follow-up in 7 days</div>',
            '<div style="font-size:11px;background:rgba(74,144,226,0.1);border:1px solid rgba(74,144,226,0.2);color:#4A8CCC;border-radius:5px;padding:6px 10px">\uD83D\uDCD3 Saved to Journal</div>',
          '</div>',
        '</div>',
        '<button onclick="RPGACE.modules.feynman.closePanel()" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:rgba(226,226,236,0.6);padding:8px;border-radius:7px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;font-size:12px;margin-top:2px">Close Panel</button>',
      ].join('');

      var panel = document.getElementById('feynman-panel');
      if (panel) panel.appendChild(actions);
    },

  },

  // Thin top-level pass-throughs — these preserve the exact existing
  // public API byte-for-byte. `this` is always the module object itself,
  // because every real call site invokes them as a property access on the
  // module (`self.X` from inside this module's own init / hook listeners /
  // promise chains / button handlers, or `RPGACE.modules.feynman.X(...)`
  // from outside and from this module's own generated onclick markup) —
  // never a detached function reference.
  //
  // Real external API surface, from a fresh whole-repo grep run for this
  // split, covering the `RPGACE.modules.feynman.X` direct form, every
  // local-alias form (`var f = RPGACE.modules.feynman`), the bracket form
  // `RPGACE.modules['feynman']`, index.html's inline onclick handlers, AND
  // this same file's own LEGACY:mainjs section (lines 24 - 4712, the
  // mechanically merged former main.js — the section a prior module's split
  // in this series found real callers hiding in):
  //   • ONE real call site OUTSIDE this module, reaching ONE method:
  //       knowledgeGap's node-card handler
  //         -> guarded by `typeof RPGACE.modules.feynman !== 'undefined'`
  //            and `typeof RPGACE.modules.feynman.start === 'function'`,
  //            then `RPGACE.modules.feynman.start(node.concept, 'knowledgeGap');`
  //       `start` is now `logic`. Both halves of that guard keep working
  //       byte-identically: the module object is unchanged, and the
  //       pass-through below is still a real `function`, so the
  //       `typeof ... === 'function'` test stays true exactly as before.
  //   • ZERO local-alias call sites, ZERO bracket-form call sites, ZERO
  //     index.html references, ZERO LEGACY:mainjs references — all four
  //     checked explicitly rather than assumed absent.
  //   • THREE methods are reached from generated onclick markup this module
  //     writes itself, which is a real runtime call path through the global
  //     `RPGACE.modules.feynman.X` form even though the strings live in
  //     this file: `start` (ui._showOracleOffer's "Start Session" button and
  //     ui._showDoNowChoice's Feynman button), `closePanel` (ui._openPanel's
  //     × and ui._showCompleteActions' "Close Panel") and `submit`
  //     (ui._openPanel's SUBMIT button). All three resolve through the
  //     pass-throughs below, so none of that markup needed to change.
  //   • The two module-scope DATA fields (`session`, `PROMPTS`) have ZERO
  //     external readers and are deliberately NOT given pass-throughs —
  //     they were never moved, so they are still reached as
  //     `RPGACE.modules.feynman.session` / `.PROMPTS` exactly as before.
  //
  // All 20 moved functions keep a pass-through regardless of whether an
  // external caller exists today, for two real reasons: the module's own
  // internal `self.X` calls all route through them (so an inconsistent set
  // would be a live bug, not a tidiness question), and a future caller
  // reaching a method that quietly lost its top-level entry would fail with
  // "is not a function" rather than anything diagnosable.
  _wireOracleDetection: function() { return this.ui._wireOracleDetection(); },
  _extractConcept: function(text) { return this.logic._extractConcept(text); },
  _showOracleOffer: function(concept) { return this.ui._showOracleOffer(concept); },
  _wrapStartDoNow: function() { return this.logic._wrapStartDoNow(); },
  _showDoNowChoice: function(idx, agenda, orig) { return this.ui._showDoNowChoice(idx, agenda, orig); },
  _wireEncyclopediaButtons: function() { return this.ui._wireEncyclopediaButtons(); },
  _wireAgendaCards: function() { return this.ui._wireAgendaCards(); },
  start: function(concept, source) { return this.logic.start(concept, source); },
  _openPanel: function(concept) { return this.ui._openPanel(concept); },
  closePanel: function() { return this.ui.closePanel(); },
  _addMessage: function(text, role) { return this.ui._addMessage(text, role); },
  _setLoading: function(on) { return this.ui._setLoading(on); },
  _setPhase: function(phase) { return this.ui._setPhase(phase); },
  _runPhase1: function() { return this.logic._runPhase1(); },
  _runPhase2: function(explanation) { return this.logic._runPhase2(explanation); },
  _runPhase3: function(gapAnswer) { return this.logic._runPhase3(gapAnswer); },
  submit: function() { return this.ui.submit(); },
  _showCompleteActions: function() { return this.ui._showCompleteActions(); },
  _saveSession: function() { return this.logic._saveSession(); },
  _updateTaxonomyNode: function(concept, score) { return this.logic._updateTaxonomyNode(concept, score); },

});
/* ===END:feynman=== */
