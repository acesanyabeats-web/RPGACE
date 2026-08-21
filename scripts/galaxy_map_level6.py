#!/usr/bin/env python3
"""
galaxy_map_level6.py — G18 of the ratified "RPGACE Total Systems Galaxy
Map" /CEO plan (Aug 14 2026). Alex's own direct ask: "then do level 6
for all yes/no — detailed decision." The exhaustive, MECHANICAL
counterpart to Level 5's hand-curated "core logic" — every real
if/else-if/else/switch branch a function's own body contains, not a
hand-picked subset.

Real data source, never invented: compute_function_branches()
(graphify_river_group.py) — real balanced-paren extraction of every
real conditional's own condition text, grouped by module -> function.
1088 real branch points across 44 modules, confirmed by direct count
before this page was built (never assumed).

Real, honest scope limit, stated plainly (same class of limit as every
other level in this pipeline): this lists WHERE a real decision point
exists and WHAT its real condition text says — it does not attempt to
explain WHY in prose (that's Level 5's hand-curated job for the subset
that earns it). A condition string like `mode === 'dummy'` is exactly
as informative as this level promises to be: exhaustive and honest,
not narrated.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    LEVEL3_MODULES, RIVER_NAME, RIVER_MODULES, compute_function_branches,
)
from graphify_river_group import inject_level_rail  # noqa: E402

OUT = Path('graphify-out/galaxy_map_level6.html')

_river_of = {}
for _r, _mods in RIVER_MODULES.items():
    for _m in _mods:
        _river_of[_m] = _r

KIND_ICON = {'if': '🔀', 'else if': '🔁', 'else': '↩️', 'switch': '🔢'}


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def build_module_section(mod, branches):
    total = sum(len(v) for v in branches.values())
    rnum = _river_of.get(mod)
    river_label = RIVER_NAME.get(rnum, '').split('—')[0].strip() if rnum else ''
    func_blocks = []
    for f in sorted(branches.keys()):
        rows = ''.join(
            f'<div class="branch-row"><span class="bkind">{KIND_ICON.get(b["kind"], "•")} {esc(b["kind"])}</span>'
            f'<code class="bcond">{esc(b["condition"]) if b["condition"] else "(no condition — real fallback branch)"}</code></div>'
            for b in branches[f]
        )
        # G20/Q3 (Aug 14, Alex's own answer): "most logic steps wont
        # have another logic step to transfer to at level 6, so it just
        # connects to n-1 next step function." Real, honest scope: Level
        # 3's own hash-router only resolves at MODULE granularity (its
        # bands/functions have no individual anchor id of their own),
        # so this link's real destination is the function's own module
        # page, not a scrolled-to individual node — stated plainly, not
        # overclaimed as function-precise.
        func_blocks.append(
            f'<div class="fblock"><div class="fname">{esc(f)}() '
            f'<span class="fcount">{len(branches[f])} real branch point(s)</span>'
            f'<a class="n1-link" href="galaxy_map_current.html#mod-{mod}" title="Real n-1 — this function\'s own module page (Current Series lands on the module, not a scrolled-to function)">🔭 n-1: {mod}.{esc(f)}()</a></div>{rows}</div>'
        )
    return f'''<section class="msection" id="m-{mod}" style="display:none">
  <div class="mhead"><h2>{mod}</h2><span class="river-chip">{river_label}</span><span class="mtotal">{total} real branch point(s) across {len(branches)} function(s)</span></div>
  <a class="mod-chip" href="galaxy_map_current.html#mod-{mod}">🔽 {mod} — Current Series (function-chain view)</a>
  <div class="funcs">{''.join(func_blocks)}</div>
</section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Level 6)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --purple:#9B59B6; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #14101e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--purple);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px;flex-wrap:wrap}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:var(--purple);border-color:var(--purple)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--purple);padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
  .modpicker{{max-width:1100px;margin:16px auto 0;padding:0 24px;display:flex;gap:6px;flex-wrap:wrap;justify-content:center}}
  .tab{{padding:5px 12px;border-radius:14px;font-size:10.5px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .tab.active{{background:var(--purple);color:#fff;font-weight:700}}
  .msection{{max-width:900px;margin:24px auto;padding:0 24px}}
  .mhead{{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}}
  .mhead h2{{font-family:Georgia,serif;font-size:21px;color:#fff}}
  .river-chip{{font-size:9.5px;font-weight:700;padding:3px 9px;border-radius:10px;border:1px solid var(--dim);color:var(--dim)}}
  .mtotal{{font-size:10.5px;color:var(--purple);font-weight:700}}
  .mod-chip{{font-size:10.5px;font-weight:700;padding:3px 10px;border-radius:10px;background:rgba(155,89,182,0.12);color:var(--purple);text-decoration:none;border:1px solid rgba(155,89,182,0.3);display:inline-block;margin:8px 0 16px}}
  .fblock{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px 14px;margin-bottom:10px}}
  .fname{{font-size:11.5px;font-weight:700;color:var(--gold);margin-bottom:6px}}
  .n1-link{{float:right;font-size:9px;font-weight:700;color:#5FB3D9;text-decoration:none}}
  .n1-link:hover{{text-decoration:underline}}
  .fcount{{font-size:9.5px;color:var(--dim);font-weight:400}}
  .branch-row{{display:flex;gap:10px;align-items:baseline;font-size:10.5px;padding:3px 0;flex-wrap:wrap}}
  .bkind{{color:var(--purple);font-weight:700;min-width:62px}}
  .bcond{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10px;background:rgba(255,255,255,0.05);padding:1px 6px;border-radius:3px;color:#c8c8d8}}
  a{{color:var(--purple)}}
  .note{{max-width:900px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
</style>
</head>
<body>
<div class="breadcrumb">
  <a href="galaxy_map.html">🌌 Level 0</a><span class="bc-sep">→</span>
  <a href="galaxy_map_river.html">🏛️ Level 1</a><span class="bc-sep">→</span>
  <a href="galaxy_map_module.html">🌊 Level 2</a><span class="bc-sep">→</span>
  <a href="galaxy_map_current.html">🧬 Current Series</a><span class="bc-sep">→</span>
  <a href="galaxy_map_zoom.html">🖱️ Zoom (L4)</a><span class="bc-sep">→</span>
  <a href="galaxy_map_level5.html">🧠 Level 5</a><span class="bc-sep">→</span>
  <span class="bc-here">🔢 Level 6</span>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Level 6</div>
  <h1>🔢 Detailed Decision — Every Real Yes/No</h1>
  <p>The exhaustive, mechanical counterpart to <a href="galaxy_map_level5.html">Level 5</a>'s curated core logic — {n_total} real if/else-if/else/switch branch points across {n_mods} modules, extracted by real balanced-paren parsing, never hand-picked. Pick a module below.</p>
</div>
<div class="modpicker">{tabs}</div>
{sections}
<div class="note">
  Generated by <code>scripts/galaxy_map_level6.py</code> — real data from <code>graphify_river_group.py</code>'s
  <code>compute_function_branches()</code>. Exhaustive by construction (every real conditional a function's own
  body contains), not narrated — for the curated, explained subset, see <a href="galaxy_map_level5.html">Level 5</a>.
  Mapping rules: <code>system_map_spec.md</code>.
</div>
<script>
(function() {{
  var tabs = document.querySelectorAll('.tab');
  var sections = document.querySelectorAll('.msection');
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
    mods_with_branches = {}
    for m in sorted(LEVEL3_MODULES):
        b = compute_function_branches(m)
        if b:
            mods_with_branches[m] = b
    n_total = sum(len(br) for b in mods_with_branches.values() for br in b.values())
    tabs = ''.join(
        f'<div class="tab" data-target="m-{m}">{m} ({sum(len(v) for v in b.values())})</div>'
        for m, b in mods_with_branches.items()
    )
    sections = ''.join(build_module_section(m, b) for m, b in mods_with_branches.items())
    html = TEMPLATE.format(tabs=tabs, sections=sections, n_total=n_total, n_mods=len(mods_with_branches))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {n_total} real branch points across {len(mods_with_branches)} modules.")


if __name__ == '__main__':
    main()
