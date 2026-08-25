#!/usr/bin/env python3
"""
galaxy_map_oversight_sync.py — G55 of the ratified "RPGACE Total Systems
Galaxy Map" /CEO plan (Aug 20/21 2026). Real Alex ask, verbatim: "i would
also like to make a bubble hierarchy for oversight docs and their
connections and communications during a push, build or plan phase if it
makes sense (also during /Summary, /Bedtime and /Routine) so i can
always change how it is all rewired."

Real /interrogation (AskUserQuestion) resolved the shape: a NEW dimension
page, same real shape as G39's Load Dimension (which maps WHEN app code
loads) — but for OVERSIGHT DOCS instead of app code. Deliberately NOT an
extension of the existing static G43/G50 Oversight-Docs L0 unit, which
shows structural WHO-talks-to-whom edges (Alex<->Oversight Docs,
Skills<->Oversight Docs, etc.) — this page shows real PROCESS-TIME
sequencing: which real oversight doc/artifact gets touched, in what
order, during a real named event.

Real, honest data-source discipline (rule 8, nothing re-derived):
- The "push/build" trigger table is the SAME 18-item dependency map
  already living in update-logging-system/SKILL.md — hand-transcribed
  here as a one-line-per-item summary (same "not auto-parsed, update the
  source first, then the mirror" discipline scripts/graphify_river_group.py's
  own EXTERNAL_CONNECTORS mirror already uses for prose it can't safely
  regex-extract), never re-authored from scratch.
- The Bedtime/Routine/Summary/CEO sequences are transcribed directly
  from each skill's own real numbered Steps (.claude/skills/Bedtime/
  SKILL.md, Routine/SKILL.md, Summary/SKILL.md, CEO/SKILL.md's own R17
  rule) — every step cites its real source file + step number, nothing
  invented.

Real, honest scope limit: this is a real, hand-curated snapshot of what
each ritual's own .md file currently says it does — it does NOT execute
or verify that a given session actually followed the sequence (that's
smoke_test.html/error_log.html's job, not this page's). If a skill file's
own procedure changes, this page needs a real re-transcription (same
maintenance discipline as any other hand-mirrored data in this project).
"""
from pathlib import Path
import re
import sys as _sys_rail
from pathlib import Path as _Path_rail
_sys_rail.path.insert(0, str(_Path_rail(__file__).parent))
from graphify_river_group import inject_level_rail  # noqa: E402
from graphify_river_group import dimension_index_html, DIMENSION_INDEX_CSS  # noqa: E402

OUT = Path('graphify-out/galaxy_map_oversight_sync.html')

# ── G82 audit (Aug 25 2026) — the real gap on THIS page, stated
# precisely rather than assumed.
#
# This is the one page in the whole map whose entire subject is which
# oversight DOC gets touched, and every row named those docs
# (patch_notes.html, interconnection_map.md, minotaur_map.html,
# achiever.html, session_lessons.html, …) as plain escaped text. Not one
# was clickable — while this page's OWN footer already links
# `../system_flow_map.md`, i.e. the working relative-path convention
# was already established here and applied to exactly one mention out of
# dozens.
#
# `_doclinks()` closes that, deliberately gated on real existence rather
# than a hand-typed roster, so it can never emit a dead link:
#   * a token must look like a bare `<name>.html`/`.md` filename (no
#     directory part), which by construction excludes the ritual
#     `source` paths (`.claude/skills/Bedtime/SKILL.md` — `SKILL.md`
#     alone does not exist at the repo root, so it stays honest plain
#     text, which is correct: `.claude/` is not served);
#   * it must genuinely exist right now, checked at build time, at the
#     repo root (linked `../name`) or in graphify-out/ (linked `name`);
#   * anything else — a `.js` file, a `.txt` record pattern, a Supabase
#     table name, `daily_priorities_debate_YYYY-MM-DD.txt` — is left
#     exactly as it was. A file that gets renamed or archived stops
#     being linked on the very next build instead of rotting.
_LINKABLE = re.compile(r'\b([A-Za-z][A-Za-z0-9_]*\.(?:html|md))\b')
_ROOT = Path('.')
_OUTDIR = Path('graphify-out')
# Real app source, not an oversight doc — never linked even though it
# exists (artifact 7 names it as the home of SELF_KNOWLEDGE, which is a
# code location, not a browsable document).
_NEVER_LINK = {'index.html'}


