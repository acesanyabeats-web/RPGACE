src = open('main.js', encoding='utf-8', errors='replace').read()

old = "function _calGetSchedAgendas(){return JSON.parse(localStorage.getItem('rpgace_sched_agendas')||'[]');}"
new = "function _calGetSchedAgendas(){return JSON.parse(localStorage.getItem('rpgace_scheduled_agendas')||'[]');}"

if old in src:
    fixed = src.replace(old, new, 1)
    open('main.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: _calGetSchedAgendas now reads the correct key - Weekly/Monthly will finally show scheduled agendas")
else:
    print("ERROR: anchor not found")
