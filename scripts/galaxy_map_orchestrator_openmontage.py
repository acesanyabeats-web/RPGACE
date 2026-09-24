#!/usr/bin/env python3
"""
galaxy_map_orchestrator_openmontage.py — G29 of the ratified "RPGACE
Total Systems Galaxy Map" /CEO plan (Aug 14 2026). Real, curated build
of the Orchestrator CC <-> OpenMontage CC interaction dimension Alex
asked for: "another dimension with orchestrator CC and openmontage CC
interacting with relevant parts of mapped out RPGACE total systems."

Real data source, never invented: total_system_members (the real role/
repo/channel registry — real, cheap rename fix applied same pass:
"RPGACE CC" -> "Orchestrator CC", matching the name every current-state
doc has used since Aug 13, same class of drift as the Aug 13 Engineer
CC -> OpenMontage CC rename) and openmontage_jobs (the real, only
channel between the two — 8 real rows as of this build, read directly,
summarized honestly rather than pasting multi-thousand-word transcripts
verbatim — every row cites its own real id for direct verification).

Real, load-bearing constraint stated plainly, same one already
documented repeatedly in CLAUDE.md: there is no live session-to-session
link between Orchestrator CC and OpenMontage CC — openmontage_jobs is
an async Supabase queue, never a synchronous call. This page shows WHAT
was exchanged, not a live connection.

Sep 15 2026, real correction, 2nd pass — Alex's own direct words on the
first Sep 15 restructure below (2 anchored sections on ONE shared page):
"its still not 2 separate pages, just on one with more devision." The
first pass genuinely fixed the WRONG symptom — each bubble now landed on
its own correctly-scoped content, but both bubbles still opened the SAME
physical file. Fixed for real this time: this script now writes TWO
genuinely separate HTML files (galaxy_map_orchestrator_cc.html /
galaxy_map_openmontage_cc.html), sharing one Python source (rule 8 — the
JOBS/ACTOR_PROFILES/render logic stays single-sourced) but producing two
real, independently-addressable pages on disk. Each page shows ONLY its
own unit's full profile + Shared Infrastructure drilldown, plus the same
real shared dispatch history (byte-identical on both — generated from
the same JOBS list in the same run, so it cannot drift between the two
copies) and a direct link to the other unit's own separate page.
"""
from pathlib import Path
import sys as _sys_rail
from pathlib import Path as _Path_rail
_sys_rail.path.insert(0, str(_Path_rail(__file__).parent))
from graphify_river_group import inject_level_rail  # noqa: E402
from graphify_river_group import dimension_index_html, DIMENSION_INDEX_CSS  # noqa: E402
from graphify_river_group import (  # noqa: E402
    SUPABASE_L0_UNIT_TOUCHES,
    compute_l0_unit_supabase_infra, compute_l0_unit_supabase_inter,
    _L0_ROLE_LABEL as _ROLE_LABEL, L0_UNIT_LABEL,
    compute_all_supabase_table_touches, compute_oversight_doc_supabase_reads,
)
# G91 continuation, real Alex ask (Aug 25 2026, same day): "this is
# still there, it is supposed to be level 0 of orchestrator cc bubble
# system with route to levels and rivers" — the same shared river ->
# module -> function drill-down mechanism G83/G91 built for Supabase/
# External AI/Oversight Docs, reused here (rule 8) scoped to
# Orchestrator CC's own 3 curated tables.
from graphify_river_group import (  # noqa: E402
    build_infra_drilldown, render_infra_drilldown, infra_drilldown_counts,
    INFRA_DRILLDOWN_CSS, LEVEL3_MODULES, LINKABLE_MODULES, RIVER_MODULES, RIVER_NAME,
)

OUT_PATH = {
    'orchestrator_cc': Path('graphify-out/galaxy_map_orchestrator_cc.html'),
    'openmontage_cc': Path('graphify-out/galaxy_map_openmontage_cc.html'),
}

