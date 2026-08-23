#!/usr/bin/env python3
"""
galaxy_map_logic_dimension.py — real Aug 15 2026 extension of Level 5
(G17), Alex's own direct ask: "level 5 is now the logic dimension
(explains whats happening on the step, just simple doc with passages,
each passage is an edge in RPGACE total systems that explains all the
levels (grouped by same logic as modules), just make each edge
clickable to see explanation, a line with more than 2 lines merge with
explanation if at higher level."

Real, additive companion to galaxy_map_level5.py (NOT a replacement —
the 7 existing curated core-logic decision points stay exactly as they
are, anchor-verified, cross-linked from Level 3/Decisions/here). Given
a real session token/time constraint, built as a real SYNTHESIS over
already-shipped, already-computed real data (rule 8) — RIVER_FLOWS/
FLOWS_IN (river-to-river edges), LINKS_BY_RIVER (external connectors),
ALL_SKILLS/SKILL_SECONDARY_RIVER (skill streams) — the exact same real
data galaxy_map_module.py's own river-section legend already renders,
re-presented here as clickable <details> "passages," grouped by river
(the same grouping unit modules already use).

"A line with more than 2 lines merge with explanation if at higher
level": where a real river-to-river connection has a real function-
level attribution (attribute_river_connection_function — the specific
function a connection lands on, not just the river-level note), that
deeper Level-3 detail is merged INTO the same passage rather than left
as a separate line — one real passage per edge, at whatever depth of
evidence actually exists for it.
"""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (
    RIVER_NAME, RIVER_COLOR, RIVER_MODULES, RIVER_FLOWS, FLOWS_IN,
    LINKS_BY_RIVER, ALL_SKILLS, SKILL_SECONDARY_RIVER,
    attribute_river_connection_function, _river_num_from_label,
    compute_cross_module_function_calls,
)
from graphify_river_group import inject_level_rail, inject_plan_overlay  # noqa: E402

OUT = Path('graphify-out/galaxy_map_logic_dimension.html')
SKILL_RIVER = 13  # River XIII — same real constant galaxy_map_module.py defines (rule 8, not re-derived, just mirrored — a plain int, no import cost worth a cross-file dependency)
# Real, shared precompute (rule 8) — same real function galaxy_map_module.py/
# galaxy_map_level3.py already call once at module scope; attribute_river_
# connection_function() needs it passed in as cross_calls, never recomputed
# per-edge.
CROSS_CALLS = compute_cross_module_function_calls()


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


def _attr_text(attr):
    """attribute_river_connection_function() returns a real
    (from_mod, to_mod, to_func, description) tuple, or None — never a
    bare string. Real, honest rendering of whichever fields are real
    (from_mod is legitimately None for a wrap-installer/page-switch
    attribution, per that function's own documented signal 2/3)."""
    if not attr:
        return None
    from_mod, to_mod, to_func, desc = attr
    where = f'{from_mod}() → {to_mod}.{to_func}()' if from_mod else f'{to_mod}.{to_func}()'
    return f'{where} — {desc}'


def build_river_passages(rnum):
    river_label = RIVER_NAME[rnum]
    color = RIVER_COLOR[rnum]
    passages = []

    # River-to-river connections (outgoing + incoming), function-attributed where real evidence exists.
    for target_label, note, itype in RIVER_FLOWS.get(rnum, []):
        other = _river_num_from_label(target_label)
        if not other:
            continue
        attr_text = _attr_text(attribute_river_connection_function(rnum, other, note, cross_calls=CROSS_CALLS, itype=itype))
        deep = f'<div class="passage-deep">🔽 {esc(attr_text)}</div>' if attr_text else ''
        passages.append({
            'line': f'{river_label.split("—")[0].strip()} → {RIVER_NAME[other].split("—")[0].strip()}',
            'kind': 'river-out',
            'body': f'<p>{esc(note)}</p>{deep}',
        })
    for other, note, itype in FLOWS_IN.get(rnum, []):
        attr_text = _attr_text(attribute_river_connection_function(other, rnum, note, cross_calls=CROSS_CALLS, itype=itype))
        deep = f'<div class="passage-deep">🔽 {esc(attr_text)}</div>' if attr_text else ''
        passages.append({
            'line': f'{RIVER_NAME[other].split("—")[0].strip()} → {river_label.split("—")[0].strip()}',
            'kind': 'river-in',
            'body': f'<p>{esc(note)}</p>{deep}',
        })

    # External connectors.
    for link in LINKS_BY_RIVER.get(rnum, []):
        passages.append({
            'line': f'🔀 {link["name"]}',
            'kind': 'external',
            'body': f'<p>{esc(link["via"])}</p>',
        })

    # Skill streams.
    if rnum == SKILL_RIVER:
        for s in ALL_SKILLS:
            passages.append({'line': f'/{s}', 'kind': 'skill', 'body': '<p>Part of River XIII\'s own real skill catalog — no per-river citation needed, this IS its structural content.</p>'})
    else:
        for s, (r, note) in SKILL_SECONDARY_RIVER.items():
            if r == rnum:
                passages.append({'line': f'/{s}', 'kind': 'skill', 'body': f'<p>{esc(note)}</p>'})

    return passages


