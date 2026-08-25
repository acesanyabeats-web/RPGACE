#!/usr/bin/env python3
"""
galaxy_map_alex_path.py — G37 of the ratified "RPGACE Total Systems
Galaxy Map" /CEO plan (Aug 15 2026). Real Alex ask: "a real Alex-bubble
decision-tree system - his own UI navigation path, Y/N at every real
fork." Given the session's own token/time constraint (Alex is running
low, heading to /Bedtime soon), this is a real SYNTHESIS of already-
computed real data (rule 8 — same precedent as /perspective's river-
level synthesis reports) rather than new detection work: for each of
the 12 real dashboard cards, trace the real dashboard-card frontend
flow to its real target module(s), then check whether that module owns
one of the 10 real Decisions-page (G26) gates — if so, the real Y/N
fork (trigger + logic) IS the decision point Alex actually hits walking
that path; if not, the path is honestly shown as gate-free.

**G82 audit (Aug 25 2026) — two real, separately-evidenced fixes, both
verified against the live data before changing anything:**

1. *Named modules were dead text.* The "Opens: …" step named each
   card's real target module(s) in plain text. Only a module that
   happened to OWN a decision gate got a link (via the fork block), so
   9 of the 12 cards named a real module and offered no way to reach
   it. Fixed by reusing the exact `_mod_link()` convention
   galaxy_map_supabase.py already uses — a real LEVEL3_MODULES member
   links to `galaxy_map_current.html#mod-<name>`, anything else
   (`dashDeck`, which is genuinely not one of the 45 tracked modules)
   correctly renders unlinked rather than as a dead anchor.

2. *A genuinely dead destination.* The no-module fallback read
   "(page navigation — see Level 4)". `galaxy_map_level4.html` was
   retired by G66 and no longer exists at all — and its successor
   `galaxy_map_zoom.html` was folded into Current by G74/G76, so that
   text pointed at nothing on either hop. The real dashboard-card-flow
   role retired into Level 2 (Module/G48, per galaxy_map_current.py's
   and galaxy_map_module.py's own notes), so the fallback now names the
   real `kind: 'page'` target the flow detector actually returned and
   links that card's own real river at Level 2. A card with genuinely
   NO resolved target at all (`research`) now says exactly that instead
   of claiming a page navigation the data never showed.
"""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import DASHBOARD_CARDS, compute_dashboard_card_flow
from graphify_river_group import LEVEL3_MODULES, RIVER_NAME  # noqa: E402
from graphify_river_group import inject_level_rail  # noqa: E402
from graphify_river_group import dimension_index_html, DIMENSION_INDEX_CSS  # noqa: E402
from galaxy_map_decisions import DECISION_POINTS

OUT = Path('graphify-out/galaxy_map_alex_path.html')

DP_BY_MODULE = {}
for dp in DECISION_POINTS:
    DP_BY_MODULE.setdefault(dp['module'], []).append(dp)


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


def _mod_link(mod):
    """Same real convention galaxy_map_supabase.py's own `_mod_link()`
    uses (rule 8 — reused, not a second one invented): a real tracked
    module gets its Current Series anchor, anything else stays honest
    plain text rather than a dead link."""
    if mod in LEVEL3_MODULES:
        return f'<a href="galaxy_map_current.html#mod-{esc(mod)}">{esc(mod)}</a>'
    return f'<span class="mod-untracked" title="Not one of the 45 river-tracked modules — no Current Series page of its own">{esc(mod)}</span>'


def _river_links(card):
    """A card's own real river(s), linked at the same Level-2 anchor
    every other page in this pipeline uses (`#river-N`)."""
    return ' · '.join(
        f'<a href="galaxy_map_module.html#river-{r}">'
        f'{esc(RIVER_NAME.get(r, f"River {r}").split("—")[0].strip())} · Level 2</a>'
        for r in card.get('rivers', [])
    )


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


def _flow_pages(card, flow):
    """The real `kind: 'page'` targets compute_dashboard_card_flow()
    returned for this card — previously discarded entirely by
    _flow_modules(), which is why 4 cards rendered a bare fallback."""
    entry = flow.get(card['key'], {'targets': []})
    return [t['page'] for t in entry['targets'] if t['kind'] == 'page']


