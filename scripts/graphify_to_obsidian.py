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
    RIVER_ROLE_NOTE, EXTERNAL_CONNECTORS, SUPABASE_CORE,
    INTERACTION_TYPE_LABEL,
    parse_module_ranges, LEVEL3_MODULES,
    compute_intra_river_flow, compute_cross_module_function_calls,
    compute_hook_signal_edges, compute_mainjs_window_bridge,
    compute_module_ui_signal, compute_module_oracle_call_count,
    compute_module_supabase_touch_count, compute_external_call_sites,
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
        lines.append('## Core infrastructure')
        lines.append('')
        lines.append(f"- **{SUPABASE_CORE['name']}** ({SUPABASE_CORE['status']}) via "
                      f"`{SUPABASE_CORE['via']}` — {SUPABASE_CORE['note']}")
        lines.append('')
        lines.append('## Total-systems connectors (real, external)')
        lines.append('')
        lines.append('Canonical source: `ai_tooling_and_rules_map.md`\'s own '
                      '"External AI/tool providers" table — mirrored here for '
                      'graphify/Obsidian display, not a second independent fact-set. '
                      'Every real, built connector is listed regardless of test status — '
                      'an untested one is marked, never hidden.')
        lines.append('')
        for x in EXTERNAL_CONNECTORS:
            tested_note = '' if x.get('tested') else ' **(not tested)**'
            lines.append(f"- **{x['name']}** ({x['status']}) via `{x['via']}`{tested_note} — {x['note']}")
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


# ─── v2 scope (G57, Aug 20 2026) — real per-module notes ───────────────
# Alex's own real ask: he was looking at the real Obsidian app and saw
# every [[moduleName]] wikilink (e.g. [[taxonomyReviewQueue]]) rendering
# as unresolved — v1 scope (above) only ever wrote 16 river-hub notes,
# never one per individual module, exactly as this file's own v1-scope
# docstring already stated plainly. This closes that gap for all 45 real
# RIVER_MODULES-tracked modules, reusing the EXACT same real detection
# functions perspective_generate_modules.py already proved (rule 8, not
# re-derived) — never fabricated content, every relationship a real
# citation from graphify_river_group.py's own already-computed data.
_MODULE_RIVER = {}
for _r, _mods in RIVER_MODULES.items():
    for _m in _mods:
        _MODULE_RIVER[_m] = _r

_INTRA_FLOW = compute_intra_river_flow()
_CROSS_CALLS = compute_cross_module_function_calls()
_HOOK_EDGES = compute_hook_signal_edges()
_BRIDGE = compute_mainjs_window_bridge()


def module_note_filename(mod: str) -> str:
    # Deliberately just "<mod>.md", no prefix — build_hub_note() above
    # already writes plain [[moduleName]] wikilinks (established before
    # this v2 scope existed); matching that exact filename convention is
    # what resolves those links, rather than needing to touch every
    # existing hub note's own link text.
    return f'{slug(mod)}.md'


