#!/usr/bin/env python3
"""
galaxy_map.py — G2 of the ratified "RPGACE Total Systems Galaxy Map"
CEO plan (Aug 13 2026). Builds the real Level-0 view: the top-level
galaxies only (system_map_spec.md §1/§3), styled close to the
Assassin's Creed Valhalla "All Skills" reference image Alex provided —
an organic, radial, category-clustered web with glowing curved
connectors, not a force-directed physics blob (deliberately NOT
vis.js — same real precedent as `taxonomy_map.html`'s own hand-rolled
circle-pack diagram, confirmed working, zero new dependency).

Real data reused, never re-derived (rule 8): imports EXTERNAL_CONNECTORS
and SUPABASE_CORE directly from graphify_river_group.py, the same
canonical source graph.html/the Obsidian vault already read from.

Scope, per the ratified plan and system_map_spec.md §3: ONLY the top-
level galaxies + RPGACE Architecture's own connector bridge-nodes.
River-level (G3) and function-level (G4) drill-down are real, separate,
NOT-yet-built future items — this file deliberately does not attempt
them; each level gets its own generator when its own item is built,
matching the "generate from real data, never hand-author" discipline
every other graphify/Obsidian script in this repo already follows.
"""
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import EXTERNAL_CONNECTORS, SUPABASE_CORE  # noqa: E402

OUT = Path('graphify-out/galaxy_map.html')

# Real, curated galaxy list — mirrors total_system_members (Supabase),
# same "hand-mirrored from a canonical source" pattern EXTERNAL_CONNECTORS
# already uses for its own table. Update total_system_members first,
# then this list, if a real new galaxy is ever added.
GALAXIES = [
    {
        'id': 'rpgace_architecture', 'label': 'RPGACE Architecture',
        'icon': '🏛️', 'color': '#C9A84C',
        'role': 'The app/codebase itself — 16 real rivers inside (G3, not yet built). Every external connector below routes through here.',
        'kind': 'central',
    },
    {
        'id': 'orchestrator_cc', 'label': 'Orchestrator CC',
        'icon': '🧭', 'color': '#4A90E2',
        'role': 'This session — planner/orchestrator. Evidence-gathering, dispatch-writing, RPGACE-side schema/UI/doc work.',
        'kind': 'satellite', 'bridges_to': 'no separate repo — runs inside RPGACE itself',
        'channel': None, 'tested': True,
    },
    {
        'id': 'openmontage_cc', 'label': 'OpenMontage CC',
        'icon': '🎬', 'color': '#E25454',
        'role': 'Agent-operated video pipeline — hands-on execution inside its own repo.',
        'kind': 'satellite', 'bridges_to': 'calesthio/OpenMontage (real cached count: 11,280 nodes)',
        'channel': 'openmontage_jobs', 'tested': True,
    },
    {
        'id': 'graphify_cc', 'label': 'Graphify CC',
        'icon': '🌐', 'color': '#3DAA6E',
        'role': 'Real 4th Total-system member — generates GRAPH_TREE.html + the cross-repo global graph.',
        'kind': 'satellite', 'bridges_to': 'graphifyy (PyPI) — a separate Claude Code session',
        'channel': 'graphify_jobs', 'tested': True,
    },
]

# Oracle + self-awareness get their own real nodes inside RPGACE
# Architecture's own cluster, per Alex's explicit design constraint
# (logged on G2's own ceo_plan_items row, Aug 13): "Oracle API should
# be its own node since it connects to so many things with rpgace just
# being a harness"; "this will also help explain self awareness as its
# own node."
HARNESS_NODES = [
    {'id': 'oracle_api', 'label': 'Oracle (Claude API harness)', 'icon': '🔮',
     'note': 'RPGACE is the harness — Oracle is the real fan-out point to every AI provider below.', 'tested': True},
    {'id': 'self_awareness', 'label': 'Self-Awareness (SELF_KNOWLEDGE)', 'icon': '🪞',
     'note': 'oracleAppGrounding.SELF_KNOWLEDGE — Oracle\'s own live self-knowledge layer, layer (c) of Oversight.', 'tested': True},
]


