#!/usr/bin/env python3
"""
galaxy_map_skill_network.py — G36 of the ratified "RPGACE Total Systems
Galaxy Map" /CEO plan (Aug 14/15 2026). Alex's own verbatim ask: "also
certain skills building other skills that then create a network of
steps, this should be included with its own bubble system too."

Real, distinct from G35 (which dimension-axes a skill touches) — this
is skill-CALLS-skill COMPOSITION (e.g. /paranoia's own documented
sequence: Aintergration+restructure, GODMODE+scope+commit-
archaeologist+Omnitrix+5thDimension, debate+free-for-all-debate,
interrogation, Council-of-5 fact-check, Summary, all supervised by
/Engineer). Real evidence source, not invented: every skill's own
SKILL.md already documents which others it invokes in prose — a real,
mechanical detector (a `/otherSkillName` mention) extracts this
directly, reusing galaxy_map_skills.py's own SKILLS dict as the
canonical 24-skill name list (rule 8, never re-derived).

Rendered the same way the Logic Dimension renders river edges (rule 8,
not reinvented): a clickable <details> passage per real outgoing
invocation, grouped by the calling skill.

**Real Aug 21 2026 addition — Alex's own direct ask: "please make [this
page] its table view, to make the map/table view toggle, this should
exist for everywhere that has 2 views."** The tab/passage view above
becomes the real TABLE view; a real MAP (bubble) view is added
alongside it — a circular node-link layout (24 real skill nodes on a
ring, 117 real curved edges), reusing this session's own hand-rolled
polar-coordinate SVG convention (galaxy_map.py/galaxy_map_river.py),
never a force-directed physics library. The original docstring's "no
library to lay out well by hand" reasoning is now stale (that same
session already proved a real hand-computed layout works fine for
this project's zero-npm-runtime rule) — corrected here, not repeated.
"""
import math
import re
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from galaxy_map_skills import SKILLS
from graphify_river_group import SKILL_SECONDARY_RIVER, RIVER_NAME  # noqa: E402

OUT = Path('graphify-out/galaxy_map_skill_network.html')
SKILLS_DIR = Path('.claude/skills')


