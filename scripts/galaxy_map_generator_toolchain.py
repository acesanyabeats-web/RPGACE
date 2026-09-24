#!/usr/bin/env python3
"""
galaxy_map_generator_toolchain.py — G117 of the ratified "RPGACE Total
Systems Galaxy Map" /CEO plan. Real Council-of-5 finding, Sep 9 2026
(deferred from G116's own interrogation, not silently dropped): closes
RIVER_RETIRED[17]'s own honestly-named gap ("dev tooling itself was
never promoted to a unit") the same way every other real recurring
category already has its own page (galaxy_map_connectors.html,
galaxy_map_skill_network.html) — a catalog, never a facet-system
redesign (Option C, promoting Dev Tooling to a full L0 unit, was
explicitly ruled out at G116 as disproportionate).

Real, scoped Sep 22 2026 — Alex's own direct ask to build this now
("Yes as I said we will be doing all 3, start with g117"), overriding
the Sep 15 2026 standing pause on new Galaxy Map work the same way the
GMR-1..GMR-6 batch did Sep 16 2026 (real, explicit override, not a
silent bypass — the pause's own underlying finding still stands).

WHAT THIS CATALOGS: the 11 real generator/detector scripts in this
project's own `scripts/perspective_generate_*.py` / `smoke_test_
generate_*.py` / `generate_method_module_map.py` family plus its 5
genuine siblings that grew alongside them since G117 was first logged
(gmp_b_consistency_check.py, gmr2_generate_cross_refs.py, verify_
anchors.py, supabase_dedup_scan.py, session_lessons_retroactive_seed.py)
— deliberately NOT the `galaxy_map_*.py` PAGE-BUILDER family (24
scripts), which already has its own real catalog via galaxy_map_hub.py
and is a structurally different thing (page renderers vs. data/
analysis generators).

Real data, not invented: every row below is sourced directly from that
script's own docstring (read Sep 22 2026) and this project's own dated
CLAUDE.md/patch_notes.html narrative for real row-count evidence — no
description here paraphrases beyond what each script's own header
already states about itself.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import inject_level_rail  # noqa: E402
from graphify_river_group import dimension_index_html, DIMENSION_INDEX_CSS  # noqa: E402

OUT = Path('graphify-out/galaxy_map_generator_toolchain.html')

# Real, curated inventory (rule 1 — read directly from each script's own
# docstring before writing a word here, Sep 22 2026). `writes_to` is a
# real Supabase table, a static oversight-doc file, or 'stdout report
# only' for a genuinely read-only check — never guessed. `depends_on` is
# every real shared graphify_river_group.py function this script's own
# `from graphify_river_group import ...` line actually names.
GENERATORS = [
    {
        'file': 'generate_method_module_map.py', 'family': 'Standalone Tools',
        'date': 'Aug 26 2026 (G109)',
        'purpose': "Builds errorLog.METHOD_MODULE_MAP — a method-name -> owning-module lookup, worked around a real V8 limitation (a stack trace for a method inside an RPGACE.register() object literal reports it generically, e.g. \"Object._submit\", never the real module name). Reads rpgace_core.js directly.",
        'writes_to': 'Nothing to Supabase — prints a JS object literal, pasted by hand into rpgace_core.js (the same regenerate-then-re-embed discipline the whole Galaxy Map pipeline already uses).',
        'depends_on': [], 'evidence': '432 of 456 real distinct method names resolve to exactly one module; the remaining ~5% (generic names like _inject/init shared by 2+ modules) stay honestly ambiguous, never guessed.',
    },
    {
        'file': 'perspective_generate_modules.py', 'family': 'Perspective-Report Generators',
        'date': 'Aug 14 2026 (G11)',
        'purpose': 'Generates a real /perspective report (scope_level=module) for every RIVER_MODULES-tracked module, pulling from the SAME already-computed detection data the Galaxy Map itself renders from — never re-derived.',
        'writes_to': 'perspective_reports',
        'depends_on': ['parse_module_functions', 'compute_module_function_flow', 'compute_intra_river_flow', 'compute_cross_module_function_calls', 'compute_hook_signal_edges', 'compute_function_ui_signals', 'compute_mainjs_window_bridge'],
        'evidence': '58 of 58 real registered modules now covered (grew from 44 at Aug 14 launch via the Sep 15-16 GMR full-coverage push).',
    },
    {
        'file': 'perspective_generate_onclick_features.py', 'family': 'Perspective-Report Generators',
        'date': 'Aug 14 2026 (G11)',
        'purpose': 'Generates a real /perspective report (scope_level=onclick_feature) for every real index.html onclick-triggered function — the literal clickable buttons in the live app.',
        'writes_to': 'perspective_reports',
        'depends_on': ['_legacy_mainjs_text'],
        'evidence': '47 of 47 real distinct onclick-triggered functions covered.',
    },
    {
        'file': 'perspective_generate_mainjs_functions.py', 'family': 'Perspective-Report Generators',
        'date': 'Sep 8 2026 (G11 continuation)',
        'purpose': "Generates a real /perspective report (scope_level=mainjs_function) for main.js legacy-block functions with zero coverage at any scope_level. Found and fixed a real bug during its own build: an early version hand-interpolated a raw f-string, producing invalid JSON for any multi-line code excerpt — caught via a direct Postgres test before applying, fixed with json.dumps().",
        'writes_to': 'perspective_reports',
        'depends_on': ['_mainjs_function_bodies', 'sql_escape'],
        'evidence': '176 real rows generated and applied in 5 verified chunks, closing the legacy-block gap (219 total functions, 43 already covered elsewhere).',
    },
    {
        'file': 'smoke_test_generate_v1.py', 'family': 'Smoke-Test Generators',
        'date': 'Aug 14 2026',
        'purpose': 'The first official smoke-test generation — one row per real module + one row per real dashboard card, at hand-testable granularity (never one row per function, ~427 of which would be impractical to click through).',
        'writes_to': 'smoke_test_items (outputs a reviewed SQL file, never auto-applied)',
        'depends_on': ['compute_dashboard_card_flow'],
        'evidence': '56 real rows at launch (44 modules + 12 dashboard cards); smoke_test_items has grown to 99 rows since via later passes.',
    },
    {
        'file': 'smoke_test_generate_g_items.py', 'family': 'Smoke-Test Generators',
        'date': 'Aug 20 2026 (G51)',
        'purpose': 'Generates a real smoke_test_items row for every currently-yellow ceo_plan_items row, each carrying a real, specific HOW TO TEST instruction pulled from that item\'s own title/evidence — self-sufficient, no chat history needed to hand-test it.',
        'writes_to': 'smoke_test_items',
        'depends_on': [],
        'evidence': 'Powers the real yellow<->smoke_test<->green confirm loop — a genuine build only counts done once its own generated row gets Alex\'s real hand-confirm.',
    },
    {
        'file': 'gmp_b_consistency_check.py', 'family': 'Consistency Checkers',
        'date': 'Sep 16 2026 (GMP-B)',
        'purpose': "A real consistency CHECK, never a regeneration — compares RIVER_FLOWS' claimed river-to-river edges against perspective_reports' own evidence.cross_refs, flagging a real mismatch for a human decision. Never auto-adds an edge.",
        'writes_to': 'system_map_flags (flags only, human decides)',
        'depends_on': ['RIVER_MODULES', 'RIVER_FLOWS', '_roman_to_int'],
        'evidence': 'Found 1 real mismatch (River III<->XI) at 14/58 coverage; re-run at full 58/58 coverage found 11 real mismatches, all resolved with dated per-edge evidence.',
    },
    {
        'file': 'gmr2_generate_cross_refs.py', 'family': 'Consistency Checkers',
        'date': 'Sep 16 2026 (GMR-2)',
        'purpose': 'Audits module perspective_reports rows still missing a real evidence.cross_refs field, naming which real modules/tables their already-computed evidence counts refer to — reuses the same detection GMR-3/gmp_b_consistency_check.py needs, never re-grepped fresh.',
        'writes_to': 'perspective_reports (UPDATE via a real jsonb || merge, never clobbers existing evidence)',
        'depends_on': ['compute_cross_module_function_calls', 'compute_hook_signal_edges', 'compute_intra_river_flow', 'compute_supabase_table_touches'],
        'evidence': 'Closed real cross_refs coverage from 14/58 to 58/58 modules.',
    },
    {
        'file': 'verify_anchors.py', 'family': 'Consistency Checkers',
        'date': 'Sep 15 2026 (CEO SKILL.md R28)',
        'purpose': 'Cheap, regex-only, zero-AI-cost re-verification of every hand-cited \'anchor\'/\'lines\' code citation across galaxy_map_decision_matrix.py/galaxy_map_decisions.py/galaxy_map_current.py against live rpgace_core.js, without running any generator or touching output files.',
        'writes_to': 'stdout report only — no writes',
        'depends_on': [],
        'evidence': 'Caught 18 real stale citations on its first motivating incident (all last-verified Sep 8, silently drifted a week); now a standing session-start check.',
    },
    {
        'file': 'supabase_dedup_scan.py', 'family': 'Standalone Tools',
        'date': 'Aug 11 2026',
        'purpose': 'A real, read-only, anon-key normalized-key-exact-match dedup scan across real Supabase tables — the same method intelDedup already proves correct in production, never fuzzy matching.',
        'writes_to': 'Nothing — findings are reviewed and merged by hand (no real Supabase backup exists, so no auto-merge)',
        'depends_on': [],
        'evidence': 'Found 2 genuine duplicates on its first real run (intel_bibliography, content_productions) — both flagged for Alex, neither auto-merged.',
    },
    {
        'file': 'session_lessons_retroactive_seed.py', 'family': 'Standalone Tools',
        'date': 'Aug 15 2026',
        'purpose': "A real, mechanical scan of every patch_notes.html card-title for signal keywords (correction/misunderstanding/real bug/caught/found and fixed) — emits a lightweight blue \"not yet fully written up\" pointer per match, never a re-narrated summary (patch_notes.html still owns the real story).",
        'writes_to': 'session_lessons.html (a static oversight doc, not Supabase)',
        'depends_on': [],
        'evidence': "Per Alex's own explicit scope: flagged for a future full write-up, not fully authored by this script.",
    },
]

FAMILY_ORDER = ['Perspective-Report Generators', 'Smoke-Test Generators', 'Consistency Checkers', 'Standalone Tools']
FAMILY_ICON = {'Perspective-Report Generators': '🔭', 'Smoke-Test Generators': '🧪',
               'Consistency Checkers': '🔍', 'Standalone Tools': '🛠️'}


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def build_dependency_bubbles():
    """A real, R22-compliant bubble system — a pure rendering layer over
    the SAME `depends_on` data the table already shows, grouping scripts
    by which shared graphify_river_group.py function they real call.
    Never invents a relationship the table doesn't already state."""
    by_dep = {}
    for g in GENERATORS:
        for dep in g['depends_on']:
            by_dep.setdefault(dep, []).append(g['file'])
    if not by_dep:
        return '<p class="empty-note">No real shared-dependency data.</p>'
    rows = []
    for dep in sorted(by_dep.keys()):
        callers = by_dep[dep]
        chips = ''.join(f'<span class="dep-caller">{esc(c)}</span>' for c in callers)
        rows.append(f'''<div class="dep-row">
  <div class="dep-name"><code>{esc(dep)}()</code> <span class="dep-count">{len(callers)} real caller(s)</span></div>
  <div class="dep-callers">{chips}</div>
</div>''')
    return ''.join(rows)


