#!/usr/bin/env python3
"""
galaxy_map_level2_5.py — G38 of the ratified "RPGACE Total Systems
Galaxy Map" /CEO plan (Aug 14 2026). Real, generalized successor to
Level 1.5 (Meanders, which only ever covered River V's own 4 cards).
Alex's own real ask: "meanders should become 2.5, where all dashboard
cards live (meander is a part of the river after all) i want the river
to point out to dashboard card, and the dashboard card will contain its
functions." Real, confirmed purpose (his own words, same session):
"think of 2.5 as regrouping rivers by what is accessible by ui and
alex, this will help connect dimensions later on" — the organizing
principle here is real UI/Alex-accessibility, not just "cards under a
river."

Real, confirmed shape (his own direct answer to the one open question):
a new, ADDITIVE page — not a Level 3 rewrite. All 16 rivers shown, each
with its own real dashboard card(s) (CARDS_BY_RIVER, already-sourced —
never re-derived), each card resolved to its real PRIMARY module via
dashboard_card_primary_module() (the same Alex-confirmed classifier
Level 4 already uses, rule 8) plus a real UI-accessibility badge
(compute_module_ui_signal(), same evidence Level 2/3's own Alex bubble
already reads), linking down into that module's existing Level 3 page.
Rivers with zero real dashboard cards (I/II/XII/XIII/XV/XVI — dev-
process/backend-only rivers) are shown honestly as such, never guessed
a card.
"""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    RIVER_NAME, RIVER_COLOR, CARDS_BY_RIVER, DASHBOARD_CARDS,
    dashboard_card_primary_module, compute_module_ui_signal,
    LEVEL3_MODULES,
)

OUT = Path('graphify-out/galaxy_map_level2_5.html')

RIVER_NUMS = list(range(1, 17))


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


def build_card_block(card):
    key = card['key']
    label = card['label']
    via = card.get('via', '')
    valid_mods = set(LEVEL3_MODULES)
    primary = dashboard_card_primary_module(via, valid_mods)
    ui_badge = ''
    mod_link = ''
    # Real "logic bubbles" per Alex's own direct refinement (Aug 14,
    # same pass): each card should link to its Level 2 backend home too,
    # not just forward into Level 3. The 3rd real bubble he asked for —
    # a UI/Alex bubble sending into the future "alex/ui conjoined
    # dimension" — depends on G30 (dimensions) and G37 (Alex bubble
    # system) landing first, neither built yet; deliberately NOT faked
    # here, logged as a real amendment on G38 instead (see CLAUDE.md).
    river2_link = ''
    if card.get('rivers'):
        river2_link = f'<a class="modlink r2" href="galaxy_map_module.html#river-{card["rivers"][0]}">🌊 Level 2 (backend home)</a>'
    if primary:
        sig = compute_module_ui_signal(primary)
        has_ui = any(sig.values()) if isinstance(sig, dict) else bool(sig)
        if has_ui:
            ui_badge = '<span class="uibadge">🧑 real UI/input evidence</span>'
        mod_link = f'<a class="modlink" href="galaxy_map_level3.html#mod-{esc(primary)}">🔽 {esc(primary)} — its own functions on Level 3</a>'
    else:
        mod_link = '<span class="nomod">No single primary module — real shared/sibling ownership (see Level 4 for the full real target list)</span>'
    partial = ' <span class="partial">(partial — via text names a QoL-layer-only module)</span>' if card.get('partial') else ''
    return f'''<div class="ccard">
  <div class="chead"><span class="cicon">{esc(label)}</span>{ui_badge}</div>
  <div class="cvia">{esc(via)}{partial}</div>
  <div class="clinks">{river2_link}</div>
  <div class="cmod">{mod_link}</div>
</div>'''


def build_river_section(rnum):
    _full_name = RIVER_NAME.get(rnum, f'River {rnum} — Untitled')
    name = _full_name.split('—', 1)[1].strip() if '—' in _full_name else _full_name
    color = RIVER_COLOR.get(rnum, '#888')
    cards = CARDS_BY_RIVER.get(rnum, [])
    seen = set()
    unique_cards = []
    for c in cards:
        if c['key'] not in seen:
            seen.add(c['key'])
            unique_cards.append(c)
    if unique_cards:
        cards_html = ''.join(build_card_block(c) for c in unique_cards)
    else:
        cards_html = '<div class="nocard">No real dashboard card for this river — a dev-process/backend-only river with no direct end-user UI entry point.</div>'
    return f'''<section class="rsection" id="river-{rnum}" style="display:none">
  <div class="rhead" style="border-color:{color}"><h2 style="color:{color}">River {_roman(rnum)} — {esc(name)}</h2><span class="rcount">{len(unique_cards)} real dashboard card(s)</span></div>
  <div class="cgrid">{cards_html}</div>
  <div class="rback"><a href="galaxy_map_module.html#river-{rnum}">🔭 zoom out: Level 2 (this river's own modules)</a></div>
</section>'''


