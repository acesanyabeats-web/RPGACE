#!/usr/bin/env python3
"""AR-1 (Nov 5 2026): find buttons that silently do nothing when their box is empty.
A handler that reads an input and returns on empty without telling Alex breaks the fail-loud rule (CLAUDE.md
building guide 7). The fix is RPGACE.kit.needs(btn, input, msg). This lists every remaining site and fails when
the count goes above BASELINE, so new silent buttons can't be added. Usage: python3 scripts/check_silent_empty.py [-v]"""
import re, subprocess, sys
BASELINE = 1  # cookingOracle ingredient-suggest paint() matches the pattern but is not a button
src = subprocess.run([sys.executable, 'scripts/core_source.py', 'cat'], capture_output=True, text=True).stdout
if not src:
    import glob
    src = '\n'.join(open(f).read() for f in sorted(glob.glob('src/**/*.js', recursive=True)))
pat = re.compile(r"\.value(?:\.trim\(\))?;?\s*(?:\)\s*)?;?\s*if \(!\s*[a-zA-Z_]\w*\s*\)\s*(?:\{\s*[a-zA-Z_]\w*\.focus\(\);\s*)?return;")
lines = src.split('\n')
# A handler whose button got kit.needs() in the 8 lines above is guarded (the empty tap never reaches it).
hits = [(i + 1, l.strip()[:140]) for i, l in enumerate(lines) if pat.search(l) and 'toast' not in l and not any('needs(' in x for x in lines[max(0, i - 8):i + 1])]
if '-v' in sys.argv:
    for n, l in hits: print(n, l)
print('silent empty-input handlers:', len(hits), '(baseline', BASELINE, ')')
sys.exit(1 if len(hits) > BASELINE else 0)
