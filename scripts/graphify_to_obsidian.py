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
    RIVER_FLOWS, FLOWS_IN, _river_num_from_label,
    RIVER_ROLE_NOTE, EXTERNAL_CONNECTORS,
    INTERACTION_TYPE_LABEL,
    parse_module_ranges,
)

DEFAULT_VAULT = Path('obsidian-vault')

# RIVER_FLOWS/FLOWS_IN (real, verbatim-extracted from minotaur_map.html's
# own `.river-flow-next` connectors) moved to graphify_river_group.py
# Aug 11 — rule-8 dedup, now the single canonical source, imported above.
# graph.html's own new RIVER_NOTES bridge (build_river_notes, same
# script) uses the identical data — this was previously a second copy.


def slug(name: str) -> str:
    return name.replace('/', '-').replace(':', '')


def note_filename(num: int) -> str:
    return f"{num:02d} — {slug(RIVER_NAME[num])}.md"


def build_hub_note(num: int, module_ranges) -> str:
    name = RIVER_NAME[num]
    color = RIVER_COLOR[num]
    carries_data_flow = num <= 11
    lines = []
    lines.append('---')
    lines.append(f'river_number: {num}')
    lines.append(f'river_name: "{name}"')
    lines.append('kind: river')
    lines.append(f'carries_data_flow: {"true" if carries_data_flow else "false"}')
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
        # Aug 11, real Alex ask: rivers XII-XVI join the unified river
        # system (they carry real Total-system traffic, just a
        # different kind than I-XI's narrative info flow) — see
        # RIVER_ROLE_NOTE in graphify_river_group.py, the canonical
        # source for this text.
        lines.append('## Real role')
        lines.append('')
        lines.append(RIVER_ROLE_NOTE.get(num, ''))
        lines.append('')

    if num == 12:
        lines.append('## Total-systems connectors (real, external)')
        lines.append('')
        lines.append('Canonical source: `ai_tooling_and_rules_map.md`\'s own '
                      '"External AI/tool providers" table — mirrored here for '
                      'graphify/Obsidian display, not a second independent fact-set.')
        lines.append('')
        for x in EXTERNAL_CONNECTORS:
            lines.append(f"- **{x['name']}** ({x['status']}) via `{x['via']}` — {x['note']}")
        lines.append('')

    if num in RIVER_FLOWS:
        lines.append('## Flows into')
        lines.append('')
        for label, note, itype in RIVER_FLOWS[num]:
            target_note = f'[[{note_filename(_river_num_from_label(label))}|{label}]]' if label.startswith('River') else label
            itype_label = INTERACTION_TYPE_LABEL.get(itype, itype)
            lines.append(f'- → {target_note} — **{itype_label}** ({note})')
        lines.append('')

    if num in FLOWS_IN:
        lines.append('## Fed by')
        lines.append('')
        for src, note, itype in FLOWS_IN[num]:
            itype_label = INTERACTION_TYPE_LABEL.get(itype, itype)
            lines.append(f'- ← [[{note_filename(src)}|{RIVER_NAME[src]}]] — **{itype_label}** ({note})')
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
             'Real, generated index over RPGACE\'s own river structure — the '
             'human-facing knowledge layer graphify\'s own code-analysis output '
             'feeds into (Aintergration verdict, Aug 11 2026: Obsidian is not a '
             'graphify replacement, but a real fit for this layer specifically).',
             '',
             'Aug 11, real Alex ask: 16 unified rivers now, not "11 rivers + 5 '
             'zones" — rivers XII-XVI carry real Total-systems traffic (external '
             'AI/tool connectors, or the dev-process/knowledge layer the Total '
             'system\'s own Claude Code members coordinate through), a different '
             'KIND of real traffic than I-XI\'s in-app narrative information flow, '
             'not a lesser one.',
             '', '## Rivers I-XI (in-app narrative information flow)', '']
    for n in range(1, 12):
        lines.append(f'- [[{note_filename(n)}|{RIVER_NAME[n]}]]')
    lines.append('')
    lines.append('## Rivers XII-XVI (Total-systems / dev-process, file-path-evidenced)')
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
