#!/usr/bin/env python3
"""
galaxy_map_meanders.py — G20 of the ratified "RPGACE Total Systems
Galaxy Map" /CEO plan (Aug 14 2026). A new Level 1.5, Alex's own direct
ask after seeing how crowded River V's Level-2 rendering had become (10
modules, all fanned out with crossing Alex/Oracle bubble edges):
"we need to decide what to migrate to lower level, or possibly devide
rivers into meanders and insert a level to make the offload of the map
a lot easier."

Real, confirmed scope (3 AskUserQuestion answers, Aug 14):
1. A "meander" = one of the river's own real dashboard cards — real,
   already-computed evidence (CARDS_BY_RIVER), zero new curation for
   the GROUPING BOUNDARY itself.
2. Level 1.5 only exists where actually needed — rivers_needing_meanders()
   (graphify_river_group.py): a river needs one only if it has 2+ real
   dashboard cards to split by (a river feeding a single card has no
   real meander boundary, however many modules it has). Checked
   against live data: exactly River V qualifies. Also shows real
   per-function external-connector integration (Composio today; Oracle
   already has its own richer bubble at Level 2/3).
3. Isolated modules render as a compact list, not full crossing graph
   nodes — the real detail (Alex/Oracle bubbles) still lives at Level 3
   per module, not lost, just not redundantly redrawn here.

Real, honest scope limit stated plainly: WHICH of River V's 10 modules
belongs to which of its 4 real card-meanders is not 100% mechanically
derivable from existing detectors (no single generic signal cleanly
splits all 10) — the assignment below is real, evidence-checked against
each module's own DOMAIN marker / registration comment (verified by
direct grep before this file was written, not guessed from name alone),
same curation discipline as Level 5's DECISION_POINTS. If River V's own
module set changes, this table needs a real re-check, not a mechanical
regen.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    RIVER_NAME, RIVER_COLOR, CARDS_BY_RIVER, RIVER_MODULES,
    rivers_needing_meanders, compute_module_oracle_call_count,
    compute_oracle_call_counts, compute_external_call_sites,
    LEVEL3_MODULES,
)

OUT = Path('graphify-out/galaxy_map_meanders.html')

# Real, evidence-checked module -> meander assignment for River V (the
# only river currently qualifying — see rivers_needing_meanders()).
# Each module's real domain confirmed by direct grep before writing this
# (ciAutoPropose's own comment names "Content Intelligence pipeline";
# shiftSync/scheduleFixes sit under the real /* ===DOMAIN:SCHEDULE=== */
# marker; the rest are 1:1 with their own card's real name).
RIVER_MEANDERS = {
    5: {
        'research': ['researchTabs', 'intelBatchList', 'intelDelete', 'intelDedup', 'ciAutoPropose'],
        'agenda': ['agendaReminder', 'scheduleFixes', 'shiftSync'],
        'morningBrief': ['morningBrief'],
        'journal': ['journalQoL'],
    },
}


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def build_module_row(mod):
    oracle_n = compute_module_oracle_call_count(mod)
    oracle_by_func = compute_oracle_call_counts(mod)
    composio_by_func = compute_external_call_sites(mod)
    ext_rows = []
    for f, n in oracle_by_func.items():
        if n:
            ext_rows.append(f'<div class="ext-row"><span class="ext-icon">🔮</span><code>{esc(f)}()</code> — {n} real Oracle call(s)</div>')
    for f, actions in composio_by_func.items():
        for a in actions:
            ext_rows.append(f'<div class="ext-row"><span class="ext-icon">🔗</span><code>{esc(f)}()</code> — Composio <code>{esc(a)}</code></div>')
    ext_html = ''.join(ext_rows) or '<div class="ext-row ext-none">No real Oracle/Composio call detected in this module.</div>'
    link = (f'<a class="mod-chip" href="galaxy_map_level3.html#mod-{mod}">🔽 {mod} — Level 3</a>'
            if mod in LEVEL3_MODULES else f'<span class="mod-chip mod-chip-none">{mod} (no Level-3 page)</span>')
    return f'''<div class="modcard">
    <div class="modname">{mod}</div>
    <div class="extlist">{ext_html}</div>
    {link}
  </div>'''


def build_river_section(rnum):
    river_name = RIVER_NAME.get(rnum, f'River {rnum}').split('—')[0].strip()
    color = RIVER_COLOR.get(rnum, '#8a8a9a')
    meanders = RIVER_MEANDERS.get(rnum, {})
    cards = {c['key']: c for c in CARDS_BY_RIVER.get(rnum, [])}
    all_mods = set(RIVER_MODULES.get(rnum, []))
    covered = set(m for ms in meanders.values() for m in ms)
    uncovered = all_mods - covered
    meander_blocks = []
    for key, mods in meanders.items():
        card = cards.get(key, {})
        label = card.get('label', key)
        rows = ''.join(build_module_row(m) for m in mods)
        meander_blocks.append(f'''<div class="meander">
      <div class="mhead"><span class="mdot" style="background:{color}"></span><h3>{esc(label)}</h3><span class="mcount">{len(mods)} module(s)</span></div>
      <div class="modgrid">{rows}</div>
    </div>''')
    uncovered_html = ''
    if uncovered:
        chips = ''.join(f'<span class="mod-chip mod-chip-none">{m}</span>' for m in sorted(uncovered))
        uncovered_html = f'<div class="uncovered">⚠️ Not yet assigned to a meander (real gap, not hidden): {chips}</div>'
    return f'''<section class="river-section" id="river-{rnum}">
    <div class="rhead"><h2>{river_name}</h2><span class="rcount">{len(all_mods)} real modules · {len(meanders)} real meanders (dashboard cards)</span></div>
    <p class="rrole">Real, mechanical rule: this river qualifies for Level 1.5 because it has {len(cards)} real dashboard cards to split by — most rivers have 0-1 and correctly have no meanders page at all.</p>
    {''.join(meander_blocks)}
    {uncovered_html}
  </section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Level 1.5 — Meanders)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --purple:#9B59B6; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #101420 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#5FB3D9;margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px;flex-wrap:wrap}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:#5FB3D9;border-color:#5FB3D9}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:#5FB3D9;padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
  .river-section{{max-width:1000px;margin:24px auto;padding:0 24px}}
  .rhead{{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:6px}}
  .rhead h2{{font-family:Georgia,serif;font-size:22px;color:#fff}}
  .rcount{{font-size:10.5px;color:var(--dim)}}
  .rrole{{font-size:11px;color:#6a6a78;margin-bottom:18px;line-height:1.6}}
  .meander{{background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px 18px;margin-bottom:16px}}
  .mhead{{display:flex;align-items:center;gap:10px;margin-bottom:12px}}
  .mdot{{width:11px;height:11px;border-radius:50%}}
  .mhead h3{{font-size:15px;color:#fff}}
  .mcount{{font-size:10px;color:var(--dim)}}
  .modgrid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}}
  .modcard{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:10px 12px}}
  .modname{{font-size:11.5px;font-weight:700;color:var(--gold);margin-bottom:6px}}
  .extlist{{margin-bottom:8px}}
  .ext-row{{font-size:9.5px;color:#c8c8d8;padding:2px 0;display:flex;gap:5px;align-items:baseline}}
  .ext-none{{color:#5a5a68;font-style:italic}}
  .ext-icon{{flex-shrink:0}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:9.5px;background:rgba(255,255,255,0.05);padding:1px 4px;border-radius:3px}}
  .mod-chip{{font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:8px;background:rgba(95,179,217,0.12);color:#5FB3D9;text-decoration:none;border:1px solid rgba(95,179,217,0.3);display:inline-block}}
  .mod-chip-none{{background:rgba(255,255,255,0.04);color:var(--dim);border:1px dashed rgba(255,255,255,0.15)}}
  .uncovered{{font-size:10.5px;color:#E2A83D;margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}}
  a{{color:#5FB3D9}}
  .note{{max-width:1000px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
</style>
</head>
<body>
<div class="breadcrumb">
  <a href="galaxy_map.html">🌌 Level 0</a><span class="bc-sep">→</span>
  <a href="galaxy_map_river.html">🏛️ Level 1</a><span class="bc-sep">→</span>
  <span class="bc-here">🌾 Level 1.5</span><span class="bc-sep">→</span>
  <a href="galaxy_map_module.html">🌊 Level 2</a>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Level 1.5 — Meanders</div>
  <h1>🌾 Meanders — Rivers Split By Real Dashboard Card</h1>
  <p>Only built where a real split exists: a river needs 2+ real dashboard cards to have a genuine meander boundary (rivers_needing_meanders()). Checked against live data — {n_rivers} of 16 rivers currently qualify. Modules render as compact cards (not crossing graph nodes) — full Alex/Oracle bubble detail still lives at Level 3 per module.</p>
</div>
{sections}
<div class="note">
  Generated by <code>scripts/galaxy_map_meanders.py</code> — real data from <code>graphify_river_group.py</code>'s
  <code>rivers_needing_meanders()</code>/<code>compute_external_call_sites()</code>/<code>compute_oracle_call_counts()</code>.
  Module-to-meander assignment is real but hand-checked (not 100% mechanically derivable from a single generic
  signal) — see this file's own docstring for the evidence trail. Mapping rules: <code>system_map_spec.md</code>.
</div>
</body>
</html>
"""


def main():
    rivers = rivers_needing_meanders()
    sections = ''.join(build_river_section(r) for r in rivers)
    html = TEMPLATE.format(sections=sections, n_rivers=len(rivers))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(rivers)} river(s) qualify for a real meanders split.")


if __name__ == '__main__':
    main()
