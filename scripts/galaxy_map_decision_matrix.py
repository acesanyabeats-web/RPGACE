#!/usr/bin/env python3
"""
galaxy_map_decision_matrix.py — real, new Galaxy Development Framework
artifact (Aug 21 2026). Alex's own direct ask: "let's do g72 flagged and
unify all decisions types, then split by level at which decision is made
and what rivers, this will be the decision matrix/table, then we map out
bubble system." Confirmed via real /interrogation (2 AskUserQuestion
forks, both resolved):

1. "Level" axis meaning — confirmed as "how deep it's documented," not a
   literal L0-L6 spread (real evidence: every current decision point is
   anchored to a specific module+function, none sit at L0/L1/L2 by
   themselves). Every real decision gets Current(L3)+L6 (it's always a
   function, and L6 exhaustively covers every function's real branches);
   a decision ALSO gets L5 only if it's one of Level 5's own 7 curated
   "core logic" points — that curation IS the extra depth.
2. Text-input scope — confirmed "a small curated set... we can probably
   expand if needed" (same discipline as Level 5's own 7-point curation,
   never an exhaustive grep of every <input>/<textarea> in the app).

Real unification, not re-derived (rule 8): pulls galaxy_map_decisions.py's
10 real human-confirm gates directly. The 7 real core-logic points USED to
be pulled the same way from galaxy_map_level5.py; as of G75 (Aug 25 2026)
they live in this file as LOGIC_POINTS — that page was a curated lens over
the same functions, never a containment level, so it was merged in here
(write-ups and all) and deleted rather than left standing as a smaller,
redundant copy. TEXT_INPUT_POINTS below is the one genuinely NEW dataset
this file adds — 4 real, evidence-checked free-text entry points that
drive an actual backend decision (Oracle chat prompt, Beat Log form,
Director Blend inspiration notes, Taxonomy Placement Editor), each with
a live-verified code anchor, same discipline as every other curated
decision point in this project.

River attribution: resolved from each point's own `module` field via
RIVER_MODULES (rule 8) wherever the module is real and tracked; the one
legacy/main.js-section point (the raw Oracle chat send) is hand-tagged
River III since it feeds directly into the same Oracle pipeline
mockOracle/oracleAppGrounding already live in — the same real
attribution class the Aug 14 hook-signal work already established for
other legacy functions.

**New standing rule, Alex's own direct words, added to CEO SKILL.md as
R22**: "whenever we update galaxy, it must update the matrix first or
create a new one for table reference to bubble system, bubble systems
always follow and showcase what on table to keep everything coherent."
This file's own table view IS the real source of truth; its bubble/map
view is a rendering layer over the SAME data, never an independent
invention — the literal shape this rule now requires project-wide.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graphify_river_group import (  # noqa: E402
    RIVER_NAME, RIVER_COLOR, RIVER_MODULES, inject_level_rail,
    core_js_lines, verify_core_js_anchor, dimension_index_html,
    DIMENSION_INDEX_CSS,
)
from galaxy_map_decisions import DECISION_POINTS as GATE_POINTS, CATEGORIES as GATE_CATEGORIES  # noqa: E402

OUT = Path('graphify-out/galaxy_map_decision_matrix.html')

# ---------------------------------------------------------------------
# G75 (Aug 25 2026) — Level 5's own 7 curated "core logic" decision
# points, MOVED here verbatim from the now-deleted
# galaxy_map_level5.py.
#
# Real reason for the move (Alex's own ratified scope): L5 was never a
# containment step below Current(L3) — it is a curated LENS over the
# same functions, i.e. structurally a Dimension. This file already
# imported all 7 of these by reference and already rendered them as
# rows in the matrix; what it did NOT carry was their full write-up
# (the `changes`/`result` prose and the verbatim, anchor-verified
# rpgace_core.js excerpt), which is why L5 was merged INTO here rather
# than simply deleted — a smaller, redundant page left standing next to
# this one is exactly the "zombie page" mistake the Aug 21 L0-fusion
# correction already cost this project once.
#
# The curation IS the real work: these are hand-picked because they
# appear in CLAUDE.md/patch_notes.html or are otherwise already-
# documented core logic. The exhaustive, mechanical counterpart is
# galaxy_map_level6.py, which stays as its own link-out-only page.
#
# Every `lines` range is verified against the LIVE rpgace_core.js at
# build time via verify_core_js_anchor() — a moved/changed anchor fails
# this build loudly rather than shipping a stale excerpt. That property
# is load-bearing and was deliberately carried through the merge.
LOGIC_POINTS = [
    {
        'id': 'oracle-mode',
        'title': 'Oracle Mode: Real / Dummy / Fallback Scout',
        'decider': 'Alex (manual toggle)',
        'module': 'mockOracle', 'func': 'setMode', 'lines': (26808, 26839), 'anchor': "MODES: ['real', 'dummy', 'fallback']",
        'decides': 'Which of 3 real paths every single Oracle call in the app takes, app-wide, until toggled again.',
        'changes': 'Real: every window.callOracle() call in main.js checks getMode() first. \'dummy\' short-circuits to a synthetic labeled reply, zero API cost. \'fallback\' queues the real prompt into oracle_fallback_queue instead of calling the live API. \'real\' calls the live Anthropic API as normal.',
        'result': 'A visible top-right toggle switch (red/green/gold) whose state persists in localStorage and is checked on literally every real Oracle send in the app.',
        'level3': 'mockOracle',
    },
    {
        'id': 'taxonomy-card-branch',
        'title': 'Taxonomy dashboard card: popup vs. page fallback',
        'decider': 'Code logic (real pending-review count)',
        'module': 'dashDeck', 'lines': (10808, 10812),
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
        'module': 'phylumPath', 'func': 'decidePlacementScored', 'lines': (14222, 14253),
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
        'module': 'phylumPath', 'func': '_insertNewSteps', 'lines': (14525, 14538),
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
        'module': 'oracleAppGrounding', 'lines': (7979, 7991),
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
        'module': 'contentProductionLive', 'func': '_refreshWidget', 'lines': (20499, 20507),
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
        'module': 'beatLog', 'func': '_addNewArtistsToTaxonomy', 'lines': (19735, 19743),
        'anchor': 'phylum_number: 11',
        'decides': 'Which taxonomy phylum a newly-discovered Last.fm artist (via _addNewArtistsToTaxonomy) gets written into.',
        'changes': 'Nothing dynamic — this is a fixed literal, the real near-miss CLAUDE.md rule 13 was written about: the Aug 11 phylum renumber (11<->12) needed a SECOND, separate grep for this raw literal because no adjacent "Phylum 12" text existed nearby to catch it in the first display-text-only pass.',
        'result': 'Every new artist row from this path lands in Phylum 11 (Fons Educationis, post-renumber) — a real, silent-miss risk if this literal is ever forgotten in a future renumber.',
        'level3': 'beatLog',
    },
]

MODULE_TO_RIVER = {m: r for r, mods in RIVER_MODULES.items() for m in mods}

# Real ids that are genuinely a curated "core logic" point — used to
# decide whether a gate/text-input point ALSO gets the +curated depth
# tag (none currently do; kept as a real, checkable set rather than
# assumed). Named L5_IDS historically; the points now live in this file
# as LOGIC_POINTS after the G75 merge.
L5_IDS = {p['id'] for p in LOGIC_POINTS}

# The one real, NEW curated dataset this file adds — 4 real, evidence-
# checked free-text entry points, same anchor-verification discipline as
# every other DECISION_POINTS list in this project. Each `lines` range
# is checked against the LIVE file at build time (fails loud, not open).
TEXT_INPUT_POINTS = [
    {
        'id': 'oracle-chat-prompt',
        'title': 'Oracle chat prompt — the single biggest real text-input decision in the app',
        'module': 'legacy (sendChat)', 'river_override': 3, 'lines': (589, 595),
        'anchor': "const msg=input.value.trim()",
        'decides': "What Alex actually asks Oracle — this real free-text becomes the user message in every Oracle call, gates whether app-grounding fires (oracleAppGrounding's own keyword scan reads this exact text), and drives every real downstream action a command triggers.",
        'link': None,
    },
    {
        'id': 'beat-log-form',
        'title': 'Beat Log form — real multi-field text entry that creates a content_productions/video_jobs row',
        'module': 'beatLog', 'func': '_getForm', 'lines': (19359, 19379),
        'anchor': "title:    get('bl-title')",
        'decides': "Title/key/BPM/scale/energy/mood/genre/rating/licence/collab/ref-track/FL-path — real typed values read directly off the DOM, no defaults faked — that _submit() turns into the actual real database row this ConID's whole downstream pipeline is built from.",
        'link': None,
    },
    {
        'id': 'director-blend-inspiration',
        'title': "Director Blend inspiration notes — Alex's own free-text creative direction",
        'module': 'visualOracle', 'lines': (6190, 6207),
        'anchor': "var insp = insBox.value.trim()",
        'decides': "Alex's own typed creative notes, kept in a real, separately-labeled group (never conflated with the director-blend keywords) so the outbound Visual Treatment prompt can't confuse his own words with Oracle-generated style language.",
        'link': None,
    },
    {
        'id': 'taxonomy-placement-editor',
        'title': 'Taxonomy Placement Editor — editing a proposed step name/explainer before it writes to taxonomy_tree',
        'module': 'phylumPath', 'func': '_showPlacementConfirm', 'lines': (14373, 14373),
        'anchor': '_showPlacementConfirm: function(phylumNumber, attachNode, newSteps, explainers, insightText, onAccept, onReject)',
        'decides': "Alex can edit Oracle's own proposed step names/explainers inline before confirming — real typed text that replaces the AI's own wording in the eventual taxonomy_tree write, the one place in the whole taxonomy pipeline where his own words can override the model's.",
        # Aug 25 2026 — real dead-anchor fix (see the note on the gate
        # links in build_unified() below): galaxy_map_decisions.html's
        # own real per-point ids are `dp-<id>`, never `d-<id>`.
        'link': 'galaxy_map_decisions.html#dp-placement-confirm',
    },
]


def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def _verify_anchor(pt):
    """Thin wrapper over the shared verify_core_js_anchor() (rule 8 —
    this used to be its own third hand-written copy of the same check)."""
    a, b = pt['lines']
    verify_core_js_anchor(pt['id'], pt['anchor'], a, b)


def river_of(pt):
    if pt.get('river_override'):
        return pt['river_override']
    return MODULE_TO_RIVER.get(pt.get('module'))


def build_unified():
    """Real unification (rule 8, nothing re-derived): each real point
    tagged with kind/depth/river. Returns a flat list, one dict per
    decision, sorted by river then kind."""
    out = []
    for p in GATE_POINTS:
        out.append({
            'id': p['id'], 'title': p['title'], 'kind': 'gate',
            'kind_label': '🗑️ Gate', 'module': p['module'], 'func': p.get('func', ''),
            'river': MODULE_TO_RIVER.get(p['module']),
            'depth': 'curated' if p['id'] in L5_IDS else 'standard',
            # Aug 25 2026 — real dead-anchor fix, found by a direct
            # href-vs-id check while G77 wired this same unified dataset
            # into galaxy_map.html's own Alex Infra tab. This link had
            # always emitted `#d-<id>`, but galaxy_map_decisions.py
            # renders its real per-point sections with `id="dp-<id>"`,
            # so all 10 gate links landed at the top of that page
            # instead of on the decision they name. Pre-existing (it was
            # already live on this page's own matrix), fixed at the one
            # shared source rather than patched per-consumer (rule 8).
            'detail': p['logic'], 'link': 'galaxy_map_decisions.html#dp-' + p['id'],
        })
    for p in LOGIC_POINTS:
        # G75 — anchor-verified HERE now that the write-ups live on this
        # page. The old galaxy_map_level5.py did this check in its own
        # build; losing it in the merge would have silently traded a
        # fail-loud guarantee for a stale-excerpt risk.
        _verify_anchor(p)
        out.append({
            'id': p['id'], 'title': p['title'], 'kind': 'logic',
            'kind_label': '🧠 Logic Choice', 'module': p['module'], 'func': p.get('func', ''),
            'river': MODULE_TO_RIVER.get(p['module']),
            'depth': 'curated',  # every curated core-logic point IS the curation
            'detail': p['decides'], 'link': '#d-' + p['id'],
        })
    for p in TEXT_INPUT_POINTS:
        _verify_anchor(p)
        out.append({
            'id': p['id'], 'title': p['title'], 'kind': 'text_input',
            'kind_label': '⌨️ Text Input', 'module': p['module'], 'func': p.get('func', ''),
            'river': river_of(p),
            'depth': 'curated' if p['id'] in L5_IDS else 'standard',
            'detail': p['decides'], 'link': p.get('link') or 'galaxy_map_current.html',
        })
    out.sort(key=lambda d: (d['river'] or 99, d['kind'], d['title']))
    return out


KIND_ORDER = ['gate', 'logic', 'text_input']
KIND_LABEL = {'gate': '🗑️ Gates', 'logic': '🧠 Logic Choices', 'text_input': '⌨️ Text Inputs'}
# G75 — "Level 5" is gone as a rung; the extra depth a curated point has
# is now this page's own full write-up further down (#d-<id>), plus the
# exhaustive branch detail on the Detailed Decision page.
DEPTH_LABEL = {
    'curated': 'Current (L3) + curated write-up here + branch detail',
    'standard': 'Current (L3) + branch detail only',
}


def build_logic_writeups():
    """The full curated write-up for each core-logic point — MOVED here
    from galaxy_map_level5.py's own build_section() so the merge loses
    nothing. Same `#d-<id>` anchor scheme Level 5 used, so every
    pre-existing `galaxy_map_level5.html#d-X` link becomes
    `galaxy_map_decision_matrix.html#d-X` with no anchor change."""
    out = []
    for dp in LOGIC_POINTS:
        a, b = dp['lines']
        verify_core_js_anchor(dp['id'], dp['anchor'], a, b)
        code_esc = core_js_lines(a, b).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        out.append(f'''<section class="logic-writeup" id="d-{dp['id']}">
  <div class="lw-head"><h3>🧠 {esc(dp['title'])}</h3><span class="decider-badge">{esc(dp['decider'])}</span></div>
  <div class="dblock"><div class="dlabel">What's decided</div><p>{esc(dp['decides'])}</p></div>
  <div class="dblock"><div class="dlabel">What changes (real input to the decision)</div><p>{esc(dp['changes'])}</p></div>
  <div class="dblock"><div class="dlabel">Real result</div><p>{esc(dp['result'])}</p></div>
  <div class="dblock"><div class="dlabel">Real code (rpgace_core.js, lines {a}-{b})</div><pre>{code_esc}</pre>
    <div class="cite">Verified live against rpgace_core.js at build time — a moved/changed anchor fails this script's own build, never silently shown stale.</div>
    <a class="mod-chip" href="galaxy_map_current.html#mod-{esc(dp['level3'])}">🔽 {esc(dp['level3'])} — Current Series</a>
    <a class="mod-chip" href="galaxy_map_level6.html#m-{esc(dp["module"])}">🔬 every branch in {esc(dp['module'])} — Detailed Decision</a>
  </div>
</section>''')
    return ''.join(out)


def build_matrix_table(decisions):
    rivers = sorted({d['river'] for d in decisions if d['river']})
    rows = []
    for r in rivers:
        river_pts = [d for d in decisions if d['river'] == r]
        cells = []
        for kind in KIND_ORDER:
            pts = [d for d in river_pts if d['kind'] == kind]
            if not pts:
                cells.append('<td class="none">·</td>')
                continue
            items = ''.join(
                f'<li><a href="{esc(d["link"])}">{esc(d["title"])}</a> '
                f'<span class="depthtag depth-{d["depth"]}">{esc(DEPTH_LABEL[d["depth"]])}</span></li>'
                for d in pts
            )
            cells.append(f'<td class="hit" data-river="{r}" data-kind="{kind}"><b>{len(pts)}</b><ul class="cellist">{items}</ul></td>')
        name = RIVER_NAME.get(r, f'River {r}').split('—', 1)[1].strip() if '—' in RIVER_NAME.get(r, '') else RIVER_NAME.get(r, f'River {r}')
        # G74 (Aug 25 2026) — the row HEADER is clickable too, not just
        # the cells. Same real destination the bubble view's own click
        # already goes to for this river (rdetail-{r}), reused rather
        # than a new link target invented for the table.
        rows.append(
            f'<tr><th class="rowhead rowjump" data-river="{r}" title="Jump to this river\'s own bubble detail" '
            f'style="border-left:3px solid {RIVER_COLOR.get(r, "#888")}">{esc(name)} <span class="rowjump-cue">🫧</span></th>{"".join(cells)}</tr>'
        )
    header = '<tr><th></th>' + ''.join(f'<th>{KIND_LABEL[k]}</th>' for k in KIND_ORDER) + '</tr>'
    return '<table id="dmatrix">' + header + ''.join(rows) + '</table>'


def build_bubble_map(decisions):
    """Real bubble system, per Alex's own rule ('bubble systems always
    follow and showcase what on table') — one bubble per river with at
    least one real decision, sized by real count, click-to-reveal
    detail panel (same established pattern as galaxy_map_skill_network's
    own map view). Derived entirely from the SAME data build_matrix_table
    reads — never a second, independently-imagined dataset."""
    rivers = sorted({d['river'] for d in decisions if d['river']})
    import math
    n = len(rivers)
    cx, cy, radius = 420, 420, 300
    nodes = []
    details = []
    for i, r in enumerate(rivers):
        angle = (360 / n) * i - 90
        x = cx + radius * math.cos(math.radians(angle))
        y = cy + radius * math.sin(math.radians(angle))
        river_pts = [d for d in decisions if d['river'] == r]
        count = len(river_pts)
        rsize = 26 + min(count, 10) * 3
        color = RIVER_COLOR.get(r, '#888')
        name = RIVER_NAME.get(r, f'River {r}')
        short = name.split('—', 1)[1].strip() if '—' in name else name
        nodes.append(
            f'<g class="dbubble" data-river="{r}" transform="translate({x:.0f},{y:.0f})">'
            f'<circle r="{rsize}" fill="{color}" fill-opacity="0.18" stroke="{color}" stroke-width="2"/>'
            f'<text text-anchor="middle" dy="-4" font-size="12" fill="#fff" font-weight="700">{count}</text>'
            f'<text text-anchor="middle" dy="12" font-size="9" fill="{color}">{esc(short[:16])}</text>'
            f'</g>'
        )
        rows = ''.join(
            f'<li><b>{d["kind_label"]}</b> — <a href="{esc(d["link"])}">{esc(d["title"])}</a> '
            f'<span class="depthtag depth-{d["depth"]}">{esc(DEPTH_LABEL[d["depth"]])}</span></li>'
            for d in river_pts
        )
        details.append(f'<div class="rdetail" id="rdetail-{r}" style="display:none"><h3>{esc(name)}</h3><ul>{rows}</ul></div>')
    svg = f'<svg viewBox="0 0 840 840" width="100%" style="max-width:760px;display:block;margin:0 auto">{"".join(nodes)}</svg>'
    return svg + '<div id="bubble-details">' + ''.join(details) + '</div>'


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Decision Matrix)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 20%, #14101e 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:820px;margin:0 auto;line-height:1.6}}
  .toggle-row{{display:flex;justify-content:center;gap:8px;padding:16px 24px 0}}
  .toggle-btn{{padding:8px 18px;border-radius:16px;font-size:11.5px;font-weight:700;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim);border:1px solid rgba(255,255,255,0.1)}}
  .toggle-btn.active{{background:var(--gold);color:#1a1608;border-color:var(--gold)}}
  .view{{display:none}}
  .view.active{{display:block}}
  .matrix-wrap{{max-width:1100px;margin:24px auto;padding:0 24px;overflow-x:auto}}
  #dmatrix{{border-collapse:collapse;width:100%;font-size:11.5px}}
  #dmatrix th,#dmatrix td{{border:1px solid rgba(255,255,255,0.08);padding:8px 10px;text-align:left;vertical-align:top}}
  #dmatrix th{{color:var(--gold);font-size:10.5px}}
  th.rowhead{{white-space:nowrap;padding-left:12px}}
  td.none{{color:#333;text-align:center}}
  td.hit b{{color:#fff;font-size:14px}}
  .cellist{{list-style:none;margin-top:6px}}
  .cellist li{{margin-bottom:6px;line-height:1.5}}
  .cellist a{{color:var(--gold);text-decoration:none;font-size:11px}}
  .cellist a:hover{{text-decoration:underline}}
  .depthtag{{display:block;font-size:9px;color:var(--dim);margin-top:2px}}
  .depth-curated{{color:#9B59B6}}
  th.rowjump{{cursor:pointer}}
  th.rowjump:hover{{background:rgba(201,168,76,0.1)}}
  .rowjump-cue{{opacity:.45;font-size:10px}}
  .logic-writeup{{max-width:900px;margin:0 auto 26px;padding:0 24px}}
  .lw-head{{display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap}}
  .lw-head h3{{font-family:Georgia,serif;font-size:17px;color:#fff}}
  .decider-badge{{font-size:9.5px;font-weight:700;padding:3px 10px;border-radius:10px;background:rgba(155,89,182,0.15);color:#9B59B6;border:1px solid rgba(155,89,182,0.35)}}
  .dblock{{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px 16px;margin-top:12px}}
  .dlabel{{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9B59B6;margin-bottom:6px}}
  .dblock p{{font-size:12px;line-height:1.7;color:#c8c8d8}}
  pre{{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px 14px;font-family:'Cascadia Code','Fira Mono',monospace;font-size:10.5px;color:#c8c8d8;white-space:pre-wrap;line-height:1.6;overflow-x:auto;margin-top:8px}}
  .cite{{font-size:9.5px;color:#6a6a78;margin-top:4px}}
  .mod-chip{{font-size:10.5px;font-weight:700;padding:3px 10px;border-radius:10px;background:rgba(155,89,182,0.12);color:#9B59B6;text-decoration:none;border:1px solid rgba(155,89,182,0.3);display:inline-block;margin:10px 6px 0 0}}
  code{{font-family:'Cascadia Code','Fira Mono',monospace;font-size:10.5px;background:rgba(255,255,255,0.05);padding:1px 5px;border-radius:3px}}
  .lw-section-head{{max-width:900px;margin:34px auto 6px;padding:0 24px;font-family:Georgia,serif;font-size:19px;color:#fff}}
  .lw-section-sub{{max-width:900px;margin:0 auto 18px;padding:0 24px;font-size:11px;color:var(--dim);line-height:1.6}}
{dim_css}
  .bubblewrap{{max-width:900px;margin:24px auto;padding:0 24px;text-align:center}}
  .dbubble{{cursor:pointer}}
  .dbubble:hover circle{{filter:brightness(1.4)}}
  #bubble-details{{max-width:700px;margin:20px auto 0;padding:0 24px}}
  .rdetail{{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:16px 20px;margin-bottom:14px}}
  .rdetail h3{{font-family:Georgia,serif;font-size:15px;margin-bottom:10px;color:#fff}}
  .rdetail ul{{list-style:none}}
  .rdetail li{{margin-bottom:8px;font-size:11.5px;line-height:1.6}}
  .rdetail a{{color:var(--gold);text-decoration:none}}
  .legend{{max-width:900px;margin:20px auto;padding:0 24px;font-size:10.5px;color:var(--dim);text-align:center;line-height:1.7}}
  a{{color:var(--gold)}}
  .note{{max-width:900px;margin:20px auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
</style>
</head>
<body>

<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Decision Matrix</div>
  <h1>🚦🧭 The Decision Matrix — Every Real Decision, By River</h1>
  <p>Real unification of all 3 real decision kinds this project tracks: 🗑️ Gates (<a href="galaxy_map_decisions.html">10 human-confirm points</a>), 🧠 Logic Choices ({n_logic} curated core-logic points, <a href="#d-oracle-mode">written up in full further down this page</a>), and ⌨️ Text Inputs ({n_text} real, curated free-text entry points that drive an actual decision) — {n_total} real decisions total, grouped by which of the 17 real rivers they belong to. "Depth" shows how far down the existing Galaxy Map hierarchy each one is documented: every real decision reaches Current (L3) + Level 6 (exhaustive branch detail); a real 🟣 purple depth tag means it's ALSO one of Level 5's own curated "core logic" points. <b>This table is the real source of truth — the bubble view below is a rendering layer over the exact same data, never a second, independently-imagined picture (Alex's own standing rule).</b></p>
</div>

<div class="toggle-row">
  <div class="toggle-btn active" data-view="table">📊 Table view (the matrix)</div>
  <div class="toggle-btn" data-view="bubble">🫧 Bubble view</div>
</div>

<div class="view active" id="view-table">
  <div class="matrix-wrap">{matrix_table}</div>
</div>

<div class="view" id="view-bubble">
  <div class="bubblewrap">{bubble_map}</div>
</div>

<div class="legend">
  🗑️ Gate = human-confirm before a real write · 🧠 Logic Choice = a curated core-logic point, written up in full below · ⌨️ Text Input = free-text that drives a real decision. Click a river row header or cell (table) or a bubble (map) to see its own real decisions.
</div>

<h2 class="lw-section-head">🧠 Core Logic — the full curated write-ups</h2>
<div class="lw-section-sub">Merged in from the retired Level 5 page (G75). These are the same {n_logic} points the 🧠 column above links to — each one hand-picked because it already appears in CLAUDE.md or patch_notes.html as real core logic, and each one carrying a verbatim rpgace_core.js excerpt that is re-verified against the live file every single build. A moved or changed anchor fails this page's own build loudly rather than quietly showing you stale code.</div>
{logic_writeups}

{dim_index}

<div class="note">
  Generated by <code>scripts/galaxy_map_decision_matrix.py</code> — real data unified from <code>galaxy_map_decisions.py</code> (never re-derived), this file's own {n_logic} curated core-logic points (merged in from the retired Level 5 page, G75), and its own 4 curated, anchor-verified text-input points. Per Alex's own new standing rule (CEO SKILL.md R22): whenever the Galaxy Map is updated, this matrix updates FIRST (or a new one is created) — the bubble/map view always follows and showcases what's on the table, never the reverse.
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
  // G74 — row HEADER click goes to the same real destination the
  // bubble view's own click already goes to for that river.
  document.querySelectorAll('th.rowjump').forEach(function(th) {{
    th.addEventListener('click', function() {{
      var r = th.dataset.river;
      toggles.forEach(function(x) {{ x.classList.toggle('active', x.dataset.view === 'bubble'); }});
      views.forEach(function(v) {{ v.classList.toggle('active', v.id === 'view-bubble'); }});
      document.querySelectorAll('.rdetail').forEach(function(d) {{ d.style.display = (d.id === 'rdetail-' + r) ? '' : 'none'; }});
      var el = document.getElementById('rdetail-' + r);
      if (el) el.scrollIntoView({{behavior:'smooth', block:'nearest'}});
    }});
  }});
  document.querySelectorAll('td.hit').forEach(function(td) {{
    td.addEventListener('click', function(ev) {{
      if (ev.target.tagName === 'A') return;
      var r = td.dataset.river;
      toggles.forEach(function(x) {{ x.classList.toggle('active', x.dataset.view === 'bubble'); }});
      views.forEach(function(v) {{ v.classList.toggle('active', v.id === 'view-bubble'); }});
      document.querySelectorAll('.rdetail').forEach(function(d) {{ d.style.display = (d.id === 'rdetail-' + r) ? '' : 'none'; }});
      var el = document.getElementById('rdetail-' + r);
      if (el) el.scrollIntoView({{behavior:'smooth', block:'nearest'}});
    }});
  }});
  document.querySelectorAll('.dbubble').forEach(function(b) {{
    b.addEventListener('click', function() {{
      var r = b.dataset.river;
      document.querySelectorAll('.rdetail').forEach(function(d) {{ d.style.display = (d.id === 'rdetail-' + r) ? '' : 'none'; }});
      var el = document.getElementById('rdetail-' + r);
      if (el) el.scrollIntoView({{behavior:'smooth', block:'nearest'}});
    }});
  }});
}})();
</script>
</body>
</html>
"""


def main():
    decisions = build_unified()
    matrix_table = build_matrix_table(decisions)
    bubble_map = build_bubble_map(decisions)
    n_text = len(TEXT_INPUT_POINTS)
    n_total = len(decisions)
    html = TEMPLATE.format(matrix_table=matrix_table, bubble_map=bubble_map, n_text=n_text,
                           n_total=n_total, n_logic=len(LOGIC_POINTS),
                           logic_writeups=build_logic_writeups(),
                           dim_index=dimension_index_html(OUT.name),
                           dim_css=DIMENSION_INDEX_CSS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    n_rivers = len({d['river'] for d in decisions if d['river']})
    print(f"Wrote {OUT} — {n_total} real decisions unified (10 gates + 7 logic + {n_text} text-input) across {n_rivers} rivers.")


if __name__ == '__main__':
    main()
