from pathlib import Path
import subprocess, re

f = Path("rpgace_core.js")
src = f.read_text(encoding="utf-8", errors="replace")
print("Size:", len(src))

# Replace the entire _btn function with the proven working pattern
# We know: anchor = [onclick*="toggleProdOraclePanel"], parent = .quick-row,
# insertBefore(b, anchor.nextSibling) works

new_btn = """  _btn: function() {
    if (document.getElementById('yt-ob')) return;
    var self = this;
    var tries = 0;
    var go = function() {
      tries++;
      if (document.getElementById('yt-ob')) return;
      var anchor = document.querySelector('[onclick*="toggleProdOraclePanel"]');
      if (!anchor) { if (tries < 20) setTimeout(go, 500); return; }
      var b = document.createElement('button');
      b.id = 'yt-ob';
      b.className = anchor.className;
      b.textContent = '\\uD83C\\uDFAC YouTube Oracle';
      b.onclick = function() { self.open(); };
      anchor.parentElement.insertBefore(b, anchor.nextSibling);
    };
    setTimeout(go, 600);
    setTimeout(go, 1500);
    setTimeout(go, 3000);
  },"""

# Find _btn function wherever it is
m = re.search(r'  _btn: function\(\) \{[\s\S]*?\n  \},', src)
if m:
    src = src[:m.start()] + new_btn + src[m.end():]
    print("Replaced _btn function")
else:
    print("ERROR: _btn not found")

tmp = Path("_btnfix.js")
tmp.write_text(src, encoding="utf-8", errors="replace")
r = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
tmp.unlink()

if r.returncode == 0:
    print("Syntax: PASSED")
    f.write_text(src, encoding="utf-8", errors="replace")
    print("Written:", len(src))
    print("NOW RUN: git add rpgace_core.js && git commit -m \"Fix: yt btn proven selector\" && git push && npx vercel --prod")
else:
    print("Syntax FAILED:", r.stderr[:300])
