#!/usr/bin/env python3
"""CK-6 (Oct 28 2026, plan "Caps and Central Kit"): flag NEW private copies of helpers RPGACE.kit owns.

RPGACE.kit (rpgace_core.js, module `kit`, doc docs/claude/kit.md) holds one copy of: esc, iso/today/addDays/fmt,
readPrivate, btn, armConfirm, pickList. Old private copies are switched over when their module is next touched.
This counts the private copies still in the file and fails only if a count went UP versus BASELINE (a new copy).
When you switch a module over, lower its number here in the same commit.

  python3 scripts/check_kit_copies.py
"""
import os, re, sys
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
import core_source  # CK-8: the one reader of the client source

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATTERNS = {
    'esc':         r"^\s+_?esc(?:Html)?\s*:\s*function",
    'btn':         r"^\s+_btn\s*:\s*function\(label(?:, kind)?\)\s*\{\s*$",
    'iso':         r"^\s+_?iso\s*:\s*function\(d\)",
    'addDays':     r"^\s+_?addDays\s*:\s*function",
    'arm':         r"^\s+_arm\s*:\s*function\(btn",
    'readPrivate': r"action:\s*'read'",
}
# Private copies left on Oct 28 2026 after CK-6 switched myDay/doingNow/tripPlans/healthBody/GM-7 over.
BASELINE = {'esc': 15, 'btn': 4, 'iso': 10, 'addDays': 5, 'arm': 1, 'readPrivate': 0}


def counts():
    src = core_source.read()
    kit = re.search(r'/\* ===MODULE:kit=== \*/.*?/\* ===END:kit=== \*/', src, re.S)
    if kit:
        src = src[:kit.start()] + src[kit.end():]
    return {k: len(re.findall(p, src, re.M)) for k, p in PATTERNS.items()}


def main():
    c = counts()
    worse = {k: (c[k], BASELINE.get(k, 0)) for k in c if c[k] > BASELINE.get(k, 0)}
    for k in PATTERNS:
        print('%-12s %3d private copies (baseline %d)%s' % (k, c[k], BASELINE.get(k, 0), '  <- NEW COPY: use RPGACE.kit.' + k if k in worse else ''))
    print('FAIL: new private copies - use RPGACE.kit instead (docs/claude/kit.md)' if worse else 'PASS')
    return 1 if worse else 0


if __name__ == '__main__':
    sys.exit(main())
