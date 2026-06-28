from pathlib import Path
import subprocess, re

f = Path("rpgace_core.js")
src = f.read_text(encoding="utf-8", errors="replace")
print("Size:", len(src))

# Strategy: add injection directly into the foundation onReady callback
# so it runs at page load, guaranteed, no module system dependency.
# We know the exact working code from the console test.

inject_code = """
  /* ── YouTube Oracle button injection (direct, no module dependency) ── */
  setTimeout(function() {
    var _ytBtnInject = function() {
      if (document.getElementById('yt-ob')) return;
      var anchor = document.querySelector('[onclick*="toggleProdOraclePanel"]');
      if (!anchor) return;
      var b = document.createElement('button');
      b.id = 'yt-ob';
      b.className = anchor.className;
      b.textContent = '\\uD83C\\uDFAC YouTube Oracle';
      b.style.marginLeft = '4px';
      b.onclick = function() {
        if (R.modules && R.modules.youtubeOracle) R.modules.youtubeOracle.open();
      };
      anchor.parentElement.insertBefore(b, anchor.nextSibling);
      console.log('[RPGACE:youtubeOracle] Button injected');
    };
    _ytBtnInject();
    setTimeout(_ytBtnInject, 800);
    setTimeout(_ytBtnInject, 2000);
  }, 400);"""

# Find the rpgace:ready fire line and inject after it
target = "R.hooks.fire('rpgace:ready');"
if target in src:
    src = src.replace(target, target + inject_code, 1)
    print("Injected button code after rpgace:ready fire")
else:
    # Try alternate quote style
    target2 = 'R.hooks.fire("rpgace:ready");'
    if target2 in src:
        src = src.replace(target2, target2 + inject_code, 1)
        print("Injected button code after rpgace:ready fire (double quotes)")
    else:
        # Find the onReady callback and inject near end
        m = re.search(r"R\.hooks\.fire\(['\"]rpgace:ready['\"]\)", src)
        if m:
            src = src[:m.end()] + inject_code + src[m.end():]
            print("Injected via regex")
        else:
            print("ERROR: rpgace:ready fire not found")

tmp = Path("_btnorder.js")
tmp.write_text(src, encoding="utf-8", errors="replace")
r = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
tmp.unlink()

if r.returncode == 0:
    print("Syntax: PASSED")
    f.write_text(src, encoding="utf-8", errors="replace")
    print("Written:", len(src))
    print("Run: git add rpgace_core.js && git commit -m \"Fix: yt btn direct injection\" && git push && npx vercel --prod")
else:
    print("Syntax FAILED:", r.stderr[:300])
