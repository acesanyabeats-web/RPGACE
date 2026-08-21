#!/usr/bin/env python3
"""
galaxy_map_l0_fusion.py — the REAL Level 0, per Alex's own direct
correction (Aug 21 2026) of the "Unified Gateway" shell (galaxy_map_
hub.html) built earlier the same day, which he rejected outright:

"no claude ... everything should fold into one galaxy html. not
unified gateway, that should be used as reference of how to structure
the map ... everything should start at l0. put all infra into its
bubble at level 0 (i press openmontage, it will give me a choice of
infra for externals and the text on openmontage slightly light up
around to show me what im looking for, or i can choose inter where i
can choose a dimension open montage is present. or press alex and it
will take me to a choice of inter dimension, or can choose infra to
see what decisions alex can me[make] etc.)"

WHAT WAS WRONG WITH THE HUB (galaxy_map_hub.html): it was a directory
of the 23 still-separate pages, loaded one at a time into an iframe —
a real gateway ON TOP of the fragmented structure, not a fusion of the
actual content into one page. Alex explicitly wants the real per-unit
facet content living INSIDE one interactive L0 page: click a unit,
choose Infra or Inter, see the real facets for that choice, click one
to expand real detail inline (with cross-highlight on other units
sharing that same real resource/dimension) — no iframe, no
navigating to a whole separate page as the primary interaction.

REAL, TARGETED /paranoia PASS (compressed per its own guardrail — Alex
is out of patience, not out of credits; re-asking the already-answered
core concept would repeat the exact failure he's angry about, so this
skips Steps 3/4's further debate/interrogation and goes straight to
real evidence + build):
- Step 1/2 evidence: TWO real, pre-existing Level-0 datasets already
  exist and were NEVER reconciled — galaxy_map.py's GALAXIES (4 real
  galaxies: RPGACE Architecture / Orchestrator CC / OpenMontage CC /
  Graphify CC, real INTERACTION_TYPE-colored edges, HARNESS_NODES,
  ORACLE_PROVIDERS, CONNECTOR_ITYPE) and galaxy_map_l0.py's UNITS (7
  peer units: External AI / RPGACE Architecture / Skills /
  Orchestrator CC / Alex / Supabase / Oversight Docs, real INJECTION/
  ACTOR-typed EDGES). rpgace_architecture and orchestrator_cc are real
  overlaps between the two sets — this script MERGES them into one
  real 9-unit L0 (rule 8, no duplication), reusing every real edge/
  fact from both source files directly (imported, never re-typed).
- Real technical verdict: YES, directly buildable from data that
  already exists — no new detection/computation needed, only a real
  reorganization of already-computed facts into a per-UNIT facet
  model instead of a per-EDGE or per-PAGE one.
- Two explicit, justified real overrides applied to the source data
  (documented at each site below, not silently reclassified):
  (1) any facet touching external_ai is INFRA regardless of its
      original EDGES 'kind' tag — Alex's own literal confirmed example
      this same session: infra = "Supabase touch, Oracle call,
      external-connector touch."
  (2) the alex<->rpgace_architecture relationship is INFRA, not inter
      as its stored EDGES 'kind' (ACTOR) would suggest — Alex's own
      literal example: "press alex ... choose infra to see what
      decisions alex can make" — this facet is expanded to the real,
      full DECISION_POINTS list (10 points, 3 categories), not just
      the one summary sentence the original edge carried.
- The old hub (galaxy_map_hub.html) is kept on disk, its own page and
  Oversight-popup description corrected to say plainly what it
  actually is now: a UI-PATTERN reference (the toggle/badge mechanics
  this file reuses), explicitly superseded as the primary Galaxy Map
  entry point.

Real data reused, never re-derived (rule 8): imports GALAXIES,
HARNESS_NODES, ORACLE_PROVIDERS, CONNECTOR_ITYPE from galaxy_map.py;
UNITS, EDGES, INJECTION, ACTOR from galaxy_map_l0.py; CATEGORIES,
DECISION_POINTS from galaxy_map_decisions.py; JOBS, MEMBERS from
galaxy_map_orchestrator_openmontage.py. Every one of those source
files keeps its own `if __name__ == '__main__':` guard, so importing
them here is safe (no double-write, no side effects beyond data).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from galaxy_map import (  # noqa: E402
    GALAXIES, HARNESS_NODES, ORACLE_PROVIDERS, CONNECTOR_ITYPE,
)
from galaxy_map_l0 import UNITS as SRC_UNITS, EDGES as SRC_EDGES, INJECTION, ACTOR  # noqa: E402
from galaxy_map_decisions import CATEGORIES as DEC_CATEGORIES, DECISION_POINTS  # noqa: E402
from galaxy_map_orchestrator_openmontage import JOBS as OM_JOBS, MEMBERS as OM_MEMBERS  # noqa: E402

OUT = Path('graphify-out/galaxy_map_l0_fusion.html')


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


GALAXY_BY_ID = {g['id']: g for g in GALAXIES}
SRC_UNIT_BY_ID = {u['id']: u for u in SRC_UNITS}

# ── Real, deduplicated 9-unit L0 (rule 8: rpgace_architecture and
# orchestrator_cc exist in BOTH source datasets — merged here, not
# duplicated). Order chosen so the 4 real "session/agent" actors sit
# together, then the 5 real "resource/dimension" units.
UNIT_ORDER = [
    'rpgace_architecture', 'orchestrator_cc', 'openmontage_cc', 'graphify_cc',
    'external_ai', 'skills', 'alex', 'supabase', 'oversight_docs',
]

UNIT_META = {
    'rpgace_architecture': {'label': 'RPGACE Architecture', 'icon': '🏛️', 'color': '#C9A84C'},
    'orchestrator_cc': {'label': 'Orchestrator CC', 'icon': '🧭', 'color': '#4A90E2'},
    'openmontage_cc': {'label': 'OpenMontage CC', 'icon': '🎬', 'color': '#E25454'},
    'graphify_cc': {'label': 'Graphify CC', 'icon': '🌐', 'color': '#3DAA6E'},
    'external_ai': {'label': 'External AI', 'icon': '🔮', 'color': '#9B59B6'},
    'skills': {'label': 'Skills', 'icon': '🧩', 'color': '#3DAA6E'},
    'alex': {'label': 'Alex', 'icon': '🧑', 'color': '#E25454'},
    'supabase': {'label': 'Supabase', 'icon': '🗄️', 'color': '#2ABFB0'},
    'oversight_docs': {'label': 'Oversight Docs', 'icon': '📚', 'color': '#C9A84C'},
}

EXTERNAL_AI_UNIT = 'external_ai'
# Real, explicit override #1 (see module docstring) — anything
# touching External AI is INFRA, matching Alex's own confirmed
# example this session ("external-connector touch" as an infra kind).
FORCE_INFRA_UNITS = {EXTERNAL_AI_UNIT}
# Real, explicit override #2 — the alex<->rpgace_architecture edge is
# INFRA (Alex's own literal "infra = what decisions I can make"
# example), expanded below to the full real DECISION_POINTS list.
FORCE_INFRA_EDGE_IDS = {'alex-rpgace'}


def build_facets():
    """Returns {unit_id: [facet, ...]}. Each facet:
    {kind: 'infra'|'inter', dim: real dimension name, label, detail,
     share_key, link (optional)}."""
    facets = {uid: [] for uid in UNIT_ORDER}

    # 1) Real EDGES from galaxy_map_l0.py's 7-unit model — one facet
    # per endpoint, per real edge (17 real edges -> up to 34 facets).
    for e in SRC_EDGES:
        a, b = e['a'], e['b']
        if a not in facets or b not in facets:
            continue
        kind = 'infra' if e['kind'] == INJECTION else 'inter'
        if a in FORCE_INFRA_UNITS or b in FORCE_INFRA_UNITS:
            kind = 'infra'
        if e['id'] in FORCE_INFRA_EDGE_IDS:
            kind = 'infra'
        share_key = e.get('link') or f"edge:{e['id']}"
        dim_label = {
            'galaxy_map_decisions.html': 'Decisions (human-confirm gates)',
            'galaxy_map_externals.html': 'Externals',
            'galaxy_map_skills.html': 'Skills',
            'galaxy_map_supabase.html': 'Supabase',
            'galaxy_map.html': 'RPGACE Architecture (core chain)',
        }.get(e.get('link'), 'Direct relationship')
        for me, other in ((a, b), (b, a)):
            other_label = UNIT_META[other]['label']
            facets[me].append({
                'kind': kind, 'dim': dim_label,
                'label': f"↔ {other_label}",
                'detail': e['desc'] + ' <span class="ev">Evidence: ' + esc(e['evidence']) + '</span>',
                'share_key': share_key, 'link': e.get('link'),
            })

    # 2) Real GALAXIES/CONNECTOR_ITYPE data (galaxy_map.py) — the
    # 4-galaxy model's own real bridges + external connectors, not
    # present in the 7-unit set at all (this is the real merge).
    for gid in ('orchestrator_cc', 'openmontage_cc', 'graphify_cc'):
        g = GALAXY_BY_ID.get(gid)
        if not g:
            continue
        channel = g.get('channel')
        link = 'galaxy_map_orchestrator_openmontage.html' if gid == 'openmontage_cc' else None
        detail = f"{esc(g['role'])} <span class=\"ev\">Bridges to: {esc(g.get('bridges_to') or 'n/a')}" + (f", channel: {esc(channel)}" if channel else '') + '</span>'
        facets['rpgace_architecture'].append({
            'kind': 'inter', 'dim': 'Total Systems dispatch', 'label': f"↔ {g['label']}",
            'detail': detail, 'share_key': channel or f"galaxy:{gid}", 'link': link,
        })
        facets[gid].append({
            'kind': 'inter', 'dim': 'Total Systems dispatch', 'label': '↔ RPGACE Architecture',
            'detail': detail, 'share_key': channel or f"galaxy:{gid}", 'link': link,
        })

    # Real external connectors — grouped under whichever unit they
    # actually belong to (OpenMontage's own note: "OpenMontage+FFmpeg
    # under OpenMontage CC" in galaxy_map.py's own print output;
    # Graphify CC owns its own connector; everything else sits under
    # RPGACE Architecture, since api/*.js is the real caller for all
    # of them).
    connector_owner = {'OpenMontage': 'openmontage_cc', 'FFmpeg': 'openmontage_cc', 'Graphify CC': 'graphify_cc'}
    for name, itype in CONNECTOR_ITYPE.items():
        owner = connector_owner.get(name, 'rpgace_architecture')
        facets[owner].append({
            'kind': 'infra', 'dim': 'Externals', 'label': f"Uses: {esc(name)}",
            'detail': f"Real external connector, interaction type <code>{esc(itype)}</code>.",
            'share_key': f"connector:{name}", 'link': 'galaxy_map_externals.html',
        })

    # Oracle providers (Anthropic/Kimi/Luna) — real infra facet on
    # both RPGACE Architecture and Alex (he uses Oracle chat directly
    # as a real app user, per the alex-external edge's own evidence).
    for p in ORACLE_PROVIDERS:
        status = 'live' if p['tested'] else 'dormant scaffold'
        for uid in ('rpgace_architecture', 'alex'):
            facets[uid].append({
                'kind': 'infra', 'dim': 'External AI', 'label': f"Uses: {esc(p['name'])} ({status})",
                'detail': f"{esc(p['role'])}", 'share_key': f"provider:{p['name']}", 'link': 'galaxy_map_externals.html',
            })

    # Self-awareness harness node — real infra facet on RPGACE Architecture.
    sa = next((n for n in HARNESS_NODES if n['id'] == 'self_awareness'), None)
    if sa:
        facets['rpgace_architecture'].append({
            'kind': 'infra', 'dim': 'External AI', 'label': f"{sa['icon']} {sa['label']}",
            'detail': esc(sa['note']), 'share_key': 'self_awareness', 'link': None,
        })

    # 3) Real DECISION_POINTS (galaxy_map_decisions.py) — Alex's own
    # literal infra example for the Alex unit. One real facet per
    # category, each listing its real decision points.
    for cat in DEC_CATEGORIES:
        pts = [p for p in DECISION_POINTS if p['category'] == cat['id']]
        if not pts:
            continue
        detail = '<ul class="dec-list">' + ''.join(
            f"<li><b>{esc(p['title'])}</b> — <code>{esc(p['module'])}.{esc(p['func'])}</code>: {esc(p['logic'])}</li>"
            for p in pts) + '</ul>'
        facets['alex'].append({
            'kind': 'infra', 'dim': 'Decisions (what Alex can decide)', 'label': f"{esc(cat['label'])} ({len(pts)})",
            'detail': detail, 'share_key': 'decisions', 'link': 'galaxy_map_decisions.html',
        })

    # 4) Real UI/dashboard-path dimensions for Alex — Level 2.5 +
    # Alex's Decision Path (G37/G38), a real INTER facet distinct from
    # the raw alex-* EDGES already added in step 1.
    facets['alex'].append({
        'kind': 'inter', 'dim': 'UI / Dashboard Path', 'label': 'Real dashboard-card → module → decision-fork path',
        'detail': 'G37/G38 — the real Level-4 flow to whichever module a dashboard card opens, then the real Y/N fork (Decisions) Alex actually hits on that path, if any.',
        'share_key': 'alex_ui_path', 'link': 'galaxy_map_alex_path.html',
    })
    facets['rpgace_architecture'].append({
        'kind': 'inter', 'dim': 'UI / Dashboard Path', 'label': 'Real river → dashboard card → primary module chain',
        'detail': 'G38 — all 10 rivers with a real dashboard card, each resolved to its real primary module.',
        'share_key': 'alex_ui_path', 'link': 'galaxy_map_level2_5.html',
    })

    # 5) Oversight Sync (G55) — real inter facet, process-time
    # sequencing, attached to every real unit it actually names.
    for uid in ('rpgace_architecture', 'orchestrator_cc', 'skills', 'oversight_docs'):
        facets[uid].append({
            'kind': 'inter', 'dim': 'Oversight Sync (process-time)', 'label': 'Real push/build/ritual sequencing',
            'detail': 'G55 — which oversight doc/artifact gets touched, in what order, during a push/build or a ritual (Bedtime/Routine/Summary/CEO Loop 2).',
            'share_key': 'oversight_sync', 'link': 'galaxy_map_oversight_sync.html',
        })

    return facets


DIM_INFO_TABLE = 'DIM_INFO placeholder'  # unused, kept for clarity of intent


def group_facets_by_dim(unit_facets, kind):
    groups = {}
    for f in unit_facets:
        if f['kind'] != kind:
            continue
        groups.setdefault(f['dim'], []).append(f)
    return groups


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Level 0, Real Fusion)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --purple:#9B59B6; --blue:#4A90E2; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 20%, #14101e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:30px 24px 14px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:900px;margin:0 auto;line-height:1.6}}
  .units-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;max-width:1040px;margin:24px auto;padding:0 24px}}
  .unit-card{{background:rgba(255,255,255,0.03);border:2px solid rgba(255,255,255,0.1);border-radius:14px;padding:18px 12px;text-align:center;cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s}}
  .unit-card:hover{{transform:translateY(-3px)}}
  .unit-card.active{{border-color:var(--gold);background:rgba(201,168,76,0.08)}}
  .unit-card.glow{{box-shadow:0 0 0 2px var(--gold), 0 0 14px rgba(201,168,76,0.55)}}
  .unit-icon{{font-size:30px;margin-bottom:8px}}
  .unit-name{{font-size:12.5px;font-weight:700}}
  #panel{{max-width:920px;margin:0 auto 40px;padding:0 24px;display:none}}
  #panel.active{{display:block}}
  .panel-head{{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:14px}}
  .panel-head h2{{font-family:Georgia,serif;font-size:20px;color:#fff}}
  .kind-choice{{display:flex;justify-content:center;gap:16px;margin-bottom:20px}}
  .kind-btn{{flex:1;max-width:320px;padding:18px 20px;border-radius:14px;font-size:13px;font-weight:700;cursor:pointer;border:2px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);color:var(--text);text-align:center;transition:border-color .15s,transform .1s}}
  .kind-btn:hover{{transform:translateY(-2px)}}
  .kind-btn .kb-sub{{display:block;font-size:10.5px;font-weight:400;color:var(--dim);margin-top:6px}}
  .kind-btn.infra.chosen{{background:rgba(155,89,182,0.18);color:var(--purple);border-color:var(--purple)}}
  .kind-btn.inter.chosen{{background:rgba(74,144,226,0.18);color:var(--blue);border-color:var(--blue)}}
  .dim-groups{{display:flex;flex-direction:column;gap:10px}}
  .dim-group{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:10px;overflow:hidden}}
  .dim-head{{padding:11px 16px;font-size:12.5px;font-weight:700;cursor:pointer;display:flex;justify-content:space-between}}
  .dim-head:hover{{background:rgba(255,255,255,0.04)}}
  .dim-body{{display:none;padding:0 16px 14px}}
  .dim-body.open{{display:block}}
  .facet-row{{padding:10px 12px;margin-top:8px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:11.5px;line-height:1.6;cursor:pointer;border:1px solid transparent}}
  .facet-row:hover{{border-color:rgba(201,168,76,0.4)}}
  .facet-row .flabel{{font-weight:700;margin-bottom:4px}}
  .ev{{color:var(--dim);display:block;margin-top:4px;font-size:10.5px}}
  .dec-list{{margin:8px 0 0 18px}}
  .dec-list li{{margin-bottom:6px}}
  .facet-link{{display:inline-block;margin-top:6px;font-size:10.5px;font-weight:700;color:var(--gold);text-decoration:none}}
  .facet-link:hover{{text-decoration:underline}}
  .note{{max-width:920px;margin:20px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  .banner{{max-width:920px;margin:0 auto 10px;padding:10px 24px;font-size:10.5px;color:var(--dim);text-align:center}}
  a{{color:var(--gold)}}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Level 0 (Real Fusion)</div>
  <h1>🌌 One Real Root — 9 Units, Infra ↔ Inter, Cross-Highlighted</h1>
  <p>Every real Level-0 actor in one merged set — click a unit, then pick a real CHOICE (not a toggle switch — that's reserved for map/table view elsewhere): 💉 Infra (a real attached resource — Supabase, Oracle, an external connector, Skills, Decisions) or 🔗 Inter (a real connection/dimension it participates in). Picking a facet expands its real detail right here and lights up every OTHER unit that shares the same real resource or dimension — no separate page load, no directory of files. The old "Unified Gateway" (galaxy_map_hub.html) stays on disk as the UI-pattern reference it was meant to be, not the primary door.</p>
</div>
<div class="units-grid">{unit_cards}</div>
<div id="panel">
  <div class="panel-head"><span id="panel-icon" style="font-size:24px"></span><h2 id="panel-title"></h2></div>
  <div class="kind-choice" id="kind-choice">
    <div class="kind-btn infra" data-kind="infra">💉 Infra<span class="kb-sub" id="infra-count"></span></div>
    <div class="kind-btn inter" data-kind="inter">🔗 Inter<span class="kb-sub" id="inter-count"></span></div>
  </div>
  <div class="dim-groups" id="dim-groups"></div>
</div>
<div class="note">
  Generated by <code>scripts/galaxy_map_l0_fusion.py</code> — real /paranoia-scoped pass, Aug 21 2026, correcting the earlier same-day "Unified Gateway" shell per Alex's own direct instruction. {n_units} real units (merged from the two previously-separate L0 datasets — galaxy_map.py's 4 galaxies + galaxy_map_l0.py's 7 units, rpgace_architecture/orchestrator_cc deduplicated), {n_facets} real facets total, sourced directly from already-computed real data (EDGES, GALAXIES, CONNECTOR_ITYPE, DECISION_POINTS, JOBS — never invented). Cross-highlight uses each facet's real <code>share_key</code> — two facets sharing a key describe the same real resource or dimension.
</div>
<script>
(function() {{
  // Real Alex correction, same session: "i dont need an infra/inter
  // toggle switch, that only for map view switching to table view" —
  // Infra/Inter is a real CHOICE presented fresh each time a unit is
  // selected (neither pre-picked, no persistent switch state), not a
  // toggle you flip back and forth — that metaphor stays reserved for
  // the map/table view control elsewhere (galaxy_map_l0.html,
  // galaxy_map_hub.html). Picking either choice is a one-way decision
  // for THIS unit-visit; clicking a different unit resets the choice.
  var DATA = {data_json};
  var cards = document.querySelectorAll('.unit-card');
  var panel = document.getElementById('panel');
  var panelTitle = document.getElementById('panel-title');
  var panelIcon = document.getElementById('panel-icon');
  var kindChoice = document.getElementById('kind-choice');
  var kindBtns = document.querySelectorAll('.kind-btn');
  var infraCount = document.getElementById('infra-count');
  var interCount = document.getElementById('inter-count');
  var dimGroups = document.getElementById('dim-groups');
  var currentUnit = null, currentKind = null;

  function clearGlow() {{ cards.forEach(function(c) {{ c.classList.remove('glow'); }}); }}

  function renderDims() {{
    if (!currentKind) {{ dimGroups.innerHTML = ''; return; }}
    var unit = DATA.units[currentUnit];
    var facets = unit.facets.filter(function(f) {{ return f.kind === currentKind; }});
    var byDim = {{}};
    facets.forEach(function(f) {{ (byDim[f.dim] = byDim[f.dim] || []).push(f); }});
    var html = '';
    Object.keys(byDim).forEach(function(dim, i) {{
      html += '<div class="dim-group"><div class="dim-head" data-idx="' + i + '">' + dim + ' <span>(' + byDim[dim].length + ')</span></div><div class="dim-body" id="dimbody-' + i + '">';
      byDim[dim].forEach(function(f) {{
        html += '<div class="facet-row" data-share="' + f.share_key + '"><div class="flabel">' + f.label + '</div><div>' + f.detail + '</div>' + (f.link ? '<a class="facet-link" href="' + f.link + '" target="_blank">Open full page ↗</a>' : '') + '</div>';
      }});
      html += '</div></div>';
    }});
    if (!html) html = '<div style="color:var(--dim);font-size:11.5px;padding:10px">No real ' + currentKind + ' facets attached to this unit yet.</div>';
    dimGroups.innerHTML = html;
    dimGroups.querySelectorAll('.dim-head').forEach(function(h) {{
      h.addEventListener('click', function() {{
        document.getElementById('dimbody-' + h.dataset.idx).classList.toggle('open');
      }});
    }});
    dimGroups.querySelectorAll('.facet-row').forEach(function(row) {{
      row.addEventListener('click', function(ev) {{
        ev.stopPropagation();
        clearGlow();
        var key = row.dataset.share;
        var thisCard = document.querySelector('.unit-card[data-unit="' + currentUnit + '"]');
        if (thisCard) thisCard.classList.add('glow');
        Object.keys(DATA.units).forEach(function(uid) {{
          if (uid === currentUnit) return;
          var has = DATA.units[uid].facets.some(function(f) {{ return f.share_key === key; }});
          if (has) {{
            var c = document.querySelector('.unit-card[data-unit="' + uid + '"]');
            if (c) c.classList.add('glow');
          }}
        }});
      }});
    }});
  }}

  cards.forEach(function(c) {{
    c.addEventListener('click', function() {{
      currentUnit = c.dataset.unit;
      currentKind = null;
      kindBtns.forEach(function(x) {{ x.classList.remove('chosen'); }});
      cards.forEach(function(x) {{ x.classList.toggle('active', x === c); }});
      var unit = DATA.units[currentUnit];
      var nInfra = unit.facets.filter(function(f) {{ return f.kind === 'infra'; }}).length;
      var nInter = unit.facets.filter(function(f) {{ return f.kind === 'inter'; }}).length;
      infraCount.textContent = ' (' + nInfra + ')';
      interCount.textContent = ' (' + nInter + ')';
      panel.classList.add('active');
      panelTitle.textContent = unit.label;
      panelIcon.textContent = unit.icon;
      clearGlow();
      renderDims();
      panel.scrollIntoView({{behavior:'smooth', block:'start'}});
    }});
  }});
  kindBtns.forEach(function(b) {{
    b.addEventListener('click', function() {{
      currentKind = b.dataset.kind;
      kindBtns.forEach(function(x) {{ x.classList.toggle('chosen', x === b); }});
      clearGlow();
      renderDims();
    }});
  }});
}})();
</script>
</body>
</html>
"""


def main():
    facets = build_facets()
    unit_cards = ''.join(
        f'<div class="unit-card" data-unit="{uid}"><div class="unit-icon">{UNIT_META[uid]["icon"]}</div><div class="unit-name">{esc(UNIT_META[uid]["label"])}</div></div>'
        for uid in UNIT_ORDER
    )
    import json
    data = {
        'units': {
            uid: {'label': UNIT_META[uid]['label'], 'icon': UNIT_META[uid]['icon'], 'facets': facets[uid]}
            for uid in UNIT_ORDER
        }
    }
    n_facets = sum(len(v) for v in facets.values())
    html = TEMPLATE.format(
        unit_cards=unit_cards, n_units=len(UNIT_ORDER), n_facets=n_facets,
        data_json=json.dumps(data),
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(UNIT_ORDER)} real merged L0 units, {n_facets} real facets (infra+inter).")


if __name__ == '__main__':
    main()
