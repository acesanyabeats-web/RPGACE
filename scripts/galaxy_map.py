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
Each level gets its own generator, matching the "generate from real
data, never hand-author" discipline every other graphify/Obsidian
script in this repo already follows.

**Aug 13, 3rd pass — G3 shipped, this file's own central node is now a
real drill-down link, not a dead end.** `scripts/galaxy_map_river.py`
generates `graphify-out/galaxy_map_river.html` (Level 1: RPGACE
Architecture's own 16 rivers, real `RIVER_FLOWS` edges) — the central
RPGACE Architecture node here now wraps in a real `<a href=...>` to it.

**Aug 13, 4th pass — G4 shipped too.** `scripts/galaxy_map_module.py`
generates `graphify-out/galaxy_map_module.html` (Level 2: each river's
own real modules PLUS the real dashboard cards, from `dashDeck.
MODULES`, that actually route into it — Alex's own explicit ask to
include dashboard cards as reference points, not just code modules).
Reachable by clicking any river node on Level 1.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    EXTERNAL_CONNECTORS, SUPABASE_CORE,
    INTERACTION_TYPE_COLOR, INTERACTION_TYPE_LABEL,
)
from graphify_river_group import inject_level_rail  # noqa: E402
# Real Aug 21 2026 fusion — Alex's own direct ask: "the l0 7 units
# should exist in the bubbles in on rpgace total systems own
# architecture map." Pulls in the real 7-unit EDGES model (galaxy_map_
# l0.py) and the real Decisions list (galaxy_map_decisions.py) so this
# page's own 4 galaxies + 5 more real units (External AI/Skills/Alex/
# Supabase/Oversight Docs) share ONE real Infra/Inter facet mechanic —
# no separate file, no circular import (neither source module imports
# from this one).
from galaxy_map_l0 import (  # noqa: E402
    UNITS as SRC_UNITS, EDGES as SRC_EDGES, INJECTION, ACTOR,
    build_matrix as l0_build_matrix, build_table_details as l0_build_table_details,
)
from galaxy_map_decisions import CATEGORIES as DEC_CATEGORIES, DECISION_POINTS  # noqa: E402

OUT = Path('graphify-out/galaxy_map.html')


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')

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
     'note': 'The real, standing human-in-the-loop across Total Systems — every Tier-3 action (spend, destructive ops, taxonomy writes) routes through a real confirm here, not automated. Same real recurring actor as the "🧑 Alex" bubble at Levels 1-3 (same accent color, deliberately) — this Level-0 node is the coarse, governance-granularity version (Tier-3 confirmation); Levels 1-3 show the fine-grained version (which real modules/functions Alex actually sees and clicks). Not rebuilt at Level 0 itself — DOM/button-level detail genuinely doesn\'t fit galaxy granularity, "where it makes sense" per Alex\'s own wording.'},
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

GALAXY_BY_ID = {g['id']: g for g in GALAXIES}

# ── Real, deduplicated 9-unit L0 (rule 8: rpgace_architecture and
# orchestrator_cc exist in BOTH this file's own GALAXIES and galaxy_
# map_l0.py's UNITS — merged here, not duplicated). 4 of the 9 already
# render as real SVG bubbles above (the 3 satellites + the human_gate_
# alex harness node, now wired with a real unit_id); the other 5 get a
# real, additional bubble row below the SVG, per Alex's own direct ask.
UNIT_ORDER = [
    'rpgace_architecture', 'orchestrator_cc', 'openmontage_cc', 'graphify_cc',
    'external_ai', 'skills', 'alex', 'supabase', 'oversight_docs',
]
UNIT_META = {
    'rpgace_architecture': {'label': 'RPGACE Architecture', 'icon': '🏛️', 'color': '#C9A84C'},
    'orchestrator_cc': {'label': 'Orchestrator CC', 'icon': '🧭', 'color': '#4A90E2'},
    'openmontage_cc': {'label': 'OpenMontage CC', 'icon': '🎬', 'color': '#E25454'},
    'graphify_cc': {'label': 'Graphify CC', 'icon': '🌐', 'color': '#3DAA6E'},
    'external_ai': {'label': 'External AI', 'icon': '🔮', 'color': '#9B59B6'},
    'skills': {'label': 'Skills', 'icon': '🧩', 'color': '#3DAA6E'},
    'alex': {'label': 'Alex', 'icon': '🧑', 'color': '#E25454'},
    'supabase': {'label': 'Supabase', 'icon': '🗄️', 'color': '#2ABFB0'},
    'oversight_docs': {'label': 'Oversight Docs', 'icon': '📚', 'color': '#C9A84C'},
}
# The 5 units that need a NEW bubble on this page (the other 4 already
# render via the SVG satellites/harness node above).
NEW_BUBBLE_UNITS = ['external_ai', 'skills', 'alex', 'supabase', 'oversight_docs']

# Real, explicit override #1 — anything touching External AI is INFRA
# regardless of its stored EDGES 'kind' tag (Alex's own confirmed
# example this session: infra = "Supabase touch, Oracle call,
# external-connector touch").
FORCE_INFRA_UNITS = {'external_ai'}
# Real, explicit override #2 — the alex<->rpgace_architecture edge is
# INFRA (Alex's own literal "infra = what decisions I can make"
# example), expanded below to the full real DECISION_POINTS list.
FORCE_INFRA_EDGE_IDS = {'alex-rpgace'}


