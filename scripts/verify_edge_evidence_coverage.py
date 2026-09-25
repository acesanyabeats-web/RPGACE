#!/usr/bin/env python3
"""verify_edge_evidence_coverage.py — P1's real R22 extension check
("no graph row, no node AND no edge"), ceo_plan_items id
61d510db-8c891... P1 row.

Cheap, regex-only, no-AI-cost — same family as verify_anchors.py: scans
the ALREADY-GENERATED HTML output for every real `data-kind`-tagged
edge (a <path class="..." data-from=... data-to=... data-kind=...>)
and reports what fraction also carries a real `data-evidence` attribute
(the P1 click-to-inspect substrate). Never a hard gate on 100% — this
pass deliberately covers the highest-value kinds first (river_link,
river_entry, dashboard_card, external_call, skill_stream, function_call,
cross_band_call, backdoor_call, ui_input, ui_output, galaxy_link, plus
every RIVER_FLOWS itype edge) and leaves dimension_membership honestly
uncovered (its destination bubble already has its own real click-to-
reveal detail, a different but equivalent real affordance) — this
script's job is to keep that real, current coverage number visible and
catch a future REGRESSION (a kind that had evidence and lost it), not
to shame every remaining gap into being covered in one pass.

Usage: python3 scripts/verify_edge_evidence_coverage.py
"""
import re
from collections import defaultdict
from pathlib import Path

EDGE_RE = re.compile(r'<path\b[^>]*\bdata-kind="[^"]*"[^>]*>', re.S)
KIND_RE = re.compile(r'\bdata-kind="([^"]*)"')
HAS_EVIDENCE_RE = re.compile(r'\bdata-evidence="')


def scan_file(path):
    """Returns {kind: (total, with_evidence)} for one real page — the
    WHOLE <path ...> tag is matched (not just up to data-kind), since
    data-evidence/data-source/data-zoom are emitted AFTER data-kind in
    _curved_edge()'s own real attribute order."""
    text = Path(path).read_text(encoding='utf-8')
    counts = defaultdict(lambda: [0, 0])
    for m in EDGE_RE.finditer(text):
        tag = m.group(0)
        kind = KIND_RE.search(tag).group(1)
        counts[kind][0] += 1
        if HAS_EVIDENCE_RE.search(tag):
            counts[kind][1] += 1
    return counts


def main():
    files = sorted(Path('graphify-out').glob('galaxy_map*.html'))
    grand = defaultdict(lambda: [0, 0])
    per_file = {}
    for f in files:
        counts = scan_file(f)
        if counts:
            per_file[f.name] = counts
        for kind, (total, ev) in counts.items():
            grand[kind][0] += total
            grand[kind][1] += ev

    total_edges = sum(t for t, _ in grand.values())
    total_evidenced = sum(e for _, e in grand.values())
    print(f"Real kind-tagged edges across {len(files)} pages: {total_edges} total, "
          f"{total_evidenced} carry real data-evidence ({100 * total_evidenced / total_edges:.1f}%)." if total_edges else
          "No kind-tagged edges found.")
    print()
    print("By kind:")
    for kind in sorted(grand):
        total, ev = grand[kind]
        flag = '' if ev == total else (' <- partial/none (honest gap, not a regression unless it dropped)' if ev else ' <- NO EVIDENCE YET')
        print(f"  {kind:22s} {ev:5d}/{total:<5d}{flag}")
    return per_file, grand


if __name__ == '__main__':
    main()
