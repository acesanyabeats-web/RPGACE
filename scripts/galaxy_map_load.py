#!/usr/bin/env python3
"""
galaxy_map_load.py — G39 of the ratified "RPGACE Total Systems Galaxy
Map" /CEO plan (Aug 15 2026). Real Alex ask, verbatim: "we should also
make a load dimension (what ui, backend or alex trigger certain backend
and ui to load, in what steps etc) this could help tie everything
together for diagnosing."

Real /interrogation resolved the shape (2 rounds, AskUserQuestion):
1. All 3 real, mechanically-confirmed load-trigger idioms, kept as 3
   SEPARATE categories (never merged into one undifferentiated list):
   - Boot-time sequence: RPGACE.registerBootTask(fn) — real, confirmed
     mechanism (rpgace_core.js:194): fn() runs SYNCHRONOUSLY the moment
     registerBootTask is called, queued into R._bootTasks, which a
     single Promise.all(...).then(_hideBootOnce) gates the real boot-
     loader hide on (a real 20s hard ceiling). Real SOURCE order of
     these calls genuinely IS real fire order — a legitimate, confirmed
     diagnostic proxy, not an assumption.
   - Page-navigation triggers: RPGACE.hooks.on('page:show', ...) — what
     lazy-loads/re-applies the first time (or every time) a specific
     page becomes active.
   - On-demand/click triggers: dashDeck's own real _open*() idiom —
     check for an existing DOM node, call a target module's real inject
     function directly if missing, before showing a popup. Sourced from
     THIS SAME session's own A5/Bookworm work (_openCorpus/_openBookworm
     etc.) — the newest of the 3 idioms.
2. Serves both diagnostic-correctness (what SHOULD trigger a given
   panel/module to appear, so a future session can check the real chain
   instead of guessing — the exact class of bug found and fixed in the
   same session's A5 build: beatLog/refCorpus/conidPot's lazy-inject
   gates) AND performance/boot-time visibility (the real boot-task
   sequence, tied to the still-open decompress/Headroom boot-stagger
   fork) equally.

Real cross-link discipline (rule 8, reused not reinvented): Level 2 via
galaxy_map_module.html#river-{N}, Current Series via galaxy_map_current.html#mod-{module}
(module-granular, same honest scope limit G21's own n-1 links already
state). A real, evidence-gated "⏳ Load" HUB bubble at Level 2 (mirroring
the existing Oracle/Composio hub-bubble pattern exactly) is a real,
explicitly separate follow-on — not built in this pass, logged in
CLAUDE.md/session_lessons.html rather than rushed.
"""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (
    LEVEL3_MODULES, RIVER_MODULES,
    compute_boot_task_registrations, compute_page_nav_triggers,
    compute_click_load_triggers,
)
from graphify_river_group import inject_level_rail  # noqa: E402

OUT = Path('graphify-out/galaxy_map_load.html')


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


def _river_of(module):
    for r, mods in RIVER_MODULES.items():
        if module in mods:
            return r
    return None


def _mod_links(module):
    r = _river_of(module)
    l2 = f'<a href="galaxy_map_module.html#river-{r}">River {r} · Level 2</a>' if r else '<span class="dim">no river</span>'
    l3 = f'<a href="galaxy_map_current.html#mod-{esc(module)}">Current Series</a>'
    return f'{l2} · {l3}'


def build_boot_section(boot_regs):
    rows = ''.join(
        f'<tr><td class="seqnum">{b["seq"]}</td><td class="modname">{esc(b["module"])}</td>'
        f'<td class="linkcell">{_mod_links(b["module"])}</td>'
        f'<td class="linenum">rpgace_core.js:{b["line"]}</td></tr>'
        for b in boot_regs
    )
    return f'''<section class="gsection" id="cat-boot">
  <div class="ghead"><h2>⏱️ Boot-Time Sequence</h2><span class="gcount">{len(boot_regs)} real registration(s), real fire order</span></div>
  <p class="catnote">Every <code>registerBootTask(fn)</code> call runs <code>fn()</code> synchronously the instant it's called — real source order IS real fire order. Every one of these blocks the real boot-loader hide (a single shared <code>Promise.all(...).then(_hideBootOnce)</code>, 20s hard ceiling) until it resolves — a slow one here is a real, diagnosable contributor to a slow login.</p>
  <table class="ltable"><thead><tr><th>#</th><th>Module</th><th>Links</th><th>Source</th></tr></thead>
  <tbody>{rows}</tbody></table>
</section>'''


