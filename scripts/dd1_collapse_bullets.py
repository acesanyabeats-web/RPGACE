#!/usr/bin/env python3
"""dd1_collapse_bullets.py — DD-1's real collapse mechanism (ceo_plan_items,
"Oversight Doc Dedup & Compression" plan, Sep 23 2026).

Real problem: CLAUDE.md's "Current state" section (245,545 chars, 59% of
the whole file) is supposed to hold one-line durable facts per the file's
own July 31 rule, but has re-bloated into a second changelog -- full
dated narrative that's ALSO already told in full in patch_notes.html.

This script does the collapse mechanically and safely for a batch of
CONFIRMED-matched bullets (rule 4/Q2's own interrogated threshold: only
collapse where the full story is confirmed already elsewhere -- never
invented or guessed): each bullet is a single physical line in CLAUDE.md
(this project's own convention -- no bullet wraps across lines). For each
one:
  1. Find the line by a short, unique substring (never the whole bullet
     text -- avoids transcription risk on a multi-KB line).
  2. Verify it's the ONLY line matching that substring (fail loud if 0 or
     2+ matches -- never silently touch the wrong line).
  3. Append the FULL original line verbatim into CLAUDE_archive.md under
     a new dated section (nothing is ever deleted, same standing
     discipline as the July 31 prune).
  4. Replace the line in CLAUDE.md with a real, durable one-line fact +
     a real markdown link into patch_notes.html's newly-anchored card
     (see scripts/patch_notes_add_anchors.py) -- one-way only (Q2's
     confirmed answer), never a back-link from the card.

Usage: python3 scripts/dd1_collapse_bullets.py <batch_module.py> [--dry-run]
  <batch_module.py> defines BULLETS = [(find_substr, new_oneliner), ...]
"""
import importlib.util
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CLAUDE_MD = REPO_ROOT / "CLAUDE.md"
ARCHIVE_MD = REPO_ROOT / "CLAUDE_archive.md"


def load_batch(path):
    spec = importlib.util.spec_from_file_location("batch", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.BULLETS, getattr(mod, "ARCHIVE_HEADER", None)


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/dd1_collapse_bullets.py <batch_module.py> [--dry-run]")
        sys.exit(1)
    batch_path = sys.argv[1]
    dry = "--dry-run" in sys.argv

    bullets, archive_header = load_batch(batch_path)
    lines = CLAUDE_MD.read_text(encoding="utf-8").split("\n")

    results = []
    errors = []
    for find_substr, new_oneliner in bullets:
        matches = [i for i, ln in enumerate(lines) if find_substr in ln]
        if len(matches) != 1:
            errors.append((find_substr, len(matches)))
            continue
        idx = matches[0]
        old_full = lines[idx]
        results.append((idx, old_full, new_oneliner))

    print(f"Batch: {batch_path}")
    print(f"  {len(results)} bullet(s) matched exactly once, {len(errors)} error(s)")
    for find_substr, n in errors:
        print(f"  ERROR: '{find_substr[:60]}...' matched {n} lines (expected 1) -- SKIPPED")
    if errors:
        print("\nFix the batch file's find_substr values before re-running -- refusing to")
        print("touch anything while any bullet is ambiguous or missing.")
        sys.exit(1)

    total_old_chars = sum(len(o) for _, o, _ in results)
    total_new_chars = sum(len(n) for _, _, n in results)
    print(f"\n  Old total: {total_old_chars:,} chars")
    print(f"  New total: {total_new_chars:,} chars")
    print(f"  Reduction: {total_old_chars - total_new_chars:,} chars")

    if dry:
        print("\n--dry-run: no files written.")
        for idx, old, new in results:
            print(f"\n[line {idx}] OLD ({len(old)} chars): {old[:100]}...")
            print(f"[line {idx}] NEW ({len(new)} chars): {new}")
        return

    # Build archive block
    archive_lines = []
    if archive_header:
        archive_lines.append(archive_header)
        archive_lines.append("")
    for _, old_full, _ in results:
        archive_lines.append(old_full)
    archive_block = "\n".join(archive_lines) + "\n"

    with ARCHIVE_MD.open("a", encoding="utf-8") as f:
        f.write("\n" + archive_block)

    # Apply replacements to CLAUDE.md (by line index, back-to-front doesn't
    # matter here since we're replacing whole lines in place by index)
    for idx, _, new_oneliner in results:
        lines[idx] = new_oneliner

    CLAUDE_MD.write_text("\n".join(lines), encoding="utf-8")

    print(f"\nWrote {len(results)} collapsed one-liner(s) to CLAUDE.md")
    print(f"Appended {len(results)} full original bullet(s) to CLAUDE_archive.md")


if __name__ == "__main__":
    main()
