#!/usr/bin/env python3
"""
smoke_test_generate_v1.py — Aug 14 2026, the first official smoke test of
real modules/dashboard-cards, per Alex's own direct ask: "we implement
each line/edge that has been mapped out as one passage in smoke test
that i can confirm working or not working for first official smoke test
of working modules and functions, buttons etc when oracle ai comes back."

Real, confirmed granularity (AskUserQuestion, Aug 14): one row per real
module (44) + one row per real dashboard card (12) = 56 real, honestly
hand-testable items — NOT one row per function (~427), which would make
this list impractical to actually click through by hand.

Real data source, never fabricated: module rows reuse the exact same
real detection functions perspective_generate_modules.py already proved
(rule 8) — this script does NOT re-derive a new description philosophy,
it condenses the same real evidence into one short, checkable sentence
per row (smoke_test.html is a click-list, not a report — the FULL real
account for each module already lives in perspective_reports, cited via
source_ref rather than duplicated verbatim here). Card rows reuse
compute_dashboard_card_flow() (graphify_river_group.py) exactly as
galaxy_map_level4.py does.

Outputs a SQL file, reviewed before execution — never auto-applied.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    LEVEL3_MODULES, RIVER_MODULES, RIVER_NAME, DASHBOARD_CARDS,
    compute_module_ui_signal, compute_dashboard_card_flow,
)

_river_of = {}
for _r, _mods in RIVER_MODULES.items():
    for _m in _mods:
        _river_of[_m] = _r

FLOW = compute_dashboard_card_flow()


def sql_escape(s):
    return (s or '').replace("'", "''")


def module_row(mod):
    rnum = _river_of.get(mod)
    river_label = RIVER_NAME.get(rnum, 'unrouted river') if rnum else 'unrouted river'
    river_short = river_label.split('—')[0].strip()
    ui = compute_module_ui_signal(mod)
    if ui['output'] and ui['input']:
        role = "renders real output and takes real user input"
    elif ui['output']:
        role = "renders real output, no direct input of its own"
    elif ui['input']:
        role = "takes real user input, no direct render of its own"
    else:
        role = "real internal/logic module, no direct UI surface of its own"
    desc = ("Does this module actually work as intended right now — %s? "
            "Full real self-report + expected_behavior baseline: "
            "perspective_reports (scope_id='%s')." % (role, mod))
    return {
        'category': 'RPGACE App — Modules',
        'item_name': mod,
        'description': desc,
        'source_ref': 'rpgace_core.js MODULE:%s' % mod,
        'galaxy_river': river_short,
        'galaxy_level': 'Level 3 (module function-chain)',
    }


def card_row(card):
    key = card['key']
    entry = FLOW.get(key, {'targets': []})
    bits = []
    for t in entry['targets']:
        if t['kind'] == 'page':
            bits.append('navigates to a real page (%s)' % t['page'])
        else:
            if t.get('sub_injector'):
                sm, sf = t['sub_injector']
                bits.append('opens a real popup, content owned by %s' % sm)
            else:
                bits.append('opens a real popup (%s.%s)' % (t['module'], t['func']))
    action = '; '.join(bits) if bits else 'no real target resolved'
    rivers = ', '.join(RIVER_NAME.get(r, '?').split('—')[0].strip() for r in card['rivers'])
    desc = ("Does clicking this dashboard card actually do what it should — %s? "
            "Full real frontend flow: galaxy_map_level4.html#card-%s." % (action, key))
    return {
        'category': 'RPGACE App — Dashboard Cards',
        'item_name': card['label'],
        'description': desc,
        'source_ref': "dashDeck.MODULES['%s'].go()" % key,
        'galaxy_river': rivers,
        'galaxy_level': 'Level 4 (dashboard-card frontend flow)',
    }


def main():
    rows = [module_row(m) for m in sorted(LEVEL3_MODULES)]
    rows += [card_row(c) for c in DASHBOARD_CARDS]

    out_path = Path('smoke_test_batch_2026-08-14.sql')
    lines = []
    for r in rows:
        lines.append(
            "INSERT INTO smoke_test_items (category, item_name, description, status, source_ref, galaxy_river, galaxy_level) VALUES "
            "('%s', '%s', '%s', 'unverified', '%s', '%s', '%s');" % (
                sql_escape(r['category']), sql_escape(r['item_name']), sql_escape(r['description']),
                sql_escape(r['source_ref']), sql_escape(r['galaxy_river']), sql_escape(r['galaxy_level']),
            )
        )
    out_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print("Wrote %s — %d real rows (%d modules + %d dashboard cards)." %
          (out_path, len(rows), len(LEVEL3_MODULES), len(DASHBOARD_CARDS)))


if __name__ == '__main__':
    main()
