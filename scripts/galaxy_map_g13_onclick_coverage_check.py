#!/usr/bin/env python3
"""G13 — smoke_test.html onclick_feature coverage check.

Real, evidence-checked comparison per G13's own real Sep 22 2026 spec
(blue -> red, then this build): does every one of the 47 real
perspective_reports rows (scope_level=onclick_feature — the literal
clickable buttons in the live app) have a smoke_test_items row Alex can
actually hand-test, and does the pre-existing catch-all "Remaining 41
onclick functions" row's own claimed count still hold?

Deliberately scoped to onclick_feature only, per G13's own already-
reasoned design principle (never auto-populate smoke_test.html from the
58 internal module rows or 176 internal mainjs_function rows — those
would bury the real, dashboard-hand-testable items under a wall Alex
has no practical way to click through one at a time).

Deliberately a CHECK, not a regeneration (same discipline gmp_b_
consistency_check.py already established) — this never writes a new
smoke_test_items row itself; a genuine gap is flagged via system_map_
flags for a human decision, matching the standing rule-4 discipline.

Usage: a pure function library, same real constraint as gmp_b_
consistency_check.py (this environment's own outbound proxy blocks raw
calls to supabase.co) — call run_check(onclick_features, smoke_items)
from a session that already has the real rows in hand via the Supabase
MCP tool.
"""
import re

# Real, curated — 2 real functions this session found, while building
# the check itself, that are plausibly DEAD CODE rather than genuinely
# untested features, worth a real human decision rather than a hand-
# test click (rule 4 — evidence before action):
#   - toggleVoiceInput: the voiceInput module itself was RETIRED Aug 30
#     2026 (real Alex ask, CLAUDE.md's own standing fact) — this onclick
#     function's own perspective_reports row still exists (archive, not
#     delete, per this project's own convention) but the button it
#     drives may no longer have a live target.
#   - runVideoWorkshop: CLAUDE.md's own standing fact names this as
#     part of main.js's confirmed-dead 4-agent PIPELINE subsystem
#     (getElementById('pipeline-output') has zero matching element
#     anywhere in current index.html — cannot execute without throwing).
DEAD_CODE_CANDIDATES = {
    'toggleVoiceInput': 'voiceInput module retired Aug 30 2026 (CLAUDE.md standing fact) — this onclick handler may have no live target left.',
    'runVideoWorkshop': "part of main.js's confirmed-dead PIPELINE subsystem (CLAUDE.md standing fact) — getElementById('pipeline-output') matches nothing in current index.html.",
}


def run_check(onclick_features, smoke_items):
    """onclick_features: list of real scope_id strings (perspective_reports,
    scope_level='onclick_feature'). smoke_items: list of (item_name,
    source_ref, status) tuples (smoke_test_items). Returns a real,
    evidence-based result dict — never writes anything itself."""
    catchall_name = None
    individually_covered = {}
    for fn in onclick_features:
        for item_name, source_ref, status in smoke_items:
            if item_name.lower().startswith('remaining') and 'onclick' in item_name.lower():
                catchall_name = item_name
                continue
            combined = item_name + ' ' + source_ref
            if re.search(r'\b' + re.escape(fn) + r'\b', combined):
                individually_covered.setdefault(fn, []).append((item_name, status))

    covered = sorted(individually_covered.keys())
    uncovered = sorted(set(onclick_features) - set(individually_covered.keys()))
    dead_code_in_uncovered = {fn: reason for fn, reason in DEAD_CODE_CANDIDATES.items() if fn in uncovered}

    return {
        'total_onclick_features': len(onclick_features),
        'individually_covered': covered,
        'individually_covered_count': len(covered),
        'uncovered_names': uncovered,
        'uncovered_count': len(uncovered),
        'catchall_row_name': catchall_name,
        'catchall_count_matches_real_uncovered': (catchall_name is not None and str(len(uncovered)) in catchall_name),
        'dead_code_candidates_inside_uncovered': dead_code_in_uncovered,
    }


if __name__ == '__main__':
    print(__doc__)
    print("Pure function library — call run_check(onclick_features, smoke_items) "
          "from a session that already has the real Supabase rows in hand.")
