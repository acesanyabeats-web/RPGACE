from pathlib import Path
import subprocess

f = Path("rpgace_core.js")
src = f.read_text(encoding="utf-8", errors="replace")
print("Size:", len(src))

module = """

/* ================================================================
   GAP-FILL UTILITY
   When a prompt contains [PLACEHOLDER], show a step-by-step
   overlay asking the user to fill each one before sending.
================================================================ */
R.utils.fillGaps = function(prompt, onComplete) {
  var gaps = [];
  var re = /\[([^\]]+)\]/g;
  var m;
  while ((m = re.exec(prompt)) !== null) {
    gaps.push({ label: m[1], index: m.index, raw: m[0] });
  }
  if (!gaps.length) { onComplete(prompt); return; }

  var filled = {};
  var step = 0;

  var overlay = document.createElement('div');
  overlay.id = 'gap-fill-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:10000;display:flex;align-items:center;justify-content:center;font-family:Rajdhani,sans-serif;';

  var box = document.createElement('div');
  box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(201,168,76,0.3);border-radius:12px;padding:28px 32px;width:min(420px,90vw);max-width:100%;';

  var render = function() {
    box.innerHTML = '';
    var g = gaps[step];
    var stepLabel = document.createElement('div');
    stepLabel.textContent = 'Fill in \u00B7 ' + (step+1) + ' of ' + gaps.length;
    stepLabel.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.65);margin-bottom:10px;';
    box.appendChild(stepLabel);

    var question = document.createElement('div');
    question.textContent = g.label;
    question.style.cssText = 'font-size:16px;font-weight:700;color:#E2E2EC;margin-bottom:16px;line-height:1.4;';
    box.appendChild(question);

    var input = document.createElement('textarea');
    input.placeholder = 'Type your answer here...';
    input.value = filled[step] || '';
    input.style.cssText = 'width:100%;min-height:80px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:7px;color:#E2E2EC;font-family:Rajdhani,sans-serif;font-size:13px;padding:10px 12px;resize:vertical;outline:none;box-sizing:border-box;';
    box.appendChild(input);

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;margin-top:16px;justify-content:flex-end;';

    if (step > 0) {
      var backBtn = document.createElement('button');
      backBtn.textContent = '\u2190 Back';
      backBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.15);color:rgba(226,226,236,0.5);border-radius:6px;padding:8px 16px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;';
      backBtn.onclick = function() { filled[step] = input.value; step--; render(); };
      btnRow.appendChild(backBtn);
    }

    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(226,226,236,0.3);border-radius:6px;padding:8px 16px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;';
    cancelBtn.onclick = function() { overlay.remove(); };
    btnRow.appendChild(cancelBtn);

    var isLast = step === gaps.length - 1;
    var nextBtn = document.createElement('button');
    nextBtn.textContent = isLast ? '\u2713 Submit' : 'Next \u2192';
    nextBtn.style.cssText = 'background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.4);color:#C9A84C;border-radius:6px;padding:8px 20px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;';
    nextBtn.onclick = function() {
      var val = input.value.trim();
      if (!val) { input.style.borderColor = 'rgba(226,84,84,0.6)'; return; }
      filled[step] = val;
      if (isLast) {
        overlay.remove();
        var result = prompt;
        gaps.forEach(function(g2, i) {
          result = result.replace(g2.raw, filled[i] || g2.raw);
        });
        onComplete(result);
      } else {
        step++;
        render();
      }
    };
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) nextBtn.click();
    });
    btnRow.appendChild(nextBtn);
    box.appendChild(btnRow);

    var hint = document.createElement('div');
    hint.textContent = 'Ctrl+Enter to continue';
    hint.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.25);margin-top:8px;text-align:right;';
    box.appendChild(hint);

    setTimeout(function() { input.focus(); }, 50);
  };

  render();
  overlay.appendChild(box);
  document.body.appendChild(overlay);
};

/* ================================================================
   SEND TO ORACLE HELPER (shared by all panels)
================================================================ */
R.utils.sendToOracle = function(prompt) {
  var input = document.getElementById('chat-input') || document.querySelector('textarea');
  if (!input) { RPGACE.utils.toast('Oracle input not found', 'rgba(226,84,84,0.9)', 2500); return; }
  input.value = prompt;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  var sb = document.getElementById('send-btn') || document.querySelector('[onclick*="sendChat"]');
  if (sb) { setTimeout(function() { sb.click(); }, 80); }
  else if (typeof sendChat === 'function') { setTimeout(sendChat, 80); }
};

/* ================================================================
   UPDATE YOUTUBE ORACLE run() TO USE fillGaps
================================================================ */
(function() {
  var orig = RPGACE.modules.youtubeOracle && RPGACE.modules.youtubeOracle.run;
  if (!orig) return;
  RPGACE.modules.youtubeOracle.run = function(i) {
    var cmd = this.CMDS[i];
    if (!cmd) return;
    this._close();
    var self = this;
    R.utils.fillGaps(cmd[1], function(filled) {
      R.utils.sendToOracle(filled);
      RPGACE.utils.toast('\uD83C\uDFAC ' + cmd[0], 'rgba(255,120,120,0.9)', 2000);
    });
  };
})();

/* ================================================================
   PROD. BY ORACLE PANEL — Step 9 style
================================================================ */
RPGACE.register('prodOraclePanel', {

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
  ],

  ICONS: ['\uD83C\uDF1F','\uD83D\uDCA1','\u2753','\uD83C\uDFAF','\uD83D\uDD0D','\uD83D\uDCDD','\uD83E\uDDE0','\uD83C\uDFB5','\u23F0','\u2705','\uD83E\uDDED','\uD83D\uDCDA','\uD83D\uDD2C','\uD83D\uDCB0'],

  init: function() {
    var self = this;
    setTimeout(function() { self._intercept(); }, 1200);
    RPGACE.hooks.on('rpgace:ready', function() { setTimeout(function() { self._intercept(); }, 1200); });
  },

  _intercept: function() {
    if (window._prodOraclePanelIntercepted) return;
    var btn = document.querySelector('[onclick*="toggleProdOraclePanel"]');
    if (!btn) return;
    window._prodOraclePanelIntercepted = true;
    var self = this;
    btn.onclick = function() { self.open(); };
  },

  _close: function() {
    var p = document.getElementById('prod-op');
    if (p) { p.style.transform = 'translateX(100%)'; setTimeout(function(){p.remove();},280); }
  },

  open: function() {
    if (document.getElementById('prod-op')) { this._close(); return; }
    var self = this;
    var panel = document.createElement('div');
    panel.id = 'prod-op';
    panel.style.cssText = 'position:fixed;top:0;right:0;width:min(400px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(201,168,76,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;transform:translateX(100%);transition:transform .28s ease;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'background:rgba(201,168,76,0.06);border-bottom:1px solid rgba(201,168,76,0.12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    var ht = document.createElement('div');
    var lb = document.createElement('div');
    lb.textContent = 'PROD. BY ORACLE';
    lb.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.65);margin-bottom:3px;';
    var sub = document.createElement('div');
    sub.textContent = 'FL Studio \u00B7 UK Hip Hop \u00B7 14 Commands';
    sub.style.cssText = 'font-size:12px;font-weight:700;color:#E2E2EC;';
    ht.appendChild(lb); ht.appendChild(sub);
    var cb = document.createElement('button');
    cb.textContent = '\u00D7';
    cb.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:20px;line-height:1;padding:4px;';
    cb.onclick = function() { self._close(); };
    hdr.appendChild(ht); hdr.appendChild(cb);
    panel.appendChild(hdr);

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:14px;';
    var note = document.createElement('div');
    note.textContent = '14 COMMANDS \u00B7 PRE-FILLED FOR YOUR SESSION';
    note.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.3);margin-bottom:12px;';
    body.appendChild(note);

    self.CMDS.forEach(function(cmd, i) {
      var btn = document.createElement('button');
      btn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;cursor:pointer;text-align:left;color:rgba(226,226,236,0.82);font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;margin-bottom:5px;';
      var ic = document.createElement('span'); ic.textContent = self.ICONS[i] || '\u2B50'; ic.style.fontSize = '15px';
      var tx = document.createElement('span'); tx.textContent = cmd[0];
      btn.appendChild(ic); btn.appendChild(tx);
      btn.onmouseover = function() { this.style.background = 'rgba(201,168,76,0.08)'; };
      btn.onmouseout  = function() { this.style.background = 'rgba(255,255,255,0.03)'; };
      btn.onclick = function() { self.run(i); };
      body.appendChild(btn);
    });
    panel.appendChild(body);
    document.body.appendChild(panel);
    requestAnimationFrame(function() { requestAnimationFrame(function() { panel.style.transform = 'translateX(0)'; }); });
  },

  run: function(i) {
    var cmd = this.CMDS[i];
    if (!cmd) return;
    this._close();
    R.utils.fillGaps(cmd[1], function(filled) {
      R.utils.sendToOracle(filled);
      RPGACE.utils.toast('\uD83C\uDF9B ' + cmd[0], 'rgba(201,168,76,0.9)', 2000);
    });
  },

});

/* ================================================================
   INSTA-ORACLE PANEL — Step 9 style
================================================================ */
RPGACE.register('instaOraclePanel', {

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

  ICONS: ['\uD83C\uDFAC','\uD83D\uDCA1','\uD83D\uDD25','\uD83C\uDFDB','\uD83D\uDCC5','\uD83E\uDDE0','\uD83D\uDC41','\u2764','\uD83D\uDCAC','\u267B','\uD83D\uDCCC','\uD83D\uDCCA','\uD83D\uDD0D'],

  init: function() {
    var self = this;
    setTimeout(function() { self._intercept(); }, 1400);
    RPGACE.hooks.on('rpgace:ready', function() { setTimeout(function() { self._intercept(); }, 1400); });
  },

  _intercept: function() {
    if (window._instaOraclePanelIntercepted) return;
    var btn = document.querySelector('[onclick*="toggleInstaPanel"]');
    if (!btn) return;
    window._instaOraclePanelIntercepted = true;
    var self = this;
    btn.onclick = function() { self.open(); };
  },

  _close: function() {
    var p = document.getElementById('insta-op');
    if (p) { p.style.transform = 'translateX(100%)'; setTimeout(function(){p.remove();},280); }
  },

  open: function() {
    if (document.getElementById('insta-op')) { this._close(); return; }
    var self = this;
    var panel = document.createElement('div');
    panel.id = 'insta-op';
    panel.style.cssText = 'position:fixed;top:0;right:0;width:min(400px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(155,89,182,0.2);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;transform:translateX(100%);transition:transform .28s ease;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'background:rgba(155,89,182,0.06);border-bottom:1px solid rgba(155,89,182,0.15);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    var ht = document.createElement('div');
    var lb = document.createElement('div');
    lb.textContent = 'INSTA-ORACLE';
    lb.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.8);margin-bottom:3px;';
    var sub = document.createElement('div');
    sub.textContent = '@AceSanyaBeats \u00B7 Instagram \u00B7 13 Commands';
    sub.style.cssText = 'font-size:12px;font-weight:700;color:#E2E2EC;';
    ht.appendChild(lb); ht.appendChild(sub);
    var cb = document.createElement('button');
    cb.textContent = '\u00D7';
    cb.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:20px;line-height:1;padding:4px;';
    cb.onclick = function() { self._close(); };
    hdr.appendChild(ht); hdr.appendChild(cb);
    panel.appendChild(hdr);

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:14px;';
    var note = document.createElement('div');
    note.textContent = '13 COMMANDS \u00B7 PRE-FILLED FOR YOUR ACCOUNT';
    note.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.3);margin-bottom:12px;';
    body.appendChild(note);

    self.CMDS.forEach(function(cmd, i) {
      var btn = document.createElement('button');
      btn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;cursor:pointer;text-align:left;color:rgba(226,226,236,0.82);font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;margin-bottom:5px;';
      var ic = document.createElement('span'); ic.textContent = self.ICONS[i] || '\uD83D\uDCF8'; ic.style.fontSize = '15px';
      var tx = document.createElement('span'); tx.textContent = cmd[0];
      btn.appendChild(ic); btn.appendChild(tx);
      btn.onmouseover = function() { this.style.background = 'rgba(155,89,182,0.1)'; };
      btn.onmouseout  = function() { this.style.background = 'rgba(255,255,255,0.03)'; };
      btn.onclick = function() { self.run(i); };
      body.appendChild(btn);
    });
    panel.appendChild(body);
    document.body.appendChild(panel);
    requestAnimationFrame(function() { requestAnimationFrame(function() { panel.style.transform = 'translateX(0)'; }); });
  },

  run: function(i) {
    var cmd = this.CMDS[i];
    if (!cmd) return;
    this._close();
    R.utils.fillGaps(cmd[1], function(filled) {
      R.utils.sendToOracle(filled);
      RPGACE.utils.toast('\uD83D\uDCF8 ' + cmd[0], 'rgba(155,89,182,0.9)', 2000);
    });
  },

});
"""

src = src.rstrip() + module

tmp = Path("_panels.js")
tmp.write_text(src, encoding="utf-8", errors="replace")
r = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
tmp.unlink()

if r.returncode == 0:
    print("Syntax: PASSED")
    f.write_text(src, encoding="utf-8", errors="replace")
    print("Written:", len(src))
    print("Run: git add rpgace_core.js && git commit -m \"Step 9: Prod+Insta panels + gap-fill overlay\" && git push && npx vercel --prod")
else:
    print("Syntax FAILED:", r.stderr[:400])
