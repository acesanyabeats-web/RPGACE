from pathlib import Path
import sys

f = Path("rpgace_core.js")
if not f.exists():
    print("ERROR: rpgace_core.js not found. Run from rpgace-vercel-v4 folder.")
    sys.exit(1)

src = f.read_text(encoding="utf-8", errors="replace")
print("Current size:", len(src), "chars")
changed = False

# FIX 1: _store -> _s in STATE (backward compat)
if "_store:" in src or "this._store[" in src:
    src = src.replace("_store: {},", "_s: {},")
    src = src.replace("this._store[", "this._s[")
    print("FIX 1: _store -> _s")
    changed = True

# FIX 2: Add safety net for _calMonthDate BEFORE onReady
safety = "try{if(!window._calMonthDate||!(window._calMonthDate instanceof Date))window._calMonthDate=new Date();}catch(e){}"
if safety not in src and "onReady(function" in src:
    src = src.replace(
        "onReady(function",
        safety + "\n  onReady(function",
        1
    )
    print("FIX 2: Added _calMonthDate safety net")
    changed = True

# FIX 3: Add youtubeOracle module if missing
if "youtubeOracle" not in src:
    print("FIX 3: Adding YouTube Oracle module...")
    yt = """

RPGACE.register('youtubeOracle', {
  COMMANDS: [
    { icon: '\\uD83C\\uDFAF', label: 'Find Your Niche', prompt: 'Analyse this YouTube niche for @AceSanyaBeats:\\nNICHE: FL Studio beats / UK hip hop production tutorials\\nAUDIENCE: Aspiring producers aged 18-35 wanting pro-sounding beats\\nFREQUENCY: 2x per week\\n\\nReturn:\\n1. Niche saturation score 1-10 with explanation\\n2. Top 3 direct competitors and their strengths\\n3. 3 underserved sub-niches with lower competition\\n4. Monetisation potential ranking (beats / AdSense / courses)\\n5. Your single strongest differentiation angle\\n\\nBe specific to this niche. No generic advice.' },
    { icon: '\\uD83C\\uDFDB', label: 'Channel Identity Builder', prompt: 'Build the channel identity for @AceSanyaBeats:\\nNICHE: FL Studio beats / UK hip hop production tutorials\\nAUDIENCE: Aspiring producers aged 18-35\\nUNIQUE ANGLES: Russian/French/London cultural perspective\\n\\nReturn:\\n1. 3 tagline options under 10 words each\\n2. My Unique Mechanism - what I teach that nobody else does this way\\n3. Brand voice in 3 words\\n4. Positioning statement (one sentence)\\n5. Visual identity direction (colour palette, thumbnail energy, font personality)\\n6. What cliches to avoid that make channels look like everyone else' },
    { icon: '\\uD83D\\uDCC5', label: '90-Day Content Machine', prompt: 'Build a 90-day compound view strategy for @AceSanyaBeats:\\nNICHE: FL Studio beats / UK hip hop production tutorials\\nFREQUENCY: 2x per week, 24 videos total\\n\\nReturn:\\n1. The 3-4 content pillars for the 90 days\\n2. Upload schedule with pillar rotation logic\\n3. Ratio of evergreen vs trending content and why\\n4. Which video type to lead with as video 1 and why\\n5. How videos compound on each other (series and internal links)\\n6. What good traction looks like at day 30, 60, 90' },
    { icon: '\\uD83D\\uDCDD', label: 'Script Writer (Hook to CTA)', prompt: 'Write a complete YouTube script for @AceSanyaBeats:\\nNICHE: FL Studio beats / UK hip hop production tutorials\\nAUDIENCE: Aspiring producers aged 18-35\\nFORMAT: Tutorial showing FL Studio screen with on-camera moments\\n\\nScript structure:\\n- HOOK (first 10 seconds): show the payoff immediately\\n- PROBLEM (30 seconds): why most producers get this wrong\\n- SOLUTION (main body, step-by-step, FL Studio specific)\\n- PATTERN INTERRUPT every 90 seconds\\n- CTA (final 20 seconds): subscribe + next video tease\\n\\nUse scene notes: [SCREEN: show X] or [CAM: say Y to camera]\\n\\nTOPIC: Tell me your topic or I will suggest one for your niche.' },
    { icon: '\\uD83D\\uDDA5', label: 'Title + Thumbnail Optimizer', prompt: 'Generate 10 titles and thumbnail concepts for @AceSanyaBeats:\\nNICHE: FL Studio beats / UK hip hop production tutorials\\nAUDIENCE: Aspiring producers aged 18-35\\n\\nFor each title: CTR score 1-10, reason, category (Curiosity/Number/Transformation/How-To)\\nFor each thumbnail: main image, text overlay max 5 words, colour scheme, emotion triggered in 0.5 seconds\\n\\nRank your top 3 title-thumbnail combinations as a package.\\n\\nTOPIC: Describe your video or I will suggest based on underserved gaps in your niche.' },
    { icon: '\\uD83D\\uDD2C', label: 'YouTube Algorithm Audit', prompt: 'Audit @AceSanyaBeats for YouTube algorithm performance:\\nNICHE: FL Studio beats / UK hip hop production tutorials\\nFREQUENCY: 2x per week\\n\\n1. CTR OPTIMISATION: what titles and thumbnails must do differently\\n2. WATCH TIME: retention architecture for tutorials\\n3. SESSION TIME: end screen, card, and playlist strategy\\n4. UPLOAD CONSISTENCY: what happens if I miss a week\\n5. COMMUNITY SIGNALS: comment strategy that actually triggers signals\\n6. SHORTS: should I post Shorts for this niche and how many\\n7. THE SINGLE BIGGEST MISTAKE music production channels make with the algorithm\\n\\nSpecific to FL Studio and UK hip hop niche only. Not generic YouTube advice.' },
    { icon: '\\uD83E\\uDDE0', label: 'Audience Mind Reader', prompt: 'Analyse audience psychology for @AceSanyaBeats:\\nAUDIENCE: Aspiring producers aged 18-35 wanting pro-sounding FL Studio beats\\n\\n1. Their 5 biggest frustrations (what keeps them stuck at 2am)\\n2. Their 3 core desires (what they want to feel, not just achieve)\\n3. Exact language they use (phrases, search terms, how they talk in forums)\\n4. One content idea per frustration\\n5. The emotional journey: first video to subscriber to buyer\\n6. What makes them click away in the first 30 seconds\\n7. The one emotional trigger that makes this audience share content' },
    { icon: '\\uD83D\\uDD25', label: 'Viral Hook Generator (50)', prompt: 'Generate 50 viral hooks for @AceSanyaBeats:\\nNICHE: FL Studio beats / UK hip hop production tutorials\\nAUDIENCE: Aspiring producers aged 18-35\\n\\nA) TITLE HOOKS (18) - specific to FL Studio and beat-making. No generic hooks.\\nB) THUMBNAIL TEXT HOOKS (17) - 3-5 words max, high contrast, producer-specific.\\nC) FIRST-10-SECONDS SPOKEN HOOKS (15) - one sentence that opens a loop they must close.\\n\\nAfter the 50: give your top 5 picks across all categories and explain why they outperform the others for this specific niche.' },
  ],

  init: function() {
    var self = this;
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'oracle') setTimeout(function() { self._injectButton(); }, 500);
    });
  },

  _injectButton: function() {
    if (document.getElementById('yt-oracle-btn')) return;
    var self = this;
    var anchor = document.querySelector('[onclick*="toggleProdOraclePanel"]') ||
                 document.querySelector('#prod-oracle-btn');
    if (!anchor) return;
    var btn = document.createElement('button');
    btn.id = 'yt-oracle-btn';
    btn.innerHTML = '\\uD83C\\uDFAC YouTube Oracle';
    btn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:rgba(255,0,0,0.08);border:1px solid rgba(255,80,80,0.25);color:rgba(255,130,130,0.9);border-radius:6px;padding:6px 12px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-left:8px;';
    btn.onclick = function() { self.openPanel(); };
    anchor.parentElement.appendChild(btn);
  },

  openPanel: function() {
    var ex = document.getElementById('yt-oracle-panel');
    if (ex) { ex.remove(); return; }
    var self = this;
    var p = document.createElement('div');
    p.id = 'yt-oracle-panel';
    p.style.cssText = 'position:fixed;top:0;right:0;width:min(380px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(255,80,80,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;transform:translateX(100%);transition:transform .28s ease;';
    var cmds = this.COMMANDS.map(function(c, i) {
      return '<button onclick="RPGACE.modules.youtubeOracle.run(' + i + ')" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;cursor:pointer;text-align:left;color:rgba(226,226,236,0.82);font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;margin-bottom:5px;" onmouseover="this.style.background=\'rgba(255,60,60,0.1)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.03)\'">' + c.icon + ' ' + c.label + '</button>';
    }).join('');
    p.innerHTML = '<div style="background:rgba(255,40,40,0.06);border-bottom:1px solid rgba(255,80,80,0.12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0"><div><div style="font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(255,100,100,0.6)">YOUTUBE ORACLE</div><div style="font-size:13px;font-weight:700;color:#E2E2EC">@AceSanyaBeats</div></div><button onclick="document.getElementById(\'yt-oracle-panel\').remove()" style="background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:18px">&times;</button></div><div style="flex:1;overflow-y:auto;padding:14px">' + cmds + '</div>';
    document.body.appendChild(p);
    requestAnimationFrame(function() { requestAnimationFrame(function() { p.style.transform = 'translateX(0)'; }); });
  },

  run: function(idx) {
    var cmd = this.COMMANDS[idx];
    if (!cmd) return;
    var panel = document.getElementById('yt-oracle-panel');
    if (panel) { panel.style.transform = 'translateX(100%)'; setTimeout(function() { panel.remove(); }, 300); }
    var input = document.getElementById('chat-input') || document.querySelector('textarea');
    if (input) {
      input.value = cmd.prompt;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      var sendB = document.getElementById('send-btn') || document.querySelector('[onclick*="sendChat"]');
      if (sendB) setTimeout(function() { sendB.click(); }, 100);
      else if (typeof sendChat === 'function') setTimeout(sendChat, 100);
    }
    RPGACE.utils.toast('\\uD83C\\uDFAC ' + cmd.label, 'rgba(255,100,100,0.9)', 2500);
  },
});
"""
    src = src.rstrip() + yt
    changed = True
    print("FIX 3: YouTube Oracle added")
else:
    print("FIX 3: YouTube Oracle already present")

if changed:
    f.write_text(src, encoding="utf-8", errors="replace")
    print("Written:", len(src), "chars")
    print("DONE - now run: git add rpgace_core.js && git commit -m \"Step 9: YouTube Oracle + getFullYear fix\" && git push && npx vercel --prod")
else:
    print("No changes needed")
