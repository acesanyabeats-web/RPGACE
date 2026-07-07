src = open('main.js', encoding='utf-8', errors='replace').read()

old = """function buildMonthSlots(){const el=document.getElementById('month-slots');if(!el)return;el.innerHTML='';const def=[['Plan content calendar','Set gym schedule','Define weekly budget'],['Review TikTok analytics','Meal prep check-in','Progress photo'],['Post YouTube video','Collab outreach','Review spending'],['Monthly review','Plan next month','Celebrate wins!']];for(let w=1;w<=4;w++){const col=document.createElement('div');col.className='week-col';col.innerHTML=`<h4>Week ${w}</h4>`;def[w-1].forEach(t=>{const item=document.createElement('div');item.className='month-task';item.innerHTML=`<span>${t}</span><span onclick="this.parentElement.classList.toggle('done')" style="cursor:pointer;color:var(--muted);font-size:12px">Ô£ô</span>`;col.appendChild(item);});const addBtn=document.createElement('button');addBtn.className='add-month-task';addBtn.textContent='+ Add goal';addBtn.onclick=function(){const txt=prompt('New goal for Week '+w+':');if(!txt)return;const item=document.createElement('div');item.className='month-task';item.innerHTML=`<span>${txt}</span><span onclick="this.parentElement.classList.toggle('done')" style="cursor:pointer;color:var(--muted);font-size:12px">Ô£ô</span>`;col.insertBefore(item,addBtn);};col.appendChild(addBtn);el.appendChild(col);}}"""

new = """// (dead duplicate buildMonthSlots removed here - old goal-tracker version, superseded by the real shift-calendar version later in this file)"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('main.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: dead duplicate buildMonthSlots (line 216 version) removed")
else:
    print("ERROR: exact anchor not found - trying to locate for manual inspection")
    idx = src.find("function buildMonthSlots(){const el=document.getElementById('month-slots')")
    print("Found at index:", idx)
