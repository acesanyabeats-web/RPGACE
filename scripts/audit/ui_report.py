#!/usr/bin/env python3
"""UA-1 UI audit report (Nov 4 2026). Reads the crawler's JSON (scripts/audit/ui_crawl.cjs) and writes a Markdown map:
login -> every screen (what it shows, its buttons and where each one leads, side menu excluded), then computed findings:
screens only the side menu reaches, screens with many ways in, button labels repeated across screens (general-toolkit
candidates), buttons with no visible effect, buttons that raised an error. Usage: ui_report.py audit.json out.md"""
import json, re, sys, collections

a = json.load(open(sys.argv[1]))
out = sys.argv[2]
S = a['screens']
_seen, E = set(), []
for e in a['edges']:
    sig = (e['from'], e['button'], e.get('to'), bool(e.get('sameScreenChanged')))
    if sig in _seen: continue
    _seen.add(sig); E.append(e)

def name(k):
    if not k: return ''
    kind, page, title = (k.split('|') + ['', '', ''])[:3]
    return ('🪟 ' if kind == 'popup' else '📄 ') + (title or page or '?')

def norm_label(t):
    t = re.sub(r'\d+[\d:/.,%£]*', '#', t or '')
    t = re.sub(r'\s+', ' ', t).strip().lower()
    return t[:40]

by_from = collections.defaultdict(list)
for e in E: by_from[e['from']].append(e)
inbound = collections.defaultdict(set)
for e in E:
    if e.get('to') and e['to'] != e['from']: inbound[e['to']].add(e['from'])
nav_to = collections.defaultdict(list)
for n in a.get('nav', []): nav_to[n['to']].append(n['label'])

L = []
L.append('# RPGACE UI audit (UA-1)\n')
L.append('Generated ' + a['generated'][:16].replace('T', ' ') + '. ' + a['note'] + '\n')
L.append('Legend: 📄 page · 🪟 pop-up · → where a button leads · ↻ changes the same screen · · nothing visible happened · ⚠ error message.\n')
L.append('## Totals\n')
L.append(f"- Screens found: **{len(S)}** ({sum(1 for k in S if k.startswith('page'))} pages, {sum(1 for k in S if k.startswith('popup'))} pop-ups)")
L.append(f"- Side-menu destinations: **{len(a.get('nav', []))}**")
L.append(f"- Buttons tapped: **{len(E)}**")
L.append('- Complete: ' + ('**yes** - every screen reached by tapping was opened and every button on it tapped' if a.get('finished') else f"**not yet** - {len(a.get('queue', []))} screens still queued") + '\n')
if a.get('autoOpen'):
    L.append('### Opens by itself (not from a button)\n' + '\n'.join('- ' + x for x in a['autoOpen']) + '\n')

lg = a.get('login') or {}
L.append('## 1. Login\n')
L.append('- Shows: ' + (lg.get('text') or '?'))
L.append('- Inputs: ' + ', '.join(lg.get('inputs') or []) + ' · Buttons: ' + ', '.join(lg.get('buttons') or []) + ' → Dashboard\n')

L.append('## 2. Screens\n')
order = [k for k in S if k in by_from] + [k for k in S if k not in by_from]
for k in order:
    s = S[k]
    head = name(k)
    via = nav_to.get(k)
    L.append('### ' + head)
    if via: L.append('- Side menu: ' + ', '.join(v[:40] for v in via))
    if inbound.get(k): L.append('- Reached from: ' + '; '.join(sorted(name(f) for f in inbound[k]))[:600])
    if s.get('info'): L.append('- Shows: ' + ' · '.join(s['info'][:14])[:500])
    if s.get('inputs'): L.append('- Inputs: ' + ', '.join(s['inputs']))
    es = by_from.get(k)
    if es:
        L.append('- Buttons:')
        for e in es:
            if e.get('gone'): r = '(gone after an earlier tap)'
            elif e.get('to'): r = ('(2 taps) ' if e.get('twoTap') else '') + '→ ' + name(e['to'])
            elif e.get('sameScreenChanged'): r = '↻'
            else: r = '·'
            t = ' ⚠ ' + e['toasts'][0] if e.get('toasts') and any('⚠' in x for x in e['toasts']) else (' (' + e['toasts'][0] + ')' if e.get('toasts') else '')
            L.append(f"  - {e['button'][:60]} {r}{t}")
    elif s.get('buttons'):
        L.append('- Buttons (not tapped - reached one level down): ' + ' · '.join(b['t'][:30] for b in s['buttons'][:30]))
    L.append('')

L.append('## 3. Findings (computed)\n')
only_nav = [k for k in nav_to if not inbound.get(k)]
L.append(f'### 3.1 Only the side menu leads here ({len(only_nav)})\nNo button on another screen opens these - candidates for new connections.\n')
for k in only_nav: L.append('- ' + name(k))
multi = sorted([(len(v), k) for k, v in inbound.items() if len(v) >= 3], reverse=True)
L.append(f'\n### 3.2 Many ways in ({len(multi)})\nScreens opened from 3+ different screens - check each is a deliberate shortcut, not a duplicate path.\n')
for n, k in multi: L.append(f'- {name(k)} - from {n} screens')
lab = collections.defaultdict(set)
for e in E: lab[norm_label(e['button'])].add(e['from'])
rep = sorted([(len(v), l) for l, v in lab.items() if len(v) >= 4 and l not in ('← back', 'close', '×', '✕', 'back')], reverse=True)
L.append(f'\n### 3.3 Same button on many screens ({len(rep)})\nThe same control repeated across 4+ screens - candidates for one shared toolkit piece (with page context attached).\n')
for n, l in rep[:60]: L.append(f'- "{l}" on {n} screens')
dead = [e for e in E if not e.get('to') and not e.get('sameScreenChanged') and not e.get('toasts') and not e.get('gone')]
L.append(f'\n### 3.4 No visible effect ({len(dead)})\nTapped, and nothing changed on screen. Many need real data (lists are empty in the audit); some may be dead.\n')
for e in dead[:120]: L.append(f"- {name(e['from'])}: {e['button'][:60]}")
errs = [e for e in E if any('⚠' in t for t in (e.get('toasts') or []))]
L.append(f'\n### 3.5 Showed an error ({len(errs)})\n')
for e in errs[:80]: L.append(f"- {name(e['from'])}: {e['button'][:50]} → {e['toasts'][0]}")
same_title = collections.defaultdict(list)
for k in S: same_title[(k.split('|') + ['', '', ''])[2][:30].lower()].append(k)
dups = [(t, ks) for t, ks in same_title.items() if t and len(ks) >= 2]
L.append(f'\n### 3.6 Same title, different screens ({len(dups)})\nTwo screens with the same name - either the same thing shown two ways or a duplicate.\n')
for t, ks in dups[:40]: L.append(f'- "{t}": ' + ' / '.join(name(k) for k in ks))
if a.get('errors'): L.append('\n### Crawler notes\n' + '\n'.join('- ' + x for x in a['errors'][:30]))
open(out, 'w').write('\n'.join(L) + '\n')
print('wrote', out, len(L), 'lines')
