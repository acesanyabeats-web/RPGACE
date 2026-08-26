#!/usr/bin/env python3
"""
galaxy_map_externals.py — G27 of the ratified "RPGACE Total Systems
Galaxy Map" /CEO plan (Aug 14 2026). Real, curated build of the
"external AI/repo touching both UI and backend" dimension Alex asked
for, via /interrogation (4 AskUserQuestion answers, all recommended):
1. A new standalone page (matches G26's Decisions pattern), cross-
   linked into the existing Level 0/2 connector nodes, not duplicating
   them.
2. A connector counts as touching UI on EITHER real signal — a real
   button/action that directly triggers it (the INPUT side), or its
   own real output being displayed somewhere Alex sees (the OUTPUT
   side) — selected both, so either evidence type qualifies.
3. (G28, separate file) skills get a real curated write-up reusing
   ai_tooling_and_rules_map.md.
4. Two separate pages, not combined — external connectors (running
   code) and Claude Code skills (reasoning procedures) are genuinely
   different actor types.

Real data source, never invented: builds on EXTERNAL_CONNECTORS
(graphify_river_group.py, already-sourced 13 real connectors) plus
direct code-grepped trigger evidence for the connectors this session
already has real function-level detection for (Composio via
compute_external_call_sites, Oracle via compute_oracle_call_counts) —
the rest are classified from EXTERNAL_CONNECTORS' own real 'via'/'note'
fields (already-sourced facts from prior real passes), honestly marked
as connector-level evidence rather than function-level where that's
all that exists. A connector with genuinely no real UI evidence either
way (dormant/deferred) is placed in its own honest category, never
guessed into "both" to look more complete.
"""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import EXTERNAL_CONNECTORS  # noqa: E402
from graphify_river_group import EXTERNAL_RIVER_LINKS, RIVER_MODULES, RIVER_NAME  # noqa: E402
from graphify_river_group import inject_level_rail  # noqa: E402
from graphify_river_group import dimension_index_html, DIMENSION_INDEX_CSS  # noqa: E402
# G99 (Aug 25 2026) — the G91-continuation Oracle river/module/function
# drill-down that used to live here has moved to its own real dedicated
# page, galaxy_map_oracle.py, now that Oracle is its own real L0 unit
# (retiring "External AI" as an L0 grouping). Removed here rather than
# left duplicated — rule 8. See galaxy_map_oracle.py for that content.
# Rule 8 — the real connector -> own-galaxy-page mapping already exists
# in galaxy_map.py (G78/G81's roster). Imported, never re-typed here, so
# a future change to a CC unit's own page lands in one place.
from galaxy_map import CC_UNIT_LINK, CC_UNIT_CONNECTOR  # noqa: E402

OUT = Path('graphify-out/galaxy_map_externals.html')

# ── G82 (Aug 25 2026) — real per-connector DESTINATION resolution.
#
# The real gap this closes, stated precisely rather than from memory:
# every connector card below already rendered real, specific, evidenced
# prose — EXTERNAL_CONNECTORS' own `via` (often naming a real file/
# function) and `note` (often naming a real triggering module, e.g.
# "River V's morningBrief (Gmail fetch)", "refCorpus.findMatches()'s
# real fallback", "Content Production Live's 'Generate Video'") — and
# NONE of it was ever clickable. A reader could see which module a
# connector really lands on and had no way to go there.
#
# Same evidentiary discipline as G81's External-AI migration rows
# (galaxy_map.py `_resolve_migration_targets`), deliberately reused
# rather than reinvented — normalized-substring matching of a real
# module name against that connector's OWN prose, with candidates
# restricted to the modules of the rivers EXTERNAL_RIVER_LINKS already
# attributes to that connector. That restriction is what stops a stray
# substring in one connector's prose resolving to an unrelated river's
# module. Two real differences from G81, both deliberate:
#   * the prose searched here is `EXTERNAL_RIVER_LINKS.via` PLUS the
#     connector's own `EXTERNAL_CONNECTORS.note`/`.via` — G81 only had
#     the river-link row. Real, measured effect: OpenMontage resolves
#     to `contentProductionLive` (its connector note names "Content
#     Production Live's 'Generate Video'"), which the river-link row
#     alone does not name.
#   * a 3rd real destination axis G81 has no equivalent for — the
#     connector's own `bridges_to` naming a separate operated galaxy
#     that genuinely has its OWN page in this map.
#
# Resolution order, deepest real destination first (never invented):
#   1. module grain -> galaxy_map_current.html#mod-<name>
#   2. river grain  -> galaxy_map_module.html#river-<n>   (same Level-2
#      anchor convention G81 already established; Level 1 has no
#      per-river anchor)
#   3. honest "no known destination" with a real, sourced reason read
#      off that connector's own row — never a fabricated link.
# The galaxy-page link (below) is ADDITIVE, shown alongside 1/2/3, not
# a substitute for them.
_RIVER_LINK_BY_NAME = {l['name']: l for l in EXTERNAL_RIVER_LINKS}
# Real, sourced inversion of galaxy_map.py's own CC roster: connector
# name -> that actor's own page. A self-link is dropped at render time
# (Graphify CC's own CC_UNIT_LINK entry IS this page — checked, not
# assumed), so it is honestly reported as "no separate galaxy page"
# rather than linking the reader back to where they already are.
_CONNECTOR_GALAXY_PAGE = {
    CC_UNIT_CONNECTOR[k]: CC_UNIT_LINK[k]
    for k in CC_UNIT_CONNECTOR if k in CC_UNIT_LINK
}


