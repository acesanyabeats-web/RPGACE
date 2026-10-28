#!/usr/bin/env python3
"""Ship prep for a client-code change (CK-8c, Oct 28 2026; replaces the session's scratch prep_commit.py).

  python3 scripts/prep_ship.py 20261028m

1. Regenerates METHOD_MODULE_MAP (scripts/generate_method_module_map.py) into whichever src file holds it.
2. Remaps the Galaxy Map decision anchors ('lines': (a, b) in three galaxy scripts) from the last commit's joined
   source to the current one, so line citations follow moved code.
3. Bumps the rpgace_core.min.js?v= cache-bust in index.html.
4. scripts/core_source.py check (syntax + hub/src consistency), scripts/minify_client.js, scripts/verify_anchors.py.
"""
import difflib, re, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import core_source  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
ANCHOR_FILES = ['scripts/galaxy_map_decision_matrix.py', 'scripts/galaxy_map_decisions.py', 'scripts/galaxy_map_current.py']


def run(cmd):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)


def main(ver):
    out = run(['python3', 'scripts/generate_method_module_map.py']).stdout
    obj = out[out.index('\n{\n') + 1:]
    obj = obj[:obj.index('\n}') + 2]
    src = core_source.read()
    ci = src.index('  METHOD_MODULE_MAP: {')
    end = src.index('\n},', ci)
    old_block = src[ci:end + 2]
    new_block = '  METHOD_MODULE_MAP: ' + obj
    if old_block != new_block:
        core_source.replace_once(old_block, new_block)
    old = core_source.read_at('HEAD').split('\n')
    new = core_source.read().split('\n')
    mp = {}
    for a, b, n in difflib.SequenceMatcher(None, old, new, autojunk=False).get_matching_blocks():
        for k in range(n):
            mp[a + k + 1] = b + k + 1
    cnt = [0]

    def rep(m):
        a, b = int(m.group(1)), int(m.group(2))
        if a in mp and b in mp and (mp[a], mp[b]) != (a, b):
            cnt[0] += 1
            return "'lines': (%d, %d)" % (mp[a], mp[b])
        return m.group(0)
    for f in ANCHOR_FILES:
        p = ROOT / f
        p.write_text(re.sub(r"'lines': \((\d+), (\d+)\)", rep, p.read_text(encoding='utf-8')), encoding='utf-8')
    print('anchors remapped', cnt[0])
    h = (ROOT / 'index.html').read_text(encoding='utf-8')
    (ROOT / 'index.html').write_text(re.sub(r'rpgace_core\.min\.js\?v=[0-9a-z]+', 'rpgace_core.min.js?v=' + ver, h), encoding='utf-8')
    c = run(['python3', 'scripts/core_source.py', 'check'])
    print(c.stdout.strip().split('\n')[-1])
    if c.returncode:
        print(c.stdout)
        sys.exit(1)
    m = run(['node', 'scripts/minify_client.js'])
    print((m.stdout.strip().split('\n') or [''])[-1])
    if m.returncode:
        print(m.stderr)
        sys.exit(1)
    print(run(['python3', 'scripts/verify_anchors.py']).stdout.strip().split('\n')[-1])


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1])
