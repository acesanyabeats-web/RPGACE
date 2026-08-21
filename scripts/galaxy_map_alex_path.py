#!/usr/bin/env python3
"""
galaxy_map_alex_path.py — G37 of the ratified "RPGACE Total Systems
Galaxy Map" /CEO plan (Aug 15 2026). Real Alex ask: "a real Alex-bubble
decision-tree system - his own UI navigation path, Y/N at every real
fork." Given the session's own token/time constraint (Alex is running
low, heading to /Bedtime soon), this is a real SYNTHESIS of already-
computed real data (rule 8 — same precedent as /perspective's river-
level synthesis reports) rather than new detection work: for each of
the 12 real dashboard cards, trace the real Level-4 frontend flow to
its real target module(s), then check whether that module owns one of
the 10 real Decisions-page (G26) gates — if so, the real Y/N fork
(trigger + logic) IS the decision point Alex actually hits walking that
path; if not, the path is honestly shown as gate-free.
"""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import DASHBOARD_CARDS, compute_dashboard_card_flow
from graphify_river_group import inject_level_rail  # noqa: E402
from galaxy_map_decisions import DECISION_POINTS

OUT = Path('graphify-out/galaxy_map_alex_path.html')

DP_BY_MODULE = {}
for dp in DECISION_POINTS:
    DP_BY_MODULE.setdefault(dp['module'], []).append(dp)


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


def _flow_modules(card, flow):
    entry = flow.get(card['key'], {'targets': []})
    mods = []
    for t in entry['targets']:
        if t['kind'] == 'page':
            continue
        if t['module'] not in mods:
            mods.append(t['module'])
        if t.get('sub_injector') and t['sub_injector'][0] not in mods:
            mods.append(t['sub_injector'][0])
    return mods


def build_card_block(card, flow):
    mods = _flow_modules(card, flow)
    gates = []
    for m in mods:
        gates.extend(DP_BY_MODULE.get(m, []))
    if gates:
        forks = ''.join(
            f'<div class="fork">'
            f'<div class="fork-title">🚦 {esc(dp["title"])}</div>'
            f'<div class="fork-branch fork-y"><b>Y (trigger)</b> {esc(dp["trigger"])}</div>'
            f'<div class="fork-branch fork-n"><b>Real logic</b> {esc(dp["logic"])}</div>'
            f'<a class="fork-link" href="galaxy_map_current.html#mod-{esc(dp["module"])}">🔽 {esc(dp["module"])}.{esc(dp["func"])}() — Current Series</a>'
            f'</div>'
            for dp in gates
        )
        badge = f'<span class="gatecount">{len(gates)} real gate(s)</span>'
    else:
        forks = '<div class="nogate">No real decision gate on this path — a straight click-through, no Y/N fork.</div>'
        badge = '<span class="gatecount none">no gates</span>'
    return f'''<div class="pathcard">
  <div class="pathhead"><span class="cardicon">{esc(card["label"])}</span>{badge}</div>
  <div class="pathstep">🧑 Alex clicks the dashboard card</div>
  <div class="patharrow">↓</div>
  <div class="pathstep">Opens: {", ".join(esc(m) for m in mods) if mods else "(page navigation — see Level 4)"}</div>
  <div class="patharrow">↓</div>
  {forks}
</div>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Alex's Decision Path)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --red:#E25454; --green:#3DAA6E; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #1a1010 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--red);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:900px;margin:0 auto}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px;flex-wrap:wrap}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:var(--red);border-color:var(--red)}}
  .breadcrumb .bc-here{{color:#1a0404;background:var(--red);padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
  .wrap{{max-width:1200px;margin:0 auto;padding:24px;display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}}
  .pathcard{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px}}
  .pathhead{{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}}
  .cardicon{{font-weight:700;font-size:13px}}
  .gatecount{{font-size:9px;font-weight:700;color:var(--red);background:rgba(226,84,84,0.1);padding:2px 8px;border-radius:10px}}
  .gatecount.none{{color:var(--dim);background:rgba(255,255,255,0.05)}}
  .pathstep{{font-size:11px;color:#c8c8d8}}
  .patharrow{{text-align:center;color:var(--dim);font-size:11px;margin:2px 0}}
  .fork{{background:rgba(226,84,84,0.05);border-left:2px solid var(--red);border-radius:6px;padding:8px 10px;margin-top:8px}}
  .fork-title{{font-size:11px;font-weight:700;color:#fff;margin-bottom:5px}}
  .fork-branch{{font-size:10.5px;color:#b8b8c8;line-height:1.5;margin-top:3px}}
  .fork-branch b{{color:var(--green)}}
  .fork-branch.fork-n b{{color:var(--gold)}}
  .fork-link{{display:inline-block;margin-top:6px;font-size:10px;color:var(--red);text-decoration:none}}
  .fork-link:hover{{text-decoration:underline}}
  .nogate{{font-size:10.5px;color:var(--dim);font-style:italic;margin-top:6px}}
  .note{{max-width:1200px;margin:24px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  a{{color:var(--red)}}
</style>
</head>
<body>
<div class="breadcrumb">
  <a href="galaxy_map_dimensions.html">🧭 Dimensions Matrix</a><span class="bc-sep">→</span>
  <span class="bc-here">🧑 Alex's Decision Path</span>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Alex's Decision Path (G37)</div>
  <h1>🧑 Alex's Real UI Navigation Path — Y/N At Every Real Fork</h1>
  <p>A real synthesis (rule 8, no new detection) of already-shipped Galaxy Map data: for each of the 12 real dashboard cards, the real Level-4 frontend flow to its real target module(s), then whether that module owns one of the 10 real Decisions-page (G26) gates — the real Y/N fork Alex actually hits walking that path. A card with no gate is a straight click-through, shown honestly as such.</p>
</div>
<div class="wrap">{cards}</div>
<div class="note">
  Generated by <code>scripts/galaxy_map_alex_path.py</code>, reusing <code>compute_dashboard_card_flow()</code> (Level 4) and
  <code>DECISION_POINTS</code> (Decisions/G26) as-is — never re-derived. G37 of the ratified "RPGACE Total Systems Galaxy Map"
  /CEO plan. Mapping rules: <code>system_map_spec.md</code>.
</div>
</body>
</html>
"""


def main():
    flow = compute_dashboard_card_flow()
    cards_html = ''.join(build_card_block(c, flow) for c in DASHBOARD_CARDS)
    html = TEMPLATE.format(cards=cards_html)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    n_with_gates = sum(1 for c in DASHBOARD_CARDS if any(DP_BY_MODULE.get(m) for m in _flow_modules(c, flow)))
    print(f"Wrote {OUT} — {len(DASHBOARD_CARDS)} cards, {n_with_gates} with a real decision gate on their path.")


if __name__ == '__main__':
    main()
