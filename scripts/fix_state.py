from pathlib import Path
import subprocess, re

f = Path("rpgace_core.js")
src = f.read_text(encoding="utf-8", errors="replace")
print("File size:", len(src))

# Find the entire R.STATE = { ... }; block and replace it with a
# closure-based version where _s is captured in a local variable,
# avoiding all 'this._s' issues completely.

# Pattern: find R.STATE = { ... }; where ... spans multiple lines
state_pattern = re.compile(
    r'R\.STATE\s*=\s*\{[\s\S]*?\n  \};',
    re.MULTILINE
)

m = state_pattern.search(src)
if not m:
    # Try alternative ending
    state_pattern2 = re.compile(r'R\.STATE\s*=\s*\{[\s\S]*?pendingSched[^\}]*\};', re.MULTILINE)
    m = state_pattern2.search(src)

if m:
    old_state = m.group(0)
    print("Found STATE block, chars:", len(old_state))
    
    new_state = """R.STATE = (function () {
    var _s = {};
    return {
      get: function (key) { return _s[key]; },
      set: function (key, value) {
        _s[key] = value;
        R.hooks.fire('state:change', key, value);
        return value;
      },
      get dailyDate()    { return _s.dailyDate  || new Date(); },
      set dailyDate(d)   { _s.dailyDate  = d;  R.hooks.fire('state:change', 'dailyDate', d); },
      get weekStart()    { var d = _s.weekStart; if (d) return d; var n=new Date(); n.setDate(n.getDate()-((n.getDay()+6)%7)); n.setHours(0,0,0,0); return n; },
      set weekStart(d)   { _s.weekStart  = d;  R.hooks.fire('state:change', 'weekStart', d); },
      get monthDate()    { return _s.monthDate  || new Date(); },
      set monthDate(d)   { _s.monthDate  = d;  R.hooks.fire('state:change', 'monthDate', d); },
      get pendingSched()    { return _s.pendingSched; },
      set pendingSched(v)   { _s.pendingSched = v; },
    };
  }())"""
    
    src = src.replace(old_state, new_state)
    print("STATE replaced with closure version (no this._s)")
else:
    print("WARNING: R.STATE block not found by pattern, trying line-by-line...")
    lines = src.split('\n')
    state_start = None
    for i, line in enumerate(lines):
        if 'R.STATE = {' in line or 'R.STATE={' in line:
            state_start = i
            break
    if state_start is not None:
        # Find the closing }; by brace counting
        depth = 0
        state_end = None
        for i in range(state_start, len(lines)):
            depth += lines[i].count('{') - lines[i].count('}')
            if depth <= 0 and i > state_start:
                state_end = i
                break
        if state_end:
            print(f"Found STATE at lines {state_start}-{state_end}")
            old_section = '\n'.join(lines[state_start:state_end+1])
            new_state_inline = """R.STATE = (function () {
    var _s = {};
    return {
      get: function (key) { return _s[key]; },
      set: function (key, value) { _s[key] = value; R.hooks.fire('state:change', key, value); return value; },
      get dailyDate()  { return _s.dailyDate || new Date(); },
      set dailyDate(d) { _s.dailyDate = d; R.hooks.fire('state:change', 'dailyDate', d); },
      get weekStart()  { var d = _s.weekStart; if (d) return d; var n=new Date(); n.setDate(n.getDate()-((n.getDay()+6)%7)); n.setHours(0,0,0,0); return n; },
      set weekStart(d) { _s.weekStart = d; R.hooks.fire('state:change', 'weekStart', d); },
      get monthDate()  { return _s.monthDate || new Date(); },
      set monthDate(d) { _s.monthDate = d; R.hooks.fire('state:change', 'monthDate', d); },
      get pendingSched()  { return _s.pendingSched; },
      set pendingSched(v) { _s.pendingSched = v; },
    };
  }())"""
            src = src.replace(old_section, new_state_inline)
            print("STATE replaced via line-by-line method")
        else:
            print("ERROR: Could not find end of STATE block")

# Syntax check
tmp = Path("_state_check.js")
tmp.write_text(src, encoding="utf-8", errors="replace")
result = subprocess.run(['node', '--check', str(tmp)], capture_output=True, text=True)
tmp.unlink()

if result.returncode == 0:
    print("Syntax check: PASSED")
    f.write_text(src, encoding="utf-8", errors="replace")
    print("Written:", len(src), "chars")
    print("Run: git add rpgace_core.js && git commit -m \"Fix: STATE closure no this._s\" && git push && npx vercel --prod")
else:
    print("Syntax FAILED:", result.stderr[:400])
