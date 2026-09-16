#!/usr/bin/env python3
"""GMP-B — RIVER_FLOWS vs. perspective_reports cross_refs consistency check.

Real, evidence-checked comparison per the ratified "Galaxy Map Structure
Based on Perspective" plan (ceo_plans, Sep 15-16 2026): does every real
cross-module relationship a module's own perspective_reports.evidence.
cross_refs names actually correspond to a real RIVER_FLOWS edge between
the two modules' own rivers (in either direction — RIVER_FLOWS is
directional but a module-to-module reference can be the caller or the
callee side of a real relationship)?

Deliberately a CHECK, not a regeneration (Thread (b)'s own confirmed
scope) — RIVER_FLOWS stays the hand-curated source of truth; this only
flags a genuine mismatch for human review via system_map_flags. Scoped
honestly to the 14 module reports that actually carry a real cross_refs
array (this session's own new module-report batch) — the other 44
pre-existing module reports do not yet use that jsonb shape and are
named plainly as "not yet audited," never silently treated as clean.

Usage: python3 scripts/gmp_b_consistency_check.py
Prints real findings; does not write to Supabase itself (the caller
reviews the printed findings, then inserts any real system_map_flags
row — kept as 2 separate steps so a bad regex match can't silently
write a false-positive flag).
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import RIVER_MODULES, RIVER_FLOWS, _roman_to_int  # noqa: E402

ALL_MODULE_NAMES = {m for mods in RIVER_MODULES.values() for m in mods}
MODULE_TO_RIVER = {m: r for r, mods in RIVER_MODULES.items() for m in mods}

RIVER_NAME_RE = re.compile(r'River ([IVXLCDM]+)')


def river_flow_pairs():
    """(source_river_int, target_river_int) set, both directions folded in
    as an unordered frozenset pair — RIVER_FLOWS is directional but a
    module-level cross_ref can legitimately be either side of a real
    relationship."""
    pairs = set()
    for src, edges in RIVER_FLOWS.items():
        for target_name, _condition, _itype in edges:
            m = RIVER_NAME_RE.search(target_name)
            if not m:
                continue  # e.g. the terminal-sink label on River 10 — not a real river name
            tgt = _roman_to_int(m.group(1))
            pairs.add(frozenset((src, tgt)))
    return pairs


def extract_module_mentions(cross_ref_text):
    """A cross_refs entry is free text (e.g. 'RPGACE.modules.dashDeck',
    'dashDeck._popup', '8 real Supabase tables + cofid_foods'). Real
    module names are matched as whole-word substrings against the known
    58-module roster — never a bare prefix match, so 'oracle' alone
    doesn't false-positive against 'oracleControl'."""
    hits = set()
    for name in ALL_MODULE_NAMES:
        if re.search(r'\b' + re.escape(name) + r'\b', cross_ref_text):
            hits.add(name)
    return hits


def main():
    # Real, honest note: this environment's outbound proxy blocks raw
    # calls to supabase.co directly (the same standing constraint every
    # other scripts/*.py dedup/scan tool in this repo already documents)
    # — so this module is a pure function library, invoked with the real
    # module-report rows a Claude Code session already pulled via the
    # Supabase MCP tool, rather than querying Supabase itself.
    print(__doc__)
    print('Pure function library — call run_check(module_reports, unaudited_count) '
          'from a session that already has the real Supabase rows in hand.')


def run_check(module_reports, unaudited_count):
    """module_reports: list of {'scope_id': str, 'cross_refs': [str, ...]}
    for the modules that actually carry a real cross_refs array.
    Returns (implied_pairs_missing_from_river_flows, summary_dict)."""
    known_pairs = river_flow_pairs()
    missing = []
    checked_pairs = set()
    for rep in module_reports:
        src_mod = rep['scope_id']
        src_river = MODULE_TO_RIVER.get(src_mod)
        if src_river is None:
            continue  # cross-cutting exclusion (config/dashDeck/etc.) — no single river to check from
        for ref_text in rep['cross_refs']:
            for tgt_mod in extract_module_mentions(ref_text):
                if tgt_mod == src_mod:
                    continue
                tgt_river = MODULE_TO_RIVER.get(tgt_mod)
                if tgt_river is None or tgt_river == src_river:
                    continue  # same river or a cross-cutting module — no river-level edge needed
                pair = frozenset((src_river, tgt_river))
                if pair in checked_pairs:
                    continue
                checked_pairs.add(pair)
                if pair not in known_pairs:
                    missing.append({
                        'source_module': src_mod, 'source_river': src_river,
                        'target_module': tgt_mod, 'target_river': tgt_river,
                        'evidence': ref_text,
                    })
    summary = {
        'modules_audited': len(module_reports),
        'modules_not_yet_audited': unaudited_count,
        'cross_river_pairs_checked': len(checked_pairs),
        'genuine_mismatches_found': len(missing),
    }
    return missing, summary


if __name__ == '__main__':
    main()
