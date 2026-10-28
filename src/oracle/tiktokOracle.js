
/* ===MODULE:tiktokOracle=== */
// Aug 5 (Engineer pass, Phase G curveball 2) — real evidence-based
// architecture call, put to Alex directly: a SEPARATE panel, not a few
// extra commands folded into instaOraclePanel. TikTok's real discovery
// mechanic (a pure interest/FYP graph ranked on completion rate/
// rewatches/trending-sound usage) is genuinely different from
// Instagram's follower-graph-plus-explore model that instaOraclePanel's
// own existing commands are built around (Full Profile Audit's bio/
// highlights/grid aesthetic, DIAGNOSE: No Followers' profile-picture/
// bio-clarity framing - none of that maps onto how TikTok actually
// ranks content). Cramming TikTok content into a panel literally
// labeled "INSTA-ORACLE · Instagram" would misrepresent its own scope -
// the same category of mistake this project has already avoided
// elsewhere (taxonomy_nodes/taxonomy_tree kept deliberately separate
// because they answer genuinely different questions, not merged just
// because they're topically adjacent). Mirrors youtubeOracle's smaller
// real architecture (8 commands, own injected button) rather than
// instaOraclePanel's larger one, since TikTok is a new platform here
// the same way YouTube was a secondary addition to Instagram's original
// footprint - not a scope judgment on TikTok's importance, just the
// closer real precedent for a newly-added platform panel.
RPGACE.register('tiktokOracle', {
  domain: 'oracle',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026) — real, ratified /CEO plan item, and the THIRTEENTH
  // module to take this shape: split into two internal namespaces, `ui`
  // (rendering/DOM) and `logic` (business logic/data), following the
  // exact shape its twelve predecessors already shipped and verified.
  // Pure internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale,
  // never rewritten, never split down the middle (a deterministic
  // line-range extract plus an explicit, asserted list of `this`/`self`
  // requalifications, not a retype).
  //
  // 7 real members: 5 functions and TWO plain data fields, CMDS and
  // ICONS. Both data fields STAY AT MODULE SCOPE. `init` stays a literal
  // top-level function (RPGACE.register() calls `module.init()` directly
  // and cannot see into a sub-object, and its own `self` genuinely IS
  // the module). 3 moved into `ui`, 1 into `logic`.
  //
  // NOTE — the 3/1 split is the real, evidenced answer and it differs
  // from youtubeOracle's own 4/0 despite the two modules looking like
  // near-twins. `run` here is genuine `logic`: it hands the prompt
  // straight to the shared RPGACE.utils.fillGaps → sendToOracle helpers
  // and touches no DOM in its own body (verified by a keyword grep of
  // the body itself, not inferred from the module's shape).
  // youtubeOracle.run, by contrast, reads `#chat-input`, writes `.value`
  // and clicks `#send-btn` by hand, so it is `ui` there. Same method
  // name, genuinely different responsibility — classified per body, not
  // per name. `run` does call `self._close()`, which is a UI action, but
  // it reaches it through the module handle exactly as any other caller
  // would; a `logic` function delegating a close to `ui` is the normal
  // direction of that dependency, not a DOM touch of its own.
  //
  // The one real risk this split has to get right: a function moved into
  // `ui`/`logic` is invoked with `this` bound to THAT sub-object, not
  // the module. Exact accounting for all 4 moved functions:
  //   • ui._btn — already had `var self = this;`, swapped for the handle
  //     IN PLACE, statement order literally unchanged.
  //   • ui._close — touches no module state, moved byte-identical.
  //   • ui.open — had `var self = this;` on its second line while its
  //     FIRST line (the already-open guard) calls `this._close()`, so
  //     the handle is inserted as the first statement and the old line
  //     removed; the only statement-order change here, and a forced one
  //     (leaving it would have made `self` undefined at the guard — a
  //     real TypeError on the second click). Its inner
  //     `btn.onmouseover`/`onmouseout` closures keep their bare `this`:
  //     that `this` is the DOM button, and rewriting it would be a bug.
  //   • logic.run — had no `var self` and used bare `this.CMDS`/
  //     `this._close()`; handle inserted as its first statement, both
  //     rewritten. Left as `this.`, it would have read `logic.CMDS`
  //     (undefined) and every command press would have silently returned
  //     at the `if (!cmd) return;` guard.
  // ══════════════════════════════════════════════════════════════════

  CMDS: [
    ['Find Your Niche', 'Analyse this TikTok niche for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production tutorials. AUDIENCE: Aspiring producers aged 18-35. FREQUENCY: 3-5x per week. Return: 1) Niche saturation score 1-10 with explanation 2) Top 3 direct competitors and their strengths 3) Three underserved sub-niches with lower competition 4) Which content pillar to lead with on a brand-new TikTok specifically (distinct from an existing Instagram/YouTube presence) 5) Your single strongest differentiation angle. Be specific to this niche only.'],
    ['FYP Algorithm Audit', 'Audit @AceSanyaBeats for TikTok For You Page performance. NICHE: FL Studio beats and UK hip hop production tutorials. FREQUENCY: 3-5x per week. TikTok ranks almost entirely on completion rate, rewatches, and comments/shares in the first hour - NOT follower count or CTR like other platforms. Return: 1) COMPLETION RATE architecture (how to structure a video so people watch to the end) 2) REWATCH ENGINEERING (what makes someone watch a second time) 3) FIRST-HOUR VELOCITY (comment/share triggers in the critical early window) 4) POSTING CADENCE for FYP favour 5) THE SINGLE BIGGEST MISTAKE music production creators make on TikTok specifically. Specific to FL Studio and UK hip hop only.'],
    ['Sound & Trend Scout', 'Find trending sound and format opportunities for @AceSanyaBeats on TikTok right now. NICHE: FL Studio beats and UK hip hop production. Trending audio is a real, distinct TikTok discovery mechanic other platforms do not have in the same way. Return: 1) 5 trending sound/format types currently boosting music-production or beat-making content 2) How to use MY OWN beat as the trending sound in someone else\'s video (the real distribution mechanic unique to TikTok) 3) 3 specific video ideas combining a trending format with an FL Studio technique 4) What NOT to do (overused sounds/formats in this niche right now).'],
    ['Hook in Under 1 Second', 'Write 20 TikTok hooks for @AceSanyaBeats that work in the first FRAME, not the first few seconds - TikTok\'s scroll-away window is tighter than Instagram Reels or YouTube Shorts. NICHE: FL Studio beats and UK hip hop production. TOPIC: [TYPE YOUR VIDEO TOPIC]. For each hook: the exact on-screen text for frame 1, the spoken line (if any) for the first second, and why it stops a scroll specifically on TikTok. No generic creator hooks.'],
    ['Loop & Rewatch Engineering', 'Design a seamlessly-looping TikTok video concept for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production. TOPIC: [TYPE YOUR VIDEO TOPIC OR BEAT]. TikTok\'s vertical loop format rewards videos people watch multiple times in a row. Return: 1) How to structure the end so it loops seamlessly into the start 2) A specific edit/transition point that makes a rewatch feel intentional, not accidental 3) A caption/on-screen prompt that explicitly invites a second watch 4) The exact video length sweet spot for this content type on TikTok right now.'],
    ['Duet/Stitch Idea Generator', 'Generate 10 Duet or Stitch video concepts for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production. AUDIENCE: Aspiring producers aged 18-35. Duets/Stitches are a real TikTok-native remix mechanic Instagram and YouTube do not have. For each: what kind of original video to duet/stitch (a beat reaction, a producer tutorial, a trending sound), the exact reaction/addition to film, and why it gives a real discovery boost beyond a standalone post.'],
    ['Audience Mind Reader', 'Analyse TikTok audience psychology for @AceSanyaBeats. AUDIENCE: Aspiring producers aged 18-35 wanting pro-sounding FL Studio beats, scrolling TikTok specifically (not Instagram or YouTube). Return: 1) Their 5 biggest frustrations as expressed in TikTok comments/duets specifically (often blunter and more meme-coded than Instagram) 2) Their 3 core desires 3) The exact comment-bait phrasing that gets a real response on this platform 4) What makes them stop mid-scroll vs keep scrolling past in under 1 second 5) The one thing that makes them duet/stitch instead of just watching 6) One content idea per frustration.'],
    ['Viral Hook Generator 50', 'Generate 50 viral TikTok hooks for @AceSanyaBeats. NICHE: FL Studio beats and UK hip hop production. AUDIENCE: Aspiring producers aged 18-35. Category A: 18 FIRST-FRAME TEXT OVERLAY HOOKS (visible before any sound plays). Category B: 17 SOUND-SYNC HOOKS (the first beat-drop or vocal line timed to a trending or original sound). Category C: 15 SPOKEN HOOKS for the first second on camera. Each must stop a scroll specifically on TikTok and be specific to FL Studio or beat-making. After the 50 hooks give your top 5 picks and explain why they outperform the others for this specific niche and platform.'],
  ],

  ICONS: ['🎯','📊','🎵','⚡','🔁','🤝','🧠','🪝'],

  // Same real boot pattern as youtubeOracle - injects its own button by
  // finding an existing anchor in the live DOM (never touches main.js/
  // index.html, respects the FROZEN-file rule) since there is no
  // pre-existing TikTok toggle button anywhere to intercept.
  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self._btn(); });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) setTimeout(function() { self._btn(); }, 600);
    });
  },

  // ============================================================
  // logic — business logic/data: no DOM, pure computation + dispatch.
  // ============================================================
  logic: {

    run: function(i) {
      // Oct 10 2026 (O1): merged into the shared captionsPanel module.
      return RPGACE.modules.captionsPanel.run('tiktok', i);
    },

  },

  // ============================================================
  // ui — rendering/DOM: injects the button and builds/tears down
  // the slide-in panel.
  // ============================================================
  ui: {

    _btn: function() {
      // Oct 10 2026 (O1): merged into the shared captionsPanel module.
      // Its single 📣 Platform Oracle button replaces this one.
    },

    _close: function() {
      RPGACE.ui.slideOutPanel(document.getElementById('tt-op'), 'right');
    },

    open: function() {
      // Oct 10 2026 (O1): merged into the shared captionsPanel module.
      return RPGACE.modules.captionsPanel.open('tiktok');
    },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. No external caller invokes any METHOD of this module (verified
  // by grep of rpgace_core.js and index.html both), so these exist for
  // convention and for this module's OWN internal calls: `init` calls
  // `self._btn()`, `ui._btn` calls `self.open()`, `ui.open` calls
  // `self.run(i)`/`self._close()`, and `logic.run` calls `self._close()`
  // — every one of those `self`s is the module.
  //
  // REAL EXTERNAL TOUCHPOINT ON THE DATA, THOUGH — found during this
  // split and worth stating plainly, because the obvious grep does not
  // show it: `contentProductionLive._findOracleCmdText(moduleName,
  // cmdName)` reaches this module by DYNAMIC BRACKET LOOKUP,
  // `RPGACE.modules[moduleName]`, then reads `.CMDS`. A grep for
  // `RPGACE.modules.tiktokOracle.` structurally cannot see that. It is
  // called with the literal string 'tiktokOracle' from three real sites
  // (contentProductionLive's Phase-G caption generator, twice, and
  // contentRepurpose), pulling this panel's real command text into the
  // combined captions prompt as its TIKTOK EXPERTISE block. It only ever
  // reads `.CMDS` — never a method — which is exactly why CMDS and ICONS
  // stay at module scope here. Had CMDS been moved inside `logic`/`ui`,
  // all of those lookups would have silently returned null and the
  // captions prompt would have lost its TikTok expertise with no error.
  _btn: function() { return this.ui._btn(); },
  _close: function() { return this.ui._close(); },
  open: function() { return this.ui.open(); },
  run: function(i) { return this.logic.run(i); },

});
/* ===END:tiktokOracle=== */