def _roman(n):
    vals = [(10, 'X'), (9, 'IX'), (5, 'V'), (4, 'IV'), (1, 'I')]
    out = ''
    for v, s in vals:
        while n >= v:
            out += s
            n -= v
    return out


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Level 2.5 — UI/Alex Accessibility)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --red:#E25454; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #10141a 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px;flex-wrap:wrap}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:var(--gold);border-color:var(--gold)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--gold);padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
  .tabs{{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}}
  .tab{{padding:5px 11px;border-radius:14px;font-size:10.5px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .tab.active{{background:var(--gold);color:#1a1608;font-weight:700}}
  .rsection{{max-width:1000px;margin:0 auto;padding:24px}}
  .rhead{{display:flex;align-items:center;gap:10px;border-left:3px solid;padding-left:12px;margin-bottom:16px;flex-wrap:wrap}}
  .rhead h2{{font-family:Georgia,serif;font-size:19px}}
  .rcount{{font-size:10px;color:var(--dim);font-weight:700}}
  .cgrid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}}
  .ccard{{background:rgba(255,255,255,0.03);border:1px solid rgba(201,168,76,0.2);border-radius:10px;padding:14px 16px}}
  .chead{{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}}
  .cicon{{font-size:12.5px;font-weight:700;color:#fff}}
  .uibadge{{font-size:9px;color:var(--gold)}}
  .cvia{{font-size:10px;color:var(--dim);line-height:1.5;margin-bottom:8px;font-family:'Cascadia Code','Fira Mono',monospace}}
  .partial{{color:#E0A040}}
  .modlink{{font-size:10.5px;font-weight:700;color:var(--red);text-decoration:none}}
  .clinks{{margin-bottom:6px}}
  .modlink.r2{{color:#5FB3D9;font-size:10px}}
  .nomod{{font-size:10px;color:var(--dim)}}
  .nocard{{font-size:11.5px;color:var(--dim);font-style:italic;padding:10px 0}}
  .rback{{margin-top:14px}}
  .rback a{{font-size:10.5px;color:#5FB3D9;text-decoration:none}}
  a{{color:var(--gold)}}
  .note{{max-width:1000px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
</style>
</head>
<body>
<div class="breadcrumb">
  <a href="galaxy_map.html">🌌 Level 0</a><span class="bc-sep">→</span>
  <a href="galaxy_map_river.html">🏛️ Level 1</a><span class="bc-sep">→</span>
  <a href="galaxy_map_module.html">🌊 Level 2</a><span class="bc-sep">→</span>
  <span class="bc-here">🚪 Level 2.5</span><span class="bc-sep">→</span>
  <a href="galaxy_map_level3.html">🔽 Level 3</a>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Level 2.5 (G38)</div>
  <h1>🚪 Rivers Regrouped by UI/Alex Accessibility</h1>
  <p>The real generalized successor to Meanders (Level 1.5, which only ever covered River V) — all 16 rivers, each pointing to its own real dashboard card(s), each card resolved to the real primary module that contains its functions. Alex's own framing: "regrouping rivers by what is accessible by ui and alex" — the real connective layer for future dimension-building.</p>
</div>
<div class="tabs">{tabs}</div>
{sections}
<div class="note">
  Generated by <code>scripts/galaxy_map_level2_5.py</code> — real data reused from
  <code>CARDS_BY_RIVER</code>/<code>dashboard_card_primary_module()</code>/<code>compute_module_ui_signal()</code>
  (rule 8, never re-derived). G38 of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan.
</div>
<script>
(function() {{
  var tabs = document.querySelectorAll('.tab');
  var sections = document.querySelectorAll('.rsection');
  function show(id) {{
    sections.forEach(function(s) {{ s.style.display = (s.id === id) ? '' : 'none'; }});
    tabs.forEach(function(t) {{ t.classList.toggle('active', t.dataset.target === id); }});
  }}
  tabs.forEach(function(t) {{ t.addEventListener('click', function() {{ location.hash = t.dataset.target; }}); }});
  window.addEventListener('hashchange', function() {{
    var id = location.hash.replace('#', '') || (sections[0] && sections[0].id);
    show(id);
  }});
  var id0 = location.hash.replace('#', '') || (sections[0] && sections[0].id);
  show(id0);
}})();
</script>
</body>
</html>
"""


def main():
    tabs = ''.join(f'<div class="tab" data-target="river-{r}">{_roman(r)}</div>' for r in RIVER_NUMS)
    sections = ''.join(build_river_section(r) for r in RIVER_NUMS)
    html = TEMPLATE.format(tabs=tabs, sections=sections)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    total_cards = sum(len({c['key'] for c in CARDS_BY_RIVER.get(r, [])}) for r in RIVER_NUMS)
    print(f"Wrote {OUT} — 16 rivers, {total_cards} real river-card placements.")


if __name__ == '__main__':
    main()
