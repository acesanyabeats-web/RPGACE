src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

bad = "document.getElementByRPGACE.register('feynman'Id('chat-box')"
good = "document.getElementById('chat-box')"

if bad in src:
    fixed = src.replace(bad, good, 1)
    open('rpgace_core.js', 'w', encoding='utf-8').write(fixed)
    print("FIXED: corrupted line repaired.")
else:
    print("ERROR: corrupted string not found. Check manually.")
