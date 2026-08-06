#!/usr/bin/env python3
"""
graphify_recolor.py — Aug 6, real Alex ask: "make the coulours correspond
to rpgace colours so it is easily sorted."

graphify's own `graphify export html` always writes the same 10-color
Tableau10 categorical palette (#4E79A7, #F28E2B, #E15759, #76B7B2,
#59A14F, #EDC948, #B07AA1, #FF9DA7, #9C755F, #BAB0AC) for community
coloring, plus a couple of hardcoded UI-chrome accents (search-focus
border, checked-checkbox color) also on #4E79A7. This script does a
deterministic, idempotent hex swap to RPGACE's own real palette
(sourced from style.css's :root custom properties, never guessed),
so the exported graph reads as visually part of the same app instead
of a generic default.

Deliberately a small standalone post-processing step, NOT a patch to
graphify's own installed package - graphify is external, upgradeable
tooling; hand-editing its Python would be lost on the next upgrade and
isn't RPGACE's own code to maintain. This script is real, versioned
RPGACE-side code instead, run once after every `graphify export html`.

Usage:
    python3 scripts/graphify_recolor.py [path/to/graph.html]
    (defaults to graphify-out/graph.html)

Idempotent: always maps FROM the fixed default Tableau10 set, so
re-running it against a fresh export (which always starts from the same
defaults) is always correct - running it twice on an already-recolored
file is a safe no-op (the Tableau10 hexes won't be found a second time).
"""
import sys
from pathlib import Path

# Real RPGACE tokens, copied verbatim from style.css's :root block -
# never invented. Order matches the order Tableau10's own colors appear
# in graphify's LEGEND/RAW_NODES output (cid 0, 1, 2... cycling every 10).
RPGACE_PALETTE = [
    ('#4E79A7', '#4a8ccc'),  # --blue        (was Tableau10 slot 0)
    ('#F28E2B', '#cc7a3a'),  # --orange      (slot 1)
    ('#E15759', '#cc4a4a'),  # --red         (slot 2)
    ('#76B7B2', '#4caf82'),  # --green       (slot 3)
    ('#59A14F', '#c9a84c'),  # --gold        (slot 4 - real brand primary, kept prominent)
    ('#EDC948', '#e8c96a'),  # --gold2       (slot 5)
    ('#B07AA1', '#9b6ec8'),  # --purple      (slot 6)
    ('#FF9DA7', '#e05555'),  # --hp-col      (slot 7)
    ('#9C755F', '#5588ee'),  # --mp-col      (slot 8)
    ('#BAB0AC', '#868db8'),  # --muted       (slot 9)
]


def recolor(path: Path) -> int:
    text = path.read_text(encoding='utf-8')
    total = 0
    for old, new in RPGACE_PALETTE:
        count = text.count(old)
        if count:
            text = text.replace(old, new)
            total += count
    path.write_text(text, encoding='utf-8')
    return total


if __name__ == '__main__':
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('graphify-out/graph.html')
    if not target.exists():
        print(f'ERROR: {target} not found. Run `graphify export html` first.')
        sys.exit(1)
    replaced = recolor(target)
    print(f'Recolored {target}: {replaced} hex occurrences swapped to RPGACE palette.')
