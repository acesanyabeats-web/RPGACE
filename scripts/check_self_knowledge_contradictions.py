#!/usr/bin/env python3
"""check_self_knowledge_contradictions.py — addresses the one honest,
named limitation of check_self_knowledge_staleness.py (Sep 23 2026): that
script catches CALENDAR/VOLUME drift (SELF_KNOWLEDGE hasn't been touched
in a while, or a lot has shipped since), never CONTENT correctness -- a
session could touch the string's own date and still leave something
factually wrong in it, which is technically what the original Quest
Board bug was ("zero persistence... NOT connected to the real career
score", a claim questEngine's real Aug 23-24 build had already falsified,
uncorrected for a month).

This is a real, but deliberately BOUNDED mechanism, not a general fact-
checker (that would need an AI call re-reading the whole string against
the whole codebase's actual behavior every session -- real token cost,
rule 11, and out of scope for an automatic per-session check). What this
DOES catch, mechanically, zero AI cost: a NEGATIVE/ABSOLUTE claim
("zero persistence", "not connected", "does not exist"...) made about a
real, named module or Supabase table, where the codebase's OWN current
write evidence for that exact entity now contradicts the claim. This is
precisely the shape of the Quest Board bug -- a claim anchored to a real
identifier (questEngine, in the current rewritten text) that a later
real code change silently falsified.

Honest, named scope limits, not hidden:
  - Only catches a negative claim phrased near a REAL module/table
    identifier by name. A claim phrased only around a bare function name
    with no module/table named nearby (the ORIGINAL bug's own exact
    wording -- "addXP()/completeQuest()... zero persistence", no module
    name given) would NOT have been caught by this exact mechanism at
    the time it happened. It WOULD be caught now, because the Sep 23
    2026 rewrite's own text names the real owning module (questEngine)
    when making the corrected claim -- this script's existence is also
    real, deliberate pressure toward that authoring habit going forward
    (see the new rule added to CLAUDE.md's Building Guide).
  - Only checks a curated, narrow, deliberately high-precision list of
    negation phrases (rule 7 -- never invent a broad fuzzy-match net that
    would just produce noise). A real wrong claim phrased without one of
    these exact markers will not be caught.
  - Only checks PERSISTENCE/CONNECTION/EXISTENCE-shaped claims (the real
    bug class that occurred), not every possible kind of factual error.

Usage: python3 scripts/check_self_knowledge_contradictions.py
  Exit code 0 = no real contradiction found. Exit code 1 = at least one
  real, checkable contradiction found -- always prints the real sentence
  and the real code evidence, never just a bare "something's wrong."
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from check_self_knowledge_staleness import extract_self_knowledge  # noqa: E402  (rule 8 -- one shared extractor, not re-derived)

REPO_ROOT = Path(__file__).resolve().parent.parent
CORE_JS = REPO_ROOT / "rpgace_core.js"

# Real, narrow, high-precision negation phrases -- every one pulled from
# actual observed vocabulary in this project's own oversight docs (rule 7,
# never invented). Deliberately excludes broader words like "dormant"/
# "not yet"/"never" alone -- those are used constantly for genuinely still-
# true statements (Fish Audio really is dormant) and would flood this with
# false positives. These specifically mean "this thing does not persist/
# connect/exist AT ALL", the exact absolute-state shape the real bug had.
NEGATION_PHRASES = [
    'zero persistence', 'no persistence', 'no real persistence',
    'not connected to', 'NOT connected', 'does not exist', 'DOES NOT exist',
    'nowhere persistent', 'has no real', 'has zero',
]

WRITE_CALL_RE = re.compile(r"RPGACE\.sb\.(?:insert|update|del|secureWrite)\(\s*'([a-zA-Z_]+)'")
RAW_FETCH_WRITE_RE = re.compile(r"return=representation")


def real_module_names(core_text):
    return sorted(set(re.findall(r"/\* ===MODULE:([a-zA-Z_]+)=== \*/", core_text)))


def real_table_write_targets(core_text):
    return sorted(set(WRITE_CALL_RE.findall(core_text)))


def module_body(core_text, name):
    m = re.search(
        r"/\* ===MODULE:" + re.escape(name) + r"=== \*/(.*?)/\* ===END:" + re.escape(name) + r"=== \*/",
        core_text, re.DOTALL,
    )
    return m.group(1) if m else ""


def module_has_write_evidence(core_text, name):
    body = module_body(core_text, name)
    if not body:
        return False
    if WRITE_CALL_RE.search(body):
        return True
    if RAW_FETCH_WRITE_RE.search(body):
        return True
    return False


def table_has_write_evidence(core_text, table):
    # A real write call anywhere in the file targeting this exact table
    # name (not scoped to one module -- a table can legitimately be
    # written from more than one real caller).
    return bool(re.search(r"RPGACE\.sb\.(?:insert|update|del|secureWrite)\(\s*'" + re.escape(table) + r"'", core_text))


def split_sentences(text):
    # A simple, real, good-enough splitter for this purpose (not a real
    # NLP sentence boundary detector) -- splits on '. ' or '; ' followed
    # by a capital letter, matching how this string is actually written
    # (one long run-on paragraph of real clauses separated by '.'/';').
    # Splitting on ';' too (added after a real false positive was caught
    # in testing -- see strip_quoted_spans()) keeps a correcting clause
    # like "...now HAS real persistence...; this corrects an old claim
    # ('zero persistence')..." in a SEPARATE unit from the real positive
    # claim that precedes it, so the two don't get merged into one
    # sentence that trips on both an entity mention and a negation phrase.
    return re.split(r'(?<=[.:;])\s+(?=[A-Z])', text)


def strip_quoted_spans(sentence):
    # A quoted phrase is being REFERENCED or DISCUSSED (almost always to
    # say it's wrong/outdated -- exactly what a real correction sentence
    # does), never an assertion the sentence itself is making. Stripping
    # quoted spans before the negation-phrase check closes a real
    # false-positive class found in testing: a correction sentence like
    # ...now HAS real persistence... this corrects an old claim
    # ("zero persistence")... would otherwise trip the very negation
    # phrase it exists to retract. Entity-name matching still runs on the
    # FULL original sentence (unaffected) -- only the negation check uses
    # this stripped version.
    # Real bug found in testing (Sep 23 2026): the actual SELF_KNOWLEDGE
    # text quotes a retracted claim with DOUBLE quotes ("zero
    # persistence"), not single quotes -- the original single-quote-only
    # version of this function never matched it, so the false positive
    # this function exists to prevent went right through uncaught. Strip
    # BOTH quote styles, not just one.
    sentence = re.sub(r"'[^']*'", '', sentence)
    sentence = re.sub(r'"[^"]*"', '', sentence)
    return sentence


def run_check():
    if not CORE_JS.exists():
        return {'error': 'rpgace_core.js not found at expected repo-root path'}
    core_text = CORE_JS.read_text(encoding='utf-8')
    sk_text = extract_self_knowledge(core_text)
    if sk_text is None:
        return {'error': 'SELF_KNOWLEDGE property not found in rpgace_core.js'}

    modules = real_module_names(core_text)
    tables = real_table_write_targets(core_text)
    # Longest-first so a longer identifier (e.g. 'oracle_actions') isn't
    # shadowed by a shorter substring match first.
    entities = sorted(set(modules) | set(tables), key=len, reverse=True)

    sentences = split_sentences(sk_text)
    findings = []
    for sentence in sentences:
        negation_check_text = strip_quoted_spans(sentence)
        has_negation = any(phrase in negation_check_text for phrase in NEGATION_PHRASES)
        if not has_negation:
            continue
        for entity in entities:
            if not re.search(r'\b' + re.escape(entity) + r'\b', sentence):
                continue
            kind = 'module' if entity in modules else 'table'
            if kind == 'module':
                has_evidence = module_has_write_evidence(core_text, entity)
            else:
                has_evidence = table_has_write_evidence(core_text, entity)
            if has_evidence:
                findings.append({
                    'entity': entity,
                    'kind': kind,
                    'sentence': sentence.strip(),
                })

    return {'findings': findings, 'modules_checked': len(modules), 'tables_checked': len(tables)}


def main():
    result = run_check()
    if 'error' in result:
        print('SELF_KNOWLEDGE CONTRADICTION CHECK: ERROR -', result['error'])
        sys.exit(1)

    findings = result['findings']
    print(f"SELF_KNOWLEDGE CONTRADICTION CHECK: checked {result['modules_checked']} real modules, "
          f"{result['tables_checked']} real table-write-targets against {len(NEGATION_PHRASES)} curated negation phrases.")
    if not findings:
        print("  No real contradiction found.")
        sys.exit(0)

    print(f"  {len(findings)} REAL, CHECKABLE CONTRADICTION(S) FOUND:")
    for f in findings:
        print(f"  - {f['kind']} `{f['entity']}` — SELF_KNOWLEDGE claims a negative/absolute state, but real code shows a write call for it:")
        print(f"      \"{f['sentence'][:220]}{'...' if len(f['sentence']) > 220 else ''}\"")
    print("  ACTION NEEDED: re-verify each claim above against live code/Supabase (rule 4 — real evidence,")
    print("  not a guess) before rewriting; a genuine false positive is possible (e.g. a write call that")
    print("  exists but is dead/unreachable code) — confirm before editing SELF_KNOWLEDGE.")
    sys.exit(1)


if __name__ == '__main__':
    main()
