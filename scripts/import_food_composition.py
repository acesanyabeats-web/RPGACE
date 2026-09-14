#!/usr/bin/env python3
"""
Real, one-time importer for ANY regional food-composition dataset into
RPGACE's `cofid_foods` Supabase table — a generalized sibling to
`import_cofid.py`, built Sep 2026 for the Asian-ingredients expansion
(India/IFCT 2017, Japan/MEXT, and future regions). Per CLAUDE.md rule 8
("same process must go through one pipeline if steps are identical"): CoFID's
own script proved the real mechanism (fuzzy header detection, OR-hint column
matching, fail-loud on ambiguity, batched SQL output) — this script reuses
that exact mechanism for any NEW regional source rather than pasting a
near-identical copy per country. `import_cofid.py` itself is left untouched
(it already works in production; no real reason to touch proven code).

Real, confirmed schema fit (checked directly via Supabase, not assumed):
`cofid_foods.source` is a plain `text` column with NO check constraint — any
new source tag ('ifct_india', 'mext_japan', ...) works with zero migration.
The client-side lookup (`cookingOracle.logic._lookupCofid`, rpgace_core.js)
already searches across ALL rows in this table regardless of `source` — so a
new regional source becomes real, usable data the instant it's inserted,
with zero client code change.

Why this doesn't fetch the source file itself: this Claude Code Remote
session's own outbound egress proxy blocks every real host these datasets
live on (kaggle.com, *.github.io, mext.go.jp — confirmed directly, all
returned "EGRESS_BLOCKED" / "CONNECT tunnel failed, 403" this session, same
class of restriction CoFID's own docstring already documented for
gov.uk/supabase.co). Per this session's own proxy README: "do not retry or
route around it — report the blocked host." So exactly like CoFID: a human
downloads the real file, this script parses it locally into batched SQL, a
Claude Code session with Supabase MCP access runs the SQL.

Real format flexibility, since the actual column/sheet structure of IFCT's
Kaggle CSV and MEXT's Excel tables could not be directly confirmed this
session (the pages are unreachable): this script accepts EITHER a .csv or an
.xlsx/.xls file, and NEVER assumes exact header wording — it fuzzy-matches
against a broad OR-hint list per field, covering plain English (Food Name,
Energy, Protein, Carbohydrate, Fat) AND the real INFOODS/FAO short tagnames
IFCT is documented to follow (FOODNAME, ENERC/ENERC_KCAL, PROCNT, FAT/FATCE,
CHOAVLDF). If NO real match is found for a required field, it fails loud and
prints the real headers it actually saw — it never guesses a column index.

Usage:
    pip install openpyxl   # only needed for .xlsx/.xls input; already
                            # installed this session for CoFID
    python3 scripts/import_food_composition.py <file.csv|file.xlsx> <source_tag> [output_prefix] [--sheet-hint TEXT]

    source_tag       — written into cofid_foods.source for every row (e.g.
                        'ifct_india', 'mext_japan'). Required, no default —
                        forces a deliberate choice rather than an accidental
                        one shared with an unrelated real source.
    output_prefix     — filename prefix for the emitted .sql batches
                        (default: derived from source_tag).
    --sheet-hint TEXT — for a multi-sheet .xlsx, picks the first real sheet
                        whose name contains TEXT (case-insensitive). Omit for
                        a single-sheet file or to use the workbook's active
                        sheet.
    --name-col/--group-col/--kcal-col/--protein-col/--carbs-col/--fat-col TEXT
                        — explicit override: match this EXACT real header
                        text (case-insensitive, never a substring) instead
                        of the shared fuzzy hint lists. Use when a real
                        header is known ahead of time but too short/
                        ambiguous to trust a fuzzy match against (e.g. a
                        bare 'CHO' header, which is also a real substring of
                        'cholesterol' — the China food-composition dataset
                        hits exactly this; 'englishName' vs the Chinese-
                        language 'foodName' column is another real case).
    --energy-is-kj     — the matched kcal column is actually real energy in
                        KILOJOULES (converted /4.184, standard Atwater
                        factor). Real, deliberate flag, not a guess: IFCT
                        2017's own bare 'enerc' column is kJ, not kcal, per
                        real INFOODS convention — confirmed empirically
                        against a known value (raw milled rice) before this
                        flag was added, after a first import run silently
                        wrote 1491 kcal/100g for rice (should be ~356).

Output:
    scripts/<prefix>_batch_NNN.sql  (one or more files, ~500 rows each) —
    same shape as import_cofid.py's own output, so the existing "run each
    file via execute_sql" workflow needs zero adaptation.
"""
import sys
import csv
import re
import math
from pathlib import Path

