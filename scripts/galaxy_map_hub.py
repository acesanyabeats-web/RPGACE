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
import sys as _sys_rail
from pathlib import Path as _Path_rail
_sys_rail.path.insert(0, str(_Path_rail(__file__).parent))
from graphify_river_group import (  # noqa: E402
    inject_level_rail, LEVEL_RAIL, DIMENSION_PAGES, RIVER_NAME,
)

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
    {'file': 'galaxy_map.html', 'label': 'Level 0 — RPGACE Total Systems (current, start here)',
     'level': 'L0', 'kind': 'core', 'scope': 'All 9 real merged units: RPGACE Architecture / Orchestrator CC / OpenMontage CC / Graphify CC / External AI / Skills / Alex / Supabase / Oversight Docs',
     'desc': 'Real Aug 21 2026 fusion, second correction same day — Alex\'s own direct ask: "the l0 7 units should exist in the bubbles in on rpgace total systems own architecture map." The 7-unit model is now merged directly into THIS page (not a separate file) — 4 units render in the real SVG diagram, 5 more as a real bubble row beside it, all 9 sharing one Infra/Inter facet picker. THE current real Level 0, and RPGACE Total Systems\' own canonical architecture map. G67 fold (same day, later): this page also gained a real map/table toggle — table view is galaxy_map_l0.py\'s own leftover 17-edge matrix, imported directly, not rebuilt. galaxy_map_l0.html no longer exists as its own page.'},
    {'file': 'galaxy_map_river.html', 'label': 'Level 1 — Rivers', 'level': 'L1', 'kind': 'core',
     'scope': 'All 17 rivers', 'desc': 'G3 — RPGACE Architecture\'s own 17 rivers, radial, cross-linked by real RIVER_FLOWS data.'},
    {'file': 'galaxy_map_module.html', 'label': 'Level 2 — Modules, Flow, Externals & Skills (+ Level 2.5 table view)', 'level': 'L2', 'kind': 'core',
     'scope': 'All 17 rivers\' real modules', 'desc': 'G4+G5 — real left-to-right module flow per river, terminal badges, dashboard/external/skill tributaries. G-fold (Aug 21 2026, Alex: "2.5 is a table view of 2"): each river section gained a real map/table toggle — table view is galaxy_map_level2_5.py\'s own river→card→module content, imported directly. galaxy_map_level2_5.html no longer exists as its own page.'},
    {'file': 'galaxy_map_current.html', 'label': 'Current Series (map+table, function-level)', 'level': 'Current (L3)', 'kind': 'core',
     'scope': 'All 50 modules, 532 Currents', 'desc': 'G47, folded with the old Level 3 Aug 21 2026 (G65) — real per-function input/handling/output/next detail (table view) AND the real per-module call-chain diagram (map view), same real data, one page. galaxy_map_level3.html is gone, not superseded — its content lives here now. (Real count corrected Sep 1 2026, G110-G113 pass — verified directly against the live generated page: 50 real distinct module sections, matching the count galaxy_map_dimensions.py/G30 already used.)'},
    {'file': 'galaxy_map_level6.html', 'label': 'Branch Ledger', 'level': 'L6', 'kind': 'infra',
     'scope': '1173 branch points, 44 modules', 'desc': 'G18 — exhaustive, mechanical if/else-if/else/switch branch extraction, listed not narrated. (Real count corrected Sep 1 2026, G110-G113 pass — 1173 branch-row entries verified directly against the live generated page. 44 vs Current\'s 50 modules is a genuine grain difference, not yet root-caused — some modules apparently contribute zero real branch points and are absent from this ledger; flagged for a future pass, not investigated here.)'},
    {'file': 'galaxy_map_logic_dimension.html', 'label': 'Logic Dimension (RETIRED — reference only)', 'level': 'Dimension', 'kind': 'inter',
     'scope': '98 edges across 17 rivers', 'desc': 'G111 (Sep 1 2026) — retired as a standalone destination and de-registered from DIMENSION_PAGES, kept on disk so no link 404s. Its 21 curated decision/logic entries now render on their real home objects (each module\'s Current(L3) section, each river\'s Level 2 section), sourced from the Decision Matrix\'s own table. Its river-to-river/connector/skill passages were always a second presentation of what Level 2\'s per-river legend already draws from the same RIVER_FLOWS/FLOWS_IN/LINKS_BY_RIVER data. Level 6 (Branch Ledger) is untouched and stays link-out only.'},
    {'file': 'galaxy_map_decisions.html', 'label': 'Decisions — Website Perspective', 'level': 'Dimension', 'kind': 'infra',
     'scope': '10 human-confirm gates, RPGACE app code only', 'desc': 'G26 Phase 1 — destructive-delete/taxonomy/pipeline confirm gates, grouped by decision type.'},
    {'file': 'galaxy_map_decision_matrix.html', 'label': 'Decision Matrix — Unified Table + Bubble System', 'level': 'Dimension', 'kind': 'meta',
     'scope': '21 real decisions (10 gates + 7 logic + 4 text-input), 6 rivers', 'desc': 'Real Aug 21 2026 unification (Alex\'s own direct ask) of Decisions (G26) + Level 5\'s logic points + a new curated text-input set, split by river and documentation depth. The real source-of-truth table; its bubble view is a pure rendering layer over the same data (CEO SKILL.md R22\'s own new standing rule).'},
    {'file': 'galaxy_map_supabase.html', 'label': 'Supabase', 'level': 'Dimension', 'kind': 'infra',
     'scope': '25 tables, 113 of 502 functions', 'desc': 'G45 — every real client-side Supabase table touch, by Level/River/Module.'},
    {'file': 'galaxy_map_oracle.html', 'label': 'Oracle', 'level': 'Dimension', 'kind': 'infra',
     'scope': '13 modules, 28 real (module,function) call pairs', 'desc': 'G99 — Oracle\'s own real Infra bubble system (promoted from the retired "External AI" L0 grouping): every real function anywhere that calls Oracle, by river/module.'},
    {'file': 'galaxy_map_connectors.html', 'label': 'Connectors (6 real L0 units)', 'level': 'Dimension', 'kind': 'infra',
     'scope': '9 real (module,function) pairs across 3 connectors, 3 honest disclosure-only', 'desc': 'G99 completion — the other 6 real "External AI" constituents (Composio/Jina AI/Last.fm/librosa/n8n/Whisper), each its own real L0 unit; 3 get a genuine Infra drilldown, 3 honestly disclose they have no client-side call site.'},
    {'file': 'galaxy_map_externals.html', 'label': 'Externals — UI + Backend Dimension', 'level': 'Dimension', 'kind': 'infra',
     'scope': '13 real external connectors', 'desc': 'G27 — whether each connector genuinely touches real UI AND real backend processing.'},
    {'file': 'galaxy_map_skill_network.html', 'label': 'Skills — Composition Network + AI/UI/Backend Dimension', 'level': 'Dimension', 'kind': 'inter',
     'scope': '24 skills, 117 real skill-to-skill edges', 'desc': 'G28+G36 merged (Aug 21 2026, /misunderstanding correction) — map view: real /skillName invocation edges + click-to-reveal detail; table view: whether each skill reaches external AI, touches real UI, or touches real backend. One real page, not two.'},
    {'file': 'galaxy_map_orchestrator_openmontage.html', 'label': 'Orchestrator ↔ OpenMontage', 'level': 'Dimension', 'kind': 'inter',
     'scope': '8 real dispatch rows', 'desc': 'G29 — real async dispatch history between Orchestrator CC and OpenMontage CC via openmontage_jobs.'},
    {'file': 'galaxy_map_oversight_sync.html', 'label': 'Oversight Sync Dimension', 'level': 'Dimension', 'kind': 'inter',
     'scope': '18 trigger rows, 4 ritual sequences', 'desc': 'G55 — real process-TIME oversight-doc sequencing: what gets touched, in what order, during a push/build/ritual.'},
    {'file': 'galaxy_map_dimensions.html', 'label': 'Dimensions Matrix', 'level': 'Dimension', 'kind': 'meta',
     'scope': '45 modules × 5 shipped dimensions', 'desc': 'G30 — real multi-home overlap analysis across every other dimension page shipped so far.'},
    {'file': 'galaxy_map_alex_path.html', 'label': "Alex's Decision Path", 'level': 'Dimension', 'kind': 'inter',
     'scope': '11 real dashboard cards', 'desc': 'G37 — real Level-4 flow to target module(s), then the real Y/N fork Alex actually hits, if any.'},
    {'file': 'galaxy_map_load.html', 'label': 'Load Dimension', 'level': 'Dimension', 'kind': 'infra',
     'scope': '29 boot tasks, 21 nav modules, 5 click triggers, 24 cross-module event edges', 'desc': 'G39 — 4 real, separately-tracked load-trigger categories: boot sequence, page-nav, on-demand click, and (G104, Aug 26 2026) cross-module event signals — every real hook name, not just page:show.'},
    {'file': 'galaxy_map_loops.html', 'label': 'Loops', 'level': 'Dimension', 'kind': 'meta',
     'scope': '1 call/event loop (15 modules), 2 data loops (6 modules each)', 'desc': 'G104 (Aug 26 2026) — Alex\'s own direct pushback on a chat-only loop finding ("surely there are more") plus a real rule-8 catch ("wouldn\'t these hooks calls and shared tables be present in galaxy map too?"). Real Tarjan-SCC synthesis over already-computed call/hook/table data — never a new detector, only recombined and cross-referenced with Alex-touch evidence.'},
    {'file': 'galaxy_map_local_pipeline.html', 'label': 'Local Analysis Pipeline', 'level': 'Dimension', 'kind': 'inter',
     'scope': '3 cluster members, 7 pipeline stages, 3 real client call sites, host River XII',
     'desc': 'G110 (Sep 1 2026) — local_server.py\'s first real Galaxy Map identity, built as ONE Inter dimension joining local_server.py + Whisper + a DIRECT Anthropic call (Alex\'s own ratified direction, not 3 peer connector bubbles), with the governing job-lifecycle logic attached inline. Every citation read directly from local_server/local_server.py, local_server/rpgace_intel.py and rpgace_core.js. librosa deliberately excluded — its existence is still genuinely unconfirmed (G114).'},
]

