from pathlib import Path
import subprocess, re

f = Path("rpgace_core.js")
src = f.read_text(encoding="utf-8", errors="replace")
print("File size:", len(src))

# ── FIX 1: Bridge getter uses R.STATE._store or R.STATE._s (internal)
# Replace the whole bridgeGlobal block with one that uses STATE property accessors

old_bridge_patterns = [
    # Old style: function(globalName, stateKey) with internal _store
    r"function bridgeGlobal\(globalName, stateKey\) \{[\s\S]*?\}[\s\S]*?bridgeGlobal\('_pendingSchedAgenda',\s*'pendingSched'\);",
    # Other variations
    r"function bridgeGlobal\(globalName, stateKey\) \{[\s\S]*?\}\s*bridgeGlobal\('_dailyDate'[\s\S]*?bridgeGlobal\('_pendingSchedAgenda'[^\n]*\n",
]

new_bridge = """  function bridgeGlobal(name, getter, setter) {
    try {
      Object.defineProperty(global, name, {
        get: getter, set: setter, configurable: true, enumerable: true,
      });
    } catch (e) {}
  }
  bridgeGlobal('_dailyDate',
    function() { var v = R.STATE && R.STATE.dailyDate; return (v instanceof Date) ? v : new Date(); },
    function(v) { if (R.STATE) R.STATE.dailyDate = v; });
  bridgeGlobal('_calWeekStart',
    function() { var v = R.STATE && R.STATE.weekStart; return (v instanceof Date) ? v : (function(){ var d=new Date(); d.setDate(d.getDate()-((d.getDay()+6)%7)); d.setHours(0,0,0,0); return d; })(); },
    function(v) { if (R.STATE) R.STATE.weekStart = v; });
  bridgeGlobal('_calMonthDate',
    function() { var v = R.STATE && R.STATE.monthDate; return (v instanceof Date) ? v : new Date(); },
    function(v) { if (R.STATE) R.STATE.monthDate = v; });
  bridgeGlobal('_pendingSchedAgenda',
    function() { return R.STATE && R.STATE.pendingSched; },
    function(v) { if (R.STATE) R.STATE.pendingSched = v; });"""

replaced = False
for pat in old_bridge_patterns:
    m = re.search(pat, src)
    if m:
        src = src[:m.start()] + new_bridge + src[m.end():]
        print("FIX 1: Bridge replaced via pattern match")
        replaced = True
        break

if not replaced:
    # Fallback: find the old function bridgeGlobal line and replace to end of bridge calls
    if "function bridgeGlobal" in src:
        start = src.index("function bridgeGlobal")
        # Find the end of the last bridgeGlobal call
        # Look for bridgeGlobal('_pendingSchedAgenda' or bridgeGlobal('_calMonthDate'
        for end_marker in ["bridgeGlobal('_pendingSchedAgenda'", "bridgeGlobal(\"_pendingSchedAgenda\""]:
            if end_marker in src:
                end_pos = src.index(end_marker)
                # Find end of that line
                line_end = src.index('\n', end_pos) + 1
                old_section = src[start:line_end]
                src = src.replace(old_section, new_bridge + "\n")
                print("FIX 1: Bridge replaced via fallback")
                replaced = True
                break

if not replaced:
    print("FIX 1: WARNING - could not find bridge to replace. Adding safety net only.")
    safety = """  try{if(!window._calWeekStart||!(window._calWeekStart instanceof Date)){var _d=new Date();_d.setDate(_d.getDate()-((_d.getDay()+6)%7));_d.setHours(0,0,0,0);window._calWeekStart=_d;}}catch(e){}
  try{if(!window._calMonthDate||!(window._calMonthDate instanceof Date))window._calMonthDate=new Date();}catch(e){}
  try{if(!window._dailyDate||!(window._dailyDate instanceof Date))window._dailyDate=new Date();}catch(e){}
"""
    if "onReady(function" in src and safety not in src:
        src = src.replace("onReady(function", safety + "  onReady(function", 1)

# ── FIX 2: YouTube Oracle button - also fire on rpgace:ready (covers initial load)
old_init = """  init: function() {
    var self = this;
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'oracle') setTimeout(function() { self._btn(); }, 600);
    });
  },"""

new_init = """  init: function() {
    var self = this;
    RPGACE.hooks.on('page:show', function(name) {
      if (name === 'oracle') setTimeout(function() { self._btn(); }, 600);
    });
    RPGACE.hooks.on('rpgace:ready', function() {
      setTimeout(function() { self._btn(); }, 800);
    });
  },"""

if old_init in src:
    src = src.replace(old_init, new_init, 1)
    print("FIX 2: YouTube Oracle button fires on rpgace:ready too")
else:
    print("FIX 2: init pattern not found (may already be patched)")

# ── Syntax check
tmp = Path("_bridge_check.js")
tmp.write_text(src, encoding="utf-8", errors="replace")
result = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
tmp.unlink()

if result.returncode == 0:
    print("Syntax check: PASSED")
    f.write_text(src, encoding="utf-8", errors="replace")
    print("Written:", len(src), "chars")
    print("Run: git add rpgace_core.js && git commit -m \"Fix: bridge STATE accessors + yt btn on load\" && git push && npx vercel --prod")
else:
    print("Syntax FAILED:", result.stderr[:400])
