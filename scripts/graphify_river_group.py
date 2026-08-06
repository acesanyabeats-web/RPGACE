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

Usage:
    python3 scripts/graphify_river_group.py [path/to/graph.html]
"""
import json
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
}

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
    text = html_path.read_text(encoding='utf-8')

    n_start, n_end, raw_nodes = extract_array(text, 'RAW_NODES')
    l_start, l_end, legend = extract_array(text, 'LEGEND')

    river_counts = {}
    for node in raw_nodes:
        river = id_river.get(node.get('id'))
        if river is None:
            continue
        color = RIVER_COLOR[river]
        node['color'] = {'background': color, 'border': color,
                          'highlight': {'background': '#ffffff', 'border': color}}
        node['community'] = 1000 + river
        node['title'] = (node.get('title') or node.get('label') or '') + f' · {RIVER_NAME[river]}'
        river_counts[river] = river_counts.get(river, 0) + 1

    for river, count in sorted(river_counts.items()):
        legend.append({'cid': 1000 + river, 'color': RIVER_COLOR[river],
                        'label': f'🌊 {RIVER_NAME[river]}', 'count': count})

    # Re-serialize LEGEND first (higher offset, so RAW_NODES's offsets
    # stay valid when we splice LEGEND back in after it).
    new_legend_json = json.dumps(legend, ensure_ascii=False)
    text = text[:l_start] + new_legend_json + text[l_end:]
    new_nodes_json = json.dumps(raw_nodes, ensure_ascii=False)
    text = text[:n_start] + new_nodes_json + text[n_end:]

    html_path.write_text(text, encoding='utf-8')
    return river_counts, len(module_ranges)


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
    counts, n_modules = river_group(target, graph_json)
    print(f'Parsed {n_modules} real module marker ranges from {CORE_JS}.')
    total = sum(counts.values())
    print(f'River-tagged {total} nodes across {len(counts)} rivers:')
    for r in sorted(counts):
        print(f'  {RIVER_NAME[r]}: {counts[r]} nodes')
