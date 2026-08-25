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
    RIVER_NAME, RIVER_FLOWS, compute_river_flow_cycles, _river_num_from_label,
    EXTERNAL_RIVER_LINKS, RIVER_MODULES,
    L0_SUPABASE_UNITS, L0_UNIT_LABEL,
    compute_l0_unit_supabase_infra, compute_l0_unit_supabase_inter,
    compute_rpgace_architecture_supabase_infra, compute_oversight_docs_supabase_infra,
)
from graphify_river_group import inject_level_rail, inject_plan_overlay  # noqa: E402
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
# ── G77 (Aug 25 2026) — Alex's own Infra tab is now PURELY the
# Decisions bubble system, and it covers ALL 21 real decisions, not the
# 11 it used to.
#
# What it used to import, and why that was the wrong source: this file
# pulled galaxy_map_decisions.py's 10 human-confirm GATES (grouped by
# its own CATEGORIES) plus exactly ONE hand-picked LOGIC_POINTS entry
# (oracle-mode) — 11 of the real 21. The real unified dataset already
# existed one file over: galaxy_map_decision_matrix.build_unified()
# merges all 3 real kinds (10 gates + 7 curated logic choices + 4
# curated text-input points = 21) and tags each with its own real
# river, resolved from RIVER_MODULES. Re-deriving any of that here
# would have been a second, drifting copy (rule 8), so this now imports
# the one real unified builder directly.
#
# Load-bearing side effect, deliberately kept: build_unified() runs
# verify_core_js_anchor() over every logic/text-input point, so a moved
# or changed rpgace_core.js anchor now fails THIS page's build loudly
# too, exactly as it already failed the Decision Matrix's. That is a
# strengthening of the existing anchor discipline, never a bypass.
from galaxy_map_decision_matrix import build_unified as dm_build_unified  # noqa: E402

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
# G82 — graphify_river_group.py needs these same labels for its own
# Supabase facet text, but cannot import them (galaxy_map.py imports IT,
# so the reverse would be circular), so it mirrors them. A mirror that
# nothing checks is a stale claim waiting to happen — rule 8's whole
# point — so this fails the build loudly the moment the two disagree,
# rather than silently rendering an outdated unit name.
assert L0_UNIT_LABEL == {uid: UNIT_META[uid]['label'] for uid in UNIT_ORDER}, (
    'L0_UNIT_LABEL (graphify_river_group.py) has drifted from UNIT_META here — '
    'update the mirror in the same commit.')

# The 5 units that need a NEW bubble on this page (the other 4 already
# render via the SVG satellites/harness node above).
NEW_BUBBLE_UNITS = ['external_ai', 'skills', 'alex', 'supabase', 'oversight_docs']

# Real, explicit override #1 — anything touching External AI is INFRA
# regardless of its stored EDGES 'kind' tag (Alex's own confirmed
# example this session: infra = "Supabase touch, Oracle call,
# external-connector touch").
FORCE_INFRA_UNITS = {'external_ai'}
# Real, explicit override #2 — RETIRED by G77 (Aug 25 2026). The
# alex<->rpgace_architecture edge used to be force-flipped to INFRA so
# it would sit next to the decision list. Alex's own direct critique
# this session: his Infra tab was mixing that generic relationship edge
# in with the decisions themselves. The edge is REAL and is not deleted
# — it is re-routed to his INTER list (see EDGE_DIM_OVERRIDE below),
# where its own stored kind (ACTOR) already put it naturally, so both
# sides of the edge (alex and rpgace_architecture) now agree instead of
# one side being force-flipped.
FORCE_INFRA_EDGE_IDS = set()

# G77 — the one real dimension name Alex's Infra tab is allowed to
# contain. Anything else that lands on `alex` (the alex<->external_ai
# edge, the 3 "Uses: <provider>" rows) is a real relationship and is
# PRESERVED VERBATIM — it is just re-kinded to 'inter' at the end of
# build_facets(), never dropped. Deliberately scoped to `alex` alone:
# FORCE_INFRA_UNITS' own "anything touching External AI is Infra" rule
# still holds for every other unit, external_ai included.
DECISIONS_DIM = 'Decisions (what Alex can decide)'
INFRA_DECISIONS_ONLY_UNITS = {'alex'}

# G77 — a real per-edge dimension override. The alex<->rpgace edge's
# own desc is literally about the UI element Alex touches ("Input = the
# real UI element (a confirm popup, an arm/confirm button). Output =
# the write/action taken"), which is the same real relationship the
# existing 'UI / Dashboard Path' Inter dimension already describes on
# both units — so it joins that group rather than opening a new
# near-duplicate one (rule 8). Its share_key is untouched, so the
# existing cross-highlight between alex and rpgace_architecture still
# fires exactly as before.
EDGE_DIM_OVERRIDE = {'alex-rpgace': 'UI / Dashboard Path'}

# ── G78 (Aug 25 2026) — External AI's own Infra tab, rebuilt.
#
# Alex's own direct critique of what this tab used to show: 3 generic
# "↔ <other unit>" partner edges plus 3 provider rows — a vague
# aggregate that named almost none of the real external AI actors
# RPGACE Total Systems actually talks to. This is the real, named
# 12-actor roster he asked for, in his own listed order, resolved
# against 3 real already-existing sources and never re-typed:
#   'unit'      -> this file's own GALAXY_BY_ID/UNIT_META (a real L0
#                  unit that is ALSO an external AI actor — a
#                  deliberate overlap, not a duplication bug: those 3
#                  stay independently selectable units of their own,
#                  and each row here carries the same share_key their
#                  own dispatch facet uses, so clicking it glows that
#                  unit's real bubble).
#   'provider'  -> ORACLE_PROVIDERS (role/tested) + EXTERNAL_CONNECTORS
#                  (real status string).
#   'connector' -> EXTERNAL_CONNECTORS (status/via/note), verbatim.
# Deliberately NOT done: promoting these 12 to their own L0 units. That
# would break the uniform 9-unit L0 grain (the ratified "no privileged
# or special-cased unit" rule, R16) and duplicate galaxy_map_externals.
# html's (G27) already-built per-connector breakdown.
EXTERNAL_AI_ACTORS = [
    ('unit', 'orchestrator_cc'),
    ('unit', 'openmontage_cc'),
    ('unit', 'graphify_cc'),
    ('connector', 'Composio'),
    ('connector', 'librosa'),
    ('connector', 'Jina AI'),
    ('connector', 'Last.fm'),
    ('connector', 'Whisper (OpenAI, local)'),
    ('connector', 'n8n'),
    ('provider', 'OpenAI (Luna)'),
    ('provider', 'Moonshot AI (Kimi)'),
    ('provider', 'Anthropic (Claude API)'),
]
# Real connector row backing a CC unit, where one genuinely exists.
# orchestrator_cc deliberately has NO entry — it is this session
# itself, not an external hosted service, so it has no
# EXTERNAL_CONNECTORS row to read a status from and says so plainly
# rather than borrowing one.
CC_UNIT_CONNECTOR = {'openmontage_cc': 'OpenMontage', 'graphify_cc': 'Graphify CC'}
CC_UNIT_LINK = {
    'orchestrator_cc': 'galaxy_map_orchestrator_openmontage.html',
    'openmontage_cc': 'galaxy_map_orchestrator_openmontage.html',
    'graphify_cc': 'galaxy_map_externals.html',
}