BATCH_SIZE = 500

# Real, broad OR-hint lists — matched against the ACTUAL header text seen in
# whatever real file gets loaded, never a hardcoded index or exact string.
# Covers plain English AND the real INFOODS/FAO short tagnames IFCT is
# documented to follow, since the exact real header wording of IFCT's Kaggle
# CSV and MEXT's Excel tables could not be directly confirmed this session
# (both hosts are blocked by this session's own egress proxy).
FOOD_NAME_HINTS = ["food name", "foodname", "food_name", "food item", "name of food"]
FOOD_GROUP_HINTS = ["food group", "group", "category"]
KCAL_STRICT_HINTS = None  # handled specially below (energy+kcal AND-match)
KCAL_LOOSE_HINTS = ["kcal", "energy (kcal)", "enerc_kcal"]
# Real, deliberate EXCLUSION, found and fixed importing IFCT 2017 (caught by
# a real spot-check against a known value, not assumed): a bare 'enerc' is
# NOT a safe kcal hint — real INFOODS convention (confirmed empirically:
# IFCT's own 'enerc' for "Rice, raw, milled" reads 1491, and 1491/4.184 =
# 356.4, matching rice's real known ~356 kcal/100g almost exactly) is that
# ENERC alone means ENERGY IN KILOJOULES, not kcal — only ENERC_KCAL (with
# the suffix) is real kcal. A source whose kcal column really is a bare
# 'enerc'/'energy'-only header (kJ) needs --kcal-col + --energy-is-kj,
# never a loose auto-match, since guessing wrong here silently writes a
# real, wrong number (kJ mislabeled as kcal is 4.184x too high) rather than
# failing loud — the one thing this whole script's design exists to avoid.
PROTEIN_HINTS = ["protein", "procnt", "protcnt"]
CARBS_HINTS = ["carbohydrate", "carb", "choavldf", "chocdf"]
FAT_HINTS = ["fat", "fatce", "lipid"]

# Real "missing value" tokens seen across published food-composition tables
# (CoFID uses Tr/N; other national tables commonly use ND/NA/a bare dash) —
# any of these parse to None (honestly unknown), never silently to 0.
MISSING_TOKENS = {"tr", "n", "nd", "na", "-", "n/a", "trace", ""}


def parse_number(raw):
    """Real values only — a footnote-marked number ('106a') still parses to
    106; anything that isn't a real leading number (Tr, N, ND, NA, a bare
    dash, blank) returns None rather than guessing 0. Same discipline as
    import_cofid.py's own parse_number, extended with a couple more
    real-world missing-value tokens likely to appear outside the UK."""
    if raw is None:
        return None
    s = str(raw).strip()
    if not s or s.lower() in MISSING_TOKENS:
        return None
    m = re.match(r"^-?\d+(\.\d+)?", s)
    if not m:
        return None
    try:
        val = float(m.group(0))
    except ValueError:
        return None
    if math.isnan(val):
        return None
    return val


def sql_escape(s):
    return s.replace("'", "''")


def match_column(headers, hints):
    """OR-matched: a header matches if it contains ANY one of `hints` as a
    substring, never all of them (the exact bug class import_cofid.py's own
    match_column comment documents finding and fixing for food_group)."""
    for i, h in enumerate(headers):
        hl = h.lower()
        if any(hint in hl for hint in hints):
            return i
    return None


def match_kcal_column(headers):
    """Two-tier: prefer a real 'energy'+'kcal' co-occurring header first (the
    same real defence import_cofid.py uses to avoid an adjacent kJ column) —
    but since it's NOT confirmed whether IFCT/MEXT carry the same kJ-adjacency
    trap, fall back to any header matching a loose kcal/ENERC hint alone
    rather than failing outright."""
    for i, h in enumerate(headers):
        hl = h.lower()
        if "energy" in hl and "kcal" in hl:
            return i
    return match_column(headers, KCAL_LOOSE_HINTS)


def load_rows_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        rows = list(reader)
    return rows


