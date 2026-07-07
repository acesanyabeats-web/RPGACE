src = open('main.js', encoding='utf-8', errors='replace').read()

old = """function openSchedModal(agenda){
  initSchedModal();
  window._pendingSchedAgenda=agenda;
  const titleEl=document.getElementById('sched-modal-title');
  if(titleEl)titleEl.textContent=agenda.title||'Task';
  const dateEl=document.getElementById('sched-date');
  if(dateEl)dateEl.value=(typeof _calDateStr==='function'?_calDateStr(window._dailyDate||new Date()):new Date().toISOString().split('T')[0]);
  document.getElementById('sched-modal').style.display='flex';
}"""

new = """function openSchedModal(agenda){
  initSchedModal();
  window._pendingSchedAgenda=agenda;
  const titleEl=document.getElementById('sched-modal-title');
  if(titleEl)titleEl.textContent=agenda.title?'Editing: '+agenda.title:'New Task';
  const titleInput=document.getElementById('sched-title-input');
  if(titleInput)titleInput.value=agenda.title||'';
  const descInput=document.getElementById('sched-desc-input');
  if(descInput)descInput.value=agenda.description||'';
  const dateEl=document.getElementById('sched-date');
  if(dateEl)dateEl.value=(typeof _calDateStr==='function'?_calDateStr(window._dailyDate||new Date()):new Date().toISOString().split('T')[0]);
  document.getElementById('sched-modal').style.display='flex';
  setTimeout(function(){if(titleInput)titleInput.focus();},50);
}"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('main.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: openSchedModal now populates title/description inputs correctly")
else:
    print("ERROR: still not matching - unexpected")