def _status_rank(status):
    """Real, evidence-derived display rank from a connector's own status
    string — never a hand-assigned per-actor number. live first, then
    genuinely-built-but-unconfirmed/local, then dormant scaffolds, then
    deferred."""
    s = (status or '').lower()
    if s.startswith('live'):
        return 0
    if s.startswith('dormant'):
        return 2
    if s.startswith('deferred'):
        return 3
    return 1


_CONNECTOR_BY_NAME = {c['name']: c for c in EXTERNAL_CONNECTORS}


def river_flow_rank():
    """G77 — a real, deterministic 'chronological' rank per river,
    derived entirely from RIVER_FLOWS. Alex's own stated reasoning for
    wanting this axis: "the rivers are in many ways the chronological
    order from logging to getting to last action that hasn't been
    touched."

    Method, in 3 real steps, every one of them reusing evidence that
    already exists rather than inventing an ordering:

      1. Condense the real cycles. RIVER_FLOWS genuinely contains
         cycles (compute_river_flow_cycles() — the already-built
         Tarjan SCC detector, reused not re-derived: 2 real groups,
         {11,12} and {2,3,4,6,7,8,17}). A digraph's condensation is
         always a DAG, so a genuine topological order exists on it
         even though one does NOT exist on the raw river graph.
      2. Longest-path layering over that DAG (Kahn's algorithm,
         layer = 1 + max(layer of predecessors)). A river no other
         river flows into lands at layer 0 — the real "logging"
         end; a terminal sink lands at the highest layer — the real
         "last action" end.
      3. Tie-break INSIDE a cycle group by that group's own real
         intra-group in-degree, ascending. Within {2,3,4,6,7,8,17}
         nothing else separates the members (they all share one
         layer by definition), but their internal edges do: River
         III is fed by one river, River VIII is fed by three, so
         III sorts toward the start and VIII toward the estuary end,
         which is exactly what those two rivers really are. Final
         tie-break is river number, so the result is fully
         deterministic.

    Real, honest limits: this is NOT a true topological sort of the
    rivers themselves (impossible — real cycles exist), and every
    member of a cycle group necessarily shares one layer, so the
    in-degree tie-break is the only real separation available inside a
    group. Returns {river_number: (layer, intra_group_indegree)}.
    """
    adj, nodes = {}, set()
    for src, targets in RIVER_FLOWS.items():
        nodes.add(src)
        for t in targets:
            dst = _river_num_from_label(t[0])
            if dst is not None:
                adj.setdefault(src, set()).add(dst)
                nodes.add(dst)

    cycles = compute_river_flow_cycles()
    comp = {}
    for i, group in enumerate(cycles):
        for r in group:
            comp[r] = ('scc', i)
    for n in sorted(nodes):
        comp.setdefault(n, ('river', n))

    cnodes = sorted(set(comp.values()))
    cadj = {c: set() for c in cnodes}
    for src, dsts in adj.items():
        for dst in sorted(dsts):
            if comp[src] != comp[dst]:
                cadj[comp[src]].add(comp[dst])

    indeg = {c: 0 for c in cnodes}
    for c in cnodes:
        for d in sorted(cadj[c]):
            indeg[d] += 1
    layer = {c: 0 for c in cnodes}
    remaining = dict(indeg)
    queue = sorted([c for c in cnodes if remaining[c] == 0])
    while queue:
        c = queue.pop(0)
        for d in sorted(cadj[c]):
            layer[d] = max(layer[d], layer[c] + 1)
            remaining[d] -= 1
            if remaining[d] == 0:
                queue.append(d)
                queue.sort()

    # Real intra-cycle-group in-degree (0 for any river that isn't in a
    # cycle group — it has no group-internal edges by definition).
    intra = {n: 0 for n in nodes}
    for group in cycles:
        members = set(group)
        for src in sorted(members):
            for dst in sorted(adj.get(src, ())):
                if dst in members:
                    intra[dst] += 1
    return {n: (layer[comp[n]], intra[n]) for n in sorted(nodes)}


