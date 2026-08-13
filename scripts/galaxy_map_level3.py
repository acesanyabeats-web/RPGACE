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
from galaxy_map import _curved_edge, _build_markers, barycenter_order  # noqa: E402
from graphify_river_group import (  # noqa: E402
    LEVEL3_MODULES, RIVER_COLOR, RIVER_NAME, RIVER_MODULES,
    parse_module_functions, compute_module_function_flow,
    compute_cross_module_function_calls, compute_function_ui_signals,
)

# Real, shared "Alex" actor color — Aug 13, Alex's own direct ask: "a
# permanent overarch bubble titled Alex... where the input is shown to
# me... the buttons i can press." Same real accent Level 0's own
# "Human Gate — Alex" node already uses (galaxy_map.py's HARNESS_NODES)
# — deliberate visual continuity so the SAME recurring human actor
# reads as one consistent identity across every level, not a
# per-level reinvention (rule 8).
ALEX_COLOR = '#E25454'

OUT = Path('graphify-out/galaxy_map_level3.html')

# Real, computed once (rule 8 — not re-derived per module): every real
# function-level call that crosses a MODULE boundary anywhere in the
# codebase — Aug 13, real Alex ask: "there should also be a back button
# to river too, with connecting level 3 from previous river being the
# backdoor." A genuine cross-module (often cross-river) function call
# is a real "backdoor" — a direct jump between two modules' own
# Level-3 pages that bypasses climbing back up through Level 2/1.
CROSS_MODULE_CALLS = compute_cross_module_function_calls()


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
    sit leftmost; everything else ranked by real longest FORWARD-path
    depth from an entry point (never guessed, never alphabetized).

    Real bug #1, found and fixed testing against all 44 real modules
    (rule 4 - verified against real data, not shipped blind): a plain
    "grow depth whenever an update strictly increases it" BFS infinite-
    loops on any real function-call CYCLE (A calls B calls A - a real,
    legitimate JS pattern, e.g. a UI revert/redo mutual-call pair like
    contentProductionLive's own _refreshWidget<->_revertToStage). A
    hard round-cap stopped the hang but produced real bug #2: cycle-
    trapped nodes kept climbing toward the cap every round, landing at
    an artificially huge depth far from their real callers, stretching
    the canvas into a mostly-empty diagram with the real content
    squeezed into one corner - confirmed by direct visual inspection
    (headless-Chromium screenshot of contentProductionLive, the real
    module that surfaced it) before shipping, not assumed fixed just
    because the hang stopped.

    Real, correct fix: a standard DFS with an explicit recursion-stack
    check for BACK edges (an edge pointing at a node already on the
    current DFS path — the textbook definition of a graph cycle). A
    back edge is real and still DRAWN (compute_module_function_flow()'s
    own edge list is untouched), it's just excluded from the DEPTH
    computation — so a cycle no longer inflates anyone's rank, and
    every node gets a real, finite, honestly-small depth reflecting its
    actual forward distance from an entry point."""
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
    on_stack = set()
    visited = set()

    def visit(f, d):
        if f in on_stack:
            return  # real back edge — a genuine cycle, not a deeper path
        if f in visited and depth.get(f, -1) >= d:
            return  # already reached at an equal-or-greater real depth
        depth[f] = max(depth.get(f, -1), d)
        visited.add(f)
        on_stack.add(f)
        # Real, pre-existing non-determinism bug found + fixed Aug 13,
        # same navigation-overhaul pass (rule 4 — this diagram claims
        # to be deterministic; a fresh re-run genuinely produced a
        # different layout, caught by an actual idempotency re-check,
        # not assumed). `callees.get(f, ())` is a `set()` — Python
        # hash-randomizes string set iteration order PER PROCESS
        # (PYTHONHASHSEED unset, confirmed) — this visit order feeds
        # `depth[]` directly, so two back-to-back runs of this exact
        # script on the exact same source could silently produce
        # different node positions. sorted() makes the traversal order
        # (and therefore the whole diagram) reproducible again.
        for c in sorted(callees.get(f, ())):
            visit(c, d + 1)
        on_stack.discard(f)

    for e in entries:
        visit(e, 0)
    for f in funcs:
        depth.setdefault(f, 0)
    return depth


def build_module_section(module_name):
    color = RIVER_COLOR.get(_owning_river(module_name), '#C9A84C')
    funcs = parse_module_functions(module_name)
    edges = compute_module_function_flow(module_name)
    depth = compute_function_rank(funcs, edges)
    max_depth = max(depth.values()) if depth else 0

    # bucket functions by real computed depth, place top-to-bottom
    # within each depth column, left-to-right by depth itself
    buckets = {}
    for f in funcs:
        buckets.setdefault(depth[f], []).append(f)
    # Real crossing-reduction pass (Aug 13, Alex's own rule: "make it so
    # no edges ever cross each other, way more important than keeping
    # bubbles in a row") — same shared barycenter heuristic Level 2
    # uses (rule 8), applied one level deeper across real depth columns.
    rank_order = sorted(buckets.keys())
    buckets = barycenter_order(buckets, edges, rank_order)
    # Real sizing fix (found the same pass the compute_function_rank
    # cycle-cap fix shipped, testing against all 44 real modules):
    # canvas HEIGHT must come from the WIDEST real column (most
    # functions sharing one computed depth) — a module can have a
    # small max_depth but many functions converging at one depth
    # (a real fan-out/fan-in shape), and the old formula sized H from
    # depth count alone, which would silently crowd/overlap nodes in
    # exactly that real case. WIDTH still comes from depth count —
    # that's the real axis depth actually measures.
    max_col = max((len(v) for v in buckets.values()), default=1)
    W = max(1400, 260 + max_depth * 260)
    # Real, fixed top margin (Aug 13, Alex's own ask) — room for the
    # permanent "Alex" bubble above the function grid, on EVERY module
    # section, not sized off any per-module data (a "permanent overarch
    # bubble" per Alex's own wording — always present, always the same
    # relative position, so it reads as one consistent recurring actor).
    ALEX_Y = 95
    ALEX_MARGIN = 190
    H = max(700, 90 * (max_col + 1)) + ALEX_MARGIN
    grid_cy = ALEX_MARGIN + (H - ALEX_MARGIN) / 2
    # Real "backdoor" column (Aug 13, Alex's own ask): any function in
    # THIS module with a real, direct RPGACE.modules.X.fn() call into
    # another module gets a real gateway node, one column right of the
    # rightmost real rank — a genuine cross-module (often cross-river)
    # jump straight into that module's own Level-3 page, bypassing the
    # climb back up through Level 2/1.
    backdoors = [(from_func, to_mod, to_func) for from_mod, from_func, to_mod, to_func in CROSS_MODULE_CALLS
                 if from_mod == module_name and to_mod in LEVEL3_MODULES]
    has_backdoors = bool(backdoors)
    if has_backdoors:
        W += 260

    pos = {}
    for d, items in buckets.items():
        n = len(items)
        x = 140 + d * 260
        for i, f in enumerate(items):
            y = grid_cy + (i - (n - 1) / 2) * 90
            pos[f] = (x, y)

    nodes_svg, edges_svg = [], []
    edge_colors_used = {color, ALEX_COLOR}
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

    # Real, permanent "Alex" bubble (Aug 13, Alex's own direct ask) —
    # ALWAYS drawn, same fixed position on every module section, so it
    # reads as one consistent recurring actor rather than a per-module
    # invention. Two real, mechanical signals per function
    # (compute_function_ui_signals(), rule 8): OUTPUT = real DOM/popup-
    # rendering evidence ("shown to me"), INPUT = real button-wiring/
    # input-reading evidence ("buttons i can press"). A function with
    # neither signal (the honest majority — pure internal logic) simply
    # doesn't connect; "if it makes sense" per Alex's own wording, never
    # forced. What a real INPUT function does with that input onward is
    # already visible via its own existing outgoing call edges (drawn
    # above) — the Alex edges don't duplicate that, they just show
    # where the human enters/exits the chain.
    ui_sigs = compute_function_ui_signals(module_name)
    alex_x, alex_y = W / 2, ALEX_Y
    n_out = n_in = 0
    for f in funcs:
        if f not in pos:
            continue
        sig = ui_sigs.get(f, {})
        fx, fy = pos[f]
        if sig.get('output'):
            n_out += 1
            ox = alex_x + (n_out * 11 if n_out % 2 == 0 else -n_out * 11)
            edges_svg.append(_curved_edge(fx, fy, ox, alex_y, ALEX_COLOR, real=True, dashed=True, r1=26, r2=20, offset_mult=0.6))
        if sig.get('input'):
            n_in += 1
            ix = alex_x + (n_in * 15 if n_in % 2 == 1 else -n_in * 15)
            edges_svg.append(_curved_edge(ix, alex_y, fx, fy, ALEX_COLOR, real=True, dashed=True, r1=20, r2=26, offset_mult=-0.6))
    nodes_svg.append(
        f'<g class="node central"><circle cx="{alex_x}" cy="{alex_y}" r="34" fill="#0f0f1a" stroke="{ALEX_COLOR}" stroke-width="3.5" filter="url(#glow)"/>'
        f'<text x="{alex_x}" y="{alex_y-4}" text-anchor="middle" font-size="20">🧑</text>'
        f'<text x="{alex_x}" y="{alex_y+50}" text-anchor="middle" font-size="10.5" fill="{ALEX_COLOR}" font-weight="700">Alex</text>'
        f'<text x="{alex_x}" y="{alex_y+64}" text-anchor="middle" font-size="8" fill="{ALEX_COLOR}" opacity="0.85">{n_out} shown to me · {n_in} buttons I press</text></g>'
    )

    # Real backdoor nodes — real, clickable, drawn distinctly (dashed
    # edge, a door icon, target module's own river color) from a same-
    # module function-call edge, honest about being a cross-module jump.
    backdoor_legend = []
    if has_backdoors:
        bx_col = 140 + (max_depth + 1) * 260
        seen_targets = {}
        for fname, target_mod, target_fn in backdoors:
            if fname not in pos:
                continue
            seen_targets.setdefault(target_mod, []).append((fname, target_fn))
        n_targets = len(seen_targets) or 1
        for i, (target_mod, calls) in enumerate(seen_targets.items()):
            by = grid_cy + (i - (n_targets - 1) / 2) * 100
            tcolor = RIVER_COLOR.get(_owning_river(target_mod), '#C9A84C')
            for fname, target_fn in calls:
                fx, fy = pos[fname]
                edges_svg.append(_curved_edge(fx, fy, bx_col, by, tcolor, real=True, dashed=True, r1=26, r2=24))
                edge_colors_used.add(tcolor)
            t_rnum = _owning_river(target_mod)
            nodes_svg.append(
                f'<a href="galaxy_map_level3.html#mod-{target_mod}" class="drill-link"><g class="node">'
                f'<rect x="{bx_col-24}" y="{by-24}" width="48" height="48" rx="10" fill="#0f0f1a" stroke="{tcolor}" stroke-width="2.5" filter="url(#glow)"/>'
                f'<text x="{bx_col}" y="{by+7}" text-anchor="middle" font-size="18">🚪</text></g>'
                f'<text x="{bx_col}" y="{by+42}" text-anchor="middle" font-size="9.5" fill="{tcolor}">{target_mod}</text>'
                f'<text x="{bx_col}" y="{by+54}" text-anchor="middle" font-size="8" fill="{tcolor}" opacity="0.8">River {t_rnum} backdoor</text></a>'
            )
            backdoor_legend.append(
                f'<div class="legend-row small"><span class="dot" style="background:{tcolor}"></span>'
                f'<b>{", ".join(f for f, _t in calls)}</b> → <code>{target_mod}</code> (River {t_rnum}) '
                f'<span class="meta">Real cross-module backdoor — jumps directly to that module\'s own Level-3 chain.</span></div>'
            )

    legend_rows = ''.join(
        f'<div class="legend-row small"><span class="dot" style="background:{color}"></span>'
        f'<code>{a}</code> → <code>{b}</code></div>'
        for a, b in edges
    ) or '<div class="legend-row small"><span class="meta">No real direct same-module calls found between this module\'s own functions.</span></div>'
    legend_rows += ''.join(backdoor_legend)

    rnum = _owning_river(module_name)
    river_link = f'<a href="galaxy_map_module.html#river-{rnum}">River {rnum}</a>' if rnum else 'an unrouted module'
    back_btn = (f'<a href="galaxy_map_module.html#river-{rnum}" class="back-btn">← Back to River {rnum} (Level 2)</a>'
                if rnum else '')

    return f'''
<section class="mod-section" id="mod-{module_name}" style="display:none">
  <div class="rhead"><span class="rdot" style="background:{color}"></span><h2>⚙️ {module_name} — real function-call chain</h2></div>
  {back_btn}
  <p class="rlegend-role">Drilled down from {river_link}'s own Level-2 module node. 🚪 = a real entry point (nothing calls it, or it's <code>init</code> itself) · 🏁 = a real leaf/terminal function (calls nothing else in this module) · ⚙️ = an intermediate real function{' · 🚪 (right, dashed) = a real cross-module backdoor' if has_backdoors else ''}. {len(funcs)} real functions, {len(edges)} real direct call edges — same grep-based direct-call-only technique as the module-level flow one level up, same honest blind spot: a relationship reached via a callback reference or <code>RPGACE.hooks</code> is invisible here. <b>🧑 Alex</b> (top, permanent on every module) is the real human actor — a dashed line INTO Alex means that function has real DOM/popup-rendering evidence (something you'd actually see); a dashed line OUT of Alex means that function has real button/input-wiring evidence (something you actually click or type into). A function with neither is honest, normal internal logic — not everything is user-facing.</p>
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
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:var(--gold);border-color:var(--gold)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--gold);padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
  .river-toggle{{max-width:1400px;margin:16px auto 0;padding:0 24px}}
  .river-toggle-group{{margin-bottom:8px}}
  .river-toggle-label{{font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:2px 8px 4px}}
  .tabs{{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}}
  .tab{{padding:6px 14px;border-radius:16px;font-size:11.5px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .tab.active{{background:var(--gold);color:#1a1a12;font-weight:700}}
  .rhead{{display:flex;align-items:center;gap:10px;justify-content:center;padding:24px 24px 6px}}
  .rdot{{width:12px;height:12px;border-radius:50%}}
  .rhead h2{{font-family:Georgia,serif;font-size:19px;color:#fff}}
  .rlegend-role{{text-align:center;color:var(--dim);font-size:11.5px;max-width:820px;margin:0 auto 16px;line-height:1.6;padding:0 24px}}
  .back-btn{{display:block;text-align:center;font-size:11px;font-weight:700;color:var(--gold);text-decoration:none;margin:0 0 10px}}
  .back-btn:hover{{text-decoration:underline}}
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
<div class="breadcrumb">
  <a href="galaxy_map.html">🌌 Level 0</a><span class="bc-sep">→</span>
  <a href="galaxy_map_river.html">🏛️ Level 1</a><span class="bc-sep">→</span>
  <a href="galaxy_map_module.html">🌊 Level 2</a><span class="bc-sep">→</span>
  <span class="bc-here">🔽 Level 3</span>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Level 3</div>
  <h1>🔽 Function-Level Drill-Down</h1>
  <p>Drilled down from <a href="galaxy_map_module.html">a river's own modules (Level 2)</a>, from <a href="galaxy_map_river.html">the 16 rivers (Level 1)</a>, from <a href="galaxy_map.html">the Galaxy Map (Level 0)</a>. All {n_modules} of 44 real Level-2 modules now have a built Level-3 page. Each section shows that module's own real functions and the real direct calls between them, left (entry) to right (terminal), same principle as every other level. A dashed 🚪 gateway on the far right is a real cross-module "backdoor" — a genuine <code>RPGACE.modules.X.fn()</code> call reaching directly into another module's own chain, jumping there without climbing back up through Level 2/1. Use the river-grouped switcher below to jump between modules without leaving Level 3, or the "← Back to River" button on each section to return to Level 2.</p>
</div>
<div class="river-toggle">{river_toggle}</div>
{sections}
<div class="note">
  Generated by <code>scripts/galaxy_map_level3.py</code> — real data from <code>graphify_river_group.py</code>'s
  <code>parse_module_functions()</code>/<code>compute_module_function_flow()</code>/<code>compute_cross_module_function_calls()</code>
  (never re-derived, real grep-based direct-call evidence). All 44 real Level-2 modules built.
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
    # Real river-grouped switcher (Aug 13, Alex's own ask: "a toggle
    # button panel to switch level 2 objects") — organizes the module
    # switcher by real owning river (_owning_river(), rule 8, not
    # re-derived) instead of one flat 44-tab wall, so jumping to a
    # sibling module in the SAME river (the common case) is a short
    # visual scan, not a search across an unsorted list.
    by_river = {}
    for m in mods:
        by_river.setdefault(_owning_river(m), []).append(m)
    river_toggle = []
    for rnum in sorted(by_river, key=lambda r: (r is None, r)):
        rmods = by_river[rnum]
        rcolor = RIVER_COLOR.get(rnum, '#8a8a9a')
        rname = RIVER_NAME.get(rnum, 'Unrouted').split('—')[0].strip()
        tabs_html = ''.join(f'<div class="tab" data-target="mod-{m}">{m}</div>' for m in rmods)
        river_toggle.append(
            f'<div class="river-toggle-group"><div class="river-toggle-label" style="color:{rcolor}">River {rnum} — {rname}</div>'
            f'<div class="tabs" style="border-bottom:none;padding:0 0 8px;justify-content:flex-start">{tabs_html}</div></div>'
        )
    sections = ''.join(build_module_section(m) for m in mods)
    html = TEMPLATE.format(river_toggle=''.join(river_toggle), sections=sections, n_modules=len(mods))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    total_funcs = sum(len(parse_module_functions(m)) for m in mods)
    total_edges = sum(len(compute_module_function_flow(m)) for m in mods)
    print(f"Wrote {OUT} — {len(mods)} module(s), {total_funcs} real functions, {total_edges} real call edges.")


if __name__ == '__main__':
    main()
