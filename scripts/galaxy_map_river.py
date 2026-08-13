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
from galaxy_map import polar, _curved_edge, _connector_icon  # noqa: E402
from graphify_river_group import (  # noqa: E402
    RIVER_NAME, RIVER_COLOR, RIVER_MODULES, RIVER_ROLE_NOTE, RIVER_FLOWS,
    INTERACTION_TYPE_COLOR, INTERACTION_TYPE_LABEL, _river_num_from_label,
)

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

    # --- 16 rivers, evenly spaced around the hub ---
    river_radius = 480
    n = len(RIVER_NAME)
    river_pos = {}
    for i, rnum in enumerate(sorted(RIVER_NAME)):
        ang = -90 + (360 * i / n)
        rx, ry = polar(cx, cy, river_radius, ang)
        river_pos[rnum] = (rx, ry)
        color = RIVER_COLOR[rnum]
        edges_svg.append(_curved_edge(cx, cy, rx, ry, color, real=True))
        short_label = RIVER_NAME[rnum].split('—')[0].strip()
        nodes_svg.append(node_circle(rx, ry, 30, color, '🌊', short_label, label_color=color))
        mods = RIVER_MODULES.get(rnum, [])
        mods_txt = ', '.join(f'<code>{m}</code>' for m in mods) if mods else '(no single-module home — see zone role note)'
        role = RIVER_ROLE_NOTE.get(rnum, '')
        legend_rows.append(
            f'<div class="legend-row"><span class="dot" style="background:{color}"></span>'
            f'<b>{RIVER_NAME[rnum]}</b><br>'
            f'<span class="meta">Modules: {mods_txt}</span>'
            + (f'<br><span class="meta">{role}</span>' if role else '')
            + '</div>'
        )

    # --- real RIVER_FLOWS edges, river-to-river only ---
    # A target that isn't a real river number (a terminal-sink note or a
    # "feeds every river" fan-out note) gets a small annotation instead
    # of a fake edge to nowhere — honest about what RIVER_FLOWS actually
    # encodes for those rows.
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
                edges_svg.append(_curved_edge(sx, sy, tx, ty, col, real=True))
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

    return '\n'.join(nodes_svg), '\n'.join(edges_svg), '\n'.join(legend_rows), itype_legend, W, H


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
  .canvas-wrap{{max-width:1300px;margin:0 auto;overflow-x:auto}}
  svg text{{font-family:'Segoe UI',system-ui,sans-serif;user-select:none}}
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

<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Level 1 — Rivers</div>
  <h1>🏛️ RPGACE Architecture — the 16 Rivers</h1>
  <p>Drilled down from <a href="galaxy_map.html">the Galaxy Map (Level 0)</a> — RPGACE Architecture's own internal structure, the same 16 rivers <code>minotaur_map.html</code> and the Obsidian vault already describe, here laid out radially and cross-linked by real <code>RIVER_FLOWS</code> data (never a river acting on its own — every edge is a real, grounded aggregate of actual caller-level relationships, per <code>system_map_spec.md</code> §1a). Function/module-level drill-down (G4) is a real, separate, not-yet-built next step.</p>
</div>

<div class="canvas-wrap">
<svg viewBox="0 0 {W} {H}" width="100%" style="max-width:1300px;display:block;margin:0 auto">
  <defs>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
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
  Galaxy Map" /CEO plan — G4 (function-level drill-down) is real, separate, not yet built.
</div>

</body>
</html>
"""


def main():
    nodes, edges, legend, itype_legend, W, H = build_svg()
    html = TEMPLATE.format(nodes=nodes, edges=edges, legend=legend, itype_legend=itype_legend, W=W, H=H)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(RIVER_NAME)} rivers, real RIVER_FLOWS edges drawn.")


if __name__ == '__main__':
    main()
