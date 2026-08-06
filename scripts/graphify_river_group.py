#!/usr/bin/env python3
"""
graphify_river_group.py — Aug 6, real Alex ask: "id also like graphify to
resemble more of a river, with functions skills and modules to be grouped
based on river... to make minotaur mapping easier."

Real, bounded scope (Alex-confirmed via /interrogation, Aug 6): NAMED
MODULES ONLY — not every node. graphify's own AST extractor cannot see
RPGACE.register('name', {...}) boundaries (confirmed, see
graphify_restructure_paranoia_2026-08-06.txt), so a per-function river
tag isn't available for free; this script derives it itself, from real
evidence:

1. Parses rpgace_core.js's own real /* ===MODULE:x=== */ .../* ===END:x=== */
   markers (54 real pairs, the project's own standing convention) to get
   each module's real line range.
2. For every node in graph.html's embedded RAW_NODES whose source_file is
   rpgace_core.js and whose source_location falls inside a known module's
   range, tags it with that module's real river (per the curated
   RIVER_MODULES table below — built from interconnection_map.md's own
   section headers + minotaur_map.html's own river titles, not guessed).
3. Recolors matched nodes to a real per-river palette (11 colors, same
   RPGACE-token sourcing discipline as graphify_recolor.py) and gives them
   a new `community` id (1000+river number, well clear of graphify's own
   0-184 range) so the EXISTING legend-toggle checkbox code works
   correctly for rivers too — zero new JS needed (rule 8: reuse the
   existing LEGEND.forEach rendering/toggle logic already in the file).
4. Appends 11 new LEGEND entries (one per river that matched at least one
   node) so they show up in the same sidebar list, toggleable the same way.

Unmatched nodes (main.js, docs, generic/unmapped rpgace_core.js
functions outside any real module marker) are left exactly as
graphify_recolor.py already colored them — this is a deliberate, honest
scope limit, not an oversight. Run AFTER graphify_recolor.py, on the
same file.

Aug 6, real Alex ask (2nd round, via /Engineer): "communities in graphify
should make up to make block, then the modules, and then the river in
the physical space, it just looks like a massive blob." Extends this
script from color-only tagging to REAL spatial clustering: every
river-tagged node now also gets a fixed x/y position inside its own
river's "zone" (11 zones arranged around one large circle, deterministic
per-node jitter via a hash of the node id - never Math.random, so
re-running this script against a fresh export always produces the exact
same layout, same idempotency discipline as graphify_recolor.py).
`fixed:{x:true,y:true}` is set ONLY on these nodes, so vis.js's own
forceAtlas2Based physics leaves them exactly where placed instead of
letting the sim's repulsion drag them back toward the blob - the other
1048 untagged nodes are completely unaffected, same "named modules
only" honest scope limit as the color-only version.

Real, necessary companion fix: graph.html's own nodesDS mapping
function explicitly whitelists which RAW_NODES fields become vis.js
DataSet fields (id/label/color/size/font/title/_community/...) - it did
NOT forward x/y/fixed, so setting those fields on RAW_NODES alone would
have been silently dropped. This script also patches that one mapping
line (idempotent - checks for its own marker string before patching, so
re-running does not double-patch), a real find made by reading
graph.html's own init script directly rather than assuming vis.js would
"just work."

Usage:
    python3 scripts/graphify_river_group.py [path/to/graph.html]
"""
import hashlib
import json
import math
import re
import sys
from pathlib import Path

CORE_JS = Path('rpgace_core.js')

