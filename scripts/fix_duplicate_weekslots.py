src = open('main.js', encoding='utf-8', errors='replace').read()

old = "function buildWeekSlots(){const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];const el=document.getElementById('week-slots');if(!el)return;el.innerHTML='';days.forEach(d=>{const col=document.createElement('div');col.className='day-col';col.innerHTML=`<div class=\"day-name\">${d}</div><textarea class=\"day-input\" placeholder=\"Goals & tasks...\"></textarea>`;el.appendChild(col);});}"

new = "// (dead duplicate buildWeekSlots removed - old goal-tracker version, superseded by the real shift-calendar version later in this file)"

if old in src:
    fixed = src.replace(old, new, 1)
    open('main.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: dead duplicate buildWeekSlots removed successfully")
else:
    print("ERROR: still not matching")
