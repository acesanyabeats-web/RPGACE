src = open('main.js', encoding='utf-8', errors='replace').read()

old = "function _calDateStr(d){return d.toISOString().split('T')[0];}"

new = "function _calDateStr(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}"

if old in src:
    fixed = src.replace(old, new, 1)
    open('main.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: _calDateStr now uses local date components instead of toISOString (UTC) - fixes the real one-day-off bug")
else:
    print("ERROR: anchor not found")
