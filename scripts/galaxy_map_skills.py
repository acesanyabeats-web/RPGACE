#!/usr/bin/env python3
"""
galaxy_map_skills.py — G28 of the ratified "RPGACE Total Systems Galaxy
Map" /CEO plan (Aug 14 2026). Real, curated build of "skills interact
with external AI, UI, and backend" — Alex's own 4th dimension. Via
/interrogation (real answers): a curated write-up per skill, reusing
ai_tooling_and_rules_map.md's own already-sourced skill catalog (Tier
1c's flat list + the Galaxy Development Framework's own named skills)
rather than inventing a new list, and two separate pages from G27
(external connectors are running code; skills are Claude-Code-session
reasoning procedures — genuinely different actor types).

Real, honest classification method, stated plainly (this is judgment,
not a grep — no mechanical detector can read a skill's own prose): 3
real axes, deliberately narrower than "does this skill exist" —
  🔮 External AI — the skill's OWN documented procedure explicitly
     dispatches to a DIFFERENT real AI system as part of its work
     (RPGACE's own Oracle, or a Total-system member — OpenMontage
     CC/Graphify CC) — NOT "Claude Code itself runs this skill," which
     would trivially make every skill qualify and mean nothing.
  🖥️ UI — the skill's real output changes/touches RPGACE's own app UI
     (a page, button, rendered behavior a viewer would see).
  🗄️ Backend — the skill's real output changes/touches code logic,
     Supabase data, or a real oversight doc.
Sourced from each skill's own real, already-documented behavior
(ai_tooling_and_rules_map.md / CLAUDE.md's own "Invokable frameworks"
section) — a real judgment call per skill, same curation discipline as
Level 5's decision points, not mechanically derived.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import SKILL_SECONDARY_RIVER, RIVER_NAME  # noqa: E402

OUT = Path('graphify-out/galaxy_map_skills.html')

# G46 (Aug 18 2026, real Part 4F/10 ask — "skills should be treated same
# as supabase," i.e. its own documented Level/River usage). Real reuse,
# not re-derived (rule 8): every real skill lives in River XIII by
# default (its own full 25-skill catalog, already built at
# galaxy_map_module.py's River XIII section); SKILL_SECONDARY_RIVER adds
# a real citation for the 7 skills whose own description names a
# SPECIFIC other river. "Level" is honestly N/A for a skill — skills
# document Orchestrator CC's own dev process, not runtime app code, so
# no Level 0-6 grain applies; stated plainly rather than forced.

# Real, curated classification — {name: {ai, ui, backend, note}}.
# ai/ui/backend are bool; note is the real, short justification.
SKILLS = {
    'Engineer': {'ai': False, 'ui': True, 'backend': True,
                 'note': 'Executes real builds through Omnitrix (Opus builds/Sonnet reviews) — frequently changes real app UI and always touches real code/Supabase.'},
    'Regeneration': {'ai': False, 'ui': False, 'backend': True,
                      'note': 'Taxonomy-tree quality sweep — real Supabase reads/scoring, human-gated writes, no direct UI change of its own.'},
    'restructure': {'ai': False, 'ui': False, 'backend': True,
                     'note': 'A real evolution-debate over infrastructure choices — produces a written verdict, not a direct code/UI change itself.'},
    'free-for-all-debate': {'ai': False, 'ui': False, 'backend': False,
                             'note': 'Pure deliberation procedure — individual competitors argue real problems, no direct system touch of its own.'},
    'loggingregen': {'ai': False, 'ui': False, 'backend': True,
                      'note': 'Regenerates one oversight doc against its own stated role + dedup discipline — real doc writes, no runtime UI.'},
    'scope': {'ai': False, 'ui': False, 'backend': True,
              'note': 'Gathers real git/Supabase evidence into grouped categories — a real evidence pass, no direct write of its own.'},
    'debate': {'ai': False, 'ui': False, 'backend': False,
               'note': 'Structured adversarial case-building — a real deliberation output, not a system touch.'},
    '5thDimension': {'ai': False, 'ui': False, 'backend': True,
                      'note': 'Built-vs-reported reconciliation across real code/Supabase/docs — the heaviest evidence pass short of /paranoia, real doc updates follow from it.'},
    'Routine': {'ai': False, 'ui': False, 'backend': True,
                'note': 'Session-start Top-10 backlog debate — writes a real dated record file, no direct UI/code change itself.'},
    'Summary': {'ai': False, 'ui': False, 'backend': False,
                'note': 'A verified recap of recent work — real evidence-checked, but produces a report, not a system change.'},
    'Bedtime': {'ai': False, 'ui': False, 'backend': True,
                'note': 'Session-end ritual — real writes across all seven oversight docs + Chronicles (system_updates).'},
    'impeccable': {'ai': False, 'ui': True, 'backend': False,
                    'note': "Runs a real free design-pattern scan against index.html/style.css — reports on real UI anti-patterns, doesn't fix them itself."},
    'interrogation': {'ai': False, 'ui': False, 'backend': False,
                       'note': 'Real questions-before-building discipline — a procedure, not a system touch (this exact skill built G26/G27/G28).'},
    'paranoia': {'ai': True, 'ui': False, 'backend': True,
                 'note': 'The heaviest scrutiny pass — runs Aintergration/restructure/GODMODE/5thDimension/debate/interrogation/Council-of-5 in sequence; real evidence-checked outputs feed real doc/code changes. Counted 🔮 since its own procedure explicitly folds in real Oracle-grounded reasoning steps via 5thDimension.'},
    'investor': {'ai': False, 'ui': False, 'backend': False,
                 'note': 'A commercial-readiness judgment lens/persona — a real report, not a system touch.'},
    'update-logging-system': {'ai': False, 'ui': False, 'backend': True,
                               'note': 'The change-type -> required-artifact checklist itself — real doc-completeness enforcement, no UI.'},
    'drift': {'ai': False, 'ui': False, 'backend': False,
              'note': 'Checks real work against a real stated plan — VERDICT+BASIS output, a real evidence check, not a direct write.'},
    'CEO': {'ai': True, 'ui': True, 'backend': True,
            'note': 'The whole meta-framework governing this multi-day build — real Total-system dispatch (Engineer CC/Graphify CC = external AI), real shipped UI (every Galaxy Map page), real Supabase datasheet (ceo_plans/ceo_plan_items/ceo_reports). The one skill that genuinely touches all 3 axes at once.'},
    'colourgradient': {'ai': False, 'ui': True, 'backend': True,
                        'note': 'A real green/red/yellow/blue/purple build-status benchmark, rendered as an optional HTML artifact — real Supabase read (ceo_plan_items), real optional UI output.'},
    'decompress': {'ai': False, 'ui': True, 'backend': True,
                    'note': 'Standing performance-discipline checklist — real shipped fixes (cache headers, preconnect) directly change real UI load behavior.'},
    'misunderstanding': {'ai': False, 'ui': False, 'backend': False,
                          'note': 'A real 3-step disconnect-repair procedure between Alex and an AI — pure deliberation, portable as prose to other Total-system AIs (a real design property, not a system touch by itself).'},
    'cartographer': {'ai': True, 'ui': False, 'backend': True,
                      'note': 'Grounds graphify/Obsidian against system_map_spec.md, runs the trickle-down/up check — real cross-reference with Graphify CC (external AI) and real system_map_flags/smoke_test writes.'},
    'perspective': {'ai': False, 'ui': False, 'backend': True,
                     'note': 'Writes a real, evidence-grounded first-person self-report per Total-system element into perspective_reports — real Supabase writes, no direct UI.'},
    'omnitrix': {'ai': False, 'ui': True, 'backend': True,
                  'note': 'The 3-agent build workflow itself (Fable/Opus/Sonnet role split) — every real Tier 2 build in this project routes through it, so its real effect is whatever that build touches.'},
}

GROUPS = [
    {'id': 'all3', 'label': '🔮🖥️🗄️ All Three Axes', 'test': lambda s: s['ai'] and s['ui'] and s['backend']},
    {'id': 'ai', 'label': '🔮 Touches External AI', 'test': lambda s: s['ai']},
    {'id': 'ui_backend', 'label': '🖥️🗄️ UI + Backend (no external AI)', 'test': lambda s: not s['ai'] and s['ui'] and s['backend']},
    {'id': 'backend_only', 'label': '🗄️ Backend Only', 'test': lambda s: not s['ai'] and not s['ui'] and s['backend']},
    {'id': 'none', 'label': '💭 Pure Deliberation (no direct system touch)', 'test': lambda s: not s['ai'] and not s['ui'] and not s['backend']},
]


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


def build_bubble_map():
    """Real MAP view, Aug 21 2026 — Alex's own direct ask: "this should
    exist for everywhere that has 2 views." Column-per-axis-group
    layout (same real, hand-computed-position convention this session
    already used for galaxy_map_hub.py's own map view, rule 8) — one
    column per real GROUPS entry, skill nodes stacked within their
    column, colored by axis combination. No force-directed library."""
    col_w, row_h, pad_top = 240, 56, 50
    col_x = {g['id']: 40 + i * col_w for i, g in enumerate(GROUPS)}
    width = 40 + len(GROUPS) * col_w
    members_by_group = {g['id']: [n for n, s in SKILLS.items() if g['test'](s)] for g in GROUPS}
    max_rows = max((len(v) for v in members_by_group.values()), default=1)
    height = pad_top + max_rows * row_h + 60

    col_labels = ''.join(
        f'<text x="{col_x[g["id"]] + col_w/2}" y="24" class="col-label" text-anchor="middle">{esc(g["label"])}</text>'
        for g in GROUPS
    )
    col_colors = {'all3': '#E2A83D', 'ai': '#9B59B6', 'ui_backend': '#4A90E2', 'backend_only': '#2ABFB0', 'none': '#8a8a9a'}
    nodes = []
    for g in GROUPS:
        color = col_colors.get(g['id'], '#8a8a9a')
        for i, name in enumerate(members_by_group[g['id']]):
            cx = col_x[g['id']] + col_w / 2
            cy = pad_top + i * row_h + 40
            nodes.append(
                f'<g class="sk-node" data-skill="{esc(name)}" transform="translate({cx},{cy})">'
                f'<rect x="-100" y="-20" width="200" height="40" rx="10" style="fill:{color}22;stroke:{color}"/>'
                f'<text x="0" y="5" class="sk-label" text-anchor="middle">/{esc(name)}</text>'
                f'</g>'
            )
    return col_labels, ''.join(nodes), width, height


def build_group_section(grp):
    members = [(name, s) for name, s in SKILLS.items() if grp['test'](s)]
    # Aug 15 (G35, real Alex ask: "i want these skills to show adjacent
    # bubbles to each path it auto combines with") — real, bounded visual
    # fix: the 3 axis markers move from separate flat table COLUMNS to
    # real small bubble badges rendered directly ADJACENT to the skill
    # name (one cell, not three), reusing the exact bubble visual
    # language (small rounded pill, colored border) already established
    # at Level 3 for the Oracle/Composio actor bubbles — never a new
    # visual vocabulary invented for this one page. Each row also gets a
    # real cross-link into the new Skill Composition Network (G36) —
    # ties the two "skill dimensions" together the way Alex asked for
    # this whole session ("tie everything together").
    def _bubbles(s):
        b = []
        if s['ai']: b.append('<span class="axbubble ax-ai" title="Touches external AI">🔮</span>')
        if s['ui']: b.append('<span class="axbubble ax-ui" title="Touches real app UI">🖥️</span>')
        if s['backend']: b.append('<span class="axbubble ax-be" title="Touches real backend">🗄️</span>')
        return ''.join(b) or '<span class="axbubble ax-none" title="No real axis touched">💭</span>'
    def _river_usage(name):
        chips = ['<span class="river-chip">🌊 River XIII</span>']
        sec = SKILL_SECONDARY_RIVER.get(name)
        if sec:
            rnum, note = sec
            rlabel = RIVER_NAME.get(rnum, f'River {rnum}').split('—')[0].strip()
            chips.append(f'<span class="river-chip river-sec" title="{esc(note)}">🌊 {rlabel}</span>')
        return ''.join(chips)

    rows = ''.join(
        f'<tr><td class="skname">/{esc(name)} {_bubbles(s)} '
        f'<a class="netlink" href="galaxy_map_skill_network.html#skillnet-{esc(name)}" title="Skill Composition Network">🕸️</a></td>'
        f'<td class="sknote">{esc(s["note"])}</td>'
        f'<td class="skriver">{_river_usage(name)}<div class="lvl-na">Level: N/A — dev-process, not app-runtime</div></td></tr>'
        for name, s in members
    )
    return f'''<section class="gsection" id="grp-{grp['id']}" style="display:none">
  <div class="ghead"><h2>{grp['label']}</h2><span class="gcount">{len(members)} real skill(s)</span></div>
  <table class="sktable"><thead><tr><th>Skill (axis bubbles + network link)</th><th>Real justification</th><th>Real Level/River usage</th></tr></thead>
  <tbody>{rows}</tbody></table>
</section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Skills — AI/UI/Backend Dimension)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --orange:#E2A83D; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #1a1610 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--orange);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px;flex-wrap:wrap}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:var(--orange);border-color:var(--orange)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--orange);padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
  .tabs{{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}}
  .tab{{padding:6px 14px;border-radius:16px;font-size:11px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .tab.active{{background:var(--orange);color:#1a1a12;font-weight:700}}
  .gsection{{max-width:1100px;margin:0 auto;padding:24px;overflow-x:auto}}
  .ghead{{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}}
  .ghead h2{{font-family:Georgia,serif;font-size:19px;color:#fff}}
  .gcount{{font-size:10px;color:var(--orange);font-weight:700}}
  .sktable{{width:100%;border-collapse:collapse;font-size:11px}}
  .sktable th{{text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:0.5px;color:var(--orange);padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.1)}}
  .sktable td{{padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:top}}
  .skname{{font-family:'Cascadia Code','Fira Mono',monospace;font-weight:700;color:var(--gold);white-space:nowrap}}
  .skicon{{text-align:center;font-size:13px}}
  .axbubble{{display:inline-block;font-size:11px;padding:1px 5px;border-radius:9px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);margin-left:3px}}
  .axbubble.ax-none{{opacity:0.5}}
  .netlink{{margin-left:6px;text-decoration:none;font-size:11px;opacity:0.7}}
  .netlink:hover{{opacity:1}}
  .sknote{{color:#c8c8d8;line-height:1.5}}
  .skriver{{white-space:nowrap}}
  .river-chip{{display:inline-block;font-size:9px;padding:2px 7px;border-radius:8px;background:rgba(42,191,176,0.12);color:#2ABFB0;margin:0 4px 4px 0}}
  .river-sec{{background:rgba(201,168,76,0.12);color:var(--gold)}}
  .lvl-na{{font-size:8.5px;color:var(--dim);margin-top:3px}}
  a{{color:var(--orange)}}
  .note{{max-width:1100px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
  .toggle-row{{display:flex;justify-content:center;gap:8px;padding:16px 24px 0}}
  .toggle-btn{{padding:8px 18px;border-radius:16px;font-size:11.5px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .toggle-btn.active{{background:var(--orange);color:#1a0f04;border-color:var(--orange)}}
  .view{{display:none}}
  .view.active{{display:block}}
  #view-map{{padding:10px 24px 30px;overflow-x:auto}}
  .col-label{{fill:var(--dim);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}}
  .sk-node{{cursor:pointer}}
  .sk-node:hover rect{{stroke-width:2}}
  .sk-label{{fill:#E2E2EC;font-size:10.5px;font-weight:700;font-family:'Cascadia Code','Fira Mono',monospace}}
</style>
</head>
<body>
<div class="breadcrumb">
  <a href="galaxy_map.html">🌌 Level 0</a><span class="bc-sep">→</span>
  <a href="galaxy_map_decisions.html">🚦 Decisions</a><span class="bc-sep">→</span>
  <a href="galaxy_map_externals.html">🔀 Externals</a><span class="bc-sep">→</span>
  <span class="bc-here">🧩 Skills</span><span class="bc-sep">→</span>
  <a href="galaxy_map_skill_network.html">🕸️ Skill Composition Network</a>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Skills (G28)</div>
  <h1>🧩 Claude Code Skills — The AI/UI/Backend Dimension</h1>
  <p>{n_skills} real RPGACE-authored skills, classified on 3 real axes: does the skill's own procedure reach a DIFFERENT external AI (Oracle, or a Total-system member like OpenMontage CC/Graphify CC — not just "Claude Code runs this skill," which would trivially include everything), does it touch real app UI, does it touch real backend (code/Supabase/docs). A real judgment call per skill, not a mechanical detector — skills are prose, not code. Same real data, two views.</p>
</div>
<div class="toggle-row">
  <div class="toggle-btn active" data-view="map">🧩 Map view</div>
  <div class="toggle-btn" data-view="table">📊 Table view</div>
</div>
<div class="view active" id="view-map">
  <svg viewBox="0 0 {map_w} {map_h}" width="100%" style="min-width:{map_w}px">
    {map_labels}
    {map_nodes}
  </svg>
</div>
<div class="view" id="view-table">
  <div class="tabs">{tabs}</div>
  {sections}
</div>
<div class="note">
  Generated by <code>scripts/galaxy_map_skills.py</code> — real, curated classification reusing
  <code>ai_tooling_and_rules_map.md</code>'s own already-sourced skill catalog (Tier 1c) as the source list,
  never re-derived. G28 of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan.
  Mapping rules: <code>system_map_spec.md</code>. Real Aug 21 2026 addition: a real column-clustered bubble map
  (hand-computed positions, one column per real axis group) toggles against the original grouped-table view —
  per Alex's own "this should exist for everywhere that has 2 views" ask.
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
  document.querySelectorAll('.sk-node').forEach(function(node) {{
    node.addEventListener('click', function() {{
      toggles.forEach(function(x) {{ x.classList.toggle('active', x.dataset.view === 'table'); }});
      views.forEach(function(v) {{ v.classList.toggle('active', v.id === 'view-table'); }});
      var name = node.dataset.skill;
      var grp = null;
      sections.forEach(function(s) {{ if (s.innerHTML.indexOf('/' + name + ' ') !== -1) grp = s.id; }});
      if (grp) location.hash = grp;
    }});
  }});
}})();
</script>
</body>
</html>
"""


def main():
    tabs = ''.join(f'<div class="tab" data-target="grp-{g["id"]}">{g["label"]}</div>' for g in GROUPS)
    sections = ''.join(build_group_section(g) for g in GROUPS)
    map_labels, map_nodes, map_w, map_h = build_bubble_map()
    html = TEMPLATE.format(tabs=tabs, sections=sections, n_skills=len(SKILLS),
                           map_labels=map_labels, map_nodes=map_nodes, map_w=map_w, map_h=map_h)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    all3 = sum(1 for s in SKILLS.values() if s['ai'] and s['ui'] and s['backend'])
    print(f"Wrote {OUT} — {len(SKILLS)} real skills classified, {all3} touch all 3 axes, real map+table toggle.")


if __name__ == '__main__':
    main()