# Real, curated summary of the 8 real openmontage_jobs rows (Aug 14
# read). Each row's own real id is cited for direct Supabase
# verification — never a paraphrase presented as the only record.
JOBS = [
    {'id': '7cb846b5', 'title': 'Calibri', 'kind': 'Video job', 'status': 'failed',
     'by': 'rpgace_claude_code', 'date': '2026-07-31',
     'summary': 'A real Scorsese-style mob-narrative music-video brief (RnB x West Coast). OpenMontage CC correctly identified the "cinematic" pipeline, then correctly refused to fake the brief with generic stock/archival footage since zero image/video-gen API keys were configured — marked failed with an honest, detailed explanation rather than faking success. Multiple real follow-up investigation threads landed on this SAME row over the following days (local GPU feasibility, Kaggle/Colab cloud-GPU testing) rather than opening new rows — a real, deliberate "one shared row, one shared ground truth" pattern.'},
    {'id': '34bccfcb', 'title': 'Calibri — Free Cloud GPU (Colab/Kaggle) Proposal', 'kind': 'Research/proposal', 'status': 'complete',
     'by': 'openmontage_claude_code', 'date': '2026-08-04',
     'summary': 'A real, honest multi-day cloud-GPU investigation (10 real Kaggle kernel iterations) — model VRAM tradeoffs, a real dataset-upload path, checkpoint/resume mechanics reused from OpenMontage\'s own existing protocol. Ended at a genuine, evidence-confirmed dead end: cogvideo-5b\'s real peak memory demand during generation exceeds a free-tier T4/P100\'s ~14.56GB usable VRAM, confirmed 3 separate structurally-different ways (device_map, whole-model offload, sequential layer offload) — a real hardware ceiling, not a fixable bug. Real, reusable value kept regardless: the RAM-staging fix and corrected VRAM/disk figures.'},
    {'id': '4d804898', 'title': 'Calibri — Draft fix: hunyuan-1.5/ltx2-local variant-loading bugs', 'kind': 'Code fix (drafted, unmerged)', 'status': 'complete',
     'by': 'openmontage_claude_code', 'date': '2026-08-04',
     'summary': 'Real code fixes for 2 genuinely broken local-video tools (missing HF repo variant/subfolder selection) — verified against OpenMontage\'s own real test suite (620 passed, 7 skipped). Deliberately kept on a local, unpushed branch (fix/hunyuan-ltx2-variant-loading) — no PR opened against the third-party public repo without explicit confirmation of intent, a real, correct restraint.'},
    {'id': '5feb76ed', 'title': 'SYSTEM: "Total" — 3-way role definition', 'kind': 'Standalone system-state row', 'status': 'complete',
     'by': 'openmontage_claude_code', 'date': '2026-08-04',
     'summary': 'The real, foundational row establishing "Total" — roles for RPGACE app / Orchestrator CC (then still named "RPGACE CC") / OpenMontage CC (then still named "Engineer CC"), and confirming directly via list_sessions that no live session-to-session link exists — the same constraint this whole G29 page is built around.'},
    {'id': '7c191255', 'title': 'Asylum', 'kind': 'Video job (simulated)', 'status': 'complete',
     'by': 'rpgace_claude_code', 'date': '2026-08-05',
     'summary': 'A real Phase F "Simulate Response" test-tool row — explicitly [SIMULATED], zero real cost, zero real render, built to validate the pipeline plumbing end-to-end without spending real API credits.'},
    {'id': 'a92d9e05', 'title': 'Asylum (2nd row, different content_production_id)', 'kind': 'Video job (simulated)', 'status': 'complete',
     'by': 'rpgace_claude_code', 'date': '2026-08-06',
     'summary': 'A real second row for the same beat title, one day later, a different content_production_id and a different flPath/visualTreatment flag than the first — a real observation worth naming honestly (possibly a genuine re-run against a corrected ConID, not confirmed either way), not silently treated as identical to the first row.'},
    {'id': '98aa2096', 'title': 'SYSTEM: "Total" — graphify proposal', 'kind': 'Standalone system-state row', 'status': 'complete',
     'by': 'rpgace_claude_code', 'date': '2026-08-06',
     'summary': 'The real historical precedent for this whole G29 page — Orchestrator CC logged a decomposed graphify cross-repo-graph alternative for OpenMontage CC to weigh, after a real /paranoia pass found "graphify as a live 4th Total member" wasn\'t buildable as originally framed.'},
    {'id': '29d1c11d', 'title': 'Insane trap vocal', 'kind': 'Video job (simulated)', 'status': 'complete',
     'by': 'rpgace_claude_code', 'date': '2026-08-06',
     'summary': 'A real Phase F "Simulate Response" test-tool row — explicitly [SIMULATED], same zero-cost validation pattern as the Asylum rows.'},
]

