#!/usr/bin/env python3
"""
galaxy_map_decision_matrix.py — real, new Galaxy Development Framework
artifact (Aug 21 2026). Alex's own direct ask: "let's do g72 flagged and
unify all decisions types, then split by level at which decision is made
and what rivers, this will be the decision matrix/table, then we map out
bubble system." Confirmed via real /interrogation (2 AskUserQuestion
forks, both resolved):

1. "Level" axis meaning — confirmed as "how deep it's documented," not a
   literal L0-L6 spread (real evidence: every current decision point is
   anchored to a specific module+function, none sit at L0/L1/L2 by
   themselves). Every real decision gets Current(L3)+L6 (it's always a
   function, and L6 exhaustively covers every function's real branches);
   a decision ALSO gets L5 only if it's one of Level 5's own 7 curated
   "core logic" points — that curation IS the extra depth.
2. Text-input scope — confirmed "a small curated set... we can probably
   expand if needed" (same discipline as Level 5's own 7-point curation,
   never an exhaustive grep of every <input>/<textarea> in the app).

Real unification, not re-derived (rule 8): pulls galaxy_map_decisions.py's
10 real human-confirm gates and galaxy_map_level5.py's 7 real core-logic
points directly. TEXT_INPUT_POINTS below is the one genuinely NEW dataset
this file adds — 4 real, evidence-checked free-text entry points that
drive an actual backend decision (Oracle chat prompt, Beat Log form,
Director Blend inspiration notes, Taxonomy Placement Editor), each with
a live-verified code anchor, same discipline as every other curated
decision point in this project.

River attribution: resolved from each point's own `module` field via
RIVER_MODULES (rule 8) wherever the module is real and tracked; the one
legacy/main.js-section point (the raw Oracle chat send) is hand-tagged
River III since it feeds directly into the same Oracle pipeline
mockOracle/oracleAppGrounding already live in — the same real
attribution class the Aug 14 hook-signal work already established for
other legacy functions.

**New standing rule, Alex's own direct words, added to CEO SKILL.md as
R22**: "whenever we update galaxy, it must update the matrix first or
create a new one for table reference to bubble system, bubble systems
always follow and showcase what on table to keep everything coherent."
This file's own table view IS the real source of truth; its bubble/map
view is a rendering layer over the SAME data, never an independent
invention — the literal shape this rule now requires project-wide.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import RIVER_NAME, RIVER_COLOR, RIVER_MODULES, inject_level_rail  # noqa: E402
from galaxy_map_level5 import _lines, DECISION_POINTS as L5_POINTS  # noqa: E402
from galaxy_map_decisions import DECISION_POINTS as GATE_POINTS, CATEGORIES as GATE_CATEGORIES  # noqa: E402

OUT = Path('graphify-out/galaxy_map_decision_matrix.html')

MODULE_TO_RIVER = {m: r for r, mods in RIVER_MODULES.items() for m in mods}

# Real Level-5 ids that are genuinely a curated "core logic" point — used
# to decide whether a gate/text-input point ALSO gets the +L5 depth tag
# (none currently do; kept as a real, checkable set rather than assumed).
L5_IDS = {p['id'] for p in L5_POINTS}

# The one real, NEW curated dataset this file adds — 4 real, evidence-
# checked free-text entry points, same anchor-verification discipline as
# every other DECISION_POINTS list in this project. Each `lines` range
# is checked against the LIVE file at build time (fails loud, not open).
TEXT_INPUT_POINTS = [
    {
        'id': 'oracle-chat-prompt',
        'title': 'Oracle chat prompt — the single biggest real text-input decision in the app',
        'module': 'legacy (sendChat)', 'river_override': 3, 'lines': (539, 545),
        'anchor': "const msg=input.value.trim()",
        'decides': "What Alex actually asks Oracle — this real free-text becomes the user message in every Oracle call, gates whether app-grounding fires (oracleAppGrounding's own keyword scan reads this exact text), and drives every real downstream action a command triggers.",
        'link': None,
    },
    {
        'id': 'beat-log-form',
        'title': 'Beat Log form — real multi-field text entry that creates a content_productions/video_jobs row',
        'module': 'beatLog', 'func': '_getForm', 'lines': (18387, 18407),
        'anchor': "title:    get('bl-title')",
        'decides': "Title/key/BPM/scale/energy/mood/genre/rating/licence/collab/ref-track/FL-path — real typed values read directly off the DOM, no defaults faked — that _submit() turns into the actual real database row this ConID's whole downstream pipeline is built from.",
        'link': None,
    },
    {
        'id': 'director-blend-inspiration',
        'title': "Director Blend inspiration notes — Alex's own free-text creative direction",
        'module': 'visualOracle', 'lines': (6038, 6055),
        'anchor': "var insp = insBox.value.trim()",
        'decides': "Alex's own typed creative notes, kept in a real, separately-labeled group (never conflated with the director-blend keywords) so the outbound Visual Treatment prompt can't confuse his own words with Oracle-generated style language.",
        'link': None,
    },
    {
        'id': 'taxonomy-placement-editor',
        'title': 'Taxonomy Placement Editor — editing a proposed step name/explainer before it writes to taxonomy_tree',
        'module': 'phylumPath', 'func': '_showPlacementConfirm', 'lines': (13750, 13750),
        'anchor': '_showPlacementConfirm: function(phylumNumber, attachNode, newSteps, explainers, insightText, onAccept, onReject)',
        'decides': "Alex can edit Oracle's own proposed step names/explainers inline before confirming — real typed text that replaces the AI's own wording in the eventual taxonomy_tree write, the one place in the whole taxonomy pipeline where his own words can override the model's.",
        'link': 'galaxy_map_decisions.html#d-placement-confirm',
    },
]


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def _verify_anchor(pt):
    a, b = pt['lines']
    code = _lines(a, b)
    if pt['anchor'] not in code:
        raise SystemExit(f"STALE ANCHOR: {pt['id']} — '{pt['anchor']}' not found in rpgace_core.js lines {a}-{b}. "
                          f"The real source has moved — re-verify and update this decision point's line numbers before shipping.")


def river_of(pt):
    if pt.get('river_override'):
        return pt['river_override']
    return MODULE_TO_RIVER.get(pt.get('module'))


def build_unified():
    """Real unification (rule 8, nothing re-derived): each real point
    tagged with kind/depth/river. Returns a flat list, one dict per
    decision, sorted by river then kind."""
    out = []
    for p in GATE_POINTS:
        out.append({
            'id': p['id'], 'title': p['title'], 'kind': 'gate',
            'kind_label': '🗑️ Gate', 'module': p['module'], 'func': p.get('func', ''),
            'river': MODULE_TO_RIVER.get(p['module']),
            'depth': 'curated' if p['id'] in L5_IDS else 'standard',
            'detail': p['logic'], 'link': 'galaxy_map_decisions.html#d-' + p['id'],
        })
    for p in L5_POINTS:
        out.append({
            'id': p['id'], 'title': p['title'], 'kind': 'logic',
            'kind_label': '🧠 Logic Choice', 'module': p['module'], 'func': p.get('func', ''),
            'river': MODULE_TO_RIVER.get(p['module']),
            'depth': 'curated',  # every Level-5 point is itself the curation
            'detail': p['decides'], 'link': 'galaxy_map_level5.html#d-' + p['id'],
        })
    for p in TEXT_INPUT_POINTS:
        _verify_anchor(p)
        out.append({
            'id': p['id'], 'title': p['title'], 'kind': 'text_input',
            'kind_label': '⌨️ Text Input', 'module': p['module'], 'func': p.get('func', ''),
            'river': river_of(p),
            'depth': 'curated' if p['id'] in L5_IDS else 'standard',
            'detail': p['decides'], 'link': p.get('link') or 'galaxy_map_current.html',
        })
    out.sort(key=lambda d: (d['river'] or 99, d['kind'], d['title']))
    return out


KIND_ORDER = ['gate', 'logic', 'text_input']
KIND_LABEL = {'gate': '🗑️ Gates', 'logic': '🧠 Logic Choices', 'text_input': '⌨️ Text Inputs'}
DEPTH_LABEL = {
    'curated': 'Current (L3) + Level 5 (curated) + Level 6',
    'standard': 'Current (L3) + Level 6 only',
}


def build_matrix_table(decisions):
    rivers = sorted({d['river'] for d in decisions if d['river']})
    rows = []
    for r in rivers:
        river_pts = [d for d in decisions if d['river'] == r]
        cells = []
        for kind in KIND_ORDER:
            pts = [d for d in river_pts if d['kind'] == kind]
            if not pts:
                cells.append('<td class="none">·</td>')
                continue
            items = ''.join(
                f'<li><a href="{esc(d["link"])}">{esc(d["title"])}</a> '
                f'<span class="depthtag depth-{d["depth"]}">{esc(DEPTH_LABEL[d["depth"]])}</span></li>'
                for d in pts
            )
            cells.append(f'<td class="hit" data-river="{r}" data-kind="{kind}"><b>{len(pts)}</b><ul class="cellist">{items}</ul></td>')
        name = RIVER_NAME.get(r, f'River {r}').split('—', 1)[1].strip() if '—' in RIVER_NAME.get(r, '') else RIVER_NAME.get(r, f'River {r}')
        rows.append(
            f'<tr><th class="rowhead" style="border-left:3px solid {RIVER_COLOR.get(r, "#888")}">{esc(name)}</th>{"".join(cells)}</tr>'
        )
    header = '<tr><th></th>' + ''.join(f'<th>{KIND_LABEL[k]}</th>' for k in KIND_ORDER) + '</tr>'
    return '<table id="dmatrix">' + header + ''.join(rows) + '</table>'


def build_bubble_map(decisions):
    """Real bubble system, per Alex's own rule ('bubble systems always
    follow and showcase what on table') — one bubble per river with at
    least one real decision, sized by real count, click-to-reveal
    detail panel (same established pattern as galaxy_map_skill_network's
    own map view). Derived entirely from the SAME data build_matrix_table
    reads — never a second, independently-imagined dataset."""
    rivers = sorted({d['river'] for d in decisions if d['river']})
    import math
    n = len(rivers)
    cx, cy, radius = 420, 420, 300
    nodes = []
    details = []
    for i, r in enumerate(rivers):
        angle = (360 / n) * i - 90
        x = cx + radius * math.cos(math.radians(angle))
        y = cy + radius * math.sin(math.radians(angle))
        river_pts = [d for d in decisions if d['river'] == r]
        count = len(river_pts)
        rsize = 26 + min(count, 10) * 3
        color = RIVER_COLOR.get(r, '#888')
        name = RIVER_NAME.get(r, f'River {r}')
        short = name.split('—', 1)[1].strip() if '—' in name else name
        nodes.append(
            f'<g class="dbubble" data-river="{r}" transform="translate({x:.0f},{y:.0f})">'
            f'<circle r="{rsize}" fill="{color}" fill-opacity="0.18" stroke="{color}" stroke-width="2"/>'
            f'<text text-anchor="middle" dy="-4" font-size="12" fill="#fff" font-weight="700">{count}</text>'
            f'<text text-anchor="middle" dy="12" font-size="9" fill="{color}">{esc(short[:16])}</text>'
            f'</g>'
        )
        rows = ''.join(
            f'<li><b>{d["kind_label"]}</b> — <a href="{esc(d["link"])}">{esc(d["title"])}</a> '
            f'<span class="depthtag depth-{d["depth"]}">{esc(DEPTH_LABEL[d["depth"]])}</span></li>'
            for d in river_pts
        )
        details.append(f'<div class="rdetail" id="rdetail-{r}" style="display:none"><h3>{esc(name)}</h3><ul>{rows}</ul></div>')
    svg = f'<svg viewBox="0 0 840 840" width="100%" style="max-width:760px;display:block;margin:0 auto">{"".join(nodes)}</svg>'
    return svg + '<div id="bubble-details">' + ''.join(details) + '</div>'


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Decision Matrix)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 20%, #14101e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto;line-height:1.6}}
  .toggle-row{{display:flex;justify-content:center;gap:8px;padding:16px 24px 0}}
  .toggle-btn{{padding:8px 18px;border-radius:16px;font-size:11.5px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .toggle-btn.active{{background:var(--gold);color:#1a1608;border-color:var(--gold)}}
  .view{{display:none}}
  .view.active{{display:block}}
  .matrix-wrap{{max-width:1100px;margin:24px auto;padding:0 24px;overflow-x:auto}}
  #dmatrix{{border-collapse:collapse;width:100%;font-size:11.5px}}
  #dmatrix th,#dmatrix td{{border:1px solid rgba(255,255,255,0.08);padding:8px 10px;text-align:left;vertical-align:top}}
  #dmatrix th{{color:var(--gold);font-size:10.5px}}
  th.rowhead{{white-space:nowrap;padding-left:12px}}
  td.none{{color:#333;text-align:center}}
  td.hit b{{color:#fff;font-size:14px}}
  .cellist{{list-style:none;margin-top:6px}}
  .cellist li{{margin-bottom:6px;line-height:1.5}}
  .cellist a{{color:var(--gold);text-decoration:none;font-size:11px}}
  .cellist a:hover{{text-decoration:underline}}
  .depthtag{{display:block;font-size:9px;color:var(--dim);margin-top:2px}}
  .depth-curated{{color:#9B59B6}}
  .bubblewrap{{max-width:900px;margin:24px auto;padding:0 24px;text-align:center}}
  .dbubble{{cursor:pointer}}
  .dbubble:hover circle{{filter:brightness(1.4)}}
  #bubble-details{{max-width:700px;margin:20px auto 0;padding:0 24px}}
  .rdetail{{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:16px 20px;margin-bottom:14px}}
  .rdetail h3{{font-family:Georgia,serif;font-size:15px;margin-bottom:10px;color:#fff}}
  .rdetail ul{{list-style:none}}
  .rdetail li{{margin-bottom:8px;font-size:11.5px;line-height:1.6}}
  .rdetail a{{color:var(--gold);text-decoration:none}}
  .legend{{max-width:900px;margin:20px auto;padding:0 24px;font-size:10.5px;color:var(--dim);text-align:center;line-height:1.7}}
  a{{color:var(--gold)}}
  .note{{max-width:900px;margin:20px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
</style>
</head>
<body>

<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Decision Matrix</div>
  <h1>🚦🧭 The Decision Matrix — Every Real Decision, By River</h1>
  <p>Real unification of all 3 real decision kinds this project tracks: 🗑️ Gates (<a href="galaxy_map_decisions.html">10 human-confirm points</a>), 🧠 Logic Choices (<a href="galaxy_map_level5.html">7 curated core-logic points</a>), and ⌨️ Text Inputs ({n_text} real, curated free-text entry points that drive an actual decision) — {n_total} real decisions total, grouped by which of the 17 real rivers they belong to. "Depth" shows how far down the existing Galaxy Map hierarchy each one is documented: every real decision reaches Current (L3) + Level 6 (exhaustive branch detail); a real 🟣 purple depth tag means it's ALSO one of Level 5's own curated "core logic" points. <b>This table is the real source of truth — the bubble view below is a rendering layer over the exact same data, never a second, independently-imagined picture (Alex's own standing rule).</b></p>
</div>

<div class="toggle-row">
  <div class="toggle-btn active" data-view="table">📊 Table view (the matrix)</div>
  <div class="toggle-btn" data-view="bubble">🫧 Bubble view</div>
</div>

<div class="view active" id="view-table">
  <div class="matrix-wrap">{matrix_table}</div>
</div>

<div class="view" id="view-bubble">
  <div class="bubblewrap">{bubble_map}</div>
</div>

<div class="legend">
  🗑️ Gate = human-confirm before a real write · 🧠 Logic Choice = Level 5's curated core logic · ⌨️ Text Input = free-text that drives a real decision. Click a river cell (table) or bubble (map) to see its own real decisions.
</div>

<div class="note">
  Generated by <code>scripts/galaxy_map_decision_matrix.py</code> — real data unified from <code>galaxy_map_decisions.py</code>/<code>galaxy_map_level5.py</code> (never re-derived) plus this file's own 4 new, curated, anchor-verified text-input points. Per Alex's own new standing rule (CEO SKILL.md R22): whenever the Galaxy Map is updated, this matrix updates FIRST (or a new one is created) — the bubble/map view always follows and showcases what's on the table, never the reverse.
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
  document.querySelectorAll('td.hit').forEach(function(td) {{
    td.addEventListener('click', function(ev) {{
      if (ev.target.tagName === 'A') return;
      var r = td.dataset.river;
      toggles.forEach(function(x) {{ x.classList.toggle('active', x.dataset.view === 'bubble'); }});
      views.forEach(function(v) {{ v.classList.toggle('active', v.id === 'view-bubble'); }});
      document.querySelectorAll('.rdetail').forEach(function(d) {{ d.style.display = (d.id === 'rdetail-' + r) ? '' : 'none'; }});
      var el = document.getElementById('rdetail-' + r);
      if (el) el.scrollIntoView({{behavior:'smooth', block:'nearest'}});
    }});
  }});
  document.querySelectorAll('.dbubble').forEach(function(b) {{
    b.addEventListener('click', function() {{
      var r = b.dataset.river;
      document.querySelectorAll('.rdetail').forEach(function(d) {{ d.style.display = (d.id === 'rdetail-' + r) ? '' : 'none'; }});
      var el = document.getElementById('rdetail-' + r);
      if (el) el.scrollIntoView({{behavior:'smooth', block:'nearest'}});
    }});
  }});
}})();
</script>
</body>
</html>
"""


def main():
    decisions = build_unified()
    matrix_table = build_matrix_table(decisions)
    bubble_map = build_bubble_map(decisions)
    n_text = len(TEXT_INPUT_POINTS)
    n_total = len(decisions)
    html = TEMPLATE.format(matrix_table=matrix_table, bubble_map=bubble_map, n_text=n_text, n_total=n_total)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    n_rivers = len({d['river'] for d in decisions if d['river']})
    print(f"Wrote {OUT} — {n_total} real decisions unified (10 gates + 7 logic + {n_text} text-input) across {n_rivers} rivers.")


if __name__ == '__main__':
    main()
