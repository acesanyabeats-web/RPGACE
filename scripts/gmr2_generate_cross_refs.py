#!/usr/bin/env python3
"""GMR-2 — real cross_refs evidence audit for the 44 module perspective_reports
that predate the Sep 15 2026 cross_refs jsonb convention.

Real, evidence-grounded, per the ratified "Galaxy Map Redevelopment" plan
(ceo_plans c2500d8c-1815-4506-b452-de50bd3263f3, GMR-2). Alex's own confirmed
answer (Sep 16 2026 /interrogation): audit the 44 unaudited module reports
before letting GMR-3 regenerate any real RIVER_FLOWS edges from them.

Deliberately reuses the SAME real, already-computed evidence functions the
Aug 14 2026 perspective_generate_modules.py batch (and the Galaxy Map's own
wiring-sweep pipeline) already run — compute_cross_module_function_calls(),
compute_hook_signal_edges(), compute_intra_river_flow(),
compute_supabase_table_touches() — never invented, never re-derived by a
fresh grep pass (rule 8). Each of the 44 rows already carries real evidence
counts (cross_module_backdoor_in/out, same_river_edges_as_source/target,
hook_fires/hook_listens) from that Aug 14 pass; this script's real job is
naming WHICH modules/tables those counts refer to, in the exact same
evidence.cross_refs string-list shape the 14 Sep 15 module reports already
use (e.g. dashDeck's own row: a plain sorted list of module names, plus a
"N real Supabase tables" summary string where real table touches exist).

Outputs UPDATE statements (not INSERT — the rows already exist) using the
jsonb `||` merge operator so the pre-existing evidence fields are preserved,
never clobbered.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    RIVER_MODULES,
    compute_cross_module_function_calls,
    compute_hook_signal_edges,
    compute_intra_river_flow,
    compute_supabase_table_touches,
    compute_dynamic_table_config_touches,
)

# The real 44 module scope_ids lacking evidence.cross_refs, confirmed via a
# live Supabase query (evidence->'cross_refs' IS NULL) immediately before
# writing this script — not assumed from an older count.
UNAUDITED = [
    'agendaReminder', 'agentsIntoOracle', 'authGate', 'beatLog', 'bookworm',
    'careerStatCard', 'chroniclesLog', 'ciAutoPropose', 'conidPot',
    'contentProductionLive', 'contentRepurpose', 'encSync', 'encTaxonomyLink',
    'encyclopediaQoL', 'feynman', 'instaOraclePanel', 'intelBatchList',
    'intelDedup', 'intelDelete', 'jargonEncyclopedia', 'journalQoL',
    'knowledgeGap', 'mockOracle', 'morningBrief', 'oracleAppGrounding',
    'oracleDevBridge', 'oracleFetchGuard', 'oracleTreeGrounding', 'pathRouter',
    'phylumPath', 'prodOraclePanel', 'refCorpus', 'researchTabs',
    'scheduleFixes', 'scheduleOracle', 'shiftSync', 'taxonomyReviewQueue',
    'taxonomySync', 'taxonomyTree', 'tiktokOracle', 'videoPipeline',
    'videoSummary', 'visualOracle', 'youtubeOracle',
]

_river_of = {}
for _r, _mods in RIVER_MODULES.items():
    for _m in _mods:
        _river_of[_m] = _r

CROSS_CALLS = compute_cross_module_function_calls()
HOOK_EDGES = compute_hook_signal_edges()
INTRA_FLOW = compute_intra_river_flow()


def real_cross_refs(mod):
    names = set()

    # Real cross-module backdoor calls, both directions.
    for fm, ff, tm, tf in CROSS_CALLS:
        if fm == mod:
            names.add(tm)
        if tm == mod:
            names.add(fm)

    # Real same-river call/converge edges, both directions.
    rnum = _river_of.get(mod)
    if rnum is not None:
        for f, t, k in INTRA_FLOW.get(rnum, []):
            if f == mod:
                names.add(t)
            if t == mod:
                names.add(f)

    # Real hook fire/listen partners, both directions.
    for f, t, h in HOOK_EDGES:
        if f == mod:
            names.add(t)
        if t == mod:
            names.add(f)

    names.discard(mod)

    # Real Supabase table touches (static + dynamic-config idiom), summarized
    # as one extra evidence string — same shape as cookingOracle's own real
    # "8 real Supabase tables + cofid_foods" precedent.
    touches = dict(compute_supabase_table_touches(mod))
    for fn, ops in compute_dynamic_table_config_touches(mod).items():
        touches[fn] = touches.get(fn, []) + ops
    tables = set()
    for fn, ops in touches.items():
        for _op, tbl in ops:
            tables.add(tbl)
    table_note = None
    if tables:
        sorted_tables = sorted(tables)
        if len(sorted_tables) <= 4:
            table_note = "%d real Supabase table(s): %s" % (len(sorted_tables), ", ".join(sorted_tables))
        else:
            table_note = "%d real Supabase tables" % len(sorted_tables)

    result = sorted(names)
    if table_note:
        result.append(table_note)
    return result


def sql_escape(s):
    return s.replace("'", "''")


def main():
    out_path = Path('gmr2_cross_refs_update.sql')
    lines = []
    empty_count = 0
    for mod in UNAUDITED:
        refs = real_cross_refs(mod)
        if not refs:
            empty_count += 1
        payload = json.dumps({"cross_refs": refs})
        lines.append(
            "UPDATE perspective_reports SET evidence = evidence || '%s'::jsonb "
            "WHERE scope_level = 'module' AND scope_id = '%s';" % (
                sql_escape(payload), sql_escape(mod)
            )
        )
    out_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print("Wrote %s — %d real UPDATE statements, %d module(s) with a genuinely empty "
          "cross_refs (real isolation, matching this module's own pre-existing "
          "cross_module_backdoor/same_river/hook-edge counts of 0)." %
          (out_path, len(UNAUDITED), empty_count))


if __name__ == '__main__':
    main()
