#!/usr/bin/env python3
"""
smoke_test_generate_g_items.py — Aug 20 2026, G51 (the yellow<->smoke_test
<->green confirm loop, Alex's own words: "i think this is a banging idea
you started off"). Generates real smoke_test_items rows for every currently
yellow ceo_plan_items row (built, real, unverified by Alex's own hand),
each carrying a real, specific HOW TO TEST instruction so the row is
self-sufficient — Alex can hand-test it without needing chat history,
same discipline G26 Phase 2 already established for its own 10 decision-
point rows.

Real, confirmed scope (AskUserQuestion, Aug 20):
  - Generator script, not hand-written per item (this file) — consistent,
    scalable, real evidence pulled from each item's own ceo_plan_items
    title/evidence rather than fabricated.
  - G42 (the umbrella covering G43-G50) gets NO row of its own — it
    auto-flips green once all 8 children are independently confirmed
    (smoke_test.html's own checkUmbrellaAutoFlip(), hardcoded to this one
    real relationship since generalizing for exactly one instance would
    be over-building, rule 11).

Real, honest handling of a genuine overlap found while writing this
(not silently smoothed over): G43 (L0 map), G44 (L0 Dimension Matrix)
and G50 (Oversight Docs bubble system) are now, after the Aug 20 L0
merge, largely the SAME physical artifact (graphify-out/galaxy_map_l0.html,
one file with a map/table toggle) rather than 3 separate pages — G44's
own real content IS the table view inside that same file, and G50's own
evidence already says "already delivered by G43, verified not rebuilt."
Per rule 8, each still gets its OWN real row (each is a separate,
separately-evidenced ceo_plan_items decision Alex approved, and G51's
own mechanism needs a real 1:1 row-to-item link to flip each independently)
but the HOW TO TEST text is honest about the shared artifact rather than
pretending they're 3 distinct pages, and G44/G50 carry a real cross_ref_note
pointing back to G43 instead of duplicating prose.

This script's own real source of the 10 (11, not counting G42) rows'
title/evidence text is this session's own already-fetched Supabase
query results (network access to Supabase isn't available from this
sandbox — see CLAUDE.md's standing constraint — so the content below is
transcribed from real query results, not re-derived live). A future
session with live Supabase access from its own environment could rebuild
this script to query ceo_plan_items directly instead.

Outputs a SQL file, reviewed before execution — never auto-applied.
"""
from pathlib import Path

OUT = Path('smoke_test_g_items_batch_2026-08-20.sql')

CEO_PLAN_ID = '6f8536fd-7d98-4565-9369-c75a149fce8f'