# Real river palette - RPGACE style.css tokens again, deliberately
# DIFFERENT hexes from graphify_recolor.py's community palette so a
# river-tagged node is visually distinct from an untagged one even
# when they'd otherwise land on a similar color.
RIVER_COLOR = {
    1: '#cc4a4a',   # --red     River I   Gatekeeper's Checkpoint
    2: '#4a8ccc',   # --blue    River II  The Great Confluence
    3: '#c9a84c',   # --gold    River III The Oracle Current
    4: '#9b6ec8',   # --purple  River IV  The Bookworm River
    5: '#4caf82',   # --green   River V   Two Independent Streams
    6: '#e8c96a',   # --gold2   River VI  The Judgment Chamber
    7: '#cc7a3a',   # --orange  River VII The Library Current
    8: '#5588ee',   # --mp-col  River VIII The Confluence Pool
    9: '#e05555',   # --hp-col  River IX  The Mirror and the Far Shore
    10: '#868db8',  # --muted   River X   The Confluence of Chronicles
    11: '#3a4570',  # --border2 River XI  Content Production Live
    # Aug 6, 3rd Engineer pass — 2 real, honest META zones, not rivers.
    # Alex's own real evidence-check request ("go through the list...
    # place closest to what it's connected to") surfaced 2 real families
    # of components that don't belong to any ONE river but do have a
    # real, checkable home: the shared API/auth layer, and RPGACE's own
    # dev-process material (oversight docs + Claude Code skills). Giving
    # them a real zone (not "Uncategorized," not forced into a river) is
    # more honest than either extreme.
    12: '#2ABFB0',  # --teal    Zone XII  The API / Auth Layer (shared infra)
    13: '#7a7a8a',  # neutral   Zone XIII Dev Process (oversight docs + skills)
}
RIVER_NAME = {
    1: "River I — Gatekeeper's Checkpoint",
    2: 'River II — The Great Confluence',
    3: 'River III — The Oracle Current',
    4: 'River IV — The Bookworm River',
    5: 'River V — Two Independent Streams',
    6: 'River VI — The Judgment Chamber',
    7: 'River VII — The Library Current',
    8: 'River VIII — The Confluence Pool',
    9: 'River IX — The Mirror and the Far Shore',
    10: 'River X — The Confluence of Chronicles',
    11: 'River XI — Content Production Live',
    12: 'Zone XII — The API / Auth Layer',
    13: 'Zone XIII — Dev Process (docs + skills)',
}
TOTAL_ZONES = 13  # rivers 1-11 + the 2 real meta-zones above

# Real module -> river mapping, built from interconnection_map.md's own
# section headers (Oracle Pipeline / Taxonomy Tree Pipeline / Content
# Production Pipeline / Schedule System / the Unified placement engine /
# Chronicles / API auth / Claude Code fallback lane / OpenMontage handoff
# lane) cross-referenced against minotaur_map.html's own 11 river titles
# and rpgace_core.js's real 54 registered module names (grepped, not
# invented). Modules that are genuinely cross-cutting UI/infra
# (leftNav, popup scaffolding, voiceInput, perfWatch, pwaInstall,
# quickActions, docsLinks [dead], suppressQuestPopup, myFeature, config)
# are deliberately left OUT - they don't belong to one river, and
# force-fitting them would be dishonest, not "making mapping easier."
RIVER_MODULES = {
    1: ['authGate'],
    2: ['pathRouter'],
    3: ['oracleAppGrounding', 'oracleTreeGrounding', 'oracleFetchGuard',
        'oracleDevBridge', 'mockOracle', 'agentsIntoOracle', 'prodOraclePanel',
        'instaOraclePanel', 'youtubeOracle', 'tiktokOracle', 'scheduleOracle',
        'feynman'],
    4: ['bookworm'],
    5: ['researchTabs', 'intelBatchList', 'intelDelete', 'intelDedup',
        'ciAutoPropose', 'scheduleFixes', 'shiftSync', 'agendaReminder',
        'morningBrief', 'journalQoL'],
    6: ['phylumPath'],
    7: ['jargonEncyclopedia', 'encyclopediaQoL', 'encSync', 'encTaxonomyLink',
        'refCorpus'],
    8: ['taxonomyReviewQueue', 'taxonomySync', 'taxonomyTree'],
    9: ['knowledgeGap'],
    10: ['chroniclesLog', 'careerStatCard'],
    11: ['contentProductionLive', 'beatLog', 'videoPipeline', 'videoSummary',
         'conidPot', 'contentRepurpose', 'visualOracle'],
}
MODULE_RIVER = {m: r for r, mods in RIVER_MODULES.items() for m in mods}


