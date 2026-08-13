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
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from galaxy_map import polar, _curved_edge  # noqa: E402
from graphify_river_group import (  # noqa: E402
    RIVER_NAME, RIVER_COLOR, RIVER_MODULES, RIVER_ROLE_NOTE,
    DASHBOARD_CARDS, CARDS_BY_RIVER,
)

OUT = Path('graphify-out/galaxy_map_module.html')

MODULE_ICON = '⚙️'
CARD_ICON_FALLBACK = '🎯'


def build_river_section(rnum):
    W, H = 900, 700
    cx, cy = W / 2, H / 2
    color = RIVER_COLOR[rnum]
    river_label = RIVER_NAME[rnum]
    mods = RIVER_MODULES.get(rnum, [])
    cards = CARDS_BY_RIVER.get(rnum, [])

    nodes_svg = []
    edges_svg = []

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
        edges_svg.append(_curved_edge(cx, cy, mx, my, color, real=True))
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
        edges_svg.append(
            f'<path d="M {cx} {cy} L {px} {py}" stroke="#C9A84C" stroke-width="1.3" '
            f'stroke-dasharray="2,4" opacity="0.55" fill="none"/>'
        )
        icon = c['label'].split(' ')[0]
        label = ' '.join(c['label'].split(' ')[1:])
        badge = ' <tspan fill="#E0A040">(partial)</tspan>' if c.get('partial') else ''
        nodes_svg.append(
            f'<g class="node"><rect x="{px-19}" y="{py-19}" width="38" height="38" rx="8" '
            f'fill="#0f0f1a" stroke="#C9A84C" stroke-width="2"{dash} transform="rotate(45 {px} {py})" filter="url(#glow)"/>'
            f'<text x="{px}" y="{py+5}" text-anchor="middle" font-size="15">{icon}</text></g>'
            f'<text x="{px}" y="{py+30}" text-anchor="middle" font-size="9" fill="#C9A84C">{label}{badge}</text>'
        )

    legend = (f'<p class="rlegend-role">{RIVER_ROLE_NOTE.get(rnum, "")}</p>'
              if RIVER_ROLE_NOTE.get(rnum) else '')
    mod_list = ', '.join(f'<code>{m}</code>' for m in mods) if mods else '<i>no single-module home — see role note</i>'
    def _card_row(c):
        partial_badge = ' <span class="warn">partial</span>' if c.get('partial') else ''
        return (f'<div class="legend-row small"><span class="dot" style="background:#C9A84C"></span>'
                f'<b>{c["label"]}</b>{partial_badge} '
                f'<span class="meta">{c["via"]}</span></div>')
    card_list = ''.join(_card_row(c) for c in cards) or \
        '<div class="legend-row small"><span class="meta">No dashboard card routes directly into this river.</span></div>'

    body = (
        f'<section class="river-section" id="river-{rnum}" style="display:none">'
        f'<div class="rhead"><span class="rdot" style="background:{color}"></span><h2>{river_label}</h2></div>'
        f'{legend}'
        f'<div class="canvas-wrap"><svg viewBox="0 0 {W} {H}" width="100%" style="max-width:900px;display:block;margin:0 auto">'
        f'<defs><filter id="glow" x="-60%" y="-60%" width="220%" height="220%">'
        f'<feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>'
        f'</filter></defs>{"".join(edges_svg)}{"".join(nodes_svg)}</svg></div>'
        f'<div class="legend"><h3>Real modules</h3><p class="modlist">{mod_list}</p>'
        f'<h3>Real dashboard-card entry points</h3>{card_list}</div>'
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
  <p>Drilled down from <a href="galaxy_map_river.html">the 16 rivers (Level 1)</a>, drilled down from <a href="galaxy_map.html">the Galaxy Map (Level 0)</a>. Pick a river below — the diamond nodes are real dashboard cards (dashDeck.MODULES) that actually route a user into that river; the round nodes are the river's own real registered modules. A dashed diamond/"(partial)" label means the card's real target only partially covers the river (see that card's own note).</p>
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
