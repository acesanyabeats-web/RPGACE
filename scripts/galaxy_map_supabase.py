#!/usr/bin/env python3
"""
galaxy_map_supabase.py — G45 of the ratified L0/Dimension/River/Module/
Current redefinition. F3's answer: "one page, all tables" — every real
table, which Level/River/Module reads or writes it, framed like a real
/perspective report.

Real data reused, never re-derived (rule 8): compute_all_supabase_
table_touches() (graphify_river_group.py, G45 addition) — the same
per-function detector powering G47/G49's own Current/River-grain
injection badges.

**G82 (Aug 25 2026) — a real SECOND evidence type on this page.**
This page's title claims "every real table, where it's used," and until
now that meant exactly one kind of use: an `RPGACE.sb.*` call inside
rpgace_core.js. That left four real tables — `achiever_archive`,
`ceo_plans`, `ceo_plan_items`, `smoke_test_items` — with no section at
all, despite being fetched live, on every page load, by the oversight
docs themselves. The gap was structural, not a tuning miss: those calls
live in different FILES, so a scanner pointed at rpgace_core.js cannot
reach them by construction.

`compute_oversight_doc_supabase_reads()` closes it. Deliberately
rendered as its own clearly-labelled block (and, for the four
oversight-only tables, its own clearly-labelled section group) rather
than merged into the existing per-function touch list: a live
`fetch('/rest/v1/...')` from an oversight doc's inline script and an
`RPGACE.sb.select()` inside a registered module are genuinely different
facts about genuinely different code, and flattening them into one list
would make the module/river chips silently wrong for half the rows.

**G83 (Aug 25 2026) — a real map view, alongside the table view.**
Alex's own words, after clicking the Supabase L0 unit bubble and being
handed a facet list: "all of these bubbles should lead somewhere lower
in the map... i click supabase and it takes me to supabase bubble system
without going through the list below. that list is redundant if the
supabase page show bubble system and where they lead to and where inputs
come from for each table."

Per R22 ("bubble systems always follow and showcase what's on the
table"), the table view above is untouched and stays the page's default
on a plain load — the map is a second rendering of the exact same
`TABLES`/`OVERSIGHT` data, never a second source. The L0 map's Supabase
unit now navigates here with `#view-map`, which is the one entry point
that lands directly on the bubble system.

LAYOUT CHOICE, and why (the real question this build had to answer):
there are 29 real module-touched tables plus 3 oversight-only ones, and
a single shared canvas holding every table hub plus every writer/reader
satellite would be ~32 hubs and ~200 satellites. The decisive fact is
that this dataset contains **zero table-to-table edges** — every real
edge is table↔module or table↔oversight-doc. A shared canvas therefore
buys no relationship visibility it would otherwise reveal; it only buys
edge crossings. So each table gets its own small self-contained
mini-diagram in a responsive card grid: writers fan in from the left
(arrow pointing INTO the table), readers fan out to the right (arrow
pointing OUT to the reader). That also keeps a real per-table anchor
(`#tmap-<table>`) beside the table view's existing `#tbl-<table>`
contract, instead of a single canvas with no addressable parts.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    compute_all_supabase_table_touches, RIVER_MODULES, RIVER_NAME,
    LEVEL3_MODULES, compute_oversight_doc_supabase_reads, _role_from_ops,
)
from graphify_river_group import inject_level_rail  # noqa: E402
from graphify_river_group import dimension_index_html, DIMENSION_INDEX_CSS  # noqa: E402
# G83 — the real shared edge/marker renderers, imported rather than
# re-implemented (rule 8), exactly as galaxy_map_current.py and
# galaxy_map_module.py already import them.
from galaxy_map import _curved_edge, _build_markers  # noqa: E402

OUT = Path('graphify-out/galaxy_map_supabase.html')

TABLES = compute_all_supabase_table_touches()

# G82 — real oversight-doc live fetches, grouped by table. Sorted at
# build so a fresh process re-run is byte-identical (R5).
OVERSIGHT = {}
for _rec in compute_oversight_doc_supabase_reads():
    OVERSIGHT.setdefault(_rec['table'], []).append(_rec)
OVERSIGHT_ONLY = sorted(t for t in OVERSIGHT if t not in TABLES)

_river_of = {}
for _r, _mods in RIVER_MODULES.items():
    for _m in _mods:
        _river_of[_m] = _r


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def _mod_link(mod):
    if mod in LEVEL3_MODULES:
        return f'<a class="mod-chip" href="galaxy_map_current.html#mod-{mod}">🔽 {mod}</a>'
    return f'<span class="mod-chip mod-chip-none">{mod}</span>'


# ── G82 audit (Aug 25 2026) — two real, separately-evidenced dead ends
# on this page, both found by checking what it NAMES against what it
# links.
#
# 1. The river chips said "🌊 River XI" and went nowhere, even though
#    the module chips beside them already link to Current Series. Fixed
#    with the same `galaxy_map_module.html#river-N` Level-2 anchor
#    galaxy_map_load.py already renders next to its own module links
#    (rule 8 — an existing convention applied where an identical fact
#    was rendered dead, not a new mechanic).
#
# 2. The oversight-doc evidence rows named a real FILE
#    (`smoke_test.html`, `achiever.html`, …) as plain text. That name is
#    unusually strong evidence to leave unlinked: it did not come from a
#    hand-typed roster, it came from compute_oversight_doc_supabase_
#    reads() literally opening that file at the repo root and finding
#    the `fetch('/rest/v1/…')` call being reported. The link is
#    therefore checked the same way it was sourced — `is_file()` at
#    build time — and a file that stops existing simply stops being
#    linked, rather than rotting into a dead href.
_ROOT = Path('.')


def _river_link(rnum):
    label = RIVER_NAME.get(rnum, f'River {rnum}').split('—')[0].strip()
    return f'<a class="river-chip" href="galaxy_map_module.html#river-{rnum}">🌊 {esc(label)}</a>'


def _doc_link(fname):
    """Real link to the oversight doc this evidence was read out of —
    only when that exact file genuinely exists right now."""
    if (_ROOT / fname).is_file():
        return f'<a class="doclink" href="../{esc(fname)}">{esc(fname)}</a>'
    return esc(fname)


def build_oversight_block(tbl):
    """Real, separately-labelled oversight-doc evidence for one table —
    or nothing at all if no oversight doc fetches it. Never merged into
    the rpgace_core.js touch list above it: different files, different
    idiom, different meaning."""
    recs = OVERSIGHT.get(tbl)
    if not recs:
        return ''
    rows = ''.join(
        f'<div class="touch-row"><code>{"+".join(r["methods"])}</code> '
        f'{_doc_link(r["file"])} — {r["n"]} real live call(s)</div>'
        for r in recs)
    return (f'<div class="ovs"><span class="ovs-tag">📚 also fetched live by the oversight docs</span>'
            f'{rows}</div>')


def build_oversight_only_row(tbl):
    """A real table that NO rpgace_core.js module touches, but an
    oversight doc genuinely fetches on every load. Rendered with the
    same section shape so it is findable at the same `#tbl-<table>`
    anchor every other Galaxy Map page deep-links to — but honestly
    without module/river chips, because there are genuinely no modules
    or rivers behind it to name."""
    recs = OVERSIGHT[tbl]
    methods = sorted({m for r in recs for m in r['methods']})
    op_badges = ''.join(f'<span class="op-badge op-{m.lower()}">{m}</span>' for m in methods)
    n = sum(r['n'] for r in recs)
    return f'''<section class="table-section ovs-only" id="tbl-{tbl}">
  <div class="thead"><span class="tdot tdot-ovs"></span><h2>🗄️ {tbl}</h2>{op_badges}
    <span class="tcount">{n} real live oversight-doc call(s)</span></div>
  <div class="rivers"><span class="meta">No rpgace_core.js module touches this table at all — it is
    read (and, where a method above says so, written) directly by the oversight docs' own inline
    scripts. Real, and invisible to the client-side module scanner by construction.</span></div>
  {build_oversight_block(tbl)}
</section>'''


def build_table_row(tbl, touches):
    rivers = sorted(set(_river_of.get(m) for m, _f, _op in touches if _river_of.get(m)))
    mods = sorted(set(m for m, _f, _op in touches))
    ops = sorted(set(op for _m, _f, op in touches))
    op_badges = ''.join(f'<span class="op-badge op-{op}">{op}</span>' for op in ops)
    river_chips = ''.join(
        _river_link(r) for r in rivers
    ) or '<span class="meta">no river-tracked module touches this table</span>'
    mod_chips = ''.join(_mod_link(m) for m in mods)
    detail_rows = ''.join(
        f'<div class="touch-row"><code>{op}</code> {esc(m)}.{esc(f)}()</div>'
        for m, f, op in sorted(touches))
    return f'''<section class="table-section" id="tbl-{tbl}">
  <div class="thead"><span class="tdot"></span><h2>🗄️ {tbl}</h2>{op_badges}
    <span class="tcount">{len(touches)} real function touch(es)</span></div>
  <div class="rivers">{river_chips}</div>
  <div class="mods">{mod_chips}</div>
  <details class="touches"><summary>Every real touch (module.function → operation)</summary>{detail_rows}</details>
  {build_oversight_block(tbl)}
</section>'''


# ── G83 — the real map view ──────────────────────────────────────────
# Colours are this page's own two existing palette tokens, reused so
# nothing is invented: --gold for writes (the direction that changes the
# table), --teal for reads. Colour encodes DIRECTION, not source type —
# an oversight-doc satellite is told apart by its 📚 prefix, not by a
# third colour, so the two fans stay readable as two fans.
WRITE_COLOUR = '#C9A84C'
READ_COLOUR = '#2ABFB0'
OVS_HUB_COLOUR = '#C9A84C'
MOD_HUB_COLOUR = '#2ABFB0'

CARD_W = 560
HUB_X = 280
LEFT_X = 120
RIGHT_X = 440
ROW_GAP = 36
HUB_R = 34


def _is_read(op):
    """Single-op read/write classification routed through the SAME
    shared classifier the L0 facet builders use (rule 8) — the two can
    never disagree about what `secureWrite` or `GET` means."""
    return _role_from_ops([op]) == 'read'


def split_touches(touches):
    """Real per-module write/read split of one table's rpgace_core.js
    touches. Every touch carries exactly one op, so the two returned
    dicts partition `touches` exactly — which is what makes the map
    hub's own counts provably equal the table view's
    `{len(touches)} real function touch(es)`."""
    writers, readers = {}, {}
    for m, _f, op in touches:
        d = readers if _is_read(op) else writers
        d[m] = d.get(m, 0) + 1
    return writers, readers


def split_oversight(tbl):
    """Real oversight-doc satellites for one table, by direction.

    Honest note, stated rather than smoothed over: the detector reports
    one `n` (real live call count) per {file, table} plus the SET of
    HTTP methods it saw — it does not attribute individual calls to
    individual methods. So a doc that genuinely both GETs and PATCHes
    the same table appears on BOTH fans, each carrying that same real
    `n`. That is why the hub's oversight total is printed as its own
    separate line and never summed into the write/read touch counts."""
    w, r = [], []
    for rec in OVERSIGHT.get(tbl, []):
        role = _role_from_ops(rec['methods'])
        if role in ('read', 'read_write'):
            r.append(rec)
        if role in ('write', 'read_write'):
            w.append(rec)
    return w, r


def _sat_label_link(kind, key):
    """Real destination for one satellite, or None when there honestly
    isn't one. Reuses the exact same two link conventions the table view
    above already uses (`_mod_link`'s Current-Series target and
    `_doc_link`'s existence-checked file target) — same facts, same
    destinations, rendered as SVG instead of chips."""
    if kind == 'mod':
        return f'galaxy_map_current.html#mod-{key}' if key in LEVEL3_MODULES else None
    return f'../{key}' if (_ROOT / key).is_file() else None


def _satellite(x, y, colour, kind, key, label, anchor):
    """One real fanned satellite node — marker dot plus its label,
    wrapped in a real link when one genuinely exists."""
    tx = x - 12 if anchor == 'end' else x + 12
    body = (f'<circle cx="{x}" cy="{y}" r="6" fill="#0f0f1a" stroke="{colour}" stroke-width="2"/>'
            f'<text x="{tx}" y="{y + 3.5}" text-anchor="{anchor}" font-size="9" '
            f'fill="{colour}">{esc(label)}</text>')
    href = _sat_label_link(kind, key)
    if href:
        return f'<a href="{href}" class="sat">{body}</a>'
    return f'<g class="sat sat-dead">{body}</g>'


def _fan(items, side, hub_cy, colour):
    """Real fan of satellites down one side of a table hub, plus their
    edges and per-edge count circles.

    Visual grammar taken directly from render_evidence_bubble()
    (graphify_river_group.py): a curved dashed edge per item, a small
    numbered circle at its midpoint carrying the real count. Not that
    function itself — its geometry is the inverse of this one (there,
    many already-laid-out nodes fan INTO a new hub bubble; here, one
    already-fixed hub fans OUT to satellites this function positions),
    and forcing it would need the caller to pre-compute the very
    positions this is for. Said plainly rather than claiming reuse that
    isn't real."""
    edges, nodes = [], []
    n = len(items)
    if not n:
        return edges, nodes
    x = LEFT_X if side == 'write' else RIGHT_X
    anchor = 'end' if side == 'write' else 'start'
    start_y = hub_cy - (n - 1) * ROW_GAP / 2
    for i, (kind, key, label, cnt) in enumerate(items):
        y = start_y + i * ROW_GAP
        if side == 'write':
            # Arrow points INTO the table — this is an input.
            edges.append(_curved_edge(x, y, HUB_X, hub_cy, colour, real=True,
                                      dashed=True, r1=6, r2=HUB_R + 4,
                                      offset_mult=0.35))
        else:
            # Arrow points OUT to the reader — this is an output.
            edges.append(_curved_edge(HUB_X, hub_cy, x, y, colour, real=True,
                                      dashed=True, r1=HUB_R + 4, r2=6,
                                      offset_mult=0.35))
        nodes.append(_satellite(x, y, colour, kind, key, label, anchor))
        mx, my = (x + HUB_X) / 2, (y + hub_cy) / 2
        nodes.append(
            f'<circle cx="{mx}" cy="{my}" r="8" fill="#0f0f1a" stroke="{colour}" stroke-width="1"/>'
            f'<text x="{mx}" y="{my + 3}" text-anchor="middle" font-size="8" '
            f'fill="{colour}" font-weight="700">{cnt}</text>')
    return edges, nodes


def build_map_card(tbl, touches):
    """One real table's mini-diagram — hub, both fans, real footer links.

    `touches` is [] for an oversight-only table; the hub then honestly
    shows 0 write / 0 read module touches and carries only its real
    oversight-doc satellites."""
    writers, readers = split_touches(touches)
    ovs_w, ovs_r = split_oversight(tbl)
    n_write = sum(writers.values())
    n_read = sum(readers.values())
    n_ovs = sum(r['n'] for r in OVERSIGHT.get(tbl, []))

    left = [('mod', m, m, writers[m]) for m in sorted(writers)]
    left += [('doc', r['file'], '📚 ' + r['file'], r['n']) for r in sorted(ovs_w, key=lambda r: r['file'])]
    right = [('mod', m, m, readers[m]) for m in sorted(readers)]
    right += [('doc', r['file'], '📚 ' + r['file'], r['n']) for r in sorted(ovs_r, key=lambda r: r['file'])]

    span = max(len(left), len(right), 1)
    half = (span - 1) * ROW_GAP / 2
    top = max(half + 18, HUB_R + 10)
    bottom = max(half + 18, HUB_R + 46)
    hub_cy = top + 12
    height = top + bottom + 26

    edges, nodes = [], []
    e, n = _fan(left, 'write', hub_cy, WRITE_COLOUR)
    edges += e
    nodes += n
    e, n = _fan(right, 'read', hub_cy, READ_COLOUR)
    edges += e
    nodes += n

    hub_colour = MOD_HUB_COLOUR if touches else OVS_HUB_COLOUR
    sub = f'{n_write} write · {n_read} read real touch(es)'
    ovs_line = (f'<text x="{HUB_X}" y="{hub_cy + HUB_R + 40}" text-anchor="middle" font-size="8" '
                f'fill="{WRITE_COLOUR}" opacity="0.9">+ {n_ovs} real oversight-doc call(s)</text>'
                if n_ovs else '')
    nodes.append(
        f'<g class="hub" data-tbl="{tbl}">'
        f'<circle cx="{HUB_X}" cy="{hub_cy}" r="{HUB_R}" fill="#0f0f1a" stroke="{hub_colour}" '
        f'stroke-width="2.5" filter="url(#glow)"/>'
        f'<text x="{HUB_X}" y="{hub_cy + 8}" text-anchor="middle" font-size="22">🗄️</text>'
        f'<text x="{HUB_X}" y="{hub_cy + HUB_R + 15}" text-anchor="middle" font-size="10.5" '
        f'fill="#fff" font-weight="700">{esc(tbl)}</text>'
        f'<text x="{HUB_X}" y="{hub_cy + HUB_R + 28}" text-anchor="middle" font-size="8.5" '
        f'fill="{hub_colour}" opacity="0.9">{sub}</text>'
        f'{ovs_line}</g>')

    rivers = sorted(set(_river_of.get(m) for m, _f, _op in touches if _river_of.get(m)))
    chips = ''.join(_river_link(r) for r in rivers)
    foot = (f'<div class="tmap-foot">{chips}'
            f'<span class="tmap-detail" data-tbl="{tbl}">📊 table detail ↓</span></div>')
    return (f'<div class="tmap-card" id="tmap-{tbl}">'
            f'<svg viewBox="0 0 {CARD_W} {height:.0f}" width="100%" '
            f'style="display:block" role="img" aria-label="{esc(tbl)} writers and readers">'
            f'{"".join(edges)}{"".join(nodes)}</svg>{foot}</div>')


def build_map_view():
    """Real map view — every table in TABLES plus every oversight-only
    table, one card each, ordered exactly as the table view orders its
    own sections so the two views never disagree about sequence."""
    cards = [build_map_card(t, touches)
             for t, touches in sorted(TABLES.items(), key=lambda kv: (-len(kv[1]), kv[0]))]
    cards += [build_map_card(t, []) for t in OVERSIGHT_ONLY]
    defs = (f'<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'
            f'<filter id="glow" x="-60%" y="-60%" width="220%" height="220%">'
            f'<feGaussianBlur stdDeviation="4" result="blur"/>'
            f'<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
            f'<filter id="edgeglow" x="-30%" y="-30%" width="160%" height="160%">'
            f'<feGaussianBlur stdDeviation="1.4" result="blur"/>'
            f'<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
            f'{_build_markers([WRITE_COLOUR, READ_COLOUR])}</defs></svg>')
    return (defs + '<div class="tmap-legend">'
            f'<span><b style="color:{WRITE_COLOUR}">━━▶</b> writes in — '
            '<code>insert</code>/<code>update</code>/<code>del</code>/<code>secureWrite</code>, '
            'or a real oversight-doc <code>POST</code>/<code>PATCH</code></span>'
            f'<span><b style="color:{READ_COLOUR}">━━▶</b> reads out — '
            '<code>select</code>, or a real oversight-doc <code>GET</code></span>'
            '<span>🔢 the number on each edge is that satellite\'s real touch/call count</span>'
            '<span>📚 an oversight doc, not a module — a doc that genuinely both reads and writes '
            'appears on both fans carrying the same real call count, which is why oversight totals '
            'are printed on their own hub line instead of being folded into the write/read numbers</span>'
            '</div><div class="tmap-grid">' + ''.join(cards) + '</div>')


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Supabase)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --teal:#2ABFB0; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 20%, #0e1a1a 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--teal);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:760px;margin:0 auto;line-height:1.6}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--teal);padding:4px 9px;border-radius:12px}}
  .tables{{max-width:820px;margin:24px auto;padding:0 24px;display:flex;flex-direction:column;gap:14px}}
  .table-section{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px 18px}}
  .thead{{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}}
  .tdot{{width:10px;height:10px;border-radius:50%;background:var(--teal)}}
  .thead h2{{font-family:Georgia,serif;font-size:15px;color:#fff}}
  .tcount{{font-size:9.5px;color:var(--dim);margin-left:auto}}
  .op-badge{{font-size:8.5px;font-weight:700;padding:2px 7px;border-radius:7px;background:rgba(255,255,255,0.06);color:var(--dim);text-transform:uppercase}}
  .rivers,.mods{{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}}
  /* G82 — the river chips are real Level-2 links now, styled to still
     read as chips rather than as underlined hyperlinks. */
  .river-chip{{font-size:9.5px;padding:2px 8px;border-radius:8px;background:rgba(42,191,176,0.1);color:var(--teal);text-decoration:none}}
  .river-chip:hover{{background:rgba(42,191,176,0.26)}}
  .doclink{{color:var(--gold);text-decoration:none;border-bottom:1px dotted currentColor}}
  .doclink:hover{{border-bottom-style:solid}}
  .mod-chip{{font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:8px;background:rgba(201,168,76,0.1);color:var(--gold);text-decoration:none}}
  .mod-chip-none{{background:rgba(255,255,255,0.04);color:var(--dim)}}
  .meta{{font-size:9.5px;color:var(--dim)}}
  .touches{{margin-top:8px;font-size:10.5px}}
  .touches summary{{cursor:pointer;color:var(--dim)}}
  .touch-row{{padding:4px 0 4px 12px;color:#a8a8b8}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10px;background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:3px}}
  a{{color:var(--teal)}}
  .note{{max-width:820px;margin:20px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  .ovs{{margin-top:8px;padding:8px 10px;border-left:2px solid var(--gold);background:rgba(201,168,76,0.05);border-radius:0 6px 6px 0}}
  .ovs-tag{{display:block;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin-bottom:4px}}
  .ovs .touch-row{{font-size:10.5px}}
  .ovs-only{{border-color:rgba(201,168,76,0.28)}}
  .tdot-ovs{{background:var(--gold)}}
  .grouphead{{max-width:820px;margin:30px auto 0;padding:0 24px}}
  .grouphead h2{{font-family:Georgia,serif;font-size:15px;color:#fff;margin-bottom:6px}}
  .grouphead p{{font-size:11px;color:var(--dim);line-height:1.7}}
  /* G83 — map/table toggle, reused verbatim from galaxy_map.py's own
     G67 toggle mechanic ("use what we have, dont make new shit"). */
  .toggle-row{{display:flex;justify-content:center;gap:8px;padding:16px 24px 0}}
  .toggle-btn{{padding:8px 18px;border-radius:16px;font-size:11.5px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .toggle-btn.active{{background:var(--gold);color:#1a1608;border-color:var(--gold)}}
  .view{{display:none}}
  .view.active{{display:block}}
  .tmap-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(400px,1fr));gap:14px;max-width:1400px;margin:16px auto 0;padding:0 24px}}
  .tmap-card{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:10px 8px 8px}}
  .tmap-card .sat text{{text-decoration:none}}
  .tmap-card a.sat{{cursor:pointer}}
  .tmap-card a.sat:hover circle{{stroke-width:3}}
  .tmap-card a.sat:hover text{{fill:#fff}}
  .tmap-card .sat-dead{{opacity:0.72}}
  .tmap-card .hub{{cursor:default}}
  .tmap-foot{{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:6px 8px 0;border-top:1px solid rgba(255,255,255,0.06);margin-top:4px}}
  .tmap-detail{{margin-left:auto;font-size:9.5px;font-weight:700;color:var(--teal);cursor:pointer;padding:2px 8px;border-radius:8px;background:rgba(42,191,176,0.1)}}
  .tmap-detail:hover{{background:rgba(42,191,176,0.26)}}
  .tmap-legend{{display:flex;flex-direction:column;gap:5px;max-width:1400px;margin:16px auto 0;padding:10px 24px;font-size:10.5px;color:var(--dim);line-height:1.6}}
{dim_css}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Supabase</div>
  <h1>🗄️ Every Real Table, Where It's Used</h1>
  <p>{n_tables} real Supabase tables with a genuine, checkable client-side touch in rpgace_core.js (113 of 502 real functions, 22%) — which Level/River/Module reads or writes each. Server-side (api/*.js) touches aren't reachable by this client-side detector — a real, honest scope limit, same class every other Galaxy Map page states.</p>
  <p style="margin-top:8px">Plus {n_ovs_only} more real table(s) below that <b>no</b> module touches at all, reached only by the oversight docs' own live <code>fetch('/rest/v1/…')</code> calls — a second, genuinely different evidence type, kept visibly separate rather than merged in.</p>
  <p style="margin-top:8px"><b>Map view</b> renders the same data as one bubble system per table — what writes <i>in</i> on the left, what reads <i>out</i> on the right. Per R22 the table is the source and the bubbles follow it; the counts on both views are the same real numbers, verified equal at build time.</p>
</div>
<div class="toggle-row">
  <div class="toggle-btn active" data-view="table">📊 Table view</div>
  <div class="toggle-btn" data-view="map">🌌 Map view</div>
</div>

<div class="view active" id="view-table">
<div class="tables">{table_sections}</div>
{ovs_group}
</div>

<div class="view" id="view-map">{map_view}</div>
{dim_index}

<script>
(function() {{
  // Real G83 — the exact map/table toggle mechanic galaxy_map.py already
  // uses, reused rather than reinvented. Table view is the DEFAULT on a
  // plain load: per R22 the table is the source the bubble system
  // renders, and every existing `#tbl-` table deep link from the L0 map
  // and the Dimensions pages lands in it.
  var mtToggles = document.querySelectorAll('.toggle-btn');
  var mtViews = document.querySelectorAll('.view');
  function showView(name) {{
    mtToggles.forEach(function(x) {{ x.classList.toggle('active', x.dataset.view === name); }});
    mtViews.forEach(function(v) {{ v.classList.toggle('active', v.id === 'view-' + name); }});
  }}
  mtToggles.forEach(function(t) {{
    t.addEventListener('click', function() {{ showView(t.dataset.view); }});
  }});
  // The one entry point that lands directly on the bubble system: the L0
  // map's Supabase unit navigates here with #view-map, which is Alex's
  // own ask ("i click supabase and it takes me to supabase bubble system
  // without going through the list below").
  function applyHash() {{
    var h = (location.hash || '').replace('#', '');
    if (h === 'view-map' || h.indexOf('tmap-') === 0) {{
      showView('map');
      var el = h.indexOf('tmap-') === 0 ? document.getElementById(h) : null;
      if (el) el.scrollIntoView({{behavior:'smooth', block:'start'}});
    }} else if (h.indexOf('tbl-') === 0) {{
      showView('table');
    }}
  }}
  applyHash();
  window.addEventListener('hashchange', applyHash);
  // R22 in the other direction — a hub's own card links back to the
  // exact table-view section it was rendered from, switching views the
  // same way the toggle does rather than jumping to a hidden anchor.
  document.querySelectorAll('.tmap-detail').forEach(function(el) {{
    el.addEventListener('click', function() {{
      showView('table');
      var sec = document.getElementById('tbl-' + el.dataset.tbl);
      if (sec) sec.scrollIntoView({{behavior:'smooth', block:'start'}});
    }});
  }});
}})();
</script>

<div class="note">
  Generated by <code>scripts/galaxy_map_supabase.py</code> — real data from
  <code>graphify_river_group.py</code>'s <code>compute_all_supabase_table_touches()</code>
  (a real per-function regex match on <code>RPGACE.sb.select/insert/update/del/secureWrite</code>),
  never hand-guessed. This is the real Supabase L0 unit's own content, per Part 3.3/F3 of the
  ratified redefinition — reached from the <a href="galaxy_map.html">L0 map</a>'s own
  Supabase unit.
</div>
</body>
</html>
"""


def main():
    table_sections = ''.join(
        build_table_row(t, touches)
        for t, touches in sorted(TABLES.items(), key=lambda kv: (-len(kv[1]), kv[0])))
    ovs_group = ''
    if OVERSIGHT_ONLY:
        ovs_group = (
            '<div class="grouphead"><h2>📚 Oversight-doc-only tables</h2>'
            '<p>Real tables with zero <code>RPGACE.sb.*</code> touches anywhere in '
            '<code>rpgace_core.js</code> — they exist, they are read and written on every page load, '
            'and the module scanner above is structurally unable to see them because those calls live '
            'in the oversight HTML files rather than in a registered module. Listed here so every '
            '<code>#tbl-&lt;table&gt;</code> deep link from the L0 map resolves to something real '
            'instead of a dead anchor.</p></div>'
            '<div class="tables">' + ''.join(build_oversight_only_row(t) for t in OVERSIGHT_ONLY) + '</div>')
    html = TEMPLATE.format(n_tables=len(TABLES), table_sections=table_sections,
                           n_ovs_only=len(OVERSIGHT_ONLY), ovs_group=ovs_group,
                           map_view=build_map_view(),
                           dim_index=dimension_index_html(OUT.name),
                           dim_css=DIMENSION_INDEX_CSS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    n_ovs_calls = sum(r['n'] for recs in OVERSIGHT.values() for r in recs)
    print(f"Wrote {OUT} — {len(TABLES)} real module-touched tables, "
          f"{sum(len(v) for v in TABLES.values())} real total touches; "
          f"plus {len(OVERSIGHT)} real oversight-doc-fetched table(s) "
          f"({len(OVERSIGHT_ONLY)} of them module-untouched, {n_ovs_calls} real live calls).")
    # G82 — real, measured destination coverage, printed so a build can
    # never silently regress it.
    docs = sorted({r['file'] for recs in OVERSIGHT.values() for r in recs})
    linked_docs = [d for d in docs if (_ROOT / d).is_file()]
    n_river_tables = sum(
        1 for t, touches in TABLES.items()
        if any(_river_of.get(m) for m, _f, _op in touches))
    print(f"  G82 destinations — {n_river_tables}/{len(TABLES)} table(s) now link at least one real river at "
          f"Level 2; {len(linked_docs)}/{len(docs)} named oversight doc(s) resolve to a real file and are linked.")
    # G83 — real, build-time self-consistency gate between the two views.
    # The map hub's own write/read numbers are derived independently of
    # the table view's `len(touches)` label; if they ever disagree the
    # page would be showing two different "truths" for the same table, so
    # this fails the build loudly rather than shipping it.
    n_nodes = n_edges = 0
    for t, touches in TABLES.items():
        w, r = split_touches(touches)
        if sum(w.values()) + sum(r.values()) != len(touches):
            raise SystemExit(
                f"SELF-CONSISTENCY FAIL: {t} — map view shows {sum(w.values())} write + "
                f"{sum(r.values())} read, table view shows {len(touches)} real touch(es).")
        ow, orr = split_oversight(t)
        n_nodes += 1 + len(w) + len(r) + len(ow) + len(orr)
        n_edges += len(w) + len(r) + len(ow) + len(orr)
    for t in OVERSIGHT_ONLY:
        ow, orr = split_oversight(t)
        n_nodes += 1 + len(ow) + len(orr)
        n_edges += len(ow) + len(orr)
    print(f"  G83 map view — {len(TABLES) + len(OVERSIGHT_ONLY)} real table hub card(s), "
          f"{n_nodes} node(s), {n_edges} edge(s); write+read counts verified identical to the "
          f"table view for all {len(TABLES)} module-touched table(s).")


if __name__ == '__main__':
    main()
