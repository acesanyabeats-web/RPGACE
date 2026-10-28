

/* ===MODULE:prodOraclePanel=== */
RPGACE.register('prodOraclePanel', {
  domain: 'oracle',

  // ══════════════════════════════════════════════════════════════════
  // G53 (Sep 2026), module 27 of 60 — real, ratified /CEO plan item:
  // split into two internal namespaces, `ui` (rendering/DOM) and
  // `logic` (business logic/data), following the exact shape its
  // twenty-six predecessors already shipped and verified. Pure
  // internal-structure refactor — zero functional, behavioural, UX,
  // data or schema change; every function below was MOVED wholesale
  // (the one function that changed POSITION, `run`, moved byte-for-byte
  // apart from its named `this` requalifications), never rewritten and
  // never split down the middle. Bodies are deliberately NOT
  // re-indented inside their new namespace, matching the two most
  // recently shipped modules (docsLinks/25, encSync/26), so the diff
  // shows only real changes rather than a whitespace wall.
  //
  // 6 real members: 4 functions and TWO plain data fields, CMDS and
  // ICONS. Both data fields STAY AT MODULE SCOPE — and that is
  // load-bearing here, not cosmetic: contentProductionLive's
  // `_findOracleCmdText(moduleName, cmdName)` reaches sibling Oracle
  // panels by DYNAMIC BRACKET LOOKUP (`RPGACE.modules[moduleName]`
  // then `.CMDS`), which a literal `RPGACE.modules.prodOraclePanel.`
  // grep structurally cannot see. It is not called with
  // 'prodOraclePanel' today (only 'youtubeOracle'/'tiktokOracle'/
  // 'instaOraclePanel' — checked, not assumed), but moving CMDS into a
  // sub-namespace would silently break that lookup the day it is, with
  // no error at all. `init` stays a literal top-level function
  // (RPGACE.register() calls `module.init()` directly and cannot see
  // into a sub-object). 3 moved into `ui`, 1 into `logic`.
  //
  // This module is a near-exact structural twin of instaOraclePanel
  // (module 14): same CMDS/ICONS pair, same `_intercept` global-toggle
  // hijack, same `_close`, same panel-building `open`, same
  // fillGaps-dispatching `run`. Both of its non-obvious calls were
  // re-derived from THIS module's own body rather than inherited, and
  // both landed the same way:
  //
  //   1. `_intercept` → `ui`, DESPITE containing zero `document.*`
  //      calls. A literal DOM-keyword grep of its body says `logic`:
  //      it only reads `typeof window.toggleProdOraclePanel`, sets the
  //      `window._prodOraclePanelIntercepted` guard, and reassigns
  //      `window.toggleProdOraclePanel` to a closure. But its real
  //      responsibility is UI wiring — it hijacks the global function
  //      an existing on-page button's click handler resolves to, so
  //      pressing that button opens THIS module's panel. That is
  //      button-to-panel plumbing, i.e. exactly what `_btn` does on the
  //      youtubeOracle/tiktokOracle siblings (unambiguous `ui` there),
  //      just reached by intercepting a global rather than injecting an
  //      element. The competing reading is real and worth stating: it
  //      is the same SHAPE as encSync.logic._patch (module 26), a
  //      `window.X` wrapper-installer that was shipped as `logic`. The
  //      discriminator that separates them is the WRAPPED GLOBAL'S OWN
  //      job — encSync wraps `syncAndPush`/`clearEncyclopedia`, which
  //      are data operations, so wrapping them is data work; this wraps
  //      a panel TOGGLE, whose entire job is showing/hiding UI, so
  //      wrapping it is UI work. `ui` chosen on dominant responsibility,
  //      matching instaOraclePanel.ui._intercept exactly.
  //
  //   2. `run` → `logic`, matching instaOraclePanel.run and
  //      tiktokOracle.run, and diverging from youtubeOracle.run. Its
  //      own body was grepped: zero `document.*`, zero
  //      `createElement`/`innerHTML`/`querySelector`. It selects the
  //      command, makes two real by-name dispatch DECISIONS (the
  //      Council-of-5 `allowConversationCapture` opt-in and the
  //      forceGroundNext() opt-in), and hands the prompt to the shared
  //      `RPGACE.utils.fillGaps` → `sendToOracle` helpers. Its
  //      `self._close()` call and its `RPGACE.utils.toast(...)` are
  //      TRIGGERS of UI, not construction of it — the standing rule
  //      since the phylumPath pilot. youtubeOracle.run is `ui` because
  //      it genuinely reads `#chat-input`, writes `.value` and clicks
  //      `#send-btn` by hand; same method name, genuinely different
  //      responsibility.
  //
  // The one real risk this split has to get right: a function moved
  // into `ui`/`logic` is invoked with `this` bound to THAT sub-object,
  // not the module. Exact accounting for all 4 moved functions, so a
  // later reader can check by grep rather than take it on trust:
  //   • ui._intercept — already had `var self = this;`, swapped for the
  //     module handle IN PLACE (it sits after the two guards, neither
  //     of which touches `this`, so control flow is unchanged). It is
  //     captured by the `window.toggleProdOraclePanel` closure calling
  //     `self.open()`. Left as `this.`, it would have read `ui.open` —
  //     which DOES exist on `ui`, so this one would have kept working
  //     by luck rather than by design; requalified anyway so the module
  //     never depends on two functions happening to share a namespace.
  //   • ui._close — touches no module state, moved byte-identical.
  //   • ui.open — had `var self = this;` on its SECOND line while its
  //     FIRST line (the already-open guard) calls `this._close()`, so
  //     the handle is inserted as the first statement and the old line
  //     removed; the only statement-order change in this module, and a
  //     forced one. Its `self.CMDS`/`self.ICONS` reads are module-scope
  //     DATA FIELDS — the exact bug class oracleDevBridge's `this.TABLE`
  //     documented — and would have read `undefined` off `ui`, throwing
  //     inside `self.CMDS.forEach` the first time the panel opened. Its
  //     inner `btn.onmouseover`/`onmouseout` closures keep their bare
  //     `this`: that `this` is the DOM button, not the module.
  //   • logic.run — had NO `var self` and used bare `this.CMDS[i]` and
  //     `this._close()`; handle inserted as its first statement, both
  //     rewritten. THIS IS THE ONE THAT GENUINELY WOULD HAVE BROKEN
  //     SILENTLY: `this.CMDS` inside `logic` is `undefined`, so
  //     `undefined[i]` throws a TypeError, and it throws at the moment
  //     Alex actually presses a command button — not at load — with no
  //     toast and no visible feedback at all.
  //
  // ui -> logic and logic -> ui cross-namespace calls are both normal
  // here (ui.open -> logic.run, logic.run -> ui._close, ui._intercept
  // -> ui.open); every one goes through the top-level pass-through via
  // `self.X`, never `this.logic.X`/`this.ui.X` directly, so no call
  // site inside the module had to change.
  //
  // Zero external touchpoints confirmed by a fresh repo-wide grep for
  // `RPGACE.modules.prodOraclePanel` (0 hits anywhere, rpgace_core.js
  // and index.html included) — the module is driven entirely by the
  // `window.toggleProdOraclePanel` global its own `_intercept` hijacks.
  // ══════════════════════════════════════════════════════════════════

  CMDS: [
    ['Master Learning', 'I am a music producer using FL Studio making UK hip hop and drill beats. I want to master [TYPE A SPECIFIC PRODUCTION TOPIC]. Teach me this concept completely. Use the 3-layer method: simple terms first, then technical mechanics, then the expert nuance most tutorials miss. Be specific to FL Studio throughout.'],
    ['Instant Understanding', 'Explain [TYPE A PRODUCTION CONCEPT OR TECHNIQUE] to me in exactly 3 layers. Layer 1: explain it like I am 10 years old in 2 sentences. Layer 2: explain the real technical mechanics in 5 sentences. Layer 3: the one expert insight about this that most FL Studio producers never figure out.'],
    ['Socratic Teaching', 'Teach me [TYPE A PRODUCTION CONCEPT] using the Socratic method. Ask me questions to expose what I already know, what I think I know but am wrong about, and what I have never considered. Do not explain the concept directly. Lead me to understand it through my own answers. I make UK hip hop and drill in FL Studio.'],
    ['Real World Application', 'I understand [TYPE A PRODUCTION CONCEPT] in theory but have never applied it. Give me 5 specific real-world scenarios in FL Studio where this knowledge changes a decision I make tonight. For each: the exact situation, the exact decision this knowledge changes, the exact FL Studio steps, and exactly how my beat sounds different.'],
    ['Gap Finder', 'Analyse my production knowledge and find the gap I do not know exists. MY KNOWN CONCEPTS: [LIST EVERY PRODUCTION CONCEPT YOU KNOW, SEPARATED BY COMMAS]. Find: the hidden prerequisite I am missing, the assumption I am probably making that is wrong, the connection between concepts I have not made, and the exact gap limiting my sound right now.'],
    ['Teach It Back', 'I am going to explain [TYPE A PRODUCTION CONCEPT] to you as if you are a complete beginner. Score me on accuracy out of 10, identify every gap in my explanation, then teach me what I got wrong. Here is my explanation: [TYPE YOUR OWN EXPLANATION OF THE CONCEPT IN YOUR OWN WORDS]'],
    ['Permanent Knowledge', 'Design a spaced repetition system for [TYPE A PRODUCTION TOPIC]. Give me: the 5 most important facts to remember, a 30-second daily review exercise, a weekly FL Studio practice task, a test to verify I have mastered it, and the first mistake I will make so I know to watch for it.'],
    ['Beat Analysis', 'Analyse this beat reference and teach me every production technique used. REFERENCE: [DESCRIBE THE BEAT OR PASTE AN ARTIST AND TRACK NAME]. For each technique: name it, how it was done in FL Studio, which taxonomy node it maps to, exact FL Studio steps to recreate it, and difficulty 1-10.'],
    ['Learn in 20 Hours', 'Build a 20-hour plan for mastering [TYPE A PRODUCTION SKILL] in FL Studio. Divide into 10 x 2-hour sessions. For each session: specific skill focus, exact exercises, FL Studio tools involved, test to confirm learning before moving on, and the mistake to watch for.'],
    ['Test Me Until I Master It', 'I have just studied [TYPE A PRODUCTION TOPIC]. Test me with 10 increasingly difficult questions, starting with basic recall and ending with expert application. After each answer: tell me right or wrong, explain what I missed, ask the next question. Do not give answers until I attempt each one.'],
    ['Learning Ladder', 'Create a 5-level learning ladder for [TYPE A PRODUCTION SKILL] in FL Studio. Level 1 is complete beginner and Level 5 is professional. For each level: the skills that define it, how to test if I am at that level, the one exercise that takes me to the next level, and the most common mistake. Then tell me which level I am at based on: [DESCRIBE YOUR CURRENT ABILITY WITH THIS SKILL]'],
    ['Best Resources', 'Find the 5 best resources for learning [TYPE A PRODUCTION SKILL OR CONCEPT] specifically for FL Studio and UK hip hop production. For each: what it is, why it is the best for this topic, what level it targets, what I will learn that I cannot get elsewhere, and how long it takes to extract the value.'],
    ['Research Questions', 'Generate 10 strong research questions about [TYPE A PRODUCTION TOPIC] for FL Studio and UK hip hop production. Each must be specific, actionable in FL Studio, capable of producing a tutorial insight, and relevant to my genre. After the 10 questions, tell me which 3 to research first and why.'],
    ['Productize Yourself', 'Help me turn my production knowledge into a product. MY CORE SKILL: [TYPE YOUR STRONGEST PRODUCTION SKILL]. MY AUDIENCE: Aspiring producers aged 18-35 wanting pro-sounding FL Studio beats. Give me 3 product formats scored by effort and revenue potential. For the highest scorer: outline, launch positioning, and 7-day launch plan.'],
    ['Council of 5 — Decision Audit', 'Run a real Council of 5 audit on a decision I am weighing, not a pep talk. THE DECISION: [DESCRIBE WHAT YOU ARE ABOUT TO DO — e.g. buying a plugin, changing your upload schedule, taking a collab, switching a mixing workflow]. Give me exactly five things, in order: 1) CREATIVE/TECHNICAL RISK — what could genuinely fail to deliver the sound or result I expect. 2) REAL COST — actual time and money, worst case not best case. 3) MAINTAINABILITY — does this become a repeatable part of my workflow or a one-off headache. 4) AUDIENCE & ALGORITHM IMPACT — how this actually lands with my audience and the platform, not how I hope it lands. 5) THE HONEST CASE AGAINST — the single strongest reason not to do this at all. Then give a real verdict: worth it, worth it with changes, or not worth it right now — and do not soften the verdict just because I clearly want to do it.'],
    ['5thDimension — Built vs Reported', 'Run a real /5thDimension pass on RPGACE itself, not a status summary. Ground yourself using whatever real self-awareness data you actually have access to (the live dashboard state, the app status digest, the taxonomy tree) — do not invent facts about code you cannot see. Give me exactly this, in order: 1) WHAT YOU CAN ACTUALLY CONFIRM IS WORKING — only things your own grounding data genuinely shows evidence for (real counts, real recent activity), named plainly as "confirmed" vs "reported to me but I cannot verify." 2) WHERE YOUR OWN KNOWLEDGE MIGHT BE STALE — parts of RPGACE you have no live visibility into at all (this is expected and fine — say so). 3) A REWIRING/INTERCONNECTION IDEA — one real way two things you can see (e.g. two features, two data sources) could connect better for me. 4) THE HONEST COUNTER-CASE — the strongest real reason that rewiring idea might not be worth it right now. 5) WHAT TO BRING TO CLAUDE CODE — since a full code-level built-vs-reported audit needs git/file access you do not have, tell me plainly which parts of this need a real Claude Code session running the full /5thDimension protocol instead of relying on this chat.'],
  ],

  ICONS: ['🎓','💡','❓','🛠️','🔍','🗣️','🧠','🎧','⏰','✅','🪜','📚','🔬','💰','⚖️','🌌'],

  init: function() {
    var self = this;
    RPGACE.registerBootTask(function() { return self._intercept(); });
  },

  // ============================================================
  // logic — business logic/data: no DOM construction or discovery.
  // The one function here picks the command, makes the two real
  // by-name dispatch decisions (conversation capture, force-grounding)
  // and hands the prompt to the shared fillGaps -> sendToOracle
  // helpers. See the `run` note in the G53 block above for why it
  // lands here despite triggering a panel close and a toast.
  // ============================================================
  logic: {

  run: function(i) {
    var self = RPGACE.modules.prodOraclePanel;
    var cmd = self.CMDS[i];
    if (!cmd) return;
    self._close();
    // July 22 — Council of 5 specifically can use the real conversation
    // as its context instead of Alex re-typing a summary of what was
    // discussed (see fillGaps' new opts.allowConversationCapture). Opted
    // in by name, not by index, so reordering CMDS can't silently break it.
    var opts = (cmd[0] === 'Council of 5 — Decision Audit') ? { allowConversationCapture: true } : {};
    // July 28 real bug fix: this command's own prompt text told Oracle to
    // "ground yourself using whatever real self-awareness data you
    // actually have access to" but never contained any of
    // oracleAppGrounding's keyword triggers, so the grounding block never
    // fired - the exact command whose purpose is a grounded self-audit was
    // the one that ran fully ungrounded. Force it in by name (same opt-in-
    // by-name pattern as Council of 5's allowConversationCapture above)
    // rather than relying on keyword luck. Council of 5 gets the same
    // treatment - a real decision audit benefits from real app state too.
    if ((cmd[0] === '5thDimension — Built vs Reported' || cmd[0] === 'Council of 5 — Decision Audit') && RPGACE.modules.oracleAppGrounding) {
      RPGACE.modules.oracleAppGrounding.forceGroundNext();
    }
    RPGACE.utils.fillGaps(cmd[1], function(filled) {
      RPGACE.utils.sendToOracle(filled);
      RPGACE.utils.toast('?? ' + cmd[0], 'rgba(201,168,76,0.9)', 2000);
    }, opts);
  },

  },

  // ============================================================
  // ui — rendering/DOM + UI wiring: hijacks the existing global
  // toggle so the on-page button opens this panel, and builds/tears
  // down the slide-in panel itself.
  // ============================================================
  ui: {

  _intercept: function() {
    if (window._prodOraclePanelIntercepted) return;
    if (typeof window.toggleProdOraclePanel === 'undefined') return;
    window._prodOraclePanelIntercepted = true;
    var self = RPGACE.modules.prodOraclePanel;
    window.toggleProdOraclePanel = function() { self.open(); };
  },

  _close: function() {
    RPGACE.ui.slideOutPanel(document.getElementById('prod-op'), 'right');
  },

  open: function() {
    var self = RPGACE.modules.prodOraclePanel;
    if (document.getElementById('prod-op')) { self._close(); return; }
    var panel = document.createElement('div');
    panel.id = 'prod-op';
    panel.style.cssText = 'position:fixed;top:0;right:0;width:min(400px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(201,168,76,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'background:rgba(201,168,76,0.06);border-bottom:1px solid rgba(201,168,76,0.12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    var ht = document.createElement('div');
    var lb = document.createElement('div');
    lb.textContent = 'PROD. BY ORACLE';
    lb.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.65);margin-bottom:3px;';
    var sub = document.createElement('div');
    sub.textContent = 'FL Studio · UK Hip Hop · 16 Commands';
    sub.style.cssText = 'font-size:12px;font-weight:700;color:#D4DAF5;';
    ht.appendChild(lb); ht.appendChild(sub);
    var cb = document.createElement('button');
    cb.textContent = '×';
    cb.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:20px;line-height:1;padding:4px;';
    cb.onclick = function() { self._close(); };
    hdr.appendChild(ht); hdr.appendChild(cb);
    panel.appendChild(hdr);

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:14px;';
    var note = document.createElement('div');
    note.textContent = '16 COMMANDS · PRE-FILLED FOR YOUR SESSION';
    note.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.3);margin-bottom:12px;';
    body.appendChild(note);

    self.CMDS.forEach(function(cmd, i) {
      var btn = document.createElement('button');
      btn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;cursor:pointer;text-align:left;color:rgba(226,226,236,0.82);font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;margin-bottom:5px;';
      var ic = document.createElement('span'); ic.textContent = self.ICONS[i] || '⭐'; ic.style.fontSize = '15px';
      var tx = document.createElement('span'); tx.textContent = cmd[0];
      btn.appendChild(ic); btn.appendChild(tx);
      btn.onmouseover = function() { this.style.background = 'rgba(201,168,76,0.08)'; };
      btn.onmouseout  = function() { this.style.background = 'rgba(255,255,255,0.03)'; };
      btn.onclick = function() { self.run(i); };
      body.appendChild(btn);
    });
    panel.appendChild(body);
    RPGACE.ui.slideInPanel(panel, {edge:'right'});
  },

  },

  // Thin top-level pass-throughs — preserve the exact existing public
  // API. No external caller invokes any METHOD of this module (verified
  // by a fresh grep of rpgace_core.js and index.html both — zero hits
  // for `RPGACE.modules.prodOraclePanel` anywhere outside this module's
  // own body), so these exist for convention and for its OWN internal
  // calls: `init` calls `self._intercept()`, `ui._intercept`'s installed
  // global calls `self.open()`, `ui.open`'s per-command button onclick
  // calls `self.run(i)` and its close button calls `self._close()`, and
  // `logic.run` calls `self._close()` — every one of those `self`s is
  // the module, so each lands here first and is routed on to the right
  // namespace.
  _intercept: function() { return this.ui._intercept(); },
  _close: function() { return this.ui._close(); },
  open: function() { return this.ui.open(); },
  run: function(i) { return this.logic.run(i); },

});
/* ===END:prodOraclePanel=== */
