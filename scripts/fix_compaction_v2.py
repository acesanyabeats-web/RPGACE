src = open('main.js', encoding='utf-8', errors='replace').read()
count = 0

old1 = """  const sampleRow=document.getElementById('ts-0');
  const rowHeight=sampleRow?sampleRow.getBoundingClientRect().height:40;"""
new1 = """  const row0=document.getElementById('ts-0');
  const row1=document.getElementById('ts-1');
  const rowHeight=(row0&&row1)?(row1.getBoundingClientRect().top-row0.getBoundingClientRect().top):(row0?row0.getBoundingClientRect().height:44);"""

if old1 in src:
    src = src.replace(old1, new1, 1)
    count += 1
    print("Fix 1: rowHeight now uses top-to-top spacing (fixes drift)")
else:
    print("ERROR Fix 1: anchor not found")

old2 = "const height=Math.max((ev.endFrac-ev.startFrac)*rowHeight,rowHeight*0.4);"
new2 = "const height=Math.max((ev.endFrac-ev.startFrac)*rowHeight,22);"

if old2 in src:
    src = src.replace(old2, new2, 1)
    count += 1
    print("Fix 2: short-task minimum height changed from 40% of a row to fixed 22px floor")
else:
    print("ERROR Fix 2: anchor not found")

open('main.js', 'w', encoding='utf-8').write(src)
print("\\nApplied", count, "of 2 fixes")
