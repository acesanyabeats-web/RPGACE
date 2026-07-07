src = open('main.js', encoding='utf-8', errors='replace').read()

old = """  const fh=events.length?Math.floor(events[0].startFrac):9;
  const fs=document.getElementById('ts-'+fh);
  if(fs)setTimeout(function(){fs.scrollIntoView({behavior:'smooth',block:'center'});},100);
  setTimeout(_addSchedButtons,300);
}"""

new = """  const fh=events.length?Math.floor(events[0].startFrac):9;
  const fs=document.getElementById('ts-'+fh);
  if(fs)setTimeout(function(){fs.scrollIntoView({behavior:'smooth',block:'center'});},100);
  // NOTE: _addSchedButtons() intentionally NOT called here - this rewrite already
  // adds Start/Done buttons inline (see the events.filter(...agenda...) block above).
  // Calling both caused duplicate button rows on every agenda block.
}"""

if old in src:
    fixed = src.replace(old, new, 1)
    open('main.js', 'w', encoding='utf-8').write(fixed)
    print("PATCHED: removed redundant _addSchedButtons() call - fixes duplicate Start/Done buttons")
else:
    print("ERROR: anchor not found")
