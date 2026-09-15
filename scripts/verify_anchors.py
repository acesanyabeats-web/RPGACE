#!/usr/bin/env python3
"""
verify_anchors.py — Sep 15 2026, real wiring-sweep follow-up (CEO SKILL.md
R28). Cheap, mechanical, no-AI-cost check: re-verifies every real
'anchor'/'lines' citation across the 3 decision-point generator scripts
(galaxy_map_decision_matrix.py's LOGIC_POINTS/TEXT_INPUT_POINTS,
galaxy_map_decisions.py's DECISION_POINTS, galaxy_map_current.py's NOTABLE
dict) against the LIVE rpgace_core.js, without actually running the
generators or touching any output file.

Real reason this exists rather than just re-running the generators: the
generators already fail loud on a stale anchor (by design, confirmed
working) -- but that only catches drift the moment someone chooses to
run them. This script is the cheap, standing companion that can run on
ANY session start, the same "cached grep" discipline as the Galaxy Map
headline-facts check, so staleness gets caught within a session of it
happening instead of accumulating for a week+ (18 real anchors were
found stale this way, Sep 15 2026, all last verified Sep 8).

Deliberately regex-based, not an AST import of the actual generator
modules -- those modules have real side-effecting top-level code
(argument parsing, file reads) that isn't safe to trigger from a pure
verification pass. Extracting 'anchor'/'lines' pairs via regex is the
same approach the anchor-fix pass itself used, proven correct this
session.
"""
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CORE_JS = REPO_ROOT / 'rpgace_core.js'

ANCHOR_FILES = [
    'galaxy_map_decision_matrix.py',
    'galaxy_map_decisions.py',
    'galaxy_map_current.py',
]

PAIR_RE = re.compile(
    r"'lines':\s*\((\d+),\s*(\d+)\).*?\n?\s*'anchor':\s*(\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*')",
    re.MULTILINE,
)
# Some files declare 'anchor' BEFORE 'lines' on the line above -- handle
# both orders by also trying the reverse pattern.
PAIR_RE_REV = re.compile(
    r"'anchor':\s*(\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*').*?\n?\s*'lines':\s*\((\d+),\s*(\d+)\)",
    re.MULTILINE,
)


def _unquote(s):
    return s[1:-1].encode().decode('unicode_escape')


def extract_pairs(text):
    pairs = []
    for m in PAIR_RE.finditer(text):
        s, e, anchor = m.group(1), m.group(2), m.group(3)
        pairs.append((int(s), int(e), _unquote(anchor)))
    for m in PAIR_RE_REV.finditer(text):
        anchor, s, e = m.group(1), m.group(2), m.group(3)
        pairs.append((int(s), int(e), _unquote(anchor)))
    return pairs


def main():
    core_lines = CORE_JS.read_text(encoding='utf-8').split('\n')
    stale = []
    checked = 0
    seen = set()
    for fname in ANCHOR_FILES:
        path = REPO_ROOT / 'scripts' / fname
        if not path.exists():
            continue
        pairs = extract_pairs(path.read_text(encoding='utf-8'))
        for s, e, anchor in pairs:
            key = (fname, s, e, anchor)
            if key in seen:
                continue
            seen.add(key)
            checked += 1
            lo, hi = max(0, s - 1), min(len(core_lines), e)
            found = any(anchor in core_lines[i] for i in range(lo, hi))
            if not found:
                real = [i + 1 for i, l in enumerate(core_lines) if anchor in l]
                stale.append((fname, s, e, anchor, real))
    print(f"checked {checked} real anchor citations across {len(ANCHOR_FILES)} files")
    if stale:
        print(f"STALE: {len(stale)}")
        for fname, s, e, anchor, real in stale:
            print(f"  {fname} ({s}-{e}): '{anchor[:50]}' -> real occurrence(s) {real}")
        sys.exit(1)
    print("all anchors fresh")
    sys.exit(0)


if __name__ == '__main__':
    main()
