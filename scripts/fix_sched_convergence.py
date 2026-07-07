src = open('main.js', encoding='utf-8', errors='replace').read()
count = 0

# FIX A: revert _calGetSchedAgendas to read the RICHER system (rpgace_sched_agendas),
# since that's the one confirmScheduleModal/renderDailyGrid actually use and develop
old_a = "function _calGetSchedAgendas(){return JSON.parse(localStorage.getItem('rpgace_scheduled_agendas')||'[]');}"
new_a = "function _calGetSchedAgendas(){return JSON.parse(localStorage.getItem('rpgace_sched_agendas')||'[]');}"
if old_a in src:
    src = src.replace(old_a, new_a, 1)
    count += 1
    print("Fix A: _calGetSchedAgendas reverted to read rpgace_sched_agendas (the richer, actively-used system)")
else:
    print("ERROR Fix A: anchor not found")

# FIX B: openSchedModal default date - use local-safe date instead of toISOString
old_b = """  const dateEl=document.getElementById('sched-date');\n  if(dateEl)dateEl.value=new Date().toISOString().split('T')[0];"""
new_b = """  const dateEl=document.getElementById('sched-date');\n  if(dateEl)dateEl.value=(typeof _calDateStr==='function'?_calDateStr(window._dailyDate||new Date()):new Date().toISOString().split('T')[0]);"""
if old_b in src:
    src = src.replace(old_b, new_b, 1)
    count += 1
    print("Fix B: openSchedModal now defaults to the currently-viewed daily date (local-safe), not UTC 'today'")
else:
    print("ERROR Fix B: anchor not found")

# FIX C: initSchedModal default date - same fix
old_c = "modal.querySelector('#sched-date').value=new Date().toISOString().split('T')[0];"
new_c = "modal.querySelector('#sched-date').value=(typeof _calDateStr==='function'?_calDateStr(new Date()):new Date().toISOString().split('T')[0]);"
if old_c in src:
    src = src.replace(old_c, new_c, 1)
    count += 1
    print("Fix C: initSchedModal date default fixed")
else:
    print("ERROR Fix C: anchor not found")

# FIX D: renderDailyGrid dateStr/todayStr - the recurring toISOString bug
old_d = """  const dateStr=d.toISOString().split('T')[0];\n  const todayStr=new Date().toISOString().split('T')[0];"""
new_d = """  const dateStr=(typeof _calDateStr==='function'?_calDateStr(d):d.toISOString().split('T')[0]);\n  const todayStr=(typeof _calDateStr==='function'?_calDateStr(new Date()):new Date().toISOString().split('T')[0]);"""
if old_d in src:
    src = src.replace(old_d, new_d, 1)
    count += 1
    print("Fix D: renderDailyGrid dateStr/todayStr now local-safe - this was causing the Wednesday shift")
else:
    print("ERROR Fix D: anchor not found")

# FIX E: renderDailyGrid's sched filter reads 'rpgace_sched_agendas' directly - already correct,
# matches confirmScheduleModal's write target. No change needed, confirming for the record.
if "JSON.parse(localStorage.getItem('rpgace_sched_agendas')||'[]').filter(a=>a.date===dateStr)" in src:
    print("Confirmed: renderDailyGrid's sched-agenda read already targets rpgace_sched_agendas correctly")

open('main.js', 'w', encoding='utf-8').write(src)
print("\\nTotal fixes applied:", count, "of 4")
