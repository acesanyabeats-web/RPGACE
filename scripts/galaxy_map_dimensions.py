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
    dashboard_card_primary_module, compute_all_supabase_table_touches,
)
from graphify_river_group import (  # noqa: E402
    inject_level_rail, inject_plan_overlay, RIVER_NAME, RIVER_COLOR,
    dimension_index_html, DIMENSION_INDEX_CSS, DIMENSION_PAGES,
)
from galaxy_map_decisions import DECISION_POINTS

OUT = Path('graphify-out/galaxy_map_dimensions.html')

DIMENSIONS = [
    {'id': 'externals', 'icon': '🔀', 'label': 'Externals (G27)', 'color': '#E2A83D'},
    {'id': 'ui', 'icon': '🚪', 'label': 'UI/Alex-Accessibility (G38)', 'color': '#4A90E2'},
    {'id': 'load', 'icon': '⏳', 'label': 'Load (G39)', 'color': '#2ABFB0'},
    {'id': 'decision', 'icon': '🚦', 'label': 'Decision/Human-Gate (G26)', 'color': '#E25454'},
    {'id': 'openmontage', 'icon': '🤝', 'label': 'Orchestrator↔OpenMontage (G29)', 'color': '#3DAA6E'},
    # G80 PoC (Aug 25 2026) — Supabase as a real 6th tracked dimension.
    # The evidence has existed since G45 (compute_all_supabase_table_
    # touches()) and was simply never wired in here; consumed as-is,
    # zero new detection code (rule 8). Colour is G45's own real teal
    # (galaxy_map_supabase.py's `--teal`), not a new invented value.
    # Honest note: 'load' already carries the same hex — harmless, since
    # this file never renders a dimension's `color` (only icon + label,
    # and 🗄️ vs ⏳ are distinct); flagged rather than silently changed.
    {'id': 'supabase', 'icon': '🗄️', 'label': 'Supabase', 'color': '#2ABFB0'},
]


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


# ── Aug 25 2026 audit — three real, separately-evidenced dead ends on
# this page, all found by checking what it NAMES against what it links.
# Going in, this whole file emitted exactly ONE href (the module name),
# which is a striking thing for a page whose entire subject is which
# module belongs to which OTHER dimension.
#
# 1. The "River N" cell sat immediately beside a module cell that was
#    already linked, and went nowhere — the identical asymmetry G82
#    fixed on galaxy_map_supabase.py's own river chips. Same real
#    Level-2 anchor reused (rule 8), not a new mechanic.
# 2. The bubble view listed the same module names as the module table,
#    as plain text. Under Alex's own standing rule R22 the bubble system
#    follows and showcases what's on the table — showing the same real
#    modules with strictly less reach than the table does is exactly the
#    drift that rule exists to prevent.
# 3. The dimension COLUMN HEADERS name a real dimension page each and
#    linked to none of them. Deliberately NOT hand-typed: a header only
#    becomes a link when its target filename is genuinely registered in
#    DIMENSION_PAGES (graphify_river_group.py — the same registry the
#    Dimension index at the foot of every page is built from), so a
#    retired or renamed page stops being linked instead of rotting into
#    a dead href. 'ui' is honestly left unlinked: G38's own page
#    (Level 2.5) was folded into galaxy_map_module.html by G71 and is
#    not a registered Dimension page, so there is no one real
#    destination to claim for it — said plainly rather than guessed.
_DIM_PAGES = {fname for fname, *_ in DIMENSION_PAGES}

DIMENSION_PAGE = {
    'externals': 'galaxy_map_externals.html',
    'load': 'galaxy_map_load.html',
    'decision': 'galaxy_map_decisions.html',
    'openmontage': 'galaxy_map_orchestrator_openmontage.html',
    'supabase': 'galaxy_map_supabase.html',
    # 'ui' — no registered Dimension page of its own, see note above.
}


