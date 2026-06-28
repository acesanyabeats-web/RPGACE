lines = open('rpgace_core.js', encoding='utf-8', errors='replace').readlines()
for i, l in enumerate(lines):
    if '_injectDelete' in l or 'injectDel' in l or 'DEL button' in l.lower() or 'del btn' in l.lower():
        print(i+1, repr(l))
