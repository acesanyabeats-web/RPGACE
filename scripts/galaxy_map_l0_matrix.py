#!/usr/bin/env python3
"""
galaxy_map_l0_matrix.py — G44 of the ratified L0/Dimension/River/Module/
Current redefinition. The real table/grid vision of the L0 map (F8's
"two separate matrices" answer — this is the L0-unit grain, 7 units x
their real edges; G30's existing galaxy_map_dimensions.html stays as
the separate module-grain matrix, unchanged, rule 8).

Real data reused directly, never re-derived (rule 8): imports UNITS/
EDGES straight from galaxy_map_l0_units.py (G43) — the SAME 7 units,
SAME 17 hand-curated real edges, just rendered as a matrix instead of a
click-through drill-down.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from galaxy_map_l0_units import UNITS, EDGES, UNIT_BY_ID, INJECTION  # noqa: E402

OUT = Path('graphify-out/galaxy_map_l0_matrix.html')


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def edge_between(a, b):
    for e in EDGES:
        if {e['a'], e['b']} == {a, b}:
            return e
    return None


def build_matrix():
    rows = []
    header = '<tr><th></th>' + ''.join(f'<th title="{esc(u["label"])}">{u["icon"]}</th>' for u in UNITS) + '</tr>'
    rows.append(header)
    for ru in UNITS:
        cells = [f'<th class="rowhead">{ru["icon"]} {ru["label"]}</th>']
        for cu in UNITS:
            if ru['id'] == cu['id']:
                cells.append('<td class="diag">—</td>')
                continue
            e = edge_between(ru['id'], cu['id'])
            if not e:
                cells.append('<td class="none" title="No direct real edge — mediated through another unit">·</td>')
                continue
            kind_cls = 'inject' if e['kind'] == INJECTION else 'actor'
            icon = '💉' if e['kind'] == INJECTION else '🧑'
            cells.append(f'<td class="hit {kind_cls}" title="{esc(e["desc"])}" data-edge="{e["id"]}">{icon}</td>')
        rows.append('<tr>' + ''.join(cells) + '</tr>')
    return ''.join(f'<tr>{r}</tr>' if not r.startswith('<tr>') else r for r in rows)


def build_edge_details():
    blocks = []
    for e in EDGES:
        ua, ub = UNIT_BY_ID[e['a']], UNIT_BY_ID[e['b']]
        kind_badge = '<span class="k-badge k-inject">💉 injection</span>' if e['kind'] == INJECTION else '<span class="k-badge k-actor">🧑 actor</span>'
        blocks.append(
            f'<div class="detail-row" id="detail-{e["id"]}" style="display:none">'
            f'<div class="dhead">{ua["icon"]} {ua["label"]} ↔ {ub["icon"]} {ub["label"]} {kind_badge}</div>'
            f'<div class="ddesc">{esc(e["desc"])}</div>'
            f'<div class="dev">Real evidence: {esc(e["evidence"])}</div></div>'
        )
    return ''.join(blocks)


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (L0 Dimension Matrix)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --purple:#9B59B6; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 20%, #14101e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:760px;margin:0 auto;line-height:1.6}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--gold);padding:4px 9px;border-radius:12px}}
  .matrix-wrap{{max-width:640px;margin:24px auto;padding:0 24px;overflow-x:auto}}
  table{{border-collapse:collapse;margin:0 auto;font-size:16px}}
  th,td{{border:1px solid rgba(255,255,255,0.08);width:40px;height:40px;text-align:center}}
  th{{font-size:16px}}
  th.rowhead{{font-size:10px;text-align:left;padding:0 8px;white-space:nowrap;width:auto}}
  td.diag{{background:rgba(255,255,255,0.02);color:#333}}
  td.none{{color:#333}}
  td.hit{{cursor:pointer}}
  td.hit.inject{{background:rgba(155,89,182,0.1)}}
  td.hit.actor{{background:rgba(226,84,84,0.08)}}
  td.hit:hover{{outline:1px solid var(--gold)}}
  .legend{{display:flex;gap:16px;justify-content:center;font-size:10.5px;margin:14px 0;color:var(--dim)}}
  .details{{max-width:700px;margin:0 auto 40px;padding:0 24px}}
  .detail-row{{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:14px 18px;margin-bottom:12px}}
  .dhead{{font-size:12.5px;font-weight:700;margin-bottom:6px}}
  .ddesc{{font-size:11.5px;line-height:1.6;margin-bottom:6px}}
  .dev{{font-size:10px;color:var(--dim);line-height:1.6}}
  .k-badge{{font-size:9px;font-weight:700;padding:2px 8px;border-radius:8px;margin-left:6px}}
  .k-inject{{background:rgba(155,89,182,0.15);color:var(--purple)}}
  .k-actor{{background:rgba(226,84,84,0.12);color:#E25454}}
  a{{color:var(--gold)}}
  .note{{max-width:760px;margin:20px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
</style>
</head>
<body>
<div class="breadcrumb">
  <a href="galaxy_map_l0_units.html">🌌 L0 — 7 Units</a>
  <span style="color:#4a4a58"> → </span>
  <span class="bc-here">📊 Dimension Matrix</span>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · L0 Dimension Matrix</div>
  <h1>📊 The L0 Map, as a Table</h1>
  <p>The same real 7 units and 17 hand-curated dimension-edges as <a href="galaxy_map_l0_units.html">L0's own click-through view</a> — here as a grid so every real relationship (and every real gap — mediated pairs show a dot, not forced) is visible at once. 💉 = a real injection-tool edge (Skills/Supabase); 🧑 = an actor edge. Click a cell for its real detail.</p>
</div>
<div class="matrix-wrap"><table id="matrix">{matrix_rows}</table></div>
<div class="legend"><span>💉 injection tool</span><span>🧑 actor</span><span>· no direct real edge (mediated)</span></div>
<div class="details">{edge_details}</div>
<div class="note">
  Generated by <code>scripts/galaxy_map_l0_matrix.py</code> — reuses UNITS/EDGES directly from
  <code>galaxy_map_l0_units.py</code> (rule 8), never re-derived. G30's existing module-grain matrix
  (<a href="galaxy_map_dimensions.html">galaxy_map_dimensions.html</a>) is a separate, different-granularity
  artifact — not replaced by this one.
</div>
<script>
(function() {{
  document.querySelectorAll('td.hit').forEach(function(td) {{
    td.addEventListener('click', function() {{
      var id = td.dataset.edge;
      document.querySelectorAll('.detail-row').forEach(function(d) {{ d.style.display = 'none'; }});
      var el = document.getElementById('detail-' + id);
      if (el) {{ el.style.display = ''; el.scrollIntoView({{behavior:'smooth', block:'nearest'}}); }}
    }});
  }});
}})();
</script>
</body>
</html>
"""


def main():
    matrix_rows = build_matrix()
    edge_details = build_edge_details()
    html = TEMPLATE.format(matrix_rows=matrix_rows, edge_details=edge_details)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(UNITS)}x{len(UNITS)} matrix, {len(EDGES)} real filled cells (x2, symmetric).")


if __name__ == '__main__':
    main()
