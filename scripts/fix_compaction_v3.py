import re

src = open('main.js', encoding='utf-8', errors='replace').read()
count = 0

# FIX 1: use row0.offsetTop as the actual base, don't assume overlay's top:0
# aligns with ts-0's top edge
old1 = """  const row0=document.getElementById('ts-0');
  const row1=document.getElementById('ts-1');
  const rowHeight=(row0&&row1)?(row1.getBoundingClientRect().top-row0.getBoundingClientRect().top):(row0?row0.getBoundingClientRect().height:44);"""

new1 = """  const row0=document.getElementById('ts-0');
  const row1=document.getElementById('ts-1');
  const rowHeight=(row0&&row1)?(row1.getBoundingClientRect().top-row0.getBoundingClientRect().top):(row0?row0.getBoundingClientRect().height:44);
  const baseOffset=row0?row0.offsetTop:0;"""

if old1 in src:
    src = src.replace(old1, new1, 1)
    count += 1
    print("Fix 1a: baseOffset captured from ts-0.offsetTop")
else:
    print("ERROR Fix 1a: anchor not found")

# Apply baseOffset to the block's top position
old1b = "const top=ev.startFrac*rowHeight;"
new1b = "const top=baseOffset+ev.startFrac*rowHeight;"
if old1b in src:
    src = src.replace(old1b, new1b, 1)
    count += 1
    print("Fix 1b: block top position now includes baseOffset")
else:
    print("ERROR Fix 1b: anchor not found")

# Apply baseOffset to the start-boundary marker's top position
old1c = """    const startFracPart=ev.startFrac%1;
    if(startFracPart>0.01){
      const marker=document.createElement('div');
      marker.style.cssText='position:absolute;left:0;right:0;top:'+top+'px;border-top:1px dashed rgba(61,170,110,0.5);pointer-events:none;';
      marker.innerHTML='<span style="position:absolute;left:2px;top:-8px;font-size:8px;color:rgba(61,170,110,0.7);font-family:Rajdhani,sans-serif;background:#0a0a12;padding:0 3px;">:'+String(Math.round(startFracPart*60)).padStart(2,'0')+'</span>';
      overlay.appendChild(marker);
    }
    const endFracPart=ev.endFrac%1;
    if(endFracPart>0.01){
      const endTop=ev.endFrac*rowHeight;
      const marker=document.createElement('div');
      marker.style.cssText='position:absolute;left:0;right:0;top:'+endTop+'px;border-top:1px dashed rgba(61,170,110,0.5);pointer-events:none;';
      marker.innerHTML='<span style="position:absolute;left:2px;top:2px;font-size:8px;color:rgba(61,170,110,0.7);font-family:Rajdhani,sans-serif;background:#0a0a12;padding:0 3px;">:'+String(Math.round(endFracPart*60)).padStart(2,'0')+'</span>';
      overlay.appendChild(marker);
    }"""

new1c = """    // Green boundary markers - subtle dashed line only, NO floating text label
    // (the block's own subtitle already shows exact times; a floating label here
    // was colliding visually with each row's hour number, corrupting the display)
    const startFracPart=ev.startFrac%1;
    if(startFracPart>0.01){
      const marker=document.createElement('div');
      marker.style.cssText='position:absolute;left:0;right:0;top:'+top+'px;border-top:1px dashed rgba(61,170,110,0.45);pointer-events:none;';
      overlay.appendChild(marker);
    }
    const endFracPart=ev.endFrac%1;
    if(endFracPart>0.01){
      const endTop=baseOffset+ev.endFrac*rowHeight;
      const marker=document.createElement('div');
      marker.style.cssText='position:absolute;left:0;right:0;top:'+endTop+'px;border-top:1px dashed rgba(61,170,110,0.45);pointer-events:none;';
      overlay.appendChild(marker);
    }"""

if old1c in src:
    src = src.replace(old1c, new1c, 1)
    count += 1
    print("Fix 2: removed colliding floating text labels from markers, kept only subtle dashed line, applied baseOffset to end marker too")
else:
    print("ERROR Fix 2: anchor not found - markers section")

open('main.js', 'w', encoding='utf-8').write(src)
print("\\nTotal applied:", count, "of 3")
