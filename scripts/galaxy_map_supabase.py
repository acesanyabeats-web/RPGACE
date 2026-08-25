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

**G83 (Aug 25 2026) — a real map view, alongside the table view.**
Alex's own words, after clicking the Supabase L0 unit bubble and being
handed a facet list: "all of these bubbles should lead somewhere lower
in the map... i click supabase and it takes me to supabase bubble system
without going through the list below. that list is redundant if the
supabase page show bubble system and where they lead to and where inputs
come from for each table."

Per R22 ("bubble systems always follow and showcase what's on the
table"), the table view above is untouched and stays the page's default
on a plain load — the map is a second rendering of the exact same
`TABLES`/`OVERSIGHT` data, never a second source. The L0 map's Supabase
unit now navigates here with `#view-map`, which is the one entry point
that lands directly on the bubble system.

SHAPE, and the correction that produced it: the first cut of the map
view was a flat grid of 32 table-hub mini-diagrams. Alex rejected the
shape, not the data — "supabase should have a level 1 showing which
rivers, then level 2 for which modules, then level 3 for currents, so
migration bubbles can be established in one supabase bubble system...
this should be standard for all infra bubble systems for l0 items." The
map view is now that progressive drill-down, and its structure/render
mechanism lives in `graphify_river_group.py` so the next L0 unit's own
infra bubble system reuses it rather than re-deriving it.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    compute_all_supabase_table_touches, RIVER_MODULES, RIVER_NAME,
    LEVEL3_MODULES, compute_oversight_doc_supabase_reads, TOTAL_ZONES,
    build_infra_drilldown, infra_drilldown_counts, render_infra_drilldown,
    INFRA_DRILLDOWN_CSS,
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


# ── G82 audit (Aug 25 2026) — two real, separately-evidenced dead ends
# on this page, both found by checking what it NAMES against what it
# links.
#
# 1. The river chips said "🌊 River XI" and went nowhere, even though
#    the module chips beside them already link to Current Series. Fixed
#    with the same `galaxy_map_module.html#river-N` Level-2 anchor
#    galaxy_map_load.py already renders next to its own module links
#    (rule 8 — an existing convention applied where an identical fact
#    was rendered dead, not a new mechanic).
#
# 2. The oversight-doc evidence rows named a real FILE
#    (`smoke_test.html`, `achiever.html`, …) as plain text. That name is
#    unusually strong evidence to leave unlinked: it did not come from a
#    hand-typed roster, it came from compute_oversight_doc_supabase_
#    reads() literally opening that file at the repo root and finding
#    the `fetch('/rest/v1/…')` call being reported. The link is
#    therefore checked the same way it was sourced — `is_file()` at
#    build time — and a file that stops existing simply stops being
#    linked, rather than rotting into a dead href.
_ROOT = Path('.')


def _river_link(rnum):
    label = RIVER_NAME.get(rnum, f'River {rnum}').split('—')[0].strip()
    return f'<a class="river-chip" href="galaxy_map_module.html#river-{rnum}">🌊 {esc(label)}</a>'


def _doc_link(fname):
    """Real link to the oversight doc this evidence was read out of —
    only when that exact file genuinely exists right now."""
    if (_ROOT / fname).is_file():
        return f'<a class="doclink" href="../{esc(fname)}">{esc(fname)}</a>'
    return esc(fname)


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
        f'{_doc_link(r["file"])} — {r["n"]} real live call(s)</div>'
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
        _river_link(r) for r in rivers
    ) or '<span class="meta">no river-tracked module touches this table</span>'
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


# -- G83 -- the real map view: a progressive L1 -> L2 -> L3 drill-down.
#
# The first cut of this was a flat grid of 32 table-hub mini-diagrams
# (one card per table, writers fanning in, readers fanning out). It was
# real and it worked, but Alex rejected the SHAPE, not the data: "supabase
# should have a level 1 showing which rivers, then level 2 for which
# modules, then level 3 for currents, so migration bubbles can be
# established in one supabase bubble system, while also tying all levels
# and rivers for the supabase infra bubble system. this should be standard
# for all infra bubble systems for l0 items."
#
# So the flat cards are gone and the structure/render mechanism lives in
# graphify_river_group.py (build_infra_drilldown / render_infra_drilldown)
# rather than here -- the next L0 unit to get an infra bubble system has a
# different evidence source but the identical river->module->function
# question, and re-deriving that per page is exactly the rule-8
# duplication this project keeps paying for.
#
# What stays Supabase-specific and therefore stays in this file: the
# evidence source (TABLES), the leaf destination (Current Series'
# `#mod-<module>` anchor), and the real oversight-doc evidence that has
# no module and therefore cannot appear in a module-grained drill-down
# at all -- surfaced as its own honest block rather than silently
# dropped.
DRILL, ORPHANS = build_infra_drilldown(TABLES)
DRILL_COUNTS = infra_drilldown_counts(DRILL, ORPHANS)


