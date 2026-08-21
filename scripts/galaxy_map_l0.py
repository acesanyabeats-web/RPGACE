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

**Real Aug 21 2026 correction (G67, same session as the Skill Network
/misunderstanding fix) — this file no longer generates its own
standalone page.** Alex's own direct words: "the l0 7 units should
exist in the bubbles in on rpgace total systems own architecture map"
(the earlier fusion), then, on the leftover 7x7 matrix specifically:
"use what we have, dont make new shit... just use what we have or ask
what fits." galaxy_map.html now has its own real map/table toggle —
map is its existing SVG+bubble+Infra/Inter facet view (unchanged),
table is THIS file's own build_matrix()/build_table_details() output,
imported directly (rule 8, same discipline as galaxy_map_skills.py's
relationship to galaxy_map_skill_network.py). This file is now a pure
DATA + RENDER module (UNITS/EDGES/build_matrix/build_table_details —
the real table-view content) — graphify-out/galaxy_map_l0.html no
longer exists.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

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
     'link': 'galaxy_map_skill_network.html'},
    {'id': 'alex-external', 'a': 'alex', 'b': 'external_ai', 'kind': ACTOR,
     'evidence': "Alex uses RPGACE's own Oracle chat directly as a real app user — RPGACE Architecture's own deployed feature, not mediated through Orchestrator CC.",
     'desc': 'Alex types a prompt into Oracle chat; Anthropic specifically — the only one of the 3 real providers that is actually live right now — returns a real reply rendered in the app UI, via RPGACE Architecture\'s own Oracle harness. Kimi/Luna are dormant scaffolds; this real interaction has never happened with them.',
     'link': 'galaxy_map_externals.html'},
    {'id': 'orch-rpgace', 'a': 'orchestrator_cc', 'b': 'rpgace_architecture', 'kind': ACTOR,
     'evidence': 'Real git commit history touching rpgace_core.js/main.js/api/*.js — the whole build history of this project.',
     'desc': 'Orchestrator CC edits real code following the RPGACE.register()/module-marker convention, runs node --check, merges to main before any hand-test claim.',
     'link': 'galaxy_map.html'},
    {'id': 'orch-skills', 'a': 'orchestrator_cc', 'b': 'skills', 'kind': ACTOR,
     'evidence': 'Every real skill invocation this session and every prior session — the whole Judgment Funnel/Galaxy Development Framework.',
     'desc': 'Orchestrator CC invokes skills as its own standing development discipline — multi-angle deliberation before big builds, never agreement-then-build.',
     'link': 'galaxy_map_skill_network.html'},
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
     'link': 'galaxy_map_skill_network.html'},
    {'id': 'rpgace-oversight', 'a': 'rpgace_architecture', 'b': 'oversight_docs', 'kind': ACTOR,
     'evidence': 'The whole Tier (a)-(f) oversight system, all 11 real artifacts.',
     'desc': 'Oversight Docs document RPGACE Architecture\'s own real state — "external change documentation in respect to RPGACE Architecture," Alex\'s own redefinition.'},
    {'id': 'external-oversight', 'a': 'external_ai', 'b': 'oversight_docs', 'kind': ACTOR,
     'evidence': 'oracleAppGrounding.SELF_KNOWLEDGE — hand-curated FROM oversight-doc content, the real "self-awareness influences knowledge of RPGACE app" edge Alex named directly (4B.4).',
     'desc': "Oversight Docs feed Oracle's own self-knowledge (this mechanism is provider-agnostic — it grounds whichever provider actually processes the prompt, today always Anthropic since Kimi/Luna are dormant); the active AI provider answers questions about RPGACE using content that originated in Oversight Docs."},
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


def build_table_details():
    """Real Aug 21 2026 extraction (G67 fold) — this was inline code inside
    the now-deleted main()/TEMPLATE rendering; factored into its own
    function so galaxy_map.py can import and reuse it directly (rule 8),
    same discipline as galaxy_map_skills.py's build_group_section()."""
    rows = []
    for e in EDGES:
        ua, ub = UNIT_BY_ID[e['a']], UNIT_BY_ID[e['b']]
        kind_badge = '<span class="k-badge k-inject">💉 injection</span>' if e['kind'] == INJECTION else '<span class="k-badge k-actor">🧑 actor</span>'
        rows.append(
            f'<div class="detail-row" id="tdrop-{e["id"]}" style="display:none">'
            f'<div class="dhead">{ua["icon"]} {ua["label"]} ↔ {ub["icon"]} {ub["label"]} {kind_badge}</div>'
            f'<div class="bubble">{esc(e["desc"])}</div>'
            f'<div class="evidence">Real evidence: {esc(e["evidence"])}</div></div>'
        )
    return ''.join(rows)


