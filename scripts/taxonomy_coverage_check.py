#!/usr/bin/env python3
"""taxonomy_coverage_check.py — Phase 3, real /CEO Phase 1-3 build,
curriculum-restructure spec (records/2026-09/taxonomy_curriculum_
jargon_encyclopedia_merge_spec_2026-09-25.txt).

Cheap, zero-AI-cost, read-only — same family/shape as
verify_edge_evidence_coverage.py and supabase_dedup_scan.py: reports a
real, computed-fresh number instead of a claim, never writes anything
back. Built specifically as the real evidence baseline Phase 4/5's
curriculum design should be measured against, per the spec's own
Section 7 Phase 3 note.

Reports, per phylum: real leaf count, max/avg depth (how far the real
tree currently goes vs. the new MAX_TREE_DEPTH=10 ceiling), and real
insight-row coverage (how many leaves have 0/1/2+ Encyclopedia rows
linked via taxonomy_node_id — the real substrate Phase 1b's dedup-
extend fix and the pre-existing new-leaf path both write to).

A phylum with max_depth<=1 has every leaf sitting directly under the
phylum root — genuinely flat, not yet curriculum-designed, matching
CLAUDE.md's own "not yet rebuilt to the same deep-hierarchy shape"
framing for several phyla. This is a real signal, not a hard verdict —
a phylum can be legitimately shallow (e.g. #21, deliberately empty).

Real first-run finding (Sep 25 2026, worth keeping here as a dated
comment rather than only in chat, since it's a genuine cross-doc drift
instance, rule 16): CLAUDE.md's Taxonomy section claims Phylum 12 was
rebuilt Aug 11 into "6 Orders -> 16 Classes -> 16 leaves, 38 nodes
total." Live query at build time found only 9 real rows (3 branches,
6 leaves, all leaves at depth 1) — a real discrepancy, flagged to Alex,
not silently corrected here (this script reports, it doesn't rewrite
oversight docs).

Usage:
    python3 scripts/taxonomy_coverage_check.py

Same environment note as supabase_dedup_scan.py: this project's
Claude Code Remote sessions have outbound network to supabase.co
blocked by the sandbox proxy — run via mcp__Supabase__execute_sql
inside a session that has it, or run this file directly (urllib +
anon key) from Alex's own machine or a session with a different
network policy.
"""
import json
import os
import urllib.request

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://gripopghczmrbrhqtqbm.supabase.co')
# Same public anon/publishable key already shipped client-side in
# rpgace_core.js's own config — this script needs no more privilege
# than a browser tab already has (read-only, anon_read_only RLS).
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')

MAX_TREE_DEPTH = 10  # keep in sync with phylumPath.MAX_TREE_DEPTH (rpgace_core.js)


def _get(path):
    req = urllib.request.Request(
        SUPABASE_URL + '/rest/v1/' + path,
        headers={'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY},
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode('utf-8'))


def run_check():
    if not SUPABASE_ANON_KEY:
        raise SystemExit('Set SUPABASE_ANON_KEY (env var) before running this script.')

    leaves = _get('taxonomy_tree?node_type=eq.leaf&status=eq.accepted&select=id,phylum_number,depth')
    encyclopedia = _get('encyclopedia?taxonomy_node_id=not.is.null&select=taxonomy_node_id')

    insight_counts = {}
    for row in encyclopedia:
        nid = row['taxonomy_node_id']
        insight_counts[nid] = insight_counts.get(nid, 0) + 1

    by_phylum = {}
    for leaf in leaves:
        p = leaf['phylum_number']
        by_phylum.setdefault(p, {'leaves': [], 'zero': 0, 'one': 0, 'two_plus': 0})
        by_phylum[p]['leaves'].append(leaf['depth'])
        n = insight_counts.get(leaf['id'], 0)
        if n == 0:
            by_phylum[p]['zero'] += 1
        elif n == 1:
            by_phylum[p]['one'] += 1
        else:
            by_phylum[p]['two_plus'] += 1

    total_leaves = len(leaves)
    total_with_insight = sum(1 for l in leaves if insight_counts.get(l['id'], 0) > 0)

    print(f"Real taxonomy coverage — {total_leaves} accepted leaves total, "
          f"{total_with_insight} ({100 * total_with_insight / total_leaves:.1f}%) "
          f"have at least one linked Encyclopedia insight row." if total_leaves else
          "No accepted leaves found.")
    print()
    print(f"{'Phylum':>7}  {'Leaves':>7}  {'MaxDepth':>9}  {'AvgDepth':>9}  "
          f"{'0-ins':>6}  {'1-ins':>6}  {'2+ins':>6}  Coarse?")
    for p in sorted(by_phylum):
        d = by_phylum[p]
        depths = d['leaves']
        max_d = max(depths)
        avg_d = sum(depths) / len(depths)
        coarse = 'YES (<=1)' if max_d <= 1 else ''
        print(f"{p:>7}  {len(depths):>7}  {max_d:>9}  {avg_d:>9.2f}  "
              f"{d['zero']:>6}  {d['one']:>6}  {d['two_plus']:>6}  {coarse}")

    all_phyla = set(range(1, 22))
    missing = sorted(all_phyla - set(by_phylum))
    if missing:
        print()
        print(f"Phyla with zero real leaves: {missing} "
              f"(expected for #21, a deliberate empty catch-all — verify any others.)")

    return by_phylum


if __name__ == '__main__':
    run_check()