# ── Sep 15 2026 restructure — real Alex ask: "i want this page split
# into 2 infra, i click openmontage bubble at level 0, its only
# openmontage infra, i click orchestrator CC - it shows orchestrator CC
# infra... redesign how information is shown in infra and inter to just
# deliver what the role is, what input they got, how they work on the
# input, where it goes on further, where at river, modules and
# functions it contributes, what externals and other inter stakeholders
# they interact with." Ratified via /CEO Loop 1 (compile ->
# /interrogation -> /paranoia-advised draft -> /drift check -> report ->
# Alex approved the recommended pilot-here-first scope), full record:
# records/2026-09/infra_inter_redesign_ceo_{compile,plan}_2026-09-15.txt.
#
# Real, evidence-sourced 6-facet profile per actor — mirrors (never
# duplicates, rule 8: this table's own perspective_reports rows are the
# real source of truth) the 2 new real perspective_reports rows this
# same pass inserted for scope_id='orchestrator_cc'/'openmontage_cc'
# (the only 2 of 13 real L0 units that had none before this pass — see
# the compile doc). Same convention MEMBERS/JOBS above already use:
# hand-curated Python mirroring a real Supabase table, not a live query
# at build time (this script has no DB connectivity).
ACTOR_PROFILES = {
    'orchestrator_cc': {
        'icon': '🧭',
        'tagline': 'Planner / Orchestrator — this session',
        'role': ('The real planner/orchestrator across RPGACE Total Systems. Decides what to build and directs '
                 'work: real evidence-gathering, dispatch-writing, RPGACE-side schema/UI/doc work. Cannot literally '
                 'invoke OpenMontage CC\'s skills or reach into its repo — <code>add_repo</code> refuses cross-owner '
                 'adds, and a session is permanently tied to its starting repo\'s owner.'),
        'input': ('Real prompts and decisions from Alex, plus a real, standing set of passive session-start pulls — '
                   'undrained <code>graphify_jobs</code> rows, <code>oracle_dev_suggestions</code>, active '
                   '<code>error_log</code> rows, flagged <code>system_map_flags</code> rows.'),
        'processing': ('Runs the Judgment Funnel / <code>/CEO</code> planning loop on whatever Alex asks: evidence-'
                        'gather (GODMODE/<code>/scope</code>) → scrutinize (Council of 5) → execute (Omnitrix — '
                        'Opus builds, Sonnet reviews) → verify (<code>/Engineer</code> Stage 5 Truth Check) → log.'),
        'output': ('Writes real dispatch rows into <code>openmontage_jobs</code> (async, never live) and standalone '
                    'system-state rows for cross-cutting decisions that aren\'t a single video job; writes/updates '
                    '<code>total_system_members</code>; writes <code>perspective_reports</code> in bulk via its own '
                    'generator-script toolchain (267 real rows across 3 runs as of Sep 8 2026); logs to '
                    'patch_notes.html/Chronicles (<code>system_updates</code>) and the '
                    '<code>ceo_plans</code>/<code>ceo_plan_items</code>/<code>ceo_reports</code> datasheet.'),
        'stakeholders': ('<b>Alex</b> — every Tier-3 decision routes through him, no exceptions. <b>OpenMontage CC</b> '
                          '— via <code>openmontage_jobs</code>, the only real channel (no live session-to-session '
                          'link exists). <b>Graphify CC</b> — reads <code>graphify_jobs</code> at session start, a '
                          'passive pull since Graphify CC cannot write to Chronicles directly. <b>Oracle</b> — drives '
                          'its own grounding/self-knowledge text. <b>Skills</b> — executes the standing protocols. '
                          '<b>Oversight Docs</b> — the real destination of nearly everything this unit writes.'),
    },
    'openmontage_cc': {
        'icon': '🎬',
        'tagline': 'Engineer / Execution — calesthio/OpenMontage',
        'role': ('A separate, real Claude Code session operating inside its own repo, <code>calesthio/OpenMontage</code> '
                  '(~11,280 real nodes per Graphify CC\'s cross-repo graph). Hands-on technical execution — the real '
                  'peer Orchestrator CC cannot reach into directly.'),
        'input': ('Real queued rows in <code>openmontage_jobs</code> (<code>status=\'queued\'</code>), written by '
                   'Orchestrator CC — a real brief: beat metadata, Visual Treatment Doc, outbound script, Character '
                   'Reference Block.'),
        'processing': ('Environment setup (Python venv, pip/npm installs, FFmpeg), choosing a real pipeline from the '
                        'brief\'s own actual content, real generation/cloud-GPU work, real verification before ever '
                        'reporting a result — never faking success to avoid an honest failure.'),
        'output': ('Writes back to the SAME <code>openmontage_jobs</code> row (<code>status</code> + '
                    '<code>output_note</code>) using the plain anon key — no service-role key, no '
                    '<code>RPGACE_API_SECRET</code>; both are private to RPGACE\'s own codebase and were never '
                    'handed to this session.'),
        'stakeholders': ('<b>Orchestrator CC</b> — the only real channel, <code>openmontage_jobs</code>. No other '
                          'Total-system table touch is evidenced: its own <code>total_system_members</code> row is '
                          'read-ABOUT (its identity is listed there), never a confirmed self-write.'),
    },
}


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


# ── Aug 25 2026 audit — one real, evidenced dead end on this page's own
# remaining content (independent of the G80 L0 cross-link block above,
# which was added earlier the same day and is deliberately not touched).
#
# Every one of the 8 job cards ends by telling the reader to "verify
# directly in openmontage_jobs", and the L0 facet block lists each
# unit's real tables — all as plain <code> text. `openmontage_jobs` is a
# genuinely module-touched table, so galaxy_map_supabase.html really
# does render a `#tbl-openmontage_jobs` section for it: an instruction
# to go verify something, sitting one link away from the page that
# shows where that table is actually used.
#
# Gated on the same real data galaxy_map_supabase.py builds its own
# `#tbl-` sections from, never a hand-typed roster (rule 8), so the link
# appears exactly when the target section does. Checked live: of the 3
# tables this page names, only `openmontage_jobs` qualifies —
# `total_system_members` and `graphify_jobs` have no client-side module
# touch and no oversight-doc fetch, so the Supabase page has no section
# for them and they correctly stay unlinked. That asymmetry is the point
# of gating rather than assuming.
_SB_TABLES = set(compute_all_supabase_table_touches()) | {
    r['table'] for r in compute_oversight_doc_supabase_reads()}


