#!/usr/bin/env python3
"""check_self_knowledge_staleness.py — the standing check named G118/SK-1
(ceo_plan_items), built Sep 23 2026 as the real follow-through on the
/paranoia oversight-doc audit (records/2026-09/oversight_docs_appendix_or_
representation_paranoia_2026-09-23.txt).

Real problem this closes: oracleAppGrounding.SELF_KNOWLEDGE (rpgace_core.js)
is the ONE oversight artifact actually wired into production Oracle
replies, and it went 28 real days stale (Aug 26 -> Sep 23 2026) with
nothing catching it -- rule 6 states the intended invariant ("updated in
the same session"), but nothing mechanically enforced it. This script is
that mechanical enforcement, same family as the existing Galaxy Map
headline-fact session-start checks and verify_anchors.py -- cheap,
regex-only, no AI cost, no generator run required.

Real /interrogation-confirmed design (Alex's own answers, Sep 23 2026):
  - SIGNAL: date-staleness OR real-ship-count, whichever fires first --
    date alone is the weaker signal (it's what let 28 days pass
    unnoticed); a real accumulation of patch_notes.html cards since
    SELF_KNOWLEDGE's own last-mentioned date is the sharper one.
  - THRESHOLD: >7 days since SELF_KNOWLEDGE's own newest real date-fact,
    OR 3+ real patch_notes.html cards dated after it exist unreflected.
  - ENFORCEMENT POINT: this script is the shared mechanism; it's called
    from TWO places (never duplicated, rule 8) --
      (a) the CLAUDE.md session-start check ("Galaxy Map headline facts"
          sibling bullet) -- cheap visibility report every session;
      (b) .claude/skills/Bedtime/SKILL.md Step 1 -- a real gate: if THIS
          session shipped a real patch_notes.html card that plausibly
          touches Oracle/architecture/module-count facts, and never
          touched the SELF_KNOWLEDGE line in the same commit, /Bedtime
          must flag it explicitly before closing out, not just note it
          for a future session to maybe notice.

Usage: python3 scripts/check_self_knowledge_staleness.py
  Exit code 0 = fresh (within threshold). Exit code 1 = stale (flag it).
  Prints a real, human-readable report either way -- never silent.
"""
import re
import sys
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CORE_JS = REPO_ROOT / "rpgace_core.js"
PATCH_NOTES = REPO_ROOT / "patch_notes.html"

DAYS_THRESHOLD = 7
SHIPS_THRESHOLD = 3

MONTHS = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12,
}


def extract_self_knowledge(core_js_text):
    """Real extraction, same pattern the Sep 23 2026 rewrite script used
    (a single-line JS single-quoted string literal, non-greedy DOTALL
    match on the one real declaration) -- never re-derive a second copy
    of this regex elsewhere (rule 8); import this function if another
    script ever needs the same extraction."""
    m = re.search(r"  SELF_KNOWLEDGE: '(.*?)',\n", core_js_text, re.DOTALL)
    if not m:
        return None
    return m.group(1)


def last_mentioned_date(sk_text):
    """Real, full 'Mon DD YYYY' mentions only -- a bare 'Sep 2026' with no
    day, or a day-only 'Sep 22' with no year, is deliberately NOT counted
    (too ambiguous to trust as a real date-fact citation, same discipline
    as never trusting a partial claim). Returns the MAX real date found,
    or None if the string has no full date mention at all (a real,
    honest failure mode -- flagged as maximally stale, never silently
    treated as fresh)."""
    matches = re.findall(
        r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}) (\d{4})',
        sk_text,
    )
    if not matches:
        return None
    dates = []
    for mon, day, year in matches:
        try:
            dates.append(date(int(year), MONTHS[mon], int(day)))
        except ValueError:
            continue  # a real out-of-range day (e.g. Feb 30) -- skip, don't crash
    return max(dates) if dates else None


