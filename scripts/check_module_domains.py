#!/usr/bin/env python3
"""Every RPGACE.register() module must carry a valid `domain:` key.

M1 of the "RPGACE Domains, Navigation & Deepstash Encyclopedia" plan (Oct 11
2026): rivers are replaced by the app's own domains, and the domain lives on
the module itself in rpgace_core.js, so there is one source of truth. This
script replaces the old "is every module in RIVER_MODULES?" session-start
check: a new module without a domain fails here the moment it is added.

Also importable: module_domains() -> {module: domain}, DOMAIN_LABELS.
Exit code 1 on any problem. Zero AI cost, regex only.
"""
import re
import sys
from pathlib import Path

CORE = Path(__file__).resolve().parent.parent / 'rpgace_core.js'


def _text():
    return CORE.read_text(encoding='utf-8')


def domain_labels(text=None):
    text = text or _text()
    m = re.search(r'R\.DOMAINS = \{(.*?)\};', text, re.S)
    if not m:
        return {}
    return dict(re.findall(r"(\w+): '([^']+)'", m.group(1)))


def module_domains(text=None):
    """{module: domain or None}, in file order."""
    text = text or _text()
    out = {}
    for m in re.finditer(r"^RPGACE\.register\('([^']+)', \{\n(.*)$", text, re.M):
        d = re.match(r"\s*domain: '([a-z]+)',$", m.group(2))
        out[m.group(1)] = d.group(1) if d else None
    return out


DOMAIN_LABELS = domain_labels()


def main():
    text = _text()
    labels = domain_labels(text)
    mods = module_domains(text)
    problems = []
    if not labels:
        problems.append('R.DOMAINS not found in rpgace_core.js')
    for name, d in mods.items():
        if d is None:
            problems.append('%s: no `domain:` key on the line after RPGACE.register' % name)
        elif d not in labels:
            problems.append('%s: unknown domain %r' % (name, d))
    counts = {}
    for d in mods.values():
        counts[d] = counts.get(d, 0) + 1
    print('MODULE DOMAIN CHECK: %s' % ('CLEAN' if not problems else 'PROBLEMS'))
    print('  %d modules, %d domains' % (len(mods), len(labels)))
    for k, label in labels.items():
        print('  %-11s %-20s %d' % (k, label, counts.get(k, 0)))
    for p in problems:
        print('  ! ' + p)
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
