#!/usr/bin/env python3
"""RC-0 (Oct 15 2026): every phylum in taxonomyTree.PHYLUM_NAMES (except 21,
Miscellaneous) belongs to exactly one realm in realm_lenses.json, every realm
has at least one phylum, and the names/English/purpose tables cover the same
numbers. Cheap, regex-only; exits 1 and says what is wrong otherwise."""
import json, re, sys
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
import core_source  # CK-8: the one reader of the client source
src = core_source.read()
def table(name):
    m = re.search(r'\n  ' + name + r': \{(.*?)\n  \},', src, re.S)
    if not m: sys.exit('missing ' + name)
    return set(int(n) for n in re.findall(r'(?:^|[\s,{])(\d+):', m.group(1)))
names, eng, purpose = table('PHYLUM_NAMES'), table('PHYLUM_ENGLISH'), table('PHYLUM_PURPOSE')
lenses = json.load(open('realm_lenses.json'))['realms']
bad = []
if names != eng or names != purpose: bad.append('name tables differ: names %s english %s purpose %s' % (sorted(names), sorted(eng), sorted(purpose)))
seen = {}
for realm, v in lenses.items():
    ph = v.get('phyla') or []
    if not ph: bad.append('realm %s has no phyla' % realm)
    for n in ph:
        if n in seen: bad.append('phylum %d in both %s and %s' % (n, seen[n], realm))
        seen[n] = realm
        if n not in names: bad.append('realm %s lists unknown phylum %d' % (realm, n))
for n in sorted(names - {21}):
    if n not in seen: bad.append('phylum %d has no realm' % n)
if 21 in seen: bad.append('phylum 21 (Miscellaneous) should have no realm')
print('PHYLUM-REALM CHECK: %d phyla, %d realms, %s' % (len(names), len(lenses), 'OK' if not bad else 'PROBLEMS'))
for b in bad: print('  - ' + b)
sys.exit(1 if bad else 0)