def _norm(s):
    """Lowercase, alphanumerics only — so a connector's own prose
    ("River XI's Beat Log", "Content Production Live's") matches a real
    module name (`beatLog`, `contentProductionLive`) without either
    side being re-typed. Same helper shape as galaxy_map.py's
    `_mig_norm` (rule 8: same idea, and it is 3 lines — imported would
    have meant importing a private name across files for no real
    saving)."""
    return ''.join(ch for ch in (s or '').lower() if ch.isalnum())


def _river_short(r):
    """'River XI — Content Production Live' -> 'River XI'."""
    return RIVER_NAME.get(r, f'River {r}').split('—')[0].strip()


def resolve_destinations(conn):
    """Real, per-connector destination resolution — returns
    (targets, galaxy_page_or_None, no_destination_reason_or_None).

    `targets` is [(river_number, module_name_or_None), ...] in that
    connector's own EXTERNAL_RIVER_LINKS river order. Empty when the
    connector has no river-link row at all, in which case
    `no_destination_reason` carries the real, sourced reason."""
    link_row = _RIVER_LINK_BY_NAME.get(conn['name'])

    # Real, sourced galaxy-page axis. Gated on the connector actually
    # being wired: OpenArt's own bridges_to text names OpenMontage ("a
    # named future companion galaxy to OpenMontage") while its status
    # is `deferred` and its via is literally `none yet` — linking it to
    # OpenMontage's page would claim a connection its own row says does
    # not exist. That gate is read off the row, not hand-listed.
    galaxy_page = None
    if conn.get('via') != 'none yet' and not (conn.get('status') or '').startswith('deferred'):
        bridges_norm = _norm(conn.get('bridges_to'))
        for cname, page in sorted(_CONNECTOR_GALAXY_PAGE.items()):
            if page == OUT.name:
                continue  # real self-link — honestly reported, never rendered
            if _norm(cname) in bridges_norm:
                galaxy_page = page
                break

    if not link_row:
        reason = (f"No EXTERNAL_RIVER_LINKS row exists for this connector. Its own real trigger path is "
                  f"<code>{esc(conn['via'])}</code> and its own status is <code>{esc(conn['status'])}</code> — "
                  f"no river number is claimed here rather than one being guessed in.")
        return [], galaxy_page, reason

    prose = _norm(' '.join([link_row.get('via', ''), conn.get('note', ''), conn.get('via', '')]))
    targets = []
    for r in link_row['rivers']:
        best = None
        for m in RIVER_MODULES.get(r, ()):
            if _norm(m) in prose and (best is None or len(m) > len(best)):
                best = m
        targets.append((r, best))
    return targets, galaxy_page, None

