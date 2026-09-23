#!/usr/bin/env python3
"""patch_notes_add_anchors.py — real, standing tooling for DD-1's own
retrofit (real /interrogation Sep 23 2026, Alex: "2 but in batches i
feel" — full retrofit across all 424 patch_notes.html cards, done
incrementally rather than in one giant pass).

Real problem this solves: CLAUDE.md's "Current state" collapse work
(DD-1) needs a real, working pointer from a durable one-liner into the
FULL story a patch_notes.html card already carries — a prose reference
("see the Sep 22 card") isn't a real link a future session/build pass
can jump to directly. Every card currently has zero id attribute.

Idempotent by design (rule 8): re-running against a card that already
has a real id leaves it untouched, so a partial batch can always be
safely re-run or extended with a new date filter without disturbing
already-anchored cards.

Deterministic id scheme: card-YYYY-MM-DD-<slug>, slug = first ~6
significant words of the title (emoji/punctuation stripped, kebab-case).
Collisions (several cards share a date, e.g. 15+ Sep 17 cards) resolved
with a numeric suffix, stable given a fixed processing order (file
order, top to bottom = newest-first).

Usage: python3 scripts/patch_notes_add_anchors.py <Month> [--dry-run]
  e.g. python3 scripts/patch_notes_add_anchors.py Sep
  Always run --dry-run first and inspect the id list before the real
  write pass.
"""
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PATCH_NOTES = REPO_ROOT / "patch_notes.html"

MONTH_RE = r'(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
YEAR_DEFAULT = 2026  # this project's whole real timeline is 2026

# Real bug found and fixed Sep 23 2026: the Aug-batch anchor pass silently
# found 0 Jul cards, not because none exist (100 real ones do) but because
# this project's own patch_notes.html writes "July 31" in FULL for that
# one month only (every other month uses a 3-letter abbreviation) -- the
# original abbreviation-only MONTH_RE never matched it. Normalize any
# captured month text down to its 3-letter code before comparing/building
# an id, so a --month filter of "Jul" correctly matches "July" too.
def norm_month(raw):
    return raw[:3].capitalize()

STOPWORDS = {'a', 'the', 'and', 'of', 'to', 'for', 'is', 'in', 'on', 'this'}


def slugify(title, max_words=6):
    # Strip any inline HTML first (real bug found Sep 23 2026 -- 69 of 424
    # card titles contain a nested <code>/<b> tag, e.g. "...found via
    # Alex's own DevTools flame chart: <code>something</code>" -- leaving
    # tags in would leak literal words like "code" into the slug).
    t = re.sub(r'<[^>]+>', ' ', title)
    # Strip the leading date fragment + emoji/punctuation, keep real words
    t = re.sub(r'^[^\w]*' + MONTH_RE + r'\s*\d{1,2}(,?\s*\d{4})?\s*[—\-–:]*\s*', '', t.strip())
    t = re.sub(r'[^\w\s-]', ' ', t)  # strip remaining punctuation/emoji
    words = [w.lower() for w in t.split() if w]
    kept = [w for w in words if w.lower() not in STOPWORDS][:max_words]
    if not kept:
        kept = words[:max_words] or ['card']
    return '-'.join(kept)


CARD_RE = re.compile(
    # Real bug found Sep 23 2026: the title group used to be [^<]*, which
    # silently skipped any card whose title has inline markup (a nested
    # <code>/<b> tag) -- 69 of 424 real cards, undercounting every batch
    # run before this fix. DOTALL + non-greedy up to the FIRST </div>
    # correctly closes on card-title's own closing tag (a title never
    # nests a real <div>, only inline tags), while still capturing any
    # inline markup so it can be stripped in slugify() instead of ignored.
    r'(<div class="card([^"]*)"((?:\s+id="[^"]*")?)([^>]*)>)\s*<div class="card-title">(.*?)</div>',
    re.DOTALL,
)


def process(text, month_filter):
    used_ids = set(re.findall(r'\bid="(card-[^"]*)"', text))
    out = []
    last_end = 0
    changes = []
    for m in CARD_RE.finditer(text):
        full_open, cls_extra, existing_id, other_attrs, title = m.groups()
        if existing_id:
            continue  # idempotent: already anchored, leave untouched
        dm = re.search(MONTH_RE + r'\s+(\d{1,2})', title)
        if not dm or norm_month(dm.group(1)) != norm_month(month_filter):
            continue
        mon, day = norm_month(dm.group(1)), int(dm.group(2))
        slug = slugify(title)
        base_id = f"card-{YEAR_DEFAULT}-{{:02d}}-{{:02d}}-{{}}".format(
            {'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
             'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12}[mon],
            day, slug,
        )
        cand = base_id
        n = 2
        while cand in used_ids:
            cand = f"{base_id}-{n}"
            n += 1
        used_ids.add(cand)
        new_open = f'<div class="card{cls_extra}" id="{cand}"{other_attrs}>'
        changes.append((cand, title.strip()[:80]))
        out.append((m.start(1), m.end(1), new_open))

    if not changes:
        return text, changes

    # apply replacements back-to-front so earlier offsets stay valid
    new_text = text
    for start, end, replacement in sorted(out, key=lambda x: -x[0]):
        new_text = new_text[:start] + replacement + new_text[end:]
    return new_text, changes


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/patch_notes_add_anchors.py <Month3letter> [--dry-run]")
        sys.exit(1)
    month = sys.argv[1]
    dry = '--dry-run' in sys.argv

    text = PATCH_NOTES.read_text(encoding='utf-8')
    new_text, changes = process(text, month)

    print(f"Month filter: {month} — {len(changes)} card(s) to anchor")
    for cid, title in changes:
        print(f"  {cid}  <-  {title}")

    if dry:
        print("\n--dry-run: no file written.")
        return

    if not changes:
        print("Nothing to write.")
        return

    PATCH_NOTES.write_text(new_text, encoding='utf-8')
    print(f"\nWrote {len(changes)} new id attribute(s) to {PATCH_NOTES}")


if __name__ == '__main__':
    main()