def build_pagenav_section():
    rows = []
    total = 0
    # sorted() — LEVEL3_MODULES is a set(), hash-randomized iteration
    # order per process; real idempotency (R5) needs a deterministic
    # order, not source-registration order (which sets don't preserve).
    for mod in sorted(LEVEL3_MODULES):
        triggers = compute_page_nav_triggers(mod)
        for func, pages in triggers.items():
            total += 1
            rows.append(
                f'<tr><td class="modname">{esc(mod)}</td><td class="funcname">{esc(func)}()</td>'
                f'<td class="pagelist">{", ".join("📄 " + esc(p) for p in pages)}</td>'
                f'<td class="linkcell">{_mod_links(mod)}</td></tr>'
            )
    return f'''<section class="gsection" id="cat-pagenav" style="display:none">
  <div class="ghead"><h2>📄 Page-Navigation Triggers</h2><span class="gcount">{total} real trigger(s) across {sum(1 for m in LEVEL3_MODULES if compute_page_nav_triggers(m))} module(s)</span></div>
  <p class="catnote">Real <code>RPGACE.hooks.on('page:show', ...)</code> registrations — what actually lazy-loads/re-applies the moment a specific page becomes active. The real diagnostic question this answers: "I navigated to page X, why didn't Y appear" — check whether Y's own module is even in this list for that page.</p>
  <table class="ltable"><thead><tr><th>Module</th><th>Function</th><th>Real page(s) it gates on</th><th>Links</th></tr></thead>
  <tbody>{''.join(rows)}</tbody></table>
</section>'''


