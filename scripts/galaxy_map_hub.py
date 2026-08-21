#!/usr/bin/env python3
"""
galaxy_map_hub.py — G59 of the Galaxy Map Unified Gateway plan (real
/interrogation, Aug 21 2026 — Alex: "I want all galaxy html maps to be
all combined into one central html with all needed files having
gateways to each other, and the top list to be restructured to show
how one flows into another... map/table view being toggleable...
sort by level objects shown and rivers/dimensions they belong to.
some dimensions are inter or infra. infra should live in needed
bubble, whilst infra must live in an edge or a selection for edges if
one infra has multiple inter edges").

Real /interrogation (4 forks, AskUserQuestion, all recommended options
confirmed) resolved BEFORE any code was written — full verbatim spec:
records/2026-08/galaxy_map_unified_gateway_spec_2026-08-21.txt.

WHAT THIS IS: a single new shell HTML — the one central "gateway" all
23 real, already-existing galaxy_map_*.html pages become reachable
from. It does NOT concatenate their content (that would balloon
initial page weight and directly repeat the ~12,000ms boot-lag
regression already logged to error_log this same session) — each
page's real content loads into a shared iframe pane on click, so the
21 existing files stay exactly as they are, untouched, on disk.

REAL DATA, NOT INVENTED:
- PAGES below is a real, hand-curated inventory of the 23 actual
  files in graphify-out/galaxy_map_*.html (verified against `ls` at
  build time — the build fails loud if a real file goes missing or a
  new one appears uncatalogued, same "fail loud not open" discipline
  as R19).
- EDGES are computed FRESH at build time by reading every real page's
  own actual <a href="..."> targets pointing at another galaxy_map_*
  file — never hand-typed, so this never goes stale the way a
  hardcoded list would (R18's own lesson). `galaxy_map.html` is
  excluded as an edge TARGET only, since virtually every page links
  back to it as a "home" breadcrumb — that's chrome, not a real flow
  relationship, and counting it would make every single page look
  like it "flows into" L0.
- ENTRY/ORPHAN badges are computed from real in-degree over that same
  edge set, not guessed. A real, honest limitation stated plainly
  (not force-fit): because pages cross-link each other for reference
  as well as for drill-down, real out-degree is never zero across
  this 23-page set — a page-grain 🏁 terminal claim would be false, so
  this script does NOT invent one. The 🚪/🏁 convention stays real and
  accurate at the FUNCTION grain (Level 3/6, Decisions, Zoom) where it
  was originally built; at the PAGE grain here it's honestly scoped
  down to 🚪 (the one true root, galaxy_map.html) and 🧭 (a real,
  useful finding: a page with zero real inbound links from any OTHER
  page in the set — reachable only via this hub/the Oversight popup,
  not from within the page-web itself).

INTER vs INFRA (fork 3, confirmed reading): "inter" dimensions are
real CONNECTION/flow relationships between two different things —
they render as edges (river-flow, hook signals, skill-to-skill
invocation, dashboard-card→module chains, dispatch history). "infra"
dimensions are real ATTACHED-RESOURCE relationships one thing carries
(Supabase touch, Oracle/external-connector touch, a decision/logic
attribute, a load trigger) — Alex's own confirmed examples for infra
were literally "Supabase touch, Oracle call, external-connector
touch." Per his own rule, an infra classification here is informative
labeling for THIS shell only — the deeper retrofit (converting a
genuinely-shared infra bubble into a real per-edge selector INSIDE
each of the 21 existing pages' own rendering) is G60, deliberately
NOT built this pass (phased build, fork 4).
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

OUT_DIR = Path('graphify-out')
OUT = OUT_DIR / 'galaxy_map_hub.html'


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


# Real inventory — one row per real file in graphify-out/galaxy_map_*.html
# (23 files, verified against `ls` in main() below; the build raises if
# this list and the real directory listing ever disagree — R18/R19/R20's
# own "don't let a hand-maintained list silently drift from reality" lesson).
#
# level: the real spatial drill-down position (L0/L1/L2/L2.5/Current(L3)/
#   Zoom(L4)/L5/L6), or 'Dimension' for a cross-cutting page that isn't
#   itself a rung of that ladder.
# kind: core (IS a rung of the L0-L6 spatial ladder, including retired/
#   superseded rungs kept for reference) / inter (a connection-type
#   dimension — renders as edges) / infra (a resource-attachment-type
#   dimension — renders as a node bubble) / meta (an analysis page
#   synthesizing several other dimensions at once, neither itself).
PAGES = [
    {'file': 'galaxy_map.html', 'label': 'Level 0 — RPGACE Architecture (4 Galaxies)',
     'level': 'L0', 'kind': 'core', 'scope': 'Total Systems: RPGACE / Orchestrator CC / OpenMontage CC / Graphify CC',
     'desc': 'The original real Level 0 — Total Systems as 4 galaxies, Oracle + self-awareness as their own nodes, styled per the Assassin\'s Creed Valhalla reference.'},
    {'file': 'galaxy_map_l0.html', 'label': 'L0 — 7 Peer Units', 'level': 'L0', 'kind': 'core',
     'scope': 'External AI / RPGACE Architecture / Skills / Orchestrator CC / Alex / Supabase / Oversight Docs',
     'desc': 'G43 redefinition (Aug 18) — no privileged gateway unit. Real 🗺️/📊 toggle over the same 17 hand-curated dimension-edges.'},
    {'file': 'galaxy_map_river.html', 'label': 'Level 1 — Rivers', 'level': 'L1', 'kind': 'core',
     'scope': 'All 17 rivers', 'desc': 'G3 — RPGACE Architecture\'s own 17 rivers, radial, cross-linked by real RIVER_FLOWS data.'},
    {'file': 'galaxy_map_module.html', 'label': 'Level 2 — Modules, Flow, Externals & Skills', 'level': 'L2', 'kind': 'core',
     'scope': 'All 17 rivers\' real modules', 'desc': 'G4+G5 — real left-to-right module flow per river, terminal badges, dashboard/external/skill tributaries.'},
    {'file': 'galaxy_map_level2_5.html', 'label': 'Level 2.5 — UI/Alex Accessibility', 'level': 'L2.5', 'kind': 'inter',
     'scope': '10 rivers with a real dashboard card', 'desc': 'G38 — real successor to Meanders: river → dashboard card → primary module chain.'},
    {'file': 'galaxy_map_meanders.html', 'label': 'Level 1.5 — Meanders (superseded)', 'level': 'L1.5', 'kind': 'core',
     'scope': 'River V only, pre-Aug-20 split', 'desc': 'Retired Aug 20 in favor of Level 2.5 — kept on disk for reference, no longer the live drill-down path.'},
    {'file': 'galaxy_map_current.html', 'label': 'Current Series (replaces old Level 3)', 'level': 'Current (L3)', 'kind': 'core',
     'scope': 'All 45 modules, 436 functions', 'desc': 'G47 — real per-function input/handling/output/next detail, the live replacement for the old call-chain graph.'},
    {'file': 'galaxy_map_level3.html', 'label': 'Level 3 — Function Chains (superseded)', 'level': 'L3', 'kind': 'core',
     'scope': 'All 45 modules', 'desc': 'Old call-chain graph — superseded by Current Series, kept as detailed secondary reference (rule 8).'},
    {'file': 'galaxy_map_zoom.html', 'label': 'Zoomed Current Walkthrough (repurposed Level 4)', 'level': 'Zoom (L4)', 'kind': 'core',
     'scope': '436 real zoomed cards', 'desc': 'G47 continuation — walks one Current at a time to its real next call, until a genuine terminal or module boundary.'},
    {'file': 'galaxy_map_level4.html', 'label': 'Level 4 — Frontend Flow (superseded)', 'level': 'L4', 'kind': 'inter',
     'scope': '12 real dashboard cards', 'desc': 'Old dashboard-card click-flow graph — role retired (G48), kept as detailed per-card reference.'},
    {'file': 'galaxy_map_level5.html', 'label': 'Level 5 — Logic', 'level': 'L5', 'kind': 'infra',
     'scope': '7 curated decision points', 'desc': 'G17 — curated core-logic decision points, each with a verbatim rpgace_core.js excerpt checked at build time.'},
    {'file': 'galaxy_map_level6.html', 'label': 'Level 6 — Detailed Decision', 'level': 'L6', 'kind': 'infra',
     'scope': '1089 branch points, 45 modules', 'desc': 'G18 — exhaustive, mechanical if/else-if/else/switch branch extraction, listed not narrated.'},
    {'file': 'galaxy_map_logic_dimension.html', 'label': 'Logic Dimension', 'level': 'Dimension', 'kind': 'inter',
     'scope': '96 edges across 17 rivers', 'desc': 'Level 5\'s real companion — every river-to-river connection, external connector, and skill stream as a clickable passage.'},
    {'file': 'galaxy_map_decisions.html', 'label': 'Decisions — Website Perspective', 'level': 'Dimension', 'kind': 'infra',
     'scope': '10 human-confirm gates, RPGACE app code only', 'desc': 'G26 Phase 1 — destructive-delete/taxonomy/pipeline confirm gates, grouped by decision type.'},
    {'file': 'galaxy_map_supabase.html', 'label': 'Supabase', 'level': 'Dimension', 'kind': 'infra',
     'scope': '25 tables, 113 of 502 functions', 'desc': 'G45 — every real client-side Supabase table touch, by Level/River/Module.'},
    {'file': 'galaxy_map_externals.html', 'label': 'Externals — UI + Backend Dimension', 'level': 'Dimension', 'kind': 'infra',
     'scope': '13 real external connectors', 'desc': 'G27 — whether each connector genuinely touches real UI AND real backend processing.'},
    {'file': 'galaxy_map_skills.html', 'label': 'Skills — AI/UI/Backend Dimension', 'level': 'Dimension', 'kind': 'infra',
     'scope': '24 real RPGACE-authored skills', 'desc': 'G28 — whether each skill reaches external AI, touches real UI, or touches real backend.'},
    {'file': 'galaxy_map_skill_network.html', 'label': 'Skill Composition Network', 'level': 'Dimension', 'kind': 'inter',
     'scope': '117 real skill-to-skill edges', 'desc': 'Real /skillName invocation edges between RPGACE-authored skills.'},
    {'file': 'galaxy_map_orchestrator_openmontage.html', 'label': 'Orchestrator ↔ OpenMontage', 'level': 'Dimension', 'kind': 'inter',
     'scope': '8 real dispatch rows', 'desc': 'G29 — real async dispatch history between Orchestrator CC and OpenMontage CC via openmontage_jobs.'},
    {'file': 'galaxy_map_oversight_sync.html', 'label': 'Oversight Sync Dimension', 'level': 'Dimension', 'kind': 'inter',
     'scope': '18 trigger rows, 4 ritual sequences', 'desc': 'G55 — real process-TIME oversight-doc sequencing: what gets touched, in what order, during a push/build/ritual.'},
    {'file': 'galaxy_map_dimensions.html', 'label': 'Dimensions Matrix', 'level': 'Dimension', 'kind': 'meta',
     'scope': '45 modules × 5 shipped dimensions', 'desc': 'G30 — real multi-home overlap analysis across every other dimension page shipped so far.'},
    {'file': 'galaxy_map_alex_path.html', 'label': "Alex's Decision Path", 'level': 'Dimension', 'kind': 'inter',
     'scope': '12 real dashboard cards', 'desc': 'G37 — real Level-4 flow to target module(s), then the real Y/N fork Alex actually hits, if any.'},
    {'file': 'galaxy_map_load.html', 'label': 'Load Dimension', 'level': 'Dimension', 'kind': 'infra',
     'scope': '27 boot tasks, 29 nav triggers, 5 click triggers', 'desc': 'G39 — 3 real, separately-tracked load-trigger categories: boot sequence, page-nav, on-demand click.'},
]

LEVEL_ORDER = ['L0', 'L1', 'L2', 'L2.5', 'L1.5', 'Current (L3)', 'L3', 'Zoom (L4)', 'L4', 'L5', 'L6', 'Dimension']

KIND_META = {
    'core': {'icon': '🌌', 'label': 'Core (spatial ladder)', 'color': '#C9A84C'},
    'inter': {'icon': '🔗', 'label': 'Inter (connection/flow)', 'color': '#4A90E2'},
    'infra': {'icon': '💉', 'label': 'Infra (attached resource)', 'color': '#9B59B6'},
    'meta': {'icon': '🧭', 'label': 'Meta (cross-dimension analysis)', 'color': '#8a8a9a'},
}


def compute_real_edges(out_dir):
    """Reads every real page's own actual href targets — never hand-typed.
    Excludes galaxy_map.html as a TARGET only (universal home breadcrumb,
    not a real flow relationship — see module docstring)."""
    files = [p['file'] for p in PAGES]
    fileset = set(files)
    edges = []
    for f in files:
        path = out_dir / f
        if not path.exists():
            continue
        s = path.read_text(encoding='utf-8', errors='ignore')
        targets = set(re.findall(r'href=["\']([a-zA-Z0-9_]+\.html)["\']', s))
        for t in sorted(targets):
            if t in fileset and t != f and t != 'galaxy_map.html':
                edges.append((f, t))
    return sorted(set(edges))


def build_table_view(pages_by_level, indeg, outgoing):
    sections = []
    for level in LEVEL_ORDER:
        rows = pages_by_level.get(level)
        if not rows:
            continue
        row_html = []
        for p in rows:
            km = KIND_META[p['kind']]
            targets = outgoing.get(p['file'], [])
            flow_txt = ', '.join(next(x['label'] for x in PAGES if x['file'] == t) for t in targets) if targets else '<span class="none">no further real link within this page set</span>'
            badge_html = ''
            if p['file'] == 'galaxy_map.html':
                badge_html += '<span class="pg-badge entry" title="The one real root — every other page leads back here as home">🚪 root</span>'
            elif indeg.get(p['file'], 0) == 0:
                badge_html += '<span class="pg-badge orphan" title="No other Galaxy Map page links here yet — reached only via this hub or the Oversight popup">🧭 hub-only</span>'
            row_html.append(f'''
<div class="pg-row" data-file="{p['file']}">
  <div class="pg-head">
    <span class="kind-dot" style="background:{km['color']}" title="{esc(km['label'])}"></span>
    <span class="pg-title">{esc(p['label'])}</span>
    {badge_html}
  </div>
  <div class="pg-scope">{esc(p['scope'])}</div>
  <div class="pg-desc">{esc(p['desc'])}</div>
  <div class="pg-flow"><span class="flow-label">→ flows into:</span> {flow_txt}</div>
</div>''')
        sections.append(f'''
<div class="level-section">
  <div class="level-head">{esc(level)} <span class="level-count">({len(rows)})</span></div>
  <div class="level-rows">{''.join(row_html)}</div>
</div>''')
    return ''.join(sections)


def build_map_view(edges, indeg):
    # Column layout: one column per real level in LEVEL_ORDER order, pages
    # stacked vertically within their column. Positions computed here, not
    # hand-placed — same discipline as every prior galaxy_map_*.py script.
    col_w = 260
    row_h = 74
    pad_top = 40
    col_x = {}
    x = 40
    for level in LEVEL_ORDER:
        if any(p['level'] == level for p in PAGES):
            col_x[level] = x
            x += col_w
    width = x + 40
    pos = {}
    max_rows = 1
    for level in LEVEL_ORDER:
        rows = [p for p in PAGES if p['level'] == level]
        max_rows = max(max_rows, len(rows))
        for i, p in enumerate(rows):
            pos[p['file']] = (col_x[level] + col_w / 2, pad_top + i * row_h + 30)
    height = pad_top + max_rows * row_h + 60

    col_labels = ''.join(
        f'<text x="{col_x[lvl] + col_w/2}" y="20" class="col-label" text-anchor="middle">{esc(lvl)}</text>'
        for lvl in LEVEL_ORDER if lvl in col_x
    )

    lines = []
    for a, b in edges:
        ax, ay = pos[a]
        bx, by = pos[b]
        lines.append(f'<line x1="{ax}" y1="{ay}" x2="{bx}" y2="{by}" class="flow-edge" marker-end="url(#arrow)"/>')

    nodes = []
    for p in PAGES:
        cx, cy = pos[p['file']]
        km = KIND_META[p['kind']]
        badge = '🚪' if p['file'] == 'galaxy_map.html' else ('🧭' if indeg.get(p['file'], 0) == 0 else '')
        nodes.append(f'''
<g class="map-node" data-file="{p['file']}" transform="translate({cx},{cy})">
  <rect x="-95" y="-24" width="190" height="48" rx="10" style="fill:{km['color']}22;stroke:{km['color']}" />
  <text x="0" y="-4" class="node-title" text-anchor="middle">{badge} {esc(p['label'][:26])}</text>
  <text x="0" y="14" class="node-kind" text-anchor="middle">{km['icon']} {esc(p['kind'])}</text>
</g>''')

    return f'''<svg viewBox="0 0 {width} {height}" width="100%" style="min-width:{width}px">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#8a8a9a"/></marker>
  </defs>
  {col_labels}
  {''.join(lines)}
  {''.join(nodes)}
</svg>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Unified Gateway)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --purple:#9B59B6; --blue:#4A90E2; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 20%, #14101e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:30px 24px 14px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:900px;margin:0 auto;line-height:1.6}}
  .legend-row{{display:flex;justify-content:center;gap:16px;flex-wrap:wrap;padding:10px 16px;font-size:10.5px;color:var(--dim)}}
  .legend-row .dot{{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:middle}}
  .toggle-row{{display:flex;justify-content:center;gap:8px;padding:16px 24px 0}}
  .toggle-btn{{padding:8px 18px;border-radius:16px;font-size:11.5px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .toggle-btn.active{{background:var(--gold);color:#1a1608;border-color:var(--gold)}}
  .view{{display:none}}
  .view.active{{display:block}}
  .level-section{{max-width:1000px;margin:18px auto;padding:0 24px}}
  .level-head{{font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin-bottom:10px;border-bottom:1px solid rgba(201,168,76,0.25);padding-bottom:4px}}
  .level-count{{color:var(--dim);font-weight:400}}
  .level-rows{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}}
  .pg-row{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px 14px;cursor:pointer;transition:border-color .15s}}
  .pg-row:hover{{border-color:var(--gold)}}
  .pg-head{{display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap}}
  .kind-dot{{width:9px;height:9px;border-radius:50%;flex-shrink:0}}
  .pg-title{{font-size:12px;font-weight:700}}
  .pg-badge{{font-size:9px;font-weight:700;padding:1px 6px;border-radius:8px}}
  .pg-badge.entry{{background:rgba(201,168,76,0.15);color:var(--gold);border:1px solid rgba(201,168,76,0.4)}}
  .pg-badge.orphan{{background:rgba(74,144,226,0.12);color:var(--blue);border:1px solid rgba(74,144,226,0.35)}}
  .pg-scope{{font-size:10px;color:var(--dim);margin-bottom:6px}}
  .pg-desc{{font-size:11px;line-height:1.5;color:#c8c8d4;margin-bottom:6px}}
  .pg-flow{{font-size:10px;color:var(--dim)}}
  .flow-label{{color:var(--gold);font-weight:700}}
  .none{{color:#555}}
  #view-map{{padding:10px 24px 30px;overflow-x:auto}}
  .col-label{{fill:var(--dim);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px}}
  .flow-edge{{stroke:#8a8a9a55;stroke-width:1.4}}
  .map-node{{cursor:pointer}}
  .map-node:hover rect{{stroke-width:2}}
  .node-title{{fill:#E2E2EC;font-size:9.5px;font-weight:700}}
  .node-kind{{fill:#8a8a9a;font-size:8.5px}}
  #pane-wrap{{max-width:1100px;margin:20px auto 40px;padding:0 24px}}
  #pane-head{{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}}
  #pane-title{{font-size:13px;font-weight:700;color:var(--gold)}}
  #pane-open{{font-size:10.5px;color:var(--dim);text-decoration:none}}
  #pane-open:hover{{text-decoration:underline}}
  #content-frame{{width:100%;height:0;border:1px solid rgba(255,255,255,0.15);border-radius:10px;background:#0a0a0f;transition:height .2s}}
  #content-frame.loaded{{height:80vh}}
  #pane-placeholder{{border:1px dashed rgba(255,255,255,0.15);border-radius:10px;padding:30px;text-align:center;color:var(--dim);font-size:12px}}
  .note{{max-width:900px;margin:10px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  a{{color:var(--gold)}}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Unified Gateway (G59)</div>
  <h1>🌌 One Central Door, {n_pages} Real Pages, {n_edges} Real Gateways</h1>
  <p>Every real Galaxy Map page, reachable from one shell — grouped by real Level and real river/dimension, annotated with the real "→ flows into" links each page already carries. The 21 existing pages are untouched; clicking a row or node loads that page's real content below, so this stays light on first paint (real evidence: the ~12,000ms boot-lag already logged this session made a single monolithic file a real regression risk, not a hypothetical one — see the spec).</p>
</div>
<div class="legend-row">
  <span><span class="dot" style="background:{c_core}"></span>🌌 core (spatial ladder)</span>
  <span><span class="dot" style="background:{c_inter}"></span>🔗 inter (connection/flow — renders as an edge)</span>
  <span><span class="dot" style="background:{c_infra}"></span>💉 infra (attached resource — renders as a node bubble)</span>
  <span><span class="dot" style="background:{c_meta}"></span>🧭 meta (cross-dimension analysis)</span>
  <span>🚪 root · 🧭 hub-only (no other page links here yet)</span>
</div>
<div class="toggle-row">
  <div class="toggle-btn active" data-view="table">📊 Table view</div>
  <div class="toggle-btn" data-view="map">🌌 Map view</div>
</div>
<div class="view active" id="view-table">
  {table_html}
</div>
<div class="view" id="view-map">
  {map_html}
</div>
<div id="pane-wrap">
  <div id="pane-head">
    <div id="pane-title">Click a page above to load it here</div>
    <a id="pane-open" href="#" target="_blank" style="display:none">Open in new tab ↗</a>
  </div>
  <div id="pane-placeholder">Nothing loaded yet — the shell keeps first paint light by only fetching a page's real content once you actually ask for it.</div>
  <iframe id="content-frame"></iframe>
</div>
<div class="note">
  Generated by <code>scripts/galaxy_map_hub.py</code> (G59, real /interrogation Aug 21 2026 — 4 forks, all recommended options confirmed, full record in <code>records/2026-08/galaxy_map_unified_gateway_spec_2026-08-21.txt</code>). {n_edges} real edges computed fresh at build time from every page's own actual cross-references (galaxy_map.html excluded as a target — it's a universal home breadcrumb, not a real flow relationship). Honest limitation: a page-grain 🏁 terminal badge is NOT shown here — real out-degree never hits zero across this 23-page set (pages cross-link for reference as well as drill-down), so a terminal claim would be false; the 🚪/🏁 convention stays accurate at the function grain (Level 3/6/Decisions/Zoom) where it was built. The deeper infra/inter retrofit — converting a genuinely-shared infra bubble into a real per-edge selector INSIDE each of these 21 pages' own rendering — is G60, logged and deliberately not built this pass (phased build, per Alex's own confirmed choice).
</div>
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
  var frame = document.getElementById('content-frame');
  var title = document.getElementById('pane-title');
  var openLink = document.getElementById('pane-open');
  var placeholder = document.getElementById('pane-placeholder');
  function load(file, label) {{
    frame.src = file;
    frame.classList.add('loaded');
    placeholder.style.display = 'none';
    title.textContent = label;
    openLink.href = file;
    openLink.style.display = '';
    document.querySelectorAll('.pg-row').forEach(function(r) {{ r.style.outline = (r.dataset.file === file) ? '1px solid #C9A84C' : ''; }});
    document.getElementById('pane-wrap').scrollIntoView({{behavior:'smooth', block:'start'}});
  }}
  document.querySelectorAll('.pg-row').forEach(function(row) {{
    row.addEventListener('click', function() {{ load(row.dataset.file, row.querySelector('.pg-title').textContent); }});
  }});
  document.querySelectorAll('.map-node').forEach(function(node) {{
    node.addEventListener('click', function() {{ load(node.dataset.file, node.querySelector('.node-title').textContent); }});
  }});
}})();
</script>
</body>
</html>
"""


