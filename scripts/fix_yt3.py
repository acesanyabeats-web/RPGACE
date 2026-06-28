from pathlib import Path
import subprocess

f = Path("rpgace_core.js")
src = f.read_text(encoding="utf-8", errors="replace")

start_marker = "\nRPGACE.register('youtubeOracle',"
if start_marker in src:
    idx = src.index(start_marker)
    src = src[:idx].rstrip()
    print("Removed old youtubeOracle at char", idx)
else:
    print("No existing youtubeOracle found, appending fresh")

clean_module = """

RPGACE.register('youtubeOracle', {

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

  ICONS: ['\uD83C\uDFAF','\uD83C\uDFDB','\uD83D\uDCC5','\uD83D\uDCDD','\uD83D\uDDA5','\uD83D\uDD2C','\uD83E\uDDE0','\uD83D\uDD25'],

  init: function() {
    var self = this;
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'oracle') setTimeout(function() { self._btn(); }, 600);
    });
  },

  _btn: function() {
    if (document.getElementById('yt-ob')) return;
    var self = this;
    var anchor = document.querySelector('[onclick*="toggleProdOraclePanel"]') ||
                 document.querySelector('#prod-oracle-btn');
    if (!anchor) return;
    var b = document.createElement('button');
    b.id = 'yt-ob';
    b.textContent = '\uD83C\uDFAC YouTube Oracle';
    b.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:rgba(255,0,0,0.08);border:1px solid rgba(255,80,80,0.25);color:rgba(255,130,130,0.9);border-radius:6px;padding:6px 12px;cursor:pointer;font-family:Rajdhani,sans-serif;font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;margin-left:8px;';
    b.onclick = function() { self.open(); };
    anchor.parentElement.appendChild(b);
  },

  _close: function() {
    var p = document.getElementById('yt-op');
    if (p) { p.style.transform = 'translateX(100%)'; setTimeout(function(){p.remove();},280); }
  },

  open: function() {
    if (document.getElementById('yt-op')) { this._close(); return; }
    var self = this;
    var panel = document.createElement('div');
    panel.id = 'yt-op';
    panel.style.cssText = 'position:fixed;top:0;right:0;width:min(380px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(255,80,80,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;transform:translateX(100%);transition:transform .28s ease;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'background:rgba(255,40,40,0.06);border-bottom:1px solid rgba(255,80,80,0.12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    var ht = document.createElement('div');
    var lb = document.createElement('div');
    lb.textContent = 'YOUTUBE ORACLE';
    lb.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(255,100,100,0.6);margin-bottom:3px;';
    var ch = document.createElement('div');
    ch.textContent = '@AceSanyaBeats';
    ch.style.cssText = 'font-size:13px;font-weight:700;color:#E2E2EC;';
    ht.appendChild(lb); ht.appendChild(ch);
    var cb = document.createElement('button');
    cb.textContent = '\u00D7';
    cb.style.cssText = 'background:none;border:none;color:rgba(226,226,236,0.3);cursor:pointer;font-size:20px;line-height:1;padding:4px;';
    cb.onclick = function() { self._close(); };
    hdr.appendChild(ht); hdr.appendChild(cb);
    panel.appendChild(hdr);

    var body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:14px;';
    var note = document.createElement('div');
    note.textContent = '8 COMMANDS \u00B7 PRE-FILLED FOR YOUR CHANNEL';
    note.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.3);margin-bottom:12px;';
    body.appendChild(note);

    self.CMDS.forEach(function(cmd, i) {
      var btn = document.createElement('button');
      btn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;cursor:pointer;text-align:left;color:rgba(226,226,236,0.82);font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;margin-bottom:5px;';
      var ic = document.createElement('span');
      ic.textContent = self.ICONS[i] || '';
      ic.style.fontSize = '16px';
      var tx = document.createElement('span');
      tx.textContent = cmd[0];
      btn.appendChild(ic); btn.appendChild(tx);
      btn.onmouseover = function() { this.style.background = 'rgba(255,60,60,0.1)'; };
      btn.onmouseout  = function() { this.style.background = 'rgba(255,255,255,0.03)'; };
      btn.onclick = function() { self.run(i); };
      body.appendChild(btn);
    });
    panel.appendChild(body);
    document.body.appendChild(panel);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { panel.style.transform = 'translateX(0)'; });
    });
  },

  run: function(i) {
    var cmd = this.CMDS[i];
    if (!cmd) return;
    this._close();
    var input = document.getElementById('chat-input') || document.querySelector('textarea');
    if (input) {
      input.value = cmd[1];
      input.dispatchEvent(new Event('input', { bubbles: true }));
      var sb = document.getElementById('send-btn') || document.querySelector('[onclick*="sendChat"]');
      if (sb) { setTimeout(function() { sb.click(); }, 80); }
      else if (typeof sendChat === 'function') { setTimeout(sendChat, 80); }
    }
    RPGACE.utils.toast('\uD83C\uDFAC ' + cmd[0], 'rgba(255,120,120,0.9)', 2500);
  },

});
"""

src = src + clean_module

# Write to temp file and check that (avoids Windows command-line length limit)
tmp = Path("_yt_check.js")
tmp.write_text(src, encoding="utf-8", errors="replace")
result = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
tmp.unlink()

if result.returncode == 0:
    print("Syntax check: PASSED")
    f.write_text(src, encoding="utf-8", errors="replace")
    print("Written:", len(src), "chars")
    print("Run: git add rpgace_core.js && git commit -m \"Step 9: YouTube Oracle clean\" && git push && npx vercel --prod")
else:
    print("Syntax FAILED:", result.stderr[:300])
