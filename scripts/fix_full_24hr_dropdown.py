src = open('main.js', encoding='utf-8', errors='replace').read()

old = "const hours=Array.from({length:18},function(_,i){const h=i+6;const label=h<12?h+':00 AM':h===12?'12:00 PM':(h-12)+':00 PM';return '<option value=\"'+h+'\">'+label+'</option>';}).join('');"

new = "const hours=Array.from({length:24},function(_,i){const h=i;const label=h===0?'12:00 AM':h<12?h+':00 AM':h===12?'12:00 PM':(h-12)+':00 PM';return '<option value=\"'+h+'\">'+label+'</option>';}).join('');"

if old in src:
    fixed = src.replace(old, new, 1)
    open('main.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: hour dropdown now covers all 24 hours (00:00-23:00), was missing 6 early-morning hours")
else:
    print("ERROR: anchor not found")
