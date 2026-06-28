from pathlib import Path
import subprocess

f = Path("rpgace_core.js")
src = f.read_text(encoding="utf-8", errors="replace")
print("Size:", len(src))

# Fix the page:show name + also inject on load since cards already in DOM
old = """    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'research') setTimeout(function() { self._inject(); }, 500);
    });
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._inject(); }, 700);
      var obs = new MutationObserver(function(muts) {
        if (muts.some(function(m){ return m.addedNodes.length > 0; }))
          setTimeout(function() { self._inject(); }, 200);
      });
      obs.observe(document.body, { childList: true, subtree: true });
    });"""

new = """    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'learning') setTimeout(function() { self._inject(); }, 500);
    });
    RPGACE.hooks.on('rpgace:ready', function() {
      /* Inject immediately + on DOM changes */
      setTimeout(function() { self._inject(); }, 600);
      setTimeout(function() { self._inject(); }, 1500);
      setTimeout(function() { self._inject(); }, 3000);
      var obs = new MutationObserver(function(muts) {
        if (muts.some(function(m){ return m.addedNodes.length > 0; }))
          setTimeout(function() { self._inject(); }, 150);
      });
      obs.observe(document.body, { childList: true, subtree: true });
    });"""

if old in src:
    src = src.replace(old, new)
    print("Fixed: page:show 'research' -> 'learning', added 3x injection on load")
else:
    print("Pattern not found — trying direct replace")
    src = src.replace("if (name === 'research')", "if (name === 'learning')")
    print("Did simple replace")

tmp = Path("_lt.js")
tmp.write_text(src, encoding="utf-8", errors="replace")
r = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
tmp.unlink()

if r.returncode == 0:
    print("Syntax: PASSED")
    f.write_text(src, encoding="utf-8", errors="replace")
    print("Written:", len(src))
else:
    print("Syntax FAILED:", r.stderr[:200])
