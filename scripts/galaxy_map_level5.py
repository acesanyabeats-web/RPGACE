#!/usr/bin/env python3
"""
galaxy_map_level5.py — G17 of the ratified "RPGACE Total Systems Galaxy
Map" /CEO plan (Aug 14 2026). Alex's own direct, confirmed scope
(AskUserQuestion): "named decision points — that core logic" — a real,
bounded, curated set of decision points that actually appear in
CLAUDE.md/patch_notes.html or are otherwise already-documented "core
logic," NOT an exhaustive sweep of every real if/else in the codebase
(that's G18, galaxy_map_level6.py).

Real data source, never invented: every DECISION_POINTS entry below
carries a verbatim code excerpt read directly from rpgace_core.js at
build time (the real line numbers are cited so a stale excerpt would be
immediately checkable against the live file, same discipline as every
other level's own real-evidence citations). This file does NOT re-parse
rpgace_core.js itself — the curation IS the real, hand-done work Level 5
promises (a human/AI judgment call about which branches are "core
logic" worth naming), Level 6 is the mechanical, exhaustive counterpart.
"""
import re
from pathlib import Path
import sys as _sys_rail
from pathlib import Path as _Path_rail
_sys_rail.path.insert(0, str(_Path_rail(__file__).parent))
from graphify_river_group import inject_level_rail  # noqa: E402

CORE_JS = Path('rpgace_core.js')
OUT = Path('graphify-out/galaxy_map_level5.html')


def _lines(a, b):
    """Real verbatim excerpt, rpgace_core.js lines a..b inclusive (1-indexed).
    Fails loud (not silently) if the file has shifted — a mismatched
    anchor string means this page is now citing the wrong code, and
    that's worse than a build-time crash."""
    all_lines = CORE_JS.read_text(encoding='utf-8').splitlines()
    return '\n'.join(all_lines[a - 1:b])