def build_alex_decision_facets():
    """G77 — Alex's Infra tab, built as one facet per real RIVER, each
    holding that river's own real decisions from the unified Decision
    Matrix dataset (all 21, all 3 kinds). River groups are ordered by
    river_flow_rank() above; a river with no RIVER_FLOWS presence at
    all, and the real un-rivered group (dashDeck is a documented
    cross-cutting module with no river of its own), sort last."""
    decisions = dm_build_unified()
    rank = river_flow_rank()

    by_river = {}
    for d in decisions:
        by_river.setdefault(d['river'], []).append(d)

    def river_sort_key(r):
        if r is None:
            return (2, 99, 99, 99)
        if r not in rank:
            return (1, 99, 99, r)
        layer, intra = rank[r]
        return (0, layer, intra, r)

    # Real "flows toward" evidence, river-level by construction: a real
    # RIVER_FLOWS edge from this river into another river that ALSO
    # holds one of the 21 decisions. Deliberately NOT an invented
    # per-decision dependency graph — the evidence that exists is river
    # topology, so the note says so and names the real decisions the
    # target river actually holds.
    flows_toward = {}
    for r in by_river:
        if r is None:
            continue
        hits = []
        for label, condition, itype in RIVER_FLOWS.get(r, ()):
            tgt = _river_num_from_label(label)
            if tgt is None or tgt == r or tgt not in by_river:
                continue
            hits.append((tgt, condition, itype, by_river[tgt]))
        if hits:
            flows_toward[r] = hits

    def resolve_link(link):
        """build_unified()'s own links are written for the Decision
        Matrix page, so a curated logic point's link is a BARE same-page
        anchor ('#d-oracle-mode'). Rendered here that would be a real
        dead in-page anchor — galaxy_map.html has no such id. Qualify it
        onto the page that actually owns those anchors. Caught by a
        direct dead-link check before shipping, not assumed away."""
        if link and link.startswith('#'):
            return 'galaxy_map_decision_matrix.html' + link
        return link

    facets = []
    for r in sorted(by_river, key=river_sort_key):
        pts = sorted(by_river[r], key=lambda d: (d['kind'], d['title']))
        items = ''.join(
            f'<li><span class="dkind">{esc(d["kind_label"])}</span> '
            f'<a href="{esc(resolve_link(d["link"]))}" target="_blank"><b>{esc(d["title"])}</b></a> — '
            f'<code>{esc(d["module"])}{("." + d["func"]) if d.get("func") else ""}</code>: '
            f'{esc(d["detail"])}</li>'
            for d in pts
        )
        detail = f'<ul class="dec-list">{items}</ul>'
        for tgt, condition, itype, tgt_pts in flows_toward.get(r, ()):
            titles = ', '.join(esc(d['title']) for d in sorted(tgt_pts, key=lambda d: d['title']))
            detail += (
                f'<div class="flows-toward">→ flows toward <b>{esc(RIVER_NAME.get(tgt, "River " + str(tgt)))}</b> '
                f'<span class="ft-cond">({esc(condition)} · <code>{esc(itype)}</code>)</span>, '
                f'whose own real decisions are: {titles}.'
                f'<span class="ev">Real evidence grain: this is a RIVER_FLOWS edge between the two rivers, '
                f'not a per-decision dependency — no such per-decision graph exists in this project, and one '
                f'was deliberately not invented for this note.</span></div>'
            )
        if r is None:
            label = f'⚪ No river (cross-cutting module) ({len(pts)})'
        else:
            layer, intra = rank.get(r, (99, 99))
            label = (f'{esc(RIVER_NAME.get(r, "River " + str(r)))} ({len(pts)}) '
                     f'<span class="rrank">flow rank {layer}.{intra}</span>')
        facets.append({
            'kind': 'infra', 'dim': DECISIONS_DIM, 'label': label,
            'detail': detail, 'share_key': 'decisions',
            'link': 'galaxy_map_decision_matrix.html',
        })
    return facets, len(decisions)


def build_external_ai_actor_facets():
    """G78 — one real facet per named external AI actor, from
    EXTERNAL_AI_ACTORS. Every status string is read from a real source
    (EXTERNAL_CONNECTORS, or a CC unit's own GALAXIES entry), never
    invented; fails loud if a named source row has gone missing."""
    rows = []
    for kind, key in EXTERNAL_AI_ACTORS:
        if kind == 'unit':
            g = GALAXY_BY_ID.get(key)
            if not g:
                raise SystemExit(f'G78: no GALAXIES entry for L0 unit {key!r} — roster is stale.')
            conn_name = CC_UNIT_CONNECTOR.get(key)
            conn = _CONNECTOR_BY_NAME.get(conn_name) if conn_name else None
            if conn_name and not conn:
                raise SystemExit(f'G78: no EXTERNAL_CONNECTORS row named {conn_name!r} — roster is stale.')
            status = conn['status'] if conn else 'live (this session)'
            source = (f'EXTERNAL_CONNECTORS[{esc(conn_name)}].status'
                      if conn else 'its own GALAXIES entry (tested=True) — it has no EXTERNAL_CONNECTORS row, '
                                   'because it is this Claude Code session itself, not an external hosted service')
            via = conn.get('via') if conn else 'runs inside RPGACE\'s own repo — no bridge channel of its own'
            share = g.get('channel') or f"galaxy:{key}"
            detail = (f"{esc(g['role'])} <span class=\"ev\">Real status source: {source} · via: {esc(via)} · "
                      f"bridges to: {esc(g.get('bridges_to') or 'n/a')}. Also a full L0 unit in its own right — "
                      f"clicking this row glows its own bubble; click that bubble for its complete detail.</span>")
            rows.append((_status_rank(status), {
                'kind': 'infra', 'dim': 'External AI', 'icon': g['icon'],
                'label': f"{g['icon']} Actor: {esc(g['label'])} ({esc(status)})",
                'detail': detail, 'share_key': share, 'link': CC_UNIT_LINK.get(key),
            }))
        else:
            conn = _CONNECTOR_BY_NAME.get(key)
            if not conn:
                raise SystemExit(f'G78: no EXTERNAL_CONNECTORS row named {key!r} — roster is stale.')
            status = conn['status']
            if kind == 'provider':
                prov = next((p for p in ORACLE_PROVIDERS if p['name'] == key), None)
                if not prov:
                    raise SystemExit(f'G78: no ORACLE_PROVIDERS row named {key!r} — roster is stale.')
                icon = prov['icon']
                role = prov['role']
                share = f"provider:{key}"
            else:
                icon = _connector_icon(key)
                role = conn.get('note', '')
                share = f"connector:{key}"
            detail = (f"{esc(role)} <span class=\"ev\">Real status source: EXTERNAL_CONNECTORS[{esc(key)}].status "
                      f"= <code>{esc(status)}</code> · via: {esc(conn.get('via') or 'n/a')} · "
                      f"bridges to: {esc(conn.get('bridges_to') or 'n/a')}</span>")
            rows.append((_status_rank(status), {
                'kind': 'infra', 'dim': 'External AI', 'icon': icon,
                'label': f"{icon} Actor: {esc(key)} ({esc(status)})",
                'detail': detail, 'share_key': share, 'link': 'galaxy_map_externals.html',
            }))
    # Deterministic ordering: real status rank first (live -> local/
    # unconfirmed -> dormant -> deferred), then EXTERNAL_AI_ACTORS' own
    # roster position as a stable tie-break.
    ordered = sorted(enumerate(rows), key=lambda pair: (pair[1][0], pair[0]))
    return [facet for _, (_rank, facet) in ordered]


