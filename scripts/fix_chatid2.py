src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

# Fix in contentProductionLive _endSession
old = """    var chatBox = document.getElementById('chat-box');
    var sessionText = chatBox ? chatBox.innerText.slice(-3000) : '';"""

new = """    var chatBox = document.getElementById('chat-msgs') || document.getElementById('chat-box') || document.querySelector('[id*="chat"]');
    var sessionText = chatBox ? chatBox.innerText.slice(-3000) : '';"""

# Fix in contentProductionLive _injectOracleBar
old2 = """    var chatBox = document.getElementById('chat-box');
    if (!chatBox) return;

    var bar = document.createElement('div');
    bar.id = 'cpl-oracle-bar';"""

new2 = """    var chatBox = document.getElementById('chat-msgs') || document.getElementById('chat-box') || document.querySelector('[id*="chat"]');
    if (!chatBox) return;

    var bar = document.createElement('div');
    bar.id = 'cpl-oracle-bar';"""

count = 0
if old in src:
    src = src.replace(old, new, 1)
    count += 1
if old2 in src:
    src = src.replace(old2, new2, 1)
    count += 1

open('rpgace_core.js', 'w', encoding='utf-8').write(src)
print("PATCHED:", count, "chat-box references fixed")
