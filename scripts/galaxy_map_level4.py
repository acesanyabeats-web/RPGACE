#!/usr/bin/env python3
"""
galaxy_map_level4.py — G15 of the ratified "RPGACE Total Systems Galaxy
Map" /CEO plan (Aug 14 2026). Alex's own direct, Aug 13-confirmed scope:
"click a dashboard card -> Level 4 shows what actually happens on click
(which page/popup opens, real DOM evidence, buttons pressed, where it
leads)... all level n components must attach to n-1 where possible."

Real data source, never hand-guessed: graphify_river_group.py's
compute_dashboard_card_flow() reads dashDeck.MODULES' own real `go:`
trigger function directly from rpgace_core.js (not DASHBOARD_CARDS' own
`via` field, a separate, independently-useful hand-written label) and
resolves it one real hop deep — a real popup call (and, where the same
established `_openX()` -> target-module-own-`_inject*()` pattern holds,
the real content-owning module underneath dashDeck's own opener), or a
real page navigation, with every real cross-module call and real
UI_OUTPUT/UI_INPUT signal found along the way.

Real, honest scope limits, stated plainly: this traces ONE real hop past
the dashboard-card click (the `go:` trigger's own direct call, plus one
further real sub-injector hop where that established pattern is found).
A relationship reached through a DOM event bound later, inside a
still-deeper nested closure, is not chased further here — same class of
"direct calls only" limit every other level in this pipeline already
states. `dashDeck` itself is confirmed NOT one of the 44 real
RIVER_MODULES-tracked modules (a real, pre-existing structural fact, not
a bug this pass invents a fix for) — its own popup-opening functions are
shown here with their real evidence, but link to Level 3 only via
whichever real target module they hand off to, honestly labeled "no
Level-3 page" when none exists.
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    DASHBOARD_CARDS, LEVEL3_MODULES, compute_dashboard_card_flow,
    CARDS_BY_RIVER, RIVER_MODULES, RIVER_NAME, RIVER_COLOR,
    compute_card_oracle_call_count,
)

OUT = Path('graphify-out/galaxy_map_level4.html')

FLOW = compute_dashboard_card_flow()


def _mod_link(mod, label=None):
    """Real, honest per-module link — Level 3 if that module actually
    has a built page (LEVEL3_MODULES, rule 8, never re-derived), a
    plain unlinked label with the real reason otherwise (dashDeck's own
    real, confirmed absence from RIVER_MODULES)."""
    label = label or mod
    if mod in LEVEL3_MODULES:
        return f'<a href="galaxy_map_level3.html#mod-{mod}" class="mod-chip">🔽 {label}</a>'
    return f'<span class="mod-chip mod-chip-none" title="dashDeck is confirmed NOT one of the 44 real RIVER_MODULES-tracked modules — a real, pre-existing structural fact, not a gap this page invents a fix for">{label} <span class="meta">(no Level-3 page)</span></span>'


def _river_link(rnum):
    color = RIVER_COLOR.get(rnum, '#8a8a9a')
    name = RIVER_NAME.get(rnum, f'River {rnum}').split('—')[0].strip()
    # Real /deduplication+/paranoia fix (Aug 15) — real evidence found
    # Level 4 (this page, per-card DOM/button-level flow detail) and
    # Level 2.5 (river-grouped card->primary-module + UI-accessibility
    # summary) are NOT duplicates (different real granularity, same
    # non-instance precedent as taxonomy_nodes vs taxonomy_tree), but
    # Level 4 only ever linked back to Level 2, never to the newer
    # Level 2.5 convergence point — a real, cheap navigation gap, now
    # fixed with a second real chip, not a restructure.
    return (f'<a href="galaxy_map_module.html#river-{rnum}" class="river-chip" style="border-color:{color};color:{color}">🌊 {name} · L2</a>'
            f'<a href="galaxy_map_level2_5.html#river-{rnum}" class="river-chip" style="border-color:{color};color:{color}">🚪 {name} · L2.5</a>')


def build_card_section(card):
    key = card['key']
    entry = FLOW.get(key, {'go_body': '', 'targets': []})
    color = '#C9A84C'
    rivers_html = ''.join(_river_link(r) for r in card['rivers'])

    target_blocks = []
    for t in entry['targets']:
        if t['kind'] == 'page':
            page = t['page']
            cand_mods = []
            for r in card['rivers']:
                cand_mods.extend(RIVER_MODULES.get(r, []))
            chips = ''.join(_mod_link(m) for m in dict.fromkeys(cand_mods)) or '<span class="meta">none tracked</span>'
            target_blocks.append(
                f'<div class="tblock"><div class="tkind">🖥️ Real page navigation</div>'
                f'<div class="tcode"><code>showPage(RPGACE.CONFIG.pages.{page})</code></div>'
                f'<div class="tnote">No single owning module — this page is fed by every real module in its own river(s), honestly listed (never forced to one guessed winner):</div>'
                f'<div class="chips">{chips}</div></div>'
            )
            continue
        mod, fn = t['module'], t['func']
        out_badge = '✅ real DOM/popup rendering' if t['output'] else '— no direct render evidence'
        in_badge = '✅ real buttons/input wired' if t['input'] else '— no direct input evidence'
        sub_html = ''
        if t['sub_injector']:
            sm, sf = t['sub_injector']
            sub_html = (f'<div class="tnote">Hands off to the real content-owning module (the established '
                        f'<code>_openX()</code> → target-module-own-<code>_inject*()</code> pattern, confirmed by direct read):</div>'
                        f'<div class="chips">{_mod_link(sm, f"{sm}.{sf}()")}</div>')
        other_calls = [(m, f) for m, f in t['sub_calls'] if not (t['sub_injector'] and (m, f) == t['sub_injector'])]
        calls_html = ''
        if other_calls:
            # Real, direct evidence-backed links, not plain text — a
            # cross-module touch found here (Aug 14, Alex's own rule:
            # "all level n components must attach to n-1 where
            # possible") is exactly as real as a sub_injector hop, just
            # found via a different real code shape (e.g. a per-row
            # onclick calling `rt.show(t.key)` inside _openResearch,
            # rather than a single _inject*() handoff) — both deserve
            # the same real Level-3 link when one exists.
            rows = ''.join(_mod_link(m, f'{m}.{f}()') for m, f in dict.fromkeys(other_calls))
            calls_html = f'<div class="tnote">Further real cross-module touches inside this popup — where the buttons inside it lead:</div><div class="chips">{rows}</div>'
        target_blocks.append(
            f'<div class="tblock"><div class="tkind">💬 Real popup/panel</div>'
            f'<div class="tcode"><code>RPGACE.modules.{mod}.{fn}()</code></div>'
            f'<div class="evrow"><span>{out_badge}</span><span>{in_badge}</span></div>'
            f'{sub_html}{calls_html}'
            f'<div class="tnote">Own Level-3 chain:</div><div class="chips">{_mod_link(mod)}</div></div>'
        )

    # Real, cosmetic-only trim (parsing/evidence above already used the
    # full, safely-over-captured span — this only cleans the verbatim
    # <pre> DISPLAY, which otherwise trails into the next card's own
    # opening `{` per parse_dashboard_card_go()'s own "capture until
    # the next marker" technique). The go: function's own real closing
    # is always the LAST `} }` in the span (function brace + object
    # literal brace) — confirmed by direct read of all 12 real cards.
    go_body = entry['go_body']
    _close = list(re.finditer(r'\}\s*\}', go_body))
    if _close:
        go_body = go_body[:_close[-1].end()]
    go_body_esc = (go_body or '(no real go: trigger found)').replace('<', '&lt;').replace('>', '&gt;')

    # G16 continuation (Aug 14) — real, evidence-gated Oracle badge,
    # same lightweight-aggregate treatment as Level 1's own (rule 8):
    # reuses compute_card_oracle_call_count() over this card's own
    # already-resolved real target modules, never re-derived.
    oracle_n = compute_card_oracle_call_count(card, FLOW)
    oracle_badge = f'<span class="oracle-badge" title="Real Oracle calls across this card&#39;s own resolved target module(s)">🔮 {oracle_n} real Oracle call(s)</span>' if oracle_n else ''

    return f'''<section class="card-section" id="card-{key}" style="display:none">
  <div class="chead"><span class="cdot" style="background:{color}"></span><h2>{card['label']} — real frontend flow</h2>{oracle_badge}</div>
  <div class="crivers">{rivers_html}</div>
  <p class="clegend-role">What actually happens when this dashboard card is clicked, traced from <code>dashDeck.MODULES</code>'s own real <code>go:</code> trigger in <code>rpgace_core.js</code> — never a guessed description. Real links down to Level 3 attach wherever a target module has a built function-chain page.</p>
  <div class="gobody"><div class="gobody-label">Real <code>go:</code> trigger (verbatim, from rpgace_core.js)</div><pre>{go_body_esc}</pre></div>
  <div class="targets">{''.join(target_blocks) or '<div class="tblock"><div class="tkind">⚠️ No real target resolved</div></div>'}</div>
</section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Level 4)</title>
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
  .tabs{{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}}
  .tab{{padding:6px 14px;border-radius:16px;font-size:11.5px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .tab.active{{background:var(--gold);color:#1a1a12;font-weight:700}}
  .chead{{display:flex;align-items:center;gap:10px;justify-content:center;padding:24px 24px 6px}}
  .oracle-badge{{font-size:9.5px;font-weight:700;padding:2px 9px;border-radius:10px;background:rgba(155,89,182,0.12);color:#9B59B6;border:1px solid rgba(155,89,182,0.3)}}
  .cdot{{width:12px;height:12px;border-radius:50%}}
  .chead h2{{font-family:Georgia,serif;font-size:19px;color:#fff}}
  .crivers{{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:0 24px 10px}}
  .river-chip{{font-size:9.5px;font-weight:700;padding:3px 9px;border-radius:10px;border:1px solid;text-decoration:none;background:rgba(255,255,255,0.03)}}
  .clegend-role{{text-align:center;color:var(--dim);font-size:11.5px;max-width:760px;margin:0 auto 16px;line-height:1.6;padding:0 24px}}
  .back-btn{{display:block;text-align:center;font-size:11px;font-weight:700;color:var(--gold);text-decoration:none;margin:0 0 10px}}
  .back-btn:hover{{text-decoration:underline}}
  .gobody{{max-width:760px;margin:0 auto 18px;padding:0 24px}}
  .gobody-label{{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin-bottom:6px}}
  .gobody pre{{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px 14px;font-family:'Cascadia Code','Fira Mono',monospace;font-size:10.5px;color:#c8c8d8;white-space:pre-wrap;line-height:1.6;overflow-x:auto}}
  .targets{{max-width:760px;margin:0 auto 48px;padding:0 24px;display:flex;flex-direction:column;gap:14px}}
  .tblock{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px 18px}}
  .tkind{{font-size:12.5px;font-weight:700;color:var(--gold);margin-bottom:8px}}
  .tcode{{margin-bottom:10px}}
  .evrow{{display:flex;gap:16px;font-size:10.5px;color:var(--dim);margin-bottom:8px;flex-wrap:wrap}}
  .tnote{{font-size:10.5px;color:#6a6a78;margin:8px 0 6px}}
  .chips{{display:flex;gap:8px;flex-wrap:wrap}}
  .mod-chip{{font-size:10.5px;font-weight:700;padding:3px 10px;border-radius:10px;background:rgba(201,168,76,0.12);color:var(--gold);text-decoration:none;border:1px solid rgba(201,168,76,0.3)}}
  .mod-chip-none{{background:rgba(255,255,255,0.04);color:var(--dim);border:1px dashed rgba(255,255,255,0.15);cursor:help}}
  .mod-chip .meta{{opacity:0.7;font-weight:400}}
  .chip-sm{{font-size:9.5px;color:#a8a8b8;background:rgba(255,255,255,0.04);padding:2px 8px;border-radius:8px}}
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
  <a href="galaxy_map_level3.html">🔽 Level 3</a><span class="bc-sep">→</span>
  <span class="bc-here">🖱️ Level 4</span><span class="bc-sep">→</span>
  <a href="galaxy_map_level5.html">🧠 Level 5</a>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Level 4 (superseded, kept for reference)</div>
  <h1>🖱️ Real Frontend Flow, Per Dashboard Card</h1>
  <p><b>G48, Aug 18 — this page's own numbered role is retired.</b> Its real dashboard-card-click evidence is folded into <a href="galaxy_map_module.html">the Module page</a>'s own new 💉 Supabase injection bubble and the Alex↔RPGACE-Architecture dimension lens (<a href="galaxy_map_l0.html">L0 units</a>) — the freed "Level 4" slot is repurposed as <a href="galaxy_map_zoom.html">the zoomed Current walkthrough</a>. This page stays on disk, real and unbroken, as detailed per-card click-flow reference (rule 8 — real content never destroyed, just no longer the primary destination). All {n_cards} of 12 real dashboard cards (<code>dashDeck.MODULES</code>) shown below.</p>
</div>
<div class="tabs">{tabs}</div>
{sections}
<div class="note">
  Generated by <code>scripts/galaxy_map_level4.py</code> — real data from <code>graphify_river_group.py</code>'s
  <code>compute_dashboard_card_flow()</code> (reads <code>dashDeck.MODULES</code>' own real <code>go:</code> trigger
  directly from rpgace_core.js, never DASHBOARD_CARDS' own hand-written <code>via</code> label). All 12 real
  dashboard cards built. Mapping rules: <code>system_map_spec.md</code>.
</div>
<script>
(function() {{
  var tabs = document.querySelectorAll('.tab');
  var sections = document.querySelectorAll('.card-section');
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
</script>
</body>
</html>
"""


def main():
    tabs = ''.join(f'<div class="tab" data-target="card-{c["key"]}">{c["label"]}</div>' for c in DASHBOARD_CARDS)
    sections = ''.join(build_card_section(c) for c in DASHBOARD_CARDS)
    html = TEMPLATE.format(tabs=tabs, sections=sections, n_cards=len(DASHBOARD_CARDS))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    linked = sum(1 for c in DASHBOARD_CARDS for t in FLOW.get(c['key'], {}).get('targets', [])
                 if t['kind'] == 'popup' and (
                     t['module'] in LEVEL3_MODULES or
                     (t['sub_injector'] and t['sub_injector'][0] in LEVEL3_MODULES) or
                     any(m in LEVEL3_MODULES for m, _f in t['sub_calls'])))
    print(f"Wrote {OUT} — {len(DASHBOARD_CARDS)} real dashboard cards, "
          f"{linked} real popup targets with a built Level-3 page.")


if __name__ == '__main__':
    main()
