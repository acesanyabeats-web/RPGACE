#!/usr/bin/env python3
"""
perspective_generate_mainjs_functions.py — Sep 8 2026, real G11 FEATURE-
scope continuation (Alex: "yes build", after the same-day /interrogation
that first corrected G11's own stale "~116 remaining" figure to 138 —
then, DURING this build, a second real correction: 138 was itself wrong).

Module scope (44/44) and onclick-feature scope (47/47) both shipped Aug
14. This is the real, bounded next slice: every real top-level function
in the legacy main.js block (rpgace_core.js's `/* ===LEGACY:mainjs=== */`
... `/* ===END:LEGACY:mainjs=== */` section, the former main.js, merged
Aug 20) that does NOT already have a perspective_reports row of any
scope_level — computed live below via the shared `_mainjs_function_
bodies()` (rule 8, reused not reimplemented), never a hardcoded list.

Real, honest SECOND correction, found while building this (not before):
the same-day /interrogation's own "138 remaining" figure was itself
wrong — its quick one-off scan (written for that interrogation only, not
this real generator) used a regex requiring the literal word `function`
immediately after `^`, which silently misses every `async function
name(...)` top-level declaration. Reusing this project's own EXISTING
shared `_mainjs_function_bodies()` (graphify_river_group.py) instead of
re-deriving detection a second time — rule 8's whole point — surfaced
this immediately: it already handled `async function` correctly, so its
real count (219 total legacy functions, not 165) exposed the gap. Real,
corrected numbers, verified directly against the live file: 219 total,
43 already covered (not 27 — 16 more of the 47 onclick_feature names
resolve inside the legacy block once `_mainjs_function_bodies()` itself
was ALSO extended this same pass to catch the `const/let/var name =
function` and bare `window.name = function` shapes it was previously
missing — see that function's own docstring), 176 real remaining.

Same real, evidence-only discipline as both prior generators: for each
function, cites its real definition location and a real verbatim
excerpt — never fabricated. Since these are NOT onclick-triggered (that
slice is already done), the real, honest signal used instead is a bare
same-name call-site count elsewhere in the file (excluding the
definition line itself) — a cheap, checkable proxy for "is this
actively invoked," not a claim about HOW it's invoked.

Real, honest scope limit, stated plainly (same class of caveat every
detector in this codebase already carries): a bare call-site grep cannot
see a call reached through `RPGACE.hooks.fire()`, a DOM event attribute
other than onclick (onchange/oninput/etc. in index.html — some of those
ARE covered already, via the onclick_feature slice's own combined
onclick/onchange/oninput scan), a stored callback reference, or a
dynamic property lookup. A function with 0 detected call sites is NOT
proof it's dead.

Outputs one SQL file (perspective_mainjs_batch_2026-09-08.sql) for
review before execution — never auto-applied.
"""
import json
import re
from pathlib import Path

from graphify_river_group import _mainjs_function_bodies, sql_escape  # rule 8

CORE_JS = Path('rpgace_core.js').read_text(encoding='utf-8')
OUT = Path('perspective_mainjs_batch_2026-09-08.sql')

# Real, already-covered scope_ids (perspective_reports, ALL scope_levels —
# module/node/galaxy/l0_unit/decision/onclick_feature) as of this pass. This
# script cannot reach Supabase directly (this session's own outbound proxy
# blocks raw supabase.co calls, same standing limitation as
# scripts/supabase_dedup_scan.py's own real, honest note) — so this is a
# real snapshot taken via the Supabase MCP tool (a live `SELECT scope_id
# FROM perspective_reports ORDER BY scope_id`) immediately before this run,
# not a live query the script performs itself. Re-run that SELECT and
# refresh this set before any future re-run of this generator.
ALREADY_COVERED = {
    'accept-concept-fusion', 'accept-phylumpath-proposal', 'acceptSuggestions',
    'agendaReminder', 'agentsIntoOracle', 'alex', 'anthropic_claude',
    'article-confirm', 'authGate', 'beatLog', 'beginSession', 'bookworm',
    'bookworm-delete', 'careerStatCard', 'checkPassword', 'chroniclesLog',
    'ciAutoPropose', 'clearEncyclopedia', 'clearJournal', 'closeFocusOverlay',
    'closeGlobalPanel', 'closeJournalEntry', 'closeSessionSetup',
    'closeSuggestion', 'composio', 'conidPot', 'conidpot-delete',
    'conn_composio', 'conn_ffmpeg', 'conn_graphify_cc', 'conn_jina',
    'conn_lastfm', 'conn_librosa', 'conn_n8n', 'conn_openart',
    'conn_openmontage', 'conn_whisper', 'contentProductionLive',
    'contentRepurpose', 'copyDescription', 'debugComposio',
    'edit-phylumpath-proposal', 'encSync', 'encTaxonomyLink',
    'encyclopediaQoL', 'exitFocusToEnc', 'external_ai', 'feynman',
    'fireBeatAnalysis', 'fireInstaCommand', 'fireProdCommand',
    'generateAgendas', 'graphify_cc', 'human_gate_alex', 'importIntelJSON',
    'instaOraclePanel', 'intel-delete-confirm', 'intelBatchList',
    'intelDedup', 'intelDelete', 'jargonEncyclopedia', 'jina', 'journalQoL',
    'knowledgeGap', 'lastfm', 'librosa', 'loadDemoShifts', 'logStopReason',
    'mockOracle', 'moonshot_kimi', 'morningBrief', 'n8n', 'openai_luna',
    'openJournalEntry', 'openmontage_cc', 'oracle', 'oracle_api',
    'oracleAppGrounding', 'oracleDevBridge', 'oracleFetchGuard',
    'oracleImageUpload', 'oracleTreeGrounding', 'orchestrator_cc',
    'oversight_docs', 'parsePasteInput', 'pathRouter', 'phylumPath',
    'pickDuration', 'placement-confirm', 'prodOraclePanel', 'quickPrompt',
    'refCorpus', 'refreshEncyclopediaDisplay', 'refreshJournalDisplay',
    'reopenFocusOverlay', 'researchTabs', 'rpgace_architecture',
    'runVideoWorkshop', 'saveJournalEntry', 'saveWorkshopToEncyclopedia',
    'saveWorkshopToNotion', 'scheduleFixes', 'scheduleOracle',
    'searchVideos', 'self_awareness', 'sendChatWithImage', 'setEncCategory',
    'setEncSort', 'shiftSync', 'showIntelTab', 'showPasteArea', 'showSched',
    'skills', 'submitIntelURL', 'supabase_core', 'syncAndPush',
    'syncIntelData', 'taxonomyReviewQueue', 'taxonomySync', 'taxonomyTree',
    'tiktokOracle', 'toggleInstaPanel', 'toggleProdOraclePanel',
    'togglePwVis', 'toggleVoiceInput', 'triggerGlobalIdentify',
    'undo-conid-stage', 'video-summary-delete', 'videoPipeline',
    'videoSummary', 'visualOracle', 'whisper', 'youtubeOracle',
}