def _tbl_link(tbl):
    """A real table name — linked to its own Supabase-page section only
    when that section genuinely exists."""
    if tbl in _SB_TABLES:
        return (f'<a class="tbl-link" href="galaxy_map_supabase.html#tbl-{esc(tbl)}" '
                f'title="Where this table is actually read and written">'
                f'<code>{esc(tbl)}</code></a>')
    return (f'<code class="tbl-none" title="No client-side module touch and no oversight-doc fetch — '
            f'the Supabase page has no section for this table">{esc(tbl)}</code>')


# G91 continuation (Aug 25 2026) — Orchestrator CC's own infra bubble
# system, the real destination its L0 click now jumps to. Scoped to the
# 3 real tables SUPABASE_L0_UNIT_TOUCHES already names for this unit
# (openmontage_jobs/total_system_members/graphify_jobs), cross-
# referenced against every rpgace_core.js module/function that touches
# the SAME tables — same shape as Oversight Docs' own Shared
# Infrastructure tab, reused not re-derived.
#
# G108 (Aug 26 2026) — Alex's own direct ask: "all infra inter should
# have map view with full/choice... and the table toggle able too."
# This section had a Map view (the drill-down) with no Table view at
# all — fixed with a real one, matching Supabase/Oracle's own per-table
# row shape (module/river chips + a real per-function touch list), not
# invented fresh. Table is the default landing view, same as the other
# 3 Infra pages that already had a toggle (R22 precedent).
_river_of = {}
for _r, _mods in RIVER_MODULES.items():
    for _m in _mods:
        _river_of[_m] = _r


def _river_chip(rnum):
    if rnum is None:
        return '<span class="tbl-none">cross-cutting, no river</span>'
    label = RIVER_NAME.get(rnum, f'River {rnum}').split('—')[0].strip()
    return f'<a class="tbl-link" href="galaxy_map_module.html#river-{rnum}"><code>🌊 {esc(label)}</code></a>'


def _unit_evidence(unit_id):
    """Real, shared evidence computation for one L0 unit's own table set
    (SUPABASE_L0_UNIT_TOUCHES) cross-referenced against every real
    rpgace_core.js module/function touching the SAME tables. Factored
    out Sep 24 2026 (real interlink follow-up) — this used to be
    computed twice, once inline here and once again inside main()'s own
    diagnostic print loop, a real rule-8 duplication closed in the same
    pass that also exposes a module-level DRILL for galaxy_map_river.py
    to import."""
    unit_tables = sorted(e['table'] for e in SUPABASE_L0_UNIT_TOUCHES.get(unit_id, ()))
    all_touches = compute_all_supabase_table_touches()
    return {tbl: all_touches[tbl] for tbl in unit_tables if tbl in all_touches}


def _unit_drill(unit_id):
    return build_infra_drilldown(_unit_evidence(unit_id))


# Sep 24 2026 — real module-level DRILL per unit, the same shape Oracle/
# Supabase/Decisions already expose, so galaxy_map_river.py's reverse-
# link registry can import a real destination for THIS page too (it
# writes 2 separate files from one script — orchestrator_cc/
# openmontage_cc — so this is a real dict keyed by unit_id, not a bare
# DRILL constant like the single-page scripts use).
_DRILL_ORPHANS_BY_UNIT = {uid: _unit_drill(uid) for uid in ('orchestrator_cc', 'openmontage_cc')}
DRILL_BY_UNIT = {uid: t[0] for uid, t in _DRILL_ORPHANS_BY_UNIT.items()}


