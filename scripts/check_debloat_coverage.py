#!/usr/bin/env python3
"""check_debloat_coverage.py — CD-0 of the "CLAUDE.md Debloat" plan (Oct 22 2026).

Guards the CLAUDE.md split against silently dropping a fact. The old file's
identifiers (backticked names, patch_notes anchors, repo paths) are frozen
into docs/claude/debloat_inventory.json. Every item must then be found in a
live doc (CLAUDE.md, docs/claude/*.md, .claude/skills/*/SKILL.md) or be
listed in docs/claude/archived_only.txt (items that are history now and live
only in CLAUDE_archive.md). The archive must hold every item either way.

Usage:
  python3 scripts/check_debloat_coverage.py --freeze <old CLAUDE.md>
  python3 scripts/check_debloat_coverage.py          # check; exit 1 on gaps
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INV = ROOT / 'docs/claude/debloat_inventory.json'
ARCHIVED_ONLY = ROOT / 'docs/claude/archived_only.txt'


def extract(text):
    items = set(re.findall(r'`([^`\n]{2,120})`', text))
    items |= {'patch_notes.html#' + a for a in re.findall(r'patch_notes\.html#([\w-]+)', text)}
    items |= set(re.findall(r'\b(?:records|scripts|api|study|docs|graphify-out|\.claude)/[\w./\-{},*]+[\w}*]', text))
    return sorted(items)


def live_text():
    parts = [(ROOT / 'CLAUDE.md').read_text()]
    parts += [p.read_text() for p in sorted((ROOT / 'docs/claude').glob('*.md'))]
    parts += [p.read_text() for p in sorted((ROOT / '.claude/skills').glob('*/SKILL.md'))]
    return '\n'.join(parts)


def main():
    if len(sys.argv) == 3 and sys.argv[1] == '--freeze':
        items = extract(Path(sys.argv[2]).read_text())
        INV.write_text(json.dumps(items, indent=0))
        print(f'froze {len(items)} items -> {INV.relative_to(ROOT)}')
        return 0
    items = json.loads(INV.read_text())
    live = live_text()
    archive = (ROOT / 'CLAUDE_archive.md').read_text()
    allowed = set()
    if ARCHIVED_ONLY.exists():
        allowed = {l.strip() for l in ARCHIVED_ONLY.read_text().splitlines()
                   if l.strip() and not l.startswith('# ')}
    missing_live = [i for i in items if i not in live and i not in allowed]
    missing_archive = [i for i in items if i not in archive and i not in live]
    print(f'inventory {len(items)} | live-missing {len(missing_live)} | '
          f'archived-only {len(allowed)} | lost entirely {len(missing_archive)}')
    for i in missing_live:
        print('  NOT IN LIVE DOCS:', i)
    for i in missing_archive:
        print('  LOST (not in archive either):', i)
    return 1 if (missing_live or missing_archive) else 0


if __name__ == '__main__':
    sys.exit(main())
