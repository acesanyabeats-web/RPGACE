src = open('main.js', encoding='utf-8', errors='replace').read()

old = """        const d = new Date(s.date);
        const dayStr = d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});"""

new = """        const d = new Date(s.date+'T00:00:00');
        const dayStr = d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('main.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: renderShiftBlocks date parsing fixed - added T00:00:00 to force local midnight")
else:
    print("ERROR: anchor not found")
    idx = src.find("const d = new Date(s.date)")
    print("Found similar at index:", idx)
    if idx > 0:
        print(repr(src[idx:idx+150]))
