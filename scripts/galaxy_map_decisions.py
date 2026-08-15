#!/usr/bin/env python3
"""
galaxy_map_decisions.py — G26 of the ratified "RPGACE Total Systems
Galaxy Map" /CEO plan (Aug 14 2026), Phase 1. Real, curated first build
of the "Decision/Human-Gate" cross-level grouping Alex asked for — a
"website perspective, not developer" diagnostic layer, grouping real
decisions/human-confirmation-gates by what kind of decision it is,
drilling down through its real DOM/button trigger to its real logic,
and cross-linking back into the existing Level 0-6 hierarchy.

Real, confirmed scope (4 AskUserQuestion answers, Aug 14):
1. RPGACE app code only (rpgace_core.js/main.js) — Total-systems
   process-level decisions (/CEO approvals, migration confirms) are not
   code artifacts anywhere, real future scope, not this pass.
2. Broadened past the 2 human_confirm_gate-tagged RIVER_FLOWS edges
   (too sparse alone) to real UI confirm-patterns: arm/confirm delete
   buttons, _showXConfirm()/_acceptX() functions, bare confirm() calls.
   Human gates only — Oracle's own AI judgment calls (ai_judgment_call
   itype, already covered by Level 5) stay a separate, distinct actor.
3. A real new parallel hierarchy (this file), cross-linked into the
   existing Level 0-6 pages at every real leaf — not an overlay bolted
   onto them.
4. Phase 1 scope: the core decision hierarchy only. smoke_test.html's
   own new grouping category and /colourgradient purple-integration
   are real, explicitly deferred Phase 2 items (ceo_plan_items).

Real data source, never invented: every DECISION_POINTS entry below
carries a verbatim code excerpt read directly from rpgace_core.js at
build time (anchor-checked, same discipline as galaxy_map_level5.py —
rule 8, not re-derived) — real evidence found by direct grep across the
whole file for arm/confirm patterns, _confirm-shaped function names,
and bare confirm() calls, not assumed or guessed at.
"""
from pathlib import Path

CORE_JS = Path('rpgace_core.js')
OUT = Path('graphify-out/galaxy_map_decisions.html')


def _lines(a, b):
    """Real verbatim excerpt, rpgace_core.js lines a..b inclusive
    (1-indexed) — same helper as galaxy_map_level5.py (rule 8)."""
    all_lines = CORE_JS.read_text(encoding='utf-8').splitlines()
    return '\n'.join(all_lines[a - 1:b])


# Real, curated D0 categories — evidence-found, not invented (a direct
# grep sweep for arm/confirm patterns, _confirm-shaped names, and bare
# confirm() calls across the whole codebase, Aug 14).
CATEGORIES = [
    {'id': 'destructive', 'label': '🗑️ Destructive Delete Confirms',
     'role': 'A real, irreversible delete — every one of these gets a real confirm step before the Supabase/localStorage write happens, per CLAUDE.md rule 8 (\"confirm destructive actions\").'},
    {'id': 'taxonomy', 'label': '🌳 Taxonomy Placement / Review Confirms',
     'role': 'CLAUDE.md rule 4 (\"every taxonomy write gets a human checkpoint\") in real, concrete code form — no taxonomy_tree write in this app ever bypasses one of these.'},
    {'id': 'pipeline', 'label': '🎬 Content Pipeline Progress Confirms',
     'role': 'A real, in-place progress reversal — not a delete, but a real \"this cannot be undone\" moment that needs the same explicit human gate.'},
]

