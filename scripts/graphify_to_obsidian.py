#!/usr/bin/env python3
"""
graphify_to_obsidian.py — Aug 11 2026, real build out of the Obsidian
Aintergration verdict: "Not a graphify replacement (different job entirely
— code-AST graph vs. note vault), but a real fit for the oversight/
knowledge-base layer" (A17's e-layer idea, the human-browsable Total-
system knowledge base). Alex's own reply: "obsidian - do it."

Real division of labor, kept honest rather than blurred: graphify does
the actual AST-based code analysis (parsing rpgace_core.js/main.js/api/*
as real JavaScript, extracting real function/call/import relationships).
Obsidian cannot do that job and this script does not ask it to. What this
script DOES do: take graphify's own already-computed river/zone structure
(scripts/graphify_river_group.py's RIVER_MODULES/RIVER_NAME/RIVER_COLOR
and its build_id_river_map/build_component_zone_map — imported directly,
never re-derived, per rule 8) and render it as a real, openable Obsidian
vault: one markdown note per river/zone with real [[wikilinks]] to its
member files and to the rivers it flows into/from (extracted verbatim
from minotaur_map.html's own `.river-flow-next` connectors — never
guessed), plus one index note. This is genuinely the "human-facing
knowledge/truth layer graphify's output feeds into" — a different real
job from graphify's own graph.html, not a competing copy of it.

v1 scope, honest: rivers + zones + real flow connectors only (16 hub
notes + 1 index). Does NOT yet generate a note per individual node/
function (953 of them) — that would be real future work if the 16-hub
level proves too coarse in practice, not built blind here. Does NOT
touch graphify's own graph.json/graph.html/GRAPH_TREE.html outputs at
all — reads scripts/graphify_river_group.py's data structures only.

Usage:
    python3 scripts/graphify_to_obsidian.py [path/to/vault]
    (defaults to obsidian-vault/ at the repo root)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402  (import after sys.path fix, deliberate)
    RIVER_MODULES, RIVER_NAME, RIVER_COLOR, TOTAL_ZONES, CORE_JS,
    parse_module_ranges,
)

DEFAULT_VAULT = Path('obsidian-vault')

# Real, verbatim-extracted from minotaur_map.html's own `.river-flow-next`
# connectors (Aug 6 restructure pass) — never guessed. Each entry: real
# source river number -> list of (target label, real condition/note).
# Rivers 12-16 (the meta-zones, not named rivers in minotaur_map.html)
# have no flow-connector data — minotaur_map.html's own scope is the 11
# named rivers only, honest scope match, not a gap in this script.
RIVER_FLOWS = {
    1: [('River II — The Great Confluence', 'always')],
    2: [
        ('River III — The Oracle Current', 'Oracle page selected'),
        ('River IV — The Bookworm River', 'Bookworm page selected'),
        ('River V — Two Independent Streams', 'Schedule/Content Intel page selected'),
    ],
    3: [
        ('River VI — The Judgment Chamber', 'a tapped insight badge'),
        ('River IV — The Bookworm River', 'special prefix diverts the message'),
        ('River V — Two Independent Streams', 'special prefix diverts the message'),
    ],
    4: [('River VI — The Judgment Chamber', 'every insight found here')],
    5: [('River VIII — The Confluence Pool', 'Content Intelligence branch only — the Schedule branch is terminal, ends at the Schedule Calendar')],
    6: [
        ('River VII — The Library Current', "a fresh leaf's teaching page"),
        ('River VIII — The Confluence Pool', 'any confirmable fusion-link bridge'),
    ],
    7: [('River VIII — The Confluence Pool', 'a proposed merge')],
    8: [('River II — The Great Confluence', "into The Great Tree, River II's own estuary — readable by every other river from there")],
    9: [('River X — The Confluence of Chronicles', "the Far Shore's own real changes, via system_updates")],
    10: [('— terminal sink for every river above —', 'River XI is the one exception, see below')],
    11: [('River X — The Confluence of Chronicles', 'both branches loop back into the same shared estuary, not a new one')],
}

def _roman_to_int(s: str) -> int:
    vals = {'I': 1, 'V': 5, 'X': 10}
    total = 0
    prev = 0
    for ch in reversed(s):
        v = vals[ch]
        total += -v if v < prev else v
        prev = v
    return total


def _river_num_from_label(label: str) -> int | None:
    if not label.startswith('River'):
        return None
    token = label.split('—')[0].split()[1]
    return _roman_to_int(token)


# Build the reverse map (who flows INTO river N) now that the helper exists.
FLOWS_IN = {}
for src, targets in RIVER_FLOWS.items():
    for label, note in targets:
        tgt = _river_num_from_label(label)
        if tgt:
            FLOWS_IN.setdefault(tgt, []).append((src, note))


def slug(name: str) -> str:
    return name.replace('/', '-').replace(':', '')


def note_filename(num: int) -> str:
    return f"{num:02d} — {slug(RIVER_NAME[num])}.md"


def build_hub_note(num: int, module_ranges) -> str:
    name = RIVER_NAME[num]
    color = RIVER_COLOR[num]
    is_river = num <= 11
    lines = []
    lines.append('---')
    lines.append(f'river_number: {num}')
    lines.append(f'river_name: "{name}"')
    lines.append(f'kind: {"river" if is_river else "zone"}')
    lines.append(f'color: "{color}"')
    lines.append('source: "graphify_river_group.py — real, not guessed"')
    lines.append('---')
    lines.append('')
    lines.append(f'# {name}')
    lines.append('')

    mods = RIVER_MODULES.get(num)
    if mods:
        lines.append('## Real member modules (rpgace_core.js)')
        lines.append('')
        for m in mods:
            rng = module_ranges.get(m)
            loc = f' — `rpgace_core.js:{rng[0]}-{rng[1]}`' if rng else ''
            lines.append(f'- [[{m}]]{loc}')
        lines.append('')
    else:
        lines.append('## Real membership')
        lines.append('')
        lines.append('File-path rules only (no single-module river tag) — see '
                      '`scripts/graphify_river_group.py`\'s own `file_zone()` for '
                      'the exact, checkable membership rule. This is a real Zone '
                      '(API/Auth layer, Skills, Oversight Docs, Session Records, '
                      'or Dev Tooling), not a named code river.')
        lines.append('')

    if num in RIVER_FLOWS:
        lines.append('## Flows into')
        lines.append('')
        for label, note in RIVER_FLOWS[num]:
            target_note = f'[[{note_filename(_river_num_from_label(label))}|{label}]]' if label.startswith('River') else label
            lines.append(f'- → {target_note} ({note})')
        lines.append('')

    if num in FLOWS_IN:
        lines.append('## Fed by')
        lines.append('')
        for src, note in FLOWS_IN[num]:
            lines.append(f'- ← [[{note_filename(src)}|{RIVER_NAME[src]}]] ({note})')
        lines.append('')

    lines.append('---')
    lines.append('*Generated by `scripts/graphify_to_obsidian.py` — real data from '
                  '`graphify_river_group.py` + `minotaur_map.html`\'s own flow '
                  'connectors, never guessed. Re-run after a river/zone changes; '
                  'this file is fully regenerated each time, not hand-edited.*')
    return '\n'.join(lines)


def build_index_note() -> str:
    lines = ['---', 'title: "RPGACE System Map"', '---', '',
             '# RPGACE System Map', '',
             'Real, generated index over RPGACE\'s own river/zone structure — the '
             'human-facing knowledge layer graphify\'s own code-analysis output '
             'feeds into (Aintergration verdict, Aug 11 2026: Obsidian is not a '
             'graphify replacement, but a real fit for this layer specifically).',
             '', '## Rivers (named code domains)', '']
    for n in range(1, 12):
        lines.append(f'- [[{note_filename(n)}|{RIVER_NAME[n]}]]')
    lines.append('')
    lines.append('## Zones (real, file-path-evidenced, not a single named module)')
    lines.append('')
    for n in range(12, TOTAL_ZONES + 1):
        lines.append(f'- [[{note_filename(n)}|{RIVER_NAME[n]}]]')
    lines.append('')
    lines.append('---')
    lines.append('*Source of truth for the underlying data: `scripts/graphify_river_group.py` '
                  '(river/zone membership) and `minotaur_map.html` (flow connectors). '
                  'If this vault and either of those ever disagree, they win — '
                  're-run `graphify_to_obsidian.py`.*')
    return '\n'.join(lines)


def export(vault_dir: Path):
    vault_dir.mkdir(parents=True, exist_ok=True)
    module_ranges = parse_module_ranges(CORE_JS)

    (vault_dir / 'RPGACE System Map.md').write_text(build_index_note(), encoding='utf-8')

    count = 0
    for n in range(1, TOTAL_ZONES + 1):
        text = build_hub_note(n, module_ranges)
        (vault_dir / note_filename(n)).write_text(text, encoding='utf-8')
        count += 1

    return count


if __name__ == '__main__':
    vault = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_VAULT
    if not CORE_JS.exists():
        print(f'ERROR: {CORE_JS} not found — run from the repo root.')
        sys.exit(1)
    n = export(vault)
    print(f'Wrote {n} hub notes + 1 index note to {vault}/')
    print('Open this folder as a vault in Obsidian (File -> Open folder as vault).')