def _dim_page(d):
    """The real, currently-registered page for a dimension, or None."""
    page = DIMENSION_PAGE.get(d['id'])
    return page if page and page in _DIM_PAGES else None


def _dim_header(d):
    """One column header — linked only when its real dimension page is
    genuinely registered right now."""
    inner = f'{d["icon"]} {esc(d["label"])}'
    page = _dim_page(d)
    if page:
        return (f'<th><a class="dimhead" href="{page}" '
                f'title="This dimension\'s own page">{inner}</a></th>')
    return f'<th>{inner}</th>'


def _dim_label(d):
    """The same dimension name in the bubble view — same gate, so the
    bubble system can never reach further OR less far than the table
    it follows (R22)."""
    page = _dim_page(d)
    inner = esc(d['label'])
    return f'<a href="{page}">{inner}</a>' if page else inner


def _mod_link(mod):
    """Same real convention galaxy_map_supabase.py/galaxy_map_alex_path.py
    already use — a real tracked module gets its Current Series anchor,
    anything else stays honest plain text rather than a dead link."""
    if mod in LEVEL3_MODULES:
        return f'<a href="galaxy_map_current.html#mod-{esc(mod)}">{esc(mod)}</a>'
    return esc(mod)


def _river_cell(r):
    """The real Level-2 link for a module's own river."""
    if not r:
        return '<td class="rivercell">—</td>'
    label = RIVER_NAME.get(r, f'River {r}').split('—')[0].strip()
    return (f'<td class="rivercell"><a href="galaxy_map_module.html#river-{r}" '
            f'title="This module\'s own river at Level 2">{esc(label)}</a></td>')


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

    # Supabase (G80 PoC) — a module counts if it genuinely touches ANY
    # real table, straight from G45's own already-shipped detector. No
    # new detection logic: compute_all_supabase_table_touches() returns
    # {table: [(module, func, op), ...]}, so the real module set is just
    # its own values. Client-side (rpgace_core.js) evidence only — the
    # same honest scope limit G45's page states on itself.
    supabase_mods = set()
    for _tbl, _touches in compute_all_supabase_table_touches().items():
        for _m, _f, _op in _touches:
            supabase_mods.add(_m)

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
            'supabase': m in supabase_mods,
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
            f'<a href="galaxy_map_current.html#mod-{esc(m)}">{esc(m)}</a></td>'
            f'{_river_cell(r)}'
            f'{cells}<td class="tagcount">{n}</td></tr>'
        )
    return ''.join(rows)


def build_river_matrix(tags):
    """G74 (Aug 25 2026) — the real River x Dimension cross-tab.

    Alex's own confirmed ask. A pure ROLL-UP of the module-grain
    `tags` this file already computes (rule 8 — dimension membership is
    never re-derived here) onto each module's own river via
    RIVER_MODULES. A river counts as participating in a dimension when
    at least one of its own real modules genuinely does.

    Deliberately NOT a replacement for the module-grain table above,
    and the existing narrower matrices are NOT retired against it:
      * the module table answers "which module is a cross-dimension
        hub" — a genuinely finer grain this roll-up destroys by
        construction;
      * galaxy_map.html's own L0 matrix is a different grain again
        (9 L0 units, not rivers).
    Neither is redundant, so neither is folded in — said plainly rather
    than deleting a page that still answers its own question. This is a
    second real VIEW on the same page, which is the same shape every
    other map/table pair in this pipeline already uses.
    """
    rivers = sorted({r for m in tags if (r := _river_of(m)) is not None})
    rows = []
    for r in rivers:
        mods = [m for m in tags if _river_of(m) == r]
        cells = []
        for d in DIMENSIONS:
            hits = [m for m in mods if tags[m][d['id']]]
            if not hits:
                cells.append('<td class="dcell">·</td>')
                continue
            cells.append(
                f'<td class="dcell on rcell" data-river="{r}" data-dim="{d["id"]}" '
                f'title="{esc(", ".join(sorted(hits)))}">{d["icon"]} <b>{len(hits)}</b></td>')
        full = RIVER_NAME.get(r, f'River {r}')
        name = full.split('—', 1)[1].strip() if '—' in full else full
        n_dims = sum(1 for d in DIMENSIONS if any(tags[m][d['id']] for m in mods))
        rows.append(
            f'<tr><th class="rowhead rowjump" data-river="{r}" '
            f'title="Jump to this river\'s own bubble detail" '
            f'style="border-left:3px solid {RIVER_COLOR.get(r, "#888")}">{esc(name)} '
            f'<span class="rowjump-cue">🫧</span></th>'
            f'<td class="rivercell">{len(mods)}</td>{"".join(cells)}'
            f'<td class="tagcount">{n_dims}</td></tr>')
    header = ('<tr><th>River</th><th>Modules</th>'
              + ''.join(_dim_header(d) for d in DIMENSIONS)
              + '<th>Dims</th></tr>')
    return '<table class="dtable">' + header + ''.join(rows) + '</table>'


