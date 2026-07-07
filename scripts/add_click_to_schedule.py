src = open('main.js', encoding='utf-8', errors='replace').read()

old = """    if(row.type==='free'){
      div.style.cssText='padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:12px;min-height:36px;';
      div.innerHTML='<span style="font-family:Rajdhani,sans-serif;font-size:11px;color:rgba(226,226,236,0.35);min-width:110px;">'+rangeLabel+'</span>'
        +'<input class="time-input" placeholder="Add task..." style="flex:1;background:none;border:none;color:rgba(226,226,236,0.5);font-family:Rajdhani,sans-serif;font-size:12px;outline:none;"/>';
    } else {"""

new = """    if(row.type==='free'){
      div.style.cssText='padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:12px;min-height:36px;cursor:pointer;';
      div.innerHTML='<span style="font-family:Rajdhani,sans-serif;font-size:11px;color:rgba(226,226,236,0.35);min-width:110px;">'+rangeLabel+'</span>'
        +'<span style="flex:1;color:rgba(226,226,236,0.3);font-family:Rajdhani,sans-serif;font-size:12px;">+ Add task</span>';
      const rowStartFrac=row.startFrac;
      div.onclick=function(){
        if(typeof openSchedModal!=='function')return;
        openSchedModal({title:'',category:'personal',xp:50,description:''});
        setTimeout(function(){
          const dateEl=document.getElementById('sched-date');
          if(dateEl)dateEl.value=dateStr;
          const hourEl=document.getElementById('sched-hour');
          if(hourEl)hourEl.value=Math.floor(rowStartFrac);
          const minEl=document.getElementById('sched-minute');
          if(minEl)minEl.value=Math.round((rowStartFrac%1)*60);
          const titleEl=document.getElementById('sched-modal-title');
          if(titleEl)titleEl.textContent='New Task';
        },30);
      };
    } else {"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('main.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: free rows now clickable - opens Schedule modal pre-filled with that row's date/time")
else:
    print("ERROR: anchor not found")
