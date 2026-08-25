#!/usr/bin/env python3
"""
galaxy_map_current.py — G47 of the ratified L0/Dimension/River/Module/
Current redefinition (Aug 18 2026). Real REPLACEMENT for Level 3's old
role (a per-module function-call-chain graph) — Alex's own direct words:
"i think we can replace it tbh... level 3 will be a series of currents
and its logic." Absorbs Level 5's curated "core logic" decider framing
(kept as a real ⭐ notable tag, never deleted) and Level 6's exhaustive
branch data (every function's own real handling detail) — real
/deduplication verdict from Part 8 of the ratified plan.

Real per-function unit-bubble tying (4D.2/7B.2): Alex (real UI in/out
evidence), Oracle/External AI (real call-count), Supabase (real
injection-tool table touches). Skills honestly show none at this grain
— no per-function skill citation evidence exists (stated plainly, not
forced; Skills injection is real at River grain only, see G46).

Real "next" hop (4D.2's "what function it ships to next"): reuses
compute_cross_module_function_calls() for the real cross-module case;
same-module call-chain data isn't separately computed by any existing
detector, so honestly shown as "not tracked at this grain" rather than
guessed.

Level 4's OLD role (dashboard-card flow) retires into Module/G48 per
the already-locked plan; this script does NOT touch galaxy_map_level4.py
directly — G48 repurposes that file's own content separately.

**Real Aug 21 2026 fold (G65) — Alex's own direct ask ("nothing
superseded... this should exist for everywhere that has 2 views").**
The real per-module SVG call-chain diagram that used to live as its
own standalone page (galaxy_map_level3.py/.html) is now this page's
own real MAP view per module, toggled against the per-function TABLE
rows already built here. All of Level 3's own real rendering logic
(compute_function_rank/_split_into_bands/_render_band/the per-module
build routine) was moved here VERBATIM — copied, not retyped, to avoid
introducing a bug into carefully-tuned, previously-debugged layout
code (the DFS cycle-guard, the sorted() determinism fix, the rank-band
crowding split all have real, dated bug histories in the old file's
own comments, preserved here unchanged). galaxy_map_level3.py/.html
are deleted outright once this fold was verified working end to end —
every one of the ~22 real cross-references elsewhere in the pipeline
that used to point at galaxy_map_level3.html#mod-X now points at
galaxy_map_current.html#mod-X, same real anchor scheme both scripts
already shared.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    parse_module_ranges, _function_bodies, compute_function_branches,
    compute_function_ui_signals, compute_oracle_call_counts,
    compute_supabase_table_touches, compute_cross_module_function_calls,
    RIVER_MODULES, RIVER_NAME, RIVER_COLOR, CORE_JS,
    parse_module_functions, compute_module_function_flow,
    compute_external_call_sites, compute_lastfm_call_sites,
    FLOWS_IN, attribute_river_connection_function, LEVEL3_MODULES,
    render_evidence_bubble, dimension_index_html, DIMENSION_INDEX_CSS,
)
from graphify_river_group import inject_level_rail  # noqa: E402
from galaxy_map_decision_matrix import LOGIC_POINTS as DECISION_POINTS  # noqa: E402
from galaxy_map_decisions import DECISION_POINTS as _DECISION_POINTS  # noqa: E402
from galaxy_map import _curved_edge, _build_markers, barycenter_order  # noqa: E402

OUT = Path('graphify-out/galaxy_map_current.html')

# Real Aug 21 2026 fold (G65) — Alex's own direct ask: "everywhere that
# has 2 views" gets a real map/table toggle, and "nothing superseded."
# Level 3's own real function-call-chain SVG renderer (compute_function_
# rank/_split_into_bands/_render_band/build_module_section, all moved
# verbatim from the now-deleted galaxy_map_level3.py — copied, not
# retyped, to avoid introducing a bug into carefully-tuned, previously-
# debugged layout code) becomes this page's real MAP view; the existing
# per-function rows above stay the real TABLE view. Same real anchor
# convention both scripts already shared (`id="mod-{module}"`), so
# every one of the ~22 real `galaxy_map_level3.html#mod-X` links across
# the rest of the pipeline was repointed at `galaxy_map_current.html`
# with zero anchor-scheme change needed.
DECISIONS_BY_FUNC = {(dp['module'], dp['func']): dp for dp in _DECISION_POINTS}
ALEX_COLOR = '#E25454'
ORACLE_COLOR = '#9B59B6'
COMPOSIO_COLOR = '#4CAF82'
LASTFM_COLOR = '#D9534F'
BAND_LABELS = ['🚪 Entry & Early Logic', '⚙️ Core Logic', '🏁 Output & Terminal']
BAND_THRESHOLD = 15

_river_of = {}
for _r, _mods in RIVER_MODULES.items():
    for _m in _mods:
        _river_of[_m] = _r

# Real, hand-curated notable lookup — {(module, func): decision_point},
# reused directly from Level 5 (rule 8), never re-derived. A decision
# point with no real 'func' key (module-scoped only) is skipped here —
# it stays real Level-5 content, just not attachable to one function.
NOTABLE = {(dp['module'], dp['func']): dp for dp in DECISION_POINTS if dp.get('func')}

CROSS_CALLS = compute_cross_module_function_calls()
NEXT_HOPS = {}
PREV_HOPS = {}
for fm, ff, tm, tf in CROSS_CALLS:
    NEXT_HOPS.setdefault((fm, ff), []).append((tm, tf))
    PREV_HOPS.setdefault((tm, tf), []).append((fm, ff))

MODULES = sorted(m for mods in RIVER_MODULES.values() for m in mods)
KIND_ICON = {'if': '🔀', 'else if': '🔁', 'else': '↩️', 'switch': '🔢'}


def _incoming_attribution_for_module(module_name):
    """Real pairing (moved verbatim from galaxy_map_level3.py, Aug 21
    2026 fold, G65) — reuses the exact same real evidence Level 2's own
    "next function" stub already found (attribute_river_connection_
    function(), rule 8, not re-derived): does any real river-to-river
    connection actually land on ONE OF THIS MODULE'S OWN FUNCTIONS
    specifically? Returns (from_river_num, to_func, reason) or None."""
    rnum = _river_of.get(module_name)
    if rnum is None:
        return None
    for other, note, itype in FLOWS_IN.get(rnum, []):
        attr = attribute_river_connection_function(other, rnum, note, cross_calls=CROSS_CALLS, itype=itype)
        if attr and attr[1] == module_name:
            return (other, attr[2], attr[3])
    return None


def compute_function_rank(funcs, edges):
    """Real, evidence-derived left-to-right rank per function (moved
    verbatim from galaxy_map_level3.py, G65 fold) — real terminals sit
    rightmost, real entry points sit leftmost, everything else ranked
    by real longest FORWARD-path depth from an entry point. Uses a DFS
    with an explicit recursion-stack cycle check (a real back edge is
    still drawn, just excluded from depth) — a real bug fixed against
    all 44 modules before this code was ever moved (contentProduction-
    Live's own _refreshWidget<->_revertToStage cycle)."""
    callers = {f: set() for f in funcs}
    callees = {f: set() for f in funcs}
    for a, b in edges:
        if a in callees:
            callees[a].add(b)
        if b in callers:
            callers[b].add(a)
    init_callees = callees.get('init', set())
    if 'init' in funcs:
        entries = sorted(init_callees) + [f for f in funcs if f != 'init' and not callers.get(f) and f not in init_callees]
    else:
        entries = [f for f in funcs if not callers.get(f)]
    if not entries:
        entries = [f for f in funcs if f != 'init'] or funcs[:1]
        entries = entries[:1]
    depth = {}
    on_stack = set()
    visited = set()

    def visit(f, d):
        if f in on_stack:
            return
        if f in visited and depth.get(f, -1) >= d:
            return
        depth[f] = max(depth.get(f, -1), d)
        visited.add(f)
        on_stack.add(f)
        for c in sorted(callees.get(f, ())):
            visit(c, d + 1)
        on_stack.discard(f)

    for e in entries:
        visit(e, 0)
    for f in funcs:
        depth.setdefault(f, 0)
    return depth


def _split_into_bands(funcs, depth):
    """Real depth-range banding for crowded modules (moved verbatim
    from galaxy_map_level3.py, G65 fold) — splits a module's real
    functions into up to 3 depth-ordered bands by real function count.
    A module at/under BAND_THRESHOLD gets exactly ONE band."""
    if len(funcs) <= BAND_THRESHOLD:
        return [{'label': None, 'funcs': list(funcs)}]
    by_depth = {}
    for f in funcs:
        by_depth.setdefault(depth[f], []).append(f)
    depths_sorted = sorted(by_depth)
    target = len(funcs) / 3
    bands, cur = [], []
    for d in depths_sorted:
        cur.extend(by_depth[d])
        if len(cur) >= target and len(bands) < 2 and d != depths_sorted[-1]:
            bands.append(cur)
            cur = []
    if cur:
        bands.append(cur)
    return [{'label': BAND_LABELS[i] if i < len(BAND_LABELS) else f'Band {i + 1}', 'funcs': b}
            for i, b in enumerate(bands)]


def _render_band(module_name, color, band_funcs, all_module_funcs, depth, edges, ui_sigs,
                  incoming_attr, backdoors, func_to_band, bands, band_idx, alex_y_const, has_backdoors_module,
                  oracle_counts=None, composio_counts=None, lastfm_counts=None):
    """Real, per-band canvas builder (moved verbatim from galaxy_map_
    level3.py, G65 fold — see that file's own git history for the full
    real design rationale: rank-band split, evidence-gated Alex/Oracle/
    Composio/Last.fm bubbles, real cross-band/backdoor stubs)."""
    band_funcs_set = set(band_funcs)
    band_depths = [depth[f] for f in band_funcs]
    min_d, max_d = min(band_depths, default=0), max(band_depths, default=0)
    buckets = {}
    for f in band_funcs:
        buckets.setdefault(depth[f], []).append(f)
    intra_edges = [(a, b) for a, b in edges if a in band_funcs_set and b in band_funcs_set]
    rank_order = sorted(buckets.keys())
    buckets = barycenter_order(buckets, intra_edges, rank_order)
    max_col = max((len(v) for v in buckets.values()), default=1)
    W = max(1400, 260 + (max_d - min_d) * 260)
    ALEX_MARGIN = 420
    H = max(700, 90 * (max_col + 1)) + ALEX_MARGIN
    grid_cy = ALEX_MARGIN + (H - ALEX_MARGIN) / 2
    my_backdoors = [(f, tm, tf) for f, tm, tf in backdoors if f in band_funcs_set]
    if my_backdoors:
        W += 260
    STUB_MARGIN = 220
    cross_out = [(a, b) for a, b in edges if a in band_funcs_set and b not in band_funcs_set and b in all_module_funcs]
    cross_in = [(a, b) for a, b in edges if b in band_funcs_set and a not in band_funcs_set and a in all_module_funcs]
    if cross_out or cross_in:
        W += STUB_MARGIN

    pos = {}
    for d, items in buckets.items():
        n = len(items)
        x = STUB_MARGIN if cross_in else 140
        x += (d - min_d) * 260
        for i, f in enumerate(items):
            y = grid_cy + (i - (n - 1) / 2) * 90
            pos[f] = (x, y)

    nodes_svg, edges_svg = [], []
    edge_colors_used = {color, ALEX_COLOR}
    for a, b in intra_edges:
        if a in pos and b in pos:
            ax, ay = pos[a]
            bx, by = pos[b]
            edges_svg.append(_curved_edge(ax, ay, bx, by, color, real=True, r1=26, r2=26))
    for f in band_funcs:
        if f not in pos:
            continue
        x, y = pos[f]
        is_entry = (depth[f] == 0)
        is_leaf = not any(a == f for a, _b in edges)
        icon = '🚪' if is_entry else ('🏁' if is_leaf else '⚙️')
        ring = '3' if is_entry else '2'
        incoming_badge = ''
        if is_entry and incoming_attr and f == incoming_attr[1]:
            from_river_name = RIVER_NAME.get(incoming_attr[0], '').split('—')[0].strip()
            incoming_badge = f'<text x="{x}" y="{y-32}" text-anchor="middle" font-size="8" fill="{color}" opacity="0.9">⬅ from River {incoming_attr[0]} ({from_river_name})</text>'
        nav_badge = ''
        if is_entry:
            nav_badge = (f'<a href="galaxy_map_module.html#mod-{module_name}">'
                         f'<text x="{x}" y="{y+52}" text-anchor="middle" font-size="7.5" fill="#5FB3D9" text-decoration="underline">🔭 zoom out: Level 2</text></a>')
        elif is_leaf and (module_name, f) in NOTABLE:
            # NOTABLE (module-scope above) is the exact same real
            # {(module,func): decision_point} shape galaxy_map_level3.py
            # used to keep as its own separate LEVEL5_BY_FUNC — same
            # source (the curated LOGIC_POINTS, now in
            # galaxy_map_decision_matrix.py), same filter,
            # reused directly rather than rebuilt a 2nd time (rule 8).
            dp = NOTABLE[(module_name, f)]
            nav_badge = (f'<a href="galaxy_map_decision_matrix.html#d-{dp["id"]}">'
                         f'<text x="{x}" y="{y+52}" text-anchor="middle" font-size="7.5" fill="{ORACLE_COLOR}" text-decoration="underline">🧠 into the logic: Decision Matrix</text></a>')
        decision_badge = ''
        if (module_name, f) in DECISIONS_BY_FUNC:
            ddp = DECISIONS_BY_FUNC[(module_name, f)]
            decision_badge = (f'<a href="galaxy_map_decisions.html#dp-{ddp["id"]}">'
                               f'<text x="{x}" y="{y+64}" text-anchor="middle" font-size="7.5" fill="#E25454" text-decoration="underline">🚦 decision gate</text></a>')
        # G74 (Aug 25 2026) — the map node now links into its own Table
        # row (#cur-mod-func). Previously the cross-link only ran the
        # other way (a table hop-chip could jump to another function's
        # row) and the map's own nodes were inert; the existing
        # hashchange handler already switches that module to Table view
        # for any #cur- anchor, so this needed no new JS.
        nodes_svg.append(
            f'{incoming_badge}<a href="#cur-{module_name}-{f}" class="drill-link">'
            f'<g class="node"><circle cx="{x}" cy="{y}" r="26" fill="#0f0f1a" stroke="{color}" stroke-width="{ring}" filter="url(#glow)"/>'
            f'<text x="{x}" y="{y+6}" text-anchor="middle" font-size="15">{icon}</text></g>'
            f'<text x="{x}" y="{y+40}" text-anchor="middle" font-size="9.5" fill="{color}">{f}</text></a>{nav_badge}{decision_badge}'
        )

    if cross_out:
        out_x = W - (260 if my_backdoors else 40)
        for i, (a, b) in enumerate(sorted(set(cross_out))):
            if a not in pos:
                continue
            ax, ay = pos[a]
            sy = grid_cy + (i - (len(cross_out) - 1) / 2) * 40
            tgt_band = bands[func_to_band[b]]['label'] if b in func_to_band else '?'
            edges_svg.append(_curved_edge(ax, ay, out_x, sy, color, real=True, dashed=True, r1=26, r2=8))
            nodes_svg.append(
                f'<rect x="{out_x-52}" y="{sy-10}" width="104" height="20" rx="5" fill="#0f0f1a" stroke="{color}" stroke-width="1.2" stroke-dasharray="3,2" opacity="0.85"/>'
                f'<text x="{out_x}" y="{sy+4}" text-anchor="middle" font-size="7.5" fill="{color}">↦ {tgt_band}: {b}</text>'
            )
    if cross_in:
        for i, (a, b) in enumerate(sorted(set(cross_in))):
            if b not in pos:
                continue
            bx, by = pos[b]
            sy = grid_cy + (i - (len(cross_in) - 1) / 2) * 40
            src_band = bands[func_to_band[a]]['label'] if a in func_to_band else '?'
            edges_svg.append(_curved_edge(60, sy, bx, by, color, real=True, dashed=True, r1=8, r2=26))
            nodes_svg.append(
                f'<rect x="8" y="{sy-10}" width="104" height="20" rx="5" fill="#0f0f1a" stroke="{color}" stroke-width="1.2" stroke-dasharray="3,2" opacity="0.85"/>'
                f'<text x="60" y="{sy+4}" text-anchor="middle" font-size="7.5" fill="{color}">⬅ {src_band}: {a}</text>'
            )

    alex_x, alex_y = W / 2, alex_y_const
    n_out = n_in = 0
    for f in band_funcs:
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
    edge_colors_used.add(ALEX_COLOR)

    # G74 (Aug 25 2026) — these three bubbles used to be three
    # near-verbatim hand-written copies of the same ~20-line shape.
    # Real, checked generalization into the one shared
    # render_evidence_bubble() (graphify_river_group.py) — output is
    # byte-identical to the copies it replaced, verified by diff. The
    # Alex bubble above is deliberately NOT routed through it: it is a
    # genuinely different shape (bidirectional, uncounted, permanent),
    # see that function's own comment.
    # NOTE: every loop variable here is deliberately `bub_`-prefixed.
    # A first version of this refactor used bare `color`/`label`, which
    # silently SHADOWED this function's own outer `color` (the module's
    # real river colour, still read further down when the intra-edge
    # legend is built) — the legend dots came out Last.fm red instead of
    # the river colour. Caught by the byte-identity diff against the
    # pre-refactor output, not by inspection; kept prefixed so the same
    # shadowing can't quietly return.
    for bub_counts, bub_y, bub_color, bub_emoji, bub_label in (
        (oracle_counts, alex_y_const + 90, ORACLE_COLOR, '🔮', 'Oracle'),
        (composio_counts, alex_y_const + 180, COMPOSIO_COLOR, '🔗', 'Composio'),
        (lastfm_counts, alex_y_const + 270, LASTFM_COLOR, '🎵', 'Last.fm'),
    ):
        bub_counts = bub_counts or {}
        band_items = [(f, bub_counts.get(f, 0)) for f in band_funcs
                      if bub_counts.get(f, 0) > 0 and f in pos]
        if not band_items:
            continue
        b_edges, b_nodes = render_evidence_bubble(
            band_items, pos, (W / 2, bub_y), bub_color, bub_emoji, bub_label,
            'function', 'call', _curved_edge, style='function')
        edges_svg.extend(b_edges)
        nodes_svg.extend(b_nodes)
        edge_colors_used.add(bub_color)

    backdoor_legend = []
    if my_backdoors:
        bx_col = W - 20
        seen_targets = {}
        for fname, target_mod, target_fn in my_backdoors:
            if fname not in pos:
                continue
            seen_targets.setdefault(target_mod, []).append((fname, target_fn))
        n_targets = len(seen_targets) or 1
        for i, (target_mod, calls) in enumerate(seen_targets.items()):
            by = grid_cy + (i - (n_targets - 1) / 2) * 100
            tcolor = RIVER_COLOR.get(_river_of.get(target_mod), '#C9A84C')
            for fname, target_fn in calls:
                fx, fy = pos[fname]
                edges_svg.append(_curved_edge(fx, fy, bx_col, by, tcolor, real=True, dashed=True, r1=26, r2=24))
                edge_colors_used.add(tcolor)
            t_rnum = _river_of.get(target_mod)
            nodes_svg.append(
                f'<a href="galaxy_map_current.html#mod-{target_mod}" class="drill-link"><g class="node">'
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
        for a, b in intra_edges
    ) or '<div class="legend-row small"><span class="meta">No real direct same-module calls found between this band\'s own functions.</span></div>'
    legend_rows += ''.join(backdoor_legend)

    return W, H, ''.join(edges_svg) + ''.join(nodes_svg), legend_rows, edge_colors_used


def build_module_map_inner(module_name):
    """Real MAP-view inner content per module (moved + adapted from
    galaxy_map_level3.py's own build_module_section(), G65 fold) —
    returns the SAME real content (rhead/back_btn/legend paragraph/
    band-tabs/band-canvases) that used to be wrapped in its own
    `<section id="mod-{module}">` on the old standalone Level-3 page,
    now returned WITHOUT that wrapper so it can sit inside Current
    Series' own per-module section as the "map" view, alongside the
    existing per-function table view. Zero logic change from the
    original — literally the same computation, same real bug fixes
    (the DFS cycle guard, the sorted() determinism fix, the crowding
    rank-band split) intact."""
    color = RIVER_COLOR.get(_river_of.get(module_name), '#C9A84C')
    all_funcs = parse_module_functions(module_name)
    edges = compute_module_function_flow(module_name)
    depth = compute_function_rank(all_funcs, edges)
    has_init = 'init' in all_funcs
    funcs = [f for f in all_funcs if f != 'init']
    incoming_attr = _incoming_attribution_for_module(module_name)

    ALEX_Y = 95
    backdoors = [(from_func, to_mod, to_func) for from_mod, from_func, to_mod, to_func in CROSS_CALLS
                 if from_mod == module_name and to_mod in LEVEL3_MODULES]
    has_backdoors = bool(backdoors)

    ui_sigs = compute_function_ui_signals(module_name)
    oracle_counts = compute_oracle_call_counts(module_name)
    composio_sites = compute_external_call_sites(module_name)
    composio_counts = {f: len(a) for f, a in composio_sites.items()}
    lastfm_sites = compute_lastfm_call_sites(module_name)
    lastfm_counts = {f: 1 for f in lastfm_sites}
    if has_init and ui_sigs.get('init') and (ui_sigs['init']['output'] or ui_sigs['init']['input']):
        init_sig = ui_sigs['init']
        anchor = incoming_attr[1] if incoming_attr and incoming_attr[1] in ui_sigs else next(
            (f for f in funcs if depth.get(f) == 0), None)
        if anchor and anchor in ui_sigs:
            ui_sigs[anchor] = {
                'output': ui_sigs[anchor]['output'] or init_sig['output'],
                'input': ui_sigs[anchor]['input'] or init_sig['input'],
                'bridge': ui_sigs[anchor].get('bridge') or (
                    f'{module_name}.init()’s own real event wiring (real entry-point stand-in)'
                    if init_sig['input'] else None),
            }
    bands = _split_into_bands(funcs, depth)
    func_to_band = {f: i for i, b in enumerate(bands) for f in b['funcs']}
    multi_band = len(bands) > 1

    band_tabs = []
    band_canvases = []
    for bi, band in enumerate(bands):
        band_funcs = band['funcs']
        band_id = f'mod-{module_name}-b{bi}' if multi_band else f'mod-{module_name}'
        w, h, svg_inner, legend_rows_b, edge_colors_b = _render_band(
            module_name, color, band_funcs, funcs, depth, edges, ui_sigs, incoming_attr,
            backdoors, func_to_band, bands, bi, ALEX_Y, has_backdoors, oracle_counts, composio_counts, lastfm_counts)
        if multi_band:
            active = ' active' if bi == 0 else ''
            band_tabs.append(
                f'<div class="band-tab{active}" data-band-target="{band_id}">'
                f'{band["label"]} <span class="meta">({len(band_funcs)})</span></div>')
        display = '' if bi == 0 else 'display:none'
        band_canvases.append(
            f'<div class="band-canvas" id="{band_id}" style="{display}">'
            f'<div class="canvas-wrap"><svg viewBox="0 0 {w} {h}" width="100%" style="max-width:{w}px;display:block;margin:0 auto">'
            f'<defs><filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
            f'<filter id="edgeglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
            f'{_build_markers(edge_colors_b)}</defs>{svg_inner}</svg></div>'
            f'<div class="legend"><h3>Real function-call edges{" — " + band["label"] if band["label"] else ""}</h3>{legend_rows_b}</div>'
            f'</div>'
        )

    rnum = _river_of.get(module_name)
    river_link = f'<a href="galaxy_map_module.html#river-{rnum}">River {rnum}</a>' if rnum else 'an unrouted module'
    back_btn = (f'<a href="galaxy_map_module.html#river-{rnum}" class="back-btn">← Back to River {rnum} (Level 2)</a>'
                if rnum else '')

    init_note = ''
    if has_init:
        init_note = (' <code>init</code> itself is never shown as a node (Alex’s own direct ask) '
                     '— it is real bootstrap PLUMBING (boot-task registration, RPGACE.hooks wiring, '
                     'DOM re-injection on page:show), not this module’s own business logic, and '
                     'nothing inside the module ever really calls it (RPGACE.register()’s own '
                     'machinery does). Its real direct callees are the true starting points instead, '
                     'shown as \U0001F6AA entries.')
    pairing_note = ''
    if incoming_attr:
        pairing_note = (f' The entry marked "⬅ from River {incoming_attr[0]}" is a real, '
                         'evidence-backed pairing — this is the actual function an incoming river '
                         'connection lands on (same evidence Level 2’s own connection stub shows), '
                         'a far more honest stand-in for the removed init than a generic bootstrap '
                         'node ever was.')
    band_note = ''
    if multi_band:
        band_note = (f' This module has {len(funcs)} real functions — too many for one readable '
                     'canvas (Alex\'s own direct call, "level 3 looks very crowded") — split into '
                     f'{len(bands)} real bands by computed depth-range, balanced by real function '
                     'count. A dashed "↦"/"⬅" stub at a band\'s own edge is a real cross-band call, '
                     'never silently dropped — click a band tab below to switch.')

    band_tabs_html = f'<div class="tabs band-tabs">{"".join(band_tabs)}</div>' if multi_band else ''

    return f'''
  <div class="rhead"><span class="rdot" style="background:{color}"></span><h2>⚙️ {module_name} — real function-call chain</h2></div>
  {back_btn}
  <p class="rlegend-role">Drilled down from {river_link}'s own Level-2 module node. 🚪 = a real entry point (nothing calls it, once <code>init</code> is stripped out) · 🏁 = a real leaf/terminal function (calls nothing else in this module) · ⚙️ = an intermediate real function{' · 🚪 (right, dashed) = a real cross-module backdoor' if has_backdoors else ''}. {len(funcs)} real functions, {len(edges)} real direct call edges.{init_note}{pairing_note}{band_note} <b>🧑 Alex</b> (permanent on every module/band) is the real human actor.</p>
  {band_tabs_html}
  {''.join(band_canvases)}
'''


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def build_current_block(mod, func, branches, ui, oracle_n, sb_touches, notable):
    badges = []
    if ui.get('input'):
        badges.append('<span class="ubub ub-alex" title="Real input evidence">🧑 in</span>')
    if ui.get('output'):
        badges.append('<span class="ubub ub-alex" title="Real output/render evidence">🧑 out</span>')
    if oracle_n:
        badges.append(f'<span class="ubub ub-oracle" title="Real Oracle call count">🔮 {oracle_n}</span>')
    if sb_touches:
        tables = ', '.join(sorted(set(t for _op, t in sb_touches)))
        badges.append(f'<span class="ubub ub-inject" title="Real Supabase table touch: {esc(tables)}">💉 {esc(tables)}</span>')
    star = '<span class="star" title="Notable — Level 5''s own curated core-logic write-up">⭐</span>' if notable else ''

    branch_rows = ''.join(
        f'<div class="branch-row"><span class="bkind">{KIND_ICON.get(b["kind"], "•")}</span>'
        f'<code>{esc(b["condition"]) if b["condition"] else "(fallback branch)"}</code></div>'
        for b in branches
    ) if branches else '<div class="no-branch">No real conditional branch in this function\'s own body.</div>'

    next_chips = ''.join(
        f'<a class="hop-chip" href="#cur-{tm}-{tf}">→ {esc(tm)}.{esc(tf)}()</a>' for tm, tf in NEXT_HOPS.get((mod, func), []))
    prev_chips = ''.join(
        f'<a class="hop-chip" href="#cur-{fm}-{ff}">← {esc(fm)}.{esc(ff)}()</a>' for fm, ff in PREV_HOPS.get((mod, func), []))
    if not next_chips:
        next_chips = '<span class="meta">not tracked at this grain (same-module hop, or a genuine terminal)</span>'
    if not prev_chips:
        prev_chips = '<span class="meta">not tracked at this grain, or a genuine real entry point</span>'

    notable_html = ''
    if notable:
        notable_html = (f'<div class="notable-box"><div class="nb-title">⭐ {esc(notable["title"])}</div>'
                         f'<div class="nb-row"><b>Decider:</b> {esc(notable["decider"])}</div>'
                         f'<div class="nb-row"><b>Decides:</b> {esc(notable["decides"])}</div>'
                         f'<div class="nb-row"><b>Result:</b> {esc(notable["result"])}</div></div>')

    return f'''<div class="current-block" id="cur-{mod}-{func}">
  <div class="cur-head"><span class="cur-name">{esc(func)}()</span>{''.join(badges)}{star}</div>
  <div class="cur-io">
    <div class="io-col"><div class="io-label">⬅ Input</div>{prev_chips}</div>
    <div class="io-col"><div class="io-label">Handling ({len(branches)} real branch point(s))</div>{branch_rows}</div>
    <div class="io-col"><div class="io-label">Output → Next ➡</div>{next_chips}</div>
  </div>
  {notable_html}
  {build_walkthrough_details(mod, func, badges, branches, notable)}
</div>'''


def build_walkthrough_details(mod, func, badges, branches, notable):
    """G75 (Aug 25 2026) — the real per-Current zoomed walkthrough,
    folded IN from the now-deleted galaxy_map_zoom.py as an inline
    expand-for-detail block instead of a separate 451-card page.

    Real reason for the fold: galaxy_map_zoom.py already imported
    EVERY one of its data structures from this file (MODULES, NEXT_HOPS,
    PREV_HOPS, NOTABLE, KIND_ICON, esc) and computed nothing of its own
    — it was a second rendering of this page's data at the same grain,
    which is a view, not a level.

    What it genuinely carried that the compact row above does NOT, all
    preserved here rather than quietly dropped in the merge:
      * spelled-out badge wording instead of the compact chips;
      * an explicit real-entry-point / real-terminal statement, rather
        than the row's terser "not tracked at this grain";
      * the ⚡ module-boundary note when the next hop leaves this module;
      * the notable point's own `changes` field, which the compact
        row never rendered at all.
    """
    prev_hops = PREV_HOPS.get((mod, func), [])
    next_hops = NEXT_HOPS.get((mod, func), [])

    long_badges = []
    if any('🧑 in' in b for b in badges):
        long_badges.append('<span class="ubub ub-alex">🧑 real input evidence</span>')
    if any('🧑 out' in b for b in badges):
        long_badges.append('<span class="ubub ub-alex">🧑 real output/render evidence</span>')
    for b in badges:
        if '🔮' in b or '💉' in b:
            long_badges.append(b)
    badges_html = ''.join(long_badges) or \
        '<span class="meta">No real Alex/Oracle/Supabase signal detected on this specific function.</span>'

    prev_html = ''.join(
        f'<a class="hop-btn" href="#cur-{fm}-{ff}">← {esc(fm)}.{esc(ff)}()</a>' for fm, ff in prev_hops) or \
        '<span class="meta">No real cross-module caller detected — a genuine real entry point, or same-module (not tracked at this grain).</span>'
    next_html = ''.join(
        f'<a class="hop-btn hop-next" href="#cur-{tm}-{tf}">Continue → {esc(tm)}.{esc(tf)}() →</a>' for tm, tf in next_hops) or \
        '<span class="meta terminal">🏁 Real terminal — no further cross-module hop detected. The chain ends here, or continues within the same module (not tracked at this grain).</span>'

    boundary_note = ''
    if next_hops and any(tm != mod for tm, _tf in next_hops):
        boundary_note = '<div class="boundary">⚡ Crossing into a new module here — the natural real stopping point.</div>'

    changes_html = ''
    if notable and notable.get('changes'):
        changes_html = (f'<div class="zsection"><div class="zlabel">⭐ What changes (real input to the decision)</div>'
                        f'<p class="zprose">{esc(notable["changes"])}</p></div>')

    return f'''<details class="cur-zoom">
  <summary>🔎 Expand walkthrough detail</summary>
  <div class="zoom-body">
    <div class="badges">{badges_html}</div>
    <div class="zsection"><div class="zlabel">⬅ Input — what fed this Current</div>{prev_html}</div>
    <div class="zsection"><div class="zlabel">Handling — {len(branches)} real branch point(s)</div>
      <span class="meta">Listed in full in the Handling column above.</span></div>
    {changes_html}
    <div class="zsection"><div class="zlabel">Output → Next Current ➡</div>{next_html}</div>
    {boundary_note}
  </div>
</details>'''


def build_module_section(mod):
    branches = compute_function_branches(mod)
    ui_sigs = compute_function_ui_signals(mod)
    oracle_counts = compute_oracle_call_counts(mod)
    sb_touches = compute_supabase_table_touches(mod)
    funcs = sorted(_function_bodies(mod).keys())
    rnum = _river_of.get(mod)
    river_label = RIVER_NAME.get(rnum, '').split('—')[0].strip() if rnum else ''
    blocks = ''.join(
        build_current_block(mod, f, branches.get(f, []), ui_sigs.get(f, {}),
                             oracle_counts.get(f, 0), sb_touches.get(f, []),
                             NOTABLE.get((mod, f)))
        for f in funcs
    )
    # Real Aug 21 2026 fold (G65) — the old separate Level 3 page's own
    # per-module SVG call-chain diagram is now this section's real MAP
    # view; the per-function rows above (already built) are the real
    # TABLE view. Same real `id="mod-{mod}"` anchor either script always
    # used, so nothing outside this file needed a scheme change.
    map_inner = build_module_map_inner(mod)
    return f'''<section class="mod-section" id="mod-{mod}" style="display:none">
  <div class="mhead"><h2>{mod}</h2><span class="river-chip">{river_label}</span>
    <span class="mtotal">{len(funcs)} real Current(s)</span></div>
  <div class="cur-toggle-row">
    <div class="cur-toggle-btn active" data-view="map">🔽 Map view</div>
    <div class="cur-toggle-btn" data-view="table">📊 Table view</div>
  </div>
  <div class="cur-view active" data-modview="map-{mod}">{map_inner}</div>
  <div class="cur-view" data-modview="table-{mod}">
    <div class="currents">{blocks}</div>
  </div>
</section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Current Series)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --purple:#9B59B6; --red:#E25454; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 20%, #14101e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto;line-height:1.6}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;flex-wrap:wrap}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--gold);padding:4px 9px;border-radius:12px}}
  .modpicker{{max-width:1100px;margin:16px auto;padding:0 24px;display:flex;gap:5px;flex-wrap:wrap;justify-content:center}}
  .mod-tab{{padding:4px 10px;border-radius:14px;font-size:9.5px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .mod-tab.active{{background:var(--gold);color:#1a1608;font-weight:700}}
  .mhead{{display:flex;align-items:center;gap:10px;padding:20px 24px 6px;max-width:900px;margin:0 auto;flex-wrap:wrap}}
  .mhead h2{{font-family:Georgia,serif;font-size:18px;color:#fff}}
  .river-chip{{font-size:9.5px;padding:2px 8px;border-radius:8px;background:rgba(255,255,255,0.06);color:var(--dim)}}
  .mtotal{{font-size:9.5px;color:var(--dim)}}
  .l3-link{{margin-left:auto;font-size:9.5px;color:var(--dim);text-decoration:none}}
  .currents{{max-width:900px;margin:0 auto 40px;padding:0 24px;display:flex;flex-direction:column;gap:12px}}
  .current-block{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px 16px}}
  .cur-head{{display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap}}
  .cur-name{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:12.5px;color:var(--gold);font-weight:700}}
  .ubub{{font-size:9px;font-weight:700;padding:2px 7px;border-radius:8px}}
  .ub-alex{{background:rgba(226,84,84,0.12);color:var(--red)}}
  .ub-oracle{{background:rgba(155,89,182,0.14);color:var(--purple)}}
  .ub-inject{{background:rgba(42,191,176,0.12);color:#2ABFB0}}
  .star{{font-size:12px}}
  .cur-io{{display:grid;grid-template-columns:1fr 2fr 1fr;gap:10px}}
  .io-col{{font-size:10px}}
  .io-label{{font-size:8.5px;font-weight:700;color:var(--dim);text-transform:uppercase;margin-bottom:5px}}
  .hop-chip{{display:block;color:var(--gold);text-decoration:none;font-size:9.5px;margin-bottom:3px}}
  .branch-row{{display:flex;gap:6px;margin-bottom:3px;align-items:baseline}}
  .bkind{{opacity:0.7}}
  .no-branch,.meta{{color:#5a5a68;font-size:9.5px}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:9.5px;background:rgba(255,255,255,0.05);padding:1px 4px;border-radius:3px}}
  .notable-box{{margin-top:10px;padding:10px 12px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.25);border-radius:8px;font-size:10.5px;line-height:1.6}}
  .nb-title{{font-weight:700;color:var(--gold);margin-bottom:4px}}
  /* G75 — the folded-in per-Current zoomed walkthrough (was its own page). */
  .cur-zoom{{margin-top:10px;border-top:1px dashed rgba(255,255,255,0.1);padding-top:8px}}
  .cur-zoom summary{{cursor:pointer;font-size:10px;color:var(--dim);list-style:none}}
  .cur-zoom summary::-webkit-details-marker{{display:none}}
  .cur-zoom summary:hover{{color:var(--gold)}}
  .cur-zoom[open] summary{{color:var(--gold);margin-bottom:8px}}
  .zoom-body{{padding:4px 2px 2px}}
  .zoom-body .badges{{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}}
  .zsection{{margin-bottom:12px}}
  .zlabel{{font-size:9.5px;font-weight:700;color:var(--dim);text-transform:uppercase;margin-bottom:6px}}
  .zprose{{font-size:10.5px;line-height:1.6;color:#c8c8d8}}
  .hop-btn{{display:inline-block;color:var(--gold);text-decoration:none;font-size:10.5px;padding:5px 10px;border:1px solid rgba(201,168,76,0.3);border-radius:8px;margin:0 6px 6px 0}}
  .hop-next{{background:rgba(201,168,76,0.1);font-weight:700}}
  .terminal{{color:var(--gold)}}
  .boundary{{font-size:10px;color:var(--gold);margin-top:6px}}
{dim_css}
  a{{color:var(--gold)}}
  .note{{max-width:900px;margin:20px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  /* Real Aug 21 2026 fold (G65) — Level 3's own real CSS, moved verbatim
     (never re-derived) for the new per-module map view. */
  .cur-toggle-row{{display:flex;justify-content:center;gap:8px;padding:10px 24px 0}}
  .cur-toggle-btn{{padding:6px 16px;border-radius:14px;font-size:11px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .cur-toggle-btn.active{{background:var(--gold);color:#1a1608;border-color:var(--gold)}}
  .cur-view{{display:none}}
  .cur-view.active{{display:block}}
  .tabs{{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}}
  .tab{{padding:6px 14px;border-radius:16px;font-size:11.5px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .tab.active{{background:var(--gold);color:#1a1a12;font-weight:700}}
  .band-tabs{{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding:6px 24px 10px}}
  .band-tab{{padding:5px 12px;border-radius:14px;font-size:10.5px;cursor:pointer;background:rgba(255,255,255,0.04);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .band-tab .meta{{opacity:0.7}}
  .band-tab.active{{background:var(--gold);color:#1a1a12;font-weight:700;border-color:var(--gold)}}
  .rhead{{display:flex;align-items:center;gap:10px;justify-content:center;padding:16px 24px 6px}}
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
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Current Series</div>
  <h1>🧬 Every Module, as a Series of Currents</h1>
  <p>{n_funcs} real Currents (functions) across {n_mods} modules. This is the deepest real <b>containment</b> step of the map: L0 galaxies contain L1 rivers, which contain L2 modules, which contain these. ⭐ = a curated "core logic" write-up (full text on the <a href="galaxy_map_decision_matrix.html">Decision Matrix</a>). 🧑 = real Alex/UI input-output evidence. 🔮 = real Oracle call count. 💉 = a real Supabase injection-tool touch. Pick a module below, then choose 🔽 Map (the real function-call-chain diagram — every node links into its own Table row) or 📊 Table (per-function input/handling/output rows, each with a real <b>🔎 Expand walkthrough detail</b> toggle, folded in from the retired Zoom/L4 page) — same real data, three depths.</p>
</div>
<div class="modpicker">{mod_tabs}</div>
{mod_sections}
{dim_index}
<div class="note">
  Generated by <code>scripts/galaxy_map_current.py</code> — real data from
  <code>compute_function_branches()</code> (Level 6's own exhaustive detector, reused not re-derived),
  the curated core-logic points (<code>LOGIC_POINTS</code>, now in <code>galaxy_map_decision_matrix.py</code>),
  and the real per-function Alex/Oracle/Supabase
  signals already proven elsewhere in this pipeline. Real Aug 21 2026 fold (G65): the old standalone
  Level 3 page's own real per-module SVG call-chain diagram (<code>compute_function_rank</code>/
  <code>_split_into_bands</code>/<code>_render_band</code>, moved verbatim, not retyped) is now this
  page's own real Map view per module, toggled against the Table view above — <code>galaxy_map_level3.py</code>/
  <code>.html</code> deleted outright, nothing left superseded.
</div>
<script>
(function() {{
  var tabs = document.querySelectorAll('.mod-tab');
  var sections = document.querySelectorAll('.mod-section');
  function show(id) {{
    sections.forEach(function(s) {{ s.style.display = (s.id === id) ? '' : 'none'; }});
    tabs.forEach(function(t) {{ t.classList.toggle('active', t.dataset.target === id); }});
  }}
  tabs.forEach(function(t) {{ t.addEventListener('click', function() {{ location.hash = t.dataset.target; }}); }});
  window.addEventListener('hashchange', function() {{
    var raw = location.hash.replace('#', '');
    var id = raw.startsWith('cur-') ? 'mod-' + raw.split('-')[1] : (raw || (sections[0] && sections[0].id));
    show(id);
    if (raw.startsWith('cur-')) {{
      // Real cross-link: a #cur-mod-func anchor only exists in the
      // Table view, so jumping there must switch that module's own
      // toggle to Table first, same real cross-view discipline every
      // other page's toggle already uses.
      var sec = document.getElementById(id);
      if (sec) {{
        sec.querySelectorAll('.cur-toggle-btn').forEach(function(b) {{ b.classList.toggle('active', b.dataset.view === 'table'); }});
        sec.querySelectorAll('.cur-view').forEach(function(v) {{ v.classList.toggle('active', v.dataset.modview.indexOf('table-') === 0); }});
      }}
      setTimeout(function() {{ var el = document.getElementById(raw); if (el) el.scrollIntoView({{block:'center'}}); }}, 60);
    }}
  }});
  var id0raw = location.hash.replace('#', '');
  var id0 = id0raw.startsWith('cur-') ? 'mod-' + id0raw.split('-')[1] : (id0raw || (sections[0] && sections[0].id));
  show(id0);
}})();
(function() {{
  // Real per-module Map/Table toggle (G65) — scoped to the clicked
  // button's own .mod-section, never global, since every module has
  // its own independent toggle state.
  document.querySelectorAll('.cur-toggle-btn').forEach(function(btn) {{
    btn.addEventListener('click', function() {{
      var sec = btn.closest('.mod-section');
      sec.querySelectorAll('.cur-toggle-btn').forEach(function(b) {{ b.classList.toggle('active', b === btn); }});
      sec.querySelectorAll('.cur-view').forEach(function(v) {{
        v.classList.toggle('active', v.dataset.modview.indexOf(btn.dataset.view + '-') === 0);
      }});
    }});
  }});
  // Real band-tab switcher (moved verbatim from galaxy_map_level3.py,
  // G65 fold) — deliberately its own click-handling block, not merged
  // into the module/toggle switchers above (real bug this avoids: a
  // shared class + a band-tab with no matching dataset would break
  // the other switchers' own click handlers).
  document.querySelectorAll('.band-tab').forEach(function(t) {{
    t.addEventListener('click', function() {{
      var group = t.closest('.band-tabs');
      var target = t.dataset.bandTarget;
      group.querySelectorAll('.band-tab').forEach(function(o) {{ o.classList.toggle('active', o === t); }});
      var parentSection = t.closest('.mod-section');
      parentSection.querySelectorAll('.band-canvas').forEach(function(c) {{
        c.style.display = (c.id === target) ? '' : 'none';
      }});
    }});
  }});
}})();
</script>
</body>
</html>
"""


def main():
    mod_tabs = ''.join(f'<div class="mod-tab" data-target="mod-{m}">{m}</div>' for m in MODULES)
    mod_sections = ''.join(build_module_section(m) for m in MODULES)
    total_funcs = sum(len(_function_bodies(m).keys()) for m in MODULES)
    html = TEMPLATE.format(mod_tabs=mod_tabs, mod_sections=mod_sections,
                            n_funcs=total_funcs, n_mods=len(MODULES),
                            dim_index=dimension_index_html(OUT.name),
                            dim_css=DIMENSION_INDEX_CSS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(MODULES)} modules, {total_funcs} real Currents, "
          f"{len(NOTABLE)} with a curated core-logic write-up.")


if __name__ == '__main__':
    main()