# ── G81 (Aug 25 2026) — External AI's own Inter tab, rebuilt as a real
# per-actor "migration" click-through.
#
# What this replaces, stated precisely rather than from memory: going
# into this pass, `external_ai` had exactly THREE facets sourced from
# the SRC_EDGES loop below (↔ Alex, ↔ RPGACE Architecture, ↔ Oversight
# Docs) and they did NOT render on its Inter tab — FORCE_INFRA_UNITS
# force-flips every edge touching external_ai to 'infra', so all three
# sat in the Infra list next to G78's 12 actor rows, and its Inter tab
# was genuinely EMPTY (0 facets). Only one of the three ("↔ Oversight
# Docs") actually fell through to the 'Direct relationship' dim label;
# the other two carried real dim labels from their own link. All three
# are removed from `external_ai`'s own list (EDGE_FACET_SUPPRESSED_
# UNITS) and REPLACED by the 12 rows below. The reciprocal copy on
# `alex`/`rpgace_architecture`/`oversight_docs` is deliberately
# untouched — those units keep their own ↔ External AI edge exactly as
# before, so nothing about the other side of any edge changes.
#
# Real destination resolution, from EXTERNAL_RIVER_LINKS only — never
# invented. For each of the actor's own real rivers, the deepest
# resolvable destination wins:
#   module grain -> galaxy_map_current.html#mod-<name>, but ONLY when
#                   that river's own RIVER_MODULES list contains a
#                   module whose name genuinely appears in the link
#                   row's own `via` prose (normalized comparison, so
#                   "Beat Log" resolves to `beatLog`). Candidates are
#                   restricted to that river's own modules, which is
#                   what keeps a stray substring in one river's prose
#                   from resolving to another river's module.
#   river grain  -> galaxy_map_module.html#river-<n> when no module is
#                   named. Real, checked reason this is Level 2 and not
#                   galaxy_map_river.html: Level 1 is a single SVG ring
#                   with NO per-river anchor of any kind (verified by
#                   direct id scan of the rendered page), and
#                   galaxy_map_river.py's own river drill-down link is
#                   already `galaxy_map_module.html#river-{n}`. Reusing
#                   that existing convention, not inventing a second.
# 2 of the 12 actors have NO EXTERNAL_RIVER_LINKS row at all and get an
# honest "no known river destination" row with a real, sourced reason
# instead of a fabricated river number.
EDGE_FACET_SUPPRESSED_UNITS = {'external_ai'}
_RIVER_LINK_BY_NAME = {l['name']: l for l in EXTERNAL_RIVER_LINKS}
# Real, sourced reasons for the 2 actors with no river-link evidence.
# Neither is a placeholder: orchestrator_cc's is this file's own
# already-stated fact (it is this session, with no EXTERNAL_CONNECTORS
# row of its own — see CC_UNIT_CONNECTOR's comment); n8n's is read off
# its real EXTERNAL_CONNECTORS row at build time, never re-typed.
MIGRATION_NO_DESTINATION = {
    'orchestrator_cc': (
        'It dispatches across the whole of RPGACE Total Systems — planning, evidence-gathering, '
        'schema/UI/doc work, and every outbound dispatch to the other Total members — so it has no '
        'single river to migrate into, and no EXTERNAL_RIVER_LINKS row was invented to give it one.'
    ),
    'n8n': None,  # built at render time from its own connector row
}


def _mig_norm(s):
    """Lowercase, alphanumerics only — so a river-link row's own prose
    ("River XI's Beat Log") can be matched against a real module name
    (`beatLog`) without either side being re-typed."""
    return ''.join(ch for ch in (s or '').lower() if ch.isalnum())


def _resolve_migration_targets(link_row):
    """[(river_number, module_name_or_None), ...] for one real
    EXTERNAL_RIVER_LINKS row, in that row's own river order."""
    via_norm = _mig_norm(link_row.get('via'))
    out = []
    for r in link_row['rivers']:
        best = None
        for m in RIVER_MODULES.get(r, ()):
            if _mig_norm(m) in via_norm and (best is None or len(m) > len(best)):
                best = m
        out.append((r, best))
    return out


def _river_short(r):
    """'River XI — Content Production Live' -> 'River XI'."""
    full = RIVER_NAME.get(r, f'River {r}')
    return full.split('—')[0].strip()


