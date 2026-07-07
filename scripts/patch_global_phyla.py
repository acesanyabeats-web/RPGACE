src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """    RPGACE.utils.sendToOracle = function(text) {
      var input = document.querySelector('#chat-input');
      if (!input) return;
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof sendChat === 'function') {
        sendChat();
      } else {
        var btn = document.querySelector('#send-btn') || document.querySelector('button[onclick*="sendChat"]');
        if (btn) btn.click();
      }
    };"""

new = """    RPGACE.utils.sendToOracle = function(text) {
      var input = document.querySelector('#chat-input');
      if (!input) return;
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Watch send-btn for disabled->enabled flip = response complete
      var sendBtn = document.querySelector('#send-btn');
      if (sendBtn && RPGACE.utils._runPhylaScan) {
        var obs = new MutationObserver(function(muts) {
          muts.forEach(function(m) {
            if (m.attributeName === 'disabled' && !sendBtn.disabled) {
              obs.disconnect();
              setTimeout(function() { RPGACE.utils._runPhylaScan(); }, 50);
            }
          });
        });
        obs.observe(sendBtn, { attributes: true });
        // Safety: disconnect after 30s regardless
        setTimeout(function() { obs.disconnect(); }, 30000);
      }

      if (typeof sendChat === 'function') {
        sendChat();
      } else {
        var btn = document.querySelector('#send-btn') || document.querySelector('button[onclick*="sendChat"]');
        if (btn) btn.click();
      }
    };

    // ── Layer 1: cheap local keyword scan, always runs ──────────────
    RPGACE.utils._PHYLA_KEYWORDS = [
      { num: 1,  name: 'Compositio',           keywords: ['melody','chord','scale','harmony','progression','notes','key'] },
      { num: 2,  name: 'Percussio',             keywords: ['drum','kick','snare','808','hi-hat','groove','pattern','percussion'] },
      { num: 3,  name: 'Sonus Designatio',      keywords: ['sound design','synth','sample','patch','oscillator','wavetable','texture'] },
      { num: 4,  name: 'Mixtura',               keywords: ['mix','eq','compress','sidechain','reverb','delay','level','gain','frequency'] },
      { num: 5,  name: 'Magistra',              keywords: ['master','lufs','limiter','loud','stem','final'] },
      { num: 6,  name: 'Instrumentarium',       keywords: ['fl studio','vst','plugin','daw','workflow','edison','mixer','channel','playlist','piano roll'] },
      { num: 7,  name: 'Sensus Auris',          keywords: ['listen','reference','ear','compare','a/b','monitor','speaker'] },
      { num: 8,  name: 'Anatomia',              keywords: ['theory','interval','mode','minor','major','scale','degree','chord','tension'] },
      { num: 9,  name: 'Historia',              keywords: ['producer','artist','era','influence','style','sound like','inspired'] },
      { num: 10, name: 'Psychologia',           keywords: ['creative','block','inspiration','flow','mindset','habit','routine'] },
      { num: 12, name: 'Fons Educationis',      keywords: ['tutorial','learn','teach','explain','breakdown','guide','lesson'] },
      { num: 13, name: 'Contentum',             keywords: ['youtube','instagram','reels','hook','thumbnail','title','content','video','tiktok','caption'] },
      { num: 14, name: 'Visio Cinematica',      keywords: ['visual','cinematic','camera','colour','grade','filmmaker','neural frames','mood board'] },
      { num: 16, name: 'Venditionis Beatorum',  keywords: ['sell','beat store','beatstars','license','lease','exclusive','price'] },
    ];

    RPGACE.utils._quickPhylaScan = function(text) {
      var t = (text || '').toLowerCase();
      var matches = [];
      RPGACE.utils._PHYLA_KEYWORDS.forEach(function(p) {
        var hits = p.keywords.filter(function(k) { return t.includes(k); }).length;
        if (hits >= 1) matches.push({ num: p.num, name: p.name, hits: hits });
      });
      matches.sort(function(a, b) { return b.hits - a.hits; });
      return matches;
    };

    // ── Layer 2: confidence gate + Layer 3: badge injection ──────────
    RPGACE.utils._runPhylaScan = function() {
      var chatBox = document.getElementById('chat-msgs') || document.getElementById('chat-box');
      if (!chatBox) return;
      var aiMsgs = chatBox.querySelectorAll('.msg.ai');
      if (aiMsgs.length === 0) return;
      var lastMsg = aiMsgs[aiMsgs.length - 1];
      if (lastMsg.dataset.phylaScanned) return;
      lastMsg.dataset.phylaScanned = '1';

      var text = lastMsg.textContent || '';
      if (text.length < 60) return; // too short to matter

      var matches = RPGACE.utils._quickPhylaScan(text);
      var gapConcepts = matches.length > 0 ? 1 : 0; // placeholder signal, refined on click

      // Confidence gate: only show if 2+ phyla matched
      if (matches.length < 2) return;

      var badge = document.createElement('button');
      badge.textContent = '🌿 ' + matches.length + ' topics';
      badge.style.cssText = 'margin-top:6px;padding:3px 10px;background:rgba(61,170,110,0.08);border:1px solid rgba(61,170,110,0.2);border-radius:12px;color:#3DAA6E;font-size:10px;font-weight:700;cursor:pointer;font-family:Rajdhani,sans-serif;';
      badge.onclick = function() {
        if (document.getElementById('phyla-badge-detail-' + lastMsg.dataset.phylaScanned + '-open')) {
          var existing = badge.nextElementSibling;
          if (existing && existing.classList.contains('phyla-detail-panel')) { existing.remove(); return; }
        }
        RPGACE.utils._expandPhylaDetail(badge, matches, text);
      };
      lastMsg.appendChild(badge);
    };

    // Layer 3 continued: expensive gap-score pull, only on click
    RPGACE.utils._expandPhylaDetail = function(badge, matches, text) {
      var panel = document.createElement('div');
      panel.className = 'phyla-detail-panel';
      panel.style.cssText = 'margin-top:8px;padding:10px 12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:11px;';
      panel.innerHTML = '<div style="color:rgba(226,226,236,0.3);">Loading gap scores...</div>';
      badge.insertAdjacentElement('afterend', panel);

      RPGACE.sb.select('taxonomy_nodes', 'order=gap_score.desc&limit=100')
        .then(function(nodes) {
          nodes = nodes || [];
          panel.innerHTML = '';
          matches.slice(0, 5).forEach(function(m) {
            var relevantGaps = nodes.filter(function(n) { return n.phylum_number === m.num && n.gap_score >= 5; });
            var row = document.createElement('div');
            row.style.cssText = 'margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.04);';
            var isGap = relevantGaps.length > 0;
            row.innerHTML = '<span style="color:' + (isGap ? '#E25454' : '#3DAA6E') + ';font-weight:700;">' +
              (isGap ? '🔴 ' : '✅ ') + 'Phylum ' + m.num + ' — ' + m.name + '</span>' +
              (isGap ? '<div style="color:rgba(226,226,236,0.4);margin-top:2px;">Gap: ' + relevantGaps[0].concept + ' (' + parseFloat(relevantGaps[0].gap_score).toFixed(1) + '/10)</div>' : '');
            panel.appendChild(row);
          });
        }).catch(function() {
          panel.innerHTML = '<div style="color:#E25454;">Could not load gap scores</div>';
        });
    };"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: global taxonomy detection - 3-layer stack added to sendToOracle")
else:
    print("ERROR: anchor not found")