def _doc_href(name):
    """Real, build-time-checked destination for a named doc, or None."""
    if name in _NEVER_LINK:
        return None
    if (_ROOT / name).is_file():
        return '../' + name
    if (_OUTDIR / name).is_file():
        return name
    return None


def _doclinks(text):
    """Escape first, then linkify — filenames carry no HTML-special
    characters, so this order is safe and never double-escapes a link
    it just created."""
    def sub(m):
        href = _doc_href(m.group(1))
        return f'<a class="doclink" href="{href}">{m.group(1)}</a>' if href else m.group(1)
    return _LINKABLE.sub(sub, esc(text))

# Real, hand-transcribed one-line summary of update-logging-system/SKILL.md's
# own 18 artifact types — source of truth is that file; this is a mirror,
# not a re-derivation. Update that file first, then this table.
PUSH_BUILD_TRIGGERS = [
    (1, 'A durable fact about RPGACE changes', 'CLAUDE.md Current State (one line) + patch_notes.html (dated card) + Chronicles (system_updates)'),
    (2, 'Architecture/structural change (new module, new cross-module connection)', 'interconnection_map.md (current-state paragraph, never a changelog)'),
    (3, 'Pipeline/flow change (a built/not-built status moves)', 'system_flow_map.md (the affected diagram + truth table)'),
    (4, 'A genuinely new wing (entrance/hub/exit in the info-flow sense)', 'minotaur_map.html'),
    (5, 'User-facing surface change (new button, new table ref, new roadmap status)', 'manual.html'),
    (6, 'Taxonomy structural change (columns/query shape, not content)', 'taxonomy_map.html'),
    (7, "Oracle's own self-knowledge touched (Current State/landmines/open items)", 'oracleAppGrounding.SELF_KNOWLEDGE (rpgace_core.js) — the artifact that went stale and triggered this whole skill’s creation'),
    (8, 'Tooling/rules catalog change (new skill, new global tool, new rule file)', 'ai_tooling_and_rules_map.md'),
    (9, 'A skill produces a new real precedent/guardrail/finding through use', "that skill's own .md file, same session, not deferred"),
    (10, 'rpgace_core.js/main.js/api/*.js structural change', 'graphify --update --code-only, then export html → recolor → river-group → obsidian-vault-html (graph.html + obsidian_vault.html), in that order'),
    (11, 'interconnection_map.md/taxonomy_placement_rules.txt/a skill .md changes in a way that could affect an EXISTING minotaur_map.html river', "cross-check that river's own text in minotaur_map.html — flag if stale, never silently auto-rewrite"),
    (12, 'A Current State entry is confirmed fully resolved, no longer re-litigated', 'move the full narrative to the paired archive (CLAUDE_archive.md / patch_notes_archive.html / records/YYYY-MM/), rewrite the live entry to one present-tense bullet'),
    (13, "This session's own evidence-gathering touches a fact a doc asserts as current", 'compare live value vs. the doc’s claim right there, in the same pass — mandatory on every real report/push, not just at Bedtime'),
    (14, 'A Supabase table this session touched gains rows/schema/a new write path', 'scripts/supabase_dedup_scan.py against that table, findings-only, appended to a dated record'),
    (15, 'A /colourgradient, /paranoia, or /drift pass produces a real blue/red/yellow finding', 'future_integrations.html (grouped by what it actually touches)'),
    (16, 'Content is about to be ADDED to manual.html (or any Tier (a) doc)', 'real dedup discipline — find its existing group/table row first, never a new flat entry'),
    (17, 'A real /misunderstanding, /drift finding, or genuine obstacle gets resolved', 'session_lessons.html (trigger, obstacle, reasoning, solution, resulting rule)'),
    (18, 'A /colourgradient pass finds a real stale CLAIM (not broken code)', 'achiever_archive (achiever.html) — PLUS active removal from every Tier (a)-(d) doc/smoke_test_items row still asserting it'),
]

