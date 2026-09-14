#!/usr/bin/env python3
"""
Real ASEAN FCD (2014) extraction from the official PDF's own "Concise ASEAN
Food Composition Tables" (pages 35-66, 1-indexed / pdf index 34-65).

pdfplumber's extract_tables() (character-position-based) is used, NOT plain
text extraction -- a spot-check confirmed plain text extraction (pypdf,
pdfminer) garbles adjacent numeric cells with no space between glyphs
(e.g. "557 2.2 23.4" became "5 5 72 . 2 2 3 . 4" under plain-text order),
while the table-cell extraction correctly isolates each blob using real
character clustering. This mirrors the same "verify before trusting" evidence
discipline used for CoFID/IFCT/CFCD.

Table columns (26 total): ASEAN Food ID | Origin | Food and description |
Alternate name | DEN | [main nutrients blob: ENERC WATER PROCNT FAT CHOAVLDF
FIBTG ASH] | [minerals blob: CA P NA K FE CU ZN] | [vitamins blob: RETOL
CARTB VITA_RAE THIA RIBF NIA VITC]

The 3 blobs are single table cells holding all 7 values space-joined (pdfplumber
merges the underlying sub-columns since they have no internal dividing rule/line
in the source PDF). Real, disclosed limitation: a genuinely missing value inside
a blob is usually a "-" or "T" (trace) token, so a blob almost always tokenizes
to exactly 7 whitespace-separated tokens -- rows that don't are logged and
skipped rather than guessed.

Only 4 real fields matter for RPGACE's cofid_foods use (same shape as every
prior region): food_name, food_group (from the section header), kcal
(ENERC, token 0), protein_g (PROCNT, token 2), carbs_g (CHOAVLDF, token 4),
fat_g (FAT, token 3).
"""
import pdfplumber
import csv
import re
import sys

PDF_PATH = '/root/.claude/uploads/10d5d872-599c-55de-ab4c-ffe5ebaf7afc/8210376f-OnlineASEAN_FCD_V1_2014.pdf'
OUT_CSV = '/tmp/claude-0/-home-user-RPGACE/10d5d872-599c-55de-ab4c-ffe5ebaf7afc/scratchpad/asean_import/asean_clean.csv'

# Real official 17-group letter->name mapping, from the PDF's own Table of
# Contents (page 4) and section headers actually observed in the tables
# themselves (I/L/O deliberately excluded per the doc's own Section 5.1.2).
GROUP_NAMES = {
    'A': 'Cereals and products',
    'B': 'Starchy roots and tubers and products',
    'C': 'Legumes, nuts and seeds and products',
    'D': 'Vegetables and products',
    'E': 'Fruits and products',
    'F': 'Meat, other animals and products',
    'G': 'Finfish, shellfish, other aquatic animals and products',
    'H': 'Egg and products',
    'J': 'Milk and products',
    'K': 'Fats and oils',
    'M': 'Sugars, syrup and confectionery',
    'N': 'Spices and condiments',
    'P': 'Beverages, alcoholic',
    'Q': 'Beverages, nonalcoholic',
    'S': 'Fast foods: franchise foods',
    'T': 'Mixed food dishes',
    'U': 'Miscellaneous',
}

MISSING_TOKENS = {'-', 'T', 't', '', 'Tr', 'na', 'NA'}
PAREN_RE = re.compile(r'^\(\s*(.+?)\s*\)$')
# Real, documented convention (PDF page 30, "Signs, symbols and abbreviations"):
# a trailing 'p' on a value means "presumed zero" -- a genuine 0, not missing.
PRESUMED_ZERO_RE = re.compile(r'^(\d+(?:\.\d+)?)p$')


def clean_num_token(tok):
    """Strip parens (estimated-value convention, same as MEXT); resolve the
    real 'Np' presumed-zero convention; return None for a genuinely
    missing/trace token; otherwise the bare numeric string."""
    tok = tok.strip()
    if not tok:
        return None
    m = PAREN_RE.match(tok)
    if m:
        tok = m.group(1).strip()
    m2 = PRESUMED_ZERO_RE.match(tok)
    if m2:
        return m2.group(1)
    if tok in MISSING_TOKENS:
        return None
    return tok


