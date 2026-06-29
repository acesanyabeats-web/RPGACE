src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """  _getOracleMessages: function(limit) {
    var chatBox = document.getElementById('chat-msgs') || document.getElementById('chat-box') || document.querySelector('[id*="chat"]');
    if (!chatBox) return [];
    var children = Array.from(chatBox.children);
    var results = [];
    for (var i = children.length - 1; i >= 0 && results.length < (limit || 8); i--) {
      var el = children[i];
      var cls = el.className || '';
      var txt = el.textContent.trim();
      if (txt.length < 40) continue;
      if (cls.includes('assistant') || cls.includes('oracle') || cls.includes('response') ||
          el.querySelector('[class*="assistant"]') || el.querySelector('[class*="oracle"]')) {
        results.unshift({ text: txt, preview: txt.slice(0, 80) + '...' });
      }
    }
    return results;
  },"""

new = """  _getOracleMessages: function(limit) {
    var chatBox = document.getElementById('chat-msgs') || document.getElementById('chat-box') || document.querySelector('[id*="chat"]');
    if (!chatBox) return [];
    var children = Array.from(chatBox.children);
    var results = [];
    for (var i = children.length - 1; i >= 0 && results.length < (limit || 8); i--) {
      var el = children[i];
      var cls = el.className || '';
      var txt = el.textContent.trim();
      if (txt.length < 40) continue;
      // Support: 'msg ai', 'assistant', 'oracle', 'response', 'bot'
      if (cls.includes('ai') || cls.includes('assistant') || cls.includes('oracle') ||
          cls.includes('response') || cls.includes('bot') ||
          el.querySelector('[class*="assistant"]') || el.querySelector('[class*="ai"]')) {
        results.unshift({ text: txt, preview: txt.slice(0, 80) + '...' });
      }
    }
    return results;
  },"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: Oracle message detection uses msg ai class")
else:
    print("ERROR: anchor not found")
