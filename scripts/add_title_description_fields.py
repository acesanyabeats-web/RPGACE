src = open('main.js', encoding='utf-8', errors='replace').read()
count = 0

# Add title + description input fields to the modal markup, right after the title display div
old1 = """+'<div id=\"sched-modal-title\" style=\"font-family:Rajdhani,sans-serif;font-size:16px;font-weight:700;color:#E2E2EC;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.07)\"></div>'
    +'<div style=\"display:grid;gap:14px\">'"""

new1 = """+'<div id=\"sched-modal-title\" style=\"font-family:Rajdhani,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;color:rgba(226,226,236,0.4);margin-bottom:16px;text-transform:uppercase;\"></div>'
    +'<div style=\"display:grid;gap:14px\">'
    +'<div><div style=\"font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.4);text-transform:uppercase;margin-bottom:6px\">Title</div><input type=\"text\" id=\"sched-title-input\" placeholder=\"What are you doing?\" style=\"width:100%;background:#141420;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;padding:8px 12px;font-family:Rajdhani,sans-serif;font-size:13px;outline:none;box-sizing:border-box;\"/></div>'
    +'<div><div style=\"font-family:Rajdhani,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(226,226,236,0.4);text-transform:uppercase;margin-bottom:6px\">Description (optional)</div><textarea id=\"sched-desc-input\" rows=\"2\" placeholder=\"Any notes...\" style=\"width:100%;background:#141420;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#E2E2EC;padding:8px 12px;font-family:Rajdhani,sans-serif;font-size:13px;outline:none;resize:vertical;box-sizing:border-box;\"></textarea></div>'"""

if old1 in src:
    src = src.replace(old1, new1, 1)
    count += 1
    print("1. Title + description inputs added to modal markup")
else:
    print("ERROR 1: modal markup anchor not found")

# Update openSchedModal to populate the new fields (and clear them for a fresh task)
old2 = """function openSchedModal(agenda){
  initSchedModal();
  window._pendingSchedAgenda=agenda;
  const titleEl=document.getElementById('sched-modal-title');
  if(titleEl)titleEl.textContent=agenda.title||'Task';
  const dateEl=document.getElementById('sched-date');
  if(dateEl)dateEl.value=new Date().toISOString().split('T')[0];
  document.getElementById('sched-modal').style.display='flex';
}"""

new2 = """function openSchedModal(agenda){
  initSchedModal();
  window._pendingSchedAgenda=agenda;
  const titleEl=document.getElementById('sched-modal-title');
  if(titleEl)titleEl.textContent=agenda.title?'Editing: '+agenda.title:'New Task';
  const titleInput=document.getElementById('sched-title-input');
  if(titleInput)titleInput.value=agenda.title||'';
  const descInput=document.getElementById('sched-desc-input');
  if(descInput)descInput.value=agenda.description||'';
  const dateEl=document.getElementById('sched-date');
  if(dateEl)dateEl.value=(typeof _calDateStr==='function'?_calDateStr(new Date()):new Date().toISOString().split('T')[0]);
  document.getElementById('sched-modal').style.display='flex';
  setTimeout(function(){if(titleInput)titleInput.focus();},50);
}"""

if old2 in src:
    src = src.replace(old2, new2, 1)
    count += 1
    print("2. openSchedModal now populates/clears title+description fields")
else:
    print("ERROR 2: openSchedModal anchor not found")

# Update confirmScheduleModal to read the typed title/description instead of the passed-in agenda object
old3 = """function confirmScheduleModal(){
  const agenda=window._pendingSchedAgenda;if(!agenda)return;
  const date=document.getElementById('sched-date').value;
  const hour=parseInt(document.getElementById('sched-hour').value)||10;
  const minuteEl=document.getElementById('sched-minute');
  const minute=minuteEl?parseInt(minuteEl.value)||0:0;
  const estMins=parseInt(document.getElementById('sched-duration').value)||60;
  if(!date){alert('Please choose a date.');return;}
  const entry=scheduleToCalendar({title:agenda.title,description:agenda.description,category:agenda.category,xp:agenda.xp,duration_mins:estMins,hour,minute,date,source_type:'agenda'});"""

new3 = """function confirmScheduleModal(){
  const agenda=window._pendingSchedAgenda;if(!agenda)return;
  const date=document.getElementById('sched-date').value;
  const hour=parseInt(document.getElementById('sched-hour').value)||10;
  const minuteEl=document.getElementById('sched-minute');
  const minute=minuteEl?parseInt(minuteEl.value)||0:0;
  const estMins=parseInt(document.getElementById('sched-duration').value)||60;
  const titleInput=document.getElementById('sched-title-input');
  const descInput=document.getElementById('sched-desc-input');
  const typedTitle=titleInput?titleInput.value.trim():'';
  const typedDesc=descInput?descInput.value.trim():'';
  if(!date){alert('Please choose a date.');return;}
  if(!typedTitle){alert('Please enter a title.');return;}
  const entry=scheduleToCalendar({title:typedTitle,description:typedDesc||agenda.description,category:agenda.category,xp:agenda.xp,duration_mins:estMins,hour,minute,date,source_type:'agenda'});"""

if old3 in src:
    src = src.replace(old3, new3, 1)
    count += 1
    print("3. confirmScheduleModal now reads typed title/description, requires a title")
else:
    print("ERROR 3: confirmScheduleModal anchor not found")

open('main.js', 'w', encoding='utf-8').write(src)
print("\\nApplied", count, "of 3")