# Real, evidence-checked per-connector classification. `ui_in` = a real
# button/action triggers it; `ui_out` = its own real output is shown
# somewhere Alex sees. Both fields cite the real evidence, never a bare
# true/false with no reason.
CLASSIFICATION = {
    'Anthropic (Claude API)': {
        'ui_in': 'Every real "Send" action in Oracle chat (main.js sendChat/callOracle) is a direct real trigger.',
        'ui_out': "Oracle's own reply renders directly in the chat UI — the single most-used real output path in the app.",
    },
    'OpenMontage': {
        'ui_in': 'A real "Generate Video" button (contentProductionLive._generateVideo) queues a real openmontage_jobs row.',
        'ui_out': 'Real job status shown via "View Kling Project" / the honest manual "Mark ConID as Filmed" acknowledgment (openmontage_jobs is polled, not pushed).',
    },
    'Composio': {
        'ui_in': 'Real, grep-confirmed trigger: opening the "🌅 Morning Brief" dashboard card runs morningBrief._generate() → _getGmail()/_getYouTube() (real RPGACE.api() calls); contentRepurpose._injectAgentButtons() wires a second real trigger.',
        'ui_out': "Real Gmail/YouTube data rendered directly inside the Morning Brief popup's own output.",
    },
    'Moonshot AI (Kimi)': {
        'ui_in': None, 'ui_out': None,
        'note': 'Dormant — a real OpenAI-compatible scaffold exists in api/oracle.js, but no MOONSHOT_API_KEY is configured, so no real call has ever fired. Honestly placed in neither category.',
    },
    'OpenAI (Luna)': {
        'ui_in': None, 'ui_out': None,
        'note': 'Dormant — same real scaffold shape as Kimi, same honest absence of a live key.',
    },
    'librosa': {
        'ui_in': 'Optional/local — real beat_audio_jobs queueing exists, but the actual analysis runs on Alex\'s own machine via local_server.py, not inside the deployed webapp.',
        'ui_out': None,
        'note': 'Real, but genuinely partial — the trigger is real app code, the actual processing step is honestly outside RPGACE\'s own UI entirely.',
    },
    'FFmpeg': {
        'ui_in': None,
        'ui_out': None,
        'note': "No direct RPGACE UI trigger of its own — it's invoked BY OpenMontage's own external pipeline, not by a button in this app. Real, but indirect (reached through OpenMontage, not directly).",
    },
    'OpenArt': {
        'ui_in': None, 'ui_out': None,
        'note': 'Deferred — no real integration exists yet at all.',
    },
    'Graphify CC': {
        'ui_in': None,
        'ui_out': 'Real: galaxy_map*.html/graph.html/GRAPH_TREE.html/obsidian_vault.html — all real Graphify CC output — render directly inside the live Oversight popup.',
        'note': 'No real RPGACE webapp UI trigger — it\'s driven by a separate Claude Code session writing to graphify_jobs, never a button Alex clicks inside the app itself. Real output-only.',
    },
    'Jina AI': {
        'ui_in': 'Real, grep-confirmed call sites: scout.js/bookworm-fetch.js/main.js/_context.js — fired by real UI actions (adding a research reference, a Bookworm PDF/URL import).',
        'ui_out': 'The fetched page content is processed directly into a real Content Intelligence report / Bookworm chapter shown in-app.',
    },
    'Last.fm': {
        'ui_in': 'Real: refCorpus.findMatches()\'s own fallback, triggered by Beat Log\'s real "Find Artists" flow.',
        'ui_out': 'Matched artists render directly inside Beat Log\'s own real output.',
    },
    'n8n': {
        'ui_in': None,
        'ui_out': 'Indirect — the real rota sync (Cron → scripts/fourth_rota.py) updates data that then appears in the Schedule page, but n8n itself has no direct button trigger.',
        'note': 'Built but unconfirmed against a real live run — real, honest limitation, not hidden.',
    },
    'Whisper (OpenAI, local)': {
        'ui_in': None,
        'ui_out': 'Indirect — real transcripts feed into a Content Intelligence report shown in-app, but Whisper itself runs via a manual local Python script outside RPGACE\'s own UI entirely.',
        'note': 'Real and historically confirmed working (patch_notes.html, July 7), but current live status is genuinely unconfirmed this session.',
    },
}


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


def classify_group(name):
    c = CLASSIFICATION.get(name, {})
    if c.get('ui_in') and c.get('ui_out'):
        return 'both'
    if c.get('ui_in') or c.get('ui_out'):
        return 'partial'
    return 'inactive'


