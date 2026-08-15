#!/usr/bin/env python3
"""
galaxy_map_dimensions.py — G30 of the ratified "RPGACE Total Systems
Galaxy Map" /CEO plan (Aug 15 2026). Real Alex ask: run the remaining
G-steps that "bring in other dimensions... so i can fully analyze all
of it and how to better the logic of the connections."

Real, resolved fork (AskUserQuestion, this session): MULTI-HOME
membership — a real river/module can genuinely belong to more than one
dimension at once (confirmed by G27/G28/G31's own real overlap
findings), so this is a TAG MATRIX, not a strict partition replacing
Level 0's 4 galaxies (which stay exactly as they are — a full Level-0
skeleton replacement is real, separate, larger work not attempted this
pass given the session's own token/time constraint).

Real, honest scope: this is the real cross-dimension ANALYSIS view
Alex asked for — for each of the 44 real RIVER_MODULES-tracked modules,
which of the 5 real, already-shipped dimensions does it genuinely touch
(Externals G27, UI/Alex-Accessibility G38, Load G39, Decision/Human-
Gate G26, Orchestrator<->OpenMontage G29) — sourced from each
dimension's own already-computed real detection data, never re-derived
(rule 8). A module with 3+ tags is a real, load-bearing hub the map
should treat as more central than a 0-tag module, however many rivers
it's nominally grouped under.
"""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (
    LEVEL3_MODULES, RIVER_MODULES, DASHBOARD_CARDS,
    compute_module_oracle_call_count, compute_external_call_sites,
    compute_lastfm_call_sites, compute_boot_task_registrations,
    compute_page_nav_triggers, compute_click_load_triggers,
    dashboard_card_primary_module,
)
from galaxy_map_decisions import DECISION_POINTS

OUT = Path('graphify-out/galaxy_map_dimensions.html')

DIMENSIONS = [
    {'id': 'externals', 'icon': '🔀', 'label': 'Externals (G27)', 'color': '#E2A83D'},
    {'id': 'ui', 'icon': '🚪', 'label': 'UI/Alex-Accessibility (G38)', 'color': '#4A90E2'},
    {'id': 'load', 'icon': '⏳', 'label': 'Load (G39)', 'color': '#2ABFB0'},
    {'id': 'decision', 'icon': '🚦', 'label': 'Decision/Human-Gate (G26)', 'color': '#E25454'},
    {'id': 'openmontage', 'icon': '🤝', 'label': 'Orchestrator↔OpenMontage (G29)', 'color': '#3DAA6E'},
]


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


def _river_of(module):
    for r, mods in RIVER_MODULES.items():
        if module in mods:
            return r
    return None


def compute_matrix():
    # Externals — any real Composio/Last.fm/Oracle call.
    externals_mods = set()
    for m in LEVEL3_MODULES:
        if compute_module_oracle_call_count(m) > 0:
            externals_mods.add(m)
        if compute_external_call_sites(m):
            externals_mods.add(m)
        if compute_lastfm_call_sites(m):
            externals_mods.add(m)

    # UI/Alex-Accessibility — real primary module for a real dashboard card.
    ui_mods = set()
    for card in DASHBOARD_CARDS:
        valid = set()
        for r in card.get('rivers', []):
            valid.update(RIVER_MODULES.get(r, []))
        mod = dashboard_card_primary_module(card.get('via', ''), valid)
        if mod:
            ui_mods.add(mod)

    # Load — real boot-task, page-nav, or click-load trigger.
    load_mods = set(b['module'] for b in compute_boot_task_registrations())
    for m in LEVEL3_MODULES:
        if compute_page_nav_triggers(m):
            load_mods.add(m)
    for func, pairs in compute_click_load_triggers().items():
        for target_mod, _ in pairs:
            load_mods.add(target_mod)

    # Decision/Human-Gate — real module owning one of the 10 decision points.
    decision_mods = set(dp['module'] for dp in DECISION_POINTS)

    # Orchestrator<->OpenMontage — River XI only, real dispatch channel.
    openmontage_mods = set(RIVER_MODULES.get(11, []))

    tags = {}
    # sorted() — LEVEL3_MODULES is a set(), hash-randomized iteration
    # order per process; real idempotency (R5) needs deterministic
    # insertion order into the dict this builds.
    for m in sorted(LEVEL3_MODULES):
        row = {
            'externals': m in externals_mods,
            'ui': m in ui_mods,
            'load': m in load_mods,
            'decision': m in decision_mods,
            'openmontage': m in openmontage_mods,
        }
        tags[m] = row
    return tags


