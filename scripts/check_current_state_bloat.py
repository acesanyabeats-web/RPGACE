#!/usr/bin/env python3
"""check_current_state_bloat.py — DD-4 of the ratified "Oversight Doc Dedup
& Compression" plan (ceo_plan_items, plan "Oversight Doc Dedup &
Compression"), built Sep 23 2026 as the standing mechanism that keeps
DD-1's real collapse work from silently re-accumulating the same way
CLAUDE.md's own "Current state" section did before this plan existed
(416,057 chars at ratification, much of it re-told narrative rather than
durable fact — see this file's own doc-discipline rule and the DD-1/DD-2/
DD-3 record files in records/2026-09/).

Same family/shape as check_self_knowledge_staleness.py and
check_self_knowledge_contradictions.py: cheap, regex-only, zero AI cost,
no generator run required, never silent. Three real, independent checks:

  1. SIZE — the "Current state" section's own byte size against a real
     baseline set from DD-1's actual post-collapse measurement (taken
     immediately after DD-1/DD-2/DD-3 all shipped, Sep 23 2026), not
     guessed from a partial result (the plan's own amendment explicitly
     required this). Flags real bloat growth, the same size-based signal
     rule 11 already treats as a design constraint everywhere else in
     this project.
  2. LINK-ROT — every real `patch_notes.html#<id>` reference CLAUDE.md's
     own DD-1 collapse work created (scripts/patch_notes_add_anchors.py's
     `card-YYYY-MM-DD-<slug>` ids) is checked against patch_notes.html's
     own live `id="..."` anchors. A dangling reference is exactly the
     kind of drift rule 16 already names — a doc made false by a change
     elsewhere (here: an anchor renamed, removed, or never actually
     created).
  3. LONG-BULLET (informational only, never gates the exit code) — a
     rough proxy for "narrative creeping back into a one-line-per-fact
     section": any real bullet block over LONG_BULLET_CHARS is reported
     as a candidate for a future collapse pass. Deliberately NOT a hard
     gate, since several genuinely dense (but still durable, non-
     narrative) fact bullets already exceed this length by design and
     were reviewed and correctly kept during DD-1 (e.g. the HABITS domain
     summary, the "Skills that exist" list) — this signal exists so a
     human/future session can decide, the same "report, never silently
     auto-fix" discipline as the other two checks.

Usage: python3 scripts/check_current_state_bloat.py
  Exit code 0 = no SIZE or LINK-ROT problems found (LONG-BULLET findings
  never affect the exit code). Exit code 1 = a real SIZE and/or LINK-ROT
  problem found — flag it. Prints a real, human-readable report either
  way, same convention as check_self_knowledge_staleness.py.
"""
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CLAUDE_MD = REPO_ROOT / "CLAUDE.md"
PATCH_NOTES = REPO_ROOT / "patch_notes.html"

# Real baseline, measured directly against CLAUDE.md immediately after
# DD-1 (all 6 batches) + DD-2 + DD-3 shipped, Sep 23 2026 (commit 335e299
# and its immediate predecessors) — per the plan's own amendment, this
# must be a real post-collapse number, never guessed ahead of the work.
BASELINE_CHARS = 79917
GROWTH_THRESHOLD_PCT = 0.25  # 25% real growth allowance before flagging —
# generous enough that a session adding real new durable facts (a new
# domain shipping, a new open fork) doesn't trip this on ordinary
# development, tight enough to catch the section re-bloating back toward
# its pre-DD-1 size before that happens silently across many sessions.

LONG_BULLET_CHARS = 2500  # informational only, see module docstring

SECTION_START = r'^## Current state'
SECTION_END = r'^## Who you.re working with'


def extract_current_state(claude_md_text):
    """Real extraction of CLAUDE.md's own 'Current state' section, same
    boundary markers used throughout this project's own DD-1 collapse
    work. Returns None if either boundary heading is missing (a real,
    honest failure — CLAUDE.md's own structure has changed and this
    script needs a human to re-point it, never silently matches nothing)."""
    m = re.search(
        r'(?ms)' + SECTION_START + r'.*?(?=' + SECTION_END + r')',
        claude_md_text,
    )
    return m.group(0) if m else None


def find_dangling_links(claude_md_text, patch_notes_text):
    """Real link-rot check: every patch_notes.html#<id> reference in
    CLAUDE.md, checked against patch_notes.html's own live id="..."
    anchors. Returns (all_refs_count, dangling_list) — dangling_list is
    a sorted list of (ref_id, count_of_uses) for anything referenced but
    not actually present as a real anchor."""
    refs = re.findall(r'patch_notes\.html#([a-zA-Z0-9_-]+)', claude_md_text)
    real_ids = set(re.findall(r'id="([a-zA-Z0-9_-]+)"', patch_notes_text))
    from collections import Counter
    ref_counts = Counter(refs)
    dangling = sorted(
        (ref_id, count) for ref_id, count in ref_counts.items()
        if ref_id not in real_ids
    )
    return len(refs), len(set(refs)), dangling


