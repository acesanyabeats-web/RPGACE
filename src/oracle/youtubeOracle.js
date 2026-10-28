
/* ===DOMAIN:ORACLE=== */

/* ===MODULE:youtubeOracle=== */
RPGACE.register('youtubeOracle', {
  domain: 'oracle',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026) — real, ratified /CEO plan item, and the TWELFTH
  // module to take this shape (after the videoPipeline/beatLog/bookworm/
  // phylumPath pilot, then contentProductionLive, conidPot, videoSummary,
  // questEngine, intelDelete, feynman and taxonomyReviewQueue): this
  // module is split into two internal namespaces, `ui` (rendering/DOM)
  // and `logic` (business logic/data), following the exact shape those
  // eleven already shipped and verified. Pure internal-structure
  // refactor — zero functional, behavioural, UX, data or schema change;
  // every function below was MOVED wholesale, never rewritten, never
  // split down the middle, and its own body is otherwise untouched (a
  // deterministic line-range extract plus an explicit, asserted list of
  // `this`/`self` requalifications, not a retype, so no character of any
  // body could drift silently).
  //
  // 7 real members: 5 functions and TWO plain data fields, CMDS and
  // ICONS (checked by direct read of every top-level key, not assumed).
  // Both data fields STAY AT MODULE SCOPE and were not moved — a copy
  // inside `ui` would be a second, divergent command list rather than
  // the one real one. `init` stays a literal top-level function (because
  // RPGACE.register() calls `module.init()` directly and cannot see into
  // a sub-object, and its own `self` genuinely IS the module —
  // byte-identical, still calling the top-level pass-throughs).
  //
  // REAL, HONEST RESULT WORTH NAMING RATHER THAN HIDING: all 4 movable
  // functions land in `ui`, and `logic` below is genuinely EMPTY. That
  // is not a classification failure or a shortcut — it is what this
  // module actually is once looked at squarely: an injected button
  // (_btn), a slide-out (_close), a panel builder (open), and a command
  // dispatcher that reaches straight into the live chat textarea and
  // clicks the real send button (run). Every one of the four touches the
  // DOM directly, verified by a keyword grep of each individual body
  // rather than assumed from its name. The empty `logic: {}` is kept
  // deliberately so the module still presents the same two-namespace
  // shape as its eleven siblings, with the emptiness stated outright
  // instead of silently omitted.
  //
  // NOTE — `run` is the one genuinely non-obvious call here, and it goes
  // to `ui` DESPITE the name. Its two siblings on the other two social
  // panels (tiktokOracle.run, instaOraclePanel.run) are real `logic`,
  // because they hand the prompt to the shared RPGACE.utils.fillGaps/
  // sendToOracle helpers and touch no DOM of their own. THIS one does
  // not use those helpers at all — it reads `#chat-input`, writes
  // `.value`, dispatches a real input Event, then finds and clicks
  // `#send-btn`. Classified by real DOM touch, never by the name it
  // shares with its siblings. (That divergence is itself flagged as a
  // pre-existing oddity in this pass's report — left exactly as-is here,
  // per the standing "restructure only, never silently fix" rule.)
  //
  // The one real risk this split has to get right, function by function:
  // a function moved into `ui`/`logic` is invoked with `this` bound to
  // THAT sub-object, not the module. Every moved function that needs
  // module state now reaches it through
  // `var self = RPGACE.modules.youtubeOracle;`. Exact accounting for all
  // 4 moved functions, so a later reader can check by grep rather than
  // take it on trust:
  //   • _btn — already had `var self = this;`, that one line swapped for
  //     the handle IN PLACE, so statement order is literally unchanged.
  //   • _close — touches no module state at all, moved byte-identical.
  //   • open — had `var self = this;` on its SECOND line, but its FIRST
  //     line (the already-open guard) calls `this._close()`. Leaving the
  //     declaration where it sat would have left `self` undefined at the
  //     guard (a real TypeError on the second click, `var` hoisting
  //     giving the name but not the value), so the handle is inserted as
  //     the first statement and the old `var self = this;` line removed —
  //     the only statement-order change anywhere in this module, and a
  //     forced one. Its inner `btn.onmouseover`/`onmouseout` closures
  //     keep their bare `this` untouched: that `this` is the DOM button,
  //     not the module, and rewriting it would have been a real bug.
  //   • run — had no `var self` at all and used bare `this.CMDS`/
  //     `this._close()`; the handle is inserted as its first statement
  //     and both rewritten to `self.`. Left as `this.`, it would have
  //     read `ui.CMDS` (undefined), so every command press would have
  //     hit the `if (!cmd) return;` guard and silently done nothing.
  // ══════════════════════════════════════════════════════════════════

  CMDS: [
    ['Find Your Niche', 'Analyse this YouTube niche for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. AUDIENCE: Aspiring producers aged 18-35. FREQUENCY: 2x per week. Return: 1) Niche saturation score 1-10 with explanation 2) Top 3 direct competitors and their strengths 3) Three underserved sub-niches with lower competition 4) Monetisation potential ranking 5) Your single strongest differentiation angle. Be specific to this niche only.'],
    ['Channel Identity Builder', 'Build the channel identity for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. AUDIENCE: Aspiring producers aged 18-35. UNIQUE ANGLES: Russian and French and London cultural perspective, building while working hospitality shifts. Return: 1) Three tagline options under 10 words each 2) My Unique Mechanism 3) Brand voice in 3 words 4) Positioning statement in one sentence 5) Visual identity direction 6) What cliches to avoid.'],
    ['90-Day Content Machine', 'Build a 90-day compound view strategy for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. FREQUENCY: 2x per week, 24 videos total. Return: 1) The content pillars for the 90 days 2) Upload schedule with rotation logic 3) Ratio of evergreen vs trending content 4) Which video type to lead with 5) How videos compound on each other 6) What good traction looks like at day 30, 60, 90.'],
    ['Script Writer Hook to CTA', 'Write a complete YouTube script for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. AUDIENCE: Aspiring producers aged 18-35. FORMAT: Tutorial showing FL Studio screen with on-camera moments. Include: HOOK in first 10 seconds, PROBLEM in 30 seconds, SOLUTION as main body with scene notes as SCREEN: show X or CAM: say Y, PATTERN INTERRUPT every 90 seconds, CTA in final 20 seconds. TOPIC: Tell me your topic or I will suggest one for your niche.'],
    ['Title and Thumbnail Optimizer', 'Generate 10 title options and thumbnail concepts for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. AUDIENCE: Aspiring producers aged 18-35. For each title: CTR score 1-10, one reason, category of Curiosity or Number or Transformation or How-To. For each thumbnail: main image, text overlay max 5 words, colour scheme, emotion triggered. Rank your top 3 title and thumbnail combinations. TOPIC: Describe your video or I will suggest based on underserved gaps in your niche.'],
    ['YouTube Algorithm Audit', 'Audit @AceSanyaBeats for YouTube algorithm performance. NICHE: FL Studio beats and UK hip hop production tutorials. FREQUENCY: 2x per week. Return: 1) CTR OPTIMISATION 2) WATCH TIME retention architecture 3) SESSION TIME end screen card and playlist strategy 4) UPLOAD CONSISTENCY impact 5) COMMUNITY SIGNALS comment strategy 6) SHORTS recommendation 7) THE SINGLE BIGGEST MISTAKE music production channels make. Specific to FL Studio and UK hip hop only.'],
    ['Audience Mind Reader', 'Analyse audience psychology for @AceSanyaBeats. AUDIENCE: Aspiring producers aged 18-35 wanting pro-sounding FL Studio beats. Return: 1) Their 5 biggest frustrations 2) Their 3 core desires 3) Exact language they use in forums and comments 4) One content idea per frustration 5) Emotional journey from first video to subscriber to buyer 6) What makes them click away in 30 seconds 7) The one emotional trigger that makes them share content.'],
    ['Viral Hook Generator 50', 'Generate 50 viral hooks for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. AUDIENCE: Aspiring producers aged 18-35. Category A: 18 TITLE HOOKS specific to FL Studio and beat-making. Category B: 17 THUMBNAIL TEXT HOOKS of 3-5 words max. Category C: 15 FIRST-10-SECONDS SPOKEN HOOKS that open a loop they must close. After the 50 hooks give your top 5 picks across all categories and explain why they outperform the others for this specific niche.'],
  ],

  ICONS: ['🎯','🪪','📅','📝','🖼️','📊','🧠','🪝'],

  // July 24 audit fix: both real boot paths were dead. The rpgace:ready
  // listener below ran too late (registered from inside init(), which
  // only runs because ready already fired - see RPGACE.hooks landmine).
  // The page:show check used the bare literal 'oracle', but real page
  // ids come from index.html/main.js (this page is 'advisor') - it
  // never matched. The button only ever appeared via a separate
  // hand-rolled duplicate injector elsewhere in the file; this is the
  // one real fix, not a second copy.
  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self._btn(); });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) setTimeout(function() { self._btn(); }, 600);
    });
  },

  // ============================================================
  // logic — business logic/data: no DOM, pure computation + writes.
  // Genuinely EMPTY for this module (see the G53 note above): all 4
  // movable functions touch the DOM directly, so all 4 are `ui`.
  // Kept rather than omitted so the two-namespace shape matches its
  // eleven siblings and the emptiness is stated, not silent.
  // ============================================================
  logic: {},

  // ============================================================
  // ui — rendering/DOM: injects the button, builds/tears down the
  // slide-in panel, and drives the live chat input directly.
  // ============================================================
  ui: {

    _btn: function() {
      // Oct 10 2026 (O1): merged into the shared captionsPanel module.
      // Its single 📣 Platform Oracle button replaces this one.
    },

    _close: function() {
      RPGACE.ui.slideOutPanel(document.getElementById('yt-op'), 'right');
    },

    open: function() {
      // Oct 10 2026 (O1): merged into the shared captionsPanel module.
      return RPGACE.modules.captionsPanel.open('youtube');
    },

    // G53 batch 5 review (Sep 2026, real rule-7 fix, flagged during the
    // split and fixed here as a clearly separate, single-function change
    // — never bundled into the restructure itself): the success toast
    // used to fire unconditionally, even when no chat input existed at
    // all, or when a prompt was placed but nothing sent it. Now toasts
    // success only on the real happy path, and an honest failure toast
    // otherwise — matching the shared error-toast convention (#CC4A4A),
    // which errorLog._capture now also records automatically (G109).
    run: function(i) {
      // Oct 10 2026 (O1): merged into the shared captionsPanel module.
      return RPGACE.modules.captionsPanel.run('youtube', i);
    },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. No external caller invokes any METHOD of this module (verified
  // by grep of rpgace_core.js and index.html both), so these exist for
  // convention and for its OWN internal calls: `init` calls
  // `self._btn()`, `ui._btn` calls `self.open()`, and `ui.open` calls
  // `self.run(i)`/`self._close()` — every one of those `self`s is the
  // module, so each lands here first.
  //
  // REAL EXTERNAL TOUCHPOINT ON THE DATA, THOUGH — found during this
  // split and worth stating plainly, because the obvious grep does not
  // show it: `contentProductionLive._findOracleCmdText(moduleName,
  // cmdName)` reaches this module by DYNAMIC BRACKET LOOKUP,
  // `RPGACE.modules[moduleName]`, then reads `.CMDS`. A grep for
  // `RPGACE.modules.youtubeOracle.` structurally cannot see that. It is
  // called with the literal string 'youtubeOracle' from three real
  // sites (contentProductionLive's Phase-G caption generator, twice, and
  // contentRepurpose), pulling this panel's real command text into the
  // combined captions prompt. It only ever reads `.CMDS` — never a
  // method — which is exactly why CMDS and ICONS stay at module scope
  // here. Had CMDS been moved inside `logic`/`ui`, all of those lookups
  // would have silently returned null and the captions prompt would
  // have lost its YouTube expertise block with no error at all.
  _btn: function() { return this.ui._btn(); },
  _close: function() { return this.ui._close(); },
  open: function() { return this.ui.open(); },
  run: function(i) { return this.ui.run(i); },

});
/* ===END:youtubeOracle=== */