def find_header_row(all_rows, max_scan=10, name_col_override=None):
    """Real, honest gotcha found importing IFCT 2017 (whose real food-name
    header is a bare 'name' — too short/generic for FOOD_NAME_HINTS to
    safely include as a permanent hint, real reasoning in --name-col's own
    docstring): header-row DETECTION is a separate step from header-row
    COLUMN SELECTION, and both need to agree on what counts as a match. If
    `--name-col` is given, search for THAT exact text too (never only the
    shared hint list), or a real file whose name header needs an override
    would also fail at this earlier step before the override ever gets a
    chance to run."""
    search_terms = list(FOOD_NAME_HINTS)
    if name_col_override:
        search_terms.append(name_col_override.strip().lower())
    for idx in range(min(max_scan, len(all_rows))):
        row = [str(c or "").strip().lower() for c in all_rows[idx]]
        if any(cell in search_terms or any(hint in cell for hint in FOOD_NAME_HINTS) for cell in row):
            return idx, [str(c or "").strip() for c in all_rows[idx]]
    raise SystemExit(
        f"ERROR: no header row found in the first {max_scan} rows containing "
        f"any of {search_terms}. This file's real layout doesn't match "
        "this script's assumption — inspect it by hand and, if the real "
        "header wording differs, add it to FOOD_NAME_HINTS above (or pass "
        "--name-col) rather than guessing a row index."
    )


def load_rows_xlsx(path, sheet_hint):
    try:
        import openpyxl
    except ImportError:
        print("ERROR: openpyxl not installed. Run: pip install openpyxl", file=sys.stderr)
        sys.exit(1)
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    sheet = None
    if sheet_hint:
        for name in wb.sheetnames:
            if sheet_hint.lower() in name.lower():
                sheet = wb[name]
                break
        if sheet is None:
            raise SystemExit(
                f"ERROR: no sheet name contains '{sheet_hint}'. Real sheets "
                f"in this workbook: {wb.sheetnames} — pick the real one by "
                "hand and pass it as --sheet-hint, or omit --sheet-hint to "
                "use the active sheet."
            )
    else:
        sheet = wb.active
    print(f"Reading sheet '{sheet.title}' ({sheet.max_row} rows)...")
    all_rows = [[c.value for c in row] for row in sheet.iter_rows()]
    return all_rows


