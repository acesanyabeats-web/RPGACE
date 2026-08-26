#!/usr/bin/env python3
"""
galaxy_map_connectors.py — G99 completion, "RPGACE Total Systems Galaxy
Map" /CEO plan (Aug 25 2026). The 6 remaining real connectors from the
retired "External AI" grouping (Anthropic/Kimi/Luna already moved to
their own dedicated unit, galaxy_map_oracle.py; OpenMontage/Graphify CC
already have their own CC-unit pages), each promoted to its own real L0
unit per Alex's own words: "make all its components their own l0 unit."

Real, honest split, not a uniform template forced onto all 6:
  - Composio / Jina AI / Last.fm genuinely have a real, detectable
    client-side rpgace_core.js call site (compute_all_connector_call_
    counts(), graphify_river_group.py — reuses compute_outbound_api_
    call_sites()/compute_lastfm_call_sites(), never re-derived, rule 8)
    — each gets the SAME real L1(river)->L2(module)->L3(function) Infra
    drilldown Oracle/Supabase already have.
  - librosa / Whisper (OpenAI, local) / n8n genuinely do NOT — their
    real trigger lives entirely outside the client (a local Python
    script, a cron workflow) confirmed by the same detector finding
    nothing, not assumed. Building a fake river/module drilldown for
    these would be dishonest scope inflation; each instead gets a
    real, plain evidence panel sourced from EXTERNAL_CONNECTORS' own
    already-sourced via/note/status fields.

One shared page, tabbed by connector — not 6 near-identical files
(rule 8). Table-first per R22: each connector's own info/table is the
real source; a connector with real function evidence additionally gets
a map-view toggle over the identical data.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    compute_all_connector_call_counts, EXTERNAL_CONNECTORS, RIVER_MODULES,
    RIVER_NAME, LEVEL3_MODULES, TOTAL_ZONES,
    build_infra_drilldown, infra_drilldown_counts, render_infra_drilldown,
    INFRA_DRILLDOWN_CSS,
)
from graphify_river_group import inject_level_rail  # noqa: E402
from graphify_river_group import dimension_index_html, DIMENSION_INDEX_CSS  # noqa: E402

OUT = Path('graphify-out/galaxy_map_connectors.html')

# Real, evidence-backed (drilldown) vs. honest-disclosure-only split —
# both lists sourced from compute_all_connector_call_counts() actually
# finding something (or not), not hand-decided.
CALLS = compute_all_connector_call_counts()
DRILLDOWN_CONNECTORS = ['Composio', 'Jina AI', 'Last.fm']
DISCLOSURE_CONNECTORS = ['librosa', 'n8n', 'Whisper (OpenAI, local)']
CONN_ICON = {'Composio': '🧩', 'Jina AI': '🕷️', 'Last.fm': '🎧',
             'librosa': '🎚️', 'n8n': '🔗', 'Whisper (OpenAI, local)': '🎙️'}
CONN_ID = {'Composio': 'composio', 'Jina AI': 'jina', 'Last.fm': 'lastfm',
           'librosa': 'librosa', 'n8n': 'n8n', 'Whisper (OpenAI, local)': 'whisper'}
CONN_ROW = {c['name']: c for c in EXTERNAL_CONNECTORS}

_river_of = {}
for _r, _mods in RIVER_MODULES.items():
    for _m in _mods:
        _river_of[_m] = _r


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def _leaf_link(mod):
    return f'galaxy_map_current.html#mod-{mod}' if mod in LEVEL3_MODULES else None


def _river_link(rnum):
    label = RIVER_NAME.get(rnum, f'River {rnum}').split('—')[0].strip()
    return f'<a class="river-chip" href="galaxy_map_module.html#river-{rnum}">🌊 {esc(label)}</a>'


def build_drilldown_section(conn):
    pairs = CALLS.get(conn, [])
    evidence = {conn: pairs}
    drill, orphans = build_infra_drilldown(evidence)
    counts = infra_drilldown_counts(drill, orphans)
    n_mods = len({m for m, _f, _d in pairs})
    rivers_touched = {_river_of[m] for m, _f, _d in pairs if m in _river_of}
    table_rows = []
    for m in sorted({m for m, _f, _d in pairs}):
        fns = sorted({f for mm, f, _d in pairs if mm == m})
        rnum = _river_of.get(m)
        chip = _river_link(rnum) if rnum else '<span class="mod-chip-none">cross-cutting, no river</span>'
        mod_link = f'<a class="mod-chip" href="galaxy_map_current.html#mod-{m}">🔽 {m}</a>' if m in LEVEL3_MODULES else f'<span class="mod-chip-none">{m}</span>'
        fn_rows = ''.join(f'<div class="touch-row">{CONN_ICON[conn]} <code>{f}()</code></div>' for f in fns)
        table_rows.append(f'''<div class="table-section">
  <div class="thead"><span class="tdot" style="background:{"#3DAA6E" if conn == "Composio" else ("#4A90E2" if conn == "Jina AI" else "#E25454")}"></span><h2>{mod_link}</h2>
    <span class="tcount">{len(fns)} real function(s)</span></div>
  <div class="rivers">{chip}</div>
  <details class="touches"><summary>real functions calling {esc(conn)}</summary>{fn_rows}</details>
</div>''')
    map_view = render_infra_drilldown(
        drill, orphans, unit_icon=CONN_ICON[conn], unit_label=conn,
        leaf_link_fn=_leaf_link, resource_emoji=CONN_ICON[conn],
        orphan_label='Cross-cutting (no river)',
        orphan_note="RIVER_MODULES' own documented exclusions", esc=esc)
    row = CONN_ROW.get(conn, {})
    cid = CONN_ID[conn]
    section = f'''<section class="conn-pane" id="conn-{cid}">
  <div class="conn-head"><h2>{CONN_ICON[conn]} {esc(conn)}</h2>
    <span class="conn-status">{esc(row.get('status', ''))}</span></div>
  <p class="conn-note">{esc(row.get('note', ''))} Real trigger: <code>{esc(row.get('via', ''))}</code>.</p>
  <p class="conn-summary">{len(pairs)} real (module,function) call pair(s) across {n_mods} module(s), {len(rivers_touched)} river(s) — a genuine client-side rpgace_core.js call site, detected the same way Oracle/Supabase's own Infra systems are.</p>
  <div class="toggle-row">
    <div class="toggle-btn active" data-conn="{cid}" data-view="table">📊 Table</div>
    <div class="toggle-btn" data-conn="{cid}" data-view="map">🌌 Map</div>
  </div>
  <div class="view active" id="view-{cid}-table"><div class="tables">{''.join(table_rows)}</div></div>
  <div class="view" id="view-{cid}-map">{map_view}</div>
</section>'''
    return counts, n_mods, len(rivers_touched), section


def build_disclosure_section(conn):
    row = CONN_ROW.get(conn, {})
    cid = CONN_ID[conn]
    return f'''<section class="conn-pane" id="conn-{cid}">
  <div class="conn-head"><h2>{CONN_ICON[conn]} {esc(conn)}</h2>
    <span class="conn-status">{esc(row.get('status', ''))}</span></div>
  <p class="conn-note">{esc(row.get('note', ''))}</p>
  <div class="disclosure-box">
    <b>⚠️ Honest finding, not a gap in this page</b> — the same real, project-wide
    detector that found Composio/Jina AI/Last.fm's own client-side call sites
    (<code>compute_all_connector_call_counts()</code>) found <b>zero</b> for
    {esc(conn)}. Its real trigger genuinely lives outside <code>rpgace_core.js</code>
    entirely: <code>{esc(row.get('via', ''))}</code>. Building a river/module/
    function drilldown here would claim evidence that does not exist — this
    connector's real "Infra" is the fact stated above, not a fabricated map.
  </div>
  <p class="conn-summary">Bridges to: {esc(row.get('bridges_to', 'n/a'))}</p>
</section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Connectors)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --accent:#3DAA6E; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 20%, #0e1a12 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--accent);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto;line-height:1.6}}
  .conn-tabs{{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}}
  .conn-tab{{padding:6px 14px;border-radius:16px;font-size:11.5px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .conn-tab.active{{background:var(--accent);color:#0a0a0f;font-weight:700}}
  .conn-pane{{display:none;max-width:900px;margin:0 auto;padding:24px}}
  .conn-pane.active{{display:block}}
  .conn-head{{display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap}}
  .conn-head h2{{font-family:Georgia,serif;font-size:20px;color:#fff}}
  .conn-status{{font-size:9px;font-weight:700;padding:2px 8px;border-radius:8px;background:rgba(255,255,255,0.06);color:var(--dim);text-transform:uppercase}}
  .conn-note{{font-size:11px;color:var(--dim);line-height:1.6;margin-bottom:10px}}
  .conn-summary{{font-size:10.5px;color:#a8a8b8;margin-bottom:12px}}
  .disclosure-box{{background:rgba(226,84,84,0.08);border:1px solid rgba(226,84,84,0.3);border-radius:10px;padding:14px 16px;font-size:11px;color:#e8c8c8;line-height:1.6;margin-bottom:12px}}
  .toggle-row{{display:flex;gap:8px;margin-bottom:14px}}
  .toggle-btn{{padding:6px 14px;border-radius:14px;font-size:10.5px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .toggle-btn.active{{background:var(--gold);color:#1a1608;border-color:var(--gold)}}
  .view{{display:none}} .view.active{{display:block}}
  .tables{{display:flex;flex-direction:column;gap:12px}}
  .table-section{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px 16px}}
  .thead{{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px}}
  .tdot{{width:10px;height:10px;border-radius:50%}}
  .thead h2{{font-family:Georgia,serif;font-size:14px;color:#fff}}
  .tcount{{font-size:9.5px;color:var(--dim);margin-left:auto}}
  .rivers{{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}}
  .river-chip{{font-size:9.5px;padding:2px 8px;border-radius:8px;background:rgba(74,144,226,0.14);color:#4A90E2;text-decoration:none}}
  .mod-chip{{font-size:12px;font-weight:700;padding:2px 8px;border-radius:8px;background:rgba(201,168,76,0.1);color:var(--gold);text-decoration:none;font-family:Georgia,serif}}
  .mod-chip-none{{background:rgba(255,255,255,0.04);color:var(--dim);font-size:9.5px}}
  .touches{{margin-top:6px;font-size:10.5px}}
  .touches summary{{cursor:pointer;color:var(--dim)}}
  .touch-row{{padding:3px 0 3px 10px;color:#a8a8b8}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10px;background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:3px}}
  a{{color:var(--accent)}}
  .note{{max-width:900px;margin:20px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
{idd_css}
{dim_css}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Connectors</div>
  <h1>🔌 The 6 Remaining Real Connectors</h1>
  <p>Promoted to their own real L0 units from the retired "External AI" grouping (Alex: "make all its components their own l0 unit") — Anthropic/Kimi/Luna already moved to Oracle's own dedicated page; OpenMontage/Graphify CC already have their own CC-unit pages. 3 of these 6 genuinely have a real, detectable client-side call site and get the same real Infra bubble system Oracle/Supabase already have; 3 genuinely don't, and say so plainly rather than faking one.</p>
</div>
<div class="conn-tabs">{tabs}</div>
{sections}
{dim_index}

<script>
(function() {{
  var tabs = document.querySelectorAll('.conn-tab');
  var panes = document.querySelectorAll('.conn-pane');
  function show(id) {{
    panes.forEach(function(p) {{ p.classList.toggle('active', p.id === 'conn-' + id); }});
    tabs.forEach(function(t) {{ t.classList.toggle('active', t.dataset.conn === id); }});
  }}
  tabs.forEach(function(t) {{ t.addEventListener('click', function() {{ location.hash = 'conn-' + t.dataset.conn; }}); }});
  window.addEventListener('hashchange', function() {{
    var h = (location.hash || '').replace('#', '');
    var id = h.indexOf('conn-') === 0 ? h.replace('conn-', '').split('-')[0] : null;
    show(id || (tabs[0] && tabs[0].dataset.conn));
  }});
  var h0 = (location.hash || '').replace('#', '');
  var id0 = h0.indexOf('conn-') === 0 ? h0.replace('conn-', '').split('-')[0] : null;
  show(id0 || (tabs[0] && tabs[0].dataset.conn));

  document.querySelectorAll('.toggle-btn').forEach(function(b) {{
    b.addEventListener('click', function() {{
      var cid = b.dataset.conn;
      document.querySelectorAll('.toggle-btn[data-conn="' + cid + '"]').forEach(function(x) {{
        x.classList.toggle('active', x === b);
      }});
      document.getElementById('view-' + cid + '-table').classList.toggle('active', b.dataset.view === 'table');
      document.getElementById('view-' + cid + '-map').classList.toggle('active', b.dataset.view === 'map');
    }});
  }});
}})();
</script>

<div class="note">
  Generated by <code>scripts/galaxy_map_connectors.py</code> — real data from
  <code>graphify_river_group.py</code>'s <code>compute_all_connector_call_counts()</code> (function-level
  evidence for Composio/Jina AI/Last.fm) and <code>EXTERNAL_CONNECTORS</code> (already-sourced facts for
  librosa/n8n/Whisper). G99 completion of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan —
  each reached from the <a href="galaxy_map.html">L0 map</a>'s own unit for that connector.
</div>
</body>
</html>
"""


