#!/usr/bin/env python3
"""
galaxy_map_l0.py — G43+G44 MERGED (Aug 18 2026, real Alex correction on
the first draft: "it is supposed to be one html with toggleable switch
to change representation of it"). Real /deduplication fix — the map
view (click-through bubbles) and table view (7x7 matrix) were two
separate files rendering the exact same UNITS/EDGES data twice; Alex's
own framing confirms this explicitly: "this table is a representation
of level 1 - dimensions in table form, so its the same deduplication
system as map/table format to help understand the structure from a
different angle." ONE file now, a real toggle switches which real
<div> is visible — same data, same click handlers, zero duplication.

Supersedes galaxy_map_l0_units.py + galaxy_map_l0_matrix.py (both
deleted — pure renderings of this exact data, a true duplicate once
merged, not unique content rule 8's "never destroy" exception protects).

Real, hand-curated edge list unchanged from the original G43 build (17
of 21 possible pairs — same curation discipline as Level 5's
DECISION_POINTS, a small bounded set, not a case needing a mechanical
detector). 4 pairs deliberately excluded as NOT directly evidenced:
External AI<->Skills, External AI<->Supabase (mediated via RPGACE
Architecture's own code), Alex<->Supabase (mediated via Orchestrator CC).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

OUT = Path('graphify-out/galaxy_map_l0.html')

UNITS = [
    {'id': 'external_ai', 'label': 'External AI', 'icon': '🔮', 'color': '#9B59B6',
     'role': 'Anthropic (live) + Kimi/Luna (dormant scaffolds) — mediated entirely through Oracle, RPGACE Architecture\'s own AI harness. Its own 0.5-level page (below) lists each real external individually.',
     'sublevel': 'externals'},
    {'id': 'rpgace_architecture', 'label': 'RPGACE Architecture', 'icon': '🏛️', 'color': '#C9A84C',
     'role': 'UI + Backend, one unit. Drilling in is the door into the EXISTING Dimension→River→Module→Current chain — NOT a privileged gateway for the other 6 units, just this unit\'s own real content.',
     'sublevel': 'galaxy'},
    {'id': 'skills', 'label': 'Skills', 'icon': '🧩', 'color': '#3DAA6E',
     'role': "RPGACE's own Claude Code skills (.claude/skills/) — real, already-catalogued at its own 0.5-level page.",
     'sublevel': 'skills'},
    {'id': 'orchestrator_cc', 'label': 'Orchestrator CC', 'icon': '🧭', 'color': '#4A90E2',
     'role': 'This session — developer station. Planner/orchestrator, evidence-gathering, dispatch-writing, RPGACE-side schema/UI/doc work.',
     'sublevel': 'orchestrator_openmontage'},
    {'id': 'alex', 'label': 'Alex', 'icon': '🧑', 'color': '#E25454',
     'role': 'Acting body on all Tier-3 confirmations, real decisions, and direct app use. Same recurring actor as the Alex-bubble at Levels 1-3 and the Human Gate node at Level 0.',
     'sublevel': 'decisions'},
    {'id': 'supabase', 'label': 'Supabase', 'icon': '🗄️', 'color': '#2ABFB0',
     'role': 'Database storage for all units involved — a shared resource every other unit reads/writes through, not just one more peer.',
     'sublevel': 'supabase'},
    {'id': 'oversight_docs', 'label': 'Oversight Docs', 'icon': '📚', 'color': '#C9A84C',
     'role': 'Documentation of context for all members — external change documentation in respect to RPGACE Architecture. Promoted from a Tier layer to a real L0 unit, Aug 18.',
     'sublevel': None},
]
UNIT_BY_ID = {u['id']: u for u in UNITS}

INJECTION = 'injection'
ACTOR = 'actor'

EDGES = [
    {'id': 'alex-rpgace', 'a': 'alex', 'b': 'rpgace_architecture', 'kind': ACTOR,
     'evidence': 'Decisions/G26 — 10 real human-gate decision points, e.g. taxonomy placement confirms, ConID delete confirms.',
     'desc': 'Alex makes the real yes/no call at every human-confirmation gate RPGACE Architecture surfaces. Input = the real UI element (a confirm popup, an arm/confirm button). Output = the write/action taken.',
     'fork': True, 'link': 'galaxy_map_decisions.html'},
    {'id': 'alex-orchestrator', 'a': 'alex', 'b': 'orchestrator_cc', 'kind': ACTOR,
     'evidence': 'This whole session/relationship — every real build, plan, and correction across the project\'s history.',
     'desc': 'The real, hand-compiled capabilities catalog lives here — see the drop panel for the full 13-item list.', 'catalog': True},
    {'id': 'alex-oversight', 'a': 'alex', 'b': 'oversight_docs', 'kind': ACTOR,
     'evidence': 'The explicit human-checkpoint pattern (Current State confirmations, "update oversight"/"end session" trigger phrases, direct corrections like this session\'s own schematic re-read).',
     'desc': 'Alex reads and confirms real Current State entries; oversight docs never silently claim something is true without his eventual sign-off on the underlying work.'},
    {'id': 'alex-skills', 'a': 'alex', 'b': 'skills', 'kind': ACTOR,
     'evidence': 'Alex directly invokes skills by name in chat ("/CEO", "/paranoia", "/interrogation", etc.) — the literal trigger mechanism named in every skill\'s own frontmatter.',
     'desc': 'Alex names a skill; Orchestrator CC runs its real, defined procedure. A skill\'s own output (a report, a plan, a built artifact) becomes real input Alex reacts to.',
     'link': 'galaxy_map_skills.html'},
    {'id': 'alex-external', 'a': 'alex', 'b': 'external_ai', 'kind': ACTOR,
     'evidence': "Alex uses RPGACE's own Oracle chat directly as a real app user — RPGACE Architecture's own deployed feature, not mediated through Orchestrator CC.",
     'desc': 'Alex types a prompt into Oracle chat; External AI (via RPGACE Architecture\'s Oracle harness) returns a real reply rendered in the app UI.',
     'link': 'galaxy_map_externals.html'},
    {'id': 'orch-rpgace', 'a': 'orchestrator_cc', 'b': 'rpgace_architecture', 'kind': ACTOR,
     'evidence': 'Real git commit history touching rpgace_core.js/main.js/api/*.js — the whole build history of this project.',
     'desc': 'Orchestrator CC edits real code following the RPGACE.register()/module-marker convention, runs node --check, merges to main before any hand-test claim.',
     'link': 'galaxy_map.html'},
    {'id': 'orch-skills', 'a': 'orchestrator_cc', 'b': 'skills', 'kind': ACTOR,
     'evidence': 'Every real skill invocation this session and every prior session — the whole Judgment Funnel/Galaxy Development Framework.',
     'desc': 'Orchestrator CC invokes skills as its own standing development discipline — multi-angle deliberation before big builds, never agreement-then-build.',
     'link': 'galaxy_map_skills.html'},
    {'id': 'orch-supabase', 'a': 'orchestrator_cc', 'b': 'supabase', 'kind': INJECTION,
     'evidence': 'Direct MCP tool queries/migrations — the exact mechanism used to build this very page\'s own tracked ceo_plan_items rows.',
     'desc': 'Orchestrator CC reads/writes Supabase directly via MCP tools for evidence-gathering, plan tracking, and real schema work — a real injection tool for getting dev-process work done.',
     'link': 'galaxy_map_supabase.html'},
    {'id': 'orch-oversight', 'a': 'orchestrator_cc', 'b': 'oversight_docs', 'kind': ACTOR,
     'evidence': 'Rule 6 (every confirmed idea/fix updates oversight docs same-session) + R17 (oversight docs stem from the Galaxy Map, scoped per G-step).',
     'desc': 'Orchestrator CC keeps all 11 real oversight artifacts truthful against live code/Supabase, same session as any real change.'},
    {'id': 'rpgace-external', 'a': 'rpgace_architecture', 'b': 'external_ai', 'kind': ACTOR,
     'evidence': 'api/oracle.js — the whole Oracle chat feature, the single heaviest real edge in this entire map.',
     'desc': 'RPGACE Architecture\'s own Oracle harness mediates every real call to Anthropic (live) and the dormant Kimi/Luna scaffolds — never a provider called directly.',
     'link': 'galaxy_map.html'},
    {'id': 'rpgace-supabase', 'a': 'rpgace_architecture', 'b': 'supabase', 'kind': INJECTION,
     'evidence': 'Real per-function grep, this session: 113 of 502 real functions (22%) have a genuine Supabase table touch, across 25 distinct tables.',
     'desc': 'RPGACE Architecture\'s own functions pull/push real data as part of forming their output — "data pulling based on prompts," Alex\'s own words.',
     'link': 'galaxy_map_supabase.html'},
    {'id': 'rpgace-skills', 'a': 'rpgace_architecture', 'b': 'skills', 'kind': INJECTION,
     'evidence': 'SKILL_SECONDARY_RIVER (already built, 7 of 25 skills cite a real secondary river beyond River XIII\'s own full catalog).',
     'desc': 'A skill is a real "built in framework" — reused, defined procedure a river/module\'s own development draws on, injected as dev-process citation, not a runtime call.',
     'link': 'galaxy_map_skills.html'},
    {'id': 'rpgace-oversight', 'a': 'rpgace_architecture', 'b': 'oversight_docs', 'kind': ACTOR,
     'evidence': 'The whole Tier (a)-(f) oversight system, all 11 real artifacts.',
     'desc': 'Oversight Docs document RPGACE Architecture\'s own real state — "external change documentation in respect to RPGACE Architecture," Alex\'s own redefinition.'},
    {'id': 'external-oversight', 'a': 'external_ai', 'b': 'oversight_docs', 'kind': ACTOR,
     'evidence': 'oracleAppGrounding.SELF_KNOWLEDGE — hand-curated FROM oversight-doc content, the real "self-awareness influences knowledge of RPGACE app" edge Alex named directly (4B.4).',
     'desc': "Oversight Docs feed Oracle's own self-knowledge; External AI answers questions about RPGACE using content that originated in Oversight Docs."},
    {'id': 'skills-supabase', 'a': 'skills', 'b': 'supabase', 'kind': INJECTION,
     'evidence': 'Real skill-to-table writes: /perspective → perspective_reports, /CEO → ceo_plan_items, /colourgradient reads ceo_plan_items, /Bedtime → session_memory.',
     'desc': 'A skill\'s own defined procedure directly reads/writes Supabase as part of doing its job — a real, direct injection, not mediated through anything else.',
     'link': 'galaxy_map_supabase.html'},
    {'id': 'skills-oversight', 'a': 'skills', 'b': 'oversight_docs', 'kind': ACTOR,
     'evidence': "Skill .md files that literally cite oversight-doc maintenance in their own procedure (CEO's Loop 2 smoke_test.html population, update-logging-system's whole dependency map, Bedtime's Step 1).",
     'desc': 'Several skills name real oversight-doc updates as part of their own defined job — not incidental, a stated procedural step.'},
    {'id': 'supabase-oversight', 'a': 'supabase', 'b': 'oversight_docs', 'kind': ACTOR,
     'evidence': 'smoke_test_items, error_log, session_memory, ceo_plan_items — real Supabase tables that ARE part of the oversight system itself, per layer (d)/the CEO datasheet.',
     'desc': 'Not every oversight artifact is a static file — several ARE Supabase tables, so this edge is Supabase serving as oversight infrastructure directly, not just a data source oversight docs describe.'},
]

CAPABILITIES = [
    'Direct code implementation — rpgace_core.js/main.js/api/*.js edits following the RPGACE.register()/module-marker convention, node --check discipline, real merge-to-main-before-hand-test gating.',
    'Supabase schema + data work — migrations, RLS policy changes (the real Approach-B flip, independently verified via pg_policy, not just applied), dedup scans, direct evidence queries.',
    'Multi-angle deliberation frameworks — Omnitrix/Council-of-5/GODMODE/Aintergration, /CEO, /paranoia, /interrogation, /drift, /restructure, /Engineer, /debate, /5thDimension, /scope, /colourgradient, /perspective, /cartographer — real structured scrutiny before a big build, not agreement-then-build.',
    'Oversight documentation upkeep — keeping all 11 real oversight artifacts truthful against live code/Supabase, same session as any real change (rule 6, R17).',
    'The Galaxy Map / graphify pipeline — building and regenerating a whole multi-level, evidence-derived visualization system from real detection scripts, idempotency and anchor-verification checked, not assumed.',
    'Genuine collaborative decision-making — surfacing real forks via AskUserQuestion with real evidence attached instead of guessing; Alex overriding a recommendation is a normal, expected outcome, not a failure state.',
    'Subagent orchestration — Sonnet/Opus/Fable role-splitting (Omnitrix), background dispatch, real Total-systems coordination with OpenMontage CC / Graphify CC via Supabase dispatch tables.',
    'Session-continuity infrastructure — session_memory, /Bedtime/Routine/Summary — durable state across ephemeral containers.',
    'Error/lesson tracking with real promotion to standing rules — error_log.html, session_lessons.html, CLAUDE.md\'s own numbered rules as real examples of a one-off mistake becoming a permanent guardrail.',
    'Security/architecture hardening done carefully — the API-auth fix, the RLS flip, the password-gate redesign — real Tier-3 work, independently verified against production, never taken on trust alone.',
    'Scheduling / automation — Routines/triggers, push notifications, cron dispatch that survives container restarts.',
    'Real third-party tool judgment — Aintergration verdicts grounded in the tool\'s actual docs and RPGACE\'s actual architecture, never a pitch taken at face value.',
    'Live mid-build course correction — Alex catching a genuine misreading and Orchestrator CC re-planning from his real correction rather than defending the wrong reading (this exact page is a live instance).',
]


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def build_edges_for(unit_id):
    return [e for e in EDGES if unit_id in (e['a'], e['b'])]


def other_unit(edge, unit_id):
    return edge['b'] if edge['a'] == unit_id else edge['a']


def build_unit_panel(u):
    edges = build_edges_for(u['id'])
    rows = []
    for e in edges:
        other = UNIT_BY_ID[other_unit(e, u['id'])]
        kind_badge = '<span class="k-badge k-inject">💉 injection</span>' if e['kind'] == INJECTION else '<span class="k-badge k-actor">🧑 actor</span>'
        rows.append(
            f'<div class="edge-row" data-edge="{e["id"]}">'
            f'<span class="edot" style="background:{other["color"]}"></span>'
            f'<span class="etxt">{u["label"]} ↔ {other["label"]}</span>{kind_badge}'
            f'<span class="echev">▸</span></div>'
        )
    sub_link = ''
    if u.get('sublevel'):
        sub_link = f'<a class="sublevel-link" href="galaxy_map_{u["sublevel"]}.html">🔎 {u["label"]}\'s own 0.5-level page →</a>' if u['sublevel'] != 'galaxy' else '<a class="sublevel-link" href="galaxy_map.html">🔎 Drill into RPGACE Architecture\'s own structural chain →</a>'
    return f'''<section class="unit-panel" id="unit-{u['id']}" style="display:none">
  <div class="uhead"><span class="udot" style="background:{u['color']}"></span><h2>{u['icon']} {u['label']}</h2></div>
  <p class="urole">{esc(u['role'])}</p>
  {sub_link}
  <div class="edge-label">Real dimensions from this unit ({len(edges)}) — click one:</div>
  <div class="edges">{''.join(rows)}</div>
</section>'''


def build_drop_panel(e):
    ua, ub = UNIT_BY_ID[e['a']], UNIT_BY_ID[e['b']]
    kind_badge = '<span class="k-badge k-inject">💉 Skills/Supabase render as a real injection tool — attached to a step\'s HANDLING, not its input/output</span>' if e['kind'] == INJECTION else ''
    fork_html = ''
    if e.get('fork'):
        fork_html = ('<div class="fork-note">🔀 Real yes/no fork evidence exists for this dimension — '
                      f'<a href="{e.get("link", "galaxy_map_decisions.html")}">see the full Decisions breakdown →</a></div>')
    link_html = f'<a class="deep-link" href="{e["link"]}">🔽 Drill into the real underlying data →</a>' if e.get('link') else ''
    catalog_html = ''
    if e.get('catalog'):
        items = ''.join(f'<li>{esc(c)}</li>' for c in CAPABILITIES)
        catalog_html = ('<div class="catalog"><div class="catalog-label">💬 What Alex and Orchestrator CC can do together '
                         '(hand-compiled from real demonstrated project history — this list is evidence of itself):</div>'
                         f'<ol>{items}</ol></div>')
    return f'''<div class="drop-panel" id="drop-{e['id']}" style="display:none">
  <div class="dhead">
    <span class="udot" style="background:{ua['color']}"></span>{ua['icon']} {ua['label']}
    <span class="dsep">↔</span>
    <span class="udot" style="background:{ub['color']}"></span>{ub['icon']} {ub['label']}
  </div>
  {kind_badge}
  <div class="bubble">{esc(e['desc'])}</div>
  <div class="evidence"><span class="ev-label">Real evidence:</span> {esc(e['evidence'])}</div>
  {fork_html}
  {catalog_html}
  {link_html}
</div>'''


def build_matrix():
    header = '<tr><th></th>' + ''.join(f'<th title="{esc(u["label"])}">{u["icon"]}</th>' for u in UNITS) + '</tr>'
    rows = [header]
    for ru in UNITS:
        cells = [f'<th class="rowhead">{ru["icon"]} {ru["label"]}</th>']
        for cu in UNITS:
            if ru['id'] == cu['id']:
                cells.append('<td class="diag">—</td>')
                continue
            e = next((e for e in EDGES if {e['a'], e['b']} == {ru['id'], cu['id']}), None)
            if not e:
                cells.append('<td class="none" title="No direct real edge — mediated through another unit">·</td>')
                continue
            kind_cls = 'inject' if e['kind'] == INJECTION else 'actor'
            icon = '💉' if e['kind'] == INJECTION else '🧑'
            cells.append(f'<td class="hit {kind_cls}" title="{esc(e["desc"])}" data-edge="{e["id"]}">{icon}</td>')
        rows.append('<tr>' + ''.join(cells) + '</tr>')
    return ''.join(rows)


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (L0)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --purple:#9B59B6; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 20%, #14101e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:28px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto;line-height:1.6}}
  .toggle-row{{display:flex;justify-content:center;gap:8px;padding:16px 24px 0}}
  .toggle-btn{{padding:8px 18px;border-radius:16px;font-size:11.5px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .toggle-btn.active{{background:var(--gold);color:#1a1608;border-color:var(--gold)}}
  .view{{display:none}}
  .view.active{{display:block}}
  .units-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;max-width:980px;margin:24px auto;padding:0 24px}}
  .unit-card{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px 12px;text-align:center;cursor:pointer;transition:transform .15s,border-color .15s}}
  .unit-card:hover{{transform:translateY(-3px)}}
  .unit-card.active{{border-color:var(--gold);background:rgba(201,168,76,0.08)}}
  .unit-icon{{font-size:28px;margin-bottom:8px}}
  .unit-name{{font-size:12px;font-weight:700}}
  .unit-panel{{max-width:820px;margin:0 auto 20px;padding:0 24px}}
  .uhead{{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:8px}}
  .udot{{width:12px;height:12px;border-radius:50%;flex-shrink:0}}
  .uhead h2{{font-family:Georgia,serif;font-size:19px;color:#fff}}
  .urole{{text-align:center;color:var(--dim);font-size:11.5px;max-width:680px;margin:0 auto 10px;line-height:1.6}}
  .sublevel-link{{display:block;text-align:center;font-size:11px;font-weight:700;color:var(--gold);text-decoration:none;margin-bottom:16px}}
  .sublevel-link:hover{{text-decoration:underline}}
  .edge-label{{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}}
  .edges{{display:flex;flex-direction:column;gap:6px}}
  .edge-row{{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px 14px;cursor:pointer}}
  .edge-row:hover{{border-color:var(--gold)}}
  .edot{{width:9px;height:9px;border-radius:50%;flex-shrink:0}}
  .etxt{{font-size:11.5px;flex:1}}
  .echev{{color:var(--dim);font-size:11px}}
  .k-badge{{font-size:9px;font-weight:700;padding:2px 8px;border-radius:8px;white-space:nowrap}}
  .k-inject{{background:rgba(155,89,182,0.15);color:var(--purple);border:1px solid rgba(155,89,182,0.35)}}
  .k-actor{{background:rgba(226,84,84,0.12);color:#E25454;border:1px solid rgba(226,84,84,0.3)}}
  .drop-panel{{max-width:760px;margin:14px auto 0;padding:18px 20px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:12px}}
  .dhead{{display:flex;align-items:center;justify-content:center;gap:8px;font-size:13.5px;font-weight:700;margin-bottom:12px;flex-wrap:wrap}}
  .dsep{{color:var(--dim)}}
  .bubble{{background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.25);border-radius:20px;padding:12px 16px;font-size:12px;line-height:1.6;margin-bottom:12px}}
  .evidence{{font-size:10.5px;color:var(--dim);line-height:1.6;margin-bottom:10px}}
  .ev-label{{color:var(--gold);font-weight:700}}
  .fork-note{{font-size:11px;margin-bottom:10px}}
  .fork-note a{{color:var(--gold)}}
  .catalog{{margin:12px 0;padding:12px 14px;background:rgba(255,255,255,0.03);border-radius:8px}}
  .catalog-label{{font-size:10px;font-weight:700;color:var(--gold);margin-bottom:8px}}
  .catalog ol{{padding-left:18px;font-size:11px;line-height:1.7;color:var(--text)}}
  .deep-link{{display:inline-block;font-size:10.5px;font-weight:700;color:var(--gold);text-decoration:none;margin-top:6px}}
  .deep-link:hover{{text-decoration:underline}}
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
  a{{color:var(--gold)}}
  .note{{max-width:820px;margin:20px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
</style>
</head>
<body>
<div class="breadcrumb" style="text-align:center;padding:12px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px">
  <span style="color:#0a0a0f;background:#C9A84C;padding:4px 9px;border-radius:12px">🌌 L0</span>
</div>
<div style="max-width:820px;margin:12px auto 0;padding:9px 20px;text-align:center;font-size:11px;color:#8a8a9a">
  Real Aug 21 2026 update: this page's 7 units are now merged with <a href="galaxy_map.html">galaxy_map.html</a>'s 4 galaxies into one real, current Level 0 with a working infra/inter facet picker — <a href="galaxy_map_l0_fusion.html">galaxy_map_l0_fusion.html</a>. This page stays live as real reference for the original 17 hand-curated edges, but the fusion page is the correct place to start.
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · L0</div>
  <h1>🌌 Seven Peer Units</h1>
  <p>External AI, RPGACE Architecture, Skills, Orchestrator CC, Alex, Supabase, Oversight Docs — no privileged gateway. Two real representations of the exact same {n_edges} hand-curated edges, toggle below. Skills and Supabase render as a real 💉 injection tool wherever they appear — something a step reaches for mid-process, not an actor that performs it.</p>
</div>
<div class="toggle-row">
  <div class="toggle-btn active" data-view="map">🌌 Map view</div>
  <div class="toggle-btn" data-view="table">📊 Table view</div>
</div>
<div class="view active" id="view-map">
  <div class="units-grid">{unit_cards}</div>
  {unit_panels}
  {drop_panels_map}
</div>
<div class="view" id="view-table">
  <div class="matrix-wrap"><table id="matrix">{matrix_rows}</table></div>
  <div class="legend"><span>💉 injection tool</span><span>🧑 actor</span><span>· no direct real edge (mediated)</span></div>
  <div class="details">{drop_panels_table}</div>
</div>
<div class="note">
  Generated by <code>scripts/galaxy_map_l0.py</code> — 7 real peer units, {n_edges} real hand-curated
  dimension-edges (of 21 possible pairs; 4 excluded as mediated through another unit, not directly
  evidenced), ONE real dataset rendered two ways (rule 8 — real /deduplication fix, merging what used
  to be 2 separate files). RPGACE Architecture's own drill-down is the existing
  <a href="galaxy_map.html">galaxy_map.html</a> — unchanged, reached as this unit's own real content,
  not a privileged gateway for the other 6.
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
  var cards = document.querySelectorAll('.unit-card');
  var panels = document.querySelectorAll('.unit-panel');
  var dropsMap = document.querySelectorAll('#view-map .drop-panel');
  function showUnit(id) {{
    panels.forEach(function(p) {{ p.style.display = (p.id === 'unit-' + id) ? '' : 'none'; }});
    cards.forEach(function(c) {{ c.classList.toggle('active', c.dataset.unit === id); }});
    dropsMap.forEach(function(d) {{ d.style.display = 'none'; }});
  }}
  cards.forEach(function(c) {{ c.addEventListener('click', function() {{ showUnit(c.dataset.unit); }}); }});
  document.querySelectorAll('#view-map .edge-row').forEach(function(row) {{
    row.addEventListener('click', function() {{
      var id = row.dataset.edge;
      dropsMap.forEach(function(d) {{ d.style.display = (d.id === 'drop-' + id) ? '' : 'none'; }});
      var el = document.getElementById('drop-' + id);
      if (el) el.scrollIntoView({{behavior:'smooth', block:'nearest'}});
    }});
  }});
  document.querySelectorAll('td.hit').forEach(function(td) {{
    td.addEventListener('click', function() {{
      var id = td.dataset.edge;
      document.querySelectorAll('#view-table .detail-row').forEach(function(d) {{ d.style.display = 'none'; }});
      var el = document.getElementById('tdrop-' + id);
      if (el) {{ el.style.display = ''; el.scrollIntoView({{behavior:'smooth', block:'nearest'}}); }}
    }});
  }});
}})();
</script>
</body>
</html>
"""


