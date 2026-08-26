#!/usr/bin/env python3
"""
galaxy_map_oracle.py — G99 of the ratified "RPGACE Total Systems Galaxy
Map" /CEO plan (Aug 25 2026). Oracle's own dedicated Infra bubble
system, the direct L0 destination for the new `oracle` unit.

Real trigger, Alex's own words, same day: "i want to retire external ai
as a grouping in l0 and make all its components their own l0 unit...
so this will free oracle and others to have their own facet." Oracle
(the real AI harness mediating Anthropic-live + Kimi/Luna-dormant) was
previously rendered as ONE of "External AI"'s 12 constituent actors —
its own real river/module/function evidence lived buried inside
galaxy_map_externals.html's own 4th tab (a real drill-down built the
same day, now RETIRED from that page and moved here in full — rule 8,
never two copies of the same evidence).

Real data reused, never re-derived: compute_all_oracle_call_counts()
(graphify_river_group.py) — every real function anywhere in
rpgace_core.js whose own body matches a real Oracle-call pattern
(ORACLE_CALL_PATTERNS). Same shared river->module->function drill-down
mechanism (build_infra_drilldown()/render_infra_drilldown()) G83 built
for Supabase and G91 continuation reused for External AI/Oversight
Docs/Orchestrator CC — Oracle is simply the 5th real user of it.

Per R22 (table-first, bubble-follows): the table view (one row per real
module, its own functions + call counts) is this page's real source;
the map view (the L1 river -> L2 module -> L3 function drill-down) is a
rendering layer over the exact same data, never a second source. The
L0 map's Oracle unit navigates here with `#view-map`.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    compute_all_oracle_call_counts, RIVER_MODULES, RIVER_NAME,
    LEVEL3_MODULES, TOTAL_ZONES,
    build_infra_drilldown, infra_drilldown_counts, render_infra_drilldown,
    INFRA_DRILLDOWN_CSS,
)
from graphify_river_group import inject_level_rail  # noqa: E402
from graphify_river_group import dimension_index_html, DIMENSION_INDEX_CSS  # noqa: E402

OUT = Path('graphify-out/galaxy_map_oracle.html')

# Real, project-wide roll-up — {module: {func: count}}. Sorted at use
# site, never iterated as a raw dict (R5).
CALLS = compute_all_oracle_call_counts()

_river_of = {}
for _r, _mods in RIVER_MODULES.items():
    for _m in _mods:
        _river_of[_m] = _r

EVIDENCE = {'Oracle API': [(m, f, f'{n} real call(s)') for m, counts in CALLS.items() for f, n in counts.items()]}
DRILL, ORPHANS = build_infra_drilldown(EVIDENCE)
DRILL_COUNTS = infra_drilldown_counts(DRILL, ORPHANS)


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def _mod_link(mod):
    if mod in LEVEL3_MODULES:
        return f'<a class="mod-chip" href="galaxy_map_current.html#mod-{mod}">🔽 {mod}</a>'
    return f'<span class="mod-chip mod-chip-none">{mod}</span>'


def _river_link(rnum):
    label = RIVER_NAME.get(rnum, f'River {rnum}').split('—')[0].strip()
    return f'<a class="river-chip" href="galaxy_map_module.html#river-{rnum}">🌊 {esc(label)}</a>'


def _leaf_link(mod):
    return f'galaxy_map_current.html#mod-{mod}' if mod in LEVEL3_MODULES else None


def build_module_row(mod, counts):
    rnum = _river_of.get(mod)
    river_chip = _river_link(rnum) if rnum else '<span class="mod-chip-none">cross-cutting, no river</span>'
    total = sum(counts.values())
    fn_rows = ''.join(
        f'<div class="touch-row">🔮 <code>{esc(f)}()</code> — {n} real call(s)</div>'
        for f, n in sorted(counts.items()))
    return f'''<div class="table-section" id="tbl-{esc(mod)}">
  <div class="thead"><span class="tdot"></span><h2>{_mod_link(mod)}</h2>
    <span class="tcount">{total} real call(s) across {len(counts)} function(s)</span></div>
  <div class="rivers">{river_chip}</div>
  <details class="touches"><summary>{len(counts)} real function(s) that call Oracle</summary>{fn_rows}</details>
</div>'''


def build_map_view():
    return render_infra_drilldown(
        DRILL, ORPHANS, unit_icon='🔮', unit_label='Oracle',
        leaf_link_fn=_leaf_link, resource_emoji='🔮',
        orphan_label='Cross-cutting (no river)',
        orphan_note="RIVER_MODULES' own documented exclusions",
        esc=esc)


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Oracle)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --purple:#9B59B6; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 20%, #1a0e1e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--purple);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:760px;margin:0 auto;line-height:1.6}}
  .tables{{max-width:820px;margin:24px auto;padding:0 24px;display:flex;flex-direction:column;gap:14px}}
  .table-section{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px 18px}}
  .thead{{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}}
  .tdot{{width:10px;height:10px;border-radius:50%;background:var(--purple)}}
  .thead h2{{font-family:Georgia,serif;font-size:15px;color:#fff}}
  .tcount{{font-size:9.5px;color:var(--dim);margin-left:auto}}
  .rivers{{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}}
  .river-chip{{font-size:9.5px;padding:2px 8px;border-radius:8px;background:rgba(155,89,182,0.12);color:var(--purple);text-decoration:none}}
  .river-chip:hover{{background:rgba(155,89,182,0.28)}}
  .mod-chip{{font-size:13px;font-weight:700;padding:2px 8px;border-radius:8px;background:rgba(201,168,76,0.1);color:var(--gold);text-decoration:none;font-family:Georgia,serif}}
  .mod-chip-none{{background:rgba(255,255,255,0.04);color:var(--dim);font-size:9.5px}}
  .touches{{margin-top:8px;font-size:10.5px}}
  .touches summary{{cursor:pointer;color:var(--dim)}}
  .touch-row{{padding:4px 0 4px 12px;color:#a8a8b8}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10px;background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:3px}}
  a{{color:var(--purple)}}
  .note{{max-width:820px;margin:20px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
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
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Oracle</div>
  <h1>🔮 Every Real Function That Calls Oracle</h1>
  <p>{n_mods} real modules with a genuine, checkable Oracle-call site in rpgace_core.js (real, project-wide function-body regex match against ORACLE_CALL_PATTERNS) — {n_calls} real (module, function) pairs across {n_rivers} rivers. Real, honest scope limit: this covers the client-side call SITE, not which real provider (Anthropic/Kimi/Luna) answers it — that split lives on <a href="galaxy_map_externals.html">the Externals consolidation page</a>, kept live per Alex's own explicit ask.</p>
  <p style="margin-top:8px"><b>Map view</b> renders the same data as one real bubble system, drilled progressively: <b>Level 1</b> the rivers that genuinely call Oracle → <b>Level 2</b> the modules in that river that genuinely call Oracle → <b>Level 3</b> the real Currents (functions) that call, each a migration bubble jumping out to that module's own Current Series section.</p>
</div>
<div class="toggle-row">
  <div class="toggle-btn active" data-view="table">📊 Table view</div>
  <div class="toggle-btn" data-view="map">🌌 Map view</div>
</div>

<div class="view active" id="view-table">
<div class="tables">{table_sections}</div>
</div>

<div class="view" id="view-map">{map_view}</div>
{dim_index}

<script>
(function() {{
  var mtToggles = document.querySelectorAll('.toggle-btn');
  var mtViews = document.querySelectorAll('.view');
  function showView(name) {{
    mtToggles.forEach(function(x) {{ x.classList.toggle('active', x.dataset.view === name); }});
    mtViews.forEach(function(v) {{ v.classList.toggle('active', v.id === 'view-' + name); }});
  }}
  mtToggles.forEach(function(t) {{
    t.addEventListener('click', function() {{ showView(t.dataset.view); }});
  }});
  function applyHash() {{
    var h = (location.hash || '').replace('#', '');
    if (h === 'view-map') {{ showView('map'); }}
    else if (h.indexOf('tbl-') === 0) {{ showView('table'); }}
  }}
  applyHash();
  window.addEventListener('hashchange', applyHash);
}})();
</script>

<div class="note">
  Generated by <code>scripts/galaxy_map_oracle.py</code> — real data from
  <code>graphify_river_group.py</code>'s <code>compute_all_oracle_call_counts()</code>, never hand-guessed.
  Oracle's own Infra bubble system, G99 of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan —
  reached from the <a href="galaxy_map.html">L0 map</a>'s own Oracle unit.
</div>
</body>
</html>
"""


