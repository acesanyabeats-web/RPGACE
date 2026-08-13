#!/usr/bin/env python3
"""
galaxy_map_module.py — G4 of the ratified "RPGACE Total Systems Galaxy
Map" /CEO plan (Aug 13 2026). Builds the real Level-2 drill-down: for
each of the 16 rivers, its own real registered modules (RIVER_MODULES)
PLUS — Alex's own direct Aug 13 ask, "we should also include dashboard
cards as reference points too" — the real dashboard cards (dashDeck.
MODULES, mirrored as DASHBOARD_CARDS) that actually route a user into
that river. Two genuinely different node types, visually distinct: a
module is a real code entity; a dashboard card is a real, user-
clickable UI entry point INTO one or more modules/rivers — showing
both together is the actual "reference point" Alex asked for, not a
forced merge of two different kinds of thing into one.

Real data reused, never re-derived (rule 8): RIVER_NAME/RIVER_COLOR/
RIVER_MODULES/RIVER_ROLE_NOTE/DASHBOARD_CARDS/CARDS_BY_RIVER all
imported from graphify_river_group.py; polar()/_curved_edge() imported
from galaxy_map.py. All 16 rivers render into ONE file (16 <section>
blocks, JS-toggled by location.hash) rather than 16 separate files —
matches the existing "one file per level" convention set by G2/G3,
avoids a 16-file sprawl for what is genuinely one drill-down level.

Scope, per the ratified plan: river -> its own modules + dashboard
cards ONLY. Individual function/onclick-handler-level detail inside a
module (main.js's 240+ functions, index.html's 93 onclick handlers)
is explicitly G11's job (the full /perspective sweep), not this file's
— this stops at module/card granularity, the real level G4 was scoped
to.

**Aug 13, later pass — real river-to-river connection ring added, per
Alex's direct ask** ("level 2 maps dont conjoin to other rivers in a
circle and arrow"). Each section gained a 3rd outer ring: one bubble
per real `RIVER_FLOWS` (outgoing) / `FLOWS_IN` (incoming) connection —
same real data Level 1 already draws, never re-derived — each a real
in-page `<a href="#river-N">` jump to that other river's own section
(the existing hashchange listener already handles it, zero new JS).
Also carries G5's real Oversight-connection note down from Level 1
(§6) — River XIV itself and any river with a real direct edge into it
get a 📚 legend line, using the same computation, not a new one.

**Aug 13, later pass still — real G0-to-river ring, per Alex's direct
ask** ("all rivers should also connect with g0 objects within level 2
maps to show how externals contribute to rivers"). A new
`EXTERNAL_RIVER_LINKS` table in `graphify_river_group.py` extracts a
real per-river attribution from each `EXTERNAL_CONNECTORS` entry's own
`note` text (re-read, not guessed) — 2 real, honest omissions: OpenArt
("not wired to anything yet") and n8n (its own note names a feature,
F10, never a river number) have no real river citation and stay out
rather than inferred in. Each qualifying river gets a real 4th,
outermost ring — one hexagon per real external connector — visually
distinct (a fixed accent color, not a river's own) from every other
ring so "external infrastructure" always reads as a different KIND of
thing than a module, a card, or another river.

**Aug 13, later pass still — real intra-river module flow + terminal
marker + a 5th "skill streams" ring, per Alex's direct observation and
ask.** He noticed River XI's own modules looked like isolated spokes:
"shouldn't these show relationships between each other, then all
conjoin eventually at [a real visible output]... the modules are the
flows of the river, so it makes sense as a river."
`compute_intra_river_flow()` (new, `graphify_river_group.py`) greps
each real module's own source block for a literal call into a sibling
— genuine code evidence, not invented — drawn as real edges between
module bubbles. `compute_river_terminal()` then identifies which
module the flow actually converges on: a real dashboard-card citation,
real in-degree, or a real AI-provider link (`oracleAppGrounding`,
River III) — marked with a 👁️/🤖/👁️🤖 badge. A river with no computed
terminal says so honestly (a real, stated blind spot: RPGACE.hooks-
mediated relationships aren't literal `RPGACE.modules.X` calls, so
they're invisible to this grep — same confirmed gap class graphify's
own AST extractor already has for `RPGACE.register()`).

Then Alex's own framing for skills: "skills are like streams that join
the river flow, along with other modules, rivers etc." A real 5th
ring — River XIII gets its own full real catalog (25 skills, its
genuine structural content); a handful of other rivers get one real,
CITED skill each (`SKILL_SECONDARY_RIVER`, sourced from that skill's
own already-written description, never guessed) — the rest are real,
genuinely cross-cutting Claude-Code dev-process protocols that stay
honestly scoped to River XIII alone.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from galaxy_map import polar, _curved_edge, _build_markers, _connector_icon, barycenter_order, count_crossings  # noqa: E402
from graphify_river_group import (  # noqa: E402
    RIVER_NAME, RIVER_COLOR, RIVER_MODULES, RIVER_ROLE_NOTE,
    DASHBOARD_CARDS, CARDS_BY_RIVER, RIVER_FLOWS, FLOWS_IN, _river_num_from_label,
    EXTERNAL_RIVER_LINKS, LINKS_BY_RIVER, compute_intra_river_flow, compute_river_terminals,
    ALL_SKILLS, SKILL_SECONDARY_RIVER, compute_module_flow_rank, dashboard_card_target_module,
    LEVEL3_MODULES,
)

OUT = Path('graphify-out/galaxy_map_module.html')

# Real, computed once (not per-section — re-reading rpgace_core.js 16
# times would be wasteful): the actual module-to-module call edges
# within every river, per Alex's own Aug 13 ask.
FLOW_EDGES = compute_intra_river_flow()

# G5, Aug 13 (system_map_spec.md §6): "every level of this hierarchy
# that has a real, standing connection into Oversight represents that
# connection explicitly." Same real computation galaxy_map_river.py's
# own G5 badge uses (rule 8 — not re-derived, just reused at this
# level too) — River XIV itself, plus any river with a real RIVER_FLOWS
# edge targeting it. At module granularity there's no real per-module
# oversight-connection data (RIVER_FLOWS is a river-level aggregate,
# per §1a) — this carries the real river-level fact down into the
# section's own legend text honestly, rather than fabricating a
# module-level edge no evidence supports.
OVERSIGHT_RIVER = 14
OVERSIGHT_FEEDERS = {
    src for src, flows in RIVER_FLOWS.items()
    for target_label, _note, _itype in flows
    if _river_num_from_label(target_label) == OVERSIGHT_RIVER
}

MODULE_ICON = '⚙️'
CARD_ICON_FALLBACK = '🎯'
# LEVEL3_MODULES imported above from graphify_river_group.py (rule 8 —
# the real canonical list of modules with a built Level-3 page lives
# with its own computation, not duplicated here).


EXTERNAL_COLOR = '#5FB3D9'  # same family as Supabase's Level-0 accent — "external infra," not a river's own color
SKILL_RIVER = 13  # River XIII — Skills' own real home; every real skill is a stream feeding it


def build_river_section(rnum):
    # Real, sourced skill "streams" — Alex's own framing: "skills are
    # like streams that join the river flow." River XIII genuinely
    # contains ALL of them (no citation needed — that's its real
    # structural role); a few others get one real, CITED secondary
    # skill each (SKILL_SECONDARY_RIVER, sourced not guessed).
    if rnum == SKILL_RIVER:
        skills_here = [(s, None) for s in ALL_SKILLS]
    else:
        skills_here = [(s, note) for s, (r, note) in SKILL_SECONDARY_RIVER.items() if r == rnum]
    mods = RIVER_MODULES.get(rnum, [])
    cards = CARDS_BY_RIVER.get(rnum, [])
    # Real canvas sizing: rivers with modules use the new WIDE left-to-
    # right flow layout; River XIII's own real 25-skill radial catalog
    # needs real extra room; every other module-less river stays the
    # standard radial size.
    if mods:
        W, H = 1900, 950
    elif rnum == SKILL_RIVER:
        W, H = 1550, 1500
    else:
        W, H = 1200, 1150
    cx, cy = W / 2, H / 2
    color = RIVER_COLOR[rnum]
    river_label = RIVER_NAME[rnum]

    nodes_svg = []
    edges_svg = []
    edge_colors_used = {color}
    # Aug 13, real /misunderstanding fix on River V: the old single-
    # terminal API silently picked whichever module happened to sit
    # earlier in DASHBOARD_CARDS' own unrelated definition order when
    # 2+ modules had an equally real, unambiguous citation (morningBrief
    # vs journalQoL) — an artifact of table order, not real evidence.
    # compute_river_terminals() now returns every real co-terminal.
    terminals = compute_river_terminals(rnum, FLOW_EDGES)
    terminal_mods = [m for m, _k in terminals]
    terminal_kind = dict(terminals)
    conns = []
    for target_label, note, itype in RIVER_FLOWS.get(rnum, []):
        other = _river_num_from_label(target_label)
        if other:
            conns.append(('out', other, note, itype))
    for other, note, itype in FLOWS_IN.get(rnum, []):
        conns.append(('in', other, note, itype))
    links = LINKS_BY_RIVER.get(rnum, [])
    skill_color = RIVER_COLOR[SKILL_RIVER]

    if mods:
        # =========================================================
        # Aug 13, real Alex correction — the STANDING layout PRINCIPLE
        # for every river with real modules, going forward: "it should
        # be flowing from left (input) to right (output) and depict
        # contributers along the way from left to right... the river
        # flows through modules into river 2." Real, evidence-derived
        # x-position per module via compute_module_flow_rank() — never
        # a decorative rearrangement, the geometry itself IS the claim
        # ("this is upstream of that," "this is what it produces").
        # =========================================================
        rank = compute_module_flow_rank(rnum, FLOW_EDGES, terminal_mods)
        # X_HUB=280/X_IN=90 (real fix, same pass as the z-order change
        # below): the first value tried for X_IN, a bare -140, sat
        # outside this canvas's own viewBox="0 0 1900 950" (starts at
        # x=0) — genuinely invisible, not just tightly spaced, caught by
        # a real Chromium re-check after the first fix. Moving the hub
        # itself right (was 90) makes real on-canvas room for incoming
        # connections to sit genuinely LEFT of it — embodying the same
        # left(input)-to-right(output) chronological principle already
        # governing modules/terminals/outgoing connections, not just a
        # z-order patch.
        X_HUB, X_IN, X_R0, X_R1, X_TERM, X_RM1, X_OUT = 280, 90, 560, 880, 1200, 1500, 1780
        mod_pos = {}
        buckets = {2: [], 1: [], 0: [], -1: []}
        for m in mods:
            buckets.setdefault(rank.get(m, 0), []).append(m)
        rank_x = {2: X_TERM, 1: X_R1, 0: X_R0, -1: X_RM1}

        # Real crossing-reduction pass (Aug 13, Alex's own rule: "make it
        # so no edges ever cross each other, way more important than
        # keeping bubbles in a row") — barycenter_order() reorders each
        # bucket's own vertical stacking by the real edges connecting it
        # to the buckets on either side, sweeping left-to-right/right-
        # to-left across the real rank sequence (rule 8, shared helper,
        # not reinvented per level).
        pair_edges = [(f, t) for f, t, _k in FLOW_EDGES.get(rnum, [])]
        buckets = barycenter_order(buckets, pair_edges, [-1, 0, 1, 2])

        def _place_col(items, x):
            n = len(items) or 1
            for i, it in enumerate(items):
                mod_pos[it] = (x, cy + (i - (n - 1) / 2) * 100)
        for r, x in rank_x.items():
            _place_col(buckets.get(r, []), x)

        # Real z-order + spacing fix (Alex's own direct ask): "the
        # rivers connecting to river at beginning should be behind the
        # river in focus." Real incoming (FLOWS_IN) connections are
        # drawn FIRST — genuinely left of the hub now (X_IN=90 vs.
        # X_HUB=280, a real ~190px clear span, not the old ~60px gap
        # that let them visually cross the hub's own ring) — and the
        # hub's own <g> markup is appended AFTER them, so in real SVG
        # paint order (later = on top) the hub always renders above
        # any incoming-connection edge/node that happens to overlap it.
        def _place_river_col(items, x, source_side, anchor_xy):
            n = len(items) or 1
            for i, (direction, other, note, itype) in enumerate(items):
                y = cy + (i - (n - 1) / 2) * 90
                other_color = RIVER_COLOR[other]
                other_short = RIVER_NAME[other].split('—')[0].strip()
                ax_, ay_ = anchor_xy
                if source_side == 'out':
                    edges_svg.append(_curved_edge(ax_, ay_, x, y, other_color, real=True, r1=22, r2=17))
                else:
                    edges_svg.append(_curved_edge(x, y, ax_, ay_, other_color, real=True, r1=17, r2=34))
                edge_colors_used.add(other_color)
                arrow = '→' if direction == 'out' else '←'
                nodes_svg.append(
                    f'<a href="#river-{other}" class="drill-link"><g class="node">'
                    f'<circle cx="{x}" cy="{y}" r="17" fill="#0f0f1a" stroke="{other_color}" stroke-width="2" filter="url(#glow)"/>'
                    f'<text x="{x}" y="{y+5}" text-anchor="middle" font-size="12">🌊</text></g>'
                    f'<text x="{x}" y="{y+30}" text-anchor="middle" font-size="9" fill="{other_color}">{arrow} {other_short}</text></a>'
                )
        _place_river_col([c for c in conns if c[0] == 'in'], X_IN, 'in', (X_HUB, cy))

        # river-identity hub — deliberately added to nodes_svg AFTER the
        # incoming connections above, so it real-paints on top of them.
        nodes_svg.append(
            f'<g class="node central"><circle cx="{X_HUB}" cy="{cy}" r="34" fill="#0f0f1a" stroke="{color}" stroke-width="3" filter="url(#glow)"/>'
            f'<text x="{X_HUB}" y="{cy-4}" text-anchor="middle" font-size="18">🌊</text>'
            f'<text x="{X_HUB}" y="{cy+55}" text-anchor="middle" font-size="9.5" fill="#E2E2EC" font-weight="700">{river_label.split(chr(8212))[0].strip()}</text></g>'
        )
        entry_targets = buckets.get(0) or buckets.get(1) or terminal_mods
        for m in entry_targets:
            mx, my = mod_pos[m]
            edges_svg.append(_curved_edge(X_HUB, cy, mx, my, color, real=True, r1=34, r2=22))

        # Real, explicit terminal-DESTINATION rule (Aug 13, Alex's own
        # direct ask): "each level 2 should have an end point [that]
        # should flow into another level 2 or level 3 map down the
        # river (or say output is shown to RPGACE ui output)... if it
        # doesnt, its not the true end of the map." A terminal only
        # counts as a real, honest end-of-map if it declares ONE of:
        # a real UI-visible output, a real external-AI connection, or a
        # real river-to-river RIVER_FLOWS exit — Level 3 (🔽) is real
        # and always shown too, but per Alex's own wording it's an
        # ADDITION ("still keep view of level 3"), not a substitute for
        # a real declared destination.
        real_out_conns = [c for c in conns if c[0] == 'out']
        out_targets_str = ', '.join(RIVER_NAME[o].split('—')[0].strip() for _d, o, _n, _i in real_out_conns[:2]) or None

        for m in mods:
            if m not in mod_pos:
                continue
            mx, my = mod_pos[m]
            is_term = (m in terminal_mods)
            term_badge = ''
            if is_term:
                tk = terminal_kind.get(m)
                term_icon = {'ui': '👁️', 'ai': '🤖', 'both': '👁️🤖'}.get(tk, '')
                term_badge = f'<text x="{mx}" y="{my-30}" text-anchor="middle" font-size="12">{term_icon}</text>'
                if tk in ('ui', 'both'):
                    dest_txt, dest_col = '🖥️ Output: RPGACE UI', '#3DAA6E'
                elif out_targets_str:
                    dest_txt, dest_col = f'→ {out_targets_str}', color
                elif tk == 'ai':
                    dest_txt, dest_col = '🔮 Output: external AI provider', '#9B59B6'
                else:
                    dest_txt, dest_col = '⚠️ No declared downstream', '#E0A040'
                term_badge += f'<text x="{mx}" y="{my-44}" text-anchor="middle" font-size="7.5" fill="{dest_col}">{dest_txt}</text>'
            ring_w = '3.5' if is_term else '2'
            weight_attr = ' font-weight="700"' if is_term else ''
            has_l3 = m in LEVEL3_MODULES
            l3_badge = '<text x="{0}" y="{1}" text-anchor="middle" font-size="10">🔽</text>'.format(mx + 17, my - 17) if has_l3 else ''
            node_inner = (
                f'<circle cx="{mx}" cy="{my}" r="22" fill="#0f0f1a" stroke="{color}" stroke-width="{ring_w}" filter="url(#glow)"/>'
                f'<text x="{mx}" y="{my+5}" text-anchor="middle" font-size="14">{MODULE_ICON}</text>'
            )
            if has_l3:
                nodes_svg.append(
                    f'{term_badge}<a href="galaxy_map_level3.html#mod-{m}" class="drill-link"><g class="node">{node_inner}</g></a>{l3_badge}'
                    f'<text x="{mx}" y="{my+34}" text-anchor="middle" font-size="9.5" fill="{color}"{weight_attr}>{m}</text>'
                )
            else:
                nodes_svg.append(
                    f'{term_badge}<g class="node">{node_inner}</g>'
                    f'<text x="{mx}" y="{my+34}" text-anchor="middle" font-size="9.5" fill="{color}"{weight_attr}>{m}</text>'
                )
        # Real, honest distinction (Aug 13, /misunderstanding fix — see
        # compute_intra_river_flow()'s own docstring): a 'direct' edge
        # is a literal RPGACE.modules.X() call, drawn solid; 'wrap'/
        # 'utility'/'dom' are real but INFERRED convergence (a shared
        # window.callOracle/sendChat wrap chain, a shared RPGACE.utils.
        # sendToOracle/fillGaps call, or direct #chat-input/#send-btn
        # DOM triggering) — drawn dashed + labeled, never presented as
        # the same strength of evidence as a direct call.
        INDIRECT_LABEL = {'wrap': 'via callOracle/sendChat wrap chain',
                           'utility': 'via shared RPGACE.utils.sendToOracle', 'dom': 'via direct chat-input/send-btn DOM trigger'}
        edge_touched = set()
        for frm, to, kind in FLOW_EDGES.get(rnum, []):
            if frm in mod_pos and to in mod_pos:
                fx, fy = mod_pos[frm]
                tx, ty = mod_pos[to]
                dashed = kind != 'direct'
                edges_svg.append(_curved_edge(fx, fy, tx, ty, color, real=True, dashed=dashed, r1=22, r2=22, offset_mult=1.3))
                edge_colors_used.add(color)
                edge_touched.add(frm); edge_touched.add(to)
                if dashed:
                    mxm, mym = (fx + tx) / 2, (fy + ty) / 2 - 8
                    nodes_svg.append(f'<text x="{mxm}" y="{mym}" text-anchor="middle" font-size="7.5" fill="{color}" opacity="0.75">{INDIRECT_LABEL[kind]}</text>')

        # Real, honest flag (Aug 13, Alex's own rule: "at level 2 nothing
        # should be disconnected... it should flow in one coherent
        # pipeline") — a module that STILL has zero real edge after all
        # 4 detection signals is a genuine remaining gap, marked plainly
        # rather than left as a silent dead-end spoke.
        for m in mods:
            if m in mod_pos and m not in edge_touched and m not in terminal_mods:
                mx, my = mod_pos[m]
                # Precise wording, not "no detected link" bare — real
                # cross-RIVER function calls (Level 3's own backdoor
                # data) can and do exist for a module that's genuinely
                # isolated WITHIN its own river; this flag is honestly
                # scoped to intra-river connectivity only, which is what
                # this diagram actually draws.
                nodes_svg.append(
                    f'<text x="{mx}" y="{my-30}" text-anchor="middle" font-size="9.5" fill="#E0A040">⚠️ no link within River {rnum}</text>'
                )

        # real "flow anchor" for anything without a per-module citation
        # of its own (externals/skills, and the OUT river connections)
        # — the first real terminal if one exists, else the river's own
        # single/first module (matches the real River I case: authGate
        # has no computed terminal but is still the one real module
        # producing this river's real output).
        flow_anchor = mod_pos.get(terminal_mods[0]) if terminal_mods else \
            ((mod_pos.get(mods[0]) if mods else None) or (X_TERM, cy))

        # real dashboard cards — anchored to the exact module their own
        # `via` text cites when unambiguous, else to the flow anchor.
        card_anchor = {}
        for c in cards:
            target = dashboard_card_target_module(c.get('via', ''), mods)
            card_anchor.setdefault(target, []).append(c)
        for anchor_mod, clist in card_anchor.items():
            ax, ay = mod_pos.get(anchor_mod, flow_anchor)
            for i, c in enumerate(clist):
                px, py = ax, ay - 90 - i * 60
                dash = ' stroke-dasharray="3,3"' if c.get('partial') else ''
                edges_svg.append(_curved_edge(ax, ay, px, py, '#C9A84C', real=True, dashed=True, r1=22, r2=19))
                edge_colors_used.add('#C9A84C')
                icon = c['label'].split(' ')[0]
                label = ' '.join(c['label'].split(' ')[1:])
                badge = ' <tspan fill="#E0A040">(partial)</tspan>' if c.get('partial') else ''
                nodes_svg.append(
                    f'<g class="node"><rect x="{px-16}" y="{py-16}" width="32" height="32" rx="7" '
                    f'fill="#0f0f1a" stroke="#C9A84C" stroke-width="2"{dash} transform="rotate(45 {px} {py})" filter="url(#glow)"/>'
                    f'<text x="{px}" y="{py+5}" text-anchor="middle" font-size="13">{icon}</text></g>'
                    f'<text x="{px}" y="{py+26}" text-anchor="middle" font-size="8.5" fill="#C9A84C">{label}{badge}</text>'
                )

        _place_river_col([c for c in conns if c[0] == 'out'], X_OUT, 'out', flow_anchor)

        # real external connectors — a compact cluster below the flow
        # anchor (most cited externals are invoked to help PRODUCE the
        # river's real output, not an earlier pipeline stage).
        ax, ay = flow_anchor
        for i, link in enumerate(links):
            ex, ey = ax + 55 + i * 14, ay + 130 + i * 68
            edges_svg.append(_curved_edge(ax, ay, ex, ey, EXTERNAL_COLOR, real=True, dashed=True, r1=22, r2=19))
            edge_colors_used.add(EXTERNAL_COLOR)
            icon = _connector_icon(link['name'])
            pts = ' '.join(f'{ex + 19*math.cos(math.radians(a))},{ey + 19*math.sin(math.radians(a))}' for a in range(0, 360, 60))
            nodes_svg.append(
                f'<g class="node"><polygon points="{pts}" fill="#0f0f1a" stroke="{EXTERNAL_COLOR}" stroke-width="2" filter="url(#glow)"/>'
                f'<text x="{ex}" y="{ey+5}" text-anchor="middle" font-size="13">{icon}</text></g>'
                f'<text x="{ex}" y="{ey+32}" text-anchor="middle" font-size="8.5" fill="{EXTERNAL_COLOR}">{link["name"]}</text>'
            )

        # real skill streams — a compact cluster above the flow anchor
        # (they govern/inform the whole process, not one pipeline stage).
        for i, (skill, note) in enumerate(skills_here):
            skx, sky = ax - 55 - i * 14, ay - 130 - i * 68
            edges_svg.append(_curved_edge(ax, ay, skx, sky, skill_color, real=True, dashed=True, r1=22, r2=17))
            edge_colors_used.add(skill_color)
            pts5 = ' '.join(f'{skx + 17*math.cos(math.radians(a-90))},{sky + 17*math.sin(math.radians(a-90))}' for a in range(0, 360, 72))
            nodes_svg.append(
                f'<g class="node"><polygon points="{pts5}" fill="#0f0f1a" stroke="{skill_color}" stroke-width="2" filter="url(#glow)"/>'
                f'<text x="{skx}" y="{sky+4}" text-anchor="middle" font-size="10">🧵</text></g>'
                f'<text x="{skx}" y="{sky+30}" text-anchor="middle" font-size="8" fill="{skill_color}">/{skill}</text>'
            )

    else:
        # =========================================================
        # ORIGINAL RADIAL LAYOUT — module-less rivers only (XII/XIII/
        # XIV/XV/XVI). There's no real module flow here to reorient
        # left-to-right; River XIII's own real skill catalog is also
        # the one case Alex explicitly wanted to KEEP as a radial "web."
        # =========================================================
        nodes_svg.append(
            f'<g class="node central"><circle cx="{cx}" cy="{cy}" r="40" fill="#0f0f1a" stroke="{color}" stroke-width="3" filter="url(#glow)"/>'
            f'<text x="{cx}" y="{cy-4}" text-anchor="middle" font-size="22">🌊</text>'
            f'<text x="{cx}" y="{cy+18}" text-anchor="middle" font-size="10" fill="#E2E2EC" font-weight="700">{river_label.split(chr(8212))[0].strip()}</text></g>'
        )
        n_conn = len(conns) or 1
        conn_radius = 400
        for i, (direction, other, note, itype) in enumerate(conns):
            ang = -90 + (360 * i / n_conn) + (180 / n_conn if n_conn > 1 else 0)
            bx, by = polar(cx, cy, conn_radius, ang)
            other_color = RIVER_COLOR[other]
            other_short = RIVER_NAME[other].split('—')[0].strip()
            if direction == 'out':
                edges_svg.append(_curved_edge(cx, cy, bx, by, other_color, real=True, r1=40, r2=17))
            else:
                edges_svg.append(_curved_edge(bx, by, cx, cy, other_color, real=True, r1=17, r2=40))
            edge_colors_used.add(other_color)
            arrow = '→' if direction == 'out' else '←'
            nodes_svg.append(
                f'<a href="#river-{other}" class="drill-link"><g class="node">'
                f'<circle cx="{bx}" cy="{by}" r="17" fill="#0f0f1a" stroke="{other_color}" stroke-width="2" filter="url(#glow)"/>'
                f'<text x="{bx}" y="{by+5}" text-anchor="middle" font-size="12">🌊</text></g>'
                f'<text x="{bx}" y="{by+30}" text-anchor="middle" font-size="9" fill="{other_color}">{arrow} {other_short}</text></a>'
            )
        n_links = len(links) or 1
        ext_radius = 490
        for i, link in enumerate(links):
            ang = -90 + (360 * i / n_links) + (180 / n_links if n_links > 1 else 0) + 15
            ex, ey = polar(cx, cy, ext_radius, ang)
            edges_svg.append(_curved_edge(cx, cy, ex, ey, EXTERNAL_COLOR, real=True, dashed=True, r1=40, r2=19))
            edge_colors_used.add(EXTERNAL_COLOR)
            icon = _connector_icon(link['name'])
            pts = ' '.join(f'{ex + 19*math.cos(math.radians(a))},{ey + 19*math.sin(math.radians(a))}' for a in range(0, 360, 60))
            nodes_svg.append(
                f'<g class="node"><polygon points="{pts}" fill="#0f0f1a" stroke="{EXTERNAL_COLOR}" stroke-width="2" filter="url(#glow)"/>'
                f'<text x="{ex}" y="{ey+5}" text-anchor="middle" font-size="13">{icon}</text></g>'
                f'<text x="{ex}" y="{ey+32}" text-anchor="middle" font-size="8.5" fill="{EXTERNAL_COLOR}">{link["name"]}</text>'
            )
        skill_radius = 700 if rnum == SKILL_RIVER else 560
        n_skills = len(skills_here) or 1
        for i, (skill, note) in enumerate(skills_here):
            ang = -90 + (360 * i / n_skills)
            skx, sky = polar(cx, cy, skill_radius, ang)
            edges_svg.append(_curved_edge(cx, cy, skx, sky, skill_color, real=True, dashed=True, r1=40, r2=17))
            edge_colors_used.add(skill_color)
            pts5 = ' '.join(f'{skx + 17*math.cos(math.radians(a-90))},{sky + 17*math.sin(math.radians(a-90))}' for a in range(0, 360, 72))
            nodes_svg.append(
                f'<g class="node"><polygon points="{pts5}" fill="#0f0f1a" stroke="{skill_color}" stroke-width="2" filter="url(#glow)"/>'
                f'<text x="{skx}" y="{sky+4}" text-anchor="middle" font-size="10">🧵</text></g>'
                f'<text x="{skx}" y="{sky+30}" text-anchor="middle" font-size="8" fill="{skill_color}">/{skill}</text>'
            )

    legend = (f'<p class="rlegend-role">{RIVER_ROLE_NOTE.get(rnum, "")}</p>'
              if RIVER_ROLE_NOTE.get(rnum) else '')
    if rnum == OVERSIGHT_RIVER:
        legend += '<p class="rlegend-role">📚 The real Oversight hub — fed directly by Rivers XII/XIII/XVI.</p>'
    elif rnum in OVERSIGHT_FEEDERS:
        legend += '<p class="rlegend-role">📚 Has a real, direct RIVER_FLOWS connection into River XIV (Oversight Docs).</p>'
    if terminal_mods:
        reason_map = {'ui': 'a real, visible output you\'d actually see in the app',
                      'ai': 'a real, direct connection to an external AI provider',
                      'both': 'both a real visible output AND a real external-AI connection'}
        if len(terminal_mods) > 1:
            terms_str = ', '.join(f'<code>{m}</code> ({reason_map[terminal_kind[m]]})' for m in terminal_mods)
            legend += f'<p class="rlegend-role">🎯 Real co-terminals (this river genuinely converges on more than one): {terms_str}.</p>'
        else:
            m = terminal_mods[0]
            legend += f'<p class="rlegend-role">🎯 Real terminal: <code>{m}</code> — {reason_map[terminal_kind[m]]}.</p>'
    elif mods:
        legend += '<p class="rlegend-role">🎯 No computed terminal — a real relationship may still exist through a UI path or RPGACE.hooks dispatch this mechanical check can\'t see (same confirmed blind spot as graphify\'s own AST extractor), not claimed as a real gap in the app itself.</p>'
    l3_here = [m for m in mods if m in LEVEL3_MODULES]
    if l3_here:
        l3_list = ', '.join(f'<code>{m}</code>' for m in l3_here)
        legend += f'<p class="rlegend-role">🔽 Real Level-3 drill-down exists for: {l3_list} — click its node to see that module\'s own real function-call chain.</p>'
    mod_list = ', '.join(f'<code>{m}</code>' for m in mods) if mods else '<i>no single-module home — see role note</i>'
    def _card_row(c):
        partial_badge = ' <span class="warn">partial</span>' if c.get('partial') else ''
        return (f'<div class="legend-row small"><span class="dot" style="background:#C9A84C"></span>'
                f'<b>{c["label"]}</b>{partial_badge} '
                f'<span class="meta">{c["via"]}</span></div>')
    card_list = ''.join(_card_row(c) for c in cards) or \
        '<div class="legend-row small"><span class="meta">No dashboard card routes directly into this river.</span></div>'

    def _conn_row(direction, other, note, itype):
        arrow = '→' if direction == 'out' else '←'
        this_short = river_label.split('—')[0].strip()
        other_short = RIVER_NAME[other].split('—')[0].strip()
        left, right = (this_short, other_short) if direction == 'out' else (other_short, this_short)
        return (f'<div class="legend-row small"><span class="dot" style="background:{RIVER_COLOR[other]}"></span>'
                f'<b>{left} {arrow} {right}</b> <span class="meta">{note}</span></div>')
    conn_list = ''.join(_conn_row(d, o, n, i) for d, o, n, i in conns) or \
        '<div class="legend-row small"><span class="meta">No real river-to-river RIVER_FLOWS connection.</span></div>'

    def _link_row(link):
        return (f'<div class="legend-row small"><span class="dot" style="background:{EXTERNAL_COLOR}"></span>'
                f'<b>{link["name"]}</b> <span class="meta">{link["via"]}</span></div>')
    link_list = ''.join(_link_row(link) for link in links) or \
        '<div class="legend-row small"><span class="meta">No real G0 external connector cites this river directly.</span></div>'

    def _skill_row(skill, note):
        label = f'/{skill}'
        meta = note or ("River XIII's own real skill catalog — no per-river citation needed, this IS its structural content." )
        return (f'<div class="legend-row small"><span class="dot" style="background:{skill_color}"></span>'
                f'<b>{label}</b> <span class="meta">{meta}</span></div>')
    skill_list = ''.join(_skill_row(s, n) for s, n in skills_here) or \
        '<div class="legend-row small"><span class="meta">No real skill has a direct, cited relationship with this river.</span></div>'

    body = (
        f'<section class="river-section" id="river-{rnum}" style="display:none">'
        f'<div class="rhead"><span class="rdot" style="background:{color}"></span><h2>{river_label}</h2></div>'
        f'{legend}'
        f'<div class="canvas-wrap"><svg viewBox="0 0 {W} {H}" width="100%" style="max-width:{W}px;display:block;margin:0 auto">'
        f'<defs><filter id="glow" x="-60%" y="-60%" width="220%" height="220%">'
        f'<feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>'
        f'</filter>{_build_markers(edge_colors_used)}</defs>{"".join(edges_svg)}{"".join(nodes_svg)}</svg></div>'
        f'<div class="legend"><h3>Real modules</h3><p class="modlist">{mod_list}</p>'
        f'<h3>Real dashboard-card entry points</h3>{card_list}</div>'
        f'<div class="legend"><h3>Connects to other rivers <span style="font-size:10px;color:var(--dim);font-weight:400">(click a bubble to jump)</span></h3>{conn_list}</div>'
        f'<div class="legend"><h3>External connectors (G0) that contribute here</h3>{link_list}</div>'
        f'<div class="legend"><h3>Skill streams that join this river</h3>{skill_list}</div>'
        f'</section>'
    )
    return body


TABS_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Level 2 — Modules &amp; Dashboard Cards)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #12121e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:32px 24px 12px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:800px;margin:0 auto}}
  .hero a{{color:var(--gold)}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:var(--gold);border-color:var(--gold)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--gold);padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
  .tabs{{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:1100px;margin:20px auto 8px;padding:0 16px}}
  .tab{{font-size:10.5px;padding:6px 10px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);color:var(--dim);cursor:pointer;white-space:nowrap}}
  .tab:hover{{border-color:var(--gold)}}
  .tab.active{{color:#0a0a0f;font-weight:700}}
  .river-section{{max-width:1100px;margin:20px auto 60px;padding:0 16px}}
  .rhead{{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:6px}}
  .rhead h2{{font-family:Georgia,serif;font-size:20px;color:#fff}}
  .rdot{{width:12px;height:12px;border-radius:50%;display:inline-block}}
  .rlegend-role{{text-align:center;color:var(--dim);font-size:11.5px;max-width:760px;margin:0 auto 16px;line-height:1.6}}
  .canvas-wrap{{overflow-x:auto}}
  svg text{{font-family:'Segoe UI',system-ui,sans-serif;user-select:none}}
  a.drill-link{{cursor:pointer}}
  a.drill-link .node circle{{transition:filter 0.15s}}
  a.drill-link:hover .node circle{{filter:url(#glow) brightness(1.4)}}
  .legend{{max-width:820px;margin:16px auto 0}}
  .legend h3{{font-family:Georgia,serif;font-size:13px;color:var(--gold);margin:16px 0 8px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:5px}}
  .legend .modlist{{font-size:11.5px;color:var(--dim);line-height:2}}
  .legend-row{{font-size:11.5px;color:var(--dim);padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);line-height:1.6}}
  .legend-row b{{color:#E2E2EC}}
  .legend-row .meta{{display:block;font-size:10px;color:#6a6a78;margin-top:2px}}
  .legend-row .warn{{color:#E0A040;font-weight:700}}
  .dot{{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10px;background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:3px}}
  .note{{max-width:820px;margin:0 auto 50px;padding:0 24px;font-size:10.5px;color:#6a6a78;line-height:1.7;text-align:center}}
</style>
</head>
<body>

<div class="breadcrumb">
  <a href="galaxy_map.html">🌌 Level 0</a><span class="bc-sep">→</span>
  <a href="galaxy_map_river.html">🏛️ Level 1</a><span class="bc-sep">→</span>
  <span class="bc-here">🌊 Level 2</span>
</div>

<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Level 2 — Modules &amp; Dashboard Cards</div>
  <h1>🌊 River detail — real modules + real dashboard-card entry points</h1>
  <p>Drilled down from <a href="galaxy_map_river.html">the 16 rivers (Level 1)</a>, drilled down from <a href="galaxy_map.html">the Galaxy Map (Level 0)</a>. Pick a river below — the diamond nodes are real dashboard cards (dashDeck.MODULES) that actually route a user into that river; the round inner-ring nodes are the river's own real registered modules, real code-derived arrows show which modules actually call each other, and a 👁️/🤖 badge marks the real terminal each river's own module flow converges on (a visible app output, an external-AI connection, or both); the mid-ring bubbles are the real OTHER rivers this one connects to (real <code>RIVER_FLOWS</code> data, → out / ← in, click to jump); the outer hexagons are real G0 external connectors that have a real, cited relationship to this specific river; the outermost pentagons are real Claude Code skills — River XIII's own full catalog, or a real cited tie into another river. A dashed diamond/"(partial)" label means the card's real target only partially covers the river. A 📚 note marks a river with a real, direct connection into River XIV (Oversight Docs).</p>
</div>

<div class="tabs">{tabs}</div>

{sections}

<div class="note">
  Generated by <code>scripts/galaxy_map_module.py</code> — real data reused from
  <code>scripts/graphify_river_group.py</code>'s own <code>RIVER_MODULES</code>/<code>DASHBOARD_CARDS</code>
  (never re-derived), and <code>galaxy_map.py</code>'s own <code>polar()</code>/<code>_curved_edge()</code> layout helpers.
  G4 of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan. Function/onclick-handler-level
  detail is G11's job (the full <code>/perspective</code> sweep), not this level's.
</div>

<script>
(function() {{
  var tabs = document.querySelectorAll('.tab');
  var sections = document.querySelectorAll('.river-section');
  function show(id) {{
    sections.forEach(function(s) {{ s.style.display = (s.id === id) ? '' : 'none'; }});
    tabs.forEach(function(t) {{
      var active = t.dataset.target === id;
      t.classList.toggle('active', active);
      t.style.background = active ? t.dataset.color : 'rgba(255,255,255,0.03)';
      t.style.borderColor = active ? t.dataset.color : 'rgba(255,255,255,0.12)';
    }});
  }}
  tabs.forEach(function(t) {{
    t.addEventListener('click', function() {{ location.hash = t.dataset.target; }});
  }});
  function fromHash() {{
    var id = location.hash.replace('#', '') || (sections[0] && sections[0].id);
    if (document.getElementById(id)) show(id);
  }}
  window.addEventListener('hashchange', fromHash);
  fromHash();
}})();
</script>

</body>
</html>
"""


def main():
    tabs = []
    sections = []
    for rnum in sorted(RIVER_NAME):
        color = RIVER_COLOR[rnum]
        short = RIVER_NAME[rnum].split('—')[0].strip()
        tabs.append(
            f'<div class="tab" data-target="river-{rnum}" data-color="{color}">{short}</div>'
        )
        sections.append(build_river_section(rnum))
    html = TABS_TEMPLATE.format(tabs='\n'.join(tabs), sections='\n'.join(sections))
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(RIVER_NAME)} river sections, "
          f"{sum(len(m) for m in RIVER_MODULES.values())} real modules, "
          f"{len(DASHBOARD_CARDS)} real dashboard cards mapped.")


if __name__ == '__main__':
    main()