def build_rows(tags):
    rows = []
    for m in sorted(tags, key=lambda x: -sum(tags[x].values())):
        row = tags[m]
        n = sum(row.values())
        r = _river_of(m)
        cells = ''.join(
            f'<td class="dcell{" on" if row[d["id"]] else ""}">{d["icon"] if row[d["id"]] else ""}</td>'
            for d in DIMENSIONS
        )
        rows.append(
            f'<tr class="{"hub" if n >= 3 else ""}"><td class="modname">'
            f'<a href="galaxy_map_level3.html#mod-{esc(m)}">{esc(m)}</a></td>'
            f'<td class="rivercell">{"River " + str(r) if r else "—"}</td>'
            f'{cells}<td class="tagcount">{n}</td></tr>'
        )
    return ''.join(rows)


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Dimensions Matrix)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --purple:#9B59B6; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #16101a 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--purple);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:900px;margin:0 auto}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px;flex-wrap:wrap}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:var(--purple);border-color:var(--purple)}}
  .breadcrumb .bc-here{{color:#12040f;background:var(--purple);padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
  .wrap{{max-width:1100px;margin:0 auto;padding:24px;overflow-x:auto}}
  .dtable{{width:100%;border-collapse:collapse;font-size:11px}}
  .dtable th{{text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:var(--purple);padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.1);white-space:nowrap}}
  .dtable th:first-child, .dtable th:nth-child(2) {{text-align:left}}
  .dtable td{{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.05);text-align:center;vertical-align:middle}}
  .modname{{font-family:'Cascadia Code','Fira Mono',monospace;font-weight:700;text-align:left!important}}
  .modname a{{color:var(--gold);text-decoration:none}}
  .modname a:hover{{text-decoration:underline}}
  .rivercell{{color:var(--dim);text-align:left!important;font-size:10px}}
  .dcell{{font-size:13px;opacity:0.15}}
  .dcell.on{{opacity:1}}
  .tagcount{{font-weight:700;color:var(--purple)}}
  tr.hub{{background:rgba(155,89,182,0.06)}}
  .note{{max-width:1100px;margin:24px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  a{{color:var(--purple)}}
</style>
</head>
<body>
<div class="breadcrumb">
  <a href="galaxy_map.html">🌌 Level 0</a><span class="bc-sep">→</span>
  <a href="galaxy_map_load.html">⏳ Load</a><span class="bc-sep">→</span>
  <span class="bc-here">🧭 Dimensions Matrix</span>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Dimensions Matrix (G30)</div>
  <h1>🧭 Dimensions Matrix — Real Multi-Home Overlap</h1>
  <p>Alex's own real ask, resolved via /interrogation: a real river/module can belong to MORE THAN ONE dimension at once (multi-home, not a strict partition) — this is the real cross-dimension ANALYSIS view, not a Level-0 replacement (the 4 galaxies stay exactly as they are). {n_hubs} of {n_mods} real modules are genuine "hubs" (3+ real dimension tags, highlighted) — these are the modules doing the most real, load-bearing cross-dimension work in RPGACE Total Systems, regardless of which river they're nominally grouped under.</p>
</div>
<div class="wrap">
  <table class="dtable">
    <thead><tr><th>Module</th><th>River</th>{dim_headers}<th>Tags</th></tr></thead>
    <tbody>{rows}</tbody>
  </table>
</div>
<div class="note">
  Generated by <code>scripts/galaxy_map_dimensions.py</code>, real detection functions in <code>graphify_river_group.py</code> —
  never re-derived (rule 8), each dimension's own already-shipped detector reused as-is. G30 of the ratified
  "RPGACE Total Systems Galaxy Map" /CEO plan. Mapping rules: <code>system_map_spec.md</code>.
</div>
</body>
</html>
"""


def main():
    tags = compute_matrix()
    n_hubs = sum(1 for m, row in tags.items() if sum(row.values()) >= 3)
    dim_headers = ''.join(f'<th>{d["icon"]} {esc(d["label"])}</th>' for d in DIMENSIONS)
    rows = build_rows(tags)
    html = TEMPLATE.format(dim_headers=dim_headers, rows=rows, n_hubs=n_hubs, n_mods=len(tags))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(tags)} modules, {n_hubs} real hub(s) (3+ dimension tags).")


if __name__ == '__main__':
    main()
