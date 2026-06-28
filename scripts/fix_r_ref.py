from pathlib import Path
import subprocess

f = Path("rpgace_core.js")
src = f.read_text(encoding="utf-8", errors="replace")

# Find where the IIFE ends and our appended code begins
# Our appended code starts with the gap-fill utility comment
marker = "/* ================================================================\n   GAP-FILL UTILITY"
if marker in src:
    idx = src.index(marker)
    before = src[:idx]
    after = src[idx:]
    # In the appended section, replace R.utils -> RPGACE.utils, R.modules -> RPGACE.modules
    after = after.replace('R.utils.fillGaps', 'RPGACE.utils.fillGaps')
    after = after.replace('R.utils.sendToOracle', 'RPGACE.utils.sendToOracle')
    after = after.replace('R.utils.toast', 'RPGACE.utils.toast')
    after = after.replace('R.modules', 'RPGACE.modules')
    after = after.replace('R.hooks', 'RPGACE.hooks')
    src = before + after
    print("Fixed: R.utils/R.modules -> RPGACE.utils/RPGACE.modules in appended section")
    
    # Count replacements
    print("  RPGACE.utils.fillGaps:", src.count('RPGACE.utils.fillGaps'))
    print("  RPGACE.utils.sendToOracle:", src.count('RPGACE.utils.sendToOracle'))
else:
    print("ERROR: marker not found")

tmp = Path("_rref.js")
tmp.write_text(src, encoding="utf-8", errors="replace")
r = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
tmp.unlink()

if r.returncode == 0:
    print("Syntax: PASSED")
    f.write_text(src, encoding="utf-8", errors="replace")
    print("Written:", len(src))
    print("Run: git add rpgace_core.js && git commit -m \"Fix: R-ref outside IIFE\" && git push && npx vercel --prod")
else:
    print("Syntax FAILED:", r.stderr[:300])
