/* ===MODULE:visualOracle=== */
RPGACE.register('visualOracle', {

  CMDS: [
    ['Director Match', 'I am making a beat with the following characteristics: GENRE: [UK DRILL / UK HIP HOP / TRAP / AFROBEATS — choose one] MOOD: [DARK / EUPHORIC / MELANCHOLIC / AGGRESSIVE / CINEMATIC — choose one] KEY: [TYPE THE KEY AND SCALE, e.g. D Minor, F# Dorian] BPM: [TYPE THE BPM] REFERENCE ARTISTS: [NAME 1-3 ARTISTS THIS BEAT SOUNDS LIKE]. From the Phylum XXV filmmaker library, match me 3 directors whose visual signature fits this beat. For each director: their signature visual style in 3 words, the camera movement that defines them, their colour palette, why this beat fits their aesthetic, and an 80-word Neural Frames prompt I can use immediately.'],
    ['Visual Treatment Doc', 'Generate a full Visual Treatment Document for my beat. BEAT TITLE: [TYPE BEAT TITLE] GENRE: [TYPE GENRE] MOOD: [TYPE MOOD] KEY + SCALE: [TYPE KEY AND SCALE] BPM: [TYPE BPM] DIRECTOR REFERENCE: [TYPE A FILMMAKER NAME OR VISUAL STYLE]. The document must include: Concept statement (2 sentences), Visual world description (colour palette, lighting, texture), Camera direction (movement vocabulary, shot types, rhythm), Talent/subject direction if any, Scene breakdown (4 scenes with duration), Neural Frames Autopilot prompt (120 words), and export format recommendations for YouTube, Reels, and Beatstars.'],
    ['Copyright Risk Analyser', 'Analyse the copyright risk of my planned music video concept. CONCEPT: [DESCRIBE YOUR VIDEO CONCEPT IN DETAIL] VISUAL REFERENCES: [LIST ANY FILMS, MUSIC VIDEOS, OR DIRECTORS YOU PLAN TO REFERENCE] FOOTAGE SOURCES: [LIST WHERE YOU PLAN TO SOURCE FOOTAGE — stock, self-shot, archival, AI-generated]. For each element: copyright risk level (Low / Medium / High), what specifically creates the risk, how to modify the concept to eliminate or reduce the risk, and safe alternative approaches. End with an overall risk score and a clear/proceed/modify verdict.'],
    ['Mood Board Brief', 'Create a detailed mood board brief for my beat visual. BEAT DESCRIPTION: [DESCRIBE YOUR BEAT — genre, mood, key, BPM, feel] TARGET PLATFORM: [YOUTUBE / INSTAGRAM / BEATSTARS / ALL]. The brief must specify: 5 colour hex codes with usage ratios, 3 texture references (describe the material/surface quality), lighting direction (quality, direction, colour temperature), typography direction if text appears, 5 specific shot types with descriptions, 3 real-world location types that fit, and 3 visual DONTs for this concept. Format this so I can hand it directly to a designer or use it in Canva.'],
    ['Storyboard Scene Builder', 'Build a shot-by-shot storyboard for my music video. SONG SECTION: [INTRO / VERSE / CHORUS / BRIDGE / OUTRO — choose one, or ALL] DURATION: [TYPE THE SECTION LENGTH IN SECONDS] VISUAL STYLE: [TYPE YOUR VISUAL DIRECTION — e.g. dark cinematic UK drill, lo-fi nostalgic, futuristic minimal] LOCATION: [TYPE YOUR PLANNED LOCATION OR WRITE "studio" / "street" / "AI-generated"]. For each shot: shot number, shot type (close-up / medium / wide / extreme close-up), camera movement, subject action, duration in seconds, lighting note, and cut type to next shot. End with a total shot count and pacing assessment.'],
    ['Neural Frames Prompt', 'Generate 3 Neural Frames AI video prompts for my beat. BEAT FEEL: [DESCRIBE IN 5 WORDS] COLOUR DIRECTION: [TYPE 2-3 COLOURS OR A PALETTE NAME] SUBJECT: [TYPE WHAT SHOULD APPEAR — abstract, character, landscape, object] AVOID: [TYPE ANYTHING YOU DO NOT WANT — faces, text, specific styles]. For each prompt: a 100-word Neural Frames Autopilot prompt optimised for beat-sync, the recommended motion intensity setting (Low / Medium / High / Extreme), the recommended style preset if applicable, and what this prompt will generate visually. Label them Option A (safest), Option B (most striking), Option C (most experimental).'],
  ],

  ICONS: ['🎬','📄','⚠️','🎨','🎞️','🤖'],

  init: function() {
    var self = this;
    setTimeout(function() { self._inject(); }, 1400);
    RPGACE.hooks.on('rpgace:ready', function() { setTimeout(function() { self._inject(); }, 1400); });
    RPGACE.hooks.on('page:show', function(name) {
      if (name === RPGACE.CONFIG.pages.oracle) setTimeout(function() { self._inject(); }, 600);
    });
  },

  _inject: function() {
    if (document.getElementById('visual-oracle-btn')) return;
    var row = document.querySelector('.quick-row');
    if (!row) return;
    var btn = document.createElement('button');
    btn.id = 'visual-oracle-btn';
    btn.className = 'agent-btn';
    btn.textContent = '🎬 Visual Oracle';
    btn.style.cssText = 'border-color:rgba(155,89,182,0.4);color:#9B59B6;background:rgba(155,89,182,0.08);margin-left:4px;';
    btn.onclick = function() { RPGACE.modules.visualOracle.open(); };
    row.appendChild(btn);
    console.log('[RPGACE:visualOracle] Button injected');
  },

  _close: function() {
    var p = document.getElementById('visual-op');
    if (p) { p.style.transform = 'translateX(100%)'; setTimeout(function(){p.remove();},280); }
  },

  open: function() {
    if (document.getElementById('visual-op')) { this._close(); return; }
    var self = this;
    var panel = document.createElement('div');
    panel.id = 'visual-op';
    panel.style.cssText = 'position:fixed;top:0;right:0;width:min(400px,100vw);height:100vh;background:#0c0c16;border-left:1px solid rgba(155,89,182,0.15);z-index:9998;display:flex;flex-direction:column;box-shadow:-16px 0 48px rgba(0,0,0,0.5);font-family:Rajdhani,sans-serif;transform:translateX(100%);transition:transform .28s ease;';

    var hdr = document.createElement('div');
    hdr.style.cssText = 'background:rgba(155,89,182,0.06);border-bottom:1px solid rgba(155,89,182,0.12);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    var ht = document.createElement('div');
    var lb = document.createElement('div');
    lb.textContent = 'VISUAL ORACLE';
    lb.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(155,89,182,0.65);margin-bottom:3px;';
    var sub = document.createElement('div');
    sub.textContent = 'Phylum XXV · Filmmaker Library · 6 Commands';
    sub.style.cssText = 'font-size:12px;font-weight:700;color:#E2E2EC;';
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
    note.textContent = '6 COMMANDS · FILMMAKER LIBRARY · NEURAL FRAMES READY';
    note.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.3);margin-bottom:12px;';
    body.appendChild(note);

    var phNote = document.createElement('div');
    phNote.textContent = 'Phylum XXV — Visio Cinematica';
    phNote.style.cssText = 'font-size:10px;color:rgba(155,89,182,0.6);margin-bottom:14px;letter-spacing:1px;border-left:2px solid rgba(155,89,182,0.3);padding-left:8px;';
    body.appendChild(phNote);

    self.CMDS.forEach(function(cmd, i) {
      var btn = document.createElement('button');
      btn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:6px;cursor:pointer;text-align:left;color:rgba(226,226,236,0.82);font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;margin-bottom:5px;';
      var ic = document.createElement('span'); ic.textContent = self.ICONS[i] || '🎬'; ic.style.fontSize = '15px';
      var tx = document.createElement('span'); tx.textContent = cmd[0];
      btn.appendChild(ic); btn.appendChild(tx);
      btn.onmouseover = function() { this.style.background = 'rgba(155,89,182,0.08)'; };
      btn.onmouseout  = function() { this.style.background = 'rgba(255,255,255,0.03)'; };
      btn.onclick = function() {
        self._close();
        RPGACE.utils.fillGaps(cmd[1], function(filled) {
          var input = document.querySelector('#chat-input');
          if (!input) return;
          input.value = filled;
          input.dispatchEvent(new Event('input', {bubbles:true}));
          if (typeof sendChat === 'function') sendChat();
        });
      };
      body.appendChild(btn);
    });

    panel.appendChild(body);
    document.body.appendChild(panel);
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { panel.style.transform = 'translateX(0)'; });
    });
  },

});
/* ===END:visualOracle=== */