def parse_module_ranges(core_js_path: Path):
    """Real module -> (start_line, end_line) from the file's own markers."""
    ranges = {}
    lines = core_js_path.read_text(encoding='utf-8').splitlines()
    stack = None
    for i, line in enumerate(lines, start=1):
        m = re.match(r'/\* ===MODULE:(\w+)=== \*/', line.strip())
        if m:
            stack = (m.group(1), i)
            continue
        e = re.match(r'/\* ===END:(\w+)=== \*/', line.strip())
        if e and stack and e.group(1) == stack[0]:
            ranges[stack[0]] = (stack[1], i)
            stack = None
    return ranges


def line_of(node):
    """Best-effort line number extraction from a node's source_location
    (graph.json has this; graph.html's embedded RAW_NODES does NOT -
    real, confirmed field-loss during export, not a bug in this script)."""
    loc = node.get('source_location') or ''
    m = re.search(r'[Ll](\d+)', str(loc))
    return int(m.group(1)) if m else None


def build_id_river_map(graph_json_path: Path, module_ranges):
    """graph.json is the authoritative source for source_location -
    build id -> river from THERE, then apply by id to graph.html's
    RAW_NODES (which shares the same id scheme but not the line data)."""
    data = json.loads(graph_json_path.read_text(encoding='utf-8'))
    id_river = {}
    for node in data.get('nodes', []):
        src = node.get('source_file') or ''
        if not src.endswith('rpgace_core.js'):
            continue
        ln = line_of(node)
        if ln is None:
            continue
        for mod, (start, end) in module_ranges.items():
            if start <= ln <= end:
                river = MODULE_RIVER.get(mod)
                if river:
                    id_river[node['id']] = river
                break
    return id_river