def build_external_ai_migration_facets():
    """G81 — one real Inter facet per named external AI actor, each
    resolved to its own deepest real destination down the river/module
    hierarchy. Same 12-actor roster as G78's Infra tab (EXTERNAL_AI_
    ACTORS, reused not re-typed), same per-actor share_key, so clicking
    a migration row cross-highlights exactly the units that actor's own
    Infra row already highlights.

    Real share_key note: this file has no river- or module-derived
    share_key convention to match (checked — the only facets here that
    link to a river/module page, the two `alex_ui_path` rows, key on the
    shared THING both units participate in, not on the link target). The
    shared thing for a migration row is the ACTOR, so each row reuses
    that actor's own existing key: a CC unit's real dispatch channel
    (`openmontage_jobs`/`graphify_jobs`) or `galaxy:<gid>` where it has
    none, `connector:<name>`, or `provider:<name>`."""
    rows = []
    for kind, key in EXTERNAL_AI_ACTORS:
        if kind == 'unit':
            g = GALAXY_BY_ID.get(key)
            if not g:
                raise SystemExit(f'G81: no GALAXIES entry for L0 unit {key!r} — roster is stale.')
            icon, label = g['icon'], g['label']
            share = g.get('channel') or f'galaxy:{key}'
            link_name = CC_UNIT_CONNECTOR.get(key)
            fallback_link = CC_UNIT_LINK.get(key)
        else:
            conn = _CONNECTOR_BY_NAME.get(key)
            if not conn:
                raise SystemExit(f'G81: no EXTERNAL_CONNECTORS row named {key!r} — roster is stale.')
            if kind == 'provider':
                prov = next((p for p in ORACLE_PROVIDERS if p['name'] == key), None)
                if not prov:
                    raise SystemExit(f'G81: no ORACLE_PROVIDERS row named {key!r} — roster is stale.')
                icon, share = prov['icon'], f'provider:{key}'
            else:
                icon, share = _connector_icon(key), f'connector:{key}'
            label, link_name = key, key
            fallback_link = 'galaxy_map_externals.html'

        link_row = _RIVER_LINK_BY_NAME.get(link_name) if link_name else None
        if not link_row:
            if key == 'n8n':
                conn = _CONNECTOR_BY_NAME['n8n']
                reason = (f"It has no EXTERNAL_RIVER_LINKS row: its real trigger path is "
                          f"<code>{esc(conn['via'])}</code> — a dev-tooling script, not a river module — and its own "
                          f"status is <code>{esc(conn['status'])}</code> ({esc(conn['note'])})")
            else:
                reason = esc(MIGRATION_NO_DESTINATION.get(key) or 'No EXTERNAL_RIVER_LINKS row exists for this actor.')
            rows.append({
                'kind': 'inter', 'dim': 'Migration (where this actor lands)', 'icon': icon,
                'label': f'{icon} {esc(label)} — ⚪ no known river destination',
                'detail': (f'{reason} <span class="ev">Real evidence grain: EXTERNAL_RIVER_LINKS is the one real '
                           f'source for an external actor\'s river destination, and it holds no row for this actor — '
                           f'so no river number is claimed here rather than one being guessed in.</span>'),
                'share_key': share, 'link': fallback_link,
            })
            continue

        targets = _resolve_migration_targets(link_row)
        parts, links, grains = [], [], []
        for r, mod in targets:
            if mod:
                href = f'galaxy_map_current.html#mod-{mod}'
                parts.append(f'<a href="{href}" target="_blank">{esc(_river_short(r))}’s <code>{esc(mod)}</code></a>')
                grains.append('module')
            else:
                href = f'galaxy_map_module.html#river-{r}'
                parts.append(f'<a href="{href}" target="_blank">{esc(_river_short(r))}</a>')
                grains.append('river')
            links.append(href)
        grain_note = ('module grain — its own via text names a real module in that river'
                      if all(g == 'module' for g in grains) else
                      'river grain — its own via text names no module in that river'
                      if all(g == 'river' for g in grains) else
                      'mixed grain — module where its via text names one, river where it does not')
        rows.append({
            'kind': 'inter', 'dim': 'Migration (where this actor lands)', 'icon': icon,
            'label': f'{icon} {esc(label)} — 🚀 migrates to {" + ".join(parts)}',
            'detail': (f'{esc(link_row["via"])} <span class="ev">Real source: EXTERNAL_RIVER_LINKS[{esc(link_name)}]'
                       f'.rivers = {link_row["rivers"]}, resolved at {grain_note}. '
                       f'Clicking a destination above jumps straight to it; the row itself cross-highlights every '
                       f'other L0 unit this same actor is attached to.</span>'),
            'share_key': share, 'link': links[0],
        })
    return rows


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
        dim_label = EDGE_DIM_OVERRIDE.get(e['id']) or {
            'galaxy_map_decisions.html': 'Decisions (human-confirm gates)',
            'galaxy_map_externals.html': 'Externals',
            'galaxy_map_skill_network.html': 'Skills',
            'galaxy_map_supabase.html': 'Supabase',
            'galaxy_map.html': 'RPGACE Architecture (core chain)',
        }.get(e.get('link'), 'Direct relationship')
        for me, other in ((a, b), (b, a)):
            # G81 — external_ai's own generic "↔ <other unit>" partner
            # rows are replaced by the real 12-actor migration list
            # below. Only MY copy is suppressed: `other`'s reciprocal
            # ↔ External AI row is still appended on its own pass
            # through this loop, exactly as before.
            if me in EDGE_FACET_SUPPRESSED_UNITS:
                continue
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

    # ── G80 PoC (Aug 25 2026) — real, curated Supabase facets for the
    # NON-CODE L0 units. Sourced from SUPABASE_L0_UNIT_TOUCHES
    # (graphify_river_group.py), a real registry whose every entry cites
    # the CLAUDE.md section its fact came from — the same "doc first,
    # mirror second" discipline EXTERNAL_RIVER_LINKS' own `via` strings
    # already follow, and stated as a weaker evidence tier than the
    # anchor-verified rpgace_core.js citations elsewhere on this page.
    #
    # Real gap this closes: compute_all_supabase_table_touches() is a
    # client-side rpgace_core.js scan, so it is structurally unable to
    # see that Orchestrator CC / OpenMontage CC touch a table at all —
    # yet openmontage_jobs is literally the ONLY channel between them.
    # APPENDED, never overwriting: both units keep every facet they
    # already had (orchestrator_cc 1 infra / 6 inter, openmontage_cc
    # 2 infra / 1 inter going into this pass).
    #
    # ── G82 (Aug 25 2026) — the PoC above is now the whole L0.
    #
    # What changed, and what deliberately did NOT: G80 shipped this for
    # 2 units and said the other 7 would join "by adding registry
    # entries, with zero change to this code." That turned out to be
    # true for 3 of them (graphify_cc, skills, alex — pure registry
    # additions, this loop untouched) and honestly wrong for 2, which
    # needed a real second and third DETECTOR rather than curation:
    #   rpgace_architecture — it IS the scanned client-side code, so
    #     curating it by hand would be a drifting copy of machine-
    #     readable truth (rule 8). Mechanical, re-derived every build.
    #   oversight_docs — several oversight HTML docs fetch Supabase
    #     directly from their own inline scripts, in files the
    #     rpgace_core.js scanner structurally cannot see.
    # The remaining 2 (external_ai, supabase) correctly get NOTHING —
    # see L0_SUPABASE_NO_TOUCH_UNITS in graphify_river_group.py for the
    # real reason each is an honest zero rather than a missing entry. No
    # synthetic "no touches" placeholder row is invented for them: a
    # fabricated facet asserting an absence would be a claim this page
    # would then have to keep true, for no reader benefit.
    #
    # APPENDED in every case, never overwriting — every unit keeps the
    # facets it already had.
    for uid in L0_SUPABASE_UNITS:
        if uid not in facets:
            continue
        if uid == 'rpgace_architecture':
            facets[uid].extend(compute_rpgace_architecture_supabase_infra())
        elif uid == 'oversight_docs':
            facets[uid].extend(compute_oversight_docs_supabase_infra())
        else:
            facets[uid].extend(compute_l0_unit_supabase_infra(uid))
        facets[uid].extend(compute_l0_unit_supabase_inter(uid))

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
    # G78 (Aug 25 2026) — External AI's own real, named 12-actor
    # breakdown. This SUPERSEDES the Aug 21 (G70) 3-row "Component:
    # <provider>" list that used to be appended inside the loop above:
    # that fix was real but only covered the 3 Oracle providers, which
    # is exactly the aggregate vagueness Alex called out again this
    # session. All 3 providers are still here — they are 3 of the 12 —
    # carrying the identical `provider:<name>` share_key, so the
    # cross-highlight into rpgace_architecture/alex that G70 built still
    # fires unchanged.
    facets['external_ai'].extend(build_external_ai_actor_facets())
    # G81 (Aug 25 2026) — External AI's Inter tab: the same 12 actors,
    # each as a real click-through into wherever it genuinely lands in
    # the river/module hierarchy. Replaces the 3 suppressed generic
    # partner rows above; scoped to External AI only (a deliberate
    # proof of concept — no other L0 unit or dimension page gets this
    # pattern in this pass).
    facets['external_ai'].extend(build_external_ai_migration_facets())

    sa = next((n for n in HARNESS_NODES if n['id'] == 'self_awareness'), None)
    if sa:
        facets['rpgace_architecture'].append({
            'kind': 'infra', 'dim': 'External AI', 'label': f"{sa['icon']} {sa['label']}",
            'detail': esc(sa['note']), 'share_key': 'self_awareness', 'link': None,
        })

    # G77 (Aug 25 2026) — Alex's Infra tab is now the whole Decisions
    # bubble system, grouped by real river in real flow order. This
    # replaces two separate, narrower blocks that used to live here: the
    # 3 category-grouped facets built from galaxy_map_decisions.py's own
    # 10 gates, and a single extra "Real Choices (1)" bullet naming the
    # one LOGIC_POINTS entry that is genuinely Alex's own toggle. Between
    # them they covered 11 of the real 21 decisions; build_alex_decision_
    # facets() covers all 21 from the one unified source (rule 8).
    alex_decision_facets, _n_decisions = build_alex_decision_facets()
    facets['alex'].extend(alex_decision_facets)

    facets['alex'].append({
        'kind': 'inter', 'dim': 'UI / Dashboard Path', 'label': 'Real dashboard-card → module → decision-fork path',
        'detail': 'G37/G38 — the real Level-4 flow to whichever module a dashboard card opens, then the real Y/N fork (Decisions) Alex actually hits on that path, if any.',
        'share_key': 'alex_ui_path', 'link': 'galaxy_map_alex_path.html',
    })
    facets['rpgace_architecture'].append({
        'kind': 'inter', 'dim': 'UI / Dashboard Path', 'label': 'Real river → dashboard card → primary module chain',
        'detail': 'G38 — all 10 rivers with a real dashboard card, each resolved to its real primary module. Real Aug 21 2026 fold: this content is now Level 2\'s own table view, not a separate page.',
        'share_key': 'alex_ui_path', 'link': 'galaxy_map_module.html',
    })

    for uid in ('rpgace_architecture', 'orchestrator_cc', 'skills', 'oversight_docs'):
        facets[uid].append({
            'kind': 'inter', 'dim': 'Oversight Sync (process-time)', 'label': 'Real push/build/ritual sequencing',
            'detail': 'G55 — which oversight doc/artifact gets touched, in what order, during a push/build or a ritual (Bedtime/Routine/Summary/CEO Loop 2).',
            'share_key': 'oversight_sync', 'link': 'galaxy_map_oversight_sync.html',
        })

    # ── G77 final normalization: Alex's Infra tab holds decisions and
    # nothing else. Real, honest note on what this actually moved, since
    # it is more than the one edge the ask named: going into this pass
    # `alex` really had NINE infra facets, not the five a category-level
    # read suggests — the alex<->rpgace edge, the alex<->external_ai
    # edge, THREE "Uses: <provider>" rows, and four decision facets.
    # Only the decision facets belong on a tab whose whole job is "what
    # can Alex decide". The other four are real relationships and are
    # kept in full, verbatim, with their share_keys intact — they are
    # re-kinded to 'inter' (a real dimension Alex participates in),
    # never deleted, so nothing is lost and every cross-highlight still
    # fires. Scoped to `alex` alone by INFRA_DECISIONS_ONLY_UNITS: the
    # standing "anything touching External AI is Infra" rule is
    # untouched for every other unit.
    #
    # G82 note, so this is a deliberate outcome rather than a surprise:
    # Alex's 3 new Supabase table rows land as 'infra' when built and
    # are re-kinded to 'inter' right here, exactly like the provider
    # rows above them. That is correct and intended — "which tables my
    # confirm click moves" is a real relationship Alex participates in,
    # not one of the 21 things he DECIDES, and his Infra tab is
    # deliberately the decision list and nothing else (his own critique).
    # Nothing is dropped; the rows keep their text, share_keys and
    # cross-highlighting in full on his Inter tab.
    for uid in INFRA_DECISIONS_ONLY_UNITS:
        for f in facets.get(uid, ()):
            if f['kind'] == 'infra' and f['dim'] != DECISIONS_DIM:
                f['kind'] = 'inter'

    return facets


