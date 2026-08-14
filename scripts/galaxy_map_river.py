#!/usr/bin/env python3
"""
galaxy_map_river.py — G3 of the ratified "RPGACE Total Systems Galaxy Map"
/CEO plan (Aug 13 2026). Builds the real Level-1 drill-down: RPGACE
Architecture's own 16 rivers, radial around a central hub, styled to
match galaxy_map.py (G2) exactly — same dark radial aesthetic, same
curved glowing edges, same tested/untested visual language — so
drilling down never feels like a different tool.

Real data reused, never re-derived (rule 8): RIVER_NAME/RIVER_COLOR/
RIVER_MODULES/RIVER_ROLE_NOTE/RIVER_FLOWS/INTERACTION_TYPE_COLOR/
INTERACTION_TYPE_LABEL/_river_num_from_label all imported directly from
graphify_river_group.py — the same canonical source graph.html/the
Obsidian vault/galaxy_map.py already read from. polar()/_curved_edge()/
_connector_icon() imported directly from galaxy_map.py rather than
re-implemented (same file, same rule).

Real, Alex-confirmed correction already baked into RIVER_FLOWS' own
Aug 13 docstring, honored here too: a river never acts or communicates
on its own — every edge below is a real, grounded AGGREGATE (at least
one real caller-level edge crosses from a module in the source river
into the target) rolled up for orientation, never drawn as if the river
itself were a Total-system actor (system_map_spec.md §1a).

Scope, per the ratified plan: ONLY the 16 rivers + RPGACE Architecture's
own hub node + real RIVER_FLOWS edges between them. Function/module-level
drill-down (G4, "river -> real tagged functions/nodes") is a real,
separate, NOT-yet-built future item — this file deliberately stops at
river granularity, matching the "generate from real data, never
hand-author" discipline every other graphify/Obsidian script here
follows.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from galaxy_map import polar, _curved_edge, _connector_icon, _build_markers, count_crossings  # noqa: E402
from graphify_river_group import (  # noqa: E402
    RIVER_NAME, RIVER_COLOR, RIVER_MODULES, RIVER_ROLE_NOTE, RIVER_FLOWS,
    INTERACTION_TYPE_COLOR, INTERACTION_TYPE_LABEL, _river_num_from_label,
    compute_module_ui_signal, rivers_needing_meanders,
)


def _crossing_reduced_ring_order(river_nums, cx, cy, radius):
    """Real crossing-reduction for the ring ORDER itself (Aug 13, Alex's
    own rule: "make it so no edges ever cross each other, way more
    important than keeping bubbles in a row") — barycenter_order()
    reorders WITHIN a fixed rank; a radial ring has no rank, so the
    real lever here is WHICH ANGLE each river sits at.

    Real finding, not hidden (rule 4 — one failed fix, get real
    evidence, don't ship a second blind attempt): a DFS-over-adjacency
    ordering was tried first and MEASURED WORSE than the plain numeric
    order (17 crossings vs. 15, count_crossings() confirmed) — a DFS
    walk can place two directly-connected rivers far apart whenever a
    branch forces a long detour before returning, and this graph's
    real shape hits that case. Discarded rather than shipped as a
    claimed "fix" that regressed.

    Real, correct approach instead: start from the CURRENT (numeric)
    order — the better of the two known starting points — and run a
    real greedy 2-opt local search: try every pair-swap, keep it only
    if count_crossings() with the swap applied is STRICTLY LOWER than
    without, repeat until no improving swap exists. This can only ever
    match or beat its starting point (never regress, by construction)
    — a standard local-search technique, not invented, and the real
    reason it's provably safe where the DFS attempt wasn't."""
    order = sorted(river_nums)
    real_edges = []
    for src, flows in RIVER_FLOWS.items():
        for target_label, _note, _itype in flows:
            tgt = _river_num_from_label(target_label)
            if tgt and src in river_nums and tgt in river_nums:
                real_edges.append((src, tgt))
    n = len(order)

    def positions_for(seq):
        return {r: polar(cx, cy, radius, -90 + (360 * i / n)) for i, r in enumerate(seq)}

    best_count = count_crossings(positions_for(order), real_edges)
    improved = True
    while improved:
        improved = False
        for i in range(n):
            for j in range(i + 1, n):
                trial = list(order)
                trial[i], trial[j] = trial[j], trial[i]
                c = count_crossings(positions_for(trial), real_edges)
                if c < best_count:
                    order, best_count = trial, c
                    improved = True
    return order, best_count

OUT = Path('graphify-out/galaxy_map_river.html')

# Real, honest module-count-derived "tested" signal: a river with zero
# entries in RIVER_MODULES (12-16, the Total-systems/dev-process rivers)
# is real infrastructure, not untested — only actually-flagged-untested
# river MEMBERS elsewhere in this project would justify a dashed ring,
# and no such per-river flag exists yet (that's function-level detail,
# G4's job). Every river node therefore renders solid/tested at Level 1
# — honest, since "is this river real" isn't in question, only
# individual functions inside it are (smoke_test.html's job).


def build_svg():
    W, H = 1300, 1300
    cx, cy = W / 2, H / 2

    nodes_svg = []
    edges_svg = []
    legend_rows = []
    itype_used = set()
    edge_colors_used = set()

    def node_circle(x, y, r, color, icon, label_below=None, label_color=None):
        s = (f'<g class="node">'
             f'<circle cx="{x}" cy="{y}" r="{r}" fill="#0f0f1a" stroke="{color}" stroke-width="2.2" filter="url(#glow)"/>'
             f'<text x="{x}" y="{y+5}" text-anchor="middle" font-size="{r*0.7}">{icon}</text>'
             f'</g>')
        if label_below:
            lc = label_color or '#cfd6e0'
            s += f'<text x="{x}" y="{y+r+15}" text-anchor="middle" font-size="9.5" fill="{lc}">{label_below}</text>'
        return s

    # --- central RPGACE Architecture hub ---
    nodes_svg.append(
        f'<g class="node central"><circle cx="{cx}" cy="{cy}" r="42" fill="#0f0f1a" stroke="#C9A84C" stroke-width="3" filter="url(#glow)"/>'
        f'<text x="{cx}" y="{cy-6}" text-anchor="middle" font-size="24">🏛️</text>'
        f'<text x="{cx}" y="{cy+16}" text-anchor="middle" font-size="10" fill="#E2E2EC" font-weight="700">RPGACE Architecture</text></g>'
    )

    # --- G5, Aug 13 (real ratified plan item, per system_map_spec.md §6):
    # "every level of this hierarchy that has a real, standing connection
    # into Oversight represents that connection explicitly — reusing
    # RIVER_FLOWS, never re-derived." Real, evidence-only computation, no
    # new data: any river with a real RIVER_FLOWS edge TARGETING River
    # XIV (Oversight Docs) — currently rivers 12/13/16 — plus River XIV
    # itself as the real destination hub. Deliberately narrow (§6's own
    # "real, standing connection," not "thematically related") — River X
    # (Chronicles) and River XV (Session Records) are real, adjacent
    # record-keeping rivers but have no literal RIVER_FLOWS edge into
    # River XIV, so they stay unbadged rather than guessed in.
    OVERSIGHT_RIVER = 14
    oversight_feeders = {
        src for src, flows in RIVER_FLOWS.items()
        for target_label, _note, _itype in flows
        if _river_num_from_label(target_label) == OVERSIGHT_RIVER
    }

    # --- 16 rivers, evenly spaced around the hub, real crossing-reduced
    # ANGULAR ORDER (Aug 13, Alex's own rule — see
    # _crossing_reduced_ring_order()'s own docstring) ---
    river_radius = 480
    ring_order, _reduced_count = _crossing_reduced_ring_order(sorted(RIVER_NAME), cx, cy, river_radius)
    n = len(RIVER_NAME)
    river_pos = {}
    for i, rnum in enumerate(ring_order):
        ang = -90 + (360 * i / n)
        rx, ry = polar(cx, cy, river_radius, ang)
        river_pos[rnum] = (rx, ry)
        color = RIVER_COLOR[rnum]
        edges_svg.append(_curved_edge(cx, cy, rx, ry, color, real=True, r1=42, r2=30))
        edge_colors_used.add(color)
        short_label = RIVER_NAME[rnum].split('—')[0].strip()
        # G4 shipped — every river node is now a real clickable drill-down
        # into its own Level-2 module/dashboard-card detail, not a
        # decorative dead end (matches G3's own drill-link precedent on
        # Level 0's central node).
        nodes_svg.append(
            f'<a href="galaxy_map_module.html#river-{rnum}" class="drill-link">'
            + node_circle(rx, ry, 30, color, '🌊', short_label, label_color=color)
            + '</a>'
        )
        # G5 badge — a real "feeds/is Oversight" marker, distinct from
        # any single edge, so the connection reads at a glance.
        if rnum == OVERSIGHT_RIVER:
            bx, by = polar(rx, ry, 34, -45)
            nodes_svg.append(f'<text x="{bx}" y="{by}" text-anchor="middle" font-size="16" title="Oversight hub">📚</text>')
        elif rnum in oversight_feeders:
            bx, by = polar(rx, ry, 34, -45)
            nodes_svg.append(f'<text x="{bx}" y="{by}" text-anchor="middle" font-size="13" opacity="0.85" title="Feeds Oversight (River XIV)">📚</text>')
        # G20 (Aug 14) — a real "🌾" badge + direct link on any river that
        # genuinely qualifies for a Level-1.5 meanders split
        # (rivers_needing_meanders(), rule 8, same rule galaxy_map_
        # meanders.py itself uses). NOT nested inside the existing
        # drill-link <a> above (invalid HTML) — a separate small link
        # placed just outside it.
        if rnum in rivers_needing_meanders():
            mx, my = polar(rx, ry, 34, 45)
            nodes_svg.append(
                f'<a href="galaxy_map_meanders.html#river-{rnum}">'
                f'<text x="{mx}" y="{my}" text-anchor="middle" font-size="15" title="Has a real Level-1.5 meanders split">🌾</text></a>'
            )
        mods = RIVER_MODULES.get(rnum, [])
        # Real, LIGHTWEIGHT Alex-presence badge (Aug 13, Alex's own ask,
        # "also present at level 0, 1 and 2 where it makes sense") — a
        # full bubble+edges (Level 2/3's own treatment) would be real
        # noise at 16-node granularity (every river with ANY UI module
        # would need dozens of fanned edges into one shared point); a
        # real, cheap aggregate badge is the honest right-sized version
        # here: is there at least one real module in this river with
        # real DOM/input evidence at all (compute_module_ui_signal(),
        # rule 8, rolled up one level further than Level 2's own use)?
        river_has_alex = any(v for m in mods for v in compute_module_ui_signal(m).values())
        if river_has_alex:
            hx, hy = polar(rx, ry, 34, 45)
            nodes_svg.append(f'<text x="{hx}" y="{hy}" text-anchor="middle" font-size="13" opacity="0.85" title="Has real DOM/input-facing modules — see Level 2/3">🧑</text>')
        mods_txt = ', '.join(f'<code>{m}</code>' for m in mods) if mods else '(no single-module home — see zone role note)'
        role = RIVER_ROLE_NOTE.get(rnum, '')
        oversight_note = ''
        if rnum == OVERSIGHT_RIVER:
            oversight_note = '<br><span class="meta">📚 The real Oversight hub — fed directly by Rivers XII/XIII/XVI (see below).</span>'
        elif rnum in oversight_feeders:
            oversight_note = '<br><span class="meta">📚 Has a real, direct RIVER_FLOWS connection into River XIV (Oversight Docs).</span>'
        if river_has_alex:
            oversight_note += '<br><span class="meta">🧑 Has at least one real module with DOM/input-facing evidence — see its own real Alex bubble at Level 2/3.</span>'
        legend_rows.append(
            f'<div class="legend-row"><span class="dot" style="background:{color}"></span>'
            f'<b>{RIVER_NAME[rnum]}</b><br>'
            f'<span class="meta">Modules: {mods_txt}</span>'
            + (f'<br><span class="meta">{role}</span>' if role else '')
            + oversight_note
            + '</div>'
        )

    # --- real RIVER_FLOWS edges, river-to-river only ---
    # A target that isn't a real river number (a terminal-sink note or a
    # "feeds every river" fan-out note) gets a small annotation instead
    # of a fake edge to nowhere — honest about what RIVER_FLOWS actually
    # encodes for those rows.
    real_ring_edges = []
    for src_num, flows in RIVER_FLOWS.items():
        if src_num not in river_pos:
            continue
        sx, sy = river_pos[src_num]
        for target_label, note, itype in flows:
            itype_used.add(itype)
            tgt_num = _river_num_from_label(target_label)
            col = INTERACTION_TYPE_COLOR.get(itype, '#6b7280')
            if tgt_num and tgt_num in river_pos:
                tx, ty = river_pos[tgt_num]
                edges_svg.append(_curved_edge(sx, sy, tx, ty, col, real=True, r1=30, r2=30))
                edge_colors_used.add(col)
                real_ring_edges.append((src_num, tgt_num))
            else:
                # fan-out / terminal note — short stub line, not a fake target
                stub_x, stub_y = sx + (sx - cx) * 0.18, sy + (sy - cx) * 0.18
                edges_svg.append(
                    f'<circle cx="{stub_x}" cy="{stub_y}" r="3" fill="{col}" opacity="0.7"/>'
                )
            legend_rows.append(
                f'<div class="legend-row small"><span class="dot" style="background:{col}"></span>'
                f'<b>{RIVER_NAME[src_num].split("—")[0].strip()} → {target_label.split("—")[0].strip() if target_label.startswith("River") else target_label}</b> '
                f'<span class="meta">{note} · {INTERACTION_TYPE_LABEL.get(itype, itype)}</span></div>'
            )

    itype_legend = ''.join(
        f'<div class="legend-row small"><span class="dot" style="background:{INTERACTION_TYPE_COLOR[t]}"></span>'
        f'<b>{INTERACTION_TYPE_LABEL[t]}</b></div>'
        for t in sorted(itype_used)
    )

    # Real, honest before/after crossing count (never assumed zero) —
    # simulate the OLD plain-numeric ring order at the same radius/angle
    # spacing purely for comparison, count both with the same real
    # edge list, report the actual improvement.
    old_pos = {}
    for i, rnum in enumerate(sorted(RIVER_NAME)):
        old_pos[rnum] = polar(cx, cy, river_radius, -90 + (360 * i / n))
    crossings_before = count_crossings(old_pos, real_ring_edges)
    crossings_after = count_crossings(river_pos, real_ring_edges)

    markers_defs = _build_markers(edge_colors_used)
    return ('\n'.join(nodes_svg), '\n'.join(edges_svg), '\n'.join(legend_rows), itype_legend, W, H, markers_defs,
            crossings_before, crossings_after)


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Level 1 — Rivers)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #12121e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;padding:0}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:28px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12.5px;max-width:800px;margin:0 auto}}
  .hero a{{color:var(--gold)}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:var(--gold);border-color:var(--gold)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--gold);padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
  .canvas-wrap{{max-width:1300px;margin:0 auto;overflow-x:auto}}
  svg text{{font-family:'Segoe UI',system-ui,sans-serif;user-select:none}}
  a.drill-link{{cursor:pointer}}
  a.drill-link .node circle{{transition:filter 0.15s}}
  a.drill-link:hover .node circle{{filter:url(#glow) brightness(1.3)}}
  .legend{{max-width:900px;margin:0 auto 20px;padding:0 24px}}
  .legend h2{{font-family:Georgia,serif;font-size:16px;color:var(--gold);margin:24px 0 10px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px}}
  .legend-row{{font-size:12px;color:var(--dim);padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);line-height:1.6}}
  .legend-row b{{color:#E2E2EC}}
  .legend-row .meta{{display:block;font-size:10.5px;color:#6a6a78;margin-top:2px}}
  .legend-row.small{{font-size:11px}}
  .dot{{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px}}
  .itype-grid{{display:grid;grid-template-columns:1fr 1fr;gap:0 24px}}
  .note{{max-width:900px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10.5px;background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:3px}}
</style>
</head>
<body>

<div class="breadcrumb">
  <a href="galaxy_map.html">🌌 Level 0</a><span class="bc-sep">→</span>
  <span class="bc-here">🏛️ Level 1</span><span class="bc-sep">→</span>
  <a href="galaxy_map_meanders.html">🌾 Level 1.5</a><span class="bc-sep">→</span>
  <a href="galaxy_map_module.html">🌊 Level 2</a>
</div>

<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Level 1 — Rivers</div>
  <h1>🏛️ RPGACE Architecture — the 16 Rivers</h1>
  <p>Drilled down from <a href="galaxy_map.html">the Galaxy Map (Level 0)</a> — RPGACE Architecture's own internal structure, the same 16 rivers <code>minotaur_map.html</code> and the Obsidian vault already describe, here laid out radially and cross-linked by real <code>RIVER_FLOWS</code> data (never a river acting on its own — every edge is a real, grounded aggregate of actual caller-level relationships, per <code>system_map_spec.md</code> §1a). Every edge carries a real ✕ mark at its start and a real arrowhead at its end. A 📚 badge marks River XIV (the real Oversight hub) and any river with a real, direct connection into it (§6, G5). A 🧑 badge marks a river with at least one real module carrying real DOM/input evidence — a lightweight aggregate (real UI density is too fine-grained for 16 nodes; see Level 2/3 for the real "Alex" bubble + edges). <b>Click any river node to drill into its real modules + dashboard-card entry points (Level 2).</b></p>
</div>

<div class="canvas-wrap">
<svg viewBox="0 0 {W} {H}" width="100%" style="max-width:1300px;display:block;margin:0 auto">
  <defs>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    {markers}
  </defs>
  {edges}
  {nodes}
</svg>
</div>

<div class="legend">
  <h2>Edge legend — what each line actually means</h2>
  <div class="itype-grid">{itype_legend}</div>
</div>

<div class="legend">
  <h2>The 16 rivers</h2>
  {legend}
</div>

<div class="note">
  Generated by <code>scripts/galaxy_map_river.py</code> — real data reused from
  <code>scripts/graphify_river_group.py</code>'s own <code>RIVER_NAME</code>/<code>RIVER_COLOR</code>/
  <code>RIVER_MODULES</code>/<code>RIVER_ROLE_NOTE</code>/<code>RIVER_FLOWS</code> (never re-derived), and
  <code>galaxy_map.py</code>'s own <code>polar()</code>/<code>_curved_edge()</code> layout helpers.
  Mapping rules: <code>system_map_spec.md</code>. G3 of the ratified "RPGACE Total Systems
  Galaxy Map" /CEO plan — G4 (<a href="galaxy_map_module.html">module + dashboard-card
  drill-down, click any river above</a>) is now real and live.
</div>

</body>
</html>
"""


def main():
    nodes, edges, legend, itype_legend, W, H, markers, crossings_before, crossings_after = build_svg()
    html = TEMPLATE.format(nodes=nodes, edges=edges, legend=legend, itype_legend=itype_legend, W=W, H=H, markers=markers)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(RIVER_NAME)} rivers, real RIVER_FLOWS edges drawn. "
          f"Real crossing-reduced ring order (greedy 2-opt local search): {crossings_before} crossings "
          f"(old numeric order) -> {crossings_after} crossings.")


if __name__ == '__main__':
    main()
