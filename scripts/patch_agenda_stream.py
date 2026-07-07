src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

# Fix 1: Remove agenda auto-popup on load by intercepting generateAgendas
# Find where we can block the auto-call on rpgace:ready
old1 = """    // Run immediately on ready
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(reapplyIntelUI, 500);
    });"""

new1 = """    // Run immediately on ready
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(reapplyIntelUI, 500);
      // Block auto-agenda generation on load — user must click Generate
      if (typeof window.generateAgendas === 'function' && !window._agendaPatched) {
        window._agendaPatched = true;
        var _origGenerateAgendas = window.generateAgendas;
        var _agendaAutoBlocked = true;
        // Unblock after first manual click
        window.generateAgendas = function() {
          if (_agendaAutoBlocked) {
            _agendaAutoBlocked = false;
            return; // skip the auto-call on load
          }
          return _origGenerateAgendas.apply(this, arguments);
        };
        // Re-enable after 5 seconds so manual clicks work
        setTimeout(function() { _agendaAutoBlocked = false; }, 5000);
      }
    });"""

# Fix 2: Intercept sendChat to use streaming
old2 = """    // Intercept intel reload functions
    function patchIntelFns() {"""

new2 = """    // Intercept sendChat to use streaming Oracle
    setTimeout(function() {
      if (typeof window.sendChat === 'function' && !window._sendChatPatched) {
        window._sendChatPatched = true;
        var _origSendChat = window.sendChat;
        window.sendChat = function() {
          // Get current input
          var input = document.getElementById('chat-input') || document.querySelector('textarea[id*="chat"]');
          if (!input || !input.value.trim()) return _origSendChat.apply(this, arguments);

          var userText = input.value.trim();

          // Check if streaming is available (non-image message)
          var hasImage = false;
          try {
            var pendingImg = document.querySelector('[data-pending-image]');
            if (pendingImg) hasImage = true;
          } catch(e) {}

          if (hasImage || !RPGACE.streamOracle) {
            return _origSendChat.apply(this, arguments);
          }

          // Use streaming path
          var chatBox = document.getElementById('chat-msgs') || document.getElementById('chat-box');
          if (!chatBox) return _origSendChat.apply(this, arguments);

          // Add user message
          var userMsg = document.createElement('div');
          userMsg.className = 'msg user';
          userMsg.textContent = userText;
          chatBox.appendChild(userMsg);
          input.value = '';

          // Add streaming AI message
          var aiMsg = document.createElement('div');
          aiMsg.className = 'msg ai';
          aiMsg.innerHTML = '<span style="color:rgba(226,226,236,0.3);font-size:11px;">▸ thinking...</span>';
          chatBox.appendChild(aiMsg);
          chatBox.scrollTop = chatBox.scrollHeight;

          // Build messages array from existing chat
          var history = [];
          Array.from(chatBox.children).forEach(function(el) {
            var cls = el.className || '';
            var txt = el.textContent.trim();
            if (!txt || el === aiMsg) return;
            if (cls.includes('user')) history.push({ role: 'user', content: txt });
            else if (cls.includes('ai')) history.push({ role: 'assistant', content: txt });
          });
          // Add current user message
          history.push({ role: 'user', content: userText });

          var started = false;
          RPGACE.streamOracle(
            history,
            window._oracleSystem || '',
            function onChunk(chunk, full) {
              if (!started) {
                aiMsg.innerHTML = '';
                started = true;
              }
              aiMsg.textContent = full;
              chatBox.scrollTop = chatBox.scrollHeight;
            },
            function onDone(full) {
              if (typeof window.renderMarkdown === 'function') {
                try { aiMsg.innerHTML = window.renderMarkdown(full); } catch(e) { aiMsg.textContent = full; }
              }
              chatBox.scrollTop = chatBox.scrollHeight;
            }
          );
        };
        console.log('[RPGACE] sendChat patched to use streaming Oracle');
      }
    }, 2000);

    // Intercept intel reload functions
    function patchIntelFns() {"""

count = 0
if old1 in src:
    src = src.replace(old1, new1, 1); count += 1; print("Fix 1: agenda auto-popup blocked")
else:
    print("Fix 1 ERROR - trying alt anchor")
    if 'reapplyIntelUI, 500' in src:
        print("Found reapplyIntelUI, 500 - check surrounding context")

if old2 in src:
    src = src.replace(old2, new2, 1); count += 1; print("Fix 2: streaming sendChat intercept")
else:
    print("Fix 2 ERROR")

open('rpgace_core.js', 'w', encoding='utf-8').write(src)
print("Total:", count, "fixes")
