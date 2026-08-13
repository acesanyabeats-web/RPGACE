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

Real data reused, never re-derived (rule 8): imports EXTERNAL_CONNECTORS,
SUPABASE_CORE, INTERACTION_TYPE_COLOR/LABEL directly from
graphify_river_group.py, the same canonical source graph.html/the
Obsidian vault already read from.

**Aug 13, 2nd pass — real topology fix, not cosmetic.** Alex's own
direct catch: "oracle is using claude api to orchestrate kimi and
luna, so would oracle connect to luna and moonshot... supabase links
should also exist, its communication lines, not execution and
changing with updates lines... the lines should represent what
affects what, what communicates with what, what information change
output is done, then where it is transported to, with human gates."
Two real, confirmed bugs fixed: (1) Anthropic/Kimi/Luna used to hang
off RPGACE Architecture as flat, independent connectors — wrong,
since Oracle is the real harness mediating ALL THREE (RPGACE
Architecture -> Oracle -> {Anthropic/Kimi/Luna}, never RPGACE
Architecture -> provider directly); (2) Supabase used to get one
generic edge — now gets two real, distinct edges (read_query +
write_commit), per Alex's own explicit "communication, not
execution" distinction. Every other edge now carries its own real
interaction TYPE color (system_map_spec.md §4/§11-types), not a
generic tested/untested scheme — tested/untested stays as a real,
SEPARATE node-level visual (dashed ring + opacity), so both
dimensions (what kind of relationship + how confident we are it
works) are shown at once, never conflated.

Scope, per the ratified plan and system_map_spec.md §3: ONLY the top-
level galaxies + RPGACE Architecture's own connector bridge-nodes.
River-level (G3) and function-level (G4) drill-down are real, separate,
NOT-yet-built future items — this file deliberately does not attempt
them; each level gets its own generator when its own item is built,
matching the "generate from real data, never hand-author" discipline
every other graphify/Obsidian script in this repo already follows.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    EXTERNAL_CONNECTORS, SUPABASE_CORE,
    INTERACTION_TYPE_COLOR, INTERACTION_TYPE_LABEL,
)

OUT = Path('graphify-out/galaxy_map.html')