def build_unit_facet_table(facets):
    """G79 (Aug 25 2026) — the 5 bubble-row units' own real facet
    content, as a real table. Alex's own direct ask, pointing at the
    bubble row: "this... i think it should be in table view too."

    Real gap this closes, stated precisely: those 5 units were ALREADY
    rows in the existing 7x7 matrix, and their row headers already
    clicked through into the facet panel (G74). What the table view had
    NO representation of at all was the facet CONTENT itself — the
    matrix only ever shows the 17 hand-curated pairwise EDGES between
    units, never the Infra/Inter dimensions hanging off them. So this is
    a real SECOND table beside the matrix, not an extension of it: the
    two answer genuinely different questions (which units are wired to
    each other vs. what each unit actually carries), and merging them
    would force one grid to mean two things at once.

    Built from the SAME build_facets() data the map/bubble view renders
    (rule 8 — never a second, separately-maintained dataset), one row
    per real unit+kind+dimension. Per R22 ("bubble systems always follow
    and showcase what's on table"), every row links down into the exact
    same bubble destination the map view opens — reusing the existing
    unit-card click path rather than inventing a second one, the same
    mechanism galaxy_map_dimensions.html/galaxy_map_current.html already
    use for their own table-row-to-bubble links."""
    rows = []
    for uid in NEW_BUBBLE_UNITS:
        meta = UNIT_META[uid]
        unit_facets = facets.get(uid, [])
        first = True
        for kind, kind_label in (('infra', '💉 Infra'), ('inter', '🔗 Inter')):
            by_dim = {}
            for f in unit_facets:
                if f['kind'] == kind:
                    by_dim.setdefault(f['dim'], []).append(f)
            if not by_dim:
                rows.append(
                    f'<tr class="uf-row uf-empty"><td class="uf-unit">'
                    + (f'{meta["icon"]} {esc(meta["label"])}' if first else '')
                    + f'</td><td class="uf-kind">{kind_label}</td>'
                    f'<td colspan="2" class="uf-none">no real {kind} facets attached to this unit</td></tr>'
                )
                first = False
                continue
            for dim, fs in by_dim.items():
                rows.append(
                    f'<tr class="uf-row" data-unit="{uid}" data-kind="{kind}" data-dim="{esc(dim)}">'
                    f'<td class="uf-unit">' + (f'{meta["icon"]} {esc(meta["label"])}' if first else '') + '</td>'
                    f'<td class="uf-kind">{kind_label}</td>'
                    f'<td class="uf-dim">{esc(dim)}</td>'
                    f'<td class="uf-n"><b>{len(fs)}</b> <span class="rowjump-cue">🫧</span></td></tr>'
                )
                first = False
    header = ('<tr><th class="uf-h">L0 unit</th><th class="uf-h">Kind</th>'
              '<th class="uf-h">Real dimension</th><th class="uf-h">Facets</th></tr>')
    return header + ''.join(rows)


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
  th.unit-rowhead{{cursor:pointer}}
  th.unit-rowhead:hover{{background:rgba(201,168,76,0.12)}}
  th.unit-rowhead.glow{{box-shadow:inset 0 0 0 2px var(--gold)}}
  .rowjump-cue{{opacity:.45;font-size:10px}}
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
  /* G81 — a facet's own inline links (a migration row's real river/
     module destinations, and the Decisions rows' existing per-decision
     links) had no rule of their own, so they fell through to the
     browser default #0000EE, which is genuinely unreadable on this
     page's near-black background. Matches .facet-link's own already-
     established treatment below rather than inventing a second one. */
  .facet-row a{{color:var(--gold);text-decoration:none}}
  .facet-row a:hover{{text-decoration:underline}}
  .facet-row a code{{color:inherit}}
  .ev{{color:var(--dim);display:block;margin-top:4px;font-size:10.5px}}
  .dec-list{{margin:8px 0 0 18px}}
  .dec-list li{{margin-bottom:6px}}
  /* G77 (Aug 25 2026) — Alex's Decisions bubble system, grouped by real river */
  .dec-list .dkind{{font-size:9.5px;font-weight:700;color:var(--dim);white-space:nowrap}}
  .dec-list a{{color:#E2E2EC;text-decoration:none;border-bottom:1px dotted rgba(201,168,76,0.5)}}
  .dec-list a:hover{{color:var(--gold)}}
  .rrank{{font-size:9.5px;font-weight:400;color:#6a6a78}}
  .flows-toward{{margin-top:10px;padding:8px 11px;border-left:2px solid rgba(74,144,226,0.5);background:rgba(74,144,226,0.06);border-radius:0 6px 6px 0;font-size:11px;line-height:1.6}}
  .flows-toward .ft-cond{{color:var(--dim);font-size:10.5px}}
  /* G79 (Aug 25 2026) — the 5 bubble-row units' own real facet table */
  .uf-wrap{{max-width:820px;margin:28px auto 0;padding:0 24px;overflow-x:auto}}
  #unit-facets{{border-collapse:collapse;width:100%;font-size:11.5px}}
  #unit-facets th,#unit-facets td{{border:1px solid rgba(255,255,255,0.08);padding:7px 10px;text-align:left;vertical-align:top}}
  #unit-facets th.uf-h{{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--gold);font-weight:700}}
  #unit-facets td.uf-unit{{font-weight:700;white-space:nowrap}}
  #unit-facets td.uf-kind{{white-space:nowrap;color:var(--dim)}}
  #unit-facets td.uf-n{{text-align:center;white-space:nowrap}}
  #unit-facets td.uf-none{{color:#6a6a78;font-style:italic}}
  #unit-facets tr.uf-row[data-unit]{{cursor:pointer}}
  #unit-facets tr.uf-row[data-unit]:hover td{{background:rgba(201,168,76,0.09)}}
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
  <p style="margin-top:10px"><b>New Aug 25 2026:</b> 🧑 <b>Alex</b>'s Infra tab is now purely the Decisions bubble system — all 21 real decisions (10 human-confirm gates, 7 curated logic choices, 4 curated text-input points), grouped by the real river each one lives in and ordered by real river flow, from the logging end toward the last untouched action. 🔮 <b>External AI</b>'s Infra tab names all 12 real external AI actors individually — Orchestrator CC, OpenMontage CC, Graphify CC, Composio, librosa, Jina AI, Last.fm, Whisper, n8n, Luna, Moonshot, Anthropic — each with its own real live/dormant/unconfirmed status read straight from source, instead of the vague aggregate it used to show. The <b>Table view</b> now carries the 5 bubble-row units' own facet content too, not just the 7×7 edge matrix.</p>
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

  <div style="text-align:center;font-size:11px;color:var(--dim);max-width:820px;margin:34px auto 0;padding:0 24px">
    <b>G79 (Aug 25 2026)</b> — the 5 bubble-row units' own real facet content, in table form (Alex's own direct ask about the bubble row: "this... i think it should be in table view too"). Those units were already <i>rows</i> in the matrix above, but the matrix only ever shows the 17 hand-curated pairwise <i>edges</i> between units — never what each unit actually carries. This second table is that missing half, built from exactly the same <code>build_facets()</code> data the map view renders, never a second copy. Per R22, the bubble view follows the table: <b>click any row to land on that unit's own bubble, with that exact Infra/Inter choice already made and that dimension already open.</b>
  </div>
  <div class="uf-wrap"><table id="unit-facets">{unit_facet_table}</table></div>
  <div style="text-align:center;font-size:10.5px;color:#6a6a78;max-width:820px;margin:20px auto 0;padding:0 24px 20px">
    G68 (the recursive L0↔river/module/function interaction-matrix idea): this IS the L0 layer's own real matrix. The next matrix layer down is <a href="galaxy_map_dimensions.html">the Dimensions Matrix</a> (now two real grains on one page: every river × every dimension it participates in, and the finer 45 real L2 modules × 5 real dimensions) — genuinely the same recurring shape at a finer grain, not a new page built for this. No new data was invented to answer G68; the matrices already existed, this just names and links the real chain.
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
  Real Aug 25 2026 pass (G77/G78/G79), all three from Alex's own direct
  critique of what these two tabs actually showed: Alex's Infra tab is now
  purely the Decisions bubble system and covers all 21 real decisions from
  <code>galaxy_map_decision_matrix.build_unified()</code> (was 11, assembled
  from two narrower sources), river-grouped and ordered by a real
  <code>RIVER_FLOWS</code>-derived rank; External AI's Infra tab names all 12
  real external AI actors with real per-actor status (was 3 provider rows plus
  3 generic partner edges); and the Table view gained the 5 bubble-row units'
  own real facet content beside the edge matrix. Every facet displaced from
  Alex's Infra tab was re-kinded to his Inter tab, not deleted.
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
    document.querySelectorAll('.unit-card, .unit-node, .unit-rowhead').forEach(function(c) {{ c.classList.remove('glow'); }});
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
      // G79 — data-dimname lets the table view land on this exact
      // group. Purely additive; the existing data-idx open/close
      // mechanic is untouched.
      html += '<div class="dim-group"><div class="dim-head" data-idx="' + i + '" data-dimname="' + dim + '">' + dim + ' <span>(' + byDim[dim].length + ')</span></div><div class="dim-body" id="dimbody-' + i + '">';
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
      // G83 (Aug 25 2026) — Alex's own direct correction: "all of these
      // bubbles should lead somewhere lower in the map, so far they just
      // navigate to list below... i click supabase and it takes me to
      // supabase bubble system without going through the list below".
      // Supabase is the one unit whose lower-level page now HAS a real
      // bubble system of its own (galaxy_map_supabase.html's G83 map
      // view), so it goes straight there. Deliberately scoped to this
      // one unit — the other 8 keep the inline facet panel unchanged
      // until each has a real destination of its own to jump to.
      if (uid === 'supabase') {{
        window.location.href = 'galaxy_map_supabase.html#view-map';
        return;
      }}
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
  // G74 — a matrix ROW header opens that unit's own facet panel: the
  // exact same destination the map view's own unit bubble already goes
  // to, reached by triggering that bubble's own click rather than
  // duplicating any of its logic.
  document.querySelectorAll('th.unit-rowhead').forEach(function(th) {{
    th.addEventListener('click', function() {{
      var uid = th.dataset.unit;
      var card = document.querySelector('.unit-card[data-unit="' + uid + '"]')
              || document.querySelector('.unit-node[data-unit="' + uid + '"]');
      if (!card) return;
      mtToggles.forEach(function(x) {{ x.classList.toggle('active', x.dataset.view === 'map'); }});
      mtViews.forEach(function(v) {{ v.classList.toggle('active', v.id === 'view-map'); }});
      card.click();
    }});
  }});
  // G79 — a facet-table row opens that unit's own bubble with the row's
  // exact Infra/Inter choice already made and its dimension already
  // open. Reuses the map view's own card/kind/dim handlers by
  // triggering them, never a second copy of their logic (rule 8) —
  // same real mechanic as the matrix row headers above.
  document.querySelectorAll('#unit-facets tr.uf-row[data-unit]').forEach(function(tr) {{
    tr.addEventListener('click', function() {{
      var uid = tr.dataset.unit, kind = tr.dataset.kind, dim = tr.dataset.dim;
      var card = document.querySelector('.unit-card[data-unit="' + uid + '"]')
              || document.querySelector('.unit-node[data-unit="' + uid + '"]');
      if (!card) return;
      mtToggles.forEach(function(x) {{ x.classList.toggle('active', x.dataset.view === 'map'); }});
      mtViews.forEach(function(v) {{ v.classList.toggle('active', v.id === 'view-map'); }});
      card.click();
      var kb = document.querySelector('.kind-btn[data-kind="' + kind + '"]');
      if (kb) kb.click();
      var heads = dimGroups.querySelectorAll('.dim-head');
      for (var i = 0; i < heads.length; i++) {{
        if (heads[i].dataset.dimname === dim) {{
          heads[i].click();
          heads[i].scrollIntoView({{behavior:'smooth', block:'center'}});
          break;
        }}
      }}
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
    unit_facet_table = build_unit_facet_table(facets)
    html = TEMPLATE.format(nodes=nodes, edges=edges, legend=legend, itype_legend=itype_legend, W=W, H=H,
                           markers=markers, unit_cards=unit_cards, data_json=json.dumps(data),
                           matrix_rows=matrix_rows, table_details=table_details,
                           unit_facet_table=unit_facet_table)
    OUT.parent.mkdir(exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    # DD7 (Aug 23 2026) — live in-flight ceo_plan_items overlay,
    # injected at the same post-process point as the level rail so a
    # regeneration can never wipe it. See inject_plan_overlay().
    html = inject_plan_overlay(html, 'l0')
    OUT.write_text(html, encoding='utf-8')
    skipped = len(ORACLE_PROVIDER_NAMES) + 3  # +3 = Graphify CC (dup of the real galaxy) + FFmpeg + OpenMontage (both moved to OpenMontage CC's own local cluster)
    n_facets = sum(len(v) for v in facets.values())
    n_alex_infra = len([f for f in facets['alex'] if f['kind'] == 'infra'])
    n_decisions = len(dm_build_unified())
    n_uf_rows = build_unit_facet_table(facets).count('<tr class="uf-row')
    print(f"Wrote {OUT} — {len(GALAXIES)} galaxies, {len(HARNESS_NODES)} harness nodes, "
          f"{len(ORACLE_PROVIDERS)} AI providers under Oracle, "
          f"{len(EXTERNAL_CONNECTORS) - skipped} flat connectors + OpenMontage+FFmpeg (under OpenMontage CC) + Supabase, "
          f"{len(UNIT_ORDER)} real merged L0 units ({n_facets} real facets, infra+inter).")
    print(f"  G77 — Alex Infra: {n_alex_infra} river groups holding all {n_decisions} real unified decisions "
          f"(decisions-only, every other real facet re-kinded to Inter, none dropped).")
    print(f"  G78 — External AI Infra: {len(EXTERNAL_AI_ACTORS)} real named external AI actors.")
    ext_inter = [f for f in facets['external_ai'] if f['kind'] == 'inter']
    n_no_dest = len([f for f in ext_inter if 'no known river destination' in f['label']])
    print(f"  G81 — External AI Inter: {len(ext_inter)} real per-actor migration rows "
          f"({len(ext_inter) - n_no_dest} with a real river/module destination, {n_no_dest} honestly with none); "
          f"{len(EDGE_FACET_SUPPRESSED_UNITS)} unit's generic partner rows suppressed in favour of them.")
    print(f"  G79 — table view: {n_uf_rows} real facet rows across {len(NEW_BUBBLE_UNITS)} bubble-row units.")


if __name__ == '__main__':
    main()
