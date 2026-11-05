#!/usr/bin/env python3
"""AR-3 (Nov 5 2026, Alex: re-audit after big UI changes). Compares two crawl JSONs from scripts/audit/ui_crawl.cjs
and writes what changed: screens gone / new, buttons that now do nothing or now show an error, new page errors.
Run after every plan that changes screens:  python3 scripts/audit/ui_diff.py before.json after.json out.md
Exit 1 when something got worse (a new dead button, a new error toast, a new page error), so it can gate a ship."""
import json, re, sys, collections

def load(p):
    a = json.load(open(p))
    seen, E = set(), []
    for e in a['edges']:
        s = (e['from'], e['button'], e.get('to'), bool(e.get('sameScreenChanged')))
        if s in seen: continue
        seen.add(s); E.append(e)
    return a, E

T = lambda k: re.sub(r'Sample [a-z_ ]+\d+', 'Sample', re.sub(r'\d', '#', k.split('|', 2)[2]))[:70]
L = lambda b: re.sub(r'\d+[\d:/.,%£]*', '#', b or '').strip().lower()[:50]
dead = lambda e: not e.get('to') and not e.get('sameScreenChanged') and not e.get('toasts') and not e.get('gone') and not e.get('newTab')
err = lambda e: any('⚠' in t for t in (e.get('toasts') or []))

a0, E0 = load(sys.argv[1]); a1, E1 = load(sys.argv[2]); out = sys.argv[3]
s0 = {T(k) for k in a0['screens']}; s1 = {T(k) for k in a1['screens']}
d0 = {(T(e['from']), L(e['button'])) for e in E0 if dead(e)}; d1 = {(T(e['from']), L(e['button'])) for e in E1 if dead(e)}
r0 = {(T(e['from']), L(e['button']), (e['toasts'] or [''])[0][:60]) for e in E0 if err(e)}; r1 = {(T(e['from']), L(e['button']), (e['toasts'] or [''])[0][:60]) for e in E1 if err(e)}
p0 = set(a0.get('pageErrors') or []); p1 = set(a1.get('pageErrors') or [])
newDead = sorted(d1 - d0); fixed = sorted(d0 - d1); newErr = sorted(r1 - r0); newPage = sorted(p1 - p0)
Lines = ['# UI audit diff\n', 'Before: ' + a0.get('generated', '?')[:16] + ' (' + str(len(s0)) + ' screens) · After: ' + a1.get('generated', '?')[:16] + ' (' + str(len(s1)) + ' screens)\n']
def sec(title, rows, fmt):
    Lines.append('## ' + title + ' (' + str(len(rows)) + ')\n'); Lines.extend('- ' + fmt(r) for r in rows[:150]); Lines.append('')
sec('Screens gone', sorted(s0 - s1), lambda r: r)
sec('New screens', sorted(s1 - s0), lambda r: r)
sec('Buttons that now do nothing', newDead, lambda r: r[0] + ': ' + r[1])
sec('Buttons fixed (did nothing before)', fixed, lambda r: r[0] + ': ' + r[1])
sec('New error messages', newErr, lambda r: r[0] + ': ' + r[1] + ' → ' + r[2])
sec('New page errors', newPage, lambda r: r)
open(out, 'w').write('\n'.join(Lines) + '\n')
print('wrote', out, '| gone', len(s0 - s1), 'new', len(s1 - s0), 'newDead', len(newDead), 'fixed', len(fixed), 'newErr', len(newErr), 'newPageErr', len(newPage))
sys.exit(1 if (newDead or newErr or newPage) else 0)