def main():
    table_sections = ''.join(
        build_module_row(m, counts)
        for m, counts in sorted(CALLS.items(), key=lambda kv: (-sum(kv[1].values()), kv[0])))
    n_calls = sum(sum(c.values()) for c in CALLS.values())
    n_rivers = len({_river_of[m] for m in CALLS if m in _river_of})
    html = TEMPLATE.format(n_mods=len(CALLS), n_calls=n_calls, n_rivers=n_rivers,
                           table_sections=table_sections, map_view=build_map_view(),
                           dim_index=dimension_index_html(OUT.name),
                           dim_css=DIMENSION_INDEX_CSS, idd_css=INFRA_DRILLDOWN_CSS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(CALLS)} real modules call Oracle, {n_calls} real (module,function) pairs, "
          f"{n_rivers} real rivers.")
    c = DRILL_COUNTS
    print(f"  Map view — L1 {c['rivers']} of {TOTAL_ZONES} real river(s) qualify · "
          f"L2 {c['modules']} module(s) + {c['orphan_modules']} river-less · "
          f"L3 {c['functions'] + c['orphan_functions']} real migration bubble(s).")
    # Real, build-time self-consistency gate (same discipline as
    # galaxy_map_supabase.py's own G83 check) — the drill-down must draw
    # exactly the same number of (module, function) leaves the detector
    # itself found, or this page is telling two different truths.
    real_pairs = {(m, f) for m, counts in CALLS.items() for f in counts}
    drawn = sum(len(fs) for mods in DRILL.values() for fs in mods.values())
    drawn += sum(len(fs) for fs in ORPHANS.values())
    if drawn != len(real_pairs):
        raise SystemExit(
            f"SELF-CONSISTENCY FAIL: drill-down draws {drawn} function leaf/leaves, "
            f"the detector found {len(real_pairs)} real (module, function) pair(s).")


if __name__ == '__main__':
    main()
