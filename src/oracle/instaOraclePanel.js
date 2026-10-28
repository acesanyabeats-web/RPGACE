
/* ===MODULE:instaOraclePanel=== */
RPGACE.register('instaOraclePanel', {
  domain: 'oracle',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026) — real, ratified /CEO plan item, and the FOURTEENTH
  // module to take this shape: split into two internal namespaces, `ui`
  // (rendering/DOM) and `logic` (business logic/data), following the
  // exact shape its thirteen predecessors already shipped and verified.
  // Pure internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale (a
  // deterministic line-range extract plus an explicit, asserted list of
  // `this`/`self` requalifications, not a retype).
  //
  // 7 real members: 5 functions and TWO plain data fields, CMDS and
  // ICONS. Both data fields STAY AT MODULE SCOPE. `init` stays a literal
  // top-level function (RPGACE.register() calls `module.init()`
  // directly). 3 moved into `ui`, 1 into `logic`.
  //
  // NOTE — TWO genuinely non-obvious classification calls here, both
  // named outright rather than decided silently:
  //
  //   1. `_intercept` → `ui`, DESPITE containing zero `document.*` calls.
  //      A literal DOM-keyword grep of its body says `logic`: it only
  //      reads `typeof window.toggleInstaPanel`, sets the
  //      `window._instaOraclePanelIntercepted` guard flag, and reassigns
  //      `window.toggleInstaPanel` to a closure. But its real
  //      responsibility is UI wiring — it hijacks the global function an
  //      existing on-page button's click handler resolves to, so that
  //      pressing that button opens THIS module's panel instead of
  //      whatever the legacy main.js code originally wired up. That is
  //      button-to-panel plumbing, i.e. exactly what `_btn` does on the
  //      youtubeOracle/tiktokOracle siblings (unambiguous `ui` there),
  //      just reached by intercepting a global rather than by injecting
  //      a new element. Classified by dominant responsibility, not by
  //      literal keyword match — the same precedent phylumPath._jumpToNode
  //      and bookworm's own similar cases already set, where a body with
  //      no DOM markers is still `ui` because its whole purpose is live
  //      page navigation/wiring.
  //
  //   2. `run` → `logic`, matching tiktokOracle.run and diverging from
  //      youtubeOracle.run. It hands the prompt to the shared
  //      RPGACE.utils.fillGaps → sendToOracle helpers and touches no DOM
  //      in its own body (verified by a keyword grep of the body itself).
  //      youtubeOracle.run, by contrast, reads `#chat-input`, writes
  //      `.value` and clicks `#send-btn` by hand, so it is `ui` there.
  //      Same method name, genuinely different responsibility.
  //
  // The one real risk this split has to get right: a function moved into
  // `ui`/`logic` is invoked with `this` bound to THAT sub-object, not
  // the module. Exact accounting for all 4 moved functions:
  //   • ui._intercept — already had `var self = this;`, swapped for the
  //     handle IN PLACE. It sits AFTER the two guards rather than on line
  //     1, and stays exactly where it was (neither guard touches `this`),
  //     so nothing about its control flow moved.
  //   • ui._close — touches no module state, moved byte-identical.
  //   • ui.open — had `var self = this;` on its second line while its
  //     FIRST line (the already-open guard) calls `this._close()`, so the
  //     handle is inserted as the first statement and the old line
  //     removed; the only statement-order change here, and a forced one.
  //     Its inner `btn.onmouseover`/`onmouseout` closures keep their bare
  //     `this`: that `this` is the DOM button, not the module.
  //   • logic.run — had no `var self` and used bare `this.CMDS`/
  //     `this._close()`; handle inserted as its first statement, both
  //     rewritten. Left as `this.`, it would have read `logic.CMDS`
  //     (undefined) and every command press would have silently returned.
  // ══════════════════════════════════════════════════════════════════

  CMDS: [
    ['Content Creator Mode', 'Activate full content creator mode for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. AUDIENCE: Aspiring producers aged 18-35. PLATFORMS: Instagram and YouTube. FREQUENCY: 3-4 posts per week. Generate: my positioning, unique voice and angle, content pillars with percentages, the 3 content types that drive the most followers in my niche, and the first 7 posts to create starting today.'],
    ['100 Content Ideas', 'Generate 100 content ideas for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production. AUDIENCE: Aspiring producers aged 18-35. Organise into 9 categories: tutorials, beat showcases, process videos, opinion pieces, reaction content, challenges, collaborations, behind-the-scenes, and trending formats. For each idea: the hook angle, format, and why it performs for this audience. Mark the top 10 with a star.'],
    ['50 Viral Hooks', 'Generate 50 viral content hooks for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production. AUDIENCE: Aspiring producers aged 18-35. Format: 20 Instagram caption hooks, 20 reel hooks for the first 3 seconds on screen, 10 story hooks. Each must stop the scroll, open a loop, and be specific to FL Studio or beat-making. No generic creator hooks.'],
    ['Viral Content Architect', 'Design a complete viral content piece for @AceSanyaBeats. TOPIC: [TYPE YOUR CONTENT TOPIC]. PLATFORM: Instagram Reels. Build the full architecture: hook in 1 second, tension-building problem, value-delivering solution, pattern interrupt at the midpoint, CTA at the end. Give me the script, visual direction, caption with hashtags, and thumbnail concept.'],
    ['30-Day Calendar', 'Build a 30-day content calendar for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production. FREQUENCY: 3-4 posts per week on Instagram and YouTube Shorts. Include: daily posting schedule, content pillar rotation, hooks for each post, trending audio or format notes, and a tracking metric per week. Format as a clear calendar starting tomorrow.'],
    ['Audience Mind Reader', 'Analyse the psychology of my Instagram audience for @AceSanyaBeats. AUDIENCE: Aspiring producers aged 18-35 wanting pro-sounding FL Studio beats. Return: their 5 deepest frustrations, 3 secret desires beyond just making beats, exact language from comments and DMs, what makes them save vs scroll, what makes them share, the single emotional trigger that makes them follow. Then give me 5 content ideas built directly from these insights.'],
    ['DIAGNOSE: Low Views', 'My Instagram content is getting low views. ACCOUNT: @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. Diagnose the exact reason and prescribe the fix. Check: hook quality in first 3 frames, audio choice, content relevance, posting time, hashtag strategy, reel length, visual quality, and caption structure. For each issue: how to diagnose it and the exact fix with examples for my niche.'],
    ['DIAGNOSE: Low Likes', 'My Instagram posts get low likes. ACCOUNT: @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. Diagnose and prescribe. Analyse: emotional resonance, relatability to aspiring producers, visual appeal, CTA quality, whether my content makes people feel something vs just learn, and how it compares to top FL Studio creators.'],
    ['DIAGNOSE: No Comments', 'My Instagram posts get no comments. ACCOUNT: @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. Diagnose the silence and prescribe how to start conversations. Cover: whether I ask questions, create opinions, am controversial enough to react to, how to end posts to invite discussion, and 5 specific comment-bait post ideas for the production niche.'],
    ['DIAGNOSE: Low Shares', 'My Instagram posts are not shared. ACCOUNT: @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. Diagnose and prescribe. Analyse: share triggers for the producer audience, whether my content is identity-expressing, whether my tips are good enough to send to a friend, and the 3 specific post formats that will generate shares in my niche.'],
    ['DIAGNOSE: Low Saves', 'My Instagram posts get no saves. ACCOUNT: @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. Diagnose and prescribe. Saves indicate reference value. Analyse: whether my content functions as a resource people return to, whether I use list formats worth saving, whether my tips are specific enough to keep, and the 5 most saveable content formats for the FL Studio production niche.'],
    ['DIAGNOSE: No Followers', 'My Instagram account is not growing. ACCOUNT: @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. Run a complete profile audit. Check: bio clarity, profile picture and highlights, content consistency and visual identity, reason to follow beyond the individual post, positioning vs other FL Studio creators, and whether my niche is clear. Give me a 7-day follower growth action plan.'],
    ['Full Profile Audit', 'Run a complete Instagram profile audit for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. AUDIENCE: Aspiring producers aged 18-35. Audit every element: bio, link in bio strategy, profile picture, highlight covers and content, pinned posts, content grid aesthetic, posting frequency, caption style, hashtag strategy, and engagement rate expectations. Priority list of what to fix first.'],
  ],

  ICONS: ['🎬','💡','🪝','🏗️','📅','🧠','👀','❤️','💬','♻️','🔖','📈','🔍'],

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self._intercept(); });
  },

  // ============================================================
  // logic — business logic/data: no DOM, pure computation + dispatch.
  // ============================================================
  logic: {

    run: function(i) {
      // Oct 10 2026 (O1): merged into the shared captionsPanel module.
      return RPGACE.modules.captionsPanel.run('instagram', i);
    },

  },

  // ============================================================
  // ui — rendering/DOM + UI wiring: hijacks the existing global
  // toggle so the on-page button opens this panel, and builds/tears
  // down the slide-in panel itself.
  // ============================================================
  ui: {

    _intercept: function() {
      if (window._instaOraclePanelIntercepted) return;
      if (typeof window.toggleInstaPanel === 'undefined') return;
      window._instaOraclePanelIntercepted = true;
      var self = RPGACE.modules.instaOraclePanel;
      window.toggleInstaPanel = function() { self.open(); };
    },

    _close: function() {
      RPGACE.ui.slideOutPanel(document.getElementById('insta-op'), 'right');
    },

    open: function() {
      // Oct 10 2026 (O1): merged into the shared captionsPanel module.
      return RPGACE.modules.captionsPanel.open('instagram');
    },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. No external caller invokes any METHOD of this module (verified
  // by grep of rpgace_core.js and index.html both), so these exist for
  // convention and for this module's OWN internal calls: `init` calls
  // `self._intercept()`, `ui._intercept` installs a closure calling
  // `self.open()`, `ui.open` calls `self.run(i)`/`self._close()`, and
  // `logic.run` calls `self._close()` — every one of those `self`s is
  // the module. index.html DOES carry two real `onclick=
  // "toggleInstaPanel()"` handlers, but those hit the GLOBAL that
  // `ui._intercept` hijacks, never a module method directly — which is
  // the whole reason `_intercept` is classified `ui` (see the G53 note
  // at the top of this module).
  //
  // REAL EXTERNAL TOUCHPOINT ON THE DATA, THOUGH — found during this
  // split and worth stating plainly, because the obvious grep does not
  // show it: `contentProductionLive._findOracleCmdText(moduleName,
  // cmdName)` reaches this module by DYNAMIC BRACKET LOOKUP,
  // `RPGACE.modules[moduleName]`, then reads `.CMDS`. A grep for
  // `RPGACE.modules.instaOraclePanel.` structurally cannot see that. It
  // is called with the literal string 'instaOraclePanel' from three real
  // sites (contentProductionLive's Phase-G caption generator, twice, and
  // contentRepurpose), pulling this panel's real command text into the
  // combined captions prompt as its INSTAGRAM EXPERTISE block. It only
  // ever reads `.CMDS` — never a method — which is exactly why CMDS and
  // ICONS stay at module scope here. Had CMDS been moved inside
  // `logic`/`ui`, all of those lookups would have silently returned null
  // and the captions prompt would have lost its Instagram expertise with
  // no error at all.
  _intercept: function() { return this.ui._intercept(); },
  _close: function() { return this.ui._close(); },
  open: function() { return this.ui.open(); },
  run: function(i) { return this.logic.run(i); },

});
/* ===END:instaOraclePanel=== */