# Real, transcribed step sequences — each cites its real source file + step.
RITUALS = [
    {
        'id': 'bedtime', 'icon': '\U0001F319', 'label': 'Bedtime (session-END)',
        'source': '.claude/skills/Bedtime/SKILL.md',
        'desc': 'The session-END ritual — makes sure real work is actually recorded before the session ends. Alex-named July 24.',
        'steps': [
            ('Step 1', 'Run update-logging-system’s 18-item dependency map (see the Push/Build tab) as a fast checklist — each artifact marked touched or skipped-with-a-real-reason. This step IS an invocation of the Summary skill, not a re-hash of it.', 'whichever of the 18 artifacts apply + Chronicles (system_updates)'),
            ('Step 1 (nested)', 'Summary’s own impeccable sub-step runs here too — a real design scan logged as part of closing out.', 'system_updates (category design-scan, only if changed)'),
            ('Step 1b', 'Write one real session_memory row: summary, key_decisions, open_threads, referenced_inputs, tags — the fuller texture patch_notes.html’s dated card and CLAUDE.md’s pruned bullets deliberately don’t carry.', 'session_memory (Supabase)'),
            ('Step 2', 'Verify before writing — check real git log and real Supabase state, don’t trust session memory alone.', 'read-only, no doc write'),
            ('Step 3', 'Close out plainly — a real "SESSION CLOSED" card stating what’s live vs. held vs. deferred, and why.', 'patch_notes.html'),
            ('Step 4', 'Hand off to /Routine — the next session opens with an accurate, current backlog to work from.', 'no doc write, a process handoff'),
        ],
    },
    {
        'id': 'routine', 'icon': '☀️', 'label': 'Routine (session-START)',
        'source': '.claude/skills/Routine/SKILL.md',
        'desc': 'The session-START ritual — decides what today’s real work should be via a structured two-team debate. Alex-named July 23.',
        'steps': [
            ('Step 1', 'GODMODE evidence pass — real git log, live code state, EVERY oversight doc read individually (not skimmed), Chronicles, session_memory, ceo_plan_items (when a real /CEO plan exists), open spec-backlog .txt files, and real RPGACE-side activity Claude Code did NOT originate (journal/chronicles_finance/content_productions/taxonomy review-queue actions).', 'READS every real oversight doc + Chronicles + session_memory + ceo_plan_items + several Supabase tables — no writes yet'),
            ('Step 2', 'Team 2’s real counter-case — what Team 1 left out, and why it should outrank something included.', 'no doc write'),
            ('Step 3', '/Debate between Team 1 and Team 2’s real positions (GODMODE + Omnitrix without Fable by default + /scope).', 'no doc write'),
            ('Step 4', '/5thDimension reconciliation, without Fable — check the reconciled list against what’s actually built vs. reported.', 'no doc write'),
            ('Step 5', 'Final Council of 5 lock-in — the actual Top 10 for the day, plus an honest drop-list.', 'no doc write'),
            ('Output', 'A concise Top 10 in chat, plus the full debate/reasoning trail saved to a dated record file.', 'daily_priorities_debate_YYYY-MM-DD.txt (new file) + any doc updates the run itself decided on'),
        ],
    },
    {
        'id': 'summary', 'icon': '\U0001F4CB', 'label': 'Summary (context recovery)',
        'source': '.claude/skills/Summary/SKILL.md',
        'desc': 'Produces a rigorous, evidence-checked recap when Alex has lost the thread. Also invoked AS a sub-step by Bedtime’s own Step 1. Alex-named July 24.',
        'steps': [
            ('Step 1', 'GODMODE + /scope evidence pass — real git log, Supabase state (system_updates/session_memory/ceo_plan_items when relevant), the real current content of every oversight doc. Runs the impeccable sibling skill here too.', 'READS every oversight doc + several Supabase tables; may WRITE system_updates (design-scan row, only if changed)'),
            ('Step 2', '/5thDimension-style reconciliation (Phase 1-2 only, unless the scope genuinely warrants the full 6-phase run) — built/decided/done vs. reported so far.', 'no doc write'),
            ('Step 3', 'A real /debate on WHICH oversight doc each finding belongs in, per each doc’s own established format (patch_notes.html’s dated cards, interconnection_map.md’s architecture paragraphs, CLAUDE.md’s Current State bullets, etc.).', 'WRITES to whichever doc(s) the debate settles on — this is the real distribution step'),
            ('Step 4', 'Council of 5 on the debate’s own quality — real tension or performed tension?', 'no doc write'),
            ('Step 5', 'Council of 5 for recommendations — the actual recap Alex sees.', 'output to chat, a durable written record only when findings are substantial enough (rule 5)'),
        ],
    },
    {
        'id': 'ceo', 'icon': '\U0001F30C', 'label': 'CEO Loop 2 execution (R17)',
        'source': '.claude/skills/CEO/SKILL.md — R17',
        'desc': 'Not a session ritual with fixed steps like the 3 above — a real, standing PER-G-STEP rule for any active /CEO-tracked plan (the Galaxy Development Framework is the live example). Real distinction from rule 6’s own standing obligation: R17 additionally says WHICH doc(s) need updating for a given step is part of that step’s OWN Stage 1 evidence-gathering, not decided ad hoc afterward.',
        'steps': [
            ('/Engineer Stage 1', 'Explicitly names which real oversight doc(s) the step’s new capability affects, BEFORE Stage 2 building starts.', 'scoping only, no write yet'),
            ('/Engineer Stage 2', 'Build the real capability.', 'app code / scripts / Supabase, per the step’s own real content'),
            ('/Engineer Stage 3', 'Council-of-5 report includes those doc updates as part of the real diff being reported on — never a separately-scheduled catch-up pass.', 'whichever doc(s) Stage 1 named'),
            ('/drift re-check', 'Every build re-checked via /drift against the ratified plan baseline (ceo_plan_items/ceo_reports).', 'ceo_plan_items.evidence/status (Supabase)'),
        ],
    },
]