def build_shared_infra_section(unit_id='orchestrator_cc'):
    """G91-original, generalized Sep 15 2026 (real restructure — was
    hardcoded to orchestrator_cc only, the actual bug behind Alex's own
    "why does clicking OpenMontage CC show mixed content" complaint).
    Same real drilldown mechanism, now built once per real actor rather
    than once total."""
    label = L0_UNIT_LABEL.get(unit_id, unit_id)
    icon = ACTOR_PROFILES.get(unit_id, {}).get('icon', '🧭')
    unit_tables = sorted(e['table'] for e in SUPABASE_L0_UNIT_TOUCHES.get(unit_id, ()))
    drill, orphans = _DRILL_ORPHANS_BY_UNIT[unit_id]
    evidence = _unit_evidence(unit_id)
    map_view = render_infra_drilldown(
        drill, orphans, unit_icon=icon, unit_label=label,
        leaf_link_fn=lambda m: f'galaxy_map_current.html#mod-{m}' if m in LINKABLE_MODULES else None,
        resource_emoji='🗄️',
        orphan_note=f'Real cross-cutting (no-river) modules that touch a real table {esc(label)} also reads/writes.')
    no_code = sorted(set(unit_tables) - set(evidence))
    no_code_note = (
        f'<p class="l0intro">{len(no_code)} of {len(unit_tables)} real {esc(label)} table(s) have NO '
        f'rpgace_core.js touch at all — {"they are" if len(no_code) != 1 else "it is"} reached only by real '
        f'non-code Total-system actors (a separate Claude Code session, a curated write), never client-side app '
        f'code: ' + ', '.join(f'<code>{esc(t)}</code>' for t in no_code) + '.</p>'
        if no_code else '')

    def _one_table_row(tbl):
        touches = evidence.get(tbl, [])
        mods = sorted({m for m, _f, _d in touches})
        # de-dup river chips (several modules can share one river)
        seen_r = set()
        river_chips_dedup = []
        for m in mods:
            r = _river_of.get(m)
            if r not in seen_r:
                seen_r.add(r)
                river_chips_dedup.append(_river_chip(r))
        mod_links = ''.join(
            f'<a class="tbl-link" href="galaxy_map_current.html#mod-{m}"><code>🔽 {esc(m)}</code></a>'
            if m in LINKABLE_MODULES else f'<code class="tbl-none">{esc(m)}</code>'
            for m in mods
        ) if mods else '<span class="tbl-none">no rpgace_core.js module touches this table</span>'
        detail_rows = ''.join(
            f'<div class="touch-row">{esc(m)}.{esc(f)}() — <code>{esc(d)}</code></div>'
            for m, f, d in sorted(touches)
        )
        # Sep 15 2026: id scoped per-unit (tbl-{unit_id}-{table}), not
        # bare tbl-{table} — orchestrator_cc and openmontage_cc share 2
        # real tables (openmontage_jobs/total_system_members), so a bare
        # id would collide once this function runs for both units on the
        # same page. Nothing external links to this page's own #tbl-
        # ids (checked via grep — only #cat-sharedinfra/#unit- are real
        # external targets), so this is a safe, local-only rename.
        return f'''<section class="table-section" id="tbl-{unit_id}-{tbl}">
  <div class="thead"><span class="tdot"></span><h2>🗄️ {tbl}</h2>
    <span class="tcount">{len(touches)} real function touch(es)</span></div>
  <div class="rivers">{''.join(river_chips_dedup)}</div>
  <div class="mods">{mod_links}</div>
  {f'<details class="touches"><summary>Every real touch (module.function → detail)</summary>{detail_rows}</details>' if touches else ''}
</section>'''

    # G108 continuation (Aug 26 2026) — Alex's own direct catch, on a
    # screenshot of this exact table: "why are they still not 2 separate
    # infra?" pointing at graphify_jobs/total_system_members sitting in
    # the SAME flat list as openmontage_jobs despite the prose note right
    # above already saying they're a genuinely different kind of fact
    # (real code-verified touch vs. real non-code-actor-only touch). The
    # note was correct; the TABLE STRUCTURE hadn't caught up to it — real
    # fix, matching the exact precedent galaxy_map_supabase.py's own
    # build_oversight_note() already set for this identical class of gap
    # (rule 8): split into 2 real, separately-headed groups instead of
    # one flat list with a disclaimer floating above it.
    code_rows = [_one_table_row(t) for t in unit_tables if t in evidence]
    no_code_rows = [_one_table_row(t) for t in unit_tables if t not in evidence]
    table_view = (
        (f'<h3 class="tblgroup-head">🗄️ Real code-verified Infra ({len(code_rows)})</h3>'
         f'<div class="tables">{"".join(code_rows)}</div>' if code_rows else '')
        + (f'<h3 class="tblgroup-head noncode">⚙️ Non-code Infra — real Total-system actors only, no rpgace_core.js touch ({len(no_code_rows)})</h3>'
           f'<div class="tables">{"".join(no_code_rows)}</div>' if no_code_rows else '')
    )

    return (f'<div class="l0block" id="cat-sharedinfra-{unit_id}">'
            f'<h2>🗄️ Shared Infrastructure — Rivers/Modules Touching the Same Tables</h2>'
            f'<p class="l0intro">Every real table {esc(label)} genuinely touches (same source as its own L0 Infra '
            f'facets), cross-referenced against every rpgace_core.js river/module/function that touches that '
            f'SAME table — real, live-code infrastructure sharing, not the dispatch-history narrative below.</p>'
            f'{no_code_note}'
            f'<div class="toggle-row" data-scope="{unit_id}">'
            f'<div class="toggle-btn active" data-view="map">🌌 Map view</div>'
            f'<div class="toggle-btn" data-view="table">📊 Table view</div>'
            f'</div>'
            f'<div class="view active" id="view-map-{unit_id}">{map_view}</div>'
            f'<div class="view" id="view-table-{unit_id}">{table_view}</div>'
            f'</div>')