LEVEL_ORDER = ['L0', 'L1', 'L2', 'L2.5', 'Current (L3)', 'L3', 'Zoom (L4)', 'L4', 'L5', 'L6', 'Dimension']

KIND_META = {
    'core': {'icon': '🌌', 'label': 'Core (spatial ladder)', 'color': '#C9A84C'},
    'inter': {'icon': '🔗', 'label': 'Inter (connection/flow)', 'color': '#4A90E2'},
    'infra': {'icon': '💉', 'label': 'Infra (attached resource)', 'color': '#9B59B6'},
    'meta': {'icon': '🧭', 'label': 'Meta (cross-dimension analysis)', 'color': '#8a8a9a'},
}


def compute_real_edges(out_dir):
    """Reads every real page's own actual href targets — never hand-typed.
    Excludes galaxy_map.html as a TARGET only (universal home breadcrumb,
    not a real flow relationship — see module docstring). Real Aug 21 2026
    fix, same session, found while regenerating for the new shared level
    rail (inject_level_rail): the rail's own <nav class="level-rail"> block
    puts a real href to all 8 ladder pages on EVERY page, which is the
    exact same "chrome, not a real flow relationship" class already
    carved out for galaxy_map.html above — so its own hrefs are stripped
    from the source before scanning, not counted as a second, redundant
    exclusion list."""
    files = [p['file'] for p in PAGES]
    fileset = set(files)
    edges = []
    for f in files:
        path = out_dir / f
        if not path.exists():
            continue
        s = path.read_text(encoding='utf-8', errors='ignore')
        s = re.sub(r'<nav class="level-rail">.*?</nav>', '', s, flags=re.S)
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