def esc(s):
    return (s or '').replace('<', '&lt;').replace('>', '&gt;')


def build_pushbuild_section():
    rows = ''.join(
        f'<tr><td class="seqnum">{n}</td><td class="trigcell">{_doclinks(trigger)}</td>'
        f'<td class="artcell">{_doclinks(artifact)}</td></tr>'
        for n, trigger, artifact in PUSH_BUILD_TRIGGERS
    )
    return f'''<section class="gsection" id="cat-pushbuild">
  <div class="ghead"><h2>\U0001F501 Push / Build — the standing rule-6 obligation</h2><span class="gcount">{len(PUSH_BUILD_TRIGGERS)} real trigger → artifact mapping(s)</span></div>
  <p class="catnote">Every real Tier 2+ change is supposed to trigger one or more of these, in the SAME session/commit — the full real map lives in <code>.claude/skills/update-logging-system/SKILL.md</code>; this table is a one-line-per-item mirror of it (rule 8 — update that file first, then this table), not a re-derivation. This is the "push/build" half of Alex’s own ask — not a fixed step-by-step ritual like Bedtime/Routine/Summary/CEO below, but 18 real, independently-triggered rules that fire whenever their own condition is true.</p>
  <table class="ltable"><thead><tr><th>#</th><th>Real trigger</th><th>Real artifact(s) touched</th></tr></thead>
  <tbody>{rows}</tbody></table>
</section>'''