def build_facets():
    """Returns {unit_id: [facet, ...]} for all 9 real merged units.
    Each facet: {kind: 'infra'|'inter', dim, label, detail, share_key,
    link (optional)}. Real data reused, never re-derived (rule 8)."""
    facets = {uid: [] for uid in UNIT_ORDER}

    for e in SRC_EDGES:
        a, b = e['a'], e['b']
        if a not in facets or b not in facets:
            continue
        kind = 'infra' if e['kind'] == INJECTION else 'inter'
        if a in FORCE_INFRA_UNITS or b in FORCE_INFRA_UNITS:
            kind = 'infra'
        if e['id'] in FORCE_INFRA_EDGE_IDS:
            kind = 'infra'
        share_key = e.get('link') or f"edge:{e['id']}"
        dim_label = {
            'galaxy_map_decisions.html': 'Decisions (human-confirm gates)',
            'galaxy_map_externals.html': 'Externals',
            'galaxy_map_skill_network.html': 'Skills',
            'galaxy_map_supabase.html': 'Supabase',
            'galaxy_map.html': 'RPGACE Architecture (core chain)',
        }.get(e.get('link'), 'Direct relationship')
        for me, other in ((a, b), (b, a)):
            other_label = UNIT_META[other]['label']
            facets[me].append({
                'kind': kind, 'dim': dim_label,
                'label': f"↔ {other_label}",
                'detail': e['desc'] + ' <span class="ev">Evidence: ' + esc(e['evidence']) + '</span>',
                'share_key': share_key, 'link': e.get('link'),
            })

    for gid in ('orchestrator_cc', 'openmontage_cc', 'graphify_cc'):
        g = GALAXY_BY_ID.get(gid)
        if not g:
            continue
        channel = g.get('channel')
        link = 'galaxy_map_orchestrator_openmontage.html' if gid == 'openmontage_cc' else None
        detail = f"{esc(g['role'])} <span class=\"ev\">Bridges to: {esc(g.get('bridges_to') or 'n/a')}" + (f", channel: {esc(channel)}" if channel else '') + '</span>'
        facets['rpgace_architecture'].append({
            'kind': 'inter', 'dim': 'Total Systems dispatch', 'label': f"↔ {g['label']}",
            'detail': detail, 'share_key': channel or f"galaxy:{gid}", 'link': link,
        })
        facets[gid].append({
            'kind': 'inter', 'dim': 'Total Systems dispatch', 'label': '↔ RPGACE Architecture',
            'detail': detail, 'share_key': channel or f"galaxy:{gid}", 'link': link,
        })

    connector_owner = {'OpenMontage': 'openmontage_cc', 'FFmpeg': 'openmontage_cc', 'Graphify CC': 'graphify_cc'}
    for name, itype in CONNECTOR_ITYPE.items():
        owner = connector_owner.get(name, 'rpgace_architecture')
        facets[owner].append({
            'kind': 'infra', 'dim': 'Externals', 'label': f"Uses: {esc(name)}",
            'detail': f"Real external connector, interaction type <code>{esc(itype)}</code>.",
            'share_key': f"connector:{name}", 'link': 'galaxy_map_externals.html',
        })

    for p in ORACLE_PROVIDERS:
        status = 'live' if p['tested'] else 'dormant scaffold'
        for uid in ('rpgace_architecture', 'alex'):
            facets[uid].append({
                'kind': 'infra', 'dim': 'External AI', 'label': f"Uses: {esc(p['name'])} ({status})",
                'detail': f"{esc(p['role'])}", 'share_key': f"provider:{p['name']}", 'link': 'galaxy_map_externals.html',
            })

    sa = next((n for n in HARNESS_NODES if n['id'] == 'self_awareness'), None)
    if sa:
        facets['rpgace_architecture'].append({
            'kind': 'infra', 'dim': 'External AI', 'label': f"{sa['icon']} {sa['label']}",
            'detail': esc(sa['note']), 'share_key': 'self_awareness', 'link': None,
        })

    for cat in DEC_CATEGORIES:
        pts = [p for p in DECISION_POINTS if p['category'] == cat['id']]
        if not pts:
            continue
        detail = '<ul class="dec-list">' + ''.join(
            f"<li><b>{esc(p['title'])}</b> — <code>{esc(p['module'])}.{esc(p['func'])}</code>: {esc(p['logic'])}</li>"
            for p in pts) + '</ul>'
        facets['alex'].append({
            'kind': 'infra', 'dim': 'Decisions (what Alex can decide)', 'label': f"{esc(cat['label'])} ({len(pts)})",
            'detail': detail, 'share_key': 'decisions', 'link': 'galaxy_map_decisions.html',
        })

    facets['alex'].append({
        'kind': 'inter', 'dim': 'UI / Dashboard Path', 'label': 'Real dashboard-card → module → decision-fork path',
        'detail': 'G37/G38 — the real Level-4 flow to whichever module a dashboard card opens, then the real Y/N fork (Decisions) Alex actually hits on that path, if any.',
        'share_key': 'alex_ui_path', 'link': 'galaxy_map_alex_path.html',
    })
    facets['rpgace_architecture'].append({
        'kind': 'inter', 'dim': 'UI / Dashboard Path', 'label': 'Real river → dashboard card → primary module chain',
        'detail': 'G38 — all 10 rivers with a real dashboard card, each resolved to its real primary module.',
        'share_key': 'alex_ui_path', 'link': 'galaxy_map_level2_5.html',
    })

    for uid in ('rpgace_architecture', 'orchestrator_cc', 'skills', 'oversight_docs'):
        facets[uid].append({
            'kind': 'inter', 'dim': 'Oversight Sync (process-time)', 'label': 'Real push/build/ritual sequencing',
            'detail': 'G55 — which oversight doc/artifact gets touched, in what order, during a push/build or a ritual (Bedtime/Routine/Summary/CEO Loop 2).',
            'share_key': 'oversight_sync', 'link': 'galaxy_map_oversight_sync.html',
        })

    return facets


def polar(cx, cy, r, angle_deg):
    a = math.radians(angle_deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def barycenter_order(buckets, edges, rank_order, rounds=4):
    """Real, shared crossing-REDUCTION heuristic for every level (Aug
    13, real Alex rule: "make it so no edges ever cross each other, way
    more important than keeping bubbles in a row"). Standard Sugiyama/
    Eades layered-graph-drawing technique (Aintergration'd as a real,
    named algorithm — not invented): within each rank/column, reorder
    items by the mean real-neighbor position in the adjacent
    already-ordered rank, alternating sweep direction each round so
    both sides pull toward agreement. Genuinely reduces crossings; does
    NOT mathematically guarantee zero (minimizing crossings for a
    general graph is NP-hard — a real, honest limit, not a false
    "solved" claim) — count_crossings() below reports the real,
    verified before/after number so this is never claimed done blind.

    `buckets`: {rank_key: [item, ...]} real current grouping.
    `edges`: [(a, b), ...] real edges between items (any rank).
    `rank_order`: the real left-to-right (or ring) sequence of rank
    keys to sweep across.
    Returns a NEW {rank_key: [item, ...]} with reordered lists (same
    membership, only order changes — never adds/drops an item)."""
    order = {r: list(items) for r, items in buckets.items()}
    neighbors = {}
    for a, b in edges:
        neighbors.setdefault(a, []).append(b)
        neighbors.setdefault(b, []).append(a)
    for rnd in range(rounds):
        seq = rank_order if rnd % 2 == 0 else list(reversed(rank_order))
        for i, r in enumerate(seq):
            if i == 0 or r not in order:
                continue
            prev_r = seq[i - 1]
            prev_idx = {item: j for j, item in enumerate(order.get(prev_r, []))}
            if not prev_idx:
                continue
            cur = order[r]
            orig_idx = {item: j for j, item in enumerate(cur)}

            def bary(item):
                ns = [prev_idx[n] for n in neighbors.get(item, []) if n in prev_idx]
                return (sum(ns) / len(ns)) if ns else float(orig_idx[item])
            order[r] = sorted(cur, key=lambda it: (bary(it), orig_idx[it]))
    return order


def count_crossings(pos, edges):
    """Real, exact crossing count for a finished layout — straight-line
    segment intersection between every real edge pair sharing no
    endpoint (O(n^2), fine at this project's real per-diagram edge
    counts, ~40 max). `pos`: {item: (x, y)}. `edges`: [(a, b), ...].
    Used to report an honest before/after number for barycenter_order()
    — never assumed to be zero without actually counting."""
    def seg_intersect(p1, p2, p3, p4):
        def ccw(a, b, c):
            return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0])
        return ccw(p1, p3, p4) != ccw(p2, p3, p4) and ccw(p1, p2, p3) != ccw(p1, p2, p4)
    segs = [(pos[a], pos[b]) for a, b in edges if a in pos and b in pos]
    n = 0
    for i in range(len(segs)):
        for j in range(i + 1, len(segs)):
            (a1, a2), (b1, b2) = segs[i], segs[j]
            if a1 in (b1, b2) or a2 in (b1, b2):
                continue  # real shared endpoint — not a crossing
            if seg_intersect(a1, a2, b1, b2):
                n += 1
    return n