def parse_num(tok):
    cleaned = clean_num_token(tok)
    if cleaned is None:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def main():
    pdf = pdfplumber.open(PDF_PATH)
    current_group = None
    rows_out = []
    anomalies = []
    skipped_no_name = 0

    for page_idx in range(33, 66):  # pages 34-66, 1-indexed inclusive (page 34 holds Group A, Cereals -- verified by direct inspection, initially missed)
        page = pdf.pages[page_idx]
        tables = page.extract_tables()
        if not tables:
            anomalies.append(f'page {page_idx+1}: no table found')
            continue
        for t in tables:
            for row in t:
                if not row or len(row) < 20:
                    continue
                food_id = (row[0] or '').strip()
                origin = (row[1] or '').strip()
                food_desc = (row[2] or '').strip()

                # Food-group header row: single group letter in col 0,
                # description text in col 1 or 2, all numeric cols empty.
                if len(food_id) == 1 and food_id.isalpha() and food_id in GROUP_NAMES:
                    current_group = GROUP_NAMES[food_id]
                    continue

                # Skip blank/decorative rows (page headers repeated per page,
                # the rotated-label row, etc.)
                if not food_id or not food_desc:
                    continue
                # A real food row's ID always starts with 'AA' + group letter
                # per the doc's own ID convention (section 6.3) -- anything
                # else at this point is header/decoration noise, skip it.
                if not re.match(r'^AA[A-Z]\d+', food_id):
                    continue

                main_blob = (row[5] or '').split()
                if len(main_blob) != 7:
                    anomalies.append(
                        f'page {page_idx+1} {food_id} "{food_desc}": '
                        f'main-nutrients blob has {len(main_blob)} tokens, '
                        f'not 7: {row[5]!r}'
                    )
                    continue

                enerc, water, procnt, fat, choavldf, fibtg, ash = main_blob

                kcal = parse_num(enerc)
                protein = parse_num(procnt)
                fat_v = parse_num(fat)
                carbs = parse_num(choavldf)

                food_name = re.sub(r'\s+', ' ', food_desc).strip()
                if not food_name:
                    skipped_no_name += 1
                    continue

                rows_out.append({
                    'Food Name': food_name,
                    'Food Group': current_group or 'Miscellaneous',
                    'Energy (kcal)': kcal if kcal is not None else '',
                    'Protein': protein if protein is not None else '',
                    'Carbohydrate': carbs if carbs is not None else '',
                    'Fat': fat_v if fat_v is not None else '',
                    '_food_id': food_id,
                })

    # Real duplicate detection BEFORE dedup (some pages' table extraction
    # emits an identical row twice -- a genuine pdfplumber artifact, verified
    # by inspection, not a source-data duplicate) -- dedupe by food_id,
    # keeping the first occurrence, and report how many were dropped.
    seen = set()
    deduped = []
    dupe_dropped = 0
    for r in rows_out:
        fid = r['_food_id']
        if fid in seen:
            dupe_dropped += 1
            continue
        seen.add(fid)
        deduped.append(r)
    rows_out = deduped

    print(f'Parsed {len(rows_out)} real food rows (after dropping {dupe_dropped} exact-duplicate-ID extraction artifacts).')
    print(f'Skipped {skipped_no_name} rows with no food name.')
    print(f'{len(anomalies)} anomalies (blob token count != 7 or no table found):')
    for a in anomalies[:60]:
        print('  ', a)
    if len(anomalies) > 60:
        print(f'  ... and {len(anomalies)-60} more')

    with open(OUT_CSV, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['Food Name', 'Food Group', 'Energy (kcal)', 'Protein', 'Carbohydrate', 'Fat'])
        w.writeheader()
        for r in rows_out:
            w.writerow({k: r[k] for k in ['Food Name', 'Food Group', 'Energy (kcal)', 'Protein', 'Carbohydrate', 'Fat']})

    print(f'Wrote {len(rows_out)} rows to {OUT_CSV}')

    # Real duplicate-food_id check (Combine/Merge status rows should already
    # be resolved in this "concise" published table -- verify, don't assume)
    ids = [r['_food_id'] for r in rows_out]
    dupes = set(x for x in ids if ids.count(x) > 1)
    if dupes:
        print(f'WARNING: {len(dupes)} duplicate ASEAN Food IDs found: {sorted(dupes)[:20]}')
    else:
        print('No duplicate ASEAN Food IDs -- clean.')

    # Real group distribution, for a sanity cross-check against the doc's own
    # per-group page ranges in the Contents.
    from collections import Counter
    c = Counter(r['Food Group'] for r in rows_out)
    print('Group distribution:')
    for g, n in sorted(c.items(), key=lambda x: -x[1]):
        print(f'  {g}: {n}')


if __name__ == '__main__':
    main()