GROUPS = [
    {'id': 'both', 'label': '🔀 Touches Both UI and Backend', 'role': 'A real button/action triggers it AND its own real output is shown somewhere Alex sees — the genuine "dual dimension" Alex asked G27 to surface.'},
    {'id': 'partial', 'label': '➡️ Touches Only One Side', 'role': 'Real, but honestly one-sided — either a real trigger with no real in-app output, or real output with no real in-app trigger (often because the trigger/processing happens outside RPGACE\'s own webapp entirely).'},
    {'id': 'inactive', 'label': '⚪ Not Yet Active', 'role': 'Dormant or deferred — real scaffolding may exist, but no real live UI or backend touch has actually fired yet.'},
]


def build_destination_block(conn):
    """G82 — the real, clickable "where does this connector actually
    land" block. Every link below resolves from real already-sourced
    data (EXTERNAL_RIVER_LINKS / EXTERNAL_CONNECTORS' own prose); a
    connector with no real resolvable destination says so plainly."""
    targets, galaxy_page, reason = resolve_destinations(conn)
    parts = []
    grains = []
    for r, mod in targets:
        if mod:
            parts.append(f'<a href="galaxy_map_current.html#mod-{esc(mod)}">{esc(_river_short(r))}’s <code>{esc(mod)}</code></a>')
            grains.append('module')
        else:
            parts.append(f'<a href="galaxy_map_module.html#river-{r}">{esc(_river_short(r))}</a>')
            grains.append('river')
    out = []
    if parts:
        if all(g == 'module' for g in grains):
            grain_note = 'module grain — its own prose names a real module in that river'
        elif all(g == 'river' for g in grains):
            grain_note = 'river grain — its own prose names no module in that river'
        else:
            grain_note = 'mixed grain — module where its own prose names one, river where it does not'
        out.append('<div class="dblock"><div class="dlabel">Real destination</div>'
                   f'<p>🔽 Lands on {" + ".join(parts)} '
                   f'<span class="ev">Resolved at {grain_note}, from '
                   f'<code>EXTERNAL_RIVER_LINKS</code> + this connector\'s own <code>note</code>/<code>via</code>.</span></p></div>')
    else:
        out.append('<div class="dblock"><div class="dlabel">Real destination</div>'
                   f'<p>⚪ No known in-app destination. <span class="ev">{reason}</span></p></div>')
    if galaxy_page:
        out.append('<div class="dblock"><div class="dlabel">Its own galaxy</div>'
                   f'<p>🌌 <a href="{esc(galaxy_page)}">{esc(galaxy_page)}</a> '
                   f'<span class="ev">Real source: this connector\'s own <code>bridges_to</code> names a separately-'
                   f'operated galaxy that genuinely has its own page in this map.</span></p></div>')
    return ''.join(out)


def build_connector_card(conn):
    c = CLASSIFICATION.get(conn['name'], {})
    rows = []
    if c.get('ui_in'):
        rows.append(f'<div class="dblock"><div class="dlabel">Real UI trigger (input side)</div><p>{esc(c["ui_in"])}</p></div>')
    if c.get('ui_out'):
        rows.append(f'<div class="dblock"><div class="dlabel">Real UI output (display side)</div><p>{esc(c["ui_out"])}</p></div>')
    if c.get('note'):
        rows.append(f'<div class="dblock"><div class="dlabel">Honest note</div><p>{esc(c["note"])}</p></div>')
    return f'''<div class="ccard">
  <div class="chead2"><h3>{esc(conn['name'])}</h3><span class="cstatus cstatus-{esc(conn['status']).replace(' ', '-').replace('/', '-')}">{esc(conn['status'])}</span></div>
  <div class="dblock"><div class="dlabel">Real connection point</div><p><code>{esc(conn['via'])}</code></p></div>
  <div class="dblock"><div class="dlabel">Bridges to</div><p>{esc(conn['bridges_to'])}</p></div>
  {build_destination_block(conn)}
  {''.join(rows)}
  <div class="dblock"><div class="dlabel">Full real note</div><p>{esc(conn['note'])}</p></div>
</div>'''


