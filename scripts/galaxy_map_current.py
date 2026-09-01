#!/usr/bin/env python3
"""
galaxy_map_current.py — G47 of the ratified L0/Dimension/River/Module/
Current redefinition (Aug 18 2026). Real REPLACEMENT for Level 3's old
role (a per-module function-call-chain graph) — Alex's own direct words:
"i think we can replace it tbh... level 3 will be a series of currents
and its logic." Absorbs Level 5's curated "core logic" decider framing
(kept as a real ⭐ notable tag, never deleted) and Level 6's exhaustive
branch data (every function's own real handling detail) — real
/deduplication verdict from Part 8 of the ratified plan.

Real per-function unit-bubble tying (4D.2/7B.2): Alex (real UI in/out
evidence), Oracle/External AI (real call-count), Supabase (real
injection-tool table touches). Skills honestly show none at this grain
— no per-function skill citation evidence exists (stated plainly, not
forced; Skills injection is real at River grain only, see G46).

Real "next" hop (4D.2's "what function it ships to next"): reuses
compute_cross_module_function_calls() for the real cross-module case;
same-module call-chain data isn't separately computed by any existing
detector, so honestly shown as "not tracked at this grain" rather than
guessed.

Level 4's OLD role (dashboard-card flow) retires into Module/G48 per
the already-locked plan; this script does NOT touch galaxy_map_level4.py
directly — G48 repurposes that file's own content separately.

**Real Aug 21 2026 fold (G65) — Alex's own direct ask ("nothing
superseded... this should exist for everywhere that has 2 views").**
The real per-module SVG call-chain diagram that used to live as its
own standalone page (galaxy_map_level3.py/.html) is now this page's
own real MAP view per module, toggled against the per-function TABLE
rows already built here. All of Level 3's own real rendering logic
(compute_function_rank/_split_into_bands/_render_band/the per-module
build routine) was moved here VERBATIM — copied, not retyped, to avoid
introducing a bug into carefully-tuned, previously-debugged layout
code (the DFS cycle-guard, the sorted() determinism fix, the rank-band
crowding split all have real, dated bug histories in the old file's
own comments, preserved here unchanged). galaxy_map_level3.py/.html
are deleted outright once this fold was verified working end to end —
every one of the ~22 real cross-references elsewhere in the pipeline
that used to point at galaxy_map_level3.html#mod-X now points at
galaxy_map_current.html#mod-X, same real anchor scheme both scripts
already shared.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    parse_module_ranges, _function_bodies, compute_function_branches,
    compute_function_ui_signals, compute_oracle_call_counts,
    compute_supabase_table_touches, compute_cross_module_function_calls,
    RIVER_MODULES, RIVER_NAME, RIVER_COLOR, CORE_JS,
    parse_module_functions, compute_module_function_flow,
    compute_external_call_sites, compute_lastfm_call_sites,
    compute_outbound_api_call_sites,
    FLOWS_IN, attribute_river_connection_function, LEVEL3_MODULES,
    render_evidence_bubble, render_bubble_row, dimension_index_html, DIMENSION_INDEX_CSS,
    INFRA_DRILLDOWN_CSS,
    compute_load_signal, compute_decision_targets, compute_logic_attribution_targets,
    render_fc_bar,
)
from graphify_river_group import inject_level_rail  # noqa: E402
# G112 — the same shared, fail-loud anchor verification every other
# hand-cited code excerpt in this pipeline already uses (rule 8).
from graphify_river_group import core_js_lines, verify_core_js_anchor  # noqa: E402
from galaxy_map_decision_matrix import LOGIC_POINTS as DECISION_POINTS  # noqa: E402
# G111 (Sep 1 2026) — the real dispersal of the 21 curated decision/logic
# entries onto their home objects, imported from the Decision Matrix's
# own single source of truth rather than re-derived here (rule 8/R22).
from galaxy_map_decision_matrix import (  # noqa: E402
    build_unified as _dm_build_unified, unified_by_module as _dm_by_module,
    build_module_decisions_html, DISPERSED_DECISIONS_CSS,
)
from galaxy_map_decisions import DECISION_POINTS as _DECISION_POINTS  # noqa: E402
from galaxy_map import _curved_edge, _build_markers, barycenter_order  # noqa: E402
from galaxy_map import compute_unit_module_touches, UNIT_META, UNIT_BUBBLE_SYSTEM  # noqa: E402

# G94 (Aug 25 2026) — real, project-wide "which L0 unit's Infra touches
# which specific module" aggregate, computed once (pure function of
# static evidence, rule 8/11). A module touched by exactly 1 of the 5
# real module-grain units (oracle/composio/jina/lastfm/supabase) is
# real Infra; 2+ is a real Inter (a genuine composition, never forced).
MODULE_UNIT_TOUCHES = compute_unit_module_touches()

OUT = Path('graphify-out/galaxy_map_current.html')

# Real Aug 21 2026 fold (G65) — Alex's own direct ask: "everywhere that
# has 2 views" gets a real map/table toggle, and "nothing superseded."
# Level 3's own real function-call-chain SVG renderer (compute_function_
# rank/_split_into_bands/_render_band/build_module_section, all moved
# verbatim from the now-deleted galaxy_map_level3.py — copied, not
# retyped, to avoid introducing a bug into carefully-tuned, previously-
# debugged layout code) becomes this page's real MAP view; the existing
# per-function rows above stay the real TABLE view. Same real anchor
# convention both scripts already shared (`id="mod-{module}"`), so
# every one of the ~22 real `galaxy_map_level3.html#mod-X` links across
# the rest of the pipeline was repointed at `galaxy_map_current.html`
# with zero anchor-scheme change needed.
DECISIONS_BY_FUNC = {(dp['module'], dp['func']): dp for dp in _DECISION_POINTS}
ALEX_COLOR = '#E25454'
ORACLE_COLOR = '#9B59B6'
COMPOSIO_COLOR = '#4CAF82'
LASTFM_COLOR = '#D9534F'
# G105 (Aug 26 2026) — Supabase/Jina AI colors reused verbatim from
# UNIT_META (galaxy_map.py), the one real canonical source every other
# consumer (the L0 map, the connectors page, the .idd-mig cards) already
# reads — never a fresh color invented for a 3rd time (rule 8).
SUPABASE_COLOR = '#2ABFB0'
JINA_COLOR = '#4A90E2'
# G87 (Aug 26 2026) — 3 more real evidence-gated bubble types, all built
# from data this file (or a sibling Dimension page) already computes
# elsewhere, zero new detection code. Rendered as a real, SEPARATE
# collapsed-by-default Tier 2 canvas (G88) rather than 3 more always-on
# rows on the same SVG — see _render_band()'s own comment for the real
# crowding reasoning.
DECISION_COLOR = '#C9A84C'
LOAD_COLOR = '#E8967A'
LOGIC_COLOR = '#7FB3D5'
BAND_LABELS = ['🚪 Entry & Early Logic', '⚙️ Core Logic', '🏁 Output & Terminal']
BAND_THRESHOLD = 15

_river_of = {}
for _r, _mods in RIVER_MODULES.items():
    for _m in _mods:
        _river_of[_m] = _r

# Real, hand-curated notable lookup — {(module, func): decision_point},
# reused directly from Level 5 (rule 8), never re-derived. A decision
# point with no real 'func' key (module-scoped only) is skipped here —
# it stays real Level-5 content, just not attachable to one function.
NOTABLE = {(dp['module'], dp['func']): dp for dp in DECISION_POINTS if dp.get('func')}

# G111 (Sep 1 2026) — the real dispersed-decision index, computed ONCE
# at module scope. build_unified() runs the live anchor verification for
# every curated point, so calling it per-module (45x) would repeat that
# whole check 45 times for identical output — the same memoization
# discipline the G111 pass's own compute_all_oracle_call_counts() fix
# already established in graphify_river_group.py.
DECISIONS_BY_MODULE = _dm_by_module(_dm_build_unified())

# ---------------------------------------------------------------------
# G112 (Sep 1 2026) — Current(L3) page cleanup, PHASE 1.
#
# Alex's own ratified scope, verbatim: "phase it as 1 but start with
# currents instead, get 5 that are most messy with unreadable to normal
# human explanations in code that should be in plain text - with quote
# of pure code for the geeks and you."
#
# WHICH 5, and how they were actually chosen (real evidence, not taste):
# the only thing the compact row shows under "Handling" is a raw dump of
# each real branch CONDITION — literal JavaScript expressions. So the
# genuinely least-readable entries are the ones with the most, and the
# most symbol-dense, raw conditions. Scored every real function in every
# tracked module as
#     branch_count x mean_condition_length x symbol_density
# (symbol density = share of !&|=<>?.()[]{}+-*/%: characters), and took
# the real top 5:
#     careerStatCard._detailFor                    103.1  (18 branches)
#     contentProductionLive._openProductionPanel    68.0  (16 branches)
#     refCorpus.findMatches                         67.4  ( 9 branches)
#     visualOracle._saveDocToProduction             64.6  (17 branches)
#     conidPot._quickDetectPhyla                    64.2  ( 5 branches,
#                                                          66-char mean)
# The other 431 entries are deliberately untouched — this is phase 1.
#
# Every `lines` range below is anchor-verified against the LIVE
# rpgace_core.js at build time by verify_core_js_anchor() (fails loud,
# never renders a stale excerpt), and the quoted code is read straight
# out of the file by core_js_lines() — never retyped, never paraphrased
# as though it were literal source.
PLAIN_ENGLISH = {
    ('careerStatCard', '_detailFor'): {
        'anchor': '  _detailFor: function(it) {',
        'lines': (26497, 26521),
        'headline': 'Turns one row of raw history into the four sentences the career card actually shows you.',
        'input': 'One activity item — a plain object with a `type` string ("proposal", "journal", "beat", and so on) and `row`, the untouched database record it came from.',
        'does': 'It is one long sorting exercise. For each kind of activity it knows where that kind keeps its real information, and it digs the same four answers out of a differently-shaped record every time: what was done, what the outcome was, where it ended up, and why it mattered. Most of the dense-looking conditions are it trying several likely fields in order and settling for the first one that is actually filled in — an accepted taxonomy proposal, for instance, might carry its description as an insight text, a new branch name, or the first line of its explainers, depending on which part of the app created it.',
        'contributes': 'Without this, the career card could only show raw table rows. It is the single translation layer between six unrelated activity tables and one consistent human-readable card.',
        'level': 'Current (L3) — a leaf function inside careerStatCard, itself a module of River II (App Shell & Navigation).',
        'touches': 'No Supabase call and no Oracle call of its own — it is pure formatting over data another function already fetched. Its only real output is text rendered to Alex.',
    },
    ('contentProductionLive', '_openProductionPanel'): {
        'anchor': '  _openProductionPanel: function() {',
        'lines': (22560, 22567),
        'headline': 'Opens the slide-in Production Panel for whichever ConID is currently selected — and builds a different panel depending on what kind of content it is.',
        'input': 'Nothing passed in. It reads the currently-active ConID off the module itself, then fetches that production\'s real `content_type` from Supabase.',
        'does': 'First it refuses to open twice (if the panel is already on screen it stops immediately). Then it builds the panel shell by hand in code — header, close button, scrolling body — and only after the database answers does it decide which set of phases to draw: a tutorial gets the original 3-phase recording flow, a music video gets the 4-phase reference/direction/script/video flow, and OBS raw footage gets its own 4-stage flow. Almost all the branching this function is scored on is that fork, plus the many small "does this ConID already have a script / a treatment / a video job" checks that decide which buttons are live.',
        'contributes': 'This is the real front door to Content Pipeline work. Every stage a beat passes through after Beat Log is reached from this one panel.',
        'level': 'Current (L3) — inside contentProductionLive, a module of River XI (Content Pipeline).',
        'touches': 'Reads `content_productions` from Supabase on every open, and renders directly to Alex. It does not call Oracle itself — the buttons it draws do.',
    },
    ('refCorpus', 'findMatches'): {
        'anchor': '  findMatches: function(bpm, mood, scale, energy, genre) {',
        'lines': (20805, 20838),
        'headline': 'Given a beat\'s tags, scores every reference track in the corpus and returns the closest ones.',
        'input': 'Five values off the beat: BPM, mood, scale, energy and genre. Missing BPM defaults to 130 and missing energy to 3, so it never fails on a half-filled form.',
        'does': 'Pulls the most recent 200 reference tracks and gives each one a score. Tempo is worth the most: within 5 BPM scores 4, within 10 scores 3, within 15 scores 1, and anything further away actively loses 2 points. A matching mood or genre adds 3 each, a matching scale adds 2, and an energy rating within one step adds 2. Anything that ends up at zero or below is dropped, and what is left comes back sorted best-first.',
        'contributes': 'It is how Beat Log suggests comparable tracks. Worth knowing honestly: the `scale` and `genre` columns are still empty for all 32 corpus rows, so two of the five signals contribute nothing in practice today — which is the real reason matches feel repetitive.',
        'level': 'Current (L3) — inside refCorpus, a module of River VII (the Library/Corpus current).',
        'touches': 'One real Supabase read of `reference_tracks`. No Oracle call. Its results feed the UI Alex sees in Beat Log.',
    },
    ('visualOracle', '_saveDocToProduction'): {
        'anchor': '  _saveDocToProduction: function(docSlug, text, productionId, videoJobId) {',
        'lines': (6542, 6561),
        'headline': 'Files a document Oracle just produced onto the right ConID, and moves that ConID forward a stage if the document warrants it.',
        'input': 'A slug naming which document this is (`visual_treatment`, `obs_script`, `captions`), the document text itself, and the ids of the production and video job it belongs to.',
        'does': 'If there is no production to attach to it stops loudly with a visible warning rather than silently dropping the document. Otherwise it reads the production\'s existing documents, adds this one under its slug, and then checks whether arriving should also advance the ConID\'s stage: a visual treatment or an OBS script moves it from Idea to Scripted, and captions move it all the way to Posted. Every one of those checks is deliberately forward-only — it will never drag a ConID backwards past a stage it has genuinely already reached.',
        'contributes': 'This is the join between Oracle producing text and the Content Pipeline knowing progress happened. Before it existed, Alex had to click a separate "mark this stage done" button by hand.',
        'level': 'Current (L3) — inside visualOracle, a module of River III (the Oracle current), writing into River XI\'s data.',
        'touches': 'Reads and then writes `content_productions` (through the server-side write proxy, not the anon key). Renders a toast to Alex on failure.',
    },
    ('conidPot', '_quickDetectPhyla'): {
        'anchor': '  _quickDetectPhyla: function(text) {',
        'lines': (24386, 24395),
        'headline': 'A free, instant guess at which taxonomy phyla an idea belongs to — plain keyword spotting, no AI involved.',
        'input': 'One string: the text of a content idea.',
        'does': 'Lowercases it and checks for a handful of giveaway words. Drums, 808 or kick suggests phylum 2; mix, EQ or compress suggests 4; FL Studio, plugin or VST suggests 6; tutorial, teach or learn suggests 12; YouTube, Instagram or content suggests 13. It returns whichever numbers matched, and an empty list is a perfectly normal answer.',
        'contributes': 'It exists precisely so an Oracle call is not spent on a guess. It is the cheap prefilter the token-cost rule asks for — a real answer when the keywords are obvious, and silence rather than a fabricated one when they are not.',
        'level': 'Current (L3) — inside conidPot, a module of River XI (Content Pipeline).',
        'touches': 'Nothing at all: no Supabase, no Oracle, no network. Pure local string matching, which is the whole point of it.',
    },
}

# G73 (Aug 26 2026) — Alex's own direct ask: "add github repos that are
# used into galaxy map... those might be the missing links that end
# without logical sense." Real evidence gathered before building (not
# guessed): compute_cross_module_function_calls()/compute_module_
# function_flow() confirmed `contentProductionLive._buildVideoPipeline
# Payload` has ZERO outgoing edges of either kind — a genuine real
# terminal in the current diagram — even though it's the actual function
# whose payload gets RPGACE.sb.insert()'d into `openmontage_jobs`
# (rpgace_core.js, ~line 22686), the real hand-off to the separate
# OpenMontage CC Claude Code session operating github.com/calesthio/
# OpenMontage. Every OTHER real terminal in this diagram genuinely has
# no further real relationship; this one specific terminal's "nothing
# calls it" reading was misleading — it hands off externally, just not
# via a code-level call this detector can see. Real, honest, deliberately
# narrow scope: only this one confirmed case is logged here, not a
# guessed broader list — a future real candidate (e.g. a genuine
# Graphify CC hand-off point, if one is ever found with the same
# rigor) gets added to this same dict, never a 2nd copy.
EXTERNAL_HANDOFF_TARGETS = {
    ('contentProductionLive', '_buildVideoPipelinePayload'): {
        'repo': 'calesthio/OpenMontage',
        'url': 'https://github.com/calesthio/OpenMontage',
        'via': 'openmontage_jobs (RPGACE.sb.insert, real async dispatch — see galaxy_map_orchestrator_openmontage.html)',
    },
}

CROSS_CALLS = compute_cross_module_function_calls()
# G87's own global detector calls — computed once, not per-module (both
# are project-wide roll-ups). LOGIC_TARGETS reuses the already-computed
# CROSS_CALLS (rule 8/11 — avoids a 2nd real regex sweep of the whole
# file for the exact same edge set attribute_river_connection_function()
# needs).
DECISION_TARGETS = compute_decision_targets()
LOGIC_TARGETS = compute_logic_attribution_targets(cross_calls=CROSS_CALLS)
NEXT_HOPS = {}
PREV_HOPS = {}
for fm, ff, tm, tf in CROSS_CALLS:
    NEXT_HOPS.setdefault((fm, ff), []).append((tm, tf))
    PREV_HOPS.setdefault((tm, tf), []).append((fm, ff))

MODULES = sorted(m for mods in RIVER_MODULES.values() for m in mods)
KIND_ICON = {'if': '🔀', 'else if': '🔁', 'else': '↩️', 'switch': '🔢'}

# G90 fix (Aug 25 2026) — real, evidenced dead-link bug found during the
# G82 exhaustive link-integrity sweep: 96 same-page cross-references on
# THIS page (from tracked modules' own "next hop" citations) point at
# `#mod-dashDeck` / `#mod-config` / `#mod-leftNav` — real functions
# genuinely called (dashDeck._popup/_closeWidgetPopup/_ensureStash/
# _injectStyles, config.clear, leftNav._renderItem) that Current has
# never rendered a section for, because these 5 modules are the same
# real "cross-cutting, no river" set RIVER_MODULES' own exclusion
# comment already names (config/dashDeck/errorLog/questEngine) plus
# leftNav (a genuine 6th real case this sweep surfaced, not previously
# named anywhere).
#
# Real /interrogation confirmed the fix as a full generalization, not a
# 6-link patch: build_module_section()/build_module_map_inner() never
# actually depended on river membership — _function_bodies() and every
# detector it calls (compute_function_branches/_ui_signals/
# _oracle_call_counts/_supabase_table_touches) parse rpgace_core.js's
# own `/* ===MODULE:x=== */` markers directly via parse_module_ranges(),
# which RIVER_MODULES never gates. So these 5 modules get the exact
# same real Current coverage every river-having module already does —
# a genuinely different, larger, more honest fix than a stub, and the
# one Alex actually confirmed.
CROSS_CUTTING_MODULES = sorted(['config', 'dashDeck', 'errorLog', 'questEngine', 'leftNav'])


def _incoming_attribution_for_module(module_name):
    """Real pairing (moved verbatim from galaxy_map_level3.py, Aug 21
    2026 fold, G65) — reuses the exact same real evidence Level 2's own
    "next function" stub already found (attribute_river_connection_
    function(), rule 8, not re-derived): does any real river-to-river
    connection actually land on ONE OF THIS MODULE'S OWN FUNCTIONS
    specifically? Returns (from_river_num, to_func, reason) or None."""
    rnum = _river_of.get(module_name)
    if rnum is None:
        return None
    for other, note, itype in FLOWS_IN.get(rnum, []):
        attr = attribute_river_connection_function(other, rnum, note, cross_calls=CROSS_CALLS, itype=itype)
        if attr and attr[1] == module_name:
            return (other, attr[2], attr[3])
    return None


def compute_function_rank(funcs, edges):
    """Real, evidence-derived left-to-right rank per function (moved
    verbatim from galaxy_map_level3.py, G65 fold) — real terminals sit
    rightmost, real entry points sit leftmost, everything else ranked
    by real longest FORWARD-path depth from an entry point. Uses a DFS
    with an explicit recursion-stack cycle check (a real back edge is
    still drawn, just excluded from depth) — a real bug fixed against
    all 44 modules before this code was ever moved (contentProduction-
    Live's own _refreshWidget<->_revertToStage cycle)."""
    callers = {f: set() for f in funcs}
    callees = {f: set() for f in funcs}
    for a, b in edges:
        if a in callees:
            callees[a].add(b)
        if b in callers:
            callers[b].add(a)
    init_callees = callees.get('init', set())
    if 'init' in funcs:
        entries = sorted(init_callees) + [f for f in funcs if f != 'init' and not callers.get(f) and f not in init_callees]
    else:
        entries = [f for f in funcs if not callers.get(f)]
    if not entries:
        entries = [f for f in funcs if f != 'init'] or funcs[:1]
        entries = entries[:1]
    depth = {}
    on_stack = set()
    visited = set()

    def visit(f, d):
        if f in on_stack:
            return
        if f in visited and depth.get(f, -1) >= d:
            return
        depth[f] = max(depth.get(f, -1), d)
        visited.add(f)
        on_stack.add(f)
        for c in sorted(callees.get(f, ())):
            visit(c, d + 1)
        on_stack.discard(f)

    for e in entries:
        visit(e, 0)
    for f in funcs:
        depth.setdefault(f, 0)
    return depth


def _split_into_bands(funcs, depth):
    """Real depth-range banding for crowded modules (moved verbatim
    from galaxy_map_level3.py, G65 fold) — splits a module's real
    functions into up to 3 depth-ordered bands by real function count.
    A module at/under BAND_THRESHOLD gets exactly ONE band."""
    if len(funcs) <= BAND_THRESHOLD:
        return [{'label': None, 'funcs': list(funcs)}]
    by_depth = {}
    for f in funcs:
        by_depth.setdefault(depth[f], []).append(f)
    depths_sorted = sorted(by_depth)
    target = len(funcs) / 3
    bands, cur = [], []
    for d in depths_sorted:
        cur.extend(by_depth[d])
        if len(cur) >= target and len(bands) < 2 and d != depths_sorted[-1]:
            bands.append(cur)
            cur = []
    if cur:
        bands.append(cur)
    return [{'label': BAND_LABELS[i] if i < len(BAND_LABELS) else f'Band {i + 1}', 'funcs': b}
            for i, b in enumerate(bands)]


def _render_band(module_name, color, band_funcs, all_module_funcs, depth, edges, ui_sigs,
                  incoming_attr, backdoors, func_to_band, bands, band_idx, alex_y_const, has_backdoors_module,
                  oracle_counts=None, composio_counts=None, lastfm_counts=None,
                  supabase_counts=None, jina_counts=None,
                  decision_targets_mod=None, load_signal_mod=None, logic_targets_mod=None):
    """Real, per-band canvas builder (moved verbatim from galaxy_map_
    level3.py, G65 fold — see that file's own git history for the full
    real design rationale: rank-band split, evidence-gated Alex/Oracle/
    Composio/Last.fm bubbles, real cross-band/backdoor stubs).

    G87/G88 (Aug 26 2026) — 3 more real evidence-gated bubble types
    (Decision/Load/Logic) were the real next step after G105/G106's
    Oracle/Composio/Last.fm/Supabase/Jina AI, but a naive 6th/7th/8th
    always-on row on the SAME canvas would crowd it exactly the way
    Meanders/L2.5 already had to be built to fix a real crowding problem
    once before (G88's own real justification, not invented caution).
    Real fix: Tier 1 (the existing 5, unchanged, zero regression risk)
    stays on the main canvas as before; Tier 2 (Decision/Load/Logic)
    renders as up to 3 SEPARATE, self-contained render_bubble_row()
    panels (G106's own real shared function, reused verbatim — rule 8,
    each type gets its own real hub+leaves diagram rather than being
    force-fit onto the main diagram's own function-node positions) —
    returned separately so the caller can wrap them in a real, native
    `<details>` collapsed-by-default block placed right after the main
    canvas. "Collapsed by default, not all-always-on" is the literal
    G88 ask; native `<details>` was chosen over a JS-driven SVG-viewBox
    resize specifically because it needs no dynamic resizing logic at
    all — normal document flow handles the reveal/reflow for free."""
    band_funcs_set = set(band_funcs)
    band_depths = [depth[f] for f in band_funcs]
    min_d, max_d = min(band_depths, default=0), max(band_depths, default=0)
    buckets = {}
    for f in band_funcs:
        buckets.setdefault(depth[f], []).append(f)
    intra_edges = [(a, b) for a, b in edges if a in band_funcs_set and b in band_funcs_set]
    rank_order = sorted(buckets.keys())
    buckets = barycenter_order(buckets, intra_edges, rank_order)
    max_col = max((len(v) for v in buckets.values()), default=1)
    W = max(1400, 260 + (max_d - min_d) * 260)
    # G105 (Aug 26 2026): margin widened 420->660 — Supabase (+360) and
    # Jina AI (+450) bubbles were added below the pre-existing Oracle/
    # Composio/Last.fm row (max +270); the old margin only cleared the
    # 3 original bubbles, and the 2 new ones (plus the new clickable
    # "jump to..." link text sub_dy+11 adds under each) would have sat
    # inside the real function-node grid instead of above it.
    ALEX_MARGIN = 660
    H = max(700, 90 * (max_col + 1)) + ALEX_MARGIN
    grid_cy = ALEX_MARGIN + (H - ALEX_MARGIN) / 2
    my_backdoors = [(f, tm, tf) for f, tm, tf in backdoors if f in band_funcs_set]
    if my_backdoors:
        W += 260
    STUB_MARGIN = 220
    cross_out = [(a, b) for a, b in edges if a in band_funcs_set and b not in band_funcs_set and b in all_module_funcs]
    cross_in = [(a, b) for a, b in edges if b in band_funcs_set and a not in band_funcs_set and a in all_module_funcs]
    if cross_out or cross_in:
        W += STUB_MARGIN

    pos = {}
    for d, items in buckets.items():
        n = len(items)
        x = STUB_MARGIN if cross_in else 140
        x += (d - min_d) * 260
        for i, f in enumerate(items):
            y = grid_cy + (i - (n - 1) / 2) * 90
            pos[f] = (x, y)

    nodes_svg, edges_svg = [], []
    edge_colors_used = {color, ALEX_COLOR}
    for a, b in intra_edges:
        if a in pos and b in pos:
            ax, ay = pos[a]
            bx, by = pos[b]
            edges_svg.append(_curved_edge(ax, ay, bx, by, color, real=True, r1=26, r2=26))
    for f in band_funcs:
        if f not in pos:
            continue
        x, y = pos[f]
        is_entry = (depth[f] == 0)
        is_leaf = not any(a == f for a, _b in edges)
        icon = '🚪' if is_entry else ('🏁' if is_leaf else '⚙️')
        ring = '3' if is_entry else '2'
        incoming_badge = ''
        if is_entry and incoming_attr and f == incoming_attr[1]:
            from_river_name = RIVER_NAME.get(incoming_attr[0], '').split('—')[0].strip()
            incoming_badge = f'<text x="{x}" y="{y-32}" text-anchor="middle" font-size="8" fill="{color}" opacity="0.9">⬅ from River {incoming_attr[0]} ({from_river_name})</text>'
        nav_badge = ''
        if is_entry and module_name in LEVEL3_MODULES:
            nav_badge = (f'<a href="galaxy_map_module.html#mod-{module_name}">'
                         f'<text x="{x}" y="{y+52}" text-anchor="middle" font-size="7.5" fill="#5FB3D9" text-decoration="underline">🔭 zoom out: Level 2</text></a>')
        elif is_entry:
            # G90 fix (Aug 25 2026) — module_name is a real cross-cutting
            # (no-river) module; galaxy_map_module.py is organized
            # strictly by river and has no section for it at all, so a
            # "zoom out: Level 2" link here would be honestly dead no
            # matter what anchor scheme Level 2 used. Same honest-text
            # discipline render_infra_drilldown() already uses for this
            # exact case — say so plainly, never link to a page that
            # structurally cannot represent this module.
            nav_badge = (f'<text x="{x}" y="{y+52}" text-anchor="middle" font-size="7.5" fill="#5a5a68">'
                         f'⚙️ cross-cutting — no Level 2 (no river)</text>')
        elif is_leaf and (module_name, f) in NOTABLE:
            # NOTABLE (module-scope above) is the exact same real
            # {(module,func): decision_point} shape galaxy_map_level3.py
            # used to keep as its own separate LEVEL5_BY_FUNC — same
            # source (the curated LOGIC_POINTS, now in
            # galaxy_map_decision_matrix.py), same filter,
            # reused directly rather than rebuilt a 2nd time (rule 8).
            dp = NOTABLE[(module_name, f)]
            nav_badge = (f'<a href="galaxy_map_decision_matrix.html#d-{dp["id"]}">'
                         f'<text x="{x}" y="{y+52}" text-anchor="middle" font-size="7.5" fill="{ORACLE_COLOR}" text-decoration="underline">🧠 into the logic: Decision Matrix</text></a>')
        decision_badge = ''
        if (module_name, f) in DECISIONS_BY_FUNC:
            ddp = DECISIONS_BY_FUNC[(module_name, f)]
            decision_badge = (f'<a href="galaxy_map_decisions.html#dp-{ddp["id"]}">'
                               f'<text x="{x}" y="{y+64}" text-anchor="middle" font-size="7.5" fill="#E25454" text-decoration="underline">🚦 decision gate</text></a>')
        # G74 (Aug 25 2026) — the map node now links into its own Table
        # row (#cur-mod-func). Previously the cross-link only ran the
        # other way (a table hop-chip could jump to another function's
        # row) and the map's own nodes were inert; the existing
        # hashchange handler already switches that module to Table view
        # for any #cur- anchor, so this needed no new JS.
        nodes_svg.append(
            f'{incoming_badge}<a href="#cur-{module_name}-{f}" class="drill-link">'
            f'<g class="node"><circle cx="{x}" cy="{y}" r="26" fill="#0f0f1a" stroke="{color}" stroke-width="{ring}" filter="url(#glow)"/>'
            f'<text x="{x}" y="{y+6}" text-anchor="middle" font-size="15">{icon}</text></g>'
            f'<text x="{x}" y="{y+40}" text-anchor="middle" font-size="9.5" fill="{color}">{f}</text></a>{nav_badge}{decision_badge}'
        )

    if cross_out:
        out_x = W - (260 if my_backdoors else 40)
        for i, (a, b) in enumerate(sorted(set(cross_out))):
            if a not in pos:
                continue
            ax, ay = pos[a]
            sy = grid_cy + (i - (len(cross_out) - 1) / 2) * 40
            tgt_band = bands[func_to_band[b]]['label'] if b in func_to_band else '?'
            edges_svg.append(_curved_edge(ax, ay, out_x, sy, color, real=True, dashed=True, r1=26, r2=8))
            nodes_svg.append(
                f'<rect x="{out_x-52}" y="{sy-10}" width="104" height="20" rx="5" fill="#0f0f1a" stroke="{color}" stroke-width="1.2" stroke-dasharray="3,2" opacity="0.85"/>'
                f'<text x="{out_x}" y="{sy+4}" text-anchor="middle" font-size="7.5" fill="{color}">↦ {tgt_band}: {b}</text>'
            )
    if cross_in:
        for i, (a, b) in enumerate(sorted(set(cross_in))):
            if b not in pos:
                continue
            bx, by = pos[b]
            sy = grid_cy + (i - (len(cross_in) - 1) / 2) * 40
            src_band = bands[func_to_band[a]]['label'] if a in func_to_band else '?'
            edges_svg.append(_curved_edge(60, sy, bx, by, color, real=True, dashed=True, r1=8, r2=26))
            nodes_svg.append(
                f'<rect x="8" y="{sy-10}" width="104" height="20" rx="5" fill="#0f0f1a" stroke="{color}" stroke-width="1.2" stroke-dasharray="3,2" opacity="0.85"/>'
                f'<text x="60" y="{sy+4}" text-anchor="middle" font-size="7.5" fill="{color}">⬅ {src_band}: {a}</text>'
            )

    alex_x, alex_y = W / 2, alex_y_const
    n_out = n_in = 0
    for f in band_funcs:
        if f not in pos:
            continue
        sig = ui_sigs.get(f, {})
        fx, fy = pos[f]
        if sig.get('output'):
            n_out += 1
            ox = alex_x + (n_out * 11 if n_out % 2 == 0 else -n_out * 11)
            edges_svg.append(_curved_edge(fx, fy, ox, alex_y, ALEX_COLOR, real=True, dashed=True, r1=26, r2=20, offset_mult=0.6))
        if sig.get('input'):
            n_in += 1
            ix = alex_x + (n_in * 15 if n_in % 2 == 1 else -n_in * 15)
            edges_svg.append(_curved_edge(ix, alex_y, fx, fy, ALEX_COLOR, real=True, dashed=True, r1=20, r2=26, offset_mult=-0.6))
    # Real fix, Aug 26 2026 — Alex's own direct report: "alex is still not
    # clickable in video pipeline." Root cause: this hub was hand-built
    # (deliberately NOT routed through render_evidence_bubble() — see
    # that function's own docstring on why the Alex bubble is a
    # genuinely different bidirectional/uncounted/permanent shape) and
    # simply never got the same real `<a href>` treatment G105/G106 gave
    # every OTHER bubble. UNIT_BUBBLE_SYSTEM['alex'] already names a
    # real destination (galaxy_map_decision_matrix.html) — wired in now,
    # unconditionally (this hub is drawn regardless of this specific
    # module's own evidence count, so its link is real regardless too).
    _alex_href = UNIT_BUBBLE_SYSTEM.get('alex')
    nodes_svg.append(
        f'<a href="{_alex_href}"><g class="node central">'
        f'<circle cx="{alex_x}" cy="{alex_y}" r="34" fill="#0f0f1a" stroke="{ALEX_COLOR}" stroke-width="3.5" filter="url(#glow)"/>'
        f'<text x="{alex_x}" y="{alex_y-4}" text-anchor="middle" font-size="20">🧑</text>'
        f'<text x="{alex_x}" y="{alex_y+50}" text-anchor="middle" font-size="10.5" fill="{ALEX_COLOR}" font-weight="700">Alex</text>'
        f'<text x="{alex_x}" y="{alex_y+64}" text-anchor="middle" font-size="8" fill="{ALEX_COLOR}" opacity="0.85">{n_out} shown to me · {n_in} buttons I press</text>'
        f'<text x="{alex_x}" y="{alex_y+75}" text-anchor="middle" font-size="7" fill="{ALEX_COLOR}" opacity="0.65">🔽 jump to Decision Matrix ↗</text>'
        f'</g></a>'
    )
    edge_colors_used.add(ALEX_COLOR)

    # G108 (Aug 26 2026) — real evidence types actually present on THIS
    # band's own canvas (Tier 1 + Tier 2 both feed into it below); feeds
    # the Full/Choice picker at the call site (render_fc_bar) — a
    # picker button for a type with zero real bubbles here is never
    # built (evidence-gated, same discipline as the bubbles themselves).
    # Alex is deliberately excluded — he's the fixed anchor every other
    # bubble connects FROM, always visible in both modes, never a
    # pickable/hideable option himself.
    band_ev_present = []

    # G74 (Aug 25 2026) — these three bubbles used to be three
    # near-verbatim hand-written copies of the same ~20-line shape.
    # Real, checked generalization into the one shared
    # render_evidence_bubble() (graphify_river_group.py) — output is
    # byte-identical to the copies it replaced, verified by diff. The
    # Alex bubble above is deliberately NOT routed through it: it is a
    # genuinely different shape (bidirectional, uncounted, permanent),
    # see that function's own comment.
    # NOTE: every loop variable here is deliberately `bub_`-prefixed.
    # A first version of this refactor used bare `color`/`label`, which
    # silently SHADOWED this function's own outer `color` (the module's
    # real river colour, still read further down when the intra-edge
    # legend is built) — the legend dots came out Last.fm red instead of
    # the river colour. Caught by the byte-identity diff against the
    # pre-refactor output, not by inspection; kept prefixed so the same
    # shadowing can't quietly return.
    # G105 (Aug 26 2026) — Supabase + Jina AI added (Alex's own direct
    # complaint: these 2 real units touching this exact module were
    # missing from this diagram entirely, only ever shown in the
    # separate static box below). Every bubble now also passes
    # link_href — real click-through into that unit's own Infra bubble
    # system, not inert decoration.
    for bub_counts, bub_y, bub_color, bub_emoji, bub_label, bub_unit in (
        (oracle_counts, alex_y_const + 90, ORACLE_COLOR, '🔮', 'Oracle', 'oracle'),
        (composio_counts, alex_y_const + 180, COMPOSIO_COLOR, '🔗', 'Composio', 'composio'),
        (lastfm_counts, alex_y_const + 270, LASTFM_COLOR, '🎵', 'Last.fm', 'lastfm'),
        (supabase_counts, alex_y_const + 360, SUPABASE_COLOR, '🗄️', 'Supabase', 'supabase'),
        (jina_counts, alex_y_const + 450, JINA_COLOR, '🕷️', 'Jina AI', 'jina'),
    ):
        bub_counts = bub_counts or {}
        band_items = [(f, bub_counts.get(f, 0)) for f in band_funcs
                      if bub_counts.get(f, 0) > 0 and f in pos]
        if not band_items:
            continue
        b_edges, b_nodes = render_evidence_bubble(
            band_items, pos, (W / 2, bub_y), bub_color, bub_emoji, bub_label,
            'function', 'call', _curved_edge, style='function',
            link_href=UNIT_BUBBLE_SYSTEM.get(bub_unit))
        edges_svg.append(f'<g class="ev-group" data-unit="{bub_unit}">{"".join(b_edges)}</g>')
        nodes_svg.append(f'<g class="ev-group" data-unit="{bub_unit}">{"".join(b_nodes)}</g>')
        edge_colors_used.add(bub_color)
        band_ev_present.append((bub_unit, bub_emoji, bub_label, bub_color))

    backdoor_legend = []
    if my_backdoors:
        bx_col = W - 20
        seen_targets = {}
        for fname, target_mod, target_fn in my_backdoors:
            if fname not in pos:
                continue
            seen_targets.setdefault(target_mod, []).append((fname, target_fn))
        n_targets = len(seen_targets) or 1
        for i, (target_mod, calls) in enumerate(seen_targets.items()):
            by = grid_cy + (i - (n_targets - 1) / 2) * 100
            tcolor = RIVER_COLOR.get(_river_of.get(target_mod), '#C9A84C')
            for fname, target_fn in calls:
                fx, fy = pos[fname]
                edges_svg.append(_curved_edge(fx, fy, bx_col, by, tcolor, real=True, dashed=True, r1=26, r2=24))
                edge_colors_used.add(tcolor)
            t_rnum = _river_of.get(target_mod)
            nodes_svg.append(
                f'<a href="galaxy_map_current.html#mod-{target_mod}" class="drill-link"><g class="node">'
                f'<rect x="{bx_col-24}" y="{by-24}" width="48" height="48" rx="10" fill="#0f0f1a" stroke="{tcolor}" stroke-width="2.5" filter="url(#glow)"/>'
                f'<text x="{bx_col}" y="{by+7}" text-anchor="middle" font-size="18">🚪</text></g>'
                f'<text x="{bx_col}" y="{by+42}" text-anchor="middle" font-size="9.5" fill="{tcolor}">{target_mod}</text>'
                f'<text x="{bx_col}" y="{by+54}" text-anchor="middle" font-size="8" fill="{tcolor}" opacity="0.8">River {t_rnum} backdoor</text></a>'
            )
            backdoor_legend.append(
                f'<div class="legend-row small"><span class="dot" style="background:{tcolor}"></span>'
                f'<b>{", ".join(f for f, _t in calls)}</b> → <code>{target_mod}</code> (River {t_rnum}) '
                f'<span class="meta">Real cross-module backdoor — jumps directly to that module\'s own Level-3 chain.</span></div>'
            )

    legend_rows = ''.join(
        f'<div class="legend-row small"><span class="dot" style="background:{color}"></span>'
        f'<code>{a}</code> → <code>{b}</code></div>'
        for a, b in intra_edges
    ) or '<div class="legend-row small"><span class="meta">No real direct same-module calls found between this band\'s own functions.</span></div>'
    legend_rows += ''.join(backdoor_legend)

    # G87/G88 — Tier 2 (Decision/Load/Logic): up to 3 real, SEPARATE
    # render_bubble_row() panels, one per type, each showing only this
    # band's own real functions with that specific evidence.
    #
    # G108 (Aug 26 2026) — real correction, Alex's own direct ask ("full
    # open at default when navigated to"): these used to be collapsed
    # behind a native <details> (real crowding-avoidance reasoning that
    # predated the Full/Choice system). Now folded into the SAME
    # `.ev-group`/picker mechanism Tier 1 just gained above — Full mode
    # shows every real evidence type (Tier 1 AND Tier 2) at once, which
    # is now the honest, Alex-requested meaning of "full"; Choice mode's
    # picker includes these 3 alongside Tier 1's 5, one flat list, one
    # mechanism, not two (rule 8 — the old <details> collapse and the
    # new picker were both solving "too much at once," no need for both).
    tier2_panels = []
    for t_targets, t_color, t_emoji, t_label, t_link_href, t_unit, t_link_label in (
        (decision_targets_mod, DECISION_COLOR, '🗑️', 'Decision', 'galaxy_map_decision_matrix.html', 'decision', 'open Decision Dimension'),
        (load_signal_mod, LOAD_COLOR, '⏳', 'Load', 'galaxy_map_load.html', 'load', 'open Load Dimension'),
        # G111 (Sep 1 2026) — repointed off the retired Logic Dimension
        # page onto the real home of the data this bubble is actually
        # built from. compute_logic_attribution_targets() resolves real
        # RIVER_FLOWS river-to-river connections onto a function; Level
        # 2's own per-river section is where those same RIVER_FLOWS
        # edges genuinely render (verified directly — galaxy_map_
        # module.py imports RIVER_FLOWS/FLOWS_IN/LINKS_BY_RIVER and
        # draws them as its mid-ring bubbles + legend). The retired
        # page was only ever a second presentation of that same data.
        (logic_targets_mod, LOGIC_COLOR, '🧠', 'Logic',
         (f'galaxy_map_module.html#river-{_river_of[module_name]}'
          if module_name in _river_of else 'galaxy_map_module.html'), 'logic',
         'see these river connections at Level 2'),
    ):
        t_targets = t_targets or {}
        leaves = [
            dict(icon='⚙️', label=f, sub=f'{len(reasons)} signal(s)', color=t_color,
                 data={'kind': t_label.lower()})
            for f, reasons in sorted(t_targets.items()) if f in band_funcs_set
        ]
        if not leaves:
            continue
        hub = dict(icon=t_emoji, label=t_label, color=t_color)
        panel_svg = render_bubble_row(hub, leaves, _curved_edge, _build_markers, leaf_r=22, width=900)
        tier2_panels.append(
            f'<div class="tier2-panel ev-group" data-unit="{t_unit}"><div class="tier2-head" style="color:{t_color}">'
            f'{t_emoji} {t_label} — {len(leaves)} real function(s) in this band '
            f'<a href="{t_link_href}" class="drill-link" style="font-size:9px;margin-left:8px">🔽 {t_link_label} ↗</a>'
            f'</div>{panel_svg}</div>'
        )
        band_ev_present.append((t_unit, t_emoji, t_label, t_color))
    tier2_html = ('<div class="tier2-body">' + ''.join(tier2_panels) + '</div>') if tier2_panels else ''

    return W, H, ''.join(edges_svg) + ''.join(nodes_svg), legend_rows, edge_colors_used, tier2_html, band_ev_present


def build_module_map_inner(module_name):
    """Real MAP-view inner content per module (moved + adapted from
    galaxy_map_level3.py's own build_module_section(), G65 fold) —
    returns the SAME real content (rhead/back_btn/legend paragraph/
    band-tabs/band-canvases) that used to be wrapped in its own
    `<section id="mod-{module}">` on the old standalone Level-3 page,
    now returned WITHOUT that wrapper so it can sit inside Current
    Series' own per-module section as the "map" view, alongside the
    existing per-function table view. Zero logic change from the
    original — literally the same computation, same real bug fixes
    (the DFS cycle guard, the sorted() determinism fix, the crowding
    rank-band split) intact."""
    color = RIVER_COLOR.get(_river_of.get(module_name), '#C9A84C')
    all_funcs = parse_module_functions(module_name)
    edges = compute_module_function_flow(module_name)
    depth = compute_function_rank(all_funcs, edges)
    has_init = 'init' in all_funcs
    funcs = [f for f in all_funcs if f != 'init']
    incoming_attr = _incoming_attribution_for_module(module_name)

    ALEX_Y = 95
    backdoors = [(from_func, to_mod, to_func) for from_mod, from_func, to_mod, to_func in CROSS_CALLS
                 if from_mod == module_name and to_mod in LEVEL3_MODULES]
    has_backdoors = bool(backdoors)

    ui_sigs = compute_function_ui_signals(module_name)
    oracle_counts = compute_oracle_call_counts(module_name)
    composio_sites = compute_external_call_sites(module_name)
    composio_counts = {f: len(a) for f, a in composio_sites.items()}
    lastfm_sites = compute_lastfm_call_sites(module_name)
    lastfm_counts = {f: 1 for f in lastfm_sites}
    # G105 (Aug 26 2026) — real fix for Alex's own direct complaint (a
    # screenshot of visualOracle): this diagram drew Oracle/Composio/
    # Last.fm as real evidence-gated bubbles but silently left Supabase
    # and Jina AI off the exact same treatment, so both instead only
    # ever showed up in a separate, disconnected static box
    # (build_module_infra_inter_row) — the real bug he was pointing at.
    # Both reuse already-computed per-function data (rule 8): Supabase
    # via compute_supabase_table_touches() (same function the table view
    # already calls), Jina AI via compute_outbound_api_call_sites()
    # filtered to its own 2 real endpoint labels (the same filter
    # _unit_module_evidence() uses at module grain, applied here at
    # function grain instead).
    supabase_touches = compute_supabase_table_touches(module_name)
    supabase_counts = {f: len(ops) for f, ops in supabase_touches.items() if ops}
    outbound_sites = compute_outbound_api_call_sites(module_name)
    jina_counts = {f: n for f, n in (
        (f, len([lbl for lbl in labels if lbl in ('/api/scout', '/api/bookworm-fetch')]))
        for f, labels in outbound_sites.items()
    ) if n > 0}
    # G87 (Aug 26 2026) — real Tier 2 evidence, per module. DECISION_
    # TARGETS/LOGIC_TARGETS are the project-wide roll-ups (computed once,
    # module-level constants); Load is genuinely per-module (boot-task/
    # nav-trigger/click-trigger detection all take module_name).
    decision_targets_mod = DECISION_TARGETS.get(module_name, {})
    load_signal_mod = compute_load_signal(module_name)
    logic_targets_mod = LOGIC_TARGETS.get(module_name, {})
    if has_init and ui_sigs.get('init') and (ui_sigs['init']['output'] or ui_sigs['init']['input']):
        init_sig = ui_sigs['init']
        anchor = incoming_attr[1] if incoming_attr and incoming_attr[1] in ui_sigs else next(
            (f for f in funcs if depth.get(f) == 0), None)
        if anchor and anchor in ui_sigs:
            ui_sigs[anchor] = {
                'output': ui_sigs[anchor]['output'] or init_sig['output'],
                'input': ui_sigs[anchor]['input'] or init_sig['input'],
                'bridge': ui_sigs[anchor].get('bridge') or (
                    f'{module_name}.init()’s own real event wiring (real entry-point stand-in)'
                    if init_sig['input'] else None),
            }
    bands = _split_into_bands(funcs, depth)
    func_to_band = {f: i for i, b in enumerate(bands) for f in b['funcs']}
    multi_band = len(bands) > 1

    band_tabs = []
    band_canvases = []
    for bi, band in enumerate(bands):
        band_funcs = band['funcs']
        band_id = f'mod-{module_name}-b{bi}' if multi_band else f'mod-{module_name}'
        w, h, svg_inner, legend_rows_b, edge_colors_b, tier2_html, band_ev_present = _render_band(
            module_name, color, band_funcs, funcs, depth, edges, ui_sigs, incoming_attr,
            backdoors, func_to_band, bands, bi, ALEX_Y, has_backdoors, oracle_counts, composio_counts, lastfm_counts,
            supabase_counts, jina_counts, decision_targets_mod, load_signal_mod, logic_targets_mod)
        if multi_band:
            active = ' active' if bi == 0 else ''
            band_tabs.append(
                f'<div class="band-tab{active}" data-band-target="{band_id}">'
                f'{band["label"]} <span class="meta">({len(band_funcs)})</span></div>')
        display = '' if bi == 0 else 'display:none'
        # G108 (Aug 26 2026) — Alex's own direct ask: "level 2 and 3 [get
        # a] choice map view... full open at default." Full (default) =
        # every real evidence bubble (Tier 1 + Tier 2) visible at once,
        # exactly today's rendering. Choice = a picker naming only the
        # real evidence types actually present on THIS band's own canvas.
        #
        # G108 continuation (same day) — Alex's own direct catch, on a
        # small Infra page screenshot: "no point in choice and full map
        # since they are the same and not cluttered." Same real
        # principle applied here: with fewer than 2 real evidence types,
        # Full and Choice render identically, so the toggle is skipped.
        fc_bar_html = render_fc_bar(band_ev_present) if len(band_ev_present) >= 2 else ''
        band_canvases.append(
            f'<div class="band-canvas" id="{band_id}" style="{display}">'
            f'<div class="fc-scope mode-full">{fc_bar_html}'
            f'<div class="canvas-wrap"><svg viewBox="0 0 {w} {h}" width="100%" style="max-width:{w}px;display:block;margin:0 auto">'
            f'<defs><filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
            f'<filter id="edgeglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
            f'{_build_markers(edge_colors_b)}</defs>{svg_inner}</svg></div>'
            f'{tier2_html}'
            f'</div>'
            f'<div class="legend"><h3>Real function-call edges{" — " + band["label"] if band["label"] else ""}</h3>{legend_rows_b}</div>'
            f'</div>'
        )

    rnum = _river_of.get(module_name)
    river_link = f'<a href="galaxy_map_module.html#river-{rnum}">River {rnum}</a>' if rnum else 'an unrouted module'
    back_btn = (f'<a href="galaxy_map_module.html#river-{rnum}" class="back-btn">← Back to River {rnum} (Level 2)</a>'
                if rnum else '')

    init_note = ''
    if has_init:
        init_note = (' <code>init</code> itself is never shown as a node (Alex’s own direct ask) '
                     '— it is real bootstrap PLUMBING (boot-task registration, RPGACE.hooks wiring, '
                     'DOM re-injection on page:show), not this module’s own business logic, and '
                     'nothing inside the module ever really calls it (RPGACE.register()’s own '
                     'machinery does). Its real direct callees are the true starting points instead, '
                     'shown as \U0001F6AA entries.')
    pairing_note = ''
    if incoming_attr:
        pairing_note = (f' The entry marked "⬅ from River {incoming_attr[0]}" is a real, '
                         'evidence-backed pairing — this is the actual function an incoming river '
                         'connection lands on (same evidence Level 2’s own connection stub shows), '
                         'a far more honest stand-in for the removed init than a generic bootstrap '
                         'node ever was.')
    band_note = ''
    if multi_band:
        band_note = (f' This module has {len(funcs)} real functions — too many for one readable '
                     'canvas (Alex\'s own direct call, "level 3 looks very crowded") — split into '
                     f'{len(bands)} real bands by computed depth-range, balanced by real function '
                     'count. A dashed "↦"/"⬅" stub at a band\'s own edge is a real cross-band call, '
                     'never silently dropped — click a band tab below to switch.')

    band_tabs_html = f'<div class="tabs band-tabs">{"".join(band_tabs)}</div>' if multi_band else ''

    return f'''
  <div class="rhead"><span class="rdot" style="background:{color}"></span><h2>⚙️ {module_name} — real function-call chain</h2></div>
  {back_btn}
  <p class="rlegend-role">Drilled down from {river_link}'s own Level-2 module node. 🚪 = a real entry point (nothing calls it, once <code>init</code> is stripped out) · 🏁 = a real leaf/terminal function (calls nothing else in this module) · ⚙️ = an intermediate real function{' · 🚪 (right, dashed) = a real cross-module backdoor' if has_backdoors else ''}. {len(funcs)} real functions, {len(edges)} real direct call edges.{init_note}{pairing_note}{band_note} <b>🧑 Alex</b> (permanent on every module/band) is the real human actor.</p>
  {band_tabs_html}
  {''.join(band_canvases)}
'''


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def build_plain_english(mod, func):
    """G112 phase 1 — the real plain-English rewrite for one of the 5
    genuinely messiest Currents, rendered ALONGSIDE a real quoted
    excerpt of the actual current code (Alex's own "with quote of pure
    code for the geeks and you"), never instead of it.

    Returns '' for every other function — 431 of 436 entries are
    deliberately untouched in this phase."""
    pe = PLAIN_ENGLISH.get((mod, func))
    if not pe:
        return ''
    a, b = pe['lines']
    # Fails loud if the hand-cited range no longer holds its anchor —
    # a moved excerpt is worse than no excerpt, and this project has
    # been saved by exactly this check several times already.
    verify_core_js_anchor(f'{mod}.{func} (G112 plain-English)', pe['anchor'], a, b)
    code = core_js_lines(a, b).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    rows = ''.join(
        f'<div class="pe-row"><b>{label}</b><p>{pe[key]}</p></div>'
        for label, key in (
            ('What it gets', 'input'),
            ('What it actually does', 'does'),
            ('What it contributes', 'contributes'),
            ('Where it sits', 'level'),
            ('What it touches (infra / inter)', 'touches'),
        )
    )
    return (
        '<div class="pe-block">'
        f'<div class="pe-head">📖 In plain English <span class="pe-tag">G112 · rewritten phase 1</span></div>'
        f'<div class="pe-headline">{pe["headline"]}</div>'
        '<div class="pe-grid">'
        f'<div class="pe-prose">{rows}</div>'
        '<div class="pe-code"><div class="pe-code-label">The real code, quoted from '
        f'<code>rpgace_core.js</code> lines {a}–{b} (verified at build time)</div>'
        f'<pre>{code}</pre></div>'
        '</div></div>')


def build_current_block(mod, func, branches, ui, oracle_n, sb_touches, notable):
    badges = []
    if ui.get('input'):
        badges.append('<span class="ubub ub-alex" title="Real input evidence">🧑 in</span>')
    if ui.get('output'):
        badges.append('<span class="ubub ub-alex" title="Real output/render evidence">🧑 out</span>')
    if oracle_n:
        badges.append(f'<span class="ubub ub-oracle" title="Real Oracle call count">🔮 {oracle_n}</span>')
    if sb_touches:
        tables = ', '.join(sorted(set(t for _op, t in sb_touches)))
        badges.append(f'<span class="ubub ub-inject" title="Real Supabase table touch: {esc(tables)}">💉 {esc(tables)}</span>')
    star = '<span class="star" title="Notable — Level 5''s own curated core-logic write-up">⭐</span>' if notable else ''

    branch_rows = ''.join(
        f'<div class="branch-row"><span class="bkind">{KIND_ICON.get(b["kind"], "•")}</span>'
        f'<code>{esc(b["condition"]) if b["condition"] else "(fallback branch)"}</code></div>'
        for b in branches
    ) if branches else '<div class="no-branch">No real conditional branch in this function\'s own body.</div>'
    # Aug 27 2026 (real Alex ask: "the l6 would be great to feed into
    # currents too") — a real, direct link to THIS function's own branch
    # points in the Branch Ledger (Level 6), not a generic "go to Level 6"
    # link. Only rendered when real branch data exists — an empty-branch
    # function has nothing there to link to.
    l6_link = (f'<a class="l6-link" href="galaxy_map_level6.html#fn-{mod}-{esc(func)}" '
               f'title="Every real branch point for this function, in the exhaustive Branch Ledger">'
               f'🔢 See all {len(branches)} in the Branch Ledger →</a>') if branches else ''

    next_chips = ''.join(
        f'<a class="hop-chip" href="#cur-{tm}-{tf}">→ {esc(tm)}.{esc(tf)}()</a>' for tm, tf in NEXT_HOPS.get((mod, func), []))
    prev_chips = ''.join(
        f'<a class="hop-chip" href="#cur-{fm}-{ff}">← {esc(fm)}.{esc(ff)}()</a>' for fm, ff in PREV_HOPS.get((mod, func), []))
    handoff = EXTERNAL_HANDOFF_TARGETS.get((mod, func))
    if not next_chips and handoff:
        next_chips = f'<a class="hop-chip handoff" href="{handoff["url"]}">🐙 hands off to {esc(handoff["repo"])} ↗</a>'
    elif not next_chips:
        next_chips = '<span class="meta">not tracked at this grain (same-module hop, or a genuine terminal)</span>'
    if not prev_chips:
        prev_chips = '<span class="meta">not tracked at this grain, or a genuine real entry point</span>'

    notable_html = ''
    if notable:
        notable_html = (f'<div class="notable-box"><div class="nb-title">⭐ {esc(notable["title"])}</div>'
                         f'<div class="nb-row"><b>Decider:</b> {esc(notable["decider"])}</div>'
                         f'<div class="nb-row"><b>Decides:</b> {esc(notable["decides"])}</div>'
                         f'<div class="nb-row"><b>Result:</b> {esc(notable["result"])}</div></div>')

    return f'''<div class="current-block" id="cur-{mod}-{func}">
  <div class="cur-head"><span class="cur-name">{esc(func)}()</span>{''.join(badges)}{star}</div>
  {build_plain_english(mod, func)}
  <div class="cur-io">
    <div class="io-col"><div class="io-label">⬅ Input</div>{prev_chips}</div>
    <div class="io-col"><div class="io-label">Handling ({len(branches)} real branch point(s))</div>{branch_rows}{l6_link}</div>
    <div class="io-col"><div class="io-label">Output → Next ➡</div>{next_chips}</div>
  </div>
  {notable_html}
  {build_walkthrough_details(mod, func, badges, branches, notable)}
</div>'''


def build_walkthrough_details(mod, func, badges, branches, notable):
    """G75 (Aug 25 2026) — the real per-Current zoomed walkthrough,
    folded IN from the now-deleted galaxy_map_zoom.py as an inline
    expand-for-detail block instead of a separate 451-card page.

    Real reason for the fold: galaxy_map_zoom.py already imported
    EVERY one of its data structures from this file (MODULES, NEXT_HOPS,
    PREV_HOPS, NOTABLE, KIND_ICON, esc) and computed nothing of its own
    — it was a second rendering of this page's data at the same grain,
    which is a view, not a level.

    What it genuinely carried that the compact row above does NOT, all
    preserved here rather than quietly dropped in the merge:
      * spelled-out badge wording instead of the compact chips;
      * an explicit real-entry-point / real-terminal statement, rather
        than the row's terser "not tracked at this grain";
      * the ⚡ module-boundary note when the next hop leaves this module;
      * the notable point's own `changes` field, which the compact
        row never rendered at all.
    """
    prev_hops = PREV_HOPS.get((mod, func), [])
    next_hops = NEXT_HOPS.get((mod, func), [])

    long_badges = []
    if any('🧑 in' in b for b in badges):
        long_badges.append('<span class="ubub ub-alex">🧑 real input evidence</span>')
    if any('🧑 out' in b for b in badges):
        long_badges.append('<span class="ubub ub-alex">🧑 real output/render evidence</span>')
    for b in badges:
        if '🔮' in b or '💉' in b:
            long_badges.append(b)
    badges_html = ''.join(long_badges) or \
        '<span class="meta">No real Alex/Oracle/Supabase signal detected on this specific function.</span>'

    prev_html = ''.join(
        f'<a class="hop-btn" href="#cur-{fm}-{ff}">← {esc(fm)}.{esc(ff)}()</a>' for fm, ff in prev_hops) or \
        '<span class="meta">No real cross-module caller detected — a genuine real entry point, or same-module (not tracked at this grain).</span>'
    handoff = EXTERNAL_HANDOFF_TARGETS.get((mod, func))
    next_html = ''.join(
        f'<a class="hop-btn hop-next" href="#cur-{tm}-{tf}">Continue → {esc(tm)}.{esc(tf)}() →</a>' for tm, tf in next_hops)
    if not next_html and handoff:
        # G73 — a real, confirmed external hand-off: this terminal's real
        # downstream is a SEPARATE Claude Code session's own repo, not a
        # code-level call this detector could ever see.
        next_html = (f'<a class="hop-btn hop-next handoff" href="{handoff["url"]}">'
                     f'🐙 Continue → {esc(handoff["repo"])} (external repo) →</a>'
                     f'<div class="handoff-note">Real hand-off via <code>{esc(handoff["via"])}</code> — '
                     f'polled/picked up by a separate Claude Code session operating that repo, not a same-codebase call.</div>')
    elif not next_html:
        next_html = '<span class="meta terminal">🏁 Real terminal — no further cross-module hop detected. The chain ends here, or continues within the same module (not tracked at this grain).</span>'

    boundary_note = ''
    if next_hops and any(tm != mod for tm, _tf in next_hops):
        boundary_note = '<div class="boundary">⚡ Crossing into a new module here — the natural real stopping point.</div>'

    changes_html = ''
    if notable and notable.get('changes'):
        changes_html = (f'<div class="zsection"><div class="zlabel">⭐ What changes (real input to the decision)</div>'
                        f'<p class="zprose">{esc(notable["changes"])}</p></div>')

    return f'''<details class="cur-zoom">
  <summary>🔎 Expand walkthrough detail</summary>
  <div class="zoom-body">
    <div class="badges">{badges_html}</div>
    <div class="zsection"><div class="zlabel">⬅ Input — what fed this Current</div>{prev_html}</div>
    <div class="zsection"><div class="zlabel">Handling — {len(branches)} real branch point(s)</div>
      <span class="meta">Listed in full in the Handling column above.</span></div>
    {changes_html}
    <div class="zsection"><div class="zlabel">Output → Next Current ➡</div>{next_html}</div>
    {boundary_note}
  </div>
</details>'''


def build_module_infra_inter_row(mod):
    """G94 (Aug 25 2026) — real Infra and/or Inter bubbles for this
    specific module, whichever real evidence supports. Exactly 1
    touching unit is Infra (a real attached resource); 2+ is a real
    Inter (a genuine composition, e.g. beatLog: lastfm+oracle+supabase
    all really do land on the same module). Honestly empty for the 12
    of 45 modules no real evidence touches at all — no placeholder
    row invented for those.

    G105 (Aug 26 2026), real correction — Alex's own direct complaint,
    a screenshot of visualOracle: this static box and the real MAP-view
    evidence bubbles (Oracle/Composio/Last.fm, now also Supabase/Jina
    AI) were both showing the SAME real relationship, disconnected from
    each other — this box floating above the diagram, the bubbles
    living inside it. Now that all 5 real module-grain units
    (_BUBBLE_COVERED_UNITS, MODULE_UNIT_TOUCHES's own full real key set)
    get a genuine positioned, clickable bubble directly in the diagram,
    this box is filtered down to a real SAFETY NET only — a unit that
    genuinely touches this module (MODULE_UNIT_TOUCHES) but isn't one
    of the 5 the diagram already draws. Currently always empty (every
    real unit IS one of the 5), by construction, not luck — kept rather
    than deleted so a future 6th unit added to _unit_module_evidence()
    without a matching diagram bubble doesn't silently vanish from both
    places at once, the exact failure class this fix exists to close."""
    _BUBBLE_COVERED_UNITS = {'oracle', 'composio', 'jina', 'lastfm', 'supabase'}
    units = sorted(u for u in MODULE_UNIT_TOUCHES.get(mod, ()) if u not in _BUBBLE_COVERED_UNITS)
    if not units:
        return ''
    kind = 'infra' if len(units) == 1 else 'inter'
    kind_label = '💉 Infra' if kind == 'infra' else f'🔗 Inter ({len(units)} units compose here)'
    # G94 real fix (Aug 26 2026, Alex's own direct report: "still not
    # clickable and no supabase migration bubble still") — root cause,
    # confirmed by direct HTML read: the link WAS always real and
    # clickable, but its own bespoke `.unit-chip` pill style read as
    # plain, unstyled text next to everything else on the page, nothing
    # like the real ".idd-mig" migration-bubble shape every OTHER real
    # Infra drilldown in this whole system already uses (Oracle/
    # Supabase/Connectors' own pages). Reused verbatim here instead of
    # a 2nd bespoke style (rule 8) — a real card with a colored left
    # border and an explicit "jump" cue, immediately recognizable as
    # the same interactive element type everywhere else in the system.
    bubbles = ''.join(
        f'<a class="idd-mig" style="--c:{UNIT_META[u]["color"]}" href="{UNIT_BUBBLE_SYSTEM.get(u, "#")}">'
        f'<b>{UNIT_META[u]["icon"]} {UNIT_META[u]["label"]}</b>'
        f'<span class="idd-jump">🔽 jump to this unit\'s own Infra bubble system ↗</span></a>'
        for u in units)
    return (f'<div class="mod-infra-row"><span class="mod-infra-label">{kind_label}</span>'
            f'<div class="mod-infra-bubbles">{bubbles}</div></div>')


def build_module_section(mod):
    branches = compute_function_branches(mod)
    ui_sigs = compute_function_ui_signals(mod)
    oracle_counts = compute_oracle_call_counts(mod)
    sb_touches = compute_supabase_table_touches(mod)
    funcs = sorted(_function_bodies(mod).keys())
    rnum = _river_of.get(mod)
    river_label = RIVER_NAME.get(rnum, '').split('—')[0].strip() if rnum else ''
    blocks = ''.join(
        build_current_block(mod, f, branches.get(f, []), ui_sigs.get(f, {}),
                             oracle_counts.get(f, 0), sb_touches.get(f, []),
                             NOTABLE.get((mod, f)))
        for f in funcs
    )
    # Real Aug 21 2026 fold (G65) — the old separate Level 3 page's own
    # per-module SVG call-chain diagram is now this section's real MAP
    # view; the per-function rows above (already built) are the real
    # TABLE view. Same real `id="mod-{mod}"` anchor either script always
    # used, so nothing outside this file needed a scheme change.
    map_inner = build_module_map_inner(mod)
    infra_inter_row = build_module_infra_inter_row(mod)
    # G111 — this module's own dispersed curated decisions, if it has
    # any. Evidence-gated inside the helper (returns '' for the 32 of
    # 45 modules that genuinely carry none), so no empty box appears.
    decisions_row = build_module_decisions_html(mod, DECISIONS_BY_MODULE)
    return f'''<section class="mod-section" id="mod-{mod}" style="display:none">
  <div class="mhead"><h2>{mod}</h2><span class="river-chip">{river_label}</span>
    <span class="mtotal">{len(funcs)} real Current(s)</span></div>
  {infra_inter_row}
  {decisions_row}
  <div class="cur-toggle-row">
    <div class="cur-toggle-btn active" data-view="map">🔽 Map view</div>
    <div class="cur-toggle-btn" data-view="table">📊 Table view</div>
  </div>
  <div class="cur-view active" data-modview="map-{mod}">{map_inner}</div>
  <div class="cur-view" data-modview="table-{mod}">
    <div class="currents">{blocks}</div>
  </div>
</section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Current Series)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --purple:#9B59B6; --red:#E25454; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 20%, #14101e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto;line-height:1.6}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;flex-wrap:wrap}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--gold);padding:4px 9px;border-radius:12px}}
  .modpicker{{max-width:1100px;margin:16px auto;padding:0 24px;display:flex;gap:5px;flex-wrap:wrap;justify-content:center}}
  .mod-tab{{padding:4px 10px;border-radius:14px;font-size:9.5px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .mod-tab.active{{background:var(--gold);color:#1a1608;font-weight:700}}
  .mod-tab-sep{{width:100%;text-align:center;font-size:9px;font-weight:700;letter-spacing:1px;color:#5a5a68;margin:6px 0 2px}}
  .mhead{{display:flex;align-items:center;gap:10px;padding:20px 24px 6px;max-width:900px;margin:0 auto;flex-wrap:wrap}}
  .mhead h2{{font-family:Georgia,serif;font-size:18px;color:#fff}}
  .river-chip{{font-size:9.5px;padding:2px 8px;border-radius:8px;background:rgba(255,255,255,0.06);color:var(--dim)}}
  .mtotal{{font-size:9.5px;color:var(--dim)}}
  .l3-link{{margin-left:auto;font-size:9.5px;color:var(--dim);text-decoration:none}}
  /* G94 (Aug 25/26 2026) — real per-module Infra/Inter bubble row.
     Real fix (Aug 26): the migration bubbles reuse .idd-mig verbatim
     (INFRA_DRILLDOWN_CSS below) instead of a bespoke pill style that
     read as plain text — see build_module_infra_inter_row()'s own
     comment for the full root-cause account. */
  .mod-infra-row{{max-width:900px;margin:0 auto;padding:0 24px 10px}}
  .mod-infra-label{{display:block;font-size:9.5px;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px}}
  .mod-infra-bubbles{{display:flex;gap:10px;flex-wrap:wrap}}
  .currents{{max-width:900px;margin:0 auto 40px;padding:0 24px;display:flex;flex-direction:column;gap:12px}}
  .current-block{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px 16px}}
  .cur-head{{display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap}}
  .cur-name{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:12.5px;color:var(--gold);font-weight:700}}
  .ubub{{font-size:9px;font-weight:700;padding:2px 7px;border-radius:8px}}
  .ub-alex{{background:rgba(226,84,84,0.12);color:var(--red)}}
  .ub-oracle{{background:rgba(155,89,182,0.14);color:var(--purple)}}
  .ub-inject{{background:rgba(42,191,176,0.12);color:#2ABFB0}}
  .star{{font-size:12px}}
  .cur-io{{display:grid;grid-template-columns:1fr 2fr 1fr;gap:10px}}
  .io-col{{font-size:10px}}
  .io-label{{font-size:8.5px;font-weight:700;color:var(--dim);text-transform:uppercase;margin-bottom:5px}}
  .hop-chip{{display:block;color:var(--gold);text-decoration:none;font-size:9.5px;margin-bottom:3px}}
  .l6-link{{display:block;color:var(--purple);text-decoration:none;font-size:9.5px;margin-top:6px;font-weight:700}}
  .l6-link:hover{{text-decoration:underline}}
  .branch-row{{display:flex;gap:6px;margin-bottom:3px;align-items:baseline}}
  .bkind{{opacity:0.7}}
  .no-branch,.meta{{color:#5a5a68;font-size:9.5px}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:9.5px;background:rgba(255,255,255,0.05);padding:1px 4px;border-radius:3px}}
  .notable-box{{margin-top:10px;padding:10px 12px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.25);border-radius:8px;font-size:10.5px;line-height:1.6}}
  .nb-title{{font-weight:700;color:var(--gold);margin-bottom:4px}}
  /* G75 — the folded-in per-Current zoomed walkthrough (was its own page). */
  .cur-zoom{{margin-top:10px;border-top:1px dashed rgba(255,255,255,0.1);padding-top:8px}}
  .cur-zoom summary{{cursor:pointer;font-size:10px;color:var(--dim);list-style:none}}
  .cur-zoom summary::-webkit-details-marker{{display:none}}
  .cur-zoom summary:hover{{color:var(--gold)}}
  .cur-zoom[open] summary{{color:var(--gold);margin-bottom:8px}}
  .zoom-body{{padding:4px 2px 2px}}
  .zoom-body .badges{{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}}
  .zsection{{margin-bottom:12px}}
  .zlabel{{font-size:9.5px;font-weight:700;color:var(--dim);text-transform:uppercase;margin-bottom:6px}}
  .zprose{{font-size:10.5px;line-height:1.6;color:#c8c8d8}}
  .hop-btn{{display:inline-block;color:var(--gold);text-decoration:none;font-size:10.5px;padding:5px 10px;border:1px solid rgba(201,168,76,0.3);border-radius:8px;margin:0 6px 6px 0}}
  .hop-next{{background:rgba(201,168,76,0.1);font-weight:700}}
  .terminal{{color:var(--gold)}}
  .boundary{{font-size:10px;color:var(--gold);margin-top:6px}}
  /* G73 (Aug 26 2026) — a real, confirmed external hand-off terminal
     (github.com/calesthio/OpenMontage), styled distinctly from a
     same-codebase hop so it reads as "leaves RPGACE entirely," not just
     "the next function in a normal chain." */
  .hop-chip.handoff{{color:#8ec5ff}}
  .hop-btn.handoff{{color:#8ec5ff;border-color:rgba(142,197,255,0.35);background:rgba(142,197,255,0.08)}}
  .handoff-note{{font-size:9px;color:var(--dim);margin-top:6px;line-height:1.5}}
  /* G112 (Sep 1 2026) — the plain-English rewrite block. Prose and the
     real quoted code sit side by side ("alongside", Alex's own word),
     collapsing to one column on a narrow screen rather than forcing a
     horizontal scroll. */
  .pe-block{{margin:10px 0 12px;border:1px solid rgba(127,179,213,0.3);border-radius:10px;
    background:rgba(127,179,213,0.05);padding:11px 13px}}
  .pe-head{{font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#7FB3D5;margin-bottom:5px}}
  .pe-tag{{font-size:8.5px;font-weight:700;color:var(--dim);margin-left:8px;letter-spacing:.3px}}
  .pe-headline{{font-size:13px;color:#fff;line-height:1.55;margin-bottom:10px}}
  .pe-grid{{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:14px}}
  @media (max-width:900px){{ .pe-grid{{grid-template-columns:1fr}} }}
  .pe-row{{margin-bottom:9px}}
  .pe-row b{{display:block;font-size:9.5px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#7FB3D5;margin-bottom:3px}}
  .pe-row p{{font-size:11.5px;color:#c8c8d8;line-height:1.72}}
  .pe-code-label{{font-size:9.5px;color:var(--dim);margin-bottom:5px;line-height:1.5}}
  .pe-code pre{{background:rgba(0,0,0,0.42);border:1px solid rgba(255,255,255,0.08);border-radius:7px;
    padding:9px 11px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:9.5px;line-height:1.55;
    color:#b6d4e8;overflow-x:auto;max-height:420px;overflow-y:auto;white-space:pre}}
{dd_css}
{idd_css}
{dim_css}
  a{{color:var(--gold)}}
  .note{{max-width:900px;margin:20px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  /* Real Aug 21 2026 fold (G65) — Level 3's own real CSS, moved verbatim
     (never re-derived) for the new per-module map view. */
  .cur-toggle-row{{display:flex;justify-content:center;gap:8px;padding:10px 24px 0}}
  .cur-toggle-btn{{padding:6px 16px;border-radius:14px;font-size:11px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .cur-toggle-btn.active{{background:var(--gold);color:#1a1608;border-color:var(--gold)}}
  .cur-view{{display:none}}
  .cur-view.active{{display:block}}
  .tabs{{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}}
  .tab{{padding:6px 14px;border-radius:16px;font-size:11.5px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .tab.active{{background:var(--gold);color:#1a1a12;font-weight:700}}
  .band-tabs{{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding:6px 24px 10px}}
  .band-tab{{padding:5px 12px;border-radius:14px;font-size:10.5px;cursor:pointer;background:rgba(255,255,255,0.04);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .band-tab .meta{{opacity:0.7}}
  .band-tab.active{{background:var(--gold);color:#1a1a12;font-weight:700;border-color:var(--gold)}}
  .rhead{{display:flex;align-items:center;gap:10px;justify-content:center;padding:16px 24px 6px}}
  .rdot{{width:12px;height:12px;border-radius:50%}}
  .rhead h2{{font-family:Georgia,serif;font-size:19px;color:#fff}}
  .rlegend-role{{text-align:center;color:var(--dim);font-size:11.5px;max-width:820px;margin:0 auto 16px;line-height:1.6;padding:0 24px}}
  .back-btn{{display:block;text-align:center;font-size:11px;font-weight:700;color:var(--gold);text-decoration:none;margin:0 0 10px}}
  .back-btn:hover{{text-decoration:underline}}
  .canvas-wrap{{max-width:1600px;margin:0 auto;overflow-x:auto}}
  svg text{{font-family:'Segoe UI',system-ui,sans-serif;user-select:none}}
  .legend{{max-width:820px;margin:16px auto 40px;padding:0 24px}}
  .legend h3{{font-family:Georgia,serif;font-size:14px;color:var(--gold);margin:0 0 8px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px}}
  .legend-row{{font-size:11.5px;color:var(--dim);padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04)}}
  .dot{{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px}}
  /* G87/G88 (Aug 26 2026) — Tier 2 (Decision/Load/Logic) panels.
     G108 (same day) — the old collapsed-by-default <details> wrapper
     is gone (superseded by the Full/Choice `.ev-group` picker above
     each band-canvas, which now governs Tier 1 AND Tier 2 together as
     one mechanism, not two — rule 8); this is now plain always-there
     markup, gated only by that shared mechanism's CSS. */
  .tier2-body{{max-width:900px;margin:8px auto 0;padding:0 24px;display:flex;flex-direction:column;gap:14px}}
  .tier2-panel{{padding-top:8px;border-top:1px dashed rgba(255,255,255,0.1)}}
  .tier2-head{{font-size:10.5px;font-weight:700;margin-bottom:2px}}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Current Series</div>
  <h1>🧬 Every Module, as a Series of Currents</h1>
  <p>{n_funcs} real Currents (functions) across {n_mods} modules. This is the deepest real <b>containment</b> step of the map: L0 galaxies contain L1 rivers, which contain L2 modules, which contain these. ⭐ = a curated "core logic" write-up (full text on the <a href="galaxy_map_decision_matrix.html">Decision Matrix</a>). 🧑 = real Alex/UI input-output evidence. 🔮 = real Oracle call count. 💉 = a real Supabase injection-tool touch. Pick a module below, then choose 🔽 Map (the real function-call-chain diagram — every node links into its own Table row) or 📊 Table (per-function input/handling/output rows, each with a real <b>🔎 Expand walkthrough detail</b> toggle, folded in from the retired Zoom/L4 page) — same real data, three depths.</p>
</div>
<div class="modpicker">{mod_tabs}</div>
{mod_sections}
{dim_index}
<div class="note">
  Generated by <code>scripts/galaxy_map_current.py</code> — real data from
  <code>compute_function_branches()</code> (Level 6's own exhaustive detector, reused not re-derived),
  the curated core-logic points (<code>LOGIC_POINTS</code>, now in <code>galaxy_map_decision_matrix.py</code>),
  and the real per-function Alex/Oracle/Supabase
  signals already proven elsewhere in this pipeline. Real Aug 21 2026 fold (G65): the old standalone
  Level 3 page's own real per-module SVG call-chain diagram (<code>compute_function_rank</code>/
  <code>_split_into_bands</code>/<code>_render_band</code>, moved verbatim, not retyped) is now this
  page's own real Map view per module, toggled against the Table view above — <code>galaxy_map_level3.py</code>/
  <code>.html</code> deleted outright, nothing left superseded.
</div>
<script>
(function() {{
  var tabs = document.querySelectorAll('.mod-tab');
  var sections = document.querySelectorAll('.mod-section');
  function show(id) {{
    sections.forEach(function(s) {{ s.style.display = (s.id === id) ? '' : 'none'; }});
    tabs.forEach(function(t) {{ t.classList.toggle('active', t.dataset.target === id); }});
  }}
  tabs.forEach(function(t) {{ t.addEventListener('click', function() {{ location.hash = t.dataset.target; }}); }});
  window.addEventListener('hashchange', function() {{
    var raw = location.hash.replace('#', '');
    var id = raw.startsWith('cur-') ? 'mod-' + raw.split('-')[1] : (raw || (sections[0] && sections[0].id));
    show(id);
    if (raw.startsWith('cur-')) {{
      // Real cross-link: a #cur-mod-func anchor only exists in the
      // Table view, so jumping there must switch that module's own
      // toggle to Table first, same real cross-view discipline every
      // other page's toggle already uses.
      var sec = document.getElementById(id);
      if (sec) {{
        sec.querySelectorAll('.cur-toggle-btn').forEach(function(b) {{ b.classList.toggle('active', b.dataset.view === 'table'); }});
        sec.querySelectorAll('.cur-view').forEach(function(v) {{ v.classList.toggle('active', v.dataset.modview.indexOf('table-') === 0); }});
      }}
      setTimeout(function() {{ var el = document.getElementById(raw); if (el) el.scrollIntoView({{block:'center'}}); }}, 60);
    }}
  }});
  var id0raw = location.hash.replace('#', '');
  var id0 = id0raw.startsWith('cur-') ? 'mod-' + id0raw.split('-')[1] : (id0raw || (sections[0] && sections[0].id));
  show(id0);
}})();
(function() {{
  // Real per-module Map/Table toggle (G65) — scoped to the clicked
  // button's own .mod-section, never global, since every module has
  // its own independent toggle state.
  document.querySelectorAll('.cur-toggle-btn').forEach(function(btn) {{
    btn.addEventListener('click', function() {{
      var sec = btn.closest('.mod-section');
      sec.querySelectorAll('.cur-toggle-btn').forEach(function(b) {{ b.classList.toggle('active', b === btn); }});
      sec.querySelectorAll('.cur-view').forEach(function(v) {{
        v.classList.toggle('active', v.dataset.modview.indexOf(btn.dataset.view + '-') === 0);
      }});
    }});
  }});
  // Real band-tab switcher (moved verbatim from galaxy_map_level3.py,
  // G65 fold) — deliberately its own click-handling block, not merged
  // into the module/toggle switchers above (real bug this avoids: a
  // shared class + a band-tab with no matching dataset would break
  // the other switchers' own click handlers).
  document.querySelectorAll('.band-tab').forEach(function(t) {{
    t.addEventListener('click', function() {{
      var group = t.closest('.band-tabs');
      var target = t.dataset.bandTarget;
      group.querySelectorAll('.band-tab').forEach(function(o) {{ o.classList.toggle('active', o === t); }});
      var parentSection = t.closest('.mod-section');
      parentSection.querySelectorAll('.band-canvas').forEach(function(c) {{
        c.style.display = (c.id === target) ? '' : 'none';
      }});
    }});
  }});
}})();
</script>
</body>
</html>
"""


def main():
    all_mods = MODULES + CROSS_CUTTING_MODULES
    mod_tabs = (
        ''.join(f'<div class="mod-tab" data-target="mod-{m}">{m}</div>' for m in MODULES)
        + '<div class="mod-tab-sep">⚙️ Cross-cutting (no river)</div>'
        + ''.join(f'<div class="mod-tab" data-target="mod-{m}">{m}</div>' for m in CROSS_CUTTING_MODULES)
    )
    mod_sections = ''.join(build_module_section(m) for m in all_mods)
    total_funcs = sum(len(_function_bodies(m).keys()) for m in all_mods)
    html = TEMPLATE.format(mod_tabs=mod_tabs, mod_sections=mod_sections,
                            n_funcs=total_funcs, n_mods=len(all_mods),
                            dim_index=dimension_index_html(OUT.name),
                            dim_css=DIMENSION_INDEX_CSS, idd_css=INFRA_DRILLDOWN_CSS,
                            dd_css=DISPERSED_DECISIONS_CSS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(MODULES)} river modules + {len(CROSS_CUTTING_MODULES)} "
          f"cross-cutting (no river) = {len(all_mods)} total, {total_funcs} real Currents, "
          f"{len(NOTABLE)} with a curated core-logic write-up.")


if __name__ == '__main__':
    main()