def build_svg():
    W, H = 1400, 1050
    cx, cy = W / 2, H * 0.60

    nodes_svg = []
    edges_svg = []
    legend_rows = []
    itype_used = set()
    edge_colors_used = set()

    def node_circle(x, y, r, color, icon, label_below=None, tested=True, glow=True, label_color=None, unit_id=None):
        dash = 'stroke-dasharray="4,3"' if not tested else ''
        opacity = '0.55' if not tested else '1'
        filt = ' filter="url(#glow)"' if glow else ''
        # Real Aug 21 2026 fusion — Alex's own direct ask: "the l0 7
        # units should exist in the bubbles in on rpgace total systems
        # own architecture map." Any node passed a real unit_id becomes
        # a clickable trigger into the shared Infra/Inter facet panel
        # below (same real data/mechanic as every other unit).
        cls = 'node unit-node' if unit_id else 'node'
        data_attr = f' data-unit="{unit_id}"' if unit_id else ''
        s = (f'<g class="{cls}" opacity="{opacity}"{data_attr}>'
             f'<circle cx="{x}" cy="{y}" r="{r}" fill="#0f0f1a" stroke="{color}" stroke-width="2" {dash}{filt}/>'
             f'<text x="{x}" y="{y+5}" text-anchor="middle" font-size="{r*0.75}">{icon}</text>'
             f'</g>')
        if label_below:
            lc = label_color or '#cfd6e0'
            s += f'<text x="{x}" y="{y+r+16}" text-anchor="middle" font-size="9" fill="{lc}"{data_attr} class="{"unit-node-label" if unit_id else ""}">{label_below}</text>'
        return s

    def edge(x1, y1, x2, y2, itype, tested=True, offset_mult=1, r1=0, r2=0):
        itype_used.add(itype)
        col = INTERACTION_TYPE_COLOR.get(itype, '#6b7280')
        edge_colors_used.add(col)
        return _curved_edge(x1, y1, x2, y2, col, real=tested, dashed=not tested, offset_mult=offset_mult, r1=r1, r2=r2)

    # --- central RPGACE Architecture node — a real, clickable drill-down
    # into G3 (galaxy_map_river.html), not just a decorative label. The
    # G2 docstring's own "River-level (G3)... not-yet-built" note is now
    # stale the moment G3 ships — this link is the real proof it's live.
    rpgace = GALAXIES[0]
    nodes_svg.append(
        f'<a href="galaxy_map_river.html" class="drill-link">'
        f'<g class="node central"><circle cx="{cx}" cy="{cy}" r="46" fill="#0f0f1a" stroke="{rpgace["color"]}" stroke-width="3" filter="url(#glow)"/>'
        f'<text x="{cx}" y="{cy-6}" text-anchor="middle" font-size="26">{rpgace["icon"]}</text>'
        f'<text x="{cx}" y="{cy+18}" text-anchor="middle" font-size="11" fill="#E2E2EC" font-weight="700">{rpgace["label"]}</text>'
        f'<text x="{cx}" y="{cy+32}" text-anchor="middle" font-size="8" fill="{rpgace["color"]}">▸ click: 16 rivers</text></g></a>'
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
        edges_svg.append(_curved_edge(cx, cy, sx, sy, gal['color'], real=True, r1=46, r2=34))
        edge_colors_used.add(gal['color'])
        nodes_svg.append(node_circle(sx, sy, 34, gal['color'], gal['icon'], gal['label'], glow=True, label_color=gal['color'], unit_id=gal['id']))
        legend_rows.append(
            f'<div class="legend-row"><span class="dot" style="background:{gal["color"]}"></span>'
            f'<b>{gal["label"]}</b> — {gal["role"]} '
            f'<span class="meta">bridges to: {gal.get("bridges_to","—")}'
            + (f' · channel: <code>{gal["channel"]}</code>' if gal.get('channel') else '')
            + '</span></div>'
        )

    # --- Oracle + self-awareness + human-gate harness nodes ---
    # Aug 13, 3rd pass — real crowding fix (Alex's own ask: "make it so
    # that interacting groups stay closer"). Tightened from a 60 spread
    # centered ~119 to a 40 spread centered 120, opening a real 70
    # buffer to the galaxy ring's own start (210) and clearing the exact
    # angular collisions the old numbers had with the connector ring's
    # own start/end (150/90 used to sit exactly on human_gate/self_
    # awareness, drawing visually-colinear overlapping lines).
    harness_radius = 195
    harness_angles = [95, 120, 145]
    harness_xy = {}
    for hn, ang in zip(HARNESS_NODES, harness_angles):
        hx, hy = polar(cx, cy, harness_radius, ang)
        harness_xy[hn['id']] = (hx, hy)
        itype = 'ai_judgment_call' if hn['id'] == 'oracle_api' else ('read_query' if hn['id'] == 'self_awareness' else 'human_confirm_gate')
        edges_svg.append(edge(cx, cy, hx, hy, itype, r1=46, r2=22))
        col = '#9B59B6' if hn['id'] != 'human_gate_alex' else '#E25454'
        node_unit_id = 'alex' if hn['id'] == 'human_gate_alex' else None
        nodes_svg.append(node_circle(hx, hy, 22, col, hn['icon'], hn['label'], glow=False, label_color=col, unit_id=node_unit_id))
        legend_rows.append(f'<div class="legend-row"><span class="dot" style="background:{col}"></span><b>{hn["label"]}</b> — {hn["note"]}</div>')

    # --- Oracle mediates all 3 real AI providers — the real topology fix ---
    ox, oy = harness_xy['oracle_api']
    prov_radius = 155
    prov_angles = [65, 100, 135]  # fans outward in the same direction oracle_api itself sits from center
    for prov, ang in zip(ORACLE_PROVIDERS, prov_angles):
        px, py = polar(ox, oy, prov_radius, ang)
        edges_svg.append(edge(ox, oy, px, py, prov['itype'], tested=prov['tested'], r1=22, r2=15))
        col = INTERACTION_TYPE_COLOR[prov['itype']]
        nodes_svg.append(node_circle(px, py, 15, col, prov['icon'], prov['name'], tested=prov['tested'], glow=False, label_color='#9a9aa8' if not prov['tested'] else '#cfd6e0'))
        badge = '' if prov['tested'] else ' <span class="warn">⚠ not tested</span>'
        legend_rows.append(
            f'<div class="legend-row small"><span class="dot" style="background:{col}"></span>'
            f'<b>{prov["name"]}</b>{badge} — {prov["role"]} '
            f'<span class="meta">mediated by Oracle, not called by RPGACE Architecture directly · {INTERACTION_TYPE_LABEL[prov["itype"]]}</span></div>'
        )

    # --- OpenMontage (external connector) + FFmpeg — both real, direct
    # dependents of OpenMontage CC specifically, not generic RPGACE
    # Architecture connectors. Aug 13, 3rd pass, real crowding fix
    # (Alex: "make it so that interacting groups stay closer"):
    # OpenMontage the external connector's ONLY real relationship is
    # to OpenMontage CC (openmontage_jobs) — it was previously sitting
    # in the generic connector ring at a fixed angle far from its own
    # galaxy, forcing a long diagonal bridge line across the whole
    # canvas (the single biggest clutter source in the Aug 13 3rd-pass
    # screenshot). Moved into a local cluster next to OpenMontage CC,
    # same real precedent as FFmpeg's own Aug 13 2nd-pass fix (its note
    # already said "never called directly by any RPGACE river" but was
    # drawn with a direct RPGACE Architecture edge anyway). 'Graphify CC'
    # stays excluded too — it's a real duplicate of its own galaxy node
    # (rule 8), not a flat connector.
    SKIP_FLAT = {'Graphify CC', 'FFmpeg', 'OpenMontage'}
    om_conn = next((c for c in EXTERNAL_CONNECTORS if c['name'] == 'OpenMontage'), None)
    ffmpeg = next((c for c in EXTERNAL_CONNECTORS if c['name'] == 'FFmpeg'), None)
    if 'openmontage_cc' in galaxy_pos:
        omx, omy = galaxy_pos['openmontage_cc']
        local_cluster = []
        if om_conn:
            local_cluster.append((om_conn, 150, 'dispatch_trigger',
                'Real, direct: this is the only thing OpenMontage the external connector actually talks to — '
                'moved out of the generic connector ring (Aug 13, 3rd pass) so it sits next to its one real '
                'relationship instead of scattered across the canvas.'))
        if ffmpeg:
            local_cluster.append((ffmpeg, -60, 'dispatch_trigger',
                'Real topology fix, Aug 13 (2nd interview pass): attached to OpenMontage CC directly, '
                'never RPGACE Architecture — matches its own real "never called directly by any RPGACE river" note.'))
        for conn, local_ang, itype, note in local_cluster:
            px, py = polar(omx, omy, 78, local_ang)
            connector_pos[conn['name']] = (px, py)
            edges_svg.append(edge(omx, omy, px, py, itype, r1=34, r2=14))
            col = INTERACTION_TYPE_COLOR[itype]
            nodes_svg.append(node_circle(px, py, 14, col, _connector_icon(conn['name']), conn['name'], glow=False, label_color='#cfd6e0'))
            legend_rows.append(
                f'<div class="legend-row small"><span class="dot" style="background:{col}"></span>'
                f'<b>{conn["name"]}</b> — {conn.get("note","")} '
                f'<span class="meta">{note}</span></div>'
            )
        # Explicit confirmation bridge (Alex-confirmed Fork 3) — now a
        # real short line since OpenMontage sits right next to its own
        # galaxy instead of across the canvas from it.
        if om_conn and om_conn['name'] in connector_pos:
            oox, ooy = connector_pos[om_conn['name']]
            edges_svg.append(_curved_edge(oox, ooy, omx, omy, '#E25454', real=True, dashed=True, r1=14, r2=34))
            edge_colors_used.add('#E25454')

    # --- remaining, genuinely galaxy-agnostic connectors ---
    # Aug 13, 3rd pass, real crowding fix: replaced the old single
    # wraparound ring (which put connector angles exactly ON TOP of
    # harness angles — Whisper@90 was colinear with self_awareness@90,
    # the old OpenMontage@150 was colinear with human_gate@150 — real,
    # objective overlap bugs, not just subjective clutter) with 2
    # explicit arcs sized to the real open space between the galaxy
    # ring (210-330) and the harness cluster (100-140): a small west
    # arc (150-210) and a larger east arc (330-450/90), each with a
    # real buffer from its neighbors, never touching a used angle.
    CONNECTOR_ANGLES = {
        'Composio': 165, 'librosa': 195,                        # west arc
        'OpenArt': 340, 'Jina AI': 0, 'Last.fm': 20,            # east arc — pulled back from the
        'n8n': 40, 'Whisper (OpenAI, local)': 60,               # harness cluster (now 95-145) with a
    }                                                            # real 35 buffer instead of the old 15
    connectors = [c for c in EXTERNAL_CONNECTORS if c['name'] not in ORACLE_PROVIDER_NAMES and c['name'] not in SKIP_FLAT]
    for c in connectors:
        c.setdefault('icon', _connector_icon(c['name']))
    conn_radius = 260
    n = len(connectors)
    for i, c in enumerate(connectors):
        ang = CONNECTOR_ANGLES.get(c['name'], 150 + (300 * i / max(n - 1, 1)))
        px, py = polar(cx, cy, conn_radius, ang)
        connector_pos[c['name']] = (px, py)
        tested = c.get('tested', True)
        itype = CONNECTOR_ITYPE.get(c['name'], 'external_extract_call')
        col = INTERACTION_TYPE_COLOR[itype]
        edges_svg.append(edge(cx, cy, px, py, itype, tested=tested, r1=46, r2=16))
        nodes_svg.append(node_circle(px, py, 16, col, c['icon'], c['name'], tested=tested, glow=False, label_color='#9a9aa8' if not tested else '#cfd6e0'))
        badge = '' if tested else ' <span class="warn">⚠ not tested</span>'
        legend_rows.append(
            f'<div class="legend-row small"><span class="dot" style="background:{col}"></span>'
            f'<b>{c["name"]}</b>{badge} — {c.get("note","")} '
            f'<span class="meta">{INTERACTION_TYPE_LABEL[itype]} · bridges to: {c.get("bridges_to","—")}</span></div>'
        )

    # --- Supabase — the real 2nd fix: communication (read) vs execution (write), two real edges ---
    # Aug 13, 3rd pass, real crowding fix: repositioned from its old
    # angle (~115, almost exactly opposite the galaxies it writes to)
    # to sit close to Graphify CC (330) instead — real evidence: 2 of
    # its 4 edges go to OpenMontage CC/Graphify CC (both in the north
    # arc), so parking it in the south cut every one of those edges
    # across the whole canvas for no reason. Now angularly 45 from
    # Graphify CC (was ~215 the short way) while its 2 RPGACE
    # Architecture edges stay exactly as short as before (they
    # originate at center regardless of Supabase's own angle).
    sup_x, sup_y = polar(cx, cy, conn_radius + 170, 8)
    sup = dict(SUPABASE_CORE, icon='🗄️')
    # Real, distinct offsets so both edges are actually visible as two
    # separate lines, not one drawn silently on top of the other —
    # caught during the Aug 13 screenshot review (2nd pass).
    edges_svg.append(edge(cx, cy, sup_x, sup_y, 'read_query', offset_mult=2.2, r1=46, r2=18))
    edges_svg.append(edge(cx, cy, sup_x, sup_y, 'write_commit', offset_mult=-2.2, r1=46, r2=18))
    nodes_svg.append(node_circle(sup_x, sup_y, 18, '#5FB3D9', sup['icon'], sup['name'], glow=True, label_color='#5FB3D9'))
    legend_rows.append(
        f'<div class="legend-row"><span class="dot" style="background:#5FB3D9"></span>'
        f'<b>{sup["name"]}</b> — {sup["note"]} '
        f'<span class="meta">TWO real edges: {INTERACTION_TYPE_LABEL["read_query"]} + {INTERACTION_TYPE_LABEL["write_commit"]} — '
        f'communication (reads) is genuinely distinct from execution/changing (writes), per Alex\'s own explicit ask.</span></div>'
    )

    # --- real Supabase <-> OpenMontage CC / Graphify CC direct-write edges ---
    # Aug 13, 2nd interview pass, real finding: OpenMontage CC and
    # Graphify CC both write DIRECTLY to Supabase (openmontage_jobs/
    # graphify_jobs, plain anon key per CLAUDE.md's own standing
    # landmine note) — bypassing RPGACE Architecture's own code
    # entirely. Not shown on any earlier version of this map.
    # Real, distinct offset per source (Aug 13, 3rd pass): Graphify CC
    # is now genuinely close to Supabase (45 apart) so its default
    # curve is fine; OpenMontage CC is still genuinely far (its own
    # real relationship is to the north, Supabase is now to the east)
    # — a real, unavoidable long edge, given a much wider bow so it
    # arcs around the outside of the crowded center instead of
    # slicing straight through the harness/connector cluster.
    SUPABASE_WRITE_OFFSET = {'openmontage_cc': 5.5, 'graphify_cc': 1.4}
    for gal_id, real_table in (('openmontage_cc', 'openmontage_jobs'), ('graphify_cc', 'graphify_jobs')):
        if gal_id in galaxy_pos:
            gx2, gy2 = galaxy_pos[gal_id]
            edges_svg.append(edge(gx2, gy2, sup_x, sup_y, 'write_commit', offset_mult=SUPABASE_WRITE_OFFSET.get(gal_id, 1), r1=34, r2=18))
            legend_rows.append(
                f'<div class="legend-row small"><span class="dot" style="background:{INTERACTION_TYPE_COLOR["write_commit"]}"></span>'
                f'<b>{[g["label"] for g in GALAXIES if g["id"]==gal_id][0]} → Supabase (direct write)</b> — '
                f'writes directly to <code>{real_table}</code> with the plain anon key, bypassing RPGACE '
                f'Architecture\'s own code entirely — a real relationship found via the galaxy-interview pilot, '
                f'not previously shown.</div>'
            )

    # (The real OpenMontage connector<->galaxy bridge, Alex-confirmed
    # Fork 3, is now drawn inline in the local-cluster block above,
    # since OpenMontage the connector lives right next to its own
    # galaxy as of the Aug 13 3rd-pass crowding fix.)

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
        edges_svg.append(edge(g2x, g2y, o2x, o2y, 'read_query', r1=34, r2=34))
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

    markers_defs = _build_markers(edge_colors_used)
    return '\n'.join(nodes_svg), '\n'.join(edges_svg), '\n'.join(legend_rows), itype_legend, W, H, markers_defs


def _connector_icon(name):
    icons = {
        'OpenMontage': '🎬', 'Composio': '🔗', 'librosa': '🎵',
        'FFmpeg': '🎞️', 'OpenArt': '🎨', 'Graphify CC': '🌐',
        'Jina AI': '🕸️', 'Last.fm': '📻', 'n8n': '⚙️', 'Whisper (OpenAI, local)': '🎙️',
    }
    return icons.get(name, '●')


def _cid(color):
    """Real, stable per-color id for a <marker> def — Aug 13 (5th pass),
    Alex's own explicit ask: every edge gets a real X mark at its start
    and a real arrowhead at its end, so the diagrams show relationship
    DIRECTION, not just presence of a line. One marker pair per real
    color actually used (never emitted for a color unused in that
    diagram — same "only what's real" discipline as itype_legend's own
    itype_used set)."""
    return color.replace('#', '').lower()


def _build_markers(colors):
    """Real, shared marker defs (arrowhead + X-start) for a given set of
    real colors — called once per file, right before its own </defs>,
    covers every edge that file draws regardless of which script built
    it (galaxy_map.py/galaxy_map_river.py/galaxy_map_module.py all
    import this). Deliberately NOT using CSS context-stroke/context-fill
    (real portability risk — this app targets Android/desktop PWA via
    real Chrome, and while modern Chromium supports it, a fixed-color-
    per-marker approach has zero browser-version risk and costs only a
    few extra <marker> defs)."""
    out = []
    for c in sorted(set(colors)):
        cid = _cid(c)
        out.append(
            f'<marker id="arrow-{cid}" viewBox="0 0 10 10" refX="8.5" refY="5" '
            f'markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
            f'<path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>'
        )
        out.append(
            f'<marker id="xstart-{cid}" viewBox="0 0 10 10" refX="5" refY="5" '
            f'markerWidth="6" markerHeight="6">'
            f'<path d="M1,1 L9,9 M9,1 L1,9" stroke="{c}" stroke-width="2" fill="none"/></marker>'
        )
    return ''.join(out)


def _curved_edge(x1, y1, x2, y2, color, real=True, dashed=False, offset_mult=1, r1=0, r2=0, markers=True):
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy) or 1
    ux, uy = dx / length, dy / length
    # Real geometry fix, same pass: trim each endpoint inward by the
    # real radius of the node it touches, so the X-start/arrow-end
    # markers land AT the node's visible boundary instead of buried
    # under its fill/icon at the node's exact center (a path drawn
    # center-to-center would render both markers invisible). r1/r2
    # default to 0 (no trim) for any caller that hasn't been updated
    # with real radius info yet — never breaks a call site, just skips
    # the trim there.
    tx1, ty1 = x1 + ux * r1, y1 + uy * r1
    tx2, ty2 = x2 - ux * r2, y2 - uy * r2
    mx, my = (tx1 + tx2) / 2, (ty1 + ty2) / 2
    ox, oy = -dy / length * 24 * offset_mult, dx / length * 24 * offset_mult
    cx_, cy_ = mx + ox, my + oy
    dash = ' stroke-dasharray="5,4"' if dashed else ''
    op = '0.85' if real else '0.4'
    mk = f' marker-start="url(#xstart-{_cid(color)})" marker-end="url(#arrow-{_cid(color)})"' if markers else ''
    return (f'<path d="M {tx1} {ty1} Q {cx_} {cy_} {tx2} {ty2}" fill="none" '
            f'stroke="{color}" stroke-width="1.8" opacity="{op}"{dash} filter="url(#edgeglow)"{mk}/>')


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE Total Systems — Galaxy Map (Level 0)</title>
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
  a.drill-link{{cursor:pointer}}
  a.drill-link .central circle{{transition:filter 0.15s}}
  a.drill-link:hover .central circle{{filter:url(#glow) brightness(1.3)}}
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
  .unit-node{{cursor:pointer}}
  .unit-node-label{{cursor:pointer}}
  .unit-node:hover circle{{filter:url(#glow) brightness(1.3)}}
  .units-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;max-width:900px;margin:24px auto 0;padding:0 24px}}
  .unit-card{{background:rgba(255,255,255,0.03);border:2px solid rgba(255,255,255,0.1);border-radius:14px;padding:16px 12px;text-align:center;cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s}}
  .unit-card:hover{{transform:translateY(-3px)}}
  .unit-card.active{{border-color:var(--gold);background:rgba(201,168,76,0.08)}}
  .unit-card.glow{{box-shadow:0 0 0 2px var(--gold), 0 0 14px rgba(201,168,76,0.55)}}
  .unit-node.glow circle{{stroke:var(--gold) !important;stroke-width:4 !important}}
  .unit-icon{{font-size:26px;margin-bottom:6px}}
  .unit-name{{font-size:11.5px;font-weight:700}}
  #panel{{max-width:920px;margin:20px auto 40px;padding:0 24px;display:none}}
  #panel.active{{display:block}}
  .panel-head{{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:14px}}
  .panel-head h2{{font-family:Georgia,serif;font-size:20px;color:#fff}}
  .kind-choice{{display:flex;justify-content:center;gap:16px;margin-bottom:20px}}
  .kind-btn{{flex:1;max-width:320px;padding:18px 20px;border-radius:14px;font-size:13px;font-weight:700;cursor:pointer;border:2px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);color:var(--text);text-align:center;transition:border-color .15s,transform .1s}}
  .kind-btn:hover{{transform:translateY(-2px)}}
  .kind-btn .kb-sub{{display:block;font-size:10.5px;font-weight:400;color:var(--dim);margin-top:6px}}
  .kind-btn.infra.chosen{{background:rgba(155,89,182,0.18);color:#9B59B6;border-color:#9B59B6}}
  .kind-btn.inter.chosen{{background:rgba(74,144,226,0.18);color:#4A90E2;border-color:#4A90E2}}
  .dim-groups{{display:flex;flex-direction:column;gap:10px}}
  .dim-group{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:10px;overflow:hidden}}
  .dim-head{{padding:11px 16px;font-size:12.5px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between}}
  .dim-head:hover{{background:rgba(255,255,255,0.04)}}
  .dim-body{{display:none;padding:0 16px 14px}}
  .dim-body.open{{display:block}}
  .facet-row{{padding:10px 12px;margin-top:8px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:11.5px;line-height:1.6;cursor:pointer;border:1px solid transparent}}
  .facet-row:hover{{border-color:rgba(201,168,76,0.4)}}
  .facet-row .flabel{{font-weight:700;margin-bottom:4px}}
  .ev{{color:var(--dim);display:block;margin-top:4px;font-size:10.5px}}
  .dec-list{{margin:8px 0 0 18px}}
  .dec-list li{{margin-bottom:6px}}
  .facet-link{{display:inline-block;margin-top:6px;font-size:10.5px;font-weight:700;color:var(--gold);text-decoration:none}}
  .facet-link:hover{{text-decoration:underline}}
  /* Real Aug 21 2026 (G67) — reused verbatim from galaxy_map_l0.py's own
     toggle/matrix CSS, "use what we have, dont make new shit." */
  .toggle-row{{display:flex;justify-content:center;gap:8px;padding:16px 24px 0}}
  .toggle-btn{{padding:8px 18px;border-radius:16px;font-size:11.5px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .toggle-btn.active{{background:var(--gold);color:#1a1608;border-color:var(--gold)}}
  .view{{display:none}}
  .view.active{{display:block}}
  .matrix-wrap{{max-width:640px;margin:24px auto;padding:0 24px;overflow-x:auto}}
  #matrix{{border-collapse:collapse;margin:0 auto;font-size:16px}}
  #matrix th,#matrix td{{border:1px solid rgba(255,255,255,0.08);width:40px;height:40px;text-align:center}}
  #matrix th{{font-size:16px}}
  #matrix th.rowhead{{font-size:10px;text-align:left;padding:0 8px;white-space:nowrap;width:auto}}
  #matrix td.diag{{background:rgba(255,255,255,0.02);color:#333}}
  #matrix td.none{{color:#333}}
  #matrix td.hit{{cursor:pointer}}
  #matrix td.hit.inject{{background:rgba(155,89,182,0.1)}}
  #matrix td.hit.actor{{background:rgba(226,84,84,0.08)}}
  #matrix td.hit:hover{{outline:1px solid var(--gold)}}
  .matrix-legend{{display:flex;gap:16px;justify-content:center;font-size:10.5px;margin:14px 0;color:var(--dim)}}
  .table-details{{max-width:700px;margin:0 auto 40px;padding:0 24px}}
  .detail-row{{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:14px 18px;margin-bottom:12px}}
  .detail-row .dhead{{display:flex;align-items:center;justify-content:center;gap:8px;font-size:13.5px;font-weight:700;margin-bottom:12px;flex-wrap:wrap}}
  .detail-row .bubble{{background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.25);border-radius:20px;padding:12px 16px;font-size:12px;line-height:1.6;margin-bottom:12px}}
  .detail-row .evidence{{font-size:10.5px;color:var(--dim);line-height:1.6}}
  .k-badge{{font-size:9px;font-weight:700;padding:2px 8px;border-radius:8px;white-space:nowrap}}
  .k-inject{{background:rgba(155,89,182,0.15);color:#9B59B6;border:1px solid rgba(155,89,182,0.35)}}
  .k-actor{{background:rgba(226,84,84,0.12);color:#E25454;border:1px solid rgba(226,84,84,0.3)}}
</style>
</head>
<body>

<div class="breadcrumb" style="text-align:center;padding:12px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px">
  <span style="color:#0a0a0f;background:#C9A84C;padding:4px 9px;border-radius:12px">🌌 RPGACE Total Systems — Level 0</span>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Level 0</div>
  <h1>🌌 RPGACE Total Systems — The Galaxy Map</h1>
  <p>The real top-level view of RPGACE Total Systems — all 9 real merged L0 units in one place (4 galaxies rendered in the diagram below, 5 more as real bubbles beside it): RPGACE Architecture, Orchestrator CC, OpenMontage CC, Graphify CC, External AI, Skills, Alex, Supabase, Oversight Docs. Oracle mediates all 3 AI providers (never a direct RPGACE→provider edge), self-awareness and a real Human Gate are their own nodes, every real external connector is shown — each edge colored by its own real interaction TYPE. <b>Click any unit — in the diagram or the bubble row below — for a real CHOICE (not a toggle switch) between 💉 Infra (a real attached resource) and 🔗 Inter (a real dimension it participates in)</b>, expanding real detail inline and cross-highlighting every other unit sharing that same resource/dimension. <b>Click the RPGACE Architecture node's own center to drill into its 17 rivers (Level 1).</b></p>
</div>

<div class="toggle-row">
  <div class="toggle-btn active" data-view="map">🌌 Map view</div>
  <div class="toggle-btn" data-view="table">📊 Table view</div>
</div>

<div class="view active" id="view-map">
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
    {markers}
  </defs>
  {edges}
  {nodes}
</svg>
</div>

<div style="text-align:center;font-size:11px;color:var(--dim);max-width:820px;margin:6px auto 0;padding:0 24px">5 more real L0 units — click any for the same real Infra/Inter choice:</div>
<div class="units-grid">{unit_cards}</div>
<div id="panel">
  <div class="panel-head"><span id="panel-icon" style="font-size:24px"></span><h2 id="panel-title"></h2></div>
  <div class="kind-choice" id="kind-choice">
    <div class="kind-btn infra" data-kind="infra">💉 Infra<span class="kb-sub" id="infra-count"></span></div>
    <div class="kind-btn inter" data-kind="inter">🔗 Inter<span class="kb-sub" id="inter-count"></span></div>
  </div>
  <div class="dim-groups" id="dim-groups"></div>
</div>

<div class="legend">
  <h2>Edge legend — what each line actually means</h2>
  <div class="itype-grid">{itype_legend}</div>
</div>

<div class="legend">
  <h2>Galaxies &amp; nodes</h2>
  {legend}
</div>
</div>

<div class="view" id="view-table">
  <div style="text-align:center;font-size:11px;color:var(--dim);max-width:820px;margin:24px auto 0;padding:0 24px">
    Real G67 fold (Aug 21 2026) — the same 17 hand-curated edges galaxy_map_l0.py always held, now this page's own real table view (reused directly, not re-derived). The 9-unit facet model above and this 7-unit table describe the SAME real relationships from two angles: click a cell for the real evidence behind that edge.
  </div>
  <div class="matrix-wrap"><table id="matrix">{matrix_rows}</table></div>
  <div class="matrix-legend"><span>💉 injection tool</span><span>🧑 actor</span><span>· no direct real edge (mediated)</span></div>
  <div class="table-details">{table_details}</div>
  <div style="text-align:center;font-size:10.5px;color:#6a6a78;max-width:820px;margin:20px auto 0;padding:0 24px 20px">
    G68 (the recursive L0↔river/module/function interaction-matrix idea): this IS the L0 layer's own real matrix. The next matrix layer down is <a href="galaxy_map_dimensions.html">the Dimensions Matrix</a> (44 real L2 modules × 5 real dimensions) — genuinely the same recurring shape at a finer grain, not a new page built for this. No new data was invented to answer G68; the matrices already existed, this just names and links the real chain.
  </div>
</div>

<div class="note">
  Generated by <code>scripts/galaxy_map.py</code> — real data reused from
  <code>scripts/graphify_river_group.py</code>'s own <code>EXTERNAL_CONNECTORS</code>/<code>SUPABASE_CORE</code>/
  <code>INTERACTION_TYPE_COLOR</code> (never re-derived). Mapping rules: <code>system_map_spec.md</code>.
  G2 of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan — G3
  (<a href="galaxy_map_river.html">river drill-down, click the central node above</a>)
  and G4 (<a href="galaxy_map_module.html">module drill-down</a>) are both real and live.
  Real Aug 21 2026 fusion (Alex's own direct ask — "the l0 7 units should exist
  in the bubbles in on rpgace total systems own architecture map"): the 7-unit
  model from galaxy_map_l0.py is merged in here directly — 4 units render in
  the diagram above (now real, clickable triggers, not just decoration), 5
  more render as the bubble row below it. All 9 share one real Infra/Inter
  facet mechanic. Real G67 fold, same day: galaxy_map_l0.py's own leftover
  17-edge table is now this page's real Table view (imported directly, not
  rebuilt) — graphify-out/galaxy_map_l0.html no longer exists as its own page.
</div>

<script>
(function() {{
  // Real Alex correction: Infra/Inter is a CHOICE presented fresh each
  // time a unit is selected (neither pre-picked), not a toggle you
  // flip back and forth — that metaphor stays reserved for the real
  // map/table view control (this page's own toggle-row, plus
  // galaxy_map_hub.html) which is a genuinely separate mechanic.
  var DATA = {data_json};
  var cards = document.querySelectorAll('.unit-card, .unit-node, .unit-node-label');
  var panel = document.getElementById('panel');
  var panelTitle = document.getElementById('panel-title');
  var panelIcon = document.getElementById('panel-icon');
  var kindBtns = document.querySelectorAll('.kind-btn');
  var infraCount = document.getElementById('infra-count');
  var interCount = document.getElementById('inter-count');
  var dimGroups = document.getElementById('dim-groups');
  var currentUnit = null, currentKind = null;

  function clearGlow() {{
    document.querySelectorAll('.unit-card, .unit-node').forEach(function(c) {{ c.classList.remove('glow'); }});
  }}
  function setGlow(uid) {{
    document.querySelectorAll('[data-unit="' + uid + '"]').forEach(function(el) {{
      var target = el.classList.contains('unit-node-label') ? el.previousElementSibling : el;
      (target || el).classList.add('glow');
    }});
  }}

  function renderDims() {{
    if (!currentKind) {{ dimGroups.innerHTML = ''; return; }}
    var unit = DATA.units[currentUnit];
    var facets = unit.facets.filter(function(f) {{ return f.kind === currentKind; }});
    var byDim = {{}};
    facets.forEach(function(f) {{ (byDim[f.dim] = byDim[f.dim] || []).push(f); }});
    var html = '';
    Object.keys(byDim).forEach(function(dim, i) {{
      html += '<div class="dim-group"><div class="dim-head" data-idx="' + i + '">' + dim + ' <span>(' + byDim[dim].length + ')</span></div><div class="dim-body" id="dimbody-' + i + '">';
      byDim[dim].forEach(function(f) {{
        html += '<div class="facet-row" data-share="' + f.share_key + '"><div class="flabel">' + f.label + '</div><div>' + f.detail + '</div>' + (f.link ? '<a class="facet-link" href="' + f.link + '" target="_blank">Open full page ↗</a>' : '') + '</div>';
      }});
      html += '</div></div>';
    }});
    if (!html) html = '<div style="color:var(--dim);font-size:11.5px;padding:10px">No real ' + currentKind + ' facets attached to this unit yet.</div>';
    dimGroups.innerHTML = html;
    dimGroups.querySelectorAll('.dim-head').forEach(function(h) {{
      h.addEventListener('click', function() {{
        document.getElementById('dimbody-' + h.dataset.idx).classList.toggle('open');
      }});
    }});
    dimGroups.querySelectorAll('.facet-row').forEach(function(row) {{
      row.addEventListener('click', function(ev) {{
        ev.stopPropagation();
        clearGlow();
        var key = row.dataset.share;
        setGlow(currentUnit);
        Object.keys(DATA.units).forEach(function(uid) {{
          if (uid === currentUnit) return;
          var has = DATA.units[uid].facets.some(function(f) {{ return f.share_key === key; }});
          if (has) setGlow(uid);
        }});
      }});
    }});
  }}

  cards.forEach(function(c) {{
    c.addEventListener('click', function() {{
      var uid = c.dataset.unit;
      if (!uid || !DATA.units[uid]) return;
      currentUnit = uid;
      currentKind = null;
      kindBtns.forEach(function(x) {{ x.classList.remove('chosen'); }});
      document.querySelectorAll('.unit-card').forEach(function(x) {{ x.classList.toggle('active', x.dataset.unit === uid); }});
      var unit = DATA.units[currentUnit];
      var nInfra = unit.facets.filter(function(f) {{ return f.kind === 'infra'; }}).length;
      var nInter = unit.facets.filter(function(f) {{ return f.kind === 'inter'; }}).length;
      infraCount.textContent = ' (' + nInfra + ')';
      interCount.textContent = ' (' + nInter + ')';
      panel.classList.add('active');
      panelTitle.textContent = unit.label;
      panelIcon.textContent = unit.icon;
      clearGlow();
      renderDims();
      panel.scrollIntoView({{behavior:'smooth', block:'start'}});
    }});
  }});
  kindBtns.forEach(function(b) {{
    b.addEventListener('click', function() {{
      currentKind = b.dataset.kind;
      kindBtns.forEach(function(x) {{ x.classList.toggle('chosen', x === b); }});
      clearGlow();
      renderDims();
    }});
  }});

  // Real G67 fold (Aug 21 2026) — map/table toggle, reused verbatim from
  // galaxy_map_l0.py's own toggle mechanic ("use what we have").
  var mtToggles = document.querySelectorAll('.toggle-btn');
  var mtViews = document.querySelectorAll('.view');
  mtToggles.forEach(function(t) {{
    t.addEventListener('click', function() {{
      mtToggles.forEach(function(x) {{ x.classList.toggle('active', x === t); }});
      mtViews.forEach(function(v) {{ v.classList.toggle('active', v.id === 'view-' + t.dataset.view); }});
    }});
  }});
  document.querySelectorAll('td.hit').forEach(function(td) {{
    td.addEventListener('click', function() {{
      var id = td.dataset.edge;
      document.querySelectorAll('#view-table .detail-row').forEach(function(d) {{ d.style.display = 'none'; }});
      var el = document.getElementById('tdrop-' + id);
      if (el) {{ el.style.display = ''; el.scrollIntoView({{behavior:'smooth', block:'nearest'}}); }}
    }});
  }});
}})();
</script>
</body>
</html>
"""


def main():
    import json
    nodes, edges, legend, itype_legend, W, H, markers = build_svg()
    facets = build_facets()
    unit_cards = ''.join(
        f'<div class="unit-card" data-unit="{uid}"><div class="unit-icon">{UNIT_META[uid]["icon"]}</div><div class="unit-name">{esc(UNIT_META[uid]["label"])}</div></div>'
        for uid in NEW_BUBBLE_UNITS
    )
    data = {
        'units': {
            uid: {'label': UNIT_META[uid]['label'], 'icon': UNIT_META[uid]['icon'], 'facets': facets[uid]}
            for uid in UNIT_ORDER
        }
    }
    matrix_rows = l0_build_matrix()
    table_details = l0_build_table_details()
    html = TEMPLATE.format(nodes=nodes, edges=edges, legend=legend, itype_legend=itype_legend, W=W, H=H,
                           markers=markers, unit_cards=unit_cards, data_json=json.dumps(data),
                           matrix_rows=matrix_rows, table_details=table_details)
    OUT.parent.mkdir(exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    skipped = len(ORACLE_PROVIDER_NAMES) + 3  # +3 = Graphify CC (dup of the real galaxy) + FFmpeg + OpenMontage (both moved to OpenMontage CC's own local cluster)
    n_facets = sum(len(v) for v in facets.values())
    print(f"Wrote {OUT} — {len(GALAXIES)} galaxies, {len(HARNESS_NODES)} harness nodes, "
          f"{len(ORACLE_PROVIDERS)} AI providers under Oracle, "
          f"{len(EXTERNAL_CONNECTORS) - skipped} flat connectors + OpenMontage+FFmpeg (under OpenMontage CC) + Supabase, "
          f"{len(UNIT_ORDER)} real merged L0 units ({n_facets} real facets, infra+inter).")


if __name__ == '__main__':
    main()