def main():
    unit_cards = ''.join(
        f'<div class="unit-card" data-unit="{u["id"]}"><div class="unit-icon">{u["icon"]}</div><div class="unit-name">{u["label"]}</div></div>'
        for u in UNITS)
    unit_panels = ''.join(build_unit_panel(u) for u in UNITS)
    drop_panels_map = ''.join(build_drop_panel(e) for e in EDGES)
    matrix_rows = build_matrix()
    table_details = []
    for e in EDGES:
        ua, ub = UNIT_BY_ID[e['a']], UNIT_BY_ID[e['b']]
        kind_badge = '<span class="k-badge k-inject">💉 injection</span>' if e['kind'] == INJECTION else '<span class="k-badge k-actor">🧑 actor</span>'
        table_details.append(
            f'<div class="detail-row" id="tdrop-{e["id"]}" style="display:none">'
            f'<div class="dhead">{ua["icon"]} {ua["label"]} ↔ {ub["icon"]} {ub["label"]} {kind_badge}</div>'
            f'<div class="bubble">{esc(e["desc"])}</div>'
            f'<div class="evidence">Real evidence: {esc(e["evidence"])}</div></div>'
        )
    drop_panels_table = ''.join(table_details)
    html = TEMPLATE.format(
        unit_cards=unit_cards, unit_panels=unit_panels,
        drop_panels_map=drop_panels_map, matrix_rows=matrix_rows, drop_panels_table=drop_panels_table,
        n_edges=len(EDGES))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — 7 real L0 units, {len(EDGES)} real edges, 2 toggleable views (map/table).")


if __name__ == '__main__':
    main()
