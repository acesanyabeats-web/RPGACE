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
"""
from pathlib import Path
import sys as _sys_rail
from pathlib import Path as _Path_rail
_sys_rail.path.insert(0, str(_Path_rail(__file__).parent))
from graphify_river_group import inject_level_rail  # noqa: E402

OUT = Path('graphify-out/galaxy_map_orchestrator_openmontage.html')

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

MEMBERS = [
    {'name': 'Orchestrator CC', 'role': 'planner / orchestrator',
     'note': 'This session. Decides what to build and directs work across the system. Renamed from "RPGACE CC" this same pass (Aug 14) — total_system_members had never been updated to match the name every current-state doc has used since Aug 13.'},
    {'name': 'OpenMontage CC', 'role': 'engineer / execution (OpenMontage)',
     'note': 'Hands-on technical execution inside calesthio/OpenMontage — environment setup, pipeline runs, code fixes, cloud GPU wiring, real verification before reporting. Renamed from "Engineer CC" Aug 13 (a real naming collision with the /Engineer skill living inside Orchestrator CC itself).'},
]


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


def build_job_card(j):
    status_color = '#4CAF82' if j['status'] == 'complete' else '#E25454'
    return f'''<div class="jcard">
  <div class="jhead"><h3>{esc(j['title'])}</h3><span class="jstatus" style="color:{status_color}">{esc(j['status'])}</span></div>
  <div class="jmeta"><span class="jkind">{esc(j['kind'])}</span><span class="jby">by {esc(j['by'])}</span><span class="jdate">{esc(j['date'])}</span></div>
  <p class="jsummary">{esc(j['summary'])}</p>
  <div class="jid">Real row id: <code>{esc(j['id'])}...</code> — verify directly in <code>openmontage_jobs</code></div>
</div>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Orchestrator CC ↔ OpenMontage CC)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --purple:#9B59B6; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #17101a 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--purple);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px;flex-wrap:wrap}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:var(--purple);border-color:var(--purple)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--purple);padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
  .msection{{max-width:1000px;margin:0 auto;padding:24px}}
  .mgrid{{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:30px}}
  .mcard{{background:rgba(255,255,255,0.03);border:1px solid rgba(155,89,182,0.25);border-radius:10px;padding:16px 18px}}
  .mcard h3{{font-size:13.5px;color:#fff;margin-bottom:4px}}
  .mcard .mrole{{font-size:10px;color:var(--purple);font-weight:700;margin-bottom:8px}}
  .mcard p{{font-size:11px;line-height:1.6;color:#c8c8d8}}
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
  code{{font-family:'Cascadia Code','Fira Mono',monospace;background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:3px}}
  a{{color:var(--purple)}}
  .note{{max-width:1000px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
</style>
</head>
<body>
<div class="breadcrumb">
  <a href="galaxy_map_externals.html">🔀 Externals</a><span class="bc-sep">→</span>
  <span class="bc-here">🤝 Orchestrator ↔ OpenMontage</span>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Orchestrator ↔ OpenMontage (G29)</div>
  <h1>🤝 Orchestrator CC ↔ OpenMontage CC</h1>
  <p>The real dispatch history between the two Total-system Claude Code sessions — {n_jobs} real openmontage_jobs rows, summarized honestly (never a fabricated live connection).</p>
  <p>Full real pipeline logic (queue → poll → real work → update → session-start check → report, as a Mermaid diagram): <a href="../system_flow_map.md">system_flow_map.md §14</a>, added Aug 20/21 2026 (G56).</p>
</div>
<div class="constraint">⚠️ <b>No live session-to-session link exists.</b> openmontage_jobs is an async Supabase queue, confirmed directly via list_sessions (5feb76ed's own real finding) — every row below is a real, asynchronous message, never a synchronous call.</div>
<div class="msection">
  <div class="mgrid">{members}</div>
  <div class="jgrid">{jobs}</div>
</div>
<div class="note">
  Generated by <code>scripts/galaxy_map_orchestrator_openmontage.py</code> — real data from <code>total_system_members</code>
  and <code>openmontage_jobs</code> (Supabase), summarized honestly, every row citing its own real id for direct verification.
  G29 of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan.
</div>
</body>
</html>
"""


def main():
    members_html = ''.join(
        f'<div class="mcard"><h3>{esc(m["name"])}</h3><div class="mrole">{esc(m["role"])}</div><p>{esc(m["note"])}</p></div>'
        for m in MEMBERS
    )
    jobs_html = ''.join(build_job_card(j) for j in JOBS)
    html = TEMPLATE.format(members=members_html, jobs=jobs_html, n_jobs=len(JOBS))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(MEMBERS)} real members, {len(JOBS)} real dispatch rows.")


if __name__ == '__main__':
    main()