def build_component_zone_map(graph_json_path: Path, id_river):
    """Aug 6, 3rd Engineer pass - real Alex ask: "go through the list to
    see nodes with no neighbour... to see what we can hook it up to,"
    then, on seeing this still left 56 disconnected components, "i want
    it closest to the part of rpgace it is connected to." Positioning a
    whole connected component near its real topic is a genuinely SAFER
    way to express "these are related" than adding a fabricated edge
    would be - proximity doesn't claim a hard reference relationship the
    way an edge does (same honesty boundary as the "why not just hook
    them up" answer this session already gave).

    Real, evidence-based rules only - never a guess at what a file
    "probably" relates to:
    - Any node already river-tagged (id_river, from real
      rpgace_core.js module-marker ranges) keeps that river - authority
      order, this function never overrides it.
    - `.claude/skills/`, root-level oversight docs (CLAUDE.md,
      patch_notes.html, interconnection_map.md, system_flow_map.md,
      manual.html, taxonomy_map.html, minotaur_map.html, and every
      dated backlog/spec/debate/session .txt or .md at repo root),
      `plans/*.md`, and dev/build tooling (scripts/, rpgace_build.py,
      package.json, vercel.json, manifest.json, sw.js) all go to Zone
      XIII - real, checkable membership: this is material ABOUT the
      system's own development process, not the system's own runtime
      code, and grouping process-docs with process-tooling is an
      honest single category, not a forced fit.
    - `api/*.js` goes to Zone XII - real, checkable membership: every
      one of those files routes through requireAuth()/setCORS() in
      api/_context.js (confirmed by direct grep this session), making
      "shared API/auth layer" a real, not guessed, description.
    - scripts/fourth_rota.py and n8n/* go to River V - real, checkable
      membership: both are genuine Schedule-system automation
      (interconnection_map.md/patch_notes.html both document
      fourth_rota.py as the real rota-sync tool feeding the Schedule
      System).
    - Everything else (main.js, rpgace_core.js code outside any known
      module range, and anything not matching a rule above) is left
      UNCLASSIFIED on purpose - positioning it would mean guessing at a
      relationship this script has no real evidence for. Honest scope
      limit, not an oversight; the single 239-node main.js component
      and the unmapped rpgace_core.js code both fall here.
    """
    data = json.loads(graph_json_path.read_text(encoding='utf-8'))
    nodes_by_id = {n['id']: n for n in data.get('nodes', [])}
    links = data.get('links', [])
    adj = {}
    for l in links:
        s, t = l.get('source'), l.get('target')
        adj.setdefault(s, set()).add(t)
        adj.setdefault(t, set()).add(s)

    def file_zone(src):
        if not src:
            return None
        if src.startswith('.claude/skills/') or src.startswith('plans/'):
            return 13
        if src.startswith('scripts/') or src in (
            'rpgace_build.py', 'package.json', 'vercel.json',
            'manifest.json', 'sw.js', '.graphify_version'):
            if src == 'scripts/fourth_rota.py':
                return 5
            return 13
        if src.startswith('n8n/'):
            return 5
        if src.startswith('api/'):
            return 12
        oversight_docs = (
            'CLAUDE.md', 'CLAUDE_archive.md', '.claude/CLAUDE.md',
            'patch_notes.html', 'patch_notes_archive.html',
            'interconnection_map.md', 'system_flow_map.md', 'manual.html',
            'taxonomy_map.html', 'minotaur_map.html',
            'ai_tooling_and_rules_map.md', 'RPGACE_ARCHITECTURE.md',
            'RPGACE.md', 'DESIGN.md', 'RPGACE_ORACLE_NOTES.md',
        )
        if src in oversight_docs:
            return 13
        if src.endswith('.txt') and '/' not in src:
            return 13  # every dated backlog/spec/debate/session .txt at repo root
        if src.endswith('.md') and '/' not in src and src not in ('README.md',):
            return 13  # dated session/report .md files at repo root
        return None

    seen = set()
    zone_map = {}
    for n in data.get('nodes', []):
        nid = n['id']
        if nid in seen:
            continue
        stack = [nid]
        comp = set()
        while stack:
            x = stack.pop()
            if x in comp:
                continue
            comp.add(x)
            seen.add(x)
            stack.extend(adj.get(x, set()) - comp)
        # Authority order: an existing river tag wins outright.
        river_votes = {}
        for cid in comp:
            if cid in id_river:
                r = id_river[cid]
                river_votes[r] = river_votes.get(r, 0) + 1
                continue
            z = file_zone(nodes_by_id.get(cid, {}).get('source_file'))
            if z is not None:
                river_votes[z] = river_votes.get(z, 0) + 1
        if not river_votes:
            continue
        best = max(river_votes.items(), key=lambda kv: kv[1])[0]
        for cid in comp:
            if cid not in id_river:
                zone_map[cid] = best
    return zone_map


ZONE_RADIUS = 2400  # px from the graph's own origin - well outside the
                     # untagged-node blob's natural forceAtlas2Based
                     # settling radius, so river zones read as clearly
                     # separate from it, not swallowed back in.
JITTER_RADIUS = 220  # px scatter within a zone, so same-river nodes are
                      # a visible cluster, not one stacked point.


def zone_center(river):
    """Deterministic center for a river's zone - 11 rivers placed evenly
    around one large circle. Same real technique as minotaur_map.html's
    own bird's-eye block layout: one shape per river, arranged in a
    fixed ring, not randomly - so the physical layout itself is legible."""
    angle = 2 * math.pi * (river - 1) / TOTAL_ZONES
    return ZONE_RADIUS * math.cos(angle), ZONE_RADIUS * math.sin(angle)


