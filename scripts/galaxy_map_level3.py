#!/usr/bin/env python3
"""
galaxy_map_level3.py — G14 proof-of-concept of the ratified "RPGACE
Total Systems Galaxy Map" /CEO plan (Aug 13 2026). Alex's own direct
ask, in his own words: "i'd like to reitterate level 2 diagram left to
right: it should only end as rivers as exits and flow through a level
3 structure which is a module or function, with those flow through
buttons being the gateway to level 3 diagrams."

Real scope, honestly bounded (matches the Phylum-11-restructure
precedent — prove the pattern on ONE real case before a 44-module
rollout): this file draws ONE Level-3 section per module in
LEVEL3_MODULES (graphify_river_group.py, currently `{'beatLog'}`).
Each section shows that module's own real top-level functions
(parse_module_functions()) and the real direct-call edges between
them (compute_module_function_flow()) — the same real, mechanical,
grep-based-evidence technique compute_intra_river_flow() already uses
one level up, just at function grain instead of module grain (rule 8,
same method, not reinvented).

Real, honest scope limits, stated plainly, not hidden (same shape as
every other level's own stated blind spot): only DIRECT `self.<fn>()`/
`<moduleName>.<fn>()` calls are caught — a relationship carried
through a callback reference, RPGACE.hooks.fire(), or a DOM event
listener registered once in init() is invisible to this method. An
absence of an edge is not proof no real relationship exists, only that
no direct call was found. Nested/closure-scoped helper functions
(never assigned as a module method) are deliberately not surfaced as
separate nodes — they're not part of the module's own real public
call-chain surface.

Layout: left-to-right, same standing Level-2 principle (system_map_
spec.md §9) — `init`-adjacent entry functions on the left, real
computed rank by call-depth flowing right, terminal/leaf functions
(nothing calls out further) on the right. Reuses polar()/_curved_edge()/
_build_markers() from galaxy_map.py (rule 8, never re-derived).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from galaxy_map import _curved_edge, _build_markers  # noqa: E402
from graphify_river_group import (  # noqa: E402
    LEVEL3_MODULES, RIVER_COLOR, RIVER_MODULES,
    parse_module_functions, compute_module_function_flow,
)

OUT = Path('graphify-out/galaxy_map_level3.html')


def _owning_river(module_name):
    for rnum, mods in RIVER_MODULES.items():
        if module_name in mods:
            return rnum
    return None


def compute_function_rank(funcs, edges):
    """Real, evidence-derived left-to-right rank per function — same
    technique as compute_module_flow_rank() one level up (rule 8):
    real terminals (nothing calls OUT to another local function) sit
    rightmost; real entry points (nothing calls IN, or `init` itself)
    sit leftmost; everything else ranked by real longest-path depth
    from an entry point, computed by a plain BFS over the real edges
    (never guessed, never alphabetized)."""
    callers = {f: set() for f in funcs}
    callees = {f: set() for f in funcs}
    for a, b in edges:
        if a in callees:
            callees[a].add(b)
        if b in callers:
            callers[b].add(a)
    entries = [f for f in funcs if not callers.get(f) or f == 'init']
    if not entries:
        entries = funcs[:1]
    depth = {}
    frontier = [(f, 0) for f in entries]
    for f, _d in frontier:
        depth[f] = 0
    while frontier:
        nxt = []
        for f, d in frontier:
            for c in callees.get(f, ()):
                if c not in depth or depth[c] < d + 1:
                    depth[c] = d + 1
                    nxt.append((c, d + 1))
        frontier = nxt
    for f in funcs:
        depth.setdefault(f, 0)
    return depth


def build_module_section(module_name):
    color = RIVER_COLOR.get(_owning_river(module_name), '#C9A84C')
    funcs = parse_module_functions(module_name)
    edges = compute_module_function_flow(module_name)
    depth = compute_function_rank(funcs, edges)
    max_depth = max(depth.values()) if depth else 0
    W = max(1400, 260 + max_depth * 260)
    H = max(700, 90 * (max(depth.values(), default=0) + 2))

    # bucket functions by real computed depth, place top-to-bottom
    # within each depth column, left-to-right by depth itself
    buckets = {}
    for f in funcs:
        buckets.setdefault(depth[f], []).append(f)
    pos = {}
    for d, items in buckets.items():
        n = len(items)
        x = 140 + d * 260
        for i, f in enumerate(items):
            y = (H / 2) + (i - (n - 1) / 2) * 90
            pos[f] = (x, y)

    nodes_svg, edges_svg = [], []
    edge_colors_used = {color}
    for a, b in edges:
        if a in pos and b in pos:
            ax, ay = pos[a]
            bx, by = pos[b]
            edges_svg.append(_curved_edge(ax, ay, bx, by, color, real=True, r1=26, r2=26))
    for f in funcs:
        if f not in pos:
            continue
        x, y = pos[f]
        is_entry = (f == 'init' or depth[f] == 0)
        is_leaf = not any(a == f for a, _b in edges)
        icon = '🚪' if is_entry else ('🏁' if is_leaf else '⚙️')
        ring = '3' if is_entry else '2'
        nodes_svg.append(
            f'<g class="node"><circle cx="{x}" cy="{y}" r="26" fill="#0f0f1a" stroke="{color}" stroke-width="{ring}" filter="url(#glow)"/>'
            f'<text x="{x}" y="{y+6}" text-anchor="middle" font-size="15">{icon}</text></g>'
            f'<text x="{x}" y="{y+40}" text-anchor="middle" font-size="9.5" fill="{color}">{f}</text>'
        )

    legend_rows = ''.join(
        f'<div class="legend-row small"><span class="dot" style="background:{color}"></span>'
        f'<code>{a}</code> → <code>{b}</code></div>'
        for a, b in edges
    ) or '<div class="legend-row small"><span class="meta">No real direct same-module calls found between this module\'s own functions.</span></div>'

    rnum = _owning_river(module_name)
    river_link = f'<a href="galaxy_map_module.html#river-{rnum}">River {rnum}</a>' if rnum else 'an unrouted module'

    return f'''
<section class="mod-section" id="mod-{module_name}" style="display:none">
  <div class="rhead"><span class="rdot" style="background:{color}"></span><h2>⚙️ {module_name} — real function-call chain</h2></div>
  <p class="rlegend-role">Drilled down from {river_link}'s own Level-2 module node. 🚪 = a real entry point (nothing calls it, or it's <code>init</code> itself) · 🏁 = a real leaf/terminal function (calls nothing else in this module) · ⚙️ = an intermediate real function. {len(funcs)} real functions, {len(edges)} real direct call edges — same grep-based direct-call-only technique as the module-level flow one level up, same honest blind spot: a relationship reached via a callback reference or <code>RPGACE.hooks</code> is invisible here.</p>
  <div class="canvas-wrap"><svg viewBox="0 0 {W} {H}" width="100%" style="max-width:{W}px;display:block;margin:0 auto">
    <defs>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="edgeglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      {_build_markers(edge_colors_used)}
    </defs>
    {''.join(edges_svg)}
    {''.join(nodes_svg)}
  </svg></div>
  <div class="legend"><h3>Real function-call edges</h3>{legend_rows}</div>
</section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Level 3)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #12121e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:28px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto}}
  .tabs{{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}}
  .tab{{padding:6px 14px;border-radius:16px;font-size:11.5px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .tab.active{{background:var(--gold);color:#1a1a12;font-weight:700}}
  .rhead{{display:flex;align-items:center;gap:10px;justify-content:center;padding:24px 24px 6px}}
  .rdot{{width:12px;height:12px;border-radius:50%}}
  .rhead h2{{font-family:Georgia,serif;font-size:19px;color:#fff}}
  .rlegend-role{{text-align:center;color:var(--dim);font-size:11.5px;max-width:820px;margin:0 auto 16px;line-height:1.6;padding:0 24px}}
  .canvas-wrap{{max-width:1600px;margin:0 auto;overflow-x:auto}}
  svg text{{font-family:'Segoe UI',system-ui,sans-serif;user-select:none}}
  .legend{{max-width:820px;margin:16px auto 40px;padding:0 24px}}
  .legend h3{{font-family:Georgia,serif;font-size:14px;color:var(--gold);margin:0 0 8px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px}}
  .legend-row{{font-size:11.5px;color:var(--dim);padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)}}
  .dot{{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10.5px;background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:3px}}
  a{{color:var(--gold)}}
  .note{{max-width:820px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Level 3</div>
  <h1>🔽 Function-Level Drill-Down</h1>
  <p>Drilled down from <a href="galaxy_map_module.html">a river's own modules (Level 2)</a>, from <a href="galaxy_map_river.html">the 16 rivers (Level 1)</a>, from <a href="galaxy_map.html">the Galaxy Map (Level 0)</a>. Real proof-of-concept — currently {n_modules} of 44 real Level-2 modules have a built Level-3 page; a module without one stays a plain (non-clickable) node at Level 2. Each section shows that module's own real functions and the real direct calls between them, left (entry) to right (terminal), same principle as every other level.</p>
</div>
<div class="tabs">{tabs}</div>
{sections}
<div class="note">
  Generated by <code>scripts/galaxy_map_level3.py</code> — real data from <code>graphify_river_group.py</code>'s
  <code>parse_module_functions()</code>/<code>compute_module_function_flow()</code> (never re-derived, real grep-based
  direct-call evidence). Real, honest scope: proof-of-concept on {n_modules} module(s)
  (<code>LEVEL3_MODULES</code>) — the full 44-module rollout is real, scoped, tracked separately.
  Mapping rules: <code>system_map_spec.md</code>.
</div>
<script>
(function() {{
  var tabs = document.querySelectorAll('.tab');
  var sections = document.querySelectorAll('.mod-section');
  function show(id) {{
    sections.forEach(function(s) {{ s.style.display = (s.id === id) ? '' : 'none'; }});
    tabs.forEach(function(t) {{ t.classList.toggle('active', t.dataset.target === id); }});
  }}
  tabs.forEach(function(t) {{
    t.addEventListener('click', function() {{ location.hash = t.dataset.target; }});
  }});
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
    mods = sorted(LEVEL3_MODULES)
    tabs = ''.join(
        f'<div class="tab" data-target="mod-{m}">{m}</div>' for m in mods
    )
    sections = ''.join(build_module_section(m) for m in mods)
    html = TEMPLATE.format(tabs=tabs, sections=sections, n_modules=len(mods))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    total_funcs = sum(len(parse_module_functions(m)) for m in mods)
    total_edges = sum(len(compute_module_function_flow(m)) for m in mods)
    print(f"Wrote {OUT} — {len(mods)} module(s), {total_funcs} real functions, {total_edges} real call edges.")


if __name__ == '__main__':
    main()
