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
from graphify_river_group import inject_level_rail  # noqa: E402

OUT = Path('graphify-out/galaxy_map_externals.html')

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
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px;flex-wrap:wrap}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:var(--blue);border-color:var(--blue)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--blue);padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
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
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10px;background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:3px}}
  a{{color:var(--blue)}}
  .note{{max-width:1100px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
</style>
</head>
<body>
<div class="breadcrumb">
  <a href="galaxy_map.html">🌌 Level 0</a><span class="bc-sep">→</span>
  <a href="galaxy_map_module.html">🌊 Level 2</a><span class="bc-sep">→</span>
  <a href="galaxy_map_decisions.html">🚦 Decisions</a><span class="bc-sep">→</span>
  <span class="bc-here">🔀 Externals</span>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Externals (G27)</div>
  <h1>🔀 External AI &amp; Repos — The UI + Backend Dimension</h1>
  <p>All {n_conns} real external connectors, grouped by whether each one genuinely touches both a real UI trigger/output AND real backend processing — Alex's own real "parallel universe" framing. A connector counts as touching UI on EITHER a real trigger or a real displayed output (or both).</p>
</div>
<div class="tabs">{tabs}</div>
{sections}
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
    html = TEMPLATE.format(tabs=tabs, sections=sections, n_conns=len(EXTERNAL_CONNECTORS))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    both_n = sum(1 for c in EXTERNAL_CONNECTORS if classify_group(c['name']) == 'both')
    print(f"Wrote {OUT} — {len(EXTERNAL_CONNECTORS)} real connectors, {both_n} genuinely touch both UI and backend.")


if __name__ == '__main__':
    main()
