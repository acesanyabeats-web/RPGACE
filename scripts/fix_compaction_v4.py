src = open('main.js', encoding='utf-8', errors='replace').read()

old = "const height=Math.max((ev.endFrac-ev.startFrac)*rowHeight,22);"
new = "const minH=ev.type==='agenda'?58:24;\n    const height=Math.max((ev.endFrac-ev.startFrac)*rowHeight,minH);"

if old in src:
    fixed = src.replace(old, new, 1)
else:
    print("ERROR: height anchor not found")
    fixed = None

if fixed:
    old2 = "font-family:Rajdhani,sans-serif;pointer-events:auto;overflow:hidden;'"
    new2 = "font-family:Rajdhani,sans-serif;pointer-events:auto;overflow:visible;'"
    if old2 in fixed:
        fixed = fixed.replace(old2, new2, 1)
        open('main.js', 'w', encoding='utf-8').write(fixed)
        print("PATCHED: agenda blocks get 58px minimum (room for title+subtitle+buttons), shifts get 24px, overflow no longer clips content")
    else:
        print("ERROR: overflow anchor not found")