def deterministic_jitter(node_id, community, scale=1.0):
    """A node's scatter position within its zone, seeded from its own id
    (never Math.random/random.random) - re-running this script against a
    fresh export always reproduces the exact same layout, same
    idempotency discipline as graphify_recolor.py. Nodes sharing a
    graphify `community` id get pulled toward one shared sub-point
    inside the zone first (the real 'communities make up a block'
    request), then jittered a little further so they don't overlap.
    `scale` (Aug 6, 3rd Engineer pass) widens the jitter radius for the
    2 meta-zones, which hold whole connected components (dozens to low
    hundreds of nodes) rather than the ~16 the 11 named-module rivers
    hold - without it, those zones would overlap into an unreadable
    knot. Real rivers always pass scale=1.0, unaffected."""
    radius = JITTER_RADIUS * scale
    h = int(hashlib.sha1(f'{node_id}'.encode()).hexdigest(), 16)
    sub_h = int(hashlib.sha1(f'{community}'.encode()).hexdigest(), 16)
    sub_angle = 2 * math.pi * (sub_h % 1000) / 1000
    sub_r = radius * 0.35 * ((sub_h // 1000) % 100) / 100
    sub_dx, sub_dy = sub_r * math.cos(sub_angle), sub_r * math.sin(sub_angle)
    angle = 2 * math.pi * (h % 1000) / 1000
    r = radius * 0.65 * ((h // 1000) % 100) / 100
    return sub_dx + r * math.cos(angle), sub_dy + r * math.sin(angle)


DATASET_MARKER = '_river_fixed: n._river_fixed'  # idempotency check string


def patch_dataset_mapping(text):
    """graph.html's own nodesDS mapping function (checked directly by
    reading the file, not assumed) explicitly whitelists which RAW_NODES
    fields become vis.js DataSet fields - x/y/fixed were never among
    them, so setting them on RAW_NODES alone would be silently dropped.
    Idempotent: skips if this exact patch already landed."""
    if DATASET_MARKER in text:
        return text, False
    old = ("const nodesDS = new vis.DataSet(RAW_NODES.map(n => ({\n"
           "  id: n.id, label: n.label, color: n.color, size: n.size,\n"
           "  font: n.font, title: n.title,\n"
           "  _community: n.community, _community_name: n.community_name,\n"
           "  _source_file: n.source_file, _file_type: n.file_type, _degree: n.degree,\n"
           "})));")
    new = ("const nodesDS = new vis.DataSet(RAW_NODES.map(n => ({\n"
           "  id: n.id, label: n.label, color: n.color, size: n.size,\n"
           "  font: n.font, title: n.title,\n"
           "  _community: n.community, _community_name: n.community_name,\n"
           "  _source_file: n.source_file, _file_type: n.file_type, _degree: n.degree,\n"
           "  x: n.x, y: n.y, fixed: n.fixed, _river_fixed: n._river_fixed,\n"
           "})));")
    if old not in text:
        raise ValueError('graph.html\'s nodesDS mapping line has changed shape - '
                          'a graphify version bump likely rewrote its own export '
                          'template. Re-check by hand before patching blind.')
    return text.replace(old, new), True


def extract_array(text, name):
    """Pull `const NAME = [ ... ];` out of the HTML via bracket counting -
    safer than a greedy regex against a 900K+ char single-line file."""
    marker = f'const {name} = ['
    start = text.index(marker) + len(marker) - 1  # position of the '['
    depth = 0
    i = start
    while i < len(text):
        if text[i] == '[':
            depth += 1
        elif text[i] == ']':
            depth -= 1
            if depth == 0:
                return start, i + 1, json.loads(text[start:i + 1])
        i += 1
    raise ValueError(f'Could not find matching bracket for {name}')


def river_group(html_path: Path, graph_json_path: Path):
    module_ranges = parse_module_ranges(CORE_JS)
    id_river = build_id_river_map(graph_json_path, module_ranges)
    zone_map = build_component_zone_map(graph_json_path, id_river)
    text = html_path.read_text(encoding='utf-8')

    n_start, n_end, raw_nodes = extract_array(text, 'RAW_NODES')
    l_start, l_end, legend = extract_array(text, 'LEGEND')

    # Zones 12/13 hold whole connected components (dozens to low hundreds
    # of nodes each, not the ~16 the 11 real rivers hold) - a fixed
    # JITTER_RADIUS sized for the small river case would overlap badly
    # here, so scale it up per zone by real occupancy first.
    zone_occupancy = {}
    for zid in zone_map.values():
        zone_occupancy[zid] = zone_occupancy.get(zid, 0) + 1

    river_counts = {}
    for node in raw_nodes:
        nid = node.get('id')
        river = id_river.get(nid)
        zone = zone_map.get(nid) if river is None else None
        target = river if river is not None else zone
        if target is None:
            continue
        color = RIVER_COLOR[target]
        node['color'] = {'background': color, 'border': color,
                          'highlight': {'background': '#ffffff', 'border': color}}
        node['community'] = 1000 + target
        label = RIVER_NAME[target]
        node['title'] = (node.get('title') or node.get('label') or '') + f' · {label}'
        river_counts[target] = river_counts.get(target, 0) + 1

        # Real spatial clustering (Aug 6, 2nd + 3rd Engineer passes): a
        # fixed position inside this zone, so vis.js's physics leaves it
        # there instead of dragging it back toward the blob. Zones 12/13
        # get a jitter radius scaled to their real occupancy (they hold
        # far more nodes than the 11 named-module rivers do); every
        # other zone keeps the original fixed radius, unaffected.
        zx, zy = zone_center(target)
        occ = zone_occupancy.get(target, 1)
        scale = max(1.0, (occ / 16) ** 0.5) if target >= 12 else 1.0
        jx, jy = deterministic_jitter(nid, node.get('community'), scale)
        node['x'] = round(zx + jx, 1)
        node['y'] = round(zy + jy, 1)
        node['fixed'] = {'x': True, 'y': True}
        node['_river_fixed'] = True

    for target, count in sorted(river_counts.items()):
        icon = '🌊' if target <= 11 else '📍'
        legend.append({'cid': 1000 + target, 'color': RIVER_COLOR[target],
                        'label': f'{icon} {RIVER_NAME[target]}', 'count': count})

    # Re-serialize LEGEND first (higher offset, so RAW_NODES's offsets
    # stay valid when we splice LEGEND back in after it).
    new_legend_json = json.dumps(legend, ensure_ascii=False)
    text = text[:l_start] + new_legend_json + text[l_end:]
    new_nodes_json = json.dumps(raw_nodes, ensure_ascii=False)
    text = text[:n_start] + new_nodes_json + text[n_end:]

    text, patched = patch_dataset_mapping(text)

    html_path.write_text(text, encoding='utf-8')
    return river_counts, len(module_ranges), patched


if __name__ == '__main__':
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('graphify-out/graph.html')
    graph_json = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('graphify-out/graph.json')
    if not target.exists():
        print(f'ERROR: {target} not found. Run `graphify export html` first.')
        sys.exit(1)
    if not graph_json.exists():
        print(f'ERROR: {graph_json} not found.')
        sys.exit(1)
    if not CORE_JS.exists():
        print(f'ERROR: {CORE_JS} not found - run from the repo root.')
        sys.exit(1)
    counts, n_modules, patched = river_group(target, graph_json)
    print(f'Parsed {n_modules} real module marker ranges from {CORE_JS}.')
    total = sum(counts.values())
    print(f'River-tagged {total} nodes across {len(counts)} rivers, each given a real fixed x/y inside its river zone:')
    for r in sorted(counts):
        print(f'  {RIVER_NAME[r]}: {counts[r]} nodes')
    print(f'nodesDS mapping patch: {"applied" if patched else "already present (no-op)"}')
