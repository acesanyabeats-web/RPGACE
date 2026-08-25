#!/usr/bin/env python3
"""
galaxy_map_supabase.py — G45 of the ratified L0/Dimension/River/Module/
Current redefinition. F3's answer: "one page, all tables" — every real
table, which Level/River/Module reads or writes it, framed like a real
/perspective report.

Real data reused, never re-derived (rule 8): compute_all_supabase_
table_touches() (graphify_river_group.py, G45 addition) — the same
per-function detector powering G47/G49's own Current/River-grain
injection badges.

**G82 (Aug 25 2026) — a real SECOND evidence type on this page.**
This page's title claims "every real table, where it's used," and until
now that meant exactly one kind of use: an `RPGACE.sb.*` call inside
rpgace_core.js. That left four real tables — `achiever_archive`,
`ceo_plans`, `ceo_plan_items`, `smoke_test_items` — with no section at
all, despite being fetched live, on every page load, by the oversight
docs themselves. The gap was structural, not a tuning miss: those calls
live in different FILES, so a scanner pointed at rpgace_core.js cannot
reach them by construction.

`compute_oversight_doc_supabase_reads()` closes it. Deliberately
rendered as its own clearly-labelled block (and, for the four
oversight-only tables, its own clearly-labelled section group) rather
than merged into the existing per-function touch list: a live
`fetch('/rest/v1/...')` from an oversight doc's inline script and an
`RPGACE.sb.select()` inside a registered module are genuinely different
facts about genuinely different code, and flattening them into one list
would make the module/river chips silently wrong for half the rows.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    compute_all_supabase_table_touches, RIVER_MODULES, RIVER_NAME,
    LEVEL3_MODULES, compute_oversight_doc_supabase_reads,
)
from graphify_river_group import inject_level_rail  # noqa: E402
from graphify_river_group import dimension_index_html, DIMENSION_INDEX_CSS  # noqa: E402

OUT = Path('graphify-out/galaxy_map_supabase.html')

TABLES = compute_all_supabase_table_touches()

# G82 — real oversight-doc live fetches, grouped by table. Sorted at
# build so a fresh process re-run is byte-identical (R5).
OVERSIGHT = {}
for _rec in compute_oversight_doc_supabase_reads():
    OVERSIGHT.setdefault(_rec['table'], []).append(_rec)
OVERSIGHT_ONLY = sorted(t for t in OVERSIGHT if t not in TABLES)

_river_of = {}
for _r, _mods in RIVER_MODULES.items():
    for _m in _mods:
        _river_of[_m] = _r


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def _mod_link(mod):
    if mod in LEVEL3_MODULES:
        return f'<a class="mod-chip" href="galaxy_map_current.html#mod-{mod}">🔽 {mod}</a>'
    return f'<span class="mod-chip mod-chip-none">{mod}</span>'


def build_oversight_block(tbl):
    """Real, separately-labelled oversight-doc evidence for one table —
    or nothing at all if no oversight doc fetches it. Never merged into
    the rpgace_core.js touch list above it: different files, different
    idiom, different meaning."""
    recs = OVERSIGHT.get(tbl)
    if not recs:
        return ''
    rows = ''.join(
        f'<div class="touch-row"><code>{"+".join(r["methods"])}</code> '
        f'{esc(r["file"])} — {r["n"]} real live call(s)</div>'
        for r in recs)
    return (f'<div class="ovs"><span class="ovs-tag">📚 also fetched live by the oversight docs</span>'
            f'{rows}</div>')


def build_oversight_only_row(tbl):
    """A real table that NO rpgace_core.js module touches, but an
    oversight doc genuinely fetches on every load. Rendered with the
    same section shape so it is findable at the same `#tbl-<table>`
    anchor every other Galaxy Map page deep-links to — but honestly
    without module/river chips, because there are genuinely no modules
    or rivers behind it to name."""
    recs = OVERSIGHT[tbl]
    methods = sorted({m for r in recs for m in r['methods']})
    op_badges = ''.join(f'<span class="op-badge op-{m.lower()}">{m}</span>' for m in methods)
    n = sum(r['n'] for r in recs)
    return f'''<section class="table-section ovs-only" id="tbl-{tbl}">
  <div class="thead"><span class="tdot tdot-ovs"></span><h2>🗄️ {tbl}</h2>{op_badges}
    <span class="tcount">{n} real live oversight-doc call(s)</span></div>
  <div class="rivers"><span class="meta">No rpgace_core.js module touches this table at all — it is
    read (and, where a method above says so, written) directly by the oversight docs' own inline
    scripts. Real, and invisible to the client-side module scanner by construction.</span></div>
  {build_oversight_block(tbl)}
</section>'''


def build_table_row(tbl, touches):
    rivers = sorted(set(_river_of.get(m) for m, _f, _op in touches if _river_of.get(m)))
    mods = sorted(set(m for m, _f, _op in touches))
    ops = sorted(set(op for _m, _f, op in touches))
    op_badges = ''.join(f'<span class="op-badge op-{op}">{op}</span>' for op in ops)
    river_chips = ''.join(
        f'<span class="river-chip">🌊 {RIVER_NAME.get(r, "?").split("—")[0].strip()}</span>'
        for r in rivers) or '<span class="meta">no river-tracked module touches this table</span>'
    mod_chips = ''.join(_mod_link(m) for m in mods)
    detail_rows = ''.join(
        f'<div class="touch-row"><code>{op}</code> {esc(m)}.{esc(f)}()</div>'
        for m, f, op in sorted(touches))
    return f'''<section class="table-section" id="tbl-{tbl}">
  <div class="thead"><span class="tdot"></span><h2>🗄️ {tbl}</h2>{op_badges}
    <span class="tcount">{len(touches)} real function touch(es)</span></div>
  <div class="rivers">{river_chips}</div>
  <div class="mods">{mod_chips}</div>
  <details class="touches"><summary>Every real touch (module.function → operation)</summary>{detail_rows}</details>
  {build_oversight_block(tbl)}
</section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Supabase)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --teal:#2ABFB0; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 20%, #0e1a1a 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--teal);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:760px;margin:0 auto;line-height:1.6}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--teal);padding:4px 9px;border-radius:12px}}
  .tables{{max-width:820px;margin:24px auto;padding:0 24px;display:flex;flex-direction:column;gap:14px}}
  .table-section{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px 18px}}
  .thead{{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}}
  .tdot{{width:10px;height:10px;border-radius:50%;background:var(--teal)}}
  .thead h2{{font-family:Georgia,serif;font-size:15px;color:#fff}}
  .tcount{{font-size:9.5px;color:var(--dim);margin-left:auto}}
  .op-badge{{font-size:8.5px;font-weight:700;padding:2px 7px;border-radius:7px;background:rgba(255,255,255,0.06);color:var(--dim);text-transform:uppercase}}
  .rivers,.mods{{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}}
  .river-chip{{font-size:9.5px;padding:2px 8px;border-radius:8px;background:rgba(42,191,176,0.1);color:var(--teal)}}
  .mod-chip{{font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:8px;background:rgba(201,168,76,0.1);color:var(--gold);text-decoration:none}}
  .mod-chip-none{{background:rgba(255,255,255,0.04);color:var(--dim)}}
  .meta{{font-size:9.5px;color:var(--dim)}}
  .touches{{margin-top:8px;font-size:10.5px}}
  .touches summary{{cursor:pointer;color:var(--dim)}}
  .touch-row{{padding:4px 0 4px 12px;color:#a8a8b8}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10px;background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:3px}}
  a{{color:var(--teal)}}
  .note{{max-width:820px;margin:20px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  .ovs{{margin-top:8px;padding:8px 10px;border-left:2px solid var(--gold);background:rgba(201,168,76,0.05);border-radius:0 6px 6px 0}}
  .ovs-tag{{display:block;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin-bottom:4px}}
  .ovs .touch-row{{font-size:10.5px}}
  .ovs-only{{border-color:rgba(201,168,76,0.28)}}
  .tdot-ovs{{background:var(--gold)}}
  .grouphead{{max-width:820px;margin:30px auto 0;padding:0 24px}}
  .grouphead h2{{font-family:Georgia,serif;font-size:15px;color:#fff;margin-bottom:6px}}
  .grouphead p{{font-size:11px;color:var(--dim);line-height:1.7}}
{dim_css}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Supabase</div>
  <h1>🗄️ Every Real Table, Where It's Used</h1>
  <p>{n_tables} real Supabase tables with a genuine, checkable client-side touch in rpgace_core.js (113 of 502 real functions, 22%) — which Level/River/Module reads or writes each. Server-side (api/*.js) touches aren't reachable by this client-side detector — a real, honest scope limit, same class every other Galaxy Map page states.</p>
  <p style="margin-top:8px">Plus {n_ovs_only} more real table(s) below that <b>no</b> module touches at all, reached only by the oversight docs' own live <code>fetch('/rest/v1/…')</code> calls — a second, genuinely different evidence type, kept visibly separate rather than merged in.</p>
</div>
<div class="tables">{table_sections}</div>
{ovs_group}
{dim_index}

<div class="note">
  Generated by <code>scripts/galaxy_map_supabase.py</code> — real data from
  <code>graphify_river_group.py</code>'s <code>compute_all_supabase_table_touches()</code>
  (a real per-function regex match on <code>RPGACE.sb.select/insert/update/del/secureWrite</code>),
  never hand-guessed. This is the real Supabase L0 unit's own content, per Part 3.3/F3 of the
  ratified redefinition — reached from the <a href="galaxy_map.html">L0 map</a>'s own
  Supabase unit.
</div>
</body>
</html>
"""