# Sep 15 2026 restructure — the real per-actor "full profile" section.
# THIS is what an L0 bubble click now jumps to (see galaxy_map.py's
# CC_UNIT_LINK fix, same pass) — each unit's own anchor, showing ONLY
# that unit's own real content, closing the exact complaint Alex raised
# ("i click openmontage bubble at level 0, its only openmontage infra").
# Built from real, already-computed sources only (R22 table-first):
# ACTOR_PROFILES (mirrors the 2 new perspective_reports rows this same
# pass inserted), SUPABASE_L0_UNIT_TOUCHES (real table list + role),
# compute_l0_unit_supabase_infra/inter (real facet counts), and
# build_shared_infra_section (the real river/module/function drilldown,
# generalized above). Nothing here is invented prose.
def build_actor_section(unit_id):
    p = ACTOR_PROFILES[unit_id]
    label = L0_UNIT_LABEL.get(unit_id, unit_id)
    infra = compute_l0_unit_supabase_infra(unit_id)
    inter = compute_l0_unit_supabase_inter(unit_id)
    def _table_row(e):
        indirect_tag = ' <span class="tbl-none">(indirect)</span>' if e.get('indirect') else ''
        return f'<li>{_tbl_link(e["table"])} — {esc(_ROLE_LABEL.get(e["role"], e["role"]))}{indirect_tag}</li>'
    table_list = ''.join(_table_row(e) for e in SUPABASE_L0_UNIT_TOUCHES.get(unit_id, ()))

    def _facet(icon, title, body):
        return f'<div class="facet"><div class="fhead">{icon} {esc(title)}</div><div class="fbody">{body}</div></div>'

    facets = ''.join([
        _facet('🎭', 'Role', p['role']),
        _facet('📥', 'Input received', p['input']),
        _facet('⚙️', 'How it processes the input', p['processing']),
        _facet('📤', 'Where output goes further', p['output']),
        _facet('🌊', 'River / module / function contribution',
               f'{len(infra)} real 💉 Infra facet(s) · {len(inter)} real 🔗 Inter facet(s) on the '
               f'<a href="galaxy_map.html">L0 map</a>. Real tables touched:<ul class="l0list">{table_list}</ul>'
               f'Full river/module/function drilldown is the Shared Infrastructure block below.'),
        _facet('🤝', 'External / inter stakeholders', p['stakeholders']),
    ])

    return (f'<div class="actor-section" id="unit-{unit_id}">'
            f'<div class="ahead"><span class="aicon">{p["icon"]}</span>'
            f'<div><h2>{esc(label)}</h2><div class="atagline">{esc(p["tagline"])}</div></div></div>'
            f'<div class="facets">{facets}</div>'
            f'{build_shared_infra_section(unit_id)}'
            f'</div>')