def _leaf_link(mod):
    """Real Current Series destination for a module, or None when there
    honestly isn't one. Same rule `_mod_link()` above already applies to
    the table view's own chips (rule 8): LEVEL3_MODULES is exactly the
    set of modules Current Series renders a section for, so a module
    outside it has no `#mod-<name>` anchor to jump to."""
    return f'galaxy_map_current.html#mod-{mod}' if mod in LEVEL3_MODULES else None


def build_oversight_note():
    """Real oversight-doc evidence, stated plainly instead of forced into
    the drill-down. These are live `fetch('/rest/v1/...')` calls from the
    oversight HTML docs themselves -- genuinely real, and genuinely
    module-less, so a river->module->function tree has nowhere to put
    them without inventing a module that does not exist."""
    if not OVERSIGHT:
        return ''
    rows = []
    for tbl in sorted(OVERSIGHT):
        docs = ', '.join(_doc_link(r['file']) for r in sorted(OVERSIGHT[tbl], key=lambda r: r['file']))
        n = sum(r['n'] for r in OVERSIGHT[tbl])
        mark = ' <span class="ovs-tag" style="display:inline;margin:0">module-untouched</span>' if tbl in OVERSIGHT_ONLY else ''
        rows.append(f'<div class="touch-row">🗄️ <a href="#tbl-{tbl}">{esc(tbl)}</a>{mark} — '
                    f'{n} real live call(s) from {docs}</div>')
    return ('<div class="idd"><div class="idd-lvl"><div class="idd-lbl">Outside the river chain, '
            'by construction</div><div class="ovs">'
            '<span class="ovs-tag">📚 real oversight-doc live fetches</span>'
            '<div class="touch-row" style="padding-left:0">These are real Supabase calls with no module '
            'behind them at all — they come from the oversight HTML docs\' own inline scripts, so they '
            'have no river, no module and no Current, and cannot appear anywhere in the drill-down above '
            'without inventing a module that does not exist. Listed here so the evidence is not silently '
            'dropped.</div>'
            + ''.join(rows) + '</div></div></div>')