def build_card_block(card, flow):
    mods = _flow_modules(card, flow)
    pages = _flow_pages(card, flow)
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
    # G82 — the real "what does this card actually open" line. Modules
    # link to their own Current Series section; a real page target is
    # named from the flow data itself; a card with neither says so.
    if mods:
        opens = 'Opens: ' + ', '.join(_mod_link(m) for m in mods)
        if pages:
            opens += (' <span class="alsopage">· also navigates to the real '
                      + ', '.join(f'<code>{esc(p)}</code>' for p in pages) + ' page</span>')
    elif pages:
        opens = ('Navigates to the real ' + ', '.join(f'<code>{esc(p)}</code>' for p in pages)
                 + ' page — no popup module of its own')
    else:
        opens = ('<span class="nogate">No real target resolved for this card by the dashboard-card '
                 'flow detector — neither a popup module nor a page navigation.</span>')
    river_line = _river_links(card)
    river_html = (f'<div class="pathriver">🌊 Its own river: {river_line}</div>' if river_line else '')
    return f'''<div class="pathcard">
  <div class="pathhead"><span class="cardicon">{esc(card["label"])}</span>{badge}</div>
  <div class="pathstep">🧑 Alex clicks the dashboard card</div>
  <div class="patharrow">↓</div>
  <div class="pathstep">{opens}</div>
  {river_html}
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
  .wrap{{max-width:1200px;margin:0 auto;padding:24px;display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}}
  .pathcard{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px}}
  .pathhead{{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}}
  .cardicon{{font-weight:700;font-size:13px}}
  .gatecount{{font-size:9px;font-weight:700;color:var(--red);background:rgba(226,84,84,0.1);padding:2px 8px;border-radius:10px}}
  .gatecount.none{{color:var(--dim);background:rgba(255,255,255,0.05)}}
  .pathstep{{font-size:11px;color:#c8c8d8}}
  .pathstep a{{color:var(--gold);text-decoration:none}}
  .pathstep a:hover{{text-decoration:underline}}
  .mod-untracked{{color:var(--dim)}}
  .alsopage{{color:var(--dim);font-size:10px}}
  .pathriver{{font-size:10px;color:var(--dim);margin-top:4px}}
  .pathriver a{{color:var(--gold);text-decoration:none}}
  .pathriver a:hover{{text-decoration:underline}}
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
{dim_css}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Alex's Decision Path (G37)</div>
  <h1>🧑 Alex's Real UI Navigation Path — Y/N At Every Real Fork</h1>
  <p>A real synthesis (rule 8, no new detection) of already-shipped Galaxy Map data: for each of the 12 real dashboard cards, the real dashboard-card frontend flow to its real target module(s), then whether that module owns one of the 10 real Decisions-page (G26) gates — the real Y/N fork Alex actually hits walking that path. A card with no gate is a straight click-through, shown honestly as such. Every named module links to its own Current Series section; a card that navigates to a page instead of opening a module says so, and links its own river at <a href="galaxy_map_module.html">Level 2</a>, where the dashboard-card-flow role itself retired (G48).</p>
</div>
<div class="wrap">{cards}</div>
{dim_index}

<div class="note">
  Generated by <code>scripts/galaxy_map_alex_path.py</code>, reusing <code>compute_dashboard_card_flow()</code> (the real dashboard-card flow, whose own page role retired into Level 2/Module per G48) and
  <code>DECISION_POINTS</code> (Decisions/G26) as-is — never re-derived. G37 of the ratified "RPGACE Total Systems Galaxy Map"
  /CEO plan. Mapping rules: <code>system_map_spec.md</code>.
</div>
</body>
</html>
"""


def main():
    flow = compute_dashboard_card_flow()
    cards_html = ''.join(build_card_block(c, flow) for c in DASHBOARD_CARDS)
    html = TEMPLATE.format(cards=cards_html,
                           dim_index=dimension_index_html(OUT.name),
                           dim_css=DIMENSION_INDEX_CSS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    n_with_gates = sum(1 for c in DASHBOARD_CARDS if any(DP_BY_MODULE.get(m) for m in _flow_modules(c, flow)))
    # G82 — real, measured destination coverage, printed so a future
    # build can never silently regress it (same fail-visible discipline
    # galaxy_map_externals.py/galaxy_map_logic_dimension.py print).
    linked = pageonly = untracked = none_n = 0
    for c in DASHBOARD_CARDS:
        mods = _flow_modules(c, flow)
        if any(m in LEVEL3_MODULES for m in mods):
            linked += 1
        elif _flow_pages(c, flow):
            pageonly += 1
        elif mods:
            untracked += 1
        else:
            none_n += 1
    print(f"Wrote {OUT} — {len(DASHBOARD_CARDS)} cards, {n_with_gates} with a real decision gate on their path.")
    print(f"  G82 destinations — {linked} card(s) link a real tracked module, {pageonly} name a real page target, "
          f"{untracked} name only an untracked module (honestly unlinked), {none_n} resolve to nothing at all; "
          f"all {len(DASHBOARD_CARDS)} link their own river at Level 2.")


if __name__ == '__main__':
    main()