# Real, honest per-item HOW TO TEST instructions, grounded in each item's
# own actual shipped page/feature — not generic filler.
ITEMS = [
    {
        'code': 'G34',
        'category': 'Galaxy Development Framework — Yellow Confirm Queue',
        'item_name': 'G34 — Oracle provider mode toggle (Local Claude vs external, dormant)',
        'description': ('HOW TO TEST: look for the pinned "oracle-provider-switch" toggle, '
            'top-right of any page, below the existing mock-oracle switches (🧪/✅). Click it: '
            'confirm it visually flips between "🔮 Local" and "🌐 <provider>". Right-click it: '
            'confirm it cycles the target provider label between kimi/luna. Try a real Oracle send '
            'while set to External — it should fail loud with an honest "dormant, no real key configured" '
            'error, never silently succeed or silently fall back to Local.'),
        'source_ref': 'rpgace_core.js MODULE:oracleProviderMode',
        'galaxy_river': 'River III',
        'galaxy_level': 'Level 3 (module)',
    },
    {
        'code': 'G38',
        'category': 'Galaxy Development Framework — Yellow Confirm Queue',
        'item_name': 'G38 — Level 2.5 (UI/Alex accessibility convergence point)',
        'description': ('HOW TO TEST: open graphify-out/galaxy_map_level2_5.html. Confirm the 10 '
            'real card-having rivers each render with their real dashboard card(s), each card '
            'resolving to its real primary module with a working link into Level 3.'),
        'source_ref': 'scripts/galaxy_map_level2_5.py',
        'galaxy_river': 'multiple',
        'galaxy_level': 'Level 2.5',
    },
    {
        'code': 'G39',
        'category': 'Galaxy Development Framework — Yellow Confirm Queue',
        'item_name': 'G39 — Load Dimension (boot/page-nav/click-load diagnostics)',
        'description': ('HOW TO TEST: open graphify-out/galaxy_map_load.html. Confirm the real '
            'boot-task registration list, page-nav trigger list, and click-load trigger list all '
            'render with working links into Level 2/3.'),
        'source_ref': 'scripts/galaxy_map_load.py',
        'galaxy_river': 'multiple',
        'galaxy_level': 'Load Dimension',
    },
    {
        'code': 'G43',
        'category': 'Galaxy Development Framework — Yellow Confirm Queue',
        'item_name': 'G43 — L0 map (7 peer units, no privileged gateway)',
        'description': ('HOW TO TEST: open graphify-out/galaxy_map_l0.html (map view, default). '
            'Confirm all 7 real units render as bubbles with no single unit visually privileged. '
            'Click a unit — its own panel + real dimension-edges should appear. Click an edge — the '
            'real drop panel (evidence/desc, yes/no forks where they exist) should appear.'),
        'source_ref': 'scripts/galaxy_map_l0.py',
        'galaxy_river': 'n/a (L0)',
        'galaxy_level': 'Level 0',
    },
    {
        'code': 'G44',
        'category': 'Galaxy Development Framework — Yellow Confirm Queue',
        'item_name': 'G44 — L0 Dimension Matrix (7x7 table view)',
        'description': ('HOW TO TEST: on graphify-out/galaxy_map_l0.html, click the "📊 Table" '
            'toggle (top of page). Confirm the 7x7 grid renders and clicking a real edge cell shows '
            'the same drop-panel content as the map view\'s edges do.'),
        'source_ref': 'scripts/galaxy_map_l0.py (table view)',
        'galaxy_river': 'n/a (L0)',
        'galaxy_level': 'Level 0',
        'cross_ref_note': 'Real, honest overlap: as of the Aug 20 2026 merge, this is the SAME physical file as G43 (galaxy_map_l0.html), reached via its own toggle rather than a separate page — not a duplicate test, a distinct real view of the same shared data.',
    },
    {
        'code': 'G45',
        'category': 'Galaxy Development Framework — Yellow Confirm Queue',
        'item_name': 'G45 — Supabase page (25 real tables x Level/River/Module usage)',
        'description': ('HOW TO TEST: open graphify-out/galaxy_map_supabase.html. Confirm the 25 '
            'real tables list, each showing real client-side read/write touches with working links '
            'into the module(s) that touch them.'),
        'source_ref': 'scripts/galaxy_map_supabase.py',
        'galaxy_river': 'multiple',
        'galaxy_level': 'n/a (Supabase dimension)',
    },
    {
        'code': 'G46',
        'category': 'Galaxy Development Framework — Yellow Confirm Queue',
        'item_name': 'G46 — Skills page Level/River usage extension',
        'description': ('HOW TO TEST: open graphify-out/galaxy_map_skills.html. Confirm each of the '
            '24 real skills shows a real Level/River usage column alongside its existing external-AI/'
            'UI/backend axis markers.'),
        'source_ref': 'scripts/galaxy_map_skills.py',
        'galaxy_river': 'multiple',
        'galaxy_level': 'n/a (Skills dimension)',
    },
    {
        'code': 'G47',
        'category': 'Galaxy Development Framework — Yellow Confirm Queue',
        'item_name': 'G47 — Level 3 replaced: per-module ordered Current-series list',
        'description': ('HOW TO TEST: open graphify-out/galaxy_map_current.html. Pick any of the 45 '
            'modules, confirm its own ordered list of real Currents (functions) renders with input/'
            'handling/output/next detail, and that a ⭐-marked Current links correctly into Level 5.'),
        'source_ref': 'scripts/galaxy_map_current.py',
        'galaxy_river': 'multiple',
        'galaxy_level': 'Level 3 (Current series)',
    },
    {
        'code': 'G48',
        'category': 'Galaxy Development Framework — Yellow Confirm Queue',
        'item_name': 'G48 — zoomed per-Current walkthrough (folded into Current, G75)',
        'description': ('HOW TO TEST: open graphify-out/galaxy_map_current.html. Pick a module, '
            'switch to Table view, pick any Current and click "🔎 Expand walkthrough detail". '
            'Confirm the expanded block renders and its "Continue →" link correctly walks to '
            'whatever that function calls next, stopping cleanly at a genuine terminal or a '
            'module boundary. (G75, Aug 25 2026: this used to be its own galaxy_map_zoom.html '
            'page — retired as a ladder level, folded in here as an inline toggle.)'),
        'source_ref': 'scripts/galaxy_map_current.py (build_walkthrough_details)',
        'galaxy_river': 'multiple',
        'galaxy_level': 'Current (L3) — expand-for-detail',
    },
    {
        'code': 'G49',
        'category': 'Galaxy Development Framework — Yellow Confirm Queue',
        'item_name': 'G49 — River redefinition v2 (River V split into 2 real rivers)',
        'description': ('HOW TO TEST: open graphify-out/galaxy_map_river.html. Confirm River V now '
            'reads "Daily Ops: Agenda, Schedule & Journal" (not the old combined name) and a new '
            'River XVII "The Research & Intel Stream" exists with its own 5 real modules '
            '(researchTabs/intelBatchList/intelDelete/intelDedup/ciAutoPropose).'),
        'source_ref': 'scripts/graphify_river_group.py RIVER_MODULES',
        'galaxy_river': 'River V, River XVII',
        'galaxy_level': 'Level 1 (rivers)',
    },
    {
        'code': 'G50',
        'category': 'Galaxy Development Framework — Yellow Confirm Queue',
        'item_name': 'G50 — Oversight Docs bubble system',
        'description': ('HOW TO TEST: on graphify-out/galaxy_map_l0.html, click the "Oversight Docs" '
            'unit. Confirm it renders its own real dimension-edges the same way every other L0 unit '
            'does — this item was delivered as part of G43\'s own build, not a separate page.'),
        'source_ref': 'scripts/galaxy_map_l0.py (oversight_docs unit)',
        'galaxy_river': 'n/a (L0)',
        'galaxy_level': 'Level 0',
        'cross_ref_note': 'Already delivered as part of G43\'s own build (same real evidence, not rebuilt separately) — this row exists so G50 can be independently confirmed/flipped in ceo_plan_items, per G51\'s own 1:1 row-per-item design.',
    },
]