# Real, curated decision points — "core logic," Alex's own confirmed
# scope. Each `anchor` is checked against the live file at build time so
# a future rpgace_core.js edit that moves/changes this code fails the
# build loudly instead of silently showing stale code.
DECISION_POINTS = [
    {
        'id': 'oracle-mode',
        'title': 'Oracle Mode: Real / Dummy / Fallback Scout',
        'decider': 'Alex (manual toggle)',
        'module': 'mockOracle', 'func': 'setMode', 'lines': (24104, 24132), 'anchor': "MODES: ['real', 'dummy', 'fallback']",
        'decides': 'Which of 3 real paths every single Oracle call in the app takes, app-wide, until toggled again.',
        'changes': 'Real: every window.callOracle() call in main.js checks getMode() first. \'dummy\' short-circuits to a synthetic labeled reply, zero API cost. \'fallback\' queues the real prompt into oracle_fallback_queue instead of calling the live API. \'real\' calls the live Anthropic API as normal.',
        'result': 'A visible top-right toggle switch (red/green/gold) whose state persists in localStorage and is checked on literally every real Oracle send in the app.',
        'level3': 'mockOracle',
    },
    {
        'id': 'taxonomy-card-branch',
        'title': 'Taxonomy dashboard card: popup vs. page fallback',
        'decider': 'Code logic (real pending-review count)',
        'module': 'dashDeck', 'lines': (10344, 10349),
        'anchor': "_pendingReviewCount !== 0",
        'decides': 'Whether clicking the "🌳 Taxonomy & Review" dashboard card opens the review-queue popup or navigates straight to the taxonomy tree page.',
        'changes': 'A real, live-queried count (RPGACE.modules.dashDeck._pendingReviewCount, set by _refreshGlance from a real taxonomy_proposals SELECT) — not a static config flag.',
        'result': "Non-zero pending count -> taxonomyReviewQueue._openCard() (the review popup). Zero (or the count hasn't loaded yet) -> falls through to phylumPath's own page navigation.",
        'level3': 'taxonomyReviewQueue',
    },
    {
        'id': 'placement-scored',
        'title': 'Taxonomy placement: Council-of-5 scored decision',
        'decider': 'Oracle (ground-worker judgment call)',
        'module': 'phylumPath', 'func': 'decidePlacementScored', 'lines': (13529, 13560),
        'anchor': 'decidePlacementScored: function',
        'decides': 'Where a new insight/leaf attaches in the taxonomy tree — an existing node (by number) or a brand-new path from the phylum root — and whether it belongs in this phylum at all.',
        'changes': 'The full numbered, indented tree for that phylum (real Supabase read), plus 5 named checks (pedagogical clarity, non-redundancy, practical applicability, structural fit, expansion headroom) folded into one prompt.',
        'result': 'A real, structured JSON verdict — fits (bool), attachTo (node number or null), newSteps, explainers, a one-sentence justification citing which check(s) drove it, and a self-scored 1-10 confidence — fed into _resolvePlacementDecision() and, past a human checkpoint, an actual taxonomy_tree write.',
        'level3': 'phylumPath',
    },
    {
        'id': 'dedup-extend',
        'title': 'Taxonomy dedup: extend existing leaf vs. reject',
        'decider': 'Code logic (real empty-newSteps + existing-leaf check)',
        'module': 'phylumPath', 'func': '_insertNewSteps', 'lines': (13797, 13809),
        'anchor': '_insertNewSteps: function',
        'decides': 'What happens when Oracle judges an insight to be a near-duplicate of something already in the tree (returns zero newSteps).',
        'changes': "attachNode's own node_type — a real 'leaf' means there's a real existing article to extend; anything else means there's nowhere real to attach the insight without a new step.",
        'result': "Existing leaf: regenerate that leaf's own article via _generateInsightContent() (the real 'extend' behavior, logged to taxonomy_decision_log) — a real dedup-extend, not a silent drop. No attach point: Promise.reject('Oracle returned no new steps to place this insight').",
        'level3': 'phylumPath',
    },
    {
        'id': 'oracle-grounding-gate',
        'title': "Oracle grounding gate: does this prompt get RPGACE's own facts injected",
        'decider': 'Code logic (real keyword match against the live prompt)',
        'module': 'oracleAppGrounding', 'lines': (7671, 7682),
        'anchor': 'anatomyHit = self.ANATOMY_KEYWORDS.some',
        'decides': "Whether a real window.callOracle() send gets RPGACE's own SELF_KNOWLEDGE/anatomy grounding block injected into the system prompt before it goes out.",
        'changes': "The user's own last message text, scanned against 2 real keyword lists (TRIGGER_KEYWORDS for general app-knowledge grounding, ANATOMY_KEYWORDS for module-architecture grounding) — or a forced override via forceGroundNext() for a command that always needs it (Prod Oracle's \"5thDimension\").",
        'result': 'Neither list matches -> the original call goes out unmodified (falls through to orig.apply, zero cost added). Either matches -> a real grounding block is built and appended to the system prompt, forwarding all 4 real arguments (including the streaming onChunk callback) so a grounded call never silently downgrades from streaming to blocking.',
        'level3': 'oracleAppGrounding',
    },
    {
        'id': 'primary-action-lookup',
        'title': 'Content Pipeline: which single primary action button renders',
        'decider': 'Code logic (real content_productions.status lookup)',
        'module': 'contentProductionLive', 'func': '_refreshWidget', 'lines': (19356, 19362),
        'anchor': 'MUSIC_VIDEO_PRIMARY_ACTION',
        'decides': "Which ONE real action button shows on a music_video ConID card — the real fix for the Aug 6 \"duplicate stage\" complaint, where every ConID used to render a FIXED set of buttons regardless of real progress.",
        'changes': "The ConID row's own real content_productions.status column value ('Idea'/'Scripted'/'Filmed'/'Edited'/'Posted'/'Analysed').",
        'result': "A single real MUSIC_VIDEO_PRIMARY_ACTION[row.status] lookup returns exactly one {label, fn} pair to render — 'Posted'/'Analysed' correctly render nothing further (real last-stage), never a guessed extra button.",
        'level3': 'contentProductionLive',
    },
    {
        'id': 'artist-phylum-routing',
        'title': 'Last.fm-discovered artists: which phylum they get filed under',
        'decider': 'Code logic (hardcoded phylum_number literal)',
        'module': 'beatLog', 'func': '_addNewArtistsToTaxonomy', 'lines': (18585, 18600),
        'anchor': 'phylum_number: 11',
        'decides': 'Which taxonomy phylum a newly-discovered Last.fm artist (via _addNewArtistsToTaxonomy) gets written into.',
        'changes': 'Nothing dynamic — this is a fixed literal, the real near-miss CLAUDE.md rule 13 was written about: the Aug 11 phylum renumber (11<->12) needed a SECOND, separate grep for this raw literal because no adjacent "Phylum 12" text existed nearby to catch it in the first display-text-only pass.',
        'result': 'Every new artist row from this path lands in Phylum 11 (Fons Educationis, post-renumber) — a real, silent-miss risk if this literal is ever forgotten in a future renumber.',
        'level3': 'beatLog',
    },
]


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Level 5)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --purple:#9B59B6; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #14101e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--purple);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:28px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto}}
  .breadcrumb{{display:flex;gap:6px;align-items:center;justify-content:center;padding:10px 16px 0;font-size:10.5px;font-weight:700;letter-spacing:1px}}
  .breadcrumb a{{color:var(--dim);text-decoration:none;padding:4px 9px;border-radius:12px;border:1px solid rgba(255,255,255,0.1)}}
  .breadcrumb a:hover{{color:var(--purple);border-color:var(--purple)}}
  .breadcrumb .bc-here{{color:#0a0a0f;background:var(--purple);padding:4px 9px;border-radius:12px}}
  .breadcrumb .bc-sep{{color:#4a4a58}}
  .tabs{{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}}
  .tab{{padding:6px 14px;border-radius:16px;font-size:11.5px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .tab.active{{background:var(--purple);color:#fff;font-weight:700}}
  .dsection{{max-width:820px;margin:0 auto;padding:24px}}
  .dhead{{display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap}}
  .dhead h2{{font-family:Georgia,serif;font-size:20px;color:#fff}}
  .decider-badge{{font-size:9.5px;font-weight:700;padding:3px 10px;border-radius:10px;background:rgba(155,89,182,0.15);color:var(--purple);border:1px solid rgba(155,89,182,0.35)}}
  .dblock{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px 18px;margin-top:14px}}
  .dlabel{{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--purple);margin-bottom:6px}}
  .dblock p{{font-size:12px;line-height:1.7;color:#c8c8d8}}
  pre{{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px 14px;font-family:'Cascadia Code','Fira Mono',monospace;font-size:10.5px;color:#c8c8d8;white-space:pre-wrap;line-height:1.6;overflow-x:auto;margin-top:8px}}
  .cite{{font-size:9.5px;color:#6a6a78;margin-top:4px}}
  .mod-chip{{font-size:10.5px;font-weight:700;padding:3px 10px;border-radius:10px;background:rgba(155,89,182,0.12);color:var(--purple);text-decoration:none;border:1px solid rgba(155,89,182,0.3);display:inline-block;margin-top:10px}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10.5px;background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:3px}}
  a{{color:var(--purple)}}
  .note{{max-width:820px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Level 5</div>
  <h1>🧠 Logic — Real, Named Decision Points</h1>
  <p>A real, curated set of {n} core decision points — where Alex, Oracle, or the code itself decides something that changes what happens next. NOT exhaustive (that's Level 6) — this is the hand-picked "core logic" Alex asked for. Every code excerpt below is read live from rpgace_core.js at build time, cited by real line number. Real, additive companion (Aug 15): <a href="galaxy_map_logic_dimension.html">📖 the Logic Dimension</a> — every river-to-river connection, external connector, and skill stream as its own clickable passage, river-grouped. Real Aug 21 2026 companion: <a href="galaxy_map_decision_matrix.html">🚦🧭 the Decision Matrix</a> — these 7 points unified with the real Decisions gates and a new curated text-input set, split by river and documentation depth.</p>
</div>
<div class="tabs">{tabs}</div>
{sections}
<div class="note">
  Generated by <code>scripts/galaxy_map_level5.py</code> — a real, curated (not mechanically exhaustive) set of
  decision points, each verbatim-cited against rpgace_core.js at build time. The exhaustive, mechanical
  counterpart (every real if/else/ternary/switch branch) is <a href="galaxy_map_level6.html">Level 6</a>.
  Mapping rules: <code>system_map_spec.md</code>.
</div>
<script>
(function() {{
  var tabs = document.querySelectorAll('.tab');
  var sections = document.querySelectorAll('.dsection');
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


def build_section(dp):
    a, b = dp['lines']
    code = _lines(a, b)
    if dp['anchor'] not in code:
        raise SystemExit(f"STALE ANCHOR: {dp['id']} — '{dp['anchor']}' not found in rpgace_core.js lines {a}-{b}. "
                          f"The real source has moved — re-verify and update this decision point's line numbers before shipping.")
    code_esc = code.replace('<', '&lt;').replace('>', '&gt;')
    return f'''<section class="dsection" id="d-{dp['id']}" style="display:none">
  <div class="dhead"><h2>{dp['title']}</h2><span class="decider-badge">{dp['decider']}</span></div>
  <div class="dblock"><div class="dlabel">What's decided</div><p>{dp['decides']}</p></div>
  <div class="dblock"><div class="dlabel">What changes (real input to the decision)</div><p>{dp['changes']}</p></div>
  <div class="dblock"><div class="dlabel">Real result</div><p>{dp['result']}</p></div>
  <div class="dblock"><div class="dlabel">Real code (rpgace_core.js, lines {a}-{b})</div><pre>{code_esc}</pre>
    <div class="cite">Verified live against rpgace_core.js at build time — a moved/changed anchor fails this script's own build, not silently shown stale.</div>
    <a class="mod-chip" href="galaxy_map_current.html#mod-{dp['level3']}">🔽 {dp['level3']} — Current Series</a>
  </div>
</section>'''


def main():
    tabs = ''.join(f'<div class="tab" data-target="d-{dp["id"]}">{dp["title"]}</div>' for dp in DECISION_POINTS)
    sections = ''.join(build_section(dp) for dp in DECISION_POINTS)
    html = TEMPLATE.format(tabs=tabs, sections=sections, n=len(DECISION_POINTS))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    print(f"Wrote {OUT} — {len(DECISION_POINTS)} real, curated decision points, all anchors verified live.")


if __name__ == '__main__':
    main()