def build_click_section(click_triggers):
    rows = []
    for func, pairs in click_triggers.items():
        for target_mod, inject_fn in pairs:
            rows.append(
                f'<tr><td class="funcname">dashDeck.{esc(func)}()</td>'
                f'<td class="modname">{esc(target_mod)}</td>'
                f'<td class="funcname">.{esc(inject_fn)}()</td>'
                f'<td class="linkcell">{_mod_links(target_mod)}</td></tr>'
            )
    return f'''<section class="gsection" id="cat-click" style="display:none">
  <div class="ghead"><h2>🖱️ On-Demand / Click Triggers</h2><span class="gcount">{len(rows)} real trigger(s)</span></div>
  <p class="catnote">Real dashDeck <code>_open*()</code> functions — check for an existing DOM node, and if missing, call a target module's real inject function directly, on demand, before showing a popup. The newest of the 3 idioms (confirmed via this same session's own A5/Bookworm work) — this is the real, honest replacement for what a researchTabs tab-key used to gate before Aug 15's Research Lab dismantling.</p>
  <table class="ltable"><thead><tr><th>Trigger (dashDeck function)</th><th>Target module</th><th>Real inject call</th><th>Links</th></tr></thead>
  <tbody>{''.join(rows)}</tbody></table>
</section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Load Dimension)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --teal:#2ABFB0; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #0e1a18 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--teal);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:860px;margin:0 auto}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px;flex-wrap:wrap}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:var(--teal);border-color:var(--teal)}}
  .breadcrumb .bc-here{{color:#04120f;background:var(--teal);padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
  .tabs{{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}}
  .tab{{padding:6px 14px;border-radius:16px;font-size:11px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .tab.active{{background:var(--teal);color:#04120f;font-weight:700}}
  .gsection{{max-width:1200px;margin:0 auto;padding:24px;overflow-x:auto}}
  .ghead{{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap}}
  .ghead h2{{font-family:Georgia,serif;font-size:19px;color:#fff}}
  .gcount{{font-size:10px;color:var(--teal);font-weight:700}}
  .catnote{{font-size:11.5px;color:#a8a8b8;line-height:1.6;margin-bottom:14px;max-width:1000px}}
  .ltable{{width:100%;border-collapse:collapse;font-size:11px}}
  .ltable th{{text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:0.5px;color:var(--teal);padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.1)}}
  .ltable td{{padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:top}}
  .seqnum{{font-family:'Cascadia Code','Fira Mono',monospace;color:var(--gold);font-weight:700}}
  .modname{{font-family:'Cascadia Code','Fira Mono',monospace;font-weight:700;color:var(--gold)}}
  .funcname{{font-family:'Cascadia Code','Fira Mono',monospace;color:#c8c8d8}}
  .pagelist{{color:#c8c8d8}}
  .linenum{{font-family:'Cascadia Code','Fira Mono',monospace;color:#6a6a78;font-size:10px}}
  .linkcell{{font-size:10px}}
  .linkcell a{{color:var(--teal);text-decoration:none;margin-right:6px}}
  .linkcell a:hover{{text-decoration:underline}}
  .dim{{color:#6a6a78}}
  a{{color:var(--teal)}}
  .note{{max-width:1200px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
</style>
</head>
<body>
<div class="breadcrumb">
  <a href="galaxy_map_decisions.html">🚦 Decisions</a><span class="bc-sep">→</span>
  <a href="galaxy_map_externals.html">🔀 Externals</a><span class="bc-sep">→</span>
  <a href="galaxy_map_skill_network.html">🧩 Skills</a><span class="bc-sep">→</span>
  <span class="bc-here">⏳ Load</span>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Load Dimension (G39)</div>
  <h1>⏳ Load Dimension — What Triggers What To Load, And When</h1>
  <p>Alex's own real ask: "what ui, backend or alex trigger certain backend and ui to load, in what steps etc — this could help tie everything together for diagnosing." 3 real, mechanically-confirmed load-trigger idioms, kept as separate categories — never merged into one undifferentiated list. Serves both diagnostic correctness (what SHOULD trigger a panel to appear — the exact bug class found and fixed in this same session's A5 build) and boot-time performance visibility, equally.</p>
</div>
<div class="tabs">{tabs}</div>
{sections}
<div class="note">
  Generated by <code>scripts/galaxy_map_load.py</code>, real detection functions in <code>graphify_river_group.py</code>
  (<code>compute_boot_task_registrations</code>/<code>compute_page_nav_triggers</code>/<code>compute_click_load_triggers</code>).
  G39 of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan.
  Real, honest scope limit: a Level 2/3 hub "⏳ Load" bubble (mirroring the existing Oracle/Composio bubble pattern, with real
  bubble-conjoining when a node has evidence in 2+ categories, per Alex's own ask) is a real, separate follow-on — not built
  in this pass. Mapping rules: <code>system_map_spec.md</code>.
</div>
<script>
(function() {{
  var tabs = document.querySelectorAll('.tab');
  var sections = document.querySelectorAll('.gsection');
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

TABS = [
    {'id': 'cat-boot', 'label': '⏱️ Boot-Time Sequence'},
    {'id': 'cat-pagenav', 'label': '📄 Page-Navigation Triggers'},
    {'id': 'cat-click', 'label': '🖱️ On-Demand / Click Triggers'},
]


def main():
    boot_regs = compute_boot_task_registrations()
    click_triggers = compute_click_load_triggers()
    tabs = ''.join(f'<div class="tab" data-target="{t["id"]}">{t["label"]}</div>' for t in TABS)
    sections = (
        build_boot_section(boot_regs)
        + build_pagenav_section()
        + build_click_section(click_triggers)
    )
    html = TEMPLATE.format(tabs=tabs, sections=sections)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(boot_regs)} boot-task registrations, "
          f"{sum(len(compute_page_nav_triggers(m)) for m in LEVEL3_MODULES)} page-nav modules with triggers, "
          f"{sum(len(v) for v in click_triggers.values())} click-load triggers.")


if __name__ == '__main__':
    main()
