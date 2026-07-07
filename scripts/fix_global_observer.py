src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """    RPGACE.utils.sendToOracle = function(text) {
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
    };"""

new = """    RPGACE.utils.sendToOracle = function(text) {
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

    // ── Global phyla-scan observer — attached ONCE at init, independent of  ──
    // ── sendToOracle. Catches direct typing (sendChat/sendChatWithImage)   ──
    // ── AND panel-injected prompts, since both flip #send-btn's disabled   ──
    // ── attribute through the same underlying sendChat() call.            ──
    RPGACE.utils._initPhylaObserver = function() {
      if (RPGACE.utils._phylaObserverActive) return;
      var sendBtn = document.querySelector('#send-btn');
      if (!sendBtn) { setTimeout(RPGACE.utils._initPhylaObserver, 1000); return; }
      RPGACE.utils._phylaObserverActive = true;
      var obs = new MutationObserver(function(muts) {
        muts.forEach(function(m) {
          if (m.attributeName === 'disabled' && !sendBtn.disabled) {
            setTimeout(function() { RPGACE.utils._runPhylaScan(); }, 50);
          }
        });
      });
      obs.observe(sendBtn, { attributes: true });
      console.log('[RPGACE] Global phyla-scan observer attached to #send-btn');
    };"""

if old in src:
    fixed = src.replace(old, new, 1)
else:
    print("ERROR: sendToOracle anchor not found")
    fixed = None

if fixed:
    # Also add a call to init the observer on rpgace:ready
    old2 = """    console.log('[RPGACE:config] Cache + streaming Oracle ready');"""
    new2 = """    console.log('[RPGACE:config] Cache + streaming Oracle ready');

    // Attach global phyla-scan observer once DOM is ready
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { RPGACE.utils._initPhylaObserver(); }, 1000);
    });"""
    if old2 in fixed:
        fixed = fixed.replace(old2, new2, 1)
        open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
        print("PATCHED: global observer attached independently, fires on ALL sendChat paths")
    else:
        print("Fix 1 applied, but Fix 2 (init hook) anchor not found - observer defined but never called")
        open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