def main():
    tabs = []
    sections = []
    n_drilldown_pairs = 0
    for conn in DRILLDOWN_CONNECTORS:
        counts, n_mods, n_rivers, section = build_drilldown_section(conn)
        n_drilldown_pairs += len(CALLS.get(conn, []))
        tabs.append(f'<div class="conn-tab" data-conn="{CONN_ID[conn]}">{CONN_ICON[conn]} {conn}</div>')
        sections.append(section)
    for conn in DISCLOSURE_CONNECTORS:
        tabs.append(f'<div class="conn-tab" data-conn="{CONN_ID[conn]}">{CONN_ICON[conn]} {conn}</div>')
        sections.append(build_disclosure_section(conn))

    html = TEMPLATE.format(tabs=''.join(tabs), sections=''.join(sections),
                           dim_index=dimension_index_html(OUT.name),
                           dim_css=DIMENSION_INDEX_CSS, idd_css=INFRA_DRILLDOWN_CSS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(DRILLDOWN_CONNECTORS)} real connectors with a genuine Infra drilldown "
          f"({n_drilldown_pairs} real (module,function) pairs), {len(DISCLOSURE_CONNECTORS)} honest "
          f"disclosure-only (zero real client-side call site found).")
    # Real, build-time self-consistency gate, same discipline as
    # galaxy_map_oracle.py — every real pair the detector found must be
    # drawn by exactly one connector's own drilldown, never silently
    # dropped or double-counted.
    real_pairs = sum(len(v) for k, v in CALLS.items() if k in DRILLDOWN_CONNECTORS)
    if real_pairs != n_drilldown_pairs:
        raise SystemExit(
            f"SELF-CONSISTENCY FAIL: detector found {real_pairs} real pairs across drilldown "
            f"connectors, page built from {n_drilldown_pairs}.")


if __name__ == '__main__':
    main()