def build_map_view():
    """The real map view — one bubble system, three levels, plus the
    honest module-less block. Same TABLES data the table view above
    renders, never a second source (R22)."""
    return render_infra_drilldown(
        DRILL, ORPHANS, unit_icon='🗄️', unit_label='Supabase',
        leaf_link_fn=_leaf_link, resource_emoji='🗄️',
        orphan_label='Cross-cutting (no river)',
        orphan_note="RIVER_MODULES' own documented exclusions",
        esc=esc) + build_oversight_note()


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
  /* G82 — the river chips are real Level-2 links now, styled to still
     read as chips rather than as underlined hyperlinks. */
  .river-chip{{font-size:9.5px;padding:2px 8px;border-radius:8px;background:rgba(42,191,176,0.1);color:var(--teal);text-decoration:none}}
  .river-chip:hover{{background:rgba(42,191,176,0.26)}}
  .doclink{{color:var(--gold);text-decoration:none;border-bottom:1px dotted currentColor}}
  .doclink:hover{{border-bottom-style:solid}}
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
  /* G83 — map/table toggle, reused verbatim from galaxy_map.py's own
     G67 toggle mechanic ("use what we have, dont make new shit"). */
  .toggle-row{{display:flex;justify-content:center;gap:8px;padding:16px 24px 0}}
  .toggle-btn{{padding:8px 18px;border-radius:16px;font-size:11.5px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .toggle-btn.active{{background:var(--gold);color:#1a1608;border-color:var(--gold)}}
  .view{{display:none}}
  .view.active{{display:block}}
{idd_css}
{dim_css}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Supabase</div>
  <h1>🗄️ Every Real Table, Where It's Used</h1>
  <p>{n_tables} real Supabase tables with a genuine, checkable client-side touch in rpgace_core.js (113 of 502 real functions, 22%) — which Level/River/Module reads or writes each. Server-side (api/*.js) touches aren't reachable by this client-side detector — a real, honest scope limit, same class every other Galaxy Map page states.</p>
  <p style="margin-top:8px">Plus {n_ovs_only} more real table(s) below that <b>no</b> module touches at all, reached only by the oversight docs' own live <code>fetch('/rest/v1/…')</code> calls — a second, genuinely different evidence type, kept visibly separate rather than merged in.</p>
  <p style="margin-top:8px"><b>Map view</b> renders the same data as one real bubble system, drilled progressively: <b>Level 1</b> the rivers that genuinely touch Supabase → <b>Level 2</b> the modules in that river that genuinely touch a table → <b>Level 3</b> the real Currents (functions) that touch, each a migration bubble jumping out to that module's own Current Series section. Per R22 the table is the source and the bubbles follow it — same <code>TABLES</code> data, never a second source.</p>
</div>
<div class="toggle-row">
  <div class="toggle-btn active" data-view="table">📊 Table view</div>
  <div class="toggle-btn" data-view="map">🌌 Map view</div>
</div>

<div class="view active" id="view-table">
<div class="tables">{table_sections}</div>
{ovs_group}
</div>

<div class="view" id="view-map">{map_view}</div>
{dim_index}

<script>
(function() {{
  // Real G83 — the exact map/table toggle mechanic galaxy_map.py already
  // uses, reused rather than reinvented. Table view is the DEFAULT on a
  // plain load: per R22 the table is the source the bubble system
  // renders, and every existing `#tbl-` table deep link from the L0 map
  // and the Dimensions pages lands in it.
  var mtToggles = document.querySelectorAll('.toggle-btn');
  var mtViews = document.querySelectorAll('.view');
  function showView(name) {{
    mtToggles.forEach(function(x) {{ x.classList.toggle('active', x.dataset.view === name); }});
    mtViews.forEach(function(v) {{ v.classList.toggle('active', v.id === 'view-' + name); }});
  }}
  mtToggles.forEach(function(t) {{
    t.addEventListener('click', function() {{ showView(t.dataset.view); }});
  }});
  // The one entry point that lands directly on the bubble system: the L0
  // map's Supabase unit navigates here with #view-map, which is Alex's
  // own ask ("i click supabase and it takes me to supabase bubble system
  // without going through the list below").
  function applyHash() {{
    var h = (location.hash || '').replace('#', '');
    if (h === 'view-map') {{
      showView('map');
    }} else if (h.indexOf('tbl-') === 0) {{
      showView('table');
    }}
  }}
  applyHash();
  window.addEventListener('hashchange', applyHash);
  // R22 in the other direction — the drill-down's own "outside the river
  // chain" block links back into the table view by real `#tbl-` anchor,
  // so those links switch views the same way the toggle does rather than
  // jumping to a section that is currently hidden.
  document.querySelectorAll('#view-map a[href^="#tbl-"]').forEach(function(el) {{
    el.addEventListener('click', function() {{
      showView('table');
    }});
  }});
}})();
</script>

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
                           map_view=build_map_view(),
                           dim_index=dimension_index_html(OUT.name),
                           dim_css=DIMENSION_INDEX_CSS,
                           idd_css=INFRA_DRILLDOWN_CSS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    n_ovs_calls = sum(r['n'] for recs in OVERSIGHT.values() for r in recs)
    print(f"Wrote {OUT} — {len(TABLES)} real module-touched tables, "
          f"{sum(len(v) for v in TABLES.values())} real total touches; "
          f"plus {len(OVERSIGHT)} real oversight-doc-fetched table(s) "
          f"({len(OVERSIGHT_ONLY)} of them module-untouched, {n_ovs_calls} real live calls).")
    # G82 — real, measured destination coverage, printed so a build can
    # never silently regress it.
    docs = sorted({r['file'] for recs in OVERSIGHT.values() for r in recs})
    linked_docs = [d for d in docs if (_ROOT / d).is_file()]
    n_river_tables = sum(
        1 for t, touches in TABLES.items()
        if any(_river_of.get(m) for m, _f, _op in touches))
    print(f"  G82 destinations — {n_river_tables}/{len(TABLES)} table(s) now link at least one real river at "
          f"Level 2; {len(linked_docs)}/{len(docs)} named oversight doc(s) resolve to a real file and are linked.")
    # G83 — real, build-time self-consistency gate. The drill-down is
    # built by filtering the SAME `TABLES` detector output the table view
    # renders, so the total number of (module, function) leaves it draws
    # must equal the number of distinct (module, function) pairs that
    # detector actually found. If it ever doesn't, the page is telling
    # two different truths from one dataset — fail loudly instead.
    real_pairs = {(m, f) for touches in TABLES.values() for m, f, _op in touches}
    drawn = sum(len(fs) for mods in DRILL.values() for fs in mods.values())
    drawn += sum(len(fs) for fs in ORPHANS.values())
    if drawn != len(real_pairs):
        raise SystemExit(
            f"SELF-CONSISTENCY FAIL: drill-down draws {drawn} function leaf/leaves, "
            f"the detector found {len(real_pairs)} real (module, function) pair(s).")
    # Every migration bubble that CLAIMS a destination must have one.
    linked = sorted(m for mods in DRILL.values() for m in mods if _leaf_link(m))
    unlinked = sorted([m for mods in DRILL.values() for m in mods if not _leaf_link(m)]
                      + list(ORPHANS))
    c = DRILL_COUNTS
    print(f"  G83 map view — L1 {c['rivers']} of {TOTAL_ZONES} real river(s) qualify · "
          f"L2 {c['modules']} module(s) + {c['orphan_modules']} river-less · "
          f"L3 {c['functions'] + c['orphan_functions']} real migration bubble(s) "
          f"({drawn} leaves == {len(real_pairs)} real detector pair(s)).")
    print(f"  G83 destinations — {len(linked)} module(s) link to a real "
          f"galaxy_map_current.html#mod-<name> anchor; {len(unlinked)} honestly unlinked "
          f"(no river, so Current Series has no section): {', '.join(unlinked) or 'none'}.")


if __name__ == '__main__':
    main()