def polar(cx, cy, r, angle_deg):
    a = math.radians(angle_deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def build_bubble_map(names, invocations):
    """Real MAP view — a circular node-link layout, 24 real skill nodes
    on a ring, 117 real curved edges (each a genuine /otherSkillName
    mention, same data compute_skill_invocations() already found).
    Hand-computed polar coordinates, no force-directed library (rule 8
    — same convention galaxy_map.py/galaxy_map_river.py already use)."""
    W, H = 900, 900
    cx, cy = W / 2, H / 2
    r = 360
    pos = {}
    n = len(names)
    for i, name in enumerate(names):
        ang = 360 * i / n - 90
        pos[name] = polar(cx, cy, r, ang)

    edges_svg = []
    for caller, callees in invocations.items():
        x1, y1 = pos[caller]
        for callee in callees:
            x2, y2 = pos[callee]
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            # pull the midpoint toward center so edges curve inward,
            # never straight chords across the whole circle
            cx2 = mx + (cx - mx) * 0.35
            cy2 = my + (cy - my) * 0.35
            edges_svg.append(
                f'<path d="M {x1:.1f} {y1:.1f} Q {cx2:.1f} {cy2:.1f} {x2:.1f} {y2:.1f}" '
                f'class="net-edge" data-from="{esc(caller)}" data-to="{esc(callee)}" '
                f'marker-end="url(#netarrow)"/>'
            )

    nodes_svg = []
    for name in names:
        x, y = pos[name]
        n_out = len(invocations.get(name, []))
        nodes_svg.append(
            f'<g class="net-node" data-skill="{esc(name)}">'
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{16 + min(n_out, 10)}" />'
            f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" dominant-baseline="middle" '
            f'font-size="9">{esc(name[:10])}</text></g>'
        )
    return ''.join(edges_svg), ''.join(nodes_svg), W, H


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


def compute_skill_invocations():
    """Real, mechanical {caller: [callee, ...]} — a `/otherSkillName`
    mention inside a skill's own SKILL.md text, checked against every
    OTHER real skill name in SKILLS (never a self-mention). A real,
    honest scope limit: a slash-mention is the checkable signal; a
    skill that references another only by prose description with no
    `/name` form is invisible to this detector, same class of limit as
    every other pattern-based detector in this pipeline."""
    names = sorted(SKILLS.keys())
    out = {}
    for name in names:
        f = SKILLS_DIR / name / 'SKILL.md'
        if not f.exists():
            continue
        text = f.read_text(encoding='utf-8')
        callees = []
        for other in names:
            if other == name:
                continue
            if re.search(r'/' + re.escape(other) + r'\b', text) and other not in callees:
                callees.append(other)
        if callees:
            out[name] = callees
    return out


def build_skill_section(name, callees, callers):
    out_html = ''.join(
        f'<details class="passage"><summary>→ /{esc(c)}</summary>'
        f'<p>{esc(name)} invokes /{esc(c)} as part of its own documented sequence.</p></details>'
        for c in callees
    ) or '<div class="empty-note">No real outgoing invocation of another skill.</div>'
    in_html = ', '.join(f'/{esc(c)}' for c in callers) if callers else 'none'
    # G46 (Aug 18) — real River usage line, same data as galaxy_map_skills.py's
    # own new column (rule 8, not re-derived): every skill lives in River
    # XIII by default; SKILL_SECONDARY_RIVER adds a real secondary
    # citation for the 7 that have one.
    river_bits = ['River XIII']
    sec = SKILL_SECONDARY_RIVER.get(name)
    if sec:
        river_bits.append(RIVER_NAME.get(sec[0], f'River {sec[0]}').split('—')[0].strip())
    river_line = f'<p class="modline">Real River usage: {" + ".join(river_bits)} · Level: N/A (dev-process, not app-runtime)</p>'
    return f'''<section class="ssection" id="skillnet-{esc(name)}" style="display:none">
  <div class="shead"><h2>/{esc(name)}</h2><span class="pcount">{len(callees)} real outgoing invocation(s)</span></div>
  <p class="modline">Invoked BY: {in_html}</p>
  {river_line}
  {out_html}
</section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Skill Composition Network)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --orange:#E2A83D; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #1a1610 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--orange);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:900px;margin:0 auto}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px;flex-wrap:wrap}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:var(--orange);border-color:var(--orange)}}
  .breadcrumb .bc-here{{color:#1a0f04;background:var(--orange);padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
  .tabs{{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}}
  .tab{{padding:4px 10px;border-radius:14px;font-size:9.5px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .tab.active{{background:var(--orange);color:#1a0f04;font-weight:700}}
  .wrap{{max-width:900px;margin:0 auto;padding:24px}}
  .shead{{display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap}}
  .shead h2{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:18px;color:var(--gold)}}
  .pcount{{font-size:10px;color:var(--orange);font-weight:700}}
  .modline{{font-size:11px;color:var(--dim);margin-bottom:14px}}
  .passage{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 12px;margin-bottom:8px}}
  .passage summary{{cursor:pointer;font-size:12px;font-weight:700;color:#E2E2EC;list-style:none;font-family:'Cascadia Code','Fira Mono',monospace}}
  .passage summary::-webkit-details-marker{{display:none}}
  .passage summary::before{{content:'▶ ';color:var(--orange);font-size:9px}}
  .passage[open] summary::before{{content:'▼ '}}
  .passage p{{font-size:11px;color:#b8b8c8;line-height:1.6;margin-top:8px}}
  .empty-note{{font-size:11px;color:var(--dim);font-style:italic}}
  .note{{max-width:900px;margin:24px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  a{{color:var(--orange)}}
  .toggle-row{{display:flex;justify-content:center;gap:8px;padding:16px 24px 0}}
  .toggle-btn{{padding:8px 18px;border-radius:16px;font-size:11.5px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .toggle-btn.active{{background:var(--orange);color:#1a0f04;border-color:var(--orange)}}
  .view{{display:none}}
  .view.active{{display:block}}
  #view-map{{padding:10px 24px 30px;overflow-x:auto;text-align:center}}
  .net-node{{cursor:pointer}}
  .net-node circle{{fill:#1a0f04;stroke:var(--orange);stroke-width:2}}
  .net-node:hover circle{{fill:rgba(226,168,61,0.25)}}
  .net-node text{{fill:#E2E2EC;pointer-events:none}}
  .net-node.dim circle{{opacity:0.15}}
  .net-node.dim text{{opacity:0.15}}
  .net-edge{{fill:none;stroke:#E2A83D55;stroke-width:1.1}}
  .net-edge.dim{{opacity:0.06}}
  .net-edge.hi{{stroke:var(--gold);stroke-width:2;opacity:1}}
</style>
</head>
<body>
<div class="breadcrumb">
  <a href="galaxy_map.html">🌌 Level 0</a><span class="bc-sep">→</span>
  <a href="galaxy_map_skills.html">🧩 Skills (G28)</a><span class="bc-sep">→</span>
  <span class="bc-here">🕸️ Skill Composition Network</span>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Skill Composition Network (G36)</div>
  <h1>🕸️ Skill Composition Network — Which Skills Build Other Skills</h1>
  <p>Real, distinct from the AI/UI/Backend dimension (G28/Skills page) — this is skill-CALLS-skill composition: {n_edges} real invocations across {n_skills} skills, mechanically detected from each skill's own SKILL.md prose (a real `/otherSkillName` mention), never invented. Click any invocation to see it named — same real data, two views.</p>
</div>
<div class="toggle-row">
  <div class="toggle-btn active" data-view="map">🕸️ Map view</div>
  <div class="toggle-btn" data-view="table">📊 Table view</div>
</div>
<div class="view active" id="view-map">
  <svg viewBox="0 0 {map_w} {map_h}" width="100%" style="max-width:700px">
    <defs><marker id="netarrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#E2A83D"/></marker></defs>
    {map_edges}
    {map_nodes}
  </svg>
</div>
<div class="view" id="view-table">
  <div class="tabs">{tabs}</div>
  <div class="wrap">{sections}</div>
</div>
<div class="note">
  Generated by <code>scripts/galaxy_map_skill_network.py</code>, reusing <code>galaxy_map_skills.py</code>'s own real 24-skill
  <code>SKILLS</code> dict as the canonical name list (rule 8). G36 of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan.
  Honest scope limit: only a real `/name` slash-mention counts — a skill referenced only by prose description is invisible to
  this detector. Mapping rules: <code>system_map_spec.md</code>. Real Aug 21 2026 addition: a real circular bubble map (hand-
  computed polar layout, no force-directed library) toggles against the original tab/passage table view — same data, two views,
  per Alex's own "this should exist for everywhere that has 2 views" ask.
</div>
<script>
(function() {{
  var toggles = document.querySelectorAll('.toggle-btn');
  var views = document.querySelectorAll('.view');
  toggles.forEach(function(t) {{
    t.addEventListener('click', function() {{
      toggles.forEach(function(x) {{ x.classList.toggle('active', x === t); }});
      views.forEach(function(v) {{ v.classList.toggle('active', v.id === 'view-' + t.dataset.view); }});
    }});
  }});
  var tabs = document.querySelectorAll('.tab');
  var sections = document.querySelectorAll('.ssection');
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
  // Real map<->table cross-link: clicking a bubble jumps to its table row too
  document.querySelectorAll('.net-node').forEach(function(node) {{
    node.addEventListener('click', function() {{
      toggles.forEach(function(x) {{ x.classList.toggle('active', x.dataset.view === 'table'); }});
      views.forEach(function(v) {{ v.classList.toggle('active', v.id === 'view-table'); }});
      location.hash = 'skillnet-' + node.dataset.skill;
    }});
    node.addEventListener('mouseenter', function() {{
      var name = node.dataset.skill;
      document.querySelectorAll('.net-node').forEach(function(n) {{ n.classList.toggle('dim', n.dataset.skill !== name); }});
      document.querySelectorAll('.net-edge').forEach(function(e) {{
        var hit = e.dataset.from === name || e.dataset.to === name;
        e.classList.toggle('hi', hit); e.classList.toggle('dim', !hit);
      }});
    }});
    node.addEventListener('mouseleave', function() {{
      document.querySelectorAll('.net-node').forEach(function(n) {{ n.classList.remove('dim'); }});
      document.querySelectorAll('.net-edge').forEach(function(e) {{ e.classList.remove('hi', 'dim'); }});
    }});
  }});
}})();
</script>
</body>
</html>
"""


def main():
    invocations = compute_skill_invocations()
    names = sorted(SKILLS.keys())
    callers_of = {n: [] for n in names}
    for caller, callees in invocations.items():
        for c in callees:
            callers_of.setdefault(c, []).append(caller)
    tabs = ''.join(f'<div class="tab" data-target="skillnet-{esc(n)}">/{esc(n)}</div>' for n in names)
    sections = ''.join(build_skill_section(n, invocations.get(n, []), callers_of.get(n, [])) for n in names)
    n_edges = sum(len(v) for v in invocations.values())
    map_edges, map_nodes, map_w, map_h = build_bubble_map(names, invocations)
    html = TEMPLATE.format(tabs=tabs, sections=sections, n_edges=n_edges, n_skills=len(names),
                           map_edges=map_edges, map_nodes=map_nodes, map_w=map_w, map_h=map_h)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(names)} skills, {n_edges} real invocation edges, real map+table toggle.")


if __name__ == '__main__':
    main()
