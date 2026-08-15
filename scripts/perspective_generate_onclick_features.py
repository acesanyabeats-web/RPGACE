#!/usr/bin/env python3
"""
perspective_generate_onclick_features.py — Aug 14 2026, real G11 FEATURE-
scope continuation (Alex: "and g11 somewhere in the mix too"). Module
scope (44/44) shipped earlier this session; this is the real, bounded
first slice of FEATURE scope — the 47 unique real functions index.html's
onclick attributes actually call (a smaller, well-defined subset of the
"93 onclick handlers" figure, since several onclick attributes call the
same function). main.js's remaining ~116 non-onclick-triggered functions
stay explicitly NOT started — a real, separate, larger slice for a
future session, same discipline as module scope's own staged rollout.

Same real, evidence-only discipline as perspective_generate_modules.py
(rule 8, not re-derived): for each onclick function name, checks real
definition location (main.js / rpgace_core.js window-bridge / neither),
counts real onclick call sites in index.html, and cites a real verbatim
code excerpt — never fabricated.

Real, honest finding from this pass's own evidence-gathering, not
assumed: CLAUDE.md's standing "2 dead onclick buttons" landmine
(loadDemoShifts/debugComposio) undercounts by one. `quickPrompt` LOOKS
dead by the same static-grep test (no function definition anywhere) but
is NOT actually broken — `quickActions._setup()` (rpgace_core.js:1121)
finds every `onclick*="quickPrompt"` button at runtime, clones it,
strips the onclick, and wires a real addEventListener to `self._send()`
instead. A real, deliberate runtime-patch pattern, not a bug — flagged
distinctly from the 2 genuinely dead ones so a future session doesn't
conflate the two.

Outputs one SQL file (perspective_onclick_batch_2026-08-14.sql) for
review before execution — never auto-applied.
"""
import re
from pathlib import Path

MAIN_JS = Path('main.js').read_text(encoding='utf-8')
CORE_JS = Path('rpgace_core.js').read_text(encoding='utf-8')
INDEX_HTML = Path('index.html').read_text(encoding='utf-8')
OUT = Path('perspective_onclick_batch_2026-08-14.sql')

# Real, honest exception list — confirmed by direct evidence, not assumed.
GENUINELY_DEAD = {'debugComposio', 'loadDemoShifts'}
RUNTIME_PATCHED = {
    'quickPrompt': ('quickActions', '_setup',
                     "quickActions._setup() (rpgace_core.js:1121) finds every real onclick*=\"quickPrompt\" button at runtime, clones it, strips the onclick, and wires a real addEventListener calling self._send(text) instead — a deliberate runtime-patch pattern, NOT a bug.")
}


def find_func_body(text, name, max_lines=8):
    m = re.search(r'function\s+' + re.escape(name) + r'\s*\([^)]*\)\s*\{', text)
    if not m:
        m = re.search(r'\bwindow\.' + re.escape(name) + r'\s*=\s*function\s*\([^)]*\)\s*\{', text)
    if not m:
        return None, None
    start = text[:m.start()].count('\n') + 1
    body_start = m.end()
    depth = 1
    i = body_start
    while i < len(text) and depth > 0:
        if text[i] == '{':
            depth += 1
        elif text[i] == '}':
            depth -= 1
        i += 1
    body = text[m.start():i]
    lines = body.splitlines()[:max_lines]
    return start, '\n'.join(lines)


def sql_escape(s):
    return (s or '').replace("'", "''")


def main():
    funcs = sorted(set(re.findall(r'onclick="([a-zA-Z_][a-zA-Z0-9_]*)\(', INDEX_HTML)))
    rows = []
    for f in funcs:
        call_count = len(re.findall(r'onclick="' + re.escape(f) + r'\(', INDEX_HTML))
        if f in GENUINELY_DEAD:
            self_report = f"I am a real onclick handler referenced {call_count} time(s) in index.html, but no function named {f} exists anywhere in main.js or rpgace_core.js."
            expected = "Clicking the triggering button throws a silent \"X is not defined\" console error — a real, pre-existing dead button (CLAUDE.md's own standing landmine note), not implemented and not runtime-patched."
            status = 'unverified'
            cite = 'grep confirms zero definitions in main.js/rpgace_core.js'
        elif f in RUNTIME_PATCHED:
            mod, fn, note = RUNTIME_PATCHED[f]
            self_report = f"I look dead by a static grep ({call_count} onclick reference(s), no function definition), but I am NOT actually broken."
            expected = note
            status = 'unverified'
            cite = f'{mod}.{fn} (rpgace_core.js)'
        else:
            line_main, body_main = find_func_body(MAIN_JS, f)
            line_core, body_core = find_func_body(CORE_JS, f)
            if line_main:
                where = f'main.js:{line_main}'
                excerpt = body_main
            elif line_core:
                where = f'rpgace_core.js:{line_core}'
                excerpt = body_core
            else:
                where = 'UNRESOLVED'
                excerpt = ''
            self_report = f"I am a real function triggered by {call_count} onclick attribute(s) in index.html, defined at {where}."
            expected = f"Clicking the real triggering button runs the code defined at {where}; real behavior not yet hand-verified against a live click."
            status = 'unverified'
            cite = f'{where}\\n{excerpt}' if excerpt else where
        rows.append((f, self_report, expected, cite, status, call_count))

    lines = ["-- perspective_onclick_batch_2026-08-14.sql — G11 feature-scope, 47 real onclick functions",
             "-- Real evidence only, generated by scripts/perspective_generate_onclick_features.py",
             "-- Review before running.\n"]
    for f, self_report, expected, cite, status, n in rows:
        lines.append(
            "INSERT INTO perspective_reports (scope_level, scope_id, scope_label, self_report, expected_behavior, evidence, status) VALUES ("
            f"'onclick_feature', '{sql_escape(f)}', '{sql_escape(f)}', "
            f"'{sql_escape(self_report)}', '{sql_escape(expected)}', "
            f"'[{{\"cite\": \"{sql_escape(cite)}\", \"onclick_count\": {n}}}]'::jsonb, '{status}');"
        )
    OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    dead = [f for f in funcs if f in GENUINELY_DEAD]
    patched = [f for f in funcs if f in RUNTIME_PATCHED]
    print(f"Wrote {OUT} — {len(funcs)} real onclick functions. {len(dead)} genuinely dead: {dead}. {len(patched)} runtime-patched (not dead): {patched}.")


if __name__ == '__main__':
    main()
