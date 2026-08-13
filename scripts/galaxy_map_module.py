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
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from galaxy_map import polar, _curved_edge, _build_markers, _connector_icon  # noqa: E402
from graphify_river_group import (  # noqa: E402
    RIVER_NAME, RIVER_COLOR, RIVER_MODULES, RIVER_ROLE_NOTE,
    DASHBOARD_CARDS, CARDS_BY_RIVER, RIVER_FLOWS, FLOWS_IN, _river_num_from_label,
    EXTERNAL_RIVER_LINKS, LINKS_BY_RIVER,
)

OUT = Path('graphify-out/galaxy_map_module.html')

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


EXTERNAL_COLOR = '#5FB3D9'  # same family as Supabase's Level-0 accent — "external infra," not a river's own color


def build_river_section(rnum):
    W, H = 1200, 1150
    cx, cy = W / 2, H / 2
    color = RIVER_COLOR[rnum]
    river_label = RIVER_NAME[rnum]
    mods = RIVER_MODULES.get(rnum, [])
    cards = CARDS_BY_RIVER.get(rnum, [])

    nodes_svg = []
    edges_svg = []
    edge_colors_used = {color}

    # --- river hub ---
    nodes_svg.append(
        f'<g class="node central"><circle cx="{cx}" cy="{cy}" r="40" fill="#0f0f1a" stroke="{color}" stroke-width="3" filter="url(#glow)"/>'
        f'<text x="{cx}" y="{cy-4}" text-anchor="middle" font-size="22">🌊</text>'
        f'<text x="{cx}" y="{cy+18}" text-anchor="middle" font-size="10" fill="#E2E2EC" font-weight="700">{river_label.split(chr(8212))[0].strip()}</text></g>'
    )

    # --- real registered modules, inner ring ---
    n_mods = len(mods) or 1
    mod_radius = 230
    for i, m in enumerate(mods):
        ang = -90 + (360 * i / n_mods)
        mx, my = polar(cx, cy, mod_radius, ang)
        edges_svg.append(_curved_edge(cx, cy, mx, my, color, real=True, r1=40, r2=22))
        nodes_svg.append(
            f'<g class="node"><circle cx="{mx}" cy="{my}" r="22" fill="#0f0f1a" stroke="{color}" stroke-width="2" filter="url(#glow)"/>'
            f'<text x="{mx}" y="{my+5}" text-anchor="middle" font-size="14">{MODULE_ICON}</text></g>'
            f'<text x="{mx}" y="{my+34}" text-anchor="middle" font-size="9.5" fill="{color}">{m}</text>'
        )

    # --- real dashboard cards, outer ring, visually distinct (dashed
    # square-ish diamond, gold accent) — genuinely a different node
    # TYPE (a UI entry point), not just a smaller module ---
    n_cards = len(cards) or 1
    card_radius = 320
    for i, c in enumerate(cards):
        ang = -90 + (360 * i / n_cards) + (180 / n_cards if n_cards > 1 else 0)
        px, py = polar(cx, cy, card_radius, ang)
        dash = ' stroke-dasharray="3,3"' if c.get('partial') else ''
        # Real dedup (rule 8): was a hand-rolled <path>, now routes
        # through the shared _curved_edge() so it gets the same real
        # X-start/arrowhead markers every other edge in the Galaxy Map
        # gets, instead of a second, marker-less line convention.
        edges_svg.append(_curved_edge(cx, cy, px, py, '#C9A84C', real=True, dashed=True, r1=40, r2=27))
        edge_colors_used.add('#C9A84C')
        icon = c['label'].split(' ')[0]
        label = ' '.join(c['label'].split(' ')[1:])
        badge = ' <tspan fill="#E0A040">(partial)</tspan>' if c.get('partial') else ''
        nodes_svg.append(
            f'<g class="node"><rect x="{px-19}" y="{py-19}" width="38" height="38" rx="8" '
            f'fill="#0f0f1a" stroke="#C9A84C" stroke-width="2"{dash} transform="rotate(45 {px} {py})" filter="url(#glow)"/>'
            f'<text x="{px}" y="{py+5}" text-anchor="middle" font-size="15">{icon}</text></g>'
            f'<text x="{px}" y="{py+30}" text-anchor="middle" font-size="9" fill="#C9A84C">{label}{badge}</text>'
        )

    # --- Aug 13, real Alex ask: "level 2 maps dont conjoin to other
    # rivers in a circle and arrow" — a real, third outer ring showing
    # exactly which OTHER rivers this one connects to, reusing the exact
    # same RIVER_FLOWS (outgoing) / FLOWS_IN (incoming) data already
    # drawn on Level 1, never re-derived (rule 8). Each bubble is a real
    # in-page <a href="#river-N"> jump to that other river's own Level-2
    # section (the existing hashchange listener already handles this,
    # zero new JS needed), colored with THAT river's own RIVER_COLOR so
    # it reads as "a different river," not this one's own module/card
    # rings. Same real terminal-sink/fan-out exclusion as Level 1 — a
    # RIVER_FLOWS target that isn't a real river number gets skipped
    # here too, honest about what the data actually encodes.
    conns = []
    for target_label, note, itype in RIVER_FLOWS.get(rnum, []):
        other = _river_num_from_label(target_label)
        if other:
            conns.append(('out', other, note, itype))
    for other, note, itype in FLOWS_IN.get(rnum, []):
        conns.append(('in', other, note, itype))

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

    # --- Aug 13, real Alex ask: "all rivers should also connect with
    # G0 objects within level 2 maps to show how externals contribute
    # to rivers." A real 4th, outermost ring — one hexagon bubble per
    # real EXTERNAL_CONNECTORS entry that has a real, cited connection
    # into THIS river (EXTERNAL_RIVER_LINKS, sourced directly from each
    # connector's own real note text, never re-derived). Distinct
    # accent color (EXTERNAL_COLOR) so this ring reads as "external
    # infra," not confused with the river-colored module ring or the
    # gold dashboard-card ring or the other-river-colored connection
    # ring. Not clickable (no per-connector anchor exists at Level 0
    # to jump to) — a real info marker, same restraint as everywhere
    # else in this build: don't fake interactivity that isn't real.
    links = LINKS_BY_RIVER.get(rnum, [])
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
            f'<g class="node">'
            f'<polygon points="{pts}" fill="#0f0f1a" stroke="{EXTERNAL_COLOR}" stroke-width="2" filter="url(#glow)"/>'
            f'<text x="{ex}" y="{ey+5}" text-anchor="middle" font-size="13">{icon}</text></g>'
            f'<text x="{ex}" y="{ey+32}" text-anchor="middle" font-size="8.5" fill="{EXTERNAL_COLOR}">{link["name"]}</text>'
        )

    legend = (f'<p class="rlegend-role">{RIVER_ROLE_NOTE.get(rnum, "")}</p>'
              if RIVER_ROLE_NOTE.get(rnum) else '')
    if rnum == OVERSIGHT_RIVER:
        legend += '<p class="rlegend-role">📚 The real Oversight hub — fed directly by Rivers XII/XIII/XVI.</p>'
    elif rnum in OVERSIGHT_FEEDERS:
        legend += '<p class="rlegend-role">📚 Has a real, direct RIVER_FLOWS connection into River XIV (Oversight Docs).</p>'
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

<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Level 2 — Modules &amp; Dashboard Cards</div>
  <h1>🌊 River detail — real modules + real dashboard-card entry points</h1>
  <p>Drilled down from <a href="galaxy_map_river.html">the 16 rivers (Level 1)</a>, drilled down from <a href="galaxy_map.html">the Galaxy Map (Level 0)</a>. Pick a river below — the diamond nodes are real dashboard cards (dashDeck.MODULES) that actually route a user into that river; the round inner-ring nodes are the river's own real registered modules; the mid-ring bubbles are the real OTHER rivers this one connects to (real <code>RIVER_FLOWS</code> data, → out / ← in, click to jump); the outermost hexagons are real G0 external connectors (Level 0's own galaxies/providers) that have a real, cited relationship to this specific river. A dashed diamond/"(partial)" label means the card's real target only partially covers the river (see that card's own note). A 📚 note marks a river with a real, direct connection into River XIV (Oversight Docs).</p>
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