def count_ships_since(patch_notes_text, since_date):
    """Real patch_notes.html card-title date-prefixes only ('Mon DD —',
    no year -- this project's own real convention, confirmed by direct
    read of every recent card). Year is assumed to be since_date's own
    year unless that would place the card more than ~60 days in the
    future relative to today (a real cross-year-boundary guard, so this
    doesn't silently misdate a Jan card as belonging to last year's
    December once the project timeline actually crosses a new year)."""
    titles = re.findall(r'card-title">([^<]*)', patch_notes_text)
    today = date.today()
    count = 0
    counted_titles = []
    for title in titles:
        m = re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}) ', title)
        if not m:
            continue
        mon, day = m.group(1), int(m.group(2))
        year = since_date.year
        try:
            card_date = date(year, MONTHS[mon], day)
        except ValueError:
            continue
        if (card_date - today).days > 60:
            try:
                card_date = date(year - 1, MONTHS[mon], day)
            except ValueError:
                continue
        if card_date > since_date:
            count += 1
            counted_titles.append((card_date.isoformat(), title.strip()[:80]))
    return count, counted_titles


def run_check():
    if not CORE_JS.exists() or not PATCH_NOTES.exists():
        return {
            'ok': False,
            'error': 'rpgace_core.js or patch_notes.html not found at expected repo-root paths',
        }
    core_text = CORE_JS.read_text(encoding='utf-8')
    sk_text = extract_self_knowledge(core_text)
    if sk_text is None:
        return {'ok': False, 'error': 'SELF_KNOWLEDGE property not found in rpgace_core.js'}

    last_date = last_mentioned_date(sk_text)
    today = date.today()

    if last_date is None:
        return {
            'stale': True,
            'reason': 'no full Mon-DD-YYYY date found inside SELF_KNOWLEDGE at all',
            'last_date': None,
            'days_stale': None,
            'ships_since': None,
        }

    days_stale = (today - last_date).days
    ships_since, ship_titles = count_ships_since(PATCH_NOTES.read_text(encoding='utf-8'), last_date)

    stale = (days_stale > DAYS_THRESHOLD) or (ships_since >= SHIPS_THRESHOLD)

    return {
        'stale': stale,
        'last_date': last_date.isoformat(),
        'days_stale': days_stale,
        'ships_since': ships_since,
        'ship_titles': ship_titles,
        'days_threshold': DAYS_THRESHOLD,
        'ships_threshold': SHIPS_THRESHOLD,
    }


def main():
    result = run_check()
    if 'error' in result:
        print('SELF_KNOWLEDGE CHECK: ERROR -', result['error'])
        sys.exit(1)

    if result.get('last_date') is None:
        print('SELF_KNOWLEDGE CHECK: STALE (no dated fact found at all inside the string)')
        sys.exit(1)

    status = 'STALE' if result['stale'] else 'FRESH'
    print(f"SELF_KNOWLEDGE CHECK: {status}")
    print(f"  last real date-fact inside SELF_KNOWLEDGE: {result['last_date']}")
    print(f"  days since then: {result['days_stale']} (threshold: >{result['days_threshold']})")
    print(f"  real patch_notes.html cards shipped since then: {result['ships_since']} (threshold: >={result['ships_threshold']})")
    if result['stale'] and result['ship_titles']:
        print("  cards possibly unreflected in Oracle's own self-knowledge:")
        for d, t in result['ship_titles'][:10]:
            print(f"    - {d}: {t}")
        if len(result['ship_titles']) > 10:
            print(f"    ...and {len(result['ship_titles']) - 10} more")
    if result['stale']:
        print("  ACTION NEEDED: review recent patch_notes.html cards and rewrite oracleAppGrounding.SELF_KNOWLEDGE")
        print("  (rpgace_core.js) to reflect what's real and current -- never auto-generate its content,")
        print("  this is a real semantic-judgment rewrite, same discipline as the Sep 23 2026 fix.")
    sys.exit(1 if result['stale'] else 0)


if __name__ == '__main__':
    main()