def build_group_section(grp):
    conns = [c for c in EXTERNAL_CONNECTORS if classify_group(c['name']) == grp['id']]
    cards = ''.join(build_connector_card(c) for c in conns)
    return f'''<section class="gsection" id="grp-{grp['id']}" style="display:none">
  <div class="ghead"><h2>{grp['label']}</h2><span class="gcount">{len(conns)} real connector(s)</span></div>
  <p class="grole">{grp['role']}</p>
  <div class="cgrid">{cards}</div>
</section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Externals — UI + Backend Dimension)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --blue:#5FB3D9; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #0d1a1e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--blue);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto}}
  .tabs{{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}}
  .tab{{padding:6px 14px;border-radius:16px;font-size:11.5px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .tab.active{{background:var(--blue);color:#0a0a0f;font-weight:700}}
  .gsection{{max-width:1100px;margin:0 auto;padding:24px}}
  .ghead{{display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap}}
  .ghead h2{{font-family:Georgia,serif;font-size:20px;color:#fff}}
  .gcount{{font-size:10px;color:var(--blue);font-weight:700}}
  .grole{{font-size:11.5px;color:var(--dim);line-height:1.6;margin-bottom:18px}}
  .cgrid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}}
  .ccard{{background:rgba(255,255,255,0.03);border:1px solid rgba(95,179,217,0.18);border-radius:10px;padding:16px 18px}}
  .chead2{{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}}
  .chead2 h3{{font-size:13px;color:#fff}}
  .cstatus{{font-size:8.5px;font-weight:700;padding:2px 7px;border-radius:8px;background:rgba(255,255,255,0.06);color:var(--dim);text-transform:uppercase}}
  .dblock{{margin-top:8px}}
  .dlabel{{font-size:9px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:var(--blue);margin-bottom:3px}}
  .dblock p{{font-size:10.5px;line-height:1.55;color:#c8c8d8}}
  /* G82 — the same real evidence-caption treatment galaxy_map.py's own
     facet rows already use (rule 8: same convention, not a new one). */
  .ev{{color:var(--dim);display:block;margin-top:4px;font-size:9.5px;line-height:1.5}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10px;background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:3px}}
  a{{color:var(--blue)}}
  .note{{max-width:1100px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
{infra_dd_css}
{dim_css}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Externals (G27)</div>
  <h1>🔀 External AI &amp; Repos — The UI + Backend Dimension</h1>
  <p>All {n_conns} real external connectors, grouped by whether each one genuinely touches both a real UI trigger/output AND real backend processing — Alex's own real "parallel universe" framing. A connector counts as touching UI on EITHER a real trigger or a real displayed output (or both).</p>
</div>
<div class="tabs">{tabs}</div>
{sections}
{dim_index}

<div class="note">
  Generated by <code>scripts/galaxy_map_externals.py</code> — real data from <code>graphify_river_group.py</code>'s
  <code>EXTERNAL_CONNECTORS</code> (already-sourced), with real trigger/output evidence layered on top (function-
  level grep for Anthropic/Composio/Jina/Last.fm, connector-level for the rest — honestly marked either way).
  G27 of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan. Mapping rules: <code>system_map_spec.md</code>.
</div>
<script>
(function() {{
  var tabs = document.querySelectorAll('.tab');
  var sections = document.querySelectorAll('.gsection');
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
}})();
</script>
</body>
</html>
"""


def main():
    tabs = ''.join(f'<div class="tab" data-target="grp-{g["id"]}">{g["label"]}</div>' for g in GROUPS)
    sections = ''.join(build_group_section(g) for g in GROUPS)
    html = TEMPLATE.format(tabs=tabs, sections=sections, n_conns=len(EXTERNAL_CONNECTORS),
                           dim_index=dimension_index_html(OUT.name),
                           dim_css=DIMENSION_INDEX_CSS, infra_dd_css='')
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    both_n = sum(1 for c in EXTERNAL_CONNECTORS if classify_group(c['name']) == 'both')
    # G82 — real, measured destination coverage, printed so a build can
    # never silently regress it (same fail-visible discipline the other
    # generators' own counts already provide).
    mod_n = riv_n = none_n = gal_n = 0
    for c in EXTERNAL_CONNECTORS:
        targets, galaxy_page, _reason = resolve_destinations(c)
        if galaxy_page:
            gal_n += 1
        if not targets:
            none_n += 1
        elif any(m for _r, m in targets):
            mod_n += 1
        else:
            riv_n += 1
    print(f"Wrote {OUT} — {len(EXTERNAL_CONNECTORS)} real connectors, {both_n} genuinely touch both UI and backend.")
    print(f"  G82 destinations — {mod_n} module-grain, {riv_n} river-grain, {none_n} honestly none; "
          f"{gal_n} also link to their own galaxy page.")


if __name__ == '__main__':
    main()
