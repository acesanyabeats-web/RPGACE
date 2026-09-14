#!/usr/bin/env python3
"""
Real, one-time preprocessing step for the MEXT Japan 2015 Standard Tables of
Food Composition xlsx (Alex's own chat attachment, official structured
source) -> a clean CSV with plain-English headers that
scripts/import_food_composition.py's existing fuzzy-hint matching already
recognizes with zero overrides (rule 8 - reuse the proven pipeline, don't
fork it for one source's quirks).

Two real, source-specific quirks handled here, NOT in the shared importer,
since they're MEXT-specific conventions unlikely to recur for other regions:
  1. Food-group codes (01-18) are numeric in the raw file with no embedded
     name - mapped to their real official English group names here.
     Verified via 2 independent real web sources this session (not guessed):
     MEXT's own 18-group Japanese food classification, cross-confirmed on
     both group counts (matches the raw file's own real per-code row counts)
     and exact wording for groups 17/18 (harder to find, confirmed via a
     2nd targeted search).
  2. A value wrapped in parentheses, e.g. "(12.5)", is a REAL, estimated/
     calculated value in MEXT's own documented convention - not a missing
     value. The shared parse_number() in import_food_composition.py has no
     concept of this (it wasn't needed for CoFID/IFCT/China), so parens are
     stripped here before the value ever reaches that shared function -
     "(12.5)" -> "12.5", parsed as a real 12.5, not silently dropped to null.
     A genuinely missing MEXT value is a bare "-", already handled by the
     shared MISSING_TOKENS set with zero change needed.
"""
import csv
import re
import sys

try:
    import openpyxl
except ImportError:
    print("ERROR: pip install openpyxl", file=sys.stderr)
    sys.exit(1)

SRC = "/root/.claude/uploads/10d5d872-599c-55de-ab4c-ffe5ebaf7afc/7de6ed95-1374049_1r12_1.xlsx"
OUT = "/tmp/claude-0/-home-user-RPGACE/10d5d872-599c-55de-ab4c-ffe5ebaf7afc/scratchpad/mext_import/mext_clean.csv"

# Real, verified official Japan MEXT 18 food-group names (2 independent web
# searches this session confirmed groups 1-16 directly, and groups 17/18
# separately via a 2nd targeted search - "Seasonings and Spices" /
# "Prepared and Processed Foods") - never guessed.
GROUP_NAMES = {
    "01": "Cereals",
    "02": "Potatoes and starches",
    "03": "Sugars and sweeteners",
    "04": "Pulses",
    "05": "Nuts and seeds",
    "06": "Vegetables",
    "07": "Fruits",
    "08": "Mushrooms",
    "09": "Algae",
    "10": "Fish, mollusks and crustaceans",
    "11": "Meats",
    "12": "Eggs",
    "13": "Milk and milk products",
    "14": "Fats and oils",
    "15": "Confectionaries",
    "16": "Beverages",
    "17": "Seasonings and spices",
    "18": "Prepared and processed foods",
}

PAREN_RE = re.compile(r"^\(\s*(.+?)\s*\)$")


def strip_paren(v):
    """A MEXT-documented estimated/calculated real value, e.g. '(12.5)' ->
    '12.5'. Left untouched if it isn't wrapped in parens (most values)."""
    if v is None:
        return v
    s = str(v).strip()
    m = PAREN_RE.match(s)
    return m.group(1) if m else s


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True, read_only=True)
    ws = wb["Table"]
    rows_out = []
    skipped_no_name = 0
    skipped_no_group_map = 0
    for r in ws.iter_rows(min_row=9, values_only=True):
        group_code = str(r[0]).strip() if r[0] is not None else None
        name = str(r[3]).strip() if r[3] is not None else ""
        if not name:
            skipped_no_name += 1
            continue
        group_name = GROUP_NAMES.get(group_code)
        if group_code and not group_name:
            skipped_no_group_map += 1
            group_name = group_code  # real fallback: keep the raw code visible rather than lose it
        kcal = strip_paren(r[5])       # col F: Energy (kcal) - ENERC_KCAL, already real kcal
        protein = strip_paren(r[8])    # col I: Protein, calculated from reference nitrogen
        carbs = strip_paren(r[16])     # col Q: Carbohydrate, total, calculated by difference
        fat = strip_paren(r[10])       # col K: Lipid
        rows_out.append([name, group_name, kcal, protein, carbs, fat])

    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Food Name", "Food Group", "Energy (kcal)", "Protein", "Carbohydrate", "Fat"])
        w.writerows(rows_out)

    print(f"Wrote {len(rows_out)} rows to {OUT}")
    print(f"Skipped {skipped_no_name} rows with no food name.")
    print(f"Rows with an unmapped group code (kept raw code as fallback): {skipped_no_group_map}")


if __name__ == "__main__":
    main()