def main():
    real_files = sorted(f.name for f in OUT_DIR.glob('galaxy_map_*.html') if f.name != OUT.name) + (['galaxy_map.html'] if (OUT_DIR / 'galaxy_map.html').exists() else [])
    real_files = sorted(set(real_files))
    catalogued = sorted(p['file'] for p in PAGES)
    missing = set(real_files) - set(catalogued)
    stale = set(catalogued) - set(real_files)
    if missing:
        raise SystemExit(f'FAIL LOUD (R18/R19/R20 discipline): real files not catalogued in PAGES: {sorted(missing)}')
    if stale:
        raise SystemExit(f'FAIL LOUD: PAGES lists a file that no longer exists on disk: {sorted(stale)}')

    edges = compute_real_edges(OUT_DIR)
    indeg = {}
    outgoing = {}
    for a, b in edges:
        outgoing.setdefault(a, []).append(b)
        indeg[b] = indeg.get(b, 0) + 1

    pages_by_level = {}
    for p in PAGES:
        pages_by_level.setdefault(p['level'], []).append(p)

    table_html = build_table_view(pages_by_level, indeg, outgoing)
    map_html = build_map_view(edges, indeg)

    html = TEMPLATE.format(
        n_pages=len(PAGES), n_edges=len(edges),
        c_core=KIND_META['core']['color'], c_inter=KIND_META['inter']['color'],
        c_infra=KIND_META['infra']['color'], c_meta=KIND_META['meta']['color'],
        table_html=table_html, map_html=map_html,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(PAGES)} real pages catalogued, {len(edges)} real edges computed, "
          f"{sum(1 for p in PAGES if indeg.get(p['file'], 0) == 0 and p['file'] != 'galaxy_map.html')} hub-only orphans found.")


if __name__ == '__main__':
    main()
