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
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    parse_module_ranges, _function_bodies, compute_function_branches,
    compute_function_ui_signals, compute_oracle_call_counts,
    compute_supabase_table_touches, compute_cross_module_function_calls,
    RIVER_MODULES, RIVER_NAME, CORE_JS,
)
from galaxy_map_level5 import DECISION_POINTS  # noqa: E402

OUT = Path('graphify-out/galaxy_map_current.html')

_river_of = {}
for _r, _mods in RIVER_MODULES.items():
    for _m in _mods:
        _river_of[_m] = _r

# Real, hand-curated notable lookup — {(module, func): decision_point},
# reused directly from Level 5 (rule 8), never re-derived. A decision
# point with no real 'func' key (module-scoped only) is skipped here —
# it stays real Level-5 content, just not attachable to one function.
NOTABLE = {(dp['module'], dp['func']): dp for dp in DECISION_POINTS if dp.get('func')}

CROSS_CALLS = compute_cross_module_function_calls()
NEXT_HOPS = {}
PREV_HOPS = {}
for fm, ff, tm, tf in CROSS_CALLS:
    NEXT_HOPS.setdefault((fm, ff), []).append((tm, tf))
    PREV_HOPS.setdefault((tm, tf), []).append((fm, ff))

MODULES = sorted(m for mods in RIVER_MODULES.values() for m in mods)
KIND_ICON = {'if': '🔀', 'else if': '🔁', 'else': '↩️', 'switch': '🔢'}


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


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

    next_chips = ''.join(
        f'<a class="hop-chip" href="#cur-{tm}-{tf}">→ {esc(tm)}.{esc(tf)}()</a>' for tm, tf in NEXT_HOPS.get((mod, func), []))
    prev_chips = ''.join(
        f'<a class="hop-chip" href="#cur-{fm}-{ff}">← {esc(fm)}.{esc(ff)}()</a>' for fm, ff in PREV_HOPS.get((mod, func), []))
    if not next_chips:
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
  <div class="cur-io">
    <div class="io-col"><div class="io-label">⬅ Input</div>{prev_chips}</div>
    <div class="io-col"><div class="io-label">Handling ({len(branches)} real branch point(s))</div>{branch_rows}</div>
    <div class="io-col"><div class="io-label">Output → Next ➡</div>{next_chips}</div>
  </div>
  {notable_html}
</div>'''


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
    return f'''<section class="mod-section" id="mod-{mod}" style="display:none">
  <div class="mhead"><h2>{mod}</h2><span class="river-chip">{river_label}</span>
    <span class="mtotal">{len(funcs)} real Current(s)</span>
    <a class="l3-link" href="galaxy_map_level3.html#mod-{mod}" title="Superseded call-chain graph, kept for reference">🔽 old Level 3 (superseded)</a></div>
  <div class="currents">{blocks}</div>
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
  .mhead{{display:flex;align-items:center;gap:10px;padding:20px 24px 6px;max-width:900px;margin:0 auto;flex-wrap:wrap}}
  .mhead h2{{font-family:Georgia,serif;font-size:18px;color:#fff}}
  .river-chip{{font-size:9.5px;padding:2px 8px;border-radius:8px;background:rgba(255,255,255,0.06);color:var(--dim)}}
  .mtotal{{font-size:9.5px;color:var(--dim)}}
  .l3-link{{margin-left:auto;font-size:9.5px;color:var(--dim);text-decoration:none}}
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
  .branch-row{{display:flex;gap:6px;margin-bottom:3px;align-items:baseline}}
  .bkind{{opacity:0.7}}
  .no-branch,.meta{{color:#5a5a68;font-size:9.5px}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:9.5px;background:rgba(255,255,255,0.05);padding:1px 4px;border-radius:3px}}
  .notable-box{{margin-top:10px;padding:10px 12px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.25);border-radius:8px;font-size:10.5px;line-height:1.6}}
  .nb-title{{font-weight:700;color:var(--gold);margin-bottom:4px}}
  a{{color:var(--gold)}}
  .note{{max-width:900px;margin:20px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
</style>
</head>
<body>
<div class="breadcrumb">
  <a href="galaxy_map_l0_units.html">🌌 L0</a>
  <a href="galaxy_map_module.html">🌊 Level 2</a>
  <span class="bc-here">🧬 Current Series (replaces Level 3)</span>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Current Series</div>
  <h1>🧬 Every Module, as a Series of Currents</h1>
  <p>{n_funcs} real Currents (functions) across {n_mods} modules — the real replacement for Level 3's old call-chain-graph role. ⭐ = Level 5's own curated "core logic" write-up, folded in rather than lost. 🧑 = real Alex/UI input-output evidence. 🔮 = real Oracle call count. 💉 = a real Supabase injection-tool touch. Pick a module below.</p>
</div>
<div class="modpicker">{mod_tabs}</div>
{mod_sections}
<div class="note">
  Generated by <code>scripts/galaxy_map_current.py</code> — real data from
  <code>compute_function_branches()</code> (Level 6's own exhaustive detector, reused not re-derived),
  Level 5's own curated <code>DECISION_POINTS</code>, and the real per-function Alex/Oracle/Supabase
  signals already proven elsewhere in this pipeline. The old <a href="galaxy_map_level3.html">Level 3
  call-chain graph</a> is kept on disk for reference (rule 8's "never destroy real content") but is no
  longer the primary destination — every real link now routes here first.
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
    if (raw.startsWith('cur-')) {{ setTimeout(function() {{ var el = document.getElementById(raw); if (el) el.scrollIntoView({{block:'center'}}); }}, 60); }}
  }});
  var id0raw = location.hash.replace('#', '');
  var id0 = id0raw.startsWith('cur-') ? 'mod-' + id0raw.split('-')[1] : (id0raw || (sections[0] && sections[0].id));
  show(id0);
}})();
</script>
</body>
</html>
"""


def main():
    mod_tabs = ''.join(f'<div class="mod-tab" data-target="mod-{m}">{m}</div>' for m in MODULES)
    mod_sections = ''.join(build_module_section(m) for m in MODULES)
    total_funcs = sum(len(_function_bodies(m).keys()) for m in MODULES)
    html = TEMPLATE.format(mod_tabs=mod_tabs, mod_sections=mod_sections,
                            n_funcs=total_funcs, n_mods=len(MODULES))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(MODULES)} modules, {total_funcs} real Currents, "
          f"{len(NOTABLE)} notable (Level-5-linked).")


if __name__ == '__main__':
    main()