def find_long_bullets(section_text):
    """Real, informational-only proxy: split the Current-state section
    into bullet blocks (a line starting with '- ' or '**' at column 0
    starts a new block, matching this project's own real bullet
    conventions), report any block over LONG_BULLET_CHARS. Never gates
    the exit code — see module docstring."""
    lines = section_text.split('\n')
    blocks = []
    cur = []
    for line in lines:
        if re.match(r'^- ', line) or re.match(r'^\*\*', line):
            if cur:
                blocks.append('\n'.join(cur))
            cur = [line]
        else:
            cur.append(line)
    if cur:
        blocks.append('\n'.join(cur))

    long_blocks = [
        (len(b), b.strip()[:80].replace('\n', ' '))
        for b in blocks
        if len(b) > LONG_BULLET_CHARS
    ]
    return sorted(long_blocks, reverse=True)


def run_check():
    if not CLAUDE_MD.exists() or not PATCH_NOTES.exists():
        return {'ok': False, 'error': 'CLAUDE.md or patch_notes.html not found at expected repo-root paths'}

    claude_text = CLAUDE_MD.read_text(encoding='utf-8')
    patch_text = PATCH_NOTES.read_text(encoding='utf-8')

    section = extract_current_state(claude_text)
    if section is None:
        return {'ok': False, 'error': "CLAUDE.md's own 'Current state' section boundaries not found (heading text may have changed)"}

    current_chars = len(section)
    threshold_chars = int(BASELINE_CHARS * (1 + GROWTH_THRESHOLD_PCT))
    size_bloated = current_chars > threshold_chars

    total_refs, unique_refs, dangling = find_dangling_links(claude_text, patch_text)
    long_bullets = find_long_bullets(section)

    return {
        'current_chars': current_chars,
        'baseline_chars': BASELINE_CHARS,
        'threshold_chars': threshold_chars,
        'size_bloated': size_bloated,
        'total_refs': total_refs,
        'unique_refs': unique_refs,
        'dangling': dangling,
        'long_bullets': long_bullets,
    }


def main():
    result = run_check()
    if 'error' in result:
        print('CURRENT-STATE BLOAT CHECK: ERROR -', result['error'])
        sys.exit(1)

    problem = result['size_bloated'] or bool(result['dangling'])
    status = 'PROBLEM FOUND' if problem else 'CLEAN'
    print(f"CURRENT-STATE BLOAT CHECK: {status}")

    print(f"  [SIZE] Current-state section: {result['current_chars']} chars "
          f"(baseline {result['baseline_chars']}, threshold {result['threshold_chars']} "
          f"= baseline + {int(GROWTH_THRESHOLD_PCT * 100)}%)")
    if result['size_bloated']:
        over_pct = (result['current_chars'] / result['baseline_chars'] - 1) * 100
        print(f"    BLOATED: {over_pct:.1f}% over baseline — consider a real collapse pass "
              f"(same discipline as DD-1's own domain-by-domain sweep).")

    print(f"  [LINK-ROT] {result['unique_refs']} unique patch_notes.html#<id> references "
          f"({result['total_refs']} total uses)")
    if result['dangling']:
        print(f"    {len(result['dangling'])} DANGLING reference(s) — id not found in patch_notes.html:")
        for ref_id, count in result['dangling']:
            print(f"      - #{ref_id} (referenced {count}x)")
    else:
        print("    all references resolve to a real anchor.")

    print(f"  [LONG-BULLET, informational only] {len(result['long_bullets'])} bullet(s) over "
          f"{LONG_BULLET_CHARS} chars (never gates this check's exit code):")
    for length, snippet in result['long_bullets'][:10]:
        print(f"      - {length} chars: {snippet}")
    if len(result['long_bullets']) > 10:
        print(f"      ...and {len(result['long_bullets']) - 10} more")

    if problem:
        print("  ACTION NEEDED: review the SIZE/LINK-ROT findings above. A SIZE bloat needs a real")
        print("  collapse pass (grep each new narrative-style bullet against patch_notes.html's own")
        print("  cards, same DD-1 discipline). A dangling link needs either a real anchor fix in")
        print("  patch_notes.html or a corrected reference in CLAUDE.md — never delete the link")
        print("  silently without checking which side actually broke.")
    sys.exit(1 if problem else 0)


if __name__ == '__main__':
    main()