def build_module_note(mod: str, module_ranges) -> str:
    rnum = _MODULE_RIVER.get(mod)
    rng = module_ranges.get(mod)
    ui = compute_module_ui_signal(mod)
    oracle_calls = compute_module_oracle_call_count(mod)
    sb_touches = compute_module_supabase_touch_count(mod)
    externals = compute_external_call_sites(mod)

    lines = ['---', f'module_name: "{mod}"', 'kind: module']
    if rnum:
        lines.append(f'river_number: {rnum}')
        lines.append(f'river_name: "{RIVER_NAME[rnum]}"')
    if rng:
        lines.append(f'source_lines: "{rng[0]}-{rng[1]}"')
    lines.append('source: "graphify_river_group.py — real, not guessed"')
    lines.append('---')
    lines.append('')
    lines.append(f'# {mod}')
    lines.append('')
    if rng:
        lines.append(f'`rpgace_core.js:{rng[0]}-{rng[1]}`')
        lines.append('')
    if rnum:
        lines.append(f'Member of [[{note_filename(rnum)}|{RIVER_NAME[rnum]}]].')
        lines.append('')

    # Real UI/Oracle/Supabase/external evidence — same 3 axes the Galaxy
    # Map's own Level 2/3 Alex/Oracle/Supabase bubbles already compute.
    lines.append('## Real touch evidence')
    lines.append('')
    lines.append(f"- **UI**: {'renders real output' if ui['output'] else 'no direct output'}, "
                  f"{'takes real input' if ui['input'] else 'no direct input'}.")
    if oracle_calls:
        lines.append(f'- **Oracle**: {oracle_calls} real call site(s) (sendToOracle/callOracle/fillGaps).')
    n_sb_funcs, n_sb_total, sb_tables = sb_touches
    if n_sb_total:
        lines.append(f'- **Supabase**: {n_sb_total} real touch(es) across {", ".join(sorted(sb_tables))}.')
    if externals:
        all_actions = sorted({a for acts in externals.values() for a in acts})
        lines.append(f'- **External connectors**: {", ".join(all_actions)}.')
    lines.append('')

    # Real relationships to OTHER modules — the actual value of a
    # per-module note over a river-hub note: resolving module-to-module
    # wikilinks, not just module-to-river.
    calls_out, calls_in = set(), set()
    for rn, edges in _INTRA_FLOW.items():
        for f, t, kind in edges:
            if f == mod:
                calls_out.add(t)
            if t == mod:
                calls_in.add(f)
    for fmod, ffunc, tmod, tfunc in _CROSS_CALLS:
        if fmod == mod:
            calls_out.add(tmod)
        if tmod == mod:
            calls_in.add(fmod)
    hooks_fired, hooks_heard = [], []
    for frm, to, kind in _HOOK_EDGES:
        if to == mod and not frm.startswith('core-wrapper'):
            hooks_heard.append((frm, kind))
        if to == mod and frm.startswith('core-wrapper'):
            hooks_heard.append((frm, kind))
    bridged = [f for (m, fn) in _BRIDGE if m == mod]

    real_mods_out = {m for m in calls_out if m in LEVEL3_MODULES and m != mod}
    real_mods_in = {m for m in calls_in if m in LEVEL3_MODULES and m != mod}
    if real_mods_out:
        lines.append('## Calls into')
        lines.append('')
        for t in sorted(real_mods_out):
            lines.append(f'- → [[{module_note_filename(t)}|{t}]]')
        lines.append('')
    if real_mods_in:
        lines.append('## Called by')
        lines.append('')
        for f in sorted(real_mods_in):
            lines.append(f'- ← [[{module_note_filename(f)}|{f}]]')
        lines.append('')
    if hooks_heard:
        lines.append('## Hook signals received')
        lines.append('')
        for frm, kind in sorted(set(hooks_heard)):
            lines.append(f'- ← `{frm}` (**{kind}**)')
        lines.append('')
    if bridged:
        lines.append('## Legacy-section bridge')
        lines.append('')
        lines.append('Real functions in rpgace_core.js\'s own legacy section '
                      '(merged from the old main.js, Aug 20 2026) call this module directly:')
        lines.append('')
        for fn in sorted(set(bridged)):
            lines.append(f'- `{fn}()`')
        lines.append('')

    lines.append('---')
    lines.append('*Generated by `scripts/graphify_to_obsidian.py` (v2 scope, G57) — real data '
                  'from `graphify_river_group.py`\'s own already-computed detection functions, '
                  'never fabricated. Re-run after rpgace_core.js changes; this file is fully '
                  'regenerated each time, not hand-edited.*')
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
    expected = {'RPGACE System Map.md'}
    for n in range(1, TOTAL_ZONES + 1):
        text = build_hub_note(n, module_ranges)
        fname = note_filename(n)
        (vault_dir / fname).write_text(text, encoding='utf-8')
        expected.add(fname)
        count += 1

    # Real, honest bug fix (Aug 20 2026, found by this same session's own
    # file-count sanity check, not a hypothetical): a river RENAME (e.g.
    # the Aug 18 G49 River V split — "Two Independent Streams" became
    # "Daily Ops: Agenda, Schedule & Journal") changes note_filename()'s
    # OWN output for that river number, but nothing ever deleted the OLD
    # filename — this script only ever WROTE current files, never
    # cleaned up stale ones a prior run had left behind. Confirmed real:
    # a genuinely stale "05 — River V — Two Independent Streams.md" sat
    # in the vault since Aug 18, invisible until counted directly. Fixed
    # below, after all module notes are known too (same expected-set
    # sweep covers both real causes at once).

    # v2 scope (G57, Aug 20 2026) — one real note per module, resolving
    # every [[moduleName]] wikilink the hub notes above already write.
    module_count = 0
    for mod in sorted(LEVEL3_MODULES):
        fname = module_note_filename(mod)
        text = build_module_note(mod, module_ranges)
        (vault_dir / fname).write_text(text, encoding='utf-8')
        expected.add(fname)
        module_count += 1

    # Real cleanup sweep — delete any .md file in the vault that this
    # run did NOT just write. Catches the stale-rename bug above for
    # both hub and module notes, present and future (a module rename,
    # a river split/merge, a module removed from RIVER_MODULES).
    removed = 0
    for f in vault_dir.glob('*.md'):
        if f.name not in expected:
            f.unlink()
            removed += 1

    return count, module_count, removed


if __name__ == '__main__':
    vault = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_VAULT
    if not CORE_JS.exists():
        print(f'ERROR: {CORE_JS} not found — run from the repo root.')
        sys.exit(1)
    n, m, removed = export(vault)
    print(f'Wrote {n} hub notes + {m} module notes + 1 index note to {vault}/'
          + (f' (removed {removed} stale file(s))' if removed else ''))
    print('Open this folder as a vault in Obsidian (File -> Open folder as vault).')