# Real decision points — D1 (what/where) + D2 (real button/trigger,
# cited) + D3 (real logic/condition, cited) in one card, right-sized to
# the real ~10-point data volume (a 4-separate-physical-page journey
# would be over-engineered for this many real items — the SAME 3-level
# drill-down Alex asked for, just rendered as one expandable card
# rather than 3 separate clicks, per Phase 1's own proportionality).
DECISION_POINTS = [
    {
        'id': 'intel-delete-confirm', 'category': 'destructive',
        'title': 'Delete a Content Intelligence report / bibliography entry',
        'module': 'intelDelete', 'func': '_confirm', 'lines': (5624, 5642),
        'anchor': '_confirm: function(title, url, card, onDecide)',
        'trigger': 'A real 🗑 button on a Content Intelligence report card — routes through the shared `_deleteUnified()` path.',
        'logic': 'Shows a real popup ("Delete Report" + "Save URL to bibliography?") with 2 real choices — the onDecide callback branches on which button was pressed, never a bare JS `confirm()`.',
    },
    {
        'id': 'video-summary-delete', 'category': 'destructive',
        'title': 'Delete a video summary report (legacy fallback path)',
        'module': 'videoSummary', 'func': '_delete', 'lines': (6918, 6926),
        'anchor': "window.confirm('Delete \"' + title + '\"?')",
        'trigger': 'Same 🗑 delete action as intelDelete — this is the REAL fallback branch when `intelDelete._deleteUnified` isn\'t available, using a bare browser `confirm()` instead of the richer popup.',
        'logic': 'A plain `window.confirm()` — real, but honestly the least-informative gate in this whole category (no context shown beyond the title). Real, minor future cleanup candidate: route this through `intelDelete._confirm` directly instead of the JS-native fallback.',
    },
    {
        'id': 'conidpot-delete', 'category': 'destructive',
        'title': 'Delete an idea from the Idea Bank (ConID Pot)',
        'module': 'conidPot', 'func': '_refreshIdeaBank', 'lines': (17299, 17305),
        'anchor': "confirm('Delete \"' + row.title + '\"?')",
        'trigger': 'A real 🗑 button rendered per-row inside the Idea Bank list.',
        'logic': 'A plain `confirm()` — real, same minimal-context shape as videoSummary\'s.',
    },
    {
        'id': 'bookworm-delete', 'category': 'destructive',
        'title': 'Delete a Bookworm book (2-click arm/confirm)',
        'module': 'bookworm', 'func': '_refreshWidget', 'lines': (10321, 10336),
        'anchor': 'var armed = false;',
        'trigger': 'A real 🗑 button that must be clicked TWICE within 3 seconds (`armed` flips true, button relabels "❌ Confirm", a real `setTimeout` resets it) — the original CLAUDE.md rule 8 precedent this whole category is named after.',
        'logic': 'No popup at all — the confirm IS the second click itself, a real, cheap alternative to a modal for a single destructive action.',
    },
    {
        'id': 'placement-confirm', 'category': 'taxonomy',
        'title': 'New insight placement — accept/reject before a real taxonomy_tree write',
        'module': 'phylumPath', 'func': '_showPlacementConfirm', 'lines': (8993, 8993),
        'anchor': '_showPlacementConfirm: function(phylumNumber, attachNode, newSteps, explainers, insightText, onAccept, onReject)',
        'trigger': 'Shown automatically after `decidePlacementScored()` (Level 5\'s own real decision point — see there for the full scoring logic) returns a real placement candidate.',
        'logic': 'A real popup showing Oracle\'s own proposed attach point + new steps, with explicit onAccept/onReject callbacks — nothing writes to taxonomy_tree without this gate, per rule 4.',
        'l5_link': 'placement-scored',
    },
    {
        'id': 'article-confirm', 'category': 'taxonomy',
        'title': 'Dedup-extend article regeneration — approve before overwriting an existing leaf',
        'module': 'phylumPath', 'func': '_showArticleConfirm', 'lines': (9461, 9461),
        'anchor': '_showArticleConfirm: function(node, articleTitle, text, onApprove, onDeny)',
        'trigger': 'Shown when `_insertNewSteps()` (Level 5\'s own dedup-extend decision point) finds a real near-duplicate and proposes extending the existing leaf\'s own article instead of creating a new one.',
        'logic': 'Same real checkpoint pattern as `_showPlacementConfirm`, simpler — an existing leaf\'s content is about to be regenerated, so this gate specifically protects against overwriting real prior content on a bad match.',
        'l5_link': 'dedup-extend',
    },
    {
        'id': 'accept-phylumpath-proposal', 'category': 'taxonomy',
        'title': 'Review Queue: accept a pending taxonomy_proposals row',
        'module': 'taxonomyReviewQueue', 'func': '_acceptPhylumPathProposal', 'lines': (4548, 4548),
        'anchor': '_acceptPhylumPathProposal: function(p)',
        'trigger': 'The real "✅ Accept" button on a pending row inside the "🌳 Taxonomy & Review" dashboard card\'s popup.',
        'logic': 'A real, separate SECOND checkpoint from `_showPlacementConfirm` above — this one clears a `taxonomy_proposals` row that was already staged (not a live in-the-moment placement), matching rule 4\'s "or staging through taxonomy_proposals → review queue" alternate path.',
    },
    {
        'id': 'accept-concept-fusion', 'category': 'taxonomy',
        'title': 'Review Queue: accept a proposed fusion-link bridge',
        'module': 'taxonomyReviewQueue', 'func': '_acceptConceptFusion', 'lines': (4573, 4573),
        'anchor': '_acceptConceptFusion: function(p)',
        'trigger': 'The real "✅ Accept" button on a pending `taxonomy_links` row — the exact real gate River VI/VIII\'s own `human_confirm_gate`-tagged RIVER_FLOWS edges describe at the river level.',
        'logic': 'Same real accept/reject review-queue mechanism as the proposal row above, scoped to fusion-link bridges instead of new-leaf placements.',
    },
    {
        'id': 'edit-phylumpath-proposal', 'category': 'taxonomy',
        'title': 'Review Queue: edit a pending proposal before accepting it',
        'module': 'taxonomyReviewQueue', 'func': '_editPhylumPathProposal', 'lines': (4611, 4611),
        'anchor': '_editPhylumPathProposal: function(p)',
        'trigger': 'A real "✏️ Edit" button alongside Accept/Reject on a pending proposal row.',
        'logic': 'Real, distinct from a bare accept/reject — lets Alex correct Oracle\'s own proposed placement before it commits, rather than only a binary yes/no.',
    },
    {
        'id': 'undo-conid-stage', 'category': 'pipeline',
        'title': 'Undo a ConID\'s last completed production stage',
        'module': 'contentProductionLive', 'func': '_undoLastStage', 'lines': (14743, 14748),
        'anchor': "confirm('Undo ConID #' + row.con_id",
        'trigger': 'The real standalone "Undo" button on a music_video ConID card (Aug 6 UX pass — paired with a "revert progress" checkbox, default unchecked = edit-in-place).',
        'logic': 'A plain `confirm()`, but with real, specific consequence text in the message itself ("deletes the creative-doc output that stage produced... cannot be undone") — more informative than the bare delete-confirms above despite using the same native browser dialog.',
    },
]


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


