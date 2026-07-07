src = open('main.js', encoding='utf-8', errors='replace').read()

old = """function confirmSchedule(idx){
  const a=AGENDA_LIST[idx];if(!a)return;
  const timeEl=document.getElementById(`sched-time-${idx}`);
  const time=timeEl?timeEl.value:'19:00';
  const blocks=JSON.parse(localStorage.getItem('rpgace_scheduled_agendas')||'[]');
  blocks.push({title:a.title,category:a.category,duration_mins:a.duration_mins,time,date:new Date().toLocaleDateString(),xp:a.xp||50});
  localStorage.setItem('rpgace_scheduled_agendas',JSON.stringify(blocks));
  AGENDA_LIST[idx].status='scheduled';
  AGENDA_LIST[idx].scheduled_time=time;
  localStorage.setItem(AGENDA_CACHE_KEY,JSON.stringify(AGENDA_LIST));
  renderAgendas();
}"""

new = """function confirmSchedule(idx){
  const a=AGENDA_LIST[idx];if(!a)return;
  const timeEl=document.getElementById(`sched-time-${idx}`);
  const time=timeEl?timeEl.value:'19:00';
  const hour=parseInt((time||'19:00').split(':')[0])||19;
  const dateStr=(typeof _calDateStr==='function'?_calDateStr(new Date()):new Date().toISOString().split('T')[0]);
  // Converged onto the same key/shape as confirmScheduleModal (rpgace_sched_agendas)
  // so both scheduling entry points render identically on Weekly/Monthly/Daily.
  const stored=JSON.parse(localStorage.getItem('rpgace_sched_agendas')||'[]');
  stored.push({id:'sa_'+Date.now(),date:dateStr,hour,title:a.title||'Task',description:a.description||'',category:a.category||'personal',xp:a.xp||50,estimated_mins:a.duration_mins||60,actual_mins:null,completed:false,started_at:null,ended_at:null,created_at:new Date().toISOString()});
  localStorage.setItem('rpgace_sched_agendas',JSON.stringify(stored));
  AGENDA_LIST[idx].status='scheduled';
  AGENDA_LIST[idx].scheduled_time=time;
  localStorage.setItem(AGENDA_CACHE_KEY,JSON.stringify(AGENDA_LIST));
  renderAgendas();
}"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('main.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: confirmSchedule converged onto rpgace_sched_agendas, correct date format, matching shape")
else:
    print("ERROR: anchor not found")