def sql_escape(s):
    return (s or '').replace("'", "''")


def main():
    lines = [
        "-- smoke_test_g_items_batch_2026-08-20.sql — G51 real backfill",
        "-- Generated by scripts/smoke_test_generate_g_items.py, reviewed before execution.",
        "",
    ]
    for it in ITEMS:
        cross_ref = it.get('cross_ref_note', '')
        lines.append(
            "INSERT INTO smoke_test_items "
            "(category, item_name, description, status, source_ref, galaxy_river, galaxy_level, "
            "cross_ref_note, linked_plan_item_id) VALUES ("
            "'%s', '%s', '%s', 'unverified', '%s', '%s', '%s', %s, "
            "(SELECT id FROM ceo_plan_items WHERE plan_id = '%s' AND item_code = '%s'));" % (
                sql_escape(it['category']), sql_escape(it['item_name']), sql_escape(it['description']),
                sql_escape(it['source_ref']), sql_escape(it['galaxy_river']), sql_escape(it['galaxy_level']),
                ("'%s'" % sql_escape(cross_ref)) if cross_ref else 'NULL',
                CEO_PLAN_ID, it['code'],
            )
        )
    OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print("Wrote %s — %d real rows (G42 excluded, umbrella auto-derives from these)." % (OUT, len(ITEMS)))


if __name__ == '__main__':
    main()
