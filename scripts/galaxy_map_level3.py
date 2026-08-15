#!/usr/bin/env python3
"""
galaxy_map_level3.py — G14 proof-of-concept of the ratified "RPGACE
Total Systems Galaxy Map" /CEO plan (Aug 13 2026). Alex's own direct
ask, in his own words: "i'd like to reitterate level 2 diagram left to
right: it should only end as rivers as exits and flow through a level
3 structure which is a module or function, with those flow through
buttons being the gateway to level 3 diagrams."

Real scope, honestly bounded (matches the Phylum-11-restructure
precedent — prove the pattern on ONE real case before a 44-module
rollout): this file draws ONE Level-3 section per module in
LEVEL3_MODULES (graphify_river_group.py, currently `{'beatLog'}`).
Each section shows that module's own real top-level functions
(parse_module_functions()) and the real direct-call edges between
them (compute_module_function_flow()) — the same real, mechanical,
grep-based-evidence technique compute_intra_river_flow() already uses
one level up, just at function grain instead of module grain (rule 8,
same method, not reinvented).

Real, honest scope limits, stated plainly, not hidden (same shape as
every other level's own stated blind spot): only DIRECT `self.<fn>()`/
`<moduleName>.<fn>()` calls are caught — a relationship carried
through a callback reference, RPGACE.hooks.fire(), or a DOM event
listener registered once in init() is invisible to this method. An
absence of an edge is not proof no real relationship exists, only that
no direct call was found. Nested/closure-scoped helper functions
(never assigned as a module method) are deliberately not surfaced as
separate nodes — they're not part of the module's own real public
call-chain surface.

Layout: left-to-right, same standing Level-2 principle (system_map_
spec.md §9) — `init`-adjacent entry functions on the left, real
computed rank by call-depth flowing right, terminal/leaf functions
(nothing calls out further) on the right. Reuses polar()/_curved_edge()/
_build_markers() from galaxy_map.py (rule 8, never re-derived).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from galaxy_map import _curved_edge, _build_markers, barycenter_order  # noqa: E402
from graphify_river_group import (  # noqa: E402
    LEVEL3_MODULES, RIVER_COLOR, RIVER_NAME, RIVER_MODULES,
    parse_module_functions, compute_module_function_flow,
    compute_cross_module_function_calls, compute_function_ui_signals,
    FLOWS_IN, attribute_river_connection_function,
    compute_oracle_call_counts, compute_external_call_sites,
    compute_lastfm_call_sites,
)
# G19 (Aug 14) — real forward-link cross-reference: which (module, func)
# pairs have a curated Level-5 decision-point write-up. Reused directly
# from galaxy_map_level5.py's own DECISION_POINTS (rule 8, never a 2nd
# hand-maintained copy) — only entries with a real, verified `func` get
# a forward link; entries with none (e.g. dashDeck's own decision,
# dashDeck isn't a tracked Level-3 module) correctly get no link rather
# than a fabricated one.
from galaxy_map_level5 import DECISION_POINTS as _L5_DECISIONS  # noqa: E402
LEVEL5_BY_FUNC = {(dp['module'], dp['func']): dp for dp in _L5_DECISIONS if dp.get('func')}

# G26 Phase 1 (Aug 14) — real cross-reference into the new Decision/
# Human-Gate page, same reuse pattern as LEVEL5_BY_FUNC just above
# (rule 8, not a 2nd hand-maintained copy). Unlike Level 5's forward-
# link (terminal functions only), a real decision gate can sit at ANY
# point in a call chain — entry, intermediate, or terminal — so this
# badge is checked against every real function node, not just leaves.
from galaxy_map_decisions import DECISION_POINTS as _DECISION_POINTS  # noqa: E402
DECISIONS_BY_FUNC = {(dp['module'], dp['func']): dp for dp in _DECISION_POINTS}

# Real, shared "Alex" actor color — Aug 13, Alex's own direct ask: "a
# permanent overarch bubble titled Alex... where the input is shown to
# me... the buttons i can press." Same real accent Level 0's own
# "Human Gate — Alex" node already uses (galaxy_map.py's HARNESS_NODES)
# — deliberate visual continuity so the SAME recurring human actor
# reads as one consistent identity across every level, not a
# per-level reinvention (rule 8).
ALEX_COLOR = '#E25454'

# Real, shared "Oracle" actor color/icon — Aug 14, Alex's own direct ask
# ("permanent bubble of oracle ai wrapper... connecting once per action
# on smallest object on level n, and a number next to edge to show how
# many actions are done"), with his own real correction the same
# session: NOT forced-permanent — a real, evidence-driven bubble (same
# discipline as everywhere else in this file) that will look prevalent
# for Oracle specifically because Claude API genuinely IS called from a
# lot of real places right now, not because it's faked. Same real
# `#9B59B6`/`🔮` identity Level 0's own "Oracle (AI harness)" node
# already uses (galaxy_map.py's HARNESS_NODES) — deliberate visual
# continuity, rule 8.
ORACLE_COLOR = '#9B59B6'
# Real "other externals" color (Aug 14, G16 continuation — "other
# externals" was the explicitly stated remaining scope). Composio is
# the one other real, mechanically-detectable external at this grain
# (RPGACE.api() calls, compute_external_call_sites()) — a real,
# distinct accent, not reused from Oracle/Alex.
COMPOSIO_COLOR = '#4CAF82'
# G31 (Aug 14) — real 2nd "other externals" connector with a genuine
# detectable client-side call site (fetch('/api/lastfm'), beatLog).
LASTFM_COLOR = '#D9534F'

OUT = Path('graphify-out/galaxy_map_level3.html')

# Real, computed once (rule 8 — not re-derived per module): every real
# function-level call that crosses a MODULE boundary anywhere in the
# codebase — Aug 13, real Alex ask: "there should also be a back button
# to river too, with connecting level 3 from previous river being the
# backdoor." A genuine cross-module (often cross-river) function call
# is a real "backdoor" — a direct jump between two modules' own
# Level-3 pages that bypasses climbing back up through Level 2/1.
CROSS_MODULE_CALLS = compute_cross_module_function_calls()


def _owning_river(module_name):
    for rnum, mods in RIVER_MODULES.items():
        if module_name in mods:
            return rnum
    return None


def _incoming_attribution_for_module(module_name):
    """Real pairing (Aug 13, Alex's own direct ask: "the previous
    change should give indication of what should stand instead of
    init... maybe pair with what comes from level 3 function in
    previous river if it makes sense") — reuses the exact same real
    evidence Level 2's own "next function" stub already found
    (attribute_river_connection_function(), rule 8, not re-derived):
    does any real river-to-river connection actually land on ONE OF
    THIS MODULE'S OWN FUNCTIONS specifically? If so, that's the real,
    evidence-backed answer to "where does this module's real logic
    actually get entered from," standing in for the removed `init`
    node far more honestly than a generic bootstrap-wiring node ever
    did. Returns (from_river_num, to_func, reason) or None — most
    modules honestly have no such attribution (the connection either
    doesn't target this module specifically, or no real evidence for
    any function exists at all), never guessed to fill the gap."""
    rnum = _owning_river(module_name)
    if rnum is None:
        return None
    for other, note, itype in FLOWS_IN.get(rnum, []):
        attr = attribute_river_connection_function(other, rnum, note, cross_calls=CROSS_MODULE_CALLS, itype=itype)
        if attr and attr[1] == module_name:
            return (other, attr[2], attr[3])
    return None


def compute_function_rank(funcs, edges):
    """Real, evidence-derived left-to-right rank per function — same
    technique as compute_module_flow_rank() one level up (rule 8):
    real terminals (nothing calls OUT to another local function) sit
    rightmost; real entry points (nothing calls IN, or `init` itself)
    sit leftmost; everything else ranked by real longest FORWARD-path
    depth from an entry point (never guessed, never alphabetized).

    Real bug #1, found and fixed testing against all 44 real modules
    (rule 4 - verified against real data, not shipped blind): a plain
    "grow depth whenever an update strictly increases it" BFS infinite-
    loops on any real function-call CYCLE (A calls B calls A - a real,
    legitimate JS pattern, e.g. a UI revert/redo mutual-call pair like
    contentProductionLive's own _refreshWidget<->_revertToStage). A
    hard round-cap stopped the hang but produced real bug #2: cycle-
    trapped nodes kept climbing toward the cap every round, landing at
    an artificially huge depth far from their real callers, stretching
    the canvas into a mostly-empty diagram with the real content
    squeezed into one corner - confirmed by direct visual inspection
    (headless-Chromium screenshot of contentProductionLive, the real
    module that surfaced it) before shipping, not assumed fixed just
    because the hang stopped.

    Real, correct fix: a standard DFS with an explicit recursion-stack
    check for BACK edges (an edge pointing at a node already on the
    current DFS path — the textbook definition of a graph cycle). A
    back edge is real and still DRAWN (compute_module_function_flow()'s
    own edge list is untouched), it's just excluded from the DEPTH
    computation — so a cycle no longer inflates anyone's rank, and
    every node gets a real, finite, honestly-small depth reflecting its
    actual forward distance from an entry point."""
    callers = {f: set() for f in funcs}
    callees = {f: set() for f in funcs}
    for a, b in edges:
        if a in callees:
            callees[a].add(b)
        if b in callers:
            callers[b].add(a)
    # Real, deliberate exclusion (Aug 13, Alex's own direct ask: "at
    # level 3, no init should exist") — `init` is real, standing RPGACE
    # convention (rule 1 in "Building guide for lower models": "init()
    # wires listeners/injection with setTimeout delays... plus a
    # page:show hook to re-inject on navigation") — real bootstrap
    # PLUMBING (boot-task registration, hook wiring), not the module's
    # own real business logic, and it's invoked externally by
    # RPGACE.register()'s own machinery, never by a real caller inside
    # the module — it was always a forced, artificial "entry" rather
    # than evidence-derived like every other node here. Its own real
    # direct callees become the real depth-0 entries instead (the
    # functions init actually wires up ARE the module's true starting
    # points); any other function with genuinely zero real callers
    # (not reached via init at all) stays a real entry too, unchanged.
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
            return  # real back edge — a genuine cycle, not a deeper path
        if f in visited and depth.get(f, -1) >= d:
            return  # already reached at an equal-or-greater real depth
        depth[f] = max(depth.get(f, -1), d)
        visited.add(f)
        on_stack.add(f)
        # Real, pre-existing non-determinism bug found + fixed Aug 13,
        # same navigation-overhaul pass (rule 4 — this diagram claims
        # to be deterministic; a fresh re-run genuinely produced a
        # different layout, caught by an actual idempotency re-check,
        # not assumed). `callees.get(f, ())` is a `set()` — Python
        # hash-randomizes string set iteration order PER PROCESS
        # (PYTHONHASHSEED unset, confirmed) — this visit order feeds
        # `depth[]` directly, so two back-to-back runs of this exact
        # script on the exact same source could silently produce
        # different node positions. sorted() makes the traversal order
        # (and therefore the whole diagram) reproducible again.
        for c in sorted(callees.get(f, ())):
            visit(c, d + 1)
        on_stack.discard(f)

    for e in entries:
        visit(e, 0)
    for f in funcs:
        depth.setdefault(f, 0)
    return depth


BAND_LABELS = ['🚪 Entry & Early Logic', '⚙️ Core Logic', '🏁 Output & Terminal']
BAND_THRESHOLD = 15  # real, cheap threshold — matches where crowding was actually observed


def _split_into_bands(funcs, depth):
    """Real depth-range banding for crowded modules — Aug 13, Alex-
    confirmed design ("rank-band sub-pages within Level 3") after his
    own direct complaint that Level 3 looked "very crowded." Splits
    the module's real functions into up to 3 depth-ordered bands,
    boundaries chosen by real FUNCTION COUNT (not raw depth-width,
    since real depth distribution is often uneven — verified against
    phylumPath/contentProductionLive/bookworm before shipping, not
    assumed even). A module at or under BAND_THRESHOLD functions gets
    exactly ONE band (unchanged single-canvas behavior — no added
    complexity where the crowding this fixes was never real).
    Returns [{'label': str, 'funcs': [...]}, ...], real depth order
    preserved within each band."""
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


def build_module_section(module_name):
    color = RIVER_COLOR.get(_owning_river(module_name), '#C9A84C')
    all_funcs = parse_module_functions(module_name)
    edges = compute_module_function_flow(module_name)
    depth = compute_function_rank(all_funcs, edges)
    # Real exclusion (Aug 13, Alex's own direct ask: "at level 3, no
    # init should exist") — depth computed above using the FULL
    # function list (so init's own real callees correctly land at
    # depth 0, per compute_function_rank()'s own docstring), but init
    # itself is never rendered as a node below. has_init drives the
    # legend explanation of what it actually is.
    has_init = 'init' in all_funcs
    funcs = [f for f in all_funcs if f != 'init']
    incoming_attr = _incoming_attribution_for_module(module_name)

    # Real, fixed top margin (Aug 13, Alex's own ask) — room for the
    # permanent "Alex" bubble above the function grid, on EVERY module/
    # band section, not sized off any per-module data (a "permanent
    # overarch bubble" per Alex's own wording — always present, same
    # relative position, so it reads as one consistent recurring actor).
    ALEX_Y = 95
    # Real "backdoor" gateways (Aug 13, Alex's own ask): any function in
    # THIS module with a real, direct RPGACE.modules.X.fn() call into
    # another module gets a real gateway node at its own band's right
    # edge — a genuine cross-module (often cross-river) jump straight
    # into that module's own Level-3 page, bypassing the climb back up
    # through Level 2/1. Real layout/sizing (max_depth-derived width,
    # barycenter reordering, per-column height) now computed PER BAND
    # inside _render_band() below, not once for the whole module — the
    # real fix "level 3 looks very crowded" needed.
    backdoors = [(from_func, to_mod, to_func) for from_mod, from_func, to_mod, to_func in CROSS_MODULE_CALLS
                 if from_mod == module_name and to_mod in LEVEL3_MODULES]
    has_backdoors = bool(backdoors)

    # Real rank-band split (Aug 13, Alex-confirmed: "level 3 looks very
    # crowded, we need to make more levels to make it digestable" —
    # rank-band sub-pages within Level 3, his own chosen option). A
    # module at/under BAND_THRESHOLD gets exactly ONE band (unchanged
    # behavior — see _split_into_bands()'s own docstring).
    ui_sigs = compute_function_ui_signals(module_name)
    oracle_counts = compute_oracle_call_counts(module_name)
    composio_sites = compute_external_call_sites(module_name)
    composio_counts = {f: len(a) for f, a in composio_sites.items()}
    lastfm_sites = compute_lastfm_call_sites(module_name)
    lastfm_counts = {f: 1 for f in lastfm_sites}
    # Real, evidence-consistent fix (Aug 14, found while re-verifying
    # pathRouter's Alex bubble against real before/after HTML — pathRouter's
    # own real INPUT evidence, `window.addEventListener('popstate', ...)`,
    # lives inside init()'s own body, but init is never rendered as a
    # node (has_init exclusion above), so that real signal was silently
    # dropped rather than attributed anywhere. This module's own docstring
    # already states the honest stand-in for a removed init: "Its real
    # direct callees are the true starting points instead" — extending
    # that SAME stated design to UI evidence too (not a new philosophy)
    # by OR-ing init's own real output/input onto its real depth-0
    # entries, the same functions already standing in for init elsewhere
    # on this page.
    if has_init and ui_sigs.get('init') and (ui_sigs['init']['output'] or ui_sigs['init']['input']):
        init_sig = ui_sigs['init']
        # Real, deliberate SINGLE-anchor choice, not a fan-out to every
        # depth-0 entry — init carries exactly ONE real mechanism here
        # (pathRouter's own real evidence: one popstate listener), and
        # attributing it to every stand-in would inflate the Alex-bubble
        # count (n_out/n_in below, one dashed line per function) into
        # implying several independent real UI touches where there's
        # one. incoming_attr (a real, already-evidence-backed specific
        # pairing) wins if one exists for this module; otherwise the
        # first real depth-0 entry in source order (funcs is already
        # real source order per parse_module_functions()'s own contract)
        # is the honest, deterministic single stand-in.
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
        w, h, svg_inner, legend_rows_b, edge_colors_b = _render_band(
            module_name, color, band_funcs, funcs, depth, edges, ui_sigs, incoming_attr,
            backdoors, func_to_band, bands, bi, ALEX_Y, has_backdoors, oracle_counts, composio_counts, lastfm_counts)
        if multi_band:
            # Real, deliberate DIFFERENT class from the top-level `.tab`
            # module switcher — a real bug caught before shipping: the
            # existing hash-routing JS selects `.tab` globally and reads
            # `dataset.target`, which a band-tab never has (only
            # `dataset.bandTarget`), so sharing the class would have
            # wired a broken click handler (location.hash = undefined)
            # onto every band-tab. `.band-tab` gets its own, separate
            # JS block instead.
            active = ' active' if bi == 0 else ''
            band_tabs.append(
                f'<div class="band-tab{active}" data-band-target="{band_id}">'
                f'{band["label"]} <span class="meta">({len(band_funcs)})</span></div>')
        display = '' if bi == 0 else 'display:none'
        band_canvases.append(
            f'<div class="band-canvas" id="{band_id}" style="{display}">'
            f'<div class="canvas-wrap"><svg viewBox="0 0 {w} {h}" width="100%" style="max-width:{w}px;display:block;margin:0 auto">'
            f'<defs><filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
            f'<filter id="edgeglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
            f'{_build_markers(edge_colors_b)}</defs>{svg_inner}</svg></div>'
            f'<div class="legend"><h3>Real function-call edges{" — " + band["label"] if band["label"] else ""}</h3>{legend_rows_b}</div>'
            f'</div>'
        )

    rnum = _owning_river(module_name)
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
<section class="mod-section" id="mod-{module_name}" style="display:none">
  <div class="rhead"><span class="rdot" style="background:{color}"></span><h2>⚙️ {module_name} — real function-call chain</h2></div>
  {back_btn}
  <p class="rlegend-role">Drilled down from {river_link}'s own Level-2 module node. 🚪 = a real entry point (nothing calls it, once <code>init</code> is stripped out) · 🏁 = a real leaf/terminal function (calls nothing else in this module) · ⚙️ = an intermediate real function{' · 🚪 (right, dashed) = a real cross-module backdoor' if has_backdoors else ''}. {len(funcs)} real functions, {len(edges)} real direct call edges — same grep-based direct-call-only technique as the module-level flow one level up, same honest blind spot: a relationship reached via a callback reference or <code>RPGACE.hooks</code> is invisible here.{init_note}{pairing_note}{band_note} <b>🧑 Alex</b> (permanent on every module/band) is the real human actor — a dashed line INTO Alex means that function has real DOM/popup-rendering evidence (something you'd actually see); a dashed line OUT of Alex means that function has real button/input-wiring evidence (something you actually click or type into). A function with neither is honest, normal internal logic — not everything is user-facing.</p>
  {band_tabs_html}
  {''.join(band_canvases)}
</section>'''


def _render_band(module_name, color, band_funcs, all_module_funcs, depth, edges, ui_sigs,
                  incoming_attr, backdoors, func_to_band, bands, band_idx, alex_y_const, has_backdoors_module,
                  oracle_counts=None, composio_counts=None, lastfm_counts=None):
    """Real, per-band canvas builder (Aug 13, Alex-confirmed rank-band
    design) — factored out of build_module_section() so a crowded
    module renders 1-3 of these instead of one dense canvas. Same real
    layout/Alex-bubble/backdoor logic as before, scoped to this band's
    own real functions. Cross-band edges (a real call from a function
    in this band to one in ANOTHER band) get a real dangling stub —
    "↦ Band N: func" on the right for an outgoing cross-band call,
    "⬅ Band N: func" on the left for an incoming one — reusing the
    exact same visual language as Level 2's own river-boundary stub
    and this file's own backdoor gateway (rule 8), never silently
    dropped just because it crosses a band."""
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
    # Real, Aug 14 bump (190 -> 260 -> 340 -> 420) — real headroom for
    # the evidence-gated Oracle bubble (alex_y_const+90), the Composio
    # bubble (alex_y_const+180, G16), and the new Last.fm bubble
    # (alex_y_const+270, G31) stacking below the existing Alex bubble
    # without colliding into the function grid.
    ALEX_MARGIN = 420
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
        # G19 (Aug 14, Alex's own ask): leftmost/entry objects get a
        # real "zoom out" link up to the SPECIFIC level-(N-1) object
        # they actually belong to — this module's own Level-2 node,
        # never a generic unevidenced "back" button. Rightmost/terminal
        # objects get a real "drill deeper" link FORWARD into Level 5's
        # curated logic, but ONLY where a real decision write-up
        # actually exists for that exact function (LEVEL5_BY_FUNC) —
        # most terminals correctly get no forward link, same evidence
        # discipline as everywhere else in this pipeline.
        nav_badge = ''
        if is_entry:
            nav_badge = (f'<a href="galaxy_map_module.html#mod-{module_name}">'
                         f'<text x="{x}" y="{y+52}" text-anchor="middle" font-size="7.5" fill="#5FB3D9" text-decoration="underline">🔭 zoom out: Level 2</text></a>')
        elif is_leaf and (module_name, f) in LEVEL5_BY_FUNC:
            dp = LEVEL5_BY_FUNC[(module_name, f)]
            nav_badge = (f'<a href="galaxy_map_level5.html#d-{dp["id"]}">'
                         f'<text x="{x}" y="{y+52}" text-anchor="middle" font-size="7.5" fill="{ORACLE_COLOR}" text-decoration="underline">🧠 into the logic: Level 5</text></a>')
        # G26 Phase 1 (Aug 14) — real, independent of entry/terminal
        # status: a real human-decision/confirm gate can sit at any
        # point in a call chain, so this badge is checked separately
        # from nav_badge above and can render alongside it.
        decision_badge = ''
        if (module_name, f) in DECISIONS_BY_FUNC:
            ddp = DECISIONS_BY_FUNC[(module_name, f)]
            decision_badge = (f'<a href="galaxy_map_decisions.html#dp-{ddp["id"]}">'
                               f'<text x="{x}" y="{y+64}" text-anchor="middle" font-size="7.5" fill="#E25454" text-decoration="underline">🚦 decision gate</text></a>')
        nodes_svg.append(
            f'{incoming_badge}<g class="node"><circle cx="{x}" cy="{y}" r="26" fill="#0f0f1a" stroke="{color}" stroke-width="{ring}" filter="url(#glow)"/>'
            f'<text x="{x}" y="{y+6}" text-anchor="middle" font-size="15">{icon}</text></g>'
            f'<text x="{x}" y="{y+40}" text-anchor="middle" font-size="9.5" fill="{color}">{f}</text>{nav_badge}{decision_badge}'
        )

    # Real cross-band stubs — a real edge, never silently dropped just
    # because its other end sits in a different band's own canvas.
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

    # Real, permanent "Alex" bubble — see build_module_section()'s own
    # docstring comment for the full real design rationale (rule 8, not
    # repeated per band); scoped here to just this band's own functions
    # so the counts shown are an honest reflection of what's on screen.
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
    nodes_svg.append(
        f'<g class="node central"><circle cx="{alex_x}" cy="{alex_y}" r="34" fill="#0f0f1a" stroke="{ALEX_COLOR}" stroke-width="3.5" filter="url(#glow)"/>'
        f'<text x="{alex_x}" y="{alex_y-4}" text-anchor="middle" font-size="20">🧑</text>'
        f'<text x="{alex_x}" y="{alex_y+50}" text-anchor="middle" font-size="10.5" fill="{ALEX_COLOR}" font-weight="700">Alex</text>'
        f'<text x="{alex_x}" y="{alex_y+64}" text-anchor="middle" font-size="8" fill="{ALEX_COLOR}" opacity="0.85">{n_out} shown to me · {n_in} buttons I press</text></g>'
    )
    edge_colors_used.add(ALEX_COLOR)

    # Real, evidence-driven "Oracle" bubble (Aug 14, Alex's own ask,
    # with his own real correction: NOT forced-permanent — only drawn
    # when this band's own functions genuinely have a real Oracle-call
    # count > 0, same discipline as every other detector in this file).
    # Real "number next to the edge" — each edge is labeled with the
    # actual count of real sendToOracle()/callOracle()/fillGaps() calls
    # inside that specific function's own body, not a bare presence flag.
    oracle_counts = oracle_counts or {}
    band_oracle = [(f, oracle_counts.get(f, 0)) for f in band_funcs if oracle_counts.get(f, 0) > 0 and f in pos]
    if band_oracle:
        oracle_x, oracle_y = W / 2, alex_y_const + 90
        n_calls = 0
        for f, cnt in band_oracle:
            n_calls += 1
            fx, fy = pos[f]
            ox = oracle_x + (n_calls * 13 if n_calls % 2 == 0 else -n_calls * 13)
            edges_svg.append(_curved_edge(fx, fy, ox, oracle_y, ORACLE_COLOR, real=True, dashed=True, r1=26, r2=20, offset_mult=0.6))
            mx, my = (fx + ox) / 2, (fy + oracle_y) / 2
            nodes_svg.append(f'<circle cx="{mx}" cy="{my}" r="8" fill="#0f0f1a" stroke="{ORACLE_COLOR}" stroke-width="1"/>'
                              f'<text x="{mx}" y="{my+3}" text-anchor="middle" font-size="8" fill="{ORACLE_COLOR}" font-weight="700">{cnt}</text>')
        total_calls = sum(c for _f, c in band_oracle)
        nodes_svg.append(
            f'<g class="node"><circle cx="{oracle_x}" cy="{oracle_y}" r="26" fill="#0f0f1a" stroke="{ORACLE_COLOR}" stroke-width="2.5" filter="url(#glow)"/>'
            f'<text x="{oracle_x}" y="{oracle_y+6}" text-anchor="middle" font-size="16">🔮</text>'
            f'<text x="{oracle_x}" y="{oracle_y+42}" text-anchor="middle" font-size="9.5" fill="{ORACLE_COLOR}" font-weight="700">Oracle</text>'
            f'<text x="{oracle_x}" y="{oracle_y+55}" text-anchor="middle" font-size="8" fill="{ORACLE_COLOR}" opacity="0.85">{len(band_oracle)} function(s) · {total_calls} real call(s)</text></g>'
        )
        edge_colors_used.add(ORACLE_COLOR)

    # Real, evidence-driven "Composio" bubble (Aug 14, G16 continuation
    # — Alex: "move on with next phase or step of g-series that are
    # planned"; G16's own stated remaining scope was "Level 0/1/4 and
    # other externals still open"). Same real evidence-gate discipline
    # as Oracle's own bubble just above — only drawn where this band's
    # functions genuinely have a real RPGACE.api() Composio call.
    composio_counts = composio_counts or {}
    band_composio = [(f, composio_counts.get(f, 0)) for f in band_funcs if composio_counts.get(f, 0) > 0 and f in pos]
    if band_composio:
        cx_, cy_ = W / 2, alex_y_const + 180
        n_calls = 0
        for f, cnt in band_composio:
            n_calls += 1
            fx, fy = pos[f]
            ox = cx_ + (n_calls * 13 if n_calls % 2 == 0 else -n_calls * 13)
            edges_svg.append(_curved_edge(fx, fy, ox, cy_, COMPOSIO_COLOR, real=True, dashed=True, r1=26, r2=20, offset_mult=0.6))
            mx, my = (fx + ox) / 2, (fy + cy_) / 2
            nodes_svg.append(f'<circle cx="{mx}" cy="{my}" r="8" fill="#0f0f1a" stroke="{COMPOSIO_COLOR}" stroke-width="1"/>'
                              f'<text x="{mx}" y="{my+3}" text-anchor="middle" font-size="8" fill="{COMPOSIO_COLOR}" font-weight="700">{cnt}</text>')
        total_calls = sum(c for _f, c in band_composio)
        nodes_svg.append(
            f'<g class="node"><circle cx="{cx_}" cy="{cy_}" r="26" fill="#0f0f1a" stroke="{COMPOSIO_COLOR}" stroke-width="2.5" filter="url(#glow)"/>'
            f'<text x="{cx_}" y="{cy_+6}" text-anchor="middle" font-size="16">🔗</text>'
            f'<text x="{cx_}" y="{cy_+42}" text-anchor="middle" font-size="9.5" fill="{COMPOSIO_COLOR}" font-weight="700">Composio</text>'
            f'<text x="{cx_}" y="{cy_+55}" text-anchor="middle" font-size="8" fill="{COMPOSIO_COLOR}" opacity="0.85">{len(band_composio)} function(s) · {total_calls} real call(s)</text></g>'
        )
        edge_colors_used.add(COMPOSIO_COLOR)

    # Real, evidence-driven "Last.fm" bubble (Aug 14, G31 — Alex: "an
    # external can attach to any level 0-6 if it has connections at
    # level 1"). Same real evidence-gate discipline as Oracle/Composio
    # above — only drawn where this band's functions genuinely have a
    # real fetch('/api/lastfm') call.
    lastfm_counts = lastfm_counts or {}
    band_lastfm = [(f, lastfm_counts.get(f, 0)) for f in band_funcs if lastfm_counts.get(f, 0) > 0 and f in pos]
    if band_lastfm:
        lx_, ly_ = W / 2, alex_y_const + 270
        n_calls = 0
        for f, cnt in band_lastfm:
            n_calls += 1
            fx, fy = pos[f]
            ox = lx_ + (n_calls * 13 if n_calls % 2 == 0 else -n_calls * 13)
            edges_svg.append(_curved_edge(fx, fy, ox, ly_, LASTFM_COLOR, real=True, dashed=True, r1=26, r2=20, offset_mult=0.6))
            mx, my = (fx + ox) / 2, (fy + ly_) / 2
            nodes_svg.append(f'<circle cx="{mx}" cy="{my}" r="8" fill="#0f0f1a" stroke="{LASTFM_COLOR}" stroke-width="1"/>'
                              f'<text x="{mx}" y="{my+3}" text-anchor="middle" font-size="8" fill="{LASTFM_COLOR}" font-weight="700">{cnt}</text>')
        total_calls = sum(c for _f, c in band_lastfm)
        nodes_svg.append(
            f'<g class="node"><circle cx="{lx_}" cy="{ly_}" r="26" fill="#0f0f1a" stroke="{LASTFM_COLOR}" stroke-width="2.5" filter="url(#glow)"/>'
            f'<text x="{lx_}" y="{ly_+6}" text-anchor="middle" font-size="16">🎵</text>'
            f'<text x="{lx_}" y="{ly_+42}" text-anchor="middle" font-size="9.5" fill="{LASTFM_COLOR}" font-weight="700">Last.fm</text>'
            f'<text x="{lx_}" y="{ly_+55}" text-anchor="middle" font-size="8" fill="{LASTFM_COLOR}" opacity="0.85">{len(band_lastfm)} function(s) · {total_calls} real call(s)</text></g>'
        )
        edge_colors_used.add(LASTFM_COLOR)

    # Real backdoor nodes — scoped to this band's own source functions.
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
            tcolor = RIVER_COLOR.get(_owning_river(target_mod), '#C9A84C')
            for fname, target_fn in calls:
                fx, fy = pos[fname]
                edges_svg.append(_curved_edge(fx, fy, bx_col, by, tcolor, real=True, dashed=True, r1=26, r2=24))
                edge_colors_used.add(tcolor)
            t_rnum = _owning_river(target_mod)
            nodes_svg.append(
                f'<a href="galaxy_map_level3.html#mod-{target_mod}" class="drill-link"><g class="node">'
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

    return W, H, ''.join(edges_svg) + ''.join(nodes_svg), legend_rows, edge_colors_used


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Level 3)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #12121e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:28px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:var(--gold);border-color:var(--gold)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--gold);padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
  .river-toggle{{max-width:1400px;margin:16px auto 0;padding:0 24px}}
  .river-toggle-group{{margin-bottom:8px}}
  .river-toggle-label{{font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:2px 8px 4px}}
  .tabs{{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}}
  .tab{{padding:6px 14px;border-radius:16px;font-size:11.5px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .tab.active{{background:var(--gold);color:#1a1a12;font-weight:700}}
  .band-tabs{{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding:6px 24px 10px}}
  .band-tab{{padding:5px 12px;border-radius:14px;font-size:10.5px;cursor:pointer;background:rgba(255,255,255,0.04);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .band-tab .meta{{opacity:0.7}}
  .band-tab.active{{background:var(--gold);color:#1a1a12;font-weight:700;border-color:var(--gold)}}
  .rhead{{display:flex;align-items:center;gap:10px;justify-content:center;padding:24px 24px 6px}}
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
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10.5px;background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:3px}}
  a{{color:var(--gold)}}
  .note{{max-width:820px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
</style>
</head>
<body>
<div class="breadcrumb">
  <a href="galaxy_map.html">🌌 Level 0</a><span class="bc-sep">→</span>
  <a href="galaxy_map_river.html">🏛️ Level 1</a><span class="bc-sep">→</span>
  <a href="galaxy_map_module.html">🌊 Level 2</a><span class="bc-sep">→</span>
  <span class="bc-here">🔽 Level 3</span><span class="bc-sep">→</span>
  <a href="galaxy_map_level4.html">🖱️ Level 4</a><span class="bc-sep">→</span>
  <a href="galaxy_map_level5.html">🧠 Level 5</a><span class="bc-sep">→</span>
  <a href="galaxy_map_decisions.html">🚦 Decisions</a>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Level 3</div>
  <h1>🔽 Function-Level Drill-Down</h1>
  <p>Drilled down from <a href="galaxy_map_module.html">a river's own modules (Level 2)</a>, from <a href="galaxy_map_river.html">the 16 rivers (Level 1)</a>, from <a href="galaxy_map.html">the Galaxy Map (Level 0)</a>. All {n_modules} of 44 real Level-2 modules now have a built Level-3 page. Each section shows that module's own real functions and the real direct calls between them, left (entry) to right (terminal), same principle as every other level. A dashed 🚪 gateway on the far right is a real cross-module "backdoor" — a genuine <code>RPGACE.modules.X.fn()</code> call reaching directly into another module's own chain, jumping there without climbing back up through Level 2/1. Use the river-grouped switcher below to jump between modules without leaving Level 3, or the "← Back to River" button on each section to return to Level 2.</p>
</div>
<div class="river-toggle">{river_toggle}</div>
{sections}
<div class="note">
  Generated by <code>scripts/galaxy_map_level3.py</code> — real data from <code>graphify_river_group.py</code>'s
  <code>parse_module_functions()</code>/<code>compute_module_function_flow()</code>/<code>compute_cross_module_function_calls()</code>
  (never re-derived, real grep-based direct-call evidence). All 44 real Level-2 modules built.
  Mapping rules: <code>system_map_spec.md</code>.
</div>
<script>
(function() {{
  var tabs = document.querySelectorAll('.tab');
  var sections = document.querySelectorAll('.mod-section');
  function show(id) {{
    sections.forEach(function(s) {{ s.style.display = (s.id === id) ? '' : 'none'; }});
    tabs.forEach(function(t) {{ t.classList.toggle('active', t.dataset.target === id); }});
  }}
  tabs.forEach(function(t) {{
    t.addEventListener('click', function() {{ location.hash = t.dataset.target; }});
  }});
  window.addEventListener('hashchange', function() {{
    var id = location.hash.replace('#', '') || (sections[0] && sections[0].id);
    show(id);
  }});
  var id0 = location.hash.replace('#', '') || (sections[0] && sections[0].id);
  show(id0);
}})();
(function() {{
  // Real, separate band-tab switcher (Aug 13, Alex-confirmed rank-band
  // design) — deliberately its own click-handling block, not merged
  // into the module-tab switcher above (real bug caught building this:
  // a shared `.tab` class + a band-tab with no `dataset.target` would
  // have broken the module switcher's own click handler).
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
    mods = sorted(LEVEL3_MODULES)
    # Real river-grouped switcher (Aug 13, Alex's own ask: "a toggle
    # button panel to switch level 2 objects") — organizes the module
    # switcher by real owning river (_owning_river(), rule 8, not
    # re-derived) instead of one flat 44-tab wall, so jumping to a
    # sibling module in the SAME river (the common case) is a short
    # visual scan, not a search across an unsorted list.
    by_river = {}
    for m in mods:
        by_river.setdefault(_owning_river(m), []).append(m)
    river_toggle = []
    for rnum in sorted(by_river, key=lambda r: (r is None, r)):
        rmods = by_river[rnum]
        rcolor = RIVER_COLOR.get(rnum, '#8a8a9a')
        rname = RIVER_NAME.get(rnum, 'Unrouted').split('—')[0].strip()
        tabs_html = ''.join(f'<div class="tab" data-target="mod-{m}">{m}</div>' for m in rmods)
        river_toggle.append(
            f'<div class="river-toggle-group"><div class="river-toggle-label" style="color:{rcolor}">River {rnum} — {rname}</div>'
            f'<div class="tabs" style="border-bottom:none;padding:0 0 8px;justify-content:flex-start">{tabs_html}</div></div>'
        )
    sections = ''.join(build_module_section(m) for m in mods)
    html = TEMPLATE.format(river_toggle=''.join(river_toggle), sections=sections, n_modules=len(mods))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    total_funcs = sum(len(parse_module_functions(m)) for m in mods)
    total_edges = sum(len(compute_module_function_flow(m)) for m in mods)
    print(f"Wrote {OUT} — {len(mods)} module(s), {total_funcs} real functions, {total_edges} real call edges.")


if __name__ == '__main__':
    main()