def build_job_card(j):
    status_color = '#4CAF82' if j['status'] == 'complete' else '#E25454'
    return f'''<div class="jcard">
  <div class="jhead"><h3>{esc(j['title'])}</h3><span class="jstatus" style="color:{status_color}">{esc(j['status'])}</span></div>
  <div class="jmeta"><span class="jkind">{esc(j['kind'])}</span><span class="jby">by {esc(j['by'])}</span><span class="jdate">{esc(j['date'])}</span></div>
  <p class="jsummary">{esc(j['summary'])}</p>
  <div class="jid">Real row id: <code>{esc(j['id'])}...</code> — verify directly in {_tbl_link('openmontage_jobs')}</div>
</div>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map ({page_label})</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --purple:#9B59B6; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #17101a 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--purple);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto}}
  .msection{{max-width:1000px;margin:0 auto;padding:24px}}
  .constraint{{max-width:1000px;margin:0 auto 20px;padding:14px 18px;background:rgba(226,84,84,0.08);border:1px solid rgba(226,84,84,0.3);border-radius:10px;font-size:11.5px;line-height:1.6;color:#e0c0c0}}
  .jgrid{{display:flex;flex-direction:column;gap:12px}}
  .jcard{{background:rgba(255,255,255,0.03);border:1px solid rgba(155,89,182,0.18);border-radius:10px;padding:14px 18px}}
  .jhead{{display:flex;align-items:center;justify-content:space-between;gap:8px}}
  .jhead h3{{font-size:13px;color:#fff}}
  .jstatus{{font-size:9.5px;font-weight:700;text-transform:uppercase}}
  .jmeta{{display:flex;gap:10px;font-size:9.5px;color:var(--dim);margin:4px 0 8px}}
  .jkind{{color:var(--purple);font-weight:700}}
  .jsummary{{font-size:11px;line-height:1.6;color:#c8c8d8}}
  .jid{{font-size:9px;color:#5a5a68;margin-top:8px}}
  .l0block{{max-width:1000px;margin:0 auto 26px}}
  .l0block h2{{font-family:Georgia,serif;font-size:15px;color:#fff;margin-bottom:6px}}
  .l0block .l0intro{{font-size:11px;line-height:1.6;color:#c8c8d8;margin-bottom:12px}}
  .l0list{{list-style:none;margin-top:6px}}
  .l0list li{{font-size:10.5px;line-height:1.7;color:#c8c8d8}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:3px}}
  .tbl-link{{text-decoration:none}}
  .tbl-link code{{color:var(--purple);border-bottom:1px dotted currentColor}}
  .tbl-link:hover code{{border-bottom-style:solid}}
  .tbl-none{{color:var(--dim)}}
  a{{color:var(--purple)}}
  .toggle-row{{display:flex;gap:8px;margin:6px 0 14px}}
  .toggle-btn{{padding:6px 14px;border-radius:14px;font-size:10.5px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .toggle-btn.active{{background:var(--gold);color:#1a1608;border-color:var(--gold)}}
  .view{{display:none}} .view.active{{display:block}}
  .tables{{display:flex;flex-direction:column;gap:12px}}
  .table-section{{background:rgba(255,255,255,0.03);border:1px solid rgba(155,89,182,0.18);border-radius:12px;padding:14px 16px}}
  .tblgroup-head{{font-family:Georgia,serif;font-size:12.5px;font-weight:700;letter-spacing:.3px;color:var(--dim);margin:16px 0 8px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08)}}
  .tblgroup-head:first-child{{margin-top:0;padding-top:0;border-top:none}}
  .tblgroup-head.noncode{{color:#8a8a9a}}
  .thead{{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px}}
  .tdot{{width:10px;height:10px;border-radius:50%;background:var(--purple)}}
  .thead h2{{font-family:Georgia,serif;font-size:14px;color:#fff}}
  .tcount{{font-size:9.5px;color:var(--dim);margin-left:auto}}
  .rivers,.mods{{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}}
  .touches{{margin-top:6px;font-size:10.5px}}
  .touches summary{{cursor:pointer;color:var(--dim)}}
  .touch-row{{padding:3px 0 3px 10px;color:#a8a8b8;font-size:10.5px}}
  .note{{max-width:1000px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  .actor-section{{max-width:1000px;margin:0 auto 34px}}
  .other-link{{max-width:1000px;margin:0 auto 20px;text-align:center}}
  .other-link a{{display:inline-block;padding:8px 18px;border-radius:16px;background:rgba(155,89,182,0.12);border:1px solid rgba(155,89,182,0.3);font-size:11.5px;font-weight:700;text-decoration:none}}
  .ahead{{display:flex;align-items:center;gap:14px;margin-bottom:16px}}
  .aicon{{font-size:34px;line-height:1}}
  .ahead h2{{font-family:Georgia,serif;font-size:20px;color:#fff}}
  .atagline{{font-size:11px;color:var(--purple);font-weight:700;margin-top:2px}}
  .facets{{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}}
  .facet{{background:rgba(255,255,255,0.03);border:1px solid rgba(155,89,182,0.18);border-radius:10px;padding:13px 15px}}
  .facet:nth-child(5),.facet:nth-child(6){{grid-column:1 / -1}}
  .fhead{{font-size:11px;font-weight:700;color:#fff;margin-bottom:6px}}
  .fbody{{font-size:11px;line-height:1.65;color:#c8c8d8}}
  .fbody .l0list{{margin-top:4px;margin-bottom:6px}}
  @media (max-width:700px){{ .facets{{grid-template-columns:1fr}} .facet:nth-child(5),.facet:nth-child(6){{grid-column:auto}} }}
{infra_dd_css}
{dim_css}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · {eyebrow_suffix} (G29, real Sep 15 2026 restructure)</div>
  <h1>{page_h1}</h1>
  <p>{page_intro}</p>
  <p>Full real pipeline logic (queue → poll → real work → update → session-start check → report, as a Mermaid diagram): <a href="../system_flow_map.md">system_flow_map.md §14</a>, added Aug 20/21 2026 (G56).</p>
</div>
<div class="constraint">⚠️ <b>No live session-to-session link exists.</b> openmontage_jobs is an async Supabase queue, confirmed directly via list_sessions (5feb76ed's own real finding) — every row below is a real, asynchronous message, never a synchronous call.</div>
<div class="other-link">→ <a href="{other_href}">View {other_label}'s own separate page</a></div>
<div class="msection">
  {actor_section}
  <div class="l0block" id="dispatch-history">
    <h2>🤝 Shared Dispatch History — the real relationship between the two</h2>
    <p class="l0intro">The {n_jobs} real openmontage_jobs rows exchanged between {page_label} and {other_label} — narrated per-row, with real ids for direct verification. Identical, byte-for-byte, on both units' own separate pages (generated from the same JOBS list in the same script run, so it cannot drift) — a fact about the RELATIONSHIP, not either unit's own individual role/input/processing/output, which is why it isn't folded into the profile section above.</p>
    <div class="jgrid">{jobs}</div>
  </div>
</div>
{dim_index}

<!-- Real, scope-aware Table/Map toggle-click handling (this page's own
     Sep 15 2026 fix for 2 independent per-unit toggle-rows) now lives
     ONCE in the shared galaxy_map_shared.js (GM_TOGGLE_JS, P0 of the
     Sep 24 2026 /fableomnitrix full-redesign plan) -- GM_TOGGLE_JS
     generalizes this exact same data-scope mechanic (rule 8); this
     page's own copy removed, not reimplemented (Fable report D2). -->

<div class="note">
  Generated by <code>scripts/galaxy_map_orchestrator_openmontage.py</code> — real data from <code>total_system_members</code>
  and <code>openmontage_jobs</code> (Supabase), summarized honestly, every row citing its own real id for direct verification.
  G29 of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan. This unit's own separate page — see the link above for
  its real counterpart.
</div>
</body>
</html>
"""

_PAGE_COPY = {
    'orchestrator_cc': {
        'eyebrow_suffix': 'Orchestrator CC',
        'h1': '🧭 Orchestrator CC',
        'intro': ("This unit's own real full profile — role, input received, how it processes the input, "
                   "where output goes further, river/module/function contribution, external/inter "
                   "stakeholders — plus its own Shared Infrastructure drilldown. Its real dispatch history "
                   "with OpenMontage CC (the only other unit it exchanges real data with) sits further down, "
                   "on its own — see the link above for OpenMontage CC's own separate page."),
    },
    'openmontage_cc': {
        'eyebrow_suffix': 'OpenMontage CC',
        'h1': '🎬 OpenMontage CC',
        'intro': ("This unit's own real full profile — role, input received, how it processes the input, "
                   "where output goes further, river/module/function contribution, external/inter "
                   "stakeholders — plus its own Shared Infrastructure drilldown. Its real dispatch history "
                   "with Orchestrator CC (the only other unit it exchanges real data with) sits further down, "
                   "on its own — see the link above for Orchestrator CC's own separate page."),
    },
}


def main():
    jobs_html = ''.join(build_job_card(j) for j in JOBS)
    pairs = (('orchestrator_cc', 'openmontage_cc'), ('openmontage_cc', 'orchestrator_cc'))
    for unit_id, other_id in pairs:
        out = OUT_PATH[unit_id]
        copy = _PAGE_COPY[unit_id]
        other_label = L0_UNIT_LABEL.get(other_id, other_id)
        page_label = L0_UNIT_LABEL.get(unit_id, unit_id)
        html = TEMPLATE.format(
            page_label=page_label, eyebrow_suffix=copy['eyebrow_suffix'], page_h1=copy['h1'],
            page_intro=copy['intro'], other_href=OUT_PATH[other_id].name, other_label=other_label,
            actor_section=build_actor_section(unit_id),
            jobs=jobs_html, n_jobs=len(JOBS),
            dim_index=dimension_index_html(out.name),
            dim_css="", infra_dd_css="")
        out.parent.mkdir(parents=True, exist_ok=True)
        html = inject_level_rail(html, out.name)
        out.write_text(html, encoding='utf-8')
        print(f"Wrote {out} — {page_label}'s own real profile, {len(JOBS)} real dispatch rows (shared history).")
    # Aug 25 2026 — real, measured destination coverage, printed so a
    # future build can never silently regress it.
    named = sorted({'openmontage_jobs'}
                   | {e['table'] for uid in ('orchestrator_cc', 'openmontage_cc')
                      for e in SUPABASE_L0_UNIT_TOUCHES.get(uid, ())})
    linked = [t for t in named if t in _SB_TABLES]
    print(f"  Link coverage — {len(linked)}/{len(named)} named table(s) link a real Supabase-page section "
          f"(honestly unlinked: {', '.join(t for t in named if t not in _SB_TABLES) or 'none'}).")
    # Sep 24 2026 — reuses the real module-level _DRILL_ORPHANS_BY_UNIT
    # (built once, above) instead of re-deriving a 3rd copy of the same
    # evidence computation here (rule 8 — this print loop used to be its
    # own independent 2nd copy of build_shared_infra_section's own logic).
    for _uid in ('orchestrator_cc', 'openmontage_cc'):
        _tables = sorted(e['table'] for e in SUPABASE_L0_UNIT_TOUCHES.get(_uid, ()))
        _drill, _orph = _DRILL_ORPHANS_BY_UNIT[_uid]
        _c = infra_drilldown_counts(_drill, _orph)
        print(f"  {L0_UNIT_LABEL.get(_uid, _uid)} — Shared Infrastructure: {len(_tables)} real table(s), "
              f"{_c['rivers']} river(s) qualify, {_c['modules']} module(s) + {_c['orphan_modules']} river-less, "
              f"{_c['functions'] + _c['orphan_functions']} real (module,function) pair(s).")


if __name__ == '__main__':
    main()