def build_river_bubbles(tags):
    """Bubble view over the EXACT data build_river_matrix() renders —
    R22's own standing rule (the table is the source of truth, the
    bubble system follows it and never invents its own dataset)."""
    import math
    rivers = sorted({r for m in tags if (r := _river_of(m)) is not None})
    n = len(rivers) or 1
    cx, cy, radius = 420, 420, 300
    nodes, details = [], []
    for i, r in enumerate(rivers):
        angle = (360 / n) * i - 90
        x = cx + radius * math.cos(math.radians(angle))
        y = cy + radius * math.sin(math.radians(angle))
        mods = [m for m in tags if _river_of(m) == r]
        hit_dims = [d for d in DIMENSIONS if any(tags[m][d['id']] for m in mods)]
        color = RIVER_COLOR.get(r, '#888')
        full = RIVER_NAME.get(r, f'River {r}')
        short = full.split('—', 1)[1].strip() if '—' in full else full
        rsize = 24 + len(hit_dims) * 4
        nodes.append(
            f'<g class="dbubble" data-river="{r}" transform="translate({x:.0f},{y:.0f})">'
            f'<circle r="{rsize}" fill="{color}" fill-opacity="0.18" stroke="{color}" stroke-width="2"/>'
            f'<text text-anchor="middle" dy="-3" font-size="12" fill="#fff" font-weight="700">{len(hit_dims)}</text>'
            f'<text text-anchor="middle" dy="12" font-size="8" fill="{color}">{esc(short[:16])}</text></g>')
        items = ''.join(
            f'<li>{d["icon"]} <b>{_dim_label(d)}</b> — '
            f'{", ".join(_mod_link(m) for m in sorted(m for m in mods if tags[m][d["id"]]))}</li>'
            for d in hit_dims) or '<li class="meta">No real dimension membership detected for this river.</li>'
        details.append(
            f'<div class="rdetail" id="rdetail-{r}" style="display:none">'
            f'<h3>{esc(full)}</h3><ul>{items}</ul></div>')
    svg = ('<svg viewBox="0 0 840 840" width="100%" style="max-width:760px;display:block;margin:0 auto">'
           + ''.join(nodes) + '</svg>')
    return svg + '<div id="bubble-details">' + ''.join(details) + '</div>'

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
  .wrap{{max-width:1100px;margin:0 auto;padding:24px;overflow-x:auto}}
  .dtable{{width:100%;border-collapse:collapse;font-size:11px}}
  .dtable th{{text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:var(--purple);padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.1);white-space:nowrap}}
  .dtable th:first-child, .dtable th:nth-child(2) {{text-align:left}}
  .dtable td{{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.05);text-align:center;vertical-align:middle}}
  .modname{{font-family:'Cascadia Code','Fira Mono',monospace;font-weight:700;text-align:left!important}}
  .modname a{{color:var(--gold);text-decoration:none}}
  .modname a:hover{{text-decoration:underline}}
  .rivercell{{color:var(--dim);text-align:left!important;font-size:10px}}
  .rivercell a{{color:var(--dim);text-decoration:none}}
  .rivercell a:hover{{color:var(--purple);text-decoration:underline}}
  .dimhead{{color:inherit;text-decoration:none}}
  .dimhead:hover{{text-decoration:underline}}
  .rdetail a{{color:var(--gold);text-decoration:none}}
  .rdetail a:hover{{text-decoration:underline}}
  .dcell{{font-size:13px;opacity:0.15}}
  .dcell.on{{opacity:1}}
  .tagcount{{font-weight:700;color:var(--purple)}}
  tr.hub{{background:rgba(155,89,182,0.06)}}
  .note{{max-width:1100px;margin:24px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  a{{color:var(--purple)}}
  .toggle-row{{display:flex;justify-content:center;gap:8px;padding:14px 24px 0}}
  .toggle-btn{{padding:8px 18px;border-radius:16px;font-size:11.5px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .toggle-btn.active{{background:var(--purple);color:#12040f;border-color:var(--purple)}}
  .view{{display:none}}
  .view.active{{display:block}}
  th.rowhead{{text-align:left!important;white-space:nowrap;padding-left:10px;font-size:10.5px;color:var(--text)}}
  th.rowjump{{cursor:pointer}}
  th.rowjump:hover{{background:rgba(155,89,182,0.12)}}
  .rowjump-cue{{opacity:.45;font-size:10px}}
  td.rcell{{cursor:pointer}}
  td.rcell:hover{{background:rgba(155,89,182,0.12)}}
  .dbubble{{cursor:pointer}}
  .dbubble:hover circle{{filter:brightness(1.4)}}
  .bubblewrap{{max-width:900px;margin:20px auto;padding:0 24px;text-align:center}}
  #bubble-details{{max-width:760px;margin:18px auto 0;padding:0 24px;text-align:left}}
  .rdetail{{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:16px 20px;margin-bottom:14px}}
  .rdetail h3{{font-family:Georgia,serif;font-size:15px;margin-bottom:10px;color:#fff}}
  .rdetail ul{{list-style:none}}
  .rdetail li{{margin-bottom:8px;font-size:11.5px;line-height:1.6;color:#c8c8d4}}
  .vhint{{max-width:1100px;margin:14px auto 0;padding:0 24px;font-size:11px;color:var(--dim);line-height:1.6;text-align:center}}
{dim_css}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Dimensions Matrix (G30)</div>
  <h1>🧭 Dimensions Matrix — Real Multi-Home Overlap</h1>
  <p>Alex's own real ask, resolved via /interrogation: a real river/module can belong to MORE THAN ONE dimension at once (multi-home, not a strict partition) — this is the real cross-dimension ANALYSIS view, not a Level-0 replacement (the 4 galaxies stay exactly as they are). {n_hubs} of {n_mods} real modules are genuine "hubs" (3+ real dimension tags, highlighted) — these are the modules doing the most real, load-bearing cross-dimension work in RPGACE Total Systems, regardless of which river they're nominally grouped under.</p>
</div>
<div class="toggle-row">
  <div class="toggle-btn active" data-view="rivers">🌊 River × Dimension (table)</div>
  <div class="toggle-btn" data-view="bubbles">🫧 River × Dimension (bubbles)</div>
  <div class="toggle-btn" data-view="modules">🧩 Module × Dimension (table)</div>
</div>

<div class="view active" id="view-rivers">
  <div class="vhint">Every real river cross-referenced against every dimension it genuinely participates in — a roll-up of the module-grain data below, never re-derived. A cell shows how many of that river's own modules carry that dimension; hover it for their names, click it (or the river name) for the full breakdown.</div>
  <div class="wrap">{river_matrix}</div>
</div>

<div class="view" id="view-bubbles">
  <div class="vhint">The same data as the River × Dimension table, rendered as bubbles — sized by how many dimensions that river actually participates in. Per the standing rule, this view has no data of its own.</div>
  <div class="bubblewrap">{river_bubbles}</div>
</div>

<div class="view" id="view-modules">
  <div class="vhint">The finer grain the roll-up above deliberately loses: which individual module is a real cross-dimension hub, regardless of which river it is grouped under.</div>
  <div class="wrap">
    <table class="dtable">
      <thead><tr><th>Module</th><th>River</th>{dim_headers}<th>Tags</th></tr></thead>
      <tbody>{rows}</tbody>
    </table>
  </div>
</div>

{dim_index}
<div class="note">
  Generated by <code>scripts/galaxy_map_dimensions.py</code>, real detection functions in <code>graphify_river_group.py</code> —
  never re-derived (rule 8), each dimension's own already-shipped detector reused as-is. G30 of the ratified
  "RPGACE Total Systems Galaxy Map" /CEO plan. Mapping rules: <code>system_map_spec.md</code>.
</div>
<script>
(function() {{
  var toggles = document.querySelectorAll('.toggle-btn');
  var views = document.querySelectorAll('.view');
  function showView(name) {{
    toggles.forEach(function(x) {{ x.classList.toggle('active', x.dataset.view === name); }});
    views.forEach(function(v) {{ v.classList.toggle('active', v.id === 'view-' + name); }});
  }}
  toggles.forEach(function(t) {{ t.addEventListener('click', function() {{ showView(t.dataset.view); }}); }});
  function reveal(r) {{
    showView('bubbles');
    document.querySelectorAll('.rdetail').forEach(function(d) {{ d.style.display = (d.id === 'rdetail-' + r) ? '' : 'none'; }});
    var el = document.getElementById('rdetail-' + r);
    if (el) el.scrollIntoView({{behavior:'smooth', block:'nearest'}});
  }}
  // Table rows AND cells both reach the same real bubble detail the
  // bubble view's own click already goes to — never a second target.
  document.querySelectorAll('th.rowjump, td.rcell').forEach(function(el) {{
    el.addEventListener('click', function() {{ reveal(el.dataset.river); }});
  }});
  document.querySelectorAll('.dbubble').forEach(function(b) {{
    b.addEventListener('click', function() {{ reveal(b.dataset.river); }});
  }});
}})();
</script>
</body>
</html>
"""


def main():
    tags = compute_matrix()
    n_hubs = sum(1 for m, row in tags.items() if sum(row.values()) >= 3)
    dim_headers = ''.join(_dim_header(d) for d in DIMENSIONS)
    rows = build_rows(tags)
    html = TEMPLATE.format(dim_headers=dim_headers, rows=rows, n_hubs=n_hubs, n_mods=len(tags),
                           river_matrix=build_river_matrix(tags),
                           river_bubbles=build_river_bubbles(tags),
                           dim_index=dimension_index_html(OUT.name),
                           dim_css=DIMENSION_INDEX_CSS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    # DD7 (Aug 23 2026) — live in-flight ceo_plan_items overlay,
    # injected at the same post-process point as the level rail so a
    # regeneration can never wipe it. See inject_plan_overlay().
    html = inject_plan_overlay(html, 'dimensions')
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(tags)} modules, {n_hubs} real hub(s) (3+ dimension tags).")
    # Aug 25 2026 — real, measured destination coverage, printed so a
    # future build can never silently regress it.
    linked_dims = [d['id'] for d in DIMENSIONS if _dim_page(d)]
    n_riv = sum(1 for m in tags if _river_of(m))
    unlinked = [d['id'] for d in DIMENSIONS if not _dim_page(d)]
    print(f"  Link coverage — {len(linked_dims)}/{len(DIMENSIONS)} dimension header(s) link a registered "
          f"Dimension page (honestly unlinked: {', '.join(unlinked) or 'none'}); "
          f"{n_riv}/{len(tags)} module row(s) link a real river at Level 2; "
          f"all {len(tags)} module names link a real Current Series section in both views.")


if __name__ == '__main__':
    main()