GALAXIES = [
    {
        'id': 'rpgace_architecture', 'label': 'RPGACE Architecture',
        'icon': '🏛️', 'color': '#C9A84C',
        'role': 'The app/codebase itself — 16 real rivers inside (G3, not yet built). Every external connector below routes through here, or through Oracle specifically for AI providers.',
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

# Oracle + self-awareness — real harness nodes, per Alex's design
# constraint (logged on G2's own ceo_plan_items row): "Oracle API
# should be its own node since it connects to so many things with
# rpgace just being a harness"; "this will also help explain self
# awareness as its own node." A real, new "Human Gate" node added same
# pass — Alex's own explicit ask for a visible human-checkpoint
# dimension ("human gates on my end showing what i see and what i
# decide") represented at the Level-0 view.
HARNESS_NODES = [
    {'id': 'oracle_api', 'label': 'Oracle (AI harness)', 'icon': '🔮',
     'note': 'RPGACE is the harness — Oracle is the real fan-out point to every AI provider, mediating all 3 (never RPGACE Architecture calling a provider directly).'},
    {'id': 'self_awareness', 'label': 'Self-Awareness (SELF_KNOWLEDGE)', 'icon': '🪞',
     'note': "oracleAppGrounding.SELF_KNOWLEDGE — Oracle's own live self-knowledge layer, layer (c) of Oversight."},
    {'id': 'human_gate_alex', 'label': 'Human Gate — Alex', 'icon': '🧑',
     'note': 'The real, standing human-in-the-loop across Total Systems — every Tier-3 action (spend, destructive ops, taxonomy writes) routes through a real confirm here, not automated.'},
]

# Real, evidence-grounded interaction type per real AI provider Oracle
# mediates — Anthropic is live/primary; Kimi/Luna are real dormant
# scaffolds (api/oracle.js provider:'kimi'|'luna'), not yet routed to.
ORACLE_PROVIDERS = [
    {'name': 'Anthropic (Claude API)', 'icon': '🔮', 'tested': True,
     'role': 'Primary — live, every real Oracle call today', 'itype': 'ai_judgment_call'},
    {'name': 'Moonshot AI (Kimi)', 'icon': '🌙', 'tested': False,
     'role': 'Dormant alternate — real scaffold, no live key configured', 'itype': 'ai_judgment_call'},
    {'name': 'OpenAI (Luna)', 'icon': '🌟', 'tested': False,
     'role': 'Dormant alternate — same scaffold shape as Kimi', 'itype': 'ai_judgment_call'},
]
ORACLE_PROVIDER_NAMES = {p['name'] for p in ORACLE_PROVIDERS}

# Real, evidence-grounded interaction type per remaining connector —
# read from each EXTERNAL_CONNECTORS entry's own real 'note' text
# (rule 1: grepped against what the note actually describes, not
# invented for symmetry).
CONNECTOR_ITYPE = {
    'OpenMontage': 'dispatch_trigger',
    'Composio': 'external_extract_call',
    'librosa': 'external_extract_call',
    'FFmpeg': 'dispatch_trigger',
    'OpenArt': 'terminal_sink',  # deferred — not wired to anything yet, real honest state
    'Graphify CC': 'dispatch_trigger',
    'Jina AI': 'external_extract_call',
    'Last.fm': 'external_extract_call',
    'n8n': 'dispatch_trigger',
    'Whisper (OpenAI, local)': 'external_extract_call',
}


def polar(cx, cy, r, angle_deg):
    a = math.radians(angle_deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def build_svg():
    W, H = 1400, 1050
    cx, cy = W / 2, H * 0.60

    nodes_svg = []
    edges_svg = []
    legend_rows = []
    itype_used = set()

    def node_circle(x, y, r, color, icon, label_below=None, tested=True, glow=True, label_color=None):
        dash = 'stroke-dasharray="4,3"' if not tested else ''
        opacity = '0.55' if not tested else '1'
        filt = ' filter="url(#glow)"' if glow else ''
        s = (f'<g class="node" opacity="{opacity}">'
             f'<circle cx="{x}" cy="{y}" r="{r}" fill="#0f0f1a" stroke="{color}" stroke-width="2" {dash}{filt}/>'
             f'<text x="{x}" y="{y+5}" text-anchor="middle" font-size="{r*0.75}">{icon}</text>'
             f'</g>')
        if label_below:
            lc = label_color or '#cfd6e0'
            s += f'<text x="{x}" y="{y+r+16}" text-anchor="middle" font-size="9" fill="{lc}">{label_below}</text>'
        return s

    def edge(x1, y1, x2, y2, itype, tested=True, offset_mult=1):
        itype_used.add(itype)
        col = INTERACTION_TYPE_COLOR.get(itype, '#6b7280')
        return _curved_edge(x1, y1, x2, y2, col, real=tested, dashed=not tested, offset_mult=offset_mult)

    # --- central RPGACE Architecture node ---
    rpgace = GALAXIES[0]
    nodes_svg.append(
        f'<g class="node central"><circle cx="{cx}" cy="{cy}" r="46" fill="#0f0f1a" stroke="{rpgace["color"]}" stroke-width="3" filter="url(#glow)"/>'
        f'<text x="{cx}" y="{cy-6}" text-anchor="middle" font-size="26">{rpgace["icon"]}</text>'
        f'<text x="{cx}" y="{cy+18}" text-anchor="middle" font-size="11" fill="#E2E2EC" font-weight="700">{rpgace["label"]}</text></g>'
    )

    galaxy_pos = {}
    connector_pos = {}

    # --- 3 satellite galaxies ---
    satellites = GALAXIES[1:]
    sat_radius = 400
    sat_angles = [-150, -90, -30]
    for gal, ang in zip(satellites, sat_angles):
        sx, sy = polar(cx, cy, sat_radius, ang)
        galaxy_pos[gal['id']] = (sx, sy)
        edges_svg.append(_curved_edge(cx, cy, sx, sy, gal['color'], real=True))
        nodes_svg.append(node_circle(sx, sy, 34, gal['color'], gal['icon'], gal['label'], glow=True, label_color=gal['color']))
        legend_rows.append(
            f'<div class="legend-row"><span class="dot" style="background:{gal["color"]}"></span>'
            f'<b>{gal["label"]}</b> — {gal["role"]} '
            f'<span class="meta">bridges to: {gal.get("bridges_to","—")}'
            + (f' · channel: <code>{gal["channel"]}</code>' if gal.get('channel') else '')
            + '</span></div>'
        )

    # --- Oracle + self-awareness + human-gate harness nodes ---
    harness_radius = 150
    harness_angles = [118, 90, 150]  # oracle_api pushed into the real empty
    # wedge between the connector ring's start/end (avoids the Aug 13
    # screenshot-review label collision with Last.fm/Jina AI)
    harness_xy = {}
    for hn, ang in zip(HARNESS_NODES, harness_angles):
        hx, hy = polar(cx, cy, harness_radius, ang)
        harness_xy[hn['id']] = (hx, hy)
        itype = 'ai_judgment_call' if hn['id'] == 'oracle_api' else ('read_query' if hn['id'] == 'self_awareness' else 'human_confirm_gate')
        edges_svg.append(edge(cx, cy, hx, hy, itype))
        col = '#9B59B6' if hn['id'] != 'human_gate_alex' else '#E25454'
        nodes_svg.append(node_circle(hx, hy, 22, col, hn['icon'], hn['label'], glow=False, label_color=col))
        legend_rows.append(f'<div class="legend-row"><span class="dot" style="background:{col}"></span><b>{hn["label"]}</b> — {hn["note"]}</div>')

    # --- Oracle mediates all 3 real AI providers — the real topology fix ---
    ox, oy = harness_xy['oracle_api']
    prov_radius = 100
    prov_angles = [90, 118, 146]  # fan within the same empty wedge, not back toward the connector ring
    for prov, ang in zip(ORACLE_PROVIDERS, prov_angles):
        px, py = polar(ox, oy, prov_radius, ang)
        edges_svg.append(edge(ox, oy, px, py, prov['itype'], tested=prov['tested']))
        col = INTERACTION_TYPE_COLOR[prov['itype']]
        nodes_svg.append(node_circle(px, py, 15, col, prov['icon'], prov['name'], tested=prov['tested'], glow=False, label_color='#9a9aa8' if not prov['tested'] else '#cfd6e0'))
        badge = '' if prov['tested'] else ' <span class="warn">⚠ not tested</span>'
        legend_rows.append(
            f'<div class="legend-row small"><span class="dot" style="background:{col}"></span>'
            f'<b>{prov["name"]}</b>{badge} — {prov["role"]} '
            f'<span class="meta">mediated by Oracle, not called by RPGACE Architecture directly · {INTERACTION_TYPE_LABEL[prov["itype"]]}</span></div>'
        )

    # --- remaining real connectors (everything except the 3 AI providers, handled above) ---
    connectors = [c for c in EXTERNAL_CONNECTORS if c['name'] not in ORACLE_PROVIDER_NAMES]
    for c in connectors:
        c.setdefault('icon', _connector_icon(c['name']))
    conn_radius = 260
    n = len(connectors)
    start_angle = 150
    span = 300
    for i, c in enumerate(connectors):
        ang = start_angle + (span * i / max(n - 1, 1))
        px, py = polar(cx, cy, conn_radius, ang)
        connector_pos[c['name']] = (px, py)
        tested = c.get('tested', True)
        itype = CONNECTOR_ITYPE.get(c['name'], 'external_extract_call')
        col = INTERACTION_TYPE_COLOR[itype]
        edges_svg.append(edge(cx, cy, px, py, itype, tested=tested))
        nodes_svg.append(node_circle(px, py, 16, col, c['icon'], c['name'], tested=tested, glow=False, label_color='#9a9aa8' if not tested else '#cfd6e0'))
        badge = '' if tested else ' <span class="warn">⚠ not tested</span>'
        legend_rows.append(
            f'<div class="legend-row small"><span class="dot" style="background:{col}"></span>'
            f'<b>{c["name"]}</b>{badge} — {c.get("note","")} '
            f'<span class="meta">{INTERACTION_TYPE_LABEL[itype]} · bridges to: {c.get("bridges_to","—")}</span></div>'
        )

    # --- Supabase — the real 2nd fix: communication (read) vs execution (write), two real edges ---
    sup_x, sup_y = polar(cx, cy, conn_radius, start_angle + span + 25)
    sup = dict(SUPABASE_CORE, icon='🗄️')
    # Real, distinct offsets so both edges are actually visible as two
    # separate lines, not one drawn silently on top of the other —
    # caught during the Aug 13 screenshot review (2nd pass).
    edges_svg.append(edge(cx, cy, sup_x, sup_y, 'read_query', offset_mult=2.2))
    edges_svg.append(edge(cx, cy, sup_x, sup_y, 'write_commit', offset_mult=-2.2))
    nodes_svg.append(node_circle(sup_x, sup_y, 18, '#5FB3D9', sup['icon'], sup['name'], glow=True, label_color='#5FB3D9'))
    legend_rows.append(
        f'<div class="legend-row"><span class="dot" style="background:#5FB3D9"></span>'
        f'<b>{sup["name"]}</b> — {sup["note"]} '
        f'<span class="meta">TWO real edges: {INTERACTION_TYPE_LABEL["read_query"]} + {INTERACTION_TYPE_LABEL["write_commit"]} — '
        f'communication (reads) is genuinely distinct from execution/changing (writes), per Alex\'s own explicit ask.</span></div>'
    )

    # --- the real OpenMontage connector<->galaxy bridge, Alex-confirmed Fork 3 ---
    if 'OpenMontage' in connector_pos and 'openmontage_cc' in galaxy_pos:
        oox, ooy = connector_pos['OpenMontage']
        gx, gy = galaxy_pos['openmontage_cc']
        edges_svg.append(_curved_edge(oox, ooy, gx, gy, '#E25454', real=True, dashed=True))

    # --- real Graphify CC <-> OpenMontage CC edge, found Aug 13 via the
    # galaxy-interview pilot (Finding 1, MATERIAL) — Graphify CC really
    # does `graphify clone` OpenMontage's own repo directly (11,280 real
    # nodes merged into its cross-repo graph), independent of RPGACE
    # Architecture. A real, one-way read relationship neither galaxy's
    # own RPGACE-mediated dispatch shows — confirmed via total_system_
    # members + graphify_jobs history, not invented for symmetry. ---
    if 'graphify_cc' in galaxy_pos and 'openmontage_cc' in galaxy_pos:
        g2x, g2y = galaxy_pos['graphify_cc']
        o2x, o2y = galaxy_pos['openmontage_cc']
        edges_svg.append(edge(g2x, g2y, o2x, o2y, 'read_query'))
        legend_rows.append(
            '<div class="legend-row"><span class="dot" style="background:'
            + INTERACTION_TYPE_COLOR['read_query'] + '"></span>'
            '<b>Graphify CC → OpenMontage CC (repo read)</b> — a real, '
            'direct <code>graphify clone</code> of OpenMontage\'s own repo '
            '(11,280 real nodes merged into Graphify CC\'s cross-repo graph), '
            'independent of RPGACE Architecture — neither galaxy\'s own '
            'RPGACE-mediated dispatch shows this relationship.</div>'
        )

    # --- real interaction-type legend, only types actually used ---
    itype_legend = ''.join(
        f'<div class="legend-row small"><span class="dot" style="background:{INTERACTION_TYPE_COLOR[t]}"></span>'
        f'<b>{INTERACTION_TYPE_LABEL[t]}</b></div>'
        for t in sorted(itype_used)
    )

    return '\n'.join(nodes_svg), '\n'.join(edges_svg), '\n'.join(legend_rows), itype_legend, W, H


def _connector_icon(name):
    icons = {
        'OpenMontage': '🎬', 'Composio': '🔗', 'librosa': '🎵',
        'FFmpeg': '🎞️', 'OpenArt': '🎨', 'Graphify CC': '🌐',
        'Jina AI': '🕸️', 'Last.fm': '📻', 'n8n': '⚙️', 'Whisper (OpenAI, local)': '🎙️',
    }
    return icons.get(name, '●')


def _curved_edge(x1, y1, x2, y2, color, real=True, dashed=False, offset_mult=1):
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy) or 1
    ox, oy = -dy / length * 24 * offset_mult, dx / length * 24 * offset_mult
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
  .hero p{{color:var(--dim);font-size:12.5px;max-width:780px;margin:0 auto}}
  .canvas-wrap{{max-width:1400px;margin:0 auto;overflow-x:auto}}
  svg text{{font-family:'Segoe UI',system-ui,sans-serif;user-select:none}}
  .node{{cursor:default}}
  .legend{{max-width:900px;margin:0 auto 20px;padding:0 24px}}
  .legend h2{{font-family:Georgia,serif;font-size:16px;color:var(--gold);margin:24px 0 10px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px}}
  .legend-row{{font-size:12px;color:var(--dim);padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);line-height:1.6}}
  .legend-row b{{color:#E2E2EC}}
  .legend-row .meta{{display:block;font-size:10.5px;color:#6a6a78;margin-top:2px}}
  .legend-row.small{{font-size:11px}}
  .legend-row .warn{{color:#E0A040;font-weight:700}}
  .dot{{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px}}
  .itype-grid{{display:grid;grid-template-columns:1fr 1fr;gap:0 24px}}
  .note{{max-width:900px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10.5px;background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:3px}}
</style>
</head>
<body>

<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Level 0</div>
  <h1>🌌 The Galaxy Map</h1>
  <p>The real top-level view — 4 galaxies, Oracle as the real mediating harness for all 3 AI providers (never a direct RPGACE→provider edge), self-awareness and a real Human Gate as their own nodes, and every real external connector — each edge colored by its own real interaction TYPE (what it actually does), not just which galaxy it belongs to. Supabase gets two distinct real edges: communication (reads) vs. execution/change (writes). Untested connectors keep a dashed ring + reduced opacity, never hidden. River-level (G3) and function-level (G4) drill-down are real, separate, not-yet-built future items — this is Level 0 only.</p>
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
  <h2>Edge legend — what each line actually means</h2>
  <div class="itype-grid">{itype_legend}</div>
</div>

<div class="legend">
  <h2>Galaxies &amp; nodes</h2>
  {legend}
</div>

<div class="note">
  Generated by <code>scripts/galaxy_map.py</code> — real data reused from
  <code>scripts/graphify_river_group.py</code>'s own <code>EXTERNAL_CONNECTORS</code>/<code>SUPABASE_CORE</code>/
  <code>INTERACTION_TYPE_COLOR</code> (never re-derived). Mapping rules: <code>system_map_spec.md</code>.
  G2 of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan — G3
  (river drill-down) and G4 (function drill-down) are real, separate,
  not yet built.
</div>

</body>
</html>
"""


def main():
    nodes, edges, legend, itype_legend, W, H = build_svg()
    html = TEMPLATE.format(nodes=nodes, edges=edges, legend=legend, itype_legend=itype_legend, W=W, H=H)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(GALAXIES)} galaxies, {len(HARNESS_NODES)} harness nodes, "
          f"{len(ORACLE_PROVIDERS)} AI providers under Oracle, "
          f"{len(EXTERNAL_CONNECTORS) - len(ORACLE_PROVIDER_NAMES) + 1} remaining connector/core nodes.")


if __name__ == '__main__':
    main()
