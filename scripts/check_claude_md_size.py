#!/usr/bin/env python3
"""check_claude_md_size.py — keeps CLAUDE.md and its topic files lean (CD-6 of
the "CLAUDE.md Debloat" plan, Oct 22 2026; replaces check_current_state_bloat.py,
which only measured one section of the old 291KB file).

Checks, all regex-only and free:
  1. SIZE — CLAUDE.md against MAX_CORE, each docs/claude/*.md against MAX_TOPIC.
     Over the limit means stories crept back in: move them to patch_notes.html /
     CLAUDE_archive.md, keep one present-tense line per fact.
  2. LINK-ROT — every patch_notes.html#<id> reference in CLAUDE.md and the topic
     files must match a live id="..." in patch_notes.html.
  3. LONG LINES (report only) — any line over LONG_LINE chars is a candidate to
     split or collapse.
Exit 1 on a SIZE or LINK-ROT problem.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAX_CORE = 24000    # CLAUDE.md was 17.7KB after the Oct 22 2026 split
MAX_TOPIC = 12000   # largest topic file was ~8.5KB after the split
LONG_LINE = 1200


def main():
    core = ROOT / 'CLAUDE.md'
    topics = sorted((ROOT / 'docs/claude').glob('*.md'))
    ids = set(re.findall(r'id="([A-Za-z0-9_-]+)"', (ROOT / 'patch_notes.html').read_text()))
    problems = 0
    for path, limit in [(core, MAX_CORE)] + [(p, MAX_TOPIC) for p in topics]:
        text = path.read_text()
        rel = path.relative_to(ROOT)
        size = len(text)
        flag = 'OVER' if size > limit else 'ok'
        if size > limit:
            problems += 1
        print(f'{flag:4} {size:6d}/{limit} {rel}')
        for ref in sorted(set(re.findall(r'patch_notes\.html#([A-Za-z0-9_-]+)', text))):
            if ref not in ids:
                problems += 1
                print(f'     DEAD LINK patch_notes.html#{ref}')
        for n, line in enumerate(text.splitlines(), 1):
            if len(line) > LONG_LINE:
                print(f'     long line {rel}:{n} ({len(line)} chars)')
    print('PASS' if not problems else f'FAIL ({problems})')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