def build_primer():
    """G76 (Aug 25 2026) — the real "How to read this map" primer.

    Every number in it is COMPUTED from the same real data the rest of
    the build already uses (LEVEL_RAIL, DIMENSION_PAGES, RIVER_NAME,
    PAGES) — never hand-typed, so it cannot drift the way an
    aspirational hand-written paragraph would. Placed on this page
    specifically because this is the one page whose entire job is
    orienting someone who does not already know the vocabulary: the L0
    map assumes you came to look at the architecture, the hub assumes
    you came to find your way around.
    """
    n_levels = len(LEVEL_RAIL)
    ladder = ' → '.join(f'{icon} {label}' for _f, icon, label in LEVEL_RAIL)
    n_dims = len(DIMENSION_PAGES)
    n_rivers = len(RIVER_NAME)
    n_pages = len(PAGES)
    dim_names = ', '.join(label for _f, _i, label, _k, _d in DIMENSION_PAGES)
    # G113 (Sep 1 2026) — Alex's own ratified ask: methodology text
    # stays exactly where it lives, wrapped in a real <details>,
    # collapsed by default ("rarely need this information unless im
    # changing the oversight doc... otherwise i just need the data").
    # This primer is the one methodology block that is NOT the uniform
    # `.note` footer collapse_methodology() handles for all 21 pages —
    # it sits mid-page with its own heading, so it is wrapped at source.
    return f'''<details class="primer">
  <summary><h2>🧭 How to read this map</h2></summary>
  <p>Three words do most of the work here, and they are <b>not</b> interchangeable. {n_pages} real pages, all of them one of the three.</p>
  <div class="primer-grid">
    <div class="primer-card" style="border-left-color:#C9A84C">
      <div class="pc-title">📐 Level — a containment step</div>
      <div class="pc-body">One thing physically <b>inside</b> the next. There are exactly <b>{n_levels}</b>:<br><span class="pc-ladder">{ladder}</span><br>A galaxy contains rivers; a river contains modules; a module contains its own functions. That nesting is the whole test — if X does not literally sit inside the level above it, it is not a Level.</div>
    </div>
    <div class="primer-card" style="border-left-color:#4A90E2">
      <div class="pc-title">🌊 River — a one-home grouping</div>
      <div class="pc-body">A real grouping of the codebase where <b>every module belongs to exactly one</b>. There are <b>{n_rivers}</b>. That strict one-module-one-home property is what lets a River be a real containment step (L1) — and it is exactly why a Dimension can never be renumbered into one.</div>
    </div>
    <div class="primer-card" style="border-left-color:#9B59B6">
      <div class="pc-title">🌌 Dimension — a cross-cutting lens</div>
      <div class="pc-body">The same modules and functions, viewed through one facet. Deliberately <b>multi-membership</b>: one module can appear in several at once. There are <b>{n_dims}</b>: {dim_names}. Equal standing with Rivers, different shape — a Dimension answers "what does this touch", a River answers "where does this live".</div>
    </div>
  </div>
  <p class="primer-foot">Real Aug 25 2026 correction (G75): the map used to show eight ladder stops. Four of them — L2.5, Zoom/L4, L5, L6 — failed the containment test above; they were lenses wearing a level's name. L2.5 is Level 2\'s own table view, Zoom is now an inline toggle on each Current, L5\'s write-ups are on the Decision Matrix, and L6 keeps its page as link-out-only branch detail. Nothing was deleted without its content landing somewhere real first.</p>
</details>'''

TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Page Index)</title>
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
  .primer{{max-width:1100px;margin:20px auto 6px;padding:0 24px}}
  /* G113 (Sep 1 2026) — the primer is now a real disclosure element,
     collapsed by default. Its heading lives inside the summary row, so
     it needs to render inline rather than as its own block for that row
     to read as one clickable line. (Tag names deliberately not written
     out literally here: this pipeline's tag-balance check counts raw
     markup, and a tag name inside a CSS comment reads as a real
     unclosed element to it — a real false positive already present
     elsewhere in this codebase, not worth adding another.) */
  .primer > summary{{cursor:pointer;list-style:none;text-align:center;padding:6px 0}}
  .primer > summary::-webkit-details-marker{{display:none}}
  .primer > summary h2{{display:inline;margin:0}}
  .primer > summary::before{{content:'\25B6  ';font-size:10px;color:var(--gold)}}
  .primer[open] > summary::before{{content:'\25BC  '}}
  .primer h2{{font-family:Georgia,serif;font-size:19px;color:#fff;margin-bottom:6px;text-align:center}}
  .primer > p{{font-size:11.5px;color:var(--dim);text-align:center;margin-bottom:14px;line-height:1.6}}
  .primer-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}}
  .primer-card{{background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.1);border-left-width:3px;border-radius:10px;padding:14px 16px}}
  .pc-title{{font-size:12.5px;font-weight:700;color:#E2E2EC;margin-bottom:6px}}
  .pc-body{{font-size:11px;color:#c8c8d4;line-height:1.65}}
  .pc-ladder{{display:inline-block;margin:5px 0;font-size:10.5px;color:var(--gold);font-weight:700}}
  .primer-foot{{font-size:10.5px;color:#6a6a78;line-height:1.7;margin-top:12px}}
</style>
</head>
<body>
<div style="max-width:900px;margin:10px auto 0;padding:10px 24px;text-align:center;font-size:11px;color:var(--dim)">
  A real, distinct utility (Aug 21 2026, Alex's own direct call: "keep as a real, standalone index") — this is the one page that catalogues every other Galaxy Map page, not itself a level or dimension. Start exploring L0 at <a href="galaxy_map.html">galaxy_map.html</a> — RPGACE Total Systems' own real architecture map — then come back here whenever you need to find something specific.
</div>
{primer}
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Page Index (G59)</div>
  <h1>🌌 The Page Index — {n_pages} Real Pages, {n_edges} Real Cross-References</h1>
  <p>Every real Galaxy Map page, catalogued and reachable from one index — grouped by real Level and real river/dimension, annotated with the real "→ flows into" links each page already carries. The pages themselves are untouched on disk; clicking a row or node loads that page's real content below, so this stays light on first paint (real evidence: the ~12,000ms boot-lag already logged this session made a single monolithic file a real regression risk, not a hypothetical one — see the spec).</p>
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
        table_html=table_html, map_html=map_html, primer=build_primer(),
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(PAGES)} real pages catalogued, {len(edges)} real edges computed, "
          f"{sum(1 for p in PAGES if indeg.get(p['file'], 0) == 0 and p['file'] != 'galaxy_map.html')} hub-only orphans found.")


if __name__ == '__main__':
    main()