def call_site_count(text, name, def_line_no):
    """Real bare-call count elsewhere in the file, excluding the
    function's own definition line (identified by line number, not by
    re-matching the definition pattern a second time — rule 8, reuses
    what the caller already knows instead of re-deriving it)."""
    pattern = re.compile(r'(?<![\w.])' + re.escape(name) + r'\s*\(')
    count = 0
    for i, line in enumerate(text.splitlines()):
        if i == def_line_no - 1:
            continue
        count += len(pattern.findall(line))
    return count


def main():
    bodies = _mainjs_function_bodies()
    all_funcs = sorted(bodies.keys())
    remaining = [f for f in all_funcs if f not in ALREADY_COVERED]

    rows = []
    for f in remaining:
        body = bodies[f]
        excerpt = '\n'.join(body.splitlines()[:8])
        # Real line number: count newlines before this function's own body
        # text starts in the legacy section — approximate via a direct
        # search, since _mainjs_function_bodies() doesn't return one.
        from graphify_river_group import _legacy_mainjs_text
        legacy_text = _legacy_mainjs_text()
        idx = legacy_text.find(body.splitlines()[0])
        line_no = legacy_text[:idx].count('\n') + 1 if idx != -1 else None
        where = f'main.js legacy block:{line_no}' if line_no else 'main.js legacy block (line unresolved)'
        calls = call_site_count(CORE_JS, f, line_no or -1)
        self_report = (
            f"I am a real function defined at {where}, called {calls} time(s) "
            f"elsewhere in rpgace_core.js by a bare same-name call (a real, "
            f"checkable but NOT exhaustive signal — see this generator's own "
            f"honest scope-limit note on hooks/DOM-event/callback-reference "
            f"calls it cannot see)."
        )
        expected = (
            "Real behavior not yet hand-verified against live app use; my "
            "role is inferred from my own definition and detected call "
            "sites, not confirmed by direct observation."
        )
        cite = f'{where}\n{excerpt}'
        rows.append((f, self_report, expected, cite, calls))

    lines = [
        "-- perspective_mainjs_batch_2026-09-08.sql — G11 feature-scope continuation,",
        f"-- {len(rows)} real remaining legacy main.js functions (module + onclick-feature scope both already done)",
        "-- Real evidence only, generated by scripts/perspective_generate_mainjs_functions.py",
        "-- Review before running.\n",
    ]
    for f, self_report, expected, cite, calls in rows:
        # Real fix, Sep 8 2026 — a first version of this generator hand-
        # interpolated the evidence field as a raw f-string, which put an
        # UNESCAPED literal newline inside a JSON string value for any
        # multi-line code excerpt (most of them) — invalid per the JSON
        # spec, confirmed via a direct Postgres test (`0x0a must be
        # escaped`) before this batch was ever applied, not after a failed
        # run. `json.dumps()` now builds the real evidence object and
        # escapes everything (newlines, quotes, backslashes) correctly;
        # only the resulting JSON STRING (whose own internal quoting is
        # already valid) gets the standard `sql_escape()` treatment for
        # the outer SQL string literal.
        evidence_json = json.dumps([{'cite': cite, 'call_site_count': calls}])
        lines.append(
            "INSERT INTO perspective_reports (scope_level, scope_id, scope_label, self_report, expected_behavior, evidence, status) VALUES ("
            f"'mainjs_function', '{sql_escape(f)}', '{sql_escape(f)}', "
            f"'{sql_escape(self_report)}', '{sql_escape(expected)}', "
            f"'{sql_escape(evidence_json)}'::jsonb, 'unverified');"
        )
    OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f"Wrote {OUT} — {len(all_funcs)} total real legacy functions, {len(ALREADY_COVERED & set(all_funcs))} already covered, {len(rows)} new rows generated.")


if __name__ == '__main__':
    main()