def build_river_section(rnum):
    river_label = RIVER_NAME[rnum]
    color = RIVER_COLOR[rnum]
    mods = RIVER_MODULES.get(rnum, [])
    passages = build_river_passages(rnum)
    if not passages:
        body = '<p class="empty-note">No real edges (river connections, external connectors, or skill streams) cited for this river.</p>'
    else:
        body = ''.join(
            f'<details class="passage passage-{p["kind"]}"><summary>{esc(p["line"])}</summary>{p["body"]}</details>'
            for p in passages
        )
    return f'''<section class="rsection" id="logic-river-{rnum}" style="display:none">
  <div class="rhead"><span class="rdot" style="background:{color}"></span><h2>{river_label}</h2><span class="pcount">{len(passages)} real edge(s)</span></div>
  <p class="modline">Real modules: {", ".join(f"<code>{esc(m)}</code>" for m in mods) if mods else "<i>no single-module home</i>"}</p>
  {body}
</section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Logic Dimension)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --purple:#9B59B6; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #12101a 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--purple);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:900px;margin:0 auto}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px;flex-wrap:wrap}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:var(--purple);border-color:var(--purple)}}
  .breadcrumb .bc-here{{color:#12040f;background:var(--purple);padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
  .tabs{{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}}
  .tab{{padding:5px 11px;border-radius:14px;font-size:10px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .tab.active{{background:var(--purple);color:#12040f;font-weight:700}}
  .wrap{{max-width:900px;margin:0 auto;padding:24px}}
  .rhead{{display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap}}
  .rdot{{width:12px;height:12px;border-radius:50%;flex-shrink:0}}
  .rhead h2{{font-family:Georgia,serif;font-size:18px;color:#fff}}
  .pcount{{font-size:10px;color:var(--purple);font-weight:700}}
  .modline{{font-size:11px;color:var(--dim);margin-bottom:14px}}
  .passage{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 12px;margin-bottom:8px}}
  .passage summary{{cursor:pointer;font-size:12px;font-weight:700;color:#E2E2EC;list-style:none}}
  .passage summary::-webkit-details-marker{{display:none}}
  .passage summary::before{{content:'▶ ';color:var(--purple);font-size:9px}}
  .passage[open] summary::before{{content:'▼ '}}
  .passage p{{font-size:11px;color:#b8b8c8;line-height:1.6;margin-top:8px}}
  .passage-deep{{font-size:10.5px;color:var(--gold);margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)}}
  .passage-deep code{{background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:4px}}
  .empty-note{{font-size:11px;color:var(--dim);font-style:italic}}
  .note{{max-width:900px;margin:24px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  a{{color:var(--purple)}}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Logic Dimension (Level 5 extension)</div>
  <h1>📖 Logic Dimension — Every Real Edge, Grouped By River, Click To Read</h1>
  <p>A real, additive companion to Level 5's own curated core-logic decision points (unchanged, cross-linked above) — every real river-to-river connection, external connector, and skill stream, grouped the same way modules already are, each one a clickable passage. Where a connection has real function-level attribution, that deeper detail merges into the same passage rather than a separate line.</p>
</div>
<div class="tabs">{tabs}</div>
<div class="wrap">{sections}</div>
<div class="note">
  Generated by <code>scripts/galaxy_map_logic_dimension.py</code>, reusing <code>RIVER_FLOWS</code>/<code>FLOWS_IN</code>/
  <code>LINKS_BY_RIVER</code>/<code>ALL_SKILLS</code>/<code>SKILL_SECONDARY_RIVER</code>/<code>attribute_river_connection_function()</code>
  as-is (rule 8) — the exact same real data <code>galaxy_map_module.py</code>'s own Level-2 river legend already renders,
  re-presented as clickable passages. Mapping rules: <code>system_map_spec.md</code>.
</div>
<script>
(function() {{
  var tabs = document.querySelectorAll('.tab');
  var sections = document.querySelectorAll('.rsection');
  function show(id) {{
    sections.forEach(function(s) {{ s.style.display = (s.id === id) ? '' : 'none'; }});
    tabs.forEach(function(t) {{ t.classList.toggle('active', t.dataset.target === id); }});
  }}
  tabs.forEach(function(t) {{ t.addEventListener('click', function() {{ location.hash = t.dataset.target; }}); }});
  window.addEventListener('hashchange', function() {{
    var id = location.hash.replace('#', '') || (sections[0] && sections[0].id);
    show(id);
  }});
  var id0 = location.hash.replace('#', '') || (sections[0] && sections[0].id);
  show(id0);
}})();
</script>
</body>
</html>
"""


def main():
    rivers = sorted(RIVER_NAME.keys())
    tabs = ''.join(f'<div class="tab" data-target="logic-river-{r}">{RIVER_NAME[r].split("—")[0].strip()}</div>' for r in rivers)
    sections = ''.join(build_river_section(r) for r in rivers)
    html = TEMPLATE.format(tabs=tabs, sections=sections)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    # DD7 (Aug 23 2026) — live in-flight ceo_plan_items overlay,
    # injected at the same post-process point as the level rail so a
    # regeneration can never wipe it. See inject_plan_overlay().
    html = inject_plan_overlay(html, 'logic')
    OUT.write_text(html, encoding='utf-8')
    total = sum(len(build_river_passages(r)) for r in rivers)
    print(f"Wrote {OUT} — {len(rivers)} rivers, {total} real clickable edge passages.")


if __name__ == '__main__':
    main()