def polar(cx, cy, r, angle_deg):
    a = math.radians(angle_deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def build_svg():
    W, H = 1400, 1000
    cx, cy = W / 2, H * 0.62  # central figure sits lower, matching the reference image's central warrior

    nodes_svg = []
    edges_svg = []
    legend_rows = []

    # --- central RPGACE Architecture node ---
    rpgace = GALAXIES[0]
    nodes_svg.append(
        f'<g class="node central" data-id="{rpgace["id"]}">'
        f'<circle cx="{cx}" cy="{cy}" r="46" fill="#0f0f1a" stroke="{rpgace["color"]}" stroke-width="3" filter="url(#glow)"/>'
        f'<text x="{cx}" y="{cy-6}" text-anchor="middle" font-size="26">{rpgace["icon"]}</text>'
        f'<text x="{cx}" y="{cy+18}" text-anchor="middle" font-size="11" fill="#E2E2EC" font-weight="700">{rpgace["label"]}</text>'
        f'</g>'
    )

    galaxy_pos = {}  # id -> (x, y), so the real OpenMontage connector<->galaxy
                     # bridge line (Alex's confirmed Fork 3: "the openmontage
                     # node will be the connector to openmontage repo and
                     # rpgace repo, so both can exist in the galaxy output")
                     # can be drawn once both loops below have run.
    connector_pos = {}

    # --- 3 satellite galaxies, radial around the top, AC-Valhalla-style spread ---
    satellites = GALAXIES[1:]
    sat_radius = 380
    sat_angles = [-150, -90, -30]  # fan across the top, matching Melee/Ranged/Stealth spread
    for gal, ang in zip(satellites, sat_angles):
        sx, sy = polar(cx, cy, sat_radius, ang)
        galaxy_pos[gal['id']] = (sx, sy)
        edges_svg.append(_curved_edge(cx, cy, sx, sy, gal['color'], real=True))
        nodes_svg.append(
            f'<g class="node galaxy" data-id="{gal["id"]}">'
            f'<circle cx="{sx}" cy="{sy}" r="34" fill="#0f0f1a" stroke="{gal["color"]}" stroke-width="2.5" filter="url(#glow)"/>'
            f'<text x="{sx}" y="{sy-4}" text-anchor="middle" font-size="20">{gal["icon"]}</text>'
            f'<text x="{sx}" y="{sy+34}" text-anchor="middle" font-size="10.5" fill="{gal["color"]}" font-weight="700">{gal["label"]}</text>'
            f'</g>'
        )
        legend_rows.append(
            f'<div class="legend-row"><span class="dot" style="background:{gal["color"]}"></span>'
            f'<b>{gal["label"]}</b> — {gal["role"]} '
            f'<span class="meta">bridges to: {gal.get("bridges_to","—")}'
            + (f' · channel: <code>{gal["channel"]}</code>' if gal.get('channel') else '')
            + '</span></div>'
        )

    # --- Oracle + self-awareness harness nodes, close ring around center ---
    harness_radius = 140
    harness_angles = [40, 90]
    for hn, ang in zip(HARNESS_NODES, harness_angles):
        hx, hy = polar(cx, cy, harness_radius, ang)
        edges_svg.append(_curved_edge(cx, cy, hx, hy, '#9B59B6', real=True))
        nodes_svg.append(
            f'<g class="node harness" data-id="{hn["id"]}">'
            f'<circle cx="{hx}" cy="{hy}" r="22" fill="#0f0f1a" stroke="#9B59B6" stroke-width="2"/>'
            f'<text x="{hx}" y="{hy+5}" text-anchor="middle" font-size="15">{hn["icon"]}</text>'
            f'</g>'
            f'<text x="{hx}" y="{hy+38}" text-anchor="middle" font-size="9" fill="#c9a8e0">{hn["label"]}</text>'
        )
        legend_rows.append(
            f'<div class="legend-row"><span class="dot" style="background:#9B59B6"></span>'
            f'<b>{hn["label"]}</b> — {hn["note"]}</div>'
        )

    # --- 12 real connector/core nodes, outer ring, colored by tested/untested ---
    connectors = list(EXTERNAL_CONNECTORS) + [dict(SUPABASE_CORE, icon='🗄️')]
    for c in connectors:
        c.setdefault('icon', _connector_icon(c['name']))
    conn_radius = 250
    n = len(connectors)
    start_angle = 150
    span = 300  # sweep across the bottom/sides, away from the satellite galaxies above
    for i, c in enumerate(connectors):
        ang = start_angle + (span * i / max(n - 1, 1))
        px, py = polar(cx, cy, conn_radius, ang)
        connector_pos[c['name']] = (px, py)
        tested = c.get('tested', True)
        dash = '4,3' if not tested else 'none'
        opacity = '0.55' if not tested else '1'
        col = '#3DAA6E' if tested else '#E0A040'
        edges_svg.append(_curved_edge(cx, cy, px, py, col, real=tested, dashed=not tested))
        nodes_svg.append(
            f'<g class="node connector" data-id="ext_{i}" opacity="{opacity}">'
            f'<circle cx="{px}" cy="{py}" r="16" fill="#0f0f1a" stroke="{col}" stroke-width="1.6" stroke-dasharray="{dash}"/>'
            f'<text x="{px}" y="{py+5}" text-anchor="middle" font-size="12">{c["icon"]}</text>'
            f'</g>'
            f'<text x="{px}" y="{py+28}" text-anchor="middle" font-size="8.5" fill="{"#9a9aa8" if not tested else "#cfd6e0"}">{c["name"]}</text>'
        )
        badge = '' if tested else ' <span class="warn">⚠ not tested</span>'
        legend_rows.append(
            f'<div class="legend-row small"><span class="dot" style="background:{col}"></span>'
            f'<b>{c["name"]}</b>{badge} — {c.get("note","")} '
            f'<span class="meta">bridges to: {c.get("bridges_to","—")}</span></div>'
        )

    # --- the real OpenMontage connector<->galaxy bridge, Alex-confirmed ---
    if 'OpenMontage' in connector_pos and 'openmontage_cc' in galaxy_pos:
        ox, oy = connector_pos['OpenMontage']
        gx, gy = galaxy_pos['openmontage_cc']
        edges_svg.append(_curved_edge(ox, oy, gx, gy, '#E25454', real=True, dashed=True))

    return '\n'.join(nodes_svg), '\n'.join(edges_svg), '\n'.join(legend_rows), W, H


def _connector_icon(name):
    icons = {
        'Anthropic (Claude API)': '🔮', 'OpenMontage': '🎬', 'Composio': '🔗',
        'Moonshot AI (Kimi)': '🌙', 'OpenAI (Luna)': '🌟', 'librosa': '🎵',
        'FFmpeg': '🎞️', 'OpenArt': '🎨', 'Graphify CC': '🌐',
        'Jina AI': '🕸️', 'Last.fm': '📻', 'n8n': '⚙️', 'Whisper (OpenAI, local)': '🎙️',
        'Supabase': '🗄️',
    }
    return icons.get(name, '●')


def _curved_edge(x1, y1, x2, y2, color, real=True, dashed=False):
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    # perpendicular offset for a real organic curve, not a straight line
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy) or 1
    ox, oy = -dy / length * 24, dx / length * 24
    cx_, cy_ = mx + ox, my + oy
    dash = ' stroke-dasharray="5,4"' if dashed else ''
    op = '0.85' if real else '0.4'
    return (f'<path d="M {x1} {y1} Q {cx_} {cy_} {x2} {y2}" fill="none" '
            f'stroke="{color}" stroke-width="1.8" opacity="{op}"{dash} filter="url(#edgeglow)"/>')


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Level 0)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #12121e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif;padding:0}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:30px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12.5px;max-width:760px;margin:0 auto}}
  .canvas-wrap{{max-width:1400px;margin:0 auto;overflow-x:auto}}
  svg text{{font-family:'Segoe UI',system-ui,sans-serif;user-select:none}}
  .node{{cursor:default}}
  .legend{{max-width:900px;margin:0 auto 60px;padding:0 24px}}
  .legend h2{{font-family:Georgia,serif;font-size:16px;color:var(--gold);margin:24px 0 10px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px}}
  .legend-row{{font-size:12px;color:var(--dim);padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);line-height:1.6}}
  .legend-row b{{color:#E2E2EC}}
  .legend-row .meta{{display:block;font-size:10.5px;color:#6a6a78;margin-top:2px}}
  .legend-row.small{{font-size:11px}}
  .legend-row .warn{{color:#E0A040;font-weight:700}}
  .dot{{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px}}
  .note{{max-width:900px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10.5px;background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:3px}}
</style>
</head>
<body>

<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Level 0</div>
  <h1>🌌 The Galaxy Map</h1>
  <p>The real top-level view — 4 galaxies (RPGACE Architecture + 3 real Total-system members), Oracle and self-awareness as their own nodes since RPGACE is the harness they operate through, and every real external connector RPGACE Architecture touches — styled radially, per Alex's own Assassin's Creed Valhalla reference. Untested connectors are shown with a dashed ring and reduced opacity, never hidden. River-level (G3) and function-level (G4) drill-down are real, separate, not-yet-built future items — this is Level 0 only.</p>
</div>

<div class="canvas-wrap">
<svg viewBox="0 0 {W} {H}" width="100%" style="max-width:1400px;display:block;margin:0 auto">
  <defs>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="edgeglow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  {edges}
  {nodes}
</svg>
</div>

<div class="legend">
  <h2>Galaxies</h2>
  {legend}
</div>

<div class="note">
  Generated by <code>scripts/galaxy_map.py</code> — real data reused from
  <code>scripts/graphify_river_group.py</code>'s own <code>EXTERNAL_CONNECTORS</code>/<code>SUPABASE_CORE</code>
  (never re-derived). Mapping rules: <code>system_map_spec.md</code>.
  G2 of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan — G3
  (river drill-down) and G4 (function drill-down) are real, separate,
  not yet built.
</div>

</body>
</html>
"""


def main():
    nodes, edges, legend, W, H = build_svg()
    html = TEMPLATE.format(nodes=nodes, edges=edges, legend=legend, W=W, H=H)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(GALAXIES)} galaxies, {len(HARNESS_NODES)} harness nodes, "
          f"{len(EXTERNAL_CONNECTORS)+1} connector/core nodes.")


if __name__ == '__main__':
    main()
