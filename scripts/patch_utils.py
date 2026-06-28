src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = "console.log('[RPGACE:config] CONFIG + RPGACE.sb ready');"

new = """console.log('[RPGACE:config] CONFIG + RPGACE.sb ready');

    // Utility: send text to Oracle chat input and fire sendChat
    RPGACE.utils.sendToOracle = function(text) {
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
    };

    // Utility: detect [PLACEHOLDER] in prompt, show step-by-step fill overlay
    RPGACE.utils.fillGaps = function(prompt, onComplete) {
      var regex = /\\[([^\\]]+)\\]/g;
      var gaps = [];
      var match;
      while ((match = regex.exec(prompt)) !== null) {
        gaps.push({ placeholder: match[0], label: match[1] });
      }
      if (gaps.length === 0) { onComplete(prompt); return; }

      var idx = 0;
      var filled = prompt;

      var overlay = document.createElement('div');
      overlay.id = 'rpgace-gap-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(8,8,16,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:Rajdhani,sans-serif;';

      var box = document.createElement('div');
      box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:28px 32px;width:min(480px,90vw);';

      var eyebrow = document.createElement('div');
      eyebrow.style.cssText = 'font-size:9px;font-weight:700;letter-spacing:3px;color:rgba(201,168,76,0.6);margin-bottom:12px;text-transform:uppercase;';
      eyebrow.textContent = 'FILL IN THE DETAILS';

      var counter = document.createElement('div');
      counter.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.3);margin-bottom:8px;';

      var label = document.createElement('div');
      label.style.cssText = 'font-size:15px;font-weight:700;color:#E2E2EC;margin-bottom:14px;line-height:1.4;';

      var inp = document.createElement('textarea');
      inp.style.cssText = 'width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;font-size:13px;font-family:Rajdhani,sans-serif;padding:10px 12px;resize:vertical;min-height:70px;outline:none;';
      inp.placeholder = 'Type your answer here...';

      var hint = document.createElement('div');
      hint.style.cssText = 'font-size:10px;color:rgba(226,226,236,0.25);margin-top:6px;margin-bottom:16px;';
      hint.textContent = 'Ctrl+Enter to continue';

      var btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;';

      var cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(226,226,236,0.4);border-radius:6px;padding:8px 16px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;';
      cancelBtn.onclick = function() { overlay.remove(); };

      var nextBtn = document.createElement('button');
      nextBtn.style.cssText = 'background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.3);color:var(--gold,#C9A84C);border-radius:6px;padding:8px 20px;cursor:pointer;font-family:Rajdhani,sans-serif;font-size:12px;font-weight:700;';

      function showGap(i) {
        var g = gaps[i];
        counter.textContent = 'Step ' + (i+1) + ' of ' + gaps.length;
        label.textContent = g.label;
        inp.value = '';
        nextBtn.textContent = (i === gaps.length - 1) ? 'Send to Oracle' : 'Next →';
        setTimeout(function(){ inp.focus(); }, 50);
      }

      function advance() {
        var val = inp.value.trim();
        if (!val) { inp.focus(); return; }
        filled = filled.replace(gaps[idx].placeholder, val);
        idx++;
        if (idx >= gaps.length) {
          overlay.remove();
          onComplete(filled);
        } else {
          showGap(idx);
        }
      }

      nextBtn.onclick = advance;
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); advance(); }
      });

      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(nextBtn);
      box.appendChild(eyebrow);
      box.appendChild(counter);
      box.appendChild(label);
      box.appendChild(inp);
      box.appendChild(hint);
      box.appendChild(btnRow);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      showGap(0);
    };"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: fillGaps and sendToOracle added to RPGACE.utils in config module")
else:
    print("ERROR: anchor string not found. Check rpgace_core.js manually.")
