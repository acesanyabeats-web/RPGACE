src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

# Fix 1: Block agenda auto-popup — intercept generateAgendas after config loads
old1 = """    // Also intercept intel reload functions
    function patchIntelFns() {"""

new1 = """    // Block agenda auto-generation on load — user must click Generate
    setTimeout(function() {
      if (typeof window.generateAgendas === 'function' && !window._agendaAutoBlocked) {
        window._agendaAutoBlocked = true;
        var _orig = window.generateAgendas;
        var _blocked = true;
        window.generateAgendas = function() {
          if (_blocked) { _blocked = false; return; } // skip the first auto-call
          return _orig.apply(this, arguments);
        };
        setTimeout(function() { _blocked = false; }, 4000);
      }
    }, 1500);

    // Streaming sendChat intercept
    setTimeout(function() {
      if (typeof window.sendChat === 'function' && !window._sendChatPatched) {
        window._sendChatPatched = true;
        var _origSend = window.sendChat;
        window.sendChat = function() {
          var input = document.getElementById('chat-input') || document.querySelector('textarea[id*="chat"]');
          if (!input || !input.value.trim() || !RPGACE.streamOracle) {
            return _origSend.apply(this, arguments);
          }
          var userText = input.value.trim();
          var chatBox = document.getElementById('chat-msgs') || document.getElementById('chat-box');
          if (!chatBox) return _origSend.apply(this, arguments);

          // Add user message to UI
          var userMsg = document.createElement('div');
          userMsg.className = 'msg user';
          userMsg.textContent = userText;
          chatBox.appendChild(userMsg);
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));

          // Add streaming AI placeholder
          var aiMsg = document.createElement('div');
          aiMsg.className = 'msg ai';
          aiMsg.innerHTML = '<span style="color:rgba(226,226,236,0.3);font-size:11px;">thinking...</span>';
          chatBox.appendChild(aiMsg);
          chatBox.scrollTop = chatBox.scrollHeight;

          // Build conversation history from DOM
          var history = [];
          Array.from(chatBox.children).forEach(function(el) {
            if (el === aiMsg) return;
            var cls = el.className || '';
            var txt = el.textContent.trim();
            if (!txt) return;
            if (cls.includes('user')) history.push({ role: 'user', content: txt });
            else if (cls.includes('ai')) history.push({ role: 'assistant', content: txt });
          });
          history.push({ role: 'user', content: userText });

          var started = false;
          RPGACE.streamOracle(
            history,
            window._rpgaceSystem || '',
            function(chunk, full) {
              if (!started) { aiMsg.innerHTML = ''; started = true; }
              aiMsg.textContent = full;
              chatBox.scrollTop = chatBox.scrollHeight;
            },
            function(full) {
              if (typeof window.renderMarkdown === 'function') {
                try { aiMsg.innerHTML = window.renderMarkdown(full); } catch(e) { aiMsg.textContent = full; }
              }
              chatBox.scrollTop = chatBox.scrollHeight;
            }
          );
        };
        console.log('[RPGACE] sendChat streaming intercept active');
      }
    }, 2500);

    // Also intercept intel reload functions
    function patchIntelFns() {"""

if old1 in src:
    fixed = src.replace(old1, new1, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: agenda auto-blocked + streaming sendChat intercept")
else:
    print("ERROR: anchor not found")
    print("Searching for nearby text...")
    idx = src.find('Also intercept intel')
    print("Found at:", idx)
    if idx > 0:
        print(repr(src[idx-30:idx+60]))
