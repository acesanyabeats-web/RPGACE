src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """  // ── Get last N Oracle messages for dropdown ──────────────────
  _getOracleMessages: function(limit) {
    var chatBox = document.getElementById('chat-box');
    if (!chatBox) return [];"""

new = """  // ── Get last N Oracle messages for dropdown ──────────────────
  _getOracleMessages: function(limit) {
    var chatBox = document.getElementById('chat-msgs') || document.getElementById('chat-box') || document.querySelector('[id*="chat"]');
    if (!chatBox) return [];"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: chat box ID fixed to chat-msgs")
else:
    print("ERROR: anchor not found")
