src = open('rpgace_core.js', encoding='utf-8', errors='replace').read()

old = """    return ideas.slice(0, 20); // max 20 per response"""
new = """    return ideas.slice(0, 50); // max 50 per response"""

old2 = """    var list = document.createElement('div');
    list.id = 'cp-idea-bank-list';
    list.style.cssText = 'max-height:320px;overflow-y:auto;';"""
new2 = """    var list = document.createElement('div');
    list.id = 'cp-idea-bank-list';
    list.style.cssText = 'max-height:400px;overflow-y:auto;';"""

# Make idea select popup taller and scrollable
old3 = """    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:24px 28px;width:min(560px,95vw);max-height:85vh;overflow-y:auto;';"""
new3 = """    box.style.cssText = 'background:#0f0f1a;border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:24px 28px;width:min(600px,95vw);max-height:90vh;overflow-y:auto;';"""

count = 0
if old in src:
    src = src.replace(old, new, 1); count += 1; print("Fix 1: limit raised to 50")
else:
    print("Fix 1 ERROR")
if old2 in src:
    src = src.replace(old2, new2, 1); count += 1; print("Fix 2: idea bank taller")
else:
    print("Fix 2 ERROR")
if old3 in src:
    src = src.replace(old3, new3, 1); count += 1; print("Fix 3: popup wider/taller")
else:
    print("Fix 3 ERROR")

open('rpgace_core.js', 'w', encoding='utf-8').write(src)
print("Total:", count)
