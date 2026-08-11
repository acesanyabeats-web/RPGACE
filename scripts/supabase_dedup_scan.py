#!/usr/bin/env python3
"""
supabase_dedup_scan.py — Aug 11, real Alex ask: "I think all supabase
tables should also run /deduplications too... make this a constantly
updating framework... always make this happen, always."

Real, bounded scope (per the compiled /CEO Loop 1 + /paranoia design,
records/2026-08/archive_diagnostic_and_supabase_dedup_ceo_paranoia_2026-08-11.txt,
Fork 1 answered "yes do all" = both the staleness-check extension AND
this scanner): the Aug 11 hand-check of all 35 tables found ZERO real
table-level duplication. This script exists as real, on-demand insurance
against future drift, not a fix for a live bug — run it whenever a
table this session touched gains real new rows/a schema change
(/update-logging-system artifact 14), or as a full pass at /Bedtime.

Method: the SAME real pattern `intelDedup` already uses in production —
a normalized-key EXACT match (lowercased, whitespace-collapsed, a
URL/title fallback chain), never fuzzy similarity. A false "no
duplicates" is safer than a false positive that tempts an auto-merge
later — this script only ever REPORTS, it never writes anything back to
Supabase. A human (Alex) always reviews and acts on a finding, same
discipline as every other RPGACE mechanism that touches real data.

Scope: read-only, the plain anon/publishable key — the exact same value
already public in rpgace_core.js's own client config, so this script
needs no more privilege than a browser tab already has. Same
urllib.request pattern rpgace_intel.py already uses against this same
project — no new dependency.

Known environment note: Claude Code Remote's own outbound proxy in this
project's sandboxed sessions blocks raw requests to supabase.co directly
(confirmed earlier this session) — run this from Alex's own machine, a
session with a different network policy, or adapt it to call through
mcp__Supabase__execute_sql instead of urllib if running inside a
Claude Code Remote session that has that tool but not raw network
access. The dedup LOGIC below is the real, reusable part regardless of
which transport fetches the rows.

Usage:
    python3 scripts/supabase_dedup_scan.py                # all configured tables
    python3 scripts/supabase_dedup_scan.py encyclopedia    # one table

Output: a printed report + a dated record file under records/YYYY-MM/.
Findings only — nothing is deleted or merged.
"""
import sys
import os
import re
import json
import ssl
import collections
import datetime
import urllib.request
import urllib.error

SB_URL = "https://gripopghczmrbrhqtqbm.supabase.co"
SB_KEY = "sb_publishable_0Z8C5X-FOLrw95VYKxZVCw_4golMyXf"
HEADERS = {"apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY}

_SSL_CTX = ssl.create_default_context()


def sb_get(table, select="*"):
    url = "{}/rest/v1/{}?select={}".format(SB_URL, table, select)
    req = urllib.request.Request(url, headers=HEADERS, method="GET")
    with urllib.request.urlopen(req, timeout=30, context=_SSL_CTX) as r:
        return json.loads(r.read().decode("utf-8"))


def norm(s):
    """Same normalization discipline intelDedup already uses in
    production: lowercase, strip protocol/www, strip trailing slash,
    collapse whitespace."""
    if not s:
        return ""
    s = str(s).strip().lower()
    s = re.sub(r"^https?://(www\.)?", "", s)
    s = re.sub(r"/+$", "", s)
    s = re.sub(r"\s+", " ", s)
    return s


# table -> identity/scope rules. `identity` builds the normalized key two
# rows are compared on; `scope` (optional) partitions rows FIRST so a
# same-name collision in a genuinely different context is never flagged
# (e.g. two taxonomy_tree leaves named the same thing under different
# parents are not a duplicate — same real discipline the taxonomy
# placement engine's own per-chapter leaf-name dedup already applies).
TABLE_CONFIG = {
    "encyclopedia": {
        "identity": lambda r: norm(r.get("title")),
        "scope": None,
    },
    "intel_reports": {
        "identity": lambda r: norm(r.get("url")) or norm(r.get("title")),
        "scope": None,
    },
    "intel_bibliography": {
        "identity": lambda r: norm(r.get("url")) or norm(r.get("title")),
        "scope": None,
    },
    "bibliography": {
        # real schema (checked Aug 11, not guessed): id, book_id, title,
        # source_url, total_chapters, total_insights_placed, phyla_touched,
        # completed_at — no author column exists.
        "identity": lambda r: norm(r.get("title")),
        "scope": None,
    },
    "reference_tracks": {
        "identity": lambda r: norm(r.get("title")) + "|" + norm(r.get("artist")),
        "scope": None,
    },
    "taxonomy_tree": {
        "identity": lambda r: norm(r.get("name")),
        "scope": lambda r: r.get("parent_id"),
    },
    "conid_pot": {
        "identity": lambda r: norm(r.get("idea_text"))[:80],
        "scope": None,
    },
    "content_productions": {
        # real column is `title` (checked Aug 11) — `beat_title` doesn't exist.
        "identity": lambda r: norm(r.get("title")),
        "scope": None,
    },
    "oracle_dev_suggestions": {
        # real column is `suggestion_text` (checked Aug 11) — `suggestion`/
        # `prompt`/`text` don't exist.
        "identity": lambda r: norm(r.get("suggestion_text"))[:80],
        "scope": None,
    },
}


def scan_table(table):
    cfg = TABLE_CONFIG.get(table)
    if not cfg:
        return None, "no identity rule defined for '{}' — skipped, not scanned blind (add a rule to TABLE_CONFIG before including it)".format(table)
    try:
        rows = sb_get(table)
    except (urllib.error.URLError, urllib.error.HTTPError) as e:
        return None, "fetch failed: {} (network-blocked sandbox? see module docstring)".format(e)
    groups = collections.defaultdict(list)
    for r in rows:
        key = cfg["identity"](r)
        if not key or key == "|":
            continue
        scope = cfg["scope"](r) if cfg["scope"] else None
        groups[(scope, key)].append(r.get("id"))
    dupes = {k: v for k, v in groups.items() if len(v) > 1}
    return dupes, None


def main():
    targets = sys.argv[1:] or list(TABLE_CONFIG.keys())
    now = datetime.datetime.utcnow()
    lines = ["# Supabase dedup scan — " + now.isoformat() + "Z", ""]
    found_any = False

    for t in targets:
        dupes, err = scan_table(t)
        if err:
            lines.append("## {}: SKIPPED — {}".format(t, err))
            continue
        if not dupes:
            lines.append("## {}: clean — no near-duplicate rows found".format(t))
            continue
        found_any = True
        lines.append("## {}: {} possible duplicate group(s)".format(t, len(dupes)))
        for (scope, key), ids in dupes.items():
            lines.append("  - key={!r} scope={!r} ids={}".format(key, scope, ids))

    report = "\n".join(lines)
    print(report)

    month = now.strftime("%Y-%m")
    outdir = os.path.join(os.path.dirname(__file__), "..", "records", month)
    os.makedirs(outdir, exist_ok=True)
    outfile = os.path.join(outdir, "supabase_dedup_scan_{}.txt".format(now.strftime("%Y-%m-%d_%H%M")))
    with open(outfile, "w", encoding="utf-8") as f:
        f.write(report)
        f.write("\n\nFindings only — nothing here was deleted or merged. A human reviews and acts.\n")
    print("\nWritten: " + outfile)
    if not found_any:
        print("(No real duplication found — consistent with the Aug 11 full 35-table hand-check.)")


if __name__ == "__main__":
    main()