def build_category_section(cat):
    points = [dp for dp in DECISION_POINTS if dp['category'] == cat['id']]
    cards = []
    for dp in points:
        a, b = dp['lines']
        code = _lines(a, b)
        if dp['anchor'] not in code:
            raise SystemExit(f"STALE ANCHOR: {dp['id']} — '{dp['anchor']}' not found in rpgace_core.js lines {a}-{b}.")
        code_esc = esc(code)
        l5_html = ''
        if dp.get('l5_link'):
            l5_html = f'<div class="dblock"><div class="dlabel">Also a curated Level 5 decision point</div><p><a href="galaxy_map_level5.html#d-{dp["l5_link"]}">🧠 See the full real scoring/logic write-up on Level 5 →</a></p></div>'
        cards.append(f'''<div class="dpcard" id="dp-{dp['id']}">
  <div class="dphead"><h3>{esc(dp['title'])}</h3></div>
  <div class="dblock"><div class="dlabel">D2 — Real trigger (DOM/button)</div><p>{dp['trigger']}</p></div>
  <div class="dblock"><div class="dlabel">D3 — Real logic</div><p>{dp['logic']}</p></div>
  {l5_html}
  <div class="dblock"><div class="dlabel">Real code (rpgace_core.js, lines {a}-{b})</div><pre>{code_esc}</pre></div>
  <a class="mod-chip" href="galaxy_map_level3.html#mod-{dp['module']}">🔽 {dp['module']}.{esc(dp['func'])}() — Level 3</a>
</div>''')
    return f'''<section class="csection" id="cat-{cat['id']}" style="display:none">
  <div class="chead"><h2>{cat['label']}</h2><span class="ccount">{len(points)} real decision point(s)</span></div>
  <p class="crole">{cat['role']}</p>
  <div class="dpgrid">{''.join(cards)}</div>
</section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Decisions — Website Perspective)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --red:#E25454; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #1a1012 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--red);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px;flex-wrap:wrap}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:var(--red);border-color:var(--red)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--red);padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
  .tabs{{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}}
  .tab{{padding:6px 14px;border-radius:16px;font-size:11.5px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .tab.active{{background:var(--red);color:#fff;font-weight:700}}
  .csection{{max-width:1000px;margin:0 auto;padding:24px}}
  .chead{{display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap}}
  .chead h2{{font-family:Georgia,serif;font-size:20px;color:#fff}}
  .ccount{{font-size:10px;color:var(--red);font-weight:700}}
  .crole{{font-size:11px;color:var(--dim);line-height:1.6;margin-bottom:18px}}
  .dpgrid{{display:flex;flex-direction:column;gap:14px}}
  .dpcard{{background:rgba(255,255,255,0.03);border:1px solid rgba(226,84,84,0.18);border-radius:10px;padding:16px 18px}}
  .dphead h3{{font-size:13.5px;color:#fff;margin-bottom:8px}}
  .dblock{{margin-top:10px}}
  .dlabel{{font-size:9.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--red);margin-bottom:4px}}
  .dblock p{{font-size:11.5px;line-height:1.6;color:#c8c8d8}}
  pre{{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px 12px;font-family:'Cascadia Code','Fira Mono',monospace;font-size:10px;color:#c8c8d8;white-space:pre-wrap;line-height:1.6;overflow-x:auto;margin-top:6px}}
  .mod-chip{{font-size:10px;font-weight:700;padding:3px 10px;border-radius:10px;background:rgba(226,84,84,0.1);color:var(--red);text-decoration:none;border:1px solid rgba(226,84,84,0.3);display:inline-block;margin-top:12px}}
  a{{color:var(--red)}}
  .note{{max-width:1000px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
</style>
</head>
<body>
<div class="breadcrumb">
  <a href="galaxy_map.html">🌌 Level 0</a><span class="bc-sep">→</span>
  <a href="galaxy_map_river.html">🏛️ Level 1</a><span class="bc-sep">→</span>
  <a href="galaxy_map_module.html">🌊 Level 2</a><span class="bc-sep">→</span>
  <a href="galaxy_map_level3.html">🔽 Level 3</a><span class="bc-sep">→</span>
  <a href="galaxy_map_level5.html">🧠 Level 5</a><span class="bc-sep">→</span>
  <span class="bc-here">🚦 Decisions</span><span class="bc-sep">→</span>
  <a href="galaxy_map_externals.html">🔀 Externals</a><span class="bc-sep">→</span>
  <a href="galaxy_map_skills.html">🧩 Skills</a>
</div>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Decision Grouping (G26 Phase 1)</div>
  <h1>🚦 Real Decisions &amp; Human Gates — Website Perspective</h1>
  <p>{n_points} real decision/human-confirmation points across {n_cats} categories, grouped by what kind of decision each one asks Alex to make — not by code structure. Every point cross-links to its own real Level 3 function (and Level 5, where the same decision already has a curated write-up there). Phase 1 scope: RPGACE app code only — Total-systems process-level decisions (a /CEO approval, a migration confirm) are real, deliberately deferred future scope.</p>
</div>
<div class="tabs">{tabs}</div>
{sections}
<div class="note">
  Generated by <code>scripts/galaxy_map_decisions.py</code> — real, curated (not mechanically exhaustive)
  decision points, each verbatim-cited against rpgace_core.js at build time, same discipline as Level 5.
  G26 Phase 1 of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan — Phase 2 (smoke_test.html grouping,
  /colourgradient purple-integration, Total-systems-wide scope) is real, explicitly deferred future work.
  Mapping rules: <code>system_map_spec.md</code>.
</div>
<script>
(function() {{
  var tabs = document.querySelectorAll('.tab');
  var sections = document.querySelectorAll('.csection');
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
    tabs = ''.join(f'<div class="tab" data-target="cat-{c["id"]}">{c["label"]}</div>' for c in CATEGORIES)
    sections = ''.join(build_category_section(c) for c in CATEGORIES)
    html = TEMPLATE.format(tabs=tabs, sections=sections, n_points=len(DECISION_POINTS), n_cats=len(CATEGORIES))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(DECISION_POINTS)} real decision points across {len(CATEGORIES)} categories, all anchors verified live.")


if __name__ == '__main__':
    main()