def main():
    table_sections = ''.join(
        build_table_row(t, touches)
        for t, touches in sorted(TABLES.items(), key=lambda kv: (-len(kv[1]), kv[0])))
    ovs_group = ''
    if OVERSIGHT_ONLY:
        ovs_group = (
            '<div class="grouphead"><h2>📚 Oversight-doc-only tables</h2>'
            '<p>Real tables with zero <code>RPGACE.sb.*</code> touches anywhere in '
            '<code>rpgace_core.js</code> — they exist, they are read and written on every page load, '
            'and the module scanner above is structurally unable to see them because those calls live '
            'in the oversight HTML files rather than in a registered module. Listed here so every '
            '<code>#tbl-&lt;table&gt;</code> deep link from the L0 map resolves to something real '
            'instead of a dead anchor.</p></div>'
            '<div class="tables">' + ''.join(build_oversight_only_row(t) for t in OVERSIGHT_ONLY) + '</div>')
    html = TEMPLATE.format(n_tables=len(TABLES), table_sections=table_sections,
                           n_ovs_only=len(OVERSIGHT_ONLY), ovs_group=ovs_group,
                           dim_index=dimension_index_html(OUT.name),
                           dim_css=DIMENSION_INDEX_CSS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    n_ovs_calls = sum(r['n'] for recs in OVERSIGHT.values() for r in recs)
    print(f"Wrote {OUT} — {len(TABLES)} real module-touched tables, "
          f"{sum(len(v) for v in TABLES.values())} real total touches; "
          f"plus {len(OVERSIGHT)} real oversight-doc-fetched table(s) "
          f"({len(OVERSIGHT_ONLY)} of them module-untouched, {n_ovs_calls} real live calls).")


if __name__ == '__main__':
    main()
