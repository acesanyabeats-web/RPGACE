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

**G108 continuation (Aug 26 2026) — real, structural rework, Alex's own
direct ask.** His own words, verbatim: "I also think dimension matrix
bubble map should be reworked and the 2 tables are actually 2 different
levels of the same thing. and the l0 objects should be there, I don't
want the vertical row currently there (retire that categorization)."
Confirmed via a follow-up AskUserQuestion (he pasted the exact River x
Dimension table's own header row back as his answer): "the vertical
row" = the OLD flat 3-button toggle ("River table" / "River bubbles" /
"Module table") that treated River-grain and Module-grain as 3
unrelated flat options rather than what they actually are — 2 real
LEVELS of the same recurring L0->L1->L2 containment chain this whole
Galaxy Map already uses everywhere else.

Real fix: retired the flat 3-button toggle outright. Replaced with 3
real LEVEL TABS (🌌 L0 units / 🏛️ L1 rivers / 🌊 L2 modules), matching
this project's own already-established level vocabulary and iconography
(LEVEL_RAIL in graphify_river_group.py) rather than inventing new
labels. Each level tab shows that grain's own Table (default, per R22)
+ Map sub-toggle — the SAME real pattern every other Infra/Inter page
in this pipeline already uses, now applied consistently across all 3
grains instead of 2 tables + 1 orphaned bubble view. L0 is a real new
addition: `compute_l0_dim_tags()` reuses `build_facets()`'s own
already-computed real per-unit facet data (rule 8, never a new
detector) — a unit "touches" a dimension when at least one of its real
facets links to that dimension's own registered page, the exact same
real evidence every Infra/Inter page already shows for that unit.
"""
from pathlib import Path
import sys
import math

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
from galaxy_map import build_facets, UNIT_ORDER, UNIT_META  # noqa: E402

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


def _dim_headers_row():
    return ''.join(_dim_header(d) for d in DIMENSIONS)


def _dim_label(d):
    """The same dimension name in a bubble view — same gate, so the
    bubble system can never reach further OR less far than the table
    it follows (R22)."""
    page = _dim_page(d)
    inner = esc(d['label'])
    return f'<a href="{page}">{inner}</a>' if page else inner


def _dim_cells(row):
    """Shared cell-rendering for one X x Dimension row — every level's
    own table calls this (rule 8), only the LEADING columns differ per
    grain (unit name vs. river name+count vs. module name+river)."""
    return ''.join(
        f'<td class="dcell{" on" if row.get(d["id"]) else ""}">{d["icon"] if row.get(d["id"]) else ""}</td>'
        for d in DIMENSIONS
    )


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


# G108 (Aug 26 2026) — real L0-unit x Dimension membership, Alex's own
# direct ask ("the l0 objects should be there"). Reuses build_facets()'s
# own already-computed real per-unit facet data (rule 8) — never a new
# detector: a unit "touches" a dimension when at least one of its real
# facets links to that dimension's own registered page (stripped of any
# `#fragment` — e.g. `galaxy_map_supabase.html#tbl-X` still counts as a
# real Supabase touch). This is the exact same real evidence every
# Infra/Inter page already shows for that unit, just re-asked as a
# yes/no per dimension rather than left as a raw facet list.
def compute_l0_dim_tags():
    facets = build_facets()
    tags = {}
    for uid in UNIT_ORDER:
        linked_pages = {f['link'].split('#')[0] for f in facets.get(uid, []) if f.get('link')}
        row = {d['id']: (_dim_page(d) in linked_pages) if _dim_page(d) else False for d in DIMENSIONS}
        tags[uid] = row
    return tags


def build_rows(tags):
    rows = []
    for m in sorted(tags, key=lambda x: -sum(tags[x].values())):
        row = tags[m]
        n = sum(row.values())
        r = _river_of(m)
        rows.append(
            f'<tr class="{"hub" if n >= 3 else ""}"><td class="modname">'
            f'<a href="galaxy_map_current.html#mod-{esc(m)}">{esc(m)}</a></td>'
            f'{_river_cell(r)}'
            f'{_dim_cells(row)}<td class="tagcount">{n}</td></tr>'
        )
    return ''.join(rows)


def build_river_matrix(tags):
    """The real River x Dimension cross-tab — a pure ROLL-UP of the
    module-grain `tags` this file already computes (rule 8 — dimension
    membership is never re-derived here) onto each module's own river
    via RIVER_MODULES. A river counts as participating in a dimension
    when at least one of its own real modules genuinely does."""
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
    header = ('<tr><th>River</th><th>Modules</th>' + _dim_headers_row() + '<th>Dims</th></tr>')
    return '<table class="dtable">' + header + ''.join(rows) + '</table>'


def build_l0_matrix(l0_tags):
    """The real L0 x Dimension table — G108, Alex's own direct ask.
    Same real rendering shape as the River/Module tables (rule 8):
    hub rows (3+ tags) highlighted, sorted by tag count descending."""
    rows = []
    for uid in sorted(l0_tags, key=lambda x: -sum(l0_tags[x].values())):
        row = l0_tags[uid]
        n = sum(row.values())
        meta = UNIT_META[uid]
        rows.append(
            f'<tr class="{"hub" if n >= 3 else ""}"><td class="modname">'
            f'<a href="galaxy_map.html">{meta["icon"]} {esc(meta["label"])}</a></td>'
            f'{_dim_cells(row)}<td class="tagcount">{n}</td></tr>'
        )
    header = '<tr><th>L0 Unit</th>' + _dim_headers_row() + '<th>Dims</th></tr>'
    return '<table class="dtable">' + header + ''.join(rows) + '</table>'


def _bubble_ring(nodes_data, radius=300, cx=420, cy=420):
    """Generic circular hub-and-spoke bubble layout — shared by L0/L1/L2
    (rule 8, replacing what would otherwise be 3 near-identical hand-
    written layouts). `nodes_data` is a list of dicts:
    {key, color, short_label, n_dims, detail_html}. Returns
    (svg, details_html)."""
    n = len(nodes_data) or 1
    nodes, details = [], []
    for i, nd in enumerate(nodes_data):
        angle = (360 / n) * i - 90
        x = cx + radius * math.cos(math.radians(angle))
        y = cy + radius * math.sin(math.radians(angle))
        rsize = 24 + nd['n_dims'] * 4
        nodes.append(
            f'<g class="dbubble" data-key="{nd["key"]}" transform="translate({x:.0f},{y:.0f})">'
            f'<circle r="{rsize}" fill="{nd["color"]}" fill-opacity="0.18" stroke="{nd["color"]}" stroke-width="2"/>'
            f'<text text-anchor="middle" dy="-3" font-size="12" fill="#fff" font-weight="700">{nd["n_dims"]}</text>'
            f'<text text-anchor="middle" dy="12" font-size="8" fill="{nd["color"]}">{esc(nd["short_label"][:16])}</text></g>')
        details.append(
            f'<div class="rdetail" id="dtl-{nd["key"]}" style="display:none">'
            f'<h3>{esc(nd["full_label"])}</h3>{nd["detail_html"]}</div>')
    svg = ('<svg viewBox="0 0 840 840" width="100%" style="max-width:760px;display:block;margin:0 auto">'
           + ''.join(nodes) + '</svg>')
    return svg, ''.join(details)


def build_l0_bubbles(l0_tags):
    nodes_data = []
    for uid in UNIT_ORDER:
        row = l0_tags[uid]
        hit_dims = [d for d in DIMENSIONS if row[d['id']]]
        meta = UNIT_META[uid]
        items = ''.join(f'<li>{d["icon"]} <b>{_dim_label(d)}</b></li>' for d in hit_dims) \
            or '<li class="meta">No real dimension membership detected for this unit (per its own already-computed facet links).</li>'
        nodes_data.append(dict(
            key=uid, color=meta['color'], short_label=meta['label'],
            full_label=f"{meta['icon']} {meta['label']}", n_dims=len(hit_dims),
            detail_html=f'<ul>{items}</ul>'))
    svg, details = _bubble_ring(nodes_data)
    return svg + '<div id="bubble-details">' + details + '</div>'


def build_river_bubbles(tags):
    """Bubble view over the EXACT data build_river_matrix() renders —
    R22's own standing rule (the table is the source of truth, the
    bubble system follows it and never invents its own dataset)."""
    rivers = sorted({r for m in tags if (r := _river_of(m)) is not None})
    nodes_data = []
    for r in rivers:
        mods = [m for m in tags if _river_of(m) == r]
        hit_dims = [d for d in DIMENSIONS if any(tags[m][d['id']] for m in mods)]
        color = RIVER_COLOR.get(r, '#888')
        full = RIVER_NAME.get(r, f'River {r}')
        short = full.split('—', 1)[1].strip() if '—' in full else full
        items = ''.join(
            f'<li>{d["icon"]} <b>{_dim_label(d)}</b> — '
            f'{", ".join(_mod_link(m) for m in sorted(m for m in mods if tags[m][d["id"]]))}</li>'
            for d in hit_dims) or '<li class="meta">No real dimension membership detected for this river.</li>'
        nodes_data.append(dict(
            key=f'r{r}', color=color, short_label=short, full_label=full,
            n_dims=len(hit_dims), detail_html=f'<ul>{items}</ul>'))
    svg, details = _bubble_ring(nodes_data)
    return svg + '<div id="bubble-details">' + details + '</div>'


def build_module_bubbles(tags):
    """Real module-grain bubble view — G108, per Alex's own ask that
    the bubble map be reworked to genuinely match all 3 levels, not
    just River. Honestly scoped to real hubs (3+ dimension tags) rather
    than all 44+ modules — a full 44-node ring would be real visual
    noise the table already serves better (same "too crowded" reasoning
    G20 already fixed once for River's own canvas); every module still
    has its own real row in the Table view above, this is the bubble
    view's own deliberately narrower "which modules matter most" lens."""
    hubs = [m for m in tags if sum(tags[m].values()) >= 3]
    nodes_data = []
    for m in sorted(hubs, key=lambda x: -sum(tags[x].values())):
        row = tags[m]
        hit_dims = [d for d in DIMENSIONS if row[d['id']]]
        r = _river_of(m)
        color = RIVER_COLOR.get(r, '#888') if r else '#888'
        items = ''.join(f'<li>{d["icon"]} <b>{_dim_label(d)}</b></li>' for d in hit_dims)
        nodes_data.append(dict(
            key=m, color=color, short_label=m, full_label=m,
            n_dims=len(hit_dims), detail_html=f'<ul>{items}</ul>'))
    if not nodes_data:
        return '<p class="vhint">No real module currently carries 3+ dimension tags.</p>'
    svg, details = _bubble_ring(nodes_data)
    note = (f'<p class="vhint">Real hubs only (3+ dimension tags) — {len(nodes_data)} of {len(tags)} modules. '
            f'Every module, hub or not, still has its own real row in the Table view above.</p>')
    return note + svg + '<div id="bubble-details">' + details + '</div>'


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
  /* G108 (Aug 26 2026) — real LEVEL tabs, replacing the old flat
     3-button "categorization" Alex asked to retire. Same visual
     language as the level-rail/sidebar's own L0/L1/L2 chips elsewhere
     in this pipeline (rule 8 — reused styling, not a new convention). */
  .lvl-tabs{{display:flex;justify-content:center;gap:8px;padding:16px 24px 0;flex-wrap:wrap}}
  .lvl-tab{{padding:8px 18px;border-radius:16px;font-size:12px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .lvl-tab.active{{background:var(--gold);color:#1a1608;border-color:var(--gold)}}
  .lvl-block{{display:none}}
  .lvl-block.active{{display:block}}
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
  <p>Alex's own real ask, resolved via /interrogation: a real river/module can belong to MORE THAN ONE dimension at once (multi-home, not a strict partition) — this is the real cross-dimension ANALYSIS view, not a Level-0 replacement (the 4 galaxies stay exactly as they are). Real, structural rework (Aug 26 2026): L0/River/Module are 3 real LEVELS of the same recurring question ("which dimensions does this real object touch"), not 3 flat, unrelated categories — pick a level below, each with its own real Table (default) + Map. {n_hubs} of {n_mods} real modules are genuine "hubs" (3+ real dimension tags) — the modules doing the most real, load-bearing cross-dimension work in RPGACE Total Systems, regardless of which river they're nominally grouped under.</p>
</div>

<div class="lvl-tabs">
  <div class="lvl-tab active" data-lvl="l0">🌌 L0 (units)</div>
  <div class="lvl-tab" data-lvl="l1">🏛️ L1 (rivers)</div>
  <div class="lvl-tab" data-lvl="l2">🌊 L2 (modules)</div>
</div>

<div class="lvl-block active" id="lvl-l0">
  <div class="vhint">Every real L0 unit cross-referenced against every dimension it genuinely touches — reusing that unit's own already-computed real facet links (rule 8), never a new detector. A unit counts as touching a dimension when at least one of its real facets links to that dimension's own page.</div>
  <div class="toggle-row">
    <div class="toggle-btn active" data-view="l0table">📊 Table</div>
    <div class="toggle-btn" data-view="l0map">🌌 Map</div>
  </div>
  <div class="view active" id="view-l0table"><div class="wrap">{l0_matrix}</div></div>
  <div class="view" id="view-l0map"><div class="bubblewrap">{l0_bubbles}</div></div>
</div>

<div class="lvl-block" id="lvl-l1">
  <div class="vhint">Every real river cross-referenced against every dimension it genuinely participates in — a roll-up of the module-grain data at L2, never re-derived. A cell shows how many of that river's own modules carry that dimension; hover it for their names, click it (or the river name) for the full breakdown.</div>
  <div class="toggle-row">
    <div class="toggle-btn active" data-view="l1table">📊 Table</div>
    <div class="toggle-btn" data-view="l1map">🌌 Map</div>
  </div>
  <div class="view active" id="view-l1table"><div class="wrap">{river_matrix}</div></div>
  <div class="view" id="view-l1map"><div class="bubblewrap">{river_bubbles}</div></div>
</div>

<div class="lvl-block" id="lvl-l2">
  <div class="vhint">The finer grain the L1 roll-up deliberately loses: which individual module is a real cross-dimension hub, regardless of which river it is grouped under.</div>
  <div class="toggle-row">
    <div class="toggle-btn active" data-view="l2table">📊 Table</div>
    <div class="toggle-btn" data-view="l2map">🌌 Map</div>
  </div>
  <div class="view active" id="view-l2table">
    <div class="wrap">
      <table class="dtable">
        <thead><tr><th>Module</th><th>River</th>{dim_headers}<th>Tags</th></tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  </div>
  <div class="view" id="view-l2map"><div class="bubblewrap">{module_bubbles}</div></div>
</div>

{dim_index}
<div class="note">
  Generated by <code>scripts/galaxy_map_dimensions.py</code>, real detection functions in <code>graphify_river_group.py</code>/<code>galaxy_map.py</code> —
  never re-derived (rule 8), each dimension's own already-shipped detector reused as-is. G30/G108 of the ratified
  "RPGACE Total Systems Galaxy Map" /CEO plan. Mapping rules: <code>system_map_spec.md</code>.
</div>
<script>
(function() {{
  // Real level-tab switcher (G108) — shows exactly one .lvl-block at a
  // time; each block owns its own Table/Map sub-toggle underneath.
  var lvlTabs = document.querySelectorAll('.lvl-tab');
  var lvlBlocks = document.querySelectorAll('.lvl-block');
  lvlTabs.forEach(function(t) {{
    t.addEventListener('click', function() {{
      lvlTabs.forEach(function(x) {{ x.classList.toggle('active', x === t); }});
      lvlBlocks.forEach(function(b) {{ b.classList.toggle('active', b.id === 'lvl-' + t.dataset.lvl); }});
    }});
  }});
  // Table/Map sub-toggle — scoped to the enclosing .lvl-block so 3
  // separate levels' worth of these buttons never cross-toggle.
  document.querySelectorAll('.toggle-btn').forEach(function(t) {{
    t.addEventListener('click', function() {{
      var block = t.closest('.lvl-block');
      if (!block) return;
      block.querySelectorAll('.toggle-btn').forEach(function(x) {{ x.classList.toggle('active', x === t); }});
      block.querySelectorAll('.view').forEach(function(v) {{ v.classList.toggle('active', v.id === 'view-' + t.dataset.view); }});
    }});
  }});
  function reveal(key) {{
    document.querySelectorAll('.rdetail').forEach(function(d) {{ d.style.display = (d.id === 'dtl-' + key) ? '' : 'none'; }});
    var el = document.getElementById('dtl-' + key);
    if (el) el.scrollIntoView({{behavior:'smooth', block:'nearest'}});
  }}
  // Table rows AND cells both reach the same real bubble detail the
  // bubble view's own click already goes to — never a second target.
  document.querySelectorAll('th.rowjump, td.rcell').forEach(function(el) {{
    el.addEventListener('click', function() {{
      var block = el.closest('.lvl-block');
      if (block) {{
        block.querySelectorAll('.toggle-btn').forEach(function(x) {{ x.classList.toggle('active', x.dataset.view && x.dataset.view.indexOf('map') !== -1); }});
        block.querySelectorAll('.view').forEach(function(v) {{ v.classList.toggle('active', v.id.indexOf('map') !== -1); }});
      }}
      reveal('r' + el.dataset.river);
    }});
  }});
  document.querySelectorAll('.dbubble').forEach(function(b) {{
    b.addEventListener('click', function() {{ reveal(b.dataset.key); }});
  }});
}})();
</script>
</body>
</html>
"""


def main():
    tags = compute_matrix()
    l0_tags = compute_l0_dim_tags()
    n_hubs = sum(1 for m, row in tags.items() if sum(row.values()) >= 3)
    dim_headers = _dim_headers_row()
    rows = build_rows(tags)
    html = TEMPLATE.format(dim_headers=dim_headers, rows=rows, n_hubs=n_hubs, n_mods=len(tags),
                           river_matrix=build_river_matrix(tags),
                           river_bubbles=build_river_bubbles(tags),
                           l0_matrix=build_l0_matrix(l0_tags),
                           l0_bubbles=build_l0_bubbles(l0_tags),
                           module_bubbles=build_module_bubbles(tags),
                           dim_index=dimension_index_html(OUT.name),
                           dim_css=DIMENSION_INDEX_CSS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    # DD7 (Aug 23 2026) — live in-flight ceo_plan_items overlay,
    # injected at the same post-process point as the level rail so a
    # regeneration can never wipe it. See inject_plan_overlay().
    html = inject_plan_overlay(html, 'dimensions')
    OUT.write_text(html, encoding='utf-8')
    n_l0_hubs = sum(1 for uid, row in l0_tags.items() if sum(row.values()) >= 3)
    print(f"Wrote {OUT} — {len(tags)} modules ({n_hubs} hub(s)), {len(l0_tags)} L0 units ({n_l0_hubs} hub(s)) — "
          f"3 real levels (L0/L1/L2), each with Table+Map, replacing the old flat 3-button toggle.")
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
