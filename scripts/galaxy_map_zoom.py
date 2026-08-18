#!/usr/bin/env python3
"""
galaxy_map_zoom.py — G47 continuation (Level 4's freed slot repurposed).
Alex's own words: "level 4 is each current viewed in zoom, following
current after current until a new modules is reached." Reuses every
real data structure galaxy_map_current.py (G47's Current-list half)
already built — never re-derived (rule 8). Level 4's OLD role
(dashboard-card flow) is G48's job to retire into the Module page; this
file doesn't touch that content.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from galaxy_map_current import (  # noqa: E402
    MODULES, NEXT_HOPS, PREV_HOPS, NOTABLE, KIND_ICON, esc,
)
from graphify_river_group import (  # noqa: E402
    _function_bodies, compute_function_branches, compute_function_ui_signals,
    compute_oracle_call_counts, compute_supabase_table_touches,
)

OUT = Path('graphify-out/galaxy_map_zoom.html')


def build_zoom_card(mod, func, mod_branches, mod_ui, mod_oracle, mod_sb):
    # Real perf fix (R5-adjacent — a first version called these 4
    # detectors PER FUNCTION, each re-parsing the whole module's real
    # source from scratch every call; 436 real functions x 4 full
    # re-parses each timed out past 120s). Precomputed ONCE per module
    # by the caller instead (matches galaxy_map_current.py's own
    # already-correct per-module-once pattern, rule 8 — should have
    # reused that shape from the start).
    branches = mod_branches.get(func, [])
    ui = mod_ui.get(func, {})
    oracle_n = mod_oracle.get(func, 0)
    sb = mod_sb.get(func, [])
    notable = NOTABLE.get((mod, func))

    badges = []
    if ui.get('input'):
        badges.append('<span class="ubub ub-alex">🧑 real input evidence</span>')
    if ui.get('output'):
        badges.append('<span class="ubub ub-alex">🧑 real output evidence</span>')
    if oracle_n:
        badges.append(f'<span class="ubub ub-oracle">🔮 {oracle_n} real Oracle call(s)</span>')
    if sb:
        tables = ', '.join(sorted(set(t for _op, t in sb)))
        badges.append(f'<span class="ubub ub-inject">💉 injects: {esc(tables)}</span>')

    branch_html = ''.join(
        f'<div class="branch-row"><span class="bkind">{KIND_ICON.get(b["kind"], "•")}</span>'
        f'<code>{esc(b["condition"]) if b["condition"] else "(fallback branch)"}</code></div>'
        for b in branches) or '<div class="no-branch">No real conditional branch — a straight-line function.</div>'

    prev_hops = PREV_HOPS.get((mod, func), [])
    next_hops = NEXT_HOPS.get((mod, func), [])
    prev_html = ''.join(f'<a class="hop-btn" href="#zoom-{fm}-{ff}">← {esc(fm)}.{esc(ff)}()</a>' for fm, ff in prev_hops) \
        or '<span class="meta">No real cross-module caller detected — a genuine real entry point, or same-module (not tracked at this grain).</span>'
    next_html = ''.join(f'<a class="hop-btn hop-next" href="#zoom-{tm}-{tf}">Continue → {esc(tm)}.{esc(tf)}() →</a>' for tm, tf in next_hops) \
        or '<span class="meta terminal">🏁 Real terminal — no further cross-module hop detected. The chain ends here, or continues within the same module (not tracked at this grain).</span>'
    boundary_note = ''
    if next_hops and any(tm != mod for tm, _tf in next_hops):
        boundary_note = '<div class="boundary">⚡ Crossing into a new module here — the natural real stopping point.</div>'

    notable_html = ''
    if notable:
        notable_html = (f'<div class="notable-box"><div class="nb-title">⭐ {esc(notable["title"])}</div>'
                         f'<div class="nb-row"><b>Decider:</b> {esc(notable["decider"])}</div>'
                         f'<div class="nb-row"><b>Decides:</b> {esc(notable["decides"])}</div>'
                         f'<div class="nb-row"><b>Changes:</b> {esc(notable["changes"])}</div>'
                         f'<div class="nb-row"><b>Result:</b> {esc(notable["result"])}</div></div>')

    return f'''<section class="zoom-card" id="zoom-{mod}-{func}" style="display:none">
  <div class="zhead">
    <a class="up-link" href="galaxy_map_current.html#cur-{mod}-{func}">🔭 zoom out: Level 3 (Current list)</a>
  </div>
  <div class="zname">{esc(mod)}.{esc(func)}()</div>
  <div class="badges">{''.join(badges) or '<span class="meta">No real Alex/Oracle/Supabase signal detected on this specific function.</span>'}</div>
  <div class="zsection"><div class="zlabel">⬅ Input — what fed this Current</div>{prev_html}</div>
  <div class="zsection"><div class="zlabel">Handling — {len(branches)} real branch point(s)</div>{branch_html}</div>
  {notable_html}
  <div class="zsection"><div class="zlabel">Output → Next Current ➡</div>{next_html}</div>
  {boundary_note}
</section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Zoomed Current Walkthrough)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --purple:#9B59B6; --red:#E25454; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 20%, #14101e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:760px;margin:0 auto;line-height:1.6}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;flex-wrap:wrap}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--gold);padding:4px 9px;border-radius:12px}}
  .picker{{max-width:700px;margin:20px auto;padding:0 24px;text-align:center}}
  .picker select{{background:#14101e;color:var(--text);border:1px solid rgba(255,255,255,0.2);padding:8px 12px;border-radius:8px;font-size:12px;max-width:100%}}
  .zoom-card{{max-width:640px;margin:0 auto 40px;padding:24px 26px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.12);border-radius:14px}}
  .zhead{{display:flex;justify-content:space-between;margin-bottom:12px}}
  .up-link{{font-size:10px;color:var(--dim);text-decoration:none}}
  .zname{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:16px;color:var(--gold);font-weight:700;margin-bottom:10px}}
  .badges{{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}}
  .ubub{{font-size:9.5px;font-weight:700;padding:3px 9px;border-radius:9px}}
  .ub-alex{{background:rgba(226,84,84,0.12);color:var(--red)}}
  .ub-oracle{{background:rgba(155,89,182,0.14);color:var(--purple)}}
  .ub-inject{{background:rgba(42,191,176,0.12);color:#2ABFB0}}
  .zsection{{margin-bottom:16px}}
  .zlabel{{font-size:9.5px;font-weight:700;color:var(--dim);text-transform:uppercase;margin-bottom:8px}}
  .branch-row{{display:flex;gap:8px;margin-bottom:5px;font-size:11px}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10.5px;background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:3px}}
  .no-branch,.meta{{color:#6a6a78;font-size:11px}}
  .terminal{{color:var(--gold)}}
  .hop-btn{{display:inline-block;color:var(--gold);text-decoration:none;font-size:11.5px;padding:6px 12px;border:1px solid rgba(201,168,76,0.3);border-radius:8px;margin:0 6px 6px 0}}
  .hop-next{{background:rgba(201,168,76,0.1);font-weight:700}}
  .boundary{{font-size:10.5px;color:var(--gold);text-align:center;margin-top:10px}}
  .notable-box{{margin:12px 0;padding:12px 14px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.25);border-radius:8px;font-size:10.5px;line-height:1.6}}
  .nb-title{{font-weight:700;color:var(--gold);margin-bottom:4px}}
  a{{color:var(--gold)}}
  .note{{max-width:760px;margin:20px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
</style>
</head>
<body>
<div class="breadcrumb">
  <a href="galaxy_map_l0_units.html">🌌 L0</a>
  <a href="galaxy_map_current.html">🧬 Current Series</a>
  <span class="bc-here">🔎 Zoomed Walkthrough</span>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Zoomed Current Walkthrough</div>
  <h1>🔎 Follow the Chain, Current by Current</h1>
  <p>Level 4's freed slot (its old dashboard-card-flow role is retired into the Module page, G48) repurposed as this: click a Current from the list, then walk it forward — real input, real handling, real output, and a real "Continue →" to whatever it calls next, until a genuine terminal or a module boundary.</p>
</div>
<div class="picker"><select id="jumpto"></select></div>
{zoom_cards}
<div class="note">
  Generated by <code>scripts/galaxy_map_zoom.py</code> — reuses every real data structure from
  <code>galaxy_map_current.py</code> (G47) directly, zero new detection logic.
</div>
<script>
(function() {{
  var cards = document.querySelectorAll('.zoom-card');
  var sel = document.getElementById('jumpto');
  cards.forEach(function(c) {{
    var o = document.createElement('option'); o.value = c.id; o.textContent = c.id.replace('zoom-', ''); sel.appendChild(o);
  }});
  function show(id) {{ cards.forEach(function(c) {{ c.style.display = (c.id === id) ? '' : 'none'; }}); sel.value = id; }}
  sel.addEventListener('change', function() {{ location.hash = sel.value; }});
  window.addEventListener('hashchange', function() {{
    var id = location.hash.replace('#', '') || (cards[0] && cards[0].id);
    show(id);
  }});
  var id0 = location.hash.replace('#', '') || (cards[0] && cards[0].id);
  show(id0);
}})();
</script>
</body>
</html>
"""


def main():
    all_pairs = []
    zoom_cards_parts = []
    for m in MODULES:
        mod_branches = compute_function_branches(m)
        mod_ui = compute_function_ui_signals(m)
        mod_oracle = compute_oracle_call_counts(m)
        mod_sb = compute_supabase_table_touches(m)
        for f in sorted(_function_bodies(m).keys()):
            all_pairs.append((m, f))
            zoom_cards_parts.append(build_zoom_card(m, f, mod_branches, mod_ui, mod_oracle, mod_sb))
    zoom_cards = ''.join(zoom_cards_parts)
    html = TEMPLATE.format(zoom_cards=zoom_cards)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(all_pairs)} real zoomed Current cards.")


if __name__ == '__main__':
    main()