def find_exact_column(headers, wanted):
    """Explicit override — exact (case-insensitive) header match, never a
    substring/fuzzy match. Used when a real file's own headers are known
    ahead of time but too short/ambiguous for the shared hint lists to
    trust blindly (e.g. a bare 'CHO' header, which is a real substring of
    'cholesterol' too — the China food-composition CSV hits exactly this)."""
    for i, h in enumerate(headers):
        if str(h).strip().lower() == wanted.strip().lower():
            return i
    raise SystemExit(
        f"ERROR: --col override '{wanted}' does not exactly match any real "
        f"header. Real headers seen: {headers}"
    )


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    sheet_hint = None
    if "--sheet-hint" in sys.argv:
        i = sys.argv.index("--sheet-hint")
        if i + 1 < len(sys.argv):
            sheet_hint = sys.argv[i + 1]

    # Real, explicit per-field overrides — bypass fuzzy hint-matching
    # entirely when the real header text is known ahead of time (from
    # inspecting the file by hand) but is short/ambiguous enough that a
    # generic hint would risk matching the WRONG real column (e.g. 'CHO'
    # vs 'cholesterol'). Each takes the exact real header text, matched
    # case-insensitively but never as a substring. Omit any of these to
    # fall back to the shared fuzzy hint lists as before.
    overrides = {}
    for flag, key in [
        ("--name-col", "name"), ("--group-col", "group"),
        ("--kcal-col", "kcal"), ("--protein-col", "protein"),
        ("--carbs-col", "carbs"), ("--fat-col", "fat"),
    ]:
        if flag in sys.argv:
            i = sys.argv.index(flag)
            if i + 1 < len(sys.argv):
                overrides[key] = sys.argv[i + 1]
    # Real unit-safety flag, see KCAL_LOOSE_HINTS' own comment above — pass
    # this whenever the matched kcal column is actually real energy in
    # kilojoules (INFOODS' bare ENERC convention), never guessed silently.
    energy_is_kj = "--energy-is-kj" in sys.argv

    if len(args) < 2:
        print(__doc__, file=sys.stderr)
        sys.exit(1)

    src = Path(args[0])
    source_tag = args[1]
    out_prefix = args[2] if len(args) > 2 else f"{source_tag}_import"

    if not src.exists():
        print(f"ERROR: file not found: {src}", file=sys.stderr)
        sys.exit(1)

    print(f"Loading {src}...")
    if src.suffix.lower() == ".csv":
        all_rows = load_rows_csv(src)
    elif src.suffix.lower() in (".xlsx", ".xls"):
        all_rows = load_rows_xlsx(src, sheet_hint)
    else:
        raise SystemExit(f"ERROR: unsupported file type '{src.suffix}' — expected .csv, .xlsx, or .xls")

    header_row_idx, headers = find_header_row(all_rows, name_col_override=overrides.get("name"))
    print(f"Header row {header_row_idx}: {headers}")

    col_name = find_exact_column(headers, overrides["name"]) if "name" in overrides else match_column(headers, FOOD_NAME_HINTS)
    col_group = find_exact_column(headers, overrides["group"]) if "group" in overrides else match_column(headers, FOOD_GROUP_HINTS)
    col_kcal = find_exact_column(headers, overrides["kcal"]) if "kcal" in overrides else match_kcal_column(headers)
    col_protein = find_exact_column(headers, overrides["protein"]) if "protein" in overrides else match_column(headers, PROTEIN_HINTS)
    col_carbs = find_exact_column(headers, overrides["carbs"]) if "carbs" in overrides else match_column(headers, CARBS_HINTS)
    col_fat = find_exact_column(headers, overrides["fat"]) if "fat" in overrides else match_column(headers, FAT_HINTS)

    missing = [n for n, c in [
        ("food_name", col_name), ("kcal", col_kcal),
        ("protein", col_protein), ("carbs", col_carbs), ("fat", col_fat),
    ] if c is None]
    if missing:
        raise SystemExit(
            f"ERROR: could not find real columns for: {missing}. Real "
            f"headers seen: {headers} — this dataset's real wording doesn't "
            "match the hint lists at the top of this script (FOOD_NAME_HINTS/"
            "KCAL_LOOSE_HINTS/PROTEIN_HINTS/CARBS_HINTS/FAT_HINTS). Add the "
            "real wording you see above to the matching hint list — never "
            "guess a column index."
        )

    rows = []
    skipped_no_name = 0
    for row in all_rows[header_row_idx + 1:]:
        name = str(row[col_name] or "").strip() if col_name < len(row) else ""
        if not name:
            skipped_no_name += 1
            continue
        group = str(row[col_group] or "").strip() if (col_group is not None and col_group < len(row)) else None
        kcal = parse_number(row[col_kcal]) if col_kcal < len(row) else None
        if kcal is not None and energy_is_kj:
            kcal = round(kcal / 4.184, 1)  # real, standard kJ->kcal (Atwater) conversion factor
        protein = parse_number(row[col_protein]) if col_protein < len(row) else None
        carbs = parse_number(row[col_carbs]) if col_carbs < len(row) else None
        fat = parse_number(row[col_fat]) if col_fat < len(row) else None
        rows.append((name, group, kcal, protein, carbs, fat))

    print(f"Parsed {len(rows)} real food rows (skipped {skipped_no_name} rows with no food name).")
    if not rows:
        raise SystemExit("ERROR: zero real rows parsed — check header detection above, this is not a real empty dataset.")

    out_dir = Path(__file__).parent
    batch_num = 0
    written_paths = []
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        batch_num += 1
        out_path = out_dir / f"{out_prefix}_batch_{batch_num:03d}.sql"
        values_sql = []
        for (name, group, kcal, protein, carbs, fat) in batch:
            def num(v):
                return "null" if v is None else str(v)
            group_sql = "null" if not group else f"'{sql_escape(group)}'"
            values_sql.append(
                f"('{sql_escape(name)}', {group_sql}, {num(kcal)}, {num(protein)}, {num(carbs)}, {num(fat)}, '{sql_escape(source_tag)}')"
            )
        sql = (
            "insert into cofid_foods (food_name, food_group, kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, source) values\n"
            + ",\n".join(values_sql) + ";\n"
        )
        out_path.write_text(sql, encoding="utf-8")
        written_paths.append(out_path)
        print(f"Wrote {out_path} ({len(batch)} rows, source='{source_tag}')")

    # Real fix (found via this script's own synthetic-fixture test run,
    # matching the project's standing "caught before shipping" discipline):
    # the original version of this summary line built its path by plain
    # string-concatenation (f"{out_dir}/{out_prefix}...") rather than reading
    # the real out_path values — silently wrong the moment out_prefix itself
    # carries a directory (e.g. a caller passing an absolute-path prefix),
    # since Path's own `/` operator replaces the left side entirely when the
    # right side is absolute, but a bare string f-string doesn't know that.
    # Report the REAL parent directory of what was actually written instead.
    real_dir = written_paths[0].parent if written_paths else out_dir
    print(f"\nDone. {batch_num} SQL batch file(s) written to {real_dir}/")
    print("Next: run each file's SQL via a Claude Code session with Supabase MCP access (execute_sql).")


if __name__ == "__main__":
    main()