def build_ritual_section(r):
    steps_html = ''.join(
        f'<tr><td class="stepcell">{esc(step)}</td><td class="descell">{_doclinks(desc)}</td>'
        f'<td class="artcell">{_doclinks(art)}</td></tr>'
        for step, desc, art in r['steps']
    )
    return f'''<section class="gsection" id="cat-{r["id"]}" style="display:none">
  <div class="ghead"><h2>{r["icon"]} {esc(r["label"])}</h2><span class="gcount">source: <code>{esc(r["source"])}</code></span></div>
  <p class="catnote">{_doclinks(r["desc"])}</p>
  <table class="ltable"><thead><tr><th>Real step</th><th>What it does</th><th>Real oversight artifact touched</th></tr></thead>
  <tbody>{steps_html}</tbody></table>
</section>'''


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RPGACE — Galaxy Map (Oversight Sync Dimension)</title>
<style>
  :root {{ --bg:#050508; --gold:#C9A84C; --text:#E2E2EC; --dim:#8a8a9a; --brown:#A8734A; }}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:radial-gradient(ellipse at 50% 30%, #1a1410 0%, #050508 70%);color:var(--text);font-family:'Segoe UI',system-ui,sans-serif}}
  .hero{{padding:36px 24px 16px;text-align:center}}
  .hero .eyebrow{{font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--brown);margin-bottom:8px}}
  .hero h1{{font-family:Georgia,serif;font-size:26px;color:#fff;margin-bottom:8px}}
  .hero p{{color:var(--dim);font-size:12px;max-width:860px;margin:0 auto}}
  .tabs{{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}}
  .tab{{padding:6px 14px;border-radius:16px;font-size:11px;cursor:pointer;background:rgba(255,255,255,0.05);color:var(--dim)}}
  .tab.active{{background:var(--brown);color:#1a1410;font-weight:700}}
  .gsection{{max-width:1200px;margin:0 auto;padding:24px;overflow-x:auto}}
  .ghead{{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap}}
  .ghead h2{{font-family:Georgia,serif;font-size:19px;color:#fff}}
  .gcount{{font-size:10px;color:var(--brown);font-weight:700}}
  .catnote{{font-size:11.5px;color:#a8a8b8;line-height:1.6;margin-bottom:14px;max-width:1000px}}
  .ltable{{width:100%;border-collapse:collapse;font-size:11px}}
  .ltable th{{text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:0.5px;color:var(--brown);padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.1)}}
  .ltable td{{padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.05);vertical-align:top}}
  .seqnum{{font-family:'Cascadia Code','Fira Mono',monospace;color:var(--gold);font-weight:700}}
  .trigcell{{color:#c8c8d8}}
  .stepcell{{font-family:'Cascadia Code','Fira Mono',monospace;color:var(--gold);font-weight:700;white-space:nowrap}}
  .descell{{color:#c8c8d8}}
  .artcell{{color:#8FBF8F}}
  /* G82 — a real, build-time-verified link to the actual oversight doc
     named in the cell. Deliberately subtle (a dotted underline, no
     colour change) so a linked doc name still reads as part of the
     sentence rather than turning every row into a wall of links. */
  .doclink{{color:inherit;text-decoration:none;border-bottom:1px dotted currentColor}}
  .doclink:hover{{color:var(--gold);border-bottom-style:solid}}
  .dim{{color:#6a6a78}}
  a{{color:var(--brown)}}
  .note{{max-width:1200px;margin:0 auto 40px;padding:0 24px;font-size:11px;color:#6a6a78;line-height:1.7}}
{dim_css}
</style>
</head>
<body>
<div class="hero">
  <div class="eyebrow">RPGACE Total Systems · Galaxy Map · Oversight Sync Dimension (G55)</div>
  <h1>\U0001F4DA Oversight Sync — Which Doc Gets Touched, In What Order, During What Event</h1>
  <p>Alex’s own real ask: "a bubble hierarchy for oversight docs and their connections and communications during a push, build or plan phase... also during /Summary, /Bedtime and /Routine, so i can always change how it is all rewired." The real, process-TIME counterpart to the existing static Oversight-Docs L0 unit (which shows WHO talks to whom) — this shows WHEN, sourced directly from update-logging-system/SKILL.md’s 18-item map and each ritual skill’s own real numbered steps.</p>
</div>
<div class="tabs">{tabs}</div>
{sections}
{dim_index}

<div class="note">
  Generated by <code>scripts/galaxy_map_oversight_sync.py</code>. Real, honest scope limit: this is a hand-curated snapshot of
  what each ritual’s own .md file currently states it does — it does not verify a given session actually followed the
  sequence (<a class="doclink" href="../smoke_test.html">smoke_test.html</a>/<a class="doclink" href="../error_log.html">error_log.html</a>’s
  job, not this page’s). If a skill file’s procedure changes, this page needs a
  real re-transcription. G55 of the ratified "RPGACE Total Systems Galaxy Map" /CEO plan. Mapping rules: <code>system_map_spec.md</code>.
  Real G56 pipeline-logic docs, written the same pass, going deeper on 3 of the mechanisms this page only summarizes:
  <a href="../system_flow_map.md">system_flow_map.md §12 (Oracle Mode/Fallback Scout)</a>,
  <a href="../system_flow_map.md">§13 (Achiever/Brown)</a>,
  <a href="../system_flow_map.md">§14 (Total-Systems Dispatch)</a>.
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

TABS = [
    {'id': 'cat-pushbuild', 'label': '\U0001F501 Push / Build'},
    {'id': 'cat-bedtime', 'label': '\U0001F319 Bedtime'},
    {'id': 'cat-routine', 'label': '☀️ Routine'},
    {'id': 'cat-summary', 'label': '\U0001F4CB Summary'},
    {'id': 'cat-ceo', 'label': '\U0001F30C CEO Loop 2'},
]


def main():
    tabs = ''.join(f'<div class="tab" data-target="{t["id"]}">{t["label"]}</div>' for t in TABS)
    sections = build_pushbuild_section() + ''.join(build_ritual_section(r) for r in RITUALS)
    html = TEMPLATE.format(tabs=tabs, sections=sections,
                           dim_index=dimension_index_html(OUT.name),
                           dim_css=DIMENSION_INDEX_CSS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = inject_level_rail(html, OUT.name)
    OUT.write_text(html, encoding='utf-8')
    # G82 — real, measured doc-link coverage, printed so a build can
    # never silently regress it (and so a renamed/archived doc shows up
    # as a drop in the linked count instead of vanishing quietly).
    named, linked = set(), set()
    _texts = [t for _n, a, b in PUSH_BUILD_TRIGGERS for t in (a, b)]
    _texts += [r['desc'] for r in RITUALS]
    _texts += [t for r in RITUALS for _s, d, a in r['steps'] for t in (d, a)]
    for _t in _texts:
        for _m in _LINKABLE.findall(_t):
            named.add(_m)
            if _doc_href(_m):
                linked.add(_m)
    print(f"Wrote {OUT} — {len(PUSH_BUILD_TRIGGERS)} push/build triggers, "
          f"{len(RITUALS)} real ritual sequences ({sum(len(r['steps']) for r in RITUALS)} total steps).")
    print(f"  G82 doc links — {len(linked)}/{len(named)} distinct named doc file(s) resolve to a real file "
          f"and are linked; unresolved: {', '.join(sorted(named - linked)) or 'none'}.")


if __name__ == '__main__':
    main()