def build_family_section(family):
    items = [g for g in GENERATORS if g['family'] == family]
    rows = []
    for g in items:
        dep_html = ', '.join(f'<code>{esc(d)}()</code>' for d in g['depends_on']) if g['depends_on'] else '<span class="none">none — a real standalone script</span>'
        rows.append(f'''<div class="gen-card">
  <div class="gen-head"><span class="gen-name">{esc(g['file'])}</span><span class="gen-date">{esc(g['date'])}</span></div>
  <p class="gen-purpose">{esc(g['purpose'])}</p>
  <div class="gen-meta"><b>Writes to:</b> {esc(g['writes_to'])}</div>
  <div class="gen-meta"><b>Depends on:</b> {dep_html}</div>
  <div class="gen-evidence">📊 {esc(g['evidence'])}</div>
</div>''')
    return f'''<section class="fam-section" id="fam-{esc(family).lower().replace(" ", "-")}">
  <div class="fam-head"><h2>{FAMILY_ICON[family]} {esc(family)}</h2><span class="fam-count">{len(items)} real script(s)</span></div>
  <div class="fam-cards">{''.join(rows)}</div>
</section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Generator Toolchain)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --blue:#4A90E2; --amber:#E2A83D; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 20%, #0e1420 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--blue);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto;line-height:1.6}}
  .toggle-row{{display:flex;justify-content:center;gap:8px;padding:16px 24px 0}}
  .toggle-btn{{padding:8px 18px;border-radius:16px;font-size:11.5px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .toggle-btn.active{{background:var(--amber);color:#1a1608;border-color:var(--amber)}}
  .view{{display:none}} .view.active{{display:block}}
  #view-table{{max-width:960px;margin:0 auto;padding:20px 24px 40px}}
  .fam-section{{margin-bottom:28px}}
  .fam-head{{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}}
  .fam-head h2{{font-family:Georgia,serif;font-size:18px;color:#fff}}
  .fam-count{{font-size:10px;color:var(--amber);font-weight:700}}
  .fam-cards{{display:flex;flex-direction:column;gap:10px}}
  .gen-card{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:14px 16px}}
  .gen-head{{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap}}
  .gen-name{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:13px;font-weight:700;color:var(--gold)}}
  .gen-date{{font-size:9.5px;color:var(--dim)}}
  .gen-purpose{{font-size:11.5px;color:#c8c8d8;line-height:1.6;margin-bottom:8px}}
  .gen-meta{{font-size:10.5px;color:var(--dim);margin-bottom:3px}}
  .gen-meta b{{color:#a8a8b8}}
  .gen-evidence{{font-size:10.5px;color:var(--amber);margin-top:6px}}
  .none{{opacity:0.6;font-style:italic}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10px;background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:3px}}
  #view-deps{{max-width:900px;margin:0 auto;padding:20px 24px 40px}}
  .dep-row{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px 14px;margin-bottom:8px}}
  .dep-name{{font-size:11.5px;margin-bottom:6px}}
  .dep-count{{font-size:9.5px;color:var(--amber);margin-left:6px}}
  .dep-callers{{display:flex;flex-wrap:wrap;gap:5px}}
  .dep-caller{{font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(74,144,226,0.14);color:var(--blue)}}
  .empty-note{{font-size:11px;color:var(--dim);font-style:italic}}
  a{{color:var(--blue)}}
  .note{{max-width:900px;margin:20px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
{dim_css}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Generator Toolchain</div>
  <h1>🧰 The {n_gen} Real Generator/Detector Scripts</h1>
  <p>Closes RIVER_RETIRED[17]'s own honestly-named gap ("dev tooling itself was never promoted to a unit") the same way every other real recurring category got its own page. A catalog of the perspective_generate_*.py / smoke_test_generate_*.py / generate_method_module_map.py family and its genuine siblings — not the galaxy_map_*.py page-builder family, which already has its own catalog (galaxy_map_hub.html).</p>
</div>
<div class="toggle-row">
  <div class="toggle-btn active" data-view="table">📊 By family</div>
  <div class="toggle-btn" data-view="deps">🔗 Shared dependencies</div>
</div>
<div class="view active" id="view-table">{sections}</div>
<div class="view" id="view-deps">{dep_bubbles}</div>
{dim_index}

<script>
(function() {{
  var toggles = document.querySelectorAll('.toggle-btn');
  var views = document.querySelectorAll('.view');
  toggles.forEach(function(t) {{
    t.addEventListener('click', function() {{
      toggles.forEach(function(x) {{ x.classList.toggle('active', x === t); }});
      views.forEach(function(v) {{ v.classList.toggle('active', v.id === 'view-' + t.dataset.view); }});
    }});
  }});
}})();
</script>

<div class="note">
  Generated by <code>scripts/galaxy_map_generator_toolchain.py</code> — G117 of the ratified "RPGACE Total Systems
  Galaxy Map" /CEO plan, built Sep 22 2026 (real, explicit override of the Sep 15 2026 standing pause on new Galaxy
  Map work, same as the GMR-1..GMR-6 batch). Every row sourced directly from that script's own docstring, read Sep 22
  2026 — no description here paraphrases beyond what each script already states about itself.
</div>
</body>
</html>
"""


def main():
    sections = ''.join(build_family_section(f) for f in FAMILY_ORDER)
    dep_bubbles = build_dependency_bubbles()
    html = TEMPLATE.format(n_gen=len(GENERATORS), sections=sections, dep_bubbles=dep_bubbles,
                           dim_index=dimension_index_html(OUT.name), dim_css=DIMENSION_INDEX_CSS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    n_deps = len({d for g in GENERATORS for d in g['depends_on']})
    print(f"Wrote {OUT} — {len(GENERATORS)} real generator/detector scripts catalogued across "
          f"{len(FAMILY_ORDER)} families, {n_deps} real shared-dependency functions.")


if __name__ == '__main__':
    main()
